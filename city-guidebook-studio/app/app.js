// Guidebook Studio — client. No framework: the book JSON is the single source
// of truth; the server renders it; the editor writes edits back by JSON path.

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s = "") => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PAGE_PX = 793.7; // 210mm at 96dpi
const TYPE_NAMES = { cover: "Cover", contents: "Contents", letter: "Editor's letter", glance: "At a glance", map: "Map", neighborhood: "Neighbourhood", eat: "Eat & Drink", sight: "Feature", gems: "Hidden gems", itinerary: "Itinerary", practical: "Practical", back: "Back cover" };
const LAYOUT_NAMES = { feature: "Two-page feature", compact: "Single page", grid: "Photo grid", list: "Text list" };
const STARTER_BLURB = { letter: "Headline, essay and pull quote", glance: "Key facts and insider tips", neighborhood: "Two-page district feature", eat: "Restaurant grid or list", sight: "Full-bleed feature with stats", gems: "Four-image collage", itinerary: "Day-by-day plan", practical: "Getting around, money, phrases" };

const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

const api = {
  async catalog() { return (await fetch("/api/catalog")).json(); },
  async book(id) { const r = await fetch(`/api/books/${id}`); if (!r.ok) throw new Error("Book not found"); return r.json(); },
  async render(book, theme) {
    const r = await fetch("/api/render", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ book, theme }) });
    if (!r.ok) throw new Error(await r.text());
    return r.text();
  },
};

function toast(msg, { action, onAction, error, ms = 3600 } = {}) {
  const el = document.createElement("div");
  el.className = "toast" + (error ? " err" : "");
  el.innerHTML = `<span>${esc(msg)}</span>${action ? `<button>${esc(action)}</button>` : ""}`;
  if (action) el.querySelector("button").onclick = () => { onAction?.(); el.remove(); };
  $("#toasts").append(el);
  setTimeout(() => el.remove(), ms);
}

const getPath = (o, p) => p.split(".").reduce((a, k) => a?.[k], o);
function setPath(o, p, v) {
  const ks = p.split("."), last = ks.pop();
  const t = ks.reduce((a, k) => a[k], o);
  t[last] = v;
}

// ---------- rendered-page helpers (thumbnails, offscreen renders) ----------

function bookCss(doc) {
  return $$("style", doc).map((s) => s.textContent).join("\n").replace(/:root/g, ":host")
    + `.bk{font-family:var(--text);color:var(--ink);font-size:9pt;line-height:1.45;width:210mm}.page{margin:0!important;box-shadow:none!important}`;
}

function paintThumb(host, css, pageHTML) {
  const root = host.shadowRoot || host.attachShadow({ mode: "open" });
  const scale = (host.clientWidth || host.getBoundingClientRect().width) / PAGE_PX;
  root.innerHTML = `<style>${css}</style><div class="bk" style="transform:scale(${scale});transform-origin:0 0">${pageHTML}</div>`;
}

async function waitReady(frame, timeout = 20000) {
  const t0 = Date.now();
  while (!frame.contentWindow?.__ready) {
    if (Date.now() - t0 > timeout) throw new Error("Render timed out");
    await sleep(30);
  }
}

function loadFrame(frame, html) {
  return new Promise((resolve) => { frame.onload = () => resolve(); frame.srcdoc = html; });
}

async function renderOffscreen(book, theme) {
  const f = document.createElement("iframe");
  f.style.cssText = "position:fixed;left:-10000px;top:0;width:900px;height:900px;visibility:hidden";
  document.body.append(f);
  try {
    await loadFrame(f, await api.render(book, theme));
    await waitReady(f);
    const doc = f.contentDocument;
    return { css: bookCss(doc), pages: $$(".page", doc).map((p) => ({ html: p.outerHTML, type: p.dataset.type })), overflow: f.contentWindow.__overflow || [] };
  } finally { f.remove(); }
}

// ---------- app state ----------

let catalog;
let pending = null; // book handed from the composing screen to the editor
const ui = { theme: store.get("gbs:theme") || "couture" };

// ---------- router ----------

