import { PETS, FAMILY } from './data.mjs';
import { terrainPieces, stairSteps } from './terrain.mjs';

export const icons = {
  paw: '<path d="M8 14c-3 5 0 7 4 5 4 2 7 0 4-5-2-3-6-3-8 0Z"/><ellipse cx="5" cy="10" rx="2" ry="3"/><ellipse cx="10" cy="6" rx="2" ry="3"/><ellipse cx="16" cy="6" rx="2" ry="3"/><ellipse cx="20" cy="11" rx="2" ry="3"/>',
  bridge: '<path d="M3 16h18M4 10v10m16-10v10M4 11q8 7 16 0M8 14v5m4-4v4m4-5v5"/>',
  turn: '<path d="M11 21V3M4 5h12l5 4-5 4H4Z"/>',
  cushion: '<rect x="3" y="8" width="18" height="11" rx="5"/><path d="M6 11q6 4 12 0M8 3l1 2m7-2-1 2"/>',
  stairs: '<path d="M2 20h6v-5h5v-5h5V5h4M2 23h20M5 20v3m5-8v8m6-13v13m5-18v18"/>',
  dig: '<path d="m5 3 12 12m-5-7 5-5 5 5-5 5M2 18h6m8 0h6M9 16v6m-3-3 3 3 3-3"/>',
  play: '<path d="m9 5 11 7-11 7Z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  undo: '<path d="m9 4-5 5 5 5M4 9h9a6 6 0 0 1 0 12"/>',
  reset: '<path d="M4 10a8 8 0 1 1 0 5M4 4v6h6"/>',
  sound: '<path d="m11 4-6 5H2v6h3l6 5ZM15 8q5 4 0 8m3-12q8 8 0 16"/>',
  muted: '<path d="m11 4-6 5H2v6h3l6 5ZM16 9l6 6m0-6-6 6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 0 1 6 0c0 2-3 2-3 5m0 3v1"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  home: '<path d="m3 11 9-8 9 8M5 10v11h14V10M10 21v-7h4v7"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  heart: '<path d="M12 20S1 14 3 7c2-5 7-4 9 0 2-4 7-5 9 0 2 7-9 13-9 13Z"/>',
};
export function icon(name, className = '') { return `<svg class="icon ${className}" viewBox="0 0 24 24" aria-hidden="true" fill="${name === 'paw' ? 'currentColor' : 'none'}" stroke="${name === 'paw' ? 'none' : 'currentColor'}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icons[name] || icons.paw}</svg>`; }

