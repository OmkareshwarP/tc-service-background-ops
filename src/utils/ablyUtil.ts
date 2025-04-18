import Ably from 'ably';
import { logData, logError } from './index.js';
import { BgMessageData } from '../typeDefs.js';
import { postCreatedHandler, postDeletedHandler, postUpdatedHandler, userSignedUpHandler } from '../handlers/index.js';

let ably: Ably.Realtime;

export const initializeAbly = () => {
  ably = new Ably.Realtime({
    key: process.env.ABLY_API_KEY,
  });

  ably.connection.once('connected', () => {
    logData('Connected to Ably!', 'ablyReady', 2, '');
  });
};

export const getAblyClient = (): Ably.Realtime => {
  return ably;
}

export const ablyCloseConnection = () => {
  ably.connection.close();
  ably.connection.once('closed', () => {
    logData('Connection to Ably closed.', 'ablyClosed', 9, '');
  });
};

export const ablySubscribe = () => {
  const ably = getAblyClient();
  const channel: Ably.RealtimeChannel = ably.channels.get(process.env.BACKGROUND_CHANNEL);

  channel.subscribe((message) => {
    const data: BgMessageData = JSON.parse(message.data);
    if (!data.messageName) {
      logError('Message name missing in message data', 'messageNameMissingError', 5, new Error(`Message name missing: ${JSON.stringify(data)}`));
    }

    switch (data.messageName) {
      case "userSignedUp":
        userSignedUpHandler(data)
          .then(() => {
            logData(`Message processed successfully: userSignedUp`, 'messageProcessed', 2, JSON.stringify(data));
          })
          .catch((err) => {
            logError(`Error while processing message: userSignedUp`, 'messageProcessingError', 5, err);
          })
        break;
      case "postCreated":
        postCreatedHandler(data)
          .then(() => {
            logData(`Message processed successfully: postCreated`, 'messageProcessed', 2, JSON.stringify(data));
          })
          .catch((err) => {
            logError(`Error while processing message: postCreated`, 'messageProcessingError', 5, err);
          })
        break;
      case "postUpdated":
        postUpdatedHandler(data)
          .then(() => {
            logData(`Message processed successfully: postUpdated`, 'messageProcessed', 2, JSON.stringify(data));
          })
          .catch((err) => {
            logError(`Error while processing message: postUpdated`, 'messageProcessingError', 5, err);
          })
        break;
      case "postDeleted":
        postDeletedHandler(data)
          .then(() => {
            logData(`Message processed successfully: postDeleted`, 'messageProcessed', 2, JSON.stringify(data));
          })
          .catch((err) => {
            logError(`Error while processing message: postDeleted`, 'messageProcessingError', 5, err);
          })
        break;
      default:
        logError('Unknown message name', 'unknownMessageName', 5, new Error(`Message name unknown: ${JSON.stringify(data)}`));
        break;
    }
  });

  channel.on((stateChange) => {
    if (stateChange.reason) {
      logError(`Error on channel: ${stateChange.reason.message}`, 'ablySubscribeError', 9, stateChange);
    }
  });

  channel.on('update', (stateChange) => {
    if (stateChange.reason) {
      logError(`Error on channel: ${stateChange.reason.message}`, 'ablySubscribeError', 9, stateChange);
    }
  });
};