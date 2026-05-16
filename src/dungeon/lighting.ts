// ─── Torch lighting and fog of war ───────────────────────────────────────────

import type { Torch } from '../types';
import type { Room } from '../types';
import { roomPixelBounds } from './rooms';

/** Generate torch positions for each room (pixel coords) — two torches per room */
export function getRoomTorches(room: Room): Torch[] {
  const { px, py, w, h } = roomPixelBounds(room);
  const color = torchColorForRoom(room.id as string);
  const radius = torchRadiusForRoom(room.id as string);

  return [
    { x: px + 16,     y: py + 16,     color, radius },
    { x: px + w - 16, y: py + 16,     color, radius },
    { x: px + 16,     y: py + h - 16, color, radius: radius * 0.7 },
    { x: px + w - 16, y: py + h - 16, color, radius: radius * 0.7 },
  ];
}

function torchColorForRoom(id: string): string {
  switch (id) {
    case 'grim':   return '#FFA700'; // design doc torch color
    case 'bob':    return '#99CCFF';
    case 'kevin':  return '#FF6633';
    case 'stuart': return '#FFD700';
    default:       return '#FFA700';
  }
}

function torchRadiusForRoom(id: string): number {
  switch (id) {
    case 'grim':   return 90;
    case 'bob':    return 75;
    case 'kevin':  return 80;
    case 'stuart': return 80;
    default:       return 75;
  }
}
/** Generate dim corridor wall torches — placed at midpoints of each corridor */
export function getCorridorTorches(): import('../types').Torch[] {
  const torches: import('../types').Torch[] = [];
  // Manually placed corridor midpoint torches (pixel coords)
  // These mark the key junction/midpoint of each corridor route
  // NW corridor (Grim-Bob): midpoint around tile (5,4)
  torches.push({ x: 5 * 48 + 24, y: 4 * 48 + 24, color: '#DD8833', radius: 45 });
  // NE corridor (Grim-Kevin): midpoint around tile (14,4)
  torches.push({ x: 14 * 48 + 24, y: 4 * 48 + 24, color: '#DD8833', radius: 45 });
  // South corridor (Grim-Stuart): midpoint tile (9,10)
  torches.push({ x: 9 * 48 + 24, y: 10 * 48 + 24, color: '#DD8833', radius: 42 });
  return torches;
}

/**
 * Multi-wave torch flicker — layered sine waves at non-harmonic frequencies.
 * Returns intensity multiplier [0.65..1.0]
 */
export function getTorchIntensity(torchIndex: number, now: number): number {
  const t = now / 1000;
  const base = 0.82;
  const wave1 = Math.sin(t * 3.7 + torchIndex * 1.3) * 0.07;
  const wave2 = Math.sin(t * 7.3 + torchIndex * 2.7) * 0.04;
  const wave3 = Math.sin(t * 17.1 + torchIndex * 4.1) * 0.02;
  const micro = (Math.random() - 0.5) * 0.03; // micro-flicker
  return Math.max(0.6, Math.min(1.0, base + wave1 + wave2 + wave3 + micro));
}

/** Animated flicker offset in pixels */
export function flickerOffset(torchIndex: number, now: number): number {
  const phase = (now / 600 + torchIndex * 1.3);
  return Math.sin(phase) * 5 + Math.sin(phase * 2.7) * 2.5;
}

/**
 * Full lighting pass using destination-out fog of war technique:
 * 1. Draw dark fog overlay
 * 2. Punch holes with destination-out for lit areas
 * 3. Restore and draw ambient light halos with 'screen'
 */
