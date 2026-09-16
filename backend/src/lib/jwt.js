import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

if (!SECRET) {
  throw new Error('JWT_SECRET is not set. Copy .env.example to .env.');
}

/**
 * The token carries identity and role only.
 * It deliberately does NOT carry groupId: group membership changes during a
 * token's 24h lifetime, so it is always re-read from the database.
 */
export function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, SECRET, {
    expiresIn: EXPIRES_IN,
  });
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET);
}
