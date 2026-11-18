// The one place the app talks to the API. Every request goes through api(),
// so the token header and error handling are written once.

const TOKEN_KEY = 'hashnode.token';

// localStorage can throw (private mode, blocked storage), so wrap every access.
export const tokenStore = {
  get() {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set(token) {
    try { localStorage.setItem(TOKEN_KEY, token); } catch { /* stays logged in for this tab only */ }
  },
  clear() {
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* nothing to clear */ }
  },
};

// Mirrors the API's error shape: { error: { message, fields } }.
// status 0 means the request never reached the API.
export class ApiError extends Error {
  constructor(status, message, fields = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

// Called when a logged-in request gets 401 (expired or revoked session).
let onUnauthorized = null;
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

export async function api(path, { method = 'GET', body, query } = {}) {
  const url = new URL(`/api${path}`, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  }

  const token = tokenStore.get();
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
  }
  if (res.status === 204) return null;

  let data = null;
  try { data = await res.json(); } catch { /* not JSON, e.g. the dev proxy's own error page */ }

  if (!res.ok) {
    if (!data && res.status >= 500) {
      throw new ApiError(0, "Can't reach the API. Is the server running?");
    }
    const error = new ApiError(res.status, data?.error?.message || `Request failed (${res.status})`, data?.error?.fields);
    if (res.status === 401 && token && onUnauthorized) onUnauthorized(error);
    throw error;
  }
  return data;
}
