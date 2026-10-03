import { templates } from "./templates.js";
// Minimal schema check. In production, replace with a JSON Schema / Zod
// validator and feed its errors back to the LLM for a repair pass.
export function validate(book) {
  const errs = [];
  if (!book?.meta?.city) errs.push("meta.city is required");
  if (!Array.isArray(book?.pages) || !book.pages.length) errs.push("pages must be a non-empty array");
  (book?.pages || []).forEach((p, i) => {
    const tpl = templates[p?.type];
    if (!tpl) errs.push(`pages[${i}]: unknown type "${p?.type}"`);
    else if (p.layout && tpl.layouts && !tpl.layouts.includes(p.layout)) errs.push(`pages[${i}]: unknown layout "${p.layout}"`);
  });
  if (errs.length) throw new Error("Invalid book:\n - " + errs.join("\n - "));
}
