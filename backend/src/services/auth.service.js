import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/jwt.js';
import { conflict, unauthorized } from '../lib/errors.js';

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

/**
 * Self-registration always creates a STUDENT.
 *
 * Professor (ADMIN) accounts are provisioned by the seed script, never through
 * this endpoint — otherwise anyone could grant themselves admin by passing
 * {"role":"ADMIN"} in the request body, which is a privilege-escalation hole.
 */
export async function register({ name, email, password }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw conflict('An account with that email already exists', 'EMAIL_TAKEN');

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: 'STUDENT',
    },
  });

  return { token: signToken(user), user: publicUser(user) };
}

export async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Same message for unknown email and wrong password: no user enumeration.
  const invalid = unauthorized('Invalid email or password');
  if (!user) throw invalid;

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw invalid;

  return { token: signToken(user), user: publicUser(user) };
}

export function me(user) {
  return {
    ...publicUser(user),
    group: user.membership
      ? { id: user.membership.group.id, name: user.membership.group.name }
      : null,
  };
}
