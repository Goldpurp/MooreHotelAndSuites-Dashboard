import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("extension");
const requiredFiles = [
  "manifest.json",
  "background.js",
  "popup.html",
  "popup.css",
  "popup.js",
  "icons/icon-16.png",
  "icons/icon-32.png",
  "icons/icon-48.png",
  "icons/icon-128.png",
];

const errors = [];
for (const relativePath of requiredFiles) {
  try {
    await access(path.join(root, relativePath));
  } catch {
    errors.push(`Missing ${relativePath}`);
  }
}

let manifest;
try {
  manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));
} catch {
  errors.push("manifest.json must contain valid JSON");
}

if (manifest) {
  if (manifest.manifest_version !== 3) errors.push("manifest_version must be 3");
  if (!/^\d{1,5}(?:\.\d{1,5}){0,3}$/.test(manifest.version || "")) {
    errors.push("version must contain one to four dot-separated integers");
  }
  if (manifest.background?.service_worker !== "background.js") {
    errors.push("background service worker must be background.js");
  }
  if (manifest.action?.default_popup !== "popup.html") {
    errors.push("the toolbar action must use popup.html");
  }

  const permissions = [...(manifest.permissions || [])].sort();
  if (JSON.stringify(permissions) !== JSON.stringify(["storage"])) {
    errors.push("the only allowed extension permission is storage");
  }
  if (manifest.host_permissions?.length) errors.push("host permissions are not allowed");
  if (manifest.content_scripts?.length) errors.push("content scripts are not allowed");
}

for (const scriptName of ["background.js", "popup.js"]) {
  const source = await readFile(path.join(root, scriptName), "utf8").catch(() => "");
  if (/\beval\s*\(|\bnew\s+Function\s*\(/.test(source)) {
    errors.push(`${scriptName} must not execute dynamic code`);
  }
  if (/http:\/\/(?!127\.0\.0\.1|localhost)/.test(source)) {
    errors.push(`${scriptName} contains an insecure remote URL`);
  }
}

const popupHtml = await readFile(path.join(root, "popup.html"), "utf8").catch(() => "");
if (/<script[^>]+src=["']https?:/i.test(popupHtml)) {
  errors.push("popup.html must not load remote JavaScript");
}
if (/<script(?![^>]+src=)/i.test(popupHtml)) {
  errors.push("popup.html must not contain inline JavaScript");
}

if (errors.length) {
  console.error(`Chrome extension validation failed:\n- ${errors.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log(
    `Chrome extension ${manifest.version} is valid: Manifest V3, no host access, storage-only permission.`,
  );
}
