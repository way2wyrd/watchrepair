# Setting Up Fricking Watch Repair on Windows

This guide walks you through getting the app running on your Windows PC. No prior experience with programming or the command line is required — just follow each step in order.

---

## What You Need

- A Windows 10 or 11 PC
- An internet connection (for the one-time setup)
- About 10–15 minutes

---

## Step 1: Install Node.js

Node.js is the engine that runs the app. You only need to install it once.

1. Open your browser and go to **https://nodejs.org**
2. Click the large **LTS** button (it shows a version number like "20.x.x LTS") — LTS stands for Long-Term Support and is the recommended choice
3. Run the downloaded installer (`node-v##.##.##-x64.msi`)
4. Click **Next** through all the screens, accepting the defaults — you do not need to change anything
5. Click **Install**, then **Finish** when it completes
6. **Restart your computer** (or at least close and reopen any open windows) so Windows recognizes the new software

To verify the install worked: press **Win + R**, type `cmd`, press Enter, then type `node --version` and press Enter. You should see something like `v20.18.0`. If you get an error, try restarting your computer and repeating this step.

---

## Step 2: Get the App Files

You need a copy of the app's files on your computer. There are two ways:

### Option A: Download as a ZIP (easier)

1. Go to the project's GitHub page in your browser
2. Click the green **`< > Code`** button near the top right
3. Click **Download ZIP**
4. Once downloaded, right-click the ZIP file and choose **Extract All...**
5. Choose a location you'll remember — for example, your Documents folder — and click **Extract**
6. You should now have a folder called something like `WatchApp-main`

### Option B: Use Git (if you have Git installed)

Open Command Prompt (`Win + R` → type `cmd` → Enter) and run:

```
git clone https://github.com/your-username/WatchApp.git
```

Replace the URL with the actual repository URL.

---

## Step 3: Launch the App

1. Open the folder you extracted (e.g., `WatchApp-main`) in File Explorer
2. Find the file called **`start.bat`**
3. **Double-click `start.bat`**

A black terminal window will open. The first time you run it, the app will:

- **Install its dependencies** — you'll see a progress bar and package names scrolling by. This takes 1–3 minutes and only happens once.
- **Build the app** — you'll see build progress. This takes about 30–60 seconds and only happens once.

When you see this message, the app is ready:

```
=========================================
 Fricking Watch Repair is starting...
 Open your browser to: http://localhost:3001
 Press Ctrl+C in this window to stop.
=========================================
```

Your default browser should open automatically. If it doesn't, open it yourself and type `http://localhost:3001` in the address bar.

> **Important:** Keep the terminal window open while using the app. Closing it will stop the server.

---

## Step 4: Create Your Admin Account

The first time you open the app, you'll see a **First-Time Setup** screen instead of a login page.

1. Enter a **username** of your choice (at least 2 characters)
2. Enter a **password** of your choice (at least 8 characters) — pick something you'll remember
3. Click **Create Admin Account**

You'll be taken to the login page. Use the username and password you just created to log in.

---

## Step 5: Log In and (Optional) Set Up Two-Factor Authentication

After logging in you may be prompted to set up **two-factor authentication (2FA)**. This adds a second security step using an authenticator app on your phone.

- **To set it up:** Install an authenticator app on your phone (Google Authenticator, Authy, or Microsoft Authenticator all work). Scan the QR code shown on screen, then enter the 6-digit code from the app to confirm.
- **To skip it for now:** Look for a "Skip" or "Later" option on the setup screen. You can always enable 2FA later from your Profile page.

Once past this screen, you'll land on the Dashboard and the app is fully ready to use.

---

## Stopping the App

To stop the server, click the terminal window and press **Ctrl + C**, then close the window. Your data is saved automatically — nothing will be lost.

---

## Starting the App Again Later

Just double-click **`start.bat`** again. The install and build steps are skipped on subsequent runs, so the app will start in a few seconds.

---

## Troubleshooting

### "Node.js was not found" error when double-clicking start.bat

Node.js either isn't installed or Windows hasn't picked it up yet. Try:
1. Install Node.js from https://nodejs.org (Step 1 above)
2. **Restart your computer**
3. Double-click `start.bat` again

### The browser opens but shows a white screen or "Cannot connect"

The server may still be starting. Wait 5–10 seconds and refresh the page. If it still doesn't load, check the terminal window for any red error messages.

### "Port 3001 is already in use" error

Another program (possibly a previous instance of this app) is using port 3001. To fix it:
1. Press **Ctrl + Alt + Delete** → **Task Manager**
2. Look for a process called `node.exe`, select it, and click **End Task**
3. Double-click `start.bat` again

### npm install fails with permission errors

Try running `start.bat` as Administrator: right-click `start.bat` and choose **Run as administrator**.

### The app was working but stopped after a Windows update

Try running `start.bat` normally. If it fails, delete the `dist` folder inside the app folder and run `start.bat` again — it will rebuild automatically.
