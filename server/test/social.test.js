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

// --- Likes ----------------------------------------------------------------

test('liking needs login, counts once per user, and unliking undoes it', async () => {
  const alice = await signUp('Alice');
  const bob = await signUp('Bob');
  const carol = await signUp('Carol');
  const post = await createPost(alice);

  await api().post(`/api/posts/${post._id}/like`).expect(401);

  const first = await api().post(`/api/posts/${post._id}/like`).set(bob.auth).expect(200);
  assert.deepEqual(first.body, { liked: true, likeCount: 1 });
  const again = await api().post(`/api/posts/${post._id}/like`).set(bob.auth).expect(200);
  assert.deepEqual(again.body, { liked: true, likeCount: 1 }); // double-click doesn't double count

  await api().post(`/api/posts/${post._id}/like`).set(carol.auth).expect(200);
  const unliked = await api().delete(`/api/posts/${post._id}/like`).set(bob.auth).expect(200);
  assert.deepEqual(unliked.body, { liked: false, likeCount: 1 });
  const unlikedAgain = await api().delete(`/api/posts/${post._id}/like`).set(bob.auth).expect(200);
  assert.equal(unlikedAgain.body.likeCount, 1); // never goes below what's real

  const feed = await api().get('/api/posts').expect(200);
  assert.equal(feed.body.posts[0].likeCount, 1);
});

test('two likes at the same moment still count once', async () => {
  const alice = await signUp('Alice');
  const bob = await signUp('Bob');
  const post = await createPost(alice);

  await Promise.all(Array.from({ length: 5 }, () => api().post(`/api/posts/${post._id}/like`).set(bob.auth).expect(200)));
  const page = await api().get(`/api/posts/${post.slug}`).expect(200);
  assert.equal(page.body.post.likeCount, 1);
});

test('drafts cannot be liked, bookmarked or commented on', async () => {
  const alice = await signUp('Alice');
  const bob = await signUp('Bob');
  const draft = await createPost(alice, { status: 'draft' });

  await api().post(`/api/posts/${draft._id}/like`).set(bob.auth).expect(404);
  await api().post(`/api/posts/${draft._id}/bookmark`).set(bob.auth).expect(404);
  await api().post(`/api/posts/${draft._id}/comments`).set(bob.auth).send({ content: 'hi' }).expect(404);
  await api().get(`/api/posts/${draft._id}/comments`).expect(404);
  await api().post('/api/posts/not-an-id/like').set(bob.auth).expect(404);
});

test('clients cannot set likeCount or commentCount themselves', async () => {
  const alice = await signUp('Alice');
  const post = await createPost(alice, { likeCount: 999, commentCount: 999 });
  assert.equal(post.likeCount, 0);
  assert.equal(post.commentCount, 0);
  const edited = await api().patch(`/api/posts/${post._id}`).set(alice.auth).send({ likeCount: 5 }).expect(200);
  assert.equal(edited.body.post.likeCount, 0);
});

// --- Viewer state on the post page ----------------------------------------

test('post page tells the viewer what they liked, saved and follow', async () => {
  const alice = await signUp('Alice');
  const bob = await signUp('Bob');
  const post = await createPost(alice);

  const anon = await api().get(`/api/posts/${post.slug}`).expect(200);
  assert.deepEqual(anon.body.viewer, { liked: false, bookmarked: false, followingAuthor: false });

  await api().post(`/api/posts/${post._id}/like`).set(bob.auth).expect(200);
  await api().post(`/api/posts/${post._id}/bookmark`).set(bob.auth).expect(200);
  await api().post(`/api/users/${alice.id}/follow`).set(bob.auth).expect(200);

  const asBob = await api().get(`/api/posts/${post.slug}`).set(bob.auth).expect(200);
  assert.deepEqual(asBob.body.viewer, { liked: true, bookmarked: true, followingAuthor: true });
});

// --- Bookmarks ------------------------------------------------------------

test('bookmarks are private, newest first, and skip posts that became drafts', async () => {
  const alice = await signUp('Alice');
  const bob = await signUp('Bob');
  const one = await createPost(alice, { title: 'One' });
  const two = await createPost(alice, { title: 'Two' });
  const three = await createPost(alice, { title: 'Three' });

  for (const p of [one, two, three]) {
    await api().post(`/api/posts/${p._id}/bookmark`).set(bob.auth).expect(200);
  }
  await api().post(`/api/posts/${one._id}/bookmark`).set(bob.auth).expect(200); // repeat is harmless

  await api().get('/api/users/me/bookmarks').expect(401);
  const mine = await api().get('/api/users/me/bookmarks').set(bob.auth).expect(200);
  assert.deepEqual(mine.body.posts.map((p) => p.title), ['Three', 'Two', 'One']);
  assert.equal(mine.body.pagination.total, 3);

  const aliceMarks = await api().get('/api/users/me/bookmarks').set(alice.auth).expect(200);
  assert.equal(aliceMarks.body.posts.length, 0);

  // Alice unpublishes "Two": it disappears from Bob's bookmarks.
  await api().patch(`/api/posts/${two._id}`).set(alice.auth).send({ status: 'draft' }).expect(200);
  const after = await api().get('/api/users/me/bookmarks?limit=1').set(bob.auth).expect(200);
  assert.deepEqual(after.body.posts.map((p) => p.title), ['Three']);
  assert.deepEqual(after.body.pagination, { page: 1, limit: 1, total: 2, totalPages: 2 });

  await api().delete(`/api/posts/${three._id}/bookmark`).set(bob.auth).expect(200);
  const removed = await api().get('/api/users/me/bookmarks').set(bob.auth).expect(200);
  assert.deepEqual(removed.body.posts.map((p) => p.title), ['One']);
});

