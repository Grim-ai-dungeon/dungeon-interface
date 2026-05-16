import type { Theme } from './types';

export const deepSpaceTheme: Theme = {
  id: 'deepspace',
  name: 'Deep Space',
  description: 'Cosmic purples, nebula blues, starfield background, astronaut HUD aesthetic',

  fontTitle: "'Audiowide', sans-serif",
  fontMono: "'Exo 2', sans-serif",

  headerEmoji: '🌌',

  glowIntensity: 1.2,
  scanLineStyle: 'none',

  colors: {
    bgDeep: '#050510',
    bgPanel: '#1B113D',
    bgCard: '#2A1B54',

    primary: '#4581C6',
    primaryDim: '#2C5A91',
    primaryDark: '#16345C',

    secondary: '#3D2282',
    secondaryDim: '#251554',

    statusGreen: '#00ff88',
    statusGreenDim: '#00a855',
    statusBlue: '#4581C6',
    statusBlueDim: '#2C5A91',
    statusPurple: '#9D4EDD',
    statusPurpleDim: '#5A189A',
    statusRed: '#E63946',
    statusOrange: '#F4A261',

    borderPrimary: 'rgba(69, 129, 198, 0.4)',
    borderSecondary: 'rgba(61, 34, 130, 0.4)',

    textPrimary: '#E0E7FF',
    textDim: 'rgba(224, 231, 255, 0.6)',
    textDimmer: 'rgba(224, 231, 255, 0.3)',
  },

  pixi: {
    bgColor: 0x050510,
    gridColor: 0x4581C6,
    gridAlpha: 0.05,
    connColor: 0x3D2282,
    connCoreColor: 0x4581C6,
    floorFill: 0x1B113D,
    floorBorder: 0x4581C6,
    scanLineColor: 0x000000,

    packetColors: [0xE0E7FF, 0x4581C6, 0x3D2282, 0x9D4EDD, 0x48CAE4],

    rooms: {
      grim: { color: 0x2A1B54, glowColor: 0x9D4EDD },
      bob: { color: 0x1B2A54, glowColor: 0x4581C6 },
      kevin: { color: 0x1B543D, glowColor: 0x00ff88 },
      screen: { color: 0x542A1B, glowColor: 0xF4A261 },
    },
  },
};
