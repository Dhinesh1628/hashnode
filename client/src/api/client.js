import axios from 'axios';

// The one place the app talks to the API: a pre-configured Axios instance plus
// a small api() helper. Pages call api('/posts', { query }) and get the JSON
// body back, or an ApiError they can show.
//
// Login state lives in an httpOnly cookie that the API sets. The browser
// sends it automatically, and this code never sees the token, so a script
// injected into the page couldn't steal it either.

// Earlier versions kept the token in localStorage. Remove any leftover copy.
try { localStorage.removeItem('hashnode.token'); } catch { /* storage blocked: nothing to clean */ }

export const http = axios.create({
  baseURL: '/api',
  withCredentials: true, // send the session cookie
  // The API requires this header on cookie-authenticated changes (CSRF protection).
  headers: { 'X-Requested-With': 'fetch' },
  timeout: 20_000,
});

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

// Turns every Axios failure into an ApiError with a message a person can read.
http.interceptors.response.use(
  (response) => response,
  (err) => {
    const res = err.response;
    if (!res) {
      throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
    }
    const body = res.data && typeof res.data === 'object' ? res.data : null;
    if (!body && res.status >= 500) {
      throw new ApiError(0, "Can't reach the API. Is the server running?");
    }
    const error = new ApiError(res.status, body?.error?.message || `Request failed (${res.status})`, body?.error?.fields);
    if (res.status === 401 && onUnauthorized) onUnauthorized(error);
    throw error;
  },
);

// Empty query values are dropped, so ?search= isn't sent when the box is empty.
function cleanParams(query = {}) {
  return Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== ''));
}

export async function api(path, { method = 'GET', body, query } = {}) {
  const res = await http.request({ url: path, method, data: body, params: cleanParams(query) });
  return res.status === 204 ? null : res.data;
}
