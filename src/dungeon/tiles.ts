// ─── Tile definitions ─────────────────────────────────────────────────────────
// All rendering is Canvas2D; no external assets.

export const TILE_SIZE = 48; // px per dungeon tile

export type FloorType = 'stone' | 'sand' | 'brick' | 'gold';

/** Seeded pseudo-random [0..1) */
function seededRand(seed: number): number {
  let s = Math.abs(seed) | 0;
  s = (s ^ 61) ^ (s >>> 16);
  s += (s << 3);
  s ^= (s >>> 4);
  s *= 0x27d4eb2d;
  s ^= (s >>> 15);
  return (s >>> 0) / 0xffffffff;
}

/** Draw a single floor tile at canvas pixel coords (px, py) */
export function drawFloorTile(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  type: FloorType,
  seed: number,
): void {
  const s = TILE_SIZE;

  switch (type) {
    case 'stone':  drawStoneBrickFloor(ctx, px, py, s, seed); break;
    case 'sand':   drawSandFloor(ctx, px, py, s, seed); break;
    case 'brick':  drawRedBrickFloor(ctx, px, py, s, seed); break;
    case 'gold':   drawGoldFloor(ctx, px, py, s, seed); break;
  }
}

/** Dark stone brick floor — deep blue-gray palette */
function drawStoneBrickFloor(
  ctx: CanvasRenderingContext2D,
  px: number, py: number, s: number, seed: number,
): void {
  // Base fill — deep slate (design doc: #1F2833)
  ctx.fillStyle = '#1F2833';
  ctx.fillRect(px, py, s, s);

  // Brick rows within the tile (mini bricks)
  const brickH = 12;
  const brickW = 24;
  const rows = Math.ceil(s / brickH);

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2 === 0) ? 0 : brickW / 2;
    const by = py + r * brickH;
    const cols = Math.ceil((s + brickW) / brickW);

    for (let c = -1; c < cols; c++) {
      const bx = px + c * brickW + offset;
      // Clip to tile bounds
      if (bx + brickW <= px || bx >= px + s) continue;

      const brickSeed = seed ^ (r * 997 + c * 2003);
      const shade = 28 + seededRand(brickSeed) * 14; // 28–42%
      ctx.fillStyle = `hsl(220, 12%, ${shade}%)`;

      // Draw brick clipped to tile
      const drawX = Math.max(bx, px);
      const drawW = Math.min(bx + brickW - 1, px + s) - drawX;
      const drawY = Math.max(by, py);
      const drawH = Math.min(by + brickH - 1, py + s) - drawY;
      if (drawW > 0 && drawH > 0) {
        ctx.fillRect(drawX, drawY, drawW, drawH);
      }

      // Highlight top edge
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      if (by >= py && by < py + s) {
        ctx.fillRect(drawX, drawY, drawW, 1);
      }
      // Shadow bottom edge
      const shadowY = by + brickH - 2;
      if (shadowY >= py && shadowY < py + s) {
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(drawX, shadowY, drawW, 1);
      }

      // Random pitting dots
      if (seededRand(brickSeed * 17) < 0.25) {
        const dotX = drawX + 3 + (seededRand(brickSeed * 31) * (drawW - 6)) | 0;
        const dotY = drawY + 2 + (seededRand(brickSeed * 53) * (drawH - 4)) | 0;
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.arc(dotX, dotY, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Grout lines
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);
}

/** Sandy/earthy floor for Bob's library */
function drawSandFloor(
  ctx: CanvasRenderingContext2D,
  px: number, py: number, s: number, seed: number,
): void {
  ctx.fillStyle = '#2a2218';
  ctx.fillRect(px, py, s, s);

  // Plank-like bands
  const plankH = 16;
  const rows = Math.ceil(s / plankH);
  for (let r = 0; r < rows; r++) {
    const by = py + r * plankH;
    const by2 = Math.min(by + plankH - 1, py + s);
    const plankSeed = seed ^ (r * 1301);
    const shade = 20 + seededRand(plankSeed) * 10;
    ctx.fillStyle = `hsl(35, 30%, ${shade}%)`;
    ctx.fillRect(px, by, s, Math.max(0, by2 - by));

    // Wood grain lines
    const grainCount = 2 + (seededRand(plankSeed * 7) * 3) | 0;
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 0.5;
    for (let g = 0; g < grainCount; g++) {
      const gy = by + 2 + (seededRand(plankSeed * (g + 11)) * (plankH - 4)) | 0;
      if (gy >= py + s) continue;
      ctx.beginPath();
      ctx.moveTo(px, gy);
      ctx.lineTo(px + s, gy + (seededRand(plankSeed * (g + 29)) - 0.5) * 3);
      ctx.stroke();
    }

    // Groove line between planks
    if (by + plankH - 1 < py + s) {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(px, by + plankH - 1, s, 1);
    }
  }
}

/** Red brick floor for Kevin's workshop */
function drawRedBrickFloor(
  ctx: CanvasRenderingContext2D,
  px: number, py: number, s: number, seed: number,
): void {
  ctx.fillStyle = '#261310';
  ctx.fillRect(px, py, s, s);

  const brickH = 10;
  const brickW = 20;
  const rows = Math.ceil(s / brickH);

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2 === 0) ? 0 : brickW / 2;
    const by = py + r * brickH;
    const cols = Math.ceil((s + brickW) / brickW);

    for (let c = -1; c < cols; c++) {
      const bx = px + c * brickW + offset;
      if (bx + brickW <= px || bx >= px + s) continue;

      const brickSeed = seed ^ (r * 541 + c * 1327);
      const hue = 8 + seededRand(brickSeed) * 10;
      const light = 22 + seededRand(brickSeed * 3) * 12;
      ctx.fillStyle = `hsl(${hue}, 55%, ${light}%)`;

      const drawX = Math.max(bx, px);
      const drawW = Math.min(bx + brickW - 1, px + s) - drawX;
      const drawY = Math.max(by, py);
      const drawH = Math.min(by + brickH - 1, py + s) - drawY;
      if (drawW > 0 && drawH > 0) {
        ctx.fillRect(drawX, drawY, drawW, drawH);
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(drawX, drawY, drawW, 1);
      }
    }
  }
  // Grout
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);
}

