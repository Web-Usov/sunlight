import { useState, useCallback, useMemo, useEffect } from "react";
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
} from "@sunlight/optics-core";

const STORAGE_KEY = "sunlight-optical-system";

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

const DEFAULT_LENS: Omit<Lens, "id"> = {
  aperture: 0.1,
  focalLength: 0.2,
  position: 0,
  transmittance: 0.92,
};

const DEFAULT_PV: PhotovoltaicCell = {
  shape: "rectangular",
  width: 0.05,
  height: 0.05,
  diameter: 0.05,
  efficiency: 0.2,
  position: 0.25,
};

function csvEscape(value: string): string {
  if (value.includes('"')) {
    value = value.replace(/"/g, '""');
  }
  if (value.includes(",") || value.includes("\n") || value.includes("\r")) {
    return `"${value}"`;
  }
  return value;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  result.push(current);
  return result;
}

function parseNumber(value: string): number | null {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return null;
  }
  return num;
}

function loadFromStorage(): StoredState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored) as StoredState;

      data.lenses = data.lenses.map((lens) => {
        const legacyLens = lens as Lens & { transmittance?: number };
        const updatedLens: Lens = {
          id: lens.id,
          aperture: lens.aperture,
          focalLength: lens.focalLength,
          position: lens.position,
          transmittance: legacyLens.transmittance ?? DEFAULT_LENS.transmittance,
        };
        return updatedLens;
      });

      if (data.lenses.length === 0) {
        data.lenses = [
          createLens(
            generateLensId(),
            DEFAULT_LENS.aperture,
            DEFAULT_LENS.focalLength,
            DEFAULT_LENS.position
          ),
        ];
      } else if (data.lenses.length > 1) {
        data.lenses = [data.lenses[0]];
      }

      if (data.intensity === 1000) {
        data.intensity = DEFAULT_SOLAR_INTENSITY;
      }

      return data;
    }
  } catch (e) {
    console.warn("Failed to load from localStorage:", e);
  }
  return null;
}

function saveToStorage(state: StoredState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Failed to save to localStorage:", e);
  }
}