export function petArt(id, instance = '') {
  const p = PETS[id];
  const ink = id === 'coffee' ? '#e6d5a8' : '#443f36';
  const ears = p.dog
    ? `<path d="M-15-49Q-34-98-10-77L1-60M16-61Q39-90 33-47" fill="${p.color}" stroke="#b8946c" stroke-width="1.4"/><path d="m-18-65-3-16 13 12m30 1 9-12-1 21" fill="#d69d8b"/>`
    : `<path d="m-17-51 1-30 20 15 20-15 10 31" fill="${p.color}"/><path d="m-11-65 0-9 10 9m17 0 7-9 3 12" fill="#dca4a0"/>`;
  return `<g class="pet-art ${p.kitten ? 'kitten' : ''}" data-art="${instance}">
    <ellipse cx="-5" cy="-1" rx="31" ry="6" fill="#485749" opacity=".12"/>
    <g class="tail"><path d="M-24-24Q-56-30-45-53Q-39-65-35-53" fill="none" stroke="${p.color}" stroke-width="${p.dog ? 16 : 10}" stroke-linecap="round"/>${p.dog ? `<path d="M-43-50q-16 17 7 19" fill="none" stroke="${p.light}" stroke-width="6" stroke-linecap="round"/>` : ''}</g>
    <g class="leg back"><path d="M-19-20v15m30-16v16" stroke="${p.color}" stroke-width="11" stroke-linecap="round"/></g>
    <ellipse cx="-5" cy="-24" rx="28" ry="21" fill="${p.color}"/>
    <ellipse cx="10" cy="-24" rx="13" ry="17" fill="${p.light}"/>
    <g class="leg front"><path d="M-10-19v14m31-16-1 16" stroke="${p.color}" stroke-width="11" stroke-linecap="round"/></g>
    <g class="pet-head">${ears}<ellipse cx="7" cy="-51" rx="28" ry="25" fill="${p.color}"/>
      ${p.dog ? `<path d="m-19-48-7 8 11 1-4 9 12-4 7 8 5-10 13 7 1-10 12 2-7-10" fill="${p.light}"/>` : `<ellipse cx="12" cy="-42" rx="18" ry="12" fill="${p.light}" opacity=".75"/>`}
      ${p.stripes ? `<path d="m-1-74 2 8m7-9 1 8m7-8-1 8M-19-52l7 2m-8 5 8 1" stroke="#996633" stroke-width="3" stroke-linecap="round" opacity=".5"/>` : ''}
      <g class="pet-eyes" fill="${ink}"><ellipse cx="-2" cy="-52" rx="2.7" ry="3.8"/><ellipse cx="19" cy="-52" rx="2.7" ry="3.8"/></g>
      <circle cx="-1" cy="-53" r=".9" fill="white"/><circle cx="20" cy="-53" r=".9" fill="white"/>
      <ellipse cx="-10" cy="-43" rx="5" ry="3" fill="#dc9390" opacity=".5"/><ellipse cx="27" cy="-43" rx="4" ry="3" fill="#dc9390" opacity=".5"/>
      <path d="m6-44 7 0-3.5 4Z" fill="#a77572"/><path d="M9.5-40q-4 5-7 1m7-1q3 5 6 1" stroke="${ink}" stroke-width="1.4" fill="none" stroke-linecap="round"/>
      ${!p.dog ? `<path d="m-13-43-14-2m15 7-12 2m49-7 13-2m-13 7 12 2" stroke="${ink}" opacity=".45" stroke-width="1.1"/>` : ''}
    </g><path d="M-4-28q14 5 26-2" stroke="${p.accent}" stroke-width="5" fill="none"/><circle cx="12" cy="-25" r="3.5" fill="#e0b85f"/>
  </g>`;
}
export function petPortrait(id) { return `<svg viewBox="-58 -90 115 105" role="img" aria-label="${PETS[id].name}">${petArt(id)}</svg>`; }
export function childArt(index) {
  const p = FAMILY[index];
  return `<g>${p.pigtails ? `<ellipse cx="18" cy="40" rx="10" ry="20" fill="${p.hair}"/><ellipse cx="80" cy="40" rx="10" ry="20" fill="${p.hair}"/>` : ''}<path d="M20 100V81q1-24 29-24t30 24v19" fill="${p.color}"/><path d="M41 61v11q8 9 17 0V61" fill="#f0c5a5"/><circle cx="49" cy="37" r="29" fill="${p.hair}"/><ellipse cx="49" cy="43" rx="25" ry="28" fill="#f4cfb1"/><path d="M24 37q-4-32 24-30 29-1 28 31L63 26l-3 5-10-9-6 10-4-7Z" fill="${p.hair}"/><circle cx="39" cy="43" r="2.2" fill="#4d4139"/><circle cx="60" cy="43" r="2.2" fill="#4d4139"/><ellipse cx="32" cy="51" rx="5" ry="3" fill="#e9a38f" opacity=".6"/><ellipse cx="68" cy="51" rx="5" ry="3" fill="#e9a38f" opacity=".6"/><path d="M44 54q5 5 11 0" fill="none" stroke="#936654" stroke-width="1.7" stroke-linecap="round"/><path d="m36 76 13 9 14-9" stroke="#fff9e5" stroke-width="3" fill="none"/><circle cx="49" cy="93" r="3" fill="#eadb9f"/>${p.pigtails ? '<path d="m18 29 10 3-7 6Z m59 0-10 3 7 6Z" fill="#dba1a9"/>' : ''}</g>`;
}
export function childPortrait(i) { return `<svg viewBox="0 0 100 100" role="img" aria-label="${FAMILY[i].name}">${childArt(i)}</svg>`; }

