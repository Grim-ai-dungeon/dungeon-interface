// ─── Tile definitions ─────────────────────────────────────────────────────────
// All rendering is Canvas2D; no external assets.

export const TILE_SIZE = 48; // px per dungeon tile

export type FloorType = 'stone' | 'sand' | 'brick' | 'gold';

/** Draw a single floor tile at canvas pixel coords (px, py) */
export function drawFloorTile(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  type: FloorType,
  seed: number,
): void {
  const s = TILE_SIZE;

  // Base color
  let base: string;
  let detail: string;
  switch (type) {
    case 'sand':
      base = '#8B7355';
      detail = '#A0926B';
      break;
    case 'brick':
      base = '#6B5B4F';
      detail = '#7a6a5e';
      break;
    case 'gold':
      base = '#7a6430';
      detail = '#9a8040';
      break;
    default: // stone
      base = '#5a5040';
      detail = '#6a6050';
  }

  ctx.fillStyle = base;
  ctx.fillRect(px, py, s, s);

  // Subtle variation using seed
  const r = ((seed * 1103515245 + 12345) & 0x7fffffff) % 100;
  if (r < 30) {
    ctx.fillStyle = detail + '66';
    ctx.fillRect(px + 4, py + 4, s - 8, s - 8);
  }

  // Crack / grout lines
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);

  // Random small crack
  const r2 = ((seed * 22695477 + 1) & 0x7fffffff) % 100;
  if (r2 < 20) {
    ctx.beginPath();
    ctx.moveTo(px + 8, py + (r2 % 16) + 8);
    ctx.lineTo(px + 18, py + (r2 % 16) + 14);
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
}

/** Draw a wall tile */
export function drawWallTile(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  seed: number,
): void {
  const s = TILE_SIZE;

  // Stone wall base
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(px, py, s, s);

  // Brick pattern
  const brickH = 12;
  const brickW = s;
  for (let row = 0; row < Math.ceil(s / brickH); row++) {
    const offset = (row % 2 === 0) ? 0 : brickW / 2;
    const by = py + row * brickH;
    // brick fill
    const shade = ((seed + row * 7) % 3) === 0 ? '#484848' : '#404040';
    ctx.fillStyle = shade;
    ctx.fillRect(px + offset, by, brickW, brickH - 1);
    if (offset > 0) {
      ctx.fillRect(px, by, offset - 1, brickH - 1);
    }
    // grout line
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(px, by + brickH - 1, s, 1);
    // vertical grout
    ctx.fillRect(px + offset + brickW / 2, by, 1, brickH - 1);
  }

  // Shadow at top (depth)
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(px, py, s, 3);
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
  ctx.strokeStyle = glowing ? color : 'rgba(80,60,40,0.8)';
  ctx.lineWidth = glowing ? 2 : 1;
  if (glowing) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
  }
  ctx.strokeRect(px + 1, py + 1, w - 2, h - 2);
  ctx.restore();
}