function getInitialState(): StoredState {
  const stored = loadFromStorage();
  if (stored) {
    lensIdCounter = stored.lensIdCounter || 0;
    return stored;
  }

  return {
    lenses: [
      createLens(
        generateLensId(),
        DEFAULT_LENS.aperture,
        DEFAULT_LENS.focalLength,
        DEFAULT_LENS.position
      ),
    ],
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
  const lightSource: LightSource = useMemo(
    () => ({ intensity, zenithAngle }),
    [intensity, zenithAngle]
  );

  const validationErrors = useMemo(
    () => validateOpticalSystem(system),
    [system]
  );
  const isValid = validationErrors.length === 0;

  const result: PowerCalculationResult | null = useMemo(() => {
    if (!isValid) return null;
    return calculatePower(system, lightSource);
  }, [system, lightSource, isValid]);

  const angleSweepData: AngleSweepResult[] = useMemo(() => {
    if (!isValid) return [];
    return sweepAngle(system, intensity, 0, 85, 1);
  }, [system, intensity, isValid]);

  const updateLens = useCallback(
    (id: string, updates: Partial<Omit<Lens, "id">>) => {
      setLenses((prev) =>
        prev.map((lens) => (lens.id === id ? { ...lens, ...updates } : lens))
      );
    },
    []
  );

  const updatePV = useCallback((updates: Partial<PhotovoltaicCell>) => {
    setPV((prev) => ({ ...prev, ...updates }));
  }, []);

  const reset = useCallback(() => {
    lensIdCounter = 0;
    const newLenses = [
      createLens(
        generateLensId(),
        DEFAULT_LENS.aperture,
        DEFAULT_LENS.focalLength,
        DEFAULT_LENS.position
      ),
    ];
    setLenses(newLenses);
    setPV(DEFAULT_PV);
    setIntensity(DEFAULT_SOLAR_INTENSITY);
    setZenithAngle(0);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const exportCsv = useCallback((): string => {
    const rows: string[][] = [["entity", "index", "field", "value"]];

    lenses.forEach((lens, index) => {
      rows.push(["lens", String(index), "aperture", String(lens.aperture)]);
      rows.push(["lens", String(index), "focalLength", String(lens.focalLength)]);
      rows.push(["lens", String(index), "position", String(lens.position)]);
      rows.push(["lens", String(index), "transmittance", String(lens.transmittance)]);
    });

    rows.push(["pv", "0", "shape", pv.shape]);
    rows.push(["pv", "0", "width", String(pv.width)]);
    rows.push(["pv", "0", "height", String(pv.height)]);
    rows.push(["pv", "0", "diameter", String(pv.diameter)]);
    rows.push(["pv", "0", "efficiency", String(pv.efficiency)]);
    rows.push(["pv", "0", "position", String(pv.position)]);

    rows.push(["lightSource", "0", "intensity", String(intensity)]);
    rows.push(["lightSource", "0", "zenithAngle", String(zenithAngle)]);

    return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  }, [lenses, pv, intensity, zenithAngle]);

  const importFromCsv = useCallback(
    (csvText: string): void => {
      const lines = csvText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (lines.length === 0) {
        throw new Error("CSV пустой");
      }

      const rows = lines.map(parseCsvLine);
      const header = rows[0];
      const hasHeader =
        header.length >= 4 &&
        header[0].toLowerCase() === "entity" &&
        header[1].toLowerCase() === "index" &&
        header[2].toLowerCase() === "field" &&
        header[3].toLowerCase() === "value";

      const dataRows = hasHeader ? rows.slice(1) : rows;

      const lensMap = new Map<number, Partial<Omit<Lens, "id">>>();
      const pvUpdates: Partial<PhotovoltaicCell> = {};
      const lightUpdates: Partial<LightSource> = {};

      dataRows.forEach((row) => {
        if (row.length < 4) return;
        const [entityRaw, indexRaw, fieldRaw, valueRaw] = row;
        const entity = entityRaw.trim();
        const field = fieldRaw.trim();
        const value = valueRaw.trim();

        if (entity === "lens") {
          const index = Number(indexRaw);
          if (!Number.isInteger(index) || index < 0) return;
          const entry = lensMap.get(index) ?? {};
          if (field === "aperture" || field === "focalLength" || field === "position" || field === "transmittance") {
            const num = parseNumber(value);
            if (num !== null) {
              (entry as Record<string, number>)[field] = num;
              lensMap.set(index, entry);
            }
          }
          return;
        }

        if (entity === "pv") {
          if (field === "shape") {
            if (value === "rectangular" || value === "circular") {
              pvUpdates.shape = value;
            }
            return;
          }
          if (field === "width" || field === "height" || field === "diameter" || field === "efficiency" || field === "position") {
            const num = parseNumber(value);
            if (num !== null) {
              (pvUpdates as Record<string, number>)[field] = num;
            }
          }
          return;
        }

        if (entity === "lightSource") {
          if (field === "intensity" || field === "zenithAngle") {
            const num = parseNumber(value);
            if (num !== null) {
              (lightUpdates as Record<string, number>)[field] = num;
            }
          }
        }
      });

      const newLenses: Lens[] = [];
      const lensEntries = Array.from(lensMap.entries()).sort((a, b) => a[0] - b[0]);
      if (lensEntries.length === 0) {
        newLenses.push(
          createLens(
            generateLensId(),
            DEFAULT_LENS.aperture,
            DEFAULT_LENS.focalLength,
            DEFAULT_LENS.position,
            DEFAULT_LENS.transmittance
          )
        );
      } else {
        lensEntries.forEach(([, partial]) => {
          const lensData = { ...DEFAULT_LENS, ...partial };
          newLenses.push(
            createLens(
              generateLensId(),
              lensData.aperture,
              lensData.focalLength,
              lensData.position,
              lensData.transmittance
            )
          );
        });
      }

      const newPv: PhotovoltaicCell = { ...DEFAULT_PV, ...pvUpdates };
      const newIntensity = lightUpdates.intensity ?? DEFAULT_SOLAR_INTENSITY;
      const newZenithAngle = lightUpdates.zenithAngle ?? 0;

      lensIdCounter = newLenses.length;
      setLenses(newLenses);
      setPV(newPv);
      setIntensity(newIntensity);
      setZenithAngle(newZenithAngle);
    },
    []
  );

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
    updateLens,
    updatePV,
    setIntensity,
    setZenithAngle,
    reset,
    exportCsv,
    importFromCsv,
  };
}
