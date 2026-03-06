import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'

import { requireAuth } from './middleware/requireAuth.js'
import authRouter from './routes/auth.js'
import leadsRouter from './routes/leads.js'
import executivesRouter from './routes/executives.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

// mount routers
app.use('/api/auth', authRouter)
app.use('/api/leads', requireAuth, leadsRouter)
app.use('/api/executives', requireAuth, executivesRouter)

// health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

const uri = process.env.MONGODB_URI

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