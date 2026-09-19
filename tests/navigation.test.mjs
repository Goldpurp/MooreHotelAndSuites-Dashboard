import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("every rendered dashboard route survives URL navigation, including Privacy", async () => {
  const [context, app] = await Promise.all([read("store/HotelContext.tsx"), read("App.tsx")]);
  const routing = context.slice(context.indexOf("const VALID_TABS"), context.indexOf("export const useHotel"));
  const script = ts.transpileModule(routing + "\nreadInitialTab();", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const routes = [...app.matchAll(/case "([a-z_]+)":/g)].map((match) => match[1]);
  assert.ok(routes.includes("privacy"));
  for (const route of routes) {
    const result = vm.runInNewContext(script, { URL, window: { location: { href: `https://admin.example/?view=${route}` } } });
    assert.equal(result, route, `${route} must not redirect to Home`);
  }
  assert.equal(vm.runInNewContext(script, { URL, window: { location: { href: "https://admin.example/?view=unknown" } } }), "dashboard");
});

test("all desktop and mobile navigation destinations have a rendered page", async () => {
  const [app, sidebar, mobile] = await Promise.all([read("App.tsx"), read("components/Sidebar.tsx"), read("components/MobileNav.tsx")]);
  const routes = new Set([...app.matchAll(/case "([a-z_]+)":/g)].map((match) => match[1]));
  for (const source of [sidebar, mobile]) {
    const destinations = [...source.matchAll(/(?:id: |setActiveTab\()["']([a-z_]+)["']/g)].map((match) => match[1]);
    for (const destination of destinations) assert.ok(routes.has(destination), `${destination} needs a page`);
  }
});
