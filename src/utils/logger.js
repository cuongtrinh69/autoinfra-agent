/**
 * Structured Logger (Winston)
 * ====================================================================
 * Provides structured logging with file rotation, console output,
 * and log levels. Used throughout the application.
 * ====================================================================
 */

'use strict';

const { createLogger, format, transports } = require('winston');
const { resolve } = require('path');
const { existsSync, mkdirSync } = require('fs');

const logDir = resolve(__dirname, '..', '..', process.env.LOG_DIR || 'logs');
if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true });
}

const logLevel = process.env.LOG_LEVEL || 'debug';

const logger = createLogger({
  level: logLevel,
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'autoinfra-agent' },
  transports: [
    new transports.File({
      filename: resolve(logDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 7,
    }),
    new transports.File({
      filename: resolve(logDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 7,
    }),
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length > 1
            ? ` ${JSON.stringify(meta)}`
            : '';
          return `${timestamp} ${level}: ${message}${metaStr}`;
        })
      ),
    }),
  ],
});

module.exports = logger;