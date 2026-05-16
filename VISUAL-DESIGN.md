# Dungeon Interface — Visual Design Document

This document serves as the blueprint for Phase 1 (Visual Polish) of the Dungeon Interface. Kevin will use this guide to implement procedural visuals and atmospheric effects directly in Canvas2D without any external assets.

---

## 1. Top-Down Dungeon Art Aesthetics

To achieve a satisfying, dark theatrical "Dungeon Master" atmosphere (inspired by D&D VTTs like FoundryVTT, classic roguelikes, and deep dungeon crawlers), the visual design should aim for a "clean but gritty" look.

**Key Aesthetic References:**
- **Color Palette & Contrast:** Deep, muted grays and purples for shadows, with high-contrast, vibrant, warm accents for lighting (torches, magic).
- **Proportions:** Orthogonal 2D top-down (true top-down, not 3/4 isometric). Walls should be distinct boundaries with visible thickness.
- **Lighting:** Heavy reliance on "Fog of War" and dynamic lighting. Unlit areas are near-black or deep blue/purple, while lit areas reveal texture and color.
- **Texture Style:** Procedural pixel-art or painterly feel. Since we are using Canvas2D procedural generation, we will simulate this using layered noise, stroke variations, and slight random offsets to break up rigid grids.

---

## 2. Procedural Tile Generation Techniques (Canvas2D)

No external images. We use Canvas2D drawing primitives and procedural math (like noise and grid jitter) to create tiles.

### 2.1 Stone Brick Floors
Instead of flat gray rectangles, bricks should have:
- **Base Color:** Dark cool gray.
- **Variation:** Random slight variations in HSL brightness per brick.
- **Grout Lines:** Thin, darker lines separating bricks.
- **Imperfections:** Small dots or short arcs drawn on the bricks to simulate pitting.

**Algorithm Sketch:**
```typescript
function drawStoneFloor(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, seed: number) {
  const brickWidth = 32;
  const brickHeight = 16;
  const rows = Math.ceil(height / brickHeight);
  const cols = Math.ceil(width / brickWidth);
  
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2 === 0) ? 0 : brickWidth / 2;
    for (let c = -1; c < cols; c++) {
      const bx = x + c * brickWidth + offset;
      const by = y + r * brickHeight;
      
      // Pseudo-random shade based on position
      const shade = 30 + Math.abs(Math.sin(r * 12.3 + c * 45.6)) * 15;
      
      ctx.fillStyle = `hsl(220, 10%, ${shade}%)`;
      ctx.fillRect(bx, by, brickWidth - 1, brickHeight - 1); // -1 for grout
      
      // Add a highlight edge (top/left) and shadow edge (bottom/right)
      ctx.fillStyle = `rgba(255,255,255,0.1)`;
      ctx.fillRect(bx, by, brickWidth - 1, 1);
      ctx.fillStyle = `rgba(0,0,0,0.4)`;
      ctx.fillRect(bx, by + brickHeight - 2, brickWidth - 1, 1);
      
      // Optional: draw small noise dots
    }
  }
}
```

### 2.2 Wooden Doors & Planks
- **Color:** Warm dark brown.
- **Grain:** Draw multiple thin, slightly wavy lines of a darker brown across the plank length.
- **Iron Bands/Rivets:** Draw dark gray rectangles at the edges with a small metallic dot (rivet) inside.

---

## 3. Sprite Design Patterns (Canvas2D)

Agents are represented as small (~32-48px) top-down sprites using simple geometric shapes that evoke the "minion" aesthetic.

### 3.1 Minion Base Form
- **Body:** Capsule shape (pill).
- **Features:** A prominent single or double goggle/eye drawn as a white circle with a gray border and black pupil.
- **Color:** Yellow base, with distinct colored overalls (e.g., blue).

