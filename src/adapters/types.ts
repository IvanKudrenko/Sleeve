import type { NowPlayingState } from '../domain/nowPlaying'

export type AdapterHealth = 'idle' | 'connecting' | 'connected' | 'error'

export interface AdapterStatus {
  health: AdapterHealth
  message: string
  lastSuccessAt?: number
}

export interface MusicSourceAdapter {
  readonly id: string
  readonly name: string
  readonly kind: 'demo' | 'service' | 'local-backend'
  connect(onState: (state: NowPlayingState) => void, onStatus: (status: AdapterStatus) => void): Promise<() => void>
}

export interface SourceConfig {
  preferredSource: string
  lastfm: { username: string; apiKey: string; pollSeconds: number }
  macCompanion: { baseUrl: string; token: string; certificateUrl: string; deviceName: string }
  orpheus: { baseUrl: string }
  mediaDisplay: { baseUrl: string }
  tuna: { baseUrl: string; sourceLabel: string }
}
