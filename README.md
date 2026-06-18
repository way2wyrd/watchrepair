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

### Windows quick start (no command-line experience required)

1. Install [Node.js LTS](https://nodejs.org) — click Next through all the installer defaults
2. Download this repository as a ZIP (green **Code** button on GitHub → **Download ZIP**) and extract it
3. Double-click **`start.bat`** inside the extracted folder

`start.bat` installs dependencies, builds the frontend, opens your browser to `http://localhost:3001`, and starts the server — all automatically. On subsequent launches it skips the install/build steps and starts immediately.

See [SETUP.md](SETUP.md) for the full step-by-step guide including troubleshooting.

### Updating an existing install

From **1.1.0 onward**, double-click **`update.bat`** to back up your data, pull the latest version, and rebuild automatically. See [UPDATE.md](UPDATE.md) for the full step-by-step upgrade guide.

> **`update.bat` only auto-updates Git installs.** It looks for a `.git` folder and runs `git pull`. If you installed by downloading a ZIP (no `.git` folder), it will detect that and show the manual steps instead — so a ZIP install can never become one-click. If you want one-click updates, install with `git clone` (see [Install](#install) below).

Your data (the `WatchRepair.db3` database plus the `uploads`, `manuals`, and `movement-photos` folders) lives outside the program files and is never touched by an update. `update.bat` also makes a timestamped backup of the database under `backups/` before changing anything.

#### Manual upgrade

Use these steps when `update.bat` isn't available or can't run automatically.

##### Upgrading from 1.0.0

Version 1.0.0 shipped **before** `update.bat` existed, so the first upgrade must be done by hand.

- **If you installed with Git** (there is a `.git` folder in the app folder):
  1. Stop the app (close the `start.bat` terminal window).
  2. Open a Command Prompt in the app folder and run:
     ```bash
     git pull
     npm install
     npm run build
     ```
  3. Double-click `start.bat`. You now have `update.bat`, so future upgrades are one-click.

- **If you installed from a ZIP** (no `.git` folder):
  1. Stop the app.
  2. Download the latest ZIP (green **Code** button → **Download ZIP**) and extract it to a **new** folder.
  3. Copy your data folders — `public`, `uploads`, `manuals`, `movement-photos` — from the old folder into the new one, replacing the empty versions.
  4. Double-click `start.bat` in the new folder. (Because there's still no `.git` folder, future upgrades will use this same ZIP method.)

##### Upgrading from 1.1.0 (or later)

These versions include `update.bat`:

- **Git installs:** double-click `update.bat` — it backs up the database, runs `git pull`, reinstalls dependencies, and rebuilds.
- **ZIP installs:** `update.bat` will detect the missing `.git` folder and print the same download-and-copy steps shown above; follow those.

### Prerequisites (manual / developer setup)

- Node.js 20 or later
- npm
- [Git for Windows](https://git-scm.com/download/win) — required for `git clone` installs and for one-click `update.bat` upgrades (optional if you only ever use ZIP downloads)

### Install

Clone the repository (this gives you the `.git` folder that enables one-click `update.bat` upgrades), then install dependencies:

```bash
git clone https://github.com/way2wyrd/watchrepair.git
cd watchrepair
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
├── start.bat              # Windows one-click launcher (install, build, open browser, start server)
├── update.bat             # Windows one-click updater (backup, pull latest, rebuild)
├── SETUP.md               # Beginner-friendly Windows setup guide
├── UPDATE.md              # Beginner-friendly Windows upgrade guide
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
