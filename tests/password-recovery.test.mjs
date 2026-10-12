import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import ts from 'typescript';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://admin.example.test/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const compile = async file => ts.transpileModule(await readFile(new URL(file, import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText;
const source = await compile('../pages/StaffSetupPassword.tsx');
const routeExports = {};
vm.runInNewContext(await compile('../lib/passwordRecovery.ts'), { exports: routeExports, URLSearchParams });

for (const mode of ['reset-password', 'setup-password']) {
  test(`${mode} opens from the static root fragment and legacy path`, () => {
    assert.equal(routeExports.passwordRecoveryMode({ pathname: '/', hash: `#route=${mode}&userId=user&token=secret` }), mode);
    assert.equal(routeExports.passwordRecoveryMode({ pathname: `/${mode}/`, hash: '#userId=user&token=secret' }), mode);
  });
}
test('ordinary dashboard routes do not become password recovery screens', () => {
  assert.equal(routeExports.passwordRecoveryMode({ pathname: '/', hash: '' }), null);
  assert.equal(routeExports.passwordRecoveryMode({ pathname: '/', hash: '#route=https://other.test' }), null);
});

async function harness(t, mode = 'reset-password', withToken = true) {
  window.history.replaceState(null, '', `/#route=${mode}${withToken ? '&userId=synthetic-user&token=synthetic-token' : ''}`);
  const calls = [];
  const exports = {};
  vm.runInNewContext(source, {
    exports, window, URLSearchParams, Error,
    require: name => {
      if (name === 'react') return React;
      if (name === 'lucide-react') return new Proxy({}, { get: () => () => null });
      if (name === '../components/Logo') return { default: () => null, __esModule: true };
      if (name === '../lib/api') return { api: { post: (url, payload) => new Promise((resolve, reject) => calls.push({ url, payload, resolve, reject })) } };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  t.after(async () => { await React.act(() => root.unmount()); container.remove(); });
  await React.act(() => root.render(React.createElement(exports.default, { mode })));
  async function fill(label, value) {
    const input = container.querySelector(label === 'password' ? '#staffPassword' : '#staffPasswordConfirmation');
    await React.act(() => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value);
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
  }
  return {
    container, calls, fill,
    submit: () => React.act(() => container.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))),
    resolve: () => React.act(async () => calls[0].resolve({})),
    reject: message => React.act(async () => calls[0].reject(new Error(message))),
  };
}

for (const mode of ['reset-password', 'setup-password']) {
  test(`${mode} retains the link only in memory and submits to its matching endpoint`, async t => {
    const h = await harness(t, mode);
    assert.equal(window.location.hash, `#route=${mode}`);
    assert.match(h.container.querySelector('h1').textContent, mode === 'reset-password' ? /Reset your password/ : /Create your staff password/);
    await h.fill('password', 'NewTestPassword123!');
    await h.fill('confirmation', 'NewTestPassword123!');
    await h.submit();
    assert.equal(h.calls.length, 1);
    assert.equal(h.calls[0].url, `/api/Auth/${mode}`);
    assert.deepEqual(JSON.parse(JSON.stringify(h.calls[0].payload)), {
      userId: 'synthetic-user', token: 'synthetic-token', newPassword: 'NewTestPassword123!', confirmNewPassword: 'NewTestPassword123!',
    });
    assert.equal(h.container.querySelector('button[type=submit]').disabled, true);
    await h.submit();
    assert.equal(h.calls.length, 1);
    await h.resolve();
    assert.equal(h.container.querySelector('form'), null);
    assert.equal(h.container.querySelector('input'), null);
    assert.match(h.container.textContent, /Your password is ready/);
    assert.match(h.container.textContent, /Continue to dashboard sign in/);
  });
}

test('weak or mismatched passwords do not reach the API', async t => {
  const h = await harness(t);
  await h.fill('password', 'short');
  await h.fill('confirmation', 'short');
  await h.submit();
  assert.match(h.container.querySelector('[role=alert]').textContent, /12\+ characters/);
  await h.fill('password', 'ValidTestPassword123!');
  await h.fill('confirmation', 'OtherTestPassword123!');
  await h.submit();
  assert.match(h.container.querySelector('[role=alert]').textContent, /do not match/);
  assert.equal(h.calls.length, 0);
});

test('an expired token gives one inline error and leaves the form retryable', async t => {
  const h = await harness(t);
  await h.fill('password', 'NewTestPassword123!');
  await h.fill('confirmation', 'NewTestPassword123!');
  await h.submit();
  await h.reject('The password reset link is invalid or expired.');
  assert.equal(h.container.querySelectorAll('[role=alert]').length, 1);
  assert.match(h.container.querySelector('[role=alert]').textContent, /invalid or expired/);
  assert.equal(h.container.querySelector('button[type=submit]').disabled, false);
  assert.equal(h.container.querySelector('a').getAttribute('href'), '/');
});

test('a refresh after secret removal directs the user back to sign in', async t => {
  const h = await harness(t, 'reset-password', false);
  assert.match(h.container.querySelector('[role=alert]').textContent, /incomplete/);
  assert.equal(h.container.querySelector('button[type=submit]').disabled, true);
  await h.submit();
  assert.equal(h.calls.length, 0);
  assert.equal(h.container.querySelector('a').getAttribute('href'), '/');
});