function flower(x,y,color,scale=1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M0 0v-20m0 12q-13-8-11-1 4 5 11 4" stroke="#759777" stroke-width="2" fill="#87a681"/><g fill="${color}"><ellipse cy="-25" rx="3" ry="5"/><ellipse cx="5" cy="-20" rx="5" ry="3"/><ellipse cy="-15" rx="3" ry="5"/><ellipse cx="-5" cy="-20" rx="5" ry="3"/></g><circle cy="-20" r="3" fill="#d6af5c"/></g>`;
}
function tree(x,y,scale=1,color='#9eb79a') {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M0 4q7-53-6-100" stroke="#8d9072" stroke-width="11" fill="none"/><path d="m1-45 30-28m-32 9-27-24" stroke="#8d9072" stroke-width="5" fill="none"/><path d="M-47-69q-28-36 3-54-7-41 30-39 21-32 44 0 39-7 39 28 26 34-5 56-8 36-47 22-39 14-64-13Z" fill="${color}"/><path d="M-38-113q-3-32 29-27m39 13q18 5 16 27" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="9" stroke-linecap="round"/></g>`;
}
export function house(x,y) {
  return `<g transform="translate(${x-52} ${y})"><ellipse cx="54" cy="5" rx="79" ry="12" fill="#647b65" opacity=".15"/><path d="M4-92h101V0H4Z" fill="#f7efda"/><path d="M4-92h101v13H4Z" fill="#c6b89a" opacity=".3"/><path d="M-10-92 53-145 119-92Z" fill="#b77d68"/><path d="m-10-92 63-53 66 53" stroke="#8b6758" stroke-width="6" stroke-linejoin="round" fill="none"/><path d="M84-126v-26h14v36" fill="#b17c66"/><path d="M36 0v-46q0-25 20-25t20 25V0" fill="#719482"/><path d="M42 0v-46q0-18 14-18v64" fill="#557d6c"/><circle cx="65" cy="-32" r="3" fill="#e8c784"/><rect x="12" y="-71" width="17" height="23" rx="7" fill="#b4d3ca"/><path d="M20-70v22m-8-11h16" stroke="#fffae6" stroke-width="3"/><rect x="82" y="-71" width="17" height="23" rx="7" fill="#b4d3ca"/><path d="M90-70v22m-8-11h16" stroke="#fffae6" stroke-width="3"/><rect x="28" y="-97" width="53" height="19" rx="5" fill="#fffae9"/><text x="54" y="-84" text-anchor="middle" fill="#6a7660" font-size="10" font-weight="700">우리 집</text><path d="M33 3h47" stroke="#d4bf9b" stroke-width="8" stroke-linecap="round"/><g fill="#85a184"><circle cx="0" cy="-8" r="16"/><circle cx="-12" cy="-3" r="11"/><circle cx="112" cy="-9" r="18"/><circle cx="125" cy="-3" r="11"/></g>${flower(111,-12,'#ebc3b0',.65)}<g class="chimney-smoke" opacity=".3" fill="#fffaf0"><circle cx="89" cy="-173" r="9"/><circle cx="99" cy="-190" r="12"/></g></g>`;
}
export function terrainArt(level, placed = {}) {
  const islands = terrainPieces(level, placed).map((p,i) => {
    let plants = '';
    for(let x=p.x1+24;x<p.x2-18;x+=41) {
      if (Math.abs(x-level.goal.x)<80 || Math.abs(x-level.spawn.x)<55 || level.slots.some(s=>Math.abs(x-s.x)<45)) continue;
      plants += (Math.round(x)%3===0) ? flower(x,p.y-2,i%2?'#fff9e4':level.flower,.65+(x%4)*.1) : `<path d="m${x} ${p.y} -4-9m4 9 4-12m-4 12 9-5" fill="none" stroke="#71946d" stroke-width="2" stroke-linecap="round"/>`;
    }
    return `<g data-terrain="${p.terrainIndex}"><path d="M${p.x1} ${p.y+3}H${p.x2}V${p.y+(p.height ?? 560-p.y)}H${p.x1}Z" fill="url(#earth)"/><path d="M${p.x1} ${p.y+13}Q${Math.min(p.x1+40,p.x2)} ${p.y+25} ${Math.min(p.x1+95,p.x2)} ${p.y+13}H${p.x2}" fill="none" stroke="#9eae7c" stroke-width="${p.height?8:16}"/><path d="M${p.x1} ${p.y}H${p.x2}" stroke="${level.ground}" stroke-width="13" stroke-linecap="butt"/><path d="M${p.x1+9} ${p.y+(p.height?22:36)}H${p.x2-9}" stroke="#cfbc99" stroke-width="2" stroke-dasharray="3 23" opacity=".7"/>${plants}</g>`;
  }).join('');
  const previews = level.slots.filter(s => !placed[s.id]).map(slot => {
    if (slot.type === 'stairs') return `<path d="M${slot.x1} ${slot.y1}L${slot.x2} ${slot.y2}" stroke="#839b78" stroke-width="3" stroke-dasharray="4 8" opacity=".65" fill="none"/>`;
    if (slot.type === 'dig') return `<g class="diggable-floor"><rect x="${slot.x1+5}" y="${slot.y-5}" width="${slot.x2-slot.x1-10}" height="25" rx="4" fill="#d0aa7c" opacity=".7"/><path d="m${slot.x-8} ${slot.y-3} 9 8-12 7 8 8m-24-15 7 5-6 10m38-22-5 10 9 6" fill="none" stroke="#a78361" stroke-width="2"/></g>`;
    return '';
  }).join('');
  return islands + previews;
}
export function scenery(level) {
  return `<defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="${level.sky}"/><stop offset="1" stop-color="#faf5e5"/></linearGradient><linearGradient id="earth" x2="0" y2="1"><stop stop-color="#deccaa"/><stop offset="1" stop-color="#ecdcc2"/></linearGradient><linearGradient id="water" x2="0" y2="1"><stop stop-color="#aed0c9"/><stop offset="1" stop-color="#cfe3d4"/></linearGradient><filter id="soft-shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#4a6558" flood-opacity=".13"/></filter></defs>
  <rect width="960" height="540" fill="url(#sky)"/>
  <circle cx="733" cy="94" r="57" fill="#f3dda2" opacity=".38"/><circle cx="733" cy="94" r="39" fill="#f6e5b4"/>${level.id===10?'<circle cx="751" cy="80" r="33" fill="#e4e8f1"/><g fill="#fffae1"><path d="m220 74 3-9 3 9 9 3-9 3-3 9-3-9-9-3Z"/><path d="m548 110 2-6 2 6 6 2-6 2-2 6-2-6-6-2Z"/></g>':''}
  <g fill="#fffdf6" opacity=".85" class="clouds"><path d="M105 93q-3-16 17-19 5-28 32-14 19-10 26 12 23 0 26 21Z"/><path d="M470 65q1-14 18-15 9-22 28-10 17-8 23 13 21 0 22 12Z"/><path d="M805 164q0-13 19-15 8-26 30-10 24-11 29 15 17-1 18 10Z"/></g>
  <path d="M0 246Q128 129 272 220T550 198T960 235V540H0Z" fill="#d5e1cb"/><path d="M0 293Q166 195 327 266T654 252T960 274V540H0Z" fill="#becfb3" opacity=".85"/>
  <g opacity=".38">${tree(37,315,.75,'#94b298')}${tree(594,301,.5,'#96af91')}${tree(918,330,.9,'#95af96')}</g>
  <path d="M0 441Q180 394 345 428T700 419T960 444V540H0Z" fill="url(#water)"/>
  <g stroke="#f2faf0" fill="none" stroke-width="2.5" stroke-linecap="round" opacity=".65" class="water-lines"><path d="M40 467h90m45-21h85m72 47h82m80-33h120m44 37h69m82-43h69"/><path d="M4 501h56m180 17h88m214-14h50m190 16h119"/></g>
  <g id="terrain-layer">${terrainArt(level)}</g>
  ${tree(35,level.terrain[0].y-5,.81,'#9bb594')}
  ${house(level.goal.x,level.goal.y)}
  <g transform="translate(${level.spawn.x-23} ${level.spawn.y-93})"><path d="M0 30V-9" stroke="#a49577" stroke-width="3"/><path d="M0-9h44l-7 12 7 11H0Z" fill="#f8f3dc"/><text x="20" y="6" text-anchor="middle" font-size="10" fill="#7a8d72" font-weight="700">출발</text></g>
  <g opacity=".75"><path d="M289 127q6-7 12 0 6-7 12 0m85 35q5-6 10 0 5-6 10 0" fill="none" stroke="#99aa95" stroke-width="2" stroke-linecap="round"/></g>
  <g fill="#a8bb91" opacity=".8"><ellipse cx="92" cy="537" rx="114" ry="48"/><ellipse cx="893" cy="550" rx="140" ry="51"/></g>
  ${flower(54,517,'#fff9e4',1.3)}${flower(88,524,level.flower,1.1)}${flower(919,524,'#fff9e4',1.25)}
  <g id="installed-layer"></g><g id="animals-layer"></g><g id="particles-layer"></g>`;
}
export function toolArt(slot) {
  if(slot.type === 'stairs') {
    const steps = stairSteps(slot);
    return `<g class="installed stairs-art">${steps.map((s,i) => `<path d="M${s.x1} ${s.y}H${s.x2}V${s.y+11}H${s.x1}Z" fill="${i%2?'#b9986d':'#c9ab7d'}" stroke="#a6895f" stroke-width="1"/><path d="M${s.x1} ${s.y}h${s.x2-s.x1}" stroke="#e9d5ad" stroke-width="3"/>`).join('')}<path d="M${slot.x1} ${slot.y1+8}L${slot.x2} ${slot.y2+8}" stroke="#957b56" stroke-width="5"/><path d="M${slot.x1+3} ${slot.y1-15}L${slot.x2-3} ${slot.y2-23}" stroke="#b59e72" stroke-width="3" stroke-linecap="round"/><path d="M${slot.x1+3} ${slot.y1-21}v25M${slot.x2-3} ${slot.y2-29}v33" stroke="#9c865f" stroke-width="4" stroke-linecap="round"/></g>`;
  }
  if(slot.type === 'dig') return `<g class="installed dug-floor"><path d="M${slot.x1-3} ${slot.y-4}v27m${slot.x2-slot.x1+6}-27v27" stroke="#ac865f" stroke-width="5" stroke-linecap="round"/><path d="m${slot.x1-15} ${slot.y+28} 5 3m${slot.x2+9}-1 4-4" stroke="#bea280" stroke-width="3" stroke-linecap="round"/></g>`;
  if(slot.type === 'bridge') {
    const width = slot.x2-slot.x1;
    let planks='';
    for(let x=slot.x1;x<slot.x2;x+=16) planks+=`<rect x="${x}" y="${slot.y-3}" width="14" height="9" rx="2" fill="${Math.round(x)%3?'#c49b69':'#d5ae7a'}"/><path d="M${x+4} ${slot.y}h6" stroke="#ae8554" stroke-width="1"/>`;
    return `<g class="installed bridge-art"><path d="M${slot.x1} ${slot.y+8}h${width}" stroke="#9a794f" stroke-width="5"/>${planks}<path d="M${slot.x1+4} ${slot.y-27}Q${slot.x} ${slot.y+2} ${slot.x2-4} ${slot.y-27}" fill="none" stroke="#b29260" stroke-width="3"/><path d="M${slot.x1+4} ${slot.y-30}v39m${width-8}-39v39" stroke="#a48559" stroke-width="5" stroke-linecap="round"/></g>`;
  }
  if(slot.type==='turn') return `<g class="installed" transform="translate(${slot.x} ${slot.y})"><path d="M0 1v-63" stroke="#a58a64" stroke-width="6"/><path d="M-25-61H17l18 14-18 14H-25Z" fill="#729a86" stroke="#f9f1d6" stroke-width="2"/><path d="M-12-47h29m-7-7 8 7-8 7" fill="none" stroke="#fff9e9" stroke-width="3" stroke-linecap="round"/></g>`;
  return `<g class="installed" transform="translate(${slot.x} ${slot.y})"><ellipse cy="4" rx="52" ry="7" fill="#66534b" opacity=".1"/><rect x="-53" y="-14" width="106" height="20" rx="10" fill="#d29faa"/><path d="M-45-9Q0 5 45-9" fill="none" stroke="#efd0d3" stroke-width="4"/><path d="m-25-9 4 5m20-4 1 4m21-5-4 5" stroke="#bc8795" stroke-width="2"/></g>`;
}
