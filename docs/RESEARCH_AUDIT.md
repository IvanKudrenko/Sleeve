# External repository and API audit

Audit performed 2026-09-20 against the commits below. Source, top-level license material, dependency manifests, bundled media, and practical fit were inspected. No repository was vendored.

| Candidate | Audited commit | License finding | Dependencies / compatibility | Decision |
|---|---|---|---|---|
| [Media Display](https://github.com/rawburt1/media-display) | `9142f2e3785194c1ecf50bf83cddad73355a7711` | MIT; copyright Robert Jonsson | Python 3.10+, Flask, requests, Pillow and optional source-specific packages. Mature polling architecture and many network sources. | Reuse as a separate optional backend. Sleeve independently maps the documented `/health` output. This endpoint gives title/subtitle/art but not full playback timing, so Sleeve does not invent it. |
| [Orpheus](https://github.com/Collectif-Pixel/orpheus) | `82c07d0cfc278d8293a6e9891ea65b2f460364bb` | MIT; copyright Collectif Pixel | Bun/TypeScript daemon; macOS and Linux stable upstream, Windows experimental. Public JSON and SSE endpoints include title, artist, album, art, play state, duration and elapsed time when the OS provides them. | Compatible local backend. Sleeve implements its public HTTP/SSE client, not the detector daemon. |
| [Cadence](https://github.com/FlashGalatine/cadence-nowplaying) | `604514572939fd76702f8150f06822fcdde0cf98` | MIT; copyright Ashe “Flash” Galatine | Dependency-free browser widget. Reads Tuna's local HTTP JSON and cover endpoint; Windows media access is supplied by Tuna/OBS rather than the browser. | Adapt the documented Tuna mapping into Sleeve's normalized adapter. Keep it opt-in and describe the OBS/Tuna requirement. |
| [Now Playing Widget](https://github.com/kylewelsby/now-playing-widget) | `d00e1a4284a9ee3f3a1441e98760ac2682598aaa` | MIT; copyright Kyle Welsby | Old Vue 3 release candidate, Tailwind 1, Vite 1. Direct Last.fm recent-track query. | Do not reuse outdated app code. Implement a small typed Last.fm adapter from official API docs. |
| [NeedleDrop](https://github.com/frangedev/NeedleDrop) | `09e8df6e906a427b541a633e9ba3f9f33fa84f16` | MIT; copyright frangedev | Audited tree contains only README and LICENSE despite README describing a fuller project. No source, dependencies, or assets exist to evaluate. | No reuse. Sleeve's turntable is original CSS/DOM artwork. |
| [Cover Flow](https://github.com/ashishgogula/coverflow) | `0b28b2766e08aa1e19bf52dd76c4b55ebba7ae42` | MIT; copyright Ashish Gogula | React 19/Next 16/Tailwind/Motion; strong pointer, wheel, keyboard and reduced-motion design, but the source component is larger and tied to its site/package conventions. | Reference interaction principles only. Sleeve implements a compact touch/keyboard carousel using its existing Motion dependency. |
| [Motion](https://github.com/motiondivision/motion) / npm `motion` | npm 12.43.0 installed | MIT; copyright Motion B.V. | React-compatible, hardware-accelerated values, drag gestures, springs, and reduced-motion hook. | Direct runtime dependency. Full MIT notice is in `THIRD_PARTY_NOTICES.md`. |
| [Mixtape](https://github.com/AdvaySanketi/Mixtape) | `4765241d7f7586960627d0e2e230cca2a22cff43` | README claims MIT but the audited tree has no license file. Bundled sounds, images, and a font have no separate notices. | React/Vite, Firebase, YouTube iframe, DnD packages. It is a music player/creator rather than a passive display. | Reference only; no code or assets copied until licensing is clarified. |
| [Codrops RecordPlayer](https://github.com/codrops/RecordPlayer) | `a1800e688afe8b82d042a861c83679224f0deaf7` | Codrops custom template terms; assets include CC BY, CC BY-SA and bespoke audio terms. | 2016 Web Audio demo with bundled music, impulse responses, icons, fonts, and older JS libraries. Plays audio itself. | Reference only. Mixed assets and player architecture are unsuitable for Sleeve. |

## Music service/API findings

### Last.fm

`user.getRecentTracks` is a documented unauthenticated method that requires a user name and API key. It marks the current item with `nowplaying="true"`, but supplies neither trustworthy progress nor remote-control capabilities. Sleeve therefore exposes no Last.fm progress or playback buttons.

### MusicBrainz and Cover Art Archive

Artwork search is explicitly user-triggered and makes one MusicBrainz request. The UI presents release-group title, credited artist, first-release date and type; it never automatically substitutes a result. MusicBrainz asks clients to stay at or below one request per second and use an identifying User-Agent. Browsers cannot set the `User-Agent` header, so this direct static-app integration is deliberately low-volume; a public hosted deployment should proxy the request with an identifying User-Agent. Cover Art Archive images retain copyright. Sleeve stores the selected URL and provenance, not the image bytes.

### Spotify

Spotify's official currently-playing endpoints require OAuth and user scopes. As of the audited 2026 rules, development-mode apps require the owner to have Premium, are limited to allowlisted users, and use per-developer quota accounting. Extended quota access is not generally available to an individual open-source hobby project. Spotify also attaches policy restrictions to playback/content use. Sleeve does not ship a Spotify client ID, secret, unofficial token extraction, or a UI that implies universal Spotify support. Spotify can still appear through a user's compliant local system-session backend (for example Orpheus or Tuna), or through a separately configured Media Display instance. A future direct connector must use Authorization Code with PKCE and be reviewed against current policy before release.

### iPhone and iPad

Apple's native Now Playing and MediaPlayer frameworks are for apps publishing/managing their own sessions; ordinary web pages are not granted a cross-app system-now-playing feed. Sleeve cannot discover every app playing on an iPhone. Official service APIs, scrobbling, or a deliberately installed companion/backend are the realistic paths. Sleeve does not claim otherwise.

## Asset provenance

The three demo covers, `sleeve-icon.svg`, and every physical-object visual in the app were authored for Sleeve as SVG or CSS. Sleeve uses only system font stacks, so it makes no font-service request. No audited repository artwork, screenshot, sound, font, commercial template, Apple asset, or album cover is bundled.
