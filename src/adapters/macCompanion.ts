import { makeState, normalizeText, type NowPlayingState } from '../domain/nowPlaying'
import { safeBaseUrl, seconds } from './helpers'
import type { MusicSourceAdapter, SourceConfig } from './types'

interface CompanionTrack {
  title?: string
  artist?: string
  album?: string
  coverUrl?: string
  playing?: boolean
  duration?: number
  elapsedTime?: number
  bundleIdentifier?: string
  contentItemIdentifier?: string
  deviceName?: string
  receivedAt?: number
  stopped?: boolean
}

export class MacCompanionAdapter implements MusicSourceAdapter {
  readonly id = 'mac-companion'
  readonly name = 'Mac Now Playing'
  readonly kind = 'local-backend' as const

  constructor(private config: SourceConfig['macCompanion']) {}

  async connect(onState: Parameters<MusicSourceAdapter['connect']>[0], onStatus: Parameters<MusicSourceAdapter['connect']>[1]): Promise<() => void> {
    if (!this.config.token) {
      onStatus({ health: 'idle', message: 'Not paired' })
      return () => {}
    }
    const base = safeBaseUrl(this.config.baseUrl)
    const endpoint = new URL(base)
    if (endpoint.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(endpoint.hostname)) {
      throw new Error('The Mac companion requires HTTPS')
    }

    const withToken = (path: string) => {
      const url = new URL(`${base}${path}`)
      url.searchParams.set('token', this.config.token)
      return url.toString()
    }
    let lastState: NowPlayingState | undefined
    let publishGeneration = 0
    const artworkLoads = new Map<string, Promise<void>>()
    const preloadArtwork = (url: string) => {
      const existing = artworkLoads.get(url)
      if (existing) return existing
      const load = new Promise<void>((resolve) => {
        const image = new Image()
        const finish = () => resolve()
        const timeout = window.setTimeout(finish, 1500)
        image.onload = () => { window.clearTimeout(timeout); finish() }
        image.onerror = () => { window.clearTimeout(timeout); finish() }
        image.src = url
      })
      artworkLoads.set(url, load)
      if (artworkLoads.size > 16) artworkLoads.delete(artworkLoads.keys().next().value as string)
      return load
    }
    const publish = (item: CompanionTrack) => {
      if (!normalizeText(item?.title)) return
      const generation = ++publishGeneration
      const commit = () => {
        if (generation !== publishGeneration) return
        const now = Date.now()
        const artwork = item.coverUrl ? { url: item.coverUrl, provenance: 'macOS Now Playing artwork' } : undefined
        lastState = makeState({
          track: {
            title: normalizeText(item.title),
            artist: normalizeText(item.artist) || 'Unknown artist',
            album: normalizeText(item.album) || 'Unknown album',
            identifiers: {
              ...(item.bundleIdentifier ? { macOSBundleIdentifier: item.bundleIdentifier } : {}),
              ...(item.contentItemIdentifier ? { mediaContentItem: item.contentItemIdentifier } : {}),
            },
          },
          sourceArtwork: artwork,
          displayArtwork: artwork,
          playback: {
            status: item.stopped ? 'stopped' : item.playing === true ? 'playing' : item.playing === false ? 'paused' : 'unknown',
            positionSeconds: seconds(item.elapsedTime),
            durationSeconds: seconds(item.duration),
            measuredAt: item.receivedAt || now,
          },
          source: { id: this.id, name: this.name, device: item.deviceName || endpoint.hostname },
          capabilities: [],
        })
        onState(lastState)
        onStatus({ health: 'connected', message: item.stopped ? 'Connected · playback stopped' : item.playing ? 'Connected' : 'Connected · paused', lastSuccessAt: now })
      }
      if (item.coverUrl) void preloadArtwork(item.coverUrl).then(commit)
      else commit()
    }
    const markDisconnected = () => {
      if (lastState && lastState.playback.status !== 'unknown') {
        lastState = { ...lastState, playback: { status: 'unknown', measuredAt: Date.now() }, updatedAt: Date.now() }
        onState(lastState)
      }
      onStatus({ health: 'connecting', message: 'Reconnecting' })
    }

    onStatus({ health: 'connecting', message: 'Connecting' })
    let authenticationFailed = false
    try {
      const initial = await fetch(withToken('/api/now-playing'), { cache: 'no-store' })
      if (initial.status !== 204) {
        if (initial.status === 401) {
          authenticationFailed = true
          onStatus({ health: 'error', message: 'Pairing expired · scan the Mac QR again' })
        } else if (!initial.ok) throw new Error(`Companion returned ${initial.status}`)
        if (authenticationFailed) return () => {}
        publish(await initial.json() as CompanionTrack)
      }
    } catch (error) {
      onStatus({ health: 'connecting', message: 'Mac unavailable · retrying' })
    }

    let disposed = false
    let events: EventSource | undefined
    let retryTimer = 0
    let retryDelay = 1000
    const openStream = () => {
      if (disposed) return
      events = new EventSource(withToken('/api/stream'))
      events.onopen = () => {
        retryDelay = 1000
        onStatus({ health: 'connected', message: lastState ? 'Connected' : 'Waiting for music', lastSuccessAt: Date.now() })
      }
      events.addEventListener('track', (event) => {
        try { publish(JSON.parse((event as MessageEvent<string>).data) as CompanionTrack) } catch { /* malformed local update */ }
      })
      events.onerror = () => {
        events?.close()
        markDisconnected()
        if (disposed) return
        retryTimer = window.setTimeout(openStream, retryDelay)
        retryDelay = Math.min(30_000, retryDelay * 2)
      }
    }
    openStream()
    return () => {
      disposed = true
      publishGeneration++
      window.clearTimeout(retryTimer)
      events?.close()
    }
  }
}
