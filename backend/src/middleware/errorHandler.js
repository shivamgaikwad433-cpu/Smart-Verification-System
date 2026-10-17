function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  console.error(`[ERROR] ${req.method} ${req.path} ->`, err.message);
  res.status(status).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

module.exports = errorHandler;
