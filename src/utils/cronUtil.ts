import cron from 'node-cron';
import { logData } from './index.js';
import { dailyHashtagSyncCronJobHandler, hourlyHashtagSyncCronJobHandler } from '../handlers/index.js';

export const initializeCronJobs = async () => {
    logData(`[CRON] service running...`, 'cronServiceRunning', 1, "running");

    // Job 1: Every hour at 15 minutes
    cron.schedule('15 * * * *', async () => {
        logData(`[CRON] Running job at 15 minutes past every hour: ${new Date().toISOString()}`, 'everyHour15M', 1, "running");

        await hourlyHashtagSyncCronJobHandler();

        logData(`[CRON] Job completed at 15 minutes past the hour: ${new Date().toISOString()}`, 'everyHour15M', 1, "done");
    });

    // Job 2: Every day at 00:30 AM
    cron.schedule('30 0 * * *', async () => {
        logData(`[CRON] Running job daily at 00:30 AM: ${new Date().toISOString()}`, 'everyDay30M', 1, "running");

        await dailyHashtagSyncCronJobHandler();

        logData(`[CRON] Daily job completed at 00:30 AM: ${new Date().toISOString()}`, 'everyDay30M', 1, "done");
    });
};
