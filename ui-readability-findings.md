# UI Readability/Usability Issues to Fix First

1. Increase body text and control sizes in the right panel.
- Many labels sit at 9-11px in `src/App.css`, especially the agent rows, log headers, and HUD micro-labels.
- On a normal Windows laptop/desktop display this will be cramped fast, especially in the log and command area.
- Raise the baseline to a more readable range first, then preserve hierarchy with weight/color instead of tiny text.

2. Replace the mono-first visual language for dense paragraphs.
- The app uses `var(--font-mono)` for the whole body in `src/App.css`, which makes long task lines, logs, and session info harder to scan.
- Keep mono for timestamps, shortcuts, and IDs; use a cleaner sans or serif for primary UI text and logs.
- This will improve legibility more than any cosmetic polish.

3. Give the three-column layout more breathing room or better collapse behavior.
- `src/App.tsx` places the map, status/log panel, and slide-out panel in a fixed-height shell.
- The right panel is only `300px` wide in `src/App.css`, which is tight for rows + inline commands + log.
- On smaller windows, text truncation and vertical compression will become the main usability failure.

4. Improve contrast on secondary labels and placeholders.
- Several labels use very low-opacity parchment on dark backgrounds, especially keyboard hints, log metadata, and helper text.
- Those look atmospheric but risk becoming decorative instead of informative.
- Boost contrast for anything the user needs to read while operating the dashboard.

5. Make the command affordances more obvious.
- The `⌘` and `▸` buttons in `AgentStatusPanel.tsx` are tiny and rely on color alone.
- The inline command bar also appears without a strong visual anchor, so it may not feel discoverable.
- Add clearer labels/tooltips or slightly larger hit targets before adding more features.

6. Reduce visual noise in the map area before expanding functionality.
- The canvas map is atmospheric, but the UI layers around it are already busy: glow, sparks, toasts, pulses, and dense headers.
- For a workable build on the Overlord's PC, the first goal should be fast recognition of state, not maximum effect density.
- Tone down one or two ambient effects if readability suffers under real use.

7. Check scrollability and clipping on the right-side log.
- `src/App.css` gives the panel a fixed width and the log a scroll region, but there is no evidence yet of responsive handling for shorter heights.
- If the window is not tall enough, the command input and log will compete for space.
- Ensure the log remains usable without hiding critical controls.

Recommended first pass: fix text sizing/contrast, then make the right panel responsive, then trim any decorative clutter that still hurts scanability.