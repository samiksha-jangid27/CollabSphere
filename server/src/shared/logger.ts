// ABOUTME: Winston logger with console transport — colorized in dev, JSON in production.
// ABOUTME: Used across all server modules for structured logging.

import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    process.env.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
            return `${timestamp} [${level}]: ${message}${metaStr}`;
          }),
        ),
  ),
  transports: [new winston.transports.Console()],
});

export default logger;
