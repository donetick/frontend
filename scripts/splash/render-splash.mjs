// Renders the native splash artwork from index.html's pre-JavaScript startup
// screen, so the native splash and the first webview frame are the same picture
// and the handover between them is invisible.
//
// The splash is a still image, so the loading affordances are dropped: no
// "Getting things ready" caption and no bouncing dots. They are hidden rather
// than removed, which keeps their space reserved — the logo and the wordmark
// land on exactly the same pixels they occupy once the webview takes over.
//
// Output: resources/splash.png and resources/splash-dark.png, the sources
// @capacitor/assets slices into the per-platform splash assets.
// Run with `npm run splash`.

import { execFileSync } from 'node:child_process'
import {
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = new URL('../../', import.meta.url)
const read = path => readFileSync(new URL(path, root), 'utf8')

// @capacitor/assets' recommended splash source size. Square because iOS shows
// one universal image for every device and orientation.
const CANVAS = 2732

// The startup screen is authored in CSS pixels against a phone viewport. iOS
// draws the square splash with aspect-fill, so the image's side maps to the
// screen's long edge — scaling by CANVAS / long edge renders the artwork at the
// same physical size the webview will draw it at a moment later.
const REFERENCE_VIEWPORT = 844 // iPhone 14/15/16 logical height

const CHROME =
  process.env.CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

// Same extraction the startup-screen test uses, so this stays a view of
// index.html rather than a second copy of it.
const html = read('index.html')
const style = html.match(/<style>([\s\S]*?)<\/style>/)[1]
const markup = html.match(/<div id="root">([\s\S]*?)\n {4}<\/div>/)[1]

const logo = readFileSync(new URL('src/assets/logo.svg', root)).toString(
  'base64',
)
const screen = markup.replace(
  '/src/assets/logo.svg',
  `data:image/svg+xml;base64,${logo}`,
)

const page = mode => `<!doctype html>
<html data-startup-theme="${mode}">
  <head>
    <meta charset="utf-8" />
    <style>${style}</style>
    <style>
      html,
      body {
        margin: 0;
        width: ${CANVAS}px;
        height: ${CANVAS}px;
        overflow: hidden;
        background: var(--startup-bg);
      }
      .startup-screen__content {
        transform: scale(${CANVAS / REFERENCE_VIEWPORT});
      }
      /* A still frame can't animate, so freeze everything at its resting pose. */
      .startup-screen__content,
      .startup-screen__content * {
        animation: none !important;
      }
      /* Hidden, not removed: the reserved space keeps the artwork above it
         aligned with the live startup screen. */
      .startup-screen__caption,
      .startup-screen__dots {
        visibility: hidden;
      }
    </style>
  </head>
  <body>${screen}</body>
</html>
`

const work = mkdtempSync(join(tmpdir(), 'donetick-splash-'))
try {
  for (const [mode, file] of [
    ['light', 'splash.png'],
    ['dark', 'splash-dark.png'],
  ]) {
    const source = join(work, `${mode}.html`)
    const shot = join(work, `${mode}.png`)
    writeFileSync(source, page(mode))
    execFileSync(
      CHROME,
      [
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        `--window-size=${CANVAS},${CANVAS}`,
        '--force-device-scale-factor=1',
        `--screenshot=${shot}`,
        `file://${source}`,
      ],
      { stdio: 'ignore' },
    )
    const out = fileURLToPath(new URL(`resources/${file}`, root))
    renameSync(shot, out)
    console.log(`wrote resources/${file} (${CANVAS}x${CANVAS}, ${mode})`)
  }
} finally {
  rmSync(work, { recursive: true, force: true })
}

console.log('\nNext: npx capacitor-assets generate --assetPath resources')
