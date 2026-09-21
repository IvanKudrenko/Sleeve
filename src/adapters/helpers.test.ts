import { describe, expect, it } from 'vitest'
import { safeBaseUrl, seconds } from './helpers'

describe('adapter helpers', () => {
  it('accepts local HTTP endpoints and removes a trailing slash', () => {
    expect(safeBaseUrl('http://192.168.1.12:4242/')).toBe('http://192.168.1.12:4242')
  })

  it('rejects non-web protocols', () => {
    expect(() => safeBaseUrl('file:///tmp/player')).toThrow(/http/)
  })

  it('does not coerce missing timing data to zero', () => {
    expect(seconds(undefined)).toBeUndefined()
    expect(seconds('')).toBeUndefined()
    expect(seconds(-1)).toBeUndefined()
  })
})
