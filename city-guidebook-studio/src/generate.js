// AI generation: city -> book JSON (Qwen) -> photographs (Riverflow).
import { readFileSync } from "node:fs";
import { chatJSON, generateImage } from "./ai.js";
import { templates } from "./templates.js";
import { sceneNames } from "./art.js";
import { validate } from "./validate.js";

const example = JSON.parse(readFileSync(new URL("../data/lisbon.json", import.meta.url), "utf8"));

// The example the model imitates: the Lisbon issue with an image prompt on every slot.
function exampleWithPrompts() {
  const b = structuredClone(example);
  walkImages(b, (img) => { img.prompt = "Short visual description of a real scene in the city"; });
  return b;
}

export function walkImages(book, fn) {
  const visit = (o, path) => {
    if (!o || typeof o !== "object") return;
    if (!Array.isArray(o) && ("scene" in o || "src" in o || "prompt" in o) && path.length) return fn(o, path.join("."));
    for (const [k, v] of Object.entries(o)) visit(v, [...path, k]);
  };
  visit(book.pages, ["pages"]);
}

const SYSTEM = `You are the travel editor of a high-end fashion magazine (think ELLE or Condé Nast Traveller) writing a city guidebook issue.
Voice: confident, sensory, specific, a little witty. No clichés like "hidden gem", "bustling", "vibrant tapestry", "nestled".
Only recommend real, currently operating places you are confident exist. Never invent places. Facts (hours, prices) are indicative; the issue is flagged "verify before travel".
You output ONLY a JSON object, no commentary.`;

function userPrompt(city, brief) {
  return `Write the guidebook issue for: ${city}
${brief ? `Reader brief: ${brief}\n` : ""}
Return JSON with EXACTLY the same structure, page order, page types, keys and array lengths as this example (it is the Lisbon issue). Replace every value with content for ${city}.

Rules:
- Keep every text field within about 15% of the example's length (layouts are fixed; long text overflows).
- meta.city = the city's common English name; meta.country; keep meta.issue, meta.season, meta.price, meta.theme; meta.tagline is a short poetic line; meta.byline "The Editors".
- cover.lead.big is a short number (e.g. "48" or "72") and cover.lead.small completes it; cover.lines are three teasers for content inside; cover.feature is a 2–3 word headline.
- Three neighbourhood pages, each a real district with 5 real places; tags are one word (View, Sight, Café, Bar, Market, Food, Shop, Park, Culture, Music).
- eat.items: 6 real restaurants/cafés/bars; price is €, €€ or €€€ (use the local currency symbol instead of € if different).
- map.pins: the 6 most important areas; x and y are percentages (5–95) approximating real relative positions (x west→east, y north→south).
- itinerary.days: titles are short; stops use 24h times.
- practical.phrases: 4 phrases in the local language with English (keys "pt" = local phrase, "en" = English).
- Every image object: keep "scene" (one of: ${sceneNames.join(", ")} — pick the closest mood) and add "prompt": a vivid 15–30 word description of a REAL view in ${city} for an editorial photograph that fits that slot (subject, place, light, time of day). No text or signage in the image.
- JSON hygiene: inside string values never use straight double quotes (use ‘ ’ or “ ” instead), no trailing commas, no comments.
- Headings must stay short (the "heading" of a neighbourhood is just the district name).

Example:
${JSON.stringify(exampleWithPrompts())}`;
}

const STR = (v, d = "") => (typeof v === "string" ? v : v == null ? d : String(v));
const ARR = (v) => (Array.isArray(v) ? v : []);

