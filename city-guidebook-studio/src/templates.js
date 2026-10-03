import QRCode from "qrcode";
import { imageUrl } from "./art.js";

export const esc = (s = "") =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const pad2 = (n) => String(n).padStart(2, "0");

// Builders bound to a page's JSON path, so every editable node knows where
// its content lives (data-edit / data-img). The editor writes back by path.
function kit(ctx) {
  const at = (k) => (k.startsWith("meta.") ? k : `${ctx.base}.${k}`);
  const get = (k) => k.split(".").reduce((o, x) => o?.[x], k.startsWith("meta.") ? ctx.book : ctx.page);
  return {
    t: (k, tag = "span", cls = "") => `<${tag} class="${cls}" data-edit="${at(k)}">${esc(get(k.replace(/^meta\./, "meta.")) ?? "")}</${tag}>`,
    im: (k, cls = "", inner = "") => {
      const img = get(k) || {};
      return `<div class="img ${cls}" data-img="${at(k)}" style="background-image:${imageUrl(img)};background-position:${esc(img.pos || "50% 50%")}">${inner}</div>`;
    },
  };
}

function folio(ctx, k) {
  const n = ctx.n + k, left = n % 2 === 0;
  const a = `<b>${pad2(n)}</b>`, b = left ? "The City Guidebook" : `${esc(ctx.book.meta.city)} · ${esc(ctx.book.meta.season)}`;
  return `<div class="folio ${left ? "l" : "r"}">${left ? a + "<span>" + b + "</span>" : "<span>" + b + "</span>" + a}</div>`;
}

