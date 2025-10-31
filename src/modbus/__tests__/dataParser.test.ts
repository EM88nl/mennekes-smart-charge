import { describe, it, expect } from '@jest/globals';

/**
 * Unit tests for Modbus data parsing
 * Tests the logic used in ModbusClient to parse register values
 */

describe('Modbus Data Parsing', () => {
  /**
   * Helper function to read float from two 16-bit registers (big endian)
   */
  function readFloat(registers: number[]): number {
    const buffer = Buffer.allocUnsafe(4);
    buffer.writeUInt16BE(registers[0], 0);
    buffer.writeUInt16BE(registers[1], 2);
    return buffer.readFloatBE(0);
  }

  /**
   * Helper function to read uint32 from two 16-bit registers (big endian)
   */
  function readUInt32(registers: number[]): number {
    const buffer = Buffer.allocUnsafe(4);
    buffer.writeUInt16BE(registers[0], 0);
    buffer.writeUInt16BE(registers[1], 2);
    return buffer.readUInt32BE(0);
  }

  /**
   * Helper function to write float to two 16-bit registers (big endian)
   */
  function writeFloat(value: number): number[] {
    const buffer = Buffer.allocUnsafe(4);
    buffer.writeFloatBE(value, 0);
    return [buffer.readUInt16BE(0), buffer.readUInt16BE(2)];
  }

  describe('readFloat', () => {
    it('should parse positive float correctly', () => {
      // 16.5 as IEEE 754 float
      const registers = writeFloat(16.5);
      const result = readFloat(registers);

      expect(result).toBeCloseTo(16.5, 5);
    });

    it('should parse negative float correctly', () => {
      const registers = writeFloat(-10.25);
      const result = readFloat(registers);

      expect(result).toBeCloseTo(-10.25, 5);
    });

    it('should parse zero correctly', () => {
      const registers = writeFloat(0);
      const result = readFloat(registers);

      expect(result).toBe(0);
    });

    it('should parse decimal values correctly', () => {
      const registers = writeFloat(6.123);
      const result = readFloat(registers);

      expect(result).toBeCloseTo(6.123, 5);
    });

    it('should parse large values correctly', () => {
      const registers = writeFloat(22080.5); // ~22kW
      const result = readFloat(registers);

      expect(result).toBeCloseTo(22080.5, 1);
    });

    it('should parse small values correctly', () => {
      const registers = writeFloat(0.001);
      const result = readFloat(registers);

      expect(result).toBeCloseTo(0.001, 5);
    });
  });

  describe('readUInt32', () => {
    it('should parse small uint32 correctly', () => {
      // Manually create registers for value 100
      const value = 100;
      const buffer = Buffer.allocUnsafe(4);
      buffer.writeUInt32BE(value, 0);
      const registers = [buffer.readUInt16BE(0), buffer.readUInt16BE(2)];

      const result = readUInt32(registers);

      expect(result).toBe(100);
    });

    it('should parse zero correctly', () => {
      const registers = [0, 0];
      const result = readUInt32(registers);

      expect(result).toBe(0);
    });

    it('should parse large uint32 correctly', () => {
      // 3600 seconds (1 hour)
      const value = 3600;
      const buffer = Buffer.allocUnsafe(4);
      buffer.writeUInt32BE(value, 0);
      const registers = [buffer.readUInt16BE(0), buffer.readUInt16BE(2)];

      const result = readUInt32(registers);

      expect(result).toBe(3600);
    });

    it('should parse maximum uint32 correctly', () => {
      const registers = [0xFFFF, 0xFFFF];
      const result = readUInt32(registers);

      expect(result).toBe(4294967295); // Max uint32
    });

    it('should handle session duration values', () => {
      // 2 hours 15 minutes = 8100 seconds
      const value = 8100;
      const buffer = Buffer.allocUnsafe(4);
      buffer.writeUInt32BE(value, 0);
      const registers = [buffer.readUInt16BE(0), buffer.readUInt16BE(2)];

      const result = readUInt32(registers);

      expect(result).toBe(8100);
    });
  });

  describe('writeFloat', () => {
    it('should write charging current correctly', () => {
      const current = 16.0; // A
      const registers = writeFloat(current);

      expect(registers).toHaveLength(2);
      expect(registers[0]).toBeGreaterThanOrEqual(0);
      expect(registers[0]).toBeLessThanOrEqual(0xFFFF);
      expect(registers[1]).toBeGreaterThanOrEqual(0);
      expect(registers[1]).toBeLessThanOrEqual(0xFFFF);

      // Verify round-trip
      const parsed = readFloat(registers);
      expect(parsed).toBeCloseTo(current, 5);
    });

    it('should handle minimum current', () => {
      const current = 6.0;
      const registers = writeFloat(current);
      const parsed = readFloat(registers);

      expect(parsed).toBeCloseTo(6.0, 5);
    });

    it('should handle maximum current', () => {
      const current = 32.0;
      const registers = writeFloat(current);
      const parsed = readFloat(registers);

      expect(parsed).toBeCloseTo(32.0, 5);
    });

    it('should handle zero current', () => {
      const current = 0.0;
      const registers = writeFloat(current);
      const parsed = readFloat(registers);

      expect(parsed).toBe(0);
    });
  });

  describe('real-world values', () => {
    it('should parse typical charging power', () => {
      // 11.04 kW = 16A * 230V * 3 phases / 1000
      const power = 11040; // W
      const registers = writeFloat(power);
      const parsed = readFloat(registers);

      expect(parsed).toBeCloseTo(11040, 1);
    });

    it('should parse typical session energy', () => {
      // 15.5 kWh
      const energy = 15.5;
      const registers = writeFloat(energy);
      const parsed = readFloat(registers);

      expect(parsed).toBeCloseTo(15.5, 2);
    });

    it('should parse typical session duration', () => {
      // 3 hours 45 minutes = 13500 seconds
      const duration = 13500;
      const buffer = Buffer.allocUnsafe(4);
      buffer.writeUInt32BE(duration, 0);
      const registers = [buffer.readUInt16BE(0), buffer.readUInt16BE(2)];
      const parsed = readUInt32(registers);

      expect(parsed).toBe(13500);
    });
  });

  describe('edge cases', () => {
    it('should handle very small float values', () => {
      const value = 0.00001;
      const registers = writeFloat(value);
      const parsed = readFloat(registers);

      expect(parsed).toBeCloseTo(0.00001, 8);
    });

    it('should handle negative power (should not happen but test anyway)', () => {
      const power = -100;
      const registers = writeFloat(power);
      const parsed = readFloat(registers);

      expect(parsed).toBeCloseTo(-100, 5);
    });

    it('should handle fractional currents', () => {
      const current = 16.3;
      const registers = writeFloat(current);
      const parsed = readFloat(registers);

      expect(parsed).toBeCloseTo(16.3, 5);
    });
  });
});
