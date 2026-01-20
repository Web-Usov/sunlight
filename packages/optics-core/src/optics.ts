import type {
  Lens,
  PhotovoltaicCell,
  PVShape,
  OpticalSystem,
  LightSource,
  RayTraceResult,
  PowerCalculationResult,
  AngleSweepResult,
  ABCDMatrix,
} from "./types";

export const DEFAULT_SOLAR_INTENSITY = 1361;

export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function radToDeg(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function createLensMatrix(focalLength: number): ABCDMatrix {
  return [
    [1, 0],
    [-1 / focalLength, 1],
  ];
}

export function createPropagationMatrix(distance: number): ABCDMatrix {
  return [
    [1, distance],
    [0, 1],
  ];
}

export function multiplyMatrices(m1: ABCDMatrix, m2: ABCDMatrix): ABCDMatrix {
  const a = m1[0][0] * m2[0][0] + m1[0][1] * m2[1][0];
  const b = m1[0][0] * m2[0][1] + m1[0][1] * m2[1][1];
  const c = m1[1][0] * m2[0][0] + m1[1][1] * m2[1][0];
  const d = m1[1][0] * m2[0][1] + m1[1][1] * m2[1][1];

  return [
    [a, b],
    [c, d],
  ];
}

export function buildSystemMatrix(
  lenses: Lens[],
  pvPosition: number
): ABCDMatrix {
  if (lenses.length === 0) {
    return [
      [1, 0],
      [0, 1],
    ];
  }

  const sortedLenses = [...lenses].sort((a, b) => a.position - b.position);

  let systemMatrix: ABCDMatrix = [
    [1, 0],
    [0, 1],
  ];

  let currentPosition = 0;

  for (let i = 0; i < sortedLenses.length; i++) {
    const lens = sortedLenses[i];

    if (lens.position > currentPosition) {
      const propagationDistance = lens.position - currentPosition;
      const propagationMatrix = createPropagationMatrix(propagationDistance);
      systemMatrix = multiplyMatrices(propagationMatrix, systemMatrix);
    }

    const lensMatrix = createLensMatrix(lens.focalLength);
    systemMatrix = multiplyMatrices(lensMatrix, systemMatrix);

    currentPosition = lens.position;
  }

  const lastLens = sortedLenses[sortedLenses.length - 1];
  if (pvPosition > lastLens.position) {
    const finalPropagation = pvPosition - lastLens.position;
    const finalPropagationMatrix = createPropagationMatrix(finalPropagation);
    systemMatrix = multiplyMatrices(finalPropagationMatrix, systemMatrix);
  }

  return systemMatrix;
}

export function calculateOutputAngle(
  systemMatrix: ABCDMatrix,
  inputAngleRad: number,
  inputPosition: number = 0
): number {
  const y_in = inputPosition;
  const theta_in = inputAngleRad;

  const C = systemMatrix[1][0];
  const D = systemMatrix[1][1];

  const theta_out = C * y_in + D * theta_in;

  return theta_out;
}

export function calculateImageDistance(
  focalLength: number,
  objectDistance: number
): number {
  if (objectDistance === focalLength) {
    return Infinity;
  }
  return (focalLength * objectDistance) / (objectDistance - focalLength);
}

export function calculateEffectiveAperture(
  aperture: number,
  zenithAngle: number
): number {
  const angleRad = degToRad(zenithAngle);
  return aperture * Math.cos(angleRad);
}

export function calculatePVArea(pv: PhotovoltaicCell): number {
  if (pv.shape === "circular") {
    return Math.PI * Math.pow(pv.diameter / 2, 2);
  }
  return pv.width * pv.height;
}

export function calculatePVInscribedDiameter(pv: PhotovoltaicCell): number {
  if (pv.shape === "circular") {
    return pv.diameter;
  }
  return Math.min(pv.width, pv.height);
}

export function calculateSpotDiameterSingleLens(
  lens: Lens,
  pvPosition: number,
  zenithAngle: number
): number {
  const effectiveAperture = calculateEffectiveAperture(
    lens.aperture,
    zenithAngle
  );

  const distanceFromLensToPV = pvPosition - lens.position;

  if (distanceFromLensToPV <= 0) {
    return effectiveAperture;
  }

  if (distanceFromLensToPV === lens.focalLength) {
    return 0;
  }

  const ratio =
    Math.abs(distanceFromLensToPV - lens.focalLength) / lens.focalLength;
  return effectiveAperture * ratio;
}

export function traceRaysThroughSystem(
  system: OpticalSystem,
  zenithAngle: number
): RayTraceResult {
  const { lenses, pv } = system;

  const inputAngleRad = degToRad(zenithAngle);

  if (lenses.length !== 1) {
    return {
      spotDiameter: 0,
      spotArea: 0,
      spotCenterY: 0,
      spotCenterZ: 0,
      effectiveArea: 0,
      concentrationRatio: 0,
      isValid: false,
      outputAngle: zenithAngle,
      totalTransmittance: 0,
    };
  }

  const lens = lenses[0];

  const systemMatrix = buildSystemMatrix([lens], pv.position);
  const outputAngleRad = calculateOutputAngle(systemMatrix, inputAngleRad, 0);

  const totalTransmittance = lens.transmittance;

  const distanceToPV = pv.position - lens.position;
  const focalShiftY = lens.focalLength * Math.tan(inputAngleRad);
  const t = distanceToPV / lens.focalLength;
  const spotCenterY = focalShiftY * t;
  const spotCenterZ = 0;

  let spotDiameter = calculateSpotDiameterSingleLens(
    lens,
    pv.position,
    zenithAngle
  );
  spotDiameter = Math.max(spotDiameter, 0.001);

  const spotArea = Math.PI * Math.pow(spotDiameter / 2, 2);
  const spotRadius = spotDiameter / 2;

  const effectiveArea = calculateOverlapArea(
    pv,
    spotCenterY,
    spotCenterZ,
    spotRadius
  );

  const inputAperture = lens.aperture;
  const inputArea = Math.PI * Math.pow(inputAperture / 2, 2);
  const concentrationRatio = spotArea > 0 ? inputArea / spotArea : 0;

  return {
    spotDiameter,
    spotArea,
    spotCenterY,
    spotCenterZ,
    effectiveArea,
    concentrationRatio,
    isValid: true,
    outputAngle: radToDeg(outputAngleRad),
    totalTransmittance,
  };
}

function calculateOverlapArea(
  pv: PhotovoltaicCell,
  spotCenterY: number,
  spotCenterZ: number,
  spotRadius: number
): number {
  if (pv.shape === "circular") {
    const pvRadius = pv.diameter / 2;
    const distance = Math.sqrt(
      spotCenterY * spotCenterY + spotCenterZ * spotCenterZ
    );

    if (distance >= spotRadius + pvRadius) {
      return 0;
    }

    if (distance <= Math.abs(spotRadius - pvRadius)) {
      const smallerRadius = Math.min(spotRadius, pvRadius);
      return Math.PI * smallerRadius * smallerRadius;
    }

    const r1 = spotRadius;
    const r2 = pvRadius;
    const d = distance;

    const part1 =
      r1 * r1 * Math.acos((d * d + r1 * r1 - r2 * r2) / (2 * d * r1));
    const part2 =
      r2 * r2 * Math.acos((d * d + r2 * r2 - r1 * r1) / (2 * d * r2));
    const part3 =
      0.5 *
      Math.sqrt((-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2));

    return part1 + part2 - part3;
  } else {
    const halfWidth = pv.width / 2;
    const halfHeight = pv.height / 2;

    const left = Math.max(-halfWidth, spotCenterZ - spotRadius);
    const right = Math.min(halfWidth, spotCenterZ + spotRadius);
    const bottom = Math.max(-halfHeight, spotCenterY - spotRadius);
    const top = Math.min(halfHeight, spotCenterY + spotRadius);

    if (left >= right || bottom >= top) {
      return 0;
    }

    const overlapWidth = right - left;
    const overlapHeight = top - bottom;
    const rectOverlap = overlapWidth * overlapHeight;

    const spotArea = Math.PI * spotRadius * spotRadius;
    const overlapCenterY = (bottom + top) / 2;
    const overlapCenterZ = (left + right) / 2;
    const distFromSpotCenter = Math.sqrt(
      Math.pow(overlapCenterY - spotCenterY, 2) +
        Math.pow(overlapCenterZ - spotCenterZ, 2)
    );

    if (distFromSpotCenter < spotRadius * 0.5) {
      return Math.min(rectOverlap, spotArea);
    }

    return Math.min(rectOverlap * 0.785, spotArea);
  }
}

export function calculatePower(
  system: OpticalSystem,
  lightSource: LightSource
): PowerCalculationResult {
  const rayTrace = traceRaysThroughSystem(system, lightSource.zenithAngle);

  if (!rayTrace.isValid) {
    return {
      inputPower: 0,
      outputPower: 0,
      spotDiameter: 0,
      effectiveArea: 0,
      concentrationRatio: 0,
      systemEfficiency: 0,
      isValid: false,
    };
  }

  const lens = system.lenses[0];
  const effectiveInputAperture = calculateEffectiveAperture(
    lens.aperture,
    lightSource.zenithAngle
  );
  const inputArea = Math.PI * Math.pow(effectiveInputAperture / 2, 2);

  const inputPower = lightSource.intensity * inputArea;

  const outputAngleRad = degToRad(rayTrace.outputAngle);
  const incidenceCosFactor = Math.max(0, Math.cos(outputAngleRad));

  const concentrationFactor = rayTrace.concentrationRatio;

  const I_optical = lightSource.intensity * rayTrace.totalTransmittance;

  const I_effective = I_optical * concentrationFactor * incidenceCosFactor;

  const P_incident = I_effective * rayTrace.effectiveArea;

  const outputPower = P_incident * system.pv.efficiency;

  const systemEfficiency = inputPower > 0 ? outputPower / inputPower : 0;

  return {
    inputPower,
    outputPower,
    spotDiameter: rayTrace.spotDiameter,
    effectiveArea: rayTrace.effectiveArea,
    concentrationRatio: rayTrace.concentrationRatio,
    systemEfficiency,
    isValid: true,
  };
}

export function sweepAngle(
  system: OpticalSystem,
  intensity: number,
  startAngle: number,
  endAngle: number,
  step: number
): AngleSweepResult[] {
  const results: AngleSweepResult[] = [];

  for (let angle = startAngle; angle <= endAngle; angle += step) {
    const lightSource: LightSource = {
      intensity,
      zenithAngle: angle,
    };

    const powerResult = calculatePower(system, lightSource);

    results.push({
      angle,
      power: powerResult.outputPower,
      efficiency: powerResult.systemEfficiency,
    });
  }

  return results;
}

export function createLens(
  id: string,
  aperture: number,
  focalLength: number,
  position: number,
  transmittance: number = 0.92
): Lens {
  return {
    id,
    aperture,
    focalLength,
    position,
    transmittance,
  };
}

export function createRectangularPV(
  width: number,
  height: number,
  efficiency: number,
  position: number
): PhotovoltaicCell {
  return {
    shape: "rectangular",
    width,
    height,
    diameter: 0,
    efficiency,
    position,
  };
}

export function createCircularPV(
  diameter: number,
  efficiency: number,
  position: number
): PhotovoltaicCell {
  return {
    shape: "circular",
    width: 0,
    height: 0,
    diameter,
    efficiency,
    position,
  };
}

export function createPV(
  shape: PVShape,
  params: { width?: number; height?: number; diameter?: number },
  efficiency: number,
  position: number
): PhotovoltaicCell {
  if (shape === "circular") {
    return createCircularPV(params.diameter ?? 0, efficiency, position);
  }
  return createRectangularPV(
    params.width ?? 0,
    params.height ?? 0,
    efficiency,
    position
  );
}

export function createOpticalSystem(
  lenses: Lens[],
  pv: PhotovoltaicCell
): OpticalSystem {
  return { lenses, pv };
}

export function validateLens(lens: Lens): string[] {
  const errors: string[] = [];

  if (lens.aperture <= 0) {
    errors.push("Aperture must be positive");
  }
  if (lens.focalLength <= 0) {
    errors.push("Focal length must be positive");
  }
  if (lens.position < 0) {
    errors.push("Position cannot be negative");
  }
  if (lens.transmittance < 0 || lens.transmittance > 1) {
    errors.push("Transmittance must be between 0 and 1");
  }

  return errors;
}

export function validatePV(pv: PhotovoltaicCell): string[] {
  const errors: string[] = [];

  if (pv.shape === "rectangular") {
    if (pv.width <= 0) {
      errors.push("Width must be positive");
    }
    if (pv.height <= 0) {
      errors.push("Height must be positive");
    }
  } else if (pv.shape === "circular") {
    if (pv.diameter <= 0) {
      errors.push("Diameter must be positive");
    }
  }

  if (pv.efficiency <= 0 || pv.efficiency > 1) {
    errors.push("Efficiency must be between 0 and 1");
  }
  if (pv.position < 0) {
    errors.push("Position cannot be negative");
  }

  return errors;
}

export function validateOpticalSystem(system: OpticalSystem): string[] {
  const errors: string[] = [];

  if (system.lenses.length !== 1) {
    errors.push("System must have exactly 1 lens");
  }

  system.lenses.forEach((lens, index) => {
    const lensErrors = validateLens(lens);
    lensErrors.forEach((err) => errors.push(`Lens ${index + 1}: ${err}`));
  });

  const pvErrors = validatePV(system.pv);
  pvErrors.forEach((err) => errors.push(`PV: ${err}`));

  if (system.lenses.length === 1) {
    const lastLensPosition = system.lenses[0].position;

    if (system.pv.position <= lastLensPosition) {
      errors.push("PV must be positioned after the lens");
    }
  }

  return errors;
}
