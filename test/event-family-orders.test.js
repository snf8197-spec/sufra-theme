const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const twilight = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'twilight.json'), 'utf8'),
);
const component = twilight.components.find(
  ({ path: componentPath }) => componentPath === 'home.event-family-orders',
);
const template = fs.readFileSync(
  path.join(__dirname, '..', 'src/views/components/home/event-family-orders.twig'),
  'utf8',
);

test('Twilight provides editable bilingual event and family meal content', () => {
  assert.ok(component, 'the occasion and family meals homepage component must exist');

  const title = component.fields.find(({ id }) => id === 'title');
  const description = component.fields.find(({ id }) => id === 'description');
  assert.equal(title.multilanguage, true);
  assert.ok(title.value.ar && title.value.en);
  assert.equal(description.multilanguage, true);
  assert.ok(description.value.ar && description.value.en);
});

test('merchants can choose products and categories for the homepage section', () => {
  const categories = component.fields.find(({ id }) => id === 'categories');
  const products = component.fields.find(({ id }) => id === 'products');

  assert.equal(categories.source, 'categories');
  assert.equal(categories.multichoice, true);
  assert.equal(categories.required, false);
  assert.equal(products.source, 'products');
  assert.equal(products.multichoice, true);
  assert.equal(products.required, false);
});

test('the homepage section displays only configured content', () => {
  assert.match(template, /component\.categories\|length or component\.products\|length/);
  assert.match(template, /for category in component\.categories/);
  assert.match(template, /href="\{\{ category\.url \}\}"/);
  assert.match(template, /for product in component\.products/);
  assert.match(template, /custom-salla-product-card product="\{\{ product \}\}"/);
});
