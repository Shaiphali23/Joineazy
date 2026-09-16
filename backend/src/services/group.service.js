import { prisma } from '../lib/prisma.js';
import { badRequest, conflict, notFound, forbidden } from '../lib/errors.js';

const memberView = (m) => ({
  id: m.user.id,
  name: m.user.name,
  email: m.user.email,
  joinedAt: m.joinedAt,
});

/** Creates a group and makes the creator its first member, atomically. */
export async function createGroup(user, { name }) {
  if (user.membership) {
    throw conflict(
      `You are already in "${user.membership.group.name}". Leave it before creating a new group.`,
      'ALREADY_IN_GROUP',
    );
  }

  const taken = await prisma.group.findUnique({ where: { name } });
  if (taken) throw conflict('A group with that name already exists', 'GROUP_NAME_TAKEN');

  return prisma.$transaction(async (tx) => {
    const group = await tx.group.create({ data: { name, createdBy: user.id } });
    await tx.groupMember.create({ data: { groupId: group.id, userId: user.id } });
    return getGroup(group.id, tx);
  });
}

export async function getGroup(groupId, client = prisma) {
  const group = await client.group.findUnique({
    where: { id: groupId },
    include: { members: { include: { user: true }, orderBy: { joinedAt: 'asc' } } },
  });
  if (!group) throw notFound('Group not found');
  return { id: group.id, name: group.name, createdAt: group.createdAt, members: group.members.map(memberView) };
}

/**
 * Adds another student to the CALLER'S OWN group.
 *
 * The target group is derived from the caller's membership, never from the
 * request body, so a member of one group cannot modify another group.
 * The add is non-destructive: a student who already has a group is rejected
 * rather than moved, so nobody can be pulled out of their team.
 */
export async function addMember(user, { email }) {
  if (!user.membership) throw badRequest('Create or join a group before adding members', 'NO_GROUP');
  const groupId = user.membership.groupId;

  const target = await prisma.user.findUnique({
    where: { email },
    include: { membership: { include: { group: true } } },
  });
  if (!target) throw notFound(`No student found with email ${email}`);
  if (target.role !== 'STUDENT') throw badRequest('Only students can join groups', 'NOT_A_STUDENT');
  if (target.id === user.id) throw badRequest('You are already a member of this group', 'SELF_ADD');

  if (target.membership) {
    const where = target.membership.groupId === groupId
      ? 'already a member of your group'
      : `already a member of "${target.membership.group.name}"`;
    throw conflict(`${target.name} is ${where}`, 'ALREADY_IN_GROUP');
  }

  await prisma.groupMember.create({ data: { groupId, userId: target.id } });
  return getGroup(groupId);
}

/** Removes the caller from their own group. Deletes the group if it empties. */
export async function leaveGroup(user) {
  if (!user.membership) throw badRequest('You are not in a group', 'NO_GROUP');
  const groupId = user.membership.groupId;

  return prisma.$transaction(async (tx) => {
    await tx.groupMember.delete({ where: { userId: user.id } });
    const remaining = await tx.groupMember.count({ where: { groupId } });
    if (remaining === 0) {
      // An empty group would linger in every professor denominator forever.
      await tx.group.delete({ where: { id: groupId } });
      return { left: true, groupDeleted: true };
    }
    return { left: true, groupDeleted: false };
  });
}

/** Professor view: every group with member count and submission count. */
export async function listGroups() {
  const groups = await prisma.group.findMany({
    include: {
      members: { include: { user: true } },
      _count: { select: { submissions: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    createdAt: g.createdAt,
    memberCount: g.members.length,
    submissionCount: g._count.submissions,
    members: g.members.map(memberView),
  }));
}

export { forbidden };
