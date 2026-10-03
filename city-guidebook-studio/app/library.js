// Local library of guidebooks, saved in this browser.
// IndexedDB holds full books (AI photos are large); localStorage is the fallback.

const DB = "guidebook-studio", STORE = "books", LS = "gbs:lib:";
let dbp;

function open() {
  if (!("indexedDB" in window)) return Promise.reject(new Error("no indexedDB"));
  return (dbp ||= new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "id" });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  }).catch((e) => { dbp = null; throw e; }));
}

async function tx(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode), s = t.objectStore(STORE);
    const req = fn(s);
    t.oncomplete = () => resolve(req?.result);
    t.onerror = t.onabort = () => reject(t.error || new Error("Storage failed"));
  });
}

const lsAll = () => {
  const out = [];
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(LS)) out.push(JSON.parse(localStorage.getItem(k))); } } catch {}
  return out;
};

export const library = {
  async list() {
    let recs;
    try { recs = await tx("readonly", (s) => s.getAll()); } catch { recs = lsAll(); }
    return recs.sort((a, b) => b.updatedAt - a.updatedAt);
  },
  async get(id) {
    try { return await tx("readonly", (s) => s.get(id)); }
    catch { try { return JSON.parse(localStorage.getItem(LS + id)); } catch { return null; } }
  },
  async put(id, book, extra = {}) {
    const prev = (await this.get(id)) || {};
    const rec = { ...prev, ...extra, id, book, city: book.meta.city, theme: book.meta.theme, updatedAt: Date.now(), createdAt: prev.createdAt || Date.now() };
    try { await tx("readwrite", (s) => s.put(rec)); }
    catch { localStorage.setItem(LS + id, JSON.stringify(rec)); }
    return rec;
  },
  async remove(id) {
    try { await tx("readwrite", (s) => s.delete(id)); } catch {}
    try { localStorage.removeItem(LS + id); } catch {}
  },
  // One-time move of drafts saved by the earlier version (localStorage gbs:book:<id>).
  async migrate() {
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (!k?.startsWith("gbs:book:")) continue;
        const v = JSON.parse(localStorage.getItem(k));
        if (v?.book && !(await this.get(k.slice(9)))) await this.put(k.slice(9), v.book);
        localStorage.removeItem(k);
      }
    } catch {}
  },
};

export const newId = (city) =>
  `${String(city).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "city"}-${Date.now().toString(36).slice(-5)}`;