async function route() {
  const h = location.hash.replace(/^#\/?/, "");
  const [view, id] = h.split("/");
  $$(".view").forEach((v) => (v.hidden = true));
  if (view === "make" && id) return showMake(id);
  if (view === "edit" && id) return showEditor(id);
  showHome();
}

// ============ HOME ============

const homeCache = {};
async function showHome() {
  $("#home").hidden = false;
  document.title = "Guidebook Studio";
  $("#cityList").innerHTML = catalog.books.map((b) => `<option value="${esc(b.city)}">`).join("");
  const vibes = $("#vibes");
  vibes.innerHTML = Object.entries(catalog.themes).map(([k, t]) => `
    <button class="vibe" role="radio" aria-checked="${k === ui.theme}" data-theme="${k}">
      <span class="check"><svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg></span>
      <div class="sw"><i style="background:${t.paper}"></i><i style="background:${t.ink}"></i><i style="background:${t.accent}"></i></div>
      <b>${esc(t.name)}</b><span>${esc(t.blurb)}</span></button>`).join("");
  vibes.onclick = (e) => {
    const b = e.target.closest(".vibe"); if (!b) return;
    ui.theme = b.dataset.theme; store.set("gbs:theme", ui.theme);
    $$(".vibe", vibes).forEach((v) => v.setAttribute("aria-checked", v === b));
    paintCovers();
  };
  paintCovers();
}

async function paintCovers() {
  const orderOf = () => [ui.theme, ...Object.keys(catalog.themes).filter((k) => k !== ui.theme)].join();
  const key = orderOf(), order = key.split(",");
  const sample = catalog.books[0];
  if (!sample) return;
  await Promise.all(order.map(async (theme, i) => {
    if (!homeCache[theme]) {
      const book = await api.book(sample.id);
      homeCache[theme] = renderOffscreen(book, theme);
    }
    const r = await homeCache[theme];
    const slot = $(`.mini[data-mini="${i}"]`);
    if (!slot || orderOf() !== key) return;
    slot.innerHTML = `<div class="thumb"></div>`;
    paintThumb(slot.firstChild, r.css, r.pages[0].html);
  }));
}

$("#cityForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const q = $("#cityInput").value.trim().toLowerCase();
  const note = $("#cityNote");
  if (!q) { note.textContent = "Type a city to begin."; return; }
  const hit = catalog.books.find((b) => b.city.toLowerCase() === q || b.id === q);
  if (hit) { location.hash = `#/make/${hit.id}`; return; }
  const first = catalog.books[0];
  note.innerHTML = `<b>${esc($("#cityInput").value.trim())}</b> isn't in the library yet. Generating any city is the next milestone (the AI research pipeline). ${first ? `<button type="button" id="trySample">Open ${esc(first.city)} instead</button>` : ""}`;
  $("#trySample")?.addEventListener("click", () => (location.hash = `#/make/${first.id}`));
});

// ============ COMPOSING ============

async function showMake(id) {
  $("#make").hidden = false;
  const bar = $("#makeBar"), step = $("#makeStep"), grid = $("#makeGrid");
  grid.innerHTML = ""; bar.style.width = "0";
  const meta = catalog.books.find((b) => b.id === id);
  $("#makeTitle").textContent = meta?.city || id;
  document.title = `Composing ${meta?.city || id} · Guidebook Studio`;
  try {
    step.textContent = "Gathering neighbourhoods, tables and sights…"; bar.style.width = "12%";
    const draft = store.get(`gbs:book:${id}`);
    const book = draft?.book || (await api.book(id));
    book.meta.theme = ui.theme;
    await sleep(350);
    step.textContent = "Setting type and placing images…"; bar.style.width = "38%";
    const r = await renderOffscreen(book, ui.theme);
    grid.innerHTML = r.pages.map((p, i) => `<figure><div class="tbox"><div class="thumb"></div></div><figcaption>${i === 0 ? "Cover" : String(i + 1).padStart(2, "0")}</figcaption></figure>`).join("");
    const figs = $$("figure", grid);
    for (const [i, f] of figs.entries()) {
      paintThumb($(".thumb", f), r.css, r.pages[i].html);
      f.classList.add("in");
      bar.style.width = `${38 + (52 * (i + 1)) / figs.length}%`;
      await sleep(90);
    }
    step.textContent = r.overflow.length ? `Checked fit: ${r.overflow.length} frame(s) need attention.` : "Checked fit: every frame sits cleanly.";
    bar.style.width = "100%";
    pending = { id, book, restored: !!draft };
    await sleep(650);
    location.hash = `#/edit/${id}`;
  } catch (e) {
    step.textContent = "Something went wrong: " + e.message;
  }
}

// ============ EDITOR ============

const ed = {
  id: null, book: null, history: [], future: [], sel: 0, img: null, view: store.get("gbs:view") || "spreads",
  zoom: null, read: 0, lastPath: null, lastAt: 0, dirty: false, retoc: false, css: "",
};
let front = $("#frameA"), back = $("#frameB");
back.classList.add("back");

async function showEditor(id) {
  $("#edit").hidden = false;
  if (ed.id !== id || !ed.book) {
    let book, restored = false;
    if (pending?.id === id) ({ book, restored } = pending);
    else {
      const draft = store.get(`gbs:book:${id}`);
      book = draft?.book || (await api.book(id).catch(() => null));
      restored = !!draft;
    }
    pending = null;
    if (!book) { toast("That guidebook doesn't exist.", { error: true }); location.hash = "#/"; return; }
    Object.assign(ed, { id, book, history: [], future: [], sel: 0, img: null, read: 0 });
    if (restored) toast("Picked up your saved draft.", { action: "Start over", onAction: revertToSample, ms: 6000 });
  }
  setView(ed.view, false);
  updateChrome();
  await rerender();
  setTimeout(() => $("#hint").classList.add("hide"), 7000);
}

function updateChrome() {
  const m = ed.book.meta;
  $("#docCity").textContent = m.city;
  $("#docIssue").textContent = `${m.issue} · ${m.season}`;
  document.title = `${m.city} · Guidebook Studio`;
  $("#undoBtn").disabled = !ed.history.length;
  $("#redoBtn").disabled = !ed.future.length;
}

// ---- history + autosave ----

function commit(mutate, { path, rerender: rr = true } = {}) {
  const now = Date.now();
  const coalesce = path && path === ed.lastPath && now - ed.lastAt < 1200;
  if (!coalesce) { ed.history.push(JSON.stringify(ed.book)); if (ed.history.length > 150) ed.history.shift(); }
  ed.lastPath = path || null; ed.lastAt = now;
  ed.future = [];
  mutate(ed.book);
  markDirty();
  updateChrome();
  if (rr) rerender();
}

