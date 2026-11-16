const assert = require('node:assert/strict');
const { test } = require('node:test');
const { indexProblems, referenceProblems } = require('../../scripts/lint/validate-skill-index.js');

test('a card missing from the index is reported', () => {
  assert.deepStrictEqual(indexProblems('| [A](./a.md) | x |', ['SKILL.md', 'a.md', 'b.md']), ['b.md is not listed in SKILL.md']);
});

test('a complete index reports nothing', () => {
  assert.deepStrictEqual(indexProblems('[A](./a.md) [B](./b.md)', ['SKILL.md', 'a.md', 'b.md']), []);
});

test('a card outside the churchcrm folder must be linked with ../', () => {
  assert.deepStrictEqual(indexProblems('[A](./a.md) [B](../b.md)', ['a.md', '../b.md', '../c.md']), ['../c.md is not listed in SKILL.md']);
});

test('a reference to a removed card is reported', () => {
  const exists = (ref) => ref === 'cypress-testing.md';
  assert.deepStrictEqual(referenceProblems('see `testing.md` and `cypress-testing.md`', exists), ['testing.md']);
});

test('a path reference outside .agents is left to other checks', () => {
  assert.deepStrictEqual(referenceProblems('see `docs/missing.md`', () => false), []);
});

test('mentions of files in other repos are allowed', () => {
  assert.deepStrictEqual(referenceProblems('see `product-truth.md`', () => false), []);
});
