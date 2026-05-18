// ─── PixiAgentSprites.ts — PixiJS minion sprite drawing functions ─────────────
// Each function clears and redraws a container each frame.
// Minion bodies are rendered from real pixel-art PNG sprites (Agnes's art).
// Animated status effects (selection ring, sparks, zzz, etc.) remain procedural.

import { Container, Graphics, Sprite, Text, TextStyle, Assets, Texture } from 'pixi.js';

// ─── Sprite texture cache ─────────────────────────────────────────────────────
// Textures are loaded once and reused across all frames.

interface SpriteTextures {
  kevin: Texture | null;
  bob: Texture | null;
  fallback: Texture | null;  // minion-south-128.png for Grim/Stuart/Agnes
  loaded: boolean;
  loading: boolean;
}

const SPRITE_CACHE: SpriteTextures = {
  kevin: null,
  bob: null,
  fallback: null,
  loaded: false,
  loading: false,
};

/**
 * Pre-load all minion sprite textures. Call this once during app init.
 * Falls back silently if images fail to load (procedural fallback kicks in).
 */
export async function preloadMinionSprites(): Promise<void> {
  if (SPRITE_CACHE.loaded || SPRITE_CACHE.loading) return;
  SPRITE_CACHE.loading = true;
  try {
    const [kevin, bob, fallback] = await Promise.all([
      Assets.load('/assets/sprites/kevin-minion-128.png').catch(() => null),
      Assets.load('/assets/sprites/bob-minion-128.png').catch(() => null),
      Assets.load('/assets/sprites/minion-south-128.png').catch(() => null),
    ]);
    SPRITE_CACHE.kevin = kevin as Texture | null;
    SPRITE_CACHE.bob = bob as Texture | null;
    SPRITE_CACHE.fallback = fallback as Texture | null;
    SPRITE_CACHE.loaded = true;
  } catch {
    // silently continue — procedural fallback will be used
    SPRITE_CACHE.loaded = true;
  }
  SPRITE_CACHE.loading = false;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function statusBadge(g: Graphics, cx: number, cy: number, status: string) {
  if (status === 'active') {
    g.roundRect(cx - 22, cy - 56, 44, 12, 3).fill({ color: 0x003300, alpha: 0.85 });
    g.roundRect(cx - 22, cy - 56, 44, 12, 3).stroke({ color: 0x00ff88, alpha: 0.9, width: 1 });
  }
}

function selectedRing(g: Graphics, cx: number, cy: number, r: number, time: number) {
  const pulse = 0.5 + 0.5 * Math.sin(time * 3);
  g.circle(cx, cy + 2, r + 6).stroke({ color: 0xFFD700, alpha: 0.4 + 0.4 * pulse, width: 2 });
  g.circle(cx, cy + 2, r + 10).stroke({ color: 0xFFD700, alpha: 0.15 * pulse, width: 1 });
}

function groundShadow(g: Graphics, cx: number, cy: number) {
  g.ellipse(cx, cy + 16, 14, 5).fill({ color: 0x000000, alpha: 0.35 });
}

function sleepZzz(g: Graphics, cx: number, cy: number, time: number) {
  const bob = Math.sin(time * 0.8) * 2;
  const opacity = 0.45 + 0.3 * Math.sin(time * 1.2);
  g.circle(cx + 16, cy - 26 + bob, 3).fill({ color: 0xaaccff, alpha: opacity });
  g.circle(cx + 20, cy - 32 + bob, 4).fill({ color: 0xaaccff, alpha: opacity * 0.7 });
  g.circle(cx + 25, cy - 39 + bob, 5).fill({ color: 0xaaccff, alpha: opacity * 0.5 });
}

function activeSparks(g: Graphics, cx: number, cy: number, time: number, color: number) {
  const N = 5;
  for (let i = 0; i < N; i++) {
    const angle = (time * 2.2 + (i / N) * Math.PI * 2);
    const r = 22 + 4 * Math.sin(time * 3 + i);
    const sx = cx + Math.cos(angle) * r;
    const sy = cy + Math.sin(angle) * r * 0.5;
    g.circle(sx, sy, 1.5 + Math.sin(time * 4 + i) * 0.5).fill({ color, alpha: 0.7 });
  }
}

// ─── Pixel-art sprite renderer ────────────────────────────────────────────────
// Renders a PNG sprite centered at (cx, cy), scaled to targetHeight pixels.
// Uses nearest-neighbor for crisp pixel art.
// Returns true if the sprite was drawn, false if texture not ready.

function renderPNGSprite(
  container: Container,
  label: string,
  texture: Texture | null,
  cx: number,
  cy: number,
  targetHeight: number,
  bob: number = 0,
  tintColor?: number,
): boolean {
  if (!texture) return false;

  let sp = container.getChildByLabel(label) as Sprite | null;
  if (!sp) {
    sp = new Sprite(texture);
    sp.label = label;
    sp.anchor.set(0.5, 0.7); // anchor slightly below center for ground contact
    // Nearest-neighbor for pixel art crispness
    // (PixiJS v8: set on texture source)
    texture.source.scaleMode = 'nearest';
    container.addChildAt(sp, 0); // behind Graphics overlays
  }

  // Update position and scale each frame
  const scale = targetHeight / texture.height;
  sp.scale.set(scale);
  sp.x = cx;
  sp.y = cy + bob;
  if (tintColor !== undefined) sp.tint = tintColor;

  return true;
}

// ─── Sprite height configuration ─────────────────────────────────────────────
// Target render heights for each agent's sprite on the dungeon map
const SPRITE_HEIGHTS: Record<string, number> = {
  kevin:   52,  // kevin-minion-128.png (64x64 source) → 52px tall
  bob:     40,  // bob-minion-128.png (16x16 source) → 40px (upscaled pixel art)
  grim:    56,  // fallback (128x128) → 56px
  stuart:  48,  // fallback (128x128) → 48px
  agnes:   52,  // fallback (128x128) → 52px
};

// ─── Grim 🐉 ──────────────────────────────────────────────────────────────────
export function drawGrimSprite(
  container: Container,
  cx: number, cy: number,
  time: number,
  status: string,
  selected: boolean,
): void {
  let g = container.getChildByLabel('grim_g') as Graphics | null;
  if (!g) {
    g = new Graphics();
    g.label = 'grim_g';
    container.addChild(g);
  }
  g.clear();

  const bob = Math.sin(time * 1.4) * 2;
  const isActive = status === 'active';

  // Shadow
  groundShadow(g, cx, cy);

  // Selection ring
  if (selected) selectedRing(g, cx, cy, 20, time);

  // Try PNG sprite (fallback), else procedural Grim
  const spriteDrawn = renderPNGSprite(
    container, 'grim_sprite', SPRITE_CACHE.fallback,
    cx, cy, SPRITE_HEIGHTS.grim, bob,
  );

  if (!spriteDrawn) {
    // Procedural Grim (hooded dragon) — kept as fallback
    const by = cy + bob;

    // Wing silhouettes
    const wingFlap = Math.sin(time * 2) * 6;
    g.moveTo(cx - 14, by - 4).lineTo(cx - 34, by - 18 + wingFlap).lineTo(cx - 18, by - 2)
      .fill({ color: 0x330066, alpha: 0.75 });
    g.moveTo(cx + 14, by - 4).lineTo(cx + 34, by - 18 + wingFlap).lineTo(cx + 18, by - 2)
      .fill({ color: 0x330066, alpha: 0.75 });

    // Robe/body
    g.roundRect(cx - 13, by - 20, 26, 32, 6).fill({ color: 0x1a0033, alpha: 1 });
    g.moveTo(cx - 14, by - 20)
      .bezierCurveTo(cx - 12, by - 46, cx + 12, by - 46, cx + 14, by - 20)
      .fill({ color: 0x0d001a, alpha: 1 });

    // Eyes
    const eyePulse = 0.6 + 0.4 * Math.sin(time * 3.5);
    g.circle(cx - 5, by - 30, 3).fill({ color: 0xcc00ff, alpha: eyePulse });
    g.circle(cx + 5, by - 30, 3).fill({ color: 0xcc00ff, alpha: eyePulse });

    // Staff
    const staffX = cx + 18;
    g.rect(staffX - 1, by - 44, 2, 46).fill({ color: 0x553300, alpha: 1 });
    const orbPulse = 0.5 + 0.5 * Math.sin(time * 2.1);
    g.circle(staffX, by - 46, 6).fill({ color: 0x9900ff, alpha: 0.6 + 0.3 * orbPulse });
    g.circle(staffX, by - 46, 4).fill({ color: 0xcc66ff, alpha: 0.9 });
  }

  // Active sparks
  if (isActive) activeSparks(g, cx, cy - 10, time, 0xcc00ff);

  // Sleep Zzz when idle
  if (!isActive) sleepZzz(g, cx, cy, time);

  // Status badge text
  if (isActive) {
    statusBadge(g, cx, cy, status);
    let badgeText = container.getChildByLabel('grim_badge') as Text | null;
    if (!badgeText) {
      badgeText = new Text({ text: '● ACTIVE', style: new TextStyle({ fontSize: 7, fill: 0x00ff88, fontFamily: 'monospace' }) });
      badgeText.label = 'grim_badge';
      badgeText.anchor.set(0.5, 0.5);
      container.addChild(badgeText);
    }
    badgeText.x = cx;
    badgeText.y = cy - 50;
    badgeText.visible = true;
  } else {
    const bt = container.getChildByLabel('grim_badge') as Text | null;
    if (bt) bt.visible = false;
  }
}

// ─── Bob 📚 ──────────────────────────────────────────────────────────────────
export function drawBobSprite(
  container: Container,
  cx: number, cy: number,
  time: number,
  status: string,
  selected: boolean,
): void {
  let g = container.getChildByLabel('bob_g') as Graphics | null;
  if (!g) {
    g = new Graphics();
    g.label = 'bob_g';
    container.addChild(g);
  }
  g.clear();

  const bob2 = Math.sin(time * 1.2) * 2;
  const isActive = status === 'active';

  groundShadow(g, cx, cy);
  if (selected) selectedRing(g, cx, cy, 18, time);

  // Try Bob's real pixel-art sprite (bob-minion-128.png, 16x16 source → upscaled)
  const spriteDrawn = renderPNGSprite(
    container, 'bob_sprite', SPRITE_CACHE.bob,
    cx, cy, SPRITE_HEIGHTS.bob, bob2,
  );

  if (!spriteDrawn) {
    // Procedural Bob fallback
    const by = cy + bob2;
    g.roundRect(cx - 14, by - 18, 28, 26, 10).fill({ color: 0xf5cc00, alpha: 1 });
    g.ellipse(cx, by + 4, 12, 7).fill({ color: 0xf0bb00, alpha: 0.7 });
    g.roundRect(cx - 12, by - 36, 24, 22, 9).fill({ color: 0xf5cc00, alpha: 1 });
    g.roundRect(cx - 12, by - 8, 24, 18, 4).fill({ color: 0x3355bb, alpha: 0.85 });
    g.rect(cx - 6, by - 18, 4, 12).fill({ color: 0x3355bb, alpha: 0.85 });
    g.rect(cx + 2, by - 18, 4, 12).fill({ color: 0x3355bb, alpha: 0.85 });
    g.circle(cx, by - 26, 8).fill({ color: 0x222222, alpha: 1 });
    g.circle(cx, by - 26, 6).fill({ color: 0x88ddff, alpha: 0.9 });
    g.circle(cx, by - 26, 4).fill({ color: 0x44aadd, alpha: 1 });
    g.circle(cx - 2, by - 28, 2).fill({ color: 0xffffff, alpha: 0.7 });
    g.circle(cx, by - 26, 8).stroke({ color: 0x555555, alpha: 1, width: 1.5 });
  }

  if (isActive) activeSparks(g, cx, cy - 10, time, 0x3355bb);
  if (!isActive) sleepZzz(g, cx, cy, time);

  if (isActive) {
    statusBadge(g, cx, cy, status);
    let badgeText = container.getChildByLabel('bob_badge') as Text | null;
    if (!badgeText) {
      badgeText = new Text({ text: '● ACTIVE', style: new TextStyle({ fontSize: 7, fill: 0x00ff88, fontFamily: 'monospace' }) });
      badgeText.label = 'bob_badge';
      badgeText.anchor.set(0.5, 0.5);
      container.addChild(badgeText);
    }
    badgeText.x = cx;
    badgeText.y = cy - 50;
    badgeText.visible = true;
  } else {
    const bt = container.getChildByLabel('bob_badge') as Text | null;
    if (bt) bt.visible = false;
  }
}

// ─── Kevin 🔧 ─────────────────────────────────────────────────────────────────
export function drawKevinSprite(
  container: Container,
  cx: number, cy: number,
  time: number,
  status: string,
  selected: boolean,
): void {
  let g = container.getChildByLabel('kevin_g') as Graphics | null;
  if (!g) {
    g = new Graphics();
    g.label = 'kevin_g';
    container.addChild(g);
  }
  g.clear();

  const isActive = status === 'active';
  // Stumble: every ~15s for 1.5s
  const cycle = time % 15;
  const isStumbling = isActive && cycle < 1.5;
  const stumbleSine = isStumbling ? Math.sin(cycle * Math.PI / 1.5) : 0;
  const dropY = isStumbling ? stumbleSine * 8 : 0;

  const bob2 = isStumbling ? 0 : Math.sin(time * 1.3) * 2;

  groundShadow(g, cx, cy);
  if (selected) selectedRing(g, cx, cy, 18, time);

  // Kevin's real pixel-art sprite (kevin-minion-128.png, 64x64 source)
  const spriteDrawn = renderPNGSprite(
    container, 'kevin_sprite', SPRITE_CACHE.kevin,
    cx, cy, SPRITE_HEIGHTS.kevin, bob2 + dropY,
  );

  if (!spriteDrawn) {
    // Procedural Kevin fallback
    const by = cy + bob2 + dropY;
    const tx = isStumbling ? stumbleSine * 10 : 0;

    g.roundRect(cx - 11 + tx * 0.3, by - 22, 22, 30, 8).fill({ color: 0xf5cc00, alpha: 1 });
    g.roundRect(cx - 10 + tx, by - 44, 20, 24, 8).fill({ color: 0xf5cc00, alpha: 1 });
    g.roundRect(cx - 10 + tx * 0.3, by - 12, 20, 20, 4).fill({ color: 0x225522, alpha: 0.9 });
    g.rect(cx - 5 + tx * 0.3, by - 22, 4, 12).fill({ color: 0x225522, alpha: 0.9 });
    g.rect(cx + 1 + tx * 0.3, by - 22, 4, 12).fill({ color: 0x225522, alpha: 0.9 });

    // Two goggle eyes
    g.circle(cx - 5 + tx, by - 34, 5).fill({ color: 0x222222, alpha: 1 });
    g.circle(cx - 5 + tx, by - 34, 3.5).fill({ color: 0x88ddaa, alpha: 0.9 });
    g.circle(cx + 5 + tx, by - 34, 5).fill({ color: 0x222222, alpha: 1 });
    g.circle(cx + 5 + tx, by - 34, 3.5).fill({ color: 0x88ddaa, alpha: 0.9 });
    g.circle(cx - 6 + tx, by - 36, 1.5).fill({ color: 0xffffff, alpha: 0.7 });
    g.circle(cx + 4 + tx, by - 36, 1.5).fill({ color: 0xffffff, alpha: 0.7 });

    // Hard hat
    g.roundRect(cx - 12 + tx, by - 50, 24, 8, 4).fill({ color: 0xffcc00, alpha: 1 });
    g.rect(cx - 14 + tx, by - 44, 28, 4).fill({ color: 0xffcc00, alpha: 1 });

    // Wrench
    const wx = cx + 18;
    const wy = by - 16;
    g.roundRect(wx - 2, wy - 12, 4, 20, 2).fill({ color: 0xaaaaaa, alpha: 1 });
    g.roundRect(wx - 5, wy - 14, 10, 5, 2).fill({ color: 0x888888, alpha: 1 });
    g.roundRect(wx - 5, wy + 6, 10, 5, 2).fill({ color: 0x888888, alpha: 1 });
  }

  if (isActive) activeSparks(g, cx, cy - 10, time, 0x225522);
  if (!isActive) sleepZzz(g, cx, cy, time);

  if (isActive) {
    statusBadge(g, cx, cy, status);
    let badgeText = container.getChildByLabel('kevin_badge') as Text | null;
    if (!badgeText) {
      badgeText = new Text({ text: '● ACTIVE', style: new TextStyle({ fontSize: 7, fill: 0x00ff88, fontFamily: 'monospace' }) });
      badgeText.label = 'kevin_badge';
      badgeText.anchor.set(0.5, 0.5);
      container.addChild(badgeText);
    }
    badgeText.x = cx;
    badgeText.y = cy - 50;
    badgeText.visible = true;
  } else {
    const bt = container.getChildByLabel('kevin_badge') as Text | null;
    if (bt) bt.visible = false;
  }
}

// ─── Agnes 🎨 ────────────────────────────────────────────────────────────────
export function drawAgnesSprite(
  container: Container,
  cx: number, cy: number,
  time: number,
  status: string,
  selected: boolean,
): void {
  let g = container.getChildByLabel('agnes_g') as Graphics | null;
  if (!g) {
    g = new Graphics();
    g.label = 'agnes_g';
    container.addChild(g);
  }
  g.clear();

  const isActive = status === 'active';
  const bob2 = Math.sin(time * 1.25) * 2;

  groundShadow(g, cx, cy);
  if (selected) selectedRing(g, cx, cy, 18, time);

  // Agnes uses the fallback generic minion sprite (minion-south-128.png)
  const spriteDrawn = renderPNGSprite(
    container, 'agnes_sprite', SPRITE_CACHE.fallback,
    cx, cy, SPRITE_HEIGHTS.agnes, bob2,
    0xFFBBDD, // pink tint to differentiate Agnes
  );

  if (!spriteDrawn) {
    // Procedural Agnes fallback
    const by = cy + bob2;
    g.roundRect(cx - 11, by - 20, 22, 28, 9).fill({ color: 0xf5cc00, alpha: 1 });
    g.roundRect(cx - 10, by - 38, 20, 22, 8).fill({ color: 0xf5cc00, alpha: 1 });
    g.roundRect(cx - 11, by - 10, 22, 18, 4).fill({ color: 0xff66aa, alpha: 0.85 });
    g.rect(cx - 6, by - 20, 4, 12).fill({ color: 0xff66aa, alpha: 0.85 });
    g.rect(cx + 2, by - 20, 4, 12).fill({ color: 0xff66aa, alpha: 0.85 });

    // Two goggle eyes
    g.circle(cx - 5, by - 28, 5).fill({ color: 0x222222, alpha: 1 });
    g.circle(cx - 5, by - 28, 3.5).fill({ color: 0xff99cc, alpha: 0.9 });
    g.circle(cx + 5, by - 28, 5).fill({ color: 0x222222, alpha: 1 });
    g.circle(cx + 5, by - 28, 3.5).fill({ color: 0xff99cc, alpha: 0.9 });
    g.circle(cx - 6, by - 30, 1.5).fill({ color: 0xffffff, alpha: 0.7 });
    g.circle(cx + 4, by - 30, 1.5).fill({ color: 0xffffff, alpha: 0.7 });

    // Beret
    g.ellipse(cx + 2, by - 40, 11, 6).fill({ color: 0xcc2255, alpha: 1 });
    g.circle(cx + 10, by - 42, 3).fill({ color: 0xee3366, alpha: 1 });
  }

  if (isActive) activeSparks(g, cx, cy - 10, time, 0xff66aa);
  if (!isActive) sleepZzz(g, cx, cy, time);

  if (isActive) {
    statusBadge(g, cx, cy, status);
    let badgeText = container.getChildByLabel('agnes_badge') as Text | null;
    if (!badgeText) {
      badgeText = new Text({ text: '● ACTIVE', style: new TextStyle({ fontSize: 7, fill: 0x00ff88, fontFamily: 'monospace' }) });
      badgeText.label = 'agnes_badge';
      badgeText.anchor.set(0.5, 0.5);
      container.addChild(badgeText);
    }
    badgeText.x = cx;
    badgeText.y = cy - 50;
    badgeText.visible = true;
  } else {
    const bt = container.getChildByLabel('agnes_badge') as Text | null;
    if (bt) bt.visible = false;
  }
}

// ─── Stuart 💰 ────────────────────────────────────────────────────────────────
export function drawStuartSprite(
  container: Container,
  cx: number, cy: number,
  time: number,
  status: string,
  selected: boolean,
): void {
  let g = container.getChildByLabel('stuart_g') as Graphics | null;
  if (!g) {
    g = new Graphics();
    g.label = 'stuart_g';
    container.addChild(g);
  }
  g.clear();

  const isActive = status === 'active';
  const bob2 = Math.sin(time * 1.1) * 2;

  groundShadow(g, cx, cy);
  if (selected) selectedRing(g, cx, cy, 17, time);

  // Stuart uses the fallback generic minion sprite (minion-south-128.png)
  const spriteDrawn = renderPNGSprite(
    container, 'stuart_sprite', SPRITE_CACHE.fallback,
    cx, cy, SPRITE_HEIGHTS.stuart, bob2,
    0xFFEEAA, // golden tint for Stuart the treasurer
  );

  if (!spriteDrawn) {
    // Procedural Stuart fallback
    const by = cy + bob2;
    g.roundRect(cx - 11, by - 20, 22, 28, 9).fill({ color: 0xf5cc00, alpha: 1 });
    g.roundRect(cx - 10, by - 38, 20, 22, 8).fill({ color: 0xf5cc00, alpha: 1 });
    g.roundRect(cx - 10, by - 10, 20, 18, 4).fill({ color: 0x6633aa, alpha: 0.9 });
    g.rect(cx - 5, by - 20, 4, 12).fill({ color: 0x6633aa, alpha: 0.9 });
    g.rect(cx + 1, by - 20, 4, 12).fill({ color: 0x6633aa, alpha: 0.9 });

    // Single goggle eye
    g.circle(cx, by - 28, 7).fill({ color: 0x222222, alpha: 1 });
    g.circle(cx, by - 28, 5).fill({ color: 0xaaeeaa, alpha: 0.9 });
    g.circle(cx, by - 28, 3).fill({ color: 0x66cc66, alpha: 1 });
    g.circle(cx - 2, by - 30, 2).fill({ color: 0xffffff, alpha: 0.6 });
    g.circle(cx, by - 28, 7).stroke({ color: 0x555555, alpha: 1, width: 1.5 });

    // Spinning coin
    const coinAngle = time * 3.5;
    const coinX = cx + 18;
    const coinY = by - 12;
    const coinW = Math.abs(Math.cos(coinAngle)) * 8 + 2;
    g.ellipse(coinX, coinY, coinW, 9).fill({ color: 0xFFD700, alpha: 0.95 });
    g.ellipse(coinX, coinY, coinW, 9).stroke({ color: 0xcc9900, alpha: 0.8, width: 1 });
  }

  if (isActive) activeSparks(g, cx, cy - 10, time, 0xFFD700);
  if (!isActive) sleepZzz(g, cx, cy, time);

  if (isActive) {
    statusBadge(g, cx, cy, status);
    let badgeText = container.getChildByLabel('stuart_badge') as Text | null;
    if (!badgeText) {
      badgeText = new Text({ text: '● ACTIVE', style: new TextStyle({ fontSize: 7, fill: 0x00ff88, fontFamily: 'monospace' }) });
      badgeText.label = 'stuart_badge';
      badgeText.anchor.set(0.5, 0.5);
      container.addChild(badgeText);
    }
    badgeText.x = cx;
    badgeText.y = cy - 50;
    badgeText.visible = true;
  } else {
    const bt = container.getChildByLabel('stuart_badge') as Text | null;
    if (bt) bt.visible = false;
  }
}
