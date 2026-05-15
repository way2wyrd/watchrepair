# Fricking Watch Repair

A self-hosted web application for managing a watch repair workshop: track repairs, organize service manuals, catalog movements, manage parts inventory, and browse a photo gallery of past work.

## Features

- **Dashboard** – at-a-glance overview of active and recent repairs.
- **Repairs** – create, edit, and track repair jobs with status, customer details, photos, and notes.
- **Gallery** – browsable photo gallery of repair work, categorized by movement and type.
- **Service Manuals** – upload and organize service manuals into a hierarchical category/subcategory tree.
- **Movements** – catalog of watch movements with detail pages and reference photos.
- **Parts Inventory** – track parts on hand, organized by type, with form-based add/edit.
- **Search** – full-text search across repairs, movements, manuals, and parts.
- **Authentication** – username/password login with JWT sessions and optional TOTP (2FA) using authenticator apps.
- **User Management** – admin-only panel to create users, resend invite links, and delete accounts. New users receive an email invite to set their own password.
- **Profile & Password** – any logged-in user can view their account details and change their password from the profile page.
- **First-Run Setup** – on a fresh install the app presents a setup screen to create the initial administrator account (username + password of your choice) before the login screen appears.
- **SMTP Settings** – admin-configurable outgoing email (host, port, TLS, credentials) with a test-send button; falls back to environment variables when not configured via the UI.

## Tech Stack

- **Frontend:** React 19, React Router 7, Tailwind CSS 4, Vite 8, Lucide icons
- **Backend:** Node.js, Express 5
- **Database:** SQLite (via `sql.js`, stored as a file in the data directory)
- **Auth:** `bcryptjs`, `jsonwebtoken`, `otplib` + `qrcode` for TOTP enrollment
- **File handling:** `multer` for uploads, `sharp` for image processing

## Getting Started

> **New to this?** See [SETUP.md](SETUP.md) for a beginner-friendly Windows setup guide with a one-click launcher script.

### Prerequisites

- Node.js 20 or later
- npm

### Install

```bash
npm install
```

### Development

Run the API server and the Vite dev server in parallel:

```bash
# Terminal 1 – API on http://localhost:3001
npm run server

# Terminal 2 – Vite dev server on http://localhost:5173
npm run dev
```

Vite is configured to proxy `/api`, `/uploads`, `/manual-files`, and `/movement-photos` to the backend, so the frontend can be developed against the live API.

### Production build

```bash
npm run build      # outputs static assets to ./dist
npm run server     # serves the API (and can serve ./dist behind a reverse proxy)
```

## Docker

A multi-stage `Dockerfile` and a `docker-compose.yml` are included.

```bash
docker compose up -d --build
```

The app will be available at `http://localhost:8080`. Persistent data (SQLite database, uploads, manuals, movement photos) is stored under `./data`.

See [deploy-synology.md](deploy-synology.md) for notes on deploying to a Synology NAS.

## Configuration

The server reads the following environment variables:

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3001` | HTTP port for the API server |
| `DATA_DIR` | `./public` | Where the SQLite database (`WatchRepair.db3`) and JWT secret are stored |
| `UPLOADS_DIR` | `./uploads` | Repair photo uploads |
| `MANUALS_DIR` | `./manuals` | Service manual files |
| `MOVEMENT_PHOTOS_DIR` | `$DATA_DIR/movement-photos` | Movement reference photos |
| `JWT_SECRET` | auto-generated | JWT signing secret; if unset, a random secret is generated and persisted under `DATA_DIR/.jwt_secret` |
| `SMTP_HOST` | — | Outgoing mail server hostname (overridden by admin UI settings when configured) |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_SECURE` | `false` | Set to `true` to use TLS |
| `SMTP_USER` | — | SMTP auth username |
| `SMTP_PASS` | — | SMTP auth password |
| `SMTP_FROM` | — | Sender address for invite emails |
| `PUBLIC_URL` | auto-detected | Base URL used in invite links (e.g. `https://repairs.example.com`) |

### First run

On a fresh install (no database yet), the app shows a **First-Time Setup** screen where you create the initial administrator account. Fill in a username and password, click **Create Admin Account**, and you'll land on the login screen.

## Project Structure

```
.
├── server.js              # Express API + SQLite (sql.js)
├── src/
│   ├── App.jsx            # Layout, navigation, routing
│   ├── api.js             # API client
│   ├── context/           # Auth context
│   ├── components/        # Shared UI components
│   ├── pages/             # Dashboard, Repairs, Gallery, Manuals, Movements, Parts, Search, Login, Profile, Users, AdminSmtp, FirstRunSetup
│   └── data/              # Lookup tables
├── public/                # Static assets + SQLite database in production
├── uploads/               # Repair photo uploads
├── manuals/               # Uploaded service manuals
├── movement-photos/       # Movement reference photos
├── Dockerfile
├── docker-compose.yml
└── vite.config.js
```

## License

ISC
