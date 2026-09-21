import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DemoAdapter } from './adapters/demo'
import { LastFmAdapter } from './adapters/lastfm'
import { MediaDisplayAdapter } from './adapters/mediaDisplay'
import { OrpheusAdapter } from './adapters/orpheus'
import { SourceRegistry, type RegistrySnapshot } from './adapters/registry'
import { TunaAdapter } from './adapters/tuna'
import type { MusicSourceAdapter } from './adapters/types'
import { AlbumArtwork } from './components/AlbumArtwork'
import { ArtworkPicker } from './components/ArtworkPicker'
import { CassettePlayer } from './components/CassettePlayer'
import { CoverFlow } from './components/CoverFlow'
import { ExpandIcon, GearIcon, PauseIcon, PlayIcon, SkipIcon } from './components/icons'
import { SettingsPanel } from './components/SettingsPanel'
import { VinylPlayer } from './components/VinylPlayer'
import { ProgressLine } from './components/ProgressLine'
import { applyOverride, defaultSettings, loadHistory, loadLastState, loadSettings, saveLastState, saveOverride, saveSettings, saveToHistory, type SleeveSettings } from './store/persistence'
import type { ArtworkReference, NowPlayingState } from './domain/nowPlaying'

const emptySnapshot: RegistrySnapshot = { selectedSource: 'demo', states: {}, statuses: {} }

function createRegistry(settings: SleeveSettings, demo: DemoAdapter): SourceRegistry {
  const config = settings.source
  const adapters: MusicSourceAdapter[] = [
    demo,
    new LastFmAdapter(config.lastfm),
    new OrpheusAdapter(config.orpheus.baseUrl),
    new MediaDisplayAdapter(config.mediaDisplay.baseUrl),
    new TunaAdapter(config.tuna.baseUrl, config.tuna.sourceLabel),
  ]
  return new SourceRegistry(adapters, config.preferredSource)
}

