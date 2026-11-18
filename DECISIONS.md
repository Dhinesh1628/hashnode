# Decisions

Short notes on why things are built the way they are. Add one every time
you choose between two reasonable options.

## Phase 1: backend foundation

**Code grouped by feature, not by file type.**
`src/posts/` holds the post model, routes, controller and service together.
When I work on posts I open one folder. Routes and controllers are still
separate files, so the rubric's "route/controller separation" holds.

**Express 5 instead of 4.**
Express 5 passes errors from `async` handlers to the error middleware by
itself. No `asyncHandler` wrapper and no `try/catch` in every controller.

**`node --watch` and `--env-file` instead of nodemon and dotenv.**
Both are built into Node 20.6+. Two fewer dependencies.

**`createApp(env)` instead of a global app.**
Tests build an app with test settings and an in-memory database. Nothing
reads `process.env` except `config/env.js`, which checks it once at startup
and refuses to boot with a missing or short `JWT_SECRET`.

**Password hash can't leak.**
Two layers: `select: false` on the field (it's never loaded unless the login
query asks for it) and a `toJSON` transform that deletes it anyway.

**Login gives one message for "no such email" and "wrong password".**
It also runs bcrypt against a dummy hash when the email doesn't exist, so
response time doesn't reveal which emails are registered.

**JWT carries only the user id.**
`requireAuth` loads the user from the database on each request, so a token
for a deleted account stops working, and name changes show up immediately.

**One error shape for the whole API.**
`{ error: { message, fields? } }`. Mongoose validation errors, duplicate keys
and bad ObjectIds are all translated into it. The client needs one error
component, and `fields` lets forms show messages next to the right input.

**Validation: a tiny hand-written `check()` instead of a library.**
It collects every problem at once, so the user fixes the whole form in one go.
It's about 40 lines, and I can explain every one of them.

**`publishedAt` field (not in the spec).**
`createdAt` is when the draft was started. A post drafted on Monday and
published on Friday should show Friday and sort by Friday.

**Drafts are filtered in one place.**
`Post.find().published()` is a Mongoose query helper. Every public query
uses it, so "drafts in the feed" can't happen because someone forgot a filter.

**Slugs get a random suffix and are frozen after creation.**
`hello-world-k3f9a`: two posts with the same title never collide, and
editing a title doesn't break links people already shared.

**Excerpt and reading time are computed on the server.**
In a `pre('validate')` hook whenever content changes. The client can't send
a misleading excerpt, and every client gets the same values.

**Tags are normalised and created with upserts.**
"React", " react " and "REACT" are one tag. Upsert means two people creating
the same new tag at the same moment can't produce duplicates. Max 5 per post.
`c++` and `c#` get readable slugs (`c-plus-plus`, `c-sharp`).

## Phase 2: posts, tags, search

**A stranger asking for a draft gets 404, not 403.**
403 would confirm the draft exists. The author can still open their own
draft by its link (with their token) to preview it before publishing.

**Editing someone else's post gets 403, not 404.**
Edits go by post id, and the person already had the id from a public page,
so there's nothing to hide; a clear "you can only change your own posts"
is more useful to the client.

**Read by slug, change by id.**
Slugs make shareable URLs. Ids are what the owner's editor uses; they never
change and can't clash with route names like `/me`.

**The request body is copied field by field, never spread into the model.**
`author`, `slug`, `publishedAt`, `excerpt` and `readingTime` can't be set by
the client even if sent. A test sends all of them and checks they're ignored.

**Search uses an escaped, case-insensitive regex, not a text index.**
It matches partial words ("reac" finds "React"), needs no index setup, and
is fast enough for a project this size. Escaping means `c++` or `(` are
searched literally instead of breaking the query. At real scale I'd switch
to Atlas Search.

**Tag counts are calculated, not stored.**
`GET /api/tags` counts published posts per tag with an aggregation. A stored
counter would drift when posts are deleted or unpublished, and a tag used
only by drafts never appears, so drafts can't leak through tag names.

