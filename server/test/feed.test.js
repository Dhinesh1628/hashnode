// Home feed extras: popular sort, bookmark flags on cards, and authors to follow.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startTestApp } from './helpers.js';

let ctx;
let api;
before(async () => { ctx = await startTestApp(); api = () => request(ctx.app); });
after(async () => { await ctx.stop(); });
beforeEach(async () => { await ctx.reset(); });

async function signUp(name) {
  const res = await api().post('/api/auth/register')
    .send({ name, email: `${name.toLowerCase()}@example.com`, password: 'correct-horse' })
    .expect(201);
  return { id: res.body.user._id, auth: { Authorization: `Bearer ${res.body.token}` } };
}

async function createPost(user, fields = {}) {
  const res = await api().post('/api/posts').set(user.auth)
    .send({ title: 'Hello World', content: 'Some text.', status: 'published', ...fields })
    .expect(201);
  return res.body.post;
}
const like = (user, post) => api().post(`/api/posts/${post._id}/like`).set(user.auth).expect(200);

test('?sort=popular puts the most-liked posts first', async () => {
  const alice = await signUp('Alice');
  const bob = await signUp('Bob');
  const carol = await signUp('Carol');
  const quiet = await createPost(alice, { title: 'Quiet' });
  const hit = await createPost(alice, { title: 'Hit' });
  await createPost(alice, { title: 'Newest' });
  await like(bob, hit);
  await like(carol, hit);
  await like(bob, quiet);

  const popular = await api().get('/api/posts?sort=popular').expect(200);
  assert.deepEqual(popular.body.posts.map((p) => p.title), ['Hit', 'Quiet', 'Newest']);
  const latest = await api().get('/api/posts').expect(200);
  assert.equal(latest.body.posts[0].title, 'Newest');
  const unknown = await api().get('/api/posts?sort=whatever').expect(200);
  assert.equal(unknown.body.posts[0].title, 'Newest');
});

test('feed cards say whether I bookmarked each post; visitors get no flag', async () => {
  const alice = await signUp('Alice');
  const bob = await signUp('Bob');
  const saved = await createPost(alice, { title: 'Saved', tags: ['js'] });
  await createPost(alice, { title: 'Not saved', tags: ['js'] });
  await api().post(`/api/posts/${saved._id}/bookmark`).set(bob.auth).expect(200);

  const flags = (res) => Object.fromEntries(res.body.posts.map((p) => [p.title, p.bookmarked]));
  assert.deepEqual(flags(await api().get('/api/posts').set(bob.auth).expect(200)), { Saved: true, 'Not saved': false });
  assert.deepEqual(flags(await api().get('/api/posts').set(alice.auth).expect(200)), { Saved: false, 'Not saved': false });
  assert.deepEqual(flags(await api().get('/api/tags/js/posts').set(bob.auth).expect(200)), { Saved: true, 'Not saved': false });

  const anon = await api().get('/api/posts').expect(200);
  assert.ok(anon.body.posts.every((p) => p.bookmarked === undefined));
  const garbage = await api().get('/api/posts').set({ Authorization: 'Bearer nope' }).expect(200);
  assert.equal(garbage.body.posts.length, 2);

  const mine = await api().get('/api/users/me/bookmarks').set(bob.auth).expect(200);
  assert.deepEqual(flags(mine), { Saved: true });
});

test('authors to follow: active writers, most liked first, never me or people I follow', async () => {
  const me = await signUp('Me');
  const popular = await signUp('Popular');
  const quiet = await signUp('Quiet');
  const followed = await signUp('Followed');
  const draftsOnly = await signUp('Drafter');
  const reader = await signUp('Reader');

  await createPost(me, { title: 'Mine' });
  const hit = await createPost(popular, { title: 'Hit' });
  await createPost(quiet, { title: 'Quiet one' });
  await createPost(quiet, { title: 'Quiet two' });
  await createPost(followed, { title: 'Followed post' });
  await createPost(draftsOnly, { title: 'Draft', status: 'draft' });
  await like(reader, hit);
  await api().post(`/api/users/${followed.id}/follow`).set(me.auth).expect(200);

  const res = await api().get('/api/users/suggested').set(me.auth).expect(200);
  assert.deepEqual(res.body.users.map((u) => u.name), ['Popular', 'Quiet']);
  assert.equal(res.body.users[1].postCount, 2);
  assert.equal(res.body.users[0].email, undefined);

  const anon = await api().get('/api/users/suggested?limit=2').expect(200);
  assert.deepEqual(anon.body.users.map((u) => u.name), ['Popular', 'Quiet']);
});
