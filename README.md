
# YesYouTube

A Chrome Manifest V3 extension written in TypeScript.

## Requirements

- Node.js 20+
- Google Chrome or Chromium

## Installation

Install dependencies:

npm install

Build:

npm run build

Check TypeScript:

npm run typecheck

## Load extension

1. Open chrome://extensions/
2. Enable Developer mode.
3. Click Load unpacked.
4. Select the dist directory.
5. Open YouTube.

## Development

Run:

npm run watch

After rebuilding, reload the extension from chrome://extensions/.

## Debugging

Open YouTube DevTools Console.

Check:

window.youtubeAutoContinue

Stop:

window.youtubeAutoContinue.stop()

Start:

window.youtubeAutoContinue.start()

## Permissions

The extension uses host permissions only for YouTube and YouTube Music.

No background service worker or external server is required.