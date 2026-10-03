import { readFileSync } from "node:fs";
import { templates } from "./templates.js";
import { themes, themeCss } from "./themes.js";
import { validate } from "./validate.js";

const css = readFileSync(new URL("./book.css", import.meta.url), "utf8");

// Runs inside the rendered document (editor iframe and PDF export alike):
// fits single-line mastheads to width, then flags any text frame that overflows.
const layoutScript = `(function(){
  function fitW(el){if(!el.dataset.fs)el.dataset.fs=el.style.fontSize||'';el.style.fontSize=el.dataset.fs;var s=parseFloat(getComputedStyle(el).fontSize);
    while(el.scrollWidth>el.clientWidth+1&&s>8){s*=.97;el.style.fontSize=s+'px'}}
  function check(){var out=[];document.querySelectorAll('[data-overflow]').forEach(function(e){e.removeAttribute('data-overflow')});
    document.querySelectorAll('.page').forEach(function(pg,i){
      pg.querySelectorAll('.frame,.pg').forEach(function(f){
        if(f.scrollHeight>f.clientHeight+2||f.scrollWidth>f.clientWidth+2){f.setAttribute('data-overflow','');
          out.push({page:i,type:pg.dataset.type,text:f.textContent.replace(/\\s+/g,' ').trim().slice(0,60)})}})});
    window.__overflow=out;return out}
  window.__layout=function(){document.querySelectorAll('[data-fitw]').forEach(fitW);return check()};
  document.fonts.ready.then(function(){window.__layout();window.__ready=true});
})();`;

export function pageCount(p) {
  const tpl = templates[p.type];
  return tpl.pages ? tpl.pages(p) : 1;
}

export async function renderBook(book, { theme, base = "" } = {}) {
  validate(book);
  const t = themes[theme || book.meta.theme] || themes.couture;

  // pass 1: page numbers (for the contents page and folios)
  let n = 1;
  const starts = book.pages.map((p) => { const s = n; n += pageCount(p); return s; });
  const toc = book.pages
    .map((p, i) => ({ ...p, n: starts[i] }))
    .filter((p) => !["cover", "contents", "back"].includes(p.type) && p.heading)
    .map(({ n, kicker, heading, deck }) => ({ n, kicker, heading, deck }));

  // pass 2: render
  const out = [];
  for (const [i, p] of book.pages.entries()) {
    const ctx = { book, page: p, base: `pages.${i}`, n: starts[i], toc, theme: t };
    const htmls = await templates[p.type].render(p, ctx);
    htmls.forEach((h, k) =>
      out.push(`<section class="page page-${p.type}" data-type="${p.type}" data-index="${i}" data-sub="${k}" data-n="${starts[i] + k}">${h}</section>`));
  }
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">${base ? `<base href="${base}">` : ""}
<title>${book.meta.city} — The City Guidebook</title>
<style>${themeCss(t)}</style><style>${css}</style></head><body>${out.join("\n")}<script>${layoutScript}</script></body></html>`;
}
