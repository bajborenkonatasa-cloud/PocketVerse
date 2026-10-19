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
