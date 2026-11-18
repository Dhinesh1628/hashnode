import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify, uniqueSlug } from '../src/lib/slugify.js';
import { makeExcerpt, readingMinutes, markdownToPlainText } from '../src/lib/markdown-text.js';
import { check } from '../src/lib/check.js';
import { loadEnv } from '../src/config/env.js';

test('slugify makes clean URL segments', () => {
  assert.equal(slugify('Building a REST API in Express!'), 'building-a-rest-api-in-express');
  assert.equal(slugify('  Café & Crème  '), 'cafe-creme');
  assert.equal(slugify('!!!'), '');
  assert.equal(slugify('C++'), 'c-plus-plus');
  assert.equal(slugify('C#'), 'c-sharp');
});

test('uniqueSlug never collides for identical titles', () => {
  const a = uniqueSlug('Hello World');
  const b = uniqueSlug('Hello World');
  assert.match(a, /^hello-world-[a-z0-9]+$/);
  assert.notEqual(a, b);
  assert.match(uniqueSlug('???'), /^untitled-/);
});

test('excerpt strips markdown and code', () => {
  const md = '# Title\n\nSome **bold** and a [link](http://x.com).\n\n```js\nconst secret = 1;\n```';
  assert.equal(markdownToPlainText(md), 'Title Some bold and a link.');
  assert.ok(!makeExcerpt(md).includes('secret'));
});

test('excerpt cuts on a word boundary', () => {
  const excerpt = makeExcerpt('word '.repeat(100), 20);
  assert.ok(excerpt.endsWith('…'));
  assert.ok(!excerpt.includes('wor…'));
});

test('reading time is at least one minute', () => {
  assert.equal(readingMinutes('hi'), 1);
  assert.equal(readingMinutes('word '.repeat(1000)), 5);
});

test('check collects every field error at once', () => {
  const v = check({ name: '  ', password: 'short' })
    .field('name', { label: 'Name', required: true })
    .field('email', { label: 'Email', required: true })
    .field('password', { label: 'Password', min: 8 });
  assert.equal(v.ok(), false);
  assert.deepEqual(Object.keys(v.errors()), ['name', 'email', 'password']);
});

test('loadEnv refuses weak or missing secrets', () => {
  assert.throws(() => loadEnv({ MONGO_URI: 'x' }), /JWT_SECRET/);
  assert.throws(() => loadEnv({ MONGO_URI: 'x', JWT_SECRET: 'short' }), /32 characters/);
});
