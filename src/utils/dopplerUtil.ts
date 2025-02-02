import axios from 'axios';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envFilePath = path.resolve('dist/.env_custom');

const fetchDopplerSecrets = async () => {
    try {
        const response = await axios.get('https://api.doppler.com/v3/configs/config/secrets/download', {
            headers: {
                Authorization: `Bearer ${process.env.DOPPLER_API_KEY}`,
                Accept: 'application/json'
            },
            params: {
                project: process.env.DOPPLER_PROJECT,
                config: process.env.DOPPLER_CONFIG,
                format: 'env'
            }
        });

        let envContent = response.data;

        const serviceName = process.env.SERVICE_NAME;
        envContent += `\nSERVICE_NAME="${serviceName}"`;

        fs.writeFileSync(envFilePath, envContent);
        // eslint-disable-next-line no-console
        console.log('✅ Doppler secrets downloaded');

        dotenv.config({ path: envFilePath });
        // eslint-disable-next-line no-console
        console.log(`🚀 SERVICE_NAME: ${process.env.SERVICE_NAME}`);
        // eslint-disable-next-line no-console
        console.log(`🚀 DOPPLER_ENV_LOADED: ${process.env.DOPPLER_ENV_LOADED}`);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('❌ Failed to fetch Doppler secrets:', error);
        process.exit(1);
    }
}

export const loadEnv = async () => {
    if (process.env.DOPPLER_ENABLED === 'true') {
        if (!fs.existsSync(envFilePath)) {
            // eslint-disable-next-line no-console
            console.log('⚠️ .env_custom not found, fetching from Doppler...');
            await fetchDopplerSecrets();
        } else {
            // eslint-disable-next-line no-console
            console.log('✅ .env_custom already exists, loading it...');
            dotenv.config({ path: envFilePath });
            // eslint-disable-next-line no-console
            console.log(`🚀 Loaded SERVICE_NAME: ${process.env.SERVICE_NAME}`);
            // eslint-disable-next-line no-console
            console.log(`🚀 DOPPLER_ENV_LOADED: ${process.env.DOPPLER_ENV_LOADED}`);
        }
    } else {
        // eslint-disable-next-line no-console
        console.log('✅ using default local .env');
    }
}