function undo() {
  if (!ed.history.length) return;
  ed.future.push(JSON.stringify(ed.book));
  ed.book = JSON.parse(ed.history.pop());
  ed.lastPath = null; markDirty(); updateChrome(); rerender();
}
function redo() {
  if (!ed.future.length) return;
  ed.history.push(JSON.stringify(ed.book));
  ed.book = JSON.parse(ed.future.pop());
  ed.lastPath = null; markDirty(); updateChrome(); rerender();
}

let saveTimer, warnedQuota = false;
function markDirty() {
  ed.dirty = true;
  const s = $("#saveState"); s.textContent = "Saving…"; s.classList.add("dirty");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const ok = store.set(`gbs:book:${ed.id}`, { book: ed.book, at: Date.now() });
    s.classList.toggle("dirty", !ok);
    s.textContent = ok ? "Saved" : "Not saved";
    if (!ok && !warnedQuota) { warnedQuota = true; toast("This browser couldn't store the draft (large images?). Use JSON to keep a copy.", { error: true, ms: 7000 }); }
  }, 600);
}

async function revertToSample() {
  if (!confirm("Discard your edits and reload the original sample?")) return;
  store.del(`gbs:book:${ed.id}`);
  const fresh = await api.book(ed.id);
  commit((b) => Object.assign(b, fresh));
  toast("Back to the original sample. Undo to restore your edits.");
}

// ---- rendering (double-buffered so edits never flash) ----

let seq = 0;
const EDITOR_CSS = `
html{background:transparent!important}
body{padding:48px 40px 140px!important;display:grid;justify-content:center;row-gap:56px;column-gap:0;zoom:var(--z,1)}
body.spreads,body.read{grid-template-columns:repeat(2,210mm)}
body.pages{grid-template-columns:210mm}
body.spreads .page:first-child{grid-column:2}
.page{margin:0!important;box-shadow:0 18px 40px -12px rgba(0,0,0,.35),0 1px 3px rgba(0,0,0,.12)!important}
body:not(.pages) .page[data-side=l]::after,body:not(.pages) .page[data-side=r]::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:50}
body:not(.pages) .page[data-side=l]::after{background:linear-gradient(to left,rgba(0,0,0,.16),rgba(0,0,0,0) 9mm)}
body:not(.pages) .page[data-side=r]::after{background:linear-gradient(to right,rgba(0,0,0,.16),rgba(0,0,0,0) 9mm)}
body.read{align-content:center;min-height:100vh;padding-top:24px!important;padding-bottom:90px!important}
body.read .page{display:none}
body.read .page.cur{display:block;animation:turn .35s ease}
body.read .page.cur.solo{grid-column:2}
@keyframes turn{from{opacity:.2;transform:translateX(var(--dx,0))}}
[data-edit]{cursor:text;transition:box-shadow .12s}
[data-edit]:hover{box-shadow:0 0 0 1px rgba(37,99,235,.55)}
[data-edit]:focus{outline:none;box-shadow:0 0 0 2px #2563eb;background:rgba(37,99,235,.04)}
body.read [data-edit]:hover,body.read [data-img]:hover{box-shadow:none}
[data-img]{cursor:grab}
[data-img]:hover{box-shadow:inset 0 0 0 2px rgba(37,99,235,.6)}
[data-img].imgsel{box-shadow:inset 0 0 0 3px #2563eb}
body.dragging,body.dragging *{cursor:grabbing!important;user-select:none}
.page.sel{outline:2px solid #141414;outline-offset:8px}
.scrim-b,.opener,.over-b,.cv-top,.cv-lines,.cv-feature,.cv-flash,.barcode,.credits{pointer-events:none}
[data-edit]{pointer-events:auto}
body.read .page.sel{outline:none}
`;

async function rerender() {
  const my = ++seq;
  let html;
  try { html = await api.render(ed.book); }
  catch (e) { toast("Render failed: " + e.message, { error: true }); return; }
  if (my !== seq) return;
  const y = front.contentWindow?.scrollY || 0;
  await loadFrame(back, html.replace("</head>", `<style>${EDITOR_CSS}</style></head>`));
  try { await waitReady(back); } catch (e) { toast(e.message, { error: true }); return; }
  if (my !== seq) return;
  wireFrame(back);
  applyZoom(back);
  back.contentWindow.scrollTo(0, y);
  back.classList.remove("back"); front.classList.add("back");
  [front, back] = [back, front];
  back.srcdoc = "";
  ed.css = bookCss(front.contentDocument);
  afterRender();
}

function doc() { return front.contentDocument; }
function entryPages(i, d = doc()) { return $$(`.page[data-index="${i}"]`, d); }

function afterRender() {
  const d = doc();
  if (ed.sel >= ed.book.pages.length) ed.sel = ed.book.pages.length - 1;
  buildRail();
  markSelection();
  if (ed.view === "read") showSpread(ed.read, 0);
  renderInspector();
  $("#pageCount").textContent = `· ${$$(".page", d).length}`;
}

