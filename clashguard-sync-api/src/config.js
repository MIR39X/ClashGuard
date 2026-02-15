import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4000),
  sourceDataApi: process.env.SOURCE_DATA_API || 'https://server-timetable2.vercel.app',
  syncIntervalMs: Number(process.env.SYNC_INTERVAL_MS || 15 * 60 * 1000),
  corsOrigins: String(process.env.CORS_ORIGIN || '*')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean),
};
