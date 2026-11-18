import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { startTestApp } from './helpers.js';
import { createApp } from '../src/app.js';
import { loadEnv } from '../src/config/env.js';

let ctx;
let prodApp; // the same API configured like Render: production mode, serving a built site
let distDir;

// Each call builds a fresh app, so its rate-limit counter starts at zero.
// It shares the test database connection that startTestApp opened.
function makeProdApp() {
  return createApp(loadEnv({
    NODE_ENV: 'production',
    MONGO_URI: 'unused-the-connection-is-already-open',
    JWT_SECRET: ctx.env.jwtSecret,
    CLIENT_DIST: distDir,
    AUTH_RATE_LIMIT: '3',
  }));
}

before(async () => {
  ctx = await startTestApp();

  // A tiny fake "client/dist" so the static-file serving can be tested.
  distDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hashnode-dist-'));
  fs.mkdirSync(path.join(distDir, 'assets'));
  fs.writeFileSync(path.join(distDir, 'index.html'), '<!doctype html><title>Hashnode</title><div id="root"></div>');
  fs.writeFileSync(path.join(distDir, 'assets', 'index-abc123.js'), 'console.log("app")');

  prodApp = makeProdApp();
});
after(async () => {
  await ctx.stop();
  fs.rmSync(distDir, { recursive: true, force: true });
});
beforeEach(async () => { await ctx.reset(); });

const alice = { name: 'Alice', email: 'alice@example.com', password: 'correct-horse' };

function sessionCookie(res) {
  const cookie = (res.headers['set-cookie'] ?? []).find((c) => c.startsWith('hn_token='));
  assert.ok(cookie, 'expected a hn_token cookie');
  return cookie;
}
const cookieValue = (setCookie) => setCookie.split(';')[0]; // "hn_token=eyJ..."

// --- Session cookie -------------------------------------------------------

test('login sets an httpOnly, SameSite=Lax cookie that only API requests carry', async () => {
  await request(ctx.app).post('/api/auth/register').send(alice).expect(201);
  const res = await request(ctx.app).post('/api/auth/login').send(alice).expect(200);
  const cookie = sessionCookie(res);

  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Lax/i);
  assert.match(cookie, /Path=\/api/);
  assert.match(cookie, /Expires=/);
  assert.doesNotMatch(cookie, /Secure/i); // plain HTTP in development
  assert.ok(res.body.token, 'the token is still in the body for API clients');

  const me = await request(ctx.app).get('/api/auth/me').set('Cookie', cookieValue(cookie)).expect(200);
  assert.equal(me.body.user.email, 'alice@example.com');
});

test('in production the cookie is Secure (HTTPS only)', async () => {
  const res = await request(prodApp).post('/api/auth/register').send(alice).expect(201);
  assert.match(sessionCookie(res), /Secure/i);
});

test('cookie-authenticated changes need the X-Requested-With header (CSRF)', async () => {
  const res = await request(ctx.app).post('/api/auth/register').send(alice).expect(201);
  const cookie = cookieValue(sessionCookie(res));
  const post = { title: 'Hi', content: 'Hello', status: 'published' };

  const blocked = await request(ctx.app).post('/api/posts').set('Cookie', cookie).send(post).expect(403);
  assert.match(blocked.body.error.message, /X-Requested-With/);

  await request(ctx.app).post('/api/posts').set('Cookie', cookie).set('X-Requested-With', 'fetch').send(post).expect(201);
  // Reading needs no header, and Bearer tokens (not sent automatically by browsers) need none either.
  await request(ctx.app).get('/api/posts/me').set('Cookie', cookie).expect(200);
  await request(ctx.app).post('/api/posts').set('Authorization', `Bearer ${res.body.token}`).send(post).expect(201);
});

test('logout clears the cookie', async () => {
  await request(ctx.app).post('/api/auth/register').send(alice).expect(201);
  const res = await request(ctx.app).post('/api/auth/logout').expect(204);
  const cleared = sessionCookie(res);
  assert.match(cleared, /^hn_token=;/);
  assert.match(cleared, /Expires=Thu, 01 Jan 1970/);
  assert.match(cleared, /Path=\/api/);
});

test('/session answers 200 for visitors and returns the user when logged in', async () => {
  const anon = await request(ctx.app).get('/api/auth/session').expect(200);
  assert.deepEqual(anon.body, { user: null });
  await request(ctx.app).get('/api/auth/session').set('Cookie', 'hn_token=garbage').expect(200);

  const res = await request(ctx.app).post('/api/auth/register').send(alice).expect(201);
  const me = await request(ctx.app).get('/api/auth/session').set('Cookie', cookieValue(sessionCookie(res))).expect(200);
  assert.equal(me.body.user.name, 'Alice');
  assert.equal(me.body.user.password, undefined);
});

test('a forged or garbage cookie is rejected', async () => {
  await request(ctx.app).get('/api/auth/me').set('Cookie', 'hn_token=garbage').expect(401);
  await request(ctx.app).get('/api/auth/me').set('Cookie', 'hn_token=%E0%A4%A').expect(401); // bad encoding
});

// --- Rate limiting --------------------------------------------------------

test('too many login attempts from one address get 429', async () => {
  const app = makeProdApp();
  await request(app).post('/api/auth/register').send(alice).expect(201);       // attempt 1
  await request(app).post('/api/auth/login').send(alice).expect(200);          // attempt 2
  await request(app).post('/api/auth/login').send({ ...alice, password: 'wrong-pass' }).expect(401); // 3
  const res = await request(app).post('/api/auth/login').send(alice).expect(429); // 4: over the limit
  assert.match(res.body.error.message, /Too many attempts/);
  assert.ok(res.headers.ratelimit || res.headers['ratelimit-policy'], 'standard RateLimit headers are sent');
});

// --- Serving the website --------------------------------------------------

test('production serves the React app for page URLs and JSON for the API', async () => {
  const home = await request(prodApp).get('/').expect(200);
  assert.match(home.headers['content-type'], /html/);
  assert.match(home.text, /<div id="root">/);

  const deepLink = await request(prodApp).get('/post/hello-k3f9a').expect(200);
  assert.match(deepLink.text, /<div id="root">/);
  assert.equal(deepLink.headers['cache-control'], 'no-cache');

  const asset = await request(prodApp).get('/assets/index-abc123.js').expect(200);
  assert.match(asset.headers['cache-control'], /immutable/);

  const missingAsset = await request(prodApp).get('/assets/nope.js').expect(404);
  assert.equal(missingAsset.body.error.message, 'Not found');

  const unknownApi = await request(prodApp).get('/api/nope').expect(404);
  assert.match(unknownApi.headers['content-type'], /json/);
  assert.ok(unknownApi.body.error);
});

test('development does not serve the website (Vite does)', async () => {
  await request(ctx.app).get('/').expect(404);
});

test('security headers allow https images but not outside scripts', async () => {
  const res = await request(prodApp).get('/').expect(200);
  const csp = res.headers['content-security-policy'];
  assert.match(csp, /img-src 'self' data: https:/);
  assert.match(csp, /script-src 'self'/);
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
});

test('health check reports the database connection', async () => {
  const res = await request(prodApp).get('/api/health').expect(200);
  assert.deepEqual(res.body, { ok: true });
});

test('oversized request bodies get 413, not a server error', async () => {
  const res = await request(ctx.app).post('/api/auth/login')
    .set('Content-Type', 'application/json')
    .send(JSON.stringify({ email: 'x'.repeat(1_100_000) }))
    .expect(413);
  assert.ok(res.body.error.message);
});