// Make model output safe for the templates: right types, required arrays, valid enums.
export function sanitize(raw, { city, theme }) {
  const meta = { ...example.meta, ...(raw?.meta || {}) };
  meta.city = STR(meta.city, city).trim() || city;
  meta.theme = theme || meta.theme || "couture";
  meta.url = `guidebook.studio/${meta.city.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-")}`;
  for (const k of Object.keys(meta)) meta[k] = STR(meta[k]);

  const img = (o, fallback = "rooftops") => {
    const x = o && typeof o === "object" ? o : {};
    const out = { scene: sceneNames.includes(x.scene) ? x.scene : fallback };
    if (x.prompt) out.prompt = STR(x.prompt).slice(0, 400);
    for (const k of ["src", "pos", "credit"]) if (x[k]) out[k] = STR(x[k]);
    return out;
  };
  const pages = ARR(raw?.pages).filter((p) => p && templates[p.type]).map((p) => {
    const q = { ...p };
    for (const k of ["heading", "kicker", "deck", "story", "quote", "caption", "note", "signoff", "flash", "feature"]) if (k in q) q[k] = STR(q[k]);
    for (const k of ["image", "inset"]) if (k in q || ["cover", "contents", "letter", "glance", "neighborhood", "sight", "back"].includes(p.type) && k === "image") q[k] = img(q[k]);
    const tpl = templates[p.type];
    if (tpl.layouts && !tpl.layouts.includes(q.layout)) q.layout = tpl.layouts[0];
    switch (p.type) {
      case "cover":
        q.lead = { big: STR(q.lead?.big, "72"), small: STR(q.lead?.small, "Hours in the city") };
        q.lines = ARR(q.lines).slice(0, 3).map((l) => ({ kicker: STR(l?.kicker), text: STR(l?.text) }));
        q.feature = STR(q.feature, `The New ${meta.city}`);
        break;
      case "letter": q.body = ARR(q.body).map((x) => STR(x)).filter(Boolean).slice(0, 4); if (!q.body.length) q.body = [""]; break;
      case "glance":
        q.facts = ARR(q.facts).slice(0, 6).map((f) => ({ label: STR(f?.label), value: STR(f?.value) }));
        q.tips = ARR(q.tips).map((x) => STR(x)).slice(0, 3);
        break;
      case "map":
        q.pins = ARR(q.pins).slice(0, 6).map((pin) => ({
          label: STR(pin?.label), note: STR(pin?.note),
          x: Math.max(5, Math.min(92, Number(pin?.x) || 50)), y: Math.max(8, Math.min(88, Number(pin?.y) || 50)),
        }));
        break;
      case "neighborhood":
        q.inset = img(q.inset, "tiles");
        q.places = ARR(q.places).slice(0, 5).map((x) => ({ name: STR(x?.name), tag: STR(x?.tag), note: STR(x?.note) }));
        break;
      case "eat":
        q.items = ARR(q.items).slice(0, 6).map((x) => ({ name: STR(x?.name), kind: STR(x?.kind), price: STR(x?.price), note: STR(x?.note), image: img(x?.image, "cafe") }));
        break;
      case "sight": q.body = STR(q.body); q.stats = ARR(q.stats).slice(0, 3).map((s) => ({ value: STR(s?.value), label: STR(s?.label) })); break;
      case "gems": q.gems = ARR(q.gems).slice(0, 4).map((g) => ({ name: STR(g?.name), note: STR(g?.note), image: img(g?.image, "night") })); break;
      case "itinerary":
        q.days = ARR(q.days).slice(0, 3).map((d) => ({ title: STR(d?.title), stops: ARR(d?.stops).slice(0, 6).map((s) => ({ time: STR(s?.time), text: STR(s?.text) })) }));
        break;
      case "practical":
        q.sections = ARR(q.sections).slice(0, 3).map((s) => ({ title: STR(s?.title), items: ARR(s?.items).map((x) => STR(x)).slice(0, 4) }));
        q.phrases = ARR(q.phrases).slice(0, 4).map((x) => ({ pt: STR(x?.pt ?? x?.local), en: STR(x?.en) }));
        break;
    }
    return q;
  });
  // structural guarantees: cover first, contents second, back last
  const byType = (t) => pages.find((p) => p.type === t);
  const body = pages.filter((p) => !["cover", "contents", "back"].includes(p.type));
  const cover = byType("cover") || { ...structuredClone(example.pages[0]), feature: `The New ${meta.city}` };
  const contents = byType("contents") || structuredClone(example.pages[1]);
  const back = byType("back") || structuredClone(example.pages.at(-1));
  const book = { meta, pages: [cover, contents, ...body, back] };
  validate(book);
  return book;
}

// Which image slots get a generated photograph, and at what aspect ratio.
export function imagePlan(book, mode) {
  if (mode === "none") return [];
  const out = [];
  walkImages(book, (o, path) => {
    const [, i, ...rest] = path.split(".");
    const p = book.pages[+i], key = rest.join(".");
    const isKey = (key === "image" && ["cover", "contents", "letter", "neighborhood", "sight"].includes(p.type));
    if (mode === "key" && !isKey) return;
    out.push({ path, prompt: o.prompt || `${p.heading || p.type} in ${book.meta.city}`, aspect: aspectFor(p, key) });
  });
  return out;
}

