import express from 'express';
import cors from 'cors';
import { SQLiteDatabase } from './Database.js';
import type { ActivityEvent } from '../shared/types.js';

export interface ServerServices {
  db: SQLiteDatabase;
  statsService: any;
  scoreService: any;
  intentService: any;
  interventionService: any;
  recoveryService: any;
}

export class ActivityServer {
  private app: express.Express;
  private server: any;
  
  private activityListeners: Array<(event: ActivityEvent) => void> = [];

  constructor(private services: ServerServices) {
    this.app = express();
    this.app.use(cors());
    this.app.use(express.json());

    this.setupRoutes();
  }

  public onActivity(listener: (event: ActivityEvent) => void) {
    this.activityListeners.push(listener);
  }

  private setupRoutes() {
    this.app.post('/api/activity', (req, res) => {
      try {
        const event = req.body as ActivityEvent;
        if (!event || !event.id || !event.source || !event.application || typeof event.duration !== 'number') {
          return res.status(400).json({ error: 'Invalid ActivityEvent payload' });
        }
        
        this.services.db.logActivity(event);

        for (const listener of this.activityListeners) {
          listener(event);
        }

        res.status(200).json({ success: true });
      } catch (err) {
        console.error('Error processing /api/activity:', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // --- Dashboard UI Endpoints ---
    
    this.app.get('/api/intent', (req, res) => {
      res.json(this.services.intentService.getCurrentIntent());
    });

    this.app.post('/api/intent', (req, res) => {
      const { description } = req.body;
      if (!description) {
        this.services.intentService.clearIntent();
        this.services.interventionService.reset();
        this.services.db.setSessionStartMs(null);
        return res.json(null);
      }
      const intent = this.services.intentService.setIntent(description);
      this.services.db.setSessionStartMs(intent.createdAt);
      res.json(intent);
    });

    this.app.get('/api/statistics', (req, res) => {
      res.json(this.services.statsService.getDailyStatistics());
    });

    this.app.get('/api/score', (req, res) => {
      res.json(this.services.scoreService.calculateScore());
    });

    this.app.get('/api/intervention', (req, res) => {
      res.json(this.services.interventionService.getState());
    });

    this.app.post('/api/intervention/respond', async (req, res) => {
      const { action } = req.body;
      const result = this.services.interventionService.respondToIntervention(action);
      
      if (action === 'return') {
        const intent = this.services.intentService.getCurrentIntent();
        if (intent) {
          await this.services.recoveryService.returnToTask(intent);
        }
      }
      
      res.json(result);
    });

    this.app.get('/api/recent_activity', (req, res) => {
      res.json(this.services.db.getRecentActivity(50));
    });

    this.app.get('/api/browser_status', (req, res) => {
      const isConnected = this.services.db.hasRecentBrowserActivity(60000);
      res.json({ connected: isConnected });
    });
  }

  public start(port = 3000) {
    this.server = this.app.listen(port, () => {
      console.log(`[ActivityServer] Listening on http://localhost:${port}`);
    });
  }

  public stop() {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}
