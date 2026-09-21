import { useEffect, useRef } from 'react'
import type { NowPlayingState } from '../domain/nowPlaying'

export function ProgressLine({ playback }: { playback: NowPlayingState['playback'] }) {
  const fill = useRef<HTMLElement>(null)
  const duration = playback.durationSeconds
  const position = playback.positionSeconds
  useEffect(() => {
    if (duration === undefined || position === undefined || duration <= 0) return
    let frame = 0
    const update = () => {
      const elapsed = playback.status === 'playing' ? Math.max(0, (Date.now() - playback.measuredAt) / 1000) : 0
      const ratio = Math.min(1, Math.max(0, (position + elapsed) / duration))
      if (fill.current) fill.current.style.transform = `scaleX(${ratio})`
      if (playback.status === 'playing' && ratio < 1) frame = requestAnimationFrame(update)
    }
    update()
    return () => cancelAnimationFrame(frame)
  }, [duration, playback.measuredAt, playback.status, position])
  if (duration === undefined || position === undefined || duration <= 0) return null
  return <div className="progress-line" role="progressbar" aria-label="Playback progress" aria-valuemin={0} aria-valuemax={Math.round(duration)} aria-valuenow={Math.round(position)}><i ref={fill}/></div>
}
