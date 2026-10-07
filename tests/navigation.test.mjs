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

const accessSource=await read('lib/access.ts');
const accessScript=ts.transpileModule(accessSource.replace(/import[^;]+;/,''),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const accessContext={exports:{},UserRole:{Admin:'Admin',Manager:'Manager',Staff:'Staff',Client:'Client'}};
vm.runInNewContext(accessScript,accessContext);
test('verified staff departments receive useful landing pages with least privilege',()=>{
 for(const [department,expected] of [['Engineering','settings'],['Maintenance','settings'],['Finance','settlements'],['Cashier','settlements'],['Housekeeping','housekeeping'],['Reception','bookings']]){
  const user={role:'Staff',department};assert.equal(accessContext.exports.firstAllowedTab(user),expected);
  assert.equal(accessContext.exports.canOpenTab(user,'pricing'),false);
  assert.equal(accessContext.exports.canOpenTab(user,'channels'),false);
 }
});

// The dashboard must keep the page set that predates the QA expansion.
test('only the original dashboard pages are routable', async () => {
  const app = await read('App.tsx');
  const routes = [...app.matchAll(/case "([a-z_]+)":/g)].map(match => match[1]).sort();
  assert.deepEqual(routes, ['dashboard','bookings','rooms','guests','reports','operation_log','staff','clients','settings','settlements','privacy','housekeeping'].sort());
});
