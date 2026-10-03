// City Guidebook Studio: zero-framework dev server.
//   GET  /                 studio app
//   GET  /api/catalog      themes, layouts, starter pages, scenes, sample books
//   GET  /api/books/:id    a book's JSON
//   POST /api/render       book JSON -> rendered HTML (same HTML the PDF uses)
//   POST /api/pdf          book JSON -> PDF
//   GET  /api/scene/:name  an illustrated scene as SVG
import http from "node:http";
try { process.loadEnvFile(new URL("./.env", import.meta.url)); } catch {}
import { readFile, readdir } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { renderBook } from "./src/render.js";
import { exportPdf } from "./src/pdf.js";
import { themes } from "./src/themes.js";
import { templates, starters } from "./src/templates.js";
import { sceneNames, sceneSvg } from "./src/art.js";
import { aiEnabled, models, generateImage } from "./src/ai.js";
import { generateBook, rewritePage, photoPrompt, IMAGE_STYLES } from "./src/generate.js";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT) || 5173;
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon" };

const send = (res, code, body, type = "text/plain; charset=utf-8", extra = {}) => {
  res.writeHead(code, { "content-type": type, "cache-control": "no-store", ...extra });
  res.end(body);
};
const json = (res, obj, code = 200) => send(res, code, JSON.stringify(obj), "application/json");

async function body(req, limit = 60 * 1024 * 1024) {
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > limit) throw Object.assign(new Error("Payload too large"), { status: 413 }); chunks.push(c); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

async function listBooks() {
  const files = (await readdir(join(ROOT, "data"))).filter((f) => f.endsWith(".json"));
  return Promise.all(files.map(async (f) => {
    const b = JSON.parse(await readFile(join(ROOT, "data", f), "utf8"));
    return { id: f.replace(/\.json$/, ""), city: b.meta.city, country: b.meta.country };
  }));
}

async function serveStatic(res, dir, rel) {
  const file = normalize(join(ROOT, dir, rel));
  if (!file.startsWith(join(ROOT, dir))) return send(res, 403, "Forbidden");
  try { send(res, 200, await readFile(file), TYPES[extname(file)] || "application/octet-stream", dir === "fonts" ? { "cache-control": "max-age=86400", "access-control-allow-origin": "*" } : {}); }
  catch { send(res, 404, "Not found"); }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const p = decodeURIComponent(url.pathname);
  try {
    if (req.method === "GET" && (p === "/" || p === "/index.html")) return serveStatic(res, "app", "index.html");
    if (req.method === "GET" && p.startsWith("/app/")) return serveStatic(res, "app", p.slice(5));
    if (req.method === "GET" && p.startsWith("/fonts/")) return serveStatic(res, "fonts", p.slice(7));

    if (req.method === "GET" && p === "/api/catalog") {
      return json(res, {
        themes: Object.fromEntries(Object.entries(themes).map(([k, t]) => [k, { name: t.name, blurb: t.blurb, paper: t.paper, ink: t.ink, accent: t.accent, soft: t.soft }])),
        layouts: Object.fromEntries(Object.entries(templates).filter(([, t]) => t.layouts).map(([k, t]) => [k, t.layouts])),
        starters, scenes: sceneNames, books: await listBooks(),
      });
    }
    const m = p.match(/^\/api\/books\/([a-z0-9-]+)$/);
    if (req.method === "GET" && m) return serveStatic(res, "data", m[1] + ".json");
    const sc = p.match(/^\/api\/scene\/([a-z]+)\.svg$/);
    if (req.method === "GET" && sc) return send(res, 200, sceneSvg(sc[1]), "image/svg+xml", { "cache-control": "max-age=3600" });

    if (req.method === "POST" && p === "/api/render") {
      const { book, theme } = await body(req);
      return send(res, 200, await renderBook(book, { theme, base: "/" }), TYPES[".html"]);
    }
    if (req.method === "POST" && p === "/api/pdf") {
      const { book, theme } = await body(req);
      const html = await renderBook(book, { theme, base: `http://127.0.0.1:${PORT}/` });
      const { pdf, overflow } = await exportPdf({ html });
      const name = (book.meta.city || "guidebook").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      return send(res, 200, pdf, "application/pdf", { "content-disposition": `attachment; filename="${name}-guidebook.pdf"`, "x-overflow": String(overflow.length) });
    }
    // ---- AI (OpenRouter). The key never leaves the server. ----
    if (req.method === "GET" && p === "/api/ai/status") return json(res, { enabled: aiEnabled(), ...models() });
    if (req.method === "POST" && p === "/api/generate") {
      const { city, brief, images = "all", style = "photo", theme } = await body(req);
      if (!city || String(city).length > 80) return send(res, 400, "Give a city name.");
      const ac = new AbortController();
      res.on("close", () => { if (!res.writableEnded) ac.abort(); });
      res.writeHead(200, { "content-type": "application/x-ndjson", "cache-control": "no-store" });
      for await (const ev of generateBook({ city: String(city).trim(), brief: String(brief || "").slice(0, 400), images, style: IMAGE_STYLES.includes(style) ? style : "photo", theme }, { signal: ac.signal })) {
        if (ac.signal.aborted) break;
        res.write(JSON.stringify(ev) + "\n");
      }
      return res.end();
    }
    if (req.method === "POST" && p === "/api/image") {
      const { prompt, aspect = "3:4", city = "", style = "photo" } = await body(req);
      if (!prompt) return send(res, 400, "Describe the image.");
      return json(res, await generateImage(photoPrompt(city, String(prompt).slice(0, 600), style), aspect));
    }
    if (req.method === "POST" && p === "/api/rewrite") {
      const { city, page, instruction } = await body(req);
      return json(res, await rewritePage({ city, page, instruction: String(instruction || "").slice(0, 400) }));
    }
    send(res, 404, "Not found");
  } catch (e) {
    console.error(e);
    send(res, e.status || 500, e.message || "Server error");
  }
});

server.listen(PORT, () => {
  console.log(`City Guidebook Studio → http://localhost:${PORT}`);
  console.log(aiEnabled() ? `AI on: text ${models().text} · images ${models().image}` : "AI off: add OPENROUTER_API_KEY to .env to generate new cities");
});