function overflowEntries() {
  const set = new Set();
  $$(".page", doc()).forEach((p) => { if (p.querySelector("[data-overflow]") || p.hasAttribute("data-overflow")) set.add(+p.dataset.index); });
  return set;
}

// ---- wiring the rendered document for editing ----

function wireFrame(frame) {
  const d = frame.contentDocument, w = frame.contentWindow;
  d.body.className = ed.view;
  $$(".page", d).forEach((p) => (p.dataset.side = +p.dataset.n % 2 ? "r" : "l"));
  $$("[data-edit]", d).forEach((el) => {
    try { el.contentEditable = "plaintext-only"; } catch { el.contentEditable = "true"; }
    if (el.contentEditable !== "plaintext-only") el.contentEditable = "true";
    el.spellcheck = true;
  });
  if (ed.img) $(`[data-img="${ed.img}"]`, d)?.classList.add("imgsel");

  let layoutTimer;
  d.addEventListener("input", (e) => {
    const el = e.target.closest?.("[data-edit]"); if (!el) return;
    const path = el.dataset.edit, val = el.innerText.replace(/\s*\n\s*/g, " ");
    if (path.startsWith("meta.") || /\.(heading|kicker|deck)$/.test(path)) ed.retoc = true;
    commit((b) => setPath(b, path, val), { path, rerender: false });
    $("#hint").classList.add("hide");
    clearTimeout(layoutTimer);
    layoutTimer = setTimeout(() => {
      w.__layout?.();
      const i = +el.closest(".page").dataset.index;
      refreshThumbs(i); refreshWarnings();
    }, 350);
  });
  d.addEventListener("focusout", () => { if (ed.retoc) { ed.retoc = false; rerender(); } });
  d.addEventListener("keydown", (e) => {
    if (e.target.closest?.("[data-edit]") && e.key === "Enter") { e.preventDefault(); e.target.blur(); }
    if (e.key === "Escape") e.target.blur?.();
    handleKeys(e);
  });
  d.addEventListener("paste", (e) => {
    if (!e.target.closest?.("[data-edit]")) return;
    e.preventDefault();
    d.execCommand("insertText", false, (e.clipboardData.getData("text/plain") || "").replace(/\s*\n\s*/g, " "));
  });

  // click to select page / image; drag image to reframe
  let drag = null, suppressClick = false;
  d.addEventListener("mousedown", (e) => {
    const img = e.target.closest("[data-img]");
    if (!img || e.target.closest("[data-edit]") || ed.view === "read" || e.button) return;
    const [x, y] = (img.style.backgroundPosition || "50% 50%").split(" ").map(parseFloat);
    drag = { img, sx: e.clientX, sy: e.clientY, x, y, moved: false };
    e.preventDefault();
  });
  d.addEventListener("mousemove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    drag.moved = true; d.body.classList.add("dragging");
    const r = drag.img.getBoundingClientRect();
    const nx = Math.max(0, Math.min(100, drag.x - (dx / r.width) * 100));
    const ny = Math.max(0, Math.min(100, drag.y - (dy / r.height) * 100));
    drag.img.style.backgroundPosition = `${nx.toFixed(1)}% ${ny.toFixed(1)}%`;
  });
  const endDrag = () => {
    if (!drag) return;
    d.body.classList.remove("dragging");
    if (drag.moved) {
      suppressClick = true;
      const path = drag.img.dataset.img, pos = drag.img.style.backgroundPosition;
      commit((b) => { const o = getPath(b, path) || {}; o.pos = pos; setPath(b, path, o); }, { rerender: false });
      refreshThumbs(+drag.img.closest(".page").dataset.index);
    }
    drag = null;
  };
  d.addEventListener("mouseup", endDrag);
  d.addEventListener("mouseleave", endDrag);
  d.addEventListener("click", (e) => {
    if (suppressClick) { suppressClick = false; return; }
    if (ed.view === "read") return;
    const page = e.target.closest(".page"); if (!page) return;
    const img = e.target.closest("[data-img]");
    const imgPath = img && !e.target.closest("[data-edit]") ? img.dataset.img : null;
    select(+page.dataset.index, { img: imgPath, scroll: false });
    if (imgPath && innerWidth <= 1180) $("#inspector").classList.add("open");
  });
}

// ---- selection ----

function select(i, { img = null, scroll = true } = {}) {
  ed.sel = i; ed.img = img;
  markSelection();
  renderInspector();
  if (scroll) entryPages(i)[0]?.scrollIntoView({ behavior: "smooth", block: "center" });
  const li = $(`#rail [data-i="${i}"]`); li?.scrollIntoView({ block: "nearest" });
}

function markSelection() {
  const d = doc();
  $$(".page.sel", d).forEach((p) => p.classList.remove("sel"));
  entryPages(ed.sel).forEach((p) => p.classList.add("sel"));
  $$(".imgsel", d).forEach((x) => x.classList.remove("imgsel"));
  if (ed.img) $(`[data-img="${ed.img}"]`, d)?.classList.add("imgsel");
  $$("#rail .rail-item").forEach((li) => li.classList.toggle("sel", +li.dataset.i === ed.sel));
}

// ---- rail ----

const ICON = {
  up: '<svg viewBox="0 0 24 24"><path d="m6 15 6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
  dup: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12"/><path d="M16 8V4H4v12h4"/></svg>',
  del: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
};

