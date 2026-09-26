#!/usr/bin/env node
import { execFile, spawn } from 'node:child_process'
import { timingSafeEqual } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:https'
import { hostname } from 'node:os'
import { promisify } from 'node:util'
import { NowPlayingAccumulator } from './now-playing.mjs'

const execFileAsync = promisify(execFile)
const port = Number(process.env.SLEEVE_PORT || 4743)
const host = process.env.SLEEVE_HOST || '0.0.0.0'
const token = process.env.SLEEVE_TOKEN || ''
const keyPath = process.env.SLEEVE_TLS_KEY || ''
const certPath = process.env.SLEEVE_TLS_CERT || ''
const mediaControl = process.env.SLEEVE_MEDIA_CONTROL || 'media-control'
const deviceName = process.env.SLEEVE_DEVICE_NAME || hostname()
const allowedOrigins = new Set((process.env.SLEEVE_ORIGINS || 'https://ivankudrenko.github.io,http://localhost:5173,http://127.0.0.1:5173').split(',').map((value) => value.trim()).filter(Boolean))

if (token.length < 24) fail('SLEEVE_TOKEN must be at least 24 characters. Generate one with: openssl rand -hex 24')
if (!keyPath || !certPath) fail('Set SLEEVE_TLS_KEY and SLEEVE_TLS_CERT to a certificate trusted by the iPad.')
if (!Number.isInteger(port) || port < 1 || port > 65535) fail('SLEEVE_PORT must be a valid TCP port.')

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
const server = createServer({ key, cert }, handleRequest)

server.listen(port, host, () => {
  console.log(`Sleeve companion listening securely on https://${deviceName}:${port}`)
  console.log(`Allowed browser origins: ${[...allowedOrigins].join(', ')}`)
  void readInitialTrack()
  startMediaStream()
})

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

function startMediaStream() {
  if (stopping || child) return
  child = spawn(mediaControl, ['stream'], { stdio: ['ignore', 'pipe', 'pipe'] })
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
    if (!stopping) restartTimer = setTimeout(startMediaStream, 3000)
  })
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
  server.close(() => process.exit(0))
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
