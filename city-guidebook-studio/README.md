# Guidebook Studio

Type a city, get a fashion-magazine-grade guidebook, refine it in a visual editor, and export a print-ready PDF.

> The AI never writes HTML. It writes **content JSON**. Hand-designed templates and theme tokens own the look, so every issue stays art-directed and edits can't break the layout.

## Quick start

```bash
npm install
npx playwright install chromium   # one-time: the browser used for PDF export
cp .env.example .env              # then put your OpenRouter key in .env
npm start                         # → http://localhost:5173
```

Type **any city**, optionally add a focus ("food and design", "with kids"), choose how many photographs to generate, and press **Create guidebook**. Without a key the app still runs: open the Lisbon sample issue and edit it.

## AI (OpenRouter)

| Job | Model (override in `.env`) | Rough cost |
|---|---|---|
| Research, curation and copy for the whole issue, as schema-shaped JSON | `qwen/qwen3-235b-a22b-2507` (`TEXT_MODEL`) | < $0.01 per issue |
| Editorial photographs | `sourceful/riverflow-v2-fast` (`IMAGE_MODEL`) | ≈ $0.02 per image |

- **The key stays on the server.** `server.js` reads `OPENROUTER_API_KEY` from `.env`, which git ignores. The browser never sees the key.
- **Generation streams live.** The composing screen shows the issue being written, then each photograph arriving, then what it cost (from OpenRouter's reported usage).
- **Photography modes.** *Key photos* covers the cover, contents, letter, three feature openers and the sight page: 7 images, about $0.15. *Every image* is about 22 images, about $0.45. *Illustrations* uses no image calls.
- **In the editor.** *Generate a photo* works on any image slot; the prompt is pre-filled with what the model wrote for that slot, at the right aspect ratio. *Rewrite with AI* works on any page ("punchier", "add a vegetarian option") and keeps its layout and photos.
- **Model output is sanitized** (`src/generate.js`) before it reaches a template, so a malformed reply can't crash a page. An invalid reply gets one automatic repair pass.
- **Testing offline.** `node scripts/mock-openrouter.js` starts a fake OpenRouter. Run `OPENROUTER_BASE_URL=http://127.0.0.1:5199 npm start` against it.

## Saving

Every guidebook is saved in your browser's local storage: IndexedDB, since AI photos are too large for `localStorage`. Photos are compressed to JPEG first.
- **Autosave.** Saves after every edit, plus a **Save** button (⌘S) and **Save a copy**.
- **Your guidebooks.** A shelf on the start page lets you open, duplicate, download as JSON or delete.
- **Import JSON.** Brings a guidebook back in, or moves it to another browser.

Command-line build without the app:

```bash
npm run book                                     # dist/lisbon.html + dist/lisbon.pdf + page PNGs
node scripts/build.js data/lisbon.json riviera   # any theme: couture | azulejo | riviera
```

## The studio

**Start screen.** A city input, an optional focus, a photography mode, three looks (Couture, Azulejo, Riviera) with live cover previews, and your saved guidebooks.

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
| `app/` | The studio UI (vanilla JS, no build step); `app/library.js` is the local save library |
| `src/ai.js` | OpenRouter client (text JSON + image generation) |
| `src/generate.js` | Prompts, output sanitizer, photo plan, streaming pipeline, page rewrite |
| `data/lisbon.json` | Sample issue: the content schema the AI pipeline will target |
| `src/templates.js` | 12 page templates. Every text node has a `data-edit` path and every image a `data-img` path |
| `src/book.css` | Magazine design system: trim, type scale, grids, page furniture |
| `src/themes.js` | Couture · Azulejo · Riviera |
| `src/art.js` | Illustrated scenes, used until real photos are sourced |
| `src/render.js` | Two-pass render (page numbers, then pages) plus the in-page fit and overflow script |
| `src/pdf.js` | Headless Chromium export, so the PDF matches the screen |

## Known limits / next steps
- **Facts come from the model alone.** There's no live data source yet, so treat places, hours and prices as "verify before travel" (the issue says so). The next step is grounding in Wikivoyage, OpenStreetMap and a Places API.
- **AI photos are generated, not real.** They're labelled "AI-generated" in the credit field; upload real photos where accuracy matters.
- **Print output.** The PDF is RGB with no bleed or crop marks. A print preset (bleed, CMYK hand-off) is still to come.
- **Illustration labels.** The tiny labels inside the illustrations ("28 Graça", "Fado") use system fonts.
