#!/usr/bin/env node
import { execFile, spawn } from 'node:child_process'
import { timingSafeEqual } from 'node:crypto'
import { access, readFile, writeFile } from 'node:fs/promises'
import { createServer as createHttpServer } from 'node:http'
import { createServer as createHttpsServer } from 'node:https'
import { hostname } from 'node:os'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'
import QRCode from 'qrcode'
import { NowPlayingAccumulator } from './now-playing.mjs'

const execFileAsync = promisify(execFile)
const port = Number(process.env.SLEEVE_PORT || 4743)
const host = process.env.SLEEVE_HOST || '0.0.0.0'
const token = process.env.SLEEVE_TOKEN || ''
const keyPath = process.env.SLEEVE_TLS_KEY || ''
const certPath = process.env.SLEEVE_TLS_CERT || ''
const mediaControl = process.env.SLEEVE_MEDIA_CONTROL || 'media-control'
const deviceName = process.env.SLEEVE_DEVICE_NAME || hostname()
const pairingPort = Number(process.env.SLEEVE_PAIRING_PORT || 4742)
const publicUrl = process.env.SLEEVE_PUBLIC_URL || 'https://ivankudrenko.github.io/Sleeve/'
const caCertificatePath = process.env.SLEEVE_CA_CERT || join(dirname(certPath), 'Sleeve-Local-CA.cer')
const pairingMarker = process.env.SLEEVE_PAIRING_MARKER || join(dirname(certPath), '..', '.paired')
const allowedOrigins = new Set((process.env.SLEEVE_ORIGINS || 'https://ivankudrenko.github.io,http://localhost:5173,http://127.0.0.1:5173').split(',').map((value) => value.trim()).filter(Boolean))

if (token.length < 24) fail('SLEEVE_TOKEN must be at least 24 characters. Generate one with: openssl rand -hex 24')
if (!keyPath || !certPath) fail('Set SLEEVE_TLS_KEY and SLEEVE_TLS_CERT to a certificate trusted by the iPad.')
if (!Number.isInteger(port) || port < 1 || port > 65535) fail('SLEEVE_PORT must be a valid TCP port.')
if (!Number.isInteger(pairingPort) || pairingPort < 1 || pairingPort > 65535) fail('SLEEVE_PAIRING_PORT must be a valid TCP port.')

const clients = new Set()
let child
let restartTimer
let stopping = false
let lastTrack

const accumulator = new NowPlayingAccumulator((track) => {
  lastTrack = { ...track, deviceName }
  broadcast(lastTrack)
})

const [key, cert] = await Promise.all([readFile(keyPath), readFile(certPath)])
const companionUrl = `https://${deviceName}:${port}`
const certificateUrl = `http://${deviceName}:${pairingPort}/certificate`
const pairingPayload = Buffer.from(JSON.stringify({ v: 1, baseUrl: companionUrl, token, deviceName, certificateUrl })).toString('base64url')
const sleevePairingUrl = `${publicUrl.replace(/#.*$/, '')}#pair=${pairingPayload}`
const qrCode = await QRCode.toString(sleevePairingUrl, { type: 'svg', margin: 2, errorCorrectionLevel: 'M', color: { dark: '#24231fff', light: '#eee8dcff' } })
const pairingPage = renderPairingPage(qrCode, sleevePairingUrl, deviceName)
const server = createHttpsServer({ key, cert }, handleRequest)
const pairingServer = createHttpServer(handlePairingRequest)

server.listen(port, host, () => {
  console.log(`Sleeve companion listening securely on ${companionUrl}`)
  console.log(`Allowed browser origins: ${[...allowedOrigins].join(', ')}`)
  startDetector()
})

pairingServer.listen(pairingPort, '0.0.0.0', () => {
  const localPairingPage = `http://localhost:${pairingPort}`
  console.log(`Pair a new display at ${localPairingPage}`)
  void openPairingPageIfNeeded(localPairingPage)
})
pairingServer.on('error', (error) => console.error(`Pairing page unavailable: ${error.message}`))

const keepAlive = setInterval(() => {
  for (const response of clients) response.write(': keep-alive\n\n')
}, 20_000)

async function handleRequest(request, response) {
  const origin = request.headers.origin
  if (origin && !allowedOrigins.has(origin)) return sendJson(response, 403, { error: 'Origin not allowed' })

  setCorsHeaders(request, response, origin)
  if (request.method === 'OPTIONS') {
    response.writeHead(204, { 'Access-Control-Max-Age': '600' })
    response.end()
    return
  }

  const url = new URL(request.url || '/', `https://${request.headers.host || 'localhost'}`)
  if (!authorized(url.searchParams.get('token'))) return sendJson(response, 401, { error: 'Invalid pairing token' })
  if (origin && allowedOrigins.has(origin)) void rememberPaired()

  if (request.method === 'GET' && url.pathname === '/api/now-playing') {
    if (!lastTrack) return sendJson(response, 204)
    return sendJson(response, 200, lastTrack)
  }

  if (request.method === 'GET' && url.pathname === '/api/stream') {
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
    response.write('retry: 2000\n\n')
    clients.add(response)
    if (lastTrack) writeTrack(response, lastTrack)
    request.on('close', () => clients.delete(response))
    return
  }

  sendJson(response, 404, { error: 'Not found' })
}

