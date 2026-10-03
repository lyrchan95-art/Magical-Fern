// Shared PDF export: headless Chromium, vector text, embedded fonts.
// The same HTML the editor shows is what gets printed.
import { chromium } from "playwright";

let browserP;
const browser = () => (browserP ||= chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));

export async function exportPdf({ url, html }, { png } = {}) {
  const ctx = await (await browser()).newContext();
  const page = await ctx.newPage();
  try {
    if (url) await page.goto(url, { waitUntil: "load" });
    else await page.setContent(html, { waitUntil: "load" });
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
    const overflow = await page.evaluate(() => window.__overflow || []);
    const pdf = await page.pdf({ width: "210mm", height: "275mm", printBackground: true, preferCSSPageSize: true });
    let pngs = [];
    if (png) for (const el of await page.$$(".page")) pngs.push(await el.screenshot());
    return { pdf, overflow, pngs };
  } finally {
    await ctx.close();
  }
}

export async function closeBrowser() {
  if (browserP) (await browserP).close();
  browserP = undefined;
}
