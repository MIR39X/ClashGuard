import dotenv from 'dotenv';

dotenv.config();

const required = (key, fallback) => {
  const value = process.env[key];
  if (!value) {
    if (fallback !== undefined) return fallback;
    console.error(`[config] Missing required env var: ${key}`);
    process.exit(1);
  }
  return value;
};

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  sourceDataApi: required('SOURCE_DATA_API', 'https://server-timetable2.vercel.app'),
  syncIntervalMs: Number(process.env.SYNC_INTERVAL_MS || 15 * 60 * 1000),
  corsOrigins: String(process.env.CORS_ORIGIN || '*')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean),
  adminSyncToken: process.env.ADMIN_SYNC_TOKEN || '',
};
