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
    .send({ title: 'Hello World', content: 'Some **markdown** text.', ...fields })
    .expect(201);
  return res.body.post;
}

// --- Creating -------------------------------------------------------------

test('creating a post requires login', async () => {
  await api().post('/api/posts').send({ title: 'x', content: 'y' }).expect(401);
});

test('create reports every invalid field at once', async () => {
  const alice = await signUp('Alice');
  const res = await api().post('/api/posts').set(alice.auth)
    .send({ status: 'secret', tags: ['a', 'b', 'c', 'd', 'e', 'f'], coverImage: 'not-a-link' })
    .expect(400);
  assert.deepEqual(Object.keys(res.body.error.fields).sort(), ['content', 'coverImage', 'status', 'tags', 'title']);
});

test('new post: draft by default, server-made fields, author without email', async () => {
  const alice = await signUp('Alice');
  const post = await createPost(alice, {
    title: 'My First Post',
    content: '# Heading\n\nHello **there**.',
    tags: ['React', ' react ', 'Node.js'],
  });

  assert.equal(post.status, 'draft');
  assert.equal(post.publishedAt, null);
  assert.match(post.slug, /^my-first-post-[a-z0-9]+$/);
  assert.equal(post.excerpt, 'Heading Hello there.');
  assert.equal(post.readingTime, 1);
  assert.deepEqual(post.tags.map((t) => t.name), ['react', 'node.js']); // "React" and " react " are one tag
  assert.equal(post.author.name, 'Alice');
  assert.equal(post.author.email, undefined);
});

test('the client cannot set author, slug, excerpt or publishedAt', async () => {
  const alice = await signUp('Alice');
  const bob = await signUp('Bob');
  const post = await createPost(alice, {
    author: bob.id, slug: 'hijacked', excerpt: 'fake', publishedAt: '2000-01-01', readingTime: 99,
  });
  assert.equal(post.author._id, alice.id);
  assert.notEqual(post.slug, 'hijacked');
  assert.notEqual(post.excerpt, 'fake');
  assert.equal(post.publishedAt, null);
  assert.equal(post.readingTime, 1);
});

// --- Drafts stay private --------------------------------------------------

test('drafts never leak into the feed, search, tags or other people\'s view', async () => {
  const alice = await signUp('Alice');
  const bob = await signUp('Bob');
  const draft = await createPost(alice, { title: 'Secret draft', content: 'unicorn', tags: ['hidden'] });
  await createPost(alice, { title: 'Public post', content: 'hello', tags: ['visible'], status: 'published' });

  const feed = await api().get('/api/posts').expect(200);
  assert.deepEqual(feed.body.posts.map((p) => p.title), ['Public post']);
  assert.equal(feed.body.pagination.total, 1);

  const search = await api().get('/api/posts?q=unicorn').expect(200);
  assert.equal(search.body.posts.length, 0);

  const byTag = await api().get('/api/posts?tag=hidden').expect(200);
  assert.equal(byTag.body.posts.length, 0);

  const byAuthor = await api().get(`/api/posts?author=${alice.id}`).expect(200);
  assert.equal(byAuthor.body.posts.length, 1);

  const tags = await api().get('/api/tags').expect(200);
  assert.deepEqual(tags.body.tags.map((t) => t.name), ['visible']);
  const hiddenTag = await api().get('/api/tags/hidden').expect(200);
  assert.equal(hiddenTag.body.postCount, 0);

  // By direct link: anonymous visitors and other users get 404, the author can preview.
  await api().get(`/api/posts/${draft.slug}`).expect(404);
  await api().get(`/api/posts/${draft.slug}`).set(bob.auth).expect(404);
  await api().get(`/api/posts/${draft.slug}`).set({ Authorization: 'Bearer garbage' }).expect(404);
  const preview = await api().get(`/api/posts/${draft.slug}`).set(alice.auth).expect(200);
  assert.equal(preview.body.post.content, 'unicorn');
});

test('/api/posts/me shows only my posts, drafts included', async () => {
  const alice = await signUp('Alice');
  const bob = await signUp('Bob');
  await createPost(alice, { title: 'A draft' });
  await createPost(alice, { title: 'A published', status: 'published' });
  await createPost(bob, { title: 'Bob draft' });

  await api().get('/api/posts/me').expect(401);
  const mine = await api().get('/api/posts/me').set(alice.auth).expect(200);
  assert.deepEqual(mine.body.posts.map((p) => p.title).sort(), ['A draft', 'A published']);

  const drafts = await api().get('/api/posts/me?status=draft').set(alice.auth).expect(200);
  assert.deepEqual(drafts.body.posts.map((p) => p.title), ['A draft']);
  await api().get('/api/posts/me?status=nope').set(alice.auth).expect(400);
});

// --- Only the owner can change a post -------------------------------------

test('another user cannot edit or delete my post', async () => {
  const alice = await signUp('Alice');
  const bob = await signUp('Bob');
  const post = await createPost(alice, { status: 'published' });

  const edit = await api().patch(`/api/posts/${post._id}`).set(bob.auth).send({ title: 'Hacked' }).expect(403);
  assert.match(edit.body.error.message, /your own posts/);
  await api().delete(`/api/posts/${post._id}`).set(bob.auth).expect(403);
  await api().patch(`/api/posts/${post._id}`).send({ title: 'Hacked' }).expect(401);
  await api().delete(`/api/posts/${post._id}`).expect(401);

  const still = await api().get(`/api/posts/${post.slug}`).expect(200);
  assert.equal(still.body.post.title, 'Hello World');
});

