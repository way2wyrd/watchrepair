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

First, install [Node.js LTS](https://nodejs.org) — click Next through all the installer defaults. Then get the app files using **one** of the two methods below.

#### Method A: Git clone (recommended — enables one-click updates)

1. Install [Git for Windows](https://git-scm.com/download/win) — click Next through the installer defaults
2. Open Command Prompt (press **Win + R**, type `cmd`, press Enter) and run:
   ```bash
   git clone https://github.com/way2wyrd/watchrepair.git
   ```
3. Open the new `watchrepair` folder and double-click **`start.bat`**

Because this creates a `.git` folder, you can later upgrade with a single double-click of **`update.bat`**.

#### Method B: Download ZIP (no Git required)

1. On GitHub, click the green **Code** button → **Download ZIP**
2. Right-click the downloaded ZIP → **Extract All...** and extract it
3. Open the extracted folder and double-click **`start.bat`**

This works without Git, but future upgrades have to be done manually (re-download the ZIP and copy your data folders over — see [Updating an existing install](#updating-an-existing-install)).

---

Whichever method you choose, `start.bat` installs dependencies, builds the frontend, opens your browser to `http://localhost:3001`, and starts the server — all automatically. On subsequent launches it skips the install/build steps and starts immediately.

See [SETUP.md](SETUP.md) for the full step-by-step guide including troubleshooting.

### Updating an existing install

Your data — the `WatchRepair.db3` database and the `uploads`, `manuals`, and `movement-photos` folders — is never touched by an update, and `update.bat` backs up the database first. See [UPDATE.md](UPDATE.md) for the full step-by-step guide.

**Git installs (1.1.0+): one click.** Double-click **`update.bat`**. It backs up your data, pulls the latest version, reinstalls dependencies, and rebuilds.

**ZIP installs.** `update.bat` only works on Git installs (it looks for a `.git` folder), so you have two choices:
- **Switch to one-click (recommended):** double-click **`convert-to-git.bat`** once. It turns your folder into a Git install in place — without moving your data — so `update.bat` works from then on.
- **Update manually:** download the latest ZIP, extract it to a new folder, and copy your `public`, `uploads`, `manuals`, and `movement-photos` folders into it.

**Upgrading from 1.0.0.** This version predates `update.bat`, so the first upgrade is manual: Git installs run `git pull`, then `npm install`, then `npm run build`; ZIP installs use the manual steps above. Afterward you'll have `update.bat` and `convert-to-git.bat` for next time.

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
├── convert-to-git.bat     # Converts a ZIP install into a Git install for one-click updates
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
