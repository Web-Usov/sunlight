import {
  degToRad,
  radToDeg,
  calculateImageDistance,
  calculateEffectiveAperture,
  calculateSpotDiameterSingleLens,
  calculatePVArea,
  traceRaysThroughSystem,
  calculatePower,
  sweepAngle,
  createLens,
  createRectangularPV,
  createCircularPV,
  createOpticalSystem,
  validateLens,
  validatePV,
  validateOpticalSystem,
  DEFAULT_SOLAR_INTENSITY,
} from './optics';
import type { Lens, PhotovoltaicCell, OpticalSystem, LightSource } from './types';

describe('Angle conversions', () => {
  test('degToRad converts degrees to radians', () => {
    expect(degToRad(0)).toBe(0);
    expect(degToRad(90)).toBeCloseTo(Math.PI / 2);
    expect(degToRad(180)).toBeCloseTo(Math.PI);
    expect(degToRad(360)).toBeCloseTo(2 * Math.PI);
  });

  test('radToDeg converts radians to degrees', () => {
    expect(radToDeg(0)).toBe(0);
    expect(radToDeg(Math.PI / 2)).toBeCloseTo(90);
    expect(radToDeg(Math.PI)).toBeCloseTo(180);
    expect(radToDeg(2 * Math.PI)).toBeCloseTo(360);
  });
});

describe('calculateImageDistance', () => {
  test('calculates correct image distance for thin lens formula', () => {
    const result = calculateImageDistance(100, 200);
    expect(result).toBeCloseTo(200);
  });

  test('returns infinity when object is at focal point', () => {
    const result = calculateImageDistance(100, 100);
    expect(result).toBe(Infinity);
  });

  test('returns negative for virtual image', () => {
    const result = calculateImageDistance(100, 50);
    expect(result).toBeCloseTo(-100);
  });
});

describe('calculateEffectiveAperture', () => {
  test('returns full aperture at 0 degrees', () => {
    expect(calculateEffectiveAperture(100, 0)).toBe(100);
  });

  test('returns reduced aperture at angle', () => {
    expect(calculateEffectiveAperture(100, 60)).toBeCloseTo(50);
  });

  test('returns zero at 90 degrees', () => {
    expect(calculateEffectiveAperture(100, 90)).toBeCloseTo(0);
  });
});

describe('calculateSpotDiameterSingleLens', () => {
  const lens: Lens = {
    id: 'lens1',
    aperture: 100,
    focalLength: 200,
    position: 0,
  };

  test('returns minimal spot at focal point', () => {
    const spot = calculateSpotDiameterSingleLens(lens, 200, 0);
    expect(spot).toBeCloseTo(0, 1);
  });

  test('returns larger spot away from focal point', () => {
    const spotBefore = calculateSpotDiameterSingleLens(lens, 100, 0);
    const spotAfter = calculateSpotDiameterSingleLens(lens, 300, 0);
    expect(spotBefore).toBeGreaterThan(0);
    expect(spotAfter).toBeGreaterThan(0);
  });

  test('effective aperture reduces with angle', () => {
    const spot0 = calculateSpotDiameterSingleLens(lens, 300, 0);
    const spot45 = calculateSpotDiameterSingleLens(lens, 300, 45);
    expect(spot45).toBeLessThan(spot0);
  });
});

describe('calculatePVArea', () => {
  test('calculates rectangular area correctly', () => {
    const pv = createRectangularPV(0.1, 0.2, 0.2, 0.5);
    expect(calculatePVArea(pv)).toBeCloseTo(0.02);
  });

  test('calculates circular area correctly', () => {
    const pv = createCircularPV(0.1, 0.2, 0.5);
    expect(calculatePVArea(pv)).toBeCloseTo(Math.PI * 0.05 * 0.05);
  });
});

