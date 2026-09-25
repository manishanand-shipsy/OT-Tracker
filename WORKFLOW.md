# OT Tracker — Workflow & Requirements

This document describes what the Overtime Tracker does, who uses it, and how
an overtime entry moves from submission to a final decision. For local dev
setup see `README.md`; for production deployment see `DEPLOY.md`.

## 1. Roles

| Role       | Description                                                                 |
| ---------- | ---------------------------------------------------------------------------- |
| `EMPLOYEE` | Logs their own overtime entries. Default role for anyone who signs up.       |
| `ADMIN`    | Everything an employee can do, plus assigns approvers from `/admin/employees`. The very first person to ever sign in is auto-promoted to `ADMIN`. |
| Approver   | Not a separate role — any user can be designated as `approver1` or `approver2` for one or more employees. Approvers see an "Approvals Queue" for entries awaiting their decision. |

Sign-in is via Google OAuth restricted to `@shipsy.io` accounts (auto-provisioned
as `EMPLOYEE` on first login), plus a dev-only credentials login for local
testing (disabled in production).

## 2. Functional Requirements

- An employee can log an overtime entry with: date, start/end time, project,
  work mode (`WFH`/`OFFICE`), and a reason.
  - The date must fall within **today ± 3 days**.
  - Hours are derived from start/end time server-side (never user-entered);
    if end time ≤ start time, the shift is treated as crossing midnight.
  - An employee **cannot** submit an entry until an admin has assigned them
    both `approver1` and `approver2`.
- Every entry requires **two approvals in parallel** (not sequential) —
  both approver1 and approver2 must approve for the entry to be `APPROVED`.
  If either rejects, the entry is `REJECTED` immediately, regardless of the
  other approver's decision.
- Approvers act from the Approvals Queue or the entry detail page, optionally
  attaching a comment, via Approve/Reject.
- An employee can edit their own entry while it's still `PENDING`. Editing
  **resets both approvals back to `PENDING`** — the entry must be re-reviewed
  from scratch, even if one approver had already acted.
- Admins/approvers can export overtime entries to Excel (`/export`), filtered
  by employee, project, status, and date range.
- Approvers get notified when an entry needs their decision (new entry, or an
  edit that re-opens approvals) — see §4.

## 3. Workflow

```
Employee signs in
      |
      v
Logs an overtime entry (date/time/project/reason/work mode)
      |
      v
Entry created as PENDING; two Approval rows created (approver1, approver2), both PENDING
      |
      v
Both approvers notified in parallel (Slack DM — see §4)
      |
      +----------------------+----------------------+
      v                                              v
 Approver1 decides                             Approver2 decides
 (APPROVED / REJECTED)                         (APPROVED / REJECTED)
      |                                              |
      +----------------------+----------------------+
                             v
              Entry status recomputed:
              - either REJECTED  -> entry REJECTED
              - both APPROVED    -> entry APPROVED
              - otherwise        -> entry stays PENDING

  (If the employee edits a PENDING entry, both approvals reset to PENDING
   and approvers are re-notified — the cycle above runs again.)
```

## 4. Notifications

When an entry is created, or a `PENDING` entry is edited, both approvers are
notified on **Slack** via DM:

- The bot looks up each approver's Slack user by their account email
  (`users.lookupByEmail`), opens a DM (`conversations.open`), and posts a
  message (`chat.postMessage`) with the entry's details and a
  **"Review & approve"** button linking straight to `/entry/{id}` in the app.
- Configured via the `SLACK_BOT_TOKEN` env var (Slack app with
  `users:read.email`, `im:write`, `chat:write` bot scopes). If unset, Slack
  notifications are skipped with a console warning — this is optional, not a
  hard requirement to run the app.
- Each approver's notification is sent independently; one failure (bad
  email, Slack API error) is logged and doesn't block entry creation or the
  other approver's notification.
- Email notification to approvers was considered but intentionally left out
  for now — no mail server/account is configured for this yet.

Implementation: `src/lib/notifications/slack.ts` (Slack API calls) and
`src/lib/notifications/index.ts` (fan-out to all approvers on an entry),
called from `POST /api/overtime` and `PATCH /api/overtime/[id]`.

## 5. Data Model

- **User** — `role` (`EMPLOYEE`/`ADMIN`), plus fixed `approver1`/`approver2`
  references (also `User` rows).
- **Project** — name, active flag; created on the fly when an employee types
  a new project name.
- **OvertimeEntry** — one submission; belongs to an employee and a project;
  has a computed `status` (`PENDING`/`APPROVED`/`REJECTED`).
- **Approval** — one per (entry, approver) pair; holds that approver's
  individual `decision`, optional `comment`, and `decidedAt`.

Full schema: `prisma/schema.prisma`.

## 6. Non-Functional / Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack), React 19.
- **Auth:** NextAuth v5 (Google OAuth + JWT sessions).
- **Database:** PostgreSQL via Prisma 7 (`@prisma/adapter-pg`).
- **Export:** ExcelJS for `.xlsx` generation.
- **Notifications:** Slack Web API (plain `fetch`, no SDK dependency).
- **Deployment:** Docker Compose (app + Postgres), no external services
  required beyond Google OAuth and (optionally) a Slack app — see `DEPLOY.md`.