**Drawing the Minion Capsule:**
```typescript
function drawMinion(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, eyeCount: number) {
  // Body
  ctx.fillStyle = '#fce029'; // Minion Yellow
  ctx.beginPath();
  ctx.roundRect(x - 12, y - 16, 24, 32, 12);
  ctx.fill();
  
  // Overalls
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x - 12, y, 24, 16, {bl: 12, br: 12, tl: 0, tr: 0});
  ctx.fill();
  
  // Eyes / Goggles
  ctx.fillStyle = '#ccc';
  ctx.beginPath();
  if (eyeCount === 1) {
    ctx.arc(x, y - 6, 8, 0, Math.PI * 2);
  } else {
    ctx.arc(x - 5, y - 6, 6, 0, Math.PI * 2);
    ctx.arc(x + 5, y - 6, 6, 0, Math.PI * 2);
  }
  ctx.fill();
  
  // Pupils
  ctx.fillStyle = '#000';
  if (eyeCount === 1) ctx.arc(x, y - 6, 3, 0, Math.PI * 2);
  else {
    ctx.arc(x - 5, y - 6, 2, 0, Math.PI * 2);
    ctx.arc(x + 5, y - 6, 2, 0, Math.PI * 2);
  }
  ctx.fill();
}
```

### 3.2 Animations & Status
- **Idle:** Slow vertical bob (sin wave applied to Y offset over time).
- **Working/Thinking:** Rapid slight shaking (random tiny X/Y offsets) or a rotating "gear/loading" arc above their head.
- **Status Indicators:** 
  - *Sleeping/Idle:* Floating "Zzz" particles moving upward.
  - *Active:* A soft glowing aura ring beneath the sprite.
  - *Error/Stuck:* A red exclamation mark `!` pulsing above.

---

## 4. Atmospheric Effects

### 4.1 Torch Flicker Algorithm
Combine multiple sine waves running at different, non-harmonic frequencies to create natural, unpredictable brightness and radius flutter.

```typescript
// Call every frame with elapsed time (t)
function getTorchIntensity(t: number): number {
    const base = 0.8;
    // Layered noise
    const wave1 = Math.sin(t * 0.01) * 0.1;
    const wave2 = Math.sin(t * 0.023) * 0.05;
    const wave3 = Math.random() * 0.05; // Micro-flicker
    return base + wave1 + wave2 + wave3;
}

// Draw the light using radial gradients with globalCompositeOperation = 'screen' or 'lighter'
function drawTorchLight(ctx, x, y, radius, intensity, colorStr) {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius * intensity);
    grad.addColorStop(0, `rgba(${colorStr}, 0.8)`);
    grad.addColorStop(0.4, `rgba(${colorStr}, 0.3)`);
    grad.addColorStop(1, `rgba(${colorStr}, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
    ctx.fill();
}
```

### 4.2 Fog of War / Shadow Casting
For a 2D Canvas without WebGL:
1. Draw the base map (floors, walls) to an offscreen canvas.
2. Fill the main canvas with semi-transparent black `rgba(0,0,0, 0.85)` (Fog).
3. Set `ctx.globalCompositeOperation = 'destination-out'`.
4. Draw radial gradients (opaque at center to transparent at edge) over the lights. This "punches holes" through the darkness to reveal the map.
5. Reset composite operation to `source-over` and draw entities (agents, particles) that are inside the lit areas.

### 4.3 Ambient Particles
- Dust motes: Tiny 1x1 or 2x2 squares with low alpha (0.1 - 0.3), drifting slowly upwards and drifting side-to-side (sine wave X movement).
- Sparks near torches: Bright orange/yellow pixels shooting rapidly upward and fading out quickly.

---

## 5. Room Decoration Ideas

Use procedural shapes to represent agent-specific props:

- **Grim's Chamber (The DM):** 
  - *Throne:* A large, ornate chair shape (dark reds/purples, gold trim).
  - *Runes:* Floor circle with pulsing glowing lines (use `ctx.setLineDash` and stroke).
  - *Orbs:* Floating spheres casting blue/purple light.

- **Bob's Library (Research):** 
  - *Bookshelves:* Long rectangles filled with small, colorful vertical strips (books).
  - *Scrolls:* White rectangles rolled at ends, scattered on desks.
  - *Glow:* Soft, steady yellow light (lamp/candle style).

- **Kevin's Workshop (Systems/Code):** 
  - *Anvil/Workbench:* Heavy iron gray block.
  - *Mechanisms:* Rotating gears (drawn with circles and radiating spokes).
  - *Sparks:* Active spark particle emitter when Kevin is "working".

- **Stuart's Treasury (Stats/Tokens):** 
  - *Gold Piles:* Clusters of yellow/orange overlapping circles.
  - *Chests:* Brown rectangles with metallic borders and keyholes.

---

## 6. Color Palette

Use these specific hex codes for a cohesive, rich atmosphere:

| Element | Hex Code | Description |
|---|---|---|
| **Deep Shadows (Fog)** | `#0B0C10` | Very dark, cold gray/blue for unlit areas. |
| **Floor Base** | `#1F2833` | Dark slate gray for stone tiles. |
| **Wall Base** | `#2C3539` | Slightly lighter, warmer stone for walls to pop. |
| **Torch Light/Fire** | `#FFA700` | Warm, vibrant orange-gold. `rgba(255, 167, 0, alpha)` |
| **Magic/Grim Glow** | `#8A2BE2` | Blue violet / purple for arcane elements. |
| **System/Data Glow** | `#45A29E` | Cool teal / cyan for tech or computer interfaces. |
| **Accent/Gold** | `#F3E0BE` | Soft gold for treasure and highlights. |

