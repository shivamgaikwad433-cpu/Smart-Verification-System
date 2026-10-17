const { z } = require('zod');

/**
 * Wrap a Zod schema into an Express middleware.
 * Validates req.body by default; pass { params: schema } or { query: schema } for other sources.
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: result.error.format()
      });
    }
    req[source] = result.data; // attach parsed & coerced data
    next();
  };
}

module.exports = validate;
