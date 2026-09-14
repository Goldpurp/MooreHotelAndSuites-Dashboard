import { spawn } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const localDashboardUrl = "http://127.0.0.1:3000/";
const children = new Set();
let shuttingDown = false;

function start(command, args, options = {}) {
  const child = spawn(command, args, { stdio: "inherit", ...options });
  children.add(child);
  child.once("exit", () => children.delete(child));
  return child;
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill();
  process.exitCode = exitCode;
}

async function waitForDashboard(timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(localDashboardUrl, { redirect: "error" });
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`The Local dashboard did not start at ${localDashboardUrl}.`);
}

process.once("SIGINT", () => shutdown(130));
process.once("SIGTERM", () => shutdown(143));

const vite = start(npmCommand, ["run", "dev:local"]);
vite.once("exit", (code) => shutdown(code || 0));

try {
  await waitForDashboard();
  const desktop = start(npmCommand, ["exec", "--", "electron", "."], {
    env: { ...process.env, MOORE_DESKTOP_START_URL: localDashboardUrl },
  });
  desktop.once("exit", (code) => shutdown(code || 0));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  shutdown(1);
}
