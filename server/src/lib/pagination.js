// Reads ?page=&limit= from a query string. Bad or missing values fall back to
// defaults instead of erroring, and limit is capped so nobody can ask for
// 100,000 posts in one request.
export function readPagination(query = {}, { defaultLimit = 10, maxLimit = 50 } = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

export function pageInfo({ page, limit }, total) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