/** Gold-tinged floor for Stuart's treasury */
function drawGoldFloor(
  ctx: CanvasRenderingContext2D,
  px: number, py: number, s: number, seed: number,
): void {
  ctx.fillStyle = '#1a1508';
  ctx.fillRect(px, py, s, s);

  // Flagstone-style tiles with gold veins
  const brickH = 14;
  const brickW = 28;
  const rows = Math.ceil(s / brickH);

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2 === 0) ? 0 : brickW / 2;
    const by = py + r * brickH;
    const cols = Math.ceil((s + brickW) / brickW);

    for (let c = -1; c < cols; c++) {
      const bx = px + c * brickW + offset;
      if (bx + brickW <= px || bx >= px + s) continue;

      const brickSeed = seed ^ (r * 761 + c * 1999);
      const light = 18 + seededRand(brickSeed) * 12;
      ctx.fillStyle = `hsl(45, 40%, ${light}%)`;

      const drawX = Math.max(bx, px);
      const drawW = Math.min(bx + brickW - 1, px + s) - drawX;
      const drawY = Math.max(by, py);
      const drawH = Math.min(by + brickH - 1, py + s) - drawY;
      if (drawW > 0 && drawH > 0) {
        ctx.fillRect(drawX, drawY, drawW, drawH);

        // Gold vein on some bricks
        if (seededRand(brickSeed * 41) < 0.3) {
          ctx.strokeStyle = 'rgba(255,200,50,0.2)';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(drawX + 2, drawY + drawH / 2);
          ctx.lineTo(drawX + drawW - 2, drawY + drawH / 3);
          ctx.stroke();
        }
      }
    }
  }

  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);
}

