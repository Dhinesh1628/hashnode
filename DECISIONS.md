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
