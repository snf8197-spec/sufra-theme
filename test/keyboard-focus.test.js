const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('keyboard focus uses a visible, two-tone outline on interactive controls', () => {
  const appStyles = read('src/assets/styles/app.scss');

  assert.match(appStyles, /:focus-visible,\s*salla-button:focus-within\s*\{/);
  assert.match(appStyles, /outline:\s*3px solid #111827;/);
  assert.match(appStyles, /outline-offset:\s*3px;/);
  assert.match(appStyles, /box-shadow:\s*0 0 0 3px #fff;/);
  assert.match(appStyles, /@media\s*\(forced-colors:\s*active\)/);
  assert.match(appStyles, /outline-color:\s*Highlight;/);
});

test('shared styles and Tailwind do not disable focus outlines', () => {
  const tailwindConfig = read('tailwind.config.js');
  const resetStyles = read('src/assets/styles/02-generic/reset.scss');
  const headerStyles = read('src/assets/styles/04-components/header.scss');
  const userMenuStyles = read('src/assets/styles/04-components/user-menu.scss');

  assert.doesNotMatch(tailwindConfig, /outline:\s*false/);
  assert.doesNotMatch(resetStyles, /outline:\s*none/);
  assert.doesNotMatch(headerStyles, /outline-none/);
  assert.doesNotMatch(userMenuStyles, /outline:\s*none/);
});
