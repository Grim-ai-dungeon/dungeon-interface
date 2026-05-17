# Space Dungeon: Asset Strategy & Requirements

## 1. Aesthetic & Style Recommendation
**Recommendation:** **Crisp High-Res 2D / Retro-Futuristic Clean**
Given the Overlord prefers "less blocky art" (moving away from strict low-res 8-bit/16-bit pixel art), the ideal style is crisp, high-resolution 2D with a clean "Control Center" aesthetic. Think "Dark UI, glowing neon, clean vector lines, and detailed 2D digital painting for portraits."
*   **Alternative:** "HD-2D" or isometric pre-rendered 3D style, which offers depth without pixelation.
*   **Vibe:** Dark mode, terminal green/blue/amber accents, metallic textures, holographic overlays.

## 2. Asset Categories Needed Next
*   **UI & Overlays:** The core shell of the game. Terminal borders, modular windows, holographic panels, CRT scanline effects, hazard borders.
*   **Icons (Action & Resources):** Minimalist glowing icons (Energy, Minerals, Oxygen, Minions, Attack, Defend, Build).
*   **Map Tiles (Environments):** Base floor grids (hex or square), metallic walls, airlocks, power conduits, dark space voids.
*   **Portraits & Sprites:** High-res avatars for the Overlord, Grim, and Minions (e.g., in little spacesuits or mech gear), plus enemy/alien portraits.
*   **Ambient FX:** Glowing holograms, pulsing alarms, engine exhaust particles, floating space debris.
*   **Audio (Sounds):** Deep ship hum (ambient), UI confirmation blips, alarm klaxons, mechanical door whooshes.

## 3. Specific Style & Size Guidance
*   **Portraits:** 512x512 or 1024x1024 (PNG). Transparent backgrounds. Clean, thick outer silhouettes.
*   **Icons:** 128x128 or 256x256 (PNG/SVG). Two-tone (e.g., cyan and white).
*   **Map Tiles:** 256x256 (PNG). Seamless tiling. Top-down or slight isometric angle (stick to one perspective consistently).
*   **UI Frames:** 9-slice scalable assets. Dark grey/black with colored 1px/2px borders.
*   **Overlays:** 1920x1080 (PNG/WebP with alpha) for full-screen effects like CRT scanlines, vignette, or static.

## 4. AI Generation Prompts & Workflows
**Workflow:** Use Midjourney (v6) or Blackvault Stable Diffusion pipelines for high-quality base generation, then remove backgrounds using tools like Photoroom/Clipdrop, and assemble in an image editor.

*   **For Portraits (Minions/Characters):**
    > "Stylized high-res 2D game portrait of a sci-fi minion wearing a bulky spacesuit, cyberpunk lighting, dark background, clean lines, crisp digital illustration, ui avatar, rim lighting, concept art --v 6.0"
*   **For UI Elements:**
    > "Sci-fi game UI frame, metallic dark panel, glowing neon blue accents, clean crisp vector style, control room interface, high-tech, isolated on black background --v 6.0"
*   **For Map Tiles:**
    > "Top-down sci-fi space station floor tile, dark metallic grating, yellow hazard stripes, clean 2d game art, high resolution, --tile --v 6.0"
*   **For Icons:**
    > "Flat vector icon of a futuristic laser blaster, glowing cyan lines, dark background, minimalist sci-fi UI icon, clean, simple --v 6.0"

## 5. Prioritized Asset Checklist
1. [ ] **Core UI Theme:** 1 main background (space void), 3 window frames (solid, transparent, modal), 1 CRT scanline overlay.
2. [ ] **Resource Icons:** Power/Energy, Minions (population), Credits/Metal.
3. [ ] **Basic Tileset:** Floor tile, wall tile, door/airlock.
4. [ ] **Character Avatars:** 1 Overlord portrait, 1 Grim portrait, 3 Minion variant portraits.
5. [ ] **Ambient Audio:** 1 looping background track (deep space hum), 3 UI SFX (click, error, success).