export default function App() {
  const [settings, setSettings] = useState<SleeveSettings>(() => loadSettings())
  const [snapshot, setSnapshot] = useState<RegistrySnapshot>(emptySnapshot)
  const [persisted, setPersisted] = useState<NowPlayingState | undefined>(() => loadLastState())
  const [history, setHistory] = useState<NowPlayingState[]>(() => loadHistory())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [artworkOpen, setArtworkOpen] = useState(false)
  const [chromeVisible, setChromeVisible] = useState(true)
  const [registryNonce, setRegistryNonce] = useState(0)
  const demo = useRef(new DemoAdapter())
  const systemReduced = useReducedMotion()
  const registry = useMemo(() => createRegistry(settings, demo.current), [registryNonce]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const unsubscribe = registry.subscribe(setSnapshot)
    void registry.start()
    return () => { unsubscribe(); registry.stop() }
  }, [registry])

  useEffect(() => {
    if (snapshot.selectedSource !== settings.source.preferredSource) registry.select(settings.source.preferredSource)
  }, [registry, settings.source.preferredSource, snapshot.selectedSource])

  const liveState = snapshot.states[settings.source.preferredSource]
  useEffect(() => {
    if (!liveState) return
    const enhanced = applyOverride(liveState)
    setPersisted(enhanced); saveLastState(enhanced); setHistory(saveToHistory(enhanced))
  }, [liveState?.id, liveState?.updatedAt])

  const state = liveState ? applyOverride(liveState) : persisted
  const stopped = !liveState || liveState.playback.status === 'stopped'
  const effectiveMode = stopped && settings.idleBehavior === 'recent' ? 'coverflow' : settings.mode
  const reducedMotion = Boolean(systemReduced || settings.reducedMotion)

  useEffect(() => { saveSettings(settings) }, [settings])
  useEffect(() => {
    if (!settings.controlsVisible || settingsOpen) return
    const timer = window.setTimeout(() => setChromeVisible(false), 5000)
    return () => window.clearTimeout(timer)
  }, [settings.controlsVisible, settingsOpen, chromeVisible, state?.id])

  const changeSettings = (next: SleeveSettings, reconnect = false) => {
    setSettings(next); setChromeVisible(true)
    if (reconnect) setRegistryNonce((value) => value + 1)
  }
  const chooseArtwork = (artwork?: ArtworkReference) => {
    if (!state) return
    saveOverride(state, artwork)
    const next = artwork ? { ...state, displayArtwork: artwork } : { ...state, displayArtwork: state.sourceArtwork }
    setPersisted(next); saveLastState(next); setHistory(saveToHistory(next)); setArtworkOpen(false)
  }
  const enterFullscreen = async () => { try { await document.documentElement.requestFullscreen?.() } catch { /* browser denied */ } }
  const chooseRecent = useCallback((item: NowPlayingState) => { setPersisted(item); setSettings((current) => ({ ...current, mode: 'artwork', idleBehavior: 'pinned', pinnedArtwork: item.displayArtwork })) }, [])

  if (!state) return <main className="sleeve-app loading"><div className="brand-mark"><i/><span>SLEEVE</span></div><p>Preparing the display…</p></main>
  const art = settings.idleBehavior === 'pinned' && stopped && settings.pinnedArtwork ? settings.pinnedArtwork.url : state.displayArtwork?.url
  const displayState = art === state.displayArtwork?.url ? state : { ...state, displayArtwork: art ? { url: art, provenance: 'Pinned by user' } : state.displayArtwork }
  return <main className={`sleeve-app mode-${effectiveMode} ${stopped && settings.idleBehavior === 'subdued' ? 'subdued' : ''} ${reducedMotion ? 'reduced' : ''}`} onPointerMove={() => setChromeVisible(true)} onPointerDown={() => setChromeVisible(true)}>
    {settings.subtleBackground && displayState.displayArtwork?.url && <div className="ambient" style={{ backgroundImage: `url(${JSON.stringify(displayState.displayArtwork.url)})` }}/>}<div className="ambient-shade"/>
    <div className="display-content">
      {effectiveMode === 'artwork' && <AlbumArtwork state={displayState} reducedMotion={reducedMotion}/>}
      {effectiveMode === 'vinyl' && <VinylPlayer state={displayState} onSwipe={(direction) => settings.source.preferredSource === 'demo' && demo.current.next(direction)}/>}
      {effectiveMode === 'cassette' && <CassettePlayer state={displayState}/>}
      {effectiveMode === 'coverflow' && <CoverFlow items={history} onSelect={chooseRecent}/>}
    </div>
    <AnimatePresence>{settings.metadataVisible && effectiveMode !== 'coverflow' && <motion.section className="track-meta" key={displayState.id} initial={reducedMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><span className="eyebrow">{displayState.source.name}{stopped ? ' · Last displayed' : ''}</span><h1>{displayState.track.title || 'Untitled track'}</h1><p>{displayState.track.artist || 'Unknown artist'} <i/> {displayState.track.album || 'Unknown album'}</p><ProgressLine playback={displayState.playback}/></motion.section>}</AnimatePresence>
    {settings.controlsVisible && <nav className={`display-chrome ${chromeVisible || settingsOpen ? 'visible' : ''}`} aria-label="Display controls">
      <div className="brand-mark"><i/><span>SLEEVE</span></div>
      <div className="mode-switcher">{(['artwork','vinyl','cassette','coverflow'] as const).map((mode) => <button key={mode} className={effectiveMode === mode ? 'active' : ''} onClick={() => changeSettings({ ...settings, mode })}>{mode === 'coverflow' ? 'Flow' : mode}</button>)}</div>
      <div className="chrome-actions"><button onClick={enterFullscreen} aria-label="Enter full screen"><ExpandIcon/></button><button onClick={() => setSettingsOpen(true)} aria-label="Open settings"><GearIcon/></button></div>
    </nav>}
    {settings.source.preferredSource === 'demo' && chromeVisible && <div className="demo-controls"><button aria-label="Previous demo track" onClick={() => demo.current.next(-1)}><SkipIcon back/></button><button aria-label={displayState.playback.status === 'playing' ? 'Pause demo animation' : 'Play demo animation'} onClick={() => demo.current.toggle()}>{displayState.playback.status === 'playing' ? <PauseIcon/> : <PlayIcon/>}</button><button aria-label="Next demo track" onClick={() => demo.current.next(1)}><SkipIcon/></button></div>}
    {settingsOpen && <><div className="panel-backdrop" onClick={() => setSettingsOpen(false)}/><SettingsPanel settings={settings} state={state} statuses={snapshot.statuses} onChange={changeSettings} onClose={() => setSettingsOpen(false)} onArtwork={() => setArtworkOpen(true)}/></>}
    {artworkOpen && <ArtworkPicker state={state} onChoose={chooseArtwork} onClose={() => setArtworkOpen(false)}/>}
  </main>
}
