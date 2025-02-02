import couchbase from 'couchbase';
import { logData, logError } from '../utils/index.js';

export let couchbaseCluster: couchbase.Cluster

export const initializeCouchbase = async () => {
    const clusterConnStr = process.env.COUCHBASE_CLUSTER_CONNECTION_STRING;
    const username = process.env.COUCHBASE_CLUSTER_USERNAME;
    const password = process.env.COUCHBASE_CLUSTER_PASSWORD;

    try {
        couchbaseCluster = await couchbase.connect(clusterConnStr, {
            username: username,
            password: password,
            configProfile: "wanDevelopment",
            timeouts: {
                connectTimeout: 60000,
                kvTimeout: 60000,
            }
        });

        const pingResult = await couchbaseCluster.ping();
        logData('Couchbase connection successful', 'couchbaseIsConnected', 1, { version: pingResult.version, sdk: pingResult.sdk });
    } catch (error) {
        logError(error.message, 'errorInInitializeCouchbase', 10, error);
        process.exit(1);
    }
};

export const getCouchbaseCollection = ({ bucketName }: { bucketName: string }): couchbase.Collection => {
    const bucket = couchbaseCluster.bucket(bucketName);
    const collection = bucket.scope('_default').collection('_default');
    return collection;
}
