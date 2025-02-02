import { BgMessageData } from '../../typeDefs.js';
import { logError } from '../../utils/index.js';

export const postUpdatedHandler = async (data: BgMessageData) => {
    try {
        // eslint-disable-next-line no-console
        console.log({ data });
    } catch (error) {
        logError(error.message, 'errorInPostUpdatedHandler', 10, error, data);
    }
}
