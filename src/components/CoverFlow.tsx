import { motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { NowPlayingState } from '../domain/nowPlaying'

export function CoverFlow({ items, onSelect }: { items: NowPlayingState[]; onSelect: (item: NowPlayingState) => void }) {
  const [active, setActive] = useState(0)
  const reduced = useReducedMotion()
  const touchStart = useRef(0)
  const move = useCallback((delta: number) => setActive((value) => Math.max(0, Math.min(items.length - 1, value + delta))), [items.length])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'ArrowRight') move(1); if (event.key === 'ArrowLeft') move(-1); if (event.key === 'Enter' && items[active]) onSelect(items[active]) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, items, move, onSelect])
  if (!items.length) return <div className="empty-flow">Albums will gather here as Sleeve listens.</div>
  return <div className="coverflow" role="listbox" aria-label="Recently displayed albums" tabIndex={0} onTouchStart={(event) => { touchStart.current = event.touches[0].clientX }} onTouchEnd={(event) => { const dx = event.changedTouches[0].clientX - touchStart.current; if (Math.abs(dx) > 38) move(dx < 0 ? 1 : -1) }}>
    <div className="flow-track">
      {items.map((item, index) => {
        const offset = index - active
        const selected = offset === 0
        return <motion.button key={item.id} className={`flow-item ${selected ? 'active' : ''}`} role="option" aria-selected={selected} animate={{ x: offset * (selected ? 0 : 118), rotateY: selected ? 0 : offset < 0 ? 58 : -58, scale: selected ? 1 : .76, z: -Math.abs(offset) * 80, opacity: Math.abs(offset) > 3 ? 0 : 1 }} transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 180, damping: 24 }} style={{ zIndex: 20 - Math.abs(offset) }} onClick={() => selected ? onSelect(item) : setActive(index)}>
          {item.displayArtwork?.url ? <img src={item.displayArtwork.url} alt=""/> : <span>{item.track.album.slice(0, 1)}</span>}
          {selected && <div className="flow-caption"><strong>{item.track.album}</strong><small>{item.track.artist}</small></div>}
        </motion.button>
      })}
    </div>
    <div className="flow-dots">{items.map((_, index) => <button key={index} aria-label={`Show album ${index + 1}`} className={index === active ? 'active' : ''} onClick={() => setActive(index)}/>)}</div>
  </div>
}
