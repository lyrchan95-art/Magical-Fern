import { readFileSync } from "node:fs";
import { templates } from "./templates.js";
import { themes, themeCss } from "./themes.js";
import { validate } from "./validate.js";

const css = readFileSync(new URL("./book.css", import.meta.url), "utf8");

export async function renderBook(book, themeOverride) {
  validate(book);
  const t = themes[themeOverride || book.meta.theme] || themes.tile;
  const ctx = { meta: book.meta, hero: book.hero, t };
  const pages = [];
  for (const [i, p] of book.pages.entries()) {
    const inner = await templates[p.type](p, { ...ctx, n: i + 1 });
    pages.push(`<section class="page page-${p.type}" data-type="${p.type}">${inner}</section>`);
  }
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${book.meta.city} Guidebook</title>
<style>${themeCss(t)}</style><style>${css}</style></head><body>${pages.join("\n")}</body></html>`;
}
