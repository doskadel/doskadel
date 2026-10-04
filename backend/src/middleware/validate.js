const { validationResult } = require('express-validator');

/** Бросает 400, если валидаторы express-validator нашли ошибки. */
module.exports = function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array().map((e) => ({ field: e.path, message: e.msg })) });
  }
  next();
};
