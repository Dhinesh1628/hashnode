# Deploying to Render

One Render web service runs the API **and** serves the built React site, so
the whole app lives at one URL (for example `https://hashnode-ab12.onrender.com`).
The database stays on MongoDB Atlas.

Everything Render needs is already in the repo:

| File | What it does |
|---|---|
| `render.yaml` | Tells Render how to build, start and health-check the app |
| `package.json` (root) | `npm run build` installs both halves and builds the site; `npm start` starts the API |

Time needed: about 15 minutes, most of it waiting for the first build.

---

## 1. Prepare MongoDB Atlas

**a) Allow Render to connect.**
Render's free plan has no fixed IP address, so Atlas must accept connections
from anywhere. The database password is what keeps it safe.

1. Atlas → **Security → Network Access → Add IP Address**
2. Click **Allow Access from Anywhere** (`0.0.0.0/0`) → **Confirm**

**b) Use a strong database password for production.**
Atlas → **Security → Database Access** → user `hashnode_app` → **Edit** →
**Edit Password** → **Autogenerate Secure Password** → copy it → **Update User**.
(The password used during development was shared in chat, so replace it.)

**c) Build the connection string.** It looks like this, with your password and
the database name `hashnode` added after the `/`:

```
mongodb+srv://hashnode_app:<PASSWORD>@cluster0.octwra9.mongodb.net/hashnode?retryWrites=true&w=majority
```

If the password contains symbols like `@ : / ? #`, replace them with their
URL-encoded form (`@` → `%40`, `#` → `%23`), or autogenerate one without symbols.

After changing the password, update `MONGO_URI` in your local `server/.env` too.

## 2. Create the service on Render

1. Sign up at **render.com** with your GitHub account.
2. Dashboard → **New → Blueprint**.
3. Connect the **hashnode** repository and pick the `main` branch.
4. Render reads `render.yaml` and shows one service, **hashnode**. It asks for
   **MONGO_URI**: paste the connection string from step 1c.
   (`JWT_SECRET` is generated for you, and `NODE_ENV` is set to `production`.)
5. Click **Apply**. The first build takes 3–5 minutes. Watch the **Logs** tab:
   it's done when you see `API listening on http://localhost:10000` and the
   service shows **Live**.

## 3. Check it works

Open your service URL (shown at the top of the service page):

1. `https://<your-app>.onrender.com/api/health` should show `{"ok":true}`.
2. Open the site, **Sign up**, write a post, publish it.
3. Open the post's link in a private window: it should load directly.

## 4. Updating the live site

Every `git push` to `main` makes Render rebuild and redeploy automatically.
The old version keeps serving until the new one passes `/api/health`, so a
broken build never takes the site down.

---

## Troubleshooting

| Symptom (in Render's Logs) | Fix |
|---|---|
| `MongoServerSelectionError` / timed out | Atlas Network Access is missing `0.0.0.0/0` (step 1a). |
| `bad auth : authentication failed` | Wrong user or password in `MONGO_URI`, or the password has unencoded symbols. |
| `Missing environment variables: MONGO_URI` | Render → service → **Environment** → add `MONGO_URI`. |
| Build fails at `vite build` | Run `npm run build` in `client/` locally and fix the error it shows. |
| First visit takes ~30–60 s | Normal on the free plan: the service sleeps after 15 minutes without visitors. |
| "Too many attempts" on login | 20 login/sign-up attempts per 15 minutes per IP. Wait, or set `AUTH_RATE_LIMIT`. |

Don't set `DNS_SERVERS` on Render. It's only a workaround for Windows networks.

## Production settings reference

| Variable | Required | Default | Notes |
|---|---|---|---|
| `MONGO_URI` | yes | — | Atlas connection string |
| `JWT_SECRET` | yes | — | 32+ characters; `render.yaml` generates one |
| `NODE_ENV` | yes | — | `production`: secure cookies, serves the site, trusts Render's proxy |
| `PORT` | no | `5050` | Render sets this itself |
| `JWT_EXPIRES_IN` | no | `7d` | How long a login lasts |
| `AUTH_RATE_LIMIT` | no | `20` | Login + sign-up attempts per IP per 15 minutes |
| `CLIENT_DIST` | no | `client/dist` | Where the built site is |
