export class ApiError extends Error { constructor(status, message) { super(message); this.status = status; } }
export function errorHandler(error, req, res, next) {
  const status = error instanceof ApiError ? error.status : error.type === 'entity.parse.failed' ? 400 : error.type === 'entity.too.large' ? 413 : 500;
  res.status(status).json({ error: { message: error instanceof ApiError ? error.message : status === 400 ? 'Invalid JSON' : status === 413 ? 'Request too large' : 'Internal server error' } });
}
