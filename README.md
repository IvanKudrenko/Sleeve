# Sleeve

**Your music, on display.**

Sleeve is a free, open-source music display for an old iPad, Android tablet, secondary monitor, or any browser-capable screen. It shows music playing somewhere else; it does not replace the music player or move audio into the browser.

The current build includes four responsive views:

- artwork with original proportions and an optional ambient background;
- an interactive, touch-tiltable turntable with a moving tonearm and swipe-to-change demo records;
- a physical cassette deck with animated reels and paper label;
- touch and keyboard Cover Flow for recently displayed albums.

The last valid display is restored immediately after reload. Track history, idle behavior, visual preferences, source selection, and per-album artwork overrides are stored locally.

## Run locally

Requirements: Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

Open the LAN URL printed by Vite on the display device. For a production build:

```bash
npm run test
npm run build
npm run preview -- --host
```

Static files are emitted to `dist/` and can be served by any HTTPS-capable static host. HTTPS is recommended for fullscreen/PWA behavior. If a local connector uses plain HTTP, browsers may block it from an HTTPS-hosted Sleeve page as mixed content; run Sleeve on the trusted LAN over HTTP or put both behind a secure reverse proxy.

## Mac → iPad live Now Playing

Sleeve includes a small read-only Mac companion for the deployed GitHub Pages app. It uses the BSD-licensed [`media-control`](https://github.com/ungive/media-control) utility—the same macOS source used by Orpheus—to receive real system Now Playing metadata from Chrome/YouTube Music and other compatible players. Audio remains on the Mac.

One-time Mac setup, with Homebrew and Node.js installed:

```bash
brew install media-control mkcert
cd /path/to/Sleeve
npm run companion:setup
npm run companion
```

The first time the companion starts, it opens a private pairing page on the Mac. Keep the Mac and iPad on the same trusted Wi-Fi, scan the page’s QR code with the iPad camera, and follow Sleeve’s one-time certificate instructions. The QR selects Mac Now Playing and saves the secure address and random credential in that iPad browser automatically; it is not sent to GitHub because it travels in the URL fragment. If the pairing page does not open, visit `http://localhost:4742` on the Mac.

After installing the downloaded profile on iPad, enable it under Settings → General → About → Certificate Trust Settings, return to Sleeve, and retry. Allow local-network access if Safari asks. Then start YouTube Music in Chrome. Track, artwork, timing, and play/pause changes arrive through SSE without refreshing. Later visits reconnect automatically whenever `npm run companion` is running; no Vite server is needed.

The companion’s media endpoint uses HTTPS, accepts only configured Sleeve origins, requires a random token, exposes no playback controls, and should never be port-forwarded. Its small HTTP helper exposes only the public CA certificate on the LAN; the token-bearing QR page is restricted to the Mac’s loopback interface. Secrets and generated TLS files are gitignored. Manual address/token entry remains under Mac Now Playing → Advanced / Manual setup.

## Sources that work now

### Demo

No authentication. It uses three original covers and drives every visual mode. Demo play/next controls change display state only and do not play audio.

### Last.fm

Choose Last.fm in settings, enter your username and personal API key, and connect. Sleeve calls the documented `user.getRecentTracks` API. It shows the live scrobble when Last.fm marks one as now playing and otherwise retains the last scrobble. Last.fm does not provide reliable progress or playback controls here, so Sleeve does not show or invent them.

### Mac Now Playing

Run Sleeve's secure companion as described above, then select Mac Now Playing. It reads the metadata and artwork macOS receives from Chrome/YouTube Music, Apple Music, Spotify, and other players that publish a compatible system media session. Availability and metadata completeness depend on the player; Sleeve never guesses missing album or artwork data.

### Orpheus

Run [Orpheus](https://github.com/Collectif-Pixel/orpheus) on the playback computer, make port 4242 reachable only on your trusted LAN, choose Orpheus, and enter a URL such as `http://192.168.1.20:4242`. Sleeve uses its official JSON and SSE endpoints. Orpheus reports system media sessions on macOS/Linux; its Windows support is experimental upstream.

### Media Display

Run [Media Display](https://github.com/rawburt1/media-display) with the source connectors you need, enable its web output, and enter its LAN URL (default port 8090). Sleeve reads the documented `/health` selection. This reuses Media Display as a separate backend rather than copying its Python integrations. The health schema does not expose all timing fields, so this adapter intentionally leaves timing unknown.

### Tuna / Windows media session

Install and configure the Tuna OBS plugin on Windows, enable Tuna's web server output, then enter its LAN URL (commonly port 1608). Sleeve reads Tuna's JSON and `/cover.png`. This is not direct browser access to Windows media sessions; Tuna and OBS are required.

All local connectors are read-only in Sleeve. They advertise no remote-control capability, and Sleeve sends no playback commands.

## Artwork override

Open settings → Artwork → Choose cover. You can:

- restore the source-supplied artwork;
- search MusicBrainz release groups and explicitly choose a Cover Art Archive candidate after checking artist/date/type; or
- upload an image under 3.5 MB for local storage on that display.

The source artwork and chosen display artwork remain separate. Sleeve never automatically swaps in a search result.

## What is not supported

- Sleeve cannot inspect every music app on an iPhone, iPad, Android device, Mac, or PC from a web page.
- Direct Spotify OAuth is not included because current development-mode/Premium/allowlist/quota and policy constraints make a universal open-source connector misleading. Use a compliant local session backend or Last.fm scrobbling.
- Pairing still requires installing and trusting a locally generated CA certificate once on each iPad. Ordinary web pages cannot silently grant this trust or bypass iPad local-network permissions.
- The browser cannot override device auto-lock or operating-system power-saving settings.
- Animated commercial album artwork is not fetched or simulated.
- Physical iPad/Android hardware testing has not been performed. The production build includes a Safari/iOS 13 legacy bundle and responsive/touch fallbacks, but real-device verification is still needed.

See [the architecture](docs/ARCHITECTURE.md), [research and license audit](docs/RESEARCH_AUDIT.md), and [third-party notices](THIRD_PARTY_NOTICES.md).

## Add a source

Implement `MusicSourceAdapter` from `src/adapters/types.ts`, normalize only fields the source actually supplies, and register it in `createRegistry` in `src/App.tsx`. Keep credentials out of display state, report capabilities explicitly, and supply an idempotent cleanup function from `connect`.

## License

Sleeve is MIT-licensed. External services, metadata, and artwork retain their own terms and copyrights.
