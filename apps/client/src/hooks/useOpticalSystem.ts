import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Lens,
  PhotovoltaicCell,
  OpticalSystem,
  LightSource,
  PowerCalculationResult,
  AngleSweepResult,
  createLens,
  calculatePower,
  sweepAngle,
  validateOpticalSystem,
  DEFAULT_SOLAR_INTENSITY,
} from '@sunlight/optics-core';

const STORAGE_KEY = 'sunlight-optical-system';

interface StoredState {
  lenses: Lens[];
  pv: PhotovoltaicCell;
  intensity: number;
  zenithAngle: number;
  lensIdCounter: number;
}

let lensIdCounter = 0;

function generateLensId(): string {
  return `lens-${++lensIdCounter}`;
}

const DEFAULT_LENS: Omit<Lens, 'id'> = {
  aperture: 0.1,
  focalLength: 0.2,
  position: 0,
};

const DEFAULT_PV: PhotovoltaicCell = {
  shape: 'rectangular',
  width: 0.05,
  height: 0.05,
  diameter: 0.05,
  efficiency: 0.2,
  position: 0.25,
};

function loadFromStorage(): StoredState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Failed to load from localStorage:', e);
  }
  return null;
}

function saveToStorage(state: StoredState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
}

function getInitialState(): StoredState {
  const stored = loadFromStorage();
  if (stored) {
    lensIdCounter = stored.lensIdCounter || 0;
    return stored;
  }
  
  return {
    lenses: [createLens(generateLensId(), DEFAULT_LENS.aperture, DEFAULT_LENS.focalLength, DEFAULT_LENS.position)],
    pv: DEFAULT_PV,
    intensity: DEFAULT_SOLAR_INTENSITY,
    zenithAngle: 0,
    lensIdCounter: 1,
  };
}

export function useOpticalSystem() {
  const initialState = useMemo(() => getInitialState(), []);
  
  const [lenses, setLenses] = useState<Lens[]>(initialState.lenses);
  const [pv, setPV] = useState<PhotovoltaicCell>(initialState.pv);
  const [intensity, setIntensity] = useState(initialState.intensity);
  const [zenithAngle, setZenithAngle] = useState(initialState.zenithAngle);

  useEffect(() => {
    const state: StoredState = {
      lenses,
      pv,
      intensity,
      zenithAngle,
      lensIdCounter,
    };
    saveToStorage(state);
  }, [lenses, pv, intensity, zenithAngle]);

  const system: OpticalSystem = useMemo(() => ({ lenses, pv }), [lenses, pv]);
  const lightSource: LightSource = useMemo(() => ({ intensity, zenithAngle }), [intensity, zenithAngle]);

  const validationErrors = useMemo(() => validateOpticalSystem(system), [system]);
  const isValid = validationErrors.length === 0;

  const result: PowerCalculationResult | null = useMemo(() => {
    if (!isValid) return null;
    return calculatePower(system, lightSource);
  }, [system, lightSource, isValid]);

  const angleSweepData: AngleSweepResult[] = useMemo(() => {
    if (!isValid) return [];
    return sweepAngle(system, intensity, 0, 85, 1);
  }, [system, intensity, isValid]);

  const addLens = useCallback(() => {
    if (lenses.length >= 3) return;
    const lastLens = lenses[lenses.length - 1];
    const newPosition = lastLens ? lastLens.position + lastLens.focalLength * 0.5 : 0;
    setLenses(prev => [
      ...prev,
      createLens(generateLensId(), DEFAULT_LENS.aperture, DEFAULT_LENS.focalLength, newPosition),
    ]);
  }, [lenses]);

  const removeLens = useCallback((id: string) => {
    if (lenses.length <= 1) return;
    setLenses(prev => prev.filter(l => l.id !== id));
  }, [lenses.length]);

  const updateLens = useCallback((id: string, updates: Partial<Omit<Lens, 'id'>>) => {
    setLenses(prev =>
      prev.map(lens => (lens.id === id ? { ...lens, ...updates } : lens))
    );
  }, []);

  const updatePV = useCallback((updates: Partial<PhotovoltaicCell>) => {
    setPV(prev => ({ ...prev, ...updates }));
  }, []);

  const reset = useCallback(() => {
    lensIdCounter = 0;
    const newLenses = [createLens(generateLensId(), DEFAULT_LENS.aperture, DEFAULT_LENS.focalLength, DEFAULT_LENS.position)];
    setLenses(newLenses);
    setPV(DEFAULT_PV);
    setIntensity(DEFAULT_SOLAR_INTENSITY);
    setZenithAngle(0);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    lenses,
    pv,
    intensity,
    zenithAngle,
    system,
    lightSource,
    result,
    angleSweepData,
    validationErrors,
    isValid,
    addLens,
    removeLens,
    updateLens,
    updatePV,
    setIntensity,
    setZenithAngle,
    reset,
  };
}
