import { prisma } from '../lib/prisma.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';

const base = (a) => ({
  id: a.id,
  title: a.title,
  description: a.description,
  dueDate: a.dueDate,
  oneDriveLink: a.oneDriveLink,
  audience: a.audience,
  createdAt: a.createdAt,
});

/**
 * Prisma `where` clause for assignments visible to a given group.
 *
 * Audience ALL is resolved DYNAMICALLY here rather than materialised at
 * creation time, so a group formed after an assignment was posted still sees
 * it — and still counts in that assignment's denominator.
 */
function visibleToGroup(groupId) {
  if (!groupId) return { audience: 'ALL' }; // ungrouped students see general work only
  return {
    OR: [{ audience: 'ALL' }, { targetGroups: { some: { groupId } } }],
  };
}

/** Number of groups an assignment targets, evaluated now. */
export async function targetGroupCount(assignment) {
  if (assignment.audience === 'ALL') return prisma.group.count();
  return prisma.assignmentGroup.count({ where: { assignmentId: assignment.id } });
}

export async function createAssignment(user, data) {
  const { targetGroupIds = [], ...fields } = data;

  if (fields.audience === 'SPECIFIC' && targetGroupIds.length === 0) {
    throw badRequest('Select at least one group, or set audience to ALL', 'NO_TARGET_GROUPS');
  }
  if (fields.audience === 'SPECIFIC') {
    const found = await prisma.group.count({ where: { id: { in: targetGroupIds } } });
    if (found !== targetGroupIds.length) throw badRequest('One or more target groups do not exist');
  }

  const assignment = await prisma.assignment.create({
    data: {
      ...fields,
      createdBy: user.id,
      ...(fields.audience === 'SPECIFIC'
        ? { targetGroups: { create: targetGroupIds.map((groupId) => ({ groupId })) } }
        : {}),
    },
  });
  return base(assignment);
}

export async function updateAssignment(id, data) {
  const { targetGroupIds, ...fields } = data;
  const existing = await prisma.assignment.findUnique({ where: { id } });
  if (!existing) throw notFound('Assignment not found');

  const nextAudience = fields.audience ?? existing.audience;
  if (nextAudience === 'SPECIFIC' && targetGroupIds && targetGroupIds.length === 0) {
    throw badRequest('Select at least one group, or set audience to ALL', 'NO_TARGET_GROUPS');
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (targetGroupIds) {
      await tx.assignmentGroup.deleteMany({ where: { assignmentId: id } });
      if (nextAudience === 'SPECIFIC') {
        await tx.assignmentGroup.createMany({
          data: targetGroupIds.map((groupId) => ({ assignmentId: id, groupId })),
        });
      }
    }
    return tx.assignment.update({ where: { id }, data: fields });
  });
  return base(updated);
}

/** Student view: every visible assignment plus this group's submission state. */
export async function listForStudent(user) {
  const groupId = user.membership?.groupId ?? null;
  const assignments = await prisma.assignment.findMany({
    where: visibleToGroup(groupId),
    orderBy: { dueDate: 'asc' },
    include: groupId
      ? { submissions: { where: { groupId }, include: { confirmer: true } } }
      : undefined,
  });

  return assignments.map((a) => {
    const submission = a.submissions?.[0] ?? null;
    return {
      ...base(a),
      submitted: Boolean(submission),
      submittedAt: submission?.confirmedAt ?? null,
      confirmedBy: submission ? { id: submission.confirmer.id, name: submission.confirmer.name } : null,
      canSubmit: Boolean(groupId) && !submission,
      isOverdue: !submission && new Date(a.dueDate) < new Date(),
    };
  });
}

/** Professor view: every assignment with live confirmed/target counts. */
export async function listForAdmin() {
  const assignments = await prisma.assignment.findMany({
    orderBy: { dueDate: 'asc' },
    include: { _count: { select: { submissions: true, targetGroups: true } } },
  });
  const totalGroups = await prisma.group.count();

  return assignments.map((a) => {
    const targeted = a.audience === 'ALL' ? totalGroups : a._count.targetGroups;
    return {
      ...base(a),
      targetedGroups: targeted,
      confirmedGroups: a._count.submissions,
      completionPct: targeted === 0 ? 0 : Math.round((a._count.submissions / targeted) * 100),
    };
  });
}

/** Professor view: per-group confirmation detail for one assignment. */
export async function assignmentDetail(id) {
  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: { targetGroups: true },
  });
  if (!assignment) throw notFound('Assignment not found');

  const targetGroups = assignment.audience === 'ALL'
    ? await prisma.group.findMany({ include: { members: { include: { user: true } } } })
    : await prisma.group.findMany({
        where: { id: { in: assignment.targetGroups.map((t) => t.groupId) } },
        include: { members: { include: { user: true } } },
      });

  const submissions = await prisma.submission.findMany({
    where: { assignmentId: id },
    include: { confirmer: true },
  });
  const byGroup = new Map(submissions.map((s) => [s.groupId, s]));

  return {
    ...base(assignment),
    groups: targetGroups.map((g) => {
      const s = byGroup.get(g.id) ?? null;
      return {
        id: g.id,
        name: g.name,
        memberCount: g.members.length,
        members: g.members.map((m) => ({ id: m.user.id, name: m.user.name, email: m.user.email })),
        submitted: Boolean(s),
        submittedAt: s?.confirmedAt ?? null,
        confirmedBy: s ? { id: s.confirmer.id, name: s.confirmer.name } : null,
      };
    }),
  };
}

/**
 * The two-step confirmation's server half.
 *
 * The acting group is read from the caller's own membership. A group id in the
 * request body is ignored entirely, so a student cannot confirm on behalf of
 * another group even with a valid token.
 */
export async function confirmSubmission(user, assignmentId) {
  const groupId = user.membership?.groupId;
  if (!groupId) throw badRequest('Join or create a group before confirming a submission', 'NO_GROUP');

  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, ...visibleToGroup(groupId) },
  });
  if (!assignment) throw notFound('Assignment not found, or it is not assigned to your group');

  const already = await prisma.submission.findUnique({
    where: { groupId_assignmentId: { groupId, assignmentId } },
    include: { confirmer: true },
  });
  if (already) {
    throw conflict(
      `Your group already confirmed this on ${already.confirmedAt.toLocaleDateString()} (by ${already.confirmer.name})`,
      'ALREADY_CONFIRMED',
    );
  }

  const submission = await prisma.submission.create({
    data: { groupId, assignmentId, confirmedBy: user.id },
    include: { confirmer: true },
  });

  return {
    assignmentId,
    groupId,
    submitted: true,
    submittedAt: submission.confirmedAt,
    confirmedBy: { id: submission.confirmer.id, name: submission.confirmer.name },
  };
}
