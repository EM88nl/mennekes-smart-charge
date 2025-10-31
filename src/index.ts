import fs from 'fs';
import path from 'path';
import { Config } from './types';
import { MqttClient } from './mqtt/client';
import { ModbusClient } from './modbus/client';
import { ChargingController } from './charging/controller';
import { ApiServer } from './api/server';
import { logger } from './logger';

async function main() {
  logger.info('=== Mennekes Smart Charge Starting ===');

  // Load configuration
  try {
    const configPath = path.join(__dirname, '../config.json');
    const configData = fs.readFileSync(configPath, 'utf-8');
    const config: Config = JSON.parse(configData);
    logger.info('Configuration loaded', {
      mqtt: config.mqtt.broker,
      modbus: config.modbus.port,
      apiPort: config.api.port
    });

    // Initialize Modbus client
    const modbusClient = new ModbusClient(
      config.modbus.port,
      config.modbus.baudRate,
      config.modbus.slaveId
    );

    try {
      await modbusClient.connect();
    } catch (error) {
      logger.error('Failed to connect to Modbus. Exiting.', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      process.exit(1);
    }

    // Initialize charging controller
    const controller = new ChargingController(modbusClient, config);
    await controller.initialize();

    // Initialize MQTT client
    const mqttClient = new MqttClient(config.mqtt.broker, config.mqtt.topic);

    mqttClient.on('data', (data) => {
      controller.processP1Data(data);
    });

    mqttClient.on('error', (error) => {
      logger.error('MQTT error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    });

    mqttClient.on('max-reconnect-reached', () => {
      logger.error('MQTT max reconnect attempts reached. Check broker connectivity.');
    });

    mqttClient.connect();

    // Start API server
    const apiServer = new ApiServer(controller, config.api.port);
    apiServer.start();

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutdown signal received, shutting down gracefully...');

      mqttClient.disconnect();
      modbusClient.disconnect();
      apiServer.stop();

      logger.info('Shutdown complete');
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', {
        error: error.message,
        stack: error.stack
      });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', {
        reason: reason instanceof Error ? reason.message : String(reason),
        promise
      });
    });

    logger.info('=== Mennekes Smart Charge Running ===');
    logger.info(`Web interface: http://localhost:${config.api.port}`);

  } catch (error) {
    logger.error('Failed to start application', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error('Fatal error in main', {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined
  });
  process.exit(1);
});
