import pino from 'pino';

// pino-pretty uses dynamic transport resolution (worker threads + createRequire)
// that Turbopack cannot handle in Vercel serverless. Only enable it in local dev.
const isProd = process.env.NODE_ENV === 'production';

const logger = pino(
  { level: process.env.LOG_LEVEL || 'info' },
  isProd
    ? undefined
    : pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      })
);

export default logger;
