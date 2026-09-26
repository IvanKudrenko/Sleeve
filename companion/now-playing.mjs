const text = (value) => typeof value === 'string' ? value.trim() : ''
const number = (value) => typeof value === 'number' && Number.isFinite(value) ? value : undefined

export function parseMediaControlMessage(input) {
  const message = typeof input === 'string' ? JSON.parse(input) : input
  if (message === null) return { stopped: true, playing: false }
  if (!message || typeof message !== 'object') return undefined
  const payload = message.payload && typeof message.payload === 'object' ? message.payload : message
  const artworkData = text(payload.artworkData)
  const artworkMimeType = text(payload.artworkMimeType) || 'image/jpeg'
  return {
    title: text(payload.title) || undefined,
    artist: text(payload.artist) || undefined,
    album: text(payload.album) || undefined,
    coverUrl: artworkData ? `data:${artworkMimeType};base64,${artworkData}` : undefined,
    playing: typeof payload.playing === 'boolean' ? payload.playing : undefined,
    duration: number(payload.duration),
    elapsedTime: number(payload.elapsedTime),
    bundleIdentifier: text(payload.bundleIdentifier) || undefined,
    contentItemIdentifier: text(payload.contentItemIdentifier) || undefined,
  }
}

const identity = (track) => track?.contentItemIdentifier || (track?.title && track?.artist ? `${track.title}\u0000${track.artist}` : undefined)
const complete = (track) => Boolean(track?.title && track?.artist && track?.coverUrl)

function mergeDefined(target, update) {
  for (const [key, value] of Object.entries(update)) {
    if (value !== undefined) target[key] = value
  }
  return target
}

export class NowPlayingAccumulator {
  constructor(onTrack, { fallbackDelayMs = 2000 } = {}) {
    this.onTrack = onTrack
    this.fallbackDelayMs = fallbackDelayMs
    this.current = undefined
    this.pending = undefined
    this.pendingTimer = undefined
  }

  ingest(input) {
    let update
    try { update = parseMediaControlMessage(input) } catch { return }
    if (!update) return

    const nextIdentity = identity(update)
    if (!nextIdentity) {
      const target = this.pending || this.current
      if (!target) return
      mergeDefined(target, update)
      if (this.pending && complete(this.pending)) this.publishPending()
      else if (this.current) this.publish(this.current)
      return
    }

    const reference = this.pending || this.current
    if (!reference || identity(reference) !== nextIdentity) {
      this.clearPendingTimer()
      this.pending = { ...update }
      if (complete(this.pending)) this.publishPending()
      else this.pendingTimer = setTimeout(() => this.publishPending(), this.fallbackDelayMs)
      return
    }

    if (this.pending) {
      mergeDefined(this.pending, update)
      if (complete(this.pending)) this.publishPending()
      return
    }

    mergeDefined(this.current, update)
    this.publish(this.current)
  }

  getCurrent() { return this.current ? { ...this.current } : undefined }

  stop() { this.clearPendingTimer() }

  publishPending() {
    if (!this.pending?.title || !this.pending?.artist) return
    this.current = this.pending
    this.pending = undefined
    this.clearPendingTimer()
    this.publish(this.current)
  }

  publish(track) {
    this.onTrack({ ...track, receivedAt: Date.now() })
  }

  clearPendingTimer() {
    if (this.pendingTimer) clearTimeout(this.pendingTimer)
    this.pendingTimer = undefined
  }
}
