import { makeState, normalizeText } from '../domain/nowPlaying'
import { safeBaseUrl, seconds } from './helpers'
import type { MusicSourceAdapter } from './types'

interface OrpheusTrack { title?: string; artist?: string; album?: string; coverUrl?: string; playing?: boolean; duration?: number; elapsedTime?: number; bundleIdentifier?: string }

export class OrpheusAdapter implements MusicSourceAdapter {
  readonly id = 'orpheus'
  readonly name = 'Orpheus'
  readonly kind = 'local-backend' as const
  constructor(private baseUrl: string) {}

  async connect(onState: Parameters<MusicSourceAdapter['connect']>[0], onStatus: Parameters<MusicSourceAdapter['connect']>[1]): Promise<() => void> {
    const base = safeBaseUrl(this.baseUrl)
    onStatus({ health: 'connecting', message: `Connecting to ${base}` })
    const publish = (item: OrpheusTrack) => {
      if (!item?.title) return
      const now = Date.now()
      onState(makeState({
        track: { title: normalizeText(item.title), artist: normalizeText(item.artist) || 'Unknown artist', album: normalizeText(item.album) || 'Unknown album', identifiers: {} },
        sourceArtwork: item.coverUrl ? { url: item.coverUrl, provenance: 'Orpheus system media session' } : undefined,
        displayArtwork: item.coverUrl ? { url: item.coverUrl, provenance: 'Orpheus system media session' } : undefined,
        playback: { status: item.playing ? 'playing' : 'paused', positionSeconds: seconds(item.elapsedTime), durationSeconds: seconds(item.duration), measuredAt: now },
        source: { id: this.id, name: this.name, device: item.bundleIdentifier || new URL(base).hostname },
        capabilities: [],
      }))
      onStatus({ health: item.playing ? 'connected' : 'idle', message: 'Receiving system media session', lastSuccessAt: now })
    }
    try {
      const initial = await fetch(`${base}/api/now-playing`, { cache: 'no-store' })
      if (!initial.ok) throw new Error(`Orpheus returned ${initial.status}`)
      publish(await initial.json() as OrpheusTrack)
    } catch (error) {
      onStatus({ health: 'error', message: error instanceof Error ? error.message : 'Orpheus connection failed' })
    }
    const events = new EventSource(`${base}/api/stream`)
    events.addEventListener('track', (event) => { try { publish(JSON.parse((event as MessageEvent<string>).data) as OrpheusTrack) } catch { /* malformed upstream update */ } })
    events.onerror = () => onStatus({ health: 'error', message: 'Orpheus stream unavailable; retrying automatically' })
    return () => events.close()
  }
}
