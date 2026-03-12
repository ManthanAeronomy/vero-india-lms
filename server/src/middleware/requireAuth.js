import { User } from '../models/User.js'
import { SESSION_COOKIE_NAME, hashSessionToken, parseCookies } from '../utils/auth.js'

export async function requireAuth(req, res, next) {
  try {
    // API key auth for internal integrations (e.g. Make.com)
    const apiKey = req.headers['x-api-key']
    if (apiKey && apiKey === process.env.INTERNAL_API_KEY) {
      return next()
    }

    // Existing session cookie auth
    const cookies = parseCookies(req.headers.cookie)
    const sessionToken = cookies[SESSION_COOKIE_NAME]

    if (!sessionToken) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const sessionTokenHash = hashSessionToken(sessionToken)
    const user = await User.findOne({ 'sessions.tokenHash': sessionTokenHash })

    if (!user) {
      return res.status(401).json({ error: 'Invalid session' })
    }

    const activeSession = user.sessions.find(
      (session) => session.tokenHash === sessionTokenHash && session.expiresAt > new Date()
    )

    if (!activeSession) {
      return res.status(401).json({ error: 'Session expired' })
    }

    req.user = user
    next()
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
