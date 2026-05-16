// ─── eventPulse.ts — Real-time event pulses between Grim and minion rooms ────
//
// When an agent receives or completes a task, two effects fire:
//   1. An expanding ring pulse radiates from the agent's room center
//   2. A bright "dispatch beam" orb races along the corridor between Grim ↔ agent
//
// This makes the dungeon feel like a live command center where orders and
// results visibly flow between chambers.

import type { AgentId } from '../types';

// ── Agent room center pixels (must stay in sync with rooms.ts) ────────────────
// TILE_SIZE = 48. Room centers derived from gridX/gridY + widthTiles/heightTiles.
// grim:   gridX=7 gridY=4 5x5  → center pixel (7+2.5)*48=456, (4+2.5)*48=312
// bob:    gridX=1 gridY=1 4x4  → center pixel (1+2)*48=144, (1+2)*48=144
// kevin:  gridX=14 gridY=1 4x4 → center pixel (14+2)*48=768, (1+2)*48=144
// stuart: gridX=7 gridY=10 5x3 → center pixel (7+2.5)*48=456, (10+1.5)*48=552
const ROOM_CENTERS: Record<AgentId, { x: number; y: number }> = {
  grim:   { x: 456, y: 312 },
  bob:    { x: 144, y: 144 },
  kevin:  { x: 768, y: 144 },
  stuart: { x: 456, y: 552 },
};

// ── Agent colors ──────────────────────────────────────────────────────────────
const AGENT_COLORS: Record<AgentId, string> = {
  grim:   '#8A2BE2',
  bob:    '#99CCFF',
  kevin:  '#FF6633',
  stuart: '#FFD700',
};

// ── Corridor waypoints for dispatch beams (Grim ↔ each minion) ───────────────
// Mirror the paths in corridorMessenger.ts but as pixel coords.
// We derive pixel from tile coords: pixel = gridTile * 48 + 48 (center of tile).
// (Same formula as corridorMessenger.ts tp() helper)
function tp(gx: number, gy: number): [number, number] {
  const TILE = 48;
  return [gx * TILE + TILE, gy * TILE + TILE];
}

