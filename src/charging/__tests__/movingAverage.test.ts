import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MovingAverage } from '../movingAverage';

describe('MovingAverage', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with correct window size', () => {
      const ma = new MovingAverage(5, 1); // 5 minute window, 1 minute intervals
      expect(ma.getCount()).toBe(0);
      expect(ma.isFull()).toBe(false);
    });

    it('should calculate max size correctly', () => {
      const ma = new MovingAverage(10, 2); // 10 minute window, 2 minute intervals = 5 samples max

      // Add 6 values with proper time intervals
      for (let i = 0; i < 6; i++) {
        ma.addValue(i);
        jest.advanceTimersByTime(2 * 60 * 1000); // Advance 2 minutes
      }

      expect(ma.getCount()).toBe(5); // Should keep only 5 values
    });
  });

  describe('addValue', () => {
    it('should add value when enough time has passed', () => {
      const ma = new MovingAverage(5, 1);

      ma.addValue(10);
      expect(ma.getCount()).toBe(1);

      jest.advanceTimersByTime(60 * 1000); // Advance 1 minute
      ma.addValue(20);
      expect(ma.getCount()).toBe(2);
    });

    it('should not add value if not enough time has passed', () => {
      const ma = new MovingAverage(5, 1);

      ma.addValue(10);
      expect(ma.getCount()).toBe(1);

      jest.advanceTimersByTime(30 * 1000); // Advance only 30 seconds
      ma.addValue(20);
      expect(ma.getCount()).toBe(1); // Should still be 1
    });

    it('should maintain window size by removing oldest values', () => {
      const ma = new MovingAverage(3, 1); // Max 3 values

      ma.addValue(1);
      jest.advanceTimersByTime(60 * 1000);
      ma.addValue(2);
      jest.advanceTimersByTime(60 * 1000);
      ma.addValue(3);
      jest.advanceTimersByTime(60 * 1000);
      ma.addValue(4); // Should remove first value

      expect(ma.getCount()).toBe(3);
      expect(ma.getAverage()).toBe((2 + 3 + 4) / 3);
    });
  });

  describe('getAverage', () => {
    it('should return 0 when no values', () => {
      const ma = new MovingAverage(5, 1);
      expect(ma.getAverage()).toBe(0);
    });

    it('should calculate average correctly with one value', () => {
      const ma = new MovingAverage(5, 1);
      ma.addValue(10);
      expect(ma.getAverage()).toBe(10);
    });

    it('should calculate average correctly with multiple values', () => {
      const ma = new MovingAverage(5, 1);

      ma.addValue(10);
      jest.advanceTimersByTime(60 * 1000);
      ma.addValue(20);
      jest.advanceTimersByTime(60 * 1000);
      ma.addValue(30);

      expect(ma.getAverage()).toBe(20); // (10 + 20 + 30) / 3
    });

    it('should handle negative values', () => {
      const ma = new MovingAverage(5, 1);

      ma.addValue(-10);
      jest.advanceTimersByTime(60 * 1000);
      ma.addValue(-20);
      jest.advanceTimersByTime(60 * 1000);
      ma.addValue(30);

      expect(ma.getAverage()).toBe(0); // (-10 - 20 + 30) / 3
    });
  });

  describe('getCount', () => {
    it('should return correct count', () => {
      const ma = new MovingAverage(5, 1);
      expect(ma.getCount()).toBe(0);

      ma.addValue(10);
      expect(ma.getCount()).toBe(1);

      jest.advanceTimersByTime(60 * 1000);
      ma.addValue(20);
      expect(ma.getCount()).toBe(2);
    });
  });

  describe('isFull', () => {
    it('should return false when not full', () => {
      const ma = new MovingAverage(3, 1);
      expect(ma.isFull()).toBe(false);

      ma.addValue(10);
      expect(ma.isFull()).toBe(false);
    });

    it('should return true when full', () => {
      const ma = new MovingAverage(3, 1);

      ma.addValue(1);
      jest.advanceTimersByTime(60 * 1000);
      ma.addValue(2);
      jest.advanceTimersByTime(60 * 1000);
      ma.addValue(3);

      expect(ma.isFull()).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear all values', () => {
      const ma = new MovingAverage(5, 1);

      ma.addValue(10);
      jest.advanceTimersByTime(60 * 1000);
      ma.addValue(20);

      expect(ma.getCount()).toBe(2);

      ma.clear();

      expect(ma.getCount()).toBe(0);
      expect(ma.getAverage()).toBe(0);
      expect(ma.isFull()).toBe(false);
    });

    it('should allow adding values after clear', () => {
      const ma = new MovingAverage(5, 1);

      ma.addValue(10);
      ma.clear();

      ma.addValue(20);
      expect(ma.getCount()).toBe(1);
      expect(ma.getAverage()).toBe(20);
    });
  });

  describe('time-based sampling', () => {
    it('should respect 1-minute interval', () => {
      const ma = new MovingAverage(5, 1);

      ma.addValue(10);

      // Try to add multiple times within 1 minute
      jest.advanceTimersByTime(30 * 1000); // 30 seconds
      ma.addValue(20);
      jest.advanceTimersByTime(20 * 1000); // 50 seconds total
      ma.addValue(30);

      expect(ma.getCount()).toBe(1); // Only first value should be added

      // Now advance to 1 minute
      jest.advanceTimersByTime(10 * 1000); // 60 seconds total
      ma.addValue(40);

      expect(ma.getCount()).toBe(2); // Second value should be added
    });
  });

  describe('real-world scenario', () => {
    it('should work with 5-minute window and 1-minute intervals', () => {
      const ma = new MovingAverage(5, 1); // Like the actual config

      // Simulate grid flow values over 10 minutes
      const gridFlows = [4.5, 3.2, -1.5, -2.0, 1.0, 0.5, -0.8, 2.1, 1.8, 0.3];

      for (let i = 0; i < gridFlows.length; i++) {
        ma.addValue(gridFlows[i]);
        jest.advanceTimersByTime(60 * 1000); // 1 minute
      }

      // Should have only last 5 values
      expect(ma.getCount()).toBe(5);
      expect(ma.isFull()).toBe(true);

      // Calculate expected average of last 5 values
      const last5 = gridFlows.slice(-5);
      const expectedAvg = last5.reduce((sum, val) => sum + val, 0) / 5;

      expect(ma.getAverage()).toBeCloseTo(expectedAvg, 10);
    });
  });
});
