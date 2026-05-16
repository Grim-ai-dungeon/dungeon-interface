// ─── Torch lighting and fog of war ───────────────────────────────────────────

import type { Torch } from '../types';
import type { Room } from '../types';
import { roomCenter } from './rooms';

/** Generate torch positions for each room (pixel coords) */
export function getRoomTorches(room: Room): Torch[] {
  const { cx, cy } = roomCenter(room);
  const hw = (room.widthTiles * 48) / 2 - 16;
  const hh = (room.heightTiles * 48) / 2 - 16;

  const color = torchColorForRoom(room.id as string);

  return [
    { x: cx - hw, y: cy - hh, color, radius: 70 },
    { x: cx + hw, y: cy - hh, color, radius: 70 },
  ];
}

function torchColorForRoom(id: string): string {
  switch (id) {
    case 'grim':   return '#FF9933';
    case 'bob':    return '#99CCFF';
    case 'kevin':  return '#FF6633';
    case 'stuart': return '#FFD700';
    default:       return '#FF9933';
  }
}

/** Animated flicker offset — call with Date.now() */
export function flickerOffset(torchIndex: number, now: number): number {
  // Each torch flickers at slightly different phase
  const phase = (now / 600 + torchIndex * 1.3);
  return Math.sin(phase) * 6 + Math.sin(phase * 2.7) * 3;
}

/**
 * Apply lighting pass to canvas:
 * 1. Dark overlay (fog of war)
 * 2. Radial gradients for each torch (additive light)
 */
export function applyLighting(
  ctx: CanvasRenderingContext2D,
  torches: Torch[],
  canvasW: number,
  canvasH: number,
  activeRoomIds: Set<string>,
  now: number,
): void {
  // Semi-transparent dark overlay for fog-of-war effect
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Draw torch light halos
  ctx.globalCompositeOperation = 'lighter';
  torches.forEach((torch, idx) => {
    const flicker = flickerOffset(idx, now);
    const r = torch.radius + flicker;
    const active = activeRoomIds.has(extractRoomId(torch));
    const alpha = active ? 0.22 : 0.10;

    const grad = ctx.createRadialGradient(torch.x, torch.y, 0, torch.x, torch.y, r);
    grad.addColorStop(0, hexToRgba(torch.color, alpha * 2));
    grad.addColorStop(0.5, hexToRgba(torch.color, alpha));
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(torch.x, torch.y, r, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

/** Draw glowing torch sprite at position */
export function drawTorchSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  now: number,
  idx: number,
): void {
  const flicker = flickerOffset(idx, now);
  const r = 6 + flicker * 0.3;

  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 10 + Math.abs(flicker);

  // Torch body
  ctx.fillStyle = '#8B5A2B';
  ctx.fillRect(x - 2, y + 4, 4, 10);

  // Flame
  const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
  grad.addColorStop(0, '#FFFFFF');
  grad.addColorStop(0.3, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// Torch doesn't carry room id; this is a helper placeholder.
// In practice, activeRoomIds is managed by the caller.
function extractRoomId(_torch: Torch): string {
  return ''; // lighting pass uses activeRoomIds passed in from outside
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
