import axios from 'axios';
import { getRedisClient } from '../../databases/redisUtil.js';
import { BgMessageData } from '../../typeDefs.js';
import { getCurrentDateAsYYYYMMDD, getPostInformationById, logError } from '../../utils/index.js';

export const postCreatedHandler = async (data: BgMessageData) => {
    try {
        const { entityId, actionInputOne } = data;

        const postData = await getPostInformationById(entityId);
        // const userData = await getUserInformationByUserId(postData.userId);

        const content = postData.content;
        const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
        const mentionRegex = /@([a-zA-Z0-9_]+)/g;
        const hashtags = [...new Set((content.match(hashtagRegex) || []).map((tag: string) => tag.slice(1)))];

        const category = await detectPostCategory(content, data);
        const country = await detectPostCountryCode(actionInputOne, data)

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

const detectPostCategory = async (content: string, data: BgMessageData) => {
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
        const bestCategory = data.labels[0];

        return bestCategory;
    } catch (error) {
        logError(error.message, 'errorInDetectingPostCategory', 10, error, data);
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
