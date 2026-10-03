import { jsonrepair } from "jsonrepair";

// OpenRouter client. The API key is read from the server environment only.
const BASE = () => process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
export const models = () => ({
  text: process.env.TEXT_MODEL || "qwen/qwen3-235b-a22b-2507",
  image: process.env.IMAGE_MODEL || "sourceful/riverflow-v2-fast",
});
export const aiEnabled = () => !!process.env.OPENROUTER_API_KEY;

async function call(body, { signal } = {}) {
  if (!aiEnabled()) throw Object.assign(new Error("No OPENROUTER_API_KEY configured on the server (.env)."), { status: 503 });
  const r = await fetch(`${BASE()}/chat/completions`, {
    method: "POST",
    signal,
    headers: {
      authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "content-type": "application/json",
      "http-referer": "http://localhost",
      "x-title": "Guidebook Studio",
    },
    body: JSON.stringify({ ...body, usage: { include: true } }),
  });
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  if (!r.ok || json?.error) {
    const msg = json?.error?.message || text.slice(0, 300) || r.statusText;
    throw Object.assign(new Error(`OpenRouter ${r.status}: ${msg}`), { status: r.status === 401 || r.status === 402 ? r.status : 502 });
  }
  return json;
}

const cost = (r) => Number(r?.usage?.cost) || 0;

// LLMs occasionally emit almost-JSON: an unescaped quote inside a string, a
// missing comma, a trailing comma, a code fence, chatter around the object, or a
// reply cut off at max_tokens. Try strict parsing first, then repair locally.
export function parseJson(s) {
  const t = String(s || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  const body = a >= 0 ? t.slice(a, b > a ? b + 1 : undefined) : t;
  let first;
  for (const attempt of [() => JSON.parse(t), () => JSON.parse(body), () => JSON.parse(jsonrepair(body)), () => JSON.parse(jsonrepair(t))]) {
    try {
      const v = attempt();
      if (v && typeof v === "object" && !Array.isArray(v)) return v;
    } catch (e) { first ||= e; }
  }
  throw Object.assign(new Error(`The model's reply wasn't valid JSON (${first?.message || "empty reply"})`), { code: "BAD_JSON", raw: t });
}

export async function chatJSON(messages, { maxTokens = 12000, temperature = 0.5, signal } = {}) {
  const r = await call({ model: models().text, messages, temperature, max_tokens: maxTokens, response_format: { type: "json_object" } }, { signal });
  const choice = r.choices?.[0];
  try {
    return { data: parseJson(choice?.message?.content), cost: cost(r), truncated: choice?.finish_reason === "length" };
  } catch (e) {
    e.cost = cost(r);
    throw e;
  }
}

// Image models on OpenRouter return images on the assistant message as base64 data URLs.
export async function generateImage(prompt, aspect = "3:4", { signal } = {}) {
  const body = { model: models().image, messages: [{ role: "user", content: prompt }], image_config: { aspect_ratio: aspect } };
  let r;
  try { r = await call({ ...body, modalities: ["image"] }, { signal }); }
  catch (e) {
    if (!/modalit/i.test(e.message)) throw e;
    r = await call({ ...body, modalities: ["image", "text"] }, { signal });
  }
  const url = r.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url) throw new Error("The image model returned no image");
  return { src: url, cost: cost(r) };
}
