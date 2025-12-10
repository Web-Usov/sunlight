export interface Lens {
  id: string;
  aperture: number;
  focalLength: number;
  position: number;
}

export type PVShape = 'rectangular' | 'circular';

export interface PhotovoltaicCell {
  shape: PVShape;
  width: number;
  height: number;
  diameter: number;
  efficiency: number;
  position: number;
}

export interface LightSource {
  intensity: number;
  zenithAngle: number;
}

export interface OpticalSystem {
  lenses: Lens[];
  pv: PhotovoltaicCell;
}

export interface RayTraceResult {
  spotDiameter: number;
  spotArea: number;
  spotCenterY: number;
  spotCenterZ: number;
  effectiveArea: number;
  concentrationRatio: number;
  isValid: boolean;
}

export interface PowerCalculationResult {
  inputPower: number;
  outputPower: number;
  spotDiameter: number;
  effectiveArea: number;
  concentrationRatio: number;
  systemEfficiency: number;
  isValid: boolean;
}

export interface AngleSweepResult {
  angle: number;
  power: number;
  efficiency: number;
}


