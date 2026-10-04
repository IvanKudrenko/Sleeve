import type { AdapterStatus } from '../adapters/types'

export function ConnectNowPlaying({ paired, status, onConnect, onDemo }: { paired: boolean; status?: AdapterStatus; onConnect: () => void; onDemo: () => void }) {
  const label = status?.message || (paired ? 'Mac unavailable · retrying' : 'Not paired')
  return <main className="sleeve-app connect-screen">
    <div className="connect-object" aria-hidden="true"><div className="connect-record"><i/></div><div className="connect-sleeve"><span>SLEEVE</span></div></div>
    <section className="connect-copy">
      <div className="brand-mark"><i/><span>SLEEVE</span></div>
      <span className={`connection-badge ${status?.health || 'idle'}`}><i/>{label}</span>
      <h1>{paired ? 'Waiting for your Mac.' : 'Your music, on display.'}</h1>
      <p>{paired ? 'Sleeve will reconnect automatically. Start the companion on your paired Mac, then play something.' : 'Pair your Mac once to show real music from YouTube Music and other compatible players.'}</p>
      <div className="connect-actions"><button className="primary-action" onClick={onConnect}>{paired ? 'Connection settings' : 'Connect Now Playing'}</button><button className="secondary-action" onClick={onDemo}>Explore the demo</button></div>
    </section>
  </main>
}
