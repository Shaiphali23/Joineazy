# Domain Context

Ubiquitous language for the Student, Group & Assignment Management System.
This file is a glossary only — no implementation detail.

## Actors

**Student**
A person who forms groups and confirms submissions. Cannot create assignments.

**Professor** (called *Admin* in the system's role enum)
A person who authors assignments and monitors progress. The brief uses
"Professor" and "Admin" interchangeably; the canonical role value is `ADMIN`,
and all user-facing copy says "Professor".

## Core concepts

**Group**
A *standing* team of students, existing independently of any assignment. A group
is not created for a particular assignment and survives across all of them.

**Membership**
The link between a Student and a Group. Membership is **exclusive**: a student
belongs to at most one group at any moment. Joining a second group is not
possible; a student must leave their current group first. This scopes the
system to a single cohort/course.

Membership is **not versioned**. If a student leaves a group after that group
confirmed a submission, historical views change retroactively. See
*Known limitations*.

**Add** (a member)
The act of placing another student into your group, addressed by email. It is
unilateral — no acceptance step — but it is **non-destructive**, because a
student who already has a group cannot be added. There is no *Invitation*
concept in this system; the brief's "invite/add" resolves to Add.

**Leave**
The act of removing yourself from your group. Always available, so membership
is never a trap.

**Assignment**
A unit of work authored by a Professor: title, description, due date, and an
OneDrive link where work is uploaded. Assignments are never uploaded to this
system — the artifact lives externally.

**Audience**
Who an assignment targets. Either `ALL` or `SPECIFIC`.
`ALL` is evaluated **dynamically**: it means every group that exists *at the time
of asking*, so a group formed after the assignment was posted is still included.
`SPECIFIC` is a fixed, explicit list of target groups.

**Submission**
A **group act**, not a student act. Exactly one submission exists per
(Group, Assignment). It records that the group's work was uploaded to OneDrive.
It does not contain the work.

**Confirmation**
The two-step act by which a member declares their group's work uploaded:
"Yes, I have submitted" followed by an explicit confirm. One confirmation
creates the group's Submission on behalf of every member.

**Confirmer**
The single member who performed the Confirmation. Recorded for accountability,
because Submission is a group act but is always performed by one person.

## Derived views

**Group progress**
Confirmed submissions ÷ assignments targeted at that group.

**Student-wise status**
A student's status on an assignment *is* their group's status. It is derived,
never stored per-student.

**Student coverage**
Students whose group has confirmed ÷ all students. Deliberately distinct from
group completion, because students in no group are invisible to a group-only
count.

**Ungrouped student**
A student with no membership. Can see assignments but is structurally unable to
confirm a submission. Counted in the denominator of *Student coverage*, and
surfaced explicitly on the Professor dashboard.

## Known limitations

- Membership is not versioned; historical submission views shift if members move.
  The fix is a membership snapshot taken at Confirmation time.
- Exclusive membership implies a single course context. Multi-course would
  require membership to be scoped to a course rather than global.
- Confirmation requires no agreement from other members; the Confirmer acts
  alone. Per-member attestation would be the addition if consensus were needed.
