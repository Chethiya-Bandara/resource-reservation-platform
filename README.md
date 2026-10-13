# Reservely

Reservely is a resource reservation prototype for shared meeting rooms, workspaces, and equipment. It provides a Next.js user interface, PostgreSQL persistence through Prisma, basic role-based access control, and reservation conflict prevention.

The prototype currently supports two roles:

- **Admin**: view and manage all reservations, add resources, and set meeting-room status to Available or Maintenance.
- **User**: view the shared daily booking schedule, create reservations, and edit or cancel only their own reservations.

## Features

- Browse shared resources with type, location, capacity, and availability.
- Create reservations for an available resource and time range.
- Prevent overlapping confirmed reservations for the same resource at the database level.
- View all confirmed reservations that overlap the current day.
- Edit or cancel reservations with server-side ownership checks.
- Add resources as an administrator.
- Put meeting rooms under maintenance as an administrator. Resources under maintenance cannot be reserved.
- Use an HTTP-only session cookie for the prototype login flow.

## Technology

- Next.js 16
- React 19
- TypeScript
- PostgreSQL 17
- Prisma 7 with the PostgreSQL driver adapter
- Docker Compose for local PostgreSQL

## Prerequisites

Install the following before starting:

- Node.js 20 or later
- npm
- Docker Desktop, with Docker Compose available

## Local setup

1. Install project dependencies.

   ```bash
   npm install
   ```

2. Create your local environment file from the committed template.

   macOS or Linux:

   ```bash
   cp .env.example .env
   ```

   PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Start PostgreSQL.

   ```bash
   docker compose up -d
   ```

4. Generate the Prisma client. The generated client is intentionally not committed.

   ```bash
   npx prisma generate
   ```

5. Apply the committed database migrations.

   ```bash
   npx prisma migrate deploy
   ```

6. Start the development server.

   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000).

If port 3000 is already being used, Next.js selects another available port and prints it in the terminal.

## Environment variables

The application requires `DATABASE_URL`.

```env
DATABASE_URL="postgresql://reservation:reservation_dev@localhost:5434/reservation_db?schema=public"
```

The supplied value works with the local `docker-compose.yml` configuration. Do not commit `.env`; commit only `.env.example` with non-sensitive placeholder or development values.

## Demo accounts

The login screen seeds and uses these prototype accounts automatically:

| Role shown in UI | Name | Email | Database role |
| --- | --- | --- | --- |
| Admin | Chethiya Bandara | `chethiya@reservely.local` | `ADMIN` |
| User | Maya Chen | `maya@reservely.local` | `MEMBER` |

The prototype login is a role selector, not password-based authentication. See [Prototype limitations](#prototype-limitations) before deploying the application outside a local development environment.

## Database model

The database has three core tables:

```text
User 1 ---< Reservation >--- 1 Resource
```

### `User`

Stores a user name, unique email address, role, and timestamps.

### `Resource`

Stores a resource name, type, location, capacity, availability status, and timestamps. The two stored statuses are `AVAILABLE` and `MAINTENANCE`; an “In use” label is derived from an active reservation rather than written to the database.

### `Reservation`

Connects a user to a resource and stores a title, start/end timestamps, status, and timestamps. Confirmed reservations for the same resource cannot overlap. Cancelling a reservation frees that time range.

The schema is defined in [prisma/schema.prisma](prisma/schema.prisma), and the initial PostgreSQL migration is in [prisma/migrations/20261013000000_init/migration.sql](prisma/migrations/20261013000000_init/migration.sql).

## Authorization behavior

Authorization is enforced by the API routes as well as the interface.

| Action | Admin | User |
| --- | --- | --- |
| View the daily confirmed-bookings schedule | Yes | Yes |
| View/manage all reservations | Yes | No |
| Create a reservation | Yes | Yes |
| Edit/cancel own reservation | Yes | Yes |
| Edit/cancel another user’s reservation | Yes | No |
| Add a resource | Yes | No |
| Set a meeting room to Available or Maintenance | Yes | No |

## API routes

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/auth/me` | Retrieve the current session user. |
| `POST` | `/api/auth/login` | Start a demo Admin or User session. |
| `POST` | `/api/auth/logout` | Clear the current session. |
| `GET` | `/api/dashboard` | Load resources, role-scoped reservations, and all confirmed bookings for today. |
| `POST` | `/api/reservations` | Create a reservation for the signed-in user. |
| `PATCH` | `/api/reservations/:id` | Update or cancel a reservation, subject to ownership/role checks. |
| `POST` | `/api/resources` | Add a resource as an administrator. |
| `PATCH` | `/api/resources/:id` | Change a meeting room’s status as an administrator. |

## Common commands

```bash
# Start the local database
docker compose up -d

# Stop the local database
docker compose down

# Generate Prisma client code after schema changes
npx prisma generate

# Apply existing migrations
npx prisma migrate deploy

# Create a new development migration after editing prisma/schema.prisma
npx prisma migrate dev --name describe_change

# Validate the Prisma schema
npx prisma validate

# Run linting
npm run lint

# Build for production
npm run build
```

## Project structure

```text
app/
  api/                    Route handlers for authentication, dashboard, resources, and reservations
  page.tsx                Client-side reservation interface
lib/
  auth.ts                 Session lookup and role helpers
  demo-data.ts            Idempotent demo users and initial resources
  prisma.ts               Prisma client and PostgreSQL adapter setup
prisma/
  migrations/             Versioned PostgreSQL migrations
  schema.prisma           Prisma data model
docker-compose.yml        Local PostgreSQL service
.env.example              Push-safe environment variable template
```

## Prototype limitations

- Login is intentionally simplified to two seeded accounts and does not use passwords, account registration, password hashing, or a third-party identity provider.
- The session cookie stores a user ID only. Use a signed session implementation or an established authentication library before production use.
- The daily schedule uses UTC day boundaries. Introduce a workspace timezone before supporting users across multiple timezones.
- There is no resource deletion, user administration screen, recurring reservations, notification system, or audit log yet.
- Demo data is created lazily when authentication or dashboard APIs are used. It does not overwrite resources that already exist.

## Contributing

Keep database changes in both `prisma/schema.prisma` and a new migration under `prisma/migrations/`. Before opening a pull request, run:

```bash
npx prisma validate
npm run lint
npm run build
```
