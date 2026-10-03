import QRCode from "qrcode";
import { art } from "./art.js";

export const esc = (s = "") =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const img = (scene, t, cls = "") => `<div class="img ${cls}" style="background-image:${art(scene, t)}"></div>`;
const folio = (ctx, label) =>
  `<div class="folio"><span>${esc(ctx.meta.city)} · ${esc(label)}</span><span>${String(ctx.n).padStart(2, "0")}</span></div>`;
const rot = (i) => [-3, 2.5, -1.5, 3][i % 4];

// Every template: (page, ctx) => inner HTML. Text lives in locked frames
// (.frame) that the overflow checker measures.
export const templates = {
  cover: (p, c) => `
    ${img(c.hero.scene, c.t, "full")}
    <div class="cover-shade"></div>
    <div class="tape" style="top:14mm;left:12mm;transform:rotate(-4deg)">${esc(c.meta.issue)} · ${esc(c.meta.season)}</div>
    <div class="cover-text">
      <div class="kicker light">The City Guidebook</div>
      <h1 class="masthead frame">${esc(c.meta.city)}</h1>
      <p class="cover-sub script">${esc(c.meta.tagline)}</p>
    </div>
    <div class="cover-foot">${esc(c.meta.country)}</div>`,

  letter: (p, c) => `
    <div class="pad">
      <div class="kicker">Editor's letter</div>
      <h2 class="frame">${esc(p.heading)}</h2>
      <div class="cols">
        <div class="body dropcap frame">${p.body.map((x) => `<p>${esc(x)}</p>`).join("")}<p class="sign script">— ${esc(p.signoff)}</p></div>
      </div>
      <div class="polaroid" style="--r:3deg;right:10mm;bottom:22mm;width:52mm">${img(p.scene, c.t)}<span class="script">golden hour, always</span></div>
      <blockquote class="pull frame">${esc(p.quote)}</blockquote>
    </div>${folio(c, "Welcome")}`,

  glance: (p, c) => `
    ${img(p.scene, c.t, "band")}
    <div class="pad under-band">
      <div class="kicker">Essentials</div>
      <h2 class="frame">${esc(p.heading)}</h2>
      <dl class="facts">${p.facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
      <div class="panel"><h3 class="script">Insider tips</h3><ul class="body frame">${p.tips.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
    </div>${folio(c, "At a glance")}`,

  map: (p, c) => `
    <div class="pad">
      <div class="kicker">Orientation</div><h2 class="frame">${esc(p.heading)}</h2>
      <div class="map">
        <svg viewBox="0 0 100 80" preserveAspectRatio="none">
          <rect width="100" height="80" fill="var(--paper)"/>
          <path d="M0 66 C20 72 38 82 58 74 S90 70 100 76 V80 H0Z" fill="var(--sky)"/>
          <path d="M0 74 C20 80 40 90 60 82 S92 78 100 84 V90 H0Z" fill="var(--sky)"/>
          ${[[8,6,22,16],[34,10,26,18],[66,8,26,22],[10,30,24,18],[38,34,20,16],[62,36,30,18]].map(([x,y,w,h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="var(--soft)"/>`).join("")}
          <path d="M0 28 C30 26 50 34 100 30 M30 0 C34 30 28 50 40 80 M70 0 C66 24 74 50 66 80" stroke="var(--paper)" stroke-width="2.2" fill="none"/>
        </svg>
        ${p.pins.map((q) => `<span class="pin" style="left:${q.x}%;top:${q.y}%"><i>${q.n}</i></span>`).join("")}
      </div>
      <ol class="legend body frame">${p.legend.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>
    </div>${folio(c, "Map")}`,

  neighborhood: (p, c) => `
    <div class="hero-top">${img(p.scene, c.t, "full")}<div class="cover-shade soft"></div>
      <div class="hero-title"><div class="kicker light">${esc(p.kicker)}</div><h2 class="frame big">${esc(p.heading)}</h2></div></div>
    <div class="pad under-hero">
      <p class="lede frame">${esc(p.story)}</p>
      <ol class="places">${p.places.map(([n, tag, d], i) => `<li><span class="num">${i + 1}</span><div><b>${esc(n)}</b> <em class="tag">${esc(tag)}</em><p class="frame">${esc(d)}</p></div></li>`).join("")}</ol>
    </div>${folio(c, p.heading)}`,

  eat: (p, c) => `
    <div class="pad">
      <div class="kicker">Table talk</div><h2 class="frame">${esc(p.heading)}</h2>
      <div class="grid2">${p.items.map(([n, kind, price, d], i) => `
        <article class="card" style="--r:${rot(i) / 4}deg"><div class="meta"><span>${esc(kind)}</span><span class="price">${esc(price)}</span></div>
        <h3>${esc(n)}</h3><p class="frame">${esc(d)}</p></article>`).join("")}</div>
      <p class="verify script">⚑ ${esc(p.note)}</p>
    </div>${folio(c, "Eat & Drink")}`,

  sight: (p, c) => `
    <div class="hero-top tall">${img(p.scene, c.t, "full")}<div class="cover-shade soft"></div>
      <div class="hero-title"><div class="kicker light">${esc(p.kicker)}</div><h2 class="frame big">${esc(p.heading)}</h2></div></div>
    <div class="pad under-hero tallpad">
      <p class="body dropcap frame">${esc(p.body)}</p>
      <p class="caption script">${esc(p.caption)}</p>
      <div class="stats">${p.stats.map(([v, l]) => `<div><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join("")}</div>
    </div>${folio(c, "Sights")}`,

  gems: (p, c) => `
    <div class="pad">
      <div class="kicker">Off the beaten path</div><h2 class="frame">${esc(p.heading)}</h2>
      <div class="collage">${p.gems.map(([t, d, s], i) => `
        <figure class="polaroid pos${i}" style="--r:${rot(i)}deg">${img(s, c.t)}
          <figcaption><b class="script">${esc(t)}</b><span class="frame">${esc(d)}</span></figcaption></figure>`).join("")}</div>
      <div class="stamp">Locals<br>only</div>
    </div>${folio(c, "Hidden gems")}`,

  itinerary: (p, c) => `
    <div class="pad">
      <div class="kicker">Plan</div><h2 class="frame">${esc(p.heading)}</h2>
      ${p.days.map(([t, rows]) => `<section class="day"><h3>${esc(t)}</h3>
        <ul class="timeline">${rows.map(([h, x]) => `<li><time>${esc(h)}</time><span class="frame">${esc(x)}</span></li>`).join("")}</ul></section>`).join("")}
    </div>${folio(c, "Itinerary")}`,

  practical: (p, c) => `
    <div class="pad">
      <div class="kicker">Practical</div><h2 class="frame">${esc(p.heading)}</h2>
      ${p.sections.map(([t, items]) => `<section class="prac"><h3>${esc(t)}</h3><ul class="body frame">${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></section>`).join("")}
      <div class="panel"><h3 class="script">Say it like a local</h3>
        <dl class="phrases">${p.phrases.map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join("")}</dl></div>
    </div>${folio(c, "Good to know")}`,

  back: async (p, c) => {
    const qr = await QRCode.toString("https://" + c.meta.url, { type: "svg", margin: 0, color: { dark: c.t.ink, light: "#0000" } });
    return `<div class="back"><div class="kicker light">${esc(c.meta.city)} · ${esc(c.meta.issue)}</div>
      <h2 class="big light">Keep exploring</h2>
      <div class="qr">${qr}</div><p class="script light">Scan for the live, always-current version</p>
      <p class="credits">Layout by City Guidebook Studio · Typefaces: Playfair Display, DM Sans, Caveat (SIL OFL)<br>Prices, hours and closures change: verify before you travel.</p></div>`;
  },
};
