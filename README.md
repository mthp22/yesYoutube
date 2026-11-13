# YesYouTube

A Manifest V3 browser extension written in TypeScript that
detects YouTube's inactivity prompt — **"Video paused. Continue
Watching?"** — and clicks its confirmation button automatically so playback
continues.

The extension runs as a single content script. It has no background service
worker, makes no network requests, and requests no extension permissions
beyond the YouTube pages it is injected into.

---

## Features

- Detects the inactivity confirmation dialog by its **text**, then locates the confirmation button **inside that
  dialog only**.
- Clicks only an enabled, visible button whose label exactly matches a known
  confirmation label (`Yes`, `OK`, `Continue`, `Continue watching`).
- Supports dynamically inserted dialogs through a `MutationObserver`.
- Survives YouTube's single-page-application navigation.
- Lifecycle control: `start()` / `stop()` fully install and remove observers,
  timers and listeners.
- Works on `www.youtube.com` and `music.youtube.com`

---

## Architecture

```
├── src/
│   ├── manifest.json              Manifest V3 declaration (copied to dist/)
│   ├── content/
│   │   ├── types.ts               DetectorConfig / DetectionResult contracts
│   │   ├── config.ts              Single source of truth for selectors,
│   │   │                          prompt patterns and labels
│   │   ├── matcher.ts             Stateless DOM scan: find prompt + button
│   │   ├── detector.ts            Lifecycle, observer, timers, click safety
│   │   └── index.ts               Content script entry point
│   └── test/
│       ├── simulate.ts            Simulated DOM fixtures (tests only)
│       ├── matcher.test.ts        Detection behaviour tests
│       └── detector.test.ts       Lifecycle and click-safety tests
├── scripts/
│   ├── build.ts                   esbuild bundler (production / debug / watch)
│   └── generate-icons.ts          Dependency-free PNG icon generation
├── vitest.config.mts              Vitest + jsdom configuration
├── tsconfig.json                  Strict TypeScript configuration
└── package.json                   Scripts and dev dependencies
```

### Module responsibilities

| Module | Responsibility | Purity |
| --- | --- | --- |
| `types.ts` | Type contracts only | no side effects |
| `config.ts` | Builds the configuration object | no side effects |
| `matcher.ts` | Reads the DOM, returns a result, **never clicks** | no side effects |
| `detector.ts` | Owns the observer, timers, listeners and the click decision | stateful |
| `index.ts` | Wires the detector to the page | entry point |
| `src/test/*` | Fixtures and tests | **never bundled into `dist/`** |

### Detection safety model

A click happens only when **all four** gates pass:

1. an element matches one of the configured dialog selectors,
2. that element (and its ancestors) is visible — not `hidden`,
   `aria-hidden`, `display: none` or `visibility: hidden`,
3. its text is short and matches one of the prompt patterns, and
4. a **visible, enabled** button *inside that dialog* has a label that exactly
   equals a configured confirmation label.

Consequences of this design:

- an unrelated dialog with a `Yes` button is never touched,
- a `No` / `Cancel` / `Never` button inside the genuine dialog is never
  touched,
- a missing or disabled confirmation button results in **no click at all**,
- playback controls are never considered, because buttons are only ever
  searched inside a dialog that already matched the prompt text.

---

## Requirements

- Node.js 20+ (tested with Node 26)
- npm 10+
- Manifest V3 supported browser

---

## Installation

```bash
npm install
```

---

## Development commands

| Command | Description |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run typecheck` | Strict TypeScript check, no emit |
| `npm test` | Run the automated test suite once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run build` | Production build into `dist/` |
| `npm run build:debug` | Debug build into `dist/` (adds the console interface) |
| `npm run watch` | Rebuild on change; **also a debug build** |
| `npm run clean` | Delete `dist/` |

---

## Build instructions

Production build:

```bash
npm run build
```

Debug build (adds `window.youtubeAutoContinue` and `[yesYouTube]` console
logs):

```bash
npm run build:debug
```

The generated `dist/` directory contains everything required to load the
extension:

```
dist/
├── manifest.json        Manifest V3
├── content.js           Bundled content script (IIFE)
├── content.js.map       Source map
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

Debug vs. production is controlled by the build-time constant
`__YESYOUTUBE_DEBUG__`. In a production build the debugging block is removed
from the bundle entirely, so nothing is exposed on `window`.

---

## Installing into Chrome (or Edge)

1. Run `npm run build` (or `npm run build:debug` if you want console logs).
2. Open `chrome://extensions/` (Edge: `edge://extensions/`).
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the `dist/` directory.
6. Open `https://www.youtube.com/`.

