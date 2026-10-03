# City Guidebook Studio — Phase 1 prototype

Type a city, get a magazine-grade guidebook. This prototype proves the **look and the export path**:
structured JSON → hand-designed spread templates → print-ready A5 PDF.

> The AI never writes HTML. It writes **content JSON**; templates and theme tokens own the design.

## Run it

```bash
npm install
npm run build                         # data/lisbon.json -> dist/lisbon.html
npm run pdf -- dist/lisbon.html --png # -> dist/lisbon.pdf (+ per-page PNGs)
node scripts/build.js data/lisbon.json postcard   # swap theme
```

Chromium is needed for the PDF (set `CHROMIUM_PATH` if Playwright can't find it).

## Layout

| Path | Role |
|---|---|
| `data/lisbon.json` | Sample content: the schema the LLM pipeline will target |
| `src/templates.js` | 11 page templates (cover, letter, glance, map, neighborhood, eat, sight, gems, itinerary, practical, back) |
| `src/themes.js` | Theme token bundles (`tile` Azulejo, `postcard` Retro Postcard) |
| `src/art.js` | Procedural placeholder imagery (real photo slots come in Phase 2) |
| `src/book.css` | Fixed-size A5 pages, `@page` paged media, embedded OFL fonts |
| `src/validate.js` | Schema check (swap for JSON Schema/Zod + LLM repair loop) |
| `scripts/pdf.js` | Headless Chromium → vector PDF, plus an overflow check on locked text frames |

## What's verified
- 13-page A5 PDF, fonts embedded (Playfair Display, DM Sans, Caveat), vector text.
- Overflow check passes on every `.frame`.
- Theme switch restyles the entire book with no content change.

## Not yet done (per the plan)
Bleed/crop marks and 300dpi print mode, real photo sourcing + attribution page, template auto-selection,
the generation pipeline (Phase 2), and the editor (Phase 3). Map is a styled placeholder; use MapLibre or an illustrated SVG per city later.
