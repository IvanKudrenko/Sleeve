import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { NowPlayingState } from '../domain/nowPlaying'

export function VinylPlayer({ state, onSwipe }: { state: NowPlayingState; onSwipe?: (direction: 1 | -1) => void }) {
  const prefersReduced = useReducedMotion()
  const playing = state.playback.status === 'playing'
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useSpring(useTransform(y, [-180, 180], [8, -8]), { stiffness: 170, damping: 18 })
  const rotateY = useSpring(useTransform(x, [-180, 180], [-9, 9]), { stiffness: 170, damping: 18 })
  const [rotation, setRotation] = useState(0)
  const frame = useRef(0)
  const prior = useRef(performance.now())

  useEffect(() => {
    const tick = (now: number) => {
      const delta = Math.min(40, now - prior.current)
      prior.current = now
      if (playing && !prefersReduced) setRotation((value) => (value + delta * .018) % 360)
      frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
  }, [playing, prefersReduced])

  return <div className="turntable-wrap">
    <div className="turntable" aria-label="Interactive turntable">
      <div className="turntable-inset" />
      <motion.div className="platter" drag dragElastic={.12} dragConstraints={{ left: -18, right: 18, top: -18, bottom: 18 }} style={{ x, y, rotateX, rotateY, transformPerspective: 900 }} onDragEnd={(_, info) => { if (Math.abs(info.offset.x) > 85 && onSwipe) onSwipe(info.offset.x < 0 ? 1 : -1) }}>
        <div className="platter-rim" />
        <div className="record" style={{ transform: `rotate(${rotation}deg)` }}>
          <div className="record-specular" />
          <div className="record-label" style={{ backgroundImage: state.displayArtwork?.url ? `url(${JSON.stringify(state.displayArtwork.url)})` : undefined }}><i /></div>
        </div>
      </motion.div>
      <motion.div className="tonearm" animate={{ rotate: playing ? 12 : 0 }} transition={{ type: 'spring', stiffness: 48, damping: 13 }}><span className="tonearm-counter"/><span className="tonearm-shaft"/><span className="tonearm-head"/></motion.div>
      <div className={`power-lamp ${playing ? 'on' : ''}`}><i /></div>
      <div className="speed-badge"><strong>33</strong><span>⅓ RPM</span></div>
    </div>
  </div>
}
