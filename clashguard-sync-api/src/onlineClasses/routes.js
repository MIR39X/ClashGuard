import express from 'express';
import { getSyncState } from '../syncService.js';
import { getOnlineClassesState, queryOnlineClasses } from './service.js';

export const onlineClassesRouter = express.Router();

onlineClassesRouter.get('/status', (_req, res) => {
  const { status, fetchedAt, error, items } = getOnlineClassesState();
  res.json({
    status,
    fetchedAt: fetchedAt ? new Date(fetchedAt).toISOString() : null,
    error,
    totalItems: items.length,
  });
});

onlineClassesRouter.get('/', async (req, res) => {
  try {
    const result = await queryOnlineClasses(getSyncState().classes, req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch online classes' });
  }
});