**Lists leave out the full `content`.**
Feeds show the excerpt; the full Markdown is only sent on the post page.
Smaller responses, faster feed.

**Pagination falls back instead of failing.**
`?limit=9999&page=-5` becomes `limit=50&page=1`. A bad page number isn't
worth an error, but nobody can request the whole database at once.

**Author info in posts never includes email.**
Posts populate only `name`, `avatarUrl` and `bio` from the author.

## Phase 3: comments, likes, bookmarks, profiles, following

**Likes, bookmarks and follows are their own small collections.**
One document per (user, post) or (follower, following), with a unique index.
Arrays of user ids inside a post would grow forever on popular posts, and
the unique index is what makes "like twice" impossible, even when two
requests arrive at the same moment (a test fires five at once).

**Like and comment counts are stored on the post.**
Unlike tag counts, these appear on every feed card, so counting them on each
request would be slow. They stay correct because the counter only changes
when a Like or Comment was actually inserted or deleted, and `$inc` is atomic.

**Like, bookmark and follow are safe to repeat.**
POST adds, DELETE removes, and repeating either changes nothing. A
double-click or a retried request can't break the count.

**Drafts can't be liked, bookmarked or commented on.**
They answer 404, the same as everywhere else, so none of these routes can be
used to discover that a draft exists. A bookmarked post that later becomes a
draft disappears from the bookmark list.

**Who can delete a comment: its writer, or the post's author.**
The post author moderates their own post. Editing is writer-only, so nobody
can put words in someone else's mouth.

**Deleting a post deletes its likes, bookmarks and comments.**
Nothing is left pointing at a post that no longer exists.

**The post page returns `viewer` state.**
`{ liked, bookmarked, followingAuthor }` for the logged-in visitor, all
false for anonymous visitors. The client can draw the buttons correctly
without three extra requests.

**Profile edits can't change email or password.**
`PATCH /api/users/me` copies only name, bio and avatarUrl. Changing email or
password needs the current password and belongs in its own flow.

**Profiles are public but never include email.**
`PUBLIC_USER_FIELDS` (name, avatarUrl, bio) lives in the User model and is
used everywhere another person's info is shown: post authors, commenters,
follower lists.

**Tests rebuild indexes after wiping the database.**
Dropping the test database also drops indexes, so the "two likes at once"
test would pass for the wrong reason. `reset()` recreates them.

## Phase 4: React frontend

**Vite + React 19 + React Router 7, no UI or state library.**
The app has one piece of global state (who is logged in), which fits in a
React context. Everything else belongs to the page that shows it. Fewer
libraries means less to learn and less to explain.

**One `api()` function for every request.**
It adds the token, turns the API's `{ error: { message, fields } }` into an
`ApiError`, and logs the user out if a logged-in request gets 401. No
component calls `fetch` directly.

**The dev server proxies `/api` to Express.**
The browser only ever talks to one origin, so there's no CORS to debug, and
the same relative URLs work when the API and site are deployed together.

**A small `useLoad` hook instead of React Query.**
It loads data when its inputs change, ignores answers that arrive after the
user moved on, and drops old data when the inputs change, so one post never
flashes on another post's page. `setData` lets the like button update the
count straight from the API's answer without reloading the page.

**The token is stored in localStorage.** *(Replaced in Phase 5 by an httpOnly cookie.)*
It survives a page refresh, and every read is wrapped in try/catch because
storage can be blocked. The trade-off: any script on the page could read it.
That's why the Markdown renderer must never run HTML (next point).
An httpOnly cookie would be safer and is a sensible Phase 5 upgrade.

**Markdown is rendered with react-markdown, which ignores raw HTML.**
A post containing `<script>` shows it as text. Links open in a new tab with
`rel="noopener noreferrer"`.

**The page waits for the saved login check before rendering.**
Otherwise a logged-in user briefly sees "Log in" in the navbar, and every
page loads its data twice (once as a visitor, once as themselves).

**Route guards are for convenience; the API is the real protection.**
`RequireAuth` sends visitors to /login and back afterwards, and the editor
says "you can only edit your own posts". But hiding a button doesn't secure
anything: the API rejects these requests even when sent directly.