function buildRail() {
  const d = doc(), warn = overflowEntries();
  $("#rail").innerHTML = ed.book.pages.map((p, i) => {
    const pages = entryPages(i, d), ns = pages.map((x) => x.dataset.n);
    const num = ns.length > 1 ? `${ns[0]}–${ns.at(-1)}` : ns[0];
    return `<li class="rail-item" draggable="true" data-i="${i}" tabindex="0" aria-label="${esc(TYPE_NAMES[p.type])}">
      <span class="num">${num}</span>
      <div class="thumbs">${pages.map(() => `<div class="tbox"><div class="thumb"></div></div>`).join("")}</div>
      <span class="label">${warn.has(i) ? '<i class="warn" title="Text overflows"></i>' : ""}${esc(p.heading || TYPE_NAMES[p.type])}</span>
      <div class="acts">
        <button data-act="up" title="Move up" aria-label="Move up">${ICON.up}</button>
        <button data-act="down" title="Move down" aria-label="Move down">${ICON.down}</button>
        <button data-act="dup" title="Duplicate" aria-label="Duplicate">${ICON.dup}</button>
        <button data-act="del" title="Delete" aria-label="Delete">${ICON.del}</button>
      </div></li>`;
  }).join("");
  ed.book.pages.forEach((_, i) => refreshThumbs(i));
}

function refreshThumbs(i) {
  const li = $(`#rail [data-i="${i}"]`); if (!li) return;
  const hosts = $$(".thumb", li);
  entryPages(i).forEach((p, k) => {
    if (!hosts[k]) return;
    const clone = p.cloneNode(true);
    clone.classList.remove("sel");
    $$("[contenteditable]", clone).forEach((x) => x.removeAttribute("contenteditable"));
    paintThumb(hosts[k], ed.css, clone.outerHTML);
  });
}

function refreshWarnings() {
  const warn = overflowEntries();
  $$("#rail .rail-item").forEach((li) => {
    const i = +li.dataset.i, label = $(".label", li), has = !!$(".warn", label);
    if (warn.has(i) && !has) label.insertAdjacentHTML("afterbegin", '<i class="warn" title="Text overflows"></i>');
    if (!warn.has(i) && has) $(".warn", label).remove();
  });
  renderInspector({ keepFocus: true });
}

const rail = $("#rail");
rail.addEventListener("click", (e) => {
  const li = e.target.closest(".rail-item"); if (!li) return;
  const i = +li.dataset.i, act = e.target.closest("[data-act]")?.dataset.act;
  if (act) return pageAction(act, i);
  if (ed.view === "read") showSpread(spreadOf(i), 0);
  select(i);
});
rail.addEventListener("keydown", (e) => {
  const li = e.target.closest(".rail-item"); if (!li) return;
  const i = +li.dataset.i;
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(i); }
  if ((e.altKey || e.metaKey) && e.key === "ArrowUp") { e.preventDefault(); pageAction("up", i); }
  if ((e.altKey || e.metaKey) && e.key === "ArrowDown") { e.preventDefault(); pageAction("down", i); }
});
let dragFrom = null;
rail.addEventListener("dragstart", (e) => {
  const li = e.target.closest(".rail-item"); if (!li) return;
  dragFrom = +li.dataset.i; li.classList.add("dragging");
  e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(dragFrom));
});
rail.addEventListener("dragover", (e) => {
  const li = e.target.closest(".rail-item"); if (!li || dragFrom === null) return;
  e.preventDefault();
  const r = li.getBoundingClientRect(), after = e.clientY > r.top + r.height / 2;
  $$(".drop-before,.drop-after", rail).forEach((x) => x.classList.remove("drop-before", "drop-after"));
  li.classList.add(after ? "drop-after" : "drop-before");
});
rail.addEventListener("drop", (e) => {
  const li = e.target.closest(".rail-item"); if (!li || dragFrom === null) return;
  e.preventDefault();
  let to = +li.dataset.i + (li.classList.contains("drop-after") ? 1 : 0);
  const from = dragFrom;
  if (to > from) to--;
  if (to !== from) { commit((b) => b.pages.splice(to, 0, b.pages.splice(from, 1)[0])); ed.sel = to; }
});
rail.addEventListener("dragend", () => {
  dragFrom = null;
  $$(".dragging,.drop-before,.drop-after", rail).forEach((x) => x.classList.remove("dragging", "drop-before", "drop-after"));
});

function pageAction(act, i) {
  const n = ed.book.pages.length;
  if (act === "up" && i > 0) { commit((b) => b.pages.splice(i - 1, 0, b.pages.splice(i, 1)[0])); ed.sel = i - 1; }
  if (act === "down" && i < n - 1) { commit((b) => b.pages.splice(i + 1, 0, b.pages.splice(i, 1)[0])); ed.sel = i + 1; }
  if (act === "dup") { commit((b) => b.pages.splice(i + 1, 0, structuredClone(b.pages[i]))); ed.sel = i + 1; toast("Page duplicated."); }
  if (act === "del") {
    if (n <= 1) return toast("A guidebook needs at least one page.");
    const name = ed.book.pages[i].heading || TYPE_NAMES[ed.book.pages[i].type];
    commit((b) => b.pages.splice(i, 1));
    ed.sel = Math.max(0, Math.min(i, n - 2)); ed.img = null;
    toast(`Deleted “${name}”.`, { action: "Undo", onAction: undo });
  }
}