async function handlePairingRequest(request, response) {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  if (request.method === 'GET' && url.pathname === '/certificate') {
    try {
      const certificate = await readFile(caCertificatePath)
      response.writeHead(200, {
        'Content-Type': 'application/pkix-cert',
        'Content-Disposition': 'attachment; filename="Sleeve-Local-CA.cer"',
        'Content-Length': certificate.length,
      })
      response.end(certificate)
    } catch { sendText(response, 404, 'Sleeve certificate not found. Run npm run companion:setup again.') }
    return
  }

  if (!isLoopback(request.socket.remoteAddress)) return sendText(response, 403, 'Open this pairing page on the Mac running Sleeve.')
  if (request.method === 'GET' && url.pathname === '/') {
    response.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'",
    })
    response.end(pairingPage)
    return
  }
  sendText(response, 404, 'Not found')
}

function setCorsHeaders(request, response, origin) {
  if (origin) response.setHeader('Access-Control-Allow-Origin', origin)
  response.setHeader('Vary', 'Origin')
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (request.headers['access-control-request-private-network'] === 'true') {
    response.setHeader('Access-Control-Allow-Private-Network', 'true')
  }
}

function authorized(candidate) {
  if (!candidate) return false
  const expected = Buffer.from(token)
  const actual = Buffer.from(candidate)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

function sendJson(response, status, data) {
  response.statusCode = status
  response.setHeader('Cache-Control', 'no-store')
  if (data !== undefined) {
    response.setHeader('Content-Type', 'application/json; charset=utf-8')
    response.end(JSON.stringify(data))
  } else response.end()
}

function sendText(response, status, message) {
  response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' })
  response.end(message)
}

function writeTrack(response, track) {
  response.write(`event: track\ndata: ${JSON.stringify(track)}\n\n`)
}

function broadcast(track) {
  for (const response of clients) writeTrack(response, track)
}

async function readInitialTrack() {
  try {
    const { stdout } = await execFileAsync(mediaControl, ['get'], { timeout: 5000, maxBuffer: 16 * 1024 * 1024 })
    if (stdout.trim() && stdout.trim() !== 'null') accumulator.ingest(stdout.trim())
  } catch (error) {
    console.error(`Could not read macOS Now Playing: ${commandError(error)}`)
  }
}

function startDetector() {
  void readInitialTrack()
  startMediaStream()
}

function startMediaStream() {
  if (stopping || child) return
  child = spawn(mediaControl, ['stream', '--no-diff', '--debounce=50'], { stdio: ['ignore', 'pipe', 'pipe'] })
  let buffer = ''
  child.stdout.setEncoding('utf8')
  child.stdout.on('data', (chunk) => {
    buffer += chunk
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) if (line.trim()) accumulator.ingest(line)
  })
  child.stderr.setEncoding('utf8')
  child.stderr.on('data', (chunk) => {
    const message = chunk.trim()
    if (message) console.error(`media-control: ${message}`)
  })
  child.on('error', (error) => console.error(`Could not start media-control: ${commandError(error)}`))
  child.on('close', () => {
    child = undefined
    if (!stopping) restartTimer = setTimeout(startDetector, 3000)
  })
}

async function openPairingPageIfNeeded(url) {
  try { await access(pairingMarker); return } catch { /* first pairing */ }
  if (process.platform === 'darwin') execFile('open', [url], () => {})
}

async function rememberPaired() {
  try { await writeFile(pairingMarker, `${new Date().toISOString()}\n`, { mode: 0o600 }) } catch { /* pairing still works without marker */ }
}

function isLoopback(address = '') {
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'
}

function renderPairingPage(svg, pairingUrl, name) {
  const safeUrl = escapeHtml(pairingUrl)
  const safeName = escapeHtml(name)
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pair Sleeve</title><style>
  :root{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#282722;background:#171612}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:32px}.card{width:min(720px,100%);display:grid;grid-template-columns:280px 1fr;gap:38px;align-items:center;padding:42px;background:#eee8dc;box-shadow:0 35px 80px #0008}.qr{padding:14px;background:#eee8dc}.qr svg{display:block;width:100%;height:auto}small{font:600 10px ui-monospace,monospace;letter-spacing:.16em;text-transform:uppercase;color:#a04938}h1{margin:10px 0 12px;font:400 42px/1.02 Georgia,serif}p{margin:0 0 16px;color:#666057;line-height:1.55}ol{padding-left:20px;color:#3f3c35;line-height:1.65}.open{display:inline-block;margin-top:8px;padding:12px 16px;background:#2d2b26;color:#fff;text-decoration:none;font-size:13px}.note{margin-top:18px;font-size:12px;color:#827b70}@media(max-width:650px){.card{grid-template-columns:1fr;padding:28px}.qr{width:min(280px,100%);margin:auto}h1{font-size:34px}}
  </style></head><body><main class="card"><div class="qr">${svg}</div><section><small>Sleeve · ${safeName}</small><h1>Pair your display</h1><p>Scan this code with the iPad camera. Sleeve will save the secure Mac connection automatically—no address or token typing.</p><ol><li>Scan the QR code.</li><li>Follow Sleeve’s one-time certificate instructions on the iPad.</li><li>Return to Sleeve and start music on this Mac.</li></ol><a class="open" href="${safeUrl}">Open Sleeve on this Mac</a><p class="note">This page is visible only on this Mac. The QR contains a private local pairing credential; close it when pairing is complete.</p></section></main></body></html>`
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])
}

function commandError(error) {
  return error?.code === 'ENOENT' ? 'media-control is not installed (run: brew install media-control)' : (error?.message || String(error))
}

function fail(message) {
  console.error(`Sleeve companion: ${message}`)
  process.exit(1)
}

function shutdown() {
  stopping = true
  clearInterval(keepAlive)
  clearTimeout(restartTimer)
  accumulator.stop()
  child?.kill()
  for (const response of clients) response.end()
  pairingServer.close()
  server.close(() => process.exit(0))
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
