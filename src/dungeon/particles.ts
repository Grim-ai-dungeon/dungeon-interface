// ─── Ambient particle systems ─────────────────────────────────────────────────
// Dust motes, torch sparks, magical glimmers — all procedural Canvas2D.

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;      // 0..1
  maxLife: number;   // in ms
  born: number;      // Date.now() when created
  type: 'dust' | 'spark' | 'magic' | 'smoke';
  color: string;
  size: number;
}

/** Particle pool per area */
export class ParticleSystem {
  private particles: Particle[] = [];
  private seed = 0;

  constructor(seed = 42) {
    this.seed = seed;
  }

  /** Seeded rand */
  private rand(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  /** Emit dust motes in a zone */
  emitDust(zoneX: number, zoneY: number, zoneW: number, zoneH: number, count: number): void {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: zoneX + this.rand() * zoneW,
        y: zoneY + this.rand() * zoneH,
        vx: (this.rand() - 0.5) * 0.15,
        vy: -(0.05 + this.rand() * 0.15),
        life: this.rand(), // stagger start lives
        maxLife: 4000 + this.rand() * 6000,
        born: Date.now() - this.rand() * 6000,
        type: 'dust',
        color: '#F3E0BE',
        size: 0.8 + this.rand() * 1.2,
      });
    }
  }

  /** Emit a spark at a position */
  emitSpark(x: number, y: number, color: string, count = 1): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.PI + (this.rand() - 0.5) * Math.PI * 0.6;
      const speed = 1.5 + this.rand() * 2.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        life: 1,
        maxLife: 400 + this.rand() * 600,
        born: Date.now(),
        type: 'spark',
        color,
        size: 1 + this.rand() * 1.5,
      });
    }
  }

  /** Emit magical glimmers */
  emitMagic(x: number, y: number, radius: number, color: string, count = 1): void {
    for (let i = 0; i < count; i++) {
      const angle = this.rand() * Math.PI * 2;
      const dist = this.rand() * radius;
      this.particles.push({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        vx: (this.rand() - 0.5) * 0.4,
        vy: -(0.1 + this.rand() * 0.5),
        life: 1,
        maxLife: 1200 + this.rand() * 1800,
        born: Date.now(),
        type: 'magic',
        color,
        size: 1 + this.rand() * 2,
      });
    }
  }

  /** Emit smoke wisps near torches */
  emitSmoke(x: number, y: number, count = 1): void {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (this.rand() - 0.5) * 6,
        y,
        vx: (this.rand() - 0.5) * 0.3,
        vy: -(0.3 + this.rand() * 0.5),
        life: 1,
        maxLife: 1500 + this.rand() * 1000,
        born: Date.now(),
        type: 'smoke',
        color: '#888888',
        size: 2 + this.rand() * 3,
      });
    }
  }

  /** Update all particles and remove dead ones */
  update(now: number): void {
    this.particles = this.particles.filter(p => {
      const age = now - p.born;
      p.life = Math.max(0, 1 - age / p.maxLife);

      // Drift
      p.x += p.vx;
      p.y += p.vy;

      // Sine wave X drift for dust
      if (p.type === 'dust') {
        p.x += Math.sin(now / 2000 + p.y * 0.01) * 0.08;
      }

      // Gravity for sparks
      if (p.type === 'spark') {
        p.vy += 0.08;
      }

      // Smoke widens and slows
      if (p.type === 'smoke') {
        p.vx *= 0.99;
        p.vy *= 0.98;
        p.size += 0.02;
      }

      return p.life > 0;
    });
  }

  /** Draw all particles */
  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const p of this.particles) {
      const alpha = p.life;

      switch (p.type) {
        case 'dust': {
          ctx.globalAlpha = alpha * 0.25;
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
          break;
        }
        case 'spark': {
          ctx.globalAlpha = alpha;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 4;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          break;
        }
        case 'magic': {
          ctx.globalAlpha = alpha * 0.8;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 6;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (0.5 + alpha * 0.5), 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          break;
        }
        case 'smoke': {
          ctx.globalAlpha = alpha * 0.12;
          ctx.fillStyle = '#aaaaaa';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  get count(): number {
    return this.particles.length;
  }
}
