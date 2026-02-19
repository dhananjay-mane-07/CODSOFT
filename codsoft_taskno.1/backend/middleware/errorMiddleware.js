const errorMiddleware = (err, req, res, next) => {
  res.status(res.statusCode || 500);
  res.json({
    message: err.message || "Server Error"
  });
};

module.exports = errorMiddleware;
