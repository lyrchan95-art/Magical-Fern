// A theme is a bundle of tokens. Switching theme restyles the whole book.
export const themes = {
  tile: {
    name: "Azulejo",
    paper: "#f6efe0", ink: "#1d2433", muted: "#6b6a64",
    primary: "#1f4e8c", accent: "#d9593d", gold: "#e6a935", sky: "#bcd6e6", soft: "#e9dfc8",
    radius: "2mm", tape: "rgba(230,169,53,.75)",
  },
  postcard: {
    name: "Retro Postcard",
    paper: "#fbf3e4", ink: "#2b2320", muted: "#7a6d63",
    primary: "#c8402f", accent: "#1f7a7a", gold: "#f0b43c", sky: "#f2c9a0", soft: "#f0e2c8",
    radius: "0mm", tape: "rgba(31,122,122,.6)",
  },
};

export function themeCss(t) {
  return `:root{--paper:${t.paper};--ink:${t.ink};--muted:${t.muted};--primary:${t.primary};--accent:${t.accent};--gold:${t.gold};--sky:${t.sky};--soft:${t.soft};--radius:${t.radius};--tape:${t.tape}}`;
}