// --- Comments -------------------------------------------------------------

test('comments: login to write, anyone can read, oldest first, count kept', async () => {
  const alice = await signUp('Alice');
  const bob = await signUp('Bob');
  const post = await createPost(alice);

  await api().post(`/api/posts/${post._id}/comments`).send({ content: 'hi' }).expect(401);
  const bad = await api().post(`/api/posts/${post._id}/comments`).set(bob.auth).send({ content: '   ' }).expect(400);
  assert.ok(bad.body.error.fields.content);

  const first = await api().post(`/api/posts/${post._id}/comments`).set(bob.auth).send({ content: ' First! ' }).expect(201);
  assert.equal(first.body.comment.content, 'First!');
  assert.equal(first.body.comment.author.name, 'Bob');
  assert.equal(first.body.comment.author.email, undefined);
  await api().post(`/api/posts/${post._id}/comments`).set(alice.auth).send({ content: 'Thanks' }).expect(201);

  const list = await api().get(`/api/posts/${post._id}/comments`).expect(200);
  assert.deepEqual(list.body.comments.map((c) => c.content), ['First!', 'Thanks']);
  assert.equal(list.body.pagination.total, 2);

  const page = await api().get(`/api/posts/${post.slug}`).expect(200);
  assert.equal(page.body.post.commentCount, 2);
});

test('only the writer can edit a comment', async () => {
  const alice = await signUp('Alice');
  const bob = await signUp('Bob');
  const post = await createPost(alice);
  const { body } = await api().post(`/api/posts/${post._id}/comments`).set(bob.auth).send({ content: 'Nice' }).expect(201);
  const id = body.comment._id;

  await api().patch(`/api/comments/${id}`).set(alice.auth).send({ content: 'Edited by Alice' }).expect(403);
  await api().patch(`/api/comments/${id}`).send({ content: 'x' }).expect(401);
  const edited = await api().patch(`/api/comments/${id}`).set(bob.auth).send({ content: 'Very nice' }).expect(200);
  assert.equal(edited.body.comment.content, 'Very nice');
  await api().patch('/api/comments/not-an-id').set(bob.auth).send({ content: 'x' }).expect(404);
});

test('a comment can be deleted by its writer or the post author, nobody else', async () => {
  const alice = await signUp('Alice');
  const bob = await signUp('Bob');
  const carol = await signUp('Carol');
  const post = await createPost(alice);
  const add = async (user, content) =>
    (await api().post(`/api/posts/${post._id}/comments`).set(user.auth).send({ content }).expect(201)).body.comment._id;

  const bobComment = await add(bob, 'from bob');
  const carolComment = await add(carol, 'from carol');

  await api().delete(`/api/comments/${bobComment}`).set(carol.auth).expect(403); // a stranger
  await api().delete(`/api/comments/${bobComment}`).set(bob.auth).expect(204);   // the writer
  await api().delete(`/api/comments/${carolComment}`).set(alice.auth).expect(204); // the post author
  await api().delete(`/api/comments/${carolComment}`).set(alice.auth).expect(404);

  const page = await api().get(`/api/posts/${post.slug}`).expect(200);
  assert.equal(page.body.post.commentCount, 0);
});

test('deleting a post also deletes its likes, bookmarks and comments', async () => {
  const alice = await signUp('Alice');
  const bob = await signUp('Bob');
  const post = await createPost(alice);
  await api().post(`/api/posts/${post._id}/like`).set(bob.auth).expect(200);
  await api().post(`/api/posts/${post._id}/bookmark`).set(bob.auth).expect(200);
  const { body } = await api().post(`/api/posts/${post._id}/comments`).set(bob.auth).send({ content: 'x' }).expect(201);

  await api().delete(`/api/posts/${post._id}`).set(alice.auth).expect(204);

  const marks = await api().get('/api/users/me/bookmarks').set(bob.auth).expect(200);
  assert.equal(marks.body.pagination.total, 0);
  await api().patch(`/api/comments/${body.comment._id}`).set(bob.auth).send({ content: 'y' }).expect(404);
});
