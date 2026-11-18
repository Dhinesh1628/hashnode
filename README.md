# Hashnode

A blogging platform for developers: write in Markdown, publish, tag, and
read other people's posts. MERN stack, built solo over three weeks.

> Status: **Phase 3 of 5 — social API** (comments, likes, bookmarks, profiles, following)

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

## API

| Method | Route | Access | Body |
|---|---|---|---|
| GET | `/api/health` | Public | — |
| POST | `/api/auth/register` | Public | `{ name, email, password }` |
| POST | `/api/auth/login` | Public | `{ email, password }` |
| GET | `/api/auth/me` | Bearer token | — |
| GET | `/api/posts` | Public | query: `page`, `limit` (max 50), `tag`, `author`, `q` |
| GET | `/api/posts/me` | Bearer token | query: `page`, `limit`, `status` (`draft`/`published`) |
| GET | `/api/posts/following` | Bearer token | query: `page`, `limit` — posts from people I follow |
| GET | `/api/posts/:slug` | Public (drafts: author only) | — returns `{ post, viewer: { liked, bookmarked, followingAuthor } }` |
| POST | `/api/posts` | Bearer token | `{ title, content, tags?, coverImage?, status? }` |
| PATCH | `/api/posts/:id` | Owner only | any of the fields above |
| DELETE | `/api/posts/:id` | Owner only | — |
| GET | `/api/tags` | Public | — (tags with published-post counts) |
| GET | `/api/tags/:slug` | Public | — |
| POST / DELETE | `/api/posts/:id/like` | Bearer token | — returns `{ liked, likeCount }` |
| POST / DELETE | `/api/posts/:id/bookmark` | Bearer token | — returns `{ bookmarked }` |
| GET | `/api/posts/:id/comments` | Public | query: `page`, `limit` (max 100) |
| POST | `/api/posts/:id/comments` | Bearer token | `{ content }` |
| PATCH | `/api/comments/:id` | Comment writer | `{ content }` |
| DELETE | `/api/comments/:id` | Comment writer or post author | — |
| GET | `/api/users/:id` | Public | — returns `{ user, stats, isFollowing }` |
| PATCH | `/api/users/me` | Bearer token | `{ name?, bio?, avatarUrl? }` |
| GET | `/api/users/me/bookmarks` | Bearer token | query: `page`, `limit` |
| POST / DELETE | `/api/users/:id/follow` | Bearer token | — returns `{ following, followerCount }` |
| GET | `/api/users/:id/followers` | Public | query: `page`, `limit` |
| GET | `/api/users/:id/following` | Public | query: `page`, `limit` |

Lists return `{ posts, pagination: { page, limit, total, totalPages } }`.

Errors always look like `{ "error": { "message": "...", "fields": { ... } } }`.

## Project layout

```
server/
  src/
    app.js            builds the Express app (used by server.js and tests)
    server.js         connects to MongoDB and starts listening
    config/           env checking, DB connection
    auth/             register, login, me, JWT helpers
    users/            User + Follow models, profiles, follow routes
    posts/            Post model, routes, controller, service
    tags/             Tag model, routes, service
    comments/         Comment model, routes, service
    reactions/        Like + Bookmark models, routes, service
    middleware/       requireAuth, error handler
    lib/              small helpers: HttpError, check(), slugify, excerpt, pagination
  test/
```

Why it's built this way: see [DECISIONS.md](DECISIONS.md).
