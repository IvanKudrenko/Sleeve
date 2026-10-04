import type { SleeveSettings } from './store/persistence'

export interface PairingDetails {
  v: 1
  baseUrl: string
  token: string
  deviceName?: string
  certificateUrl?: string
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const bytes = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function isLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.local') || host === '[::1]') return true
  const parts = host.split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false
  return parts[0] === 10 || parts[0] === 127 || (parts[0] === 192 && parts[1] === 168) || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
}

export function parsePairingHash(hash: string): PairingDetails | undefined {
  if (!hash.startsWith('#pair=')) return undefined
  try {
    const value = JSON.parse(decodeBase64Url(hash.slice(6))) as Partial<PairingDetails>
    if (value.v !== 1 || typeof value.baseUrl !== 'string' || typeof value.token !== 'string' || value.token.length < 24) return undefined
    const endpoint = new URL(value.baseUrl)
    if (endpoint.protocol !== 'https:' || !isLocalHost(endpoint.hostname)) return undefined
    if (value.certificateUrl) {
      const certificate = new URL(value.certificateUrl)
      if (certificate.protocol !== 'http:' || !isLocalHost(certificate.hostname)) return undefined
    }
    return {
      v: 1,
      baseUrl: endpoint.toString().replace(/\/$/, ''),
      token: value.token,
      deviceName: typeof value.deviceName === 'string' ? value.deviceName : undefined,
      certificateUrl: typeof value.certificateUrl === 'string' ? value.certificateUrl : undefined,
    }
  } catch { return undefined }
}

export function applyPairing(settings: SleeveSettings, pairing: PairingDetails): SleeveSettings {
  return {
    ...settings,
    source: {
      ...settings.source,
      preferredSource: 'mac-companion',
      macCompanion: {
        baseUrl: pairing.baseUrl,
        token: pairing.token,
        certificateUrl: pairing.certificateUrl || '',
        deviceName: pairing.deviceName || 'Mac',
      },
    },
  }
}
