# Dungeon Interface — Continuous Improvement Plan

## The Vision
The Dungeon Interface must eventually REPLACE the OpenClaw Control UI (webchat). The Overlord wants to manage everything — chat with Grim, dispatch minions, view outputs, monitor spending — all from the dungeon app.

## Current State (v0.2.0)
- Basic 2D top-down dungeon map ✅
- 4 rooms with agent sprites ✅
- Click → side panel with agent info ✅
- Torch lighting ✅
- But it still looks amateur — needs polish and real functionality

## Improvement Roadmap

### Phase 1: Visual Polish (PRIORITY)
- Better room textures — more detailed stone/brick patterns
- Smoother animations — sprite idle/work cycles
- Room decorations that match each agent's role (bookshelves, anvils, treasure chests)
- Particle effects — dust motes, torch sparks, magical glimmers
- Better color palette — richer, more atmospheric
- Corridor details — cracks, moss, scattered items
- Mini-map or room labels so it's clear what's what

### Phase 2: Real Functionality
- **Live agent status** — connect to OpenClaw API to show real agent states
- **Chat integration** — type messages to Grim from within the app
- **Task dispatch** — click a minion, type an order, it actually runs
- **Activity feed** — real logs from agent sessions, not mock data
- **Treasury panel** — live wallet balance and spending chart

### Phase 3: Full Replacement
- **WebSocket connection** to OpenClaw gateway for real-time updates
- **All Control UI features** replicated in dungeon theme
- **Notification system** — toast alerts for completed tasks, errors
- **Settings panel** — configure agents, models, etc.
- **Screen watcher** — xcap integration for Grim to see the Overlord's screen

## Tech Notes
- Project: /home/ubuntu/.openclaw/workspace/dungeon-interface/
- Stack: Tauri + React + TypeScript + Canvas2D
- Build: `npx tsc --noEmit && npx vite build`
- GitHub: Grim-ai-dungeon/dungeon-interface
- Push with: git push origin master (token in git remote)
- Tag for release: git tag vX.Y.Z && git push origin vX.Y.Z

## Rules
- MUST pass `npx tsc --noEmit` with ZERO errors
- MUST pass `npx vite build` 
- Git commit after each significant improvement
- Keep bundle size reasonable
- No external image assets — everything procedural or embedded
