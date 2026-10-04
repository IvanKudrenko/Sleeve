import type { AdapterStatus } from '../adapters/types'
import type { SourceConfig } from '../adapters/types'
import { CloseIcon } from './icons'

export function PairingGuide({ config, status, onRetry, onClose }: { config: SourceConfig['macCompanion']; status?: AdapterStatus; onRetry: () => void; onClose: () => void }) {
  const connected = status?.health === 'connected'
  return <div className="modal-backdrop pairing-backdrop">
    <section className="pairing-guide" role="dialog" aria-modal="true" aria-labelledby="pairing-heading">
      <button className="icon-button pairing-close" onClick={onClose} aria-label="Close pairing guide"><CloseIcon/></button>
      <span className="eyebrow">Mac Now Playing</span>
      <h2 id="pairing-heading">{connected ? `${config.deviceName || 'Mac'} connected.` : 'Finish pairing your iPad.'}</h2>
      {connected ? <><p>Sleeve is receiving your Mac’s Now Playing session. This display will reconnect automatically on future visits.</p><button className="primary-action" onClick={onClose}>Start displaying</button></> : <>
        <p>Your connection details are saved. Install and trust the Mac’s local certificate once so Safari can open the encrypted connection.</p>
        <ol><li>Tap <strong>Install certificate</strong>.</li><li>Open iPad Settings → Profile Downloaded and install it.</li><li>Go to General → About → Certificate Trust Settings and enable full trust for the Sleeve certificate.</li><li>Return here and retry.</li></ol>
        <div className="pairing-actions">{config.certificateUrl && <a className="primary-action" href={config.certificateUrl}>Install certificate</a>}<button className="secondary-action" onClick={onRetry}>Retry connection</button></div>
        <p className="pairing-status"><i className={status?.health || 'idle'}/>{status?.message || 'Waiting for the companion'}</p>
      </>}
    </section>
  </div>
}