/** Draw a wall tile — improved stone brick wall */
export function drawWallTile(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  seed: number,
): void {
  const s = TILE_SIZE;

  // Base — design doc wall: #2C3539
  ctx.fillStyle = '#22292d';
  ctx.fillRect(px, py, s, s);

  // Brick pattern (matching design doc palette)
  const brickH = 12;
  const brickW = s;
  const rows = Math.ceil(s / brickH);

  for (let row = 0; row < rows; row++) {
    const offset = (row % 2 === 0) ? 0 : brickW / 2;
    const by = py + row * brickH;
    const rowSeed = seed ^ (row * 1009);

    // Main brick
    const shade = 22 + seededRand(rowSeed) * 10;
    ctx.fillStyle = `hsl(200, 8%, ${shade}%)`;
    ctx.fillRect(px + offset, by, brickW, Math.min(brickH - 1, py + s - by));
    if (offset > 0) {
      ctx.fillStyle = `hsl(200, 8%, ${shade - 2}%)`;
      ctx.fillRect(px, by, offset - 1, Math.min(brickH - 1, py + s - by));
    }

    // Highlight top
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(px, by, s, 1);

    // Grout line
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(px, Math.min(by + brickH - 1, py + s - 1), s, 1);

    // Vertical grout
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(px + offset + brickW / 2, by, 1, Math.min(brickH - 1, py + s - by));

    // Moss / crack details
    if (seededRand(rowSeed * 13) < 0.12) {
      ctx.fillStyle = `rgba(40, 90, 50, ${seededRand(rowSeed * 37) * 0.4 + 0.1})`;
      const mx = px + (seededRand(rowSeed * 67) * (s - 6)) | 0;
      const my = by + (seededRand(rowSeed * 89) * (brickH - 3)) | 0;
      ctx.beginPath();
      ctx.arc(mx, my, 1.5 + seededRand(rowSeed * 101) * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Crack
    if (seededRand(rowSeed * 23) < 0.08) {
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 0.5;
      const cx2 = px + (seededRand(rowSeed * 47) * (s - 8)) | 0;
      const cy2 = by + 2;
      ctx.beginPath();
      ctx.moveTo(cx2, cy2);
      ctx.lineTo(cx2 + (seededRand(rowSeed * 71) - 0.5) * 6, cy2 + brickH * 0.6);
      ctx.stroke();
    }
  }

  // Top shadow (depth)
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(px, py, s, 3);
  // Side shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(px, py, 2, s);
}

/** Draw the inner shadow/border just inside a room boundary */
export function drawRoomBorder(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  w: number,
  h: number,
  glowing: boolean,
  color: string,
): void {
  ctx.save();

  // Inner inset stone frame — 3px thick
  const frameW = 3;
  // Dark inner frame
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(px, py, w, frameW);
  ctx.fillRect(px, py + h - frameW, w, frameW);
  ctx.fillRect(px, py, frameW, h);
  ctx.fillRect(px + w - frameW, py, frameW, h);

  // Glow border
  if (glowing) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.strokeRect(px + 1.5, py + 1.5, w - 3, h - 3);
  } else {
    ctx.strokeStyle = 'rgba(100, 80, 50, 0.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 0.5, py + 0.5, w - 1, h - 1);
  }

  // Corner decorations (wrought iron flourishes)
  const corners = [
    [px + 4, py + 4],
    [px + w - 4, py + 4],
    [px + 4, py + h - 4],
    [px + w - 4, py + h - 4],
  ] as const;
  ctx.fillStyle = glowing ? color : 'rgba(180,140,80,0.6)';
  ctx.shadowBlur = glowing ? 6 : 0;
  ctx.shadowColor = color;
  for (const [cx, cy] of corners) {
    ctx.fillRect(cx - 3, cy - 1, 6, 2);
    ctx.fillRect(cx - 1, cy - 3, 2, 6);
  }

  ctx.restore();
}

/** Draw parchment texture for a rect (side panel background) */
export function drawParchment(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  seed: number,
): void {
  // Base parchment
  ctx.fillStyle = '#1a1410';
  ctx.fillRect(x, y, w, h);

  // Random noise splatters for age/wear
  for (let i = 0; i < 60; i++) {
    const sx = x + seededRand(seed + i * 17) * w;
    const sy = y + seededRand(seed + i * 31) * h;
    const r = 1 + seededRand(seed + i * 53) * 3;
    const a = seededRand(seed + i * 79) * 0.05;
    ctx.fillStyle = `rgba(180, 140, 80, ${a})`;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Draw a corridor floor strip with detail */
export function drawCorridorFloor(
  ctx: CanvasRenderingContext2D,
  px: number, py: number, s: number, seed: number,
): void {
  // Same as stone but slightly darker
  ctx.fillStyle = '#181e22';
  ctx.fillRect(px, py, s, s);

  const brickH = 12;
  const brickW = 24;
  const rows = Math.ceil(s / brickH);

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2 === 0) ? 0 : brickW / 2;
    const by = py + r * brickH;
    const cols = Math.ceil((s + brickW) / brickW);

    for (let c = -1; c < cols; c++) {
      const bx = px + c * brickW + offset;
      if (bx + brickW <= px || bx >= px + s) continue;

      const brickSeed = seed ^ (r * 883 + c * 1567);
      const shade = 20 + seededRand(brickSeed) * 10;
      ctx.fillStyle = `hsl(215, 10%, ${shade}%)`;

      const drawX = Math.max(bx, px);
      const drawW = Math.min(bx + brickW - 1, px + s) - drawX;
      const drawY = Math.max(by, py);
      const drawH = Math.min(by + brickH - 1, py + s) - drawY;
      if (drawW > 0 && drawH > 0) {
        ctx.fillRect(drawX, drawY, drawW, drawH);

        // Random scattered pebble/debris
        if (seededRand(brickSeed * 71) < 0.08) {
          ctx.fillStyle = 'rgba(100,80,60,0.4)';
          ctx.beginPath();
          ctx.arc(drawX + drawW / 2, drawY + drawH / 2, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);
}
