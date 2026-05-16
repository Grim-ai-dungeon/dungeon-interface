# Dungeon Interface - Feature Roadmap

This document serves as the project's north star, detailing the current state, ongoing work, and future plans for the Dungeon Interface.

## Phase 1 — DONE (What we have)

*   **Isometric PixiJS dungeon map with 4 rooms**
    *   *What it does:* Displays the core visual interface of the dungeon layout.
    *   *Tech approach:* PixiJS canvas rendering with isometric projection math and React-Pixi integration.
    *   *Complexity:* High
*   **Animated glows, circuit connections, data packets**
    *   *What it does:* Brings the dungeon to life by visualizing data flowing between rooms.
    *   *Tech approach:* PixiJS ticker for animation loop, sprite tinting, and bezier curves for routing.
    *   *Complexity:* Medium
*   **Agent status panel with OpenClaw API polling**
    *   *What it does:* Shows the current state, assignments, and health of the minions.
    *   *Tech approach:* React components polling OpenClaw API endpoints for state updates.
    *   *Complexity:* Low
*   **Theme system (5 themes defined)**
    *   *What it does:* Provides visual customization options for the interface.
    *   *Tech approach:* CSS variables and configured design token presets.
    *   *Complexity:* Low
*   **Screen watch placeholder**
    *   *What it does:* A dedicated UI area reserved for the upcoming screen capture feature.
    *   *Tech approach:* Static React layout component with placeholder styling.
    *   *Complexity:* Low
*   **GitHub Actions workflow for Windows builds**
    *   *What it does:* Automates the application packaging for Windows platforms.
    *   *Tech approach:* CI/CD pipeline using GitHub Actions to orchestrate Node and Rust build steps.
    *   *Complexity:* Medium

## Phase 2 — IN PROGRESS

*   **Theme switcher UI (Kevin working on this)**
    *   *What it does:* Provides the Overlord with a UI to change the active theme.
    *   *Tech approach:* React state controls triggering theme context updates.
    *   *Complexity:* Low
*   **ThemeProvider wiring**
    *   *What it does:* Ensures theme selections propagate instantly across all components.
    *   *Tech approach:* React Context API Provider wrapping the component tree.
    *   *Complexity:* Low

## Phase 3 — NEXT

*   **Screen capture integration (xcap Rust crate)**
    *   *What it does:* Streams the Overlord's active screen into the screen watch panel.
    *   *Tech approach:* Rust backend utilizing the `xcap` crate to capture frames, sent via IPC to the frontend.
    *   *Complexity:* High
*   **Real-time agent activity log with scrolling feed**
    *   *What it does:* Displays a terminal-like chronological log of minion actions.
    *   *Tech approach:* WebSocket or Server-Sent Events (SSE) from the OpenClaw API, with a virtualized scrolling list.
    *   *Complexity:* Medium
*   **Sound effects (ambient dungeon sounds, notification pings)**
    *   *What it does:* Enhances immersion with audio feedback for events.
    *   *Tech approach:* Web Audio API triggered by application state changes.
    *   *Complexity:* Low
*   **Notification system (toast popups for agent events)**
    *   *What it does:* Alerts the Overlord of critical task completions or minion failures.
    *   *Tech approach:* React toast notification library listening to global event emitters.
    *   *Complexity:* Low
*   **Drag-and-drop room rearrangement**
    *   *What it does:* Allows custom layout organization of the dungeon map.
    *   *Tech approach:* Drag-and-drop interactions mapped to PixiJS coordinate updates and persisted state.
    *   *Complexity:* High

## Phase 4 — FUTURE

*   **Custom room creation (add new agents/rooms)**
    *   *What it does:* Lets the Overlord spawn new minions and construct their quarters dynamically.
    *   *Tech approach:* Form UI submitting payloads to the API, triggering instantiation of new PixiJS room entities.
    *   *Complexity:* High
*   **Agent chat interface (talk to individual minions from their room)**
    *   *What it does:* Provides a direct communication line to interrogate or instruct specific sub-agents.
    *   *Tech approach:* Contextual chat UI overlay that routes messages to specific OpenClaw session endpoints.
    *   *Complexity:* Medium
*   **Task queue visualization**
    *   *What it does:* Shows an overview of pending, active, and completed operations.
    *   *Tech approach:* Kanban board or timeline view synced with task state from the API.
    *   *Complexity:* Medium
*   **Performance graphs (tokens/cost over time — Stuart's data)**
    *   *What it does:* Visualizes resource consumption and operational costs.
    *   *Tech approach:* Charting library (e.g., Recharts) parsing data polled from Stuart's endpoints.
    *   *Complexity:* Medium
*   **Plugin system for community themes**
    *   *What it does:* Enables importing custom, third-party visual themes.
    *   *Tech approach:* JSON schema validation and dynamic asset loading for user-provided theme files.
    *   *Complexity:* High
*   **Mobile companion app**
    *   *What it does:* Allows remote oversight of the dungeon from a mobile device.
    *   *Tech approach:* React Native application connecting to a secure gateway for the OpenClaw instance.
    *   *Complexity:* High