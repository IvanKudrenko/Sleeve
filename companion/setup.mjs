#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { networkInterfaces, hostname } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const directory = dirname(fileURLToPath(import.meta.url))
const certificateDirectory = join(directory, 'certs')
const certificatePath = join(certificateDirectory, 'sleeve.pem')
const keyPath = join(certificateDirectory, 'sleeve-key.pem')
const ipadCaPath = join(certificateDirectory, 'Sleeve-Local-CA.cer')
const envPath = join(directory, '.env')
const localName = hostname().endsWith('.local') ? hostname() : `${hostname()}.local`
const addresses = Object.values(networkInterfaces()).flat().filter((address) => address?.family === 'IPv4' && !address.internal).map((address) => address.address)
const names = [...new Set([localName, 'localhost', '127.0.0.1', '::1', ...addresses])]

try { execFileSync('mkcert', ['-help'], { stdio: 'ignore' }) } catch {
  console.error('mkcert is required. Install it with: brew install mkcert')
  process.exit(1)
}

mkdirSync(certificateDirectory, { recursive: true })
execFileSync('mkcert', ['-cert-file', certificatePath, '-key-file', keyPath, ...names], { stdio: 'inherit' })
const caRoot = execFileSync('mkcert', ['-CAROOT'], { encoding: 'utf8' }).trim()
copyFileSync(join(caRoot, 'rootCA.pem'), join(certificateDirectory, 'rootCA.pem'))
execFileSync('openssl', ['x509', '-in', join(caRoot, 'rootCA.pem'), '-outform', 'der', '-out', ipadCaPath])

const pairingToken = randomBytes(24).toString('hex')
writeFileSync(envPath, [
  `SLEEVE_TOKEN=${pairingToken}`,
  `SLEEVE_TLS_CERT=${certificatePath}`,
  `SLEEVE_TLS_KEY=${keyPath}`,
  'SLEEVE_ORIGINS=https://ivankudrenko.github.io,http://localhost:5173,http://127.0.0.1:5173',
  `SLEEVE_DEVICE_NAME=${localName}`,
  '',
].join('\n'), { mode: 0o600 })

console.log('\nSleeve companion setup is ready.')
console.log(`Address: https://${localName}:4743`)
console.log(`Pairing token: ${pairingToken}`)
console.log(`iPad CA certificate: ${ipadCaPath}`)
console.log('Keep companion/.env and the certificate key private. Never share rootCA-key.pem.')
