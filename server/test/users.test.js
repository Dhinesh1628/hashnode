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

// --- Profiles -------------------------------------------------------------

test('public profile shows name and counts, never email', async () => {
  const alice = await signUp('Alice');
  await createPost(alice);
  await createPost(alice, { status: 'draft' }); // drafts are not counted

  const res = await api().get(`/api/users/${alice.id}`).expect(200);
  assert.equal(res.body.user.name, 'Alice');
  assert.equal(res.body.user.email, undefined);
  assert.equal(res.body.user.password, undefined);
  assert.deepEqual(res.body.stats, { posts: 1, followers: 0, following: 0 });
  assert.equal(res.body.isFollowing, false);

  await api().get('/api/users/not-an-id').expect(404);
  await api().get('/api/users/507f1f77bcf86cd799439011').expect(404);
});

test('I can edit my own profile, but not my email or password', async () => {
  const alice = await signUp('Alice');
  await api().patch('/api/users/me').send({ bio: 'x' }).expect(401);

  const res = await api().patch('/api/users/me').set(alice.auth)
    .send({ name: ' Alice B ', bio: 'I write about React', avatarUrl: 'https://example.com/a.png', email: 'evil@example.com', password: 'hacked123' })
    .expect(200);
  assert.equal(res.body.user.name, 'Alice B');
  assert.equal(res.body.user.bio, 'I write about React');
  assert.equal(res.body.user.email, 'alice@example.com');
  assert.equal(res.body.user.password, undefined);

  // The old password still works; the "hacked" one doesn't.
  await api().post('/api/auth/login').send({ email: 'alice@example.com', password: 'correct-horse' }).expect(200);
  await api().post('/api/auth/login').send({ email: 'alice@example.com', password: 'hacked123' }).expect(401);

  const bad = await api().patch('/api/users/me').set(alice.auth)
    .send({ name: '', bio: 'x'.repeat(201), avatarUrl: 'javascript:alert(1)' })
    .expect(400);
  assert.deepEqual(Object.keys(bad.body.error.fields).sort(), ['avatarUrl', 'bio', 'name']);

  // Posts show the new name straight away (it's read from the user, not copied).
  await createPost(alice);
  const feed = await api().get('/api/posts').expect(200);
  assert.equal(feed.body.posts[0].author.name, 'Alice B');
});

// --- Following ------------------------------------------------------------

test('follow and unfollow: login needed, no self-follow, safe to repeat', async () => {
  const alice = await signUp('Alice');
  const bob = await signUp('Bob');

  await api().post(`/api/users/${alice.id}/follow`).expect(401);
  await api().post(`/api/users/${bob.id}/follow`).set(bob.auth).expect(400);
  await api().post('/api/users/507f1f77bcf86cd799439011/follow').set(bob.auth).expect(404);

  const f1 = await api().post(`/api/users/${alice.id}/follow`).set(bob.auth).expect(200);
  assert.deepEqual(f1.body, { following: true, followerCount: 1 });
  const f2 = await api().post(`/api/users/${alice.id}/follow`).set(bob.auth).expect(200);
  assert.equal(f2.body.followerCount, 1);

  const profile = await api().get(`/api/users/${alice.id}`).set(bob.auth).expect(200);
  assert.equal(profile.body.isFollowing, true);
  assert.equal(profile.body.stats.followers, 1);
  const bobProfile = await api().get(`/api/users/${bob.id}`).expect(200);
  assert.equal(bobProfile.body.stats.following, 1);

  const u1 = await api().delete(`/api/users/${alice.id}/follow`).set(bob.auth).expect(200);
  assert.deepEqual(u1.body, { following: false, followerCount: 0 });
  await api().delete(`/api/users/${alice.id}/follow`).set(bob.auth).expect(200);
});

test('followers and following lists show public info only', async () => {
  const alice = await signUp('Alice');
  const bob = await signUp('Bob');
  const carol = await signUp('Carol');
  await api().post(`/api/users/${alice.id}/follow`).set(bob.auth).expect(200);
  await api().post(`/api/users/${alice.id}/follow`).set(carol.auth).expect(200);

  const followers = await api().get(`/api/users/${alice.id}/followers`).expect(200);
  assert.deepEqual(followers.body.users.map((u) => u.name), ['Carol', 'Bob']); // newest first
  assert.equal(followers.body.users[0].email, undefined);
  assert.equal(followers.body.pagination.total, 2);

  const following = await api().get(`/api/users/${bob.id}/following`).expect(200);
  assert.deepEqual(following.body.users.map((u) => u.name), ['Alice']);
});

test('following feed shows published posts from people I follow only', async () => {
  const alice = await signUp('Alice');
  const bob = await signUp('Bob');
  const carol = await signUp('Carol');
  await createPost(alice, { title: 'Alice published' });
  await createPost(alice, { title: 'Alice draft', status: 'draft' });
  await createPost(carol, { title: 'Carol published' });

  await api().get('/api/posts/following').expect(401);
  const empty = await api().get('/api/posts/following').set(bob.auth).expect(200);
  assert.equal(empty.body.posts.length, 0);

  await api().post(`/api/users/${alice.id}/follow`).set(bob.auth).expect(200);
  const feed = await api().get('/api/posts/following').set(bob.auth).expect(200);
  assert.deepEqual(feed.body.posts.map((p) => p.title), ['Alice published']);
});
