import { badRequest } from '../lib/errors.js';

/** Validates req[source] against a zod schema and replaces it with parsed data. */
export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const detail = result.error.issues
        .map((i) => `${i.path.join('.') || source}: ${i.message}`)
        .join('; ');
      return next(badRequest(detail, 'VALIDATION_ERROR'));
    }
    req[source] = result.data;
    next();
  };
}
