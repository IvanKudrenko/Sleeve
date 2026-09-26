# Third-party notices

Sleeve's application code, demo artwork, icon, turntable, cassette, and Cover Flow visuals are original and released under Sleeve's MIT license. No album art, audio, fonts, or UI assets were copied from the audited reference repositories.

## Runtime dependency

### Motion

Sleeve uses the published `motion` package for transitions, touch gestures, drag physics, and springs.

> MIT License
>
> Copyright (c) 2024 Motion B.V.
>
> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

React, React DOM, Vite, the Vite React and legacy plugins, and Vitest are MIT-licensed. TypeScript is Apache-2.0-licensed. Their complete license texts are installed with their packages in `node_modules`; production bundles retain package metadata and source notices as produced by Vite.

### media-control

Sleeve's optional Mac companion executes the separately installed `media-control` command-line utility to read macOS system Now Playing metadata. It is not bundled with Sleeve.

> BSD 3-Clause License
>
> Copyright (c) 2025 Jonas van den Berg
>
> Redistribution and use in source and binary forms, with or without modification, are permitted provided that the copyright notice, conditions, and disclaimer are retained. `media-control version` prints its copyright and license; source is available in the [media-control repository](https://github.com/ungive/media-control).

### Orpheus macOS detector

Sleeve's Mac companion adapts the delayed-metadata handling approach from Orpheus's `src/core/media/macos.ts`.

> MIT License
>
> Copyright (c) 2025 Collectif Pixel
>
> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Audited repositories

The following repositories were inspected before implementation. This section records influence and compatibility; it does not imply that their code or assets ship in Sleeve.

- **Media Display** — MIT, copyright Robert Jonsson. Sleeve contains an independently written, read-only adapter for its documented `/health` schema. No Media Display Python code or artwork is copied.
- **Orpheus** — MIT, copyright Collectif Pixel. Sleeve contains an independently written client for its documented `/api/now-playing` and `/api/stream` endpoints. The Mac companion adapts Orpheus's permissively licensed approach of reading `media-control get`/`stream`, merging delayed artwork, and using a two-second incomplete-metadata fallback; it is rewritten for Node, adds HTTPS/token/origin security, reconnection, and pause/progress updates. No Orpheus daemon or theme code is copied.
- **Cadence** — MIT, copyright Ashe “Flash” Galatine. Sleeve's Tuna adapter follows Cadence's documented local-web-server approach and field mapping. The implementation was rewritten for Sleeve's adapter interface; the original copyright and license are acknowledged here.
- **Now Playing Widget** — MIT, copyright Kyle Welsby. Evaluated as a Last.fm precedent; not copied. Sleeve uses the documented Last.fm API directly with a new TypeScript adapter.
- **NeedleDrop** — repository license is MIT, copyright frangedev, but the audited commit contains only a README and license. No implementation or assets were available to reuse.
- **Cover Flow** — MIT, copyright Ashish Gogula. Used as an interaction-quality reference. Sleeve's smaller implementation is original and shares no source or packaged assets.
- **Mixtape** — the README says MIT, but the audited repository has no `LICENSE` file. Its code, fonts, sounds, and images are not used. Visual proportions were treated as general reference only.
- **Codrops RecordPlayer** — custom Codrops template terms plus multiple separately licensed assets (including CC BY/CC BY-SA audio and icons). No code or assets are used.

See [`docs/RESEARCH_AUDIT.md`](docs/RESEARCH_AUDIT.md) for commit hashes, dependencies, suitability notes, and the decision for every candidate.

## Artwork and metadata services

- Last.fm artwork URLs and metadata remain subject to Last.fm's terms and the underlying rightsholders' rights.
- MusicBrainz metadata and Cover Art Archive images are not bundled. Users explicitly search and choose a candidate. Cover images retain their original copyrights; the app displays a remote URL and identifies its provenance.
- User-uploaded artwork is stored only in that browser's local storage. Users are responsible for rights to uploaded material.
