import express, { Request, Response, NextFunction } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import cors from 'cors';
import path from 'path';
import { ChargingController } from '../charging/controller';
import { ChargingMode } from '../types';
import { logger } from '../logger';

export class ApiServer {
  private app: express.Application;
  private httpServer: ReturnType<typeof createServer>;
  private io: SocketIOServer;
  private controller: ChargingController;
  private port: number;

  constructor(controller: ChargingController, port: number) {
    this.controller = controller;
    this.port = port;
    this.app = express();
    this.httpServer = createServer(this.app);
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupControllerListeners();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());

    // Request logging middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info('HTTP request', {
          method: req.method,
          path: req.path,
          status: res.statusCode,
          duration: `${duration}ms`
        });
      });
      next();
    });

    this.app.use(express.static(path.join(__dirname, '../../frontend')));

    // Error handling middleware
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      logger.error('Express error', {
        error: err.message,
        stack: err.stack,
        path: req.path
      });
      res.status(500).json({ error: 'Internal server error' });
    });
  }

  private setupRoutes(): void {
    // GET /api/status - Get current system status
    this.app.get('/api/status', (req: Request, res: Response) => {
      const status = this.controller.getStatus();
      res.json(status);
    });

    // GET /api/mode - Get current charging mode
    this.app.get('/api/mode', (req: Request, res: Response) => {
      res.json({ mode: this.controller.getMode() });
    });

    // POST /api/mode - Set charging mode
    this.app.post('/api/mode', (req: Request, res: Response) => {
      const { mode } = req.body;

      if (!mode || !['solar_only', 'grid_support', 'boost'].includes(mode)) {
        return res.status(400).json({ error: 'Invalid mode. Must be solar_only, grid_support, or boost' });
      }

      this.controller.setMode(mode as ChargingMode);
      res.json({ success: true, mode });
    });

    // Serve frontend
    this.app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, '../../frontend/index.html'));
    });
  }

  private setupWebSocket(): void {
    this.io.on('connection', (socket) => {
      logger.info('WebSocket client connected', { socketId: socket.id });

      // Send initial status
      try {
        socket.emit('status', this.controller.getStatus());
      } catch (error) {
        logger.error('Failed to send initial status', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      socket.on('disconnect', () => {
        logger.info('WebSocket client disconnected', { socketId: socket.id });
      });

      // Handle mode change requests
      socket.on('set-mode', (mode: ChargingMode) => {
        logger.info('Mode change via WebSocket', { mode, socketId: socket.id });

        if (['solar_only', 'grid_support', 'boost'].includes(mode)) {
          this.controller.setMode(mode);
        } else {
          logger.warn('Invalid mode requested via WebSocket', { mode, socketId: socket.id });
        }
      });

      socket.on('error', (error) => {
        logger.error('WebSocket error', {
          error: error.message,
          socketId: socket.id
        });
      });
    });
  }

  private setupControllerListeners(): void {
    // Broadcast status changes to all connected clients
    this.controller.on('status-changed', (status) => {
      const clientCount = this.io.sockets.sockets.size;
      logger.debug('Broadcasting status update to clients', {
        clientCount,
        evseState: status.chargerState.evseState,
        gridFlow: status.gridFlow.toFixed(2),
        movingAverage: status.movingAverage.toFixed(2)
      });
      this.io.emit('status', status);
    });

    this.controller.on('mode-changed', (mode) => {
      logger.info('Broadcasting mode change', { mode });
      this.io.emit('mode-changed', mode);
    });

    this.controller.on('error', (error) => {
      logger.error('Controller error', { error: error.message });
      this.io.emit('error', { message: error.message });
    });
  }

  start(): void {
    this.httpServer.listen(this.port, () => {
      logger.info(`API server started`, { port: this.port, url: `http://localhost:${this.port}` });
    });
  }

  stop(): void {
    this.httpServer.close(() => {
      logger.info('API server stopped');
    });
  }
}
