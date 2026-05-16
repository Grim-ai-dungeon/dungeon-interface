// ─── Arctic Fortress Theme ────────────────────────────────────────────────────
// Ice blues, whites, cold/clean — a frozen citadel of control.

import type { Theme } from './types';

export const arcticFortressTheme: Theme = {
  id: 'arctic',
  name: 'Arctic Fortress',
  description: 'Ice-cold blues & whites — a frozen citadel',

  fontTitle: "'Orbitron', sans-serif",
  fontMono: "'Share Tech Mono', monospace",

  headerEmoji: '❄️',

  glowIntensity: 0.8,
  scanLineStyle: 'subtle',

  colors: {
    bgDeep: '#030810',
    bgPanel: '#060c18',
    bgCard: '#081020',

    primary: '#88ddff',
    primaryDim: '#4499cc',
    primaryDark: '#102040',

    secondary: '#ffffff',
    secondaryDim: '#aaccee',

    statusGreen: '#44ffcc',
    statusGreenDim: '#22aa88',
    statusBlue: '#66aaff',
    statusBlueDim: '#3366cc',
    statusPurple: '#aa88ff',
    statusPurpleDim: '#664499',
    statusRed: '#ff6688',
    statusOrange: '#ffcc44',

    borderPrimary: 'rgba(136, 221, 255, 0.3)',
    borderSecondary: 'rgba(255, 255, 255, 0.25)',

    textPrimary: '#88ddff',
    textDim: 'rgba(136, 221, 255, 0.5)',
    textDimmer: 'rgba(136, 221, 255, 0.25)',
  },

  pixi: {
    bgColor: 0x030810,
    gridColor: 0x88ddff,
    gridAlpha: 0.04,
    connColor: 0x88ddff,
    connCoreColor: 0xaaeeff,
    floorFill: 0x081020,
    floorBorder: 0x4499cc,
    scanLineColor: 0x88ddff,

    packetColors: [0x88ddff, 0x44ffcc, 0xffffff, 0x66aaff, 0xaa88ff],

    rooms: {
      grim: { color: 0x0a1828, glowColor: 0xffffff },
      bob: { color: 0x081830, glowColor: 0x88ddff },
      kevin: { color: 0x082818, glowColor: 0x44ffcc },
      screen: { color: 0x101828, glowColor: 0x66aaff },
    },
  },
};
