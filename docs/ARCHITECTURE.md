# Sleeve architecture

## Layers

1. `src/adapters` contains independent source adapters. Every adapter emits the same `NowPlayingState`; missing timing and controls remain `undefined`/empty.
2. `src/domain/nowPlaying.ts` owns the normalized state and stable album/track keys.
3. `SourceRegistry` keeps one snapshot per source. A non-preferred adapter can update without replacing the visible source.
4. `src/store/persistence.ts` stores settings, the last valid state, a 12-item recent history, and per-album artwork overrides.
5. Display themes are independent React components. They receive only normalized state and cannot access service credentials.
6. Remote controls are capability-gated. Current adapters advertise no controls, so Sleeve renders none and never sends speculative commands.

## Data flow

```text
music service / OS session / LAN backend
                 │
          source adapter(s)
                 │
       snapshots keyed by source
                 │ preferred source
        normalized now-playing state
          ┌──────┼────────┐
    persistence  artwork   display theme
                 override
```

The browser is always a display endpoint. No adapter moves or replays audio.

## Network and trust boundary

Last.fm requests go directly from the display to Last.fm with the user's own API key. The Mac companion is a read-only HTTPS/SSE service with an origin allowlist and random pairing token; its token is stored only in the display browser and its TLS material stays gitignored on the Mac. QR pairing encodes the local endpoint and scoped display token in a URL fragment, so GitHub Pages never receives it. The token-bearing QR page is loopback-only. A separate HTTP route serves only the public local CA certificate to the LAN. Media Display, Orpheus, and Tuna have their own security models; Sleeve does not add authentication to those upstream services. Keep all local endpoints on a trusted LAN and never port-forward them.

There is no Sleeve control API and no music-account token is exposed by Sleeve on the network. The QR contains only a random local display credential, not a music-service or macOS account credential. Advanced manual entry remains available when camera pairing is unavailable.

## Persistence

All persistence is local to the browser:

- `sleeve.last-state.v1`: last valid normalized state, restored before a source reconnects.
- `sleeve.history.v1`: most recent 12 unique tracks.
- `sleeve.artwork-overrides.v1`: artwork choice keyed by normalized artist and album.
- `sleeve.settings.v1`: display and connector preferences, including any user-supplied Last.fm key.

Large uploaded files are rejected before local-storage write. A future version should move uploads to IndexedDB for larger, lossless files.
