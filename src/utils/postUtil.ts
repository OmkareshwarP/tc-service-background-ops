/* eslint-disable @typescript-eslint/no-explicit-any */
import { getMongoDBClient } from '../databases/mongoUtil.js';
import { getKey, getRedisClient } from '../databases/redisUtil.js';
import { IPost } from '../typeDefs.js';
import { logError } from './loggerUtil.js';

export const getPostInformationById = async (postId: string): Promise<IPost> => {
  try {
    if (!postId) {
      return null;
    }
    let postData: any;
    const redisKey = `${process.env.RK_POST_INFO}:${postId}`;
    const redisPost = await getKey(redisKey);
    postData = JSON.parse(redisPost);
    if (!postData || Object.keys(postData).length === 0) {
      const dbClient = getMongoDBClient();
      const _collectionName = process.env.POSTS_COLLECTION;
      postData = (await dbClient.collection(_collectionName).findOne({ postId, status: 'published' })) as any;
      if (postData) {
        savePostInformationById(postData, postId);
      }
    }
    return postData;
  } catch (err) {
    logError(err.message, 'errorWhileFetchingFromPostCache', 5, err);
    throw err;
  }
};

export const savePostInformationById = async (postData: any, postId: string) => {
  try {
    const redisKey = `${process.env.RK_POST_INFO}:${postId}`;
    const expireTime = 15 * 24 * 60 * 60;
    const redisClient = getRedisClient();
    await redisClient.multi().set(redisKey, JSON.stringify(postData)).expire(redisKey, expireTime).exec();
    return true;
  } catch (err) {
    logError(err.message, 'errorWhileInsertingIntoPostCache', 5, err);
    throw err;
  }
};

export const deletePostInformationById = async (postId: string) => {
  try {
    const redisKey = `${process.env.RK_POST_INFO}:${postId}`;
    const redisClient = getRedisClient();
    await redisClient.del(redisKey);
  } catch (err) {
    logError(err.message, 'errorWhileDeletingFromPostCache', 5, err);
    throw err;
  }
};
