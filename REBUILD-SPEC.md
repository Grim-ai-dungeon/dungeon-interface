# Dungeon Interface v2 — FULL REBUILD SPEC

## Overlord's Orders
The current UI is garbage. Scrap it. Build something that looks like a real dungeon map — 2D top-down view with dungeon tile aesthetics, character sprites for agents, and interactive minion management.

## Reference
The Overlord sent a reference image: classic dungeon tiles from brea-art.com — stone/sand textured rooms in top-down 2D view with cross-shaped room layouts. Think D&D dungeon map, NOT sci-fi, NOT isometric.

## Core Design

### Visual Style
- **2D top-down dungeon map** — like a tabletop RPG map
- Stone/brick walls, textured floor tiles (sand, stone, dirt)
- Dark atmosphere with torch/candle lighting effects (subtle glow around light sources)
- Grid-based room layout
- NO isometric, NO 3D, NO sci-fi/cyber aesthetic
- Think: classic dungeon crawler / D&D map / roguelike aesthetic

### The Map
- Central large room = **Grim's Chamber** (the Dungeon Master's throne room)
- Connected rooms for each minion:
  - **Bob's Library** 📚 (research room — bookshelves, scrolls)
  - **Kevin's Workshop** 🔧 (forge/workshop — anvil, tools)
  - **Stuart's Treasury** 💰 (vault — gold piles, chests)
- Corridors connecting rooms (stone hallways)
- Rooms should have distinct floor textures/decorations matching their purpose
- Fog of war effect on inactive/idle rooms (darker, muted)
- Active rooms glow warmer (torch light effect)

### Character Models / Sprites
- Each agent has a **sprite/avatar** visible in their room
- Grim: dragon or hooded figure in the central chamber
- Bob: small minion with magnifying glass / book
- Kevin: small minion with wrench / hammer
- Stuart: small minion with gold coins / ledger
- Sprites should have subtle idle animations (bobbing, breathing, blinking)
- When an agent is working: show activity animation (sparks, page turning, etc.)
- When idle: sleeping/waiting animation

### Interactivity
- **Click on any room/minion** → opens a side panel with:
  - Agent name, status (active/idle/error)
  - Current task description
  - Recent activity log for that agent
  - A text input to send feedback/commands to the agent
  - Quick action buttons (e.g., "Assign Task", "View Output", "Stop")
- **Hover on rooms** → subtle highlight/glow
- **Grim's room click** → shows overall dungeon status, recent cross-agent activity

### Side Panel (Agent Detail)
- Slides in from the right when a room/agent is clicked
- Dark themed panel with dungeon-style borders (stone frame)
- Shows:
  - Agent avatar (larger)
  - Name + role
  - Status indicator (green=active, yellow=idle, red=error)
  - Current task (if any)
  - Last 5 activity entries
  - Text input field for sending commands
- Click outside or X to close

### Header / HUD
- Top bar: "The Overlord's Dungeon" title in fantasy font
- Dungeon stats: total agents, active tasks, uptime
- Minimal — the map is the star

### Tech Constraints
- React + TypeScript + Vite (keep Tauri wrapper)
- Use HTML5 Canvas for the dungeon map rendering
- CSS for the side panel and HUD overlays
- No heavy game engines — keep it lightweight
- Must pass `tsc --noEmit` with zero errors
- All assets should be procedurally generated or embedded (no external asset loading that could break)
- Responsive: min 900x600, looks great at 1400x860

### Color Palette
- Walls: dark grey/brown stone (#3a3a3a, #4a3a2a)
- Floors: warm sand/stone (#8B7355, #A0926B, #6B5B4F)
- Highlights: warm torchlight orange (#FF9933, #FFB366)
- Active glow: golden (#FFD700)
- Idle: muted blue-grey
- Error: deep red (#CC3333)
- Text: parchment white (#F5E6D3)
- Panel background: very dark brown (#1a1410)

### What to DELETE
- Remove ALL theme switching (arctic, cyberpunk, hellfire, toxic, deepspace) — ONE look: dungeon
- Remove IsoDungeonMap.tsx
- Remove ThemeSwitcher.tsx, ThemeContext.tsx
- Remove all theme files in src/themes/
- Keep: ActivityLog concept (but restyle), Header (restyle), LoadingOverlay (restyle)

## File Structure Target
```
src/
  App.tsx                    — Main layout (map + overlays)
  App.css                    — Global styles
  main.tsx                   — Entry
  components/
    DungeonMap.tsx            — Canvas-based 2D top-down dungeon map
    AgentSprite.ts            — Agent sprite rendering logic
    SidePanel.tsx             — Agent detail slide-out panel
    DungeonHUD.tsx            — Top bar stats
    ActivityLog.tsx           — Restyled activity feed
    LoadingOverlay.tsx        — Dungeon-themed loading screen
  types.ts                   — Shared types
  dungeon/
    tiles.ts                  — Tile definitions, wall/floor patterns
    rooms.ts                  — Room layouts and positions
    lighting.ts               — Torch glow / fog of war effects
```

## Priority
1. Get the map rendering with rooms and corridors FIRST
2. Add agent sprites in rooms
3. Add click interaction + side panel
4. Polish lighting/atmosphere
5. Make sure `tsc --noEmit` passes and `npx vite build` succeeds

## DO NOT
- Do NOT use any external image assets or CDN resources
- Do NOT use PixiJS or any game engine — plain Canvas2D
- Do NOT add theme switching
- Do NOT leave TypeScript errors
- Do NOT forget to update index.html if needed