describe('traceRaysThroughSystem', () => {
  test('returns invalid result for empty lens array', () => {
    const system: OpticalSystem = {
      lenses: [],
      pv: createRectangularPV(50, 50, 0.2, 200),
    };
    const result = traceRaysThroughSystem(system, 0);
    expect(result.isValid).toBe(false);
  });

  test('single lens produces valid spot', () => {
    const system: OpticalSystem = {
      lenses: [createLens('l1', 100, 200, 0)],
      pv: createRectangularPV(50, 50, 0.2, 200),
    };
    const result = traceRaysThroughSystem(system, 0);
    expect(result.isValid).toBe(true);
    expect(result.spotDiameter).toBeGreaterThan(0);
    expect(result.spotArea).toBeGreaterThan(0);
  });

  test('two lenses produce valid spot', () => {
    const system: OpticalSystem = {
      lenses: [
        createLens('l1', 100, 200, 0),
        createLens('l2', 50, 100, 150),
      ],
      pv: createRectangularPV(20, 20, 0.2, 300),
    };
    const result = traceRaysThroughSystem(system, 0);
    expect(result.isValid).toBe(true);
    expect(result.spotDiameter).toBeGreaterThan(0);
  });

  test('concentration ratio increases when spot is smaller than aperture', () => {
    const system: OpticalSystem = {
      lenses: [createLens('l1', 100, 100, 0)],
      pv: createRectangularPV(50, 50, 0.2, 100),
    };
    const result = traceRaysThroughSystem(system, 0);
    expect(result.concentrationRatio).toBeGreaterThan(1);
  });

  test('works with circular PV', () => {
    const system: OpticalSystem = {
      lenses: [createLens('l1', 100, 200, 0)],
      pv: createCircularPV(50, 0.2, 200),
    };
    const result = traceRaysThroughSystem(system, 0);
    expect(result.isValid).toBe(true);
  });
});

describe('calculatePower', () => {
  test('calculates power for valid system', () => {
    const system: OpticalSystem = {
      lenses: [createLens('l1', 0.1, 0.2, 0)],
      pv: createRectangularPV(0.05, 0.05, 0.2, 0.2),
    };
    const lightSource: LightSource = {
      intensity: 1000,
      zenithAngle: 0,
    };
    const result = calculatePower(system, lightSource);
    expect(result.isValid).toBe(true);
    expect(result.inputPower).toBeGreaterThan(0);
    expect(result.outputPower).toBeGreaterThan(0);
    expect(result.outputPower).toBeLessThanOrEqual(result.inputPower);
  });

  test('power reduces with increasing angle', () => {
    const system: OpticalSystem = {
      lenses: [createLens('l1', 0.1, 0.2, 0)],
      pv: createRectangularPV(0.05, 0.05, 0.2, 0.2),
    };
    const power0 = calculatePower(system, { intensity: 1000, zenithAngle: 0 });
    const power45 = calculatePower(system, { intensity: 1000, zenithAngle: 45 });
    expect(power45.outputPower).toBeLessThan(power0.outputPower);
  });

  test('returns invalid for empty system', () => {
    const system: OpticalSystem = {
      lenses: [],
      pv: createRectangularPV(0.05, 0.05, 0.2, 0.2),
    };
    const result = calculatePower(system, { intensity: 1000, zenithAngle: 0 });
    expect(result.isValid).toBe(false);
  });

  test('efficiency affects output power', () => {
    const systemLowEff: OpticalSystem = {
      lenses: [createLens('l1', 0.1, 0.2, 0)],
      pv: createRectangularPV(0.1, 0.1, 0.1, 0.2),
    };
    const systemHighEff: OpticalSystem = {
      lenses: [createLens('l1', 0.1, 0.2, 0)],
      pv: createRectangularPV(0.1, 0.1, 0.3, 0.2),
    };
    const lightSource: LightSource = { intensity: 1000, zenithAngle: 0 };
    const powerLow = calculatePower(systemLowEff, lightSource);
    const powerHigh = calculatePower(systemHighEff, lightSource);
    expect(powerHigh.outputPower).toBeGreaterThan(powerLow.outputPower);
  });

  test('calculates power for circular PV', () => {
    const system: OpticalSystem = {
      lenses: [createLens('l1', 0.1, 0.2, 0)],
      pv: createCircularPV(0.05, 0.2, 0.2),
    };
    const result = calculatePower(system, { intensity: 1000, zenithAngle: 0 });
    expect(result.isValid).toBe(true);
    expect(result.outputPower).toBeGreaterThan(0);
  });
});

describe('sweepAngle', () => {
  test('generates results for angle range', () => {
    const system: OpticalSystem = {
      lenses: [createLens('l1', 0.1, 0.2, 0)],
      pv: createRectangularPV(0.05, 0.05, 0.2, 0.2),
    };
    const results = sweepAngle(system, 1000, 0, 60, 15);
    expect(results).toHaveLength(5);
    expect(results[0].angle).toBe(0);
    expect(results[4].angle).toBe(60);
  });

  test('power decreases with angle', () => {
    const system: OpticalSystem = {
      lenses: [createLens('l1', 0.1, 0.2, 0)],
      pv: createRectangularPV(0.05, 0.05, 0.2, 0.2),
    };
    const results = sweepAngle(system, 1000, 0, 60, 30);
    expect(results[0].power).toBeGreaterThan(results[2].power);
  });
});

