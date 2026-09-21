import { makeState, normalizeText } from '../domain/nowPlaying'
import { interval } from './helpers'
import type { MusicSourceAdapter, SourceConfig } from './types'

interface LastFmTrack {
  name?: string
  artist?: { '#text'?: string; mbid?: string }
  album?: { '#text'?: string; mbid?: string }
  image?: Array<{ '#text'?: string; size?: string }>
  mbid?: string
  '@attr'?: { nowplaying?: string }
  date?: { uts?: string }
}

export class LastFmAdapter implements MusicSourceAdapter {
  readonly id = 'lastfm'
  readonly name = 'Last.fm'
  readonly kind = 'service' as const
  constructor(private config: SourceConfig['lastfm']) {}

  async connect(onState: Parameters<MusicSourceAdapter['connect']>[0], onStatus: Parameters<MusicSourceAdapter['connect']>[1]): Promise<() => void> {
    if (!this.config.username || !this.config.apiKey) throw new Error('Last.fm username and API key are required')
    onStatus({ health: 'connecting', message: 'Contacting Last.fm…' })
    return interval(async () => {
      try {
        const params = new URLSearchParams({ method: 'user.getrecenttracks', user: this.config.username, api_key: this.config.apiKey, format: 'json', limit: '1', extended: '1' })
        const response = await fetch(`https://ws.audioscrobbler.com/2.0/?${params}`)
        if (!response.ok) throw new Error(`Last.fm returned ${response.status}`)
        const json = await response.json() as { recenttracks?: { track?: LastFmTrack[] }; error?: number; message?: string }
        if (json.error) throw new Error(json.message || `Last.fm error ${json.error}`)
        const item = json.recenttracks?.track?.[0]
        if (!item?.name) {
          onStatus({ health: 'idle', message: 'No recent tracks were returned' })
          return
        }
        const art = [...(item.image ?? [])].reverse().find((image) => image['#text'])?.['#text']
        const now = item['@attr']?.nowplaying === 'true'
        const observedAt = Date.now()
        onState(makeState({
          track: {
            title: normalizeText(item.name),
            artist: normalizeText(item.artist?.['#text']) || 'Unknown artist',
            album: normalizeText(item.album?.['#text']) || 'Unknown album',
            identifiers: Object.fromEntries(Object.entries({ trackMbid: item.mbid, artistMbid: item.artist?.mbid, albumMbid: item.album?.mbid }).filter((entry): entry is [string, string] => Boolean(entry[1]))),
          },
          sourceArtwork: art ? { url: art, provenance: 'Last.fm recent tracks API', providerUrl: 'https://www.last.fm/api/show/user.getRecentTracks' } : undefined,
          displayArtwork: art ? { url: art, provenance: 'Last.fm recent tracks API', providerUrl: 'https://www.last.fm/api/show/user.getRecentTracks' } : undefined,
          playback: { status: now ? 'playing' : 'stopped', measuredAt: observedAt },
          source: { id: this.id, name: this.name, device: `@${this.config.username}` },
          capabilities: [],
        }))
        onStatus({ health: now ? 'connected' : 'idle', message: now ? 'Scrobbling now' : 'Showing last scrobble', lastSuccessAt: observedAt })
      } catch (error) {
        onStatus({ health: 'error', message: error instanceof Error ? error.message : 'Last.fm connection failed' })
      }
    }, Math.max(10, this.config.pollSeconds) * 1000)
  }
}
