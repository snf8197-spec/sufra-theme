const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const twilight = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'twilight.json'), 'utf8'),
);
const component = twilight.components.find(({ path }) => path === 'home.main-links');
const template = fs.readFileSync(
  path.join(__dirname, '..', 'src/views/components/home/main-links.twig'),
  'utf8',
);

test('default food links target categories and offers', () => {
  assert.ok(component, 'home.main-links must be defined in Twilight settings');

  const linksField = component.fields.find(({ id }) => id === 'links');
  const defaultLinks = linksField.value;
  const categoryLinks = defaultLinks.filter(
    (link) => link['links.url__type'] === 'categories',
  );
  const offersLink = defaultLinks.find(
    (link) => link['links.url__type'] === 'offers_link',
  );

  assert.equal(categoryLinks.length, 6, 'all six food links must target categories');
  assert.ok(
    categoryLinks.every((link) => link['links.title']?.ar && link['links.title']?.en),
    'each category link must have Arabic and English titles',
  );
  assert.ok(offersLink, 'the default offers link must be configured');
  assert.ok(offersLink['links.title']?.ar && offersLink['links.title']?.en);
});

test('Twilight lets merchants choose category and offers destinations', () => {
  const linksField = component.fields.find(({ id }) => id === 'links');
  const urlField = linksField.fields.find(({ id }) => id === 'links.url');
  const destinationTypes = urlField.sources.map(({ key }) => key);

  assert.equal(urlField.type, 'items');
  assert.equal(urlField.format, 'variable-list');
  assert.equal(urlField.required, true);
  assert.ok(destinationTypes.includes('categories'));
  assert.ok(destinationTypes.includes('offers_link'));
});

test('homepage links render the saved URL and omit links without a destination', () => {
  const linkLoop = template.match(
    /for link in component\.links([\s\S]*?)\{% endfor %\}/,
  );

  assert.ok(linkLoop, 'homepage template must iterate over configured links');
  assert.match(linkLoop[1], /\{% if link\.title and link\.url %\}/);
  assert.match(linkLoop[1], /<a href="\{\{ link\.url \}\}"/);
});
