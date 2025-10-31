import fs from 'fs';
import path from 'path';
import { Config } from './types';
import { MqttClient } from './mqtt/client';
import { ModbusClient } from './modbus/client';
import { ChargingController } from './charging/controller';
import { ApiServer } from './api/server';

async function main() {
  console.log('=== Mennekes Smart Charge Starting ===');

  // Load configuration
  const configPath = path.join(__dirname, '../config.json');
  const configData = fs.readFileSync(configPath, 'utf-8');
  const config: Config = JSON.parse(configData);

  console.log('Configuration loaded');

  // Initialize Modbus client
  const modbusClient = new ModbusClient(
    config.modbus.port,
    config.modbus.baudRate,
    config.modbus.slaveId
  );

  try {
    await modbusClient.connect();
  } catch (error) {
    console.error('Failed to connect to Modbus. Exiting.');
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
    console.error('MQTT error:', error);
  });

  mqttClient.connect();

  // Start API server
  const apiServer = new ApiServer(controller, config.api.port);
  apiServer.start();

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down...');

    mqttClient.disconnect();
    modbusClient.disconnect();
    apiServer.stop();

    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.log('=== Mennekes Smart Charge Running ===');
  console.log(`Web interface: http://localhost:${config.api.port}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
