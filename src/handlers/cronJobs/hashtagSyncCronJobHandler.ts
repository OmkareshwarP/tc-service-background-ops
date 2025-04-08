/* eslint-disable @typescript-eslint/no-explicit-any */
import { getCassandraDBClient } from '../../databases/astraUtil.js';
import { getRedisClient } from '../../databases/redisUtil.js';
import { getCurrentEpochTimestamp, logData, logError } from '../../utils/index.js';

export const hourlyHashtagSyncCronJobHandler = async () => {
    try {
        const redisClient = getRedisClient();
        const astraClient = await getCassandraDBClient();
        const { targetDateWithHour, targetDate } = getTargetDateForHourlyUpdate();

        const redisPrefix = process.env.RK_TRENDING_HASHTAGS;
        const pattern = `${redisPrefix}:${targetDate}:*`;
        const keys = await redisClient.keys(pattern);
        let trendingHashtagsLength = 0;

        await Promise.all(keys.map(async (key) => {
            const { country, category } = parseKeyInfo(key);
            const trendingHashtags = await redisClient.zRangeWithScores(key, 0, -1, { REV: true });
            trendingHashtagsLength = trendingHashtags.length;
            const currentTimestamp = getCurrentEpochTimestamp();

            await Promise.all(trendingHashtags.map(async (trendingHashtag) => {
                const normalizedHashtag = trendingHashtag.value.toLowerCase();
                const originalHashtag = trendingHashtag.value;
                const count = trendingHashtag.score;
                const batchQueries = [];

                const hashtag_identifier_global = `${targetDateWithHour}:global`;
                batchQueries.push(getTrendingHashtagInsertQuery({ hashtagIdentifier: hashtag_identifier_global, count, normalizedHashtag, originalHashtag, currentTimestamp }));

                if (country) {
                    const hashtag_identifier_country = `${targetDateWithHour}:country:${country}`;
                    batchQueries.push(getTrendingHashtagInsertQuery({ hashtagIdentifier: hashtag_identifier_country, count, normalizedHashtag, originalHashtag, currentTimestamp }));
                }

                if (category) {
                    const hashtag_identifier_category = `${targetDateWithHour}:category:${category}`;
                    batchQueries.push(getTrendingHashtagInsertQuery({ hashtagIdentifier: hashtag_identifier_category, count, normalizedHashtag, originalHashtag, currentTimestamp }));
                }

                if (country && category) {
                    const hashtag_identifier_country_category = `${targetDateWithHour}:country:${country}:category:${category}`;
                    batchQueries.push(getTrendingHashtagInsertQuery({ hashtagIdentifier: hashtag_identifier_country_category, count, normalizedHashtag, originalHashtag, currentTimestamp }));
                }

                await astraClient.batch(batchQueries, { prepare: true });
            }));
        }));

        logData(`[INFO] {Keys: ${keys.length}, TrendingHashtags: ${trendingHashtagsLength}} Completed syncing trending hashtags to AstraDB.`, 'hourlyHashtagSyncCronJobHandler', 1, "done");
    } catch (error) {
        logError(error.message, 'errorInHourlyHashtagSyncCronJobHandler', 10, error);
    }
}