**Errors appear where they happened.**
Field errors from the API show under the matching input. Other errors show
as a banner on the form or page. A 404 shows a proper "not found" page.

**Plain CSS with variables, light and dark.**
One stylesheet, colors as CSS variables, with a dark version under
`prefers-color-scheme`. Works down to phone width without horizontal scrolling.

## Phase 5: production and deployment

**One Render service serves both the API and the website.**
In production Express serves `client/dist` and returns `index.html` for page
URLs, so React Router handles them. One URL, one deploy, and because the site
and API share an origin, cookies and requests need no CORS setup. The
trade-off is that the free plan sleeps when idle (first visit ~30 s).

**The login token moved to an httpOnly cookie.**
JavaScript can't read an httpOnly cookie, so even an injected script couldn't
steal the session. The cookie is `Secure` in production (HTTPS only),
`SameSite=Lax`, limited to `/api`, and expires with the token. Login still
returns the token in the body, and the API still accepts `Bearer` headers, so
Postman and scripts work unchanged.

**CSRF protection: SameSite plus a required header.**
Browsers attach cookies automatically, which is what CSRF abuses. `SameSite=Lax`
stops other sites' POSTs carrying the cookie. As a second lock, any
cookie-authenticated change must send `X-Requested-With`. Another site can't
add that header without a CORS preflight, and the API refuses those.
Bearer requests skip the check, since browsers never add that header by themselves.

**`/api/auth/session` next to `/api/auth/me`.**
The website asks "who am I?" on every page load. For a visitor, `/me` correctly
answers 401, which shows as a red error in the browser console on every visit.
`/session` answers 200 with `user: null` instead. `/me` keeps its 401 for API clients.

**Rate limiting on login and sign-up.**
20 attempts per IP per 15 minutes (configurable) slows down password guessing
and mass sign-ups. With `trust proxy` set to Render's single proxy, the limit
applies to the real visitor's IP, not the proxy's.

**Security headers via helmet, with one deliberate exception.**
The Content-Security-Policy only allows scripts from the site itself, but
images from any `https:` address, because cover images and avatars are links.

**Caching: hashed assets forever, `index.html` never.**
Vite names files by their content (`index-Ab12.js`), so they're cached for a
year. `index.html` is always re-checked, so a new deploy shows up immediately.

**Express's own errors use the API's error shape.**
A missing asset is a clean 404 and a body over 1 MB is a 413, both as
`{ error: { message } }`, instead of being reported as a 500 server bug.

**The health check checks the database.**
`/api/health` returns 503 if MongoDB isn't connected. Render waits for 200
before switching traffic to a new deploy, so a deploy that can't reach the
database never replaces a working one.

**The deploy was rehearsed before writing the guide.**
A clean copy of the repo was built with `NODE_ENV=production npm run build`
(the exact Render command), started with `npm start`, and used in a browser:
sign up, reload, publish with an external cover image, log out, log back in.
That caught one real issue: with `NODE_ENV=production`, npm skips dev
dependencies, which would have left Vite uninstalled. Hence `--include=dev`
for the client install.

## PRD alignment pass

After checking every line of the PRD against the code:

