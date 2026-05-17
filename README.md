# 🐉 Dungeon Interface — The Overlord's Command Center

A real-time 2D dungeon map dashboard for overseeing your OpenClaw minion agents.

---

## Quick Start (Windows)

**Requirements:** Node.js v18+ (you have v24 ✅)

1. Open a terminal (PowerShell or CMD)
2. Navigate to this folder:
   ```
   cd C:\Users\Robbe\dungeon-interface
   ```
3. Install dependencies (first time only):
   ```
   npm install
   ```
4. Start the dev server:
   ```
   npm run dev
   ```
5. Open **http://localhost:5173** in your browser
6. Enjoy the dungeon! 🏰

---

## Features

- **2D top-down dungeon map** with animated rooms and corridors
- **Zoom/pan** — scroll wheel to zoom, drag to pan, double-click to reset view
- **Room name labels** appear when zoomed out past 80%
- **Animated minion sprites** — Bob waddles, Kevin stumbles, Grim commands
- **Live activity log** with timestamped entries and toast notifications
- **4 dungeon themes:** Dungeon 🏰 · Cyberpunk 🤖 · Hellfire 🔥 · Arctic ❄️
- **Keyboard shortcuts:** `1`–`4` select rooms, `ESC` closes the side panel
- **Scrying Portal** (screen capture — full functionality requires the Tauri desktop build)
- **Real agent status** via `dungeon-state.json` (when the update script is running)

---

## Optional: Real Agent Data

To show live OpenClaw agent status instead of the built-in simulation:

```bash
python update-dungeon-state.py --watch
```

Requires:
- Python 3
- OpenClaw gateway running at `localhost:18789`

Without it the interface runs in **simulation mode** — all animations and events work normally, agents just show placeholder activity.

---

## Available Scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start dev server at http://localhost:5173 |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run tauri` | Build/run the full Tauri desktop app |

---

## Tech Stack

- **React 18** + TypeScript
- **Vite 7** dev server
- **Canvas 2D** rendering (no external game engine)
- **PixiJS** for sprite/particle effects
- **Tauri 2** for the future native desktop build

---

## Troubleshooting

**Port already in use?**
```
npm run dev -- --port 3000
```
Then open `http://localhost:3000`.

**`npm install` fails?**
Make sure you're running Node.js v18 or higher:
```
node --version
```

**Page loads but looks blank?**
Open browser DevTools (F12) → Console tab and paste any errors here.
