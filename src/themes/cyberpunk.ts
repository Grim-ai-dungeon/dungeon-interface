// ─── Cyberpunk Dungeon Theme ──────────────────────────────────────────────────
// The original look: dark, neon cyan/green. Classic dungeon hacker aesthetic.

import type { Theme } from './types';

export const cyberpunkDungeonTheme: Theme = {
  id: 'cyberpunk',
  name: 'Cyberpunk Dungeon',
  description: 'Classic dark hacker aesthetic — neon cyan on deep black',

  fontTitle: "'Orbitron', sans-serif",
  fontMono: "'Share Tech Mono', monospace",

  headerEmoji: '🐉',

  glowIntensity: 1.0,
  scanLineStyle: 'normal',

  colors: {
    bgDeep: '#07070f',
    bgPanel: '#0a0a16',
    bgCard: '#0d0d1e',

    primary: '#00f5ff',
    primaryDim: '#00a8b5',
    primaryDark: '#003d45',

    secondary: '#ffd700',
    secondaryDim: '#b8960a',

    statusGreen: '#00ff88',
    statusGreenDim: '#00a855',
    statusBlue: '#4488ff',
    statusBlueDim: '#2244aa',
    statusPurple: '#aa44ff',
    statusPurpleDim: '#661faa',
    statusRed: '#ff4444',
    statusOrange: '#ff6600',

    borderPrimary: 'rgba(0, 245, 255, 0.3)',
    borderSecondary: 'rgba(255, 215, 0, 0.35)',

    textPrimary: '#00f5ff',
    textDim: 'rgba(0, 245, 255, 0.5)',
    textDimmer: 'rgba(0, 245, 255, 0.3)',
  },

  pixi: {
    bgColor: 0x080810,
    gridColor: 0x00f5ff,
    gridAlpha: 0.04,
    connColor: 0x00f5ff,
    connCoreColor: 0x00ffff,
    floorFill: 0x0c0c18,
    floorBorder: 0x00f5ff,
    scanLineColor: 0x00f5ff,

    packetColors: [0x00ffff, 0x00ff88, 0xffd700, 0xff6600, 0xaa44ff],

    rooms: {
      grim: { color: 0x1a0a2e, glowColor: 0xffd700 },
      bob: { color: 0x0a1a2e, glowColor: 0x00f5ff },
      kevin: { color: 0x0a2e0a, glowColor: 0x00ff88 },
      screen: { color: 0x1a1a0a, glowColor: 0xff6600 },
    },
  },
};
