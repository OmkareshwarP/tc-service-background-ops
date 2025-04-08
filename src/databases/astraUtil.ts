import { Client } from 'cassandra-driver';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { createWriteStream } from 'fs';
import { Readable } from 'stream';
import { logData, logError } from '../utils/index.js';

let cassandraClient: Client | null = null;

// Lazily initializes the Astra DB Client.
export const getCassandraDBClient = async (): Promise<Client> => {
  if (!cassandraClient) {
    await downloadConnectionBundleFromS3();
    cassandraClient = new Client({
      cloud: {
        secureConnectBundle: process.env.ASTRA_DB_SECURE_CONNECT_BUNDLE_PATH,
      },
      credentials: {
        username: process.env.ASTRA_DB_CLIENT_ID,
        password: process.env.ASTRA_DB_CLIENT_SECRET,
      },
      keyspace: process.env.ASTRA_DB_KEYSPACE,
    });

    try {
      await cassandraClient.connect();
    } catch (err) {
      throw err;
    }
  }
  return cassandraClient;
};

const downloadConnectionBundleFromS3 = async () => {
  const accessKeyId = process.env.S3_AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('Missing required environment variables.');
  }

  const s3Client = new S3Client({
    region: process.env.S3_AWS_REGION,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
  const getObjectCommand = new GetObjectCommand({
    Bucket: process.env.ASTRA_DB_CONNECTION_BUNDLE_BUCKET,
    Key: process.env.ASTRA_DB_CONNECTION_BUNDLE_PATH,
  });

  const response = await s3Client.send(getObjectCommand);

  if (response.Body) {
    const writeStream = createWriteStream(process.env.ASTRA_DB_SECURE_CONNECT_BUNDLE_PATH);

    await new Promise<void>((resolve, reject) => {
      if (response.Body instanceof Readable) {
        response.Body
          .pipe(writeStream)
          .on('close', () => resolve())
          .on('error', (error) => reject(error));
      } else {
        reject(new Error('S3 response body is not a readable stream.'));
      }
    });
  }
};

export const closeCassandraDBClient = async () => {
  if (cassandraClient) {
    await cassandraClient.shutdown();
    cassandraClient = null;
    logData('Astra DB client closed', 'astraClosed', 1, {});
  }
};

export const initializeAstraDB = async () => {
  try {
    const client = await getCassandraDBClient();

    await client.execute('SELECT release_version FROM system.local');
    logData('Connected to Astra DB successfully', 'astraConnected', 1, {});
  } catch (err) {
    logError('Failed to connect to Astra DB', 'astraConnectionError', 10, err);
    process.exit(1);
  }
};