---

## 7. UI/UX for the Side Panel

The side panel (Agent Details) should break away from standard sterile web UI and embrace the dungeon theme.

- **Background:** Parchment or dark stone texture.
  - *Procedural Parchment:* Fill with a base tan color (`#D2B48C`), then draw random, highly transparent brown splatters/noise over it.
- **Borders:** "Wrought iron" borders — thick, dark gray/black borders with simple corner flourishes (e.g., small squares or diamonds at the corners).
- **Typography:**
  - *Headers:* A fantasy or serif font (e.g., 'Cinzel', 'Merriweather', or a generic `Georgia, serif`) in dark brown or gold.
  - *Body Text:* Readable sans-serif or clean serif (`Arial`, `Times New Roman`) in dark charcoal (`#222`) if on parchment, or light gray (`#CCC`) if on dark stone.
- **Layout:** Vertical scroll. 
  - Header: Agent Avatar + Name + Title.
  - Badges: Health/Status (Mana/Tokens).
  - Action Buttons: Styled like physical buttons or wax seals.

---

## 8. Reference: Tauri + OpenClaw API Integration

To make the Dungeon Interface functional, the Tauri frontend needs to communicate with the local OpenClaw gateway.

### 8.1 Connecting to the Gateway
The OpenClaw gateway runs locally at `http://localhost:18789`.
The frontend can interact with it using standard `fetch` API or WebSocket.

### 8.2 Key Endpoints
*Note: Since the Tauri app runs locally on the same machine, it can bypass CORS and reach the gateway directly.*

1. **Status & Activity (Polling or Event Stream):**
   - Check gateway status: `GET /` or `GET /health` (if implemented).
   - *Better approach for real-time:* Research OpenClaw's WebSocket endpoint for streaming session transcripts or agent state changes. If WebSocket isn't exposed, poll the agent's task state or memory files.

2. **Reading Memory/State:**
   - The Gateway has tools to read files. You can use the `default_api:read` tool via the API (if exposed), or simply use Tauri's native `fs` module to directly read `/home/ubuntu/.openclaw/workspace/memory/` and `heartbeat-state.json` to get agent status and token usage without hitting the HTTP API. 
   - **Tauri Native FS is preferred:** `import { readTextFile } from '@tauri-apps/api/fs';`

3. **Sending Messages / Dispatching Tasks:**
   - To send a chat to Grim, you hit the chat/completion endpoint of the Gateway.
   - Example REST payload to OpenClaw (assuming standard completion schema):
     ```json
     POST /api/chat
     {
       "message": "Grim, tell Bob to research X",
       "channel": "dungeon-app",
       "session": "main"
     }
     ```
   - (The exact path depends on your local OpenClaw router setup, typically `/v1/chat/completions` mimicking OpenAI, or a custom webhook).

4. **Tauri IPC (Inter-Process Communication):**
   - For complex tasks (like executing commands or launching a new agent), write Rust commands in Tauri's `src-tauri/src/main.rs` that use `std::process::Command` to run `openclaw ...` CLI commands, then invoke them from React:
     ```typescript
     import { invoke } from '@tauri-apps/api/tauri';
     
     // Tell Rust to spawn a subagent via CLI
     await invoke('spawn_minion', { task: "Fix the thing" });
     ```

This multi-layer approach (Tauri FS for reading state instantly + Tauri Rust commands for dispatching CLI actions + direct fetch for API) provides the most robust integration.
