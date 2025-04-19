import axios from 'axios';
import { getRedisClient } from '../../databases/redisUtil.js';
import { BgMessageData, IPost } from '../../typeDefs.js';
import { deletePostInformationById, getCurrentDateAsYYYYMMDD, getPostInformationById, logError, PostType } from '../../utils/index.js';
import { getMongoDBClient } from '../../databases/mongoUtil.js';
import { createNeo4jSession } from '../../databases/neo4jUtil.js';

export const postCreatedHandler = async (data: BgMessageData) => {
    try {
        const { entityId, actionInputOne } = data;

        const postData = await getPostInformationById(entityId);
        // const userData = await getUserInformationByUserId(postData.userId);

        const content = postData.content;
        const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
        const mentionRegex = /@([a-zA-Z0-9_]+)/g;
        const hashtags = [...new Set((content.match(hashtagRegex) || []).map((tag: string) => tag.slice(1)))];

        const topics = await detectPostCategories(content, data);
        const category = topics[0];
        const country = await detectPostCountryCode(actionInputOne, data)

        await updatePostData(postData, hashtags || [], topics || []);

        const redisClient = getRedisClient();
        const todayDate = getCurrentDateAsYYYYMMDD();

        await Promise.all(
            hashtags.map(async (hashtag: string) => {
                const normalizedHashtag = hashtag.toLowerCase();

                const multi = redisClient.multi();
                const expireTime = 25 * 60 * 60;

                const trendingGlobalKey = `${process.env.RK_TRENDING_HASHTAGS}:${todayDate}:global`;

                multi.zIncrBy(trendingGlobalKey, 1, normalizedHashtag);
                multi.expire(trendingGlobalKey, expireTime);

                if (country) {
                    const trendingCountryKey = `${process.env.RK_TRENDING_HASHTAGS}:${todayDate}:country:${country}`;
                    multi.zIncrBy(trendingCountryKey, 1, normalizedHashtag);
                    multi.expire(trendingCountryKey, expireTime);
                }

                if (category) {
                    const trendingCategoryKey = `${process.env.RK_TRENDING_HASHTAGS}:${todayDate}:category:${category}`;
                    multi.zIncrBy(trendingCategoryKey, 1, normalizedHashtag);
                    multi.expire(trendingCategoryKey, expireTime);
                }

                if (country && category) {
                    const trendingCountryCategoryKey = `${process.env.RK_TRENDING_HASHTAGS}:${todayDate}:country:${country}:category:${category}`;
                    multi.zIncrBy(trendingCountryCategoryKey, 1, normalizedHashtag);
                    multi.expire(trendingCountryCategoryKey, expireTime);
                }

                await multi.exec();
            })
        );

        const mentions = [...new Set((content.match(mentionRegex) || []).map((username: string) => username.slice(1)))];

        //TODO:: trigger analytics
    } catch (error) {
        logError(error.message, 'errorInPostCreatedHandler', 10, error, data);
    }
}

const detectPostCategories = async (content: string, data: BgMessageData) => {
    const HF_API_URL = process.env.HF_API_URL;
    const HF_API_TOKEN = process.env.HF_API_TOKEN;

    try {
        const response = await axios.post(
            HF_API_URL,
            {
                inputs: content,
                parameters: {
                    candidate_labels: ["sports", "politics", "technology", "entertainment", "finance", "travel", "health", "science", "education"]
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${HF_API_TOKEN}`
                }
            }
        );

        const data = response.data;
        const topCategory = data.labels[0];
        const categories = topCategory ? [topCategory] : [];

        return categories;
    } catch (error) {
        logError(error.message, 'errorInDetectingPostCategories', 10, error, data);
    }
}

const detectPostCountryCode = async (ipAddress: string, data: BgMessageData) => {
    try {
        const token = process.env.IPINFO_TOKEN || '';
        const url = token
            ? `https://ipinfo.io/${ipAddress}?token=${token}`
            : `https://ipinfo.io/${ipAddress}`;

        const response = await axios.get(url);
        const data = response.data;

        let countryCode = data.country || null;

        if (countryCode) {
            countryCode = countryCode.toLowerCase().replace(/\s+/g, '');
        }

        return countryCode
    } catch (error) {
        logError(error.message, 'errorInDetectingPostCountryCode', 10, error, data);
    }
}

const updatePostData = async (postData: IPost, hashtags: string[], topics: string[]) => {
    const dbClient = getMongoDBClient();
    const _postsCollectionName = process.env.POSTS_COLLECTION;
    // const _usersCollectionName = process.env.USERS_COLLECTION;

    const session = createNeo4jSession();
    const neo4jRoot = process.env.NEO4J_ROOT;

    const { postId, postType, repostedPostId, parentPostId, userId, comments, reposts, likes, impressions, createdAt } = postData;

    try {
        const _userNodeId = `${neo4jRoot}:${userId}`;
        const _postNodeId = `${neo4jRoot}:${postId}`;
        await session.run(
            `MATCH (user:User {id: $_userNodeId}), (post:Post {id: $_postNodeId})
            MERGE (user)-[r:CREATED]->(post)
            ON CREATE SET r.createdAt = $createdAt`,
            { _userNodeId, _postNodeId, createdAt }
        );

        await session.run(
            `MATCH (u:User {id: $_userNodeId})
             SET u.postCount = coalesce(u.postCount, 0) + 1`,
            { _userNodeId }
        );

        if (postType !== PostType.repost) {
            await dbClient.collection(_postsCollectionName).updateOne({ postId }, { $set: { hashtags, topics } });
            await deletePostInformationById(postId);

            const postNode = `${neo4jRoot}:${postId}`;
            await session.run(
                `MATCH (p:Post {id: $postNode})
                SET p.hashtags = $hashtags, p.topics = $topics`,
                { postNode, hashtags, topics }
            );
        }

        const engagementScore = calculatePostEngagementScore({ likes, comments, reposts, impressions, createdAt });

        let engagementPostId;

        if (postType === PostType.repost || postType === PostType.quotePost) {
            engagementPostId = repostedPostId;
        }
        if (postType === PostType.reply) {
            engagementPostId = parentPostId;
        }

        if (engagementPostId) {
            await dbClient.collection(_postsCollectionName).updateOne({ postId: engagementPostId }, { $set: { engagementScore } });
            await deletePostInformationById(engagementPostId);

            const postNode = `${neo4jRoot}:${engagementPostId}`;
            await session.run(
                `MATCH (p:Post {id: $postNode})
                    SET p.engagementScore = $engagementScore`,
                { postNode, engagementScore }
            );
        }
    } catch (error) {
        throw error;
    } finally {
        await session.close();
    }
}

const calculatePostEngagementScore = (inputArgs: any): number => {
    const { likes, comments, reposts, impressions, createdAt } = inputArgs;

    const engagementScore = (likes * 3) + (comments * 5) + (reposts * 10) + (impressions * 0.5);

    const now = Date.now();

    const hoursSincePost = Math.max((now - createdAt) / (1000 * 60 * 60), 1);

    const finalScore = engagementScore / Math.pow(hoursSincePost + 2, 1.5);

    return finalScore;
}
