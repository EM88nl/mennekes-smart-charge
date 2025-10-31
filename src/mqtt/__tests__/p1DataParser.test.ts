import { describe, it, expect } from '@jest/globals';
import { P1Data } from '../../types';

/**
 * Unit tests for P1 meter data parsing and validation
 */

describe('P1 Data Parsing', () => {
  describe('valid P1 data', () => {
    it('should parse complete P1 data correctly', () => {
      const jsonMessage = JSON.stringify({
        timestamp: '2024-01-15T10:30:00Z',
        electricity_currently_delivered: '0.523',
        electricity_currently_returned: '0.000',
        phase_currently_delivered_l1: '0.200',
        phase_currently_delivered_l2: '0.163',
        phase_currently_delivered_l3: '0.160',
        phase_currently_returned_l1: '0.000',
        phase_currently_returned_l2: '0.000',
        phase_currently_returned_l3: '0.000',
        phase_voltage_l1: '230.1',
        phase_voltage_l2: '229.8',
        phase_voltage_l3: '230.5'
      });

      const data: P1Data = JSON.parse(jsonMessage);

      expect(data.timestamp).toBe('2024-01-15T10:30:00Z');
      expect(data.electricity_currently_delivered).toBe('0.523');
      expect(data.electricity_currently_returned).toBe('0.000');
    });

    it('should handle surplus (exporting) data', () => {
      const jsonMessage = JSON.stringify({
        timestamp: '2024-01-15T12:00:00Z',
        electricity_currently_delivered: '0.000',
        electricity_currently_returned: '2.500',
        phase_currently_delivered_l1: '0.000',
        phase_currently_delivered_l2: '0.000',
        phase_currently_delivered_l3: '0.000',
        phase_currently_returned_l1: '0.833',
        phase_currently_returned_l2: '0.833',
        phase_currently_returned_l3: '0.834',
        phase_voltage_l1: '231.0',
        phase_voltage_l2: '230.0',
        phase_voltage_l3: '229.0'
      });

      const data: P1Data = JSON.parse(jsonMessage);

      expect(parseFloat(data.electricity_currently_returned)).toBe(2.5);
      expect(parseFloat(data.electricity_currently_delivered)).toBe(0);
    });
  });

  describe('grid flow calculation', () => {
    it('should calculate positive grid flow (importing)', () => {
      const data: P1Data = {
        timestamp: '2024-01-15T10:30:00Z',
        electricity_currently_delivered: '4.5',
        electricity_currently_returned: '0.0',
        phase_currently_delivered_l1: '1.5',
        phase_currently_delivered_l2: '1.5',
        phase_currently_delivered_l3: '1.5',
        phase_currently_returned_l1: '0.0',
        phase_currently_returned_l2: '0.0',
        phase_currently_returned_l3: '0.0',
        phase_voltage_l1: '230',
        phase_voltage_l2: '230',
        phase_voltage_l3: '230'
      };

      const delivered = parseFloat(data.electricity_currently_delivered);
      const returned = parseFloat(data.electricity_currently_returned);
      const gridFlow = delivered - returned;

      expect(gridFlow).toBe(4.5); // Importing from grid
    });

    it('should calculate negative grid flow (surplus/exporting)', () => {
      const data: P1Data = {
        timestamp: '2024-01-15T12:00:00Z',
        electricity_currently_delivered: '0.5',
        electricity_currently_returned: '3.0',
        phase_currently_delivered_l1: '0.167',
        phase_currently_delivered_l2: '0.167',
        phase_currently_delivered_l3: '0.166',
        phase_currently_returned_l1: '1.0',
        phase_currently_returned_l2: '1.0',
        phase_currently_returned_l3: '1.0',
        phase_voltage_l1: '230',
        phase_voltage_l2: '230',
        phase_voltage_l3: '230'
      };

      const delivered = parseFloat(data.electricity_currently_delivered);
      const returned = parseFloat(data.electricity_currently_returned);
      const gridFlow = delivered - returned;

      expect(gridFlow).toBe(-2.5); // Exporting to grid (surplus)
    });

    it('should calculate zero grid flow (balanced)', () => {
      const data: P1Data = {
        timestamp: '2024-01-15T14:00:00Z',
        electricity_currently_delivered: '1.5',
        electricity_currently_returned: '1.5',
        phase_currently_delivered_l1: '0.5',
        phase_currently_delivered_l2: '0.5',
        phase_currently_delivered_l3: '0.5',
        phase_currently_returned_l1: '0.5',
        phase_currently_returned_l2: '0.5',
        phase_currently_returned_l3: '0.5',
        phase_voltage_l1: '230',
        phase_voltage_l2: '230',
        phase_voltage_l3: '230'
      };

      const delivered = parseFloat(data.electricity_currently_delivered);
      const returned = parseFloat(data.electricity_currently_returned);
      const gridFlow = delivered - returned;

      expect(gridFlow).toBe(0); // Perfectly balanced
    });
  });

  describe('data validation', () => {
    it('should detect missing required fields', () => {
      const incompleteData = {
        timestamp: '2024-01-15T10:30:00Z',
        electricity_currently_delivered: '0.523'
        // Missing electricity_currently_returned
      };

      const data = incompleteData as any;

      const isValid =
        data.electricity_currently_delivered !== undefined &&
        data.electricity_currently_returned !== undefined;

      expect(isValid).toBe(false);
    });

    it('should accept data with all required fields', () => {
      const completeData: P1Data = {
        timestamp: '2024-01-15T10:30:00Z',
        electricity_currently_delivered: '0.523',
        electricity_currently_returned: '0.000',
        phase_currently_delivered_l1: '0.200',
        phase_currently_delivered_l2: '0.163',
        phase_currently_delivered_l3: '0.160',
        phase_currently_returned_l1: '0.000',
        phase_currently_returned_l2: '0.000',
        phase_currently_returned_l3: '0.000',
        phase_voltage_l1: '230.1',
        phase_voltage_l2: '229.8',
        phase_voltage_l3: '230.5'
      };

      const isValid =
        completeData.electricity_currently_delivered !== undefined &&
        completeData.electricity_currently_returned !== undefined;

      expect(isValid).toBe(true);
    });
  });

  describe('string to number conversion', () => {
    it('should convert string values to numbers', () => {
      const data: P1Data = {
        timestamp: '2024-01-15T10:30:00Z',
        electricity_currently_delivered: '4.567',
        electricity_currently_returned: '1.234',
        phase_currently_delivered_l1: '1.5',
        phase_currently_delivered_l2: '1.5',
        phase_currently_delivered_l3: '1.567',
        phase_currently_returned_l1: '0.411',
        phase_currently_returned_l2: '0.411',
        phase_currently_returned_l3: '0.412',
        phase_voltage_l1: '230.1',
        phase_voltage_l2: '229.8',
        phase_voltage_l3: '230.5'
      };

      const delivered = parseFloat(data.electricity_currently_delivered);
      const returned = parseFloat(data.electricity_currently_returned);

      expect(delivered).toBeCloseTo(4.567, 3);
      expect(returned).toBeCloseTo(1.234, 3);
    });

    it('should handle integer string values', () => {
      const data: P1Data = {
        timestamp: '2024-01-15T10:30:00Z',
        electricity_currently_delivered: '5',
        electricity_currently_returned: '2',
        phase_currently_delivered_l1: '1',
        phase_currently_delivered_l2: '2',
        phase_currently_delivered_l3: '2',
        phase_currently_returned_l1: '0',
        phase_currently_returned_l2: '1',
        phase_currently_returned_l3: '1',
        phase_voltage_l1: '230',
        phase_voltage_l2: '230',
        phase_voltage_l3: '230'
      };

      const delivered = parseFloat(data.electricity_currently_delivered);
      const returned = parseFloat(data.electricity_currently_returned);

      expect(delivered).toBe(5);
      expect(returned).toBe(2);
    });
  });

  describe('real-world scenarios', () => {
    it('should handle typical daytime consumption', () => {
      // Daytime: Using 2kW from grid, no solar
      const data: P1Data = {
        timestamp: '2024-01-15T08:00:00Z',
        electricity_currently_delivered: '2.0',
        electricity_currently_returned: '0.0',
        phase_currently_delivered_l1: '0.667',
        phase_currently_delivered_l2: '0.667',
        phase_currently_delivered_l3: '0.666',
        phase_currently_returned_l1: '0.0',
        phase_currently_returned_l2: '0.0',
        phase_currently_returned_l3: '0.0',
        phase_voltage_l1: '230',
        phase_voltage_l2: '230',
        phase_voltage_l3: '230'
      };

      const gridFlow = parseFloat(data.electricity_currently_delivered) -
                       parseFloat(data.electricity_currently_returned);

      expect(gridFlow).toBe(2.0); // Importing
    });

    it('should handle solar surplus scenario', () => {
      // Midday: Producing 5kW solar, using 1kW, 4kW surplus
      const data: P1Data = {
        timestamp: '2024-01-15T13:00:00Z',
        electricity_currently_delivered: '0.0',
        electricity_currently_returned: '4.0',
        phase_currently_delivered_l1: '0.0',
        phase_currently_delivered_l2: '0.0',
        phase_currently_delivered_l3: '0.0',
        phase_currently_returned_l1: '1.333',
        phase_currently_returned_l2: '1.333',
        phase_currently_returned_l3: '1.334',
        phase_voltage_l1: '230',
        phase_voltage_l2: '230',
        phase_voltage_l3: '230'
      };

      const gridFlow = parseFloat(data.electricity_currently_delivered) -
                       parseFloat(data.electricity_currently_returned);

      expect(gridFlow).toBe(-4.0); // Exporting (surplus)
    });

    it('should handle mixed consumption scenario', () => {
      // Solar producing but still importing a bit
      const data: P1Data = {
        timestamp: '2024-01-15T11:00:00Z',
        electricity_currently_delivered: '0.5',
        electricity_currently_returned: '0.2',
        phase_currently_delivered_l1: '0.167',
        phase_currently_delivered_l2: '0.167',
        phase_currently_delivered_l3: '0.166',
        phase_currently_returned_l1: '0.067',
        phase_currently_returned_l2: '0.067',
        phase_currently_returned_l3: '0.066',
        phase_voltage_l1: '230',
        phase_voltage_l2: '230',
        phase_voltage_l3: '230'
      };

      const gridFlow = parseFloat(data.electricity_currently_delivered) -
                       parseFloat(data.electricity_currently_returned);

      expect(gridFlow).toBeCloseTo(0.3, 1); // Slight import
    });
  });
});
