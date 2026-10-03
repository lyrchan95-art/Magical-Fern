// Dev-only stand-in for OpenRouter's /chat/completions, mirroring its response
// shapes, so the pipeline can be tested offline:
//   node scripts/mock-openrouter.js   then   OPENROUTER_BASE_URL=http://127.0.0.1:5199 npm start
import http from "node:http";
import { readFileSync } from "node:fs";
import { sceneSvg, sceneNames } from "../src/art.js";
const lisbon = JSON.parse(readFileSync(new URL("../data/lisbon.json", import.meta.url), "utf8"));
let n = 0;
http.createServer(async (req, res) => {
  let raw = ""; for await (const c of req) raw += c;
  const body = JSON.parse(raw || "{}");
  if (!/^Bearer sk-or-/.test(req.headers.authorization || "")) { res.writeHead(401, { "content-type": "application/json" }); return res.end(JSON.stringify({ error: { message: "No auth credentials found" } })); }
  console.log("mock:", body.model, body.modalities ? `image ${body.image_config?.aspect_ratio}` : "text", body.usage?.include ? "usage" : "");
  await new Promise((r) => setTimeout(r, 150));
  let message;
  if (body.modalities) {
    if (!body.modalities.includes("image")) throw new Error("bad modalities");
    const svg = sceneSvg(sceneNames[n++ % sceneNames.length]);
    message = { role: "assistant", content: "", images: [{ type: "image_url", image_url: { url: "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64") } }] };
  } else {
    const last = body.messages.at(-1).content;
    const city = (last.match(/issue for: (.+)/) || [])[1] || "Porto";
    let out;
    if (/one page of the/.test(last)) { const page = JSON.parse(last.match(/as JSON:\n(.+)\n\nEditor/s)[1]); out = { ...page, heading: (page.heading || "") + " (rewritten)" }; }
    else {
      out = JSON.parse(JSON.stringify(lisbon).replaceAll("Lisbon", city));
      out.pages.forEach((p) => { for (const k of ["image", "inset"]) if (p[k]) p[k].prompt = `${p.heading || p.type} in ${city}, golden hour`; });
      delete out.meta.url;
    }
    message = { role: "assistant", content: "```json\n" + JSON.stringify(out) + "\n```" };
  }
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ id: "mock", model: body.model, choices: [{ index: 0, message, finish_reason: "stop" }], usage: { prompt_tokens: 10, completion_tokens: 10, cost: body.modalities ? 0.02 : 0.0012 } }));
}).listen(5199, () => console.log("mock OpenRouter on :5199"));
