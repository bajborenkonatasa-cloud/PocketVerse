// Новости: генерируемая лента города/мира. Ленивая (по кнопке), кэш per-chat.

import { getMeta, saveMeta } from './state.js';
import { generateNewsFeed, logSocialToChat, getUserName } from './social.js';

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

export function getNews() {
    const m = getMeta();
    if (!m.news || typeof m.news !== 'object') m.news = {};
    if (!Array.isArray(m.news.items)) m.news.items = [];
    if (!Array.isArray(m.news.issues)) m.news.issues = [];
    if (typeof m.news.issueSeq !== 'number') m.news.issueSeq = m.news.issues.length;
    // Migration: the old flat Chronicle becomes issue #1 instead of disappearing.
    if (!m.news.issues.length && m.news.items.length) {
        m.news.issueSeq = 1;
        m.news.issues.push({ id: 'issue-1', seq: 1, label: 'Архивный выпуск', time: m.news.at || Date.now(), items: m.news.items.slice(0, 6) });
    }
    return m.news;
}

let _inflight = false;
export async function refreshNews() {
    if (_inflight) throw new Error('уже генерируется');
    _inflight = true;
    try {
        const n = getNews();
        const recentTitles = (n.issues || []).slice(-2).flatMap(x => x.items || []).slice(-8).map(x => x.title);
        const arr = await generateNewsFeed(recentTitles);
        if (!Array.isArray(arr) || !arr.length) throw new Error('Лента не сгенерировалась — попробуй ещё раз');
        const fresh = arr.filter(it => it && it.title).slice(0, 5).map(it => ({
            id: genId(),
            tag: String(it.tag || 'новости').slice(0, 26),
            title: String(it.title).slice(0, 90),
            text: String(it.text || '').slice(0, 500),
            time: Date.now() - Math.floor(Math.random() * 4 * 3600 * 1000),
        }));
        n.issueSeq = (n.issueSeq || 0) + 1;
        const issue = { id: `issue-${n.issueSeq}-${genId()}`, seq: n.issueSeq, time: Date.now(), items: fresh };
        n.issues.push(issue);
        n.issues = n.issues.slice(-12);
        n.items = fresh; // compatibility with older code
        n.at = issue.time;
        saveMeta();
        return fresh.length;
    } finally {
        _inflight = false;
    }
}

// «Поделиться» — новость уходит скрытой строкой в чат: ролевая узнаёт, что она
// это прочитала, и может отреагировать
export function shareNews(id) {
    const n = getNews();
    const it = [...(n.issues || []).flatMap(x => x.items || []), ...(n.items || [])].find(x => x.id === id);
    if (!it) return false;
    logSocialToChat(`${getUserName()} прочитала в новостях: «${it.title}» — ${it.text}`);
    return true;
}

export function deleteNews(id) {
    const n = getNews();
    n.items = n.items.filter(x => x.id !== id);
    (n.issues || []).forEach(issue => { issue.items = (issue.items || []).filter(x => x.id !== id); });
    saveMeta();
}
