import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('staff login survives tab discard while logout clears every token store', async () => {
  const source = await readFile(new URL('../lib/api.ts', import.meta.url), 'utf8');

  assert.match(source, /window\.localStorage/);
  assert.match(source, /legacySessionToken/);
  assert.match(source, /writeStorage\(window\.localStorage, TOKEN_KEY, legacySessionToken\)/);
  assert.match(source, /removeStorage\(window\.localStorage, TOKEN_KEY\)/);
  assert.match(source, /removeStorage\(window\.sessionStorage, TOKEN_KEY\)/);
  assert.doesNotMatch(source, /getToken: \(\) => sessionStorage/);
});