test('owner can edit; the slug stays the same and excerpt updates', async () => {
  const alice = await signUp('Alice');
  const post = await createPost(alice);

  const res = await api().patch(`/api/posts/${post._id}`).set(alice.auth)
    .send({ title: 'Renamed', content: 'Brand new words', tags: ['css'] })
    .expect(200);
  assert.equal(res.body.post.title, 'Renamed');
  assert.equal(res.body.post.slug, post.slug);
  assert.equal(res.body.post.excerpt, 'Brand new words');
  assert.deepEqual(res.body.post.tags.map((t) => t.slug), ['css']);

  // Sending a field means it can't be blank.
  const blank = await api().patch(`/api/posts/${post._id}`).set(alice.auth).send({ title: '  ' }).expect(400);
  assert.ok(blank.body.error.fields.title);
});

test('publishing stamps publishedAt once; unpublishing hides the post again', async () => {
  const alice = await signUp('Alice');
  const post = await createPost(alice);

  const pub = await api().patch(`/api/posts/${post._id}`).set(alice.auth).send({ status: 'published' }).expect(200);
  const firstDate = pub.body.post.publishedAt;
  assert.ok(firstDate);
  await api().get(`/api/posts/${post.slug}`).expect(200);

  await api().patch(`/api/posts/${post._id}`).set(alice.auth).send({ status: 'draft' }).expect(200);
  await api().get(`/api/posts/${post.slug}`).expect(404);

  const again = await api().patch(`/api/posts/${post._id}`).set(alice.auth).send({ status: 'published' }).expect(200);
  assert.equal(again.body.post.publishedAt, firstDate);
});

test('owner can delete; the post is then gone', async () => {
  const alice = await signUp('Alice');
  const post = await createPost(alice, { status: 'published' });
  await api().delete(`/api/posts/${post._id}`).set(alice.auth).expect(204);
  await api().get(`/api/posts/${post.slug}`).expect(404);
  await api().delete(`/api/posts/${post._id}`).set(alice.auth).expect(404);
});

test('bad or unknown ids give 404, not a crash', async () => {
  const alice = await signUp('Alice');
  await api().patch('/api/posts/not-an-id').set(alice.auth).send({ title: 'x' }).expect(404);
  await api().delete('/api/posts/507f1f77bcf86cd799439011').set(alice.auth).expect(404);
  await api().get('/api/posts/no-such-slug').expect(404);
  await api().get('/api/posts?author=not-an-id').expect(400);
});

// --- Feed, search, tags, pagination ---------------------------------------

test('feed is newest first, hides full content, and paginates', async () => {
  const alice = await signUp('Alice');
  for (const n of [1, 2, 3]) await createPost(alice, { title: `Post ${n}`, status: 'published' });

  const page1 = await api().get('/api/posts?limit=2').expect(200);
  assert.deepEqual(page1.body.posts.map((p) => p.title), ['Post 3', 'Post 2']);
  assert.deepEqual(page1.body.pagination, { page: 1, limit: 2, total: 3, totalPages: 2 });
  assert.equal(page1.body.posts[0].content, undefined);
  assert.ok(page1.body.posts[0].excerpt);

  const page2 = await api().get('/api/posts?limit=2&page=2').expect(200);
  assert.deepEqual(page2.body.posts.map((p) => p.title), ['Post 1']);

  const capped = await api().get('/api/posts?limit=9999&page=-5').expect(200);
  assert.equal(capped.body.pagination.limit, 50);
  assert.equal(capped.body.pagination.page, 1);
});

test('search matches title or content, ignores case, and treats symbols literally', async () => {
  const alice = await signUp('Alice');
  await createPost(alice, { title: 'Learning C++ templates', content: 'generic code', status: 'published' });
  await createPost(alice, { title: 'React hooks', content: 'useEffect explained', status: 'published' });

  const byTitle = await api().get('/api/posts?q=c%2B%2B').expect(200);
  assert.deepEqual(byTitle.body.posts.map((p) => p.title), ['Learning C++ templates']);

  const byContent = await api().get('/api/posts?q=USEEFFECT').expect(200);
  assert.deepEqual(byContent.body.posts.map((p) => p.title), ['React hooks']);

  const weird = await api().get('/api/posts?q=(%5B*').expect(200); // "([*" would break a raw regex
  assert.equal(weird.body.posts.length, 0);
});

test('tag list counts published posts and filters the feed by tag', async () => {
  const alice = await signUp('Alice');
  await createPost(alice, { title: 'One', tags: ['javascript', 'react'], status: 'published' });
  await createPost(alice, { title: 'Two', tags: ['JavaScript'], status: 'published' });

  const list = await api().get('/api/tags').expect(200);
  assert.deepEqual(list.body.tags.map((t) => [t.slug, t.postCount]), [['javascript', 2], ['react', 1]]);

  const feed = await api().get('/api/posts?tag=react').expect(200);
  assert.deepEqual(feed.body.posts.map((p) => p.title), ['One']);

  const tag = await api().get('/api/tags/javascript').expect(200);
  assert.equal(tag.body.postCount, 2);
  await api().get('/api/tags/nope').expect(404);
  const none = await api().get('/api/posts?tag=nope').expect(200);
  assert.equal(none.body.posts.length, 0);
});
