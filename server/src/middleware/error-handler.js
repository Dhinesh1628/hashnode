import mongoose from 'mongoose';
import { HttpError } from '../lib/http-error.js';

// Every error response has the same shape:
//   { error: { message: string, fields?: { [field]: string } } }
// so the React client only needs one way to display errors.

export function notFoundRoute(req, _res, next) {
  next(HttpError.notFound(`No route for ${req.method} ${req.originalUrl}`));
}

export function errorHandler(err, _req, res, _next) {
  let error = err;

  if (err instanceof mongoose.Error.ValidationError) {
    const fields = Object.fromEntries(Object.entries(err.errors).map(([k, e]) => [k, e.message]));
    error = HttpError.badRequest('Please fix the highlighted fields', fields);
  } else if (err instanceof mongoose.Error.CastError) {
    // e.g. /api/users/not-an-object-id
    error = HttpError.notFound();
  } else if (err?.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'value';
    error = HttpError.conflict(`That ${field} is already taken`, { [field]: 'Already taken' });
  } else if (err?.type === 'entity.parse.failed') {
    error = HttpError.badRequest('Request body is not valid JSON');
  } else if (err?.code === 'ENOENT' && err.status === 404) {
    // A file under /assets that doesn't exist (e.g. an old cached page asking for a replaced file).
    error = HttpError.notFound();
  } else if (err?.expose && err.status >= 400 && err.status < 500) {
    // Express's own client errors, e.g. a body over 1 MB (413).
    error = new HttpError(err.status, err.message);
  }

  if (!(error instanceof HttpError)) {
    // Unexpected bug: log the details, but never send stack traces to clients.
    console.error(err);
    error = new HttpError(500, 'Something went wrong on our side');
  }

  const body = { error: { message: error.message } };
  if (error.fields) body.error.fields = error.fields;
  res.status(error.status).json(body);
}
