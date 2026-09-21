import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { NowPlayingState } from '../domain/nowPlaying'

export function CassettePlayer({ state }: { state: NowPlayingState }) {
  const reduced = useReducedMotion()
  const playing = state.playback.status === 'playing'
  return <div className="deck-wrap">
    <div className="cassette-deck">
      <div className="deck-brand"><span>SLEEVE</span><small>STEREO CASSETTE DECK · SD—01</small></div>
      <div className="cassette-window">
        <AnimatePresence mode="wait">
          <motion.div className="cassette" key={state.id} initial={reduced ? false : { y: -90, opacity: 0, rotateX: 18 }} animate={{ y: 0, opacity: 1, rotateX: 0 }} exit={reduced ? undefined : { y: 80, opacity: 0 }} transition={{ type: 'spring', damping: 22, stiffness: 150 }}>
            <div className="cassette-screws"><i/><i/><i/><i/></div>
            <div className="paper-label">
              <span className="label-number">SIDE A</span>
              <strong>{state.track.album}</strong>
              <em>{state.track.artist}</em>
            </div>
            <div className="tape-window">
              <div className={`reel left ${playing ? 'spinning' : ''}`}><span/><i/><i/><i/><i/><i/><i/></div>
              <div className="tape-band" />
              <div className={`reel right ${playing ? 'spinning' : ''}`}><span/><i/><i/><i/><i/><i/><i/></div>
            </div>
            <div className="cassette-bottom"><i/><i/></div>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="vu-row"><div className="vu-meter"><span>L</span><i className={playing ? 'active' : ''}/></div><div className="vu-meter"><span>R</span><i className={playing ? 'active delay' : ''}/></div></div>
      <div className="deck-buttons"><button aria-label="Rewind" disabled>◀◀</button><button className={playing ? 'pressed' : ''} aria-label="Play status" disabled>▶</button><button aria-label="Fast forward" disabled>▶▶</button><button aria-label="Stop status" disabled>■</button><button aria-label="Record" disabled><b /></button></div>
    </div>
  </div>
}
