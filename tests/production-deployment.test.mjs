import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function parseEnv(source) {
  return Object.fromEntries(
    source
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

test("production profile targets only the HTTPS production API", async () => {
  const env = parseEnv(await readFile(".env.production", "utf8"));
  const apiUrl = new URL(env.VITE_API_BASE_URL);

  assert.equal(env.VITE_APP_ENV, "production");
  assert.equal(env.VITE_API_MODE, "direct");
  assert.equal(apiUrl.protocol, "https:");
  assert.equal(apiUrl.hostname, "api.moorehotelandsuites.com");
  assert.equal(apiUrl.pathname, "/api");
});

test("production browser configuration contains no secret-shaped keys", async () => {
  const env = parseEnv(await readFile(".env.production", "utf8"));
  const forbidden = /password|secret|private|connection|string|api_?key|jwt/i;

  for (const key of Object.keys(env)) {
    assert.doesNotMatch(key, forbidden);
  }
});

test("Render definition includes SPA routing and dashboard security policy", async () => {
  const blueprint = await readFile("render.yaml", "utf8");

  assert.match(blueprint, /buildCommand: npm ci && npm run build:production/);
  assert.match(blueprint, /name: Content-Security-Policy/);
  assert.match(blueprint, /name: Strict-Transport-Security/);
  assert.match(blueprint, /type: rewrite[\s\S]*source: \/\*[\s\S]*destination: \/index\.html/);
});
