import mqtt from 'mqtt';
import { EventEmitter } from 'events';
import { P1Data } from '../types';

export class MqttClient extends EventEmitter {
  private client: mqtt.MqttClient | null = null;
  private broker: string;
  private topic: string;

  constructor(broker: string, topic: string) {
    super();
    this.broker = broker;
    this.topic = topic;
  }

  connect(): void {
    console.log(`Connecting to MQTT broker: ${this.broker}`);

    this.client = mqtt.connect(this.broker, {
      reconnectPeriod: 5000,
      connectTimeout: 10000
    });

    this.client.on('connect', () => {
      console.log('Connected to MQTT broker');
      this.client!.subscribe(this.topic, (err) => {
        if (err) {
          console.error('Failed to subscribe to topic:', err);
        } else {
          console.log(`Subscribed to topic: ${this.topic}`);
        }
      });
    });

    this.client.on('message', (topic, message) => {
      try {
        const data: P1Data = JSON.parse(message.toString());
        this.emit('data', data);
      } catch (error) {
        console.error('Failed to parse MQTT message:', error);
      }
    });

    this.client.on('error', (error) => {
      console.error('MQTT error:', error);
      this.emit('error', error);
    });

    this.client.on('offline', () => {
      console.warn('MQTT client offline, will attempt to reconnect...');
    });

    this.client.on('reconnect', () => {
      console.log('Reconnecting to MQTT broker...');
    });
  }

  disconnect(): void {
    if (this.client) {
      this.client.end();
      console.log('Disconnected from MQTT broker');
    }
  }
}
