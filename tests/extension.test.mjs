import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

const manifest = JSON.parse(
  await readFile(new URL("../extension/manifest.json", import.meta.url), "utf8"),
);

test("Chrome extension uses least-privilege Manifest V3 settings", () => {
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ["storage"]);
  assert.equal(manifest.host_permissions, undefined);
  assert.equal(manifest.content_scripts, undefined);
  assert.equal(manifest.background.service_worker, "background.js");
  assert.equal(manifest.action.default_popup, "popup.html");
});

test("extension opens and then reuses its dedicated Production dashboard tab", async () => {
  const source = await readFile(new URL("../extension/background.js", import.meta.url), "utf8");
  const sessionValues = {};
  const createdTabs = [];
  const updatedTabs = [];
  const focusedWindows = [];
  let messageHandler;

  const chrome = {
    storage: {
      session: {
        async get(key) { return { [key]: sessionValues[key] }; },
        async set(values) { Object.assign(sessionValues, values); },
        async remove(key) { delete sessionValues[key]; },
      },
    },
    tabs: {
      async create(options) {
        createdTabs.push(options);
        return { id: 42, windowId: 8 };
      },
      async get(tabId) {
        if (tabId !== 42) throw new Error("Missing tab.");
        return { id: 42, windowId: 8 };
      },
      async update(tabId, options) { updatedTabs.push({ tabId, ...options }); },
      onRemoved: { addListener() {} },
    },
    windows: {
      async update(windowId, options) { focusedWindows.push({ windowId, ...options }); },
    },
    runtime: {
      onMessage: {
        addListener(handler) { messageHandler = handler; },
      },
    },
    commands: { onCommand: { addListener() {} } },
  };

  vm.runInNewContext(source, { chrome });
  assert.equal(typeof messageHandler, "function");

  const sendMessage = () =>
    new Promise((resolve) => {
      assert.equal(messageHandler({ type: "OPEN_DASHBOARD" }, {}, resolve), true);
    });

  const firstResult = await sendMessage();
  assert.equal(firstResult.opened, true);
  assert.equal(firstResult.reused, false);
  assert.equal(createdTabs.length, 1);
  assert.equal(createdTabs[0].active, true);
  assert.equal(createdTabs[0].url, "https://admin.moorehotelandsuites.com/");

  const secondResult = await sendMessage();
  assert.equal(secondResult.opened, true);
  assert.equal(secondResult.reused, true);
  assert.equal(focusedWindows.length, 1);
  assert.equal(focusedWindows[0].windowId, 8);
  assert.equal(focusedWindows[0].focused, true);
  assert.equal(updatedTabs.length, 1);
  assert.equal(updatedTabs[0].tabId, 42);
  assert.equal(updatedTabs[0].active, true);
  assert.equal(updatedTabs[0].url, "https://admin.moorehotelandsuites.com/");
});
