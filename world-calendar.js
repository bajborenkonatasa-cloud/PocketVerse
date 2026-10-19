// PocketVerse World Calendar v0.1 — deterministic, per-chat, zero AI calls.
// Uses existing roleplay clock; never derives story time from Android clock.
import { getMeta, saveMeta, getRpDateTime } from './state.js';

const CULTURES = { auto:'По сюжету', europe:'Европа', russia:'Россия', usa:'США', east:'Восточная Азия', medieval:'Средневековье', fantasy:'Фэнтези', custom:'Свой мир' };
export { CULTURES };
function data() {
    const m = getMeta();
    if (!m.worldCalendar || typeof m.worldCalendar !== 'object') m.worldCalendar = {};
    const c = m.worldCalendar;
    if (!Array.isArray(c.events)) c.events = [];
    if (!CULTURES[c.culture]) c.culture = 'auto';
    if (typeof c.place !== 'string') c.place = '';
    return c;
}
export function worldCalendar() { return data(); }
export function worldDate() {
    const d = getRpDateTime();
    if (!d || !Number.isInteger(+d.year) || !Number.isInteger(+d.month) || !Number.isInteger(+d.day) || +d.month < 1 || +d.month > 12 || +d.day < 1 || +d.day > 31) return null;
    return `${d.year}-${String(d.month).padStart(2,'0')}-${String(d.day).padStart(2,'0')}`;
}
export function setWorldSetting(k, v) {
    if (k !== 'culture' && k !== 'place') return;
    const c = data();
    c[k] = k === 'culture' && CULTURES[v] ? v : String(v || '').slice(0,100);
    saveMeta();
}
export function addWorldEvent({ title, date, kind='event', yearly=false }) {
    const t = String(title || '').trim().slice(0,120);
    const d = String(date || '').trim();
    if (!t || !/^-?\d{1,6}-\d{2}-\d{2}$/.test(d)) return false;
    const c = data();
    c.events.push({id:`wc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`,title:t,date:d,kind:['birthday','holiday','meeting','event'].includes(kind)?kind:'event',yearly:!!yearly});
    if (c.events.length > 150) c.events.splice(0,c.events.length-150);
    saveMeta(); return true;
}
export function removeWorldEvent(id) {
    const c = data(); const n = c.events.length;
    c.events = c.events.filter(e=>e.id!==id);
    if (n!==c.events.length) saveMeta();
}
export function eventsForDate(date) {
    if (!date) return [];
    return data().events.filter(e => e.date===date || (e.yearly && e.date.slice(-5)===date.slice(-5)));
}
export function upcomingWorldEvents(today, max=5) {
    if (!today) return [];
    const year = Number(today.split('-')[0]);
    const out = [];
    for (const e of data().events) {
        const dates = e.yearly ? [year,year+1].map(y=>`${y}${e.date.slice(e.date.indexOf('-'))}`) : [e.date];
        for (const date of dates) if (date>=today) out.push({...e, occurrence:date});
    }
    return out.sort((a,b)=>a.occurrence.localeCompare(b.occurrence)).slice(0,max);
}

// v0.2: small, deterministic holiday catalog. Suggestions are NOT assumed to be canon.
const HOLIDAYS = {
  russia: [['01-01','Новый год'],['01-07','Рождество (православная традиция)'],['03-08','Международный женский день'],['05-09','День Победы']],
  europe: [['01-01','Новый год'],['12-25','Рождество (западная традиция)']],
  usa: [['01-01','Новый год'],['07-04','День независимости США'],['10-31','Хэллоуин'],['12-25','Рождество']],
  east: [['01-01','Новый год']],
  medieval: [], fantasy: [], custom: []
};
export function inferredWorldCulture() {
  const c = data();
  if (c.culture !== 'auto') return c.culture;
  const place = c.place.toLowerCase();
  if (/росси|москв|петербург|питер|русь|сибир/.test(place)) return 'russia';
  if (/америк|сша|нью.?йорк|лос.?анджелес|чикаго/.test(place)) return 'usa';
  if (/япони|коре|кита|токи|сеул|пекин/.test(place)) return 'east';
  if (/европ|герман|франци|итал|британ|англи/.test(place)) return 'europe';
  return 'auto';
}
export function suggestedWorldHolidays() {
  const c = data(), culture = inferredWorldCulture();
  const today = worldDate();
  if (!today || !HOLIDAYS[culture]) return [];
  const year = Number(today.split('-')[0]);
  // No Gregorian presumption for premodern or fictional worlds.
  if (year < 1600 || culture === 'medieval' || culture === 'fantasy') return [];
  const existing = new Set(c.events.filter(e=>e.kind==='holiday').map(e=>`${e.date.slice(-5)}|${e.title.toLowerCase()}`));
  const dismissed = new Set(c.dismissedHolidays || []);
  return HOLIDAYS[culture].filter(([md,title])=>!existing.has(`${md}|${title.toLowerCase()}`) && !dismissed.has(`${year}|${culture}|${md}`))
    .map(([md,title])=>({date:`${year}-${md}`,title,culture}));
}
export function dismissWorldHoliday(date) {
  const c=data(), culture=inferredWorldCulture(), year=worldDate()?.split('-')[0];
  if (!year) return;
  if (!Array.isArray(c.dismissedHolidays)) c.dismissedHolidays=[];
  const key=`${year}|${culture}|${date.slice(-5)}`;
  if (!c.dismissedHolidays.includes(key)) c.dismissedHolidays.push(key);
  c.dismissedHolidays=c.dismissedHolidays.slice(-150);saveMeta();
}
export function worldCalendarInjectLine() {
  const today=worldDate(); if (!today) return '';
  const c=data();
  const active=eventsForDate(today).slice(0,2);
  const upcoming=upcomingWorldEvents(today,3).filter(e=>e.occurrence!==today);
  // Only inject near-term confirmed events; no fictional world facts invented.
  const soon=upcoming.filter(e=>{
    const a=Date.parse(`${today}T12:00:00Z`), b=Date.parse(`${e.occurrence}T12:00:00Z`);
    return Number.isFinite(a)&&Number.isFinite(b)&&b>=a&&b-a<=3*86400000;
  });
  if (!active.length&&!soon.length) return '';
  const items=[...active.map(e=>`today: ${e.title}`),...soon.map(e=>`${e.occurrence}: ${e.title}`)].slice(0,3);
  return `\n<story_calendar>RP date ${today}. Confirmed calendar events: ${items.join('; ')}. Mention preparations or celebrations ONLY if natural to the current scene, setting, characters and their beliefs. Do not force actions, repeat reminders or assume attendance.</story_calendar>`;
}
