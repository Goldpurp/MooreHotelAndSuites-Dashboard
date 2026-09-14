import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const {
  PRODUCTION_DASHBOARD_URL,
  isAllowedNavigation,
  isSafeExternalUrl,
  resolveStartUrl,
} = require("../electron/url-policy.cjs");

test("packaged desktop app always uses the Production dashboard", () => {
  assert.equal(
    resolveStartUrl({ isPackaged: true, overrideUrl: "http://127.0.0.1:3000/" }),
    PRODUCTION_DASHBOARD_URL,
  );
});

test("desktop development overrides are limited to HTTPS and loopback HTTP", () => {
  assert.equal(
    resolveStartUrl({ isPackaged: false, overrideUrl: "http://127.0.0.1:3000/" }),
    "http://127.0.0.1:3000/",
  );
  assert.equal(
    resolveStartUrl({ isPackaged: false, overrideUrl: "http://untrusted.example/" }),
    PRODUCTION_DASHBOARD_URL,
  );
  assert.equal(
    resolveStartUrl({ isPackaged: false, overrideUrl: "file:///tmp/untrusted.html" }),
    PRODUCTION_DASHBOARD_URL,
  );
});

test("desktop in-app navigation stays on the configured dashboard origin", () => {
  assert.equal(
    isAllowedNavigation(
      "https://admin.moorehotelandsuites.com/?view=bookings",
      PRODUCTION_DASHBOARD_URL,
    ),
    true,
  );
  assert.equal(isAllowedNavigation("https://example.com/", PRODUCTION_DASHBOARD_URL), false);
  assert.equal(isAllowedNavigation("file:///tmp/untrusted.html", PRODUCTION_DASHBOARD_URL), false);
});

test("desktop external links must use HTTPS", () => {
  assert.equal(isSafeExternalUrl("https://example.com/help"), true);
  assert.equal(isSafeExternalUrl("http://example.com/help"), false);
  assert.equal(isSafeExternalUrl("javascript:alert(1)"), false);
});
