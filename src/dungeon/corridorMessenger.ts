// ─── corridorMessenger.ts — Animated messenger orbs between rooms ─────────────
// Small glowing dots that travel along corridors, giving the dungeon a living
// feeling of messages/tasks being routed between agents.

import { TILE_SIZE } from './tiles';

/** A single waypoint path in pixel space. Each path is a list of [x,y] points. */
type Path = Array<[number, number]>;

/** Grid positions to pixel center helper */
function tp(gx: number, gy: number): [number, number] {
  return [gx * TILE_SIZE + TILE_SIZE, gy * TILE_SIZE + TILE_SIZE];
}

// ── Route paths between rooms (in grid tile centers) ─────────────────────────
// These trace the corridors defined in rooms.ts:
//   grim: (9,6)  bob: (3,3)  kevin: (16,3)  stuart: (9,11)

const PATHS: Array<{ from: string; to: string; color: string; waypoints: Path }> = [
  // Grim ↔ Bob
  {
    from: 'grim', to: 'bob',
    color: '#99CCFF',
    waypoints: [tp(9, 6), tp(6, 6), tp(6, 4), tp(5, 4), tp(3, 4), tp(3, 3)],
  },
  {
    from: 'bob', to: 'grim',
    color: '#FF9933',
    waypoints: [tp(3, 3), tp(3, 4), tp(5, 4), tp(6, 4), tp(6, 6), tp(9, 6)],
  },
  // Grim ↔ Kevin
  {
    from: 'grim', to: 'kevin',
    color: '#FF6633',
    waypoints: [tp(9, 6), tp(13, 6), tp(13, 4), tp(14, 4), tp(16, 4), tp(16, 3)],
  },
  {
    from: 'kevin', to: 'grim',
    color: '#FF9933',
    waypoints: [tp(16, 3), tp(16, 4), tp(14, 4), tp(13, 4), tp(13, 6), tp(9, 6)],
  },
  // Grim ↔ Stuart
  {
    from: 'grim', to: 'stuart',
    color: '#FFD700',
    waypoints: [tp(9, 9), tp(9, 10), tp(9, 11)],
  },
  {
    from: 'stuart', to: 'grim',
    color: '#FF9933',
    waypoints: [tp(9, 11), tp(9, 10), tp(9, 9)],
  },
];

interface MessengerOrb {
  pathIdx: number;      // which PATHS entry
  t: number;            // 0..total path length (pixels)
  speed: number;        // px per ms
  alpha: number;
  size: number;
}

export class CorridorMessenger {
  private orbs: MessengerOrb[] = [];
  private lastSpawn = 0;
  private pathLengths: number[] = [];

  constructor() {
    // Pre-compute total length for each path
    this.pathLengths = PATHS.map(p => {
      let len = 0;
      for (let i = 1; i < p.waypoints.length; i++) {
        const [x0, y0] = p.waypoints[i - 1];
        const [x1, y1] = p.waypoints[i];
        len += Math.hypot(x1 - x0, y1 - y0);
      }
      return len;
    });
  }

  /** Call once per frame. now = Date.now() */
  update(now: number): void {
    // Spawn new orbs occasionally (every 2.5–5 seconds)
    if (now - this.lastSpawn > 2500 + Math.random() * 2500) {
      this.lastSpawn = now;
      const pathIdx = Math.floor(Math.random() * PATHS.length);
      this.orbs.push({
        pathIdx,
        t: 0,
        speed: 0.04 + Math.random() * 0.03, // 40–70 px/s
        alpha: 0.7 + Math.random() * 0.3,
        size: 2 + Math.random() * 2,
      });
    }

    const dt = 16; // assume ~60fps
    this.orbs = this.orbs.filter(orb => {
      orb.t += orb.speed * dt;
      return orb.t < this.pathLengths[orb.pathIdx];
    });
  }

  /** Get pixel position of orb along its path at distance t */
  private getPos(pathIdx: number, t: number): [number, number] {
    const waypoints = PATHS[pathIdx].waypoints;
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
    // Past end — return last point
    const last = waypoints[waypoints.length - 1];
    return last;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const orb of this.orbs) {
      const path = PATHS[orb.pathIdx];
      const totalLen = this.pathLengths[orb.pathIdx];
      const progress = orb.t / totalLen;

      // Fade in/out at start and end of journey
      const fadeIn = Math.min(progress * 6, 1);
      const fadeOut = Math.min((1 - progress) * 6, 1);
      const alpha = orb.alpha * fadeIn * fadeOut;

      const [x, y] = this.getPos(orb.pathIdx, orb.t);

      // Outer glow
      ctx.globalAlpha = alpha * 0.4;
      ctx.fillStyle = path.color;
      ctx.shadowColor = path.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(x, y, orb.size * 2, 0, Math.PI * 2);
      ctx.fill();

      // Core dot
      ctx.globalAlpha = alpha;
      ctx.shadowBlur = 6;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, orb.size * 0.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
