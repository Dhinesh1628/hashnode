# Hashnode

A blogging platform for developers: write in Markdown, publish, tag, and
read other people's posts. MERN stack, built solo over three weeks.

> Status: **Phase 1 of 5 — backend foundation** (auth + models)

## Run the API locally

Requirements: Node.js 20.6 or newer, and MongoDB (local or a free Atlas cluster).

```bash
cd server
npm install
cp .env.example .env      # then edit .env: set MONGO_URI and a long JWT_SECRET
npm run dev               # http://localhost:5050/api/health
npm test                  # runs against an in-memory MongoDB, no setup needed
```

The first `npm test` downloads a MongoDB binary (~100 MB), so it takes a minute.

## API so far

| Method | Route | Access | Body |
|---|---|---|---|
| GET | `/api/health` | Public | — |
| POST | `/api/auth/register` | Public | `{ name, email, password }` |
| POST | `/api/auth/login` | Public | `{ email, password }` |
| GET | `/api/auth/me` | Bearer token | — |

Errors always look like `{ "error": { "message": "...", "fields": { ... } } }`.

## Project layout

```
server/
  src/
    app.js            builds the Express app (used by server.js and tests)
    server.js         connects to MongoDB and starts listening
    config/           env checking, DB connection
    auth/             register, login, me, JWT helpers
    users/            User model
    posts/            Post model (routes come in Phase 2)
    tags/             Tag model
    middleware/       requireAuth, error handler
    lib/              small helpers: HttpError, check(), slugify, excerpt
  test/
```

Why it's built this way: see [DECISIONS.md](DECISIONS.md).
