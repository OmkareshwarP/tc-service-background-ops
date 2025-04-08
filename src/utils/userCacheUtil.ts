/* eslint-disable @typescript-eslint/no-explicit-any */
import { getMongoDBClient } from '../databases/mongoUtil.js';
import { getKey, getRedisClient } from '../databases/redisUtil.js';
import { IUser } from '../typeDefs.js';
import { logError } from './loggerUtil.js';

export const getUserInformationByUserId = async (userId: string): Promise<IUser> => {
  try {
    if (!userId) {
      return null;
    }
    let userData: any;
    const redisKey = `${process.env.RK_USER_INFO}:${userId}`;
    const redisUser = await getKey(redisKey);
    userData = JSON.parse(redisUser);
    if (!userData || Object.keys(userData).length === 0) {
      const dbClient = getMongoDBClient();
      const _collectionName = process.env.USERS_COLLECTION;
      userData = (await dbClient.collection(_collectionName).findOne({ userId, deletionStatus: 'notdeleted' })) as any;
      if (userData) {
        saveUserInformationByUserId(userData, userId);
      }
    }
    return userData;
  } catch (err) {
    logError(err.message, 'errorWhileFetchingFromUserCache', 5, err);
    throw err;
  }
};

export const saveUserInformationByUserId = async (userData: any, userId: string) => {
  try {
    const redisKey = `${process.env.RK_USER_INFO}:${userId}`;
    const expireTime = 15 * 24 * 60 * 60;
    const redisClient = getRedisClient();
    await redisClient.multi().set(redisKey, JSON.stringify(userData)).expire(redisKey, expireTime).exec();
    return true;
  } catch (err) {
    logError(err.message, 'errorWhileInsertingIntoUserCache', 5, err);
    throw err;
  }
};

export const deleteUserInformationByUserId = async (userId: string) => {
  try {
    const redisKey = `${process.env.RK_USER_INFO}:${userId}`;
    const redisClient = getRedisClient();
    await redisClient.del(redisKey);
  } catch (err) {
    logError(err.message, 'errorWhileDeletingFromUserCache', 5, err);
    throw err;
  }
};
