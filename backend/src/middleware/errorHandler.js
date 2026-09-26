const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  let error = {
    message: err.message || 'Internal Server Error',
    statusCode: err.statusCode || 500
  };

  // Обработка ошибок валидации Mongoose
  if (err.name === 'ValidationError') {
    error = {
      message: Object.values(err.errors).map(val => val.message).join(', '),
      statusCode: 400
    };
  }

  // Обработка ошибок уникальности
  if (err.code === 11000) {
    error = {
      message: 'Duplicate field value entered',
      statusCode: 400
    };
  }

  // Обработка ошибок JWT
  if (err.name === 'JsonWebTokenError') {
    error = {
      message: 'Invalid token',
      statusCode: 401
    };
  }

  res.status(error.statusCode).json({
    success: false,
    error: error.message
  });
};

module.exports = errorHandler;