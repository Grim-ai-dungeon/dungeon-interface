# Dungeon Interface: Theme Research & Visual Inspiration

This document provides actionable visual inspiration, color palettes, fonts, asset references, and technical effects for implementing multiple skins/themes in the Dungeon Interface.

## 1. Color Palettes & Fonts

*Note: All colors are provided in hex for direct CSS variable integration.*

### 🟢 Cyberpunk Dungeon
*High contrast, neon against void, terminal aesthetics.*
* **Palettes:**
  * `--bg-dark`: `#0F0F1B` (Deep Grid Void)
  * `--surface`: `#1A1A2E` (Console Plating)
  * `--primary`: `#00FF41` (Terminal Green)
  * `--secondary`: `#00FFFF` (Neon Cyan)
  * `--accent`: `#FF003C` (Error/Laser Pink)
* **Google Fonts:**
  * Primary/UI: `Share Tech Mono` or `Roboto Mono`
  * Headings: `VT323` or `Orbitron`

### 🔥 Hellfire
*Abyssal darks, oppressive reds, searing heat.*
* **Palettes:**
  * `--bg-dark`: `#0D0202` (Abyssal Dark)
  * `--surface`: `#2A0404` (Dried Blood/Stone)
  * `--primary`: `#D92525` (Lava Red)
  * `--secondary`: `#FF6B00` (Ember Orange)
  * `--accent`: `#FFD600` (Searing Yellow)
* **Google Fonts:**
  * Primary/UI: `Eczar` (Sharp, slightly aggressive)
  * Headings: `Cinzel Decorative` or `UnifrakturMaguntia`

### ❄️ Arctic Fortress
*Sterile, cold, metallic, frosted glass.*
* **Palettes:**
  * `--bg-dark`: `#000B18` (Deep Freeze)
  * `--surface`: `#102B3F` (Steel Ice)
  * `--primary`: `#4A90E2` (Glacier Blue)
  * `--secondary`: `#A0D2EB` (Frostbite)
  * `--accent`: `#FFFFFF` (Snow White / Glare)
* **Google Fonts:**
  * Primary/UI: `Montserrat` (Clean, round)
  * Headings: `Jura` or `Rajdhani` (Tech-forward, squared)

### 🌌 Deep Space
*Vast, cosmic, glowing nebulae, sleek tech.*
* **Palettes:**
  * `--bg-dark`: `#050510` (The Void)
  * `--surface`: `#1B113D` (Nebula Purple)
  * `--primary`: `#4581C6` (Starlight Blue)
  * `--secondary`: `#3D2282` (Deep Violet)
  * `--accent`: `#E0E7FF` (Comet White)
* **Google Fonts:**
  * Primary/UI: `Exo 2`
  * Headings: `Audiowide` or `Orbitron`

### ☢️ Toxic Wasteland
*Corrosive, warning signs, sickly glow, industrial decay.*
* **Palettes:**
  * `--bg-dark`: `#141710` (Sludge Dark)
  * `--surface`: `#2E3A1A` (Moss/Grime)
  * `--primary`: `#BFFF00` (Radioactive Yellow-Green)
  * `--secondary`: `#6B8E23` (Olive Drab)
  * `--accent`: `#FF00FF` (Mutant Magenta for critical alerts)
* **Google Fonts:**
  * Primary/UI: `Fira Code` (Technical, terminal-like)
  * Headings: `Creepster` or `Nosifer` (Use sparingly for major warnings)

---

## 2. Free Asset Resources (itch.io)

For room decorations, icons, and sprites, the following search queries and creators on itch.io yield excellent free results for Kevin to integrate:

*   **Cyberpunk:** Search for "Sci-Fi UI" by *Kenney* (UI elements), or "Cyberpunk Street Environment" by *Ansimuz* (for pixel room decorations).
*   **Hellfire:** Search "Dungeon Crawl 32x32 tiles" or "Free Pixel Art Fire/Lava animations". *Aekashics* often has great monster/hellish sprites.
*   **Arctic Fortress:** Search "Winter Forest" or "Ice Dungeon" tilesets. Look for free ice crystal and frozen UI packs.
*   **Deep Space:** *Kenney's* "Space Shooter Redux" or "UI Pack Space Expansion" are gold standards for clean space aesthetics.
*   **Toxic Wasteland:** Search "Industrial Platformer Assets" or "Wasteland Tileset". Look for hazard stripes, barrels, and biohazard icons.

