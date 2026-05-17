// ─── PixiParticles.ts — Simple PixiJS Graphics particle pool ─────────────────

import { Container, Graphics } from 'pixi.js';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: number;
  alpha: number;
}

const MAX_PARTICLES = 100;

export class PixiParticleSystem {
  private particles: Particle[] = [];
  private graphics: Graphics;

  constructor(container: Container) {
    this.graphics = new Graphics();
    this.graphics.label = 'particle_system';
    container.addChild(this.graphics);
  }

  emit(
    x: number,
    y: number,
    count: number,
    color: number,
    opts?: Partial<Particle>,
  ): void {
    for (let i = 0; i < count; i++) {
      // Reuse dead particle if pool is full
      let p: Particle | null = null;
      if (this.particles.length < MAX_PARTICLES) {
        p = {} as Particle;
        this.particles.push(p);
      } else {
        // Find a dead one to recycle
        for (const candidate of this.particles) {
          if (candidate.life <= 0) { p = candidate; break; }
        }
        if (!p) return; // All alive, skip
      }

      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 60;
      p.x = x + (Math.random() - 0.5) * 8;
      p.y = y + (Math.random() - 0.5) * 8;
      p.vx = opts?.vx ?? Math.cos(angle) * speed;
      p.vy = opts?.vy ?? Math.sin(angle) * speed;
      p.maxLife = opts?.maxLife ?? 0.6 + Math.random() * 0.4;
      p.life = p.maxLife;
      p.size = opts?.size ?? 1.5 + Math.random() * 2.5;
      p.color = opts?.color ?? color;
      p.alpha = opts?.alpha ?? 1;
    }
  }

  update(dt: number): void {
    const dtSec = dt / 1000;
    for (const p of this.particles) {
      if (p.life <= 0) continue;
      p.life -= dtSec;
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.vy += 60 * dtSec; // gravity
      p.vx *= 0.98;       // drag
      p.size = Math.max(0, p.size - dtSec * 2);
    }
  }

  draw(): void {
    this.graphics.clear();
    for (const p of this.particles) {
      if (p.life <= 0 || p.size <= 0) continue;
      const lifeFrac = p.life / p.maxLife;
      const alpha = p.alpha * lifeFrac;
      this.graphics.circle(p.x, p.y, p.size).fill({ color: p.color, alpha });
    }
  }
}