// Each template: { pages(p) -> number of physical pages, render(p, ctx) -> [html...] }
export const templates = {
  cover: {
    render(p, ctx) {
      const { t, im } = kit(ctx), m = ctx.book.meta;
      const size = Math.min(52, 185 / (m.city.length * 0.74));
      return [`
        ${im("image", "full")}
        <div class="scrim-b"></div>
        <header class="cv-top">
          <h1 class="masthead" data-fitw style="font-size:${size.toFixed(1)}mm" data-edit="meta.city">${esc(m.city)}</h1>
          <div class="cv-strip"><span>The City Guidebook</span><span data-edit="meta.season">${esc(m.season)}</span><span data-edit="meta.issue">${esc(m.issue)}</span><span data-edit="meta.price">${esc(m.price)}</span></div>
        </header>
        ${p.flash ? t("flash", "div", "cv-flash") : ""}
        <div class="cv-lines">
          <div class="cv-lead">${t("lead.big", "b")}${t("lead.small", "span")}</div>
          ${(p.lines || []).map((_, i) => `<div class="cv-line">${t(`lines.${i}.kicker`, "em")}${t(`lines.${i}.text`, "span")}</div>`).join("")}
        </div>
        <div class="cv-feature">${t("feature", "h2")}${t("meta.tagline", "p")}</div>
        <div class="barcode"><i></i><span>${esc(m.issue)}</span></div>`];
    },
  },

  contents: {
    render(p, ctx) {
      const { t, im } = kit(ctx);
      return [`
        <div class="ct-grid">
          <div class="ct-list frame">
            <div class="kicker">${esc(ctx.book.meta.issue)} · ${esc(ctx.book.meta.season)}</div>
            ${t("heading", "h2", "display xl")}
            <ol>${ctx.toc.map((e) => `<li><b>${pad2(e.n)}</b><div><em>${esc(e.kicker || "")}</em><strong>${esc(e.heading)}</strong>${e.deck ? `<span>${esc(e.deck)}</span>` : ""}</div></li>`).join("")}</ol>
          </div>
          <figure class="ct-fig">${im("image", "fill")}${t("caption", "figcaption")}</figure>
        </div>${folio(ctx, 0)}`];
    },
  },

  letter: {
    render(p, ctx) {
      const { t, im } = kit(ctx);
      return [`
        <div class="pg">
          ${t("kicker", "div", "kicker")}
          ${t("heading", "h2", "display l italic")}
          <div class="lt-grid">
            ${im("image", "fill")}
            <div class="lt-text frame">
              <div class="body dropcap lede">${p.body.map((_, i) => t(`body.${i}`, "p")).join("")}<p class="sig">${t("signoff", "span")}</p></div>
              <blockquote class="pull">${t("quote", "span")}</blockquote>
            </div>
          </div>
        </div>${folio(ctx, 0)}`];
    },
  },

  glance: {
    render(p, ctx) {
      const { t, im } = kit(ctx);
      return [`
        ${im("image", "band")}
        <div class="pg below-band">
          ${t("kicker", "div", "kicker")}${t("heading", "h2", "display l")}
          <dl class="facts">${p.facts.map((_, i) => `<div>${t(`facts.${i}.label`, "dt")}${t(`facts.${i}.value`, "dd")}</div>`).join("")}</dl>
          <div class="tips"><h3 class="sub">Insider tips</h3>${p.tips.map((_, i) => `<div><b>${pad2(i + 1)}</b>${t(`tips.${i}`, "p")}</div>`).join("")}</div>
        </div>${folio(ctx, 0)}`];
    },
  },

  map: {
    render(p, ctx) {
      const { t } = kit(ctx);
      return [`
        <div class="pg">
          ${t("kicker", "div", "kicker")}${t("heading", "h2", "display l")}
          <div class="map">
            <svg viewBox="0 0 100 70" preserveAspectRatio="none">
              <rect width="100" height="70" fill="var(--soft)"/>
              <path d="M0 58 C18 60 30 66 48 63 S78 52 100 54 V70 H0Z" fill="#c9dbe6"/>
              <path d="M8 22 q6 -4 12 0 t10 6 q-6 6 -14 4z" fill="#d6dfc9"/><path d="M62 16 q8 -5 14 1 t-2 9 q-8 2 -12 -4z" fill="#d6dfc9"/>
              <g stroke="var(--paper)" stroke-width="1.1" fill="none">
                <path d="M0 40 C22 38 44 46 100 40"/><path d="M0 26 C30 22 58 30 100 24"/><path d="M28 0 C32 22 30 40 40 62"/>
                <path d="M54 0 C52 20 56 40 52 60"/><path d="M76 0 C72 22 80 40 74 56"/><path d="M0 50 C24 52 52 58 100 48"/>
              </g>
              <g stroke="var(--paper)" stroke-width=".4" fill="none" opacity=".9">
                ${[...Array(14)].map((_, i) => `<path d="M${i * 7.5} 0 L${i * 7.5 + 4} 56"/>`).join("")}
                ${[...Array(8)].map((_, i) => `<path d="M0 ${i * 7} L100 ${i * 7 + 2}"/>`).join("")}
              </g>
              <text x="70" y="65" font-size="2.6" font-style="italic" fill="#6b8aa0" font-family="serif" letter-spacing=".4">Rio Tejo</text>
            </svg>
            ${p.pins.map((q, i) => `<div class="pin" style="left:${q.x}%;top:${q.y}%"><b>${i + 1}</b><span>${esc(q.label)}</span></div>`).join("")}
            <div class="compass">N</div>
          </div>
          <ol class="legend">${p.pins.map((_, i) => `<li><b>${pad2(i + 1)}</b><div>${t(`pins.${i}.label`, "strong")}${t(`pins.${i}.note`, "span")}</div></li>`).join("")}</ol>
        </div>${folio(ctx, 0)}`];
    },
  },

  neighborhood: {
    layouts: ["feature", "compact"],
    pages: (p) => (p.layout === "compact" ? 1 : 2),
    render(p, ctx) {
      const { t, im } = kit(ctx);
      const places = `<ol class="places">${p.places.map((_, i) => `<li><b>${pad2(i + 1)}</b><div>${t(`places.${i}.name`, "strong")}${t(`places.${i}.tag`, "em")}${t(`places.${i}.note`, "p")}</div></li>`).join("")}</ol>`;
      if (p.layout === "compact") {
        return [`
          ${im("image", "top58", `<div class="scrim-b"></div><div class="over-b">${t("kicker", "div", "kicker light")}${t("heading", "h2", "display xl light")}</div>`)}
          <div class="pg below-58 nb-compact">
            <div class="body dropcap frame">${t("story", "p")}</div>
            <div class="frame">${places}</div>
          </div>${folio(ctx, 0)}`];
      }
      return [
        `${im("image", "full")}<div class="scrim-b tall"></div>
         <div class="opener">
           ${t("kicker", "div", "kicker light")}
           ${t("heading", "h2", "display xxl light")}
           ${t("deck", "p", "deck light")}
           <div class="byline light">Words by <span data-edit="meta.byline">${esc(ctx.book.meta.byline)}</span></div>
         </div>`,
        `<div class="pg">
           <div class="nb-head">${t("kicker", "div", "kicker")}<div class="rule"></div><span class="nb-name">${esc(p.heading)}</span></div>
           <div class="nb-top">
             <div class="body dropcap lede frame">${t("story", "p")}</div>
             ${im("inset", "fill")}
           </div>
           <blockquote class="pull wide">${t("quote", "span")}</blockquote>
           <h3 class="sub">Where to go</h3>
           <div class="nb-places frame">${places}</div>
         </div>${folio(ctx, 1)}`,
      ];
    },
  },

  eat: {
    layouts: ["grid", "list"],
    render(p, ctx) {
      const { t, im } = kit(ctx);
      const head = `${t("kicker", "div", "kicker")}${t("heading", "h2", "display xl")}${t("deck", "p", "deck")}`;
      if (p.layout === "list") {
        return [`<div class="pg">${head}
          <ol class="eat-list frame">${p.items.map((_, i) => `<li><b>${pad2(i + 1)}</b><div><div class="row">${t(`items.${i}.name`, "strong")}<i></i>${t(`items.${i}.price`, "span", "price")}</div>${t(`items.${i}.kind`, "em")}${t(`items.${i}.note`, "p")}</div></li>`).join("")}</ol>
          ${t("note", "p", "verify")}</div>${folio(ctx, 0)}`];
      }
      return [`<div class="pg">${head}
        <div class="eat-grid frame">${p.items.map((_, i) => `<article>${im(`items.${i}.image`, "sq")}
          <div class="meta"><b>${pad2(i + 1)}</b>${t(`items.${i}.kind`, "span")}${t(`items.${i}.price`, "span", "price")}</div>
          ${t(`items.${i}.name`, "h3")}${t(`items.${i}.note`, "p")}</article>`).join("")}</div>
        ${t("note", "p", "verify")}</div>${folio(ctx, 0)}`];
    },
  },

  sight: {
    render(p, ctx) {
      const { t, im } = kit(ctx);
      return [`
        ${im("image", "top62", `<div class="scrim-b"></div><div class="over-b">${t("kicker", "div", "kicker light")}${t("heading", "h2", "display xxl light")}</div>`)}
        <div class="pg below-62 sg-grid">
          <div class="frame">${t("caption", "p", "deck")}<div class="body dropcap">${t("body", "p")}</div></div>
          <div class="stats">${p.stats.map((_, i) => `<div>${t(`stats.${i}.value`, "b")}${t(`stats.${i}.label`, "span")}</div>`).join("")}</div>
        </div>${folio(ctx, 0)}`];
    },
  },

  gems: {
    render(p, ctx) {
      const { t, im } = kit(ctx);
      return [`
        <div class="pg">
          <div class="gm-head">${t("kicker", "div", "kicker")}${t("heading", "h2", "display xl")}</div>
          <div class="gm-grid">${p.gems.map((_, i) => `<figure class="g${i}">${im(`gems.${i}.image`, "fill")}
            <figcaption><b>${pad2(i + 1)}</b><div>${t(`gems.${i}.name`, "strong")}${t(`gems.${i}.note`, "span")}</div></figcaption></figure>`).join("")}</div>
        </div>${folio(ctx, 0)}`];
    },
  },

  itinerary: {
    render(p, ctx) {
      const { t } = kit(ctx);
      return [`
        <div class="pg">
          ${t("kicker", "div", "kicker")}${t("heading", "h2", "display xl")}
          <div class="it-grid">${p.days.map((d, i) => `<section class="frame"><div class="it-day">Day<b>${pad2(i + 1)}</b></div>${t(`days.${i}.title`, "h3", "display s italic")}
            <ul>${d.stops.map((_, j) => `<li>${t(`days.${i}.stops.${j}.time`, "time")}${t(`days.${i}.stops.${j}.text`, "span")}</li>`).join("")}</ul></section>`).join("")}</div>
        </div>${folio(ctx, 0)}`];
    },
  },

  practical: {
    render(p, ctx) {
      const { t } = kit(ctx);
      return [`
        <div class="pg">
          ${t("kicker", "div", "kicker")}${t("heading", "h2", "display xl")}
          <div class="pr-grid">${p.sections.map((s, i) => `<section class="frame">${t(`sections.${i}.title`, "h3", "sub")}
            <ul>${s.items.map((_, j) => t(`sections.${i}.items.${j}`, "li")).join("")}</ul></section>`).join("")}</div>
          <div class="phrases"><h3 class="display s italic">Say it like a local</h3>
            <dl>${p.phrases.map((_, i) => `<div>${t(`phrases.${i}.pt`, "dt")}${t(`phrases.${i}.en`, "dd")}</div>`).join("")}</dl></div>
          <p class="verify">Prices, hours and closures change. Verify before you travel.</p>
        </div>${folio(ctx, 0)}`];
    },
  },

  back: {
    async render(p, ctx) {
      const { t, im } = kit(ctx), m = ctx.book.meta;
      const qr = await QRCode.toString("https://" + m.url, { type: "svg", margin: 0, color: { dark: "#111111", light: "#0000" } });
      return [`
        ${im("image", "full")}
        <div class="bk-card">
          <div class="kicker">${esc(m.city)} · ${esc(m.issue)}</div>
          ${t("heading", "h2", "display l")}
          <div class="qr">${qr}</div>
          <p class="bk-url">${esc(m.url)}</p>
          <p class="bk-note">Scan for the live, always-current edition.</p>
        </div>
        <p class="credits">Typefaces: Bodoni Moda, Source Serif 4, Jost, Playfair Display (SIL Open Font License). Prices, hours and closures change: verify before you travel.</p>`];
    },
  },
};

