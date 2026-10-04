import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DemoAdapter } from './adapters/demo'
import { LastFmAdapter } from './adapters/lastfm'
import { MacCompanionAdapter } from './adapters/macCompanion'
import { MediaDisplayAdapter } from './adapters/mediaDisplay'
import { OrpheusAdapter } from './adapters/orpheus'
import { SourceRegistry, type RegistrySnapshot } from './adapters/registry'
import { TunaAdapter } from './adapters/tuna'
import type { MusicSourceAdapter } from './adapters/types'
import { AlbumArtwork } from './components/AlbumArtwork'
import { ArtworkPicker } from './components/ArtworkPicker'
import { CassettePlayer } from './components/CassettePlayer'
import { ConnectNowPlaying } from './components/ConnectNowPlaying'
import { CoverFlow } from './components/CoverFlow'
import { ExpandIcon, GearIcon, PauseIcon, PlayIcon, SkipIcon } from './components/icons'
import { SettingsPanel } from './components/SettingsPanel'
import { VinylPlayer } from './components/VinylPlayer'
import { ProgressLine } from './components/ProgressLine'
import { PairingGuide } from './components/PairingGuide'
import { applyOverride, loadHistory, loadLastState, loadSettings, saveLastState, saveOverride, saveSettings, saveToHistory, type SleeveSettings } from './store/persistence'
import type { ArtworkReference, NowPlayingState } from './domain/nowPlaying'
import { applyPairing, parsePairingHash, type PairingDetails } from './pairing'

const emptySnapshot: RegistrySnapshot = { selectedSource: 'mac-companion', states: {}, statuses: {} }

interface BootstrapState { settings: SleeveSettings; persisted?: NowPlayingState; history: NowPlayingState[]; pairing?: PairingDetails }

function bootstrap(): BootstrapState {
  let settings = loadSettings()
  const pairing = parsePairingHash(window.location.hash)
  if (pairing) {
    settings = applyPairing(settings, pairing)
    saveSettings(settings)
    clearPairingHash()
  }
  const saved = loadLastState()
  const persisted = saved && (settings.source.preferredSource === 'demo' || saved.source.id === settings.source.preferredSource) ? saved : undefined
  const history = loadHistory().filter((item) => settings.source.preferredSource === 'demo' || item.source.id !== 'demo')
  return { settings, persisted, history, pairing }
}

function clearPairingHash(): void {
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
}

function createRegistry(settings: SleeveSettings, demo: DemoAdapter): SourceRegistry {
  const config = settings.source
  const adapters: MusicSourceAdapter[] = [
    demo,
  ]
  if (config.preferredSource === 'lastfm' || (config.lastfm.username && config.lastfm.apiKey)) adapters.push(new LastFmAdapter(config.lastfm))
  if (config.preferredSource === 'mac-companion' || config.macCompanion.token) adapters.push(new MacCompanionAdapter(config.macCompanion))
  if (config.preferredSource === 'orpheus') adapters.push(new OrpheusAdapter(config.orpheus.baseUrl))
  if (config.preferredSource === 'media-display') adapters.push(new MediaDisplayAdapter(config.mediaDisplay.baseUrl))
  if (config.preferredSource === 'tuna') adapters.push(new TunaAdapter(config.tuna.baseUrl, config.tuna.sourceLabel))
  return new SourceRegistry(adapters, config.preferredSource)
}

