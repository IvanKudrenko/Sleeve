import { albumKey, type ArtworkReference, type NowPlayingState } from '../domain/nowPlaying'
import type { SourceConfig } from '../adapters/types'

export type DisplayMode = 'artwork' | 'vinyl' | 'cassette' | 'coverflow'
export type IdleBehavior = 'keep' | 'recent' | 'pinned' | 'subdued'

export interface SleeveSettings {
  mode: DisplayMode
  metadataVisible: boolean
  controlsVisible: boolean
  subtleBackground: boolean
  idleBehavior: IdleBehavior
  reducedMotion: boolean
  pinnedArtwork?: ArtworkReference
  source: SourceConfig
}

const settingsKey = 'sleeve.settings.v1'
const stateKey = 'sleeve.last-state.v1'
const historyKey = 'sleeve.history.v1'
const overridesKey = 'sleeve.artwork-overrides.v1'

export const defaultSettings: SleeveSettings = {
  mode: 'vinyl',
  metadataVisible: true,
  controlsVisible: true,
  subtleBackground: true,
  idleBehavior: 'keep',
  reducedMotion: false,
  source: {
    preferredSource: 'demo',
    lastfm: { username: '', apiKey: '', pollSeconds: 15 },
    orpheus: { baseUrl: 'http://localhost:4242' },
    mediaDisplay: { baseUrl: 'http://localhost:8090' },
    tuna: { baseUrl: 'http://localhost:1608', sourceLabel: 'Windows media' },
  },
}

function parse<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || '') as T } catch { return fallback }
}

export function loadSettings(): SleeveSettings {
  const saved = parse<Partial<SleeveSettings>>(settingsKey, {})
  return { ...defaultSettings, ...saved, source: { ...defaultSettings.source, ...saved.source, lastfm: { ...defaultSettings.source.lastfm, ...saved.source?.lastfm }, orpheus: { ...defaultSettings.source.orpheus, ...saved.source?.orpheus }, mediaDisplay: { ...defaultSettings.source.mediaDisplay, ...saved.source?.mediaDisplay }, tuna: { ...defaultSettings.source.tuna, ...saved.source?.tuna } } }
}

export function saveSettings(value: SleeveSettings): void { localStorage.setItem(settingsKey, JSON.stringify(value)) }
export function loadLastState(): NowPlayingState | undefined { return parse<NowPlayingState | undefined>(stateKey, undefined) }
export function saveLastState(value: NowPlayingState): void { localStorage.setItem(stateKey, JSON.stringify(value)) }
export function loadHistory(): NowPlayingState[] { return parse<NowPlayingState[]>(historyKey, []) }
export function saveToHistory(value: NowPlayingState): NowPlayingState[] {
  const prior = loadHistory().filter((item) => item.id !== value.id)
  const next = [value, ...prior].slice(0, 12)
  localStorage.setItem(historyKey, JSON.stringify(next))
  return next
}

export function loadOverrides(): Record<string, ArtworkReference> { return parse<Record<string, ArtworkReference>>(overridesKey, {}) }
export function saveOverride(state: NowPlayingState, artwork?: ArtworkReference): void {
  const overrides = loadOverrides()
  const key = albumKey(state.track)
  if (artwork) overrides[key] = artwork
  else delete overrides[key]
  localStorage.setItem(overridesKey, JSON.stringify(overrides))
}
export function applyOverride(state: NowPlayingState): NowPlayingState {
  const artwork = loadOverrides()[albumKey(state.track)]
  return artwork ? { ...state, displayArtwork: artwork } : state
}
