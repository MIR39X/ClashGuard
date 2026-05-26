import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), '.data');
const STORE_PATH = join(DATA_DIR, 'shares.json');

const ensureDir = () => {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
};

const load = () => {
  try {
    ensureDir();
    if (!existsSync(STORE_PATH)) return new Map();
    const raw = JSON.parse(readFileSync(STORE_PATH, 'utf8'));
    const now = Date.now();
    const map = new Map();
    for (const [code, entry] of Object.entries(raw)) {
      if (entry.expiresAt > now) map.set(code, entry);
    }
    return map;
  } catch {
    return new Map();
  }
};

const persist = (map) => {
  try {
    ensureDir();
    writeFileSync(STORE_PATH, JSON.stringify(Object.fromEntries(map)), 'utf8');
  } catch {
    // non-fatal — in-memory store still works
  }
};

const store = load();

export const shareStore = {
  has: (code) => store.has(code),
  get: (code) => store.get(code),
  set: (code, value) => {
    store.set(code, value);
    persist(store);
  },
  delete: (code) => {
    store.delete(code);
    persist(store);
  },
  entries: () => store.entries(),
};