// add-page menu
const addMenu = $("#addMenu");
addMenu.innerHTML = Object.entries(STARTER_BLURB).map(([k, d]) => `<button role="menuitem" data-add="${k}"><b>${esc(TYPE_NAMES[k])}</b><span>${esc(d)}</span></button>`).join("");
$("#addBtn").onclick = (e) => { e.stopPropagation(); addMenu.hidden = !addMenu.hidden; if (!addMenu.hidden) addMenu.querySelector("button").focus(); };
document.addEventListener("click", (e) => { if (!e.target.closest(".add-wrap")) addMenu.hidden = true; });
addMenu.onclick = (e) => {
  const k = e.target.closest("[data-add]")?.dataset.add; if (!k) return;
  addMenu.hidden = true;
  const at = Math.min(ed.sel + 1, ed.book.pages.length);
  commit((b) => b.pages.splice(at, 0, structuredClone(catalog.starters[k])));
  ed.sel = at;
  setTimeout(() => select(at), 400);
  toast(`Added a ${TYPE_NAMES[k].toLowerCase()} page. Click its text to write.`);
};

// ---- inspector ----

function renderInspector({ keepFocus } = {}) {
  if (keepFocus && $("#inspector").contains(document.activeElement)) return;
  renderPageTab(); renderBookTab();
}