function aspectFor(p, key) {
  if (p.type === "eat") return "1:1";
  if (p.type === "glance") return "16:9";
  if (p.type === "contents") return "9:16";
  if (p.type === "letter") return "2:3";
  if (p.type === "sight") return "4:3";
  if (p.type === "gems") return key.startsWith("gems.0") ? "2:3" : "4:3";
  if (p.type === "neighborhood" && key === "inset") return "3:4";
  return "3:4";
}

export function photoPrompt(city, prompt) {
  return `Editorial travel photograph for a luxury fashion magazine, ${city}. ${prompt}. Natural light, shot on 35mm film, rich true-to-life colour, elegant composition with negative space, authentic and documentary, no text, no lettering, no watermark, no logos.`;
}

// Full pipeline as an async generator of progress events (streamed to the client as NDJSON).
export async function* generateBook({ city, brief, images = "key", theme }, { signal } = {}) {
  let spent = 0;
  yield { step: "write", message: `Researching ${city} and writing the issue…` };
  const messages = [{ role: "system", content: SYSTEM }, { role: "user", content: userPrompt(city, brief) }];
  let book;
  try {
    let r;
    try {
      r = await chatJSON(messages, { signal });
    } catch (e) {
      if (e.code !== "BAD_JSON") throw e;
      // Local repair failed: ask the model to re-emit its own reply as valid JSON.
      spent += e.cost || 0;
      yield { step: "write", message: "Fixing the formatting…" };
      r = await chatJSON([
        { role: "system", content: "You repair JSON. Output only the corrected JSON object: escape inner double quotes, add missing commas, remove trailing commas. Do not change the content." },
        { role: "user", content: e.raw.slice(0, 60000) },
      ], { signal, temperature: 0 });
    }
    spent += r.cost;
    try { book = sanitize(r.data, { city, theme }); }
    catch (e) {
      yield { step: "write", message: "Tidying the copy…" };
      const fix = await chatJSON([...messages, { role: "assistant", content: JSON.stringify(r.data) }, { role: "user", content: `That JSON has problems: ${e.message}. Return the corrected full JSON only.` }], { signal });
      spent += fix.cost;
      book = sanitize(fix.data, { city, theme });
    }
  } catch (e) { yield { step: "error", message: e.message }; return; }
  yield { step: "book", book, cost: spent };

  const plan = imagePlan(book, images);
  if (plan.length) yield { step: "images", total: plan.length, message: `Shooting ${plan.length} photograph${plan.length > 1 ? "s" : ""}…` };
  const queue = [...plan];
  const results = [];
  const worker = async () => {
    for (let job; (job = queue.shift()); ) {
      if (signal?.aborted) return;
      try {
        const r = await generateImage(photoPrompt(book.meta.city, job.prompt), job.aspect, { signal });
        spent += r.cost;
        results.push({ step: "image", path: job.path, src: r.src, prompt: job.prompt, cost: r.cost });
      } catch (e) {
        results.push({ step: "image-failed", path: job.path, message: e.message });
      }
    }
  };
  const running = Promise.all([worker(), worker(), worker()]);
  let done = false;
  running.then(() => (done = true));
  while (!done || results.length) {
    if (results.length) yield results.shift();
    else await new Promise((r) => setTimeout(r, 120));
  }
  yield { step: "done", cost: spent };
}

// Rewrite a single page with an instruction ("make it punchier", "add a vegetarian option").
export async function rewritePage({ city, page, instruction }, { signal } = {}) {
  const r = await chatJSON([
    { role: "system", content: SYSTEM },
    { role: "user", content: `This is one page of the ${city} guidebook as JSON:\n${JSON.stringify(page)}\n\nEditor's instruction: ${instruction || "Make it sharper and more specific."}\n\nReturn the page as JSON with EXACTLY the same keys, types and array lengths. Keep text lengths within about 15% of the original. Keep "type", "layout" and every image object unchanged.` },
  ], { signal, maxTokens: 3000 });
  const merged = { ...page, ...r.data, type: page.type, layout: page.layout };
  for (const k of ["image", "inset"]) if (page[k]) merged[k] = page[k];
  if (page.items) merged.items = (merged.items || []).map((x, i) => ({ ...x, image: page.items[i]?.image ?? x.image }));
  if (page.gems) merged.gems = (merged.gems || []).map((x, i) => ({ ...x, image: page.gems[i]?.image ?? x.image }));
  const book = sanitize({ meta: { city }, pages: [example.pages[0], example.pages[1], merged, example.pages.at(-1)] }, { city });
  const at = { cover: 0, contents: 1, back: book.pages.length - 1 }[page.type] ?? 2;
  return { page: book.pages[at], cost: r.cost };
}
