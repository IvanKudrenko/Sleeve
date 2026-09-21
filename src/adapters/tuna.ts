import { makeState, normalizeText } from '../domain/nowPlaying'
import { interval, safeBaseUrl, seconds } from './helpers'
import type { MusicSourceAdapter } from './types'

interface TunaPayload { title?: string; artists?: string | string[]; album?: string; status?: string; duration?: number; progress?: number }

export class TunaAdapter implements MusicSourceAdapter {
  readonly id = 'tuna'
  readonly name = 'Tuna / Windows media session'
  readonly kind = 'local-backend' as const
  constructor(private baseUrl: string, private label: string) {}

  async connect(onState: Parameters<MusicSourceAdapter['connect']>[0], onStatus: Parameters<MusicSourceAdapter['connect']>[1]): Promise<() => void> {
    const base = safeBaseUrl(this.baseUrl)
    return interval(async () => {
      try {
        const response = await fetch(`${base}/`, { headers: { Accept: 'application/json' }, cache: 'no-store' })
        if (!response.ok) throw new Error(`Tuna returned ${response.status}`)
        const item = await response.json() as TunaPayload
        if (!item.title) { onStatus({ health: 'idle', message: 'Tuna connected; nothing is playing', lastSuccessAt: Date.now() }); return }
        const now = Date.now()
        const artist = Array.isArray(item.artists) ? item.artists.join(', ') : normalizeText(item.artists)
        const artwork = `${base}/cover.png?track=${encodeURIComponent(item.title)}`
        onState(makeState({
          track: { title: normalizeText(item.title), artist: artist || 'Unknown artist', album: normalizeText(item.album) || 'Unknown album', identifiers: {} },
          sourceArtwork: { url: artwork, provenance: 'Tuna local web server / Windows media session' },
          displayArtwork: { url: artwork, provenance: 'Tuna local web server / Windows media session' },
          playback: { status: item.status === 'playing' ? 'playing' : 'paused', positionSeconds: seconds(item.progress) === undefined ? undefined : Number(item.progress) / 1000, durationSeconds: seconds(item.duration) === undefined ? undefined : Number(item.duration) / 1000, measuredAt: now },
          source: { id: this.id, name: this.label || this.name, device: new URL(base).hostname },
          capabilities: [],
        }))
        onStatus({ health: 'connected', message: 'Reading Tuna’s web output', lastSuccessAt: now })
      } catch (error) {
        onStatus({ health: 'error', message: error instanceof Error ? error.message : 'Tuna connection failed' })
      }
    }, 1000)
  }
}
