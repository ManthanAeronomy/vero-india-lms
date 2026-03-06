import { Router } from 'express'

import { User } from '../models/User.js'
import {
  SESSION_TTL_MS,
  SESSION_COOKIE_NAME,
  clearSessionCookie,
  createSessionToken,
  hashSessionToken,
  parseCookies,
  setSessionCookie,
  verifyPassword,
  hashPassword,
} from '../utils/auth.js'

const router = Router()

async function getSessionUser(req) {
  const cookies = parseCookies(req.headers.cookie)
  const sessionToken = cookies[SESSION_COOKIE_NAME]

  if (!sessionToken) {
    return { error: 'Not authenticated', status: 401 }
  }

  const tokenHash = hashSessionToken(sessionToken)
  const user = await User.findOne({ 'sessions.tokenHash': tokenHash }).select('+passwordHash')

  if (!user) {
    return { error: 'Invalid session', status: 401 }
  }

  const activeSession = user.sessions.find(
    (session) => session.tokenHash === tokenHash && session.expiresAt > new Date()
  )

  if (!activeSession) {
    return { error: 'Session expired', status: 401 }
  }

  return { user, tokenHash }
}

router.get('/me', async (req, res) => {
  try {
    const session = await getSessionUser(req)
    if (session.error) {
      return res.status(session.status).json({ error: session.error })
    }

    res.json({ user: session.user.toJSON() })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.patch('/profile', async (req, res) => {
  try {
    const session = await getSessionUser(req)
    if (session.error) {
      return res.status(session.status).json({ error: session.error })
    }

    const name = String(req.body?.name ?? '').trim()
    const email = String(req.body?.email ?? '').trim().toLowerCase()

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' })
    }

    const existingUser = await User.findOne({ email, _id: { $ne: session.user._id } })
    if (existingUser) {
      return res.status(409).json({ error: 'Another account already uses this email' })
    }

    session.user.name = name
    session.user.email = email
    await session.user.save()

    res.json({ user: session.user.toJSON() })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.patch('/account/password', async (req, res) => {
  try {
    const session = await getSessionUser(req)
    if (session.error) {
      return res.status(session.status).json({ error: session.error })
    }

    const currentPassword = String(req.body?.currentPassword ?? '')
    const newPassword = String(req.body?.newPassword ?? '')

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' })
    }

    const isValidPassword = await verifyPassword(currentPassword, session.user.passwordHash)
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' })
    }

    session.user.passwordHash = await hashPassword(newPassword)
    await session.user.save()

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/signup', async (req, res) => {
  try {
    const name = String(req.body?.name ?? '').trim()
    const email = String(req.body?.email ?? '').trim().toLowerCase()
    const password = String(req.body?.password ?? '')

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(409).json({ error: 'An account already exists for this email' })
    }

    const passwordHash = await hashPassword(password)
    const sessionToken = createSessionToken()
    const tokenHash = hashSessionToken(sessionToken)
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS)

    const user = new User({
      name,
      email,
      passwordHash,
      sessions: [{ tokenHash, expiresAt }],
    })

    await user.save()
    setSessionCookie(res, sessionToken)

    res.status(201).json({ user: user.toJSON() })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/login', async (req, res) => {
  try {
    const email = String(req.body?.email ?? '').trim().toLowerCase()
    const password = String(req.body?.password ?? '')

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const user = await User.findOne({ email }).select('+passwordHash')
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash)
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const sessionToken = createSessionToken()
    const tokenHash = hashSessionToken(sessionToken)
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS)

    user.sessions = [
      ...user.sessions.filter((session) => session.expiresAt > new Date()),
      { tokenHash, expiresAt },
    ].slice(-5)

    await user.save()
    setSessionCookie(res, sessionToken)

    res.json({
      user: user.toJSON(),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.patch('/onboarding', async (req, res) => {
  try {
    const session = await getSessionUser(req)
    if (session.error) {
      return res.status(session.status).json({ error: session.error })
    }

    const role = String(req.body?.role ?? '').trim()
    if (!['admin', 'team_member'].includes(role)) {
      return res.status(400).json({ error: 'Role must be admin or team_member' })
    }

    session.user.role = role
    await session.user.save()

    res.json({ user: session.user.toJSON() })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/logout', async (req, res) => {
  const cookies = parseCookies(req.headers.cookie)
  const sessionToken = cookies[SESSION_COOKIE_NAME]

  if (sessionToken) {
    const tokenHash = hashSessionToken(sessionToken)
    await User.updateOne(
      { 'sessions.tokenHash': tokenHash },
      { $pull: { sessions: { tokenHash } } }
    )
  }

  clearSessionCookie(res)
  res.json({ ok: true })
})

export default router
