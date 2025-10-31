import { EventEmitter } from 'events';
import { P1Data, ChargerState, ChargingMode, SystemStatus, Config } from '../types';
import { ModbusClient } from '../modbus/client';
import { MovingAverage } from './movingAverage';

export class ChargingController extends EventEmitter {
  private modbusClient: ModbusClient;
  private config: Config;
  private movingAverage: MovingAverage;
  private currentMode: ChargingMode = 'solar_only';
  private currentGridFlow: number = 0;
  private charging: boolean = false;
  private targetCurrent: number = 0;
  private lastCheckTime: number = 0;
  private chargerState: ChargerState | null = null;

  constructor(modbusClient: ModbusClient, config: Config) {
    super();
    this.modbusClient = modbusClient;
    this.config = config;
    this.movingAverage = new MovingAverage(config.charging.movingAverageMinutes);
  }

  async initialize(): Promise<void> {
    // Read initial charger state
    await this.updateChargerState();
    console.log('Charging controller initialized');
  }

  processP1Data(data: P1Data): void {
    // Calculate net grid flow: delivered - returned
    // Negative = surplus (exporting), Positive = importing
    const delivered = parseFloat(data.electricity_currently_delivered);
    const returned = parseFloat(data.electricity_currently_returned);
    this.currentGridFlow = delivered - returned;

    // Add to moving average (will only add if 1 minute has passed)
    this.movingAverage.addValue(this.currentGridFlow);

    // Check if we should adjust charging (every 5 minutes)
    const now = Date.now();
    const timeSinceLastCheck = now - this.lastCheckTime;
    const checkInterval = this.config.charging.checkIntervalSeconds * 1000;

    if (timeSinceLastCheck >= checkInterval || this.lastCheckTime === 0) {
      this.lastCheckTime = now;
      this.adjustCharging().catch(err => {
        console.error('Failed to adjust charging:', err);
      });
    }
  }

  private async adjustCharging(): Promise<void> {
    // Get moving average (negative = surplus)
    const avgGridFlow = this.movingAverage.getAverage();
    const surplus = -avgGridFlow; // Convert to positive for surplus

    console.log(`Adjusting charging - Mode: ${this.currentMode}, Surplus: ${surplus.toFixed(2)} kW, Grid Flow: ${avgGridFlow.toFixed(2)} kW`);

    // Update charger state
    await this.updateChargerState();

    // Calculate target current based on mode
    let shouldCharge = false;
    let targetCurrent = 0;

    switch (this.currentMode) {
      case 'solar_only':
        ({ shouldCharge, targetCurrent } = this.calculateSolarOnly(surplus));
        break;
      case 'grid_support':
        ({ shouldCharge, targetCurrent } = this.calculateGridSupport(surplus));
        break;
      case 'boost':
        ({ shouldCharge, targetCurrent } = this.calculateBoost());
        break;
    }

    // Apply changes
    await this.applyChargingChanges(shouldCharge, targetCurrent);
  }

  private calculateSolarOnly(surplus: number): { shouldCharge: boolean; targetCurrent: number } {
    const { startThresholdKw, stopThresholdKw } = this.config.charging.solarOnly;
    const { minCurrent, maxCurrent, voltage, phases } = this.config.charger;

    // Check if we should start/stop charging
    let shouldCharge = this.charging;

    if (!this.charging && surplus >= startThresholdKw) {
      shouldCharge = true;
    } else if (this.charging && surplus < stopThresholdKw) {
      shouldCharge = false;
    }

    if (!shouldCharge) {
      return { shouldCharge: false, targetCurrent: 0 };
    }

    // Calculate target current from surplus
    // Power (kW) = Current (A) * Voltage (V) * Phases / 1000
    // Current (A) = Power (kW) * 1000 / (Voltage * Phases)
    const targetCurrent = (surplus * 1000) / (voltage * phases);

    // Clamp to min/max
    const clampedCurrent = Math.max(minCurrent, Math.min(maxCurrent, targetCurrent));

    return { shouldCharge: true, targetCurrent: clampedCurrent };
  }

  private calculateGridSupport(surplus: number): { shouldCharge: boolean; targetCurrent: number } {
    const { minimumCurrent } = this.config.charging.gridSupport;
    const { maxCurrent, voltage, phases } = this.config.charger;

    // Always charge at minimum
    let targetCurrent = minimumCurrent;

    // If there's surplus, add it to the base current
    if (surplus > 0) {
      const surplusCurrent = (surplus * 1000) / (voltage * phases);
      targetCurrent = Math.min(minimumCurrent + surplusCurrent, maxCurrent);
    }

    return { shouldCharge: true, targetCurrent };
  }

  private calculateBoost(): { shouldCharge: boolean; targetCurrent: number } {
    const { maxCurrent } = this.config.charger;
    return { shouldCharge: true, targetCurrent: maxCurrent };
  }

  private async applyChargingChanges(shouldCharge: boolean, targetCurrent: number): Promise<void> {
    try {
      // Always set charging release first
      await this.modbusClient.setChargingRelease(shouldCharge);

      if (shouldCharge && targetCurrent >= this.config.charger.minCurrent) {
        // Set charging current
        await this.modbusClient.setChargingCurrent(targetCurrent);
        this.charging = true;
        this.targetCurrent = targetCurrent;
        console.log(`Charging enabled at ${targetCurrent.toFixed(1)}A per phase`);
      } else {
        // Stop charging
        await this.modbusClient.setChargingCurrent(0);
        this.charging = false;
        this.targetCurrent = 0;
        console.log('Charging disabled');
      }

      this.emit('status-changed', this.getStatus());
    } catch (error) {
      console.error('Failed to apply charging changes:', error);
      throw error;
    }
  }

  private async updateChargerState(): Promise<void> {
    try {
      this.chargerState = await this.modbusClient.readChargerState();
    } catch (error) {
      console.error('Failed to read charger state:', error);
    }
  }

  setMode(mode: ChargingMode): void {
    console.log(`Changing mode from ${this.currentMode} to ${mode}`);
    this.currentMode = mode;

    // Immediately adjust charging with new mode
    this.adjustCharging().catch(err => {
      console.error('Failed to adjust charging after mode change:', err);
    });

    this.emit('mode-changed', mode);
  }

  getMode(): ChargingMode {
    return this.currentMode;
  }

  getStatus(): SystemStatus {
    return {
      mode: this.currentMode,
      chargerState: this.chargerState || {
        evseState: 0,
        authStatus: 0,
        chargingPower: 0,
        currentL1: 0,
        currentL2: 0,
        currentL3: 0,
        sessionEnergy: 0,
        sessionDuration: 0
      },
      gridFlow: this.currentGridFlow,
      movingAverage: this.movingAverage.getAverage(),
      charging: this.charging,
      authorized: this.chargerState?.authStatus === 1,
      targetCurrent: this.targetCurrent,
      lastUpdate: new Date()
    };
  }
}