export default function App() {
  const initial = useRef<BootstrapState | undefined>(undefined)
  if (!initial.current) initial.current = bootstrap()
  const [settings, setSettings] = useState<SleeveSettings>(initial.current.settings)
  const [snapshot, setSnapshot] = useState<RegistrySnapshot>(emptySnapshot)
  const [persisted, setPersisted] = useState<NowPlayingState | undefined>(initial.current.persisted)
  const [history, setHistory] = useState<NowPlayingState[]>(initial.current.history)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [artworkOpen, setArtworkOpen] = useState(false)
  const [pairingOpen, setPairingOpen] = useState(Boolean(initial.current.pairing))
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
    const receivePairing = () => {
      const pairing = parsePairingHash(window.location.hash)
      if (!pairing) return
      setSettings((current) => {
        const next = applyPairing(current, pairing)
        saveSettings(next)
        return next
      })
      setPersisted((current) => current?.source.id === 'demo' ? undefined : current)
      setHistory((current) => current.filter((item) => item.source.id !== 'demo'))
      setSettingsOpen(false)
      setPairingOpen(true)
      clearPairingHash()
      setRegistryNonce((value) => value + 1)
    }
    window.addEventListener('hashchange', receivePairing)
    return () => window.removeEventListener('hashchange', receivePairing)
  }, [])

  useEffect(() => {
    if (snapshot.selectedSource !== settings.source.preferredSource) registry.select(settings.source.preferredSource)
  }, [registry, settings.source.preferredSource, snapshot.selectedSource])

  const liveState = snapshot.states[settings.source.preferredSource]
  useEffect(() => {
    if (!liveState) return
    const enhanced = applyOverride(liveState)
    setPersisted(enhanced); saveLastState(enhanced); setHistory(saveToHistory(enhanced))
  }, [liveState?.id, liveState?.updatedAt])

  const state = liveState ? applyOverride(liveState) : persisted?.source.id === settings.source.preferredSource ? persisted : undefined
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
  const openMacSettings = () => {
    if (settings.source.preferredSource !== 'mac-companion') changeSettings({ ...settings, source: { ...settings.source, preferredSource: 'mac-companion' } }, true)
    setSettingsOpen(true)
  }
  const showPairing = () => { setSettingsOpen(false); setPairingOpen(true) }
  const pairingStatus = snapshot.statuses['mac-companion']
  const paired = Boolean(settings.source.macCompanion.token)
  const displayHistory = settings.source.preferredSource === 'demo' ? history : history.filter((item) => item.source.id !== 'demo')

  if (!state) return <>
    <ConnectNowPlaying paired={paired} status={pairingStatus} onConnect={openMacSettings} onDemo={() => changeSettings({ ...settings, source: { ...settings.source, preferredSource: 'demo' } }, true)}/>
    {settingsOpen && <><div className="panel-backdrop" onClick={() => setSettingsOpen(false)}/><SettingsPanel settings={settings} statuses={snapshot.statuses} onChange={changeSettings} onClose={() => setSettingsOpen(false)} onArtwork={() => {}} onShowPairing={showPairing}/></>}
    {pairingOpen && <PairingGuide config={settings.source.macCompanion} status={pairingStatus} onRetry={() => setRegistryNonce((value) => value + 1)} onClose={() => setPairingOpen(false)}/>}
  </>
  const art = settings.idleBehavior === 'pinned' && stopped && settings.pinnedArtwork ? settings.pinnedArtwork.url : state.displayArtwork?.url
  const displayState = art === state.displayArtwork?.url ? state : { ...state, displayArtwork: art ? { url: art, provenance: 'Pinned by user' } : state.displayArtwork }
  return <main className={`sleeve-app mode-${effectiveMode} ${stopped && settings.idleBehavior === 'subdued' ? 'subdued' : ''} ${reducedMotion ? 'reduced' : ''}`} onPointerMove={() => setChromeVisible(true)} onPointerDown={() => setChromeVisible(true)}>
    {settings.subtleBackground && displayState.displayArtwork?.url && <div className="ambient" style={{ backgroundImage: `url(${JSON.stringify(displayState.displayArtwork.url)})` }}/>}<div className="ambient-shade"/>
    <div className="display-content">
      {effectiveMode === 'artwork' && <AlbumArtwork state={displayState} reducedMotion={reducedMotion}/>}
      {effectiveMode === 'vinyl' && <VinylPlayer state={displayState} onSwipe={settings.source.preferredSource === 'demo' ? (direction) => demo.current.next(direction) : undefined}/>}
      {effectiveMode === 'cassette' && <CassettePlayer state={displayState}/>}
      {effectiveMode === 'coverflow' && <CoverFlow items={displayHistory} onSelect={chooseRecent}/>}
    </div>
    <AnimatePresence>{settings.metadataVisible && effectiveMode !== 'coverflow' && <motion.section className="track-meta" key={displayState.id} initial={reducedMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><span className="eyebrow">{displayState.source.name}{stopped ? ' · Last displayed' : ''}</span><h1>{displayState.track.title || 'Untitled track'}</h1><p>{displayState.track.artist || 'Unknown artist'} <i/> {displayState.track.album || 'Unknown album'}</p><ProgressLine playback={displayState.playback}/></motion.section>}</AnimatePresence>
    {settings.controlsVisible && <nav className={`display-chrome ${chromeVisible || settingsOpen ? 'visible' : ''}`} aria-label="Display controls">
      <div className="brand-mark"><i/><span>SLEEVE</span></div>
      <div className="mode-switcher">{(['artwork','vinyl','cassette','coverflow'] as const).map((mode) => <button key={mode} className={effectiveMode === mode ? 'active' : ''} onClick={() => changeSettings({ ...settings, mode })}>{mode === 'coverflow' ? 'Flow' : mode}</button>)}</div>
      <div className="chrome-actions"><button onClick={enterFullscreen} aria-label="Enter full screen"><ExpandIcon/></button><button onClick={() => setSettingsOpen(true)} aria-label="Open settings"><GearIcon/></button></div>
    </nav>}
    {settings.source.preferredSource === 'demo' && chromeVisible && <div className="demo-controls"><button aria-label="Previous demo track" onClick={() => demo.current.next(-1)}><SkipIcon back/></button><button aria-label={displayState.playback.status === 'playing' ? 'Pause demo animation' : 'Play demo animation'} onClick={() => demo.current.toggle()}>{displayState.playback.status === 'playing' ? <PauseIcon/> : <PlayIcon/>}</button><button aria-label="Next demo track" onClick={() => demo.current.next(1)}><SkipIcon/></button></div>}
    {settingsOpen && <><div className="panel-backdrop" onClick={() => setSettingsOpen(false)}/><SettingsPanel settings={settings} state={state} statuses={snapshot.statuses} onChange={changeSettings} onClose={() => setSettingsOpen(false)} onArtwork={() => setArtworkOpen(true)} onShowPairing={showPairing}/></>}
    {artworkOpen && <ArtworkPicker state={state} onChoose={chooseArtwork} onClose={() => setArtworkOpen(false)}/>}
    {pairingOpen && <PairingGuide config={settings.source.macCompanion} status={pairingStatus} onRetry={() => setRegistryNonce((value) => value + 1)} onClose={() => setPairingOpen(false)}/>}
  </main>
}
