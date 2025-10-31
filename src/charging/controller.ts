import { EventEmitter } from 'events';
import { P1Data, ChargerState, ChargingMode, SystemStatus, Config } from '../types';
import { ModbusClient } from '../modbus/client';
import { MovingAverage } from './movingAverage';
import { logger } from '../logger';

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
  private consecutiveErrors: number = 0;
  private maxConsecutiveErrors: number = 5;
  private statusUpdateInterval: NodeJS.Timeout | null = null;

  constructor(modbusClient: ModbusClient, config: Config) {
    super();
    this.modbusClient = modbusClient;
    this.config = config;
    this.movingAverage = new MovingAverage(config.charging.movingAverageMinutes);
  }

  async initialize(): Promise<void> {
    try {
      // Read initial charger state
      await this.updateChargerState();

      // Start periodic status updates
      this.startStatusUpdates();

      logger.info('Charging controller initialized', {
        mode: this.currentMode,
        movingAverageWindow: this.config.charging.movingAverageMinutes,
        statusUpdateInterval: this.config.charging.statusUpdateIntervalSeconds
      });
    } catch (error) {
      logger.error('Failed to initialize charging controller', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private startStatusUpdates(): void {
    // Poll charger state at configured interval (e.g., every 10 seconds)
    const intervalMs = this.config.charging.statusUpdateIntervalSeconds * 1000;

    this.statusUpdateInterval = setInterval(async () => {
      logger.debug('Periodic status update triggered');
      try {
        await this.updateChargerState();
        this.emit('status-changed', this.getStatus());
        logger.debug('Status update completed and broadcasted');
      } catch (error) {
        logger.error('Error during periodic status update', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }, intervalMs);

    logger.info('Started periodic status updates', {
      intervalSeconds: this.config.charging.statusUpdateIntervalSeconds,
      intervalMs: intervalMs
    });
  }

  private stopStatusUpdates(): void {
    if (this.statusUpdateInterval) {
      clearInterval(this.statusUpdateInterval);
      this.statusUpdateInterval = null;
      logger.info('Stopped periodic status updates');
    }
  }

  processP1Data(data: P1Data): void {
    // Calculate net grid flow: delivered - returned
    // Negative = surplus (exporting), Positive = importing
    const delivered = parseFloat(data.electricity_currently_delivered);
    const returned = parseFloat(data.electricity_currently_returned);
    this.currentGridFlow = delivered - returned;

    // Add to moving average (will only add if 1 minute has passed)
    const wasAdded = this.movingAverage.getCount();
    this.movingAverage.addValue(this.currentGridFlow);
    const isAdded = this.movingAverage.getCount() > wasAdded;

    logger.debug('P1 data processed', {
      delivered,
      returned,
      gridFlow: this.currentGridFlow.toFixed(2),
      addedToAverage: isAdded,
      avgSamples: this.movingAverage.getCount()
    });

    // Emit status update for real-time grid flow display
    this.emit('status-changed', this.getStatus());

    // Check if we should adjust charging (every 5 minutes)
    const now = Date.now();
    const timeSinceLastCheck = now - this.lastCheckTime;
    const checkInterval = this.config.charging.checkIntervalSeconds * 1000;

    if (timeSinceLastCheck >= checkInterval || this.lastCheckTime === 0) {
      this.lastCheckTime = now;
      this.adjustCharging().catch(err => {
        logger.error('Failed to adjust charging', {
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      });
    }
  }

  private async adjustCharging(): Promise<void> {
    try {
      // Get moving average (negative = surplus)
      const avgGridFlow = this.movingAverage.getAverage();
      const surplus = -avgGridFlow; // Convert to positive for surplus

      logger.info('Adjusting charging', {
        mode: this.currentMode,
        surplus: surplus.toFixed(2),
        gridFlow: avgGridFlow.toFixed(2),
        movingAverageSamples: this.movingAverage.getCount()
      });

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

      // Reset error counter on success
      this.consecutiveErrors = 0;

    } catch (error) {
      this.consecutiveErrors++;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to adjust charging', {
        error: errorMsg,
        consecutiveErrors: this.consecutiveErrors,
        maxErrors: this.maxConsecutiveErrors
      });

      if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
        logger.error('Max consecutive errors reached, entering safe mode');
        this.emit('error', new Error('Max consecutive charging adjustment errors reached'));
      }
    }
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
        const wasCharging = this.charging;
        this.charging = true;
        this.targetCurrent = targetCurrent;

        if (!wasCharging) {
          logger.info('Charging started', { targetCurrent: targetCurrent.toFixed(1) });
        } else {
          logger.info('Charging adjusted', { targetCurrent: targetCurrent.toFixed(1) });
        }
      } else {
        // Stop charging
        await this.modbusClient.setChargingCurrent(0);
        const wasCharging = this.charging;
        this.charging = false;
        this.targetCurrent = 0;

        if (wasCharging) {
          logger.info('Charging stopped');
        }
      }

      this.emit('status-changed', this.getStatus());
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to apply charging changes', { error: errorMsg });
      throw error;
    }
  }

  private async updateChargerState(): Promise<void> {
    try {
      logger.debug('Reading charger state from Modbus...');
      this.chargerState = await this.modbusClient.readChargerState();
      logger.debug('Charger state updated', {
        evseState: this.chargerState.evseState,
        authStatus: this.chargerState.authStatus,
        chargingPower: this.chargerState.chargingPower.toFixed(2),
        sessionEnergy: this.chargerState.sessionEnergy.toFixed(2),
        sessionDuration: this.chargerState.sessionDuration
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to read charger state', { error: errorMsg });
    }
  }

  setMode(mode: ChargingMode): void {
    logger.info('Mode change requested', { from: this.currentMode, to: mode });
    this.currentMode = mode;

    // Immediately adjust charging with new mode
    this.adjustCharging().catch(err => {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Failed to adjust charging after mode change', { error: errorMsg });
    });

    this.emit('mode-changed', mode);
  }

  getMode(): ChargingMode {
    return this.currentMode;
  }

  destroy(): void {
    this.stopStatusUpdates();
    logger.info('Charging controller destroyed');
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
