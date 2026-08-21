import assert from 'node:assert/strict';
import test from 'node:test';
import { toAllowedSheetUrl } from './syncService.js';

test('accepts the configured Google Sheets export shape', () => {
  const url = toAllowedSheetUrl(
    'https://docs.google.com/spreadsheets/d/example/gviz/tq?tqx=out:json&gid=',
    696071600,
  );

  assert.equal(new URL(url).searchParams.get('gid'), '696071600');
});

test('rejects non-allowlisted and malformed sheet destinations', () => {
  assert.throws(
    () => toAllowedSheetUrl('http://127.0.0.1:3000/internal?gid=', '12'),
    /not allowlisted/,
  );
  assert.throws(
    () => toAllowedSheetUrl('https://docs.google.com/spreadsheets/d/example/gviz/tq?gid=', '../admin'),
    /identifier/,
  );
});
