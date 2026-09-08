import crypto from 'node:crypto'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import express from 'express'
import { OAuth2Client } from 'google-auth-library'

// Node 20+ can load a local .env without adding a runtime dependency. Render
// injects production values directly, so a missing local file is harmless.
try {
  process.loadEnvFile?.()
} catch {
  // Environment variables supplied by the shell/hosting platform still work.
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const isProduction = process.env.NODE_ENV === 'production'
const port = Number(process.env.PORT || 3000)
const appUrl = (process.env.APP_URL || `http://localhost:${port}`).replace(/\/$/, '')
const callbackUrl = process.env.GOOGLE_CALLBACK_URL || `${appUrl}/auth/google/callback`
const clientId = process.env.GOOGLE_CLIENT_ID
const clientSecret = process.env.GOOGLE_CLIENT_SECRET
const frontendOrigin = (process.env.FRONTEND_ORIGIN || appUrl).replace(/\/$/, '')
const oauthClient = clientId ? new OAuth2Client(clientId, clientSecret, callbackUrl) : null

const cookieOptions = [
  'Path=/',
  'HttpOnly',
  'SameSite=Lax',
  'Max-Age=600',
  ...(isProduction ? ['Secure'] : []),
]

function parseCookies(request) {
  const header = request.headers.cookie || ''
  return Object.fromEntries(
    header.split(';').flatMap((part) => {
      const separator = part.indexOf('=')
      if (separator < 0) return []
      const key = part.slice(0, separator).trim()
      const value = decodeURIComponent(part.slice(separator + 1).trim())
      return [[key, value]]
    }),
  )
}

function setCookie(response, name, value, options = cookieOptions) {
  const cookie = `${name}=${encodeURIComponent(value)}; ${options.join('; ')}`
  const previous = response.getHeader('Set-Cookie')
  response.setHeader('Set-Cookie', previous ? [...(Array.isArray(previous) ? previous : [previous]), cookie] : cookie)
}

function clearCookie(response, name) {
  setCookie(response, name, '', ['Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0', ...(isProduction ? ['Secure'] : [])])
}

function safeReturnTo(value) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/'
  return value
}

function requireConfig(response) {
  if (clientId && clientSecret && oauthClient) return true
  response.status(503).send('Google OAuth is not configured on the server.')
  return false
}

app.get('/auth/google', (request, response) => {
  if (!requireConfig(response)) return
  const state = crypto.randomBytes(32).toString('base64url')
  const returnTo = safeReturnTo(typeof request.query.returnTo === 'string' ? request.query.returnTo : '/')
  setCookie(response, 'oauth_state', `${state}.${Buffer.from(returnTo).toString('base64url')}`)

  const authorizationUrl = oauthClient.generateAuthUrl({
    access_type: 'online',
    scope: ['openid', 'email', 'profile'],
    prompt: 'select_account',
    state,
  })
  response.redirect(authorizationUrl)
})

app.get('/auth/google/callback', async (request, response) => {
  if (!requireConfig(response)) return
  const cookies = parseCookies(request)
  const savedState = cookies.oauth_state || ''
  const [expectedState, encodedReturnTo] = savedState.split('.')
  const receivedState = typeof request.query.state === 'string' ? request.query.state : ''
  const validState = expectedState && receivedState && expectedState.length === receivedState.length && crypto.timingSafeEqual(Buffer.from(expectedState), Buffer.from(receivedState))
  const returnTo = safeReturnTo(encodedReturnTo ? Buffer.from(encodedReturnTo, 'base64url').toString('utf8') : '/')
  clearCookie(response, 'oauth_state')

  if (!validState) {
    response.redirect(`${frontendOrigin}${returnTo}?google=error&reason=invalid_state`)
    return
  }

  if (typeof request.query.error === 'string') {
    response.redirect(`${frontendOrigin}${returnTo}?google=error&reason=denied`)
    return
  }

  try {
    const code = typeof request.query.code === 'string' ? request.query.code : ''
    if (!code) throw new Error('Missing authorization code')
    const { tokens } = await oauthClient.getToken(code)
    if (!tokens.id_token) throw new Error('Google did not return an ID token')
    const ticket = await oauthClient.verifyIdToken({ idToken: tokens.id_token, audience: clientId })
    if (!ticket.getPayload()?.email) throw new Error('Google account has no email address')

    // The ID token is short-lived and is consumed exactly once by /auth/google/token.
    setCookie(response, 'google_id_token', tokens.id_token)
    response.redirect(`${frontendOrigin}${returnTo}${returnTo.includes('?') ? '&' : '?'}google=success`)
  } catch (error) {
    console.error('Google OAuth callback failed', error)
    response.redirect(`${frontendOrigin}${returnTo}${returnTo.includes('?') ? '&' : '?'}google=error&reason=callback`)
  }
})

app.get('/auth/google/token', (request, response) => {
  const cookies = parseCookies(request)
  const idToken = cookies.google_id_token
  clearCookie(response, 'google_id_token')
  response.setHeader('Cache-Control', 'no-store')
  if (!idToken) {
    response.status(401).json({ error: 'Google sign-in session expired.' })
    return
  }
  response.json({ idToken })
})

// Serve the Vite client when this process is used as the production web server.
const clientCandidates = [
  path.resolve(__dirname, '../dist/client'),
  path.resolve(__dirname, '../.vercel/output/static'),
  path.resolve(__dirname, '../.output/public'),
  path.resolve(__dirname, '../dist'),
]
const clientDir = clientCandidates.find((candidate) => existsSync(path.join(candidate, 'index.html'))) ?? clientCandidates[0]
app.use(express.static(clientDir))
app.get(/.*/, (request, response, next) => {
  if (request.path.startsWith('/auth/')) return next()
  response.sendFile(path.join(clientDir, 'index.html'))
})

app.listen(port, () => {
  console.log(`Click Agency Express server listening on ${appUrl}`)
})