After changing source code, rebuild and press **Reload** on the extension
card; then refresh the YouTube tab.

---

## Testing

```bash
npm test          # single run
npm run test:watch
```

The suite runs on **Vitest + jsdom** and covers:

- genuine-prompt fixture detection (ARIA, `www.youtube.com` and
  `music.youtube.com` fixture shapes)
- selector-isolation tests proving the YouTube Music and
  `www.youtube.com` selectors match **without** relying on the generic
  `[role="dialog"]` fallback
- a confirmation button whose label lives in `<span role="text">` and whose
  `aria-disabled="false"` must not be treated as disabled
- correct confirmation button identification (`Yes` selected, `No` ignored)
- unrelated dialogs being ignored
- unrelated `Yes` buttons being ignored (outside a dialog, and inside a
  non-prompt dialog)
- missing confirmation button
- disabled confirmation button
- hidden prompt dialog
- dynamically inserted dialogs
- dialog removal and recreation
- duplicate click prevention (including across `stop()`/`start()`)
- detector start and stop (single observer, all timers cleared)
- polling-interval fallback
- YouTube SPA navigation handling

### What these tests prove — and what they do not

| Category | Status |
| --- | --- |
| **Detector behaviour** against a simulated DOM fixture | **Verified** — 30 automated tests pass |
| **Genuine YouTube compatibility** against the live site | **Not verified** — no test in this repository loads YouTube |

A simulated fixture verifies that the matcher and detector behave correctly
*given a recreation of the prompt*. It cannot prove that YouTube still renders
the prompt with the selectors currently configured. Follow the manual
verification steps below before treating the extension as working end-to-end.

---

## Debugging

Use a debug build:

```bash
npm run build:debug
```

Then reload the extension and the YouTube tab, and open the DevTools console.
Debug builds log messages prefixed with `[yesYouTube]` and expose:

```js
window.youtubeAutoContinue.isRunning   // true while detecting
window.youtubeAutoContinue.stop()      // pause detection
window.youtubeAutoContinue.start()     // resume detection
window.youtubeAutoContinue.scan()      // force one scan right now
```

`scan()` does nothing while detection is stopped — start it first.

Production builds expose none of this.

### Verifying the genuine prompt manually

1. Build and load a debug build (`npm run build:debug`).
2. Open a video on `https://www.youtube.com/` with **Autoplay enabled**, in a
   tab that stays in the foreground.
3. Leave it untouched. The **"Video paused. Continue watching?"** message appears after
   **60 minutes** of uninterrupted watching on the web (30 minutes on mobile,
   180 minutes on TV).
4. Keep DevTools open and watch for `[yesYouTube] Inactivity prompt detected.`
   followed by `Confirmation button clicked.`
5. Confirm that playback resumes without any manual interaction.
6. Repeat on `https://music.youtube.com/`.

---

## Security and privacy

- **Permissions:** none (`"permissions"` is not declared at all).
- **Host access:** content-script `matches` limited to `https://www.youtube.com/*`
  and `https://music.youtube.com/*`. A separate `host_permissions` entry is
  intentionally **not** declared — content scripts declared in the manifest are
  injected without it, so declaring it would be redundant.
- No background service worker, no externally connectable messaging.
- No analytics, telemetry, tracking, external API requests or remote code.
- No browsing history is read or stored; nothing is written to storage.
- No `innerHTML`, `eval`, or dynamic code execution — all DOM nodes are created
  with `document.createElement` and `textContent`.
- The debugging interface exists only in debug builds.
- `console.log` output occurs only in debug builds.

---

### If detection stops working

1. Build with `npm run build:debug` and reload.
2. Trigger or locate the prompt and inspect the dialog in the Elements panel.
3. Update `src/content/config.ts` with the new container/button selectors.
4. Add a fixture reproducing the observed structure to
   `src/test/simulate.ts` and a test asserting it is detected.
5. `npm run typecheck && npm test && npm run build`.

---

## Known limitation(s)

1. **Continuous playback is not guaranteed after the first click** - The extension will attempt to click the "Yes" button, but YouTube may still pause playback due to other factors.

---