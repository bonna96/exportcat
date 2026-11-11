const { ZodError } = require('zod');

/**
 * Zod validation middleware factory
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @param {'body' | 'query' | 'params'} source - Request property to validate
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const data = schema.parse(req[source]);
      req[source] = data; // Replace with parsed/cleaned data
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));

        if (req.path.startsWith('/api/')) {
          return res.status(400).json({ error: 'Validation failed', details: errors });
        }

        // For SSR forms, flash errors and redirect back
        req.validationErrors = errors;
        return next();
      }
      next(err);
    }
  };
}

module.exports = { validate };
