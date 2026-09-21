import { makeState, type NowPlayingState } from '../domain/nowPlaying'
import type { AdapterStatus, MusicSourceAdapter } from './types'

const demoAsset = (file: string) => `${import.meta.env.BASE_URL}demo/${file}`

const demoTracks = [
  { title: 'Familiar Weather', artist: 'Mara Vale', album: 'Quiet Light', art: demoAsset('quiet-light.svg'), duration: 247 },
  { title: 'Low Tide Receiver', artist: 'North Window', album: 'Tidal Room', art: demoAsset('tidal-room.svg'), duration: 194 },
  { title: 'Red Thread', artist: 'Common Shapes', album: 'Afterimage', art: demoAsset('afterimage.svg'), duration: 221 },
]

export class DemoAdapter implements MusicSourceAdapter {
  readonly id = 'demo'
  readonly name = 'Sleeve demo'
  readonly kind = 'demo' as const
  private index = 0
  private playing = true
  private position = 52
  private emit?: (state: NowPlayingState) => void

  connect(onState: (state: NowPlayingState) => void, onStatus: (status: AdapterStatus) => void): Promise<() => void> {
    this.emit = onState
    this.publish()
    onStatus({ health: 'connected', message: 'Built-in sample collection', lastSuccessAt: Date.now() })
    return Promise.resolve(() => { if (this.emit === onState) this.emit = undefined })
  }

  next(direction = 1): void {
    this.index = (this.index + direction + demoTracks.length) % demoTracks.length
    this.position = 0
    this.playing = true
    this.publish()
  }

  toggle(): void { this.playing = !this.playing; this.publish() }

  private publish(): void {
    const item = demoTracks[this.index]
    this.emit?.(makeState({
      track: { title: item.title, artist: item.artist, album: item.album, identifiers: {} },
      sourceArtwork: { url: item.art, provenance: 'Original Sleeve demo artwork' },
      displayArtwork: { url: item.art, provenance: 'Original Sleeve demo artwork' },
      playback: { status: this.playing ? 'playing' : 'paused', positionSeconds: this.position, durationSeconds: item.duration, measuredAt: Date.now() },
      source: { id: this.id, name: this.name, device: 'This browser' },
      capabilities: [],
    }))
  }
}
