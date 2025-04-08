/* eslint-disable @typescript-eslint/no-explicit-any */
import { Db as MongoDBClient, MongoClient } from 'mongodb';
import { logData, logError } from '../utils/index.js';

let mongoClient: MongoClient;
let mongoDBClient: MongoDBClient;

export const initializeMongoDB = () => {
  const _mongoUrl = process.env.MONGO_URL;
  const _mongoDBName = process.env.MONGO_DATABASE_NAME;

  if (!_mongoUrl || !_mongoDBName) {
    logError('Mongo Url or DB is not valid', 'mongoUrlOrDbNotValid', 4, '', { _mongoUrl, _mongoDBName });
    process.exit(1);
  }

  mongoClient = new MongoClient(_mongoUrl);
  mongoDBClient = mongoClient.db(_mongoDBName);

  mongoClient
    .connect()
    .then((data: any) => {
      logData('Connected to MongoDB', 'mongoReady', 1, { hasBeenClosed: data.s.hasBeenClosed });
    })
    .catch((err) => {
      logError('Failed to create Mongo connection', 'mongoConnectionError', 10, err);
      process.exit(1);
    });

  mongoClient.on('error', (err: Error) => {
    logError('Failed to create Mongo client: ', 'mongoError', 10, err);
    process.exit(1);
  });

  mongoClient.on('ready', async () => {
    logData('Mongo connection is ready', 'mongoReady', 1, '');
  });

  mongoClient.on('end', async () => {
    logError('Mongo connection ended', 'mongoConnectionEnd', 10, new Error('Mongo connection ended abruptly'));
    process.exit(1);
  });

  mongoClient.on('disconnect', (err) => {
    logError('Mongo is disconnected', 'mongoDisconnected', 4, err);
    process.exit(1);
  });
};

export const getMongoDBClient = (): MongoDBClient => {
  return mongoDBClient;
};
