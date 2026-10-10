import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import ts from 'typescript';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const parserJs = ts.transpileModule(await readFile(new URL('../lib/analytics.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext },
}).outputText;
const parser = await import('data:text/javascript;base64,' + Buffer.from(parserJs).toString('base64'));
const hookJs = ts.transpileModule(await readFile(new URL('../hooks/useAnalytics.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const report = (value = 900) => ({
  kpis: { netRevenue: value, occupancyRate: 50, activeGuests: 2, avgNightlyRate: 100, revenueGrowthPercentage: 10, occupancyGrowthPercentage: 5 },
  revenueDynamics: [{ date: '2026-10-10', value }],
  fromDate: '2026-10-04', toDate: '2026-10-10',
  report: { payments: value + 100, refunds: 100, revPar: 50, adr: 100, receivables: 20, guestCredits: 0 },
});

function harness(t) {
  const calls = [];
  const exports = {};
  vm.runInNewContext(hookJs, {
    exports, Error,
    require: name => {
      if (name === 'react') return React;
      if (name === '../lib/analytics') return parser;
      if (name === '../lib/api') return { api: { get: (url, options) => new Promise((resolve, reject) => calls.push({ url, options, resolve, reject })) } };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  let latest;
  const renders = [];
  function Probe({ period, revision }) {
    latest = exports.useAnalytics(period, revision);
    renders.push(latest);
    return null;
  }
  t.after(async () => { await React.act(() => root.unmount()); container.remove(); });
  return {
    calls, renders,
    get state() { return latest; },
    render: (period = 'week', revision = []) => React.act(() => root.render(React.createElement(Probe, { period, revision }))),
    resolve: (index, value) => React.act(async () => { calls[index].resolve(value); }),
    reject: (index, message) => React.act(async () => { calls[index].reject(new Error(message)); }),
    unmount: () => React.act(() => root.unmount()),
  };
}

test('initial load is loading; repeated background refreshes retain the complete report until replaced', async t => {
  const h = harness(t);
  await h.render();
  assert.equal(h.state.loading, true);
  assert.equal(h.state.analytics, null);
  assert.equal(h.state.error, '');
  assert.equal(h.calls[0].url, '/api/analytics/overview');
  assert.equal(h.calls[0].options.params.period, 'week');
  await h.resolve(0, report());
  const prior = h.state.analytics;
  const checkpoint = h.renders.length;
  await h.render(); // HotelContext replaces the bookings array after each sync.
  assert.equal(h.state.analytics, prior);
  assert.equal(h.state.loading, false);
  assert.equal(h.state.refreshing, true);
  await h.resolve(1, report(1000));
  await h.render();
  assert.equal(h.state.analytics.kpis.netRevenue, 1000);
  await h.resolve(2, report(1100));
  assert.equal(h.state.refreshing, false);
  assert.equal(h.state.analytics.kpis.netRevenue, 1100);
  assert.ok(h.renders.slice(checkpoint).every(state => state.analytics !== null));
});

test('failed refresh keeps the last report and warning through retries, then recovers', async t => {
  const h = harness(t);
  await h.render();
  await h.resolve(0, report());
  const prior = h.state.analytics;
  await h.render();
  await h.reject(1, 'The hotel service did not respond in time.');
  assert.equal(h.state.analytics, prior);
  assert.equal(h.state.loading, false);
  assert.equal(h.state.refreshing, false);
  assert.match(h.state.error, /did not respond/);
  await h.render();
  assert.equal(h.state.analytics, prior);
  assert.match(h.state.error, /did not respond/);
  await h.resolve(2, report(1200));
  assert.equal(h.state.error, '');
  assert.equal(h.state.analytics.kpis.netRevenue, 1200);
});

test('first-load failure has no report and can recover on the next sync', async t => {
  const h = harness(t);
  await h.render();
  await h.reject(0, 'Service unavailable');
  assert.equal(h.state.analytics, null);
  assert.equal(h.state.loading, false);
  assert.equal(h.state.error, 'Service unavailable');
  await h.render();
  assert.equal(h.state.loading, true);
  await h.resolve(1, report());
  assert.equal(h.state.error, '');
  assert.ok(h.state.analytics);
});

test('period changes hide old figures in every render and ignore out-of-order responses', async t => {
  const h = harness(t);
  await h.render('week');
  await h.resolve(0, report());
  await h.render('week');
  const checkpoint = h.renders.length;
  await h.render('day');
  assert.ok(h.renders.slice(checkpoint).every(state => state.analytics === null && state.loading));
  await h.resolve(1, report(999)); // Obsolete week refresh.
  assert.equal(h.state.analytics, null);
  await h.render('month');
  await h.reject(2, 'Obsolete day error');
  assert.equal(h.state.error, '');
  assert.equal(h.state.loading, true);
  const month = { ...report(3000), fromDate: '2026-09-11' };
  await h.resolve(3, month);
  assert.deepEqual(h.state.analytics, month);
});

test('invalid refresh data preserves valid values and never becomes a successful empty report', async t => {
  const h = harness(t);
  await h.render();
  await h.resolve(0, report());
  await h.render();
  await h.resolve(1, { kpis: {} });
  assert.equal(h.state.analytics.kpis.netRevenue, 900);
  assert.match(h.state.error, /could not be read/);
  assert.equal(h.state.refreshing, false);
});

test('superseded same-period responses and requests completed after unmount are ignored', async t => {
  const h = harness(t);
  await h.render();
  await h.render();
  await h.resolve(1, report(2000));
  await h.resolve(0, report(1000));
  assert.equal(h.state.analytics.kpis.netRevenue, 2000);
  await h.render();
  const count = h.renders.length;
  await h.unmount();
  await h.reject(2, 'Late error');
  assert.equal(h.renders.length, count);
});
