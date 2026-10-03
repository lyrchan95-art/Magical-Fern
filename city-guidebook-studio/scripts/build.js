// usage: node scripts/build.js [data.json] [theme]  -> dist/<city>[-theme].html
import { readFileSync, writeFileSync, mkdirSync, cpSync } from "node:fs";
import { renderBook } from "../src/render.js";
const file = process.argv[2] || "data/lisbon.json";
const theme = process.argv[3];
const book = JSON.parse(readFileSync(file, "utf8"));
mkdirSync("dist", { recursive: true });
cpSync("fonts", "dist/fonts", { recursive: true });
const out = `dist/${book.meta.city.toLowerCase()}${theme ? "-" + theme : ""}.html`;
writeFileSync(out, await renderBook(book, { theme }));
console.log("wrote", out);
