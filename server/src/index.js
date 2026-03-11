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

const allowedOrigins = ['https://app.veroindia.in', 'https://www.app.veroindia.in'];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Origin: ${origin}`);
  
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin, Accept');
  } else if (origin) {
    console.log(`CORS mismatch: Origin "${origin}" not in allowed list [${allowedOrigins.join(', ')}]`);
  }
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json())

// mount routers
app.use('/api/auth', authRouter)
app.use('/api/leads', requireAuth, leadsRouter)
app.use('/api/executives', requireAuth, executivesRouter)
app.use('/api/ai', requireAuth, aiRouter)

// health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
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