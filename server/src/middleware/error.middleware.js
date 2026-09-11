export function errorHandler(err, req, res, next) {
  console.error('API Error:', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
}
