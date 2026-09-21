import { describe, expect, it } from 'vitest'
import { albumKey, makeState, normalizeText, trackKey } from './nowPlaying'

describe('normalized now-playing state', () => {
  const track = { title: ' Red Thread ', artist: ' Common Shapes ', album: ' Afterimage ', identifiers: {} }

  it('creates stable case-insensitive track and album keys', () => {
    expect(trackKey(track)).toBe('common shapes::afterimage::red thread')
    expect(albumKey(track)).toBe('common shapes::afterimage')
  })

  it('preserves unknown progress instead of inventing it', () => {
    const state = makeState({
      track,
      playback: { status: 'playing', measuredAt: 10 },
      source: { id: 'test', name: 'Test source' },
      capabilities: [],
      updatedAt: 10,
    })
    expect(state.playback.positionSeconds).toBeUndefined()
    expect(state.playback.durationSeconds).toBeUndefined()
    expect(state.capabilities).toEqual([])
  })

  it('normalizes only strings', () => {
    expect(normalizeText('  album  ')).toBe('album')
    expect(normalizeText(null)).toBe('')
  })
})
