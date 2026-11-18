// The one place the app talks to the API. Every request goes through api(),
// so headers and error handling are written once.
//
// Login state lives in an httpOnly cookie that the API sets. The browser
// sends it automatically, and this code never sees the token, so a script
// injected into the page couldn't steal it either.

// Earlier versions kept the token in localStorage. Remove any leftover copy.
try { localStorage.removeItem('hashnode.token'); } catch { /* storage blocked: nothing to clean */ }

// Mirrors the API's error shape: { error: { message, fields } }.
// status 0 means the request never reached the API.
export class ApiError extends Error {
  constructor(status, message, fields = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

// Called when a request gets 401 (session expired or logged out elsewhere).
let onUnauthorized = null;
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

export async function api(path, { method = 'GET', body, query } = {}) {
  const url = new URL(`/api${path}`, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  }

  // The API requires this header on cookie-authenticated changes (CSRF protection).
  const headers = { 'X-Requested-With': 'fetch' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      credentials: 'same-origin', // send the session cookie
      body: body === undefined ? undefined : JSON.stringify(body),
    });
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
    if (res.status === 401 && onUnauthorized) onUnauthorized(error);
    throw error;
  }
  return data;
}
