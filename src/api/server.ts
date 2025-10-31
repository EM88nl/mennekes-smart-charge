import express, { Request, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import cors from 'cors';
import path from 'path';
import { ChargingController } from '../charging/controller';
import { ChargingMode } from '../types';

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
    this.app.use(express.static(path.join(__dirname, '../../frontend')));
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
      console.log('Client connected via WebSocket');

      // Send initial status
      socket.emit('status', this.controller.getStatus());

      socket.on('disconnect', () => {
        console.log('Client disconnected from WebSocket');
      });

      // Handle mode change requests
      socket.on('set-mode', (mode: ChargingMode) => {
        if (['solar_only', 'grid_support', 'boost'].includes(mode)) {
          this.controller.setMode(mode);
        }
      });
    });
  }

  private setupControllerListeners(): void {
    // Broadcast status changes to all connected clients
    this.controller.on('status-changed', (status) => {
      this.io.emit('status', status);
    });

    this.controller.on('mode-changed', (mode) => {
      this.io.emit('mode-changed', mode);
    });
  }

  start(): void {
    this.httpServer.listen(this.port, () => {
      console.log(`API server running on http://localhost:${this.port}`);
    });
  }

  stop(): void {
    this.httpServer.close(() => {
      console.log('API server stopped');
    });
  }
}
