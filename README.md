<p align="center">
  <img src="assets/icon.svg" width="80" height="80" alt="Little Frames icon">
</p>
<h1 align="center">Little Frames</h1>
<p align="center">Small prints, lovely memories.</p>

Create two or three instant-style photo prints on one **15 × 10 cm sheet**. Add photos, drag, zoom, rotate, and write handwritten captions. Export a **3543 × 2362 lossless PNG at 600 DPI**.

Everything stays on your device. No uploads, accounts, filters, or runtime dependencies. Plain HTML, CSS and JavaScript.

Compact layouts use slim borders (2 mm for three photos), wider caption bottoms, 5 mm outer margins, and 3 mm cutting gaps. Three-photo sheets use taller crops; drag and zoom to frame your subject.

## Use & deploy

- **Preview:** `npx wrangler dev`
- **Deploy:** `npx wrangler login`, then `npx wrangler deploy`
- **Cloudflare Git integration:** repository root, empty build command, deploy command `npx wrangler deploy`.
- **Tests:** `npm test`

Print at **100% / actual size** on **15 × 10 cm** paper. PNG compression is lossless; resizing resamples pixels.

[MIT license](LICENSE) · [Caveat font license](assets/OFL.txt)
