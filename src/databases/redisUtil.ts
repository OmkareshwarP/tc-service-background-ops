import Redis, { RedisClientType } from 'redis';
import { logError, logData } from '../utils/index.js';

export let redis: RedisClientType;

export const initializeRedis = () => {
  const redisUrl = process.env.REDIS_URL;
  redis = Redis.createClient({ url: redisUrl });

  redis
    .connect()
    .then((data) => {
      logData('Connected to auth redis', 'redisReady', 1, data);
    })
    .catch((err) => {
      logError('Failed to create Redis connection', 'redisConnectionError', 10, err);
      process.exit(1);
    });

  redis.on('error', (err: Error) => {
    logError('Failed to create Redis client: ', 'redisError', 10, err);
    process.exit(1);
  });

  redis.on('ready', async () => {
    logData('Redis connection is ready', 'redisReady', 1, '');
  });

  redis.on('end', async () => {
    logError('Redis connection ended', 'redisConnectionEnd', 10, new Error('Redis connection ended abruptly'));
    process.exit(1);
  });

  redis.on('disconnect', (err) => {
    logError('Auth redis is disconnected', 'redisDisconnected', 4, err);
    process.exit(1);
  });
};

export const exists = async (key: string) => {
  try {
    const exRes = await redis.exists(key);
    return exRes;
  } catch (err) {
    throw err;
  }
};

export const getAllValues = async (key: string) => {
  try {
    const getList = await redis.lRange(key, 0, -1);
    return getList;
  } catch (err) {
    throw err;
  }
};

export const insertIntoHashMap = async (objectKey: string, objectField: string, fieldValue: string) => {
  try {
    await redis.hSet(objectKey, objectField, fieldValue);
  } catch (err) {
    throw err;
  }
};

export const setExpiryOnHashMap = async (objectKey: string, expiry: number) => {
  try {
    await redis.expire(objectKey, expiry);
  } catch (err) {
    throw err;
  }
};

export const getAllFromHashMap = async (objectKey: string) => {
  try {
    const hashmapResp = await redis.hGetAll(objectKey);
    return hashmapResp;
  } catch (err) {
    throw err;
  }
};

export const getKey = async (objectKey: string) => {
  try {
    const value = await redis.get(objectKey);
    return value;
  } catch (err) {
    throw err;
  }
};

export const insertIntoList = async (objectKey: string, objectValue: string) => {
  try {
    await redis.lPush(objectKey, objectValue);
  } catch (err) {
    throw err;
  }
};

export const addMembersToSortedSet = async (key: string, members: { score: number; value: string }[]) => {
  try {
    await redis.zAdd(key, [...members]);
  } catch (err) {
    throw err;
  }
};

export const getMemberScore = async (key: string, member: string) => {
  try {
    const score = await redis.zScore(key, member);
    return score;
  } catch (err) {
    throw err;
  }
};

export const deleteRedisKey = async (keys: string | string[]) => {
  try {
    await redis.del(keys);
  } catch (err) {
    throw err;
  }
};

export const getRedisClient = () => {
  return redis;
};
