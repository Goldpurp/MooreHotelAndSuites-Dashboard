import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("dashboard branding uses R2 and its production policy permits it", async () => {
  for (const file of ["index.html", "components/Logo.tsx"]) {
    const source = await readFile(file, "utf8");
    assert.match(source, /https:\/\/media\.moorehotelandsuites\.com\//);
    assert.doesNotMatch(source, /https:\/\/res\.cloudinary\.com\//);
  }
  const blueprint = await readFile("render.yaml", "utf8");
  const policy = blueprint.match(/img-src[^;]+/)?.[0] ?? "";
  assert.match(policy, /https:\/\/media\.moorehotelandsuites\.com/);
  assert.match(policy, /https:\/\/res\.cloudinary\.com/);
  assert.doesNotMatch(policy, /\.r2\.dev/);
});

test("room image validation trusts the custom media domain, not the disabled development host", async () => {
  const source = await readFile("components/RoomModal.tsx", "utf8");
  const hosts = source.match(/const TRUSTED_ROOM_IMAGE_HOSTS = new Set\(\[([\s\S]*?)\]\)/)?.[1] ?? "";
  assert.match(hosts, /'media\.moorehotelandsuites\.com'/);
  assert.match(hosts, /'res\.cloudinary\.com'/);
  assert.doesNotMatch(hosts, /\.r2\.dev/);
});
