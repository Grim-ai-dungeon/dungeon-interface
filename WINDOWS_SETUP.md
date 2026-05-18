# 🐉 Dungeon Interface — Windows Setup Guide

Get the Dungeon Interface running on your Windows machine in under 5 minutes.

---

## ✅ Prerequisites

- **Node.js v18+** — you have v24.15.0 ✅
- **A terminal** — use PowerShell (Windows Terminal recommended)
- **A browser** — Chrome, Edge, or Firefox

---

## 🚀 Option A — Quick View (Dev Server, No Rust Needed)

This gets the dungeon running in your browser immediately.

---

### Step 1 — Download the archive

Download `dungeon-interface-latest.tar.gz` from your server to your Windows machine.

> **If you have OpenClaw or SCP access:**
> Use whatever method you have to pull the file from the server.
> The archive is at: `/home/ubuntu/.openclaw/workspace/dungeon-interface-latest.tar.gz`

---

### Step 2 — Open PowerShell

Press `Win + X` → click **"Windows PowerShell"** or **"Terminal"**

---

### Step 3 — Extract the archive

Run these commands in PowerShell (copy-paste the whole block):

```powershell
# Navigate to your preferred folder (e.g., Desktop)
cd "$env:USERPROFILE\Desktop"

# Create a folder for the dungeon
New-Item -ItemType Directory -Force -Name "dungeon-interface"
cd dungeon-interface

# Extract the archive (Node.js 18+ has built-in tar support on Windows)
tar -xzf "$env:USERPROFILE\Downloads\dungeon-interface-latest.tar.gz" --strip-components=1
```

> **Note:** If the `.tar.gz` file is not in your Downloads folder, replace the path above with wherever you saved it.
> Example: if saved to Desktop: `"$env:USERPROFILE\Desktop\dungeon-interface-latest.tar.gz"`

---

### Step 4 — Install dependencies

```powershell
npm install
```

This will take 1-3 minutes the first time. You'll see a progress bar.

---

### Step 5 — Start the dev server

```powershell
npm run dev
```

You should see output like:

```
  VITE v7.x.x  ready in 300ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

### Step 6 — Open in browser

Open your browser and go to:

```
http://localhost:5173
```

**The Dungeon Interface should now be running! 🐉**

---

### Step 7 — Stop the server

When you're done, press `Ctrl + C` in the PowerShell window.

---

## 🔄 Running Again Later

Next time you want to run it, you only need Steps 5 and 6:

```powershell
# Navigate back to the folder
cd "$env:USERPROFILE\Desktop\dungeon-interface"

# Start the server
npm run dev
```

Then open `http://localhost:5173` in your browser.

---

## 🔧 Troubleshooting

### "tar is not recognized"
Windows 10 (build 1803+) and Windows 11 include `tar` built-in. If it's missing:
1. Download [7-Zip](https://www.7-zip.org/)
2. Right-click the `.tar.gz` file → 7-Zip → Extract Here

### "npm is not recognized"
Node.js is not in your PATH. Fix it:
1. Download Node.js from [nodejs.org](https://nodejs.org) (LTS version)
2. Run the installer — make sure "Add to PATH" is checked
3. Close and reopen PowerShell
4. Try `npm --version` to confirm it works

### Port 5173 already in use
```powershell
# Use a different port
npm run dev -- --port 3000
```
Then open `http://localhost:3000` instead.

### "EACCES" or permission errors
Run PowerShell as Administrator:
- Press `Win + X` → **Windows PowerShell (Admin)**

---

## 🏰 Option B — Full Desktop App (Tauri, .exe)

This builds a native Windows `.exe`. **Requires Rust and Visual Studio Build Tools.**

### Prerequisites to install first:

1. **Visual Studio Build Tools 2022**
   - Download: https://visualstudio.microsoft.com/visual-cpp-build-tools/
   - Install the **"Desktop development with C++"** workload

2. **Rust**
   - Download: https://rustup.rs/
   - Run the installer and follow prompts
   - Restart PowerShell after installation

3. **WebView2 Runtime** (usually pre-installed on Windows 11)
   - If missing: https://developer.microsoft.com/microsoft-edge/webview2/

### Build commands:

```powershell
# Navigate to the project folder
cd "$env:USERPROFILE\Desktop\dungeon-interface"

# Install Node dependencies (if not already done)
npm install

# Build the Tauri desktop app
npm run tauri build
```

The `.exe` installer will be created at:
```
src-tauri\target\release\bundle\msi\dungeon-interface_0.1.0_x64_en-US.msi
```
(or similar path — look in `src-tauri\target\release\bundle\`)

### Double-click the `.msi` to install, then launch from Start Menu.

---

## 📁 What's in the Archive

```
dungeon-interface/
├── src/                    # React + TypeScript source
│   ├── components/         # UI components (HUD, MinionCards, etc.)
│   ├── dungeon/            # Dungeon map logic
│   ├── hooks/              # React hooks (gateway, notifications)
│   ├── pixi/               # PixiJS sprite/particle engine
│   └── services/           # Gateway API service
├── public/
│   ├── assets/
│   │   ├── sprites/        # Minion PNG sprites (Grim, Kevin, Bob, etc.)
│   │   └── tilesets/       # Dungeon tileset images
│   └── dungeon-state.json  # Live dungeon state (polled by the UI)
├── src-tauri/              # Tauri desktop app wrapper (for Option B)
├── index.html              # App entry point
├── package.json            # Dependencies
├── vite.config.ts          # Vite build config
└── tsconfig.json           # TypeScript config
```

---

## 💡 Notes

- The dev server (`npm run dev`) hot-reloads on file changes — great for development.
- The UI polls `public/dungeon-state.json` for live agent data.
- Gateway connectivity features require OpenClaw to be running and accessible.

---

*Generated by Kevin, Minion of Deployment — May 2026*
