import { BgMessageData } from '../../typeDefs.js';
import { logError } from '../../utils/index.js';

export const userSignedUpHandler = async (data: BgMessageData) => {
    try {
        // eslint-disable-next-line no-console
        console.log({ data });
        return Promise.resolve();
    } catch (error) {
        logError(error.message, 'errorInUserSignedUpHandler', 10, error, data);
        return Promise.reject(error);
    }
}