---

## 3. CSS & WebGL Effects (Implementation Notes)

To make the themes feel alive rather than just a palette swap:

### Cyberpunk (CRT & Glow)
*   **Neon Glow:** Heavy use of `box-shadow` and `text-shadow` (e.g., `text-shadow: 0 0 5px var(--primary), 0 0 10px var(--primary);`).
*   **CRT Scanlines:** Use a full-screen `pointer-events: none` overlay with a `repeating-linear-gradient` (black with low opacity, 1-2px high).
*   **Flicker:** CSS `@keyframes` on opacity and text-shadow to simulate failing neon tubes.

### Hellfire (Heat & Flame)
*   **Heat Distortion:** Use CSS `filter: url(#heat)` linked to an inline SVG with `<feTurbulence>` and `<feDisplacementMap>` animated via JavaScript/CSS for a wavy heat-haze over the background.
*   **Ember Particles:** A lightweight Canvas or WebGL particle system rising from the bottom of the screen.

### Arctic Fortress (Frost & Glass)
*   **Frosted Glass:** CSS `backdrop-filter: blur(10px)` combined with a semi-transparent white/blue background (`rgba(160, 210, 235, 0.1)`) on panels.
*   **Snowfall:** A simple `<canvas>` element overlay handling slow, drifting white particles.

### Deep Space (Stars & Void)
*   **Parallax Starfield:** Multiple layers of repeating background images (stars) moving at different speeds via CSS animation (`background-position-x` or `transform: translate`).
*   **Nebula Glow:** CSS `radial-gradient` backgrounds on panels to simulate glowing gas clouds behind the UI.

### Toxic Wasteland (Sludge & Pulse)
*   **Radioactive Pulse:** CSS `@keyframes` that slowly scale and pulse the `box-shadow` of critical elements (like a heartbeat).
*   **Caution Tape:** Borders using `repeating-linear-gradient(45deg, yellow, yellow 10px, black 10px, black 20px)` for dangerous actions.

---

## 4. UI Design Principles (Stolen from the Greats)

When building the Dungeon Interface, keep these proven principles in mind:

*   **Darkest Dungeon (Thematic Immersion & Warning):**
    *   *Principle:* High contrast is reserved for danger. The UI is diegetic (looks like physical parchment/iron).
    *   *Steal this:* Make destructive actions (terminating a minion, deleting data) visually distinct and somewhat intimidating.
*   **Stellaris (Clean Hierarchies in Complexity):**
    *   *Principle:* Lots of data, but clean lines and translucency keep it from feeling claustrophobic.
    *   *Steal this:* Use thin borders, standardized iconography, and collapsible side-panels to handle large networks of agents without clutter.
*   **Rimworld (Pure Functionalism):**
    *   *Principle:* Information over flash. If a pawn (minion) is failing, you know immediately via color-coded text and simple bars.
    *   *Steal this:* The minion dashboard should have a "glanceable" state. Green = working, Yellow = waiting, Red = error/stuck. No guesswork.
*   **FTL (Tactile Retro-Tech):**
    *   *Principle:* Chunky, satisfying UI. Progress bars are segmented, buttons look like physical console switches.
    *   *Steal this:* For the Cyberpunk or Deep Space themes, make buttons feel "clicky" (active state pushing down 2px, distinct hover borders).
*   **Factorio (Industrial Density & Tooltips):**
    *   *Principle:* Tooltips are the primary source of deep context. The screen is for the macro; the hover is for the micro.
    *   *Steal this:* Don't clutter the main minion cards. Put detailed logs, current reasoning, and task history in robust, fast-appearing tooltips or pop-overs.
