import crypto from 'crypto'
import { promisify } from 'util'

const scryptAsync = promisify(crypto.scrypt)

export const SESSION_COOKIE_NAME = 'crm_session'
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const derivedKey = await scryptAsync(password, salt, 64)
  return `${salt}:${Buffer.from(derivedKey).toString('hex')}`
}

export async function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false

  const [salt, keyHex] = storedHash.split(':')
  const derivedKey = await scryptAsync(password, salt, 64)
  const storedKey = Buffer.from(keyHex, 'hex')
  const computedKey = Buffer.from(derivedKey)

  if (storedKey.length !== computedKey.length) return false
  return crypto.timingSafeEqual(storedKey, computedKey)
}

export function createSessionToken() {
  return crypto.randomBytes(32).toString('hex')
}

export function hashSessionToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function parseCookies(cookieHeader = '') {
  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separatorIndex = part.indexOf('=')
      if (separatorIndex === -1) return cookies
      const key = decodeURIComponent(part.slice(0, separatorIndex).trim())
      const value = decodeURIComponent(part.slice(separatorIndex + 1).trim())
      cookies[key] = value
      return cookies
    }, {})
}

export function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_MS,
    path: '/',
  })
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  })
}
