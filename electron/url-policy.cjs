"use strict";

const PRODUCTION_DASHBOARD_URL = "https://admin.moorehotelandsuites.com/";

function isLoopback(hostname) {
  return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(
    String(hostname).toLowerCase(),
  );
}

function parseAllowedUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return url;
    if (url.protocol === "http:" && isLoopback(url.hostname)) return url;
    return null;
  } catch {
    return null;
  }
}

function resolveStartUrl({ isPackaged, overrideUrl } = {}) {
  if (isPackaged) return PRODUCTION_DASHBOARD_URL;
  return parseAllowedUrl(overrideUrl || "")?.toString() || PRODUCTION_DASHBOARD_URL;
}

function isAllowedNavigation(targetUrl, startUrl) {
  const target = parseAllowedUrl(targetUrl);
  const start = parseAllowedUrl(startUrl);
  return Boolean(target && start && target.origin === start.origin);
}

function isSafeExternalUrl(targetUrl) {
  try {
    return new URL(targetUrl).protocol === "https:";
  } catch {
    return false;
  }
}

module.exports = {
  PRODUCTION_DASHBOARD_URL,
  isAllowedNavigation,
  isSafeExternalUrl,
  resolveStartUrl,
};
