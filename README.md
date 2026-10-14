# Little Frames

A tiny photo print studio for memories you'd rather hold than scroll past.

Two or three instant-style mini prints on one **15 × 10 cm landscape sheet**. Add photos, drag to position, zoom, rotate, and write a little note. Download a **3543 × 2362 lossless PNG with 600 DPI metadata**.

## Use it

1. Run `npm start` (Node.js 18 or newer), or double-click `start-windows.bat` on Windows.
2. Open `http://127.0.0.1:4173`.
3. Pick a two- or three-photo layout. Click or drop a photo into each frame.
4. Drag to adjust the crop. Select a frame to zoom, rotate, replace or remove its photo. Arrow keys move the selected photo; Shift + arrow moves farther.
5. Edit each caption, or choose random, unique captions from the original ten-note collection.
6. Save the PNG. Print at **100% / actual size** on **15 × 10 cm** paper. Disable automatic photo enhancement and borderless enlargement.

Your photos stay in memory on your device. There are no uploads, accounts, analytics, external font calls, or runtime dependencies. Closing or reloading the page clears your session; the browser warns before leaving when photos are loaded. Switching layouts preserves all three photos until you remove them or start fresh.

## Layouts

| Layout | Card size | Minimum outside margin | Cutting gap |
| --- | --- | --- | --- |
| Two photos | 62 × 86 mm | 7 mm | 8 mm |
| Three photos | 42 × 62 mm | 6 mm | 6 mm |

Cards have white borders, larger caption bottoms, and optional fine cutting outlines. These are instant-style keepsakes, not a claim to match a film manufacturer's dimensions. The smaller three-photo cards fit side by side without compromising the cutting space.

## Quality

PNG compression is lossless. The original decoded photo is used directly for the final export; the small preview is never used as an export source. Moving, zooming and rotating only affect framing. No filters, AI editing, sharpening or beautification are applied.

Resizing necessarily resamples pixels; a 600 DPI sheet cannot invent detail absent from the source photo. Browser image decoding and color handling can vary; this is an sRGB-oriented web workflow, not a calibrated color-management application. Pixel counts are the nearest whole pixels for 15 × 10 cm at 600 DPI (the rounding difference is below 0.02 mm).

Supported files: JPG, PNG and WebP. Convert HEIC to JPG first. Transparency is flattened onto white. Printed size ultimately depends on printer settings.

## Stack

Plain HTML, CSS, JavaScript, and the browser Canvas API. One bundled, open-license handwriting font. The PNG exporter inserts a standards-compliant `pHYs` density chunk without altering the compressed image data. No build step, backend, database, or npm packages.

Serve the root folder with any static web host. `server.mjs` is a small local preview server bound to loopback; it is not intended as a public production server.

## Checks

```sh
npm test
```

Tests cover physical margins, both templates, rotation-aware crop coverage, unique captions, and PNG density metadata/CRC while preserving image bytes.

## Credits & license

Code and hand-drawn SVG photo icon: MIT. Caveat font: [SIL Open Font License 1.1](assets/OFL.txt), bundled from [Google Fonts](https://github.com/google/fonts/tree/main/ofl/caveat).
