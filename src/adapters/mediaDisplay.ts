import { makeState, normalizeText } from '../domain/nowPlaying'
import { interval, safeBaseUrl } from './helpers'
import type { MusicSourceAdapter } from './types'

interface MediaDisplayHealth { now_playing?: null | { source?: string; media_type?: string; title?: string; subtitle?: string; images?: string[] } }

export class MediaDisplayAdapter implements MusicSourceAdapter {
  readonly id = 'media-display'
  readonly name = 'Media Display'
  readonly kind = 'local-backend' as const
  constructor(private baseUrl: string) {}

  async connect(onState: Parameters<MusicSourceAdapter['connect']>[0], onStatus: Parameters<MusicSourceAdapter['connect']>[1]): Promise<() => void> {
    const base = safeBaseUrl(this.baseUrl)
    onStatus({ health: 'connecting', message: `Polling ${base}/health` })
    return interval(async () => {
      try {
        const response = await fetch(`${base}/health`, { headers: { Accept: 'application/json' }, cache: 'no-store' })
        if (!response.ok) throw new Error(`Media Display returned ${response.status}`)
        const item = (await response.json() as MediaDisplayHealth).now_playing
        if (!item?.title) { onStatus({ health: 'idle', message: 'Backend connected; nothing is playing', lastSuccessAt: Date.now() }); return }
        const rawArt = item.images?.[0]
        const art = rawArt ? new URL(rawArt, `${base}/`).toString() : undefined
        const now = Date.now()
        onState(makeState({
          track: { title: normalizeText(item.title), artist: normalizeText(item.subtitle) || 'Unknown artist', album: '', identifiers: {} },
          sourceArtwork: art ? { url: art, provenance: `Media Display (${item.source || 'unknown source'})` } : undefined,
          displayArtwork: art ? { url: art, provenance: `Media Display (${item.source || 'unknown source'})` } : undefined,
          playback: { status: 'playing', measuredAt: now },
          source: { id: this.id, name: this.name, device: item.source || new URL(base).hostname },
          capabilities: [],
        }))
        onStatus({ health: 'connected', message: 'Using Media Display’s selected source', lastSuccessAt: now })
      } catch (error) {
        onStatus({ health: 'error', message: error instanceof Error ? error.message : 'Media Display connection failed' })
      }
    }, 3000)
  }
}
