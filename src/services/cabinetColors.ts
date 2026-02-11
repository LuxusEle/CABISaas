import { PresetType } from '../types';

export interface CabinetColorSet {
  exterior: {
    stroke: string;       // hex color for outlines
    fill: string;         // rgba color for transparent fill (2D)
    rgb: [number, number, number]; // raw RGB for 3D brightness math
  };
  interior: {
    stroke: string;       // hex color for interior outlines
    fill: string;         // rgba color for interior fill (2D)
    rgb: [number, number, number]; // raw RGB for 3D interior
  };
}

// Cabinet types that are considered "open" (show interior)
const OPEN_CABINET_TYPES: PresetType[] = [
  PresetType.OPEN_BOX,
];

// Check if a cabinet preset is an open cabinet (shows interior)
export const isOpenCabinet = (preset: PresetType): boolean => {
  return OPEN_CABINET_TYPES.includes(preset);
};

// Exterior colors - consistent material for all closed cabinets
const EXTERIOR_COLOR = {
  stroke: '#94A3B8',      // Slate-400 for exterior outlines
  fill: 'rgba(148,163,184,0.15)', // Light slate fill
  rgb: [148, 163, 184] as [number, number, number],
};

// Interior colors - wood-like color for open cabinets
const INTERIOR_COLOR = {
  stroke: '#92400E',      // Amber-800 for wood outlines
  fill: 'rgba(146,64,14,0.3)', // Wood-like fill
  rgb: [146, 64, 14] as [number, number, number],
};

// Get the appropriate color set based on preset type
export const getCabinetColors = (preset: PresetType): CabinetColorSet => {
  return {
    exterior: EXTERIOR_COLOR,
    interior: INTERIOR_COLOR,
  };
};

// Get the active color (exterior for closed, interior for open)
export const getActiveColor = (preset: PresetType) => {
  const colors = getCabinetColors(preset);
  return isOpenCabinet(preset) ? colors.interior : colors.exterior;
};
