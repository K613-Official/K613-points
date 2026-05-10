import pino from 'pino';
import { cleanEnv } from '../config/env.js';

const isDev = process.env['NODE_ENV'] !== 'production';
const env = cleanEnv();

export const logger = pino({
  level: env.LOG_LEVEL,
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l' },
        },
      }
    : {}),
});

export type Logger = typeof logger;
