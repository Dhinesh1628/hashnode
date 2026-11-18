// The exact endpoint names and verbs from the PRD's API specification (section 5).
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

test('PUT /api/posts/:id updates a post, owner only', async () => {
  const alice = await signUp('Alice');
  const bob = await signUp('Bob');
  const post = await createPost(alice, { tags: ['js'] });
  const full = { title: 'Updated', content: 'New body', tags: ['react'], coverImage: 'https://example.com/c.png', status: 'draft' };

  await api().put(`/api/posts/${post._id}`).set(bob.auth).send(full).expect(403);
  await api().put(`/api/posts/${post._id}`).send(full).expect(401);

  const res = await api().put(`/api/posts/${post._id}`).set(alice.auth).send(full).expect(200);
  assert.equal(res.body.post.title, 'Updated');
  assert.equal(res.body.post.status, 'draft');
  assert.deepEqual(res.body.post.tags.map((t) => t.name), ['react']);
  assert.equal(res.body.post.slug, post.slug);
});

test('GET /api/posts/mine lists my drafts and published posts', async () => {
  const alice = await signUp('Alice');
  await createPost(alice, { title: 'Draft one', status: 'draft' });
  await createPost(alice, { title: 'Live one' });

  await api().get('/api/posts/mine').expect(401);
  const res = await api().get('/api/posts/mine').set(alice.auth).expect(200);
  assert.deepEqual(res.body.posts.map((p) => p.title).sort(), ['Draft one', 'Live one']);
});

test('GET /api/posts?search= matches titles (and never drafts)', async () => {
  const alice = await signUp('Alice');
  await createPost(alice, { title: 'Mastering MongoDB indexes' });
  await createPost(alice, { title: 'MongoDB draft', status: 'draft' });
  await createPost(alice, { title: 'Unrelated' });

  const res = await api().get('/api/posts?search=mongodb').expect(200);
  assert.deepEqual(res.body.posts.map((p) => p.title), ['Mastering MongoDB indexes']);
});

test('GET /api/tags/:slug/posts lists published posts under a tag', async () => {
  const alice = await signUp('Alice');
  await createPost(alice, { title: 'Tagged', tags: ['career'] });
  await createPost(alice, { title: 'Tagged draft', tags: ['career'], status: 'draft' });
  await createPost(alice, { title: 'Other', tags: ['css'] });

  const res = await api().get('/api/tags/career/posts').expect(200);
  assert.equal(res.body.tag.name, 'career');
  assert.deepEqual(res.body.posts.map((p) => p.title), ['Tagged']);
  assert.equal(res.body.pagination.total, 1);
  await api().get('/api/tags/nope/posts').expect(404);
});

test('GET /api/users/:id returns the profile and their published posts', async () => {
  const alice = await signUp('Alice');
  await createPost(alice, { title: 'Public' });
  await createPost(alice, { title: 'Private draft', status: 'draft' });

  const res = await api().get(`/api/users/${alice.id}`).expect(200);
  assert.equal(res.body.user.name, 'Alice');
  assert.equal(res.body.user.email, undefined);
  assert.deepEqual(res.body.posts.map((p) => p.title), ['Public']);
  assert.equal(res.body.posts[0].content, undefined);
});

test('PUT /api/users/me updates my profile', async () => {
  const alice = await signUp('Alice');
  const res = await api().put('/api/users/me').set(alice.auth)
    .send({ name: 'Alice A', bio: 'Hi', avatarUrl: 'https://example.com/a.png' })
    .expect(200);
  assert.equal(res.body.user.name, 'Alice A');
  assert.equal(res.body.user.avatarUrl, 'https://example.com/a.png');
});

test('GET /api/posts/:id works for the owner\'s editor; drafts stay hidden from others', async () => {
  const alice = await signUp('Alice');
  const bob = await signUp('Bob');
  const draft = await createPost(alice, { status: 'draft' });
  const live = await createPost(alice, { title: 'Live' });

  await api().get(`/api/posts/${draft._id}`).set(alice.auth).expect(200);
  await api().get(`/api/posts/${draft._id}`).set(bob.auth).expect(404);
  await api().get(`/api/posts/${draft._id}`).expect(404);
  const byId = await api().get(`/api/posts/${live._id}`).expect(200);
  assert.equal(byId.body.post.slug, live.slug);
});
