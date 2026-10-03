import {icon} from './ui-art.mjs';
import {petArt} from '../rescue/art.mjs';
import {CHARACTERS,stats} from './data.mjs';
export {icon};
const wrap=(body,s)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" data-buddy="${s.buddy}" data-variant="${s.variant||'base'}" fill="none">${body}</svg>`;
function sparkle(x,y,size,color){return `<path d="m${x} ${y-size} ${size*.3} ${size*.7} ${size*.7} ${size*.3}-${size*.7} ${size*.3}-${size*.3} ${size*.7}-${size*.3}-${size*.7}-${size*.7}-${size*.3} ${size*.7}-${size*.3}Z" fill="${color}"/>`;}
function pet(s){let back='',front='';
 if(s.variant==='star'){back='<ellipse cx="32" cy="38" rx="27" ry="21" fill="#eee4fc"/><path d="m27 36-14 15 12-1 8 6 7-16Z" fill="#a994d0" stroke="#8b78ac" stroke-width="1"/>';front=sparkle(48,16,5,'#c6b7ec')+sparkle(14,27,3,'#d7c7ef')+'<path d="m36 38 3 2-1 4-3-2-3 1 1-4Z" fill="#fbe4a2"/>';}
 if(s.variant==='gold'){back='<ellipse cx="32" cy="36" rx="28" ry="23" fill="#fff0bf"/>';front='<path d="m24 15-1-8 7 4 5-7 5 7 7-4-1 8Z" fill="#f1ce75" stroke="#ad8d4e" stroke-width="1.1"/><circle cx="35" cy="12" r="1.4" fill="#b69ad8"/>'+sparkle(53,29,4,'#e5bc60')+sparkle(12,17,3,'#e5bc60');}
 return back+`<g transform="translate(32 57) scale(.57)">${petArt(s.buddy,s.key)}</g>`+front;
}
function popcorn(){return `<ellipse cx="32" cy="58" rx="21" ry="4" fill="#98744a20"/>
 <path d="M20 47 15 54m29-7 5 7" stroke="#c69251" stroke-width="7" stroke-linecap="round"/>
 <path d="M12 35 6 39m46-4 6 4" stroke="#eed091" stroke-width="6" stroke-linecap="round"/>
 <path d="M12 28C5 20 12 12 20 15 19 6 30 3 35 11 40 3 51 9 49 17 59 17 62 28 54 33 61 42 54 51 46 49 43 58 33 59 28 52 20 59 10 52 13 45 4 45 3 34 12 28Z" fill="#fff3d0" stroke="#cbaa6c" stroke-width="1.6"/>
 <path d="M20 17c-7 2-6 10-1 13M35 12c-7 3-4 12 1 12m15-5c-7-2-11 5-7 10M13 38c4-4 8-1 9 3m22 5c3-3 6-4 10-4M30 46c3 4 9 2 10-2" stroke="#e7ca83" stroke-width="2.2" stroke-linecap="round"/>
 <path d="M22 28c-4-8 11-11 13-5 6-6 14 1 9 6" fill="#fff9e6"/>
 <ellipse cx="25" cy="34" rx="2.4" ry="3.1" fill="#72523b"/><ellipse cx="41" cy="34" rx="2.4" ry="3.1" fill="#72523b"/>
 <circle cx="25.7" cy="33" r=".8" fill="white"/><circle cx="41.7" cy="33" r=".8" fill="white"/>
 <ellipse cx="18" cy="40" rx="4" ry="2.5" fill="#eeb698"/><ellipse cx="48" cy="40" rx="4" ry="2.5" fill="#eeb698"/>
 <path d="M29 41q4 5 8 0" stroke="#a37850" stroke-width="1.7" stroke-linecap="round"/>
 <path d="m27 50 6-2 6 2-1 5-6-2-5 2Z" fill="#c995b5"/>${sparkle(5,19,3,'#f0d395')}${sparkle(57,10,3,'#efcb80')}`;}
function dragon(moon){const body=moon?'#9aaada':'#91bd9c',dark=moon?'#687da9':'#588d78',light=moon?'#e1e7fb':'#dce8b8',wing=moon?'#c8b1e8':'#edbf89',cheek=moon?'#c7a2d3':'#e5ad98';return `<ellipse cx="32" cy="58" rx="22" ry="4" fill="#52716720"/>
 <path d="M17 34 4 22l2 18 9 2m34-8 11-13 1 17-12 5" fill="${wing}" stroke="${dark}" stroke-width="1.5" stroke-linejoin="round"/>
 <path d="m16 35-9-9 3 11m39-3 9-9-5 13" stroke="${light}" stroke-width="1.3"/>
 <path d="M46 48c16 3 15-10 12-12 1 11-10 8-14 7" fill="${body}" stroke="${dark}" stroke-width="1.3"/>
 <ellipse cx="31" cy="43" rx="16" ry="15" fill="${body}" stroke="${dark}" stroke-width="1.3"/><ellipse cx="33" cy="44" rx="10" ry="12" fill="${light}"/>
 <path d="m29 39 8 0m-9 5h10m-8 5h6" stroke="${dark}" stroke-opacity=".2" stroke-width="1.3" stroke-linecap="round"/>
 <path d="m20 50-3 5 8 1m15-6 5 5-8 1" fill="${body}" stroke="${dark}" stroke-width="3.5" stroke-linecap="round"/>
 <path d="m17 35-4 7m33-7 3 7" stroke="${body}" stroke-width="7" stroke-linecap="round"/>
 <path d="M18 19 17 6l10 10m14 1 8-10-1 14" fill="#f4e3b1" stroke="${dark}" stroke-width="1.2" stroke-linejoin="round"/>
 <path d="m29 14 4-11 5 10" fill="${wing}"/>
 <path d="M12 24c0-17 39-20 42 0v6C53 44 12 44 12 30Z" fill="${body}" stroke="${dark}" stroke-width="1.5"/>
 <ellipse cx="24" cy="26" rx="3" ry="4" fill="#354f59"/><ellipse cx="43" cy="26" rx="3" ry="4" fill="#354f59"/>
 <circle cx="25" cy="25" r="1" fill="#fff"/><circle cx="44" cy="25" r="1" fill="#fff"/>
 <ellipse cx="33" cy="34" rx="11" ry="7" fill="${light}"/><circle cx="29" cy="31" r="1.1" fill="${dark}"/><circle cx="37" cy="31" r="1.1" fill="${dark}"/>
 <path d="M29 36q5 4 9-1" stroke="${dark}" stroke-width="1.5" stroke-linecap="round"/>
 <ellipse cx="17" cy="33" rx="4" ry="2.5" fill="${cheek}"/><ellipse cx="48" cy="33" rx="4" ry="2.5" fill="${cheek}"/>
 ${moon?'<path d="M36 12c-7 1-10-7-5-11-9 1-11 14 0 16 3 0 4-2 5-5" fill="#fff2bc"/>':'<path d="m29 10 4-6 4 7-4 4Z" fill="#e9c872"/>'}${sparkle(7,13,3,moon?'#d7caf2':'#e8cf88')}`;}
