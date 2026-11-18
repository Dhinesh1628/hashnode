import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startTestApp } from './helpers.js';
import { Comment } from '../src/comments/comment.model.js';

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

const comment = (user, post, content) =>
  api().post(`/api/posts/${post._id}/comments`).set(user.auth).send({ content }).expect(201);

test('dashboard needs login', async () => {
  await api().get('/api/users/me/dashboard').expect(401);
});

test('a new author gets zeros and empty lists, not errors', async () => {
  const alice = await signUp('Alice');
  const res = await api().get('/api/users/me/dashboard').set(alice.auth).expect(200);
  assert.deepEqual(res.body, {
    stats: { published: 0, drafts: 0, likes: 0, comments: 0, followers: 0 },
    drafts: [],
    recentComments: [],
    newComments: 0,
  });
});

test('stats count only my posts, and totals only published ones', async () => {
  const alice = await signUp('Alice');
  const bob = await signUp('Bob');
  const carol = await signUp('Carol');
  const p1 = await createPost(alice, { title: 'One' });
  const p2 = await createPost(alice, { title: 'Two' });
  await createPost(alice, { title: 'Draft', status: 'draft' });
  await createPost(bob, { title: 'Bob post' }); // not Alice's

  await api().post(`/api/posts/${p1._id}/like`).set(bob.auth).expect(200);
  await api().post(`/api/posts/${p1._id}/like`).set(carol.auth).expect(200);
  await api().post(`/api/posts/${p2._id}/like`).set(bob.auth).expect(200);
  await comment(bob, p1, 'Nice');
  await comment(carol, p2, 'Great');
  await api().post(`/api/users/${alice.id}/follow`).set(bob.auth).expect(200);

  const res = await api().get('/api/users/me/dashboard').set(alice.auth).expect(200);
  assert.deepEqual(res.body.stats, { published: 2, drafts: 1, likes: 3, comments: 2, followers: 1 });

  const bobs = await api().get('/api/users/me/dashboard').set(bob.auth).expect(200);
  assert.deepEqual(bobs.body.stats, { published: 1, drafts: 0, likes: 0, comments: 0, followers: 0 });
});

test('"finish a draft" lists my 3 most recently edited drafts', async () => {
  const alice = await signUp('Alice');
  const bob = await signUp('Bob');
  const d1 = await createPost(alice, { title: 'Draft 1', status: 'draft' });
  await createPost(alice, { title: 'Draft 2', status: 'draft' });
  await createPost(alice, { title: 'Draft 3', status: 'draft' });
  await createPost(alice, { title: 'Draft 4', status: 'draft' });
  await createPost(alice, { title: 'Published' });
  await createPost(bob, { title: 'Bob draft', status: 'draft' });
  await api().patch(`/api/posts/${d1._id}`).set(alice.auth).send({ content: 'Edited just now' }).expect(200);

  const res = await api().get('/api/users/me/dashboard').set(alice.auth).expect(200);
  assert.deepEqual(res.body.drafts.map((d) => d.title), ['Draft 1', 'Draft 4', 'Draft 3']);
  assert.deepEqual(Object.keys(res.body.drafts[0]).sort(), ['_id', 'slug', 'title', 'updatedAt']);
});

test('recent comments: others on my published posts only, newest first, no emails', async () => {
  const alice = await signUp('Alice');
  const bob = await signUp('Bob');
  const live = await createPost(alice, { title: 'Live post' });
  const hidden = await createPost(alice, { title: 'Later unpublished' });
  const bobsPost = await createPost(bob, { title: 'Bob post' });

  await comment(bob, live, 'First from Bob');
  await comment(alice, live, 'My own reply');       // my own: not shown
  await comment(bob, hidden, 'On a post that goes back to draft');
  await comment(alice, bobsPost, 'On someone else');  // not my post
  await comment(bob, live, 'Second from Bob');
  await api().patch(`/api/posts/${hidden._id}`).set(alice.auth).send({ status: 'draft' }).expect(200);

  const res = await api().get('/api/users/me/dashboard').set(alice.auth).expect(200);
  assert.deepEqual(res.body.recentComments.map((c) => c.content), ['Second from Bob', 'First from Bob']);
  const first = res.body.recentComments[0];
  assert.equal(first.author.name, 'Bob');
  assert.equal(first.author.email, undefined);
  assert.equal(first.post.title, 'Live post');
  assert.equal(first.post.slug, live.slug);
  assert.equal(res.body.newComments, 2);
});

test('"new" comments means the last 7 days; recent list keeps the newest 5', async () => {
  const alice = await signUp('Alice');
  const bob = await signUp('Bob');
  const post = await createPost(alice);
  for (let i = 1; i <= 6; i += 1) await comment(bob, post, `Comment ${i}`);

  // Make "Comment 1" ten days old (bypassing Mongoose so timestamps don't reset it).
  const old = await Comment.findOne({ content: 'Comment 1' });
  await Comment.collection.updateOne({ _id: old._id }, { $set: { createdAt: new Date(Date.now() - 10 * 86_400_000) } });

  const res = await api().get('/api/users/me/dashboard').set(alice.auth).expect(200);
  assert.equal(res.body.newComments, 5);
  assert.equal(res.body.recentComments.length, 5);
  assert.equal(res.body.recentComments[0].content, 'Comment 6');
  assert.ok(!res.body.recentComments.some((c) => c.content === 'Comment 1'));
});

test('my posts: search by title and sort by likes or comments', async () => {
  const alice = await signUp('Alice');
  const bob = await signUp('Bob');
  const carol = await signUp('Carol');
  const react = await createPost(alice, { title: 'React hooks guide' });
  const mongo = await createPost(alice, { title: 'MongoDB indexes' });
  await createPost(alice, { title: 'React draft', status: 'draft' });

  await api().post(`/api/posts/${mongo._id}/like`).set(bob.auth).expect(200);
  await api().post(`/api/posts/${mongo._id}/like`).set(carol.auth).expect(200);
  await api().post(`/api/posts/${react._id}/like`).set(bob.auth).expect(200);
  await comment(bob, react, 'a');
  await comment(carol, react, 'b');

  const found = await api().get('/api/posts/mine?search=react').set(alice.auth).expect(200);
  assert.deepEqual(found.body.posts.map((p) => p.title).sort(), ['React draft', 'React hooks guide']);

  const byLikes = await api().get('/api/posts/mine?sort=likes&status=published').set(alice.auth).expect(200);
  assert.deepEqual(byLikes.body.posts.map((p) => p.title), ['MongoDB indexes', 'React hooks guide']);

  const byComments = await api().get('/api/posts/mine?sort=comments&status=published').set(alice.auth).expect(200);
  assert.deepEqual(byComments.body.posts.map((p) => p.title), ['React hooks guide', 'MongoDB indexes']);

  const weird = await api().get('/api/posts/mine?sort=nonsense&search=(%5B').set(alice.auth).expect(200);
  assert.equal(weird.body.posts.length, 0);
});
