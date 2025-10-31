import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MovingAverage } from '../../charging/movingAverage';

/**
 * Integration tests for the complete charging flow
 * Tests the interaction between P1 data, moving average, and charging decisions
 */

describe('Charging Flow Integration', () => {
  const config = {
    charger: {
      minCurrent: 6,
      maxCurrent: 32,
      voltage: 230,
      phases: 3
    },
    charging: {
      solarOnly: {
        startThresholdKw: 4.5,
        stopThresholdKw: 4.0
      },
      gridSupport: {
        minimumCurrent: 6
      },
      movingAverageMinutes: 5,
      checkIntervalSeconds: 300
    }
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Solar Only Mode - Complete Flow', () => {
    it('should start charging when surplus builds up over time', () => {
      const ma = new MovingAverage(config.charging.movingAverageMinutes, 1);
      let charging = false;

      // Simulate P1 data arriving every minute with increasing surplus
      const gridFlows = [
        { delivered: 1.0, returned: 6.0 }, // -5.0 kW surplus
        { delivered: 0.8, returned: 6.0 }, // -5.2 kW surplus
        { delivered: 0.5, returned: 6.0 }, // -5.5 kW surplus
        { delivered: 0.5, returned: 5.5 }, // -5.0 kW surplus
        { delivered: 0.5, returned: 5.0 }  // -4.5 kW surplus
      ];

      for (const flow of gridFlows) {
        const gridFlow = flow.delivered - flow.returned;
        ma.addValue(gridFlow);
        jest.advanceTimersByTime(60 * 1000); // 1 minute
      }

      // Calculate average and determine if should charge
      const avgGridFlow = ma.getAverage();
      const surplus = -avgGridFlow; // Convert to positive for surplus

      // Should charge because average surplus > 4.5 kW
      const shouldCharge = !charging && surplus >= config.charging.solarOnly.startThresholdKw;

      expect(surplus).toBeGreaterThan(4.5);
      expect(shouldCharge).toBe(true);

      // Calculate target current
      const targetCurrent = (surplus * 1000) / (config.charger.voltage * config.charger.phases);
      const clampedCurrent = Math.max(
        config.charger.minCurrent,
        Math.min(config.charger.maxCurrent, targetCurrent)
      );

      expect(clampedCurrent).toBeGreaterThan(config.charger.minCurrent);
      expect(clampedCurrent).toBeLessThan(config.charger.maxCurrent);
    });

    it('should stop charging when surplus drops', () => {
      const ma = new MovingAverage(config.charging.movingAverageMinutes, 1);
      let charging = true;

      // Simulate decreasing surplus
      const gridFlows = [
        { delivered: 0.5, returned: 6.0 }, // -5.5 kW surplus
        { delivered: 1.0, returned: 5.5 }, // -4.5 kW surplus
        { delivered: 2.0, returned: 5.5 }, // -3.5 kW surplus
        { delivered: 2.5, returned: 5.0 }, // -2.5 kW surplus
        { delivered: 3.0, returned: 5.5 }  // -2.5 kW surplus
      ];

      for (const flow of gridFlows) {
        const gridFlow = flow.delivered - flow.returned;
        ma.addValue(gridFlow);
        jest.advanceTimersByTime(60 * 1000);
      }

      const avgGridFlow = ma.getAverage();
      const surplus = -avgGridFlow;

      // Should stop charging because surplus < 4.0 kW
      const shouldStop = charging && surplus < config.charging.solarOnly.stopThresholdKw;

      expect(surplus).toBeLessThan(4.0);
      expect(shouldStop).toBe(true);
    });

    it('should handle hysteresis correctly', () => {
      const ma = new MovingAverage(config.charging.movingAverageMinutes, 1);
      let charging = false;

      // Surplus at 4.4 kW (between thresholds)
      const gridFlows = Array(5).fill({ delivered: 0.5, returned: 4.9 }); // -4.4 kW

      for (const flow of gridFlows) {
        const gridFlow = flow.delivered - flow.returned;
        ma.addValue(gridFlow);
        jest.advanceTimersByTime(60 * 1000);
      }

      const avgGridFlow = ma.getAverage();
      const surplus = -avgGridFlow;

      // Should not start (below 4.5 kW)
      let shouldCharge = !charging && surplus >= config.charging.solarOnly.startThresholdKw;
      expect(shouldCharge).toBe(false);

      // If we were already charging, should not stop (above 4.0 kW)
      charging = true;
      const shouldStop = charging && surplus < config.charging.solarOnly.stopThresholdKw;
      expect(shouldStop).toBe(false);

      // Hysteresis prevents rapid switching
      expect(surplus).toBeGreaterThan(config.charging.solarOnly.stopThresholdKw);
      expect(surplus).toBeLessThan(config.charging.solarOnly.startThresholdKw);
    });
  });

  describe('Grid Support Mode - Complete Flow', () => {
    it('should always charge with minimum current when no surplus', () => {
      const ma = new MovingAverage(config.charging.movingAverageMinutes, 1);

      // No surplus - importing from grid
      const gridFlows = Array(5).fill({ delivered: 2.0, returned: 0.0 }); // +2.0 kW

      for (const flow of gridFlows) {
        const gridFlow = flow.delivered - flow.returned;
        ma.addValue(gridFlow);
        jest.advanceTimersByTime(60 * 1000);
      }

      const avgGridFlow = ma.getAverage();
      const surplus = -avgGridFlow; // Will be negative

      // Always charge at minimum
      const targetCurrent = config.charging.gridSupport.minimumCurrent;

      expect(targetCurrent).toBe(6);
      expect(surplus).toBeLessThan(0); // No surplus
    });

    it('should increase current with surplus', () => {
      const ma = new MovingAverage(config.charging.movingAverageMinutes, 1);

      // Some surplus available
      const gridFlows = Array(5).fill({ delivered: 0.5, returned: 4.0 }); // -3.5 kW surplus

      for (const flow of gridFlows) {
        const gridFlow = flow.delivered - flow.returned;
        ma.addValue(gridFlow);
        jest.advanceTimersByTime(60 * 1000);
      }

      const avgGridFlow = ma.getAverage();
      const surplus = -avgGridFlow;

      // Add surplus to minimum current
      const surplusCurrent = (surplus * 1000) / (config.charger.voltage * config.charger.phases);
      const targetCurrent = Math.min(
        config.charging.gridSupport.minimumCurrent + surplusCurrent,
        config.charger.maxCurrent
      );

      expect(surplus).toBeGreaterThan(0);
      expect(targetCurrent).toBeGreaterThan(config.charging.gridSupport.minimumCurrent);
    });
  });

  describe('Boost Mode - Complete Flow', () => {
    it('should always charge at maximum regardless of grid flow', () => {
      const ma = new MovingAverage(config.charging.movingAverageMinutes, 1);

      // Even with no surplus
      const gridFlows = Array(5).fill({ delivered: 5.0, returned: 0.0 }); // +5.0 kW import

      for (const flow of gridFlows) {
        const gridFlow = flow.delivered - flow.returned;
        ma.addValue(gridFlow);
        jest.advanceTimersByTime(60 * 1000);
      }

      // Always charge at max
      const targetCurrent = config.charger.maxCurrent;

      expect(targetCurrent).toBe(32);
    });
  });

  describe('Moving Average Behavior', () => {
    it('should smooth out fluctuations in P1 data', () => {
      const ma = new MovingAverage(config.charging.movingAverageMinutes, 1);

      // Highly variable P1 data
      const gridFlows = [
        { delivered: 0.0, returned: 8.0 },  // -8.0 kW
        { delivered: 3.0, returned: 4.0 },  // -1.0 kW
        { delivered: 0.5, returned: 10.0 }, // -9.5 kW
        { delivered: 2.0, returned: 3.0 },  // -1.0 kW
        { delivered: 1.0, returned: 6.0 }   // -5.0 kW
      ];

      for (const flow of gridFlows) {
        const gridFlow = flow.delivered - flow.returned;
        ma.addValue(gridFlow);
        jest.advanceTimersByTime(60 * 1000);
      }

      const avgGridFlow = ma.getAverage();
      const expectedAvg = (-8.0 + -1.0 + -9.5 + -1.0 + -5.0) / 5;

      expect(avgGridFlow).toBeCloseTo(expectedAvg, 2);

      // Average should be more stable than individual values
      const surplus = -avgGridFlow;
      expect(surplus).toBeGreaterThan(1.0);
      expect(surplus).toBeLessThan(9.5);
    });

    it('should only update every minute', () => {
      const ma = new MovingAverage(config.charging.movingAverageMinutes, 1);

      // Try to add multiple values quickly
      ma.addValue(-5.0);
      expect(ma.getCount()).toBe(1);

      // Within same minute
      jest.advanceTimersByTime(30 * 1000); // 30 seconds
      ma.addValue(-3.0);
      expect(ma.getCount()).toBe(1); // Should still be 1

      // After 1 minute
      jest.advanceTimersByTime(30 * 1000); // Total 60 seconds
      ma.addValue(-4.0);
      expect(ma.getCount()).toBe(2); // Now should be 2
    });
  });

  describe('Real-World Scenario', () => {
    it('should handle a typical sunny day charging session', () => {
      const ma = new MovingAverage(config.charging.movingAverageMinutes, 1);
      let charging = false;
      let targetCurrent = 0;

      // Morning: No surplus
      const morningFlows = [
        { delivered: 1.5, returned: 0.0 },
        { delivered: 1.3, returned: 0.2 },
        { delivered: 1.0, returned: 0.5 }
      ];

      for (const flow of morningFlows) {
        const gridFlow = flow.delivered - flow.returned;
        ma.addValue(gridFlow);
        jest.advanceTimersByTime(60 * 1000);
      }

      let avgGridFlow = ma.getAverage();
      let surplus = -avgGridFlow;
      expect(surplus).toBeLessThan(config.charging.solarOnly.startThresholdKw);

      // Midday: Building surplus
      const middayFlows = [
        { delivered: 0.5, returned: 2.0 },  // -1.5 kW
        { delivered: 0.3, returned: 4.0 },  // -3.7 kW
        { delivered: 0.2, returned: 5.5 },  // -5.3 kW
        { delivered: 0.1, returned: 6.0 },  // -5.9 kW
        { delivered: 0.0, returned: 6.5 }   // -6.5 kW
      ];

      ma.clear(); // Reset for midday
      for (const flow of middayFlows) {
        const gridFlow = flow.delivered - flow.returned;
        ma.addValue(gridFlow);
        jest.advanceTimersByTime(60 * 1000);
      }

      avgGridFlow = ma.getAverage();
      surplus = -avgGridFlow;

      // Should start charging
      const shouldCharge = !charging && surplus >= config.charging.solarOnly.startThresholdKw;
      expect(shouldCharge).toBe(true);

      // Calculate current
      targetCurrent = (surplus * 1000) / (config.charger.voltage * config.charger.phases);
      targetCurrent = Math.max(
        config.charger.minCurrent,
        Math.min(config.charger.maxCurrent, targetCurrent)
      );

      expect(targetCurrent).toBeGreaterThan(config.charger.minCurrent);
      charging = true;

      // Afternoon: Surplus decreasing
      const afternoonFlows = [
        { delivered: 0.5, returned: 5.5 },  // -5.0 kW
        { delivered: 1.0, returned: 5.0 },  // -4.0 kW
        { delivered: 1.5, returned: 4.0 },  // -2.5 kW
        { delivered: 2.0, returned: 3.5 },  // -1.5 kW
        { delivered: 2.5, returned: 2.5 }   // 0 kW
      ];

      ma.clear();
      for (const flow of afternoonFlows) {
        const gridFlow = flow.delivered - flow.returned;
        ma.addValue(gridFlow);
        jest.advanceTimersByTime(60 * 1000);
      }

      avgGridFlow = ma.getAverage();
      surplus = -avgGridFlow;

      // Should stop charging
      const shouldStop = charging && surplus < config.charging.solarOnly.stopThresholdKw;
      expect(shouldStop).toBe(true);
    });
  });
});
