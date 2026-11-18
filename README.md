# Hashnode

A blogging platform for developers: write in Markdown, publish, tag, and
read other people's posts. MERN stack, built solo over three weeks.

> Status: **Phase 5 of 5 — production ready.** Deploy guide: [DEPLOY.md](DEPLOY.md)

## Run it locally

Requirements: Node.js 22 or newer, and MongoDB (local or a free Atlas cluster).
You need two terminals: one for the API, one for the website.

**Terminal 1: the API** (http://localhost:5050)

```bash
cd server
npm install
cp .env.example .env      # then edit .env: set MONGO_URI and a long JWT_SECRET
npm run dev
npm test                  # runs against an in-memory MongoDB, no setup needed
```

The first `npm test` downloads a MongoDB binary (~100 MB), so it takes a minute.
If Atlas fails with `querySrv ECONNREFUSED` (common on Windows), uncomment
`DNS_SERVERS` in `.env`.

**Terminal 2: the website** (http://localhost:5174)

```bash
cd client
npm install
npm run dev
```

The website's dev server forwards every `/api` request to the API on port 5050,
so there's nothing else to configure. Set `API_URL` to use another API address.

| Command (in `client/`) | What it does |
|---|---|
| `npm run dev` | Website with live reload |
| `npm run lint` | ESLint, including the React hooks rules |
| `npm run build` | Production build into `client/dist/` |

## Pages

| URL | Page | Login |
|---|---|---|
| `/` | Feed (Latest / Following), search with `?q=` | — |
| `/post/:slug` | Post with Markdown + syntax-highlighted code, like, save, follow, comments | — |
| `/tags`, `/tag/:slug` | All tags, posts with a tag | — |
| `/profile/:id` | Profile: posts, followers, following | — |
| `/login`, `/register` | Log in, sign up | — |
| `/editor/new`, `/editor/:id` | Editor: Markdown + live preview, tag picker, draft or publish | ✔ |
| `/dashboard` | Author dashboard: stats, searchable/sortable post table, drafts to finish, recent comments | ✔ |
| `/bookmarks` | Saved posts | ✔ |
| `/settings` | Edit name, bio, avatar | ✔ |

## API

| Method | Route | Access | Body |
|---|---|---|---|
| GET | `/api/health` | Public | — |
| POST | `/api/auth/register` | Public | `{ name, email, password }` |
| POST | `/api/auth/login` | Public | `{ email, password }` |
| GET | `/api/auth/me` | Logged in | — (401 if not) |
| GET | `/api/auth/session` | Public | — returns `{ user }`, `null` if not logged in |
| POST | `/api/auth/logout` | Public | — clears the session cookie |
| GET | `/api/posts` | Public | query: `search` (or `q`), `tag`, `author`, `page`, `limit` (max 50) |
| GET | `/api/posts/mine` | Logged in | query: `status` (`draft`/`published`), `search` (title), `sort` (`newest`/`likes`/`comments`), `page`, `limit`. `/api/posts/me` also works |
| GET | `/api/posts/following` | Logged in | query: `page`, `limit` — posts from people I follow |
| GET | `/api/posts/:slug` | Public (drafts: author only); also accepts the post id | — returns `{ post, viewer: { liked, bookmarked, followingAuthor } }` |
| POST | `/api/posts` | Logged in | `{ title, content, tags?, coverImage?, status? }` |
| PUT / PATCH | `/api/posts/:id` | Owner only | any of `{ title, content, tags, coverImage, status }` |
| DELETE | `/api/posts/:id` | Owner only | — |
| GET | `/api/tags` | Public | — (tags with published-post counts) |
| GET | `/api/tags/:slug` | Public | — returns `{ tag, postCount }` |
| GET | `/api/tags/:slug/posts` | Public | query: `page`, `limit` — published posts with this tag |
| POST / DELETE | `/api/posts/:id/like` | Logged in | — returns `{ liked, likeCount }` |
| POST / DELETE | `/api/posts/:id/bookmark` | Logged in | — returns `{ bookmarked }` |
| GET | `/api/posts/:id/comments` | Public | query: `page`, `limit` (max 100) |
| POST | `/api/posts/:id/comments` | Logged in | `{ content }` |
| PATCH | `/api/comments/:id` | Comment writer | `{ content }` |
| DELETE | `/api/comments/:id` | Comment writer or post author | — |
| GET | `/api/users/:id` | Public | — returns `{ user, posts, stats, isFollowing }` (newest 10 published posts) |
| PUT / PATCH | `/api/users/me` | Logged in | `{ name?, bio?, avatarUrl? }` |
| GET | `/api/users/me/bookmarks` | Logged in | query: `page`, `limit` |
| GET | `/api/users/me/dashboard` | Logged in | — returns `{ stats, drafts, recentComments, newComments }` for the author dashboard |
| POST / DELETE | `/api/users/:id/follow` | Logged in | — returns `{ following, followerCount }` |
| GET | `/api/users/:id/followers` | Public | query: `page`, `limit` |
| GET | `/api/users/:id/following` | Public | query: `page`, `limit` |

Lists return `{ posts, pagination: { page, limit, total, totalPages } }`.

**Logged in** means either the `hn_token` session cookie (set by login/register,
used by the website) or an `Authorization: Bearer <token>` header (Postman, scripts).
Cookie requests that change data must also send `X-Requested-With` (CSRF protection).

Errors always look like `{ "error": { "message": "...", "fields": { ... } } }`.

## Deploy

`npm run build` and `npm start` in the repo root build and run the production
app: Express serves both the API and the built website on one port.
Step-by-step Render guide: **[DEPLOY.md](DEPLOY.md)**.

## Project layout

```
client/
  src/
    main.jsx          entry: router + auth provider
    App.jsx           all routes in one place
    api/client.js     pre-configured Axios instance + api() helper: cookie, CSRF header, error shape
    auth/             AuthProvider (login state), useAuth hook
    components/       Layout/navbar, PostCard, Comments, FollowButton, Markdown (lazy), TagPicker, form bits
    pages/            one file per page
    lib/              useLoad (data loading), useTitle, date formatting
    index.css         all styles, light and dark
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
