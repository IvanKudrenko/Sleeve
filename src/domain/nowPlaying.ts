export type PlaybackStatus = 'playing' | 'paused' | 'stopped' | 'unknown'
export type ControlCapability = 'play' | 'pause' | 'next' | 'previous' | 'seek'

export interface ArtworkReference {
  url: string
  provenance: string
  providerUrl?: string
  authorizedAnimated?: boolean
}

export interface NowPlayingState {
  id: string
  track: { title: string; artist: string; album: string; identifiers: Record<string, string> }
  sourceArtwork?: ArtworkReference
  displayArtwork?: ArtworkReference
  playback: { status: PlaybackStatus; positionSeconds?: number; durationSeconds?: number; measuredAt: number }
  source: { id: string; name: string; device?: string }
  capabilities: ControlCapability[]
  updatedAt: number
}

export function trackKey(track: NowPlayingState['track']): string {
  return [track.artist, track.album, track.title].map((value) => value.trim().toLowerCase()).join('::')
}

export function albumKey(track: NowPlayingState['track']): string {
  return [track.artist, track.album].map((value) => value.trim().toLowerCase()).join('::')
}

export function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function makeState(input: Omit<NowPlayingState, 'id' | 'updatedAt'> & { updatedAt?: number }): NowPlayingState {
  const updatedAt = input.updatedAt ?? Date.now()
  return { ...input, id: trackKey(input.track), updatedAt }
}
