const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const masterTemplate = fs.readFileSync(
  path.join(root, 'src/views/layouts/master.twig'),
  'utf8',
);
const globalStyles = fs.readFileSync(
  path.join(root, 'src/assets/styles/01-settings/global.scss'),
  'utf8',
);
const tailwindConfig = fs.readFileSync(path.join(root, 'tailwind.config.js'), 'utf8');

const MINIMUM_CONTRAST = 4.5;

function cssVariable(source, name) {
  const declaration = source.match(
    new RegExp(`--${name}:\\s*(#[\\da-f]{3,8})\\s*;`, 'i'),
  );

  assert.ok(declaration, `Expected --${name} to have a literal hex color`);
  return normalizeHex(declaration[1]);
}

function normalizeHex(hex) {
  let value = hex.replace(/^#/, '');
  if (value.length === 3) {
    value = value.split('').map((channel) => channel + channel).join('');
  }
  assert.match(value, /^[\da-f]{6}$/i, `Unsupported color value: ${hex}`);
  return `#${value.toLowerCase()}`;
}

function rgb(hex) {
  return normalizeHex(hex)
    .slice(1)
    .match(/.{2}/g)
    .map((channel) => parseInt(channel, 16));
}

function mix(hex, target, amount) {
  const sourceChannels = rgb(hex);
  const targetChannels = rgb(target);
  const channels = sourceChannels.map((channel, index) =>
    Math.round(channel + (targetChannels[index] - channel) * amount),
  );
  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function relativeLuminance(hex) {
  const [red, green, blue] = rgb(hex).map((channel) => channel / 255);
  const linearize = (channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

  return (
    0.2126 * linearize(red) +
    0.7152 * linearize(green) +
    0.0722 * linearize(blue)
  );
}

function contrastRatio(foreground, background) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

function assertReadable(foreground, background, context) {
  const ratio = contrastRatio(foreground, background);
  assert.ok(
    ratio >= MINIMUM_CONTRAST,
    `WCAG contrast failure${context ? ` (${context})` : ''}: ` +
      `${foreground} on ${background} = ${ratio.toFixed(2)}:1; ` +
      `normal text requires at least ${MINIMUM_CONTRAST}:1`,
  );
}

function bestBlackOrWhite(background) {
  const blackRatio = contrastRatio('#000000', background);
  const whiteRatio = contrastRatio('#ffffff', background);
  return blackRatio >= whiteRatio ? '#000000' : '#ffffff';
}

const localTextColors = [
  ['main text', cssVariable(globalStyles, 'main-text-color')],
  ['dark main text', cssVariable(globalStyles, 'main-text-color-dark')],
  ['supporting text', cssVariable(globalStyles, 'color-text')],
];

const localLightSurfaces = [
  ['white', '#ffffff'],
  ['Tailwind gray-50', '#f9fafb'],
  ['Tailwind gray-100', '#f3f4f6'],
  ['theme cream', cssVariable(globalStyles, 'color-grey')],
  ['theme light gray', cssVariable(globalStyles, 'color-light-grey')],
];

const merchantPrimaryFixtures = [
  { name: 'dark green', primary: '#263d35' },
  { name: 'blue', primary: '#1f6feb' },
  { name: 'orange', primary: '#d88643' },
  { name: 'bright yellow', primary: '#f0d34a' },
  { name: 'light gray', primary: '#d9d9d9' },
  { name: 'black', primary: '#000000' },
  { name: 'white', primary: '#ffffff' },
];

test('contrast failures report both colors and the measured ratio', () => {
  assert.throws(
    () => assertReadable('#777777', '#ffffff', 'diagnostic fixture'),
    /#777777 on #ffffff = 4\.48:1; normal text requires at least 4\.5:1/,
  );
});

test('Twilight primary shades and text tokens remain connected to the theme', () => {
  assert.match(masterTemplate, /--color-primary:\s*\{\{\s*theme\.color\.primary\s*\}\}/);
  assert.match(masterTemplate, /--color-primary-dark:\s*\{\{\s*theme\.color\.darker\(0\.15\)\s*\}\}/);
  assert.match(masterTemplate, /--color-primary-light:\s*\{\{\s*theme\.color\.lighter\(0\.15\)\s*\}\}/);
  assert.match(masterTemplate, /--color-primary-text:\s*\{\{\s*theme\.color\.darker\(0\.62\)\s*\}\}/);
  assert.match(masterTemplate, /--color-primary-reverse:\s*\{\{\s*theme\.color\.text\s*\}\}/);
  assert.match(tailwindConfig, /'primary'\s*:\s*'var\(--color-primary\)'/);
  assert.match(tailwindConfig, /'primary-d'\s*:\s*'var\(--color-primary-dark\)'/);
  assert.match(tailwindConfig, /'primary-l'\s*:\s*'var\(--color-primary-light\)'/);
  assert.match(tailwindConfig, /'primary-reverse'\s*:\s*'var\(--color-primary-reverse\)'/);
  assert.match(tailwindConfig, /'primary'\s*:\s*'var\(--color-primary-text\)'/);
});

test('local text colors meet WCAG AA on the light surfaces used by the theme', () => {
  for (const [textName, foreground] of localTextColors) {
    for (const [surfaceName, background] of localLightSurfaces) {
      assertReadable(foreground, background, `${textName} on ${surfaceName}`);
    }
  }
});

test('Twilight button and link colors meet WCAG AA for light and dark merchant colors', () => {
  // Twilight resolves theme colors when rendering a store, so use representative
  // merchant choices and model the configured darker/lighter blend amounts here.
  for (const { name, primary } of merchantPrimaryFixtures) {
    const primaryDark = mix(primary, '#000000', 0.15);
    const primaryLight = mix(primary, '#ffffff', 0.15);
    const primaryText = mix(primary, '#000000', 0.62);
    const reverseText = bestBlackOrWhite(primary);

    assert.ok(
      relativeLuminance(primaryDark) <= relativeLuminance(primary),
      `${name} dark shade ${primaryDark} must be darker than primary ${primary}`,
    );
    assert.ok(
      relativeLuminance(primaryLight) >= relativeLuminance(primary),
      `${name} light shade ${primaryLight} must be lighter than primary ${primary}`,
    );

    for (const [surfaceName, background] of localLightSurfaces) {
      assertReadable(primaryText, background, `${name} primary text on ${surfaceName}`);
    }

    assertReadable(reverseText, primary, `${name} reverse text on primary`);
    assertReadable(reverseText, primaryDark, `${name} reverse text on primary-dark`);
  }
});