describe('Factory functions', () => {
  test('createLens creates valid lens', () => {
    const lens = createLens('test', 100, 200, 0);
    expect(lens.id).toBe('test');
    expect(lens.aperture).toBe(100);
    expect(lens.focalLength).toBe(200);
    expect(lens.position).toBe(0);
  });

  test('createRectangularPV creates valid rectangular PV cell', () => {
    const pv = createRectangularPV(50, 50, 0.2, 200);
    expect(pv.shape).toBe('rectangular');
    expect(pv.width).toBe(50);
    expect(pv.height).toBe(50);
    expect(pv.efficiency).toBe(0.2);
    expect(pv.position).toBe(200);
  });

  test('createCircularPV creates valid circular PV cell', () => {
    const pv = createCircularPV(100, 0.25, 300);
    expect(pv.shape).toBe('circular');
    expect(pv.diameter).toBe(100);
    expect(pv.efficiency).toBe(0.25);
    expect(pv.position).toBe(300);
  });

  test('createOpticalSystem creates valid system', () => {
    const lenses = [createLens('l1', 100, 200, 0)];
    const pv = createRectangularPV(50, 50, 0.2, 300);
    const system = createOpticalSystem(lenses, pv);
    expect(system.lenses).toHaveLength(1);
    expect(system.pv).toBe(pv);
  });
});

describe('Validation', () => {
  describe('validateLens', () => {
    test('returns no errors for valid lens', () => {
      const lens = createLens('l1', 100, 200, 0);
      expect(validateLens(lens)).toHaveLength(0);
    });

    test('detects invalid aperture', () => {
      const lens = createLens('l1', -100, 200, 0);
      expect(validateLens(lens)).toContain('Aperture must be positive');
    });

    test('detects invalid focal length', () => {
      const lens = createLens('l1', 100, -200, 0);
      expect(validateLens(lens)).toContain('Focal length must be positive');
    });

    test('detects negative position', () => {
      const lens = createLens('l1', 100, 200, -10);
      expect(validateLens(lens)).toContain('Position cannot be negative');
    });
  });

  describe('validatePV', () => {
    test('returns no errors for valid rectangular PV', () => {
      const pv = createRectangularPV(50, 50, 0.2, 200);
      expect(validatePV(pv)).toHaveLength(0);
    });

    test('returns no errors for valid circular PV', () => {
      const pv = createCircularPV(50, 0.2, 200);
      expect(validatePV(pv)).toHaveLength(0);
    });

    test('detects invalid rectangular dimensions', () => {
      const pv = createRectangularPV(-50, 0, 0.2, 200);
      const errors = validatePV(pv);
      expect(errors).toContain('Width must be positive');
      expect(errors).toContain('Height must be positive');
    });

    test('detects invalid circular diameter', () => {
      const pv = createCircularPV(-50, 0.2, 200);
      const errors = validatePV(pv);
      expect(errors).toContain('Diameter must be positive');
    });

    test('detects invalid efficiency', () => {
      const pvLow = createRectangularPV(50, 50, 0, 200);
      const pvHigh = createRectangularPV(50, 50, 1.5, 200);
      expect(validatePV(pvLow)).toContain('Efficiency must be between 0 and 1');
      expect(validatePV(pvHigh)).toContain('Efficiency must be between 0 and 1');
    });
  });

  describe('validateOpticalSystem', () => {
    test('returns no errors for valid system', () => {
      const system: OpticalSystem = {
        lenses: [createLens('l1', 100, 200, 0)],
        pv: createRectangularPV(50, 50, 0.2, 300),
      };
      expect(validateOpticalSystem(system)).toHaveLength(0);
    });

    test('detects empty lens array', () => {
      const system: OpticalSystem = {
        lenses: [],
        pv: createRectangularPV(50, 50, 0.2, 300),
      };
      expect(validateOpticalSystem(system)).toContain('System must have at least one lens');
    });

    test('detects too many lenses', () => {
      const system: OpticalSystem = {
        lenses: [
          createLens('l1', 100, 200, 0),
          createLens('l2', 100, 200, 100),
          createLens('l3', 100, 200, 200),
          createLens('l4', 100, 200, 300),
        ],
        pv: createRectangularPV(50, 50, 0.2, 500),
      };
      expect(validateOpticalSystem(system)).toContain('System cannot have more than 3 lenses');
    });

    test('detects PV before lenses', () => {
      const system: OpticalSystem = {
        lenses: [createLens('l1', 100, 200, 100)],
        pv: createRectangularPV(50, 50, 0.2, 50),
      };
      expect(validateOpticalSystem(system)).toContain('PV must be positioned after all lenses');
    });
  });
});

describe('DEFAULT_SOLAR_INTENSITY', () => {
  test('is set to standard AM1.5 value', () => {
    expect(DEFAULT_SOLAR_INTENSITY).toBe(1000);
  });
});


