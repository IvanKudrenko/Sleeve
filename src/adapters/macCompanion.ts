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
    if (!this.config.token) throw new Error('Pairing token required')
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
    const publish = (item: CompanionTrack) => {
      if (!normalizeText(item?.title) || !normalizeText(item?.artist)) return
      const now = Date.now()
      const artwork = item.coverUrl ? { url: item.coverUrl, provenance: 'macOS Now Playing artwork' } : undefined
      lastState = makeState({
        track: {
          title: normalizeText(item.title),
          artist: normalizeText(item.artist),
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
      onStatus({ health: 'connected', message: item.stopped ? 'Connected · playback stopped' : item.playing ? 'Live from macOS' : 'Connected · paused', lastSuccessAt: now })
    }
    const markDisconnected = () => {
      if (lastState && lastState.playback.status !== 'unknown') {
        lastState = { ...lastState, playback: { status: 'unknown', measuredAt: Date.now() }, updatedAt: Date.now() }
        onState(lastState)
      }
      onStatus({ health: 'error', message: 'Companion unavailable; retrying automatically' })
    }

    onStatus({ health: 'connecting', message: `Connecting securely to ${endpoint.hostname}` })
    try {
      const initial = await fetch(withToken('/api/now-playing'), { cache: 'no-store' })
      if (initial.status !== 204) {
        if (!initial.ok) throw new Error(`Companion returned ${initial.status}`)
        publish(await initial.json() as CompanionTrack)
      }
    } catch (error) {
      onStatus({ health: 'error', message: error instanceof Error ? error.message : 'Companion connection failed' })
    }

    const events = new EventSource(withToken('/api/stream'))
    events.onopen = () => onStatus({ health: 'connected', message: lastState ? 'Connected to Mac' : 'Connected · waiting for music', lastSuccessAt: Date.now() })
    events.addEventListener('track', (event) => {
      try { publish(JSON.parse((event as MessageEvent<string>).data) as CompanionTrack) } catch { /* malformed local update */ }
    })
    events.onerror = markDisconnected
    return () => events.close()
  }
}