function equipment(s){
 if(s.type==='ranged')return s.weapon==='missile'?
 '<g transform="rotate(-12 44 43)"><rect x="32" y="38" width="29" height="12" rx="5" fill="#43557d" stroke="#b6daf4" stroke-width="1.4"/><path d="M50 36h8l5 8-5 8h-8Z" fill="#97e8ef" stroke="#446d95"/><path d="M39 36V23l5-7 5 7v13" fill="#e8edf8" stroke="#8497bd"/><path d="m39 23 5-7 5 7" fill="#dd9ebf"/><path d="m40 36 4 6 4-6" fill="#ffdc81"/><path d="m37 48-2 8h8l2-8" fill="#7386b0"/></g>':
 '<g transform="rotate(-8 43 45)"><path d="m36 46-2 10h8l3-10" fill="#6a789c" stroke="#354365"/><rect x="33" y="36" width="24" height="12" rx="5" fill="#afc4e1" stroke="#556a90" stroke-width="1.3"/><rect x="53" y="39" width="9" height="7" rx="2" fill="#ffd279"/><rect x="39" y="39" width="9" height="5" rx="2" fill="#70ecfa"/><circle cx="39" cy="36" r="2" fill="#d6a6f3"/></g>';
 if(s.variant==='electric')return '<path d="m29 34-7 11h7l-3 10 12-16h-8l6-5Z" fill="#eaff95" stroke="#7c9755"/><path d="m5 24 6-7-1 6h6l-7 9 1-8Z" fill="#f4fdac"/>';
 if(s.variant==='solar')return '<circle cx="48" cy="44" r="13" fill="#ffd078" stroke="#fff0bd" stroke-width="2"/><path d="m48 33 3 7 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1Z" fill="#fff5cd"/><path d="m22 13-2-9 8 5 6-8 6 8 7-5-1 10Z" fill="#ffd67f" stroke="#bc8d4f"/>';
 return '';
}
export function heroArt(type,tier=1){const s=CHARACTERS[`${type}-${tier}`];const halo=s.tier>=6?`<circle cx="32" cy="32" r="29" fill="${s.color}22" stroke="${s.color}" stroke-width="1" stroke-dasharray="2 4"/>`:'';return wrap(halo+(s.buddy==='popcorn'?popcorn():s.buddy==='dragon'?dragon(['moon','galaxy'].includes(s.variant)):pet(s))+equipment(s),s);}
export function portrait(u){const s=stats(u);return heroArt(s.type,s.tier);}

export function enemyArt(type){const boss=type==='boss',fast=type==='fast',tank=type==='tank';const color=boss?'#ec89c8':fast?'#ffcf68':tank?'#ac96e4':'#77d8bf',dark=boss?'#a75197':fast?'#b48b36':tank?'#735bb0':'#398e83';return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><ellipse cx="32" cy="57" rx="22" ry="5" fill="#050b2b44"/><path d="M9 42C4 20 14 11 31 11c19-2 31 11 26 31l-2 11-9-4-9 6-9-4-10 4-9-4Z" fill="${color}" stroke="${dark}" stroke-width="2"/><ellipse cx="24" cy="20" rx="8" ry="4" fill="#ffffff55"/><rect x="15" y="28" width="36" height="15" rx="7" fill="#293459"/><rect x="22" y="32" width="5" height="6" rx="2" fill="#d5fcff"/><rect x="38" y="32" width="5" height="6" rx="2" fill="#d5fcff"/><path d="m28 47 5 2 5-2" stroke="${dark}" stroke-width="2" stroke-linecap="round"/>${boss?'<path d="m17 15-3-12 12 6 7-8 8 8 10-6-2 12Z" fill="#ffe699" stroke="#bda347" stroke-width="1.5"/><path d="m30 10 3-4 4 4-4 4Z" fill="#b99cea"/>':fast?'<path d="m36 4-12 17h10l-5 10 17-17H35l7-10Z" fill="#fff1bb" stroke="#cd9a3e" stroke-width="1"/>':tank?'<path d="M9 24H4v18h7m44-18h5v18h-7" fill="#d6cafa" stroke="#8871b7" stroke-width="1.4"/>':'<path d="M31 11V4m-4 0h8" stroke="#88e2cb" stroke-width="3" stroke-linecap="round"/>'}</svg>`;}