const CORRIDOR_PATHS: Record<Exclude<AgentId, 'grim'>, { toMinion: [number, number][]; toGrim: [number, number][] }> = {
  bob: {
    toMinion: [tp(9, 6), tp(6, 6), tp(6, 4), tp(5, 4), tp(3, 4), tp(3, 3)],
    toGrim:   [tp(3, 3), tp(3, 4), tp(5, 4), tp(6, 4), tp(6, 6), tp(9, 6)],
  },
  kevin: {
    toMinion: [tp(9, 6), tp(13, 6), tp(13, 4), tp(14, 4), tp(16, 4), tp(16, 3)],
    toGrim:   [tp(16, 3), tp(16, 4), tp(14, 4), tp(13, 4), tp(13, 6), tp(9, 6)],
  },
  stuart: {
    toMinion: [tp(9, 9), tp(9, 10), tp(9, 11)],
    toGrim:   [tp(9, 11), tp(9, 10), tp(9, 9)],
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────

export type PulseKind = 'dispatch' | 'report';

/** A single expanding ring pulse at a room center */
interface RingPulse {
  x: number;
  y: number;
  born: number;        // Date.now()
  duration: number;    // ms total life
  maxRadius: number;
  color: string;
  kind: PulseKind;
}

/** A glowing orb beam traveling along a corridor path */
interface BeamOrb {
  waypoints: [number, number][];
  t: number;           // current position along total path length (pixels)
  totalLen: number;
  speed: number;       // px per ms
  color: string;
  size: number;
  born: number;
  kind: PulseKind;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pathLength(waypoints: [number, number][]): number {
  let len = 0;
  for (let i = 1; i < waypoints.length; i++) {
    const [x0, y0] = waypoints[i - 1];
    const [x1, y1] = waypoints[i];
    len += Math.hypot(x1 - x0, y1 - y0);
  }
  return len;
}

function posAlongPath(waypoints: [number, number][], t: number): [number, number] {
  let remaining = t;
  for (let i = 1; i < waypoints.length; i++) {
    const [x0, y0] = waypoints[i - 1];
    const [x1, y1] = waypoints[i];
    const segLen = Math.hypot(x1 - x0, y1 - y0);
    if (remaining <= segLen) {
      const frac = remaining / segLen;
      return [x0 + (x1 - x0) * frac, y0 + (y1 - y0) * frac];
    }
    remaining -= segLen;
  }
  const last = waypoints[waypoints.length - 1];
  return last;
}

function hexToRGB(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

// ── EventPulseSystem ──────────────────────────────────────────────────────────

export class EventPulseSystem {
  private rings: RingPulse[] = [];
  private beams: BeamOrb[] = [];

  /**
   * Fire an event pulse for a given agent.
   *
   * kind='dispatch'  → Grim → minion  (order flowing out)
   * kind='report'    → minion → Grim  (result flowing back)
   *
   * Calling this with agentId='grim' fires a broadcast pulse at Grim's chamber
   * only (no beam, since Grim IS the source).
   */
  fire(agentId: AgentId, kind: PulseKind): void {
    const now = Date.now();
    const center = ROOM_CENTERS[agentId];
    const color = AGENT_COLORS[agentId];

    // Always fire a ring pulse at the agent's room
    this.rings.push({
      x: center.x,
      y: center.y,
      born: now,
      duration: 900,
      maxRadius: 52,
      color,
      kind,
    });

    // Also fire a secondary smaller ring at Grim's room for non-grim events
    if (agentId !== 'grim') {
      this.rings.push({
        x: ROOM_CENTERS.grim.x,
        y: ROOM_CENTERS.grim.y,
        born: now + 80, // slight delay so Grim reacts
        duration: 700,
        maxRadius: 38,
        color,
        kind,
      });

      // Fire a corridor beam
      const paths = CORRIDOR_PATHS[agentId as Exclude<AgentId, 'grim'>];
      const waypoints = kind === 'dispatch' ? paths.toMinion : paths.toGrim;
      const total = pathLength(waypoints);
      this.beams.push({
        waypoints,
        t: 0,
        totalLen: total,
        speed: 0.28 + Math.random() * 0.1, // ~280–380 px/s (fast, visible)
        color,
        size: 4 + Math.random() * 2,
        born: now,
        kind,
      });
    }
  }

  update(now: number): void {
    const dt = 16; // ~60fps assumed

    // Advance beams
    this.beams = this.beams.filter(b => {
      b.t += b.speed * dt;
      return b.t < b.totalLen;
    });

    // Expire old rings (they're purely time-based, no update needed beyond culling)
    this.rings = this.rings.filter(r => now - r.born < r.duration);
  }

  draw(ctx: CanvasRenderingContext2D, now: number): void {
    ctx.save();

    // ── Draw rings ────────────────────────────────────────────────────────────
    for (const ring of this.rings) {
      const age = now - ring.born;
      const progress = age / ring.duration;          // 0 → 1
      const radius = ring.maxRadius * progress;
      const alpha = (1 - progress) * 0.75;           // fade out as it expands

      const [r, g, b] = hexToRGB(ring.color);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = `rgb(${r},${g},${b})`;
      ctx.shadowColor = ring.color;
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2.5 * (1 - progress * 0.6);  // thins as it expands

      ctx.beginPath();
      ctx.arc(ring.x, ring.y, Math.max(1, radius), 0, Math.PI * 2);
      ctx.stroke();

      // Inner bright fill flash at birth
      if (progress < 0.2) {
        const flashAlpha = (0.2 - progress) / 0.2 * 0.18;
        ctx.globalAlpha = flashAlpha;
        ctx.fillStyle = ring.color;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, radius * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── Draw beams ────────────────────────────────────────────────────────────
    for (const beam of this.beams) {
      const progress = beam.t / beam.totalLen;
      const fadeIn  = Math.min(progress * 8, 1);
      const fadeOut = Math.min((1 - progress) * 8, 1);
      const alpha   = fadeIn * fadeOut;

      const [px, py] = posAlongPath(beam.waypoints, beam.t);
      const [r, g, b] = hexToRGB(beam.color);

      // Outer glow corona
      ctx.globalAlpha = alpha * 0.35;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.shadowColor = beam.color;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(px, py, beam.size * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Bright core
      ctx.globalAlpha = alpha * 0.95;
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, beam.size * 0.55, 0, Math.PI * 2);
      ctx.fill();

      // Colored mid ring
      ctx.globalAlpha = alpha * 0.7;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(px, py, beam.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;

      // Trail: paint a short fading tail behind the beam
      const TRAIL_LEN = 30;
      const trailSteps = 6;
      for (let s = 1; s <= trailSteps; s++) {
        const backT = beam.t - (TRAIL_LEN * s / trailSteps);
        if (backT < 0) break;
        const [tx, ty] = posAlongPath(beam.waypoints, backT);
        const trailAlpha = alpha * (1 - s / trailSteps) * 0.4;
        ctx.globalAlpha = trailAlpha;
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.beginPath();
        ctx.arc(tx, ty, beam.size * (1 - s / trailSteps) * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  /** True if there are any active pulses (for render opt) */
  get hasPulses(): boolean {
    return this.rings.length > 0 || this.beams.length > 0;
  }
}
