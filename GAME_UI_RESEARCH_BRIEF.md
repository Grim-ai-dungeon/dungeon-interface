# Dungeon Interface: Game UI/UX Research Brief
*Focus: Transitioning from a dashboard to an immersive "Space Dungeon" game feel.*

## 1. Draggable Windows & Multi-Window Management
To make the interface feel like a management game (e.g., RimWorld, Oxygen Not Included) rather than a web dashboard:
*   **Decouple UI from Web Flow:** Avoid standard browser scrolling. The screen should be fixed, acting as a viewport.
*   **Window Manager Pattern:** Implement a floating window system with Z-indexing. Clicking a window brings it to the front. 
*   **Libraries:** Use `react-rnd` (React Resizeable and Draggable) or `@dnd-kit/core`. They handle boundary clamping (keeping windows on-screen) out of the box.
*   **Visual Treatment:** Give windows a "physical" presence. Use solid headers (for dragging), semi-transparent body panels (e.g., `backdrop-filter: blur(8px)` with `rgba(15, 20, 30, 0.8)`), and distinct border strokes.

## 2. Activity Log / To-Do / Chat Presentation
*   **The "MMO Chatbox" Approach:** Pin a resizable console/chat window to the bottom-left or right. 
*   **Channels/Tabs:** Separate traffic into tabs: `[System]`, `[Grim/Command]`, `[Minions]`.
*   **Visual Hierarchy:**
    *   *Minion Chat:* Use minion-specific colors for their names (e.g., Bob = Yellow, Kevin = Green). 
    *   *Tasks/To-Dos:* Treat these like "Quests". Use a floating "Quest Tracker" pinned to the right side of the screen. Include checkboxes that play a satisfying animation (strikethrough + flash) when completed.
*   **Behavior:** Auto-scroll to new messages, but pause auto-scrolling if the user scrolls up. Fade out message backgrounds when inactive, keeping text visible.

## 3. Art & Asset Recommendations ('Space Dungeon')
To achieve a smoother, less-blocky "Space Dungeon" aesthetic:
*   **Perspective:** Move from flat 2D to an isometric or 3/4 top-down perspective. This adds depth instantly.
*   **Resolution/Tiles:** For a modern, crisp look, avoid overly chunky pixel art unless strict retro is the goal. 
    *   **Vector/High-Res 2D:** Use 128x128 or 256x256 base tiles. Scale them down if necessary for anti-aliasing.
    *   **Smooth Pixel Art:** If using pixel art, use 32x32 scaled up 3x, but use a cohesive palette with softer shading (less contrast on interior tiles, high contrast on walls).
*   **Palette:** Deep space grays/blues (`#1a1e24`), accented with emissive/neon colors (Cyan `#00f3ff` for active screens, Amber `#ffb000` for warnings). 
*   **Details:** Add floor grating, glowing cables, metallic panels with rivets, and soft baked lighting (vignettes on tiles).

## 4. Audio & Feedback (Game Feel)
"Juice" is critical for transforming a tool into a game. 
*   **UI Sounds:** Every click needs feedback. Use short, crisp, sci-fi mechanical sounds.
    *   *Open window:* High-tech mechanical slide/whoosh.
    *   *Close window:* Deep, muted clunk.
    *   *Task Complete:* Satisfying, multi-tonal ascending chime.
*   **Ambient Audio:** A continuous, very low-volume "ship hum" or "reactor rumble" in the background sells the space setting.
*   **Implementation:** Use `howler.js` for audio management. Create an "audio sprite" (one file with all sound effects) to ensure zero latency playback on clicks.

## 5. Technical Integration (PixiJS + React)
*   **The "HTML Overlay" Pattern (Highly Recommended):** 
    *   **PixiJS:** Handles ONLY the dungeon simulation—the floor layout, moving minion avatars, pathfinding, and environment effects.
    *   **React (DOM):** Handles ALL UI—draggable windows, chat, context menus, buttons.
*   **Why?** Rendering text, flexbox layouts, and scrollbars inside PixiJS is notoriously painful and buggy. HTML/CSS is built for this.
*   **Setup:** Position the PixiJS canvas at `z-index: 0`. Position a React container over it at `z-index: 1` with `pointer-events: none`. Give individual React windows `pointer-events: auto`.
*   **State Sharing:** Use a global state manager like `Zustand` to bridge them. When a React button is clicked, it updates Zustand; the PixiJS components (`@pixi/react`) listen to Zustand and update the visual simulation accordingly.