// Starter content for "Add page" in the editor.
export const starters = {
  letter: { type: "letter", kicker: "A note", heading: "New headline", image: { scene: "balcony" }, body: ["Start writing here."], quote: "A line worth pulling out.", signoff: "The Editors" },
  glance: { type: "glance", kicker: "The essentials", heading: "At a glance", image: { scene: "river" }, facts: [{ label: "Label", value: "Value" }], tips: ["A useful tip."] },
  neighborhood: { type: "neighborhood", layout: "feature", kicker: "Neighbourhood", heading: "New district", deck: "One line that sells it.", image: { scene: "rooftops" }, inset: { scene: "tiles" }, story: "Tell the story of this place.", quote: "A memorable line.", places: [{ name: "A place", tag: "Sight", note: "Why it matters." }] },
  eat: { type: "eat", layout: "grid", kicker: "The list", heading: "Eat & Drink", deck: "Tables worth crossing town for.", items: [{ name: "Restaurant", kind: "Cuisine", price: "€€", note: "What to order.", image: { scene: "cafe" } }], note: "Verify before you go." },
  sight: { type: "sight", kicker: "Culture", heading: "A big sight", image: { scene: "arches" }, body: "Describe it.", caption: "A caption.", stats: [{ value: "1900", label: "Built" }] },
  gems: { type: "gems", kicker: "In the know", heading: "Hidden gems", gems: [0, 1, 2, 3].map(() => ({ name: "A secret", note: "Why it's special.", image: { scene: "night" } })) },
  itinerary: { type: "itinerary", kicker: "The plan", heading: "48 hours", days: [{ title: "Day one", stops: [{ time: "09:00", text: "Breakfast" }] }] },
  practical: { type: "practical", kicker: "The edit", heading: "Know before you go", sections: [{ title: "Getting around", items: ["A tip."] }], phrases: [{ pt: "Olá", en: "Hello" }] },
};
