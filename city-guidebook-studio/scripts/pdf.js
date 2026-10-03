// usage: node scripts/pdf.js dist/lisbon.html [--png]
import { resolve, basename } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { exportPdf, closeBrowser } from "../src/pdf.js";
const src = resolve(process.argv[2] || "dist/lisbon.html");
const png = process.argv.includes("--png");
const { pdf, overflow, pngs } = await exportPdf({ url: "file://" + src }, { png });
if (overflow.length) console.warn("OVERFLOW WARNINGS:\n" + overflow.map((o) => ` - page ${o.page + 1} (${o.type}): ${o.text}…`).join("\n"));
else console.log("overflow check: all frames fit");
const out = src.replace(/\.html$/, ".pdf");
writeFileSync(out, pdf);
console.log("wrote", out);
if (png) {
  mkdirSync("dist/png", { recursive: true });
  pngs.forEach((b, i) => writeFileSync(`dist/png/${basename(out, ".pdf")}-${String(i + 1).padStart(2, "0")}.png`, b));
}
await closeBrowser();
