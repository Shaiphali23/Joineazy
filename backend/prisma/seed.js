import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// One shared password for every demo account, so a live demo never stalls.
const PASSWORD = 'Password123!';

const days = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

/**
 * Seeds the cohort described in the design notes:
 *   10 students, 3 groups covering 8 of them, 2 deliberately ungrouped.
 *
 * The 2 ungrouped students exist on purpose: they are what makes the
 * professor dashboard's dual denominator visible. A group-only count reports
 * 100% while those two are unaccounted for.
 *
 * Idempotent: wipes and rebuilds, so it is safe to re-run between demo takes.
 */
async function main() {
  console.log('Resetting database...');
  await prisma.submission.deleteMany();
  await prisma.assignmentGroup.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const professor = await prisma.user.create({
    data: {
      name: 'Dr. Meera Iyer',
      email: 'professor@joineazy.edu',
      passwordHash,
      role: 'ADMIN',
    },
  });

  const studentNames = [
    'Ayush Jaiswal', 'Priya Sharma', 'Rahul Verma',
    'Sneha Nair', 'Karan Mehta', 'Aditi Rao',
    'Vikram Singh', 'Neha Gupta',
    'Arjun Patel', 'Divya Menon', // these two stay ungrouped
  ];

  const students = [];
  for (const name of studentNames) {
    const email = `${name.split(' ')[0].toLowerCase()}@joineazy.edu`;
    students.push(await prisma.user.create({
      data: { name, email, passwordHash, role: 'STUDENT' },
    }));
  }

  const makeGroup = async (name, members) => {
    const group = await prisma.group.create({
      data: { name, createdBy: members[0].id },
    });
    for (const m of members) {
      await prisma.groupMember.create({ data: { groupId: group.id, userId: m.id } });
    }
    return group;
  };

  const rocket = await makeGroup('Team Rocket', students.slice(0, 3));
  const alpha  = await makeGroup('Team Alpha',  students.slice(3, 6));
  const gamma  = await makeGroup('Team Gamma',  students.slice(6, 8));
  // students[8] and students[9] intentionally have no group.

  const makeAssignment = (data, targetGroups = []) =>
    prisma.assignment.create({
      data: {
        ...data,
        createdBy: professor.id,
        ...(targetGroups.length
          ? { targetGroups: { create: targetGroups.map((g) => ({ groupId: g.id })) } }
          : {}),
      },
    });

  const a1 = await makeAssignment({
    title: 'Database Design Fundamentals',
    description: 'Design a normalised schema for a library system. Submit your ER diagram and DDL script to the OneDrive folder.',
    dueDate: days(-3),
    oneDriveLink: 'https://onedrive.live.com/joineazy/db-design-fundamentals',
    audience: 'ALL',
  });

  const a2 = await makeAssignment({
    title: 'REST API Security',
    description: 'Implement JWT authentication with role-based route guards. Document how you prevent insecure direct object references.',
    dueDate: days(2),
    oneDriveLink: 'https://onedrive.live.com/joineazy/rest-api-security',
    audience: 'ALL',
  });

  await makeAssignment({
    title: 'React Component Architecture',
    description: 'Build a responsive dashboard with reusable components. Explain your state management choices.',
    dueDate: days(6),
    oneDriveLink: 'https://onedrive.live.com/joineazy/react-architecture',
    audience: 'ALL',
  });

  const a4 = await makeAssignment({
    title: 'Advanced Query Optimisation',
    description: 'Extension work: profile and optimise three slow queries. Assigned to selected groups only.',
    dueDate: days(9),
    oneDriveLink: 'https://onedrive.live.com/joineazy/query-optimisation',
    audience: 'SPECIFIC',
  }, [rocket, gamma]);

  const confirm = (group, assignment, confirmer) =>
    prisma.submission.create({
      data: { groupId: group.id, assignmentId: assignment.id, confirmedBy: confirmer.id },
    });

  // A spread of states, so every dashboard number differs from the others.
  await confirm(rocket, a1, students[0]);
  await confirm(alpha,  a1, students[3]);
  await confirm(rocket, a2, students[1]);
  await confirm(gamma,  a4, students[6]);

  console.log(`
Seed complete.

  Professor : professor@joineazy.edu
  Students  : ayush@joineazy.edu, priya@joineazy.edu, ... , divya@joineazy.edu
  Password  : ${PASSWORD}   (all accounts)

  10 students | 3 groups (8 members) | 2 ungrouped: Arjun Patel, Divya Menon
  4 assignments | 4 confirmed group submissions
`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
