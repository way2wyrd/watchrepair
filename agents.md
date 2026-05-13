# Agents.md — Fricking Watch Repair

Context file for AI agents. Read this before making changes so you understand the architecture, conventions, and key decisions already made.

---

## What this app is

A self-hosted single-user (or small team) watch repair workshop manager. One Express backend, one React SPA frontend. No external services required — everything lives in a single SQLite file.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router 7, Tailwind CSS 4, Vite, Lucide icons |
| Backend | Node.js, Express 5 (single file: `server.js`) |
| Database | SQLite via `sql.js` (in-memory, persisted to disk on every write) |
| Auth | bcryptjs (12 rounds), JWT (60-day sessions), otplib TOTP (MFA) |
| Email | nodemailer (optional — logs to console if unconfigured) |
| Images | multer (upload), sharp (resize/compress) |

---

## Architecture decisions

### sql.js (not better-sqlite3)
The app uses `sql.js` which loads the whole SQLite database into memory and writes it out to disk after every mutation (`saveDB()`). This was chosen for portability (no native bindings). **Every write must call `saveDB()` or changes are lost on restart.** There is no ORM — all queries are raw SQL strings.

### Single-file backend
All 1500+ lines of server code live in `server.js`. Route handlers, middleware, DB init, email, and file serving are all in one file. When adding routes, follow the existing grouping pattern with `// ─── Section Name ───` comment headers.

### Auth flow
1. `POST /api/auth/login` → returns either a `session` JWT (if MFA was done within 60 days) or a short-lived `temp_auth` JWT (5 min).
2. `temp_auth` token is used by the MFA setup/verify routes.
3. After MFA, a `session` JWT (60-day expiry) is issued and stored in `localStorage` as `watchapp_token`.
4. All protected routes use `requireAuth` middleware which verifies the JWT's `purpose === 'session'`.
5. Admin-only routes additionally call `requireAdmin` which re-queries the DB (so revocation is instant).

The middleware line `app.use('/api', requireAuth)` sits at line ~692 in server.js. **All public endpoints must be declared before this line.**

### First-run setup
When no users exist in the DB, the frontend shows `FirstRunSetup.jsx` instead of the login page. The backend has two public endpoints for this:
- `GET /api/setup/needed` — returns `{ needed: true/false }`
- `POST /api/setup` — creates the first admin; returns 403 if a user already exists

There is no hardcoded default password. The admin chooses credentials during first-run setup.

### SMTP / email
`nodemailer` is optional (caught require). Config comes from either:
1. Admin UI (`/admin/smtp` page → stored in `smtp_settings` DB table, single row, `id = 1`)
2. Environment variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`)

DB config takes precedence when `enabled = 1`. If neither is set, invite links are only logged to the server console.

---

## Database schema (key tables)

```sql
users (id, username, password_hash, email, is_admin, last_mfa_at, created_at)
mfa_secrets (id, user_id, secret, verified, created_at)
password_setup_token (id, user_id, token_hash, expires_at, used_at, created_at)
smtp_settings (id=1, host, port, secure, username, password, from_email, from_name, enabled, updated_at)

watches (id, customer_name, brand, model, serial, movement_id, status, received_at, ...)
watch_photos (id, watch_id, filename, category, created_at)
timing_sessions (id, watch_id, position, ...)
timing_readings (id, session_id, rate, beat_error, amplitude, ...)
parts (id, watch_id, name, part_number, ...)

inventory_part (id, name, type, part_number, ligne, notes, quantity, ...)

movements (id, name, type_id, manufacturer, ...)
movement_types (id, name)
movement_photos (id, movement_id, filename, ...)

manual_categories (id, name)
service_manuals (id, title, filename, category, subcategory, ...)

