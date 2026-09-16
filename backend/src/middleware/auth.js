import { verifyToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';
import { unauthorized, forbidden } from '../lib/errors.js';

/**
 * Authenticates the caller and attaches the *server's* view of them.
 *
 * req.user.membership is loaded here from the database on every request so that
 * downstream handlers can derive the acting group WITHOUT trusting any group id
 * supplied by the client. This is the core defence against IDOR in this app.
 */
export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) throw unauthorized('Missing Bearer token');

    let payload;
    try {
      payload = verifyToken(header.slice(7));
    } catch {
      throw unauthorized('Invalid or expired token');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { membership: { include: { group: true } } },
    });
    if (!user) throw unauthorized('User no longer exists');

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(forbidden(`This action requires role: ${roles.join(' or ')}`));
    }
    next();
  };
}

/** Convenience: the caller's group, derived server-side. Never from the body. */
export function callerGroupId(req) {
  return req.user?.membership?.groupId ?? null;
}
