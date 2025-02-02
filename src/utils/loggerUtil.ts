/* eslint-disable @typescript-eslint/no-explicit-any */
import pino from 'pino';
import { getCurrentTime } from './timeUtil.js';
import * as Sentry from '@sentry/node';
import '@sentry/tracing';

interface LogErrorData {
  timeStamp: number;
  errorMessage: string;
  errorCodeForClient: string;
  errorOrigin: string;
  errorLevel: number;
  errorStack?: string;
  inputParams?: any;
}

interface LogData {
  timeStamp: number;
  logMessage: string;
  logCodeForServer: string;
  logOrigin: string;
  logLevel: number;
  logData: any;
}

export const initializeSentry = () => {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
  });
}

const logger = pino({
  level: 'info'
});

const logError = (
  errorMessage: string,
  errorCodeForClient: string,
  errorLevel: number,
  error: any,
  inputParams?: any
) => {
  const timeStamp = getCurrentTime();
  const errorOrigin: string = process.env.SERVICE_NAME;
  const loggerData: LogErrorData = {
    timeStamp,
    errorMessage,
    errorCodeForClient,
    errorOrigin,
    errorLevel,
    errorStack: error?.stack,
    inputParams
  };
  logger.error(loggerData);
  if (error) {
    Sentry.captureException(error, {
      tags: {
        errorOrigin, errorLevel, errorMessage, errorCodeForClient
      },
      extra: {
        errorOrigin, errorLevel, errorMessage, errorCodeForClient, inputParams
      }
    });
  }
};

const logData = (
  logMessage: string,
  logCodeForServer: string,
  logLevel: number,
  logData: any
) => {
  const timeStamp = getCurrentTime();
  const logOrigin: string = process.env.SERVICE_NAME;
  const loggerData: LogData = {
    timeStamp,
    logMessage,
    logCodeForServer,
    logOrigin,
    logLevel,
    logData
  };
  logger.info(loggerData);
};

export { logError, logData };