positions (id, name)
ebauche_codes (id, name)
```

Schema migrations use the pattern `try { db.run('ALTER TABLE ... ADD COLUMN ...') } catch(e) {}` placed **before** the corresponding `CREATE TABLE IF NOT EXISTS`. New columns must also be added to the `CREATE TABLE` definition so fresh installs get them.

---

## Frontend structure

```
src/
  App.jsx              # Auth guard, first-run check, AppLayout (sidebar + routes)
  api.js               # Centralized fetch wrapper; all API calls go here
  context/
    AuthContext.jsx    # JWT storage, /api/auth/me refresh, login/logout
  components/
    PageHeader.jsx     # Title + subtitle + optional action button
    PhotoCategories.jsx
    StatusBadge.jsx
  pages/
    LoginPage.jsx      # Multi-step: credentials → MFA setup or verify
    FirstRunSetup.jsx  # First-run: choose admin username + password
    SetPasswordPage.jsx # Invite token flow (public, no auth)
    Profile.jsx        # Account details + change password
    Dashboard.jsx
    RepairList.jsx / RepairForm.jsx / RepairDetail.jsx
    Gallery.jsx
    ServiceManuals.jsx
    Movements.jsx / MovementDetail.jsx
    Parts.jsx / PartForm.jsx
    SearchPage.jsx
    Users.jsx          # Admin: create/resend/delete users
    AdminSmtp.jsx      # Admin: SMTP config + test send
```

### API client pattern
`src/api.js` exports one `api` object of named methods that all go through a shared `request()` helper. File uploads bypass it and use raw `fetch` with `getAuthHeader()`. Public endpoints (setup, password-setup, invite) are exported as standalone async functions at the bottom of the file.

### Route protection
There is no React-level route guard component. Protection is implicit: the `App` component renders `FirstRunSetup`, `LoginPage`, or `AppLayout` based on `setupNeeded` and `user` state. All pages inside `AppLayout` are implicitly protected.

### Sidebar nav
Main nav links are in the `navLinks` array. Admin-only links are in `adminNavLinks` (rendered only when `user?.is_admin`). The sidebar bottom section shows the username as a `NavLink` to `/profile` and a Sign Out button.

---

## Key conventions

- **Every DB write calls `saveDB()`** immediately after — never batch writes without it.
- **Public API routes go before** `app.use('/api', requireAuth)` (~line 692).
- **Admin routes** call `requireAdmin` as a second middleware argument after `requireAuth` is handled by the global middleware.
- **Passwords** hashed with bcrypt at 12 rounds. Minimum 8 characters enforced on both backend and frontend.
- **JWT tokens** have a `purpose` field: `'session'` (60-day), `'temp_auth'` (5-min MFA bridge). Always check `purpose` when verifying tokens.
- **Error responses** are `{ error: 'message' }` JSON. HTTP status follows REST conventions (400 bad input, 401 auth, 403 admin-only, 404 not found, 410 expired/used).
- **No TypeScript.** Plain JSX + JS throughout.
- **No component library.** All UI is custom Tailwind. Color palette: `stone-*` (backgrounds/text), `gold-500` (accent/brand).
- **Tailwind gold color** is a custom color defined in the project config — use `gold-400/500` for brand accents, never yellow.

---

## Environment variables

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `3001` | API server port |
| `DATA_DIR` | `./public` | SQLite DB + JWT secret location |
| `UPLOADS_DIR` | `./uploads` | Repair photos |
| `MANUALS_DIR` | `./manuals` | Service manual PDFs |
| `MOVEMENT_PHOTOS_DIR` | `$DATA_DIR/movement-photos` | Movement reference photos |
| `JWT_SECRET` | auto-generated | Persisted to `DATA_DIR/.jwt_secret` |
| `PUBLIC_URL` | auto-detected from request | Used in invite email links |
| `SMTP_HOST/PORT/SECURE/USER/PASS/FROM` | — | Email fallback when admin UI SMTP not configured |

---

## Running locally

```bash
# Terminal 1
node server.js          # API on :3001

# Terminal 2
npm run dev             # Vite SPA on :5173, proxies /api to :3001
```

Fresh database → first-run setup screen → create admin → MFA enrollment on first login.

---

## Docker

```bash
docker compose up -d --build   # App on :8080
```

Persistent volumes: `./data` (DB, JWT secret, movement photos), `./uploads`, `./manuals`.
