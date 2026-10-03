# Guidebook Studio

Type a city, get a fashion-magazine-grade guidebook, refine it in a visual editor, and export a print-ready PDF.

> The AI never writes HTML. It writes **content JSON**. Hand-designed templates and theme tokens own the look, so every issue stays art-directed and edits can't break the layout.

## Quick start

```bash
npm install
npx playwright install chromium   # one-time: the browser used for PDF export
npm start                         # → http://localhost:5173
```

Open the URL, type **Lisbon** (the sample issue), pick a look, and press **Create guidebook**.

Command-line build without the app:

```bash
npm run book                                     # dist/lisbon.html + dist/lisbon.pdf + page PNGs
node scripts/build.js data/lisbon.json riviera   # any theme: couture | azulejo | riviera
```

## The studio

**Start screen.** A city input with three looks (Couture, Azulejo, Riviera), each shown as a live cover preview. An unknown city gets an honest message that AI generation is the next milestone.

**Composing screen.** The issue is assembled page by page while it renders and checks fit.

**Editor:**
- **Text.** Click any text on the page and type. Edits write back to the JSON by path. The contents page and folios update automatically.
- **Images.** Click an image to select it. You can upload a photo (it's downscaled in the browser), paste a URL, or pick one of 10 illustrations. Drag an image on the page to reframe it, and add a photo credit.
- **Pages.** The page rail has live thumbnails. Drag to reorder, or use move, duplicate and delete. **+ Add** inserts new page types.
- **Layouts.** Neighbourhoods switch between a two-page feature and a single page. Eat & Drink switches between a photo grid and a text list.
- **Issue tab.** Switch theme, edit the masthead and details (city, issue, season, price, tagline, byline, QR link), or start over from the sample.
- **Fit checks.** Any text frame that overflows is outlined in red, flagged in the rail and explained in the inspector.
- **Views.** Spreads (pages paired as in print, with spine shading), Pages, and Read (a flipbook you page through with ← →). Zoom and fit-to-window.
- **Undo/redo** (⌘Z / ⇧⌘Z). Autosaves to the browser. **Export PDF** and **JSON** download.

## The magazine design

Built to fashion-magazine conventions:
- **Trim and type.** A 210 × 275 mm magazine trim. Didone (Bodoni Moda) headlines at display sizes with tight tracking, a Futura-like sans (Jost) for kickers and cover lines, and a text serif (Source Serif 4) for body copy.
- **Cover.** A full-width masthead fitted to the city name, a dateline strip, a big-number lead cover line, stacked cover lines with red kickers, a feature line, a flash and a barcode.
- **Contents page.** Generated from the real page numbers.
- **Feature openers.** Two-page spreads: a full-bleed opener with a headline, deck and byline, then a story page with a drop cap, inset image, centred pull quote and numbered "Where to go" list.
- **Page furniture.** Folios mirrored for left and right pages, hairline rules, a single accent colour, and generous white space.

Themes are token bundles (palette, display face and weight). Switching a theme restyles the whole issue.

## Project layout

| Path | Role |
|---|---|
| `server.js` | Zero-dependency server: app, `/api/render`, `/api/pdf`, `/api/catalog`, `/api/scene/:name.svg` |
| `app/` | The studio UI (vanilla JS, no build step) |
| `data/lisbon.json` | Sample issue: the content schema the AI pipeline will target |
| `src/templates.js` | 12 page templates. Every text node has a `data-edit` path and every image a `data-img` path |
| `src/book.css` | Magazine design system: trim, type scale, grids, page furniture |
| `src/themes.js` | Couture · Azulejo · Riviera |
| `src/art.js` | Illustrated scenes, used until real photos are sourced |
| `src/render.js` | Two-pass render (page numbers, then pages) plus the in-page fit and overflow script |
| `src/pdf.js` | Headless Chromium export, so the PDF matches the screen |

## Known limits / next steps
- **Content.** Lisbon is the only city so far. Next is the AI research and curation pipeline that writes this same JSON for any city.
- **Photos.** Placeholder imagery is illustration. Upload or paste real photos per slot, or wire in Unsplash or Wikimedia sourcing with attribution.
- **Print output.** The PDF is RGB with no bleed or crop marks. A print preset (bleed, CMYK hand-off) is still to come.
- **Illustration labels.** The tiny labels inside the illustrations ("28 Graça", "Fado") use system fonts.
