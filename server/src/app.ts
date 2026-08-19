import express, { Application } from 'express';
import webhookRoutes from './routes/webhook/routes'

const app: Application = express();

app.use('/api', webhookRoutes);

export default app;
