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

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const normalizedOrigin = origin.toLowerCase().trim();
    if (allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      console.log(`CORS Blocked for: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

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