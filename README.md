# Reservely

Reservely is a focused resource-reservation prototype for shared meeting rooms, creative spaces, and equipment. Built with Next.js, Prisma, and PostgreSQL, it provides authenticated bookings plus administrator management of resources and maintenance.

## Features

- Email/password login and registration using bcrypt password hashes.
- `MEMBER` (User) and `ADMIN` roles.
- Resources with enum type, location, capacity, immediate availability, and maintenance status.
- Reservations interpreted in the `Asia/Colombo` workspace timezone.
- Past-date validation and database-level prevention of overlapping confirmed reservations.
- Users can manage only their own reservations; admins can manage all reservations.
- Admin resource creation and Available/Maintenance status controls for all resource types.
- Scheduled maintenance windows with reservation-conflict validation.
- Admin Maintenance Schedules view with update and delete actions.
- Privacy-aware daily schedule: members see others as `Reserved`; admins see names and titles.

## Requirements

- Node.js 20+
- npm
- Docker Desktop with Docker Compose

## Local setup

```bash
npm install
```

```powershell
Copy-Item .env.example .env
```

```bash
docker compose up -d
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), or the alternate address printed by Next.js.

## Environment

```env
DATABASE_URL="postgresql://reservation:reservation_dev@localhost:5434/reservation_db?schema=public"
```

Do not commit `.env`; use `.env.example` as the setup template.

## Authentication

The landing page lets visitors choose Login or Register. Registration requires a name, email, eight-character minimum password, and role. A successful login or registration creates an HTTP-only session cookie.

Seeded local accounts are initialized when authentication or dashboard data is used:

| Role  | Email                      | Password       |
| ----- | -------------------------- | -------------- |
| Admin | `chethiya@reservely.local` | `Reservely123` |
| User  | `maya@reservely.local`     | `Reservely123` |

Public admin registration is enabled only for this prototype. It should be made invite-only before production use.

## Permissions

| Capability                           | Admin | User              |
| ------------------------------------ | ----- | ----------------- |
| View daily availability              | Yes   | Yes               |
| View booking names/titles            | Yes   | Own bookings only |
| Create reservations                  | Yes   | Yes               |
| Manage own reservations              | Yes   | Yes               |
| Manage other users' reservations     | Yes   | No                |
| Add resources and set status         | Yes   | No                |
| Schedule, update, delete maintenance | Yes   | No                |

## Data model

```text
User 1 ---< Reservation >--- 1 Resource
Resource 1 ---< MaintenanceWindow
```

- `User`: name, unique email, password hash, role, timestamps.
- `Resource`: name, type, location, capacity, status, timestamps.
- `Reservation`: title, range, status, user, resource.
- `MaintenanceWindow`: future resource downtime range.

## API

| Method   | Route                   | Purpose                         |
| -------- | ----------------------- | ------------------------------- |
| `POST`   | `/api/auth/register`    | Register and create a session.  |
| `POST`   | `/api/auth/login`       | Sign in with email/password.    |
| `POST`   | `/api/auth/logout`      | End session.                    |
| `GET`    | `/api/auth/me`          | Read session user.              |
| `GET`    | `/api/dashboard`        | Dashboard and role-scoped data. |
| `POST`   | `/api/reservations`     | Create reservation.             |
| `PATCH`  | `/api/reservations/:id` | Update or cancel reservation.   |
| `POST`   | `/api/resources`        | Add resource.                   |
| `PATCH`  | `/api/resources/:id`    | Set resource status.            |
| `POST`   | `/api/maintenance`      | Schedule maintenance.           |
| `PATCH`  | `/api/maintenance/:id`  | Update maintenance.             |
| `DELETE` | `/api/maintenance/:id`  | Delete maintenance.             |

## Validation commands

```bash
npx prisma validate
npx tsc --noEmit
npm run lint
npm run format:check
```

## Automated tests

Start Docker Desktop and the local PostgreSQL container before running the test suite:

```bash
docker compose up -d
npm test
```

The suite covers reservation ownership, maintenance conflicts, simultaneous overlapping booking
protection, and rebooking after a cancellation. It creates and removes its own temporary database
records.

## Prototype boundaries

Before a public deployment, add signed sessions, invite-only admin creation, password reset, remove demo data, add rate limiting, and audit logs.
