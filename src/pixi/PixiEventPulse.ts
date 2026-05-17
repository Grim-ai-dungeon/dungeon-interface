// ─── PixiEventPulse.ts — Traveling orb system for dungeon event pulses ───────

import { Container, Graphics } from 'pixi.js';

interface Orb {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: number;
  t: number;       // 0 → 1 progress
  duration: number;
  trail: { x: number; y: number; age: number }[];
}

export class PixiEventPulseSystem {
  private orbs: Orb[] = [];
  private graphics: Graphics;

  constructor(container: Container) {
    this.graphics = new Graphics();
    this.graphics.label = 'event_pulse_system';
    container.addChild(this.graphics);
  }

  fire(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: number,
  ): void {
    this.orbs.push({
      fromX, fromY, toX, toY,
      color,
      t: 0,
      duration: 1.0,
      trail: [],
    });
  }

  update(dt: number): void {
    const dtSec = dt / 1000;
    for (const orb of this.orbs) {
      if (orb.t >= 1) continue;

      // Record trail point at current position
      const prevT = orb.t;
      const px = orb.fromX + (orb.toX - orb.fromX) * prevT;
      const py = orb.fromY + (orb.toY - orb.fromY) * prevT;
      orb.trail.push({ x: px, y: py, age: 0 });

      orb.t = Math.min(1, orb.t + dtSec / orb.duration);

      // Age trail points
      for (const tp of orb.trail) {
        tp.age += dtSec;
      }
      // Remove old trail points
      orb.trail = orb.trail.filter(tp => tp.age < 0.3);
    }

    // Remove completed orbs
    this.orbs = this.orbs.filter(o => o.t < 1 || o.trail.length > 0);
  }

  draw(): void {
    this.graphics.clear();

    for (const orb of this.orbs) {
      // Draw trail
      for (const tp of orb.trail) {
        const alpha = (1 - tp.age / 0.3) * 0.4;
        const size = 2 + (1 - tp.age / 0.3) * 3;
        this.graphics.circle(tp.x, tp.y, size).fill({ color: orb.color, alpha });
      }

      if (orb.t >= 1) continue;

      // Current orb position
      const ox = orb.fromX + (orb.toX - orb.fromX) * orb.t;
      const oy = orb.fromY + (orb.toY - orb.fromY) * orb.t;

      // Fade in/out
      const alpha = orb.t < 0.1
        ? orb.t / 0.1
        : orb.t > 0.85
          ? (1 - orb.t) / 0.15
          : 1;

      // Outer glow
      this.graphics.circle(ox, oy, 10).fill({ color: orb.color, alpha: alpha * 0.25 });
      this.graphics.circle(ox, oy, 7).fill({ color: orb.color, alpha: alpha * 0.5 });
      // Core
      this.graphics.circle(ox, oy, 4).fill({ color: orb.color, alpha: alpha * 0.9 });
      this.graphics.circle(ox, oy, 2).fill({ color: 0xffffff, alpha: alpha * 0.8 });
    }
  }
}
