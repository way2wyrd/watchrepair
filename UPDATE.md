# Updating Fricking Watch Repair on Windows

This guide walks you through updating an existing installation to the latest version (for example, upgrading from **1.0** to **1.1**). No programming or command-line experience is required — just follow each step in order.

If you have never installed the app before, use [SETUP.md](SETUP.md) instead — this guide is only for people who already have it running.

---

## What's New in 1.1

- **Customer-facing PDF export for repairs** — generate and download a polished PDF for any repair to hand to a customer.
- **Currency format preference for part costs** — choose how part costs are displayed.
- **Distinct status badge colors** — each repair status now has its own color, with green for Delivered.
- **Multi-photo upload fix** — uploading several photos at once no longer fails.

See the full [release notes](https://github.com/way2wyrd/watchrepair/releases/tag/v1.1.0) for details.

---

## Will I Lose My Data?

**No.** Your repairs, parts, movements, manuals, photos, and user accounts are stored separately from the app's program files, so updating does not touch them. The update process also makes an automatic backup of your database before changing anything, just to be safe.

Your data lives in these folders inside the app folder:

- `public` — the main database (`WatchRepair.db3`) and settings
- `uploads` — repair photos
- `manuals` — uploaded service manuals
- `movement-photos` — movement reference photos

Backups created during updates are saved in a `backups` folder.

---

## Step 1: Stop the App

If the app is currently running, stop it first — the update can't replace files that are in use.

1. Find the black terminal window that shows `Fricking Watch Repair is starting...`
2. Click it, press **Ctrl + C**, then close the window

If you're not sure whether it's running, that's fine — the update script will remind you before it starts.

---

## Step 2: Run the Update

1. Open the app folder in File Explorer (the same folder that contains `start.bat`)
2. Find the file called **`update.bat`**
3. **Double-click `update.bat`**

A terminal window opens and the script will:

- **Remind you to stop the app** — press a key once you've confirmed it's closed
- **Back up your database** automatically into the `backups` folder
- **Download the latest version** of the app
- **Update dependencies** and **rebuild the app** (this can take 1–3 minutes)

When you see this message, the update is finished:

```
=========================================
 Update complete!
 Double-click start.bat to launch the app.
=========================================
```

Then double-click **`start.bat`** as usual to launch the updated app.

> **Note:** `update.bat` only updates automatically if the app was installed with **Git**. If you originally installed by downloading a ZIP file, the script will detect this and show you the manual steps below.

---

## Updating a ZIP Install (Manual Method)

If you originally set up the app by downloading a ZIP (the method in [SETUP.md](SETUP.md)), follow these steps to update without losing your data:

1. **Stop the app** (Step 1 above).
2. Go to the project's GitHub page, click the green **`< > Code`** button, and choose **Download ZIP**.
3. Right-click the downloaded ZIP, choose **Extract All...**, and extract it to a **new** folder (for example, `WatchApp-1.1`). Keep your old folder for now.
4. Open your **old** app folder and copy these four data folders into the **new** folder, replacing the empty versions there if asked:
   - `public`
   - `uploads`
   - `manuals`
   - `movement-photos`
5. Double-click **`start.bat`** inside the **new** folder. It will install and build automatically, just like the first time.
6. Once you've confirmed your data is all present and the new version works, you can delete the old folder.

> **Tip:** If you'd like easier updates in the future, ask whoever set this up to reinstall using Git (see Option B in [SETUP.md](SETUP.md)). After that, you can update with a single double-click of `update.bat`.

---

## Step 3: Confirm It Worked

1. Open your browser to `http://localhost:3001` and log in as usual.
2. Check that your existing repairs, parts, and photos are all there.
3. Try one of the new features — for example, open a repair and look for the new **Export PDF** option.

---

## Troubleshooting

### "Node.js was not found" error when double-clicking update.bat

Node.js isn't installed or Windows hasn't picked it up yet. Install it from https://nodejs.org (click the **LTS** button), restart your computer, and run `update.bat` again.

### "Update download failed" message

This usually means the app couldn't reach GitHub or there were local changes. Your data was **not** changed, and a backup is in the `backups` folder. Check your internet connection and try again. If it keeps failing, use the **ZIP install** manual method above.

### The app won't start after updating

1. Delete the `dist` folder inside the app folder.
2. Double-click `start.bat` — it will rebuild automatically.

If it still won't start, restore your database from the backup (see below) and re-run `update.bat`.

### Restoring from a backup

If something went wrong and you want to return to your previous data:

1. Make sure the app is stopped.
2. Open the `backups` folder and find the most recent file, named like `WatchRepair_20260618_142530.db3`.
3. Copy it into the `public` folder and rename it to `WatchRepair.db3`, replacing the existing file.
4. Double-click `start.bat`.

---

## Updating Again Later

Each time a new version is released, just double-click **`update.bat`** again. It will back up your data, pull the latest version, and rebuild — no need to repeat any setup.
