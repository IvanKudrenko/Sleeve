import type { NowPlayingState } from '../domain/nowPlaying'
import type { AdapterStatus, MusicSourceAdapter } from './types'

export interface RegistrySnapshot {
  selectedSource: string
  selected?: NowPlayingState
  states: Record<string, NowPlayingState>
  statuses: Record<string, AdapterStatus>
}

export class SourceRegistry {
  private cleanups = new Map<string, () => void>()
  private states: Record<string, NowPlayingState> = {}
  private statuses: Record<string, AdapterStatus> = {}
  private listeners = new Set<(snapshot: RegistrySnapshot) => void>()
  private generation = 0

  constructor(private adapters: MusicSourceAdapter[], private selectedSource: string) {}

  subscribe(listener: (snapshot: RegistrySnapshot) => void): () => void {
    this.listeners.add(listener)
    listener(this.snapshot())
    return () => this.listeners.delete(listener)
  }

  async start(): Promise<void> {
    const generation = ++this.generation
    await Promise.all(this.adapters.map(async (adapter) => {
      try {
        const cleanup = await adapter.connect(
          (state) => { if (generation !== this.generation) return; this.states = { ...this.states, [adapter.id]: state }; this.notify() },
          (status) => { if (generation !== this.generation) return; this.statuses = { ...this.statuses, [adapter.id]: status }; this.notify() },
        )
        if (generation === this.generation) this.cleanups.set(adapter.id, cleanup)
        else cleanup()
      } catch (error) {
        if (generation !== this.generation) return
        this.statuses = { ...this.statuses, [adapter.id]: { health: 'error', message: error instanceof Error ? error.message : 'Connection failed' } }
        this.notify()
      }
    }))
  }

  select(id: string): void { this.selectedSource = id; this.notify() }
  stop(): void { this.generation++; this.cleanups.forEach((cleanup) => cleanup()); this.cleanups.clear() }

  private snapshot(): RegistrySnapshot {
    return { selectedSource: this.selectedSource, selected: this.states[this.selectedSource], states: this.states, statuses: this.statuses }
  }
  private notify(): void { const snapshot = this.snapshot(); this.listeners.forEach((listener) => listener(snapshot)) }
}
