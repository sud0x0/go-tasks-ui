import type { AccentColour } from '../stores/preferences'

interface AccentVars {
  '--accent': string
  '--accent-dark': string
  '--accent-light': string
}

// Material Design 2 colour palette values
const accentPalette: Record<AccentColour, AccentVars> = {
  green: {
    '--accent': '#4CAF50', // Green 500
    '--accent-dark': '#388E3C', // Green 700
    '--accent-light': '#81C784', // Green 300
  },
  blue: {
    '--accent': '#2196F3', // Blue 500
    '--accent-dark': '#1976D2', // Blue 700
    '--accent-light': '#64B5F6', // Blue 300
  },
  red: {
    '--accent': '#F44336', // Red 500
    '--accent-dark': '#D32F2F', // Red 700
    '--accent-light': '#E57373', // Red 300
  },
  orange: {
    '--accent': '#FF9800', // Orange 500
    '--accent-dark': '#F57C00', // Orange 700
    '--accent-light': '#FFB74D', // Orange 300
  },
  pink: {
    '--accent': '#E91E63', // Pink 500
    '--accent-dark': '#C2185B', // Pink 700
    '--accent-light': '#F06292', // Pink 300
  },
  purple: {
    '--accent': '#9C27B0', // Purple 500
    '--accent-dark': '#7B1FA2', // Purple 700
    '--accent-light': '#BA68C8', // Purple 300
  },
}

export function accentToCssVars(colour: AccentColour): AccentVars {
  return accentPalette[colour]
}

export function getAccentHex(colour: AccentColour): string {
  return accentPalette[colour]['--accent']
}
