// P1 Meter Data
export interface P1Data {
  timestamp: string;
  electricity_currently_delivered: string; // kW - importing from grid
  electricity_currently_returned: string;  // kW - exporting to grid
  phase_currently_delivered_l1: string;
  phase_currently_delivered_l2: string;
  phase_currently_delivered_l3: string;
  phase_currently_returned_l1: string;
  phase_currently_returned_l2: string;
  phase_currently_returned_l3: string;
  phase_voltage_l1: string;
  phase_voltage_l2: string;
  phase_voltage_l3: string;
}

// Charger State from Modbus
export interface ChargerState {
  evseState: number;          // 0x0100
  authStatus: number;         // 0x0101
  chargingPower: number;      // 0x0512-0x0513 (W)
  currentL1: number;          // 0x0500-0x0501 (A)
  currentL2: number;          // 0x0502-0x0503 (A)
  currentL3: number;          // 0x0504-0x0505 (A)
  sessionEnergy: number;      // 0x0B02-0x0B03 (Wh)
  sessionDuration: number;    // 0x0B04-0x0B05 (seconds)
}

// Charging Mode
export type ChargingMode = 'solar_only' | 'grid_support' | 'boost';

// System Status
export interface SystemStatus {
  mode: ChargingMode;
  chargerState: ChargerState;
  gridFlow: number;           // kW (negative = surplus/exporting)
  movingAverage: number;      // kW (negative = surplus)
  charging: boolean;
  authorized: boolean;
  targetCurrent: number;      // A per phase
  lastUpdate: Date;
}

// Configuration
export interface Config {
  mqtt: {
    broker: string;
    topic: string;
  };
  modbus: {
    port: string;
    baudRate: number;
    dataBits: number;
    stopBits: number;
    parity: 'none' | 'even' | 'odd';
    slaveId: number;
  };
  charger: {
    maxCurrent: number;
    minCurrent: number;
    voltage: number;
    phases: number;
  };
  charging: {
    solarOnly: {
      startThresholdKw: number;
      stopThresholdKw: number;
    };
    gridSupport: {
      minimumCurrent: number;
    };
    checkIntervalSeconds: number;
    movingAverageMinutes: number;
  };
  api: {
    port: number;
  };
}