export const dailyHashtagSyncCronJobHandler = async () => {
    try {
        const redisClient = getRedisClient();
        const astraClient = await getCassandraDBClient();

        const targetDate = getTargetDateForDailyUpdate();
        if (!targetDate) {
            logError('Not midnight, skipping daily sync.', 'errorInDailyHashtagSyncCronJobHandler', 10, "notMidnight");
            return;
        }

        const redisPrefix = process.env.RK_TRENDING_HASHTAGS;
        const pattern = `${redisPrefix}:${targetDate}:*`;
        const keys = await redisClient.keys(pattern);
        let trendingHashtagsLength = 0;

        await Promise.all(keys.map(async (key) => {
            const { country, category } = parseKeyInfo(key);
            const trendingHashtags = await redisClient.zRangeWithScores(key, 0, -1, { REV: true });
            trendingHashtagsLength = trendingHashtags.length;
            const currentTimestamp = getCurrentEpochTimestamp();

            await Promise.all(trendingHashtags.map(async (trendingHashtag) => {
                const normalizedHashtag = trendingHashtag.value.toLowerCase();
                const originalHashtag = trendingHashtag.value;
                const count = trendingHashtag.score;
                const batchQueries = [];

                const hashtag_identifier_global = `${targetDate}:global`;
                batchQueries.push(getTrendingHashtagInsertQuery({ hashtagIdentifier: hashtag_identifier_global, count, normalizedHashtag, originalHashtag, currentTimestamp }));

                if (country) {
                    const hashtag_identifier_country = `${targetDate}:country:${country}`;
                    batchQueries.push(getTrendingHashtagInsertQuery({ hashtagIdentifier: hashtag_identifier_country, count, normalizedHashtag, originalHashtag, currentTimestamp }));
                }

                if (category) {
                    const hashtag_identifier_category = `${targetDate}:category:${category}`;
                    batchQueries.push(getTrendingHashtagInsertQuery({ hashtagIdentifier: hashtag_identifier_category, count, normalizedHashtag, originalHashtag, currentTimestamp }));
                }

                if (country && category) {
                    const hashtag_identifier_country_category = `${targetDate}:country:${country}:category:${category}`;
                    batchQueries.push(getTrendingHashtagInsertQuery({ hashtagIdentifier: hashtag_identifier_country_category, count, normalizedHashtag, originalHashtag, currentTimestamp }));
                }

                await astraClient.batch(batchQueries, { prepare: true });
            }));
        }));

        logData(`[INFO] {Keys: ${keys.length}, TrendingHashtags: ${trendingHashtagsLength}} Completed syncing trending hashtags to AstraDB.`, 'dailyHashtagSyncCronJobHandler', 1, "done");
    } catch (error) {
        logError(error.message, 'errorInDailyHashtagSyncCronJobHandler', 10, error);
    }
}

const parseKeyInfo = (key: string) => {
    const parts = key.split(':');
    const info: any = {};
    if (parts.includes('country')) info.country = parts[parts.indexOf('country') + 1];
    if (parts.includes('category')) info.category = parts[parts.indexOf('category') + 1];
    return info;
};

const getTrendingHashtagInsertQuery = (inputArgs: any): { query: string; params: any[] } => {
    const { hashtagIdentifier, count, normalizedHashtag, originalHashtag, currentTimestamp } = inputArgs;

    const insertQuery = {
        query: `
        INSERT INTO trending_hashtags 
        (hashtag_identifier, count, normalized_hashtag, original_hashtag, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
        params: [hashtagIdentifier, count, normalizedHashtag, originalHashtag, currentTimestamp, currentTimestamp],
    };

    return insertQuery;
};

const getTargetDateForHourlyUpdate = (): { targetDateWithHour: string, targetDate: string } => {
    const now = new Date();

    const targetDate = new Date(now);
    let targetHour = now.getHours();

    if (targetHour === 0) {
        targetDate.setDate(targetDate.getDate() - 1);
        targetHour = 23;
    } else {
        targetHour = targetHour - 1;
    }

    const year = targetDate.getFullYear();
    const month = (targetDate.getMonth() + 1).toString().padStart(2, '0');
    const day = targetDate.getDate().toString().padStart(2, '0');
    const hour = targetHour.toString().padStart(2, '0');

    const targetDateStr = `${year}${month}${day}`;
    const targetDateWithHourStr = `${targetDateStr}${hour}`;

    return { targetDateWithHour: targetDateWithHourStr, targetDate: targetDateStr };
}

const getTargetDateForDailyUpdate = (): string | null => {
    const now = new Date();
    const currentHour = now.getHours();

    if (currentHour !== 0) {
        return null;
    }

    const previousDay = new Date(now);
    previousDay.setDate(previousDay.getDate() - 1);

    const year = previousDay.getFullYear();
    const month = (previousDay.getMonth() + 1).toString().padStart(2, '0');
    const day = previousDay.getDate().toString().padStart(2, '0');

    return `${year}${month}${day}`;
}
