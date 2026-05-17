# Dungeon Interface - Live Data Integration Review

**To:** Kevin
**From:** Bob's subagent (id: f69ee9d2)
**Task:** Identify mocked vs live fields in the Dungeon Interface (`dungeon-interface/src/App.tsx`).

I've reviewed `App.tsx` to identify what is currently simulated versus what relies on real workspace data.

## 1. Mocked / Static Data (Needs Live Integration)
The following are currently driven by static arrays, hardcoded intervals, or simulated logic instead of real OpenClaw/agent state:

*   **Minion Tasks & Activity Feed (`AGENT_TASKS`, `INITIAL_AGENTS`, `INITIAL_LOG`):** The tasks and logs are hardcoded pools that are rotated on a timer (`scheduleNextTick`). They do not reflect what the agents are actually doing.
*   **Ambient Events (`DUNGEON_AMBIENT_EVENTS`):** Thematic logs are randomly fired on a timer.
*   **Commands (`handleSendCommand`):** Currently just adds a log/toast and triggers a visual pulse. It does *not* actually dispatch a message to OpenClaw.
*   **Agent Identity / Configuration:** While some stats are fetched, the agent existence (Grim, Bob, Kevin, Stuart) and their roles/emojis are hardcoded in `INITIAL_AGENTS`.

## 2. Live / Integrated Data (Currently Working)
The interface *does* pull some real data, primarily via polling endpoints/files:

*   **Gateway Status:** Polls `http://localhost:18789/health` to check if OpenClaw is online (`ocStatus`).
*   **Session State (Cost, Tokens, Last Active, Status):** Polls `/dungeon-state.json` every 30 seconds. This provides real values for `model`, `lastInteractionAt`, `totalTokens`, `estimatedCostUsd`, and actual `status` (running/error/idle). *Note: The file relies on an external script (`update-dungeon-state.py`) to generate it.*

## 3. Recommended Next Fixes (Actionable & Cost-Conscious)

To make the dashboard truly live without excessive API overhead, prioritize these specific integrations:

1.  **Connect `handleSendCommand` to OpenClaw's CLI or API:** When a command is sent via the UI, it should drop a message into the relevant agent's session or write to a shared task queue file (e.g., `dungeon-queue.json` or `HEARTBEAT.md`) that the agents parse.
2.  **Live Activity Log via Workspace Tailing:** Instead of cycling fake `AGENT_TASKS`, have the dashboard read from the daily memory log (e.g., `/memory/YYYY-MM-DD.md`) or a dedicated `dungeon-activity.json`. You could have agents write a single structured JSON line when they complete a task, and the dashboard reads the tail of that file. This is cost-free since it's local file I/O.
3.  **Sync `currentTask`:** Have agents update a small `status.json` (or write to `dungeon-state.json`) with their current top-level objective. The dashboard can read this instead of the simulated `AGENT_TASKS`.

*Artifact generated from `/home/ubuntu/.openclaw/workspace/dungeon-interface/src/App.tsx` analysis.*