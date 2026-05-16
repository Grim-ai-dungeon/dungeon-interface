// ─── Hellfire Theme ───────────────────────────────────────────────────────────
// Dark reds, oranges, lava/fire aesthetic. The dungeon burns.

import type { Theme } from './types';

export const hellfireTheme: Theme = {
  id: 'hellfire',
  name: 'Hellfire',
  description: 'Dark reds & molten orange — the dungeon is on fire',

  fontTitle: "'Orbitron', sans-serif",
  fontMono: "'Share Tech Mono', monospace",

  headerEmoji: '🔥',

  glowIntensity: 1.3,
  scanLineStyle: 'heavy',

  colors: {
    bgDeep: '#0f0500',
    bgPanel: '#150800',
    bgCard: '#1a0a00',

    primary: '#ff6600',
    primaryDim: '#cc4400',
    primaryDark: '#3d1100',

    secondary: '#ff2200',
    secondaryDim: '#aa1500',

    statusGreen: '#ff8800',
    statusGreenDim: '#cc5500',
    statusBlue: '#ff4422',
    statusBlueDim: '#992200',
    statusPurple: '#ff0066',
    statusPurpleDim: '#990044',
    statusRed: '#ff2200',
    statusOrange: '#ffaa00',

    borderPrimary: 'rgba(255, 102, 0, 0.35)',
    borderSecondary: 'rgba(255, 34, 0, 0.4)',

    textPrimary: '#ff6600',
    textDim: 'rgba(255, 102, 0, 0.55)',
    textDimmer: 'rgba(255, 102, 0, 0.3)',
  },

  pixi: {
    bgColor: 0x0f0500,
    gridColor: 0xff4400,
    gridAlpha: 0.05,
    connColor: 0xff4400,
    connCoreColor: 0xff8800,
    floorFill: 0x1a0800,
    floorBorder: 0xff4400,
    scanLineColor: 0xff4400,

    packetColors: [0xff6600, 0xff2200, 0xffaa00, 0xff0044, 0xdd4400],

    rooms: {
      grim: { color: 0x2e0a00, glowColor: 0xff2200 },
      bob: { color: 0x200a00, glowColor: 0xff6600 },
      kevin: { color: 0x2a1000, glowColor: 0xffaa00 },
      screen: { color: 0x1a0800, glowColor: 0xff4422 },
    },
  },
};
