import { AnimatePresence, motion } from 'motion/react'
import type { NowPlayingState } from '../domain/nowPlaying'

export function AlbumArtwork({ state, reducedMotion }: { state: NowPlayingState; reducedMotion: boolean }) {
  const art = state.displayArtwork?.url
  return <div className="artwork-stage">
    <AnimatePresence mode="wait">
      <motion.div className="album-frame" key={art || state.id} initial={reducedMotion ? false : { opacity: 0, scale: .965 }} animate={{ opacity: 1, scale: 1 }} exit={reducedMotion ? undefined : { opacity: 0, scale: 1.02 }} transition={{ duration: .65, ease: [.22, 1, .36, 1] }}>
        {art ? <img src={art} alt={`${state.track.album} album artwork`} /> : <div className="missing-art"><span>{state.track.album.slice(0, 1) || 'S'}</span><small>Artwork unavailable</small></div>}
      </motion.div>
    </AnimatePresence>
  </div>
}
