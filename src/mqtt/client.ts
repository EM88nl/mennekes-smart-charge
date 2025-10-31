import mqtt from 'mqtt';
import { EventEmitter } from 'events';
import { P1Data } from '../types';
import { logger } from '../logger';

export class MqttClient extends EventEmitter {
  private client: mqtt.MqttClient | null = null;
  private broker: string;
  private topic: string;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private connected: boolean = false;
  private messageCount: number = 0;

  constructor(broker: string, topic: string) {
    super();
    this.broker = broker;
    this.topic = topic;
  }

  connect(): void {
    logger.info(`Connecting to MQTT broker: ${this.broker}`);

    this.client = mqtt.connect(this.broker, {
      reconnectPeriod: 5000,
      connectTimeout: 10000,
      keepalive: 60
    });

    this.client.on('connect', () => {
      this.connected = true;
      this.reconnectAttempts = 0;
      logger.info('Connected to MQTT broker');

      this.client!.subscribe(this.topic, (err) => {
        if (err) {
          logger.error('Failed to subscribe to topic', { topic: this.topic, error: err.message });
          this.emit('error', err);
        } else {
          logger.info(`Subscribed to topic: ${this.topic}`);
        }
      });
    });

    this.client.on('message', (topic, message) => {
      try {
        const data: P1Data = JSON.parse(message.toString());

        // Validate data
        if (!data.electricity_currently_delivered || !data.electricity_currently_returned) {
          logger.warn('Received incomplete P1 data', { data });
          return;
        }

        this.messageCount++;

        // Log first message at info level
        if (this.messageCount === 1) {
          logger.info('First MQTT P1 data received', {
            delivered: data.electricity_currently_delivered,
            returned: data.electricity_currently_returned,
            timestamp: data.timestamp
          });
        }

        // Log every 10th message at info level
        if (this.messageCount % 10 === 0) {
          logger.info('MQTT P1 data received', {
            delivered: data.electricity_currently_delivered,
            returned: data.electricity_currently_returned,
            timestamp: data.timestamp,
            messageCount: this.messageCount
          });
        }

        this.emit('data', data);
      } catch (error) {
        logger.error('Failed to parse MQTT message', {
          error: error instanceof Error ? error.message : 'Unknown error',
          message: message.toString().substring(0, 100)
        });
      }
    });

    this.client.on('error', (error) => {
      logger.error('MQTT error', { error: error.message });
      this.emit('error', error);
    });

    this.client.on('offline', () => {
      this.connected = false;
      this.reconnectAttempts++;

      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        logger.warn(`MQTT client offline (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}), will attempt to reconnect...`);
      } else {
        logger.error('MQTT client offline, max reconnect attempts reached');
        this.emit('max-reconnect-reached');
      }
    });

    this.client.on('reconnect', () => {
      logger.info('Reconnecting to MQTT broker...');
    });

    this.client.on('close', () => {
      this.connected = false;
      logger.warn('MQTT connection closed');
    });
  }

  disconnect(): void {
    if (this.client) {
      this.client.end();
      this.connected = false;
      logger.info('Disconnected from MQTT broker');
    }
  }

  isConnected(): boolean {
    return this.connected && this.client?.connected === true;
  }
}
