// Procedural placeholder "photography". In production an image slot holds
// { src, credit, license }; until real photos are sourced we render
// palette-tinted scenes so layouts can be judged at full fidelity.
const svg = (w, h, body) =>
  `url('data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}' preserveAspectRatio='xMidYMid slice'>${body}</svg>`
  ).replace(/'/g, "%27")}')`;

const scenes = {
  hills: (t) => svg(400, 400, `
    <defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='${t.sky}'/><stop offset='1' stop-color='${t.paper}'/></linearGradient></defs>
    <rect width='400' height='400' fill='url(#g)'/>
    <circle cx='290' cy='120' r='46' fill='${t.gold}'/>
    <path d='M0 250 Q80 170 170 235 T400 215 V400 H0Z' fill='${t.primary}' opacity='.35'/>
    <path d='M0 300 Q110 220 220 290 T400 270 V400 H0Z' fill='${t.accent}' opacity='.85'/>
    <g fill='${t.paper}'>${[...Array(14)].map((_, i) => `<rect x='${20 + i * 27}' y='${300 + ((i * 17) % 40)}' width='18' height='${14 + (i % 3) * 6}' opacity='.9'/>`).join("")}</g>
    <path d='M0 360 Q120 330 240 355 T400 345 V400 H0Z' fill='${t.primary}'/>`),
  tiles: (t) => svg(400, 400, `
    <rect width='400' height='400' fill='${t.paper}'/>
    ${[...Array(5)].map((_, r) => [...Array(5)].map((_, c) => {
      const x = c * 80, y = r * 80, k = (r + c) % 2;
      return `<g transform='translate(${x} ${y})'><rect width='80' height='80' fill='${k ? t.paper : t.sky}'/>
      <circle cx='40' cy='40' r='30' fill='none' stroke='${t.primary}' stroke-width='3'/>
      <path d='M40 12 L68 40 L40 68 L12 40Z' fill='${k ? t.accent : t.primary}' opacity='.9'/>
      <circle cx='40' cy='40' r='7' fill='${t.gold}'/></g>`;
    }).join("")).join("")}`),
  river: (t) => svg(400, 400, `
    <rect width='400' height='400' fill='${t.sky}'/>
    <rect y='0' width='400' height='170' fill='${t.sky}'/>
    <circle cx='110' cy='110' r='38' fill='${t.gold}'/>
    <path d='M0 230 Q100 200 200 225 T400 215 V400 H0Z' fill='${t.primary}'/>
    ${[...Array(8)].map((_, i) => `<path d='M${30 + i * 45} ${260 + (i % 3) * 30} h26' stroke='${t.paper}' stroke-width='3' opacity='.55'/>`).join("")}
    <path d='M0 200 L60 170 L90 195 L140 150 L190 190 L260 160 L330 195 L400 175 V215 H0Z' fill='${t.accent}'/>
    <rect x='250' y='120' width='14' height='70' fill='${t.ink}' opacity='.8'/><path d='M257 120 L300 150 H257Z' fill='${t.paper}'/>`),
};

export function art(name, theme) {
  return (scenes[name] || scenes.hills)(theme);
}
