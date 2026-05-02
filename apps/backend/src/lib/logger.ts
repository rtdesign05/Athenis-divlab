import path from 'path'
import winston from 'winston'
import { env } from '../config/env.js'

const { combine, timestamp, errors, json, colorize, printf } = winston.format

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : ''
    return `${String(ts)} ${level}: ${String(message)}${metaStr}`
  }),
)

const prodFormat = combine(timestamp(), errors({ stack: true }), json())

// In production write JSON logs to files so they can be ingested by log agents
// (Datadog, Loki, CloudWatch, etc.). Log directory respects LOG_DIR env var or
// falls back to <cwd>/logs — make sure the directory exists or is writable.
const logDir = process.env['LOG_DIR'] ?? path.join(process.cwd(), 'logs')

const fileTransports =
  env.nodeEnv === 'production'
    ? [
        new winston.transports.File({
          filename: path.join(logDir, 'error.log'),
          level: 'error',
          format: prodFormat,
          maxsize: 20 * 1024 * 1024, // 20 MB
          maxFiles: 14,
          tailable: true,
        }),
        new winston.transports.File({
          filename: path.join(logDir, 'combined.log'),
          format: prodFormat,
          maxsize: 50 * 1024 * 1024, // 50 MB
          maxFiles: 14,
          tailable: true,
        }),
      ]
    : []

export const logger = winston.createLogger({
  level: env.nodeEnv === 'production' ? 'info' : 'debug',
  format: env.nodeEnv === 'production' ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console(),
    ...fileTransports,
  ],
  exceptionHandlers: [
    new winston.transports.Console(),
    ...(env.nodeEnv === 'production'
      ? [new winston.transports.File({ filename: path.join(logDir, 'exceptions.log'), format: prodFormat })]
      : []),
  ],
  rejectionHandlers: [
    new winston.transports.Console(),
    ...(env.nodeEnv === 'production'
      ? [new winston.transports.File({ filename: path.join(logDir, 'rejections.log'), format: prodFormat })]
      : []),
  ],
})
