// ─── Room definitions and layout ──────────────────────────────────────────────
// Grid-based 2D top-down dungeon layout.
// Tile size = 48px. Clean grid layout with gaps between rooms (no shared walls).
//
// Layout (col, row) — all rooms are 5×5 tiles:
//   Top row:    [Bob col=0]   [Grim col=7]   [Kevin col=14]
//   Bottom row: [Agnes col=4] [Stuart col=11]   (centered under top row)
//
// Gap of 2 tiles between rooms.
// Top row starts at gridY=0, bottom row starts at gridY=7 (5 tiles + 2 gap)

import type { Room, AgentId } from '../types';
import { TILE_SIZE } from './tiles';

export const GRID_COLS = 19;
export const GRID_ROWS = 12;

// Room definitions in tile-grid coords — clean grid with gaps
export const ROOMS: Room[] = [
  {
    id: 'bob' as AgentId,
    label: "Bob's Library",
    gridX: 0,
    gridY: 0,
    widthTiles: 5,
    heightTiles: 5,
    floorType: 'stone',
    backgroundImage: './rooms/bob.png',
  },
  {
    id: 'grim' as AgentId,
    label: "Grim's Chamber",
    gridX: 7,
    gridY: 0,
    widthTiles: 5,
    heightTiles: 5,
    floorType: 'stone',
    backgroundImage: './rooms/grim.png',
  },
  {
    id: 'kevin' as AgentId,
    label: "Kevin's Workshop",
    gridX: 14,
    gridY: 0,
    widthTiles: 5,
    heightTiles: 5,
    floorType: 'brick',
    backgroundImage: './rooms/kevin.png',
  },
  {
    id: 'agnes' as AgentId,
    label: "Agnes's Studio",
    gridX: 4,
    gridY: 7,
    widthTiles: 5,
    heightTiles: 5,
    floorType: 'stone',
    backgroundImage: './rooms/agnes.png',
  },
  {
    id: 'stuart' as AgentId,
    label: "Stuart's Treasury",
    gridX: 11,
    gridY: 7,
    widthTiles: 5,
    heightTiles: 5,
    floorType: 'gold',
    backgroundImage: './rooms/stuart.png',
  },
];

// Corridors: empty — pure void between rooms
export interface CorridorSegment {
  x: number;
  y: number;
  length: number;
  direction: 'h' | 'v';
  width: number;
}

export const CORRIDORS: CorridorSegment[] = [];

/** Convert tile grid coords to canvas pixel coords */
export function tileToPixel(gridX: number, gridY: number): { px: number; py: number } {
  return { px: gridX * TILE_SIZE, py: gridY * TILE_SIZE };
}

export function roomPixelBounds(room: Room): { px: number; py: number; w: number; h: number } {
  const { px, py } = tileToPixel(room.gridX, room.gridY);
  return { px, py, w: room.widthTiles * TILE_SIZE, h: room.heightTiles * TILE_SIZE };
}

/** Returns the center pixel of a room */
export function roomCenter(room: Room): { cx: number; cy: number } {
  const { px, py, w, h } = roomPixelBounds(room);
  return { cx: px + w / 2, cy: py + h / 2 };
}

/** Canvas size based on grid */
export const CANVAS_W = GRID_COLS * TILE_SIZE;
export const CANVAS_H = GRID_ROWS * TILE_SIZE;

/**
 * Calculate the next available grid position for a new 4x4 room.
 * Strategy: scan row by row, column by column for a gap that fits.
 */
export function getNextRoomPosition(rooms: Room[]): { gridX: number; gridY: number } {
  const DEFAULT_W = 5;
  const DEFAULT_H = 5;

  // Build a set of occupied cells (with 2-tile gap padding)
  const occupied = new Set<string>();
  for (const r of rooms) {
    for (let x = r.gridX - 2; x < r.gridX + r.widthTiles + 2; x++) {
      for (let y = r.gridY - 2; y < r.gridY + r.heightTiles + 2; y++) {
        occupied.add(`${x},${y}`);
      }
    }
  }

  // Try to find a spot — scan row then col
  for (let row = 0; row < 40; row++) {
    for (let col = 0; col < 40; col++) {
      let fits = true;
      outer: for (let x = col; x < col + DEFAULT_W; x++) {
        for (let y = row; y < row + DEFAULT_H; y++) {
          if (occupied.has(`${x},${y}`)) { fits = false; break outer; }
        }
      }
      if (fits) return { gridX: col, gridY: row };
    }
  }

  // Fallback — place below all rooms
  const maxY = Math.max(...rooms.map(r => r.gridY + r.heightTiles));
  return { gridX: 0, gridY: maxY + 2 };
}
