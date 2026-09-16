# Joineazy Assignment — Student, Group & Assignment Management System

A web app with two kinds of users.

- **Students** make their own groups, add members, and confirm that they submitted their work.
- **Professors** post assignments and see who has submitted.

Students upload their actual files to OneDrive. This app does not store files. It only
stores the confirmation that a group has submitted.

---

## Contents

- [What it does](#what-it-does)
- [Tech stack](#tech-stack)
- [How to run it](#how-to-run-it)
- [Demo accounts](#demo-accounts)
- [How it is built](#how-it-is-built)
- [Database](#database)
- [API list](#api-list)
- [Why I built it this way](#why-i-built-it-this-way)
- [Security](#security)
- [What is missing](#what-is-missing)

---

## What it does

**A student can:**
- Sign up and log in
- Create a group and add members by email
- Leave their group
- See all assignments given to them
- Open the OneDrive link for an assignment
- Confirm a submission using a two-step popup
- See a progress bar of how many assignments their group has finished

**A professor can:**
- Create and edit assignments (title, description, due date, OneDrive link)
- Send an assignment to all groups, or only to chosen groups
- See which groups confirmed and which did not
- See who clicked confirm in each group
- See a dashboard with counts and progress bars

All the words used in this project are defined in [`CONTEXT.md`](./CONTEXT.md).

---

## Tech stack

| Part | What I used |
|---|---|
| Frontend | React 19, React Router 7, Tailwind CSS 4, Vite, Axios |
| Backend | Node.js 22, Express 4, Prisma 6, Zod |
| Database | PostgreSQL 16 |
| Login | JWT tokens, bcrypt for passwords |
| Containers | Docker and Docker Compose |

---

## How to run it

### Option A — Docker (easiest)

This runs the database, the backend, and the frontend together.

```bash
git clone <repository-url>
cd joineazy-task1
docker compose up --build
```

Then add the demo data:

```bash
docker compose exec api node prisma/seed.js
```

Now open these:

| What | Where |
|---|---|
| The app | http://localhost:8080 |
| The API | http://localhost:4000/api |
| Database | localhost:5433 |

You do not need to run database migrations yourself. The backend container does it
when it starts.

### Option B — Run it locally

The database still runs in Docker. The app runs on your machine, so changes reload
instantly.

```bash
docker compose up -d db          # start only the database

cd backend
cp .env.example .env
npm install
npx prisma migrate dev           # create the tables
npm run seed                     # add demo data
npm run dev                      # runs on http://localhost:4000

cd ../frontend
npm install
npm run dev                      # runs on http://localhost:5173
```

Vite sends all `/api` calls to the backend for you. So the browser only talks to one
address, and there is no CORS setup needed.

### Settings (`backend/.env`)

| Name | What it is for |
|---|---|
| `DATABASE_URL` | Where the database is |
| `JWT_SECRET` | Secret key used to sign login tokens |
| `JWT_EXPIRES_IN` | How long a login lasts (default `24h`) |
| `PORT` | Backend port (default `4000`) |
| `CORS_ORIGIN` | Which website addresses are allowed |

---

## Demo accounts

The password for every account is **`Password123!`**

| Role | Email | Note |
|---|---|---|
| Professor | `professor@joineazy.edu` | Can see the dashboard |
| Student | `ayush@joineazy.edu` | In Team Rocket |
| Student | `sneha@joineazy.edu` | In Team Alpha |
| Student | `arjun@joineazy.edu` | **In no group on purpose** |

The demo data has 10 students, 3 groups with 8 students in them, 2 students with no
group, and 4 assignments in different states.

---

## How it is built

```
┌──────────────────────────────────────────────────────────────┐
│  Browser                                                     │
│    React app. Login token saved in localStorage.             │
│    Sent back on every call as an Authorization header.       │
└───────────────────────────┬──────────────────────────────────┘
                            │  /api/*  (same address)
                            │  local: Vite  ·  Docker: nginx
┌───────────────────────────▼──────────────────────────────────┐
│  Express backend                                             │
│    routes/      the URLs, input checks, role checks          │
│    middleware/  login check, role check, error handling      │
│    services/    the actual logic and permission rules        │
│    lib/         database client, tokens, error types         │
└───────────────────────────┬──────────────────────────────────┘
                            │  Prisma for normal queries
                            │  plain SQL for the dashboard
┌───────────────────────────▼──────────────────────────────────┐
│  PostgreSQL                                                  │
│    users · groups · group_members                            │
│    assignments · assignment_groups · submissions             │
└──────────────────────────────────────────────────────────────┘
```

### What happens when a student confirms a submission

1. The student clicks "Confirm submission". A popup asks if they uploaded to OneDrive.
2. They click "Yes, I have submitted". A second popup asks them to confirm.
3. The browser calls `POST /api/assignments/:id/confirm`.
4. The backend checks the token and looks up which group that student is in.
5. It checks the user is a student, not a professor.
6. It uses **the group from the database**, not any group sent by the browser.
7. It checks the assignment was actually given to that group.
8. It saves one row in the `submissions` table.
9. The database blocks a second row for the same group and assignment.

**One rule I followed:** route files never touch the database, and service files never
touch the request or response. This keeps the logic easy to read and easy to test.

---

## Database

```mermaid
erDiagram
    USERS ||--o| GROUP_MEMBERS : "is in one"
    GROUPS ||--o{ GROUP_MEMBERS : has
    USERS ||--o{ GROUPS : creates
    USERS ||--o{ ASSIGNMENTS : creates
    GROUPS ||--o{ SUBMISSIONS : confirms
    ASSIGNMENTS ||--o{ SUBMISSIONS : gets
    USERS ||--o{ SUBMISSIONS : "confirmed by"
    ASSIGNMENTS ||--o{ ASSIGNMENT_GROUPS : "sent to"
    GROUPS ||--o{ ASSIGNMENT_GROUPS : receives

    USERS {
        uuid id PK
        string email UK
        string name
        string passwordHash
        enum role "STUDENT or ADMIN"
        datetime createdAt
    }
    GROUPS {
        uuid id PK
        string name UK
        uuid createdBy FK
        datetime createdAt
    }
    GROUP_MEMBERS {
        uuid id PK
        uuid groupId FK
        uuid userId FK_UK "UNIQUE - one group per student"
        datetime joinedAt
    }
    ASSIGNMENTS {
        uuid id PK
        string title
        string description
        datetime dueDate
        string oneDriveLink
        enum audience "ALL or SPECIFIC"
        uuid createdBy FK
        datetime createdAt
        datetime updatedAt
    }
    ASSIGNMENT_GROUPS {
        uuid assignmentId PK_FK
        uuid groupId PK_FK
    }
    SUBMISSIONS {
        uuid id PK
        uuid groupId FK
        uuid assignmentId FK
        uuid confirmedBy FK
        datetime confirmedAt
    }
```

### Rules the database enforces

| Rule | What it stops |
|---|---|
| `group_members.userId` is UNIQUE | A student cannot be in two groups. |
| `submissions (groupId, assignmentId)` is UNIQUE | A group cannot submit the same assignment twice. |
| `assignment_groups` uses both columns as the key | An assignment cannot be sent to the same group twice. |
| `ON DELETE CASCADE` | Deleting a group does not leave rows pointing at nothing. |

I put these rules in the database, not only in the code. Code checks can be skipped if
two requests arrive at the same moment. Database rules cannot.

---

## API list

Every URL starts with `/api`. All of them need a login token except register and login.
Send the token as `Authorization: Bearer <token>`.

### Login

| Method | URL | Who | What it does |
|---|---|---|---|
| `POST` | `/auth/register` | anyone | Sign up. Always makes a student. |
| `POST` | `/auth/login` | anyone | Returns a token and the user. |
| `GET` | `/auth/me` | any user | Returns the logged-in user and their group. |

### Groups

| Method | URL | Who | What it does |
|---|---|---|---|
| `GET` | `/groups` | professor | All groups with their members. |
| `GET` | `/groups/me` | any user | **Your own group.** There is no id in the URL. |
| `POST` | `/groups` | student | Make a group. You become the first member. |
| `POST` | `/groups/members` | student | Add a student to **your** group, by email. |
| `DELETE` | `/groups/members/me` | student | Leave your group. |

### Assignments

| Method | URL | Who | What it does |
|---|---|---|---|
| `GET` | `/assignments` | any user | Professors see counts. Students see their own status. |
| `POST` | `/assignments` | professor | Make an assignment. |
| `PATCH` | `/assignments/:id` | professor | Edit an assignment. |
| `GET` | `/assignments/:id/detail` | professor | Which groups confirmed and which did not. |
| `POST` | `/assignments/:id/confirm` | student | Confirm your group's submission. |

### Dashboard

| Method | URL | Who | What it does |
|---|---|---|---|
| `GET` | `/analytics/overview` | professor | Totals and progress numbers. |
| `GET` | `/analytics/groups` | professor | Progress for each group. |

### Example

```bash
# Log in
curl -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ayush@joineazy.edu","password":"Password123!"}'

# Confirm a submission. Notice there is no group id to send.
curl -X POST http://localhost:4000/api/assignments/<id>/confirm \
  -H "Authorization: Bearer <token>"
```

### What an error looks like

```json
{ "error": "Sneha Nair is already a member of \"Team Alpha\"", "code": "ALREADY_IN_GROUP" }
```

`400` bad input · `401` not logged in · `403` wrong role ·
`404` not found or not yours · `409` conflict.

---

## Why I built it this way

### 1. A submission belongs to the group, not to each student

I save **one row per group per assignment**, and I also save who clicked confirm.

The other option was to make every member confirm on their own. I did not do that
because the file was uploaded **once**, by one person. If Priya clicks "I have
submitted" about a file that Ayush uploaded, the record is less true, not more true.
It also creates a problem with no good answer: what if one member never clicks?

The task also asks for student-wise tracking. I get that without extra tables. A
student's status is simply their group's status, and the `confirmedBy` column still
shows who did the work of confirming.

### 2. A student can only be in one group

The `userId` column in `group_members` is UNIQUE.

If a student could be in two groups, this question has no answer: "Ayush is in Team
Rocket and Team Alpha. Rocket confirmed, Alpha did not. Did Ayush submit?" Every way
around it adds more tables and more rules.

This rule also gives a nice side effect. Because a student who already has a group
cannot be added to another one, adding a member can never pull someone out of their
team. So adding members is safe even without an invite system.

The cost is that this app works for one course at a time. I decided that was fine.

### 3. "Send to all groups" is checked at the time of asking

When a professor picks "all groups", I do **not** save a list of groups at that moment.
I look up the groups fresh every time.

If I saved the list instead, a group made after the assignment was posted would never
see it. Worse, that group would also be missing from the count. The dashboard would say
"4 of 6 groups" when there are really 7 groups. A wrong number that looks correct is
worse than an obvious gap.

### 4. The dashboard counts two different ways

It shows **group completion** and **student coverage** next to each other, and it shows
how many students are in no group.

Here is the problem with counting only groups. If every group has submitted, the
dashboard says 100%. But students who are in no group are not counted at all. The
professor sees 100% and thinks the whole class is done.

The demo data shows this on purpose. 3 out of 3 groups confirmed is 100%. But student
coverage is 80%, because 2 students are in no group. Both numbers are correct. Only
showing both is honest.

### 5. Prisma for normal queries, plain SQL for the dashboard

Prisma made the table rules easy to write and gave me migrations with one command.

But the dashboard queries add things up across many rows with a condition that changes
the total. Doing that through Prisma means several trips to the database and joining the
results in memory. So I wrote those two queries as plain SQL. I used each tool where it
was actually better.

### 6. The browser only ever talks to one address

In local development Vite forwards `/api` to the backend. In Docker, nginx does the
same thing. So the browser never makes a cross-site request.

This means CORS errors and cookie problems simply cannot happen. Those bugs waste a lot
of time in projects where the frontend and backend live on different addresses.

---

## Security

**I treated permissions as the bigger risk than passwords.**

The realistic attack here is not someone stealing a token. It is a normal logged-in
student trying to act on another group:

```bash
# Ayush is in Team Rocket. He sends Team Alpha's id instead.
POST /api/assignments/<id>/confirm
Authorization: Bearer <Ayush's real token>
{ "groupId": "<Team Alpha's id>" }
```

**The backend ignores that group id completely.** For every action that changes data, the
backend looks up the user's own group from the database. The URLs give you no way to name
someone else's group:

- `GET /groups/me` has no id. You can only read your own group.
- `POST /groups/members` adds to *your* group.
- `DELETE /groups/members/me` removes *you*.
- `POST /assignments/:id/confirm` confirms for *your* group.

Other things I did:

- Passwords are hashed with **bcrypt**. The hash never leaves the server.
- Every professor URL checks the role first.
- **You cannot make yourself an admin.** `POST /auth/register` always creates a student.
  Sending `{"role":"ADMIN"}` does nothing. Professor accounts come from the seed file.
- Wrong password and unknown email give the **same** message, so nobody can find out
  which emails exist.
- Every request body is checked with Zod before anything else happens.
- A student cannot confirm an assignment that was not given to their group. That returns
  404, not 403, so they cannot even learn it exists.
- Double submission is blocked by the **database**, not just by an if-statement.

### Things I tested

| What I tried | What happened |
|---|---|
| No token on a protected URL | `401` |
| Student opens the professor dashboard API | `403` |
| Student tries to create an assignment | `403` |
| **Student sends another group's id when confirming** | **Saved to his own group. Other group untouched.** |
| Confirming the same assignment twice | `409` |
| Student with no group tries to confirm | `400` |
| Student with no group lists assignments | Sees only "all groups" ones. Cannot submit. |
| Adding a student who is already in a group | `409` |
| Signing up with `role: ADMIN` | Created as a student |

---

## What is missing

These are choices I made on purpose because of the time limit. They are not things I
missed.

1. **Group history is not saved.** If a member leaves after the group confirmed, old
   views change. *Fix:* save the member list on the submission row at confirm time.
2. **Only one course.** One group per student means this works for a single class.
   *Fix:* tie group membership to a course instead of to the whole system.
3. **No invite step.** You can add a student without asking them first. It is safe,
   because a student with a group cannot be added and anyone can leave at any time. But
   there is no "accept" button. *Fix:* an invitations table with accept and decline.
4. **The token is stored in `localStorage`.** This can be read by an XSS attack. *Fix:* a
   short token plus a refresh token in an httpOnly cookie. I chose to spend the time on
   permissions instead, because that was the bigger risk here.
5. **No automated tests.** I tested the security list above by sending real requests to a
   running server, not with a test file. *Fix:* move those same checks into Supertest.
6. **You cannot undo a confirmation.** Fixing a mistake needs someone to edit the
   database.
