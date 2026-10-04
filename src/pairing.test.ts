import { describe, expect, it } from 'vitest'
import { applyPairing, parsePairingHash } from './pairing'
import { defaultSettings } from './store/persistence'

function encode(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

describe('companion pairing', () => {
  it('accepts a versioned local HTTPS pairing payload', () => {
    const pairing = parsePairingHash(`#pair=${encode({ v: 1, baseUrl: 'https://Studio-Mac.local:4743', token: 'a'.repeat(48), deviceName: 'Studio Mac', certificateUrl: 'http://Studio-Mac.local:4742/certificate' })}`)
    expect(pairing).toMatchObject({ baseUrl: 'https://studio-mac.local:4743', token: 'a'.repeat(48), deviceName: 'Studio Mac' })
  })

  it('rejects public, insecure, and short-token endpoints', () => {
    expect(parsePairingHash(`#pair=${encode({ v: 1, baseUrl: 'https://example.com', token: 'a'.repeat(48) })}`)).toBeUndefined()
    expect(parsePairingHash(`#pair=${encode({ v: 1, baseUrl: 'http://mac.local:4743', token: 'a'.repeat(48) })}`)).toBeUndefined()
    expect(parsePairingHash(`#pair=${encode({ v: 1, baseUrl: 'https://mac.local:4743', token: 'short' })}`)).toBeUndefined()
  })

  it('selects and persists the paired Mac source', () => {
    const next = applyPairing(defaultSettings, { v: 1, baseUrl: 'https://mac.local:4743', token: 'x'.repeat(48) })
    expect(next.source.preferredSource).toBe('mac-companion')
    expect(next.source.macCompanion.token).toHaveLength(48)
  })
})
