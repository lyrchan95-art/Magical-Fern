// usage: node scripts/pdf.js dist/lisbon.html [--png]
// Renders with headless Chromium: vector text, embedded fonts, one render path.
// Also runs an overflow check on every locked text frame.
import { chromium } from "playwright";
import { resolve, basename } from "node:path";
import { mkdirSync } from "node:fs";
const src = resolve(process.argv[2] || "dist/lisbon.html");
const png = process.argv.includes("--png");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage();
await page.goto("file://" + src, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);

const problems = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll(".page").forEach((pg, i) => {
    const r = pg.getBoundingClientRect();
    pg.querySelectorAll(".frame").forEach((f) => {
      const b = f.getBoundingClientRect();
      if (b.bottom > r.bottom - 22 || b.right > r.right + 1 || f.scrollWidth > f.clientWidth + 2)
        out.push(`page ${i + 1} (${pg.dataset.type}): "${f.textContent.slice(0, 40).trim()}…" overflows`);
    });
  });
  return out;
});
if (problems.length) console.warn("OVERFLOW WARNINGS:\n - " + problems.join("\n - "));
else console.log("overflow check: all frames fit");

const out = src.replace(/\.html$/, ".pdf");
await page.pdf({ path: out, width: "148mm", height: "210mm", printBackground: true, preferCSSPageSize: true });
console.log("wrote", out);
if (png) {
  mkdirSync("dist/png", { recursive: true });
  const els = await page.$$(".page");
  for (const [i, el] of els.entries()) await el.screenshot({ path: `dist/png/${basename(out, ".pdf")}-${String(i + 1).padStart(2, "0")}.png` });
}
await browser.close();
