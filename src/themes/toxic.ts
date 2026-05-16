import type { Theme } from './types';

export const toxicTheme: Theme = {
  id: 'toxic',
  name: 'Toxic Wasteland',
  description: 'Acid greens, hazard yellows, radioactive glow, post-apocalyptic industrial',

  fontTitle: "'Creepster', cursive",
  fontMono: "'Fira Code', monospace",

  headerEmoji: '☢️',

  glowIntensity: 1.5,
  scanLineStyle: 'heavy',

  colors: {
    bgDeep: '#141710',
    bgPanel: '#2E3A1A',
    bgCard: '#3A4B21',

    primary: '#BFFF00',
    primaryDim: '#8CA600',
    primaryDark: '#596900',

    secondary: '#6B8E23',
    secondaryDim: '#4A6318',

    statusGreen: '#BFFF00',
    statusGreenDim: '#8CA600',
    statusBlue: '#00BFFF',
    statusBlueDim: '#008CBA',
    statusPurple: '#FF00FF',
    statusPurpleDim: '#A300A3',
    statusRed: '#FF3300',
    statusOrange: '#FF9900',

    borderPrimary: 'rgba(191, 255, 0, 0.4)',
    borderSecondary: 'rgba(107, 142, 35, 0.4)',

    textPrimary: '#BFFF00',
    textDim: 'rgba(191, 255, 0, 0.6)',
    textDimmer: 'rgba(191, 255, 0, 0.3)',
  },

  pixi: {
    bgColor: 0x141710,
    gridColor: 0x6B8E23,
    gridAlpha: 0.1,
    connColor: 0x6B8E23,
    connCoreColor: 0xBFFF00,
    floorFill: 0x2E3A1A,
    floorBorder: 0xBFFF00,
    scanLineColor: 0x596900,

    packetColors: [0xBFFF00, 0xFF00FF, 0xFF3300, 0xFF9900, 0x6B8E23],

    rooms: {
      grim: { color: 0x4B213A, glowColor: 0xFF00FF },
      bob: { color: 0x213A4B, glowColor: 0x00BFFF },
      kevin: { color: 0x3A4B21, glowColor: 0xBFFF00 },
      screen: { color: 0x4B3A21, glowColor: 0xFF9900 },
    },
  },
};
