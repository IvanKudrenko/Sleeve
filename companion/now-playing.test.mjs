import { describe, expect, it, vi } from 'vitest'
import { NowPlayingAccumulator, parseMediaControlMessage } from './now-playing.mjs'

describe('macOS now-playing normalization', () => {
  it('uses the exact artwork supplied by media-control', () => {
    expect(parseMediaControlMessage({ title: 'Track', artist: 'Artist', artworkData: 'YWJj', artworkMimeType: 'image/png' })).toMatchObject({
      title: 'Track', artist: 'Artist', coverUrl: 'data:image/png;base64,YWJj',
    })
  })

  it('accepts browser media sessions that omit artist and album metadata', () => {
    const received = []
    const accumulator = new NowPlayingAccumulator((track) => received.push(track))
    accumulator.ingest({ title: 'Browser video', artworkData: 'YWJj', playing: false })
    expect(received).toHaveLength(1)
    expect(received[0]).toMatchObject({ title: 'Browser video', playing: false, coverUrl: 'data:image/jpeg;base64,YWJj' })
  })

  it('waits for delayed artwork and then publishes one complete track', () => {
    const received = []
    const accumulator = new NowPlayingAccumulator((track) => received.push(track))
    accumulator.ingest({ payload: { title: 'Track', artist: 'Artist', album: 'Album', playing: true } })
    expect(received).toHaveLength(0)
    accumulator.ingest({ payload: { artworkData: 'YWJj', artworkMimeType: 'image/jpeg' } })
    expect(received).toHaveLength(1)
    expect(received[0]).toMatchObject({ title: 'Track', artist: 'Artist', album: 'Album', playing: true, coverUrl: 'data:image/jpeg;base64,YWJj' })
  })

  it('cancels an older pending track during rapid switching', () => {
    vi.useFakeTimers()
    const received = []
    const accumulator = new NowPlayingAccumulator((track) => received.push(track), { fallbackDelayMs: 2000 })
    accumulator.ingest({ title: 'First', artist: 'Artist' })
    accumulator.ingest({ title: 'Second', artist: 'Artist', artworkData: 'c2Vjb25k' })
    vi.advanceTimersByTime(2500)
    expect(received).toHaveLength(1)
    expect(received[0].title).toBe('Second')
    accumulator.stop()
    vi.useRealTimers()
  })

  it('publishes pause and progress changes without replacing metadata', () => {
    const received = []
    const accumulator = new NowPlayingAccumulator((track) => received.push(track))
    accumulator.ingest({ title: 'Track', artist: 'Artist', artworkData: 'YWJj', playing: true, elapsedTime: 4 })
    accumulator.ingest({ title: 'Track', artist: 'Artist', playing: false, elapsedTime: 9 })
    expect(received.at(-1)).toMatchObject({ title: 'Track', artist: 'Artist', playing: false, elapsedTime: 9, coverUrl: 'data:image/jpeg;base64,YWJj' })
  })

  it('marks a preserved track stopped when the system session disappears', () => {
    const received = []
    const accumulator = new NowPlayingAccumulator((track) => received.push(track))
    accumulator.ingest({ title: 'Track', artist: 'Artist', artworkData: 'YWJj', playing: true })
    accumulator.ingest('null')
    expect(received.at(-1)).toMatchObject({ title: 'Track', artist: 'Artist', playing: false, stopped: true })
  })
})
