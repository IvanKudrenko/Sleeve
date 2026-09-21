import type { AdapterStatus } from '../adapters/types'
import type { NowPlayingState } from '../domain/nowPlaying'
import type { SleeveSettings } from '../store/persistence'
import { CloseIcon } from './icons'

const sourceInfo = [
  { id: 'demo', title: 'Sleeve demo', type: 'No sign-in', note: 'Three original sample sleeves. Runs entirely in this browser.' },
  { id: 'lastfm', title: 'Last.fm', type: 'Official API', note: 'Reads the latest scrobble. Playback position and controls are not available.' },
  { id: 'orpheus', title: 'Orpheus', type: 'Local backend', note: 'System media sessions on macOS and Linux; Windows support is experimental upstream.' },
  { id: 'media-display', title: 'Media Display', type: 'Local backend', note: 'Reuses its selected network source through the documented health API.' },
  { id: 'tuna', title: 'Tuna', type: 'Windows + OBS', note: 'Reads Windows media sessions through Tuna’s local web server.' },
]

export function SettingsPanel({ settings, state, statuses, onChange, onClose, onArtwork }: { settings: SleeveSettings; state?: NowPlayingState; statuses: Record<string, AdapterStatus>; onChange: (settings: SleeveSettings, reconnect?: boolean) => void; onClose: () => void; onArtwork: () => void }) {
  const update = <K extends keyof SleeveSettings>(key: K, value: SleeveSettings[K]) => onChange({ ...settings, [key]: value })
  const updateSource = (patch: Partial<SleeveSettings['source']>, reconnect = false) => onChange({ ...settings, source: { ...settings.source, ...patch } }, reconnect)
  return <aside className="settings-panel" aria-label="Sleeve settings">
    <header><div><span className="eyebrow">Sleeve</span><h2>Display settings</h2></div><button className="icon-button" onClick={onClose} aria-label="Close settings"><CloseIcon/></button></header>
    <div className="settings-scroll">
      <section><h3>Appearance</h3>
        <div className="segmented" aria-label="Display mode">{(['artwork','vinyl','cassette','coverflow'] as const).map((mode) => <button key={mode} className={settings.mode === mode ? 'active' : ''} onClick={() => update('mode', mode)}>{mode === 'coverflow' ? 'Flow' : mode}</button>)}</div>
        <label className="switch-row"><span><strong>Show track details</strong><small>Hide for a gallery-like display</small></span><input type="checkbox" checked={settings.metadataVisible} onChange={(e) => update('metadataVisible', e.target.checked)}/><i/></label>
        <label className="switch-row"><span><strong>Ambient backdrop</strong><small>A softened copy of the current artwork</small></span><input type="checkbox" checked={settings.subtleBackground} onChange={(e) => update('subtleBackground', e.target.checked)}/><i/></label>
        <label className="switch-row"><span><strong>Reduce motion</strong><small>Also follows the device preference</small></span><input type="checkbox" checked={settings.reducedMotion} onChange={(e) => update('reducedMotion', e.target.checked)}/><i/></label>
      </section>
      <section><h3>When playback stops</h3><select value={settings.idleBehavior} onChange={(event) => update('idleBehavior', event.target.value as SleeveSettings['idleBehavior'])}><option value="keep">Keep the final album</option><option value="recent">Show recent albums</option><option value="pinned">Keep a selected album</option><option value="subdued">Dim the final album</option></select></section>
      <section><div className="section-title"><h3>Artwork</h3>{state && <button className="text-button" onClick={onArtwork}>Choose cover</button>}</div><p className="section-copy">Source artwork stays intact. A chosen release or upload is stored separately for this album.</p>{state?.displayArtwork && <div className="mini-art"><img src={state.displayArtwork.url} alt=""/><div><strong>{state.track.album}</strong><small>{state.displayArtwork.provenance}</small></div></div>}</section>
      <section><h3>Music source</h3><div className="source-list">
        {sourceInfo.map((source) => { const status = statuses[source.id]; return <button key={source.id} className={`source-card ${settings.source.preferredSource === source.id ? 'selected' : ''}`} onClick={() => updateSource({ preferredSource: source.id }, true)}><i className={status?.health || 'idle'}/><span><strong>{source.title}<em>{source.type}</em></strong><small>{source.note}</small>{status && <small className="source-status">{status.message}</small>}</span></button> })}
      </div></section>
      {settings.source.preferredSource === 'lastfm' && <section className="source-config"><h3>Last.fm connection</h3><label>Username<input value={settings.source.lastfm.username} onChange={(event) => updateSource({ lastfm: { ...settings.source.lastfm, username: event.target.value } })}/></label><label>Personal API key<input type="password" value={settings.source.lastfm.apiKey} onChange={(event) => updateSource({ lastfm: { ...settings.source.lastfm, apiKey: event.target.value } })}/></label><button className="primary-action" onClick={() => onChange(settings, true)}>Connect Last.fm</button><p>Stored only in this browser and sent directly to Last.fm. Sleeve ships no developer secret.</p></section>}
      {settings.source.preferredSource === 'orpheus' && <EndpointConfig label="Orpheus address" value={settings.source.orpheus.baseUrl} onValue={(baseUrl) => updateSource({ orpheus: { baseUrl } })} onConnect={() => onChange(settings, true)}/>}
      {settings.source.preferredSource === 'media-display' && <EndpointConfig label="Media Display address" value={settings.source.mediaDisplay.baseUrl} onValue={(baseUrl) => updateSource({ mediaDisplay: { baseUrl } })} onConnect={() => onChange(settings, true)}/>}
      {settings.source.preferredSource === 'tuna' && <section className="source-config"><h3>Tuna connection</h3><label>Web server address<input value={settings.source.tuna.baseUrl} onChange={(event) => updateSource({ tuna: { ...settings.source.tuna, baseUrl: event.target.value } })}/></label><label>Source label<input value={settings.source.tuna.sourceLabel} onChange={(event) => updateSource({ tuna: { ...settings.source.tuna, sourceLabel: event.target.value } })}/></label><button className="primary-action" onClick={() => onChange(settings, true)}>Connect</button><p>Tuna must be running on the Windows playback device with its web output enabled.</p></section>}
      <section className="honesty"><h3>What Sleeve can hear</h3><p>A browser cannot inspect every app on an iPhone, iPad, Android device, Mac, or PC. Sleeve sees only the service or local backend you connect. Audio always stays on the original player.</p><p>Sleeve cannot override the display device’s screen-lock or power settings.</p></section>
    </div>
  </aside>
}

function EndpointConfig({ label, value, onValue, onConnect }: { label: string; value: string; onValue: (value: string) => void; onConnect: () => void }) {
  return <section className="source-config"><h3>Local backend</h3><label>{label}<input value={value} onChange={(event) => onValue(event.target.value)}/></label><button className="primary-action" onClick={onConnect}>Connect</button><p>Use the LAN address of the computer running the backend when this display is on another device.</p></section>
}
