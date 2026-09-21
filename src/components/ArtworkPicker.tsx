import { useRef, useState } from 'react'
import type { ArtworkReference, NowPlayingState } from '../domain/nowPlaying'
import { findReleaseArtwork, type ReleaseCandidate } from '../services/musicBrainz'
import { CloseIcon } from './icons'

export function ArtworkPicker({ state, onChoose, onClose }: { state: NowPlayingState; onChoose: (artwork?: ArtworkReference) => void; onClose: () => void }) {
  const [results, setResults] = useState<ReleaseCandidate[]>([])
  const [status, setStatus] = useState('Search MusicBrainz for matching release groups. Sleeve will never choose one automatically.')
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const search = async () => {
    setLoading(true); setStatus('Searching MusicBrainz…')
    try {
      const found = await findReleaseArtwork(state.track.album, state.track.artist)
      setResults(found); setStatus(found.length ? `${found.length} possible releases. Verify the title, artist, and date before choosing.` : 'No matching release groups were found.')
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Artwork search failed') }
    finally { setLoading(false) }
  }
  const upload = (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { setStatus('Choose an image file.'); return }
    if (file.size > 3_500_000) { setStatus('Please choose an image under 3.5 MB so it can be stored on this display.'); return }
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' && onChoose({ url: reader.result, provenance: `User upload: ${file.name}` })
    reader.readAsDataURL(file)
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="artwork-picker" role="dialog" aria-modal="true" aria-labelledby="artwork-heading">
      <header><div><span className="eyebrow">Display artwork</span><h2 id="artwork-heading">Choose this album’s sleeve</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><CloseIcon/></button></header>
      <div className="current-art-row">
        {state.sourceArtwork?.url ? <img src={state.sourceArtwork.url} alt="Source-supplied artwork"/> : <div className="art-placeholder">No art</div>}
        <div><strong>Source artwork</strong><p>{state.sourceArtwork?.provenance || 'The active source did not supply artwork.'}</p><button className="text-button" disabled={!state.sourceArtwork} onClick={() => onChoose(undefined)}>Use source artwork</button></div>
      </div>
      <div className="art-actions">
        <button className="primary-action" disabled={loading} onClick={search}>{loading ? 'Searching…' : 'Find original releases'}</button>
        <button className="secondary-action" onClick={() => fileRef.current?.click()}>Upload your artwork</button>
        <input ref={fileRef} hidden type="file" accept="image/*" onChange={(event) => upload(event.target.files?.[0])}/>
      </div>
      <p className="picker-status">{status}</p>
      <div className="release-grid">
        {results.map((release) => <article key={release.id}>
          <div className="candidate-art"><img src={release.artworkUrl} alt="" onError={(event) => { (event.currentTarget.parentElement as HTMLElement).classList.add('missing') }}/><span>No cover in archive</span></div>
          <div><strong>{release.title}</strong><small>{release.artist}</small><small>{release.firstReleaseDate} · {release.primaryType}</small></div>
          <button onClick={() => onChoose({ url: release.artworkUrl, provenance: 'Cover Art Archive release-group front image', providerUrl: release.releaseUrl })}>Use this cover</button>
        </article>)}
      </div>
      <p className="rights-note">MusicBrainz metadata is CC0; Cover Art Archive images retain their original copyright. Sleeve stores only the selected URL unless you upload a file.</p>
    </section>
  </div>
}