function renderPageTab() {
  const p = ed.book.pages[ed.sel]; if (!p) return;
  const pages = entryPages(ed.sel), ns = pages.map((x) => x.dataset.n);
  const layouts = catalog.layouts[p.type];
  const imgs = [...new Set(pages.flatMap((pg) => $$("[data-img]", pg).map((x) => x.dataset.img)))];
  const warn = pages.flatMap((pg) => $$("[data-overflow]", pg)).length;
  const sel = ed.img && imgs.includes(ed.img) ? ed.img : null;
  const img = sel ? getPath(ed.book, sel) || {} : null;
  const bg = (o) => (o?.src ? `url('${String(o.src).replace(/'/g, "%27")}')` : `url('/api/scene/${o?.scene || "rooftops"}.svg')`);

  $("#tabPage").innerHTML = `
    <div class="sect">
      <div class="ptitle">${esc(p.heading || TYPE_NAMES[p.type])}</div>
      <div class="ptype">${esc(TYPE_NAMES[p.type])} · ${ns.length > 1 ? "pages" : "page"} ${ns.join("–")}</div>
    </div>
    ${warn ? `<div class="sect"><div class="callout"><b>Text doesn't fit.</b> ${warn} frame${warn > 1 ? "s are" : " is"} outlined in red on the page.<ul><li>Shorten the copy, or</li>${layouts ? "<li>switch to a roomier layout below.</li>" : ""}</ul></div></div>` : ""}
    ${layouts ? `<div class="sect"><h4>Layout</h4><div class="seg full">${layouts.map((l) => `<button data-layout="${l}" class="${(p.layout || layouts[0]) === l ? "on" : ""}">${esc(LAYOUT_NAMES[l] || l)}</button>`).join("")}</div></div>` : ""}
    ${imgs.length ? `<div class="sect"><h4>Images <span class="muted">${imgs.length}</span></h4>
      <div class="scenes">${imgs.map((k) => `<button data-pick="${k}" aria-pressed="${k === sel}" style="background-image:${bg(getPath(ed.book, k))};background-position:${esc(getPath(ed.book, k)?.pos || "50% 50%")}" title="Select image"></button>`).join("")}</div>
      ${sel ? `
        <div style="margin-top:14px" class="img-prev" style="background-image:${bg(img)}"></div>
        <div class="row" style="margin-top:8px">
          <button class="btn btn-sm" data-imgact="upload">Upload photo</button>
          <button class="btn btn-sm" data-imgact="reset">Reset framing</button>
          ${img.src ? '<button class="btn btn-sm" data-imgact="clear">Use illustration</button>' : ""}
        </div>
        <div class="urlrow"><input id="imgUrl" placeholder="…or paste an image URL" value="${esc(img.src && !String(img.src).startsWith("data:") ? img.src : "")}"><button class="btn btn-sm" data-imgact="url">Use</button></div>
        <h4 style="margin-top:14px">Illustrations</h4>
        <div class="scenes">${catalog.scenes.map((s) => `<button data-scene="${s}" aria-pressed="${!img.src && img.scene === s}" title="${s}" style="background-image:url('/api/scene/${s}.svg')"></button>`).join("")}</div>
        ${img.src ? `<label class="field" style="margin-top:12px"><span>Photo credit</span><input id="imgCredit" value="${esc(img.credit || "")}" placeholder="Photographer / licence"></label>` : ""}
        <p class="tip" style="margin-top:10px">Drag the image on the page to reframe it.</p>`
        : `<p class="tip" style="margin-top:10px">Pick an image above, or click one on the page, to replace or reframe it.</p>`}
    </div>` : ""}
    <div class="sect"><h4>Arrange</h4>
      <div class="row">
        <button class="btn btn-sm" data-pact="up" ${ed.sel === 0 ? "disabled" : ""}>Move up</button>
        <button class="btn btn-sm" data-pact="down" ${ed.sel === ed.book.pages.length - 1 ? "disabled" : ""}>Move down</button>
        <button class="btn btn-sm" data-pact="dup">Duplicate</button>
        <button class="btn btn-sm" data-pact="del">Delete</button>
      </div></div>
    <div class="sect"><h4>Editing</h4>
      <p class="tip">Click any text on the page and type. <span class="kbd">Enter</span> finishes, <span class="kbd">⌘Z</span> undoes. The contents page and folios update themselves.</p>
    </div>`;
  const prev = $("#tabPage .img-prev"); if (prev && img) { prev.style.backgroundImage = bg(img); prev.style.backgroundPosition = img.pos || "50% 50%"; }
}

$("#tabPage").addEventListener("click", (e) => {
  const t = e.target.closest("button"); if (!t) return;
  const p = ed.book.pages[ed.sel];
  if (t.dataset.layout) return commit((b) => (b.pages[ed.sel].layout = t.dataset.layout));
  if (t.dataset.pact) return pageAction(t.dataset.pact, ed.sel);
  if (t.dataset.pick) { ed.img = t.dataset.pick; markSelection(); renderPageTab(); $(`[data-img="${ed.img}"]`, doc())?.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
  const path = ed.img; if (!path) return;
  if (t.dataset.scene) return commit((b) => setPath(b, path, { scene: t.dataset.scene }));
  const act = t.dataset.imgact;
  if (act === "upload") $("#fileInput").click();
  if (act === "reset") commit((b) => { const o = { ...getPath(b, path) }; delete o.pos; setPath(b, path, o); });
  if (act === "clear") commit((b) => setPath(b, path, { scene: getPath(b, path).scene || "rooftops" }));
  if (act === "url") {
    const u = $("#imgUrl").value.trim();
    if (!/^https?:\/\//i.test(u)) return toast("Paste a full image URL starting with https://", { error: true });
    commit((b) => setPath(b, path, { src: u, credit: "", scene: getPath(b, path)?.scene }));
  }
  void p;
});
$("#tabPage").addEventListener("change", (e) => {
  if (e.target.id === "imgCredit" && ed.img) commit((b) => (getPath(b, ed.img).credit = e.target.value), { rerender: false });
});

$("#fileInput").addEventListener("change", async (e) => {
  const file = e.target.files[0]; e.target.value = "";
  if (!file || !ed.img) return;
  try {
    const src = await downscale(file, 2400);
    const path = ed.img;
    commit((b) => setPath(b, path, { src, credit: "", scene: getPath(b, path)?.scene }));
    toast("Photo placed. Drag it on the page to reframe.");
  } catch { toast("That file couldn't be read as an image.", { error: true }); }
});

async function downscale(file, max) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = Object.assign(document.createElement("canvas"), { width: Math.round(bmp.width * k), height: Math.round(bmp.height * k) });
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.88);
}

const META_FIELDS = [["city", "City"], ["country", "Country"], ["issue", "Issue"], ["season", "Season"], ["price", "Cover price"], ["tagline", "Tagline"], ["byline", "Byline"], ["url", "Live link (QR code)"]];
function renderBookTab() {
  const m = ed.book.meta, cur = m.theme || "couture";
  $("#tabBook").innerHTML = `
    <div class="sect"><h4>Theme</h4><div class="themes" role="radiogroup">
      ${Object.entries(catalog.themes).map(([k, t]) => `<button class="theme" role="radio" data-theme="${k}" aria-checked="${k === cur}">
        <span class="sw"><i style="background:${t.paper};border:1px solid #0001"></i><i style="background:${t.ink}"></i><i style="background:${t.accent}"></i></span>
        <span><b>${esc(t.name)}</b><span>${esc(t.blurb)}</span></span></button>`).join("")}
    </div></div>
    <div class="sect"><h4>Masthead & details</h4>
      ${META_FIELDS.map(([k, l]) => `<label class="field"><span>${l}</span><input data-meta="${k}" value="${esc(m[k] || "")}"></label>`).join("")}
    </div>
    <div class="sect"><h4>Draft</h4>
      <p class="tip">Edits save to this browser automatically. Download JSON to keep or share a copy.</p>
      <div class="row" style="margin-top:10px"><button class="btn btn-sm" id="revertBtn">Start over from sample</button></div>
    </div>`;
}
$("#tabBook").addEventListener("click", (e) => {
  const th = e.target.closest("[data-theme]");
  if (th) { commit((b) => (b.meta.theme = th.dataset.theme)); ui.theme = th.dataset.theme; store.set("gbs:theme", ui.theme); return; }
  if (e.target.closest("#revertBtn")) revertToSample();
});
let metaTimer;
$("#tabBook").addEventListener("input", (e) => {
  const k = e.target.dataset.meta; if (!k) return;
  commit((b) => (b.meta[k] = e.target.value), { path: "meta." + k, rerender: false });
  clearTimeout(metaTimer); metaTimer = setTimeout(rerender, 500);
});
$$(".tabs button").forEach((b) => (b.onclick = () => {
  $$(".tabs button").forEach((x) => x.classList.toggle("on", x === b));
  $("#tabPage").hidden = b.dataset.tab !== "page";
  $("#tabBook").hidden = b.dataset.tab !== "book";
}));

// ---- view, zoom, read mode ----

function setView(v, rerun = true) {
  ed.view = v; store.set("gbs:view", v);
  $$(".seg [data-view]").forEach((b) => b.classList.toggle("on", b.dataset.view === v));
  $("#readNav").hidden = v !== "read";
  if (!rerun || !doc()?.body) return;
  doc().body.className = v;
  markSelection();
  if (v === "read") showSpread(spreadOf(ed.sel), 0);
  applyZoom(front);
}
$$(".seg [data-view]").forEach((b) => (b.onclick = () => setView(b.dataset.view)));

function spreads() {
  const ps = $$(".page", doc()), out = [[ps[0]]];
  for (let i = 1; i < ps.length; i += 2) out.push(ps.slice(i, i + 2));
  return out;
}
function spreadOf(entry) {
  const first = entryPages(entry)[0];
  return Math.max(0, spreads().findIndex((s) => s.includes(first)));
}
function showSpread(k, dir) {
  const all = spreads();
  ed.read = Math.max(0, Math.min(k, all.length - 1));
  $$(".page", doc()).forEach((p) => p.classList.remove("cur", "solo"));
  const cur = all[ed.read];
  cur.forEach((p) => { p.classList.add("cur"); p.style.setProperty("--dx", `${dir * 30}px`); });
  if (cur.length === 1 && cur[0].dataset.side === "r") cur[0].classList.add("solo");
  $("#readPos").textContent = `${ed.read + 1} / ${all.length}`;
  $("#prevSpread").disabled = ed.read === 0;
  $("#nextSpread").disabled = ed.read === all.length - 1;
  doc().defaultView.scrollTo(0, 0);
}
$("#prevSpread").onclick = () => showSpread(ed.read - 1, -1);
$("#nextSpread").onclick = () => showSpread(ed.read + 1, 1);

function fitZoom() {
  const st = $("#stage"), cols = ed.view === "pages" ? 1 : 2;
  const zw = (st.clientWidth - 40) / (cols * PAGE_PX + 80);
  const zh = ed.view === "read" ? (st.clientHeight - 20) / (1039 + 120) : 9;
  return Math.max(0.2, Math.min(1.4, zw, zh));
}
function applyZoom(frame = front) {
  const z = ed.zoom ?? fitZoom();
  frame.contentDocument?.body?.style.setProperty("--z", z);
  $("#zoomFit").textContent = ed.zoom == null ? "Fit" : `${Math.round(z * 100)}%`;
}
$("#zoomIn").onclick = () => { ed.zoom = Math.min(2, (ed.zoom ?? fitZoom()) * 1.15); applyZoom(); };
$("#zoomOut").onclick = () => { ed.zoom = Math.max(0.15, (ed.zoom ?? fitZoom()) / 1.15); applyZoom(); };
$("#zoomFit").onclick = () => { ed.zoom = null; applyZoom(); };
addEventListener("resize", () => { if (!$("#edit").hidden) applyZoom(); });

// ---- export ----

$("#pdfBtn").onclick = async () => {
  const btn = $("#pdfBtn"), label = $("span", btn);
  btn.disabled = true; label.textContent = "Exporting…";
  btn.insertAdjacentHTML("afterbegin", '<i class="spinner"></i>'); $("svg", btn).style.display = "none";
  try {
    const r = await fetch("/api/pdf", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ book: ed.book }) });
    if (!r.ok) throw new Error(await r.text());
    const over = +r.headers.get("x-overflow");
    download(await r.blob(), `${slug(ed.book.meta.city)}-guidebook.pdf`);
    toast(over ? `PDF exported with ${over} overflow warning${over > 1 ? "s" : ""}. Check pages marked red.` : "PDF exported. Fonts embedded, text stays vector.", { ms: 5000 });
  } catch (e) {
    toast("Export failed: " + e.message, { error: true, ms: 7000 });
  } finally {
    btn.disabled = false; label.textContent = "Export PDF"; $(".spinner", btn)?.remove(); $("svg", btn).style.display = "";
  }
};
$("#jsonBtn").onclick = () => download(new Blob([JSON.stringify(ed.book, null, 2)], { type: "application/json" }), `${slug(ed.book.meta.city)}-guidebook.json`);
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "guidebook";
function download(blob, name) {
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

// ---- keyboard ----

function handleKeys(e) {
  if ($("#edit").hidden) return;
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  else if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
  else if (mod && e.key.toLowerCase() === "s") { e.preventDefault(); markDirty(); toast("Saved to this browser."); }
  else if (ed.view === "read" && !e.target.closest?.("[data-edit],input")) {
    if (e.key === "ArrowRight") showSpread(ed.read + 1, 1);
    if (e.key === "ArrowLeft") showSpread(ed.read - 1, -1);
  }
}
document.addEventListener("keydown", (e) => { if (!e.target.closest?.("input,textarea")) handleKeys(e); else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") handleKeys(e); });
$("#undoBtn").onclick = undo;
$("#redoBtn").onclick = redo;
$("#panelToggle").onclick = () => $("#inspector").classList.toggle("open");

// ---------- boot ----------

(async function boot() {
  try { catalog = await api.catalog(); }
  catch { document.body.innerHTML = "<p style='padding:40px'>Couldn't reach the studio server. Is <code>npm start</code> running?</p>"; return; }
  addEventListener("hashchange", route);
  route();
})();
