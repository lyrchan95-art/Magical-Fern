// Illustrated placeholder imagery. An image slot is { src, credit, pos } for a
// real photo, or { scene } for one of these drawn scenes. Scenes use a fixed
// natural palette (like photography would), not theme colours.

const C = {
  sky: "#f6dcb4", haze: "#eaa978", sun: "#f8d48a", terra: "#c8553d", terraD: "#9e3d2b",
  ochre: "#e0a33a", cream: "#f4ead8", pink: "#e8b4a0", yellow: "#f0c96a", blue: "#2f5d8a",
  navy: "#1d2a3a", river: "#5b8db3", stone: "#dccbad", stoneD: "#b09a78", green: "#4f6b47",
  white: "#fbf7ef", glass: "#33475b",
};
const walls = [C.cream, C.pink, C.yellow, "#f2d7c4", "#cfe0e6", C.white, "#e9c39b"];

function rng(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

// Film grain as a small tiled swatch: a full-size noise filter would be
// rasterized per image at print resolution and bloat the PDF.
const grain = `<filter id='grain' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .22 0'/></filter>
<pattern id='gp' width='96' height='96' patternUnits='userSpaceOnUse'><rect width='96' height='96' filter='url(#grain)'/></pattern>`;
const finish = (w, h) =>
  `<rect width='${w}' height='${h}' fill='url(#gp)'/><rect width='${w}' height='${h}' fill='url(#vig)'/>`;
const vig = `<radialGradient id='vig' cx='.5' cy='.45' r='.75'><stop offset='.6' stop-color='#000' stop-opacity='0'/><stop offset='1' stop-color='#000' stop-opacity='.28'/></radialGradient>`;

function house(x, y, w, h, r, opts = {}) {
  const wall = walls[Math.floor(r() * walls.length)];
  const roofH = w * (0.12 + r() * 0.1);
  let s = `<rect x='${x}' y='${y}' width='${w}' height='${h}' fill='${wall}'/><rect x='${x}' y='${y}' width='${w * 0.12}' height='${h}' fill='#000' opacity='.06'/>`;
  if (r() > 0.25) s += `<path d='M${x - 4} ${y} L${x + w * 0.18} ${y - roofH} L${x + w * 0.82} ${y - roofH} L${x + w + 4} ${y}Z' fill='${r() > 0.35 ? C.terra : C.terraD}'/>`;
  else s += `<rect x='${x - 2}' y='${y - 5}' width='${w + 4}' height='5' fill='${C.stoneD}'/>`;
  if (r() > 0.6) s += `<rect x='${x + w * 0.65}' y='${y - roofH - 10}' width='${w * 0.08}' height='14' fill='${C.terraD}'/>`;
  const cols = Math.max(1, Math.floor(w / 22)), rows = Math.max(1, Math.floor(h / 30));
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const wx = x + (w / cols) * (i + 0.5) - 4, wy = y + 8 + j * (h / rows);
    if (wy + 12 > y + h) continue;
    s += `<rect x='${wx}' y='${wy}' width='8' height='12' fill='${opts.night ? (r() > 0.5 ? C.sun : C.navy) : C.glass}' opacity='.85'/>`;
    if (!opts.night && r() > 0.6) s += `<rect x='${wx - 3}' y='${wy}' width='3' height='12' fill='${C.green}'/><rect x='${wx + 8}' y='${wy}' width='3' height='12' fill='${C.green}'/>`;
  }
  return s;
}