**Syntax highlighting with rehype-highlight (highlight.js).**
The PRD requires fenced code blocks highlighted by language. rehype-highlight
plugs into react-markdown and only adds `<span class="hljs-…">` tags, so
rendering stays safe. Blocks need a language (```js): auto-detection guessed
wrong too often (SQL came out as "ini"), and wrong colors are worse than none.

**The Markdown renderer loads only when needed.**
highlight.js added ~230 kB. It's split into its own file that loads on the
post page and editor preview only, so the feed is lighter than before.

**The PRD's endpoint names were added beside the existing ones.**
`PUT /api/posts/:id`, `GET /api/posts/mine`, `?search=`, `GET /api/tags/:slug/posts`,
`PUT /api/users/me`, and posts inside `GET /api/users/:id`. The older names
(`PATCH`, `/me`, `?q=`) keep working, so nothing that used them broke. Both
PUT and PATCH accept any subset of fields. `test/prd-api.test.js` calls each
PRD endpoint exactly as the spec writes it.

**The PRD's page URLs, with redirects from the old ones.**
`/editor/new`, `/editor/:id`, `/profile/:id`. Old links (`/new`, `/edit/…`,
`/u/…`) redirect, so bookmarks still work.

**Axios and react-router-dom, as listed in the PRD's packages.**
`api/client.js` is now a pre-configured Axios instance; an interceptor turns
every failure into the same `ApiError`. Pages didn't change, because they
only ever called `api()`.

**A tag picker instead of a comma-separated box.**
The PRD asks to "attach existing tags or create a new tag". Existing tags are
suggested as you type; Enter or comma creates a new one; tags show as
removable chips, and names are normalised the same way the server does.

**Deliberate difference: the token is in an httpOnly cookie, not localStorage.**
The PRD's user story says "token persisted in localStorage". The goal it
describes (stay logged in across refreshes, validated on load) is met, more
securely: an httpOnly cookie can't be read by scripts. The API still accepts
`Authorization: Bearer` tokens exactly as section 5 specifies, so Postman
testing follows the PRD unchanged. See Phase 5 above.

## Dashboard redesign

**Designed first, built second.**
A mockup was agreed before any code: greeting, five stat cards, a posts
table, and a sidebar with drafts to finish and recent comments. The build
matched it, then was checked in light mode, dark mode and at 375 px.

**Two colors, each with one job.**
Blue (`--primary`) means "you can click this" or "this is live": buttons,
links, published posts. Amber (`--attention`) means "this needs you":
drafts and new comments. Everything else is neutral. Green badges were
replaced with blue so the rule holds across the whole site; red stays only on
Delete, because destructive actions should look dangerous.

**Page background.**
The page is a cool blue-gray (`#f4f6fb`) so white cards stand out, and the
dashboard has a soft blue band behind the greeting that the stat cards
overlap. The band is painted full-width with a box-shadow plus clip-path, so
it never causes sideways scrolling.

**One request for the whole dashboard.**
`GET /api/users/me/dashboard` returns the stats, drafts and recent comments
together, using aggregations instead of loading every post. Recent comments
leave out the author's own replies and comments on posts that went back to
draft. "New" means the last 7 days, which needs no read/unread tracking.

**The table keeps its state in the URL.**
Filter, search and sort live in `?status=&search=&sort=`, so refreshing or
sharing the link keeps the view. Search waits 300 ms after typing stops
before asking the server.

**Rare actions go in a ⋯ menu.**
Edit is one click; View and Delete sit in a menu, so a delete button isn't
next to every row. Delete still asks for confirmation (a PRD requirement).

**A mobile bug the screenshot check caught.**
On phones the one-column grid was `1fr`, which can't shrink below its
content, so long titles widened the page and the phone zoomed out.
`minmax(0, 1fr)` lets titles truncate instead.

## Home feed redesign

**Same process and the same two colors as the dashboard.**
Mockup first, approved, then built and checked as a visitor and as a
logged-in reader, in light, dark and at 375 px.

**A welcome band with topic chips.**
The old page opened straight into tabs and felt empty. The band says what
the site is for, and the chips (top tags) give a first click for visitors.

**Popular tab.**
`GET /api/posts?sort=popular` orders by likes, then comments, then date.
It's a sort on stored counters, so it costs nothing extra.

**One-click bookmarks on every card.**
Post lists add `bookmarked: true/false` per post for a logged-in reader
(one extra query per page, not per post). Visitors get no flag and are sent
to log in when they click. The same card is used on the feed, tag pages,
profiles and the bookmarks page, so they all gained it.

**A sidebar that suggests a next step.**
A writing prompt (with draft count for authors, sign-up for visitors),
trending tags, and authors to follow. `GET /api/users/suggested` ranks
authors with published posts by total likes and never suggests yourself or
anyone you already follow; following someone removes them from the list.
