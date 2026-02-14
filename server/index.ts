import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import serverless from 'serverless-http';
import { askCopilot, CopilotError } from './services/copilot.js';
import Case from './models/Case.js'; // Import your new schema


// Load environment from .env at project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const app = express();
const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
const CORS_CREDENTIALS = process.env.CORS_CREDENTIALS === 'true';
const MONGO_URI = process.env.MONGO_URI;
const NODE_ENV = process.env.NODE_ENV || 'development';

if (NODE_ENV === 'production' && CORS_ORIGIN === 'http://localhost:3000') {
  throw new Error('CORS_ORIGIN must be set in production.');
}

// 2. Middleware (The translators)
if (NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}
app.use(helmet());
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false
  })
);
app.use(cors({ origin: CORS_ORIGIN, credentials: CORS_CREDENTIALS }));
app.use(express.json({ limit: '256kb' }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// 4. Your Main Route
app.post('/analyze', async (req: Request, res: Response) => {
  const { logError } = req.body;

  if (typeof logError !== 'string' || logError.trim().length === 0) {
    return res.status(400).json({ error: 'No log provided.' });
  }
  if (logError.length > 50000) {
    return res.status(413).json({ error: 'Log is too large.' });
  }

  try {
    // 1. Get the AI analysis
    const report = await askCopilot(logError);

    // 2. Save the case to MongoDB (best-effort). If DB is down/auth fails, still return the report.
    let savedCase = null;
    try {
      const solvedCase = new Case({ logError, report });
      savedCase = await solvedCase.save();
    } catch (saveErr) {
      console.error('⚠️ Failed to save case to DB:', saveErr);
    }

    // 3. Return the report and optional saved record
    return res.json({ report, saved: !!savedCase, case: savedCase || null });

  } catch (err: unknown) {
    if (err instanceof CopilotError) {
      const status = (err as any).status ?? 502;
      const code = ((err as any).details as { code?: string } | undefined)?.code;
      return res.status(status).json({ error: (err as any).message, ...(code ? { code } : {}) });
    }
    return res.status(500).json({ error: "Detective failed to save the case." });
  }
});

// History route: return saved cases, newest first
app.get('/cases', async (req: Request, res: Response) => {
  try {
    const cases = await Case.find().sort({ createdAt: -1 });
    res.json(cases);
  } catch (err) {
    res.status(500).json({ error: "Could not fetch the case history." });
  }
});

// Resilient MongoDB connection with retry
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string, {
      serverSelectionTimeoutMS: 5000 // Stop trying after 5 seconds
    });
    console.log('✅ MongoDB connected successfully!');
  } catch (err: any) {
    console.error('⚠️ Connection failed:', err.message);
    console.log('🔄 Retrying in 5 seconds...');
    setTimeout(connectDB, 5000); // Try again every 5 seconds
  }
};

// Start DB reconnect attempts (non-blocking)
connectDB();

// Local dev server (Vercel serverless should not call listen)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🕵️ Server listening on http://localhost:${PORT}`);
  });
}

// Vercel serverless handler
export default serverless(app);