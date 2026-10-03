// A theme is a bundle of tokens: palette + type pairing. Switching theme
// restyles the whole book; content and layout stay put.
export const themes = {
  couture: {
    name: "Couture",
    blurb: "High-fashion editorial. Didone headlines, white space, a single red.",
    paper: "#ffffff", ink: "#111111", muted: "#6f6a64", accent: "#d0021b", soft: "#f3efe9", rule: "#111111",
    display: "'Bodoni Moda', 'Didot', serif", text: "'Source Serif 4', Georgia, serif", sans: "'Jost', 'Futura', sans-serif",
    displayWeight: 500,
  },
  azulejo: {
    name: "Azulejo",
    blurb: "Cobalt and cream, borrowed from the tiles on every facade.",
    paper: "#f7f1e5", ink: "#16243b", muted: "#5f6878", accent: "#1f4e8c", soft: "#ebe2cf", rule: "#1f4e8c",
    display: "'Playfair Display', Georgia, serif", text: "'Source Serif 4', Georgia, serif", sans: "'Jost', sans-serif",
    displayWeight: 700,
  },
  riviera: {
    name: "Riviera",
    blurb: "Sun-faded terracotta and blush, like a postcard left on the dash.",
    paper: "#fbf3ea", ink: "#2b211d", muted: "#86736a", accent: "#c4553a", soft: "#f3e1d3", rule: "#2b211d",
    display: "'Bodoni Moda', serif", text: "'Source Serif 4', Georgia, serif", sans: "'Jost', sans-serif",
    displayWeight: 400,
  },
};

export function themeCss(t) {
  return `:root{--paper:${t.paper};--ink:${t.ink};--muted:${t.muted};--accent:${t.accent};--soft:${t.soft};--rule:${t.rule};--display:${t.display};--text:${t.text};--sans:${t.sans};--dw:${t.displayWeight}}`;
}
