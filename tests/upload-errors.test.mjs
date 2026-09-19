import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../lib/api.ts', import.meta.url), 'utf8');
const body = source.slice(source.indexOf('function readMessage'), source.indexOf('function endSession'));
const script = ts.transpileModule(body + '\nreadMessage(payload, status);', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const message = (payload, status) => vm.runInNewContext(script, { payload, status });

test('image upload failures explain the failed step without leaking provider details', () => {
  const result = message({ code: 'image_upload_unavailable', detail: 'private provider credentials' }, 503);
  assert.match(result, /photos could not be uploaded/i);
  assert.doesNotMatch(result, /credentials/);
});

test('other server errors retain the generic safe message', () => {
  assert.doesNotMatch(message({ detail: 'secret', code: 'unrecognized' }, 500), /secret/);
  assert.doesNotMatch(message({ detail: 'secret' }, 503), /secret/);
  assert.equal(message({ detail: 'Choose a room type' }, 400), 'Choose a room type');
});
