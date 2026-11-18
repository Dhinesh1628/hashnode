import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { startTestApp } from './helpers.js';
import { User } from '../src/users/user.model.js';

let ctx;
before(async () => { ctx = await startTestApp(); });
after(async () => { await ctx.stop(); });
beforeEach(async () => { await ctx.reset(); });

const alice = { name: 'Alice', email: 'Alice@Example.com', password: 'correct-horse' };

test('register returns a token and never the password', async () => {
  const res = await request(ctx.app).post('/api/auth/register').send(alice).expect(201);
  assert.ok(res.body.token);
  assert.equal(res.body.user.email, 'alice@example.com');
  assert.equal(res.body.user.password, undefined);
});

// Baseline pass requirement: passwords are never stored in plain text.
test('password is stored as a bcrypt hash', async () => {
  await request(ctx.app).post('/api/auth/register').send(alice).expect(201);
  const stored = await User.findOne({ email: 'alice@example.com' }).select('+password').lean();
  assert.notEqual(stored.password, alice.password);
  assert.match(stored.password, /^\$2[aby]\$12\$/);
});

test('register reports every invalid field', async () => {
  const res = await request(ctx.app).post('/api/auth/register')
    .send({ email: 'nope', password: '123' }).expect(400);
  assert.deepEqual(Object.keys(res.body.error.fields).sort(), ['email', 'name', 'password']);
});

test('duplicate email is rejected with 409', async () => {
  await request(ctx.app).post('/api/auth/register').send(alice).expect(201);
  await request(ctx.app).post('/api/auth/register')
    .send({ ...alice, email: 'ALICE@example.com' }).expect(409);
});

test('login works with any email casing', async () => {
  await request(ctx.app).post('/api/auth/register').send(alice);
  const res = await request(ctx.app).post('/api/auth/login')
    .send({ email: 'alice@EXAMPLE.com', password: alice.password }).expect(200);
  assert.ok(res.body.token);
});

test('wrong password and unknown email give the same message', async () => {
  await request(ctx.app).post('/api/auth/register').send(alice);
  const wrongPass = await request(ctx.app).post('/api/auth/login')
    .send({ email: alice.email, password: 'nope-nope' }).expect(401);
  const noUser = await request(ctx.app).post('/api/auth/login')
    .send({ email: 'ghost@example.com', password: 'nope-nope' }).expect(401);
  assert.equal(wrongPass.body.error.message, noUser.body.error.message);
});

test('/me requires a valid token', async () => {
  await request(ctx.app).get('/api/auth/me').expect(401);
  await request(ctx.app).get('/api/auth/me').set('Authorization', 'Bearer garbage').expect(401);

  const { body } = await request(ctx.app).post('/api/auth/register').send(alice);
  const me = await request(ctx.app).get('/api/auth/me')
    .set('Authorization', `Bearer ${body.token}`).expect(200);
  assert.equal(me.body.user.name, 'Alice');
});

test('expired token gets a clear message', async () => {
  const { body } = await request(ctx.app).post('/api/auth/register').send(alice);
  const expired = jwt.sign({ sub: body.user._id, exp: Math.floor(Date.now() / 1000) - 10 }, ctx.env.jwtSecret);
  const res = await request(ctx.app).get('/api/auth/me')
    .set('Authorization', `Bearer ${expired}`).expect(401);
  assert.match(res.body.error.message, /expired/);
});

test('token signed with another secret is rejected', async () => {
  const { body } = await request(ctx.app).post('/api/auth/register').send(alice);
  const forged = jwt.sign({ sub: body.user._id }, 'some-other-secret-that-is-also-long-enough');
  await request(ctx.app).get('/api/auth/me').set('Authorization', `Bearer ${forged}`).expect(401);
});

test('unknown routes return the standard error shape', async () => {
  const res = await request(ctx.app).get('/api/nope').expect(404);
  assert.ok(res.body.error.message);
});
