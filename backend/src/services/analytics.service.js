import { prisma } from '../lib/prisma.js';

/**
 * Professor analytics.
 *
 * Written as raw SQL rather than Prisma queries: these are set-oriented
 * aggregates with a conditional denominator, and expressing them through an
 * ORM would mean several round trips plus in-memory joining. One query per
 * concern is both clearer and cheaper.
 *
 * The dual denominator is deliberate. Group completion alone reports 100% when
 * every group has submitted, even if students who belong to no group are
 * unaccounted for. Student coverage exposes exactly that gap.
 */
export async function overview() {
  const [totals] = await prisma.$queryRaw`
    SELECT
      (SELECT COUNT(*)::int FROM users WHERE role = 'STUDENT')      AS "totalStudents",
      (SELECT COUNT(*)::int FROM groups)                            AS "totalGroups",
      (SELECT COUNT(*)::int FROM assignments)                       AS "totalAssignments",
      (SELECT COUNT(*)::int FROM users u
         WHERE u.role = 'STUDENT'
           AND NOT EXISTS (SELECT 1 FROM group_members gm WHERE gm."userId" = u.id)
      )                                                             AS "ungroupedStudents"
  `;

  const perAssignment = await prisma.$queryRaw`
    SELECT
      a.id,
      a.title,
      a."dueDate",
      a.audience::text AS audience,
      -- Audience ALL is counted against the CURRENT group population, so groups
      -- formed after the assignment was posted are included in the denominator.
      CASE
        WHEN a.audience = 'ALL'
          THEN (SELECT COUNT(*)::int FROM groups)
        ELSE (SELECT COUNT(*)::int FROM assignment_groups ag WHERE ag."assignmentId" = a.id)
      END AS "targetedGroups",
      (SELECT COUNT(*)::int FROM submissions s WHERE s."assignmentId" = a.id) AS "confirmedGroups",
      (SELECT COUNT(*)::int
         FROM group_members gm
         JOIN submissions s
           ON s."groupId" = gm."groupId"
          AND s."assignmentId" = a.id
      ) AS "studentsCovered"
    FROM assignments a
    ORDER BY a."dueDate" ASC
  `;

  const totalStudents = totals.totalStudents;

  const rows = perAssignment.map((r) => ({
    id: r.id,
    title: r.title,
    dueDate: r.dueDate,
    audience: r.audience,
    targetedGroups: r.targetedGroups,
    confirmedGroups: r.confirmedGroups,
    groupCompletionPct: r.targetedGroups === 0 ? 0 : Math.round((r.confirmedGroups / r.targetedGroups) * 100),
    studentsCovered: r.studentsCovered,
    totalStudents,
    studentCoveragePct: totalStudents === 0 ? 0 : Math.round((r.studentsCovered / totalStudents) * 100),
  }));

  const targetedSum = rows.reduce((n, r) => n + r.targetedGroups, 0);
  const confirmedSum = rows.reduce((n, r) => n + r.confirmedGroups, 0);
  const coveredSum = rows.reduce((n, r) => n + r.studentsCovered, 0);
  const studentSlots = rows.length * totalStudents;

  return {
    totals,
    overall: {
      groupCompletionPct: targetedSum === 0 ? 0 : Math.round((confirmedSum / targetedSum) * 100),
      studentCoveragePct: studentSlots === 0 ? 0 : Math.round((coveredSum / studentSlots) * 100),
      confirmedGroupSubmissions: confirmedSum,
      expectedGroupSubmissions: targetedSum,
    },
    perAssignment: rows,
  };
}

/** Per-group standing across all assignments targeted at that group. */
export async function groupProgress() {
  return prisma.$queryRaw`
    SELECT
      g.id,
      g.name,
      (SELECT COUNT(*)::int FROM group_members gm WHERE gm."groupId" = g.id) AS "memberCount",
      (SELECT COUNT(*)::int
         FROM assignments a
        WHERE a.audience = 'ALL'
           OR EXISTS (SELECT 1 FROM assignment_groups ag
                       WHERE ag."assignmentId" = a.id AND ag."groupId" = g.id)
      ) AS "assignedCount",
      (SELECT COUNT(*)::int FROM submissions s WHERE s."groupId" = g.id) AS "confirmedCount"
    FROM groups g
    ORDER BY g.name ASC
  `;
}
