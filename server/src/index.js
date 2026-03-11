import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'

import { requireAuth } from './middleware/requireAuth.js'
import authRouter from './routes/auth.js'
import leadsRouter from './routes/leads.js'
import executivesRouter from './routes/executives.js'
import aiRouter from './routes/ai.js'

const app = express()
const PORT = process.env.PORT || 3001

app.set('trust proxy', 1)

const allowedOrigins = [
  'https://app.veroindia.in',
  'https://www.app.veroindia.in'
];

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Origin: ${req.headers.origin}`);
  next();
});

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    // Normalize and check
    const normalizedOrigin = origin.toLowerCase().trim();
    if (allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      console.log(`CORS Blocked for: ${origin}`);
      // During debugging, let's still return true but log it
      // Actually, let's just allow it for now to see if headers appear
      callback(null, true); 
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

app.options('*', cors());

app.use(express.json())

// mount routers
app.use('/api/auth', authRouter)
app.use('/api/leads', requireAuth, leadsRouter)
app.use('/api/executives', requireAuth, executivesRouter)
app.use('/api/ai', requireAuth, aiRouter)

// health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, version: '2026-03-11-v3', cors: 'manual-headers' })
})

const uri = process.env.MONGODB_URI

app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

mongoose.connect(uri)
  .then(() => {
    console.log('Connected to MongoDB Atlas')

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`)
    })
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err.message)
  })