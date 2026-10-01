import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

const sourceRoots = ['components', 'hooks', 'lib', 'pages', 'store'];

async function sourceFiles(path) {
  const entries = await readdir(new URL(`../${path}/`, import.meta.url), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = `${path}/${entry.name}`;
    if (entry.isDirectory()) files.push(...await sourceFiles(relative));
    else if (/\.(?:ts|tsx)$/.test(entry.name)) files.push(relative);
  }
  return files;
}

test('application actions use the designed dialog system instead of browser dialogs', async () => {
  const files = (await Promise.all(sourceRoots.map(sourceFiles))).flat();
  files.push('App.tsx');

  for (const file of files) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /(?:window|globalThis)\.(?:alert|confirm|prompt)\s*\(/, `${file} uses a browser dialog`);
    assert.doesNotMatch(source, /(^|[^\w.])(alert|prompt)\s*\(/m, `${file} uses a browser dialog`);
  }

  const staff = await readFile(new URL('../pages/StaffManagement.tsx', import.meta.url), 'utf8');
  assert.match(staff, /useConfirmation\(\)/);
  assert.match(staff, /title: 'Send password setup link\?'/);
  assert.match(staff, /confirmLabel: 'Send setup link'/);
});

test('shared confirmation dialogs use the application focus and keyboard contract', async () => {
  const provider = await readFile(new URL('../components/ConfirmationProvider.tsx', import.meta.url), 'utf8');
  assert.match(provider, /useAccessibleModal\(Boolean\(pending\)/);
  assert.match(provider, /role="alertdialog"/);
  assert.match(provider, /aria-modal="true"/);
  assert.match(provider, /data-modal-cancel/);

  const mobileNav = await readFile(new URL('../components/MobileNav.tsx', import.meta.url), 'utf8');
  assert.match(mobileNav, /useAccessibleModal\(moreOpen/);
  assert.match(mobileNav, /ref=\{moreSheetRef\}/);
  assert.match(mobileNav, /data-modal-close/);
});
