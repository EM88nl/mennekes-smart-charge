import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { ApiServer } from '../server';
import { SystemStatus, ChargingMode } from '../../types';

/**
 * Integration tests for API server
 * Tests REST endpoints and basic functionality
 */

// Mock ChargingController - don't extend, just implement the interface
class MockChargingController {
  private mockStatus: SystemStatus;
  private mockMode: ChargingMode = 'solar_only';
  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    this.mockStatus = {
      mode: 'solar_only',
      chargerState: {
        evseState: 3,
        authStatus: 1,
        chargingPower: 0,
        sessionEnergy: 0,
        sessionDuration: 0
      },
      gridFlow: 0.5,
      movingAverage: -2.5,
      charging: false,
      authorized: true,
      targetCurrent: 0,
      lastUpdate: new Date(),
      sessionLog: []
    };
  }

  async initialize(): Promise<void> {
    // Mock initialization
  }

  getStatus(): SystemStatus {
    return this.mockStatus;
  }

  getMode(): ChargingMode {
    return this.mockMode;
  }

  setMode(mode: ChargingMode): void {
    this.mockMode = mode;
    this.mockStatus.mode = mode;
    this.emit('mode-changed', mode);
  }

  updateMockStatus(updates: Partial<SystemStatus>): void {
    this.mockStatus = { ...this.mockStatus, ...updates };
  }

  // EventEmitter methods
  on(event: string, listener: Function): this {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(...args));
      return true;
    }
    return false;
  }

  removeListener(event: string, listener: Function): this {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
    return this;
  }

  destroy(): void {
    // Mock destroy
  }
}

describe('API Server Integration Tests', () => {
  let apiServer: ApiServer;
  let controller: MockChargingController;
  let app: express.Application;

  beforeAll(() => {
    controller = new MockChargingController();
    apiServer = new ApiServer(controller as any, 0); // Port 0 for testing
    // Access the express app directly
    app = (apiServer as any).app;
  });

  afterAll(() => {
    apiServer.stop();
  });

  describe('GET /api/status', () => {
    it('should return current system status', async () => {
      const response = await request(app)
        .get('/api/status')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('mode');
      expect(response.body).toHaveProperty('chargerState');
      expect(response.body).toHaveProperty('gridFlow');
      expect(response.body).toHaveProperty('movingAverage');
      expect(response.body).toHaveProperty('charging');
      expect(response.body).toHaveProperty('authorized');
      expect(response.body).toHaveProperty('targetCurrent');
    });

    it('should return correct mode', async () => {
      controller.setMode('grid_support');

      const response = await request(app)
        .get('/api/status')
        .expect(200);

      expect(response.body.mode).toBe('grid_support');
    });

    it('should return charger state', async () => {
      const response = await request(app)
        .get('/api/status')
        .expect(200);

      expect(response.body.chargerState).toHaveProperty('evseState');
      expect(response.body.chargerState).toHaveProperty('authStatus');
      expect(response.body.chargerState).toHaveProperty('chargingPower');
      expect(response.body.chargerState).toHaveProperty('sessionEnergy');
      expect(response.body.chargerState).toHaveProperty('sessionDuration');
    });
  });

  describe('GET /api/mode', () => {
    it('should return current charging mode', async () => {
      controller.setMode('solar_only');

      const response = await request(app)
        .get('/api/mode')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('mode');
      expect(response.body.mode).toBe('solar_only');
    });
  });

  describe('POST /api/mode', () => {
    it('should set solar_only mode', async () => {
      const response = await request(app)
        .post('/api/mode')
        .send({ mode: 'solar_only' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.mode).toBe('solar_only');
      expect(controller.getMode()).toBe('solar_only');
    });

    it('should set grid_support mode', async () => {
      const response = await request(app)
        .post('/api/mode')
        .send({ mode: 'grid_support' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.mode).toBe('grid_support');
      expect(controller.getMode()).toBe('grid_support');
    });

    it('should set boost mode', async () => {
      const response = await request(app)
        .post('/api/mode')
        .send({ mode: 'boost' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.mode).toBe('boost');
      expect(controller.getMode()).toBe('boost');
    });

    it('should reject invalid mode', async () => {
      const response = await request(app)
        .post('/api/mode')
        .send({ mode: 'invalid_mode' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid mode');
    });

    it('should reject missing mode', async () => {
      const response = await request(app)
        .post('/api/mode')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject non-string mode', async () => {
      const response = await request(app)
        .post('/api/mode')
        .send({ mode: 123 })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('CORS', () => {
    it('should have CORS enabled', async () => {
      const response = await request(app)
        .get('/api/status')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should handle non-existent routes', async () => {
      await request(app)
        .get('/api/nonexistent')
        .expect(200); // Will serve frontend index.html due to catch-all
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/mode')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(500); // Express body-parser returns 500 for JSON parse errors

      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('mode persistence', () => {
    it('should maintain mode across status requests', async () => {
      // Set mode
      await request(app)
        .post('/api/mode')
        .send({ mode: 'boost' })
        .expect(200);

      // Check mode is persisted
      const modeResponse = await request(app)
        .get('/api/mode')
        .expect(200);

      expect(modeResponse.body.mode).toBe('boost');

      // Check mode in status
      const statusResponse = await request(app)
        .get('/api/status')
        .expect(200);

      expect(statusResponse.body.mode).toBe('boost');
    });
  });
});
