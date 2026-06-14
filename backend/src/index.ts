import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import instagramRoutes from './routes/instagram';
import automationRoutes from './routes/automation';
import userRoutes from './routes/user';
import { startScheduler } from './worker/scheduler';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/instagram', instagramRoutes);
app.use('/automation', automationRoutes);
app.use('/user', userRoutes);

// Global error handler (Express 5 async error propagation)
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  startScheduler();
  console.log('Automation scheduler started (every 2 min)');
});

export default app;
