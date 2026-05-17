// ─── PixiAgentSprites.ts — PixiJS minion sprite drawing functions ─────────────
// Each function clears and redraws a container each frame.
// All use PixiJS Graphics API (v8).

import { Container, Graphics, Text, TextStyle } from 'pixi.js';

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
  const by = cy + bob;

  // Shadow
  groundShadow(g, cx, cy);

  // Selection ring
  if (selected) selectedRing(g, cx, cy, 20, time);

  // Wing silhouettes
  const wingFlap = Math.sin(time * 2) * 6;
  g.moveTo(cx - 14, by - 4).lineTo(cx - 34, by - 18 + wingFlap).lineTo(cx - 18, by - 2)
    .fill({ color: 0x330066, alpha: 0.75 });
  g.moveTo(cx + 14, by - 4).lineTo(cx + 34, by - 18 + wingFlap).lineTo(cx + 18, by - 2)
    .fill({ color: 0x330066, alpha: 0.75 });

  // Robe/body
  g.roundRect(cx - 13, by - 20, 26, 32, 6).fill({ color: 0x1a0033, alpha: 1 });

  // Hood
  g.moveTo(cx - 14, by - 20)
    .bezierCurveTo(cx - 12, by - 46, cx + 12, by - 46, cx + 14, by - 20)
    .fill({ color: 0x0d001a, alpha: 1 });

  // Eyes — glowing pulsing
  const eyePulse = 0.6 + 0.4 * Math.sin(time * 3.5);
  g.circle(cx - 5, by - 30, 3).fill({ color: 0xcc00ff, alpha: eyePulse });
  g.circle(cx + 5, by - 30, 3).fill({ color: 0xcc00ff, alpha: eyePulse });
  g.circle(cx - 5, by - 30, 1.5).fill({ color: 0xffffff, alpha: 0.9 });
  g.circle(cx + 5, by - 30, 1.5).fill({ color: 0xffffff, alpha: 0.9 });

  // Staff
  const staffX = cx + 18;
  g.rect(staffX - 1, by - 44, 2, 46).fill({ color: 0x553300, alpha: 1 });
  // Crystal orb
  const orbPulse = 0.5 + 0.5 * Math.sin(time * 2.1);
  g.circle(staffX, by - 46, 6).fill({ color: 0x9900ff, alpha: 0.6 + 0.3 * orbPulse });
  g.circle(staffX, by - 46, 4).fill({ color: 0xcc66ff, alpha: 0.9 });
  g.circle(staffX - 1, by - 48, 2).fill({ color: 0xffffff, alpha: 0.7 });

  // Magic aura around orb
  g.circle(staffX, by - 46, 9 + 3 * orbPulse).stroke({ color: 0x9900ff, alpha: 0.3 * orbPulse, width: 1.5 });

  // Belt
  g.rect(cx - 13, by + 4, 26, 4).fill({ color: 0x551100, alpha: 1 });
  g.circle(cx, by + 6, 3).fill({ color: 0xFFD700, alpha: 1 });

  // Active sparks
  if (isActive) activeSparks(g, cx, by - 10, time, 0xcc00ff);

  // Sleep Zzz when idle
  if (!isActive) sleepZzz(g, cx, by, time);

  // Status badge text (rendered as Graphics shape + Text child)
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
  const by = cy + bob2;

  groundShadow(g, cx, cy);
  if (selected) selectedRing(g, cx, cy, 18, time);

  // Chunky yellow capsule body (width 28, height 26) with belly bulge
  g.roundRect(cx - 14, by - 18, 28, 26, 10).fill({ color: 0xf5cc00, alpha: 1 });
  // Belly bulge
  g.ellipse(cx, by + 4, 12, 7).fill({ color: 0xf0bb00, alpha: 0.7 });
  // Head (capsule)
  g.roundRect(cx - 12, by - 36, 24, 22, 9).fill({ color: 0xf5cc00, alpha: 1 });

  // Blue overalls
  g.roundRect(cx - 12, by - 8, 24, 18, 4).fill({ color: 0x3355bb, alpha: 0.85 });
  // Overall straps
  g.rect(cx - 6, by - 18, 4, 12).fill({ color: 0x3355bb, alpha: 0.85 });
  g.rect(cx + 2, by - 18, 4, 12).fill({ color: 0x3355bb, alpha: 0.85 });

  // Single goggle eye (large)
  g.circle(cx, by - 26, 8).fill({ color: 0x222222, alpha: 1 });
  g.circle(cx, by - 26, 6).fill({ color: 0x88ddff, alpha: 0.9 });
  g.circle(cx, by - 26, 4).fill({ color: 0x44aadd, alpha: 1 });
  g.circle(cx - 2, by - 28, 2).fill({ color: 0xffffff, alpha: 0.7 });
  // Goggle rim
  g.circle(cx, by - 26, 8).stroke({ color: 0x555555, alpha: 1, width: 1.5 });

  // Magnifying glass
  const mgx = cx + 16;
  const mgy = by - 14 + Math.sin(time * 1.8) * 3;
  g.circle(mgx, mgy, 7).stroke({ color: 0xaaaaaa, alpha: 1, width: 2 });
  g.circle(mgx, mgy, 5).fill({ color: 0x88ccff, alpha: 0.35 });
  g.rect(mgx + 5, mgy + 4, 8, 2).fill({ color: 0x887755, alpha: 1 });

  // Legs
  g.roundRect(cx - 10, by + 8, 8, 10, 3).fill({ color: 0xf5cc00, alpha: 1 });
  g.roundRect(cx + 2, by + 8, 8, 10, 3).fill({ color: 0xf5cc00, alpha: 1 });
  // Shoes
  g.ellipse(cx - 6, by + 18, 6, 3).fill({ color: 0x333333, alpha: 1 });
  g.ellipse(cx + 6, by + 18, 6, 3).fill({ color: 0x333333, alpha: 1 });

  if (isActive) activeSparks(g, cx, by - 10, time, 0x3355bb);
  if (!isActive) sleepZzz(g, cx, by, time);

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
  const tilt = isStumbling ? Math.sin(cycle * Math.PI / 1.5) * 18 : 0;
  const dropY = isStumbling ? Math.sin(cycle * Math.PI / 1.5) * 8 : 0;

  const bob2 = isStumbling ? 0 : Math.sin(time * 1.3) * 2;
  const by = cy + bob2 + dropY;

  groundShadow(g, cx, cy);
  if (selected) selectedRing(g, cx, cy, 18, time);

  // Apply tilt rotation via transform — we approximate it by shifting manually
  const tx = Math.sin(tilt * Math.PI / 180) * 10;

  // Tall capsule body
  g.roundRect(cx - 11 + tx * 0.3, by - 22, 22, 30, 8).fill({ color: 0xf5cc00, alpha: 1 });
  // Head (taller than Bob)
  g.roundRect(cx - 10 + tx, by - 44, 20, 24, 8).fill({ color: 0xf5cc00, alpha: 1 });

  // Green overalls
  g.roundRect(cx - 10 + tx * 0.3, by - 12, 20, 20, 4).fill({ color: 0x225522, alpha: 0.9 });
  g.rect(cx - 5 + tx * 0.3, by - 22, 4, 12).fill({ color: 0x225522, alpha: 0.9 });
  g.rect(cx + 1 + tx * 0.3, by - 22, 4, 12).fill({ color: 0x225522, alpha: 0.9 });

  // Two goggle eyes
  g.circle(cx - 5 + tx, by - 34, 5).fill({ color: 0x222222, alpha: 1 });
  g.circle(cx - 5 + tx, by - 34, 3.5).fill({ color: 0x88ddaa, alpha: 0.9 });
  g.circle(cx - 5 + tx, by - 34, 5).stroke({ color: 0x555555, alpha: 1, width: 1 });

  g.circle(cx + 5 + tx, by - 34, 5).fill({ color: 0x222222, alpha: 1 });
  g.circle(cx + 5 + tx, by - 34, 3.5).fill({ color: 0x88ddaa, alpha: 0.9 });
  g.circle(cx + 5 + tx, by - 34, 5).stroke({ color: 0x555555, alpha: 1, width: 1 });
  // Eye highlights
  g.circle(cx - 6 + tx, by - 36, 1.5).fill({ color: 0xffffff, alpha: 0.7 });
  g.circle(cx + 4 + tx, by - 36, 1.5).fill({ color: 0xffffff, alpha: 0.7 });

  // Hard hat
  g.roundRect(cx - 12 + tx, by - 50, 24, 8, 4).fill({ color: 0xffcc00, alpha: 1 });
  g.rect(cx - 14 + tx, by - 44, 28, 4).fill({ color: 0xffcc00, alpha: 1 });
  g.circle(cx + tx, by - 46, 3).fill({ color: 0xff6600, alpha: 0.9 });

  // Wrench
  const wAngle = isStumbling ? Math.sin(time * 8) * 0.5 : Math.sin(time * 1.5) * 0.2;
  const wx = cx + 18;
  const wy = by - 16;
  g.roundRect(wx - 2, wy - 12, 4, 20, 2).fill({ color: 0xaaaaaa, alpha: 1 });
  g.roundRect(wx - 5, wy - 14, 10, 5, 2).fill({ color: 0x888888, alpha: 1 });
  g.roundRect(wx - 5, wy + 6, 10, 5, 2).fill({ color: 0x888888, alpha: 1 });
  void wAngle; // used conceptually for stumble; kept for future transform

  // Legs
  g.roundRect(cx - 9 + tx * 0.1, by + 8, 8, 12, 3).fill({ color: 0xf5cc00, alpha: 1 });
  g.roundRect(cx + 1 + tx * 0.1, by + 8, 8, 12, 3).fill({ color: 0xf5cc00, alpha: 1 });
  g.ellipse(cx - 5 + tx * 0.05, by + 20, 6, 3).fill({ color: 0x333333, alpha: 1 });
  g.ellipse(cx + 5 + tx * 0.05, by + 20, 6, 3).fill({ color: 0x333333, alpha: 1 });

  if (isActive) activeSparks(g, cx, by - 10, time, 0x225522);
  if (!isActive) sleepZzz(g, cx, by, time);

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
  const by = cy + bob2;

  groundShadow(g, cx, cy);
  if (selected) selectedRing(g, cx, cy, 18, time);

  // Capsule body
  g.roundRect(cx - 11, by - 20, 22, 28, 9).fill({ color: 0xf5cc00, alpha: 1 });
  // Head
  g.roundRect(cx - 10, by - 38, 20, 22, 8).fill({ color: 0xf5cc00, alpha: 1 });

  // Pink/teal artist smock
  g.roundRect(cx - 11, by - 10, 22, 18, 4).fill({ color: 0xff66aa, alpha: 0.85 });
  // Smock straps
  g.rect(cx - 6, by - 20, 4, 12).fill({ color: 0xff66aa, alpha: 0.85 });
  g.rect(cx + 2, by - 20, 4, 12).fill({ color: 0xff66aa, alpha: 0.85 });

  // Two goggle eyes
  g.circle(cx - 5, by - 28, 5).fill({ color: 0x222222, alpha: 1 });
  g.circle(cx - 5, by - 28, 3.5).fill({ color: 0xff99cc, alpha: 0.9 });
  g.circle(cx - 5, by - 28, 5).stroke({ color: 0x555555, alpha: 1, width: 1 });

  g.circle(cx + 5, by - 28, 5).fill({ color: 0x222222, alpha: 1 });
  g.circle(cx + 5, by - 28, 3.5).fill({ color: 0xff99cc, alpha: 0.9 });
  g.circle(cx + 5, by - 28, 5).stroke({ color: 0x555555, alpha: 1, width: 1 });
  // Eye highlights
  g.circle(cx - 6, by - 30, 1.5).fill({ color: 0xffffff, alpha: 0.7 });
  g.circle(cx + 4, by - 30, 1.5).fill({ color: 0xffffff, alpha: 0.7 });

  // Beret (angled on head)
  g.ellipse(cx + 2, by - 40, 11, 6).fill({ color: 0xcc2255, alpha: 1 });
  g.circle(cx + 10, by - 42, 3).fill({ color: 0xee3366, alpha: 1 }); // beret stem

  // Paintbrush (held up, dripping)
  const brushAngle = Math.sin(time * 1.8) * 0.18;
  const bx = cx + 18;
  const bby = by - 18;
  // Handle
  g.roundRect(bx - 1, bby - 14, 3, 20, 1).fill({ color: 0xaa6622, alpha: 1 });
  // Bristles
  g.roundRect(bx - 2, bby - 20, 5, 8, 2).fill({ color: 0xffffff, alpha: 0.9 });
  // Paint drip (animated)
  const drip = Math.sin(time * 2.1) * 0.5 + 0.5;
  const colors = [0xff3366, 0x33ccff, 0xffcc00];
  const paintColor = colors[Math.floor(time * 0.4) % colors.length];
  g.circle(bx, bby - 22 - drip * 4, 3).fill({ color: paintColor, alpha: 0.9 });
  void brushAngle;

  // Paint palette (left hand)
  const px2 = cx - 18;
  const py2 = by - 8 + Math.sin(time * 1.4) * 2;
  g.ellipse(px2, py2, 9, 7).fill({ color: 0x8B4513, alpha: 1 });
  // Paint blobs on palette
  const blobColors = [0xff3333, 0x33ff66, 0x3399ff, 0xffff33];
  const blobPos = [[-5, -2], [0, -4], [4, -1], [-2, 2]] as const;
  for (let i = 0; i < blobColors.length; i++) {
    g.circle(px2 + blobPos[i][0], py2 + blobPos[i][1], 2).fill({ color: blobColors[i], alpha: 0.9 });
  }

  // Legs + shoes
  g.roundRect(cx - 9, by + 8, 8, 10, 3).fill({ color: 0xf5cc00, alpha: 1 });
  g.roundRect(cx + 1, by + 8, 8, 10, 3).fill({ color: 0xf5cc00, alpha: 1 });
  g.ellipse(cx - 5, by + 18, 6, 3).fill({ color: 0x333333, alpha: 1 });
  g.ellipse(cx + 5, by + 18, 6, 3).fill({ color: 0x333333, alpha: 1 });

  if (isActive) activeSparks(g, cx, by - 10, time, 0xff66aa);
  if (!isActive) sleepZzz(g, cx, by, time);

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
  const by = cy + bob2;

  groundShadow(g, cx, cy);
  if (selected) selectedRing(g, cx, cy, 17, time);

  // Capsule body
  g.roundRect(cx - 11, by - 20, 22, 28, 9).fill({ color: 0xf5cc00, alpha: 1 });
  // Head
  g.roundRect(cx - 10, by - 38, 20, 22, 8).fill({ color: 0xf5cc00, alpha: 1 });

  // Purple overalls
  g.roundRect(cx - 10, by - 10, 20, 18, 4).fill({ color: 0x6633aa, alpha: 0.9 });
  g.rect(cx - 5, by - 20, 4, 12).fill({ color: 0x6633aa, alpha: 0.9 });
  g.rect(cx + 1, by - 20, 4, 12).fill({ color: 0x6633aa, alpha: 0.9 });

  // Single goggle eye
  g.circle(cx, by - 28, 7).fill({ color: 0x222222, alpha: 1 });
  g.circle(cx, by - 28, 5).fill({ color: 0xaaeeaa, alpha: 0.9 });
  g.circle(cx, by - 28, 3).fill({ color: 0x66cc66, alpha: 1 });
  g.circle(cx - 2, by - 30, 2).fill({ color: 0xffffff, alpha: 0.6 });
  g.circle(cx, by - 28, 7).stroke({ color: 0x555555, alpha: 1, width: 1.5 });

  // Spinning gold coin
  const coinAngle = time * 3.5;
  const coinX = cx + 18;
  const coinY = by - 12;
  const coinW = Math.abs(Math.cos(coinAngle)) * 8 + 2;
  g.ellipse(coinX, coinY, coinW, 9).fill({ color: 0xFFD700, alpha: 0.95 });
  g.ellipse(coinX, coinY, coinW, 9).stroke({ color: 0xcc9900, alpha: 0.8, width: 1 });
  if (coinW > 4) {
    g.ellipse(coinX, coinY, coinW * 0.5, 5).fill({ color: 0xFFEE44, alpha: 0.6 });
  }

  // Ledger book
  const bookX = cx - 18;
  const bookY = by - 10 + Math.sin(time * 1.4) * 2;
  g.roundRect(bookX - 7, bookY - 8, 14, 16, 2).fill({ color: 0x442200, alpha: 1 });
  g.rect(bookX - 5, bookY - 6, 10, 1.5).fill({ color: 0x886644, alpha: 0.8 });
  g.rect(bookX - 5, bookY - 3, 10, 1.5).fill({ color: 0x886644, alpha: 0.8 });
  g.rect(bookX - 5, bookY, 10, 1.5).fill({ color: 0x886644, alpha: 0.8 });
  g.rect(bookX - 5, bookY + 3, 7, 1.5).fill({ color: 0x886644, alpha: 0.8 });

  // Legs + shoes
  g.roundRect(cx - 9, by + 8, 8, 10, 3).fill({ color: 0xf5cc00, alpha: 1 });
  g.roundRect(cx + 1, by + 8, 8, 10, 3).fill({ color: 0xf5cc00, alpha: 1 });
  g.ellipse(cx - 5, by + 18, 6, 3).fill({ color: 0x333333, alpha: 1 });
  g.ellipse(cx + 5, by + 18, 6, 3).fill({ color: 0x333333, alpha: 1 });

  if (isActive) activeSparks(g, cx, by - 10, time, 0xFFD700);
  if (!isActive) sleepZzz(g, cx, by, time);

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