const scenes = {
  rooftops: () => {
    const r = rng(7);
    let rows = "";
    [[540, 40, 50, 0.7], [620, 62, 70, 0.88], [720, 96, 96, 1]].forEach(([y, w, h, o]) => {
      rows += `<g opacity='${o}'>`;
      for (let x = -20; x < 620;) { const ww = w * (0.7 + r() * 0.7); rows += house(x, y - h * r() * 0.4, ww, h + 200, r); x += ww + (r() > 0.8 ? 6 : 0); }
      rows += `</g>`;
    });
    return [600, 800, `
      <linearGradient id='sk' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#f9e6c6'/><stop offset='.55' stop-color='${C.haze}'/></linearGradient>
      <radialGradient id='glow'><stop offset='0' stop-color='${C.sun}'/><stop offset='1' stop-color='${C.sun}' stop-opacity='0'/></radialGradient>
      <rect width='600' height='800' fill='url(#sk)'/>
      <circle cx='430' cy='330' r='170' fill='url(#glow)' opacity='.8'/><circle cx='430' cy='330' r='62' fill='${C.sun}'/>
      <path d='M0 520 Q120 440 260 470 T600 470 V800 H0Z' fill='#c98f7a' opacity='.5'/>
      <path d='M60 468 h12 v-10 h10 v10 h12 v-10 h10 v10 h12 v-10 h10 v10 h12 v-10 h10 v10 h12 v40 h-100Z' fill='#b07a66' opacity='.75'/>
      <rect x='330' y='420' width='30' height='140' fill='${C.white}'/><path d='M326 420 L345 384 L364 420Z' fill='${C.terraD}'/><rect x='338' y='436' width='14' height='22' rx='7' fill='${C.navy}'/>
      <path d='M250 330 q14 -10 28 0 q14 -10 28 0' stroke='#7d6a5e' stroke-width='3' fill='none'/><path d='M330 290 q10 -7 20 0 q10 -7 20 0' stroke='#7d6a5e' stroke-width='2.5' fill='none'/>
      ${rows}`];
  },

  tram: () => {
    const r = rng(11);
    let left = "", right = "";
    for (let i = 0; i < 6; i++) {
      const y = 40 + i * 110, c = walls[Math.floor(r() * walls.length)];
      left += `<path d='M0 ${y} L200 ${y + 40 + i * 6} L200 ${y + 150} L0 ${y + 150}Z' fill='${c}'/>`;
      right += `<path d='M600 ${y} L400 ${y + 40 + i * 6} L400 ${y + 150} L600 ${y + 150}Z' fill='${walls[(i + 3) % walls.length]}'/>`;
      for (let k = 0; k < 3; k++) {
        left += `<rect x='${30 + k * 55}' y='${y + 50 + k * 3}' width='16' height='26' fill='${C.glass}' opacity='.8'/>`;
        right += `<rect x='${555 - k * 55}' y='${y + 50 + k * 3}' width='16' height='26' fill='${C.glass}' opacity='.8'/>`;
      }
    }
    return [600, 800, `
      <linearGradient id='sk' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#cfe2ec'/><stop offset='1' stop-color='#f6dcb4'/></linearGradient>
      <rect width='600' height='800' fill='url(#sk)'/>
      <path d='M180 460 L420 460 L600 800 L0 800Z' fill='#8d8072'/>
      <path d='M180 460 L420 460 L600 800 L0 800Z' fill='url(#cob)' opacity='.5'/>
      <pattern id='cob' width='18' height='12' patternUnits='userSpaceOnUse'><path d='M0 6 h18 M9 0 v6 M0 12 v-6 M18 12 v-6' stroke='#6e6357' stroke-width='1'/></pattern>
      <path d='M270 460 L190 800 M330 460 L410 800' stroke='#5a5048' stroke-width='5'/>
      ${left}${right}
      <path d='M0 120 L600 140 M0 160 L600 150' stroke='${C.navy}' stroke-width='1.5' opacity='.6'/>
      <line x1='300' y1='330' x2='340' y2='148' stroke='${C.navy}' stroke-width='3'/>
      <rect x='190' y='330' width='220' height='300' rx='26' fill='#f2c230'/>
      <rect x='190' y='330' width='220' height='70' rx='26' fill='${C.white}'/>
      <rect x='240' y='344' width='120' height='34' rx='4' fill='${C.navy}'/>
      <rect x='262' y='356' width='76' height='8' rx='3' fill='${C.sun}' opacity='.8'/>
      <rect x='210' y='410' width='180' height='110' rx='8' fill='${C.glass}'/>
      <path d='M210 410 L300 410 L250 520 L210 520Z' fill='#fff' opacity='.12'/>
      <rect x='190' y='560' width='220' height='14' fill='${C.terraD}'/>
      <circle cx='300' cy='600' r='12' fill='${C.white}'/><circle cx='300' cy='600' r='6' fill='${C.sun}'/>
      <rect x='206' y='630' width='188' height='18' rx='4' fill='#3b332d'/>`];
  },

  tiles: () => {
    let s = "";
    for (let r0 = 0; r0 < 8; r0++) for (let c = 0; c < 6; c++) {
      const x = c * 100, y = r0 * 100, worn = ((r0 * 7 + c * 3) % 5) / 20;
      s += `<g transform='translate(${x} ${y})' opacity='${1 - worn}'>
        <rect width='100' height='100' fill='${C.white}' stroke='#d8d0c0' stroke-width='1.5'/>
        ${[0, 90, 180, 270].map((a) => `<ellipse cx='50' cy='26' rx='11' ry='20' fill='${C.blue}' transform='rotate(${a} 50 50)'/>`).join("")}
        ${[45, 135, 225, 315].map((a) => `<ellipse cx='50' cy='30' rx='4' ry='12' fill='#6f9cc4' transform='rotate(${a} 50 50)'/>`).join("")}
        <circle cx='50' cy='50' r='10' fill='${C.ochre}'/><circle cx='50' cy='50' r='4' fill='${C.blue}'/>
        ${[[0, 0], [100, 0], [0, 100], [100, 100]].map(([a, b]) => `<circle cx='${a}' cy='${b}' r='16' fill='none' stroke='${C.blue}' stroke-width='5'/><circle cx='${a}' cy='${b}' r='6' fill='${C.ochre}'/>`).join("")}
      </g>`;
    }
    return [600, 800, s];
  },

  river: () => {
    let hangers = "";
    for (let x = 60; x <= 540; x += 18) {
      const t = (x - 300) / 240, y = 300 + 140 * t * t * (Math.abs(t) <= 1 ? 1 : 0) + (Math.abs(t) > 1 ? 140 : 0);
      hangers += `<line x1='${x}' y1='${Math.min(y, 440)}' x2='${x}' y2='450' stroke='#b8402c' stroke-width='1.5'/>`;
    }
    let sparkle = "";
    for (let i = 0; i < 40; i++) sparkle += `<rect x='${(i * 97) % 600}' y='${480 + ((i * 53) % 300)}' width='${14 + (i % 4) * 8}' height='2' fill='#fbe3b0' opacity='.6'/>`;
    return [600, 800, `
      <linearGradient id='sk' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#f3c9a4'/><stop offset='.6' stop-color='#f2b278'/></linearGradient>
      <linearGradient id='wa' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#7aa1bd'/><stop offset='1' stop-color='#2c4f6e'/></linearGradient>
      <rect width='600' height='800' fill='url(#sk)'/>
      <circle cx='300' cy='420' r='70' fill='${C.sun}' opacity='.9'/>
      <path d='M0 440 Q150 400 300 430 T600 420 V470 H0Z' fill='#9c7a74' opacity='.7'/>
      <path d='M520 424 v-40 M520 384 v-22 M507 372 h26' stroke='#7d5f5a' stroke-width='5'/><rect x='510' y='395' width='20' height='30' fill='#7d5f5a'/>
      <rect y='460' width='600' height='340' fill='url(#wa)'/>${sparkle}
      <rect x='160' y='200' width='16' height='270' fill='#b8402c'/><rect x='424' y='200' width='16' height='270' fill='#b8402c'/>
      <path d='M160 230 h16 M160 300 h16 M424 230 h16 M424 300 h16' stroke='#8f2f20' stroke-width='6'/>
      <path d='M-40 440 Q60 210 168 205 Q300 360 432 205 Q540 210 640 440' fill='none' stroke='#b8402c' stroke-width='4'/>
      ${hangers}<rect x='0' y='446' width='600' height='10' fill='#8f2f20'/>
      <path d='M90 600 l30 0 l-6 10 h-20Z M104 600 v-46 l20 40Z' fill='${C.white}'/>`];
  },

  arches: () => {
    let s = "";
    for (let i = 0; i < 4; i++) {
      const x = 20 + i * 145;
      s += `<path d='M${x} 760 V330 Q${x + 60} 200 ${x + 120} 330 V760Z' fill='#f8e9cf'/>
        <path d='M${x + 12} 760 V340 Q${x + 60} 236 ${x + 108} 340 V760Z' fill='#e9cfa6'/>
        <circle cx='${x + 60}' cy='300' r='16' fill='none' stroke='${C.stoneD}' stroke-width='3'/>
        <path d='M${x + 60} 340 V760' stroke='${C.stoneD}' stroke-width='6'/>
        <path d='M${x + 12} 520 Q${x + 60} 470 ${x + 108} 520' fill='none' stroke='${C.stoneD}' stroke-width='3'/>`;
    }
    return [600, 800, `
      <rect width='600' height='800' fill='${C.stone}'/>
      <rect y='0' width='600' height='150' fill='#c9b48f'/>
      ${[...Array(12)].map((_, i) => `<path d='M${i * 50} 150 v-30 h25 v30' fill='none' stroke='${C.stoneD}' stroke-width='3'/>`).join("")}
      <rect y='180' width='600' height='14' fill='${C.stoneD}'/>
      ${s}
      <path d='M0 760 H600 V800 H0Z' fill='#bfa985'/>
      <path d='M0 800 L120 700 M600 800 L480 700' stroke='#a78f6c' stroke-width='3' opacity='.6'/>
      <path d='M0 0 L600 0 L600 800 L380 800 L560 0Z' fill='#fff' opacity='.08'/>`];
  },

  cafe: () => {
    const tart = (x, y) => {
      let spots = "";
      const r = rng(x + y);
      for (let i = 0; i < 9; i++) spots += `<circle cx='${x + (r() - 0.5) * 50}' cy='${y + (r() - 0.5) * 50}' r='${3 + r() * 7}' fill='#6b3a1c' opacity='${0.55 + r() * 0.4}'/>`;
      return `<circle cx='${x}' cy='${y}' r='44' fill='#d79a4c'/><circle cx='${x}' cy='${y}' r='36' fill='#f2c86a'/><circle cx='${x}' cy='${y}' r='36' fill='#e8a24a' opacity='.5'/>${spots}`;
    };
    return [600, 800, `
      <pattern id='fl' width='80' height='80' patternUnits='userSpaceOnUse'><rect width='80' height='80' fill='${C.white}'/><path d='M40 0 L80 40 L40 80 L0 40Z' fill='${C.blue}' opacity='.85'/><circle cx='40' cy='40' r='9' fill='${C.ochre}'/></pattern>
      <radialGradient id='mb' cx='.4' cy='.35'><stop offset='0' stop-color='#ffffff'/><stop offset='1' stop-color='#e2ddd3'/></radialGradient>
      <rect width='600' height='800' fill='url(#fl)'/>
      <circle cx='300' cy='420' r='300' fill='#00000022'/><circle cx='300' cy='400' r='290' fill='url(#mb)'/>
      <path d='M120 300 Q220 360 310 290 M200 560 Q300 520 420 600' stroke='#cfc8bb' stroke-width='2' fill='none'/>
      <rect x='90' y='470' width='170' height='170' fill='#f4efe6' transform='rotate(-12 175 555)'/>
      <circle cx='390' cy='300' r='92' fill='#fffdf8' stroke='#e3ddd0' stroke-width='3'/>
      <circle cx='390' cy='300' r='56' fill='#fffdf8' stroke='#e3ddd0' stroke-width='3'/>
      <circle cx='390' cy='300' r='44' fill='#3a2216'/><circle cx='384' cy='294' r='30' fill='#a8754a' opacity='.8'/>
      <path d='M446 300 h40' stroke='#fffdf8' stroke-width='16' stroke-linecap='round'/>
      <circle cx='260' cy='470' r='120' fill='#fffdf8' stroke='#e3ddd0' stroke-width='3'/>
      ${tart(215, 440)}${tart(300, 510)}
      <path d='M470 520 L520 650' stroke='#c9c2b5' stroke-width='10' stroke-linecap='round'/>`];
  },

  balcony: () => {
    const r = rng(23);
    let wins = "";
    for (let j = 0; j < 3; j++) for (let i = 0; i < 2; i++) {
      const x = 90 + i * 270, y = 90 + j * 230;
      wins += `<rect x='${x}' y='${y}' width='150' height='170' fill='${C.glass}'/><rect x='${x}' y='${y}' width='75' height='170' fill='#3f5870'/>
        <rect x='${x - 30}' y='${y}' width='30' height='170' fill='${C.green}'/><rect x='${x + 150}' y='${y}' width='30' height='170' fill='${C.green}'/>
        <rect x='${x - 20}' y='${y + 150}' width='190' height='8' fill='#2b2b2b'/>
        ${[...Array(11)].map((_, k) => `<line x1='${x - 16 + k * 18}' y1='${y + 158}' x2='${x - 16 + k * 18}' y2='${y + 200}' stroke='#2b2b2b' stroke-width='3'/>`).join("")}
        <rect x='${x - 20}' y='${y + 198}' width='190' height='6' fill='#2b2b2b'/>
        <circle cx='${x + 10}' cy='${y + 146}' r='12' fill='${C.terra}'/><circle cx='${x + 140}' cy='${y + 146}' r='10' fill='#d0607a'/>`;
    }
    const clothes = [C.white, C.terra, "#7fa6c9", C.ochre, "#d0607a", C.white];
    let line = `<path d='M0 300 Q300 360 600 290' stroke='#555' stroke-width='2' fill='none'/>`;
    clothes.forEach((c, i) => {
      const x = 40 + i * 95, y = 300 + Math.sin((i / 5) * Math.PI) * 50 - 6;
      line += i % 2 ? `<path d='M${x} ${y} h60 l-6 70 h-48Z' fill='${c}'/>` : `<path d='M${x} ${y} h50 l14 22 -12 6 v60 h-54 v-60 l-12 -6Z' fill='${c}'/>`;
    });
    return [600, 800, `<rect width='600' height='800' fill='#eab9a4'/>
      <rect y='0' width='600' height='800' fill='url(#st)' opacity='.25'/>
      <pattern id='st' width='6' height='6' patternUnits='userSpaceOnUse'><circle cx='3' cy='3' r='1' fill='#b77c66'/></pattern>
      ${wins}${line}`];
  },

  sardines: () => {
    const fish = (x, y, a) => `<g transform='translate(${x} ${y}) rotate(${a})'>
      <path d='M-130 0 Q-60 -34 70 -14 L120 -30 L108 0 L120 30 L70 14 Q-60 34 -130 0Z' fill='#8fa3b0'/>
      <path d='M-130 0 Q-60 -34 70 -14 L70 0 L-130 0Z' fill='#5d7486'/>
      ${[-80, -50, -20, 10, 40].map((k) => `<path d='M${k} -18 l14 36' stroke='#2b2420' stroke-width='5' opacity='.75' stroke-linecap='round'/>`).join("")}
      <circle cx='-108' cy='-4' r='5' fill='#f4ead8'/><circle cx='-108' cy='-4' r='2.4' fill='#111'/></g>`;
    return [600, 800, `
      <pattern id='gc' width='60' height='60' patternUnits='userSpaceOnUse'><rect width='60' height='60' fill='${C.white}'/><rect width='30' height='30' fill='#7fa6c9' opacity='.55'/><rect x='30' y='30' width='30' height='30' fill='#7fa6c9' opacity='.55'/><rect x='30' width='30' height='30' fill='#7fa6c9' opacity='.25'/><rect y='30' width='30' height='30' fill='#7fa6c9' opacity='.25'/></pattern>
      <rect width='600' height='800' fill='url(#gc)'/>
      <ellipse cx='300' cy='415' rx='250' ry='300' fill='#00000025'/><ellipse cx='300' cy='400' rx='245' ry='295' fill='#fffdf8'/>
      <ellipse cx='300' cy='400' rx='215' ry='262' fill='none' stroke='${C.blue}' stroke-width='4'/>
      ${fish(300, 290, -8)}${fish(290, 380, 4)}${fish(305, 470, -4)}
      <circle cx='190' cy='580' r='34' fill='#e9c87e'/><circle cx='250' cy='600' r='30' fill='#e3bf73'/>
      ${[0, 1, 2, 3, 4].map((i) => `<circle cx='${200 + i * 14}' cy='${575 + (i % 2) * 10}' r='5' fill='${C.green}'/>`).join("")}
      <path d='M380 560 a50 50 0 0 1 90 40 Z' fill='#f2d64b'/><path d='M388 565 a42 42 0 0 1 74 33 Z' fill='#fbeaa0'/>`];
  },

  bar: () => [600, 800, `
    <linearGradient id='wd' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#6b3b24'/><stop offset='1' stop-color='#3b1f13'/></linearGradient>
    <radialGradient id='lt' cx='.5' cy='0' r='.9'><stop offset='0' stop-color='#ffd99a' stop-opacity='.55'/><stop offset='1' stop-color='#ffd99a' stop-opacity='0'/></radialGradient>
    <pattern id='az' width='70' height='70' patternUnits='userSpaceOnUse'><rect width='70' height='70' fill='${C.white}'/><path d='M35 6 L64 35 L35 64 L6 35Z' fill='none' stroke='${C.blue}' stroke-width='4'/><circle cx='35' cy='35' r='9' fill='${C.blue}'/></pattern>
    <rect width='600' height='800' fill='url(#az)'/>
    <rect width='600' height='800' fill='#3a2216' opacity='.35'/>
    <rect y='0' width='600' height='800' fill='url(#lt)'/>
    <rect x='0' y='520' width='600' height='280' fill='url(#wd)'/><rect x='0' y='510' width='600' height='16' fill='#8a5134'/>
    <path d='M380 230 h50 v70 q30 20 30 60 v150 h-110 v-150 q0 -40 30 -60Z' fill='#4b0f17'/><rect x='392' y='380' width='56' height='70' fill='${C.cream}'/>
    ${[110, 200, 290].map((x) => `<path d='M${x} 420 h56 l-8 90 h-40Z' fill='#ffffff' opacity='.35'/><path d='M${x + 5} 450 h46 l-5 56 h-36Z' fill='#9c1426'/><ellipse cx='${x + 28}' cy='450' rx='23' ry='4' fill='#c81e36'/>`).join("")}
    <circle cx='160' cy='560' r='12' fill='#5a0d18'/><circle cx='180' cy='572' r='10' fill='#5a0d18'/>`],

  night: () => {
    const r = rng(41);
    let stars = "";
    for (let i = 0; i < 30; i++) stars += `<circle cx='${r() * 600}' cy='${r() * 260}' r='${r() * 1.6 + 0.4}' fill='#fff' opacity='${r()}'/>`;
    return [600, 800, `
      <linearGradient id='sk' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#141b2b'/><stop offset='1' stop-color='#33405c'/></linearGradient>
      <radialGradient id='lamp'><stop offset='0' stop-color='#ffd99a' stop-opacity='.9'/><stop offset='1' stop-color='#ffd99a' stop-opacity='0'/></radialGradient>
      <rect width='600' height='800' fill='url(#sk)'/>${stars}
      <circle cx='470' cy='120' r='34' fill='#f5ead0'/><circle cx='486' cy='110' r='30' fill='#1a2234'/>
      <path d='M0 200 L180 230 L180 800 L0 800Z' fill='#2a2f3d'/><path d='M600 160 L410 220 L410 800 L600 800Z' fill='#262b38'/>
      ${house(40, 300, 100, 500, r, { night: true })}${house(450, 280, 120, 520, r, { night: true })}
      <path d='M180 800 L250 520 L360 520 L410 800Z' fill='#4a4238'/>
      ${[...Array(9)].map((_, i) => `<path d='M${180 + i * 6} ${800 - i * 31} H${410 - i * 6}' stroke='#3a332b' stroke-width='3'/>`).join("")}
      <rect x='240' y='380' width='130' height='140' fill='#e9a14c'/><rect x='252' y='392' width='106' height='128' fill='#ffcf7a'/>
      <rect x='262' y='352' width='86' height='26' fill='#1a2234'/><rect x='282' y='362' width='46' height='5' rx='2' fill='#ffcf7a'/>
      <circle cx='190' cy='330' r='120' fill='url(#lamp)'/><path d='M190 330 v-60 h40' stroke='#111' stroke-width='5' fill='none'/>
      <path d='M176 330 h28 l-6 20 h-16Z' fill='#ffd99a'/>`];
  },
};

export const sceneNames = Object.keys(scenes);

const cache = new Map();
export function sceneSvg(name) {
  if (!cache.has(name)) {
    const [w, h, body] = (scenes[name] || scenes.rooftops)();
    cache.set(name, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}' preserveAspectRatio='xMidYMid slice'><defs>${grain}${vig}</defs>${body}${finish(w, h)}</svg>`);
  }
  return cache.get(name);
}

// CSS background-image value for an image slot.
export function imageUrl(img = {}) {
  if (img.src) return `url('${String(img.src).replace(/'/g, "%27")}')`;
  return `url('data:image/svg+xml;utf8,${encodeURIComponent(sceneSvg(img.scene)).replace(/'/g, "%27")}')`;
}