export function applyLighting(
  ctx: CanvasRenderingContext2D,
  torches: Torch[],
  canvasW: number,
  canvasH: number,
  activeRoomIds: Set<string>,
  now: number,
  torchToRoomId: Map<Torch, string>,
): void {
  // === Phase 1: Fog of War using destination-out ===
  // Save current canvas state to a snapshot — we'll work on a temp layer
  ctx.save();

  // Fill the entire canvas with near-opaque fog (design doc: #0B0C10 = very dark)
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(11, 12, 16, 0.82)';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Punch holes through fog with destination-out
  ctx.globalCompositeOperation = 'destination-out';
  torches.forEach((torch, idx) => {
    const roomId = torchToRoomId.get(torch) ?? '';
    const isActive = activeRoomIds.has(roomId);
    const intensity = getTorchIntensity(idx, now);
    const r = torch.radius * intensity * (isActive ? 1.2 : 0.75);

    const grad = ctx.createRadialGradient(torch.x, torch.y, 0, torch.x, torch.y, r);
    grad.addColorStop(0,   'rgba(0,0,0,0.95)');
    grad.addColorStop(0.3, 'rgba(0,0,0,0.7)');
    grad.addColorStop(0.7, 'rgba(0,0,0,0.3)');
    grad.addColorStop(1,   'rgba(0,0,0,0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(torch.x, torch.y, r * 1.2, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();

  // === Phase 2: Additive torch color halos (screen blend) ===
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  torches.forEach((torch, idx) => {
    const roomId = torchToRoomId.get(torch) ?? '';
    const isActive = activeRoomIds.has(roomId);
    const intensity = getTorchIntensity(idx, now);
    const r = torch.radius * intensity;
    const alpha = isActive ? 0.22 : 0.10;

    const grad = ctx.createRadialGradient(torch.x, torch.y, 0, torch.x, torch.y, r);
    grad.addColorStop(0,   hexToRgba(torch.color, alpha * 2.2));
    grad.addColorStop(0.4, hexToRgba(torch.color, alpha));
    grad.addColorStop(1,   'rgba(0,0,0,0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(torch.x, torch.y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

/** Draw glowing torch wall-sconce sprite at position */
export function drawTorchSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  now: number,
  idx: number,
): void {
  const intensity = getTorchIntensity(idx, now);
  const flameSize = 5 + intensity * 3;

  ctx.save();

  // Torch wall bracket
  ctx.fillStyle = '#5a3a18';
  ctx.fillRect(x - 3, y + 3, 6, 10);
  // Bracket detail
  ctx.fillStyle = '#3a2010';
  ctx.fillRect(x - 4, y + 2, 8, 2);

  // Flame glow halo (soft)
  const haloGrad = ctx.createRadialGradient(x, y - 2, 0, x, y - 2, flameSize * 2.5);
  haloGrad.addColorStop(0, hexToRgba(color, 0.35 * intensity));
  haloGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = haloGrad;
  ctx.beginPath();
  ctx.arc(x, y - 2, flameSize * 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Flame core (teardrop)
  ctx.shadowColor = color;
  ctx.shadowBlur = 8 + intensity * 4;

  // Outer flame
  ctx.fillStyle = `rgba(255,167,0,${intensity * 0.9})`;
  ctx.beginPath();
  ctx.moveTo(x, y - flameSize - 2);
  ctx.bezierCurveTo(x + flameSize * 0.8, y - flameSize * 0.3, x + flameSize * 0.5, y + 2, x, y + 1);
  ctx.bezierCurveTo(x - flameSize * 0.5, y + 2, x - flameSize * 0.8, y - flameSize * 0.3, x, y - flameSize - 2);
  ctx.fill();

  // Inner flame (brighter)
  ctx.fillStyle = `rgba(255,230,100,${intensity * 0.95})`;
  ctx.beginPath();
  ctx.moveTo(x, y - flameSize);
  ctx.bezierCurveTo(x + flameSize * 0.4, y - flameSize * 0.2, x + flameSize * 0.3, y, x, y);
  ctx.bezierCurveTo(x - flameSize * 0.3, y, x - flameSize * 0.4, y - flameSize * 0.2, x, y - flameSize);
  ctx.fill();

  // Hotspot (white core)
  ctx.fillStyle = `rgba(255,255,220,${intensity * 0.7})`;
  ctx.beginPath();
  ctx.arc(x, y - flameSize * 0.6, flameSize * 0.25, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.restore();
}

/** Generate spark particles near a torch */
export function generateTorchSparks(
  x: number, y: number,
  now: number,
  idx: number,
): { sx: number; sy: number; alpha: number; size: number }[] {
  const sparks: { sx: number; sy: number; alpha: number; size: number }[] = [];
  const count = 4;
  for (let i = 0; i < count; i++) {
    const t = (now / 400 + idx * 0.7 + i * 0.25) % 1;
    const angle = Math.PI * (1 + (i / count) * 0.6) + Math.sin(now / 300 + i) * 0.5;
    const dist = t * 22;
    const sx = x + Math.cos(angle) * dist;
    const sy = y - t * 18 + Math.sin(now / 200 + i * 1.7) * 3;
    const alpha = Math.max(0, (1 - t) * 0.9);
    sparks.push({ sx, sy, alpha, size: 1.5 - t });
  }
  return sparks;
}

// ─────────────────────────────────────────────────────────────────────────────

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
