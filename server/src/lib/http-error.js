// One error type for everything the API deliberately rejects.
// `fields` carries per-field messages so forms can show them next to inputs.

export class HttpError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }

  static badRequest(message, fields) { return new HttpError(400, message, fields); }
  static unauthorized(message = 'Please log in to continue') { return new HttpError(401, message); }
  static forbidden(message = 'You are not allowed to do that') { return new HttpError(403, message); }
  static notFound(message = 'Not found') { return new HttpError(404, message); }
  static conflict(message, fields) { return new HttpError(409, message, fields); }
}
