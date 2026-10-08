
import { sendMessageAsUser, Generate, generateQuietPrompt, generateRaw, saveSettingsDebounced, saveChatConditional } from '../../../../script.js';
import { saveBase64AsFile } from '../../../utils.js';
import {
    getSettings, getThreadList, getThread, markRead, addManualContact, hideContact,
    randomNumber, getTotalUnread, fmtTime, getRpDateTime, keyOf, getHiddenMessageIndexes,
    addGroup, delGroup, updateGroupMembers, renameContact, banAccount,
    isSmsBlocked, blockSmsContact, unblockSmsContact, saveMeta, invalidateChatCache, getMeta, addLocalSms, updateLocalSms, deleteLocalSms, ingestQuietPhoneReply, getMemories, addMemory, deleteMemory, updateMemory,
} from './state.js';
import { updatePhoneInjection, getPhoneBrainSnapshot, setPhoneTurnActive } from './prompts.js';
import {
    getBank, fmtMoney, addTransaction, deleteTransaction, takeLoan, payLoanInstallment, deleteLoan,
    totalDebt, monthlyLoanPayment, addRecurring, delRecurring, payRecurring, monthlyObligations,
    getBankReminders, spendingByCategory, incomeExpenseTotals, bankBadgeCount, setCurrency, convertCurrency,
} from './bank.js';
import { SHOP_CATS, catById, getCategory, generateCategory, buyItem, findShopItem, getOrders, deleteOrder, getCustomCats, addCustomCat, delCustomCat, advanceOrders, orderLeft, fmtEta, findOrder, ensureCourier, orderChat, courierUnread, markCourierRead, writeToCourier, courierArrived } from './shop.js';
import {
    getTweets, getIgPosts, postTweet, likeTweet, rtTweet, delTweet, addTweetReply, delTweetReply,
    postIg, likeIg, delIg, addIgComment, delIgComment,
    getOfPosts, postOf, likeOf, delOf, addOfComment, delOfComment, generateOfComments, getSocial,
    migrateOfWallet, ofIsText,
    generateTweetFeed, generateTweetComments, generateAuthorReply, generateReplyToComment, generateIgFeed, generateIgComments,
    regenerateTweet, regenerateIgPost, refreshFeed,
    compressImage, setContactAvatar, getContactAvatar, avatarForAuthor, setUserAvatar, getUserAvatar,
    timeAgo, makeHandle, getUserName, generatePostImage, cancelImageGen, isImageGenAvailable, resolveAuthorKey,
    handleFor, setContactHandle, setUserHandle, getUserHandle, describePostImage, generateSmsPhotoReply, searchGiphyMeme, searchGiphyChoices, logSocialToChat, getSocialJournalEntries, logIgPost, logFeedDigest,
    settleSocialPost, maybeGenerateStoryEvent, resolveStoryEvent, generateAdvertisingOffers, getWorldPulse, generateWorldPulseCandidates, activateWorldPulseThread, setWorldPulseMode, archiveWorldPulseThread,
    getStories, activeStories, addStory, deleteStory, bumpStoryViews, toggleStoryLike, generateContactStories, generateStoryReactions,
    generateRepLabel, generateGroupChats,
    generateChannels, generateChannelPosts, generateChannelComments, generateMyChannelFeedback, generatePersonChannel,
    generateAnonFeed, generateAnonComments, resolveAnonAuthor, generateTinderDeck,
    getMediaIdentityDiagnostics,
    resolveMediaSubjectsDiagnostic, buildMediaSceneBlueprintDiagnostic, generateMediaVisualBlueprint, compileMediaBlueprint, buildNovelAiUndesiredContent,
} from './social.js';
import { getSystemsView, deferEvent, declineEvent, selectStoryEvent, acceptAdOffer, declineAdOffer, attachActiveAd, getReputationStatus } from './social-events.js';
import { maybeScamSms } from './scam.js';
import {
    getChannels, allChannels, findChannel, findChanPost, createMyChannel, deleteMyChannel,
    addFoundChannels, addPersonChannel, toggleSubscribe, deleteChannel, addChannelPosts, publishToMyChannel,
    deleteChanPost, toggleComments, toggleReact, addReacts, addComments, addMyComment,
    deleteComment, bumpViews, addSubs, matchPostByText, markChannelRead, unreadChannels,
    setChannelAvatar, clearChannelAvatar,
    CHAN_REACTS,
    ANON_ID, ANON_NAME, anonEnabled, getAnonChannel, anonPostToUser, addAnonPosts, startEchoArc, renameEchoArc, updateEchoPost,
    postAnonAsUser, anonRevealPrice, canAffordAnonReveal,
    chargeAnonReveal, setAnonAuthor, anonAuthorNeedsLookup,
} from './channels.js';
import { casinoStats, spinSlots, spinRoulette, canBet } from './casino.js';
import { getNews, refreshNews, shareNews, deleteNews } from './news.js';
import { getDiscord, findDServer, findDChannel, refreshDiscordServers, createOwnDServer, refreshDChannel, postToDChannel, deleteDServer, addDMember, delDMember } from './discord.js';
import { getTwitch, findStream, refreshStreams, tickStream, donateToStream, startMyStream, tickMyStream, endMyStream, getTwitchNick, setTwitchNick } from './twitch.js';
import { getNotes, addNote, updateNote, deleteNote, toggleNoteShared, updateNoteDecor } from './notes.js';
import {
    tinderEnabled, getTinder, getTinderMe, saveTinderMe, setTinderMePhoto,
    addTinderProfiles, currentCard, findProfile, swipeTinder, undoSwipe,
    getMatches, matchBadge, markMatchOpened, setMatchIrl, deleteMatch, setProfileImage,
    matchByContactKey, isInAppMatch, giveNumberTo, ensureMatchContact,
} from './tinder.js';
import {
    getPlans, addPlan, togglePlan, deletePlan, groupedPlans, plansBadgeCount,
    setPlanVisible, reschedulePlan, getPlanSuggestions, acceptPlanSuggestion, dismissPlanSuggestion,
    fmtPlanDate, rpToday, PLAN_WHO, monthGrid, monthOf, shiftMonth, plansByDate, daysBetween,
} from './plans.js';
import { tr, trDom, lang, DAYS_I18N, MONTHS_I18N } from './i18n.js';
import { logAct, logOk, logFail } from './debug-log.js';

// Все confirm/prompt модуля идут через перевод (шэдоуинг браузерных диалогов)
const confirm = (msg) => window.confirm(tr(msg));
const prompt = (msg, def) => window.prompt(tr(msg), def);

// ── Локальное UI-состояние (не персистится) ──
let currentScreen = 'home';     // + 'of' | 'ofnew' | 'ofview'
let currentThreadKey = null;
let currentTweetId = null;
let currentPostId = null;
let typingKey = null;           // тред, в котором «печатает…»
let sending = false;
let _smsDraftImage = null;      // фото, приложенное к смс (dataURL до отправки)
let _smsDraftVoice = false;     // режим голосового: текст уйдёт как расшифровка
let _gifPickerOpen = false;
let _gifPickerKind = 'gif';
let _gifPickerResults = [];
let _gifPickerBusy = false;

// Черновики полей ввода. Живут ВНЕ DOM, поэтому переживают и перерисовку
// (генерация картинки, публикация, новое сообщение), и закрытие телефона.
const _drafts = new Map();
let _lastFocusKey = null;       // автофокус — только при смене экрана

// Ключ привязан к экрану и объекту: черновик треда Вадима не подставится Алисе
function draftScope() {
    return `${currentScreen}:${currentThreadKey || currentPostId || currentTweetId || _ordChatId || ''}`;
}

function captureDrafts(root) {
    if (!root) return;
    const scope = draftScope();
    root.querySelectorAll('textarea[id], input[id]').forEach(el => {
        if (el.type === 'file' || el.type === 'checkbox' || el.type === 'radio' || el.type === 'color') return;
        _drafts.set(`${scope}:${el.id}`, el.value);
    });
}

function restoreDrafts(root) {
    if (!root) return;
    const scope = draftScope();
    root.querySelectorAll('textarea[id], input[id]').forEach(el => {
        if (el.type === 'file' || el.type === 'checkbox' || el.type === 'radio' || el.type === 'color') return;
        const saved = _drafts.get(`${scope}:${el.id}`);
        // Только в пустое поле: не затираем значения, выставленные рендером
        if (saved !== undefined && saved !== '' && !el.value) el.value = saved;
    });
}

// Поле очищено осознанно (отправка/публикация) — забыть черновик
export function clearDraft(id) {
    _drafts.delete(`${draftScope()}:${id}`);
}
let _mmsGenBusy = new Set();    // ММС в процессе генерации фото (по eventId)
let genBusy = false;            // идёт генерация ленты/комментов
let selectedStoryEventId = null;
let clockTimer = null;
let prevIncomingCounts = new Map(); // для детекта новых входящих (тосты)

function ic(name) { return `<i class="fa-solid ${name}"></i>`; }


function esc(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── Градиент аватарки по имени ──
const PALETTES = [
    ['#6a8dff', '#8f6aff'], ['#ff6a9e', '#ff8f6a'], ['#3ec9a7', '#4a90d9'],
    ['#c66bff', '#ff6b9d'], ['#ffb347', '#ff6a6a'], ['#4facfe', '#00f2fe'],
    ['#a18cd1', '#fbc2eb'], ['#f77062', '#fe5196'],
];
function avatarStyle(name) {
    let h = 0;
    const s = String(name || '?');
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    const p = PALETTES[Math.abs(h) % PALETTES.length];
    return `background:linear-gradient(135deg, ${p[0]}, ${p[1]})`;
}
// Персональный цвет ника (групповые чаты): тот же хэш, что и у аватара
function senderColor(name) {
    let h = 0;
    const s = String(name || '?');
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return PALETTES[Math.abs(h) % PALETTES.length][0];
}
function initialOf(name) {
    const t = String(name || '?').trim();
    return esc(t.charAt(0).toUpperCase() || '?');
}

// Аватар: фото если загружено, иначе градиент с инициалом
function avatarHtml(name, avatarUrl, cls = 'gp-avatar') {
    if (avatarUrl) {
        return `<div class="${cls} gp-avatar-img"><img src="${esc(avatarUrl)}" alt=""></div>`;
    }
    return `<div class="${cls}" style="${avatarStyle(name)}">${initialOf(name)}</div>`;
}

function brand(name) { return `<i class="fa-brands ${name}"></i>`; }

// ═══ FAB ═══

// FAB. Позиционирование через left/top (fabPos={left,top}) — как в Asta,
// которая надёжно показывается на айфоне. Драг реализован раздельными
// touch- и mouse-обработчиками (pointer events на мобильном ST капризничают).
// Ключевой фикс невидимости на iOS: на тачскринах у кнопки СПЛОШНАЯ заливка
// без backdrop-filter (blur-поверхность Safari часто рендерит прозрачной).
function createFab() {
    if (document.getElementById('gp-fab')) return;
    const fab = document.createElement('div');
    fab.id = 'gp-fab';
    fab.innerHTML = `<span class="gp-orb-mark" aria-hidden="true"><span class="pv-device-star">✦</span></span><span id="gp-fab-badge" class="gp-hidden"></span>`;
    document.body.appendChild(fab);

    // Позиция: сохранённая ВСЕГДА зажимается в текущий вьюпорт (позиция с широкого
    // монитора не должна уносить кнопку за экран телефона). Дефолт — правый край.
    const FAB_SZ = 48;
    const applyFabPos = () => {
        const st = getSettings();
        const vw = window.innerWidth, vh = window.innerHeight;
        let left, top;
        const p = st.fabPos;
        if (p && typeof p.left === 'number' && typeof p.top === 'number') {
            left = p.left; top = p.top;
        } else if (p && typeof p.right === 'number') {
            // Миграция старого формата {right,bottom} → {left,top}
            left = vw - FAB_SZ - p.right;
            top = vh - FAB_SZ - (p.bottom ?? 190);
        } else {
            left = vw - FAB_SZ - 16;
            top = Math.round(vh * 0.55);
        }
        left = Math.max(2, Math.min(left, vw - FAB_SZ - 2));
        top = Math.max(2, Math.min(top, vh - FAB_SZ - 2));
        fab.style.left = `${left}px`;
        fab.style.top = `${top}px`;
        fab.style.right = 'auto';
        fab.style.bottom = 'auto';
    };
    applyFabPos();
    window.addEventListener('resize', applyFabPos);
    window.addEventListener('orientationchange', () => setTimeout(applyFabPos, 200));

    const s = getSettings();
    if (!s.showFab || !s.isEnabled) fab.classList.add('gp-hidden');

    // ── Драг (по образцу Asta) ──
    const THR = 8;
    let down = false, moved = false, sx = 0, sy = 0, sl = 0, st = 0, rafId = null;
    const clientXY = (e) => {
        if (e.touches?.[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        if (e.changedTouches?.[0]) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        return { x: e.clientX, y: e.clientY };
    };
    const beginDrag = (x, y) => {
        down = true; moved = false; sx = x; sy = y;
        const r = fab.getBoundingClientRect();
        sl = r.left; st = r.top;
        fab.style.left = `${sl}px`; fab.style.top = `${st}px`;
        fab.style.right = 'auto'; fab.style.bottom = 'auto';
    };
    const applyMove = (nx, ny) => {
        const cx = Math.max(2, Math.min(nx, window.innerWidth - fab.offsetWidth - 2));
        const cy = Math.max(2, Math.min(ny, window.innerHeight - fab.offsetHeight - 2));
        fab.style.left = `${cx}px`; fab.style.top = `${cy}px`;
    };
    const persist = () => {
        const r = fab.getBoundingClientRect();
        getSettings().fabPos = { left: Math.round(r.left), top: Math.round(r.top) };
        saveSettingsDebounced();
    };

    fab.addEventListener('touchstart', (e) => {
        const c = clientXY(e); beginDrag(c.x, c.y);
    }, { passive: true });
    fab.addEventListener('touchmove', (e) => {
        if (!down) return;
        const c = clientXY(e), dx = c.x - sx, dy = c.y - sy;
        if (Math.abs(dx) > THR || Math.abs(dy) > THR) moved = true;
        if (!moved) return;
        e.preventDefault();
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => applyMove(sl + dx, st + dy));
    }, { passive: false });
    fab.addEventListener('touchend', (e) => {
        if (!down) return;
        down = false;
        if (!moved) { e.preventDefault(); togglePhone(); }
        else persist();
        rafId = null;
    }, { passive: false });

    fab.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        beginDrag(e.clientX, e.clientY);
    });
    document.addEventListener('mousemove', (e) => {
        if (!down) return;
        const dx = e.clientX - sx, dy = e.clientY - sy;
        if (Math.abs(dx) > THR || Math.abs(dy) > THR) moved = true;
        if (!moved) return;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => applyMove(sl + dx, st + dy));
    });
    document.addEventListener('mouseup', () => {
        if (!down) return;
        down = false;
        if (moved) persist();
        else togglePhone();
        rafId = null;
    });
}

// Кнопка «Телефон» в wand-меню (палочка у поля ввода) — гарантированный вход
// на мобильных: FAB может быть не виден (позиция/прозрачность/чужой CSS),
// а меню расширений есть всегда.
function createWandButton() {
    try {
        const menu = document.getElementById('extensionsMenu');
        if (!menu || document.getElementById('gp-wand-open')) return;
        const item = document.createElement('div');
        item.id = 'gp-wand-open';
        item.className = 'list-group-item flex-container flexGap5 interactable';
        item.tabIndex = 0;
        item.innerHTML = `<span class="gp-wand-orb">◈</span><span>PocketVerse</span>`;
        item.addEventListener('click', () => {
            openPhone();
        });
        menu.appendChild(item);
    } catch (e) {
        console.warn('[GlassPhone] wand button failed:', e);
    }
}

// Напоминания банка: тост о новых наступивших/просроченных обязательных платежах
// (один раз на платёж в RP-месяц, чтобы не спамить)
let _bankReminded = new Set();
export function notifyBankReminders() {
    if (!getSettings().isEnabled) return;
    try {
        const ym = (getRpDateTime() ? `${getRpDateTime().year}-${getRpDateTime().month}` : new Date().toISOString().slice(0, 7));
        for (const r of getBankReminders()) {
            const key = r.kind + r.id + ':' + ym;
            if (_bankReminded.has(key)) continue;
            _bankReminded.add(key);
            toast(`${r.overdue ? 'Просрочен платёж' : 'Пора оплатить'}: ${r.name} — ${fmtMoney(r.amount)}`, r.kind === 'loan' ? 'fa-landmark' : 'fa-file-invoice-dollar');
        }
    } catch (e) { /* ignore */ }
}

export function updateFabBadge() {
    // Самовосстановление: если FAB пропал из DOM (чужой скрипт/перестройка) — пересоздаём
    if (!document.getElementById('gp-fab')) {
        try { createFab(); } catch (e) { /* ignore */ }
    }
    const n = getTotalUnread() + bankBadgeCount();
    const badge = document.getElementById('gp-fab-badge');
    if (badge) {
        if (n > 0) {
            badge.textContent = n > 9 ? '9+' : String(n);
            badge.classList.remove('gp-hidden');
        } else {
            badge.classList.add('gp-hidden');
        }
    }
    const fab = document.getElementById('gp-fab');
    if (fab) {
        const s = getSettings();
        fab.classList.toggle('gp-hidden', !s.showFab || !s.isEnabled);
        fab.classList.toggle('gp-fab-alert', n > 0);
        fab.classList.toggle('gp-fab-idle', n === 0);
    }
}

// ═══ Скрытие смс-переписки из ленты чата ═══
// Сообщения остаются в chat[] и в контексте модели — прячем только DOM (.mes по mesid).
// Вызывается на всех событиях рендера + из MutationObserver (index.js).
export function applyChatHiding() {
    try {
        const s = getSettings();
        const enabled = s.isEnabled && s.hideSmsInChat !== false;
        document.querySelectorAll('#chat .mes.gp-sms-hidden').forEach(el => el.classList.remove('gp-sms-hidden'));
        if (!enabled) return;
        const idxs = getHiddenMessageIndexes();
        for (const i of idxs) {
            const el = document.querySelector(`#chat .mes[mesid="${i}"]`);
            if (el) el.classList.add('gp-sms-hidden');
        }
    } catch (e) {
        console.warn('[GlassPhone] applyChatHiding failed:', e);
    }
}

// ═══ Каркас телефона ═══

function createPhone() {
    if (document.getElementById('gp-overlay')) return;
    const ov = document.createElement('div');
    ov.id = 'gp-overlay';
    ov.innerHTML = `
        <div id="gp-phone">
            <div class="gp-island"></div>
            <div class="gp-statusbar">
                <span id="gp-clock">--:--</span>
                <span class="gp-status-right">
                    <span id="gp-rpdate" class="gp-rpdate"></span>
                    ${ic('fa-signal')}${ic('fa-wifi')}${ic('fa-battery-three-quarters')}
                    <button class="gp-close" id="gp-close" title="Закрыть">${ic('fa-xmark')}</button>
                </span>
            </div>
            <div id="gp-screen"></div>
            <div class="gp-homebar" title="Закрыть"></div>
        </div>`;
    document.body.appendChild(ov);
    ov.addEventListener('pointerdown', (e) => {
        if (e.target === ov) closePhone();
    });
    // Закрытие: крестик в статус-баре и «хоумбар» (на мобильном фуллскрине фона нет)
    ov.querySelector('#gp-close')?.addEventListener('click', closePhone);
    ov.querySelector('.gp-homebar')?.addEventListener('click', closePhone);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isPhoneOpen()) closePhone();
    });
}

// ═══ Скины и кастомный CSS ═══
const SKINS = ['indigo', 'quiet', 'sunset', 'zephyr', 'neon', 'noir', 'fern', 'lcd', 'void', 'porcelain', 'minimal'];

// Варианты уведомлений. Разметка у всех одна — отличается только оформление,
// поэтому переключение не трогает ни один из ~40 вызовов toast().
const TOAST_STYLES = [
    { id: 'aurora', name: 'Аврора' },
    { id: 'ring', name: 'Кольцо-таймер' },
    { id: 'avatar', name: 'Аватар' },
    { id: 'bubble', name: 'Пузырь' },
    { id: 'plain', name: 'Чистый текст' },
    { id: 'timed', name: 'Со временем' },
    { id: 'editorial', name: 'Редакторский' },
];
const LEGACY_SKINS = { rose: 'sunset', emerald: 'fern', mono: 'lcd' };
const THEME_BODY_CLASSES = [...SKINS, ...Object.values(LEGACY_SKINS)].map(sk => `gp-theme-${sk}`);
const THEME_INFO = [
    { id: 'indigo', name: 'Индиго', note: 'Liquid glass', colors: ['#6a8dff', '#9a6aff', '#4aaaff'] },
    { id: 'quiet', name: 'Тихий', note: 'Графит и роза', colors: ['#e79bb4', '#c9738f', '#2a2927'] },
    { id: 'sunset', name: 'Закат', note: 'Тёплое стекло', colors: ['#ff8a5f', '#ff5a8c', '#a04a45'] },
    { id: 'zephyr', name: 'Зефир', note: 'Мягкий kawaii', colors: ['#ff9ec7', '#b79bff', '#8dcfff'] },
    { id: 'neon', name: 'Neon City', note: 'Cyberpunk', colors: ['#ff2d78', '#00e5ff', '#8d42ff'] },
    { id: 'noir', name: "Noir d'Or", note: 'Чёрное золото', colors: ['#f0d49a', '#d9ab5e', '#6f5732'] },
    { id: 'fern', name: 'Fern', note: 'Глубокий лес', colors: ['#a3e08a', '#5cbf8a', '#d5aa55'] },
    { id: 'lcd', name: 'LCD 3310', note: 'Пиксельное ретро', colors: ['#242e12', '#56642c', '#a7bd5e'] },
    { id: 'void', name: 'Void', note: 'True AMOLED', colors: ['#00ff9d', '#00d984', '#303030'] },
    { id: 'porcelain', name: 'Porcelain', note: 'Светлый день', colors: ['#5a92ff', '#3a7bfd', '#a9c2ff'] },
    { id: 'minimal', name: 'Минимал', note: 'Строгие грани', colors: ['#8e8e93', '#c7c7cc', '#3a3a3c'] },
];

function hexRgb(hex) {
    const m = String(hex || '').trim().match(/^#([0-9a-f]{6})$/i);
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

// Шрифты для кастомизации (только системные — без загрузок)
const THEME_FONTS = {
    '': '',
    'serif': 'Georgia, "Times New Roman", serif',
    'mono': '"Cascadia Mono", "JetBrains Mono", Consolas, "Courier New", monospace',
    'rounded': '"Comic Sans MS", "Segoe UI", cursive',
    'condensed': '"Arial Narrow", "Segoe UI", sans-serif',
};

function normalizedThemeCustom(value = getSettings().themeCustom) {
    const v = value && typeof value === 'object' ? value : {};
    const hex = (x) => /^#[0-9a-f]{6}$/i.test(x || '') ? x : null;
    return {
        accentA: hex(v.accentA),
        accentB: hex(v.accentB),
        bg: hex(v.bg),           // цвет фона телефона (null = фон темы)
        text: hex(v.text),       // цвет текста (null = цвет темы)
        iconA: hex(v.iconA),     // градиент иконок приложений (null = как в теме)
        iconB: hex(v.iconB),
        font: (v.font in THEME_FONTS) ? v.font : '',
        radius: Math.max(2, Math.min(30, Number(v.radius) || 18)),
        transparency: Math.max(3, Math.min(28, Number(v.transparency) || 10)),
        iconScale: Math.max(80, Math.min(115, Number(v.iconScale) || 100)),
    };
}

// Затемнить/осветлить hex на delta (-255..255) — для градиента из одного цвета фона
function shadeHex(hex, delta) {
    const m = String(hex || '').match(/^#([0-9a-f]{6})$/i);
    if (!m) return hex;
    const n = parseInt(m[1], 16);
    const cl = (x) => Math.max(0, Math.min(255, x + delta));
    return '#' + [cl((n >> 16) & 255), cl((n >> 8) & 255), cl(n & 255)]
        .map(x => x.toString(16).padStart(2, '0')).join('');
}

export function applySkin() {
    const ph = document.getElementById('gp-phone');
    if (ph) {
        [...SKINS, ...Object.keys(LEGACY_SKINS)].forEach(sk => ph.classList.remove(`gp-skin-${sk}`));
        const savedSkin = getSettings().skin || 'indigo';
        const skin = LEGACY_SKINS[savedSkin] || (SKINS.includes(savedSkin) ? savedSkin : 'indigo');
        if (skin !== 'indigo') ph.classList.add(`gp-skin-${skin}`);
        document.body?.classList.remove(...THEME_BODY_CLASSES);
        document.body?.classList.add(`gp-theme-${skin}`);

        const c = normalizedThemeCustom();
        const theme = THEME_INFO.find(x => x.id === skin) || THEME_INFO[0];
        const accentA = c.accentA || theme.colors[0];
        const accentB = c.accentB || theme.colors[1];
        ph.style.setProperty('--gp-accent-a', accentA);
        ph.style.setProperty('--gp-accent-b', accentB);
        ph.style.setProperty('--gp-accent-a-rgb', hexRgb(accentA));
        ph.style.setProperty('--gp-accent-b-rgb', hexRgb(accentB));
        ph.style.setProperty('--gp-theme-card-radius', `${c.radius}px`);
        ph.style.setProperty('--gp-theme-icon-radius', `${Math.max(3, Math.round(c.radius * .95))}px`);
        ph.style.setProperty('--gp-theme-icon-scale', String(c.iconScale / 100));
        const alpha = c.transparency / 100;
        const light = skin === 'zephyr' || skin === 'porcelain';
        const lcd = skin === 'lcd';
        ph.style.setProperty('--gp-glass', lcd
            ? `rgba(255,255,230,${Math.min(.45, alpha + .12)})`
            : light ? `rgba(255,255,255,${Math.min(.9, alpha + .5)})` : `rgba(255,255,255,${alpha})`);
        ph.style.setProperty('--gp-glass-strong', lcd
            ? `rgba(255,255,230,${Math.min(.55, alpha + .22)})`
            : light ? `rgba(255,255,255,${Math.min(.96, alpha + .68)})` : `rgba(255,255,255,${Math.min(.4, alpha + .06)})`);

        // ── Глубокая кастомизация: фон / цвет текста / шрифт ──
        // Фон: свой цвет ПЕРЕКРЫВАЕТ фон темы (мягкий градиент из одного цвета)
        if (c.bg) {
            ph.style.background = `linear-gradient(165deg, ${shadeHex(c.bg, 22)}, ${c.bg} 45%, ${shadeHex(c.bg, -26)})`;
        } else {
            ph.style.background = '';
        }
        // Цвет текста: основной + приглушённый (55% прозрачности того же цвета)
        if (c.text) {
            ph.style.setProperty('--gp-text', c.text);
            ph.style.setProperty('--gp-text-dim', `rgba(${hexRgb(c.text)}, 0.55)`);
            ph.style.color = c.text;
        } else {
            ph.style.removeProperty('--gp-text');
            ph.style.removeProperty('--gp-text-dim');
            ph.style.color = '';
        }
        // Шрифт всего телефона
        ph.style.fontFamily = THEME_FONTS[c.font] || '';
        // Маркер-классы кастомизации: темы хардкодят цвета пузырей/кнопок в своих
        // классах — эти классы дают !important-оверрайды через переменные,
        // чтобы выбранный акцент/цвет текста РЕАЛЬНО перекрашивал интерфейс
        ph.classList.toggle('gp-custom-accent', !!(c.accentA || c.accentB));
        ph.classList.toggle('gp-custom-text', !!c.text);
        // Свои цвета иконок приложений (перекрывают тему)
        if (c.iconA || c.iconB) {
            ph.style.setProperty('--gp-icon-a', c.iconA || c.iconB);
            ph.style.setProperty('--gp-icon-b', c.iconB || c.iconA);
            ph.classList.add('gp-custom-icons');
        } else {
            ph.style.removeProperty('--gp-icon-a');
            ph.style.removeProperty('--gp-icon-b');
            ph.classList.remove('gp-custom-icons');
        }
    }
    // Кастомный CSS юзера
    let styleEl = document.getElementById('gp-custom-css');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'gp-custom-css';
        document.head.appendChild(styleEl);
    }
    styleEl.textContent = getSettings().customCss || '';
    applyWallpaper();
}

// ═══ Обои телефона ═══
// Картинка-обои кладётся отдельным слоем ПОД экраном (не через background
// самого #gp-phone, чтобы не конфликтовать со скинами). Класс gp-has-wall
// приглушает стеклянные градиенты, чтобы фото было видно.
export function applyWallpaper() {
    const ph = document.getElementById('gp-phone');
    if (!ph) return;
    const url = getSettings().wallpaper || '';
    let layer = ph.querySelector('.gp-wallpaper');
    if (url) {
        if (!layer) {
            layer = document.createElement('div');
            layer.className = 'gp-wallpaper';
            ph.insertBefore(layer, ph.firstChild);
        }
        const cssUrl = url.replace(/'/g, "\\'");
        layer.style.backgroundImage = `url('${cssUrl}')`;
        layer.classList.toggle('gp-wall-blur', !!getSettings().wallpaperBlur);
        ph.classList.add('gp-has-wall');
    } else {
        if (layer) layer.remove();
        ph.classList.remove('gp-has-wall');
    }
}

export function isPhoneOpen() {
    return document.getElementById('gp-overlay')?.classList.contains('gp-open') || false;
}

// Keep SillyTavern's roleplay page stationary behind the phone while Android IME
// opens/closes. Lock the underlying document, not the journal input.
let _pvPageLock = null;
function lockRoleplayPage() {
    if (_pvPageLock) return;
    const body = document.body;
    const y = window.scrollY || window.pageYOffset || 0;
    _pvPageLock = { y, position: body.style.position, top: body.style.top,
        left: body.style.left, right: body.style.right, width: body.style.width };
    Object.assign(body.style, { position: 'fixed', top: `-${y}px`, left: '0', right: '0', width: '100%' });
}
function unlockRoleplayPage() {
    if (!_pvPageLock) return;
    const old = _pvPageLock;
    _pvPageLock = null;
    Object.assign(document.body.style, { position: old.position, top: old.top,
        left: old.left, right: old.right, width: old.width });
    window.scrollTo(0, old.y);
}

export function openPhone(threadKey = null) {
    createPhone();
    applySkin();
    const ov = document.getElementById('gp-overlay');
    ov.classList.add('gp-open');
    lockRoleplayPage();
    // Стадии заказов двигает время ролевой: пока телефон был закрыт, курьер мог
    // выехать. Догоняем при открытии, иначе заказ висел бы «в сборке».
    notifyDeliveries();
    if (threadKey) {
        // Пришли по тосту в конкретный тред — экран блокировки только мешает
        currentScreen = 'thread';
        currentThreadKey = threadKey;
    } else if (getSettings().lockScreen !== false) {
        currentScreen = 'lock';
    }
    render();
    tickClock();
    if (clockTimer) clearInterval(clockTimer);
    clockTimer = setInterval(tickClock, 20000);

    // Страховка от «белой полосы»: если корпус телефона схлопнулся
    // (старый Safari без inset/dvh, контейнер-квирки ST 1.18) —
    // принудительно растягиваем инлайн-стилями на весь экран.
    setTimeout(() => {
        try {
            const ph = document.getElementById('gp-phone');
            if (!ph) return;
            const r = ph.getBoundingClientRect();
            if (r.height < 200 || r.width < 200) {
                console.warn(`[GlassPhone] Phone collapsed (${Math.round(r.width)}x${Math.round(r.height)}) — forcing fullscreen fallback`);
                Object.assign(ov.style, {
                    position: 'fixed', top: '0', left: '0',
                    width: '100vw', height: '100vh', display: 'flex',
                });
                Object.assign(ph.style, {
                    width: '100vw', height: '100vh', maxHeight: 'none', borderRadius: '0',
                });
            }
        } catch (e) { /* ignore */ }
    }, 80);
}

export function closePhone() {
    flushCasinoSession(); // если закрыли телефон прямо из казино — итог всё равно уходит в журнал
    flushOrderToast();    // и про срок доставки собранной корзины скажем сразу
    // Недописанный текст переживает закрытие телефона
    try { captureDrafts(document.getElementById('gp-screen')); } catch (e) { /* ignore */ }
    const ov = document.getElementById('gp-overlay');
    if (ov) ov.classList.remove('gp-open');
    unlockRoleplayPage();
    if (clockTimer) { clearInterval(clockTimer); clockTimer = null; }
}

function togglePhone() {
    if (isPhoneOpen()) closePhone();
    else openPhone();
}

function tickClock() {
    const rpDt = getRpDateTime();
    const el = document.getElementById('gp-clock');
    if (el) {
        // RP-время если есть, иначе реальное
        const h = rpDt?.hours ?? new Date().getHours();
        const m = rpDt?.minutes ?? new Date().getMinutes();
        el.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    const rp = document.getElementById('gp-rpdate');
    if (rp) {
        rp.textContent = rpDt?.label || '';
    }
}

// ═══ Рендер экранов ═══

// Приложения со своим оформлением (дискорд, твич, сторис, экран блокировки)
// рисуют фон сами и должны доходить до краёв корпуса — общие поля экрана им
// только мешают.
const BLEED_SCREENS = new Set(['discord', 'dchannel', 'twitch', 'stream', 'mystream', 'igstory', 'lock']);

export function render(force = false) {
    const screen = document.getElementById('gp-screen');
    if (!screen || !isPhoneOpen()) return;
    // Keep the journal DOM mounted during unrelated SillyTavern / phone updates.
    // Replacing its textarea while Android IME is active causes keyboard flicker
    // and viewport jumps. Explicit journal actions use render(true).
    if (!force && currentScreen === 'notes' && screen.querySelector('.gp-notes-scroll')) return;
    // During a quiet phone LLM request SillyTavern and other extensions can emit many
    // render-triggering events. Keep the already-painted Messages DOM frozen so the
    // phone does not flash/rebuild (the old "disco" bug). We render exactly once
    // after the quiet request finishes.
    if (_pvThreadRenderFrozen && currentScreen === 'thread') return;
    if (currentScreen !== 'notes' || _notesTab !== 'plans') { screen.onclick = null; screen.onchange = null; }
    bindStopGen(screen);
    bindZoom(screen);
    screen.classList.toggle('gp-screen-bleed', BLEED_SCREENS.has(currentScreen));
    // «Оформление» — экран настроек: ему нечего показывать из ролевой, а
    // перерисовка приходит на каждое сообщение и сбивает прокрутку каруселей
    // и ползунков. Свои изменения он рисует сам, вызывая renderAppearance.
    if (currentScreen === 'appearance' && screen.querySelector('.gp-appearance-scroll')) return;
    captureDrafts(screen);
    if (currentScreen === 'lock') renderLock(screen);
    else if (currentScreen === 'thread' && currentThreadKey) renderThread(screen);
    else if (currentScreen === 'add') renderAdd(screen);
    else if (currentScreen === 'list') renderList(screen);
    else if (currentScreen === 'tw') renderTw(screen);
    else if (currentScreen === 'twthread' && currentTweetId) renderTwThread(screen);
    else if (currentScreen === 'ig') renderIg(screen);
    else if (currentScreen === 'igview' && currentPostId) renderIgView(screen);
    else if (currentScreen === 'ignew') renderIgNew(screen);
    else if (currentScreen === 'ignewstory') renderIgNewStory(screen);
    else if (currentScreen === 'igstory') renderIgStory(screen);
    else if (currentScreen === 'socialhub') renderSocialHub(screen);
    else if (currentScreen === 'storyevent') renderStoryEvent(screen);
    else if (currentScreen === 'storyresult') renderStoryResult(screen);
    else if (currentScreen === 'socialjournal') renderSocialJournal(screen);
    else if (currentScreen === 'of') renderOf(screen);
    else if (currentScreen === 'ofview' && currentPostId) renderOfView(screen);
    else if (currentScreen === 'ofnew') renderOfNew(screen);
    else if (currentScreen === 'bank') renderBank(screen);
    else if (currentScreen === 'banktx') renderBankTx(screen);
    else if (currentScreen === 'bankloan') renderBankLoan(screen);
    else if (currentScreen === 'bankrec') renderBankRec(screen);
    else if (currentScreen === 'shop') renderShop(screen);
    else if (currentScreen === 'shopcat') renderShopCat(screen);
    else if (currentScreen === 'shoporders') renderShopOrders(screen);
    else if (currentScreen === 'ordchat') renderCourierChat(screen);
    else if (currentScreen === 'casino') renderCasino(screen);
    else if (currentScreen === 'news') renderNews(screen);
    else if (currentScreen === 'chans') renderChannels(screen);
    else if (currentScreen === 'chan') renderChannel(screen);
    else if (currentScreen === 'chanpost') renderChanPost(screen);
    else if (currentScreen === 'anonnew') renderAnonNew(screen);
    else if (currentScreen === 'tinder') renderTinder(screen);
    else if (currentScreen === 'tinprofile') renderTinProfile(screen);
    else if (currentScreen === 'tinmatches') renderTinMatches(screen);
    else if (currentScreen === 'tinme') renderTinMe(screen);
    else if (currentScreen === 'discord') renderDiscord(screen);
    else if (currentScreen === 'dchannel') renderDChannel(screen);
    else if (currentScreen === 'twitch') renderTwitch(screen);
    else if (currentScreen === 'stream') renderStream(screen);
    else if (currentScreen === 'mystream') renderMyStream(screen);
    else if (currentScreen === 'notes') renderNotes(screen);
    else if (currentScreen === 'appearance') renderAppearance(screen);
    else if (currentScreen === 'brain') renderBrain(screen);
    else if (currentScreen === 'memories') renderMemories(screen);
    else renderHome(screen);
    // Возвращаем набранный текст: перерисовка (генерация картинки, публикация,
    // новое сообщение) больше не стирает то, что юзер печатает
    restoreDrafts(screen);
    // Перевод отрендеренного экрана (en) / восстановление оригиналов (ru)
    try { trDom(screen); } catch (e) { /* ignore */ }
}

const SHOP_SCREENS = new Set(['shop', 'shopcat', 'shoporders']);

function goto(screenName) {
    // Ушла из магазина — значит корзина собрана, пора сказать про доставку
    if (SHOP_SCREENS.has(currentScreen) && !SHOP_SCREENS.has(screenName)) flushOrderToast();
    currentScreen = screenName;
    render();
}

// Сохранение позиции скролла ленты при перерисовке (innerHTML сбрасывает scrollTop,
// из-за этого клик по «Нарисовать»/лайку дёргал экран наверх)
function setHtmlKeepScroll(screen, selector, html) {
    const prev = screen.querySelector(selector)?.scrollTop ?? null;
    screen.innerHTML = html;
    if (prev !== null) {
        const el = screen.querySelector(selector);
        if (el) el.scrollTop = prev;
    }
}

function compactNum(value) {
    const n = Number(value) || 0;
    if (n >= 1000000) return `${(n / 1000000).toFixed(n >= 10000000 ? 0 : 1)}м`;
    if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}к`;
    return String(n);
}

function performanceHtml(post) {
    const p = post?.performance;
    if (!p?.settled) return '';
    const delta = Number(p.followerDelta) || 0;
    return `<div class="gp-social-result">
        <div class="gp-social-result-head"><b>${esc(p.label)}</b><span>${ic('fa-eye')} ${compactNum(p.reach)} · <span class="${delta < 0 ? 'gp-social-down' : 'gp-social-up'}">${delta >= 0 ? '+' : ''}${delta}</span> ${ic('fa-user-plus')}</span></div>
        <div class="gp-sentiment" title="Позитивные ${p.positive}% · нейтральные ${p.neutral}% · негативные ${p.negative}%"><i class="gp-sent-pos" style="width:${p.positive}%"></i><i class="gp-sent-neu" style="width:${p.neutral}%"></i><i class="gp-sent-neg" style="width:${p.negative}%"></i></div>
        <div class="gp-sentiment-labels"><span>${p.positive}% позитив</span><span>${p.neutral}% нейтр.</span><span>${p.negative}% негатив</span></div>
    </div>`;
}


// Репутация: живые статусы генерятся моделью, кэш по тиру (перегенерация
// только когда репутация перешла в другой тир)
const _repBusy = new Set();
function ensureRepLabels(s) {
    for (const platform of ['twitter', 'instagram']) {
        const p = s.socialProfiles?.[platform];
        if (!p) continue;
        // Ключ кэша: тир + язык интерфейса (сменила язык → статус перегенерится)
        const tierKey = `${getReputationStatus(p.reputation)}|${lang()}`;
        if (p.repLabel && p.repTier === tierKey) continue;
        if (_repBusy.has(platform)) continue;
        _repBusy.add(platform);
        generateRepLabel(platform, p.reputation, p.followers, getReputationStatus(p.reputation)).then(label => {
            if (label) {
                p.repLabel = label;
                p.repTier = tierKey;
                saveMeta();
                if (isPhoneOpen() && currentScreen === 'socialhub') render();
            }
        }).catch(() => {}).finally(() => _repBusy.delete(platform));
    }
}
function repLabelOf(s, platform) {
    const p = s.socialProfiles?.[platform];
    if (!p) return '';
    const tierKey = `${getReputationStatus(p.reputation)}|${lang()}`;
    return (p.repTier === tierKey && p.repLabel) || getReputationStatus(p.reputation);
}

function socialImpactToast(platform, post, addedComments = 0, addedFeed = 0) {
    const p = post?.performance;
    if (!p) return;
    const contacts = (platform === 'twitter' ? post.replies : post.comments || [])
        .filter(r => typeof r.ak === 'string' && r.ak.startsWith('contact:'));
    const names = [...new Set(contacts.map(r => r.author).filter(Boolean))].slice(0, 2);
    const delta = Number(p.followerDelta) || 0;
    const reaction = names.length ? `${names.join(' и ')} отреагировали` : `${addedComments} новых реакций`;
    const feed = addedFeed > 0 ? ` · лента +${addedFeed}` : '';
    toast(`${p.label}: ${reaction} · охват ${compactNum(p.reach)} · ${delta >= 0 ? '+' : ''}${delta} подписчиков${feed}`,
        platform === 'twitter' ? 'fa-x-twitter' : 'fa-instagram');
}

// Соц-системы включены? Выключенные оставляют соцсети как есть, но без
// охватов, подписчиков, репутации, рекламы и сюжетных поворотов.
function systemsOn() { return getSettings().socialSystems !== false; }

async function finalizeSocialPost(platform, post, { addedComments = 0, addedFeed = 0 } = {}) {
    if (!post || post.ak !== 'user' || post.performance?.settled) return null;
    if (!systemsOn()) return null;
    const perf = settleSocialPost(platform, post);
    updatePhoneInjection();
    if (perf) {
        socialImpactToast(platform, post, addedComments, addedFeed);
        const event = await maybeGenerateStoryEvent(platform, post);
        if (event) {
            updatePhoneInjection();
            toast('Новый сюжетный поворот', 'fa-wand-sparkles');
            // Не прячем созданный ивент за отдельной иконкой: сразу показываем
            // три варианта ответа и поле собственного действия.
            goto('storyevent');
        }
    }
    return perf;
}

function bindSocialSystemLinks(root) {
    root.querySelectorAll('[data-open-social]').forEach(b => b.addEventListener('click', () => goto('socialhub')));
    root.querySelectorAll('[data-open-story]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); goto('storyevent'); }));
}

function findStoryEvent(id) {
    const systems = getSystemsView();
    if (systems.storyEvents.active?.id === id) return systems.storyEvents.active;
    return (systems.storyEvents.recent || []).find(e => e.id === id) || null;
}

function openStoryResult(id) {
    selectedStoryEventId = id;
    goto('storyresult');
}

function renderSocialHub(screen) {
    currentScreen = 'socialhub';
    const pulse = getWorldPulse();
    const active = pulse.active || [];
    const candidates = pulse.candidates || [];
    const typeIcon = t => ({relationship:'fa-heart', mystery:'fa-magnifying-glass', social:'fa-people-group', world:'fa-earth-europe', opportunity:'fa-door-open', consequence:'fa-link'})[t] || 'fa-circle-dot';
    const typeName = t => ({relationship:'отношения', mystery:'тайна', social:'социальное', world:'мир', opportunity:'возможность', consequence:'последствие'})[t] || 'мир';
    const scopeName = v => ({personal:'личное', local:'локальное', world:'мировое'})[v] || 'локальное';
    const modeName = m => ({background:'Фон', noticeable:'Заметно', key:'Ключевое'})[m] || 'Фон';
    screen.innerHTML = `<div class="gp-header gp-thread-header">
        <button class="gp-iconbtn" id="gp-back">${ic('fa-chevron-left')}</button>
        <div class="gp-title gp-title-app">Пульс мира</div>
        <button class="gp-iconbtn" id="gp-open-journal" title="Журнал памяти">${ic('fa-book-open')}</button>
    </div><div class="gp-feed gp-social-hub gp-world-pulse">
        <section class="gp-pulse-intro">
            <div class="gp-pulse-orbit">${ic('fa-wave-square')}</div>
            <div><b>Нити, которые могут однажды ожить</b><span>Ты командуешь миром. ИИ только замечает возможности — ничего не входит в сюжет без твоего решения.</span></div>
        </section>
        <section class="gp-social-section gp-pulse-active"><h3>${ic('fa-location-dot')} Активные нити <small>${active.length}/8</small></h3>
            ${active.length ? active.map(x => `<article class="gp-pulse-card gp-pulse-${esc(x.type)}">
                <div class="gp-pulse-card-head"><span>${ic(typeIcon(x.type))}</span><div><b>${esc(x.title)}</b><small>${esc(x.scope === 'personal' ? 'личное' : x.scope === 'world' ? 'мир' : 'локальное')}</small></div></div>
                <p>${esc(x.summary)}</p>${x.entryHint ? `<em>${esc(x.entryHint)}</em>` : ''}
                <div class="gp-pulse-actions"><button data-pulse-mode="${esc(x.id)}">${ic('fa-sliders')} ${modeName(x.mode)}</button><button data-pulse-close="${esc(x.id)}">${ic('fa-check')} Завершить</button></div>
            </article>`).join('') : `<div class="gp-event-empty"><b>Пока тихо</b><span>Здесь появятся только те нити, которые ты сама впустишь в мир.</span></div>`}
        </section>
        <section class="gp-social-section gp-pulse-candidates"><h3>${ic('fa-sparkles')} Возможности</h3>
            ${candidates.length ? candidates.map(x => `<article class="gp-pulse-card gp-pulse-candidate">
                <div class="gp-pulse-card-head"><span>${ic(typeIcon(x.type))}</span><div><b>${esc(x.title)}</b><small>${esc(typeName(x.type))} · ${esc(scopeName(x.scope))}</small></div></div>
                <p>${esc(x.summary)}</p>${x.whyNow ? `<em>Почему сейчас: ${esc(x.whyNow)}</em>` : ''}
                <div class="gp-pulse-actions"><button data-pulse-accept="${esc(x.id)}">${ic('fa-plus')} Впустить</button><button data-pulse-dismiss="${esc(x.id)}">${ic('fa-xmark')} Не надо</button></div>
            </article>`).join('') : `<div class="gp-event-empty"><b>Новых нитей нет</b><span>Нажми «Прислушаться к миру». Модель посмотрит только на компактный свежий контекст, канон и релевантный лорбук.</span></div>`}
            <div class="gp-pulse-generate-row"><button class="gp-event-generate" id="gp-pulse-generate" ${genBusy ? 'disabled' : ''}>${genBusy ? ic('fa-spinner fa-spin') : ic('fa-wave-square')} ${candidates.length ? 'Прислушаться снова' : 'Прислушаться к миру'}</button><button class="gp-event-generate gp-pulse-stir" id="gp-pulse-stir" ${genBusy ? 'disabled' : ''}>${ic('fa-wand-magic-sparkles')} Расшевелить мир</button></div>
        </section>
        <div class="gp-pulse-note">${ic('fa-shield-halved')} Нити не являются Scene Omens: они не бросают вызов текущей сцене и не разыгрываются сами.</div>
    </div>`;
    screen.querySelector('#gp-back')?.addEventListener('click', () => goto('home'));
    screen.querySelector('#gp-open-journal')?.addEventListener('click', () => goto('socialjournal'));
    screen.querySelector('#gp-pulse-generate')?.addEventListener('click', async () => {
        if (genBusy) return; genBusy = true; render();
        try { const rows = await generateWorldPulseCandidates('listen'); toast(rows.length ? `Мир откликнулся: ${rows.length}` : 'Сейчас мир не просит вмешательства', rows.length ? 'fa-wave-square' : 'fa-moon'); }
        catch (e) { console.error('[PocketVerse] world pulse failed:', e); toast('Не удалось прислушаться к миру', 'fa-circle-exclamation'); }
        finally { genBusy = false; if (currentScreen === 'socialhub') render(); }
    });
    screen.querySelector('#gp-pulse-stir')?.addEventListener('click', async () => {
        if (genBusy) return; genBusy = true; render();
        try { const rows = await generateWorldPulseCandidates('stir'); toast(rows.length ? `Нашлось идей: ${rows.length}` : 'Даже сейчас мир просит оставить его в покое', rows.length ? 'fa-wand-magic-sparkles' : 'fa-moon'); }
        catch (e) { console.error('[PocketVerse] world pulse stir failed:', e); toast('Не удалось расшевелить мир', 'fa-circle-exclamation'); }
        finally { genBusy = false; if (currentScreen === 'socialhub') render(); }
    });
    screen.querySelectorAll('[data-pulse-accept]').forEach(b => b.addEventListener('click', () => { activateWorldPulseThread(b.dataset.pulseAccept, 'background'); updatePhoneInjection(); toast('Нить впущена в мир', 'fa-link'); render(); }));
    screen.querySelectorAll('[data-pulse-dismiss]').forEach(b => b.addEventListener('click', () => { archiveWorldPulseThread(b.dataset.pulseDismiss, 'dismissed'); render(); }));
    screen.querySelectorAll('[data-pulse-close]').forEach(b => b.addEventListener('click', () => { archiveWorldPulseThread(b.dataset.pulseClose, 'closed'); updatePhoneInjection(); render(); }));
    screen.querySelectorAll('[data-pulse-mode]').forEach(b => b.addEventListener('click', () => {
        const p = getWorldPulse(); const x = p.active.find(x => x.id === b.dataset.pulseMode); if (!x) return;
        const next = x.mode === 'background' ? 'noticeable' : x.mode === 'noticeable' ? 'key' : 'background'; setWorldPulseMode(x.id, next); updatePhoneInjection(); render();
    }));
}

function renderStoryEvent(screen) {
    currentScreen = 'storyevent';
    const event = getSystemsView().storyEvents.active;
    if (!event) { goto('socialhub'); return; }
    const waiting = !!event.appliedAt;
    const alternatives = Array.isArray(event.alternatives) && event.alternatives.length ? event.alternatives : [event];
    const choosingEvent = !waiting && alternatives.length > 1 && event.selectedAlternative == null;
    if (choosingEvent) {
        screen.innerHTML = `<div class="gp-header gp-thread-header"><button class="gp-iconbtn" id="gp-back">${ic('fa-chevron-left')}</button><div class="gp-title gp-title-app">Выбрать ивент</div></div><div class="gp-feed gp-story-screen"><div class="gp-story-card">
            <div class="gp-story-kicker">${ic('fa-wand-sparkles')} Три возможных поворота</div><h2>Какую нить вплести в историю?</h2><p class="gp-story-hook">Выбери сам ивент. Следующим экраном появятся варианты реакции на него.</p>
            <div class="gp-story-choices">${alternatives.map((a, i) => `<button data-select-event="${i}"><b>${esc(a.title)}</b><span>${esc(a.hook)}</span></button>`).join('')}</div>
            <div class="gp-story-foot"><button id="gp-event-later">Не сейчас</button><button id="gp-event-decline">Отклонить все</button></div>
        </div></div>`;
        screen.querySelector('#gp-back')?.addEventListener('click', () => goto('socialhub'));
        screen.querySelectorAll('[data-select-event]').forEach(b => b.addEventListener('click', () => {
            if (selectStoryEvent(Number(b.getAttribute('data-select-event')))) render();
        }));
        screen.querySelector('#gp-event-later')?.addEventListener('click', () => { deferEvent(); goto('socialhub'); });
        screen.querySelector('#gp-event-decline')?.addEventListener('click', () => { if (confirm('Отклонить все предложенные сюжетные повороты?')) { declineEvent(); updatePhoneInjection(); goto('socialhub'); } });
        return;
    }
    screen.innerHTML = `<div class="gp-header gp-thread-header"><button class="gp-iconbtn" id="gp-back">${ic('fa-chevron-left')}</button><div class="gp-title gp-title-app">Сюжетный поворот</div></div><div class="gp-feed gp-story-screen"><div class="gp-story-card">
        <div class="gp-story-kicker">${ic('fa-wand-sparkles')} ${esc(event.urgency === 'immediate' ? 'Срочно' : 'Новая нить истории')}</div><h2>${esc(event.title)}</h2><p class="gp-story-hook">${esc(event.hook)}</p>
        ${event.openingMessage ? `<blockquote>${esc(event.openingMessage)}</blockquote>` : ''}${event.involvedActors?.length ? `<div class="gp-story-actors">${event.involvedActors.map(a => `<span>${ic('fa-user')} ${esc(a)}</span>`).join('')}</div>` : ''}
        ${waiting ? `<div class="gp-story-result"><b>${ic('fa-circle-check')} Решение принято</b><p>${esc(event.immediateResult)}</p>${event.state === 'waiting_rp' ? '<small>Продолжение естественно появится в основном RP.</small>' : ''}</div>` : `<div class="gp-story-choices">${event.choices.map((c, i) => `<button data-event-choice="${i}"><b>${esc(c.label)}</b><span>${esc(c.text)}</span></button>`).join('')}<button id="gp-custom-toggle"><b>${ic('fa-pen')} Свой ответ</b><span>Написать собственное действие или реплику</span></button></div><div class="gp-story-custom" id="gp-story-custom" hidden><textarea id="gp-story-text" rows="4" maxlength="1000" placeholder="Что вы отвечаете или делаете?"></textarea><button class="gp-primary" id="gp-story-send">Продолжить</button></div><div class="gp-story-foot"><button id="gp-event-later">Не сейчас</button><button id="gp-event-decline">Отклонить</button></div>`}
    </div></div>`;
    screen.querySelector('#gp-back')?.addEventListener('click', () => goto('socialhub'));
    const resolve = async choice => {
        if (genBusy) return;
        genBusy = true;
        screen.querySelectorAll('button, textarea').forEach(el => { el.disabled = true; });
        const loading = document.createElement('div');
        loading.className = 'gp-story-loading';
        loading.innerHTML = `<div>${ic('fa-spinner fa-spin')}</div><b>История меняется…</b><span>Ждём итог и последствия выбранного ответа</span>`;
        screen.appendChild(loading);
        try { const outcome = await resolveStoryEvent(choice); if (outcome) { await logSocialToChat(`[Сюжетный поворот из соцсети] ${event.hook} ${getUserName()}: «${outcome.choice.text}». Результат: ${outcome.event.immediateResult}`); updatePhoneInjection(); toast('Выбор изменил историю', 'fa-wand-sparkles'); selectedStoryEventId = outcome.event.id; currentScreen = 'storyresult'; } }
        catch (e) { console.error('[GlassPhone] story event failed:', e); toast('Не удалось продолжить событие', 'fa-circle-exclamation'); }
        finally { genBusy = false; render(); }
    };
    screen.querySelectorAll('[data-event-choice]').forEach(b => b.addEventListener('click', () => resolve(event.choices[Number(b.getAttribute('data-event-choice'))])));
    screen.querySelector('#gp-custom-toggle')?.addEventListener('click', () => { const el = screen.querySelector('#gp-story-custom'); el.hidden = !el.hidden; screen.querySelector('#gp-story-text')?.focus(); });
    screen.querySelector('#gp-story-send')?.addEventListener('click', () => { const text = screen.querySelector('#gp-story-text')?.value.trim(); if (text) resolve({ label: 'Свой ответ', intent: 'custom', text, custom: true }); });
    screen.querySelector('#gp-event-later')?.addEventListener('click', () => { deferEvent(); goto('socialhub'); });
    screen.querySelector('#gp-event-decline')?.addEventListener('click', () => { if (confirm('Отклонить этот сюжетный поворот?')) { declineEvent(); updatePhoneInjection(); goto('socialhub'); } });
}

function renderStoryResult(screen) {
    currentScreen = 'storyresult';
    const event = findStoryEvent(selectedStoryEventId);
    if (!event) { goto('socialhub'); return; }
    const decision = event.decisions?.[event.decisions.length - 1];
    const shift = event.audienceShift || {};
    const reactions = event.botReactions || [];
    const relations = event.relationshipSignals || [];
    screen.innerHTML = `<div class="gp-header gp-thread-header"><button class="gp-iconbtn" id="gp-back">${ic('fa-chevron-left')}</button><div class="gp-title gp-title-app">Итог ивента</div></div>
    <div class="gp-feed gp-story-screen"><article class="gp-story-card gp-story-summary">
        <div class="gp-story-kicker">${ic(event.state === 'failed' ? 'fa-triangle-exclamation' : 'fa-circle-check')} ${event.state === 'failed' ? 'Неудачный исход' : 'Ивент завершён'}</div>
        <h2>${esc(event.title)}</h2><p class="gp-story-hook">${esc(event.hook)}</p>
        ${decision ? `<section><h3>Твой выбор</h3><blockquote><b>${esc(decision.label)}</b><br>${esc(decision.text)}</blockquote></section>` : ''}
        <section><h3>Итог</h3><p>${esc(event.immediateResult || event.recap || 'Ивент завершён.')}</p></section>
        ${reactions.length ? `<section><h3>Реакции</h3><div class="gp-result-reactions">${reactions.map(r => `<div class="gp-result-reaction gp-sent-${esc(r.sentiment)}"><b>${esc(r.author || 'Аккаунт')}</b><small>${esc(r.channel)}</small><p>${esc(r.text)}</p></div>`).join('')}</div></section>` : ''}
        ${(shift.positive || shift.neutral || shift.negative) ? `<section><h3>Сдвиг аудитории</h3><div class="gp-result-stats"><span class="gp-social-up">+${Number(shift.positive) || 0} позитив</span><span>+${Number(shift.neutral) || 0} нейтр.</span><span class="gp-social-down">+${Number(shift.negative) || 0} негатив</span></div>${event.followerModifier && event.followerModifier !== 1 ? `<small>Модификатор подписчиков: ×${esc(event.followerModifier)}</small>` : ''}</section>` : ''}
        ${relations.length ? `<section><h3>Отношения</h3>${relations.map(r => `<div class="gp-result-note"><b>${esc(r.actor)}</b><small>${esc(r.direction)}</small><p>${esc(r.reason)}</p></div>`).join('')}</section>` : ''}
        ${event.rpConsequence ? `<section><h3>Последствие в RP</h3><div class="gp-result-note"><b>${esc(event.rpConsequence.actors?.join(', ') || 'Следующая сцена')}</b><small>${esc(event.rpConsequence.urgency)}</small><p>${esc(event.rpConsequence.summary)}</p></div></section>` : ''}
        ${event.nextHook ? `<section><h3>Следующий крючок</h3><p>${esc(event.nextHook)}</p></section>` : ''}
        <div class="gp-story-foot"><button id="gp-result-archive">Вернуться в архив</button></div>
    </article></div>`;
    const back = () => goto('socialhub');
    screen.querySelector('#gp-back')?.addEventListener('click', back);
    screen.querySelector('#gp-result-archive')?.addEventListener('click', back);
}

function renderSocialJournal(screen) {
    currentScreen = 'socialjournal';
    const pulse = getWorldPulse();
    const active = Array.isArray(pulse.active) ? pulse.active : [];
    const archive = Array.isArray(pulse.archive) ? pulse.archive : [];
    const typeName = t => ({relationship:'отношения', mystery:'тайна', social:'социальное', world:'мир', opportunity:'возможность', consequence:'последствие'})[t] || 'мир';
    const scopeName = v => ({personal:'личное', local:'локальное', world:'мировое'})[v] || 'локальное';
    const reasonName = v => ({dismissed:'отклонено', closed:'завершено'})[v] || 'архив';
    screen.innerHTML = `<div class="gp-header gp-thread-header"><button class="gp-iconbtn" id="gp-back">${ic('fa-chevron-left')}</button><div class="gp-title gp-title-app">Журнал нитей</div></div>
    <div class="gp-feed gp-journal-screen">
        <div class="gp-journal-info">${ic('fa-book-open')} Это локальный журнал Пульса мира. Он хранится в PocketVerse и <b>не отправляется целиком модели</b>. При поиске новых идей модель получает только короткий список активных нитей, чтобы не повторяться.</div>
        <section class="gp-social-section"><h3>${ic('fa-location-dot')} Активные <small>${active.length}/8</small></h3>
        ${active.length ? active.map(x => `<article class="gp-pulse-card"><div class="gp-pulse-card-head"><div><b>${esc(x.title)}</b><small>${esc(typeName(x.type))} · ${esc(scopeName(x.scope))}</small></div></div><p>${esc(x.summary)}</p></article>`).join('') : `<div class="gp-event-empty"><b>Пока пусто</b><span>Здесь появятся только нити, которые ты сама нажмёшь «Впустить».</span></div>`}</section>
        <section class="gp-social-section"><h3>${ic('fa-box-archive')} Архив</h3>
        ${archive.length ? archive.slice(0, 30).map(x => `<article class="gp-pulse-card"><div class="gp-pulse-card-head"><div><b>${esc(x.title)}</b><small>${esc(reasonName(x.archiveReason || x.reason || x.state))}</small></div></div><p>${esc(x.summary)}</p></article>`).join('') : `<div class="gp-event-empty"><b>Архив пуст</b><span>Отклонённые и завершённые нити останутся здесь только для тебя.</span></div>`}</section>
    </div>`;
    screen.querySelector('#gp-back')?.addEventListener('click', () => goto('socialhub'));
}

// ── Экран блокировки ──
// Часы по времени ролевой и всё непрочитанное одним списком. Отметки
// «просмотрено» для лент держим в meta: у постов своих счётчиков нет.

function feedSeen() {
    const m = getMeta();
    if (!m.feedSeen || typeof m.feedSeen !== 'object') m.feedSeen = {};
    return m.feedSeen;
}

// Лента просмотрена — запоминаем длину, дальше считаем прирост
export function markFeedSeen(kind, count) {
    const s = feedSeen();
    if (s[kind] === count) return;      // без лишнего saveMeta: он сбрасывает кэш чата
    s[kind] = count;
    saveMeta();
}

function feedNew(kind, count) {
    const seen = feedSeen()[kind];
    // Первый заход: показывать «всё новое» бессмысленно — считаем прочитанным
    if (seen === undefined) return 0;
    return Math.max(0, count - seen);
}

// Всё непрочитанное для локскрина: {icon, title, text, time, go}
function lockNotifications() {
    const out = [];
    try {
        for (const t of getThreadList()) {
            if (!t.unread || !t.last) continue;
            out.push({
                icon: t.isGroup ? 'fa-user-group' : 'fa-comment-dots',
                title: t.name,
                text: t.last.photoDesc && !t.last.text ? 'Фото' : (t.last.text || ''),
                count: t.unread,
                go: () => { currentThreadKey = t.key; goto('thread'); },
            });
        }
    } catch (e) { /* ignore */ }
    try {
        for (const o of getOrders()) {
            const n = courierUnread(o);
            if (!n) continue;
            const last = orderChat(o).filter(m => !m.user).slice(-1)[0];
            out.push({
                icon: 'fa-truck-fast',
                title: o.courier?.name || 'Курьер',
                text: last?.text || '',
                count: n,
                go: () => { _ordChatId = o.id; goto('ordchat'); },
            });
        }
    } catch (e) { /* ignore */ }
    try {
        for (const r of getBankReminders()) {
            out.push({
                icon: r.kind === 'loan' ? 'fa-landmark' : 'fa-file-invoice-dollar',
                title: r.overdue ? 'Просрочен платёж' : 'Пора оплатить',
                text: `${r.name} — ${fmtMoney(r.amount)}`,
                go: () => goto('bank'),
            });
        }
    } catch (e) { /* ignore */ }
    try {
        const feeds = [
            { kind: 'tw', n: feedNew('tw', getTweets().length), icon: 'fa-x-twitter', title: 'Twitter', text: 'Новое в ленте' },
            { kind: 'ig', n: feedNew('ig', getIgPosts().length), icon: 'fa-instagram', title: 'Instagram', text: 'Новое в ленте' },
            { kind: 'of', n: feedNew('of', getOfPosts().length), icon: 'fa-heart', title: 'OnlyFans', text: 'Новое в ленте' },
        ];
        for (const f of feeds) {
            if (f.n > 0) out.push({ icon: f.icon, title: f.title, text: f.text, count: f.n, go: () => goto(f.kind) });
        }
    } catch (e) { /* ignore */ }
    try {
        if (getSystemsView().storyEvents.active) {
            out.push({ icon: 'fa-wand-sparkles', title: 'Ивент', text: 'Ждёт твоего решения', go: () => goto('storyevent') });
        }
    } catch (e) { /* ignore */ }
    return out;
}

export function lockUnreadCount() {
    try { return lockNotifications().reduce((s, n) => s + (n.count || 1), 0); } catch (e) { return 0; }
}

function renderLock(screen) {
    currentScreen = 'lock';
    const rpDt = getRpDateTime();
    const d = new Date();
    const DAYS = DAYS_I18N[lang()];
    const MONTHS = MONTHS_I18N[lang()];
    const h = rpDt?.hours ?? d.getHours();
    const mi = rpDt?.minutes ?? d.getMinutes();
    const dateStr = rpDt
        ? `${DAYS[new Date(rpDt.year, rpDt.month - 1, rpDt.day).getDay()]}, ${rpDt.day} ${MONTHS[rpDt.month - 1]}`
        : `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
    const notes = lockNotifications();

    screen.innerHTML = `
        <div class="gp-lock" id="gp-lock">
            <div class="gp-lock-top">
                <div class="gp-lock-clock">${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}</div>
                <div class="gp-lock-date">${esc(dateStr)}</div>
            </div>
            <div class="gp-lock-notes">
                ${notes.map((n, i) => `
                    <div class="gp-lock-note" data-lock-note="${i}" style="animation-delay:${Math.min(i * 60, 300)}ms">
                        <span class="gp-lock-note-icon">${/^fa-(x-twitter|instagram)$/.test(n.icon) ? brand(n.icon) : ic(n.icon)}</span>
                        <span class="gp-lock-note-body">
                            <span class="gp-lock-note-title">${esc(n.title)}${n.count > 1 ? ` <b>${n.count}</b>` : ''}</span>
                            ${n.text ? `<span class="gp-lock-note-text">${esc(String(n.text).slice(0, 90))}</span>` : ''}
                        </span>
                    </div>`).join('')}
            </div>
            <div class="gp-lock-bottom">
                <div class="gp-lock-hint">◈ Войти в PocketVerse</div>
            </div>
        </div>`;

    const unlock = () => { goto('home'); };
    screen.querySelectorAll('[data-lock-note]').forEach(el => el.addEventListener('click', () => {
        const n = notes[parseInt(el.getAttribute('data-lock-note'))];
        if (n) n.go(); else unlock();
    }));
    screen.querySelector('.gp-lock-hint')?.addEventListener('click', unlock);

    // PocketVerse 2.0: вход только явным тапом — никакого swipe-up жеста.
    // Уведомления по-прежнему открываются своим тапом выше.
    screen.querySelector('.gp-lock-hint')?.addEventListener('click', unlock);
}

// ── Brain Inspector: ничего не генерирует, только показывает текущую начинку ──
function renderBrain(screen) {
    currentScreen = 'brain';
    const b = getPhoneBrainSnapshot();
    const st = getSettings();
    const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const mode = b.phoneTurn === 'now' ? '📱 PHONE-ONLY' : b.phoneTurn === 'justEnded' ? '↩ после телефона' : '😴 обычный RP · мини-мост';
    const brain = String(st.brainMode || 'balanced');
    screen.innerHTML = `
      <div class="gp-brain">
        <div class="gp-brain-head"><button class="gp-back">‹</button><div><b>🧠 Мозг PocketVerse</b><small>Настройки здесь не вызывают модель</small></div><button class="gp-brain-refresh" title="Обновить">↻</button></div>
        <div class="gp-brain-scroll">
          <div class="gp-brain-status"><span>${b.injectionEnabled ? '🟢 Инжект включён' : '⚪ Инжект выключен'}</span><span>${mode}</span><span>≈ ${b.counts.phone} ток.</span></div>
          <div class="gp-brain-control">
            <b>Режим телефонного мозга</b><small>В обычной RP-сцене во всех режимах работает только маленький мост. Полные правила просыпаются при телефонном ходе.</small>
            <div class="gp-brain-modes">
              <button data-brain="lite" class="${brain==='lite'?'on':''}">Lite<small>≈1–1.5k</small></button>
              <button data-brain="balanced" class="${brain==='balanced'?'on':''}">Balanced<small>≈2.5–4k</small></button>
              <button data-brain="deep" class="${brain==='deep'?'on':''}">Deep<small>≈5–7k</small></button>
            </div>
          </div>
          <div class="gp-brain-control"><b>Возможности</b>
            <label><input type="checkbox" id="gp-bc-photo" ${st.phonePhotos!==false?'checked':''}> 📸 Фото</label>
            <label><input type="checkbox" id="gp-bc-meme" ${st.phoneMemes?'checked':''}> 😂 Мемы/GIF <small>GIPHY Bridge</small></label>
            <label><input type="checkbox" id="gp-bc-autophoto" ${st.autoIncomingPhotos!==false?'checked':''}> ✨ Авто-рисовать входящие фото</label>
            <label><input type="checkbox" id="gp-bc-automeme" ${st.autoIncomingMemes!==false?'checked':''}> ⚡ Авто-подставлять GIF</label>
            <div class="gp-brain-api"><small>GIPHY API key · хранится локально и не отправляется языковой модели</small><input id="gp-bc-giphy" type="password" autocomplete="off" placeholder="GIPHY API key" value="${esc(st.giphyApiKey || '')}"></div>
            <label><input type="checkbox" id="gp-bc-groups" ${st.phoneGroups!==false?'checked':''}> 👥 Групповые чаты</label>
          </div>
          <div class="gp-brain-control"><b>✏️ Мои инструкции</b><small>Только поведение телефона; Character Card не заменяет.</small><textarea id="gp-bc-custom" maxlength="1600" rows="4" placeholder="Например: пиши коротко; эмодзи по характеру; фото и мемы только к месту...">${esc(st.phoneCustomInstructions || '')}</textarea><button id="gp-bc-save">Сохранить</button></div>
          <div class="gp-brain-grid">
            <div><b>📱 Сейчас добавляет PocketVerse</b><strong>≈ ${b.counts.phone}</strong><small>${b.counts.phoneChars} знаков</small></div>
            <div><b>🎭 Character Card</b><strong>≈ ${b.counts.card}</strong><small>диагностика, управляет ST</small></div>
            <div><b>👤 Persona</b><strong>≈ ${b.counts.persona}</strong><small>диагностика</small></div>
            <div><b>📖 ST: последние 24 хода</b><strong>≈ ${b.counts.rp}</strong><small>диагностика · НЕ расход PocketVerse</small></div>
          </div>
          <div class="gp-brain-control gp-media-lab"><b>📸 Media Identity Lab · SAFE</b><small>Только проверка маршрута. Ничего не генерирует и не трогает RP.</small><div id="gp-media-diag">Проверяю Silly Images Plus…</div>
          <div class="gp-subject-lab"><b>🎬 Visible Subjects Resolver · SAFE</b><small>Напиши сцену обычными словами — проверим, кто реально попадёт в кадр и чей reference будет выбран.</small>
          <textarea id="gp-subject-scene" rows="3" placeholder="Например: Серафина делает селфи вместе с Ханаби"></textarea>
          <div class="gp-visual-actions"><button id="gp-subject-test">1 · Проверить identity</button><button id="gp-blueprint-ai">2 · ✨ Собрать EN Blueprint</button></div>
          <div id="gp-subject-result"><small>Сначала identity, затем один изолированный LLM-запрос собирает английский Visual Blueprint.</small></div>
          <div id="gp-visual-editor" class="gp-visual-editor" hidden>
            <b>🧩 Visual Blueprint Editor</b><small>Можно править руками. Эти правки модель сама не переписывает.</small>
            <textarea id="gp-blueprint-edit" rows="12" spellcheck="false"></textarea>
            <div class="gp-visual-actions"><button id="gp-blueprint-compile">🪄 Пересобрать промпты</button><button id="gp-blueprint-save">💾 Сохранить</button></div>
            <b>🌙 NovelAI · editable final prompt</b><textarea id="gp-nai-edit" rows="10" spellcheck="false"></textarea><b>🚫 NovelAI · Undesired Content</b><textarea id="gp-nai-uc" rows="6" spellcheck="false" readonly></textarea><small>Автоматически: официальный Human Focus-подобный UC + защита от лишних людей по числу персонажей. Для диагностики.</small>
            <b>🍌 Banana / vision · editable final prompt</b><textarea id="gp-banana-edit" rows="10" spellcheck="false"></textarea>
            <div class="gp-visual-actions"><button id="gp-prompts-save">💾 Сохранить мои prompt</button><button id="gp-visual-reset">↺ Сбросить снимок</button></div>
            <small class="gp-visual-safe">SAFE TEST: сейчас это редактор/компилятор. Кнопку реальной генерации подключим после проверки финального prompt, чтобы не жечь запросы кривым кадром.</small>
          </div></div></div>
          <div class="gp-brain-warning"><b>Phone Context Budget:</b> ✨ теперь использует изолированный generateRaw-контекст вместо полного RP-чата. Lite ≈ до 1–1.5k входа · Balanced ≈ 2.5–4k · Deep ≈ 5–7k (оценка зависит от карточки/истории). Большая цифра RP ниже остаётся только диагностикой ST и целиком в телефонный запрос не копируется.</div>
          <details class="gp-brain-details" open><summary>📱 Что PocketVerse добавляет прямо сейчас</summary><pre>${esc(b.prompt)}</pre></details>
          <details class="gp-brain-details"><summary>🎭 Character Card</summary><pre>${esc(b.cardText || 'Недоступно в текущем контексте.')}</pre></details>
          <details class="gp-brain-details"><summary>📖 RP-срез</summary><pre>${esc(b.rpText || 'История пуста.')}</pre></details>
        </div>
      </div>`;
    screen.querySelector('.gp-back')?.addEventListener('click', () => goto('home'));
    screen.querySelector('.gp-brain-refresh')?.addEventListener('click', () => renderBrain(screen));
    screen.querySelectorAll('[data-brain]').forEach(btn => btn.addEventListener('click', () => {
        getSettings().brainMode = btn.dataset.brain; saveSettingsDebounced(); updatePhoneInjection(); renderBrain(screen);
    }));
    const save = () => {
        const x = getSettings();
        x.phonePhotos = !!screen.querySelector('#gp-bc-photo')?.checked;
        x.phoneMemes = !!screen.querySelector('#gp-bc-meme')?.checked;
        x.phoneGroups = !!screen.querySelector('#gp-bc-groups')?.checked;
        x.autoIncomingPhotos = !!screen.querySelector('#gp-bc-autophoto')?.checked;
        x.autoIncomingMemes = !!screen.querySelector('#gp-bc-automeme')?.checked;
        x.giphyApiKey = String(screen.querySelector('#gp-bc-giphy')?.value || '').trim();
        x.phoneCustomInstructions = String(screen.querySelector('#gp-bc-custom')?.value || '').trim();
        saveSettingsDebounced(); updatePhoneInjection();
    };
    ['#gp-bc-photo','#gp-bc-meme','#gp-bc-groups','#gp-bc-autophoto','#gp-bc-automeme'].forEach(q => screen.querySelector(q)?.addEventListener('change', () => { save(); renderBrain(screen); }));
    screen.querySelector('#gp-bc-save')?.addEventListener('click', () => { save(); renderBrain(screen); });
    const visualKey='PocketVerse.visualLab.last';
    const showVisualEditor = job => {
        const ed=screen.querySelector('#gp-visual-editor'); if(!ed||!job)return;
        ed.hidden=false;
        screen.querySelector('#gp-blueprint-edit').value=JSON.stringify(job.blueprint||{},null,2);
        screen.querySelector('#gp-nai-edit').value=job.novelai||''; const uc=screen.querySelector('#gp-nai-uc'); if(uc) uc.value=job.novelaiUC||buildNovelAiUndesiredContent(job.blueprint||{});
        screen.querySelector('#gp-banana-edit').value=job.banana||'';
    };
    try{const saved=JSON.parse(localStorage.getItem(visualKey)||'null');if(saved)showVisualEditor(saved);}catch(e){}
    screen.querySelector('#gp-blueprint-ai')?.addEventListener('click', async()=>{
        const box=screen.querySelector('#gp-subject-result'); const btn=screen.querySelector('#gp-blueprint-ai');
        if(box)box.textContent='✨ Модель разбирает сцену в английский Visual Blueprint…'; if(btn)btn.disabled=true;
        try{
            const scene=screen.querySelector('#gp-subject-scene')?.value||'';
            const r=await generateMediaVisualBlueprint(scene);
            const job={scene,blueprint:r.blueprint,novelai:compileMediaBlueprint(r.blueprint,'novelai'),novelaiUC:buildNovelAiUndesiredContent(r.blueprint),banana:compileMediaBlueprint(r.blueprint,'banana'),routing:{author:r.author,camera:r.camera,visible:r.visible},edited:false,ts:Date.now()};
            localStorage.setItem(visualKey,JSON.stringify(job)); showVisualEditor(job);
            if(box)box.innerHTML=`<div><b>✅ Blueprint готов.</b> Теперь правь его или финальный prompt руками.</div><div><b>В кадре:</b> ${esc((r.visible||[]).map(x=>x.name).join(' + ')||'не определено')}</div>`;
        }catch(e){if(box)box.textContent=`Blueprint: ${e?.message||e}`;}finally{if(btn)btn.disabled=false;}
    });
    screen.querySelector('#gp-blueprint-compile')?.addEventListener('click',()=>{
        const box=screen.querySelector('#gp-subject-result');
        try{const bp=JSON.parse(screen.querySelector('#gp-blueprint-edit')?.value||'{}');screen.querySelector('#gp-nai-edit').value=compileMediaBlueprint(bp,'novelai'); const uc=screen.querySelector('#gp-nai-uc'); if(uc) uc.value=buildNovelAiUndesiredContent(bp); screen.querySelector('#gp-banana-edit').value=compileMediaBlueprint(bp,'banana');if(box)box.textContent='🪄 Промпты пересобраны из твоего Blueprint. Без LLM.';}catch(e){if(box)box.textContent='JSON Blueprint: '+(e?.message||e);}
    });
    const saveVisual=()=>{try{const old=JSON.parse(localStorage.getItem(visualKey)||'{}');old.blueprint=JSON.parse(screen.querySelector('#gp-blueprint-edit')?.value||'{}');old.novelai=screen.querySelector('#gp-nai-edit')?.value||'';old.banana=screen.querySelector('#gp-banana-edit')?.value||'';old.edited=true;old.ts=Date.now();localStorage.setItem(visualKey,JSON.stringify(old));const box=screen.querySelector('#gp-subject-result');if(box)box.textContent='💾 Сохранено. Твои ручные правки не будут перезаписаны автоматически.';}catch(e){const box=screen.querySelector('#gp-subject-result');if(box)box.textContent='Сохранение: '+(e?.message||e);}};
    screen.querySelector('#gp-blueprint-save')?.addEventListener('click',saveVisual);
    screen.querySelector('#gp-prompts-save')?.addEventListener('click',saveVisual);
    screen.querySelector('#gp-visual-reset')?.addEventListener('click',()=>{localStorage.removeItem(visualKey);const ed=screen.querySelector('#gp-visual-editor');if(ed)ed.hidden=true;const box=screen.querySelector('#gp-subject-result');if(box)box.textContent='Снимок Visual Lab очищен.';});
    screen.querySelector('#gp-subject-test')?.addEventListener('click', async () => {
        const box=screen.querySelector('#gp-subject-result');
        if(!box)return;
        box.textContent='Разбираю кадр локально…';
        try{
            const r=await buildMediaSceneBlueprintDiagnostic(screen.querySelector('#gp-subject-scene')?.value||'');
            const rows=(r.visible||[]).map(x=>`<div class="gp-subject-row"><b>${esc(x.name)}</b> <small>${esc(x.role)}</small><br>Reference: ${x.reference?'✅':'—'}${x.referenceKind?` <small>(${esc(x.referenceKind)})</small>`:''} · Appearance: ${x.description?'✅':'—'}<br><small>Маршрут: ${esc(x.fallback)} · ${esc(x.source||'fallback')}</small></div>`).join('');
            box.innerHTML=`<div><b>Автор:</b> ${esc(r.author)}</div><div><b>Камера:</b> ${esc(r.camera)}</div><div><b>В кадре:</b> ${(r.visible||[]).length?esc(r.visible.map(x=>x.name).join(' + ')):'⚠️ не определено'}</div>${rows||'<div class="gp-subject-warn">⚠️ Известный identity не распознан. Чужой reference подставлен не будет.</div>'}<details class="gp-brain-details" open><summary>🍌 Scene Blueprint · Banana / vision</summary><pre>${esc(r.naturalPrompt||'')}</pre></details><details class="gp-brain-details"><summary>🌙 NovelAI Prompt Compiler · Scene Blocks V5</summary><pre>${esc(r.novelAiGuide||'')}</pre><small>${esc(r.novelAiRules||'')}</small></details>`;
        }catch(e){box.textContent=`Resolver: ${e?.message||e}`;}
    });
    (async () => {
        const box = screen.querySelector('#gp-media-diag'); if (!box) return;
        try {
            const d = await getMediaIdentityDiagnostics();
            const yes = v => v ? '✅ найден' : '— нет';
            box.innerHTML = `<div><b>Картинки:</b> ${esc(d.extension || 'не найдено')}</div>`
              + `<div><b>Backend:</b> ${esc(d.provider)} · ${esc(d.model || 'модель не определена')}</div>`
              + `<div><b>Стиль:</b> ${esc(d.styleName || 'как в основном чате')}</div>`
              + `<hr><div><b>🎭 Character:</b> ${esc(d.character.name || 'не выбран')}</div>`
              + `<div><b>Key:</b> <code>${esc(d.character.key || '—')}</code></div>`
              + `<div><b>Reference:</b> ${yes(d.character.reference)}${d.character.referenceKind?` <small>(${esc(d.character.referenceKind)})</small>`:''} · <b>Appearance:</b> ${yes(d.character.description)}</div>`
              + `<div><b>Источник:</b> ${esc(d.character.source)}</div>`
              + `<hr><div><b>👤 User Persona:</b> ${esc(d.user?.name || 'не определена')}</div>`
              + `<div><b>Key:</b> <code>${esc(d.user?.key || '—')}</code></div>`
              + `<div><b>Reference:</b> ${yes(d.user?.reference)}${d.user?.referenceKind?` <small>(${esc(d.user.referenceKind)})</small>`:''} · <b>Appearance:</b> ${yes(d.user?.description)}</div>`
              + `<div><b>Источник:</b> ${esc(d.user?.source || '—')}</div>`
              + `<hr><div><b>🧩 SIP library:</b> ${Number(d.libraryCounts?.characters||0)} character · ${Number(d.libraryCounts?.users||0)} user · ${Number(d.libraryCounts?.npcCandidates||0)} Additional/NPC refs</div>`
              + `${(d.npcLibrary||[]).length ? `<div class="gp-media-npcs">${d.npcLibrary.slice(0,10).map(n => `${esc(n.name)}${n.aliases?.length?` <small>(${esc(n.aliases.slice(0,3).join(', '))})</small>`:''} ${n.reference?'🖼️':'—'} ${n.description?'📝':''}`).join(' · ')}</div>` : '<div class="gp-media-npcs">Additional/NPC references пока не найдены.</div>'}`
              + `<small>В генерацию пойдут только реально видимые субъекты. Character/User доступны системе, но не подмешиваются автоматически. Правило: exact reference → appearance → Card/RP → никогда чужой reference.</small>`;
        } catch (e) { box.textContent = `Диагностика: ${e?.message || e}`; }
    })();
}

// ── PocketVerse Hub / карточная колода ──
function renderHome(screen) {
    currentScreen = 'home';
    const unread = getTotalUnread();
    const activeStoryEvent = systemsOn() ? getSystemsView().storyEvents.active : null;
    const rpDt = getRpDateTime();
    const d = new Date();
    const DAYS = DAYS_I18N[lang()];
    const MONTHS = MONTHS_I18N[lang()];
    const clockH = rpDt?.hours ?? d.getHours();
    const clockM = rpDt?.minutes ?? d.getMinutes();
    let dateStr;
    if (rpDt) {
        const rpDate = new Date(rpDt.year, rpDt.month - 1, rpDt.day);
        dateStr = `${DAYS[rpDate.getDay()]}, ${rpDt.day} ${MONTHS[rpDt.month - 1]}`;
    } else {
        dateStr = `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
    }
    const me = getUserName();
    const meAva = avatarHtml(me, avatarForAuthor('user'), 'gp-avatar gp-deck-avatar');
    const card = (app, month, suit, title, sub, glyph, extra='') => `
        <button class="gp-deck-card ${extra}" data-app="${app}" type="button">
            <span class="gp-deck-month">${month}</span>
            <span class="gp-deck-suit">${suit}</span>
            <span class="gp-deck-glyph" aria-hidden="true">${glyph}</span>
            <span class="gp-deck-title">${title}</span>
            <span class="gp-deck-sub">${sub}</span>
        </button>`;

    screen.innerHTML = `
        <div class="gp-home gp-deck-home">
            <div class="gp-deck-top">
                <div class="gp-deck-profile">${meAva}<div><small>POCKETVERSE</small><b>${esc(me)}</b></div></div>
                <div class="gp-deck-time"><b>${String(clockH).padStart(2,'0')}<i>:</i>${String(clockM).padStart(2,'0')}</b><span>${dateStr}</span></div>
            </div>
            <div class="gp-deck-rule"><span>✦</span><b>THE TWELVE</b><span>✦</span></div>
            <div class="gp-home-grid gp-deck-grid">
                ${card('list','I','♥','Связи', unread ? `${unread} новых` : 'переписки','✉', unread ? 'gp-card-hot' : '')}
                ${card(activeStoryEvent ? 'storyevent':'socialhub','II','♦','События',activeStoryEvent ? 'сейчас активно' : 'сюжет','✦',activeStoryEvent?'gp-card-hot':'')}
                ${card('memories','III','♠','Воспоминания','дневник','☾')}
                ${card('ig','IV','♥','Instagram','моменты','◎')}
                ${card('notes','V','♣','Заметки',plansBadgeCount() ? `${plansBadgeCount()} дел` : 'мысли','✎')}
                ${card('news','VI','♦','Новости','мир','▤')}
                ${card('chans','VII','♠','Эхо',unreadChannels() ? `${unreadChannels()} новых` : 'слухи · следы','◇')}
                ${card('twitch','VIII','♣','Twitch',getTwitch().myStream ? 'LIVE' : 'стримы','▷',getTwitch().myStream?'gp-card-hot':'')}
                ${card('tw','IX','♦','Twitter','лента','#')}
                ${card('of','X','♥','OnlyFans','личное','♡')}
                ${card('appearance','XI','♣','Облик','темы','◐')}
                ${card('brain','XII','♠','Мозг','настройки','⌘')}
            </div>
        </div>`;
    screen.querySelectorAll('.gp-deck-card').forEach(el => el.addEventListener('click', () => goto(el.dataset.app)));
}

let _memoryFilter = 'all';
function renderMemories(screen) {
    currentScreen = 'memories';
    const all = getMemories();
    const items = all.filter(x => _memoryFilter === 'all' || x.type === _memoryFilter);
    const romans = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
    const stickers = ['✦','♡','☾','✧','⌁','❀','⋆','♢'];
    const tile = (m, i) => {
        const photo = m.img ? `<img src="${esc(m.img)}" alt="">` : '';
        const quote = m.text ? `<div class="gp-memory-quote">${esc(m.text)}</div>` : '';
        const note = m.note ? `<div class="gp-memory-note">${esc(m.note)}</div>` : '';
        const meta = [m.rpDate, m.rpTime].filter(Boolean).join(' · ');
        const mood = `gp-scrap-${(i % 6) + 1}`;
        return `<article class="gp-memory-tile ${m.img ? 'gp-memory-photo' : 'gp-memory-text'} ${mood}" data-memory-open="${esc(m.id)}">
            <span class="gp-memory-tape" aria-hidden="true"></span>
            <span class="gp-memory-index">${romans[i%12]}</span>
            <span class="gp-memory-sticker" aria-hidden="true">${stickers[i%stickers.length]}</span>
            ${photo}<div class="gp-memory-body">${m.author ? `<b>${esc(m.author)}</b>` : ''}${quote}${note}${meta ? `<small>${esc(meta)}</small>` : ''}</div>
            <button class="gp-memory-more" data-memory-menu="${esc(m.id)}" title="Действия">⋮</button>
        </article>`;
    };
    screen.innerHTML = `
        <div class="gp-header gp-memory-header">
            <button class="gp-iconbtn" id="gp-home-btn">${ic('fa-chevron-left')}</button>
            <div class="gp-title">Воспоминания<small>III · АРХИВ XII</small></div>
        </div>
        <div class="gp-memory-tabs">
          <button data-mf="all" class="${_memoryFilter==='all'?'gp-active':''}">Все</button>
          <button data-mf="photo" class="${_memoryFilter==='photo'?'gp-active':''}">Фото</button>
          <button data-mf="message" class="${_memoryFilter==='message'?'gp-active':''}">Сообщения</button>
        </div>
        ${all.length ? `<div class="gp-memory-count">✦ ${all.length} ${all.length===1?'момент':'моментов'} в этой ветке</div><div class="gp-memory-board">${items.map(tile).join('')}</div>` : `
        <div class="gp-memory-preview gp-memory-empty">
            <div class="gp-memory-sigil">✦</div><h2>Архив XII</h2>
            <p>Здесь будут жить выбранные тобой кадры, сообщения и маленькие моменты этой истории.</p>
            <small>Зажми сообщение или фотографию в переписке → «В Архив XII». Ничего не сохраняется автоматически.</small>
        </div>`}`;
    screen.querySelector('#gp-home-btn')?.addEventListener('click', () => goto('home'));
    screen.querySelectorAll('[data-mf]').forEach(b => b.addEventListener('click',()=>{ _memoryFilter=b.dataset.mf; renderMemories(screen); }));

    // Scrapbook reveal: tap any memory to unfold it like a diary page.
    screen.querySelectorAll('[data-memory-open]').forEach(card => card.addEventListener('click', (e) => {
        if (e.target.closest('[data-memory-menu]')) return;
        const m = getMemories().find(x => x.id === card.dataset.memoryOpen); if (!m) return;
        const idx = Math.max(0, all.findIndex(x => x.id === m.id));
        const meta = [m.rpDate, m.rpTime].filter(Boolean).join(' · ');
        const ov = document.createElement('div'); ov.className = 'gp-memory-reveal';
        ov.innerHTML = `<div class="gp-memory-reveal-backdrop" data-memory-close></div>
          <section class="gp-memory-page gp-scrap-${(idx%6)+1}">
            <button class="gp-memory-close" data-memory-close>×</button>
            <div class="gp-memory-page-top"><span>${romans[idx%12]} · ARCHIVE XII</span><i>${stickers[idx%stickers.length]}</i></div>
            ${m.img ? `<div class="gp-memory-page-photo"><span class="gp-memory-page-tape"></span><img src="${esc(m.img)}" alt=""></div>` : ''}
            <div class="gp-memory-page-copy">
              ${m.author ? `<div class="gp-memory-page-author">${esc(m.author)}</div>` : ''}
              ${m.text ? `<div class="gp-memory-page-quote">${esc(m.text)}</div>` : ''}
              ${m.note ? `<div class="gp-memory-page-note"><span>✎</span>${esc(m.note)}</div>` : ''}
              ${meta ? `<div class="gp-memory-page-meta">${esc(meta)}</div>` : ''}
              ${m.thread ? `<div class="gp-memory-page-thread">⌁ ${esc(m.thread)}</div>` : ''}
            </div>
            <span class="gp-memory-doodle gp-doodle-a">✦</span><span class="gp-memory-doodle gp-doodle-b">♡</span><span class="gp-memory-doodle gp-doodle-c">${stickers[(idx+3)%stickers.length]}</span>
          </section>`;
        screen.appendChild(ov);
        requestAnimationFrame(()=>ov.classList.add('gp-open'));
        ov.querySelectorAll('[data-memory-close]').forEach(x=>x.addEventListener('click',()=>{ ov.classList.remove('gp-open'); setTimeout(()=>ov.remove(),220); }));
    }));

    screen.querySelectorAll('[data-memory-menu]').forEach(b => b.addEventListener('click',(e)=>{
        e.stopPropagation(); const id=b.dataset.memoryMenu; const m=getMemories().find(x=>x.id===id); if(!m)return;
        const choice=prompt('Архив XII: подпись к воспоминанию.\nОставь пустым, чтобы удалить текущую подпись.\nДля удаления введи: УДАЛИТЬ', m.note||'');
        if(choice===null)return;
        if(choice.trim().toUpperCase()==='УДАЛИТЬ'){ if(confirm('Удалить это воспоминание из Архива XII?')) deleteMemory(id); }
        else updateMemory(id,{note:choice.trim()});
        renderMemories(screen);
    }));
}

// ── Экран «Оформление» ──
// Режим «Свой CSS» — последний слайд карусели тем (редактор показывается
// ТОЛЬКО когда выбран этот слайд, у обычных тем его нет)
let _appearanceCssMode = false;
// Разовый флаг: после выбора темы карусель центрируется на ней, а не
// сохраняет прежнюю прокрутку
let _centerActiveTheme = false;

function renderAppearance(screen) {
    currentScreen = 'appearance';
    const s = getSettings();
    const skin = LEGACY_SKINS[s.skin] || (SKINS.includes(s.skin) ? s.skin : 'indigo');
    const custom = normalizedThemeCustom();
    const presets = Array.isArray(s.themePresets) ? s.themePresets : [];
    const cssMode = _appearanceCssMode;
    const cards = THEME_INFO.map(t => `
        <button class="gp-theme-card${(!cssMode && t.id === skin) ? ' gp-active' : ''}" data-skin="${t.id}" type="button">
            <span class="gp-theme-preview gp-preview-${t.id}">
                <span class="gp-preview-island"></span>
                <span class="gp-preview-lines"><i></i><i></i><i></i></span>
                <span class="gp-preview-dock">${t.colors.map(c => `<i style="background:${c}"></i>`).join('')}</span>
            </span>
            <strong>${esc(t.name)}</strong>
            <small>${esc(t.note)}</small>
            <b>${(!cssMode && t.id === skin) ? 'АКТИВНА' : 'ВЫБРАТЬ'}</b>
        </button>`).join('')
        // Последний слайд — «Свой CSS»: полный контроль руками
        + `
        <button class="gp-theme-card gp-theme-card-css${cssMode ? ' gp-active' : ''}" id="gp-css-card" type="button">
            <span class="gp-theme-preview gp-preview-csscard">
                <span class="gp-preview-code">&lt;/&gt;</span>
            </span>
            <strong>Свой CSS</strong>
            <small>Полный контроль</small>
            <b>${cssMode ? 'АКТИВНА' : 'ВЫБРАТЬ'}</b>
        </button>`;
    const dots = THEME_INFO.map(t => `<button class="gp-theme-dot${(!cssMode && t.id === skin) ? ' gp-active' : ''}" data-skin="${t.id}" aria-label="${esc(t.name)}"></button>`).join('')
        + `<button class="gp-theme-dot${cssMode ? ' gp-active' : ''}" id="gp-css-dot" aria-label="Свой CSS"></button>`;
    const chips = presets.length ? presets.map(p => `
        <button class="gp-preset-chip" data-preset="${esc(p.id)}" type="button">
            <span>${esc(p.name || 'Мой пресет')}</span><i class="fa-solid fa-xmark" data-delete-preset="${esc(p.id)}"></i>
        </button>`).join('') : '<div class="gp-presets-empty">Здесь появятся ваши варианты оформления</div>';

    // CSS-режим: под каруселью ТОЛЬКО редактор своего CSS
    const cssEditorHtml = `
            <section class="gp-theme-section">
                <h3>Свой CSS</h3>
                <textarea id="gp-app-css" class="gp-theme-css" rows="10" spellcheck="false" placeholder="/* #gp-phone, .gp-bubble, .gp-tw-card, .gp-app-icon ... */"></textarea>
                <button class="gp-save-preset" id="gp-app-css-apply" type="button">${ic('fa-check')} Применить CSS</button>
            </section>`;

    // Карусель тем живёт своей прокруткой: её позицию тоже надо перенести,
    // иначе любая перерисовка утаскивает обратно к активной теме и до дальних
    // слайдов не долистать
    const prevCarousel = screen.querySelector('#gp-theme-carousel')?.scrollLeft ?? null;
    // Через setHtmlKeepScroll: выбор темы/стиля перерисовывает весь экран,
    // и без этого список каждый раз отскакивал к самому верху
    setHtmlKeepScroll(screen, '.gp-appearance-scroll', `
        <div class="gp-header gp-appearance-header">
            <button class="gp-iconbtn" id="gp-home-btn">${ic('fa-chevron-left')}</button>
            <div class="gp-title">Оформление</div>
            <button class="gp-iconbtn" id="gp-theme-reset" title="Сбросить настройки">${ic('fa-rotate-left')}</button>
        </div>
        <div class="gp-appearance-scroll">
            <div class="gp-theme-carousel" id="gp-theme-carousel">${cards}</div>
            <div class="gp-theme-dots">${dots}</div>
            ${cssMode ? cssEditorHtml : `
            <section class="gp-theme-section">
                <h3>Мои пресеты</h3>
                <div class="gp-presets">${chips}</div>
                <button class="gp-save-preset" id="gp-save-preset" type="button">${ic('fa-plus')} Сохранить текущую</button>
            </section>

            <section class="gp-theme-section gp-theme-editor">
                <h3>Настроить</h3>
                <label class="gp-theme-control gp-color-control">
                    <span>Акцент</span>
                    <span class="gp-color-pickers">
                        <input id="gp-accent-a" type="color" value="${custom.accentA || (THEME_INFO.find(x => x.id === skin)?.colors[0] || '#6a8dff')}">
                        <input id="gp-accent-b" type="color" value="${custom.accentB || (THEME_INFO.find(x => x.id === skin)?.colors[1] || '#9a6aff')}">
                    </span>
                </label>
                <label class="gp-theme-control gp-color-control" ${s.wallpaper ? 'style="opacity:.45"' : ''}>
                    <span>Цвет фона${s.wallpaper ? ' <output class="gp-ctl-note">под обоями</output>' : ''}</span>
                    <span class="gp-color-pickers">
                        <input id="gp-theme-bg" type="color" value="${custom.bg || '#1a2430'}">
                        <button class="gp-color-clear" id="gp-theme-bg-clear" title="Вернуть фон темы" type="button">${ic('fa-xmark')}</button>
                    </span>
                </label>
                <label class="gp-theme-control gp-color-control">
                    <span>Цвет текста</span>
                    <span class="gp-color-pickers">
                        <input id="gp-theme-text" type="color" value="${custom.text || '#eef2f8'}">
                        <button class="gp-color-clear" id="gp-theme-text-clear" title="Вернуть цвет темы" type="button">${ic('fa-xmark')}</button>
                    </span>
                </label>
                <label class="gp-theme-control gp-color-control">
                    <span>Цвет иконок</span>
                    <span class="gp-color-pickers">
                        <input id="gp-theme-icon-a" type="color" value="${custom.iconA || custom.accentA || (THEME_INFO.find(x => x.id === skin)?.colors[0] || '#6a8dff')}">
                        <input id="gp-theme-icon-b" type="color" value="${custom.iconB || custom.accentB || (THEME_INFO.find(x => x.id === skin)?.colors[1] || '#9a6aff')}">
                        <button class="gp-color-clear" id="gp-theme-icons-clear" title="Вернуть иконки темы" type="button">${ic('fa-xmark')}</button>
                    </span>
                </label>
                <label class="gp-theme-control">
                    <span>Шрифт</span>
                    <select id="gp-theme-font" class="gp-theme-select">
                        <option value="" ${!custom.font ? 'selected' : ''}>Как в теме</option>
                        <option value="serif" ${custom.font === 'serif' ? 'selected' : ''}>С засечками</option>
                        <option value="mono" ${custom.font === 'mono' ? 'selected' : ''}>Моноширинный</option>
                        <option value="rounded" ${custom.font === 'rounded' ? 'selected' : ''}>Округлый</option>
                        <option value="condensed" ${custom.font === 'condensed' ? 'selected' : ''}>Узкий</option>
                    </select>
                </label>
                <label class="gp-theme-control">
                    <span>Скругление <output id="gp-radius-out">${custom.radius}px</output></span>
                    <input id="gp-theme-radius" type="range" min="2" max="30" value="${custom.radius}">
                </label>
                <label class="gp-theme-control">
                    <span>Прозрачность <output id="gp-alpha-out">${custom.transparency}%</output></span>
                    <input id="gp-theme-alpha" type="range" min="3" max="28" value="${custom.transparency}">
                </label>
                <label class="gp-theme-control">
                    <span>Размер иконок <output id="gp-icons-out">${custom.iconScale}%</output></span>
                    <input id="gp-theme-icons" type="range" min="80" max="115" value="${custom.iconScale}">
                </label>
            </section>

            <section class="gp-theme-section">
                <h3>Уведомления</h3>
                <div class="gp-toast-styles">
                    ${TOAST_STYLES.map(t => `
                        <button class="gp-toast-style${toastStyleId() === t.id ? ' gp-active' : ''}" data-toaststyle="${t.id}" type="button">
                            <span class="gp-toast-style-demo gp-tsd-${t.id}"><i></i><b></b></span>
                            <span>${esc(t.name)}</span>
                        </button>`).join('')}
                </div>
                <label class="gp-theme-control">
                    <span>Экран блокировки</span>
                    <input id="gp-set-lock" type="checkbox" ${s.lockScreen !== false ? 'checked' : ''}>
                </label>
                <label class="gp-theme-control">
                    <span>Метка времени в ответах</span>
                    <input id="gp-set-timetag" type="checkbox" ${s.timeTag !== false ? 'checked' : ''}>
                </label>
            </section>

            <section class="gp-theme-section">
                <h3>Мой аватар</h3>
                <div class="gp-theme-wall-row">
                    <span class="gp-me-ava">${avatarHtml(getUserName(), avatarForAuthor('user'), 'gp-avatar gp-avatar-sm')}</span>
                    <button class="gp-save-preset" id="gp-me-ava-pick" type="button">${ic('fa-image')} ${getUserAvatar() ? 'Сменить фото' : 'Загрузить фото'}</button>
                    ${getUserAvatar() ? `<button class="gp-iconbtn gp-danger" id="gp-me-ava-clear" title="Убрать аватар" type="button">${ic('fa-xmark')}</button>` : ''}
                    <input type="file" id="gp-me-ava-file" accept="image/*" style="display:none">
                </div>
            </section>

            <section class="gp-theme-section">
                <h3>Обои</h3>
                <div class="gp-theme-wall-row">
                    <button class="gp-save-preset" id="gp-app-wall-pick" type="button">${ic('fa-image')} ${s.wallpaper ? 'Сменить фото' : 'Загрузить фото'}</button>
                    <button class="gp-iconbtn ${s.wallpaperBlur ? 'gp-btn-on' : ''}" id="gp-app-wall-blur" title="Размыть обои" type="button">${ic('fa-droplet')}</button>
                    ${s.wallpaper ? `<button class="gp-iconbtn gp-danger" id="gp-app-wall-clear" title="Убрать обои" type="button">${ic('fa-xmark')}</button>` : ''}
                    <input type="file" id="gp-app-wall-file" accept="image/*" style="display:none">
                </div>
            </section>`}
        </div>`);

    screen.querySelector('#gp-home-btn')?.addEventListener('click', () => goto('home'));
    const carousel = screen.querySelector('#gp-theme-carousel');
    const activeCard = carousel?.querySelector('.gp-theme-card.gp-active');
    // Двигаем карусель вручную: scrollIntoView тащит за собой и вертикальный
    // скролл, поэтому клик по стилю уведомлений отбрасывал экран наверх.
    // Центрируем ТОЛЬКО при первом заходе — дальше листает она сама.
    requestAnimationFrame(() => {
        if (!carousel) return;
        const center = _centerActiveTheme;
        _centerActiveTheme = false;
        // Прокрутку переносим как есть — кроме первого захода и момента
        // выбора: тогда активная карточка встаёт по центру
        if (!center && prevCarousel !== null) { carousel.scrollLeft = prevCarousel; return; }
        if (!activeCard) return;
        carousel.scrollLeft = Math.max(0, activeCard.offsetLeft - (carousel.clientWidth - activeCard.clientWidth) / 2);
    });

    const chooseSkin = (nextSkin) => {
        if (!SKINS.includes(nextSkin)) return;
        _centerActiveTheme = true;   // выбранная карточка встаёт по центру
        _appearanceCssMode = false; // выбор обычной темы выходит из CSS-режима
        getSettings().skin = nextSkin;
        saveSettingsDebounced();
        applySkin();
        const select = document.getElementById('gp-set-skin');
        if (select) select.value = nextSkin;
        renderAppearance(screen);
    };
    screen.querySelectorAll('[data-skin]').forEach(el => el.addEventListener('click', () => chooseSkin(el.dataset.skin)));
    // Последний слайд «Свой CSS»: тема не меняется, снизу открывается редактор
    const enterCssMode = () => { _appearanceCssMode = true; _centerActiveTheme = true; renderAppearance(screen); };
    screen.querySelector('#gp-css-card')?.addEventListener('click', enterCssMode);
    screen.querySelector('#gp-css-dot')?.addEventListener('click', enterCssMode);

    const updateCustom = (patch, rerender = false) => {
        const st = getSettings();
        st.themeCustom = { ...normalizedThemeCustom(st.themeCustom), ...patch };
        saveSettingsDebounced();
        applySkin();
        if (rerender) renderAppearance(screen);
    };
    const bindRange = (id, key, outId, suffix) => {
        const el = screen.querySelector(id);
        el?.addEventListener('input', () => {
            screen.querySelector(outId).textContent = `${el.value}${suffix}`;
            updateCustom({ [key]: Number(el.value) });
        });
    };
    bindRange('#gp-theme-radius', 'radius', '#gp-radius-out', 'px');
    bindRange('#gp-theme-alpha', 'transparency', '#gp-alpha-out', '%');
    bindRange('#gp-theme-icons', 'iconScale', '#gp-icons-out', '%');
    screen.querySelector('#gp-accent-a')?.addEventListener('input', e => updateCustom({ accentA: e.target.value }));
    screen.querySelector('#gp-accent-b')?.addEventListener('input', e => updateCustom({ accentB: e.target.value }));
    screen.querySelector('#gp-theme-bg')?.addEventListener('input', e => updateCustom({ bg: e.target.value }));
    screen.querySelector('#gp-theme-bg-clear')?.addEventListener('click', () => updateCustom({ bg: null }, true));
    screen.querySelector('#gp-theme-text')?.addEventListener('input', e => updateCustom({ text: e.target.value }));
    screen.querySelector('#gp-theme-text-clear')?.addEventListener('click', () => updateCustom({ text: null }, true));
    screen.querySelector('#gp-theme-icon-a')?.addEventListener('input', e => updateCustom({ iconA: e.target.value }));
    screen.querySelector('#gp-theme-icon-b')?.addEventListener('input', e => updateCustom({ iconB: e.target.value }));
    screen.querySelector('#gp-theme-icons-clear')?.addEventListener('click', () => updateCustom({ iconA: null, iconB: null }, true));
    screen.querySelector('#gp-theme-font')?.addEventListener('change', e => updateCustom({ font: e.target.value }));

    // ── Стиль уведомлений: выбрала — сразу показываем, как выглядит ──
    screen.querySelectorAll('[data-toaststyle]').forEach(b => b.addEventListener('click', () => {
        getSettings().toastStyle = b.getAttribute('data-toaststyle');
        saveSettingsDebounced();
        renderAppearance(screen);
        // Демо на живом контакте: у стилей с аватаром иначе нечего показать
        const demo = getThreadList().find(x => !x.isGroup && x.name);
        if (demo) toast(`${demo.name}: так выглядят уведомления`, 'fa-comment-dots', demo.key);
        else toast('Курьер в пути · Артём К., ~15 мин', 'fa-truck-fast');
    }));
    screen.querySelector('#gp-set-lock')?.addEventListener('change', function () {
        getSettings().lockScreen = this.checked;
        saveSettingsDebounced();
    });
    screen.querySelector('#gp-set-timetag')?.addEventListener('change', function () {
        getSettings().timeTag = this.checked;
        saveSettingsDebounced();
        updatePhoneInjection();
    });

    // ── Свой аватар (иначе тянется из персоны ST) ──
    const meAvaFile = screen.querySelector('#gp-me-ava-file');
    screen.querySelector('#gp-me-ava-pick')?.addEventListener('click', () => meAvaFile?.click());
    meAvaFile?.addEventListener('change', async function () {
        const f = this.files?.[0];
        if (!f) return;
        try {
            setUserAvatar(await compressImage(f, 256, 0.85));
            renderAppearance(screen);
            toast('Аватар обновлён', 'fa-user');
        } catch (e) {
            toast('Не удалось загрузить фото', 'fa-circle-exclamation');
        } finally { this.value = ''; }
    });
    screen.querySelector('#gp-me-ava-clear')?.addEventListener('click', () => {
        setUserAvatar('');
        renderAppearance(screen);
        toast('Аватар убран', 'fa-check');
    });

    // ── Обои (перенесены из панели расширения) ──
    const wallFile = screen.querySelector('#gp-app-wall-file');
    screen.querySelector('#gp-app-wall-pick')?.addEventListener('click', () => wallFile?.click());
    wallFile?.addEventListener('change', async function () {
        const f = this.files?.[0];
        if (!f) return;
        try {
            const dataUrl = await compressImage(f, 1080, 0.85);
            let src = dataUrl;
            try {
                const base64 = dataUrl.replace(/^data:image\/[a-z]+;base64,/i, '');
                src = await saveBase64AsFile(base64, 'glassphone', `wallpaper_${Date.now()}`, 'jpeg');
            } catch (e) { /* dataURL фолбэк */ }
            getSettings().wallpaper = src;
            saveSettingsDebounced();
            applyWallpaper();
            renderAppearance(screen);
            toast('Обои установлены', 'fa-image');
        } catch (e) {
            toast('Не удалось загрузить обои', 'fa-circle-exclamation');
        } finally { this.value = ''; }
    });
    screen.querySelector('#gp-app-wall-blur')?.addEventListener('click', () => {
        getSettings().wallpaperBlur = !getSettings().wallpaperBlur;
        saveSettingsDebounced();
        applyWallpaper();
        renderAppearance(screen);
    });
    screen.querySelector('#gp-app-wall-clear')?.addEventListener('click', () => {
        getSettings().wallpaper = '';
        saveSettingsDebounced();
        applyWallpaper();
        renderAppearance(screen);
        toast('Обои убраны', 'fa-check');
    });

    // ── Свой CSS (перенесён из панели расширения) ──
    const cssArea = screen.querySelector('#gp-app-css');
    if (cssArea) cssArea.value = s.customCss || '';
    screen.querySelector('#gp-app-css-apply')?.addEventListener('click', () => {
        getSettings().customCss = cssArea?.value || '';
        saveSettingsDebounced();
        applySkin();
        toast('CSS применён', 'fa-check');
    });

    screen.querySelector('#gp-theme-reset')?.addEventListener('click', () => {
        getSettings().themeCustom = { accentA: null, accentB: null, bg: null, text: null, iconA: null, iconB: null, font: '', radius: 18, transparency: 10, iconScale: 100 };
        saveSettingsDebounced();
        applySkin();
        renderAppearance(screen);
        toast('Настройки темы сброшены', 'fa-rotate-left');
    });
    screen.querySelector('#gp-save-preset')?.addEventListener('click', () => {
        const name = prompt('Название пресета:', `Мой ${THEME_INFO.find(x => x.id === skin)?.name || 'стиль'}`)?.trim();
        if (!name) return;
        const st = getSettings();
        st.themePresets.push({
            id: `theme_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            name: name.slice(0, 32), skin: st.skin, custom: { ...normalizedThemeCustom(st.themeCustom) },
        });
        saveSettingsDebounced();
        renderAppearance(screen);
        toast(`Пресет «${name.slice(0, 32)}» сохранён`, 'fa-bookmark');
    });
    screen.querySelectorAll('[data-preset]').forEach(el => el.addEventListener('click', e => {
        if (e.target.closest('[data-delete-preset]')) return;
        const p = getSettings().themePresets.find(x => x.id === el.dataset.preset);
        if (!p) return;
        const presetSkin = LEGACY_SKINS[p.skin] || p.skin;
        getSettings().skin = SKINS.includes(presetSkin) ? presetSkin : 'indigo';
        getSettings().themeCustom = { ...normalizedThemeCustom(p.custom) };
        saveSettingsDebounced();
        applySkin();
        renderAppearance(screen);
        toast(`Пресет «${p.name}» применён`, 'fa-wand-magic-sparkles');
    }));
    screen.querySelectorAll('[data-delete-preset]').forEach(el => el.addEventListener('click', e => {
        e.stopPropagation();
        const st = getSettings();
        st.themePresets = st.themePresets.filter(x => x.id !== el.dataset.deletePreset);
        saveSettingsDebounced();
        renderAppearance(screen);
    }));

    // Экран перерисовывает СЕБЯ (мимо render()) — перевод надо накатить тут,
    // иначе после клика/пролистывания текст возвращался к русскому
    try { trDom(screen); } catch (e) { /* ignore */ }
}

// ── Экран «Сообщения» ──
// Генерация групп-чатов (как ТГ): модель придумывает чаты + участников +
// стартовую переписку. Группа создаётся через addGroup, а сообщения засеваются
// ОДНИМ призраком с tel:sms-тегами (chat-поле) — они попадают в треды как обычные
// групповые смс и в контекст модели по месту истории.
let _chatsGenBusy = false;
async function genGroupChats() {
    if (_chatsGenBusy) return;
    _chatsGenBusy = true;
    render();
    try {
        const existing = getThreadList().filter(t => t.isGroup).map(t => t.name);
        const arr = await generateGroupChats(existing);
        if (!Array.isArray(arr) || !arr.length) throw new Error('Чаты не сгенерировались — попробуй ещё раз');
        let seedTags = '';
        let created = 0;
        for (const g of arr.slice(0, 3)) {
            if (!g || !g.name) continue;
            const members = (Array.isArray(g.members) ? g.members : []).map(x => String(x).trim()).filter(Boolean).slice(0, 6);
            if (!members.length) continue;
            addGroup(String(g.name).slice(0, 40), members);
            created++;
            for (const msg of (Array.isArray(g.messages) ? g.messages : []).slice(0, 6)) {
                if (!msg || !msg.author || !msg.text) continue;
                seedTags += `<!--tel:sms:${JSON.stringify({ from: String(msg.author).slice(0, 40), chat: String(g.name).slice(0, 40), text: String(msg.text).slice(0, 400) })}-->\n`;
            }
        }
        if (!created) throw new Error('Чаты не сгенерировались — попробуй ещё раз');
        if (seedTags.trim()) await insertGhostReply('GlassPhone', seedTags.trim());
        updatePhoneInjection();
        applyChatHiding();
        toast(`Новых чатов: ${created}`, 'fa-comments');
    } catch (e) {
        console.error('[GlassPhone] genGroupChats failed:', e);
        toast(String(e?.message || e).slice(0, 60), 'fa-circle-exclamation');
    } finally {
        _chatsGenBusy = false;
        if (currentScreen === 'list') render();
        updateFabBadge();
    }
}

function pvRoman(n) {
    const map = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
    return map[n % 12] || 'I';
}

function pvSuit(n) {
    return ['♠','♦','♣','♥'][n % 4];
}

function renderList(screen) {
    currentScreen = 'list';
    // Мэтчи из Тиндера сюда не попадают, пока не обменялись номерами: их
    // переписка живёт в самом приложении
    const list = getThreadList().filter(t => t.isGroup || !isInAppMatch(t.key));

    let rows = '';
    for (let ti = 0; ti < list.length; ti++) {
        const t = list[ti];
        const lastText = t.last ? (t.last.voice ? 'Голосовое сообщение' : (t.last.text || (t.last.img || t.last.photoDesc ? 'Фото' : ''))) : '';
        const senderPrefix = t.last
            ? (t.last.dir === 'out' ? '<span class="gp-prev-you">Ты:</span> '
                : (t.isGroup && t.last.from ? `<span class="gp-prev-you">${esc(t.last.from)}:</span> ` : ''))
            : '';
        const preview = t.last
            ? `${senderPrefix}${esc(lastText.slice(0, 60))}`
            : '<span class="gp-prev-empty">Нет сообщений — напиши первым</span>';
        const time = t.last && t.last.time ? fmtTime(t.last.time) : '';
        const cardNo = pvRoman(ti);
        const suit = pvSuit(ti);
        const ava = t.isGroup
            ? `<div class="gp-avatar gp-avatar-group">${ic('fa-users')}</div>`
            : avatarHtml(t.name, getContactAvatar(t.key));
        rows += `
        <div class="gp-row gp-connection-card" data-key="${esc(t.key)}">
            <span class="gp-card-index">${cardNo}</span>
            <span class="gp-card-suit gp-card-suit-top">${suit}</span>
            ${ava}
            <div class="gp-row-mid">
                <div class="gp-row-name">${esc(t.name)}</div>
                <div class="gp-row-preview">${preview}</div>
            </div>
            <div class="gp-row-side">
                <div class="gp-row-time">${esc(time)}</div>
                ${t.unread > 0 ? `<div class="gp-unread">${t.unread > 9 ? '9+' : t.unread}</div>` : ''}
            </div>
            <span class="gp-card-suit gp-card-suit-bottom">${suit}</span>
        </div>`;
    }

    setHtmlKeepScroll(screen, '.gp-list', `
        <div class="gp-header">
            <button class="gp-iconbtn" id="gp-home-btn">${ic('fa-chevron-left')}</button>
            <div class="gp-title gp-connections-title"><span>Связи</span><small>КОЛОДА СВЯЗЕЙ</small></div>
            <button class="gp-iconbtn" id="gp-gen-chats" title="Сгенерировать чаты" ${_chatsGenBusy ? 'disabled' : ''}>${ic(_chatsGenBusy ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles')}</button>
            <button class="gp-iconbtn" id="gp-add-btn" title="Добавить контакт">${ic('fa-plus')}</button>
        </div>
        <div class="gp-list">
            ${rows || `
            <div class="gp-empty">
                <div class="gp-empty-icon">${ic('fa-comment-slash')}</div>
                <div class="gp-empty-title">Пока тихо ✦</div>
                <div class="gp-empty-text">Здесь появятся персонажи, с которыми началась переписка.<br>Новую связь можно создать вручную по кнопке&nbsp;${ic('fa-plus')}.</div>
            </div>`}
        </div>`);

    screen.querySelector('#gp-home-btn')?.addEventListener('click', () => goto('home'));
    screen.querySelector('#gp-add-btn')?.addEventListener('click', () => {
        currentScreen = 'add';
        render();
    });
    screen.querySelector('#gp-gen-chats')?.addEventListener('click', () => genGroupChats());
    screen.querySelectorAll('.gp-row').forEach(row => {
        row.addEventListener('click', () => {
            currentThreadKey = row.getAttribute('data-key');
            currentScreen = 'thread';
            render();
        });
    });
}

// ── Экран треда ──
// ── Реакции на сообщения (как в ТГ, но FontAwesome — без стандартных эмодзи) ──
const REACTIONS = [
    { id: 'heart', icon: 'fa-heart', ru: 'сердечко' },
    { id: 'like', icon: 'fa-thumbs-up', ru: 'лайк' },
    { id: 'dislike', icon: 'fa-thumbs-down', ru: 'дизлайк' },
    { id: 'laugh', icon: 'fa-face-laugh-squint', ru: 'смех' },
    { id: 'wow', icon: 'fa-face-surprise', ru: 'вау' },
    { id: 'sad', icon: 'fa-face-sad-tear', ru: 'грусть' },
    { id: 'angry', icon: 'fa-face-angry', ru: 'злость' },
    { id: 'fire', icon: 'fa-fire', ru: 'огонь' },
    { id: 'kiss', icon: 'fa-face-kiss-wink-heart', ru: 'поцелуй' },
    { id: 'skull', icon: 'fa-skull', ru: 'умер со смеху' },
    { id: 'eyes', icon: 'fa-eye', ru: 'смотрю' },
];
let _reactPickerFor = null; // mi сообщения с открытым пикером
let _reactPickerKey = null; // тред пикера (чтобы mi не «переехал» в другой чат)

// PocketVerse: локальная лесенка. Буферные сообщения не вызывают модель до ✨.
const _pvPending = new Map(); // threadKey -> [{text,time}]
const _pvPendingMedia = new Map(); // threadKey -> [{kind,title,time}] — already visible locally, waits for ✨
function pvPending(key){ return _pvPending.get(key) || []; }
function pvPendingMedia(key){ return _pvPendingMedia.get(key) || []; }
function pvHasPending(key){ return pvPending(key).length > 0 || pvPendingMedia(key).length > 0; }
function pvQueue(key,text){ const a=pvPending(key).slice(); a.push({text:String(text||'').trim(),time:new Date()}); _pvPending.set(key,a); }
function pvQueueMedia(key,kind,title){ const a=pvPendingMedia(key).slice(); a.push({kind:String(kind||'gif'),title:String(title||'reaction').slice(0,160),time:new Date()}); _pvPendingMedia.set(key,a); }
function pvClear(key){ _pvPending.delete(key); _pvPendingMedia.delete(key); }

// Перезапись JSON-тега сообщения по позиции (tel:sms или tel:out маркер юзера).
// После записи позиции соседних тегов устаревают — но render() пересканирует чат.
async function rewriteSmsTag(m, t, mutate) {
    try {
        const ctx = SillyTavern.getContext();
        const chatMsg = ctx?.chat?.[m.idx];
        if (!chatMsg) { logFail('перезапись тега', `нет сообщения #${m.idx}`); return false; }
        // Позиция тега: сначала по точному тексту (индексы из scanChat посчитаны
        // по stripThink-версии и смещены, если модель писала в <think>),
        // затем — по сохранённым индексам как запасной вариант
        let start = -1, end = -1;
        if (m.tagText) {
            const at = chatMsg.mes.indexOf(m.tagText);
            if (at !== -1) { start = at; end = at + m.tagText.length; }
        }
        if (start === -1 && Number.isInteger(m.tagStart) && Number.isInteger(m.tagEnd)) {
            start = m.tagStart; end = m.tagEnd;
        }
        if (start === -1) { logFail('перезапись тега', 'тег не найден в сообщении (правка/свайп?)'); return false; }
        const tag = chatMsg.mes.slice(start, end);
        const re = m.dir === 'out'
            ? /<!--\s*tel:out:(\{[\s\S]*?\})\s*-->/i
            : /<!--\s*tel:sms:(\{[\s\S]*?\})\s*-->/i;
        const jm = tag.match(re);
        if (!jm) { logFail('перезапись тега', `по позиции не тег: «${String(tag).slice(0, 40)}»`); return false; }
        let j = null;
        try { j = JSON.parse(jm[1]); } catch (e) { /* битый JSON от модели — соберём заново */ }
        if (!j) {
            if (m.dir === 'out') { logFail('перезапись тега', 'битый JSON в своём маркере'); return false; }
            j = { from: m.from, text: m.text || '' };
            if (t?.isGroup) j.chat = t.name;
            if (m.photoDesc) j.photo = m.photoDesc;
            if (m.mediaIntent) j.media = m.mediaIntent;
            if (m.voice) j.voice = true;
            if (m.img) j.img = m.img;
            if (m.shot) j.shot = m.shot;
            if (m.memeQuery) j.meme = m.memeQuery;
            if (m.gifUrl) j.gif = m.gifUrl;
        }
        mutate(j);
        const kind = m.dir === 'out' ? 'out' : 'sms';
        chatMsg.mes = chatMsg.mes.slice(0, start) + `<!--tel:${kind}:${JSON.stringify(j)}-->` + chatMsg.mes.slice(end);
        // Подпись чата считается по длине и хвосту последнего сообщения:
        // правка в середине её не меняет, и кэш отдал бы дорисованное фото
        // как «ещё не готово». Сбрасываем явно.
        invalidateChatCache();
        await saveChatConditional();
        logOk('перезапись тега', `${kind} #${m.idx}`);
        return true;
    } catch (e) {
        console.warn('[GlassPhone] rewriteSmsTag failed:', e);
        logFail('перезапись тега', String(e?.message || e));
        return false;
    }
}

// ── Голосовые: дорожка детерминирована текстом (стабильна между рендерами),
// длительность оценивается по числу слов (~2.4 слова/сек, 0:02–3:00)
function voiceBars(seed, n = 27) {
    let h = 2166136261;
    for (const ch of String(seed)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
    const bars = [];
    for (let i = 0; i < n; i++) {
        h = Math.imul(h ^ (h >>> 13), 1103515245) + 12345;
        bars.push(22 + (Math.abs(h) % 78));
    }
    return bars;
}
function voiceDurationSec(text) {
    const words = String(text || '').trim().split(/\s+/).filter(Boolean).length;
    return Math.min(180, Math.max(2, Math.round(words / 2.4)));
}
function fmtVoiceDur(sec) {
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}
function voiceBubbleHtml(m) {
    const dur = voiceDurationSec(m.text);
    const bars = voiceBars((m.from || '') + m.text)
        .map(h => `<span style="height:${h}%"></span>`).join('');
    // ВАЖНО: одной строкой, без переносов — .gp-bubble имеет white-space:pre-wrap,
    // и литеральные \n из шаблона рендерятся пустыми строками (жирный пузырь)
    return `<div class="gp-voice" style="--gp-voice-dur:${dur}s"><button class="gp-voice-play" data-voiceplay aria-label="Воспроизвести">${ic('fa-play')}</button><div class="gp-voice-wave">${bars}</div><span class="gp-voice-dur">${fmtVoiceDur(dur)}</span></div>${m.text ? `<div class="gp-voice-tr">${esc(m.text)}</div>` : ''}`;
}

let _pvThreadRenderFrozen = false;
const _pvAutoMediaBusy = new Set();
async function autoResolveIncomingMedia(t) {
    const st = getSettings();
    for (let mi = 0; mi < (t?.messages || []).length; mi++) {
        const m = t.messages[mi];
        if (!m || m.dir !== 'in') continue;
        const key = m.eventId || `${m.idx}:${m.tagStart}`;
        if (_pvAutoMediaBusy.has(key)) continue;
        // Персонаж прислал фото: если image backend уже настроен, рисуем без ручной палочки.
        if (st.phonePhotos !== false && st.autoIncomingPhotos !== false && m.photoDesc && !m.img) {
            _pvAutoMediaBusy.add(key); _mmsGenBusy.add(key);
            try {
                if (await isImageGenAvailable()) {
                    const author = m.from || t.name;
                    const src = await generatePostImage({ imgDesc:m.photoDesc, mediaIntent:m.mediaIntent || null, author, ak:`contact:${keyOf(author)}`, kind:'ig', mms:true }, null, key);
                    if (src) {
                    const ok = m.localId ? updateLocalSms(m.localId, { img: src }) : await rewriteSmsTag(m, t, j => { j.img = src; });
                    if (ok) m.img = src;
                }
                }
            } catch (e) { console.warn('[PocketVerse] auto incoming photo failed:', e); }
            finally { _mmsGenBusy.delete(key); _pvAutoMediaBusy.delete(key); if (!_pvThreadRenderFrozen) render(); }
            return; // по одному медиа за цикл, чтобы не запускать пачку генераций одновременно
        }
        // Мем/GIF: отдельный бесплатный media lookup, LLM второй раз НЕ вызывается.
        if (st.phoneMemes && st.autoIncomingMemes !== false && st.giphyApiKey && m.memeQuery && !m.gifUrl) {
            _pvAutoMediaBusy.add(key);
            try {
                const g = await searchGiphyMeme(m.memeQuery);
                if (g?.url) {
                    const ok = m.localId ? updateLocalSms(m.localId, { gif: g.url }) : await rewriteSmsTag(m, t, j => { j.gif = g.url; j.gifPage = g.page || ''; });
                    if (ok) { m.gifUrl = g.url; console.info('[PocketVerse] GIPHY OK', { query:m.memeQuery, id:g.id, url:g.url }); }
                    else throw new Error('GIF найден, но не удалось сохранить его в сообщении');
                }
            } catch (e) { console.warn('[PocketVerse] GIPHY resolve failed:', e); toast(`GIPHY: ${String(e?.message || e).slice(0,90)}`, 'fa-triangle-exclamation'); }
            finally { _pvAutoMediaBusy.delete(key); if (!_pvThreadRenderFrozen) render(); }
            return;
        }
    }
}

function renderThread(screen) {
    const t = getThread(currentThreadKey);
    if (!t) { currentScreen = 'list'; renderList(screen); return; }
    markRead(t.key);
    updateFabBadge();

    let bubbles = '';
    for (let mi = 0; mi < t.messages.length; mi++) {
        const m = t.messages[mi];
        // The RP date belongs to the phone/header timeline. Do not insert calendar-day
        // separators inside the thread: they duplicate the RP timeline and waste space.
        // Message metadata stays compact: time only.
        // Фото в смс: реальное (юзер приложила) или заглушка с описанием (ММС от персонажа)
        let media = '';
        if (m.img) {
            // Переген доступен только для ММС с описанием (без описания нечего рисовать)
            const genKey = m.eventId || `${m.idx}:${m.tagStart}`;
            const busy = _mmsGenBusy.has(genKey);
            // Finished photos stay visually clean. Regeneration lives in the long-press action menu.
            media = `<div class="gp-bubble-img gp-generated-photo"><img src="${esc(m.img)}" alt="" data-zoom></div>`;
        } else if (m.photoDesc) {
            const genKey = m.eventId || `${m.idx}:${m.tagStart}`;
            const busy = _mmsGenBusy.has(genKey);
            media = `<div class="gp-bubble-img gp-bubble-img-gen" style="${avatarStyle((m.from || t.name) + m.photoDesc)}"><span>${ic('fa-image')}</span><i data-mmsdesc="${esc(genKey)}">${esc(m.photoDesc)}</i><button class="gp-mms-gen" data-mmsgen="${mi}" title="Сгенерировать фото" ${busy ? 'disabled' : ''}>${ic(busy ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles')}</button>${busy ? stopGenBtn(genKey) : ''}</div>`;
        }
        if (m.videoCircle) {
            media += `<div class="gp-video-circle-bubble"><video src="${esc(m.videoCircle)}" controls playsinline preload="metadata"></video></div>`;
        }
        if (m.gifUrl) {
            media += `<div class="gp-bubble-img gp-giphy${m.mediaKind === 'sticker' ? ' gp-sticker' : ''}"><img src="${esc(m.gifUrl)}" alt="${esc(m.memeQuery || 'GIF')}" data-zoom><small>Powered by GIPHY</small></div>`;
        } else if (m.memeQuery) {
            media += `<div class="gp-bubble-img gp-bubble-img-gen gp-meme-wait"><span>${ic('fa-face-laugh-squint')}</span><i>${esc(m.memeQuery)}</i></div>`;
        }
        // В группе подписываем отправителя входящих — КАЖДОМУ свой цвет
        // (тот же хэш, что у аватара-градиента → цвет ника совпадает с аватаром)
        const senderLabel = t.isGroup && m.dir === 'in' && m.from
            ? `<div class="gp-bubble-sender" style="color:${senderColor(m.from)}">${esc(m.from)}</div>` : '';
        const body = m.voice ? voiceBubbleHtml(m) : esc(m.text);
        const reaction = m.react ? REACTIONS.find(r => r.id === m.react) : null;
        const reactChip = reaction ? `<span class="gp-react-chip">${ic(reaction.icon)}</span>` : '';
        const photoRegenAction = (m.img && m.photoDesc)
            ? `<button data-mmsedit="${mi}">${ic('fa-pen')} Изменить фото</button><button data-mmsgen="${mi}">${ic('fa-rotate-right')} Перегенерировать фото</button>` : '';
        const picker = (_reactPickerFor === mi && _reactPickerKey === t.key)
            ? `<div class="gp-react-picker gp-action-pop"><div class="gp-reaction-row">${REACTIONS.map(r => `<button data-react="${r.id}" data-react-mi="${mi}" class="${m.react === r.id ? 'gp-selected' : ''}" title="${r.ru}">${ic(r.icon)}</button>`).join('')}</div><div class="gp-action-row"><button data-reply-mi="${mi}">${ic('fa-reply')} Ответить</button><button data-memory-save="${mi}">✦ В Архив XII</button>${photoRegenAction}<button class="gp-danger" data-smsdel="${mi}">${ic('fa-trash-can')} Удалить</button></div></div>` : '';
        const prev = t.messages[mi - 1];
        const startOfIncomingRun = m.dir === 'in' && (!prev || prev.dir !== 'in' || (t.isGroup && prev.from !== m.from));
        const bubbleAva = startOfIncomingRun
            ? avatarHtml(m.from || t.name, getContactAvatar(keyOf(m.from || t.name)), 'gp-msg-avatar') : '';
        bubbles += `
        <div class="gp-msg-line ${m.dir === 'out' ? 'gp-msg-line-out' : 'gp-msg-line-in'} ${startOfIncomingRun ? 'gp-msg-run-start' : ''}">
            <div class="gp-bubble-wrap ${m.dir === 'out' ? 'gp-out' : 'gp-in'}${reaction ? ' gp-has-react' : ''}${m.img ? ' gp-photo-wrap' : ''}">
                ${m.dir === 'in' && bubbleAva ? `<div class="gp-msg-avatar-above">${bubbleAva}</div>` : ''}
                ${picker}
                <div class="gp-bubble${m.voice ? ' gp-bubble-voice' : ''}${m.img ? ' gp-photo-bubble' : ''}" data-bmi="${mi}">${senderLabel}${media}${shotHtml(m)}${body}${reactChip}</div>
            </div>
        </div>`;
    }

    const pending = pvPending(t.key);
    if (pending.length) {
        bubbles += pending.map((q, qi) => `<div class="gp-msg-line gp-msg-line-out gp-pending-line"><div class="gp-bubble-wrap gp-out"><div class="gp-bubble gp-pending-bubble">${esc(q.text)}<span class="gp-pending-dot" title="Ещё не отправлено модели">•</span></div><div class="gp-bubble-time">в очереди ${qi + 1}/${pending.length}</div></div></div>`).join('');
    }
    const typing = typingKey === t.key
        ? `<div class="gp-bubble-wrap gp-in gp-typing-wrap"><div class="gp-bubble gp-typing"><span></span><span></span><span></span></div></div>`
        : '';

    const headerAva = t.isGroup
        ? `<div class="gp-avatar gp-avatar-sm gp-avatar-group">${ic('fa-users')}</div>`
        : `<span id="gp-ava-btn" title="Клик — загрузить фото контакта" style="cursor:pointer">${avatarHtml(t.name, getContactAvatar(t.key), 'gp-avatar gp-avatar-sm')}</span>`;
    const blocked = !t.isGroup && isSmsBlocked(t.key);
    // Twelve identity: the same card number/suit follows a connection from the deck into its thread.
    const deckThreads = getThreadList().filter(x => x.isGroup || !isInAppMatch(x.key));
    const deckIndex = Math.max(0, deckThreads.findIndex(x => x.key === t.key));
    const deckRoman = pvRoman(deckIndex);
    const deckSuit = pvSuit(deckIndex);
    // Человек из Тиндера: показываем это прямо в шапке и даём вернуться к анкете —
    // иначе всё, что модель про него знает, для юзера невидимо
    const tinMatch = t.isGroup ? null : matchByContactKey(t.key);
    const subLine = t.isGroup
        ? (t.members?.length ? `${t.members.length} участников · групповая связь` : 'групповая связь')
        : tinMatch
            ? `${blocked ? 'связь приостановлена · ' : ''}${tinMatch.inApp ? 'знакомство · активная связь' : 'знакомство · вне приложения'}`
            : `${blocked ? 'связь приостановлена' : 'личная связь · ' + handleFor(`contact:${t.key}`, t.name)}`;

    screen.innerHTML = `
        <div class="gp-header gp-thread-header">
            <button class="gp-iconbtn" id="gp-back">${ic('fa-chevron-left')}</button>
            ${headerAva}
            <input type="file" id="gp-ava-file" accept="image/*" style="display:none">
            <div class="gp-thread-title">
                <div class="gp-row-name"><span>${esc(t.name)}</span><em class="gp-thread-card-id">${deckRoman} ${deckSuit}</em></div>
                <div class="gp-thread-number">${esc(subLine)}</div>
            </div>
            <button class="gp-thread-menu-btn" id="gp-thread-menu" title="Меню связи"><span>✦</span><i class="fa-solid fa-ellipsis-vertical"></i></button>
            <div class="gp-thread-actions" id="gp-thread-actions">
                <div class="gp-thread-actions-title"><span>✦</span> КАРТА СВЯЗИ</div>
                <button id="gp-rename"><i class="fa-regular fa-id-card"></i><span>Изменить имя</span></button>
                ${tinMatch ? `<button id="gp-tin-open">${ic('fa-fire')}<span>Открыть анкету</span></button>` : ''}
                ${!t.isGroup && !tinMatch?.inApp ? `<button id="gp-nick">${ic('fa-at')}<span>Псевдоним в соцсетях</span></button>` : ''}
                ${!t.isGroup ? `<button id="gp-sms-block">${ic(blocked ? 'fa-lock-open' : 'fa-pause')}<span>${blocked ? 'Возобновить связь' : 'Приостановить связь'}</span></button>` : ''}
                ${t.isGroup ? `<button id="gp-add-member">${ic('fa-user-plus')}<span>Добавить участника</span></button>` : ''}
                ${t.isGroup && (t.members || []).length ? `<button id="gp-kick-member">${ic('fa-user-minus')}<span>Убрать участника</span></button>` : ''}
                <button class="gp-thread-action-danger" id="gp-del">${ic('fa-trash-can')}<span>Удалить связь</span></button>
            </div>
        </div>
        <div class="gp-msgs" id="gp-msgs">
            ${bubbles || `<div class="gp-empty gp-empty-thread"><div class="gp-empty-icon">${ic('fa-message')}</div><div class="gp-empty-text">Начни переписку — сообщение попадёт<br>прямо в ролевую</div></div>`}
            ${typing}
        </div>
        ${_smsDraftImage ? `<div class="gp-sms-attach"><img src="${esc(_smsDraftImage)}" alt=""><span>Фото приложено</span><button class="gp-iconbtn gp-danger" id="gp-attach-clear">${ic('fa-xmark')}</button></div>` : ''}
        ${_gifPickerOpen ? `<div class="gp-gif-picker"><div class="gp-gif-head"><button class="${_gifPickerKind==='gif'?'active':''}" data-gifkind="gif">GIF · мемы</button><button class="${_gifPickerKind==='sticker'?'active':''}" data-gifkind="sticker">Стикеры</button><button class="gp-iconbtn" id="gp-gif-close">${ic('fa-xmark')}</button></div><div class="gp-gif-search"><input id="gp-gif-q" placeholder="Поиск реакции, мема, GIF…"><button id="gp-gif-go">${ic('fa-magnifying-glass')}</button></div><div class="gp-gif-grid">${_gifPickerBusy ? `<div class="gp-gif-status">${ic('fa-spinner fa-spin')} Ищу…</div>` : (_gifPickerResults.length ? _gifPickerResults.map((g,i)=>`<button data-gifpick="${i}" title="${esc(g.title||'GIF')}"><img src="${esc(g.url)}" loading="lazy"></button>`).join('') : '<div class="gp-gif-status">Напиши, что хочешь найти ✨</div>')}</div>${_gifPickerResults.length ? '<div class="gp-gif-hint">Показано до 30 результатов за 1 API-запрос</div>' : ''}<small class="gp-giphy-credit">Powered by GIPHY</small></div>` : ''}
        <div class="gp-inputbar">
            ${t.messages.length > 0 && t.messages[t.messages.length - 1].dir === 'in'
                ? `<button class="gp-iconbtn gp-regen" id="gp-regen" title="Другой ответ" ${sending ? 'disabled' : ''}>${ic('fa-rotate-right')}</button>` : ''}
            <button class="gp-iconbtn" id="gp-attach" title="Приложить фото">${ic('fa-paperclip')}</button>
            <button class="gp-iconbtn gp-gif-btn" id="gp-gif" title="GIF · мем · стикер">GIF</button>
            <input type="file" id="gp-attach-file" accept="image/*" style="display:none">
            <button class="gp-iconbtn${_smsDraftVoice ? ' gp-voice-armed' : ''}" id="gp-voice-toggle" title="Голосовое сообщение">${ic('fa-microphone')}</button>
            <button class="gp-iconbtn gp-video-circle-btn" id="gp-video-circle" title="Подготовить кружочек">⭕</button>
            <textarea id="gp-input" rows="1" placeholder="${_smsDraftVoice ? 'Расшифровка голосового...' : 'Сообщение...'}"></textarea>
            <button class="gp-send" id="gp-send" title="Добавить в лесенку" ${sending ? 'disabled' : ''}>${ic('fa-paper-plane')}</button><button class="gp-send gp-send-ai" id="gp-send-ai" title="Отправить лесенку персонажу" ${(sending || !pvHasPending(t.key)) ? 'disabled' : ''}>${ic('fa-wand-magic-sparkles')}</button>
        </div>`;

    const msgs = screen.querySelector('#gp-msgs');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;

    screen.querySelector('#gp-back')?.addEventListener('click', () => {
        currentScreen = 'list';
        currentThreadKey = null;
        render();
    });
    const threadMenuBtn = screen.querySelector('#gp-thread-menu');
    const threadActions = screen.querySelector('#gp-thread-actions');
    threadMenuBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        threadActions?.classList.toggle('gp-open');
    });
    threadActions?.addEventListener('click', (e) => e.stopPropagation());
    const closeThreadMenu = () => threadActions?.classList.remove('gp-open');
    screen.querySelector('.gp-msgs')?.addEventListener('click', closeThreadMenu);

    // Аватар контакта: клик → загрузка фото (сжимается до 128px)
    const avaBtn = screen.querySelector('#gp-ava-btn');
    const avaFile = screen.querySelector('#gp-ava-file');
    avaBtn?.addEventListener('click', () => avaFile?.click());
    avaFile?.addEventListener('change', async () => {
        const file = avaFile.files?.[0];
        if (!file) return;
        try {
            const dataUrl = await compressImage(file, 128, 0.85);
            setContactAvatar(t.key, dataUrl);
            render();
        } catch (e) {
            toast('Не удалось загрузить фото', 'fa-circle-exclamation');
        }
    });
    // Переименование контакта (отображаемое имя; матч смс по исходному имени сохраняется)
    screen.querySelector('#gp-rename')?.addEventListener('click', () => {
        const nn = prompt('Новое имя контакта:', t.name);
        if (nn === null) return;
        renameContact(t.key, nn.trim());
        updatePhoneInjection();
        render();
    });
    // Ник контакта для соцсетей (@handle)
    screen.querySelector('#gp-tin-open')?.addEventListener('click', () => {
        if (!tinMatch) return;
        _tinProfileId = tinMatch.id;
        _tinFromThread = t.key;
        goto('tinprofile');
    });
    screen.querySelector('#gp-nick')?.addEventListener('click', () => {
        const cur = handleFor(`contact:${t.key}`, t.name);
        const nick = prompt(`Ник для ${t.name} в соцсетях (без @):`, cur.replace(/^@/, ''));
        if (nick === null) return;
        setContactHandle(t.key, nick);
        updatePhoneInjection();
        render();
    });
    screen.querySelector('#gp-sms-block')?.addEventListener('click', () => {
        if (blocked) {
            if (!confirm(`Разблокировать SMS от «${t.name}»?`)) return;
            unblockSmsContact(t.key);
            toast(`SMS от «${t.name}» разблокированы`, 'fa-lock-open');
        } else {
            if (!confirm(`Заблокировать SMS от «${t.name}»? Новые сообщения не будут попадать в телефон.`)) return;
            blockSmsContact(t.key);
            toast(`SMS от «${t.name}» заблокированы`, 'fa-ban');
        }
        updatePhoneInjection();
        render();
        updateFabBadge();
    });

    // GIF / meme / sticker picker — поиск GIPHY без LLM.
    screen.querySelector('#gp-gif')?.addEventListener('click', () => { _gifPickerOpen = !_gifPickerOpen; _gifPickerResults = []; render(); });
    screen.querySelector('#gp-gif-close')?.addEventListener('click', () => { _gifPickerOpen=false; _gifPickerResults=[]; render(); });
    screen.querySelectorAll('[data-gifkind]').forEach(b => b.addEventListener('click', () => { _gifPickerKind=b.dataset.gifkind||'gif'; _gifPickerResults=[]; render(); }));
    const runGifSearch = async () => {
        const q = String(screen.querySelector('#gp-gif-q')?.value || '').trim(); if (!q || _gifPickerBusy) return;
        _gifPickerBusy=true; render();
        try { _gifPickerResults = await searchGiphyChoices(q, _gifPickerKind, 50); }
        catch(e){ toast(`GIPHY: ${String(e?.message||e).slice(0,80)}`, 'fa-triangle-exclamation'); _gifPickerResults=[]; }
        finally { _gifPickerBusy=false; render(); }
    };
    screen.querySelector('#gp-gif-go')?.addEventListener('click', runGifSearch);
    screen.querySelector('#gp-gif-q')?.addEventListener('keydown', e => { if(e.key==='Enter'){e.preventDefault(); runGifSearch();} });
    screen.querySelectorAll('[data-gifpick]').forEach(b => b.addEventListener('click', async () => {
        const g=_gifPickerResults[Number(b.dataset.gifpick)]; if(!g) return;
        _gifPickerOpen=false; _gifPickerResults=[];
        await sendUserGiphy(t.key, g);
    }));

    // Скрепка: приложить фото к смс
    const attachBtn = screen.querySelector('#gp-attach');
    const attachFile = screen.querySelector('#gp-attach-file');
    attachBtn?.addEventListener('click', () => attachFile?.click());
    attachFile?.addEventListener('change', async () => {
        const f = attachFile.files?.[0];
        if (!f) return;
        try {
            _smsDraftImage = await compressImage(f, 720, 0.82);
            render();
        } catch (e) {
            toast('Не удалось загрузить фото', 'fa-circle-exclamation');
        }
    });
    screen.querySelector('#gp-attach-clear')?.addEventListener('click', () => {
        _smsDraftImage = null;
        render();
    });

    // Кружочек: сначала только бесплатный текстовый черновик. Видео API здесь не вызывается.
    screen.querySelector('#gp-video-circle')?.addEventListener('click', async () => {
        const btn=screen.querySelector('#gp-video-circle');
        if (btn?.disabled) return;
        if (btn) btn.disabled=true;
        toast('Готовлю черновик кружочка…', 'fa-video');
        try {
            const draft=await pvPlanVideoCircle(t);
            pvOpenVideoCircleSheet(screen,t,draft);
        } catch(e) {
            console.error('[PocketVerse] video circle draft failed:',e);
            toast(`Кружочек: ${String(e?.message||e).slice(0,90)}`, 'fa-circle-exclamation');
        } finally { if(btn) btn.disabled=false; }
    });

    // Микрофон: следующее сообщение уйдёт голосовым (текст = расшифровка).
    // Сохраняем черновик текста через перерисовку.
    screen.querySelector('#gp-voice-toggle')?.addEventListener('click', () => {
        _smsDraftVoice = !_smsDraftVoice;
        const draft = screen.querySelector('#gp-input')?.value || '';
        render();
        const inp = document.getElementById('gp-input');
        if (inp) { inp.value = draft; inp.focus(); }
    });

    // «Проигрывание» голосового: подсветка бежит по дорожке ровно длительность
    screen.querySelectorAll('[data-voiceplay]').forEach(btn => btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const box = btn.closest('.gp-voice');
        if (!box) return;
        const playing = box.classList.toggle('gp-playing');
        btn.innerHTML = ic(playing ? 'fa-pause' : 'fa-play');
        clearTimeout(box._gpVoiceTimer);
        if (playing) {
            const dur = parseFloat(box.style.getPropertyValue('--gp-voice-dur')) || 3;
            box._gpVoiceTimer = setTimeout(() => {
                box.classList.remove('gp-playing');
                btn.innerHTML = ic('fa-play');
            }, dur * 1000);
        }
    }));

    // Убрать участника из группового чата
    screen.querySelector('#gp-kick-member')?.addEventListener('click', () => {
        const members = [...(t.members || [])];
        if (!members.length) { toast('В чате никого нет', 'fa-circle-exclamation'); return; }
        const overlay = document.createElement('div');
        overlay.className = 'gp-member-overlay';
        overlay.innerHTML = `
            <div class="gp-member-overlay-panel">
                <div class="gp-member-overlay-header">
                    <span>Убрать участника</span>
                    <button class="gp-iconbtn" id="gp-kick-close">${ic('fa-xmark')}</button>
                </div>
                <div class="gp-member-overlay-list">${members.map(m => `<label class="gp-member-check"><input type="checkbox" value="${esc(m)}"><span>${esc(m)}</span></label>`).join('')}</div>
                <button class="gp-primary gp-danger" id="gp-kick-apply">${ic('fa-user-minus')} Убрать</button>
            </div>`;
        screen.appendChild(overlay);
        const close = () => overlay.remove();
        overlay.querySelector('#gp-kick-close')?.addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
        overlay.querySelector('#gp-kick-apply')?.addEventListener('click', () => {
            const gone = [...overlay.querySelectorAll('input:checked')].map(i => i.value);
            if (!gone.length) { close(); return; }
            const left = members.filter(m => !gone.includes(m));
            updateGroupMembers(t.key, left);
            // Ролевая должна знать: человека убрали из чата, а не он сам ушёл
            try {
                logSocialToChat(`${getUserName()} убирает из группового чата «${t.name}»: ${gone.join(', ')}`);
            } catch (e) { /* ignore */ }
            updatePhoneInjection();
            close();
            render();
            toast(`Убрали: ${gone.join(', ')}`, 'fa-user-minus');
        });
    });

    // Добавить участника из телефонной книги в групповой чат
    screen.querySelector('#gp-add-member')?.addEventListener('click', () => {
        const allContacts = getThreadList().filter(x => !x.isGroup);
        const currentMembers = new Set((t.members || []).map(m => keyOf(m)));
        const available = allContacts.filter(c => !currentMembers.has(keyOf(c.name)));
        if (!available.length) {
            toast('Все контакты уже в чате', 'fa-circle-check');
            return;
        }
        // Создаём оверлей с выбором контактов
        const overlay = document.createElement('div');
        overlay.className = 'gp-member-overlay';
        const list = available.map(c =>
            `<label class="gp-member-check"><input type="checkbox" value="${esc(c.name)}"><span>${esc(c.name)}</span></label>`
        ).join('');
        overlay.innerHTML = `
            <div class="gp-member-overlay-panel">
                <div class="gp-member-overlay-header">
                    <span>Добавить участника</span>
                    <button class="gp-iconbtn" id="gp-member-close">${ic('fa-xmark')}</button>
                </div>
                <div class="gp-member-overlay-list">${list}</div>
                <button class="gp-primary" id="gp-member-confirm">${ic('fa-check')} Добавить</button>
            </div>`;
        screen.appendChild(overlay);
        overlay.querySelector('#gp-member-close').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
        overlay.querySelector('#gp-member-confirm').addEventListener('click', () => {
            const selected = [...overlay.querySelectorAll('input:checked')].map(i => i.value);
            if (!selected.length) { toast('Выбери хотя бы одного', 'fa-circle-exclamation'); return; }
            const newMembers = [...(t.members || []), ...selected];
            updateGroupMembers(t.key, newMembers);
            overlay.remove();
            updatePhoneInjection();
            toast(`Добавлено: ${selected.join(', ')}`, 'fa-user-plus');
            render();
        });
    });

    screen.querySelector('#gp-del')?.addEventListener('click', () => {
        if (!confirm(`Удалить ${t.isGroup ? 'групповой чат' : 'контакт'} «${t.name}» из телефона?\n(Сообщения в самом чате останутся.)`)) return;
        if (t.isGroup) delGroup(t.key);
        else hideContact(t.key);
        currentScreen = 'list';
        currentThreadKey = null;
        updatePhoneInjection();
        render();
        updateFabBadge();
    });

    const input = screen.querySelector('#gp-input');
    const sendBtn = screen.querySelector('#gp-send');
    const autoGrow = () => {
        input.style.height = 'auto';
        input.style.height = Math.min(110, input.scrollHeight) + 'px';
    };
    input?.addEventListener('input', autoGrow);
    const queueCurrent = () => {
        const text = (input?.value || '').trim();
        if (!text) return;
        pvQueue(t.key, text);
        input.value = '';
        input.style.height = 'auto';
        render();
    };
    input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); queueCurrent(); }
    });
    sendBtn?.addEventListener('click', queueCurrent);
    // Tap ✨ = send queued text as before. Long press ✨ = compose my own generated selfie.
    const sendAiBtn=screen.querySelector('#gp-send-ai');
    if(sendAiBtn){
        let holdTimer=null, held=false;
        const openSelfie=(e)=>{ e?.preventDefault?.(); held=true; pvOpenOwnSelfieSheet(screen,t); };
        sendAiBtn.addEventListener('touchstart',()=>{held=false; holdTimer=setTimeout(openSelfie,520);},{passive:true});
        sendAiBtn.addEventListener('touchend',()=>{if(holdTimer)clearTimeout(holdTimer);});
        sendAiBtn.addEventListener('touchmove',()=>{if(holdTimer)clearTimeout(holdTimer);});
        sendAiBtn.addEventListener('contextmenu',openSelfie);
        sendAiBtn.addEventListener('click',(e)=>{if(held){e.preventDefault();held=false;return;} flushPending(t.key);});
    }
    screen.querySelector('#gp-regen')?.addEventListener('click', () => doRegen(t.key));
    // Медиа от персонажа резолвится после первого рендера; это не делает второй LLM-запрос.
    setTimeout(() => autoResolveIncomingMedia(t), 0);
    // PocketVerse: долгое нажатие открывает действия; обычный тап закрывает плашку.
    screen.querySelectorAll('[data-bmi]').forEach(b => {
        let timer = null, opened = false;
        const open = (e) => { e?.preventDefault?.(); opened = true; _reactPickerFor = parseInt(b.getAttribute('data-bmi')); _reactPickerKey = t.key; render(); };
        b.addEventListener('touchstart', () => { opened = false; timer = setTimeout(open, 430); }, {passive:true});
        b.addEventListener('touchend', () => { if (timer) clearTimeout(timer); });
        b.addEventListener('touchmove', () => { if (timer) clearTimeout(timer); });
        b.addEventListener('contextmenu', open);
        b.addEventListener('click', () => { if (_reactPickerFor !== null && !opened) { _reactPickerFor = null; _reactPickerKey = null; render(); } });
    });
    screen.querySelectorAll('[data-react]').forEach(b => b.addEventListener('click', async (e) => {
        e.stopPropagation();
        const mi = parseInt(b.getAttribute('data-react-mi'));
        const m = t.messages[mi];
        const r = REACTIONS.find(x => x.id === b.getAttribute('data-react'));
        if (!m || !r) return;
        const removing = m.react === r.id;
        _reactPickerFor = null;
        logAct('реакция', `${removing ? 'снять' : r.id} · ${m.dir === 'in' ? 'входящее' : 'своё'} #${m.idx}`);
        // PocketVerse-local SMS (quiet phone replies / local history) have no tel:sms
        // marker in SillyTavern chat[], so rewriteSmsTag() can never persist them.
        // Persist their reaction directly in localSms, exactly like generated media does.
        const ok = m.localId
            ? updateLocalSms(m.localId, { react: removing ? null : r.id })
            : await rewriteSmsTag(m, t, (j) => {
                if (removing) delete j.react;
                else j.react = r.id;
            });
        if (!ok) {
            toast('Не получилось', 'fa-circle-exclamation');
            render();
            return;
        }
        m.react = removing ? null : r.id; // мгновенно, до перескана
        // В журнал — только НОВАЯ реакция на чужое сообщение (снятие — шум)
        if (!removing && m.dir === 'in') {
            logSocialToChat(`${getUserName()} ставит реакцию «${r.ru}» на сообщение ${m.from || t.name}: «${String(m.text || (m.photoDesc ? 'фото' : m.voice ? 'голосовое' : '')).slice(0, 80)}»`, { priv: true });
        }
        applyChatHiding();
        render();
    }));

    screen.querySelectorAll('[data-memory-save]').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation();
        const mi = parseInt(b.getAttribute('data-memory-save'));
        const m = t.messages[mi]; if (!m) return;
        const rp = getRpDateTime();
        const rpDate = rp ? `${String(rp.day).padStart(2,'0')}.${String(rp.month).padStart(2,'0')}.${rp.year}` : '';
        const rpTime = m.time ? `${String(m.time.getHours()).padStart(2,'0')}:${String(m.time.getMinutes()).padStart(2,'0')}` : (rp ? `${String(rp.hours).padStart(2,'0')}:${String(rp.minutes).padStart(2,'0')}` : '');
        const author = m.dir === 'out' ? getUserName() : (m.from || t.name);
        const img = m.img || m.gifUrl || '';
        const text = String(m.text || (m.photoDesc ? m.photoDesc : m.voice ? 'Голосовое сообщение' : '')).trim();
        addMemory({ type: img ? 'photo' : 'message', img, text, author, thread:t.name, rpDate, rpTime });
        _reactPickerFor = null; _reactPickerKey = null;
        toast('Сохранено в Архив XII', 'fa-star'); render();
    }));

    screen.querySelectorAll('[data-reply-mi]').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation();
        const m = t.messages[parseInt(b.getAttribute('data-reply-mi'))];
        if (!m) return;
        const who = m.dir === 'out' ? getUserName() : (m.from || t.name);
        const quote = String(m.text || (m.photoDesc ? '📷 Фото' : m.voice ? '🎤 Голосовое' : '')).slice(0, 180);
        _reactPickerFor = null; _reactPickerKey = null;
        const inp = document.getElementById('gp-input');
        if (inp) { inp.value = `↩ ${who}: ${quote}\n`; inp.focus(); }
    }));

    // Редактирование визуального описания перед повторной генерацией.
    screen.querySelectorAll('[data-mmsedit]').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation();
        const mi = parseInt(b.getAttribute('data-mmsedit'));
        const m = t.messages[mi];
        if (!m?.photoDesc) return;
        _reactPickerFor = null; _reactPickerKey = null;
        screen.querySelector('.gp-photo-edit-overlay')?.remove();
        const ov = document.createElement('div');
        ov.className = 'gp-own-selfie-overlay gp-photo-edit-overlay';
        ov.innerHTML = `<div class="gp-own-selfie-sheet">
          <div class="gp-video-circle-head"><b>✏️ Изменить фото</b><button class="gp-iconbtn" data-pe-close>${ic('fa-xmark')}</button></div>
          <small>Исправь только то, что хочешь поменять. После сохранения фото можно перегенерировать.</small>
          <label>Описание фото<textarea data-pe-desc rows="6">${esc(m.photoDesc)}</textarea></label>
          <button class="gp-primary" data-pe-save>${ic('fa-check')} Сохранить описание</button>
        </div>`;
        screen.appendChild(ov);
        const close = () => ov.remove();
        ov.querySelector('[data-pe-close]')?.addEventListener('click', close);
        ov.addEventListener('click', ev => { if (ev.target === ov) close(); });
        ov.querySelector('[data-pe-save]')?.addEventListener('click', async () => {
            const desc = String(ov.querySelector('[data-pe-desc]')?.value || '').trim();
            if (!desc) { toast('Описание не может быть пустым', 'fa-circle-exclamation'); return; }
            const media = m.mediaIntent && typeof m.mediaIntent === 'object' ? {...m.mediaIntent} : null;
            if (media) media.action = desc;
            const ok = m.localId
                ? updateLocalSms(m.localId, { photo: desc, ...(media ? {media} : {}) })
                : await rewriteSmsTag(m, t, j => { j.photo = desc; if (media) j.media = media; });
            if (!ok) { toast('Не получилось сохранить описание', 'fa-circle-exclamation'); return; }
            m.photoDesc = desc; if (media) m.mediaIntent = media;
            close(); toast('Описание сохранено · теперь ↻', 'fa-pen'); render();
        });
    }));

    // Генерация фото по описанию ММС (заглушка → реальная картинка).
    // Результат пишем в img прямо в tel:sms тег — переживает пересканирование.
    screen.querySelectorAll('[data-mmsgen]').forEach(b => b.addEventListener('click', async (e) => {
        e.stopPropagation();
        const mi = parseInt(b.getAttribute('data-mmsgen'));
        const m = t.messages[mi];
        if (!m || !m.photoDesc) return;
        const genKey = m.eventId || `${m.idx}:${m.tagStart}`;
        if (_mmsGenBusy.has(genKey)) return;
        if (!_imgGenReady) {
            const ready = await isImageGenAvailable();
            if (!ready) {
                toast('Картинко-расширение не установлено — генерация недоступна', 'fa-circle-exclamation');
                return;
            }
            _imgGenReady = true;
        }
        _mmsGenBusy.add(genKey);
        render();
        try {
            // Своё отправленное фото снимала она сама, чужое — собеседник:
            // от этого зависит и реф, и кто в кадре
            const mine = m.dir === 'out';
            const author = mine ? getUserName() : (m.from || t.name);
            const src = await generatePostImage(
                { imgDesc: m.photoDesc, mediaIntent:m.mediaIntent || null, author, ak: mine ? 'user' : `contact:${keyOf(author)}`, kind: 'ig', mms: !mine },
                (status) => {
                    const el = document.querySelector(`[data-mmsdesc="${CSS.escape(genKey)}"]`);
                    if (el) el.textContent = status;
                },
                genKey,
            );
            // Персистим через общий rewriteSmsTag: он ищет тег по его ТЕКСТУ.
            // (Раньше здесь была своя копия логики, резавшая по индексам —
            // а они посчитаны по stripThink-версии и съезжают, если модель
            // писала в <think>: картинка генерилась, но молча терялась.)
            const saved = m.localId
                ? updateLocalSms(m.localId, { img: src })
                : await rewriteSmsTag(m, t, (j) => { j.img = src; });
            if (saved) {
                m.img = src;              // мгновенно, до пересканирования
                toast('Фото готово', 'fa-image');
            } else {
                logFail('ММС-фото', 'тег не найден — картинка не сохранена');
                toast('Фото сгенерилось, но не привязалось к сообщению', 'fa-circle-exclamation');
            }
        } catch (err) {
            if (err?.name === 'ImageGenCancelled' || err?.name === 'AbortError') {
                toast('Генерация остановлена', 'fa-circle-stop');
            } else {
                console.error('[GlassPhone] MMS image gen failed:', err);
                toast(`Не получилось: ${String(err?.message || err).slice(0, 60)}`, 'fa-circle-exclamation');
            }
        } finally {
            _mmsGenBusy.delete(genKey);
            render();
        }
    }));

    // Скрин поста: тап открывает исходный пост в его приложении
    screen.querySelectorAll('[data-shot]').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation();
        openShot(b.getAttribute('data-shot'));
    }));

    // Удаление одного сообщения — и из телефона, и из истории чата
    screen.querySelectorAll('[data-smsdel]').forEach(b => b.addEventListener('click', async (e) => {
        e.stopPropagation();
        const mi = parseInt(b.getAttribute('data-smsdel'));
        const msg = t.messages[mi];
        if (!msg) return;
        if (!confirm('Удалить это сообщение? Оно уйдёт и из истории чата.')) return;
        logAct('удаление смс', `${msg.dir === 'in' ? 'входящее' : 'своё'} #${msg.idx}`);
        const ok = msg.localId ? deleteLocalSms(msg.localId) : await deleteSmsFromChat(msg);
        if (!ok) { toast('Не удалось удалить сообщение', 'fa-circle-exclamation'); render(); return; }
        _reactPickerFor = null;
        render();
        updatePhoneInjection();
        applyChatHiding();
        updateFabBadge();
        toast('Сообщение удалено', 'fa-trash-can');
    }));
    // Фокус только при первом входе в тред: при перерисовке (реакция, тап по
    // фото, новое сообщение) экран больше не прыгает к полю ввода
    const focusKey = draftScope();
    if (_lastFocusKey !== focusKey) {
        _lastFocusKey = focusKey;
        input?.focus();
    }
}

// ── Перегенерация последнего ответа персонажа (замена свайпа для скрытых смс) ──
async function doRegen(key) {
    if (sending) return;
    // Перегенерируем только если ПОСЛЕДНЕЕ сообщение чата — ответ бота
    // (иначе Generate('regenerate') снесёт не то)
    try {
        const chat = SillyTavern.getContext()?.chat || [];
        const last = chat[chat.length - 1];
        if (!last || last.is_user) {
            toast('Нечего перегенерировать', 'fa-circle-exclamation');
            return;
        }
    } catch (e) { return; }

    sending = true;
    typingKey = key;
    render();
    try {
        updatePhoneInjection();
        await Generate('regenerate');
    } catch (e) {
        console.error('[GlassPhone] regen failed:', e);
        toast('Не удалось перегенерировать', 'fa-circle-exclamation');
    } finally {
        sending = false;
        typingKey = null;
        render();
        updateFabBadge();
        applyChatHiding();
    }
}

// ── Экран «Новый контакт» ──
function renderAdd(screen) {
    screen.innerHTML = `
        <div class="gp-header gp-thread-header">
            <button class="gp-iconbtn" id="gp-back">${ic('fa-chevron-left')}</button>
            <div class="gp-title" style="flex:1">Новый контакт</div>
        </div>
        <div class="gp-add-form">
            <div class="gp-add-avatar">${ic('fa-user')}</div>
            <label class="gp-field">
                <span>Имя</span>
                <input type="text" id="gp-add-name" maxlength="60" placeholder="Как в ролевой, точно">
            </label>
            <label class="gp-field">
                <span>Номер</span>
                <input type="text" id="gp-add-number" maxlength="24" placeholder="Пусто = случайный">
            </label>
            <label class="gp-field">
                <span>Ник (@) для соцсетей</span>
                <input type="text" id="gp-add-handle" maxlength="20" placeholder="Пусто = авто из имени">
            </label>
            <button class="gp-primary" id="gp-add-save">${ic('fa-check')} Сохранить</button>
            <div class="gp-add-hint">Имя должно совпадать с именем персонажа в чате — тогда его смс попадут в этот тред. Ник и аватар подтянутся в Твиттер/Инсту.</div>
            <div class="gp-field" style="margin-top:10px">
                <span>Групповой чат</span>
            </div>
            <label class="gp-field">
                <span>Название</span>
                <input type="text" id="gp-group-name" maxlength="40" placeholder="Например: Семья">
            </label>
            <div class="gp-group-members" id="gp-group-members">
                ${getThreadList().filter(x => !x.isGroup).map(c => `
                    <label class="gp-member-check"><input type="checkbox" value="${esc(c.name)}"><span>${esc(c.name)}</span></label>
                `).join('') || '<div class="gp-add-hint">Сначала добавь контакты — участники выбираются из них</div>'}
            </div>
            <button class="gp-primary" id="gp-group-save">${ic('fa-users')} Создать чат</button>
        </div>`;

    screen.querySelector('#gp-back')?.addEventListener('click', () => {
        currentScreen = 'list';
        render();
    });
    // Живой предпросмотр авто-ника: транслит из имени («Вадим» → @vadim)
    const nameInp = screen.querySelector('#gp-add-name');
    const handleInp = screen.querySelector('#gp-add-handle');
    nameInp?.addEventListener('input', () => {
        if (!handleInp) return;
        handleInp.placeholder = nameInp.value.trim() ? makeHandle(nameInp.value) : tr('Пусто = авто из имени');
    });
    screen.querySelector('#gp-add-save')?.addEventListener('click', () => {
        const name = screen.querySelector('#gp-add-name')?.value.trim();
        let number = screen.querySelector('#gp-add-number')?.value.trim();
        const handle = screen.querySelector('#gp-add-handle')?.value.trim();
        if (!name) { toast('Укажи имя контакта', 'fa-circle-exclamation'); return; }
        if (!number) number = randomNumber();
        addManualContact(name, number);
        // Ник (@) для соцсетей — по ключу контакта
        if (handle) setContactHandle(keyOf(name), handle);
        updatePhoneInjection();
        currentScreen = 'thread';
        currentThreadKey = keyOf(name);
        render();
    });
    screen.querySelector('#gp-group-save')?.addEventListener('click', () => {
        const gname = screen.querySelector('#gp-group-name')?.value.trim();
        const members = [...screen.querySelectorAll('#gp-group-members input:checked')].map(i => i.value);
        if (!gname) { toast('Назови чат', 'fa-circle-exclamation'); return; }
        if (members.length < 1) { toast('Выбери хотя бы одного участника', 'fa-circle-exclamation'); return; }
        addGroup(gname, members);
        updatePhoneInjection();
        currentScreen = 'thread';
        currentThreadKey = `group:${keyOf(gname)}`;
        render();
    });
    screen.querySelector('#gp-add-name')?.focus();
}

// ═══ TWITTER ═══

// Отображаемый ник: для юзера/контактов — кастомный из настроек, иначе сохранённый
function dispHandle(item) {
    if (item.ak === 'user' || (typeof item.ak === 'string' && item.ak.startsWith('contact:'))) {
        return handleFor(item.ak, item.author);
    }
    return item.handle || makeHandle(item.author);
}

function twCard(t, { clickable = true } = {}) {
    const isUser = t.ak === 'user';
    const replyCount = t.replies?.length || 0;
    
    // Вложенная цитата
    let quoteHtml = '';
    if (t.quotedTweet) {
        quoteHtml = `
        <div class="gp-tw-quote">
            <div class="gp-tw-meta">
                <span class="gp-tw-name">${esc(t.quotedTweet.author)}</span>
                <span class="gp-tw-handle">${esc(t.quotedTweet.handle)}</span>
            </div>
            <div class="gp-tw-text">${esc(t.quotedTweet.text)}</div>
        </div>`;
    }

    return `
    <div class="gp-tw-card${clickable ? ' gp-clickable' : ''}" data-tweet="${esc(t.id)}">
        ${avatarHtml(t.author, avatarForAuthor(t.ak), 'gp-avatar gp-avatar-sm')}
        <div class="gp-tw-body">
            <div class="gp-tw-meta">
                <span class="gp-tw-name">${esc(t.author)}</span>
                <span class="gp-tw-handle">${esc(dispHandle(t))}</span>
                <span class="gp-tw-time">· ${esc(timeAgo(t.time))}</span>
                ${isUser
                    ? `<button class="gp-tw-del" data-del="${esc(t.id)}" title="Удалить">${ic('fa-xmark')}</button>`
                    : `<button class="gp-tw-del" data-regen-tw="${esc(t.id)}" title="Перегенерировать пост">${ic('fa-rotate-right')}</button>
                       <button class="gp-tw-del gp-ban-btn" data-ban-tw="${esc(t.id)}" title="Заблокировать аккаунт">${ic('fa-ban')}</button>`}
            </div>
            <div class="gp-tw-text">${esc(t.text)}</div>
            ${quoteHtml}
            <div class="gp-tw-actions">
                <button class="gp-tw-act" data-open="${esc(t.id)}">${ic('fa-comment')}<span>${replyCount || ''}</span></button>
                <button class="gp-tw-act${t.rted ? ' gp-tw-on-rt' : ''}" data-rt="${esc(t.id)}">${ic('fa-retweet')}<span>${t.rts || ''}</span></button>
                <button class="gp-tw-act${t.liked ? ' gp-tw-on' : ''}" data-like="${esc(t.id)}">${ic('fa-heart')}<span>${t.likes || ''}</span></button>
                <button class="gp-tw-act" data-share-tw="${esc(t.id)}" title="Отправить в лс">${ic('fa-share')}</button>
            </div>
            ${performanceHtml(t)}
        </div>
    </div>`;
}

function bindTwCardActions(root, rerender) {
    bindSocialSystemLinks(root);
    root.querySelectorAll('[data-like]').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation(); likeTweet(b.getAttribute('data-like')); rerender();
    }));
    root.querySelectorAll('[data-rt]').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation(); rtTweet(b.getAttribute('data-rt')); rerender();
    }));
    root.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Удалить твит?')) { delTweet(b.getAttribute('data-del')); rerender(); }
    }));
    root.querySelectorAll('[data-regen-tw]').forEach(b => b.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (genBusy) return;
        genBusy = true; render();
        try {
            const ok = await regenerateTweet(b.getAttribute('data-regen-tw'));
            toast(ok ? 'Пост переписан' : 'Не получилось переписать пост', ok ? 'fa-x-twitter' : 'fa-circle-exclamation');
        } catch (err) {
            toast(`Не получилось: ${String(err?.message || err).slice(0, 60)}`, 'fa-circle-exclamation');
        } finally { genBusy = false; render(); }
    }));
    root.querySelectorAll('[data-ban-tw]').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation();
        const tw = getTweets().find(x => x.id === b.getAttribute('data-ban-tw'));
        if (!tw) return;
        if (!confirm(`Заблокировать «${tw.author}»? Он больше не появится в ленте.`)) return;
        banAccount(tw.author);
        delTweet(tw.id);
        rerender();
        toast(`«${tw.author}» заблокирован`, 'fa-ban');
    }));
    root.querySelectorAll('[data-share-tw]').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation();
        const tw = getTweets().find(x => x.id === b.getAttribute('data-share-tw'));
        if (tw) openShareSheet({ app: 'tw', id: tw.id, author: tw.author, text: String(tw.text || '').slice(0, 200) });
    }));
    root.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation(); currentTweetId = b.getAttribute('data-open'); goto('twthread');
    }));
    root.querySelectorAll('.gp-tw-card.gp-clickable').forEach(el => el.addEventListener('click', () => {
        currentTweetId = el.getAttribute('data-tweet'); goto('twthread');
    }));
}

function renderTw(screen) {
    currentScreen = 'tw';
    const tweets = getTweets();
    markFeedSeen('tw', tweets.length);

    setHtmlKeepScroll(screen, '.gp-feed', `
        <div class="gp-header gp-thread-header">
            <button class="gp-iconbtn" id="gp-back">${ic('fa-chevron-left')}</button>
            <div class="gp-title gp-title-app">${brand('fa-x-twitter')}</div>
            <button class="gp-iconbtn" data-open-social title="Профиль и задания">${ic('fa-chart-line')}</button>
            <button class="gp-iconbtn" id="gp-tw-refresh" title="Пересобрать ленту заново" ${genBusy ? 'disabled' : ''}>${ic('fa-rotate')}</button>
            <button class="gp-iconbtn" id="gp-tw-gen" title="Дописать в ленту" ${genBusy ? 'disabled' : ''}>${genBusy ? ic('fa-spinner fa-spin') : ic('fa-wand-magic-sparkles')}</button>
        </div>
        <div class="gp-tw-compose">
            ${avatarHtml(getUserName(), avatarForAuthor('user'), 'gp-avatar gp-avatar-sm')}
            <input type="text" id="gp-tw-input" maxlength="280" placeholder="Что происходит?">
            <button class="gp-tw-handle-edit" id="gp-tw-handle" title="Изменить @ник">${esc(getUserHandle())}</button>
            <button class="gp-send gp-send-sm" id="gp-tw-post" disabled>${ic('fa-feather')}</button>
        </div>
        <div class="gp-feed" id="gp-tw-feed">
            ${tweets.length === 0
                ? `<div class="gp-empty"><div class="gp-empty-icon">${brand('fa-x-twitter')}</div><div class="gp-empty-title">Лента пуста</div><div class="gp-empty-text">Нажми ${ic('fa-wand-magic-sparkles')} — лента сгенерируется<br>по событиям твоей ролевой</div></div>`
                : tweets.map(t => twCard(t)).join('')}
        </div>`);

    screen.querySelector('#gp-back')?.addEventListener('click', () => goto('home'));
    bindSocialSystemLinks(screen);

    const input = screen.querySelector('#gp-tw-input');
    const postBtn = screen.querySelector('#gp-tw-post');
    screen.querySelector('#gp-tw-handle')?.addEventListener('click', () => {
        const value = prompt('Твой @ник в Twitter', getUserHandle());
        if (value === null) return;
        setUserHandle(value);
        render();
    });
    input?.addEventListener('input', () => { postBtn.disabled = !input.value.trim(); });
    const doPost = async () => {
        const v = input?.value.trim();
        if (!v || genBusy) return;
        clearDraft('gp-tw-input');
        const userPost = postTweet(v);
        const ad = attachActiveAd('twitter', userPost);
        if (ad) toast(`Реклама ${ad.brand} опубликована`, 'fa-star');
        logSocialToChat(`${getUserName()} публикует твит: «${v}»`); // в историю чата (память/саммарайз)
        updatePhoneInjection(); // персонажи «видят» твит юзера
        
        genBusy = true;
        render();
        try {
            const before = (userPost.replies || []).length;
            const addedFeed = await generateTweetFeed();
            const addedComments = await generateTweetComments(userPost);
            updatePhoneInjection();
            logNewReplies('твитом', userPost.text, userPost.replies, before);
            await finalizeSocialPost('twitter', userPost, { addedComments, addedFeed });
        } catch (e) {
            console.error('[GlassPhone] tw feed auto-gen failed:', e);
            toast('Твит отправлен, но лента не обновилась', 'fa-circle-exclamation');
        } finally {
            genBusy = false;
            if (currentScreen === 'tw') render();
        }
    };
    postBtn?.addEventListener('click', doPost);
    input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doPost(); } });

    screen.querySelector('#gp-tw-gen')?.addEventListener('click', async () => {
        if (genBusy) return;
        genBusy = true; render();
        try {
            const n = await generateTweetFeed();
            logFeedDigest('лента твиттера', getTweets().filter(t => t.ak !== 'user').slice(0, n));
            toast(n > 0 ? `Новых твитов: ${n}` : 'Не получилось — попробуй ещё раз', n > 0 ? 'fa-x-twitter' : 'fa-circle-exclamation');
        } catch (e) {
            console.error('[GlassPhone] tw feed failed:', e);
            toast('Ошибка генерации', 'fa-circle-exclamation');
        } finally {
            genBusy = false;
            if (currentScreen === 'tw') render();
        }
    });

    screen.querySelector('#gp-tw-refresh')?.addEventListener('click', async () => {
        if (genBusy) return;
        // Свои твиты остаются: пересобирается только то, что придумала модель
        if (!confirm('Пересобрать ленту заново?\n\nЧужие твиты заменятся новыми, твои останутся.')) return;
        genBusy = true; render();
        try {
            const n = await refreshFeed('tw');
            toast(n > 0 ? `Лента пересобрана: ${n}` : 'Не получилось — попробуй ещё раз', n > 0 ? 'fa-x-twitter' : 'fa-circle-exclamation');
        } catch (e) {
            toast(`Не получилось: ${String(e?.message || e).slice(0, 60)}`, 'fa-circle-exclamation');
        } finally {
            genBusy = false;
            if (currentScreen === 'tw') render();
        }
    });

    bindTwCardActions(screen, () => render());
}

function renderTwThread(screen) {
    const t = getTweets().find(x => x.id === currentTweetId);
    if (!t) { goto('tw'); return; }
    const replies = t.replies || [];
    const canAuthorReply = typeof t.ak === 'string' && t.ak.startsWith('contact:');

    // Локальное состояние: на какой коммент отвечаем прямо сейчас
    let replyTargetId = null;

    setHtmlKeepScroll(screen, '.gp-feed', `
        <div class="gp-header gp-thread-header">
            <button class="gp-iconbtn" id="gp-back">${ic('fa-chevron-left')}</button>
            <div class="gp-title gp-title-app">Тред</div>
            <button class="gp-iconbtn" id="gp-tw-comments" title="Сгенерировать обсуждение" ${genBusy ? 'disabled' : ''}>${genBusy ? ic('fa-spinner fa-spin') : ic('fa-comments')}</button>
        </div>
        <div class="gp-feed">
            ${twCard(t, { clickable: false })}
            <div class="gp-replies">
                ${replies.length === 0
                    ? `<div class="gp-empty-text gp-replies-empty">Комментариев нет — нажми ${ic('fa-comments')}</div>`
                    : replies.map(r => `
                    <div class="gp-reply">
                        ${avatarHtml(r.author, r.avatar || avatarForAuthor(r.ak), 'gp-avatar gp-avatar-xs')}
                        <div class="gp-reply-body">
                            <div class="gp-tw-meta">
                                <span class="gp-tw-name">${esc(r.author)}</span>
                                <span class="gp-tw-handle">${esc(dispHandle(r))}</span>
                                <span class="gp-tw-time">· ${esc(timeAgo(r.time))}</span>
                                <button class="gp-reply-btn" data-replyto-tw="${esc(r.id)}" title="Ответить">${ic('fa-reply')}</button>
                                <button class="gp-reply-del" data-del-reply="${esc(r.id)}" title="Удалить">${ic('fa-xmark')}</button>
                            </div>
                            ${r.replyTo ? `<div class="gp-reply-to">${ic('fa-reply')} ${esc(r.replyTo.author)}</div>` : ''}
                            <div class="gp-tw-text">${esc(r.text)}</div>
                        </div>
                    </div>`).join('')}
            </div>
        </div>
        <div class="gp-inputbar">
            <textarea id="gp-input" rows="1" placeholder="Ответить..."></textarea>
            <button class="gp-send" id="gp-tw-reply" ${sending ? 'disabled' : ''}>${ic('fa-paper-plane')}</button>
        </div>`);

    screen.querySelector('#gp-back')?.addEventListener('click', () => goto('tw'));
    bindTwCardActions(screen, () => render());

    const input = screen.querySelector('#gp-input');

    // Клик на "Ответить" у конкретного коммента
    screen.querySelectorAll('[data-replyto-tw]').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation();
        const rid = b.getAttribute('data-replyto-tw');
        const r = replies.find(x => x.id === rid);
        if (r && input) {
            replyTargetId = rid;
            input.value = `${r.handle} `;
            input.focus();
        }
    }));

    // Удаление реплаев
    screen.querySelectorAll('[data-del-reply]').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation();
        delTweetReply(t.id, b.getAttribute('data-del-reply'));
        render();
    }));

    screen.querySelector('#gp-tw-comments')?.addEventListener('click', async () => {
        if (genBusy) return;
        genBusy = true; render();
        try {
            const before = (t.replies || []).length;
            const n = await generateTweetComments(t);
            if (t.ak === 'user') await finalizeSocialPost('twitter', t);
            if (!n) toast('Не получилось — попробуй ещё раз', 'fa-circle-exclamation');
            if (t.ak === 'user') logNewReplies('твитом', t.text, t.replies, before);
        } catch (e) {
            console.error('[GlassPhone] tw comments failed:', e);
            toast('Ошибка генерации', 'fa-circle-exclamation');
        } finally {
            genBusy = false;
            if (currentScreen === 'twthread') render();
        }
    });

    const doReply = async () => {
        const v = input?.value.trim();
        if (!v || sending) return;
        
        let targetComment = null;
        if (replyTargetId) {
            targetComment = replies.find(x => x.id === replyTargetId);
        }
        
        // Добавляем реплай юзера (с указанием кому он отвечает)
        addTweetReply(t.id, v, null, 'user', targetComment);
        input.value = '';
        replyTargetId = null;
        render();

        sending = true;
        genBusy = true;
        render();
        try {
            const beforeGen = (t.replies || []).length;
            if (targetComment) {
                // Если ответили на конкретный коммент — генерим ответ его автора (если он контакт)
                await generateReplyToComment('tw', t, targetComment, v);
            } else if (canAuthorReply) {
                // Иначе генерим ответ автора треда (если он контакт)
                await generateAuthorReply('tw', t, v);
            }
            // После ответа юзера — генерим дополнительные реакции от других
            await generateTweetComments(t);
            // Журнал: её ответ + значимые ответы одной строкой
            const added = (t.replies || []).slice(beforeGen).filter(r => r.ak !== 'user');
            const cparts = added.map(r => `${r.author || 'Аккаунт'}: «${String(r.text || '').slice(0, 120)}»`);
            let line = `${getUserName()} отвечает под твитом ${t.author} («${String(t.text).slice(0, 50)}»): «${v}»`;
            if (cparts.length) line += ` — ответы: ${cparts.join('; ')}`;
            logSocialToChat(line);
        } catch (e) {
            console.error('[GlassPhone] author reply failed:', e);
        } finally {
            sending = false;
            genBusy = false;
            if (currentScreen === 'twthread') render();
        }
    };
    screen.querySelector('#gp-tw-reply')?.addEventListener('click', doReply);
    input?.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doReply(); } });
}

// ═══ INSTAGRAM ═══

// Посты, для которых прямо сейчас генерится картинка (спиннер)
const _imgGenBusy = new Set();
// Посты, для которых прямо сейчас идёт вижн-описание фото
const _descBusy = new Set();

// Плашка под постом: описание фото — опциональный текст-дубль (для не-vision
// моделей и саммарайза; само фото и так уходит в чат с журнальной записью).
// Клик: вписать вручную; пустой ввод при пустом описании — описать вижном.
function imgDescNoteHtml(p) {
    if (!p.image) return '';
    if (_descBusy.has(p.id)) {
        return `<div class="gp-imgdesc-note">${ic('fa-spinner fa-spin')} <span>Смотрю на фото...</span></div>`;
    }
    return p.imgDesc
        ? `<div class="gp-imgdesc-note gp-clickable" data-editdesc="${esc(p.id)}" title="Клик — изменить">${ic('fa-eye')} <span>${esc(p.imgDesc)}</span></div>`
        : `<div class="gp-imgdesc-note gp-clickable" data-editdesc="${esc(p.id)}">${ic('fa-image')} <span>Фото ушло в чат вместе с постом. Текст-описание (для саммари) не задано — клик: вписать, или оставь пусто для вижна.</span></div>`;
}

function bindDescEdit(screen, p) {
    screen.querySelectorAll('[data-editdesc]').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation();
        const v = prompt('Что на фото (текст для саммари и не-vision моделей).\nОставь пусто и нажми ОК — опишу вижном:', p.imgDesc || '');
        if (v === null) return;
        if (!v.trim() && !p.imgDesc) {
            _descBusy.add(p.id);
            render();
            describePostImage(p).then(() => {
                _descBusy.delete(p.id);
                updatePhoneInjection();
                render();
            }).catch(() => { _descBusy.delete(p.id); render(); });
            return;
        }
        p.imgDesc = v.trim().slice(0, 200);
        import('./state.js').then(m => m.saveMeta());
        updatePhoneInjection();
        render();
    }));
}

// Журнал веток: все новые реплики под постом/тредом юзера → одной скрытой строкой в чат.
function logNewReplies(kindLabel, postText, arr, beforeLen) {
    const added = (arr || []).slice(beforeLen).filter(r => r.ak !== 'user');
    if (!added.length) return;
    let line = `под её ${kindLabel}${postText ? ` («${String(postText).slice(0, 80)}»)` : ''}`;
    const parts = added.map(c => `${c.author || 'Аккаунт'}: «${String(c.text || '').trim()}»`);
    line += ` прокомментировали: ${parts.join('; ')}`;
    logSocialToChat(line);
}
// Доступна ли генерация картинок (кэш; уточняется асинхронно при первом рендере инсты)
let _imgGenReady = false;
isImageGenAvailable().then(v => { _imgGenReady = v; }).catch(() => {});

// key — тот же, по которому генерация зарегистрирована в social.js
// Кнопки «стоп» живут на разных экранах и перерисовываются — вешаем один
// делегат на контейнер, а не слушатель на каждую кнопку
function bindStopGen(screen) {
    if (screen.dataset.stopGenBound) return;
    screen.dataset.stopGenBound = '1';
    screen.addEventListener('click', (e) => {
        const btn = e.target.closest?.('[data-genstop]');
        if (!btn) return;
        e.stopPropagation();
        e.preventDefault();
        cancelImageGen(btn.getAttribute('data-genstop'));
    });
}

function stopGenBtn(key) {
    return `<button class="gp-gen-stop" data-genstop="${esc(key)}" title="Остановить генерацию" aria-label="Остановить">${ic('fa-xmark')}</button>`;
}

function igImageHtml(p) {
    if (p.image) {
        const busy = _imgGenBusy.has(p.id);
        // Cache-busting: если URL не data:, добавляем ?t= для принудительной перезагрузки
        const src = p.image.startsWith('data:') ? p.image : p.image + (p.image.includes('?') ? '&' : '?') + 't=' + (p._imgTs || '0');
        return `<div class="gp-ig-img gp-ig-img-has">
            <img src="${esc(src)}" alt="" data-zoom>
            ${busy
                ? `<div class="gp-ig-regen-overlay">${ic('fa-spinner fa-spin')}<div class="gp-ig-genstatus" data-genstatus="${esc(p.id)}">Перегенерация...</div>${stopGenBtn(p.id)}</div>`
                : `<button class="gp-ig-regenbtn" data-regenimg="${esc(p.id)}" title="Перегенерировать">${ic('fa-rotate-right')}</button>`}
        </div>`;
    }
    const busy = _imgGenBusy.has(p.id);
    // Сгенерированный «снимок»: стеклянная заглушка с описанием кадра.
    // Кнопка «нарисовать» всегда видна — доступность проверяется при клике.
    return `<div class="gp-ig-img gp-ig-img-gen" style="${avatarStyle(p.author + (p.imgDesc || ''))}">
        <div class="gp-ig-img-inner">
            ${busy ? ic('fa-spinner fa-spin') : ic('fa-image')}
            ${p.imgDesc ? `<div class="gp-ig-img-desc">${esc(p.imgDesc)}</div>` : ''}
            ${busy ? `<div class="gp-ig-genstatus" data-genstatus="${esc(p.id)}">Генерация...</div>${stopGenBtn(p.id)}` : ''}
            ${!busy ? `<button class="gp-ig-genbtn" data-genimg="${esc(p.id)}">${ic('fa-wand-magic-sparkles')} Нарисовать</button>` : ''}
        </div>
    </div>`;
}

function igCard(p, { clickable = true } = {}) {
    const isUser = p.ak === 'user';
    const handle = handleFor(p.ak, p.author);
    return `
    <div class="gp-ig-card" data-post="${esc(p.id)}">
        <div class="gp-ig-head">
            ${avatarHtml(p.author, avatarForAuthor(p.ak), 'gp-avatar gp-avatar-xs')}
            <span class="gp-ig-nameblock">
                <span class="gp-ig-name">${esc(p.author)}</span>
                <span class="gp-ig-handle">${esc(handle)}</span>
            </span>
            <span class="gp-tw-time">· ${esc(timeAgo(p.time))}</span>
            ${isUser
                ? `<button class="gp-tw-del" data-del-ig="${esc(p.id)}" title="Удалить">${ic('fa-xmark')}</button>`
                : `<button class="gp-tw-del" data-regen-ig="${esc(p.id)}" title="Перегенерировать пост">${ic('fa-rotate-right')}</button>
                   <button class="gp-tw-del gp-ban-btn" data-ban-ig="${esc(p.id)}" title="Заблокировать аккаунт">${ic('fa-ban')}</button>`}
        </div>
        <div class="${clickable ? 'gp-clickable' : ''}" data-open-ig="${esc(p.id)}">${igImageHtml(p)}</div>
        <div class="gp-ig-actions">
            <button class="gp-tw-act${p.liked ? ' gp-tw-on' : ''}" data-like-ig="${esc(p.id)}">${ic('fa-heart')}<span>${p.likes || ''}</span></button>
            <button class="gp-tw-act" data-open-ig2="${esc(p.id)}">${ic('fa-comment')}<span>${p.comments?.length || ''}</span></button>
            <button class="gp-tw-act" data-share-ig="${esc(p.id)}" title="Отправить в лс">${ic('fa-share')}</button>
        </div>
        ${p.caption ? `<div class="gp-ig-caption"><b>${esc(p.author)}</b> ${esc(p.caption)}</div>` : ''}
        ${performanceHtml(p)}
    </div>`;
}

function bindIgCardActions(root) {
    bindSocialSystemLinks(root);
    root.querySelectorAll('[data-share-ig]').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = b.getAttribute('data-share-ig');
        const post = getIgPosts().find(x => x.id === id) || getOfPosts().find(x => x.id === id);
        if (post) openShareSheet({ app: post.price !== undefined ? 'of' : 'ig', id: post.id, author: post.author, text: String(post.caption || post.imgDesc || '').slice(0, 200) });
    }));
    root.querySelectorAll('[data-like-ig]').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation(); likeIg(b.getAttribute('data-like-ig')); render();
    }));
    // Генерация/перегенерация картинки через картинко-расширение
    const doGenImage = async (id) => {
        const post = getIgPosts().find(x => x.id === id) || getOfPosts().find(x => x.id === id);
        if (!post || _imgGenBusy.has(id)) return;
        // Проверяем доступность при клике, а не при рендере
        if (!_imgGenReady) {
            const ready = await isImageGenAvailable();
            if (!ready) {
                toast('Картинко-расширение не установлено — генерация недоступна', 'fa-circle-exclamation');
                return;
            }
            _imgGenReady = true;
        }
        _imgGenBusy.add(id);
        render();
        try {
            await generatePostImage(post, (status) => {
                const el = document.querySelector(`[data-genstatus="${CSS.escape(id)}"]`);
                if (el) el.textContent = status;
            }, id);
            post._imgTs = Date.now(); // cache-busting для перезагрузки нового фото
            toast('Фото готово', 'fa-instagram');
        } catch (err) {
            // Отмена — не ошибка: молча снимаем индикатор
            if (err?.name === 'ImageGenCancelled' || err?.name === 'AbortError') {
                toast('Генерация остановлена', 'fa-circle-stop');
            } else {
                console.error('[GlassPhone] image gen failed:', err);
                toast(`Не получилось: ${String(err?.message || err).slice(0, 60)}`, 'fa-circle-exclamation');
            }
        } finally {
            _imgGenBusy.delete(id);
            render();
        }
    };
    root.querySelectorAll('[data-genimg]').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation();
        doGenImage(b.getAttribute('data-genimg'));
    }));
    root.querySelectorAll('[data-regenimg]').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation();
        doGenImage(b.getAttribute('data-regenimg'));
    }));
    root.querySelectorAll('[data-del-ig]').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Удалить пост?')) { delIg(b.getAttribute('data-del-ig')); render(); }
    }));
    // Бан аккаунта: блокируем автора и удаляем его пост (в лентах он больше не появится)
    root.querySelectorAll('[data-ban-ig]').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = b.getAttribute('data-ban-ig');
        const post = getIgPosts().find(x => x.id === id) || getOfPosts().find(x => x.id === id);
        if (!post) return;
        if (!confirm(`Заблокировать «${post.author}»? Он больше не будет появляться в ленте.`)) return;
        banAccount(post.author);
        if (getIgPosts().some(x => x.id === id)) delIg(id); else delOf(id);
        if (currentScreen === 'igview' || currentScreen === 'ofview') goto(currentScreen === 'ofview' ? 'of' : 'ig');
        else render();
        toast(`«${post.author}» заблокирован`, 'fa-ban');
    }));
    root.querySelectorAll('[data-regen-ig]').forEach(b => b.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (genBusy) return;
        genBusy = true; render();
        try {
            const ok = await regenerateIgPost(b.getAttribute('data-regen-ig'));
            toast(ok ? 'Пост переписан' : 'Не получилось переписать пост', ok ? 'fa-instagram' : 'fa-circle-exclamation');
        } catch (err) {
            toast(`Не получилось: ${String(err?.message || err).slice(0, 60)}`, 'fa-circle-exclamation');
        } finally { genBusy = false; render(); }
    }));
    const open = (id) => { currentPostId = id; goto('igview'); };
    root.querySelectorAll('[data-open-ig]').forEach(b => b.addEventListener('click', () => open(b.getAttribute('data-open-ig'))));
    root.querySelectorAll('[data-open-ig2]').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation(); open(b.getAttribute('data-open-ig2'));
    }));
}

function renderIg(screen) {
    currentScreen = 'ig';
    const posts = getIgPosts();
    markFeedSeen('ig', posts.length);

    setHtmlKeepScroll(screen, '.gp-feed', `
        <div class="gp-header gp-thread-header">
            <button class="gp-iconbtn" id="gp-back">${ic('fa-chevron-left')}</button>
            <div class="gp-title gp-title-app">${brand('fa-instagram')}</div>
            <button class="gp-iconbtn" data-open-social title="Профиль и задания">${ic('fa-chart-line')}</button>
            <button class="gp-iconbtn" id="gp-ig-new" title="Новый пост">${ic('fa-plus')}</button>
            <button class="gp-iconbtn" id="gp-ig-refresh" title="Пересобрать ленту заново" ${genBusy ? 'disabled' : ''}>${ic('fa-rotate')}</button>
            <button class="gp-iconbtn" id="gp-ig-gen" title="Дописать в ленту" ${genBusy ? 'disabled' : ''}>${genBusy ? ic('fa-spinner fa-spin') : ic('fa-wand-magic-sparkles')}</button>
        </div>
        <div class="gp-feed" id="gp-ig-feed">
            ${igStoriesRow()}
            ${posts.length === 0
                ? `<div class="gp-empty"><div class="gp-empty-icon">${brand('fa-instagram')}</div><div class="gp-empty-title">Лента пуста</div><div class="gp-empty-text">${ic('fa-wand-magic-sparkles')} — сгенерировать ленту<br>${ic('fa-plus')} — выложить своё фото</div></div>`
                : posts.map(p => igCard(p)).join('')}
        </div>`);

    screen.querySelector('#gp-back')?.addEventListener('click', () => goto('home'));
    bindSocialSystemLinks(screen);
    screen.querySelector('#gp-ig-new')?.addEventListener('click', () => goto('ignew'));
    screen.querySelector('#gp-ig-story-me')?.addEventListener('click', () => {
        _storyAuthor = null; // свои
        if (activeStories().some(s => s.ak === 'user')) { _storyIdx = 0; goto('igstory'); }
        else goto('ignewstory');
    });
    screen.querySelector('#gp-ig-story-add')?.addEventListener('click', () => goto('ignewstory'));
    screen.querySelectorAll('[data-storyauthor]').forEach(b => b.addEventListener('click', () => {
        _storyAuthor = b.getAttribute('data-storyauthor');
        _storyIdx = 0;
        goto('igstory');
    }));
    screen.querySelector('#gp-ig-gen')?.addEventListener('click', async () => {
        if (genBusy) return;
        genBusy = true; render();
        try {
            const n = await generateIgFeed();
            logFeedDigest('лента Instagram', getIgPosts().filter(p => p.ak !== 'user').slice(0, n));
            toast(n > 0 ? `Новых постов: ${n}` : 'Не получилось — попробуй ещё раз', n > 0 ? 'fa-instagram' : 'fa-circle-exclamation');
        } catch (e) {
            console.error('[GlassPhone] ig feed failed:', e);
            toast('Ошибка генерации', 'fa-circle-exclamation');
        } finally {
            genBusy = false;
            if (currentScreen === 'ig') render();
        }
    });
    screen.querySelector('#gp-ig-refresh')?.addEventListener('click', async () => {
        if (genBusy) return;
        // Свои посты остаются: пересобирается только то, что придумала модель
        if (!confirm('Пересобрать ленту заново?\n\nЧужие посты заменятся новыми, твои останутся.')) return;
        genBusy = true; render();
        try {
            const n = await refreshFeed('ig');
            toast(n > 0 ? `Лента пересобрана: ${n}` : 'Не получилось — попробуй ещё раз', n > 0 ? 'fa-instagram' : 'fa-circle-exclamation');
        } catch (e) {
            toast(`Не получилось: ${String(e?.message || e).slice(0, 60)}`, 'fa-circle-exclamation');
        } finally {
            genBusy = false;
            if (currentScreen === 'ig') render();
        }
    });
    bindIgCardActions(screen);
}

function renderIgView(screen) {
    const p = getIgPosts().find(x => x.id === currentPostId);
    if (!p) { goto('ig'); return; }
    const comments = p.comments || [];
    const canAuthorReply = typeof p.ak === 'string' && p.ak.startsWith('contact:');

    // Локальное состояние: на какой коммент отвечаем прямо сейчас
    let replyTargetId = null;

    setHtmlKeepScroll(screen, '.gp-feed', `
        <div class="gp-header gp-thread-header">
            <button class="gp-iconbtn" id="gp-back">${ic('fa-chevron-left')}</button>
            <div class="gp-title gp-title-app">Пост</div>
            <button class="gp-iconbtn" id="gp-ig-comments" title="Сгенерировать реакции" ${genBusy ? 'disabled' : ''}>${genBusy ? ic('fa-spinner fa-spin') : ic('fa-comments')}</button>
        </div>
        <div class="gp-feed">
            ${igCard(p, { clickable: false })}
            ${imgDescNoteHtml(p)}
            <div class="gp-replies">
                ${comments.length === 0
                    ? `<div class="gp-empty-text gp-replies-empty">Комментариев нет — нажми ${ic('fa-comments')}, пусть отреагируют</div>`
                    : comments.map(c => `
                    <div class="gp-reply">
                        ${avatarHtml(c.author, c.avatar || avatarForAuthor(c.ak), 'gp-avatar gp-avatar-xs')}
                        <div class="gp-reply-body">
                            <div class="gp-tw-meta">
                                <span class="gp-tw-name">${esc(c.author)}</span>
                                <span class="gp-tw-time">· ${esc(timeAgo(c.time))}</span>
                                <button class="gp-reply-btn" data-replyto-ig="${esc(c.id)}" title="Ответить">${ic('fa-reply')}</button>
                                <button class="gp-reply-del" data-del-igcomment="${esc(c.id)}" title="Удалить">${ic('fa-xmark')}</button>
                            </div>
                            ${c.replyTo ? `<div class="gp-reply-to">${ic('fa-reply')} ${esc(c.replyTo.author)}</div>` : ''}
                            <div class="gp-tw-text">${esc(c.text)}</div>
                        </div>
                    </div>`).join('')}
            </div>
        </div>
        <div class="gp-inputbar">
            <textarea id="gp-input" rows="1" placeholder="Комментировать..."></textarea>
            <button class="gp-send" id="gp-ig-reply" ${sending ? 'disabled' : ''}>${ic('fa-paper-plane')}</button>
        </div>`);

    screen.querySelector('#gp-back')?.addEventListener('click', () => goto('ig'));
    bindIgCardActions(screen);
    bindDescEdit(screen, p);

    const input = screen.querySelector('#gp-input');

    // Клик на "Ответить" у конкретного коммента
    screen.querySelectorAll('[data-replyto-ig]').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation();
        const cid = b.getAttribute('data-replyto-ig');
        const c = comments.find(x => x.id === cid);
        if (c && input) {
            replyTargetId = cid;
            input.value = `@${c.author.replace(/\s+/g, '')} `;
            input.focus();
        }
    }));

    // Удаление комментариев
    screen.querySelectorAll('[data-del-igcomment]').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation();
        delIgComment(p.id, b.getAttribute('data-del-igcomment'));
        render();
    }));

    screen.querySelector('#gp-ig-comments')?.addEventListener('click', async () => {
        if (genBusy) return;
        genBusy = true; render();
        try {
            const before = (p.comments || []).length;
            const n = await generateIgComments(p);
            if (p.ak === 'user') await finalizeSocialPost('instagram', p);
            if (!n) toast('Не получилось — попробуй ещё раз', 'fa-circle-exclamation');
            if (p.ak === 'user') logNewReplies('фото в Instagram', p.caption || p.imgDesc, p.comments, before);
        } catch (e) {
            console.error('[GlassPhone] ig comments failed:', e);
            toast('Ошибка генерации', 'fa-circle-exclamation');
        } finally {
            genBusy = false;
            if (currentScreen === 'igview') render();
        }
    });

    const doComment = async () => {
        const v = input?.value.trim();
        if (!v || sending) return;

        let targetComment = null;
        if (replyTargetId) {
            targetComment = comments.find(x => x.id === replyTargetId);
        }

        addIgComment(p.id, v, null, 'user', targetComment);
        input.value = '';
        replyTargetId = null;
        render();

        sending = true;
        genBusy = true;
        render();
        try {
            const beforeGen = (p.comments || []).length;
            if (targetComment) {
                await generateReplyToComment('ig', p, targetComment, v);
            } else if (canAuthorReply) {
                await generateAuthorReply('ig', p, v);
            }
            // После ответа юзера — генерим дополнительные реакции от других
            await generateIgComments(p);
            // Журнал: её коммент + значимые ответы
            const added = (p.comments || []).slice(beforeGen).filter(c => c.ak !== 'user');
            const cparts = added.map(c => `${c.author || 'Аккаунт'}: «${String(c.text || '').slice(0, 120)}»`);
            let line = `${getUserName()} прокомментировала пост ${p.author} в Instagram: «${v}»`;
            if (cparts.length) line += ` — ответы: ${cparts.join('; ')}`;
            logSocialToChat(line);
        } catch (e) {
            console.error('[GlassPhone] ig author reply failed:', e);
        } finally {
            sending = false;
            genBusy = false;
            if (currentScreen === 'igview') render();
        }
    };
    screen.querySelector('#gp-ig-reply')?.addEventListener('click', doComment);
    input?.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doComment(); } });
}

// Новый пост юзера с загрузкой фото
let _igDraftImage = null;
// ═══ ИНСТА-СТОРИС ═══

let _storyDraftImage = null;
let _storyGenBusy = false;
let _storyIdx = 0;
const STORY_REACT_ICONS = { fire: 'fa-fire', heart: 'fa-heart', laugh: 'fa-face-laugh-squint', wow: 'fa-face-surprise', sad: 'fa-face-sad-tear' };
let _storyAuthor = null;   // выставляется при входе с аватарки: на чью сторис встать

// Все активные сторис в порядке листания: свои первыми, дальше чужие —
// сгруппированы по автору (как в инсте) и отсортированы по свежести
function allStoriesOrdered() {
    const all = activeStories();
    const mine = all.filter(s => s.ak === 'user').sort((a, b) => a.time - b.time);
    const others = all.filter(s => s.ak !== 'user');
    const byAuthor = new Map();
    for (const s of others) {
        const k = s.author || '?';
        if (!byAuthor.has(k)) byAuthor.set(k, []);
        byAuthor.get(k).push(s);
    }
    const groups = [...byAuthor.values()].map(g => g.sort((a, b) => a.time - b.time));
    groups.sort((a, b) => b[0].time - a[0].time); // свежий автор выше
    return [...mine, ...groups.flat()];
}
let _othersStoriesBusy = false;

function igStoriesRow() {
    const all = activeStories();
    const mine = all.filter(s => s.ak === 'user');
    // Чужие сторис группируются по автору — один кружок на человека
    const others = [];
    const seen = new Set();
    for (const s of all) {
        if (s.ak === 'user' || !s.author || seen.has(s.author)) continue;
        seen.add(s.author);
        others.push(s);
    }
    const ava = avatarHtml(getUserName(), avatarForAuthor('user'), 'gp-avatar');
    return `
        <div class="gp-igst-row">
            <button class="gp-igst-bubble${mine.length ? ' gp-igst-has' : ''}" id="gp-ig-story-me">
                <span class="gp-igst-ring">${ava}${mine.length ? '' : `<span class="gp-igst-plus">${ic('fa-plus')}</span>`}</span>
                <i>${mine.length ? 'Твоя сторис' : 'Добавить'}</i>
            </button>
            ${mine.length ? `
            <button class="gp-igst-bubble" id="gp-ig-story-add">
                <span class="gp-igst-ring gp-igst-ring-add">${ic('fa-plus')}</span>
                <i>Ещё</i>
            </button>` : ''}
            ${others.map(o => `
            <button class="gp-igst-bubble gp-igst-has" data-storyauthor="${esc(o.author)}">
                <span class="gp-igst-ring">${avatarHtml(o.author, avatarForAuthor(o.ak), 'gp-avatar')}</span>
                <i>${esc(o.author)}</i>
            </button>`).join('')}
        </div>`;
}

function renderIgNewStory(screen) {
    currentScreen = 'ignewstory';
    screen.innerHTML = `
        <div class="gp-header gp-thread-header">
            <button class="gp-iconbtn" id="gp-back">${ic('fa-chevron-left')}</button>
            <div class="gp-title gp-title-app">Новая сторис</div>
        </div>
        <div class="gp-add-form">
            <div class="gp-ig-pick gp-igst-pick${_storyDraftImage ? ' gp-ig-pick-has' : ''}" id="gp-st-pick">
                ${_storyDraftImage ? `<img src="${esc(_storyDraftImage)}" alt="">` : `${ic('fa-camera')}<span>Выбрать фото</span>`}
            </div>
            <input type="file" id="gp-st-file" accept="image/*" style="display:none">
            <label class="gp-field">
                <span>Что на фото</span>
                <input type="text" id="gp-st-desc" maxlength="300" placeholder="Для генерации и реакций в ролевой">
            </label>
            <button class="gp-secondary" id="gp-st-draw" ${_storyGenBusy ? 'disabled' : ''}>${ic(_storyGenBusy ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles')} Нарисовать по описанию</button>
            <label class="gp-field">
                <span>Текст на сторис <i style="opacity:0.5;text-transform:none;letter-spacing:0">(необязательно)</i></span>
                <input type="text" id="gp-st-caption" maxlength="300" placeholder="Подпись поверх фото">
            </label>
            <button class="gp-primary" id="gp-st-publish">${ic('fa-check')} Опубликовать</button>
        </div>`;
    screen.querySelector('#gp-back')?.addEventListener('click', () => { _storyDraftImage = null; goto('ig'); });
    const pick = screen.querySelector('#gp-st-pick');
    const file = screen.querySelector('#gp-st-file');
    pick?.addEventListener('click', () => file?.click());
    file?.addEventListener('change', async () => {
        const f = file.files?.[0];
        if (!f) return;
        try {
            _storyDraftImage = await compressImage(f, 720, 0.82);
            render();
        } catch (e) {
            toast('Не удалось загрузить фото', 'fa-circle-exclamation');
        }
    });
    screen.querySelector('#gp-st-draw')?.addEventListener('click', async () => {
        if (_storyGenBusy) return;
        const desc = screen.querySelector('#gp-st-desc')?.value.trim() || '';
        if (!desc) { toast('Опиши, что на фото — по этому и рисуем', 'fa-circle-exclamation'); return; }
        if (!_imgGenReady) {
            const ready = await isImageGenAvailable();
            if (!ready) { toast('Картинко-расширение не установлено — генерация недоступна', 'fa-circle-exclamation'); return; }
            _imgGenReady = true;
        }
        _storyGenBusy = true;
        const caption = screen.querySelector('#gp-st-caption')?.value.trim() || '';
        render();
        try {
            const src2 = await generatePostImage({ ak: 'user', kind: 'ig', author: getUserName(), imgDesc: desc, caption, aspect: '9:16' }, null, 'story-draft');
            _storyDraftImage = src2;
            toast('Фото готово', 'fa-image');
        } catch (e) {
            if (e?.name === 'ImageGenCancelled' || e?.name === 'AbortError') toast('Генерация остановлена', 'fa-circle-stop');
            else toast(`Не получилось: ${String(e?.message || e).slice(0, 60)}`, 'fa-circle-exclamation');
        } finally {
            _storyGenBusy = false;
            const d = document.getElementById('gp-st-desc')?.value;
            const c = document.getElementById('gp-st-caption')?.value;
            render();
            const d2 = document.getElementById('gp-st-desc'); if (d2 && d) d2.value = d;
            const c2 = document.getElementById('gp-st-caption'); if (c2 && c) c2.value = c;
        }
    });
    screen.querySelector('#gp-st-publish')?.addEventListener('click', () => {
        const desc = screen.querySelector('#gp-st-desc')?.value.trim() || '';
        const caption = screen.querySelector('#gp-st-caption')?.value.trim() || '';
        if (!_storyDraftImage && !desc) {
            toast('Выбери фото или опиши, что на нём', 'fa-circle-exclamation');
            return;
        }
        clearDraft('gp-st-desc'); clearDraft('gp-st-caption');
        const story = addStory({ image: _storyDraftImage, imgDesc: desc, caption });
        _storyDraftImage = null;
        // Журнал: в чат уходит описание, а не сам снимок. Если фото выбрано,
        // а описания нет — ждём его от vision-запроса с реакциями ниже
        const logStory = (d) => logSocialToChat(
            `${getUserName()} выкладывает сторис в Instagram${d ? ` (на фото: ${d})` : ''}${caption ? `, текст: «${caption}»` : ''} — исчезнет через 24 часа`,
        );
        const waitDesc = !!story.image && !desc;
        if (!waitDesc) logStory(desc);
        applyChatHiding();
        toast('Сторис опубликована', 'fa-instagram');
        _storyAuthor = null;
        _storyIdx = 0;
        goto('igstory');
        // Цепочка после публикации: реакции на сторис (огонёчки + директы
        // смсками) → чужие сторис. Всё фоном, телефон не блокируется.
        if (!_othersStoriesBusy) {
            _othersStoriesBusy = true;
            (async () => {
                try {
                    const r = await generateStoryReactions(story);
                    if (waitDesc) { logStory(story.imgDesc || ''); applyChatHiding(); }
                    if (r?.reactions?.length) toast(`Реакции на сторис: ${r.reactions.length}`, 'fa-fire');
                    for (const dm of (r?.dms || [])) {
                        deliverScamSms(dm); // тот же призрак-канал, что у любых входящих смс
                    }
                    if (currentScreen === 'igstory' || currentScreen === 'ig') render();
                } catch (e) {
                    console.warn('[GlassPhone] story reactions failed:', e);
                    if (waitDesc) { logStory(''); applyChatHiding(); }
                }
                try {
                    const n = await generateContactStories();
                    if (n > 0) toast('Появились сторис знакомых', 'fa-instagram');
                } catch (e) { /* ignore */ }
                _othersStoriesBusy = false;
                if (currentScreen === 'ig' || currentScreen === 'igstory') render();
            })();
        } else if (waitDesc) {
            // Цепочка занята соседней сторис — описания не дождёмся, но запись нужна
            logStory('');
            applyChatHiding();
        }
    });
}

function renderIgStory(screen) {
    currentScreen = 'igstory';
    // Листаем ВСЕ активные сторис подряд (свои первыми, затем чужие по свежести):
    // правая стрелка ведёт к сторис следующего автора, а не закрывает просмотр
    const stories = allStoriesOrdered();
    if (_storyAuthor) {
        // Вход с аватарки автора — встаём на его первую сторис
        const at = stories.findIndex(s => s.author === _storyAuthor);
        if (at !== -1) { _storyIdx = at; }
        _storyAuthor = null;
    }
    if (!stories.length) { goto('ig'); return; }
    if (_storyIdx >= stories.length) _storyIdx = stories.length - 1;
    const st = stories[_storyIdx];
    const isMine = st.ak === 'user';
    const authorName = isMine ? getUserName() : (st.author || '?');
    const authorAva = avatarHtml(authorName, avatarForAuthor(isMine ? 'user' : st.ak), 'gp-avatar gp-avatar-sm');
    const views = isMine ? bumpStoryViews(st) : 0;
    const ageMin = Math.max(1, Math.round((Date.now() - st.time) / 60000));
    const ageLabel = ageMin < 60 ? `${ageMin} м` : `${Math.round(ageMin / 60)} ч`;
    const media = st.image
        ? `<img class="gp-igst-media" src="${esc(st.image)}" alt="" data-zoom>`
        : `<div class="gp-igst-media gp-igst-media-gen" style="${avatarStyle('story' + st.imgDesc)}"><span>${ic('fa-image')}</span><i>${esc(st.imgDesc)}</i></div>`;
    screen.innerHTML = `
        <div class="gp-igst-viewer">
            <div class="gp-igst-segments">${stories.map((_, i2) => `<span class="${i2 < _storyIdx ? 'gp-done' : i2 === _storyIdx ? 'gp-cur' : ''}"></span>`).join('')}</div>
            <div class="gp-igst-top">
                ${authorAva}
                <b>${esc(authorName)}</b>
                <span>${esc(ageLabel)}</span>
                ${st.imgDesc ? `<button class="gp-iconbtn" id="gp-st-draw2" title="${st.image ? 'Перегенерировать фото' : 'Нарисовать'}" ${_storyGenBusy ? 'disabled' : ''}>${ic(_storyGenBusy ? 'fa-spinner fa-spin' : (st.image ? 'fa-rotate-right' : 'fa-wand-magic-sparkles'))}</button>` : ''}
                ${isMine ? `<button class="gp-iconbtn gp-danger" id="gp-st-del" title="Удалить сторис">${ic('fa-trash-can')}</button>` : ''}
                <button class="gp-iconbtn" id="gp-st-close">${ic('fa-xmark')}</button>
            </div>
            ${media}
            ${st.caption ? `<div class="gp-igst-caption">${esc(st.caption)}</div>` : ''}
            ${isMine
                ? `<div class="gp-igst-bottom">${ic('fa-eye')} ${views}${(st.reacts || []).length ? `<span class="gp-igst-reacts">${st.reacts.map(r => `<span class="gp-igst-react">${ic(STORY_REACT_ICONS[r.icon] || 'fa-heart')} ${esc(r.author)}</span>`).join('')}</span>` : ''}</div>`
                : `<div class="gp-igst-bottom gp-igst-bottom-other"><button class="gp-igst-like${st.liked ? ' gp-on' : ''}" id="gp-st-like" title="Нравится" aria-label="Нравится"><i class="${st.liked ? 'fa-solid' : 'fa-regular'} fa-heart"></i></button></div>`}
            <div class="gp-igst-nav gp-igst-nav-left" id="gp-st-prev"></div>
            <div class="gp-igst-nav gp-igst-nav-right" id="gp-st-next"></div>
            <button class="gp-igst-arrow gp-igst-arrow-left${_storyIdx <= 0 ? ' gp-off' : ''}" id="gp-st-arrow-prev" title="Назад">${ic('fa-chevron-left')}</button>
            <button class="gp-igst-arrow gp-igst-arrow-right${_storyIdx >= stories.length - 1 ? ' gp-off' : ''}" id="gp-st-arrow-next" title="Вперёд">${ic('fa-chevron-right')}</button>
        </div>`;
    screen.querySelector('#gp-st-close')?.addEventListener('click', () => goto('ig'));
    screen.querySelector('#gp-st-draw2')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (_storyGenBusy) return;
        if (!_imgGenReady) {
            const ready = await isImageGenAvailable();
            if (!ready) { toast('Картинко-расширение не установлено — генерация недоступна', 'fa-circle-exclamation'); return; }
            _imgGenReady = true;
        }
        _storyGenBusy = true;
        render();
        try {
            const src2 = await generatePostImage({
                ak: isMine ? 'user' : st.ak,
                author: authorName,
                imgDesc: st.imgDesc,
                caption: st.caption,
                kind: 'ig',
                aspect: '9:16',
                stream: !isMine, // частичный неймматч с карточкой для НПС
            }, null, `story-${st.id || _storyIdx}`);
            st.image = src2;
            saveMeta();
            toast('Фото готово', 'fa-image');
        } catch (err) {
            if (err?.name === 'ImageGenCancelled' || err?.name === 'AbortError') toast('Генерация остановлена', 'fa-circle-stop');
            else toast(`Не получилось: ${String(err?.message || err).slice(0, 60)}`, 'fa-circle-exclamation');
        } finally {
            _storyGenBusy = false;
            if (currentScreen === 'igstory') render();
        }
    });
    screen.querySelector('#gp-st-del')?.addEventListener('click', () => {
        if (!confirm('Удалить эту сторис?')) return;
        deleteStory(st.id);
        if (_storyIdx > 0) _storyIdx--;
        if (!allStoriesOrdered().length) goto('ig');
        else render();
    });
    const goPrev = (e) => { e?.stopPropagation(); if (_storyIdx > 0) { _storyIdx--; render(); } };
    const goNext = (e) => {
        e?.stopPropagation();
        if (_storyIdx < stories.length - 1) { _storyIdx++; render(); }
        else goto('ig');
    };
    screen.querySelector('#gp-st-prev')?.addEventListener('click', goPrev);
    screen.querySelector('#gp-st-next')?.addEventListener('click', goNext);
    screen.querySelector('#gp-st-arrow-prev')?.addEventListener('click', goPrev);
    screen.querySelector('#gp-st-arrow-next')?.addEventListener('click', goNext);
    // Лайк чужой сторис (первый лайк уходит строкой в журнал для ролевой)
    screen.querySelector('#gp-st-like')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const on = toggleStoryLike(st);
        render();
        if (on) toast(`Нравится: сторис ${authorName}`, 'fa-heart');
    });
}

function renderIgNew(screen) {
    screen.innerHTML = `
        <div class="gp-header gp-thread-header">
            <button class="gp-iconbtn" id="gp-back">${ic('fa-chevron-left')}</button>
            <div class="gp-title gp-title-app">Новый пост</div>
        </div>
        <div class="gp-add-form">
            <div class="gp-ig-pick${_igDraftImage ? ' gp-ig-pick-has' : ''}" id="gp-ig-pick">
                ${_igDraftImage ? `<img src="${esc(_igDraftImage)}" alt="">` : `${ic('fa-camera')}<span>Выбрать фото</span>`}
            </div>
            <input type="file" id="gp-ig-file" accept="image/*" style="display:none">
            <label class="gp-field">
                <span>Что на фото <i style="opacity:0.5;text-transform:none;letter-spacing:0">(необязательно)</i></span>
                <input type="text" id="gp-ig-desc" maxlength="200" placeholder="Модели с виженом увидят фото сами">
            </label>
            <label class="gp-field">
                <span>Подпись</span>
                <input type="text" id="gp-ig-caption" maxlength="400" placeholder="Подпись к посту">
            </label>
            <button class="gp-primary" id="gp-ig-publish">${ic('fa-check')} Опубликовать</button>
            <div class="gp-add-hint">Фото прикладывается к запросу — vision-модели смотрят на него сами. Описание нужно только для моделей без вижена (и для реакций в самой ролевой).</div>
        </div>`;

    screen.querySelector('#gp-back')?.addEventListener('click', () => { _igDraftImage = null; goto('ig'); });

    const pick = screen.querySelector('#gp-ig-pick');
    const file = screen.querySelector('#gp-ig-file');
    pick?.addEventListener('click', () => file?.click());
    file?.addEventListener('change', async () => {
        const f = file.files?.[0];
        if (!f) return;
        try {
            _igDraftImage = await compressImage(f, 720, 0.82);
            render();
        } catch (e) {
            toast('Не удалось загрузить фото', 'fa-circle-exclamation');
        }
    });

    screen.querySelector('#gp-ig-publish')?.addEventListener('click', async () => {
        const desc = screen.querySelector('#gp-ig-desc')?.value.trim() || '';
        const caption = screen.querySelector('#gp-ig-caption')?.value.trim() || '';
        if (!_igDraftImage && !desc) {
            toast('Выбери фото или опиши, что на нём', 'fa-circle-exclamation');
            return;
        }
        clearDraft('gp-ig-desc'); clearDraft('gp-ig-caption');
        const post = postIg({ image: _igDraftImage, imgDesc: desc, caption });
        const ad = attachActiveAd('instagram', post);
        if (ad) toast(`Реклама ${ad.brand} опубликована`, 'fa-star');
        _igDraftImage = null;
        updatePhoneInjection(); // персонажи «видят» пост юзера
        currentPostId = post.id;
        goto('igview');
        toast('Опубликовано', 'fa-instagram');

        // Журнал ждёт авто-комментов: тот же vision-запрос заполняет imgDesc,
        // а в историю чата уходит описание снимка, а не сам снимок.
        if (!genBusy) {
            genBusy = true;
            render();
            try {
                // Комбо: комменты + описание фото ОДНИМ vision-запросом
                // (generateIgComments заполнит post.imgDesc, если его нет)
                const before = (post.comments || []).length;
                await generateIgComments(post);
                updatePhoneInjection();
                render();
                // Строку писал сам postIg; теперь, когда vision дорисовал
                // описание кадра, переписываем её с ним
                logIgPost(post);
                applyChatHiding();
                logNewReplies('фото в Instagram', post.caption || post.imgDesc, post.comments, before);
                await finalizeSocialPost('instagram', post);
            } catch (e) {
                console.error('[GlassPhone] auto-comments failed:', e);
                toast(`Реакции не сгенерились: ${String(e?.message || e).slice(0, 80)}`, 'fa-circle-exclamation');
            } finally {
                genBusy = false;
                if (currentScreen === 'igview') render();
            }
        }
    });
}

// ═══ ONLYFANS ═══

function ofCard(p, { clickable = true } = {}) {
    return `
    <div class="gp-ig-card gp-of-card" data-post="${esc(p.id)}">
        <div class="gp-ig-head">
            ${avatarHtml(p.author, avatarForAuthor(p.ak), 'gp-avatar gp-avatar-xs')}
            <span class="gp-ig-name">${esc(p.author)}</span>
            <span class="gp-of-badge">${ic('fa-lock')}${p.price > 0 ? ` $${p.price}` : ' подписка'}</span>
            <span class="gp-tw-time">· ${esc(timeAgo(p.time))}</span>
            <button class="gp-tw-del" data-del-of="${esc(p.id)}" title="Удалить">${ic('fa-xmark')}</button>
        </div>
        <div class="${clickable ? 'gp-clickable' : ''}" data-open-of="${esc(p.id)}">${ofIsText(p)
            ? `<div class="gp-of-text">${esc(p.caption || '')}</div>`
            : igImageHtml(p)}</div>
        <div class="gp-ig-actions">
            <button class="gp-tw-act${p.liked ? ' gp-tw-on' : ''}" data-like-of="${esc(p.id)}">${ic('fa-heart')}<span>${p.likes || ''}</span></button>
            <button class="gp-tw-act" data-open-of2="${esc(p.id)}">${ic('fa-comment')}<span>${p.comments?.length || ''}</span></button>
            ${p.tips > 0 ? `<span class="gp-of-tips">${ic('fa-sack-dollar')} $${p.tips}</span>` : ''}
        </div>
        ${p.caption && !ofIsText(p) ? `<div class="gp-ig-caption"><b>${esc(p.author)}</b> ${esc(p.caption)}</div>` : ''}
    </div>`;
}

function bindOfCardActions(root) {
    root.querySelectorAll('[data-like-of]').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation(); likeOf(b.getAttribute('data-like-of')); render();
    }));
    root.querySelectorAll('[data-del-of]').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Удалить пост?')) { delOf(b.getAttribute('data-del-of')); render(); }
    }));
    const open = (id) => { currentPostId = id; goto('ofview'); };
    root.querySelectorAll('[data-open-of]').forEach(b => b.addEventListener('click', () => open(b.getAttribute('data-open-of'))));
    root.querySelectorAll('[data-open-of2]').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation(); open(b.getAttribute('data-open-of2'));
    }));
    // Кнопки генерации картинок (те же data-genimg/data-regenimg — doGenImage ищет и в OF)
    bindIgCardActions(root);
}

function renderOf(screen) {
    currentScreen = 'of';
    // Накопленное на прежней «карте» не должно пропасть при обновлении
    try { migrateOfWallet(); } catch (e) { /* ignore */ }
    const posts = getOfPosts();
    markFeedSeen('of', posts.length);
    const s = getSocial();

    setHtmlKeepScroll(screen, '.gp-feed', `
        <div class="gp-header gp-thread-header">
            <button class="gp-iconbtn" id="gp-back">${ic('fa-chevron-left')}</button>
            <div class="gp-title gp-title-app gp-of-title">${ic('fa-heart')} OnlyFans</div>
            <button class="gp-iconbtn" id="gp-of-new" title="Новый пост">${ic('fa-plus')}</button>
        </div>
        <div class="gp-of-stats">
            <div class="gp-of-stat"><b>${s.ofSubs}</b><span>подписчиков</span></div>
            <div class="gp-of-stat"><b>$${s.ofEarned}</b><span>заработано</span></div>
            <div class="gp-of-stat gp-of-stat-btn" id="gp-of-bank" title="Открыть банк"><b>${esc(fmtMoney(getBank().balance))}</b><span>на счету →</span></div>
        </div>
        <div class="gp-feed" id="gp-of-feed">
            ${posts.length === 0
                ? `<div class="gp-empty"><div class="gp-empty-icon gp-of-title">${ic('fa-heart')}</div><div class="gp-empty-title">Твоя страничка пуста</div><div class="gp-empty-text">${ic('fa-plus')} — выложить контент для подписчиков.<br>Фанаты отреагируют и накидают чаевых.</div></div>`
                : posts.map(p => ofCard(p)).join('')}
        </div>`);

    screen.querySelector('#gp-back')?.addEventListener('click', () => goto('home'));
    screen.querySelector('#gp-of-new')?.addEventListener('click', () => goto('ofnew'));
    // Деньги со страницы падают прямо на счёт, отдельного кошелька нет —
    // плитка ведёт в банк, где их и видно вместе с остальными
    screen.querySelector('#gp-of-bank')?.addEventListener('click', () => goto('bank'));
    bindOfCardActions(screen);
}

function renderOfView(screen) {
    const p = getOfPosts().find(x => x.id === currentPostId);
    if (!p) { goto('of'); return; }
    const comments = p.comments || [];

    setHtmlKeepScroll(screen, '.gp-feed', `
        <div class="gp-header gp-thread-header">
            <button class="gp-iconbtn" id="gp-back">${ic('fa-chevron-left')}</button>
            <div class="gp-title gp-title-app">Пост</div>
            <button class="gp-iconbtn" id="gp-of-comments" title="Реакции фанатов" ${genBusy ? 'disabled' : ''}>${genBusy ? ic('fa-spinner fa-spin') : ic('fa-comments')}</button>
        </div>
        <div class="gp-feed">
            ${ofCard(p, { clickable: false })}
            ${imgDescNoteHtml(p)}
            <div class="gp-replies">
                ${comments.length === 0
                    ? `<div class="gp-empty-text gp-replies-empty">Реакций нет — нажми ${ic('fa-comments')}, фанаты налетят</div>`
                    : comments.map(c => `
                    <div class="gp-reply">
                        ${avatarHtml(c.author, avatarForAuthor(c.ak), 'gp-avatar gp-avatar-xs')}
                        <div class="gp-reply-body">
                            <div class="gp-tw-meta">
                                <span class="gp-tw-name">${esc(c.author)}</span>
                                ${c.tip ? `<span class="gp-of-tip-badge">${ic('fa-sack-dollar')} $${c.tip}</span>` : ''}
                                <span class="gp-tw-time">· ${esc(timeAgo(c.time))}</span>
                                <button class="gp-reply-del" data-del-ofcomment="${esc(c.id)}" title="Удалить">${ic('fa-xmark')}</button>
                            </div>
                            <div class="gp-tw-text">${esc(c.text)}</div>
                        </div>
                    </div>`).join('')}
            </div>
        </div>
        <div class="gp-inputbar">
            <textarea id="gp-input" rows="1" placeholder="Ответить фанатам..."></textarea>
            <button class="gp-send" id="gp-of-reply" ${sending ? 'disabled' : ''}>${ic('fa-paper-plane')}</button>
        </div>`);

    screen.querySelector('#gp-back')?.addEventListener('click', () => goto('of'));
    bindOfCardActions(screen);
    bindDescEdit(screen, p);

    screen.querySelectorAll('[data-del-ofcomment]').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation();
        delOfComment(p.id, b.getAttribute('data-del-ofcomment'));
        render();
    }));

    screen.querySelector('#gp-of-comments')?.addEventListener('click', async () => {
        if (genBusy) return;
        genBusy = true; render();
        try {
            const before = (p.comments || []).length;
            const n = await generateOfComments(p);
            if (!n) toast('Не получилось — попробуй ещё раз', 'fa-circle-exclamation');
            logNewReplies('приватным OnlyFans-постом', p.caption || p.imgDesc, p.comments, before);
        } catch (e) {
            console.error('[GlassPhone] of comments failed:', e);
            toast('Ошибка генерации', 'fa-circle-exclamation');
        } finally {
            genBusy = false;
            if (currentScreen === 'ofview') render();
        }
    });

    const input = screen.querySelector('#gp-input');
    const doComment = async () => {
        const v = input?.value.trim();
        if (!v || sending) return;
        addOfComment(p.id, v);
        input.value = '';
        render();
        // Фанаты реагируют на её ответ
        if (!genBusy) {
            genBusy = true; render();
            try { await generateOfComments(p); }
            catch (e) { console.error('[GlassPhone] of fan reply failed:', e); }
            finally { genBusy = false; if (currentScreen === 'ofview') render(); }
        }
    };
    screen.querySelector('#gp-of-reply')?.addEventListener('click', doComment);
    input?.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doComment(); } });
}

let _ofDraftImage = null;
function renderOfNew(screen) {
    screen.innerHTML = `
        <div class="gp-header gp-thread-header">
            <button class="gp-iconbtn" id="gp-back">${ic('fa-chevron-left')}</button>
            <div class="gp-title gp-title-app gp-of-title">Новый пост</div>
        </div>
        <div class="gp-add-form">
            <div class="gp-ig-pick${_ofDraftImage ? ' gp-ig-pick-has' : ''}" id="gp-of-pick">
                ${_ofDraftImage ? `<img src="${esc(_ofDraftImage)}" alt="">` : `${ic('fa-camera')}<span>Выбрать фото</span>`}
            </div>
            <input type="file" id="gp-of-file" accept="image/*" style="display:none">
            <label class="gp-field">
                <span>Что на фото <i style="opacity:0.5;text-transform:none;letter-spacing:0">(необязательно)</i></span>
                <input type="text" id="gp-of-desc" maxlength="200" placeholder="Или нажми «Нарисовать» после публикации">
            </label>
            <label class="gp-field">
                <span>Текст поста</span>
                <textarea id="gp-of-caption" rows="3" maxlength="400" placeholder="Подпись к фото — или просто запись без фото"></textarea>
            </label>
            <label class="gp-field">
                <span>Цена PPV, $ <i style="opacity:0.5;text-transform:none;letter-spacing:0">(0 = по подписке)</i></span>
                <input type="number" id="gp-of-price" min="0" max="500" value="0">
            </label>
            <button class="gp-primary gp-of-primary" id="gp-of-publish">${ic('fa-check')} Опубликовать</button>
            <div class="gp-add-hint">Без фото выйдет текстовая запись. Пост приватный: персонажи в ролевой узнают о нём, только если по сюжету тайно подписаны.</div>
        </div>`;

    screen.querySelector('#gp-back')?.addEventListener('click', () => { _ofDraftImage = null; goto('of'); });

    const pick = screen.querySelector('#gp-of-pick');
    const file = screen.querySelector('#gp-of-file');
    pick?.addEventListener('click', () => file?.click());
    file?.addEventListener('change', async () => {
        const f = file.files?.[0];
        if (!f) return;
        try {
            _ofDraftImage = await compressImage(f, 720, 0.82);
            render();
        } catch (e) {
            toast('Не удалось загрузить фото', 'fa-circle-exclamation');
        }
    });

    screen.querySelector('#gp-of-publish')?.addEventListener('click', async () => {
        const desc = screen.querySelector('#gp-of-desc')?.value.trim() || '';
        const caption = screen.querySelector('#gp-of-caption')?.value.trim() || '';
        const price = parseInt(screen.querySelector('#gp-of-price')?.value) || 0;
        // Пост без фото — обычная текстовая запись, так что хватает и текста
        if (!_ofDraftImage && !desc && !caption) {
            toast('Нужно фото или текст', 'fa-circle-exclamation');
            return;
        }
        clearDraft('gp-of-desc'); clearDraft('gp-of-caption'); clearDraft('gp-of-price');
        const post = postOf({ image: _ofDraftImage, imgDesc: desc, caption, price });
        _ofDraftImage = null;
        updatePhoneInjection();
        currentPostId = post.id;
        goto('ofview');
        applyChatHiding();
        toast('Опубликовано для подписчиков', 'fa-heart');

        if (!genBusy) {
            genBusy = true;
            render();
            try {
                // Комбо: реакции фанатов + описание фото одним vision-запросом
                const before = (post.comments || []).length;
                await generateOfComments(post);
                updatePhoneInjection();
                render();
                // Сам пост в журнал пишет postOf — с меткой, чтобы строка
                // ушла вместе с постом. Здесь остаются только отклики фанатов.
                applyChatHiding();
                logNewReplies('приватным OnlyFans-постом', post.caption || post.imgDesc, post.comments, before);
            } catch (e) {
                console.error('[GlassPhone] of auto-comments failed:', e);
                toast(`Реакции не сгенерились: ${String(e?.message || e).slice(0, 80)}`, 'fa-circle-exclamation');
            } finally {
                genBusy = false;
                if (currentScreen === 'ofview') render();
            }
        }
    });
}

let _bankTxSign = -1; // -1 трата, +1 доход (для формы)

const BANK_CATS = ['еда', 'транспорт', 'жильё', 'подписка', 'одежда', 'развлечения', 'красота', 'здоровье', 'подарок', 'зарплата', 'перевод', 'другое'];

function txIcon(cat) {
    const map = {
        'еда': 'fa-utensils', 'транспорт': 'fa-car', 'жильё': 'fa-house', 'подписка': 'fa-repeat',
        'одежда': 'fa-shirt', 'развлечения': 'fa-champagne-glasses', 'красота': 'fa-wand-magic-sparkles',
        'здоровье': 'fa-heart-pulse', 'подарок': 'fa-gift', 'зарплата': 'fa-briefcase',
        'перевод': 'fa-arrow-right-arrow-left', 'кредит': 'fa-landmark', 'ролевая': 'fa-masks-theater',
    };
    return map[cat] || 'fa-receipt';
}

function renderBank(screen) {
    currentScreen = 'bank';
    const b = getBank();
    const { income, expense } = incomeExpenseTotals();
    const debt = totalDebt();
    const reminders = getBankReminders();
    const cats = spendingByCategory(5);
    const maxCat = cats.length ? cats[0].sum : 1;

    const remBanner = reminders.length ? `
        <div class="gp-bank-remind">
            ${ic('fa-bell')} <b>Пора платить:</b>
            ${reminders.map(r => `<span class="gp-bank-remind-item${r.overdue ? ' gp-overdue' : ''}">${esc(r.name)} — ${esc(fmtMoney(r.amount))}</span>`).join('')}
        </div>` : '';

    setHtmlKeepScroll(screen, '.gp-bank-scroll', `
        <div class="gp-header gp-thread-header">
            <button class="gp-iconbtn" id="gp-back">${ic('fa-chevron-left')}</button>
            <div class="gp-title gp-title-app gp-bank-title">Банк</div>
            <button class="gp-iconbtn" id="gp-bank-cur" title="Валюта">${esc(b.currency)}</button>
        </div>
        <div class="gp-bank-scroll">
            <div class="gp-bank-card ${b.balance < 0 ? 'gp-bank-neg' : ''}">
                <div class="gp-bank-card-label">Баланс</div>
                <div class="gp-bank-balance" id="gp-bank-balance">${esc(fmtMoney(b.balance))}</div>
                <div class="gp-bank-io">
                    <span class="gp-bank-in">+${esc(fmtMoney(income))}</span>
                    <span class="gp-bank-out">−${esc(fmtMoney(expense))}</span>
                </div>
            </div>
            ${remBanner}
            <div class="gp-bank-actions">
                <button class="gp-bank-act gp-bank-act-out" id="gp-bank-spend">${ic('fa-minus')} Трата</button>
                <button class="gp-bank-act gp-bank-act-in" id="gp-bank-income">${ic('fa-plus')} Доход</button>
                <button class="gp-bank-act" id="gp-bank-loans">${ic('fa-landmark')} Кредиты${debt > 0 ? ` <span class="gp-bank-chip">${esc(fmtMoney(debt))}</span>` : ''}</button>
                <button class="gp-bank-act" id="gp-bank-recs">${ic('fa-file-invoice-dollar')} Платежи${monthlyObligations() > 0 ? ` <span class="gp-bank-chip">${esc(fmtMoney(monthlyObligations()))}/мес</span>` : ''}</button>
            </div>
            ${cats.length ? `
            <div class="gp-bank-section">
                <div class="gp-bank-section-h">Траты по категориям</div>
                ${cats.map(c => `
                    <div class="gp-bank-cat">
                        <span class="gp-bank-cat-i">${ic(txIcon(c.category))}</span>
                        <span class="gp-bank-cat-n">${esc(c.category)}</span>
                        <span class="gp-bank-cat-bar"><span style="width:${Math.round(c.sum / maxCat * 100)}%"></span></span>
                        <span class="gp-bank-cat-s">${esc(fmtMoney(c.sum))}</span>
                    </div>`).join('')}
            </div>` : ''}
            <div class="gp-bank-section">
                <div class="gp-bank-section-h">Операции</div>
                ${b.transactions.length === 0
                    ? `<div class="gp-empty-text" style="padding:14px 8px">Пока нет операций. Добавь трату или доход, или пусть их создаёт ролевая.</div>`
                    : b.transactions.slice(0, 40).map(t => `
                        <div class="gp-bank-tx">
                            <span class="gp-bank-tx-i">${ic(txIcon(t.category))}</span>
                            <span class="gp-bank-tx-body">
                                <span class="gp-bank-tx-label">${esc(t.label)}</span>
                                <span class="gp-bank-tx-cat">${esc(t.category)}</span>
                            </span>
                            <span class="gp-bank-tx-amt ${t.amount < 0 ? 'gp-neg' : 'gp-pos'}">${t.amount > 0 ? '+' : ''}${esc(fmtMoney(t.amount))}</span>
                            <button class="gp-bank-tx-del" data-del-tx="${esc(t.id)}" title="Удалить">${ic('fa-xmark')}</button>
                        </div>`).join('')}
            </div>
        </div>`);

    screen.querySelector('#gp-back')?.addEventListener('click', () => goto('home'));
    screen.querySelector('#gp-bank-spend')?.addEventListener('click', () => { _bankTxSign = -1; goto('banktx'); });
    screen.querySelector('#gp-bank-income')?.addEventListener('click', () => { _bankTxSign = 1; goto('banktx'); });
    screen.querySelector('#gp-bank-loans')?.addEventListener('click', () => goto('bankloan'));
    screen.querySelector('#gp-bank-recs')?.addEventListener('click', () => goto('bankrec'));
    screen.querySelector('#gp-bank-cur')?.addEventListener('click', () => {
        const cur = prompt('Символ валюты (₽ $ € £ ...):', b.currency);
        if (!cur || !cur.trim()) return;
        // Смена валюты конвертирует ВСЕ суммы по примерному курсу
        const res = convertCurrency(cur.trim());
        render();
        if (res.converted) toast(`Суммы конвертированы: ${res.from} → ${res.to}`, 'fa-arrow-right-arrow-left');
        else if (res.from !== res.to) toast('Курс неизвестен — суммы не тронуты, сменён только символ', 'fa-circle-exclamation');
    });
    screen.querySelectorAll('[data-del-tx]').forEach(btn => btn.addEventListener('click', () => {
        deleteTransaction(btn.getAttribute('data-del-tx'));
        updatePhoneInjection(); render();
    }));
    updateFabBadge();
}

function renderBankTx(screen) {
    currentScreen = 'banktx';
    const income = _bankTxSign > 0;
    screen.innerHTML = `
        <div class="gp-header gp-thread-header">
            <button class="gp-iconbtn" id="gp-back">${ic('fa-chevron-left')}</button>
            <div class="gp-title" style="flex:1">${income ? 'Новый доход' : 'Новая трата'}</div>
        </div>
        <div class="gp-add-form">
            <label class="gp-field"><span>Сумма</span>
                <input type="number" id="gp-tx-amount" inputmode="numeric" min="0" step="1" placeholder="0"></label>
            <label class="gp-field"><span>Описание</span>
                <input type="text" id="gp-tx-label" maxlength="60" placeholder="${income ? 'напр. зарплата' : 'напр. кофе'}"></label>
            <label class="gp-field"><span>Категория</span>
                <select id="gp-tx-cat" class="text_pole">${BANK_CATS.map(c => `<option value="${c}">${c}</option>`).join('')}</select></label>
            <button class="gp-primary ${income ? '' : 'gp-primary-out'}" id="gp-tx-save">${ic('fa-check')} ${income ? 'Добавить доход' : 'Добавить трату'}</button>
        </div>`;
    screen.querySelector('#gp-back')?.addEventListener('click', () => goto('bank'));
    if (!income) screen.querySelector('#gp-tx-cat').value = 'еда';
    else screen.querySelector('#gp-tx-cat').value = 'зарплата';
    screen.querySelector('#gp-tx-save')?.addEventListener('click', () => {
        const amt = Math.abs(parseInt(screen.querySelector('#gp-tx-amount').value) || 0);
        if (!amt) { toast('Укажи сумму', 'fa-circle-exclamation'); return; }
        addTransaction({
            amount: income ? amt : -amt,
            label: screen.querySelector('#gp-tx-label').value.trim(),
            category: screen.querySelector('#gp-tx-cat').value,
        });
        updatePhoneInjection();
        goto('bank');
        toast(income ? 'Доход добавлен' : 'Трата добавлена', 'fa-check');
    });
    screen.querySelector('#gp-tx-amount')?.focus();
}

function renderBankLoan(screen) {
    currentScreen = 'bankloan';
    const b = getBank();
    setHtmlKeepScroll(screen, '.gp-bank-scroll', `
        <div class="gp-header gp-thread-header">
            <button class="gp-iconbtn" id="gp-back">${ic('fa-chevron-left')}</button>
            <div class="gp-title gp-title-app gp-bank-title">Кредиты</div>
        </div>
        <div class="gp-bank-scroll">
            <div class="gp-bank-section">
                <div class="gp-bank-section-h">Взять кредит</div>
                <div class="gp-add-form" style="padding:6px 2px">
                    <label class="gp-field"><span>Название</span><input type="text" id="gp-loan-name" maxlength="40" placeholder="напр. Айфон / Ремонт"></label>
                    <label class="gp-field"><span>Сумма</span><input type="number" id="gp-loan-amount" inputmode="numeric" min="0" placeholder="0"></label>
                    <div style="display:flex;gap:8px">
                        <label class="gp-field" style="flex:1"><span>Срок (мес.)</span><input type="number" id="gp-loan-months" inputmode="numeric" min="1" max="360" value="12"></label>
                        <label class="gp-field" style="flex:1"><span>Ставка, % год.</span><input type="number" id="gp-loan-rate" inputmode="numeric" min="0" max="200" value="18"></label>
                        <label class="gp-field" style="flex:1"><span>Число платежа</span><input type="number" id="gp-loan-day" inputmode="numeric" min="1" max="31" value="10"></label>
                    </div>
                    <div class="gp-add-hint" id="gp-loan-preview"></div>
                    <button class="gp-primary" id="gp-loan-take">Оформить</button>
                </div>
            </div>
            <div class="gp-bank-section">
                <div class="gp-bank-section-h">Мои кредиты</div>
                ${b.loans.length === 0
                    ? `<div class="gp-empty-text" style="padding:12px 8px">Кредитов нет</div>`
                    : b.loans.map(l => `
                        <div class="gp-bank-loan ${l.paidOff ? 'gp-paid' : ''}">
                            <div class="gp-bank-loan-top">
                                <span class="gp-bank-loan-name">${esc(l.name)}</span>
                                <button class="gp-bank-tx-del" data-del-loan="${esc(l.id)}" title="Удалить">${ic('fa-xmark')}</button>
                            </div>
                            <div class="gp-bank-loan-info">
                                ${l.paidOff ? `<span class="gp-pos">Погашен</span>` : `Осталось <b>${esc(fmtMoney(l.remaining))}</b> · ${esc(fmtMoney(l.monthly))}/мес${l.day ? `, ${l.day}-го числа` : ''}`}
                            </div>
                            ${l.paidOff ? '' : `<div class="gp-bank-loan-btns">
                                <button class="gp-bank-pay" data-pay-loan="${esc(l.id)}">Внести ${esc(fmtMoney(Math.min(l.remaining, l.monthly)))}</button>
                                <button class="gp-bank-pay gp-bank-early" data-early-loan="${esc(l.id)}" title="Досрочное погашение">Досрочно</button>
                            </div>`}
                        </div>`).join('')}
            </div>
        </div>`);

    screen.querySelector('#gp-back')?.addEventListener('click', () => goto('bank'));
    const preview = () => {
        const amount = parseInt(screen.querySelector('#gp-loan-amount').value) || 0;
        const months = Math.max(1, parseInt(screen.querySelector('#gp-loan-months').value) || 12);
        const rate = (parseFloat(screen.querySelector('#gp-loan-rate').value) || 0) / 100;
        const mr = rate / 12;
        const monthly = amount <= 0 ? 0 : (mr > 0
            ? Math.round(amount * mr * Math.pow(1 + mr, months) / (Math.pow(1 + mr, months) - 1))
            : Math.round(amount / months));
        const el = screen.querySelector('#gp-loan-preview');
        if (el) el.textContent = amount > 0 ? `Платёж ~${fmtMoney(monthly)}/мес · всего вернёшь ~${fmtMoney(monthly * months)}` : '';
    };
    ['gp-loan-amount', 'gp-loan-months', 'gp-loan-rate'].forEach(id => screen.querySelector('#' + id)?.addEventListener('input', preview));
    screen.querySelector('#gp-loan-take')?.addEventListener('click', () => {
        const amount = parseInt(screen.querySelector('#gp-loan-amount').value) || 0;
        if (amount <= 0) { toast('Укажи сумму кредита', 'fa-circle-exclamation'); return; }
        takeLoan({
            name: screen.querySelector('#gp-loan-name').value.trim(),
            amount,
            months: parseInt(screen.querySelector('#gp-loan-months').value) || 12,
            rate: (parseFloat(screen.querySelector('#gp-loan-rate').value) || 0) / 100,
            day: parseInt(screen.querySelector('#gp-loan-day').value) || 10,
        });
        updatePhoneInjection();
        goto('bank');
        toast('Кредит оформлен — деньги на счету', 'fa-money-bill-wave');
    });
    screen.querySelectorAll('[data-pay-loan]').forEach(btn => btn.addEventListener('click', () => {
        payLoanInstallment(btn.getAttribute('data-pay-loan'));
        updatePhoneInjection(); render();
    }));
    // Досрочное погашение: любая сумма вплоть до полного остатка
    screen.querySelectorAll('[data-early-loan]').forEach(btn => btn.addEventListener('click', () => {
        const loan = getBank().loans.find(l => l.id === btn.getAttribute('data-early-loan'));
        if (!loan || loan.paidOff) return;
        const raw = window.prompt(`${tr('Сумма досрочного платежа')} (${tr('Осталось')} ${fmtMoney(loan.remaining)}):`, String(loan.remaining));
        if (raw === null) return;
        const amt = Math.abs(parseInt(String(raw).replace(/\s/g, '')) || 0);
        if (!amt) { toast('Укажи сумму', 'fa-circle-exclamation'); return; }
        payLoanInstallment(loan.id, amt);
        updatePhoneInjection(); render();
        toast(loan.paidOff ? 'Кредит погашен полностью' : 'Досрочный платёж внесён', loan.paidOff ? 'fa-handshake' : 'fa-bolt');
    }));
    screen.querySelectorAll('[data-del-loan]').forEach(btn => btn.addEventListener('click', () => {
        if (confirm('Удалить кредит из списка? (баланс не изменится)')) { deleteLoan(btn.getAttribute('data-del-loan')); render(); }
    }));
}

function renderBankRec(screen) {
    currentScreen = 'bankrec';
    const b = getBank();
    const rem = getBankReminders().filter(r => r.kind === 'bill').map(r => r.id);
    setHtmlKeepScroll(screen, '.gp-bank-scroll', `
        <div class="gp-header gp-thread-header">
            <button class="gp-iconbtn" id="gp-back">${ic('fa-chevron-left')}</button>
            <div class="gp-title gp-title-app gp-bank-title">Обязательные платежи</div>
        </div>
        <div class="gp-bank-scroll">
            <div class="gp-bank-section">
                <div class="gp-bank-section-h">Добавить платёж</div>
                <div class="gp-add-form" style="padding:6px 2px">
                    <label class="gp-field"><span>Название</span><input type="text" id="gp-rec-name" maxlength="40" placeholder="напр. Аренда / Netflix"></label>
                    <div style="display:flex;gap:8px">
                        <label class="gp-field" style="flex:1"><span>Сумма/мес</span><input type="number" id="gp-rec-amount" inputmode="numeric" min="0" placeholder="0"></label>
                        <label class="gp-field" style="flex:1"><span>Число месяца</span><input type="number" id="gp-rec-day" inputmode="numeric" min="1" max="31" value="1"></label>
                    </div>
                    <label class="gp-field"><span>Категория</span><select id="gp-rec-cat" class="text_pole">${BANK_CATS.map(c => `<option value="${c}"${c === 'подписка' ? ' selected' : ''}>${c}</option>`).join('')}</select></label>
                    <button class="gp-primary" id="gp-rec-add">${ic('fa-plus')} Добавить</button>
                </div>
            </div>
            <div class="gp-bank-section">
                <div class="gp-bank-section-h">Мои платежи${monthlyObligations() > 0 ? ` — ${esc(fmtMoney(monthlyObligations()))}/мес` : ''}</div>
                ${b.recurring.length === 0
                    ? `<div class="gp-empty-text" style="padding:12px 8px">Обязательных платежей нет</div>`
                    : b.recurring.map(r => `
                        <div class="gp-bank-rec ${rem.includes(r.id) ? 'gp-bank-rec-due' : ''}">
                            <span class="gp-bank-tx-i">${ic(txIcon(r.category))}</span>
                            <span class="gp-bank-tx-body">
                                <span class="gp-bank-tx-label">${esc(r.name)}</span>
                                <span class="gp-bank-tx-cat">${esc(fmtMoney(r.amount))} · ${r.day}-го числа${rem.includes(r.id) ? ' · пора платить' : ''}</span>
                            </span>
                            <button class="gp-bank-pay gp-bank-pay-sm" data-pay-rec="${esc(r.id)}" title="Оплатить">Оплатить</button>
                            <button class="gp-bank-tx-del" data-del-rec="${esc(r.id)}" title="Удалить">${ic('fa-xmark')}</button>
                        </div>`).join('')}
            </div>
        </div>`);

    screen.querySelector('#gp-back')?.addEventListener('click', () => goto('bank'));
    screen.querySelector('#gp-rec-add')?.addEventListener('click', () => {
        const amount = parseInt(screen.querySelector('#gp-rec-amount').value) || 0;
        const name = screen.querySelector('#gp-rec-name').value.trim();
        if (!name) { toast('Назови платёж', 'fa-circle-exclamation'); return; }
        if (amount <= 0) { toast('Укажи сумму', 'fa-circle-exclamation'); return; }
        addRecurring({
            name, amount,
            day: parseInt(screen.querySelector('#gp-rec-day').value) || 1,
            category: screen.querySelector('#gp-rec-cat').value,
        });
        render();
        toast('Платёж добавлен', 'fa-check');
    });
    screen.querySelectorAll('[data-pay-rec]').forEach(btn => btn.addEventListener('click', () => {
        payRecurring(btn.getAttribute('data-pay-rec'));
        updatePhoneInjection(); render();
        toast('Оплачено', 'fa-check');
    }));
    screen.querySelectorAll('[data-del-rec]').forEach(btn => btn.addEventListener('click', () => {
        delRecurring(btn.getAttribute('data-del-rec')); render();
    }));
    updateFabBadge();
}

let currentShopCat = null;
const _shopBusy = new Set(); // категории в процессе генерации

function renderShop(screen) {
    currentScreen = 'shop';
    const b = getBank();
    const orders = getOrders();
    screen.innerHTML = `
        <div class="gp-header gp-thread-header">
            <button class="gp-iconbtn" id="gp-back">${ic('fa-chevron-left')}</button>
            <div class="gp-title gp-title-app gp-shop-title">${ic('fa-bag-shopping')} Магазин</div>
            <button class="gp-iconbtn" id="gp-shop-orders" title="Мои заказы">${ic('fa-receipt')}${orders.length ? `<span class="gp-app-badge">${orders.length > 9 ? '9+' : orders.length}</span>` : ''}</button>
        </div>
        <div class="gp-shop-balance">Баланс: <b>${esc(fmtMoney(b.balance))}</b></div>
        <div class="gp-shop-grid">
            ${[...SHOP_CATS, ...getCustomCats()].map(c => `
                <div class="gp-shop-cat" data-cat="${c.id}">
                    <div class="gp-shop-cat-icon">${ic(c.icon)}</div>
                    <div class="gp-shop-cat-name">${esc(c.name)}</div>
                    ${getCategory(c.id) ? `<div class="gp-shop-cat-dot" title="Каталог загружен"></div>` : ''}
                    ${c.custom ? `<button class="gp-shop-cat-del" data-delcat="${c.id}" title="Удалить">${ic('fa-xmark')}</button>` : ''}
                </div>`).join('')}
            <div class="gp-shop-cat gp-shop-cat-add" id="gp-shop-addcat">
                <div class="gp-shop-cat-icon">${ic('fa-plus')}</div>
                <div class="gp-shop-cat-name">Свой магазин</div>
            </div>
        </div>`;
    screen.querySelector('#gp-back')?.addEventListener('click', () => goto('home'));
    screen.querySelector('#gp-shop-orders')?.addEventListener('click', () => { notifyDeliveries(); goto('shoporders'); });
    screen.querySelectorAll('.gp-shop-cat[data-cat]').forEach(el => el.addEventListener('click', () => {
        currentShopCat = el.getAttribute('data-cat');
        goto('shopcat');
    }));
    // Своя категория: юзер описывает, какой магазин нужен
    screen.querySelector('#gp-shop-addcat')?.addEventListener('click', () => {
        const name = prompt('Какой магазин нужен? (например: зоомагазин, оружейный, цветы, книжный...)');
        if (!name || !name.trim()) return;
        const cat = addCustomCat(name);
        if (cat) { currentShopCat = cat.id; goto('shopcat'); }
    });
    screen.querySelectorAll('[data-delcat]').forEach(btn => btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Удалить эту категорию?')) { delCustomCat(btn.getAttribute('data-delcat')); render(); }
    }));
}

async function doShopGen(catId) {
    if (_shopBusy.has(catId)) return;
    _shopBusy.add(catId);
    render();
    try {
        await generateCategory(catId, (s) => {
            const el = document.querySelector('[data-shop-status]');
            if (el) el.textContent = s;
        });
    } catch (e) {
        toast(`Не получилось: ${String(e?.message || e).slice(0, 70)}`, 'fa-circle-exclamation');
    } finally {
        _shopBusy.delete(catId);
        render();
    }
}

function renderShopCat(screen) {
    currentScreen = 'shopcat';
    const cat = catById(currentShopCat);
    if (!cat) { goto('shop'); return; }
    const data = getCategory(cat.id);
    const busy = _shopBusy.has(cat.id);
    const b = getBank();

    let body;
    if (busy) {
        body = `<div class="gp-empty"><div class="gp-empty-icon">${ic('fa-spinner fa-spin')}</div><div class="gp-empty-title" data-shop-status>Загружаю каталог...</div><div class="gp-empty-text">Магазины и товары подбираются под твою ролевую</div></div>`;
    } else if (!data || !data.stores?.length) {
        body = `<div class="gp-empty"><div class="gp-empty-icon">${ic(cat.icon)}</div><div class="gp-empty-title">${esc(cat.name)}</div><div class="gp-empty-text">Каталог пуст.<br>Нажми ${ic('fa-wand-magic-sparkles')} — магазины и цены сгенерируются<br>под город/страну твоей ролевой.</div><button class="gp-primary" id="gp-shop-gen" style="margin-top:12px">${ic('fa-wand-magic-sparkles')} Загрузить каталог</button></div>`;
    } else {
        body = data.stores.map(st => `
            <div class="gp-shop-store">
                <div class="gp-shop-store-name">${ic('fa-store')} ${esc(st.name)}</div>
                ${st.items.map(it => `
                    <div class="gp-shop-item">
                        ${shopItemImage(it, st.id)}
                        <div class="gp-shop-item-body">
                            <div class="gp-shop-item-name">${esc(it.name)}</div>
                            ${it.desc ? `<div class="gp-shop-item-desc">${esc(it.desc)}</div>` : ''}
                        </div>
                        <div class="gp-shop-item-buy">
                            <span class="gp-shop-item-price">${esc(fmtMoney(it.price))}</span>
                            <button class="gp-shop-buy" data-buy="${esc(st.id)}|${esc(it.id)}">${ic('fa-cart-plus')}</button>
                        </div>
                    </div>`).join('')}
            </div>`).join('');
    }

    setHtmlKeepScroll(screen, '.gp-shop-scroll', `
        <div class="gp-header gp-thread-header">
            <button class="gp-iconbtn" id="gp-back">${ic('fa-chevron-left')}</button>
            <div class="gp-title gp-title-app gp-shop-title">${ic(cat.icon)} ${esc(cat.name)}</div>
            ${data && data.stores?.length ? `<button class="gp-iconbtn" id="gp-shop-refresh" title="Обновить каталог" ${busy ? 'disabled' : ''}>${busy ? ic('fa-spinner fa-spin') : ic('fa-rotate')}</button>` : '<span style="width:32px"></span>'}
        </div>
        <div class="gp-shop-balance">Баланс: <b>${esc(fmtMoney(b.balance))}</b></div>
        <div class="gp-shop-scroll">${body}</div>`);

    screen.querySelector('#gp-back')?.addEventListener('click', () => goto('shop'));
    // Картинка товара: витрина оживает, но рисуем только по просьбе —
    // каталог на десятки позиций разорил бы на генерациях
    screen.querySelectorAll('[data-shopimg]').forEach(b => b.addEventListener('click', async (e) => {
        e.stopPropagation();
        const [storeId, itemId] = b.getAttribute('data-shopimg').split('|');
        const item = findShopItem(cat.id, storeId, itemId);
        if (!item || _imgGenBusy.has(itemId)) return;
        if (!(await isImageGenAvailable())) {
            toast('Картинко-расширение не установлено — генерация недоступна', 'fa-circle-exclamation');
            return;
        }
        _imgGenBusy.add(itemId);
        render();
        try {
            const src = await generatePostImage({
                kind: 'shop', author: '', ak: 'random', aspect: '1:1',
                imgDesc: `${item.name}. ${item.desc || ''}`.trim(),
                framing: 'product photo for an online store listing, clean background, no text, no watermark',
            }, null, itemId);
            item.image = src;
            saveMeta();
            toast('Фото товара готово', 'fa-image');
        } catch (err) {
            if (err?.name === 'ImageGenCancelled' || err?.name === 'AbortError') toast('Генерация остановлена', 'fa-circle-stop');
            else toast(`Не получилось: ${String(err?.message || err).slice(0, 60)}`, 'fa-circle-exclamation');
        } finally {
            _imgGenBusy.delete(itemId);
            render();
        }
    }));
    screen.querySelector('#gp-shop-gen')?.addEventListener('click', () => doShopGen(cat.id));
    screen.querySelector('#gp-shop-refresh')?.addEventListener('click', () => doShopGen(cat.id));
    screen.querySelectorAll('[data-buy]').forEach(btn => btn.addEventListener('click', () => {
        const [storeId, itemId] = btn.getAttribute('data-buy').split('|');
        const order = buyItem(cat.id, storeId, itemId);
        if (order) {
            updatePhoneInjection();
            render();
            const bought = order.merged ? orderItems(order).slice(-1)[0] : order;
            toast(`Куплено: ${bought.name || bought.item} — ${fmtMoney(bought.price)}`, 'fa-bag-shopping');
            // Про срок скажем одним тостом, когда корзина собрана
            // (у брони отелей/туров доставки нет — и тоста тоже)
            if (order.eta) scheduleOrderToast(order.id);
        }
    }));
}

// ── Чат с курьером ──
// Переписка живёт в самом заказе: удалила заказ — ушла и она.

let _ordChatId = null;
let _courierBusy = false;
const _courierTried = new Set();   // по заказу — одна попытка доназначить курьера

function renderCourierChat(screen) {
    currentScreen = 'ordchat';
    const o = findOrder(_ordChatId);
    if (!o) { goto('shoporders'); return; }
    // Только когда есть что отмечать: saveMeta на каждую перерисовку сбрасывал бы
    // кэш скана чата и заставлял пересканировать всю ролевую
    if (courierUnread(o)) markCourierRead(o.id);
    // Курьера могло не назначиться (запрос не прошёл) — доназначаем при входе.
    // Ровно одна попытка на заказ: иначе неудача крутила бы генерацию по кругу,
    // ведь finally перерисовывает экран, а курьера так и нет.
    if (!o.courier && !_courierBusy && !_courierTried.has(o.id)) {
        _courierTried.add(o.id);
        _courierBusy = true;
        ensureCourier(o.id)
            .catch(e => toast(String(e?.message || e).slice(0, 60), 'fa-circle-exclamation'))
            .finally(() => { _courierBusy = false; if (isPhoneOpen()) render(); });
    }
    const assigning = !o.courier && _courierBusy;
    const name = o.courier?.name || (assigning ? 'Назначаем курьера...' : 'Курьер');
    const bubbles = orderChat(o).map(m => `
        <div class="gp-bubble-wrap ${m.user ? 'gp-out' : 'gp-in'}">
            <div class="gp-bubble">${esc(m.text)}</div>
        </div>`).join('');
    const empty = assigning
        ? `<div class="gp-empty gp-empty-thread"><div class="gp-empty-icon">${ic('fa-spinner fa-spin')}</div><div class="gp-empty-text">Магазин ищет курьера</div></div>`
        : `<div class="gp-empty gp-empty-thread"><div class="gp-empty-icon">${ic('fa-truck-fast')}</div><div class="gp-empty-text">Напиши курьеру — он ответит</div></div>`;
    const sub = o.stage === 'done'
        ? 'заказ доставлен'
        : `${orderItems(o).map(x => x.name).join(', ')} · ${fmtEta(orderLeft(o))}`;
    setHtmlKeepScroll(screen, '.gp-msgs', `
        <div class="gp-header gp-thread-header">
            <button class="gp-iconbtn" id="gp-back">${ic('fa-chevron-left')}</button>
            ${avatarHtml(name, '', 'gp-avatar gp-avatar-sm')}
            <div class="gp-thread-title">
                <div class="gp-row-name">${esc(name)}</div>
                <div class="gp-thread-number">${esc(sub)}</div>
            </div>
            <span style="width:32px"></span>
        </div>
        <div class="gp-msgs" id="gp-msgs">
            ${bubbles || empty}
            ${_courierBusy ? `<div class="gp-bubble-wrap gp-in gp-typing-wrap"><div class="gp-bubble gp-typing"><span></span><span></span><span></span></div></div>` : ''}
        </div>
        <div class="gp-inputbar">
            <textarea id="gp-ord-input" rows="1" placeholder="Сообщение курьеру..."></textarea>
            <button class="gp-send" id="gp-ord-send" ${_courierBusy ? 'disabled' : ''}>${ic('fa-paper-plane')}</button>
        </div>`);

    const msgs = screen.querySelector('#gp-msgs');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
    screen.querySelector('#gp-back')?.addEventListener('click', () => goto('shoporders'));

    const send = async () => {
        const input = screen.querySelector('#gp-ord-input');
        const text = input?.value.trim();
        if (!text || _courierBusy) return;
        input.value = '';
        clearDraft('gp-ord-input');
        _courierBusy = true;
        render();
        try {
            await writeToCourier(o.id, text);
        } catch (e) {
            toast(String(e?.message || e).slice(0, 60), 'fa-circle-exclamation');
        } finally {
            _courierBusy = false;
            render();
        }
    };
    screen.querySelector('#gp-ord-send')?.addEventListener('click', send);
    screen.querySelector('#gp-ord-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
}

// ── Отложенное уведомление о доставке ──
// Пока она набирает корзину, срок называть рано: на каждый товар прилетал бы
// свой тост. Ждём, когда она выйдет из магазина (или просто перестанет
// докладывать в корзину), и говорим один раз — про весь заказ.
let _orderToast = null;      // id заказа, о котором ещё не сказали
let _orderToastTimer = null;
const ORDER_TOAST_DELAY = 9000;

function scheduleOrderToast(orderId) {
    _orderToast = orderId;
    if (_orderToastTimer) clearTimeout(_orderToastTimer);
    _orderToastTimer = setTimeout(flushOrderToast, ORDER_TOAST_DELAY);
}

function flushOrderToast() {
    if (_orderToastTimer) { clearTimeout(_orderToastTimer); _orderToastTimer = null; }
    const id = _orderToast;
    _orderToast = null;
    if (!id) return;
    const o = findOrder(id);
    if (!o || !o.eta) return;
    const n = orderItems(o).length;
    const what = n > 1 ? `Заказ принят: ${n} ${plural(n, 'позиция', 'позиции', 'позиций')} · доставка` : 'Заказ принят, доставка';
    toast(`${what} ${fmtEta(orderLeft(o))}`, 'fa-truck');
}

function plural(n, one, few, many) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
}

// Позиции заказа. У заказов до появления корзины списка нет — там одна позиция.
function orderItems(o) {
    return Array.isArray(o.items) && o.items.length ? o.items : [{ name: o.item, price: o.price }];
}

// Сколько заказов ещё едет — бейдж на иконке магазина
function pendingOrders() {
    try { return getOrders().filter(o => o.stage === 'placed' || o.stage === 'way').length; } catch (e) { return 0; }
}

// Строка состояния заказа. Старые заказы (без stage) статуса не имеют —
// они оформлялись до появления доставки.
function orderStatusHtml(o) {
    if (o.stage === 'booked') return `<span class="gp-order-stage gp-stage-done">${ic('fa-calendar-check')} Забронировано</span>`;
    if (o.stage === 'done') return `<span class="gp-order-stage gp-stage-done">${ic('fa-box-open')} Доставлен</span>`;
    if (o.stage === 'way') {
        const who = o.courier?.name ? `${esc(o.courier.name)} · ` : '';
        return `<span class="gp-order-stage gp-stage-way">${ic('fa-truck-fast')} Везёт ${who}${esc(fmtEta(orderLeft(o)))}</span>`;
    }
    if (o.stage === 'placed') return `<span class="gp-order-stage">${ic('fa-clock')} В сборке · ${esc(fmtEta(orderLeft(o)))}</span>`;
    return '';
}

// Уведомления о доставке — по событию ролевой (как напоминания банка)
export function notifyDeliveries() {
    if (!getSettings().isEnabled) return;
    try {
        for (const { order, stage } of advanceOrders()) {
            if (stage === 'way') {
                toast(`Курьер в пути: ${order.item} · ${fmtEta(orderLeft(order))}`, 'fa-truck-fast');
                // Курьера придумываем только сейчас: до выезда его нет.
                // Фоном — уведомление не должно ждать модель.
                ensureCourier(order.id).then(c => {
                    if (!c) return;
                    toast(`Заказ везёт ${c.name}`, 'fa-user');
                    if (isPhoneOpen()) render();
                }).catch(e => logFail('курьер', String(e?.message || e)));
            } else if (stage === 'done') {
                toast(`Заказ доставлен: ${order.item}`, 'fa-box-open');
                if (order.courier) {
                    courierArrived(order.id).then(() => { if (isPhoneOpen()) render(); })
                        .catch(e => logFail('курьер у двери', String(e?.message || e)));
                }
            }
        }
    } catch (e) { /* ignore */ }
}

// Превью товара: фото, если нарисовано, иначе кнопка генерации
function shopItemImage(it, storeId) {
    const busy = _imgGenBusy.has(it.id);
    if (it.image) {
        return `<div class="gp-shop-item-img"><img src="${esc(it.image)}" alt="" data-zoom>
            <button class="gp-img-regen gp-img-regen-sm" data-shopimg="${esc(storeId)}|${esc(it.id)}" title="Перерисовать товар" ${busy ? 'disabled' : ''}>${ic(busy ? 'fa-spinner fa-spin' : 'fa-rotate-right')}</button>
            ${busy ? `<div class="gp-shop-item-imgbusy">${ic('fa-spinner fa-spin')}${stopGenBtn(it.id)}</div>` : ''}</div>`;
    }
    return `<button class="gp-shop-item-img gp-shop-item-img-empty" data-shopimg="${esc(storeId)}|${esc(it.id)}" title="Нарисовать товар">
        ${busy ? `${ic('fa-spinner fa-spin')}${stopGenBtn(it.id)}` : ic('fa-image')}
    </button>`;
}

function renderShopOrders(screen) {
    currentScreen = 'shoporders';
    const orders = getOrders();
    setHtmlKeepScroll(screen, '.gp-shop-scroll', `
        <div class="gp-header gp-thread-header">
            <button class="gp-iconbtn" id="gp-back">${ic('fa-chevron-left')}</button>
            <div class="gp-title gp-title-app gp-shop-title">${ic('fa-receipt')} Мои заказы</div>
            <span style="width:32px"></span>
        </div>
        <div class="gp-shop-scroll">
            ${orders.length === 0
                ? `<div class="gp-empty-text" style="padding:16px 8px">Заказов пока нет</div>`
                : orders.map(o => `
                    <div class="gp-shop-order">
                        <span class="gp-bank-tx-i">${ic((catById(o.cat) || {}).icon || 'fa-bag-shopping')}</span>
                        <span class="gp-bank-tx-body">
                            <span class="gp-bank-tx-label" title="${esc(orderItems(o).map(x => x.name).join(', '))}">${esc(o.item)}${orderItems(o).length > 1 ? ` <b class="gp-order-more">+${orderItems(o).length - 1}</b>` : ''}</span>
                            ${orderItems(o).length > 1
                                ? `<span class="gp-bank-tx-cat">${esc(orderItems(o).slice(1).map(x => x.name).join(', '))}</span>` : ''}
                            <span class="gp-bank-tx-cat">${esc(o.store)} · ${esc(timeAgo(o.time))}</span>
                            ${orderStatusHtml(o)}
                        </span>
                        <span class="gp-bank-tx-amt gp-neg">${esc(fmtMoney(o.price))}</span>
                        ${(o.eta && o.stage !== 'done') || o.courier ? `<button class="gp-iconbtn gp-order-chat" data-ordchat="${esc(o.id)}" title="Чат с курьером">${ic('fa-comment-dots')}${courierUnread(o) ? `<span class="gp-app-badge">${courierUnread(o)}</span>` : ''}</button>` : ''}
                        <button class="gp-bank-tx-del" data-del-order="${esc(o.id)}" title="Убрать из истории">${ic('fa-xmark')}</button>
                    </div>`).join('')}
        </div>`);
    screen.querySelector('#gp-back')?.addEventListener('click', () => goto('shop'));
    screen.querySelectorAll('[data-ordchat]').forEach(btn => btn.addEventListener('click', () => {
        _ordChatId = btn.getAttribute('data-ordchat');
        _courierTried.delete(_ordChatId);   // заход в чат = новая попытка назначить курьера
        goto('ordchat');
    }));
    screen.querySelectorAll('[data-del-order]').forEach(btn => btn.addEventListener('click', () => {
        deleteOrder(btn.getAttribute('data-del-order')); render();
    }));
}

// ═══ КАЗИНО ═══

let _casinoBet = 100;
let _casinoLast = null;
let _casinoMode = 'slots';
// Сессия казино: копим спины и пишем ИТОГ одной строкой в журнал при выходе
// (каждый спин отдельно — спам в чате; крупный куш логируется сразу)
let _casinoSession = null;

function casinoTrack(bet, win) {
    if (!_casinoSession) _casinoSession = { spins: 0, wagered: 0, won: 0 };
    _casinoSession.spins++;
    _casinoSession.wagered += bet;
    _casinoSession.won += win;
}

function flushCasinoSession() {
    const s = _casinoSession;
    _casinoSession = null;
    if (!s || !s.spins) return;
    const net = s.won - s.wagered;
    const outcome = net > 0 ? `в плюсе на ${fmtMoney(net)}` : net < 0 ? `в минусе на ${fmtMoney(-net)}` : 'вышла в ноль';
    logSocialToChat(`${getUserName()} играет в онлайн-казино с телефона: ставок на ${fmtMoney(s.wagered)} (${s.spins} раунд.), итог — ${outcome}.`);
    applyChatHiding();
}
let _casinoBusy = false;
let _casinoReels = ['fa-gem', 'fa-star', 'fa-crown'];
let _casinoRouletteBet = { type: 'num', number: 17 };
let _casinoWheelRotation = 0;
let _casinoRouletteHistory = [32, 15, 19, 4, 21];

const CASINO_WHEEL_ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const CASINO_RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

function casinoNumberColor(n) {
    return n === 0 ? 'green' : (CASINO_RED_NUMBERS.has(n) ? 'red' : 'black');
}

function casinoWheelGradient() {
    const step = 360 / CASINO_WHEEL_ORDER.length;
    return CASINO_WHEEL_ORDER.map((n, i) => {
        const color = n === 0 ? '#23865f' : (CASINO_RED_NUMBERS.has(n) ? '#a93449' : '#1d1a22');
        return `${color} ${i * step}deg ${(i + 1) * step}deg`;
    }).join(',');
}

function casinoWheelNumbers() {
    const step = 360 / CASINO_WHEEL_ORDER.length;
    return CASINO_WHEEL_ORDER.map((n, i) => {
        const angle = i * step;
        return `<span class="gp-casino-wheel-number gp-casino-wheel-number-${casinoNumberColor(n)}" style="transform:rotate(${angle}deg) translateY(-88px) rotate(${-angle}deg)">${n}</span>`;
    }).join('');
}

function casinoNumberGrid() {
    let html = `<button class="gp-casino-number gp-casino-number-green ${_casinoRouletteBet.type === 'num' && _casinoRouletteBet.number === 0 ? 'gp-selected' : ''}" data-casino-number="0">0</button>`;
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 12; col++) {
            const n = col * 3 + (3 - row);
            html += `<button class="gp-casino-number gp-casino-number-${casinoNumberColor(n)} ${_casinoRouletteBet.type === 'num' && _casinoRouletteBet.number === n ? 'gp-selected' : ''}" data-casino-number="${n}">${n}</button>`;
        }
    }
    return html;
}

function renderCasino(screen) {
    currentScreen = 'casino';
    const b = getBank();
    const st = casinoStats();
    const last = _casinoLast;
    const slotResult = last?.kind === 'slots'
        ? (last.win > 0 ? `Выигрыш ${fmtMoney(last.win)}` : 'Комбинация не сыграла')
        : 'Собери три одинаковых символа';
    const rouletteResult = last?.kind === 'roulette'
        ? `Выпало ${last.result} · ${last.win > 0 ? `выигрыш ${fmtMoney(last.win)}` : 'ставка не сыграла'}`
        : 'Выбери ставку и запусти колесо';
    const rouletteBetLabel = _casinoRouletteBet.type === 'num'
        ? `Число ${_casinoRouletteBet.number} · ×36`
        : `${_casinoRouletteBet.type === 'red' ? 'Красное' : 'Чёрное'} · ×2`;

    setHtmlKeepScroll(screen, '.gp-casino-scroll', `
        <div class="gp-header gp-thread-header">
            <button class="gp-iconbtn" id="gp-back">${ic('fa-chevron-left')}</button>
            <div class="gp-title gp-title-app gp-casino-title">Игровой зал</div>
            <span style="width:32px"></span>
        </div>
        <div class="gp-casino-balance"><span>Баланс</span><b>${esc(fmtMoney(b.balance))}</b></div>
        <div class="gp-casino-scroll">
            <div class="gp-casino-tabs" role="tablist" aria-label="Игры">
                <button class="gp-casino-tab ${_casinoMode === 'slots' ? 'gp-active' : ''}" data-casino-mode="slots">Слоты</button>
                <button class="gp-casino-tab ${_casinoMode === 'roulette' ? 'gp-active' : ''}" data-casino-mode="roulette">Рулетка</button>
            </div>
            ${_casinoMode === 'slots' ? `
                <section class="gp-casino-game gp-casino-slots">
                    <div class="gp-casino-game-head"><b>Лунный клуб</b><span>3 барабана</span></div>
                    <div class="gp-casino-machine ${_casinoBusy ? 'gp-spinning' : ''}">
                        ${_casinoReels.map((symbol, i) => `<div class="gp-casino-reel"><div class="gp-casino-reel-strip" style="--reel-delay:${i * 90}ms"><span>${ic(symbol)}</span><span>${ic('fa-star')}</span><span>${ic('fa-gem')}</span><span>${ic('fa-crown')}</span></div></div>`).join('')}
                    </div>
                    <div class="gp-casino-paytable"><span><b>×200</b> три короны</span><span><b>×50</b> три камня</span><span><b>×4–20</b> другие тройки</span></div>
                    <div class="gp-casino-quickbets">
                        ${[50, 100, 250].map(v => `<button data-casino-bet="${v}" class="${_casinoBet === v ? 'gp-selected' : ''}">${esc(fmtMoney(v))}</button>`).join('')}
                    </div>
                    <div class="gp-casino-actionrow">
                        <input type="number" id="gp-casino-bet" class="gp-casino-bet" inputmode="numeric" min="1" value="${_casinoBet}" aria-label="Ставка">
                        <button class="gp-casino-spin" id="gp-slots-spin" ${_casinoBusy ? 'disabled' : ''}>Крутить</button>
                    </div>
                    <div class="gp-casino-status ${last?.kind === 'slots' && last.win > 0 ? 'gp-win' : ''}">${esc(slotResult)}</div>
                </section>` : `
                <section class="gp-casino-game gp-casino-roulette">
                    <div class="gp-casino-game-head"><b>Европейская рулетка</b><span>0–36</span></div>
                    <div class="gp-casino-wheel-stage">
                        <span class="gp-casino-pointer" aria-hidden="true"></span>
                        <div class="gp-casino-wheel" id="gp-casino-wheel" style="background:conic-gradient(from -4.865deg,${casinoWheelGradient()});transform:rotate(${_casinoWheelRotation}deg)">
                            ${casinoWheelNumbers()}
                            <span class="gp-casino-wheel-center">${last?.kind === 'roulette' ? last.result : ''}</span>
                        </div>
                    </div>
                    <div class="gp-casino-lastnums">${_casinoRouletteHistory.map(n => `<span class="gp-roulette-${casinoNumberColor(n)}">${n}</span>`).join('')}</div>
                    <div class="gp-casino-colors">
                        <button class="gp-casino-color gp-red ${_casinoRouletteBet.type === 'red' ? 'gp-selected' : ''}" data-roul-select="red">Красное ×2</button>
                        <button class="gp-casino-color gp-black ${_casinoRouletteBet.type === 'black' ? 'gp-selected' : ''}" data-roul-select="black">Чёрное ×2</button>
                    </div>
                    <div class="gp-casino-number-grid">${casinoNumberGrid()}</div>
                    <div class="gp-casino-choice"><span>Ставка</span><b>${rouletteBetLabel}</b></div>
                    <div class="gp-casino-actionrow">
                        <input type="number" id="gp-casino-bet" class="gp-casino-bet" inputmode="numeric" min="1" value="${_casinoBet}" aria-label="Ставка">
                        <button class="gp-casino-spin" id="gp-roulette-spin" ${_casinoBusy ? 'disabled' : ''}>Крутить</button>
                    </div>
                    <div class="gp-casino-status ${last?.kind === 'roulette' && last.win > 0 ? 'gp-win' : ''}">${esc(rouletteResult)}</div>
                </section>`}
            <div class="gp-casino-stats">
                <span>Раундов<b>${st.spins}</b></span>
                <span>Выиграно<b>${esc(fmtMoney(st.won))}</b></span>
                <span>Лучший куш<b>${esc(fmtMoney(st.bestWin))}</b></span>
            </div>
        </div>`);

    screen.querySelector('#gp-back')?.addEventListener('click', () => { flushCasinoSession(); goto('home'); });
    const betInput = screen.querySelector('#gp-casino-bet');
    betInput?.addEventListener('change', () => { _casinoBet = Math.max(1, parseInt(betInput.value) || 100); });
    const getBet = () => {
        const bet = Math.max(1, parseInt(betInput?.value) || 0);
        if (!canBet(bet)) { toast('Не хватает денег на счету', 'fa-circle-exclamation'); return null; }
        _casinoBet = bet;
        return bet;
    };
    screen.querySelectorAll('[data-casino-mode]').forEach(btn => btn.addEventListener('click', () => {
        if (_casinoBusy) return;
        _casinoMode = btn.getAttribute('data-casino-mode');
        render();
    }));
    screen.querySelectorAll('[data-casino-bet]').forEach(btn => btn.addEventListener('click', () => {
        _casinoBet = parseInt(btn.getAttribute('data-casino-bet')) || 100;
        render();
    }));
    screen.querySelector('#gp-slots-spin')?.addEventListener('click', () => {
        if (_casinoBusy) return;
        const bet = getBet(); if (!bet) return;
        const r = spinSlots(bet); if (!r) return;
        casinoTrack(r.bet, r.win);
        if (r.mult >= 20) {
            logSocialToChat(`${getUserName()} сорвала куш в онлайн-казино: ${fmtMoney(r.win)} одним спином (слоты, ×${r.mult})!`);
            applyChatHiding();
        }
        _casinoBusy = true;
        screen.querySelector('.gp-casino-machine')?.classList.add('gp-spinning');
        screen.querySelector('#gp-slots-spin')?.setAttribute('disabled', '');
        updatePhoneInjection();
        setTimeout(() => {
            _casinoReels = r.reels;
            _casinoLast = { kind: 'slots', ...r };
            _casinoBusy = false;
            if (currentScreen === 'casino') render();
            toast(r.win > 0 ? `Выигрыш ${fmtMoney(r.win)}!` : 'Комбинация не сыграла', r.win > 0 ? 'fa-dice' : 'fa-circle-minus');
        }, 1500);
    });
    screen.querySelectorAll('[data-roul-select]').forEach(btn => btn.addEventListener('click', () => {
        if (_casinoBusy) return;
        _casinoRouletteBet = { type: btn.getAttribute('data-roul-select'), number: null };
        render();
    }));
    screen.querySelectorAll('[data-casino-number]').forEach(btn => btn.addEventListener('click', () => {
        if (_casinoBusy) return;
        _casinoRouletteBet = { type: 'num', number: parseInt(btn.getAttribute('data-casino-number')) };
        render();
    }));
    screen.querySelector('#gp-roulette-spin')?.addEventListener('click', () => {
        if (_casinoBusy) return;
        const bet = getBet(); if (!bet) return;
        const r = spinRoulette(bet, _casinoRouletteBet.type, _casinoRouletteBet.number); if (!r) return;
        casinoTrack(r.bet, r.win);
        if (_casinoRouletteBet.type === 'num' && r.win > 0) {
            logSocialToChat(`${getUserName()} сорвала куш в онлайн-казино: угадала число ${r.result} в рулетке и взяла ${fmtMoney(r.win)} (×36)!`);
            applyChatHiding();
        }
        const wheel = screen.querySelector('#gp-casino-wheel');
        const index = CASINO_WHEEL_ORDER.indexOf(r.result);
        const currentTurns = Math.ceil(_casinoWheelRotation / 360);
        _casinoWheelRotation = (currentTurns + 5) * 360 - index * (360 / CASINO_WHEEL_ORDER.length);
        _casinoBusy = true;
        screen.querySelector('#gp-roulette-spin')?.setAttribute('disabled', '');
        requestAnimationFrame(() => { if (wheel) wheel.style.transform = `rotate(${_casinoWheelRotation}deg)`; });
        updatePhoneInjection();
        setTimeout(() => {
            _casinoRouletteHistory.unshift(r.result);
            _casinoRouletteHistory = _casinoRouletteHistory.slice(0, 5);
            _casinoLast = { kind: 'roulette', ...r };
            _casinoBusy = false;
            if (currentScreen === 'casino') render();
            toast(r.win > 0 ? `Выпало ${r.result} — выигрыш ${fmtMoney(r.win)}!` : `Выпало ${r.result}`, r.win > 0 ? 'fa-dice' : 'fa-circle-dot');
        }, 3300);
    });
}

// ═══ ДИСКОРД ═══
// Лейаут как в настоящем Discord mobile: рейка серверов слева, панель каналов,
// плоские сообщения с аватарками. Свой тёмный скин с блюрплом (это бренд
// приложения, как у твиттера/инсты — темы телефона его не перекрашивают).

let _dServerId = null;
let _dChannelId = null;
let _dBusy = false;
let _dReplyTo = null;   // {author, text} — на какое сообщение отвечаем

function renderDiscord(screen) {
    currentScreen = 'discord';
    const d = getDiscord();
    if (!_dServerId || !findDServer(_dServerId)) _dServerId = d.servers[0]?.id || null;
    const srv = findDServer(_dServerId);
    const rail = d.servers.map(s => `
        <button class="gp-dc-srv${s.id === _dServerId ? ' gp-active' : ''}" data-dserver="${s.id}" title="${esc(s.name)}" style="${avatarStyle('ds' + s.name)}">${esc(s.name.slice(0, 2).toUpperCase())}</button>`).join('');
    const panel = srv ? `
        <div class="gp-dc-head">
            <b>${srv.mine ? `${ic('fa-crown')} ` : ''}${esc(srv.name)}</b>
            <button class="gp-dc-leave" data-ddel="${srv.id}" title="${srv.mine ? 'Удалить сервер' : 'Покинуть сервер'}">${ic(srv.mine ? 'fa-trash-can' : 'fa-right-from-bracket')}</button>
        </div>
        ${srv.desc ? `<div class="gp-dc-desc">${esc(srv.desc)}</div>` : ''}
        <div class="gp-dc-cat">Текстовые каналы</div>
        ${srv.channels.map(c => `
            <button class="gp-dc-chan" data-dchan="${c.id}">
                <span class="gp-dc-hash">#</span>
                <span class="gp-dc-chan-name">${esc(c.name)}</span>
                ${c.messages.length ? `<span class="gp-dc-chan-count">${c.messages.length}</span>` : ''}
            </button>`).join('')}
        <div class="gp-dc-cat gp-dc-cat-row">
            <span>Участники — ${srv.members.length}</span>
            <button class="gp-dc-cat-add" id="gp-d-member-add" title="Пригласить участника">${ic('fa-user-plus')}</button>
        </div>
        <div class="gp-dc-members">
            ${srv.members.map(mb => `
                <span class="gp-dc-member">
                    <i class="gp-dc-dot"></i>
                    <b style="color:${senderColor(mb)}">${esc(mb)}</b>
                    <button class="gp-dc-member-del" data-dmemdel="${esc(mb)}" title="Убрать с сервера">${ic('fa-xmark')}</button>
                </span>`).join('')}
        </div>` : `
        <div class="gp-empty">
            <div class="gp-empty-icon">${brand('fa-discord')}</div>
            <div class="gp-empty-text">${ic('fa-plus')} — найти серверы, где можно состоять<br>${ic('fa-crown')} — создать свой сервер</div>
        </div>`;
    screen.innerHTML = `
        <div class="gp-dc-skin">
            <div class="gp-dc-rail">
                <button class="gp-dc-home" id="gp-back">${ic('fa-chevron-left')}</button>
                <div class="gp-dc-sep"></div>
                ${rail}
                <button class="gp-dc-srv gp-dc-add" id="gp-d-refresh" title="Найти серверы" ${_dBusy ? 'disabled' : ''}>${ic(_dBusy ? 'fa-spinner fa-spin' : 'fa-plus')}</button>
                <button class="gp-dc-srv gp-dc-create" id="gp-d-create" title="Создать свой сервер" ${_dBusy ? 'disabled' : ''}>${ic('fa-crown')}</button>
            </div>
            <div class="gp-dc-panel">${panel}</div>
        </div>`;
    screen.querySelector('#gp-back')?.addEventListener('click', () => goto('home'));
    screen.querySelector('#gp-d-refresh')?.addEventListener('click', async () => {
        if (_dBusy) return;
        _dBusy = true;
        render();
        try {
            await refreshDiscordServers();
            toast('Серверы найдены', 'fa-check');
        } catch (e) {
            toast(String(e?.message || e).slice(0, 60), 'fa-circle-exclamation');
        } finally {
            _dBusy = false;
            render();
        }
    });
    screen.querySelector('#gp-d-create')?.addEventListener('click', async () => {
        if (_dBusy) return;
        const name = prompt('Название твоего сервера:', '');
        if (name === null || !name.trim()) return;
        const theme = prompt('О чём сервер? (тема, вайб):', '') || '';
        _dBusy = true;
        render();
        try {
            const srv2 = await createOwnDServer(name.trim(), theme.trim());
            _dServerId = srv2?.id || _dServerId;
            toast('Сервер создан', 'fa-crown');
        } catch (e) {
            toast(String(e?.message || e).slice(0, 60), 'fa-circle-exclamation');
        } finally {
            _dBusy = false;
            render();
        }
    });
    screen.querySelectorAll('[data-dserver]').forEach(b => b.addEventListener('click', () => {
        _dServerId = b.getAttribute('data-dserver');
        render();
    }));
    screen.querySelectorAll('[data-dchan]').forEach(b => b.addEventListener('click', () => {
        _dChannelId = b.getAttribute('data-dchan');
        goto('dchannel');
    }));
    // Пригласить: подсказываем контактами из телефона, но принимаем любое имя
    screen.querySelector('#gp-d-member-add')?.addEventListener('click', () => {
        if (!srv) return;
        const known = getThreadList().filter(t => !t.isGroup).map(t => t.name).filter(Boolean);
        const hint = known.length ? `\n\nИз контактов: ${known.slice(0, 8).join(', ')}` : '';
        const name = prompt(`Кого пригласить на «${srv.name}»?${hint}`, '');
        if (name === null || !name.trim()) return;
        if (!addDMember(srv.id, name.trim())) { toast('Такой участник уже есть', 'fa-circle-exclamation'); return; }
        toast(`Приглашён: ${name.trim()}`, 'fa-user-plus');
        render();
    });
    screen.querySelectorAll('[data-dmemdel]').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation();
        const name = b.getAttribute('data-dmemdel');
        if (!srv || !confirm(srv.mine ? `Выгнать ${name} с сервера?` : `Убрать ${name} из списка участников?`)) return;
        delDMember(srv.id, name);
        render();
    }));
    screen.querySelectorAll('[data-ddel]').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation();
        const s = findDServer(b.getAttribute('data-ddel'));
        if (!s || !confirm(s.mine ? `Удалить свой сервер «${s.name}»?` : `Выйти с сервера «${s.name}»?`)) return;
        deleteDServer(s.id);
        _dServerId = null;
        render();
    }));
}

function renderDChannel(screen) {
    currentScreen = 'dchannel';
    const s = findDServer(_dServerId);
    const c = findDChannel(_dServerId, _dChannelId);
    if (!s || !c) { goto('discord'); return; }
    const msgs = c.messages.map(mm => `
        <div class="gp-dcmsg" data-dmsg="${mm.id}">
            <span class="gp-dcmsg-ava" style="${avatarStyle(mm.user ? 'user' + mm.author : mm.author)}">${esc(String(mm.author).slice(0, 1).toUpperCase())}</span>
            <div class="gp-dcmsg-body">
                ${mm.replyTo ? `<div class="gp-dcmsg-quote">${ic('fa-reply')} <b style="color:${senderColor(mm.replyTo.author)}">${esc(mm.replyTo.author)}</b> ${esc(mm.replyTo.text)}</div>` : ''}
                <b style="color:${mm.user ? 'var(--dc-blurple-light)' : senderColor(mm.author)}">${esc(mm.author)}</b>
                <span>${esc(mm.text)}</span>
            </div>
        </div>`).join('');
    setHtmlKeepScroll(screen, '.gp-dcmsg-scroll', `
        <div class="gp-dc-skin gp-dc-skin-chat">
            <div class="gp-dc-chathead">
                <button class="gp-iconbtn" id="gp-back">${ic('fa-chevron-left')}</button>
                <span class="gp-dc-hash">#</span>
                <div class="gp-dc-chathead-title">
                    <b>${esc(c.name)}</b>
                    <span>${esc(s.name)}</span>
                </div>
                <button class="gp-iconbtn" id="gp-dc-refresh" ${_dBusy ? 'disabled' : ''}>${ic(_dBusy ? 'fa-spinner fa-spin' : 'fa-rotate-right')}</button>
            </div>
            <div class="gp-dcmsg-scroll" id="gp-dmsg-scroll">
                ${msgs || `<div class="gp-dc-welcome"><span class="gp-dc-hash-big">#</span><b>Добро пожаловать в #${esc(c.name)}!</b><span>${esc(c.topic || 'Начало канала.')}</span><span class="gp-dc-welcome-hint">Нажми ↻ — канал оживёт, или напиши первым</span></div>`}
                ${_dBusy ? `<div class="gp-dcmsg gp-dmsg-typing"><span></span><span></span><span></span></div>` : ''}
            </div>
            ${_dReplyTo ? `<div class="gp-dc-replychip">${ic('fa-reply')} Отвечаешь <b style="color:${senderColor(_dReplyTo.author)}">${esc(_dReplyTo.author)}</b>: ${esc(_dReplyTo.text.slice(0, 60))}<button id="gp-d-reply-clear">${ic('fa-xmark')}</button></div>` : ''}
            <div class="gp-dc-inputwrap">
                <textarea id="gp-d-input" rows="1" placeholder="${_dReplyTo ? `Ответить ${esc(_dReplyTo.author)}` : `Написать в #${esc(c.name)}`}"></textarea>
                <button class="gp-dc-send" id="gp-d-send" ${_dBusy ? 'disabled' : ''}>${ic('fa-paper-plane')}</button>
            </div>
        </div>`);
    const scroll = screen.querySelector('#gp-dmsg-scroll');
    if (scroll) scroll.scrollTop = scroll.scrollHeight;
    screen.querySelector('#gp-back')?.addEventListener('click', () => { _dReplyTo = null; goto('discord'); });
    const dRun = async (fn) => {
        if (_dBusy) return;
        _dBusy = true;
        render();
        try {
            await fn();
        } catch (e) {
            toast(String(e?.message || e).slice(0, 60), 'fa-circle-exclamation');
        } finally {
            _dBusy = false;
            applyChatHiding(); // журнальные строки — с глаз долой
            render();
        }
    };
    screen.querySelector('#gp-dc-refresh')?.addEventListener('click', () => dRun(() => refreshDChannel(s.id, c.id)));
    // Тап по сообщению = ответить на него (свои — нет смысла)
    screen.querySelectorAll('[data-dmsg]').forEach(el => el.addEventListener('click', () => {
        const mm = c.messages.find(x => x.id === el.getAttribute('data-dmsg'));
        if (!mm || mm.user) return;
        const draft = document.getElementById('gp-d-input')?.value || '';
        _dReplyTo = { author: mm.author, text: mm.text };
        render();
        const inp = document.getElementById('gp-d-input');
        if (inp) { inp.value = draft; inp.focus(); }
    }));
    screen.querySelector('#gp-d-reply-clear')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const draft = document.getElementById('gp-d-input')?.value || '';
        _dReplyTo = null;
        render();
        const inp = document.getElementById('gp-d-input');
        if (inp) { inp.value = draft; inp.focus(); }
    });
    const input = screen.querySelector('#gp-d-input');
    const send = () => {
        const v = (input?.value || '').trim();
        if (!v) return;
        input.value = '';
        const rt = _dReplyTo;
        _dReplyTo = null;
        dRun(() => postToDChannel(s.id, c.id, v, rt));
    };
    screen.querySelector('#gp-d-send')?.addEventListener('click', send);
    input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
}

// ═══ ТВИЧ ═══
// Фирменный скин (тёмный + фиолетовый #9146ff), карточки эфиров с превью,
// чат твич-строками «ник: текст», донат-алерты поверх кадра.

let _twStreamId = null;
let _twBusy = false;
let _twAlert = null;      // текущий донат-алерт {from, amount, text}
let _twAlertQueue = [];
let _twAlertTimer = null;

function showTwAlert(alert) {
    _twAlertQueue.push(alert);
    if (!_twAlert) _nextTwAlert();
}
function _nextTwAlert() {
    clearTimeout(_twAlertTimer);
    _twAlert = _twAlertQueue.shift() || null;
    if (isPhoneOpen() && (currentScreen === 'stream' || currentScreen === 'mystream')) render();
    if (_twAlert) _twAlertTimer = setTimeout(_nextTwAlert, 4500);
}

// Кадр стрима: рисуем по описанию сцены через картинко-пайплайн (свой стиль/рефы)
async function drawStreamFrame(target, streamer, isMine) {
    if (!_imgGenReady) {
        const ready = await isImageGenAvailable();
        if (!ready) return; // нет картинко-расширения — живём на текстовой сцене
        _imgGenReady = true;
    }
    try {
        const src = await generatePostImage({
            imgDesc: target.scene,
            author: isMine ? getUserName() : streamer,
            ak: isMine ? 'user' : `contact:${keyOf(streamer)}`,
            kind: 'ig',
            stream: true, // рефы: частичный матч имени с карточкой + аватар контакта
            aspect: '16:9',
            framing: isMine
                ? (getSettings().imgPromptTwMy || 'live webcam stream frame, streamer facecam view, stream overlay vibe')
                : (getSettings().imgPromptTwWatch || 'livestream video frame, what the stream camera shows, stream overlay vibe'),
        });
        target.image = src;
        target.imgTs = Date.now();
        saveMeta();
    } catch (e) {
        console.warn('[GlassPhone] stream frame gen failed:', e);
    }
}

// Кадр рисуется сам на каждом ходу стрима, но иногда хочется просто другой
function bindFrameRegen(screen, target, streamer, isMine) {
    screen.querySelector('#gp-tw-regen')?.addEventListener('click', async () => {
        if (_twBusy) return;
        _twBusy = true;
        render();
        try {
            await drawStreamFrame(target, streamer, isMine);
            toast('Кадр перерисован', 'fa-image');
        } finally {
            _twBusy = false;
            render();
        }
    });
}

function twAlertHtml() {
    if (!_twAlert) return '';
    return `
        <div class="gp-twch-alert">
            <span class="gp-twch-alert-icon">${ic('fa-coins')}</span>
            <div class="gp-twch-alert-body">
                <b>${esc(_twAlert.from)} — ${esc(fmtMoney(_twAlert.amount))}</b>
                ${_twAlert.text ? `<span>${esc(_twAlert.text)}</span>` : ''}
            </div>
        </div>`;
}

function twFrameHtml(target) {
    const inner = target.image
        ? `<img src="${esc(target.image)}${target.imgTs ? `?t=${target.imgTs}` : ''}" alt="" data-zoom>`
        : `<div class="gp-twch-frame-gen" style="${avatarStyle('stream' + (target.title || ''))}">${ic('fa-video')}</div>`;
    return `
        <div class="gp-twch-frame">
            ${inner}
            ${target.scene ? `<button class="gp-img-regen" id="gp-tw-regen" title="Перерисовать кадр" ${_twBusy ? 'disabled' : ''}>${ic(_twBusy ? 'fa-spinner fa-spin' : 'fa-rotate-right')}</button>` : ''}
            <span class="gp-twch-live-tag">LIVE</span>
            ${_twBusy ? `<div class="gp-twch-frame-busy">${ic('fa-spinner fa-spin')}</div>` : ''}
            ${twAlertHtml()}
        </div>`;
}

function twChatHtml(chat) {
    return chat.map(mm => {
        if (mm.don) {
            return `
            <div class="gp-twch-don">
                <b>${ic('fa-coins')} ${esc(mm.author)} — ${esc(fmtMoney(mm.don))}</b>
                ${mm.text ? `<span>${esc(mm.text)}</span>` : ''}
            </div>`;
        }
        return `
            <div class="gp-twch-line${mm.host ? ' gp-twch-line-host' : ''}">
                <b style="color:${mm.user ? 'var(--twch-purple-light)' : senderColor(mm.author)}">${mm.host ? ic('fa-paper-plane') + ' ' : ''}${esc(mm.author)}</b><span class="gp-twch-colon">:</span>
                <span>${esc(mm.text)}</span>
            </div>`;
    }).join('');
}

// Ник правится из шапки твича и из своего эфира — имя персонажа при этом
// не трогаем, меняется только то, как её видно на площадке.
function editTwitchNick() {
    const value = prompt(tr('Твой ник на Твиче'), getTwitchNick());
    if (value === null) return;
    setTwitchNick(value);
    render();
}

function renderTwitch(screen) {
    currentScreen = 'twitch';
    const t = getTwitch();
    const cards = t.streams.map(s => `
        <div class="gp-twch-card" data-stream="${s.id}">
            <div class="gp-twch-thumb" style="${avatarStyle('stream' + s.title)}">
                ${s.image ? `<img src="${esc(s.image)}" alt="">` : ic('fa-play')}
                <span class="gp-twch-live-tag">LIVE</span>
                <span class="gp-twch-viewers">${ic('fa-user')} ${s.viewers}</span>
            </div>
            <div class="gp-twch-meta">
                <span class="gp-twch-ava" style="${avatarStyle(s.streamer)}">${esc(s.streamer.slice(0, 1).toUpperCase())}</span>
                <div class="gp-twch-meta-text">
                    <b>${esc(s.title)}</b>
                    <span>${esc(s.streamer)}</span>
                    <i>${esc(s.category)}</i>
                </div>
            </div>
        </div>`).join('');
    screen.innerHTML = `
        <div class="gp-twch-skin">
            <div class="gp-twch-head">
                <button class="gp-iconbtn" id="gp-back">${ic('fa-chevron-left')}</button>
                <b>${brand('fa-twitch')} Twitch</b>
                <button class="gp-twch-nick" id="gp-twch-nick" title="Изменить ник на Твиче">${esc(getTwitchNick())}</button>
                <button class="gp-iconbtn" id="gp-twch-refresh" ${_twBusy ? 'disabled' : ''}>${ic(_twBusy ? 'fa-spinner fa-spin' : 'fa-rotate-right')}</button>
            </div>
            <div class="gp-twch-scroll">
                <button class="gp-twch-golive" id="gp-golive">${ic('fa-paper-plane')} ${getTwitch().myStream ? 'Ты в эфире — открыть' : 'Начать свой стрим'}</button>
                ${cards || `<div class="gp-empty"><div class="gp-empty-icon">${brand('fa-twitch')}</div><div class="gp-empty-text">Нажми ↻ — модель придумает,<br>кто сейчас в эфире</div></div>`}
            </div>
        </div>`;
    screen.querySelector('#gp-back')?.addEventListener('click', () => goto('home'));
    screen.querySelector('#gp-twch-nick')?.addEventListener('click', editTwitchNick);
    screen.querySelector('#gp-twch-refresh')?.addEventListener('click', async () => {
        if (_twBusy) return;
        _twBusy = true;
        render();
        try {
            await refreshStreams();
        } catch (e) {
            toast(String(e?.message || e).slice(0, 60), 'fa-circle-exclamation');
        } finally {
            _twBusy = false;
            render();
        }
    });
    screen.querySelectorAll('[data-stream]').forEach(b => b.addEventListener('click', () => {
        _twStreamId = b.getAttribute('data-stream');
        goto('stream');
        const s = findStream(_twStreamId);
        if (s && !s.image && s.scene) drawStreamFrame(s, s.streamer, false).then(() => { if (currentScreen === 'stream') render(); });
    }));
    screen.querySelector('#gp-golive')?.addEventListener('click', () => {
        if (getTwitch().myStream) { goto('mystream'); return; }
        const title = prompt('Название стрима:', '');
        if (title === null || !title.trim()) return;
        const cat = prompt('Категория (IRL / игра / музыка...):', 'IRL') || 'IRL';
        startMyStream(title.trim(), cat.trim());
        goto('mystream');
        // первый тик: зрители заходят
        _twRun(() => tickMyStream(null), true);
    });
}

// Обёртка тиков твича: busy-стейт, донат-алерты, авто-перерисовка кадра
async function _twRun(fn, mine = false) {
    if (_twBusy) return;
    _twBusy = true;
    render();
    try {
        const res = await fn();
        const sceneChanged = mine ? !!res?.sceneChanged : !!res;
        for (const a of (mine ? res?.alerts || [] : [])) showTwAlert(a);
        const target = mine ? getTwitch().myStream : findStream(_twStreamId);
        // Кадр перерисовывается сам, когда сцена изменилась (визуальная новелла)
        if (target && target.scene && (sceneChanged || !target.image)) {
            await drawStreamFrame(target, mine ? getUserName() : target.streamer, mine);
        }
    } catch (e) {
        toast(String(e?.message || e).slice(0, 60), 'fa-circle-exclamation');
    } finally {
        _twBusy = false;
        applyChatHiding(); // журнальные строки — с глаз долой
        render();
    }
}

function renderStream(screen) {
    currentScreen = 'stream';
    const s = findStream(_twStreamId);
    if (!s) { goto('twitch'); return; }
    setHtmlKeepScroll(screen, '.gp-twch-chat', `
        <div class="gp-twch-skin gp-twch-skin-live">
            <div class="gp-twch-head">
                <button class="gp-iconbtn" id="gp-back">${ic('fa-chevron-left')}</button>
                <div class="gp-twch-head-title">
                    <b>${esc(s.streamer)}</b>
                    <span>${esc(s.title)}</span>
                </div>
                <button class="gp-twch-nick" id="gp-st-nick" title="Изменить ник на Твиче">${esc(getTwitchNick())}</button>
                <span class="gp-twch-eye">${ic('fa-user')} ${s.viewers}</span>
            </div>
            ${twFrameHtml(s)}
            <div class="gp-twch-info"><span class="gp-twch-cat">${esc(s.category)}</span></div>
            ${s.scene ? `<div class="gp-twch-scene">${esc(s.scene)}</div>` : ''}
            <div class="gp-twch-chat" id="gp-twch-chat">
                ${twChatHtml(s.chat) || `<div class="gp-twch-chat-empty">Чат подгрузится с первым событием</div>`}
            </div>
            <div class="gp-twch-inputbar">
                <button class="gp-twch-tool" id="gp-st-tick" title="Что дальше?" ${_twBusy ? 'disabled' : ''}>${ic(_twBusy ? 'fa-spinner fa-spin' : 'fa-forward')}</button>
                <button class="gp-twch-tool gp-twch-donbtn" id="gp-st-don" title="Донат" ${_twBusy ? 'disabled' : ''}>${ic('fa-coins')}</button>
                <textarea id="gp-st-input" rows="1" placeholder="Отправить сообщение"></textarea>
                <button class="gp-twch-send" id="gp-st-send" ${_twBusy ? 'disabled' : ''}>${ic('fa-paper-plane')}</button>
            </div>
        </div>`);
    const chatEl = screen.querySelector('#gp-twch-chat');
    if (chatEl) chatEl.scrollTop = chatEl.scrollHeight;
    screen.querySelector('#gp-back')?.addEventListener('click', () => goto('twitch'));
    screen.querySelector('#gp-st-nick')?.addEventListener('click', editTwitchNick);
    bindFrameRegen(screen, s, s.streamer, false);
    screen.querySelector('#gp-st-tick')?.addEventListener('click', () => _twRun(() => tickStream(s.id, null)));
    const input = screen.querySelector('#gp-st-input');
    screen.querySelector('#gp-st-don')?.addEventListener('click', () => {
        const amtRaw = prompt(`Сумма доната для ${s.streamer}:`, '100');
        if (amtRaw === null) return;
        const amount = Math.round(parseFloat(String(amtRaw).replace(',', '.')) || 0);
        if (amount <= 0) { toast('Сумма доната должна быть больше нуля', 'fa-circle-exclamation'); return; }
        const text = (input?.value || '').trim() || (prompt('Сообщение к донату (можно пусто):', '') || '').trim();
        if (input) input.value = '';
        showTwAlert({ from: getTwitchNick(), amount, text });
        _twRun(() => donateToStream(s.id, amount, text));
    });
    const send = () => {
        const v = (input?.value || '').trim();
        if (!v) return;
        input.value = '';
        _twRun(() => tickStream(s.id, v));
    };
    screen.querySelector('#gp-st-send')?.addEventListener('click', send);
    input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
}

function renderMyStream(screen) {
    currentScreen = 'mystream';
    const my = getTwitch().myStream;
    if (!my) { goto('twitch'); return; }
    setHtmlKeepScroll(screen, '.gp-twch-chat', `
        <div class="gp-twch-skin gp-twch-skin-live">
            <div class="gp-twch-head">
                <button class="gp-iconbtn" id="gp-back">${ic('fa-chevron-left')}</button>
                <div class="gp-twch-head-title">
                    <b>${esc(my.title)}</b>
                    <span>${esc(getTwitchNick())} · ${esc(my.category)}${my.donTotal ? ` · донаты ${esc(fmtMoney(my.donTotal))}` : ''}</span>
                </div>
                <button class="gp-twch-nickbtn" id="gp-st-nick" title="Изменить ник на Твиче">${ic('fa-pen')}</button>
                <span class="gp-twch-eye">${ic('fa-user')} ${my.viewers}</span>
                <button class="gp-twch-endbtn" id="gp-st-end" title="Завершить стрим">${ic('fa-stop')}</button>
            </div>
            ${twFrameHtml(my)}
            ${my.scene ? `<div class="gp-twch-scene">${esc(my.scene)}</div>` : ''}
            <div class="gp-twch-chat" id="gp-twch-chat">
                ${twChatHtml(my.chat) || `<div class="gp-twch-chat-empty">Зрители заходят...</div>`}
            </div>
            <div class="gp-twch-inputbar">
                <button class="gp-twch-tool" id="gp-st-tick" title="Пауза: чат живёт сам" ${_twBusy ? 'disabled' : ''}>${ic(_twBusy ? 'fa-spinner fa-spin' : 'fa-forward')}</button>
                <textarea id="gp-st-input" rows="1" placeholder="Что говоришь / делаешь в кадре..."></textarea>
                <button class="gp-twch-send" id="gp-st-send" ${_twBusy ? 'disabled' : ''}>${ic('fa-paper-plane')}</button>
            </div>
        </div>`);
    const chatEl = screen.querySelector('#gp-twch-chat');
    if (chatEl) chatEl.scrollTop = chatEl.scrollHeight;
    screen.querySelector('#gp-back')?.addEventListener('click', () => goto('twitch'));
    screen.querySelector('#gp-st-nick')?.addEventListener('click', editTwitchNick);
    bindFrameRegen(screen, my, getUserName(), true);
    screen.querySelector('#gp-st-end')?.addEventListener('click', () => {
        if (!confirm('Завершить стрим? Итог уйдёт в историю.')) return;
        endMyStream();
        applyChatHiding();
        goto('twitch');
    });
    screen.querySelector('#gp-st-tick')?.addEventListener('click', () => _twRun(() => tickMyStream(null), true));
    const input = screen.querySelector('#gp-st-input');
    const send = () => {
        const v = (input?.value || '').trim();
        if (!v) return;
        input.value = '';
        _twRun(() => tickMyStream(v), true);
    };
    screen.querySelector('#gp-st-send')?.addEventListener('click', send);
    input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
}

// ═══ ТИНДЕР ═══

let _tinBusy = false;
let _tinProfileId = null;
let _tinMatch = null;          // кого показать в оверлее мэтча
let _tinMePhoto = null;        // черновик своего фото
let _tinFromThread = null;     // из какой переписки открыли анкету

async function tinBusyRun(fn) {
    if (_tinBusy) return;
    _tinBusy = true;
    render();
    try {
        await fn();
    } catch (e) {
        toast(String(e?.message || e).slice(0, 70), 'fa-circle-exclamation');
    } finally {
        _tinBusy = false;
        applyChatHiding();
        render();
    }
}

// Фото рисуется ТОЛЬКО по полю look — плотному визуальному описанию из самой
// анкеты. Ничего невизуального в промпт не идёт, иначе модель рисует «характер».
function drawTinderPhoto(p, mine = false) {
    return generatePostImage({
        ak: mine ? 'user' : (p.known ? `contact:${keyOf(p.name)}` : 'random'),
        kind: 'ig',
        aspect: '9:16',
        author: p.name,
        imgDesc: p.look || p.bio || p.name,
        framing: 'dating app profile photo: one person, natural candid shot, looking at the camera, upper body, everyday setting, no text, no watermark, no collage',
    }, null, `tin:${p.id || 'me'}`);
}

function tinPhotoHtml(p) {
    const busy = _imgGenBusy.has(`tin:${p.id}`);
    if (p.image) {
        // Перерисовать можно откуда угодно, где видно фото: с карты в колоде
        // и из анкеты. На тачскрине кнопка видна всегда — hover там нет.
        return `<div class="gp-tin-photo">
            <img src="${esc(p.image)}" alt="" data-zoom>
            <button class="gp-img-regen gp-tin-regen" data-tindraw="${esc(p.id)}" title="Перерисовать фото" ${busy ? 'disabled' : ''}>
                ${ic(busy ? 'fa-spinner fa-spin' : 'fa-rotate-right')}
            </button>
            ${busy ? stopGenBtn(`tin:${p.id}`) : ''}
        </div>`;
    }
    return `<div class="gp-tin-photo-gen">
        ${busy ? ic('fa-spinner fa-spin') : ic('fa-image')}
        <span>${esc(p.look || p.bio || '')}</span>
        <button class="gp-tin-draw" data-tindraw="${esc(p.id)}" ${busy ? 'disabled' : ''}>
            ${ic(busy ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles')} ${busy ? 'Рисую…' : 'Нарисовать'}
        </button>
    </div>`;
}

function renderTinder(screen) {
    currentScreen = 'tinder';
    const t = getTinder();
    const card = currentCard();
    const next = t.deck[1];
    const badge = matchBadge();

    screen.innerHTML = `
        <div class="gp-tin-skin">
            <div class="gp-header gp-thread-header gp-tin-head">
                <button class="gp-iconbtn" id="gp-back">${ic('fa-chevron-left')}</button>
                <div class="gp-title gp-title-app"><i class="fa-solid fa-fire gp-tin-flame"></i> Tinder</div>
                <button class="gp-iconbtn" id="gp-tin-me" title="Моя анкета">${ic('fa-user-pen')}</button>
                <button class="gp-iconbtn gp-tin-matchbtn" id="gp-tin-matches" title="Мэтчи">${ic('fa-comment-dots')}${badge ? `<span class="gp-app-badge">${badge}</span>` : ''}</button>
                <button class="gp-iconbtn" id="gp-tin-more" title="Ещё анкеты" ${_tinBusy ? 'disabled' : ''}>${ic(_tinBusy ? 'fa-spinner fa-spin' : 'fa-rotate')}</button>
            </div>
            <div class="gp-tin-deck">
                ${card ? `
                    ${next ? '<div class="gp-tin-card gp-tin-card-under"></div>' : ''}
                    <div class="gp-tin-card" data-tinopen="${esc(card.id)}">
                        ${tinPhotoHtml(card)}
                        <span class="gp-tin-stamp gp-tin-stamp-yes">Нравится</span>
                        <span class="gp-tin-stamp gp-tin-stamp-no">Мимо</span>
                        <div class="gp-tin-scrim">
                            <div class="gp-tin-name"><b>${esc(card.name.split(' ')[0])}</b><span>${card.age}</span></div>
                            ${card.job ? `<div class="gp-tin-job">${ic('fa-briefcase')} ${esc(card.job)}</div>` : ''}
                            ${card.bio ? `<div class="gp-tin-bio">${esc(card.bio)}</div>` : ''}
                        </div>
                    </div>` : `
                    <div class="gp-tin-empty">
                        <div class="gp-empty-icon"><i class="fa-solid fa-fire gp-tin-flame"></i></div>
                        <div class="gp-empty-title">Анкеты кончились</div>
                        <div class="gp-empty-text">Нажми ↻ — подтянутся новые люди${getTinderMe() ? '' : '.<br>Сначала лучше заполнить свою анкету'}</div>
                    </div>`}
            </div>
            <div class="gp-tin-acts">
                <button class="gp-tin-act gp-tin-act-sm" id="gp-tin-undo" title="Вернуть последнюю">${ic('fa-rotate-left')}</button>
                <button class="gp-tin-act gp-tin-act-no" id="gp-tin-no" title="Не сегодня" ${card ? '' : 'disabled'}>${ic('fa-xmark')}</button>
                <button class="gp-tin-act gp-tin-act-yes" id="gp-tin-yes" title="Нравится" ${card ? '' : 'disabled'}>${ic('fa-heart')}</button>
                <button class="gp-tin-act gp-tin-act-sm" id="gp-tin-info" title="Анкета целиком" ${card ? '' : 'disabled'}>${ic('fa-circle-info')}</button>
            </div>
            ${_tinMatch ? tinMatchHtml(_tinMatch) : ''}
        </div>`;

    screen.querySelector('#gp-back')?.addEventListener('click', () => goto('home'));
    screen.querySelector('#gp-tin-me')?.addEventListener('click', () => goto('tinme'));
    screen.querySelector('#gp-tin-matches')?.addEventListener('click', () => goto('tinmatches'));
    bindTinDraw(screen);
    screen.querySelector('#gp-tin-more')?.addEventListener('click', () => tinBusyRun(async () => {
        const t2 = getTinder();
        // Знакомый из ролевой выпадает редко: это отдельный сюжет, а не норма
        const allowKnown = Math.random() < 0.25;
        const arr = await generateTinderDeck(getTinderMe(), t2.seen.slice(-12), allowKnown);
        const n = addTinderProfiles(arr);
        if (!n) throw new Error('Никто не нашёлся — попробуй ещё раз');
        toast(`Новых анкет: ${n}`, 'fa-fire');
    }));

    const openProfile = (id) => { _tinProfileId = id; goto('tinprofile'); };
    bindTinSwipe(screen, openProfile);
    screen.querySelector('#gp-tin-info')?.addEventListener('click', () => card && openProfile(card.id));
    screen.querySelector('#gp-tin-no')?.addEventListener('click', () => card && doSwipe(card.id, 'pass'));
    screen.querySelector('#gp-tin-yes')?.addEventListener('click', () => card && doSwipe(card.id, 'like'));
    screen.querySelector('#gp-tin-undo')?.addEventListener('click', () => {
        if (!undoSwipe()) { toast('Возвращать нечего', 'fa-circle-exclamation'); return; }
        render();
    });
    bindTinMatchOverlay(screen);
}

// Свайп пальцем. Карта едет за пальцем, кренится и проявляет штамп; на
// отпускании либо улетает и засчитывается, либо возвращается на место.
// Обычный клик отличаем от свайпа по тому, сдвинулся ли палец вообще.
function bindTinSwipe(root, openProfile) {
    const card = root.querySelector('[data-tinopen]');
    if (!card) return;
    const id = card.getAttribute('data-tinopen');
    const yes = card.querySelector('.gp-tin-stamp-yes');
    const no = card.querySelector('.gp-tin-stamp-no');
    // Порог — треть ширины карты, но не меньше пальца
    const threshold = () => Math.max(90, card.offsetWidth * 0.3);
    let startX = 0, startY = 0, dx = 0, dy = 0, dragging = false, moved = false;

    const paint = () => {
        card.style.transform = `translate(${dx}px, ${dy * 0.35}px) rotate(${dx / 20}deg)`;
        const k = Math.min(1, Math.abs(dx) / threshold());
        if (yes) yes.style.opacity = dx > 0 ? String(k) : '0';
        if (no) no.style.opacity = dx < 0 ? String(k) : '0';
    };
    const reset = () => {
        card.classList.remove('gp-tin-dragging');
        card.style.transform = '';
        if (yes) yes.style.opacity = '0';
        if (no) no.style.opacity = '0';
    };

    card.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button')) return;
        dragging = true;
        moved = false;
        startX = e.clientX;
        startY = e.clientY;
        dx = 0; dy = 0;
        card.classList.add('gp-tin-dragging');
        try { card.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });
    card.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        dx = e.clientX - startX;
        dy = e.clientY - startY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) moved = true;
        paint();
    });
    const end = () => {
        if (!dragging) return;
        dragging = false;
        const dir = dx > threshold() ? 'like' : dx < -threshold() ? 'pass' : null;
        if (!dir) { reset(); return; }
        card.classList.remove('gp-tin-dragging');
        card.style.transform = `translate(${dx > 0 ? 640 : -640}px, ${dy * 0.35}px) rotate(${dx > 0 ? 26 : -26}deg)`;
        card.style.opacity = '0';
        // Даём карте улететь и только потом пересобираем экран
        setTimeout(() => doSwipe(id, dir), 190);
    };
    card.addEventListener('pointerup', end);
    card.addEventListener('pointercancel', () => { dragging = false; reset(); });
    card.addEventListener('click', (e) => {
        if (moved || e.target.closest('button')) return;
        openProfile(id);
    });
}

function doSwipe(id, dir) {
    const { matched, profile } = swipeTinder(id, dir);
    if (matched) {
        _tinMatch = profile;
        applyChatHiding();
    }
    if (currentScreen !== 'tinder') goto('tinder');
    else render();
}

function bindTinDraw(root) {
    root.querySelectorAll('[data-tindraw]').forEach(b => b.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = b.getAttribute('data-tindraw');
        const prof = id === 'me' ? getTinderMe() : findProfile(id);
        if (!prof) return;
        if (!isImageGenAvailable()) { toast('Генерация картинок не настроена', 'fa-circle-exclamation'); return; }
        const key = `tin:${id === 'me' ? 'me' : prof.id}`;
        _imgGenBusy.add(key);
        render();
        try {
            const src = await drawTinderPhoto(id === 'me' ? { ...prof, id: 'me' } : prof, id === 'me');
            if (src) {
                if (id === 'me') setTinderMePhoto(src);
                else setProfileImage(prof.id, src);
            }
        } catch (err) {
            if (!(err instanceof ImageGenCancelled)) toast(String(err?.message || err).slice(0, 70), 'fa-circle-exclamation');
        } finally {
            _imgGenBusy.delete(key);
            render();
        }
    }));
}

// Досье: то, чем модель потом играет этого человека
function tinFactsHtml(p) {
    const rows = [
        ['Кто он', p.who], ['Рост и сложение', p.build], ['Лицо и руки', p.face],
        ['Голос и вещи', p.voice], ['Темперамент и характер', p.temper],
        ['Быт, руки, еда', p.life], ['Как пишет', p.writes],
        ['Когда заинтересован', p.crush],
    ].filter(([, v]) => v);
    const hot = p.bed ? `<div class="gp-tin-fact gp-tin-fact-hot"><b>В постели</b><p>${esc(p.bed)}</p></div>` : '';
    const secret = p.secret ? `<div class="gp-tin-fact"><b>Что скрывает</b><p>${esc(p.secret)}</p></div>` : '';
    return rows.map(([k, v]) => `<div class="gp-tin-fact"><b>${esc(k)}</b><p>${esc(v)}</p></div>`).join('') + hot + secret;
}

function renderTinProfile(screen) {
    const p = findProfile(_tinProfileId);
    if (!p) { goto('tinder'); return; }
    currentScreen = 'tinprofile';
    const inDeck = getTinder().deck.some(x => x.id === p.id);
    const match = getMatches().find(x => x.id === p.id);

    screen.innerHTML = `
        <div class="gp-tin-skin">
            <div class="gp-header gp-thread-header gp-tin-head">
                <button class="gp-iconbtn" id="gp-back">${ic('fa-chevron-left')}</button>
                <div class="gp-thread-title">
                    <div class="gp-row-name">${esc(p.name)}</div>
                    <div class="gp-thread-number">${p.age} · ${p.dist} км от тебя${p.known ? ' · вы знакомы' : ''}</div>
                </div>
                <span style="width:32px"></span>
            </div>
            <div class="gp-tin-sheet">
                <div class="gp-tin-hero">
                    ${tinPhotoHtml(p)}
                    <div class="gp-tin-scrim">
                        <div class="gp-tin-name"><b>${esc(p.name.split(' ')[0])}</b><span>${p.age}</span></div>
                        ${p.job ? `<div class="gp-tin-job">${ic('fa-briefcase')} ${esc(p.job)}</div>` : ''}
                    </div>
                </div>
                <div class="gp-tin-facts">${tinFactsHtml(p)}</div>
            </div>
            ${inDeck ? `
            <div class="gp-tin-acts">
                <button class="gp-tin-act gp-tin-act-no" id="gp-tin-no">${ic('fa-xmark')}</button>
                <button class="gp-tin-act gp-tin-act-yes" id="gp-tin-yes">${ic('fa-heart')}</button>
            </div>` : match ? `
            <div class="gp-tin-composer">
                <label class="gp-tin-irl">
                    <input type="checkbox" id="gp-tin-irl" ${match.irl ? 'checked' : ''}>
                    <span>Уже знакомы вживую</span>
                </label>
                <button class="gp-primary" id="gp-tin-write">${ic('fa-comment-dots')} ${match.inApp ? 'Открыть переписку' : 'Написать в «Сообщениях»'}</button>
                ${match.inApp ? `<button class="gp-secondary" id="gp-tin-number">${ic('fa-phone')} Дать свой номер</button>` : ''}
            </div>` : ''}
        </div>`;

    // Пришли из переписки — туда и возвращаемся
    const fromThread = _tinFromThread;
    screen.querySelector('#gp-back')?.addEventListener('click', () => {
        if (fromThread) { _tinFromThread = null; currentThreadKey = fromThread; goto('thread'); return; }
        goto(inDeck ? 'tinder' : 'tinmatches');
    });
    bindTinDraw(screen);
    screen.querySelector('#gp-tin-no')?.addEventListener('click', () => doSwipe(p.id, 'pass'));
    screen.querySelector('#gp-tin-yes')?.addEventListener('click', () => doSwipe(p.id, 'like'));
    screen.querySelector('#gp-tin-irl')?.addEventListener('change', function () {
        setMatchIrl(p.id, this.checked);
        applyChatHiding();
        updatePhoneInjection();
        toast(this.checked ? 'Теперь знает тебя как обычного человека' : 'Снова знает только по анкете', 'fa-fire');
    });
    screen.querySelector('#gp-tin-write')?.addEventListener('click', () => openTinderThread(p));
    screen.querySelector('#gp-tin-number')?.addEventListener('click', () => {
        if (!confirm(`Дать ${p.name.split(' ')[0]} свой номер?\nПереписка переедет в «Сообщения».`)) return;
        giveNumberTo(p.id);
        applyChatHiding();
        updatePhoneInjection();
        toast('Номер отправлен — теперь вы в «Сообщениях»', 'fa-phone');
        render();
    });
}

// Мэтч уходит в обычную переписку: там работают смс, ммс, голосовые и память
function openTinderThread(p) {
    markMatchOpened(p.id);
    // Контакт — основа треда. У старых мэтчей его могло не быть, тогда
    // переписка просто не открывалась и юзера выкидывало в список.
    ensureMatchContact(p.id);
    updatePhoneInjection();
    currentThreadKey = keyOf(p.name);
    goto('thread');
}

function tinMatchHtml(p) {
    const me = getTinderMe();
    const myName = me?.name || getUserName();
    return `
    <div class="gp-tin-match">
        <div class="gp-tin-match-title gp-tin-flame">Это мэтч</div>
        <div class="gp-tin-match-pair">
            ${avatarHtml(myName, me?.photo || avatarForAuthor('user'), 'gp-tin-match-ava')}
            ${avatarHtml(p.name, p.image, 'gp-tin-match-ava')}
        </div>
        <div class="gp-tin-match-sub">Вы понравились друг другу. Переписка — здесь, в Тиндере: номерами вы пока не обменивались.</div>
        <div class="gp-tin-match-btns">
            <button class="gp-tin-match-go" id="gp-tin-matchgo">${ic('fa-paper-plane')} Начать разговор</button>
            <button class="gp-tin-match-skip" id="gp-tin-matchskip">Свайпать дальше</button>
        </div>
    </div>`;
}

function bindTinMatchOverlay(root) {
    root.querySelector('#gp-tin-matchgo')?.addEventListener('click', () => {
        const p = _tinMatch;
        _tinMatch = null;
        if (p) openTinderThread(p);
    });
    root.querySelector('#gp-tin-matchskip')?.addEventListener('click', () => { _tinMatch = null; render(); });
}

function renderTinMatches(screen) {
    currentScreen = 'tinmatches';
    const matches = getMatches();
    const fresh = matches.filter(m => !m.opened);
    const talked = matches.filter(m => m.opened);
    const row = (m) => `
        <div class="gp-tin-matchrow" data-tinmatch="${esc(m.id)}">
            ${avatarHtml(m.name, m.image, 'gp-tin-matchava')}
            <span class="gp-tin-matchbody">
                <b>${esc(m.name.split(' ')[0])}, ${m.age}</b>
                <span>${esc(m.job || '')}${m.irl ? ' · знакомы вживую' : ''}</span>
            </span>
            ${m.opened ? '' : '<span class="gp-tin-new">new</span>'}
            <button class="gp-iconbtn gp-danger" data-tindel="${esc(m.id)}" title="Убрать мэтч">${ic('fa-xmark')}</button>
        </div>`;
    screen.innerHTML = `
        <div class="gp-tin-skin">
            <div class="gp-header gp-thread-header gp-tin-head">
                <button class="gp-iconbtn" id="gp-back">${ic('fa-chevron-left')}</button>
                <div class="gp-title gp-title-app">Мэтчи</div>
            </div>
            <div class="gp-tin-sheet">
                ${matches.length === 0
                    ? `<div class="gp-empty"><div class="gp-empty-icon"><i class="fa-solid fa-fire gp-tin-flame"></i></div><div class="gp-empty-text">Пока пусто.<br>Лайкай — кто-то ответит взаимностью</div></div>`
                    : `${fresh.length ? `<div class="gp-tin-sect">Новые — ещё не писали</div>${fresh.map(row).join('')}` : ''}
                       ${talked.length ? `<div class="gp-tin-sect">Переписка</div>${talked.map(row).join('')}` : ''}`}
            </div>
        </div>`;
    screen.querySelector('#gp-back')?.addEventListener('click', () => goto('tinder'));
    screen.querySelectorAll('[data-tinmatch]').forEach(b => b.addEventListener('click', (e) => {
        if (e.target.closest('[data-tindel]')) return;
        _tinProfileId = b.getAttribute('data-tinmatch');
        goto('tinprofile');
    }));
    screen.querySelectorAll('[data-tindel]').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!confirm('Убрать мэтч? Контакт в «Сообщениях» останется.')) return;
        deleteMatch(b.getAttribute('data-tindel'));
        updatePhoneInjection();
        render();
    }));
}

function renderTinMe(screen) {
    currentScreen = 'tinme';
    const me = getTinderMe() || {};
    const busy = _imgGenBusy.has('tin:me');
    screen.innerHTML = `
        <div class="gp-tin-skin">
            <div class="gp-header gp-thread-header gp-tin-head">
                <button class="gp-iconbtn" id="gp-back">${ic('fa-chevron-left')}</button>
                <div class="gp-title gp-title-app">Моя анкета</div>
                <button class="gp-iconbtn" id="gp-tin-save" title="Сохранить">${ic('fa-check')}</button>
            </div>
            <div class="gp-tin-form">
                <div class="gp-tin-myphoto" id="gp-tin-mypick">
                    ${_tinMePhoto || me.photo
                        ? `<img src="${esc(_tinMePhoto || me.photo)}" alt="">
                           <button class="gp-img-regen gp-tin-regen" id="gp-tin-myregen" title="Перерисовать фото" ${busy ? 'disabled' : ''}>${ic(busy ? 'fa-spinner fa-spin' : 'fa-rotate-right')}</button>`
                        : `${ic(busy ? 'fa-spinner fa-spin' : 'fa-camera')}<span>Загрузить фото</span>`}
                </div>
                <input type="file" id="gp-tin-myfile" accept="image/*" style="display:none">
                <div class="gp-tin-row">
                    <label class="gp-field"><span>Имя</span><input type="text" id="gp-tin-name" maxlength="40" value="${esc(me.name || getUserName())}"></label>
                    <label class="gp-field gp-tin-age"><span>Возраст</span><input type="number" id="gp-tin-age" min="18" max="99" value="${me.age || 25}"></label>
                </div>
                <label class="gp-field"><span>Работа</span><input type="text" id="gp-tin-job" maxlength="80" value="${esc(me.job || '')}" placeholder="чем занимаешься"></label>
                <label class="gp-field"><span>О себе</span><input type="text" id="gp-tin-bio" maxlength="300" value="${esc(me.bio || '')}" placeholder="строчка, которую увидят первой"></label>
                <label class="gp-field"><span>Кого ищу</span><input type="text" id="gp-tin-looking" maxlength="120" value="${esc(me.looking || '')}" placeholder="кого и зачем"></label>
                <label class="gp-field"><span>Что мне нравится в постели</span><input type="text" id="gp-tin-bed" maxlength="300" value="${esc(me.bed || '')}" placeholder="видят только те, с кем мэтч"></label>
                <label class="gp-field"><span>Как я выгляжу <i>(для рисования фото)</i></span><input type="text" id="gp-tin-look" maxlength="600" value="${esc(me.look || '')}" placeholder="рост, сложение, волосы, как одеваешься"></label>
                <button class="gp-secondary" id="gp-tin-mydraw" ${busy ? 'disabled' : ''}>${ic(busy ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles')} Нарисовать фото</button>
                <div class="gp-add-hint">Это единственное, что о тебе знают до знакомства. В ролевой анкета настоящая: персонаж может на неё наткнуться.</div>
            </div>
        </div>`;

    const collect = () => ({
        name: screen.querySelector('#gp-tin-name')?.value || '',
        age: screen.querySelector('#gp-tin-age')?.value || 25,
        job: screen.querySelector('#gp-tin-job')?.value || '',
        bio: screen.querySelector('#gp-tin-bio')?.value || '',
        looking: screen.querySelector('#gp-tin-looking')?.value || '',
        bed: screen.querySelector('#gp-tin-bed')?.value || '',
        look: screen.querySelector('#gp-tin-look')?.value || '',
        photo: _tinMePhoto || me.photo || null,
    });

    screen.querySelector('#gp-back')?.addEventListener('click', () => { _tinMePhoto = null; goto('tinder'); });
    screen.querySelector('#gp-tin-save')?.addEventListener('click', () => {
        saveTinderMe(collect());
        _tinMePhoto = null;
        updatePhoneInjection();
        toast('Анкета сохранена', 'fa-fire');
        goto('tinder');
    });
    const file = screen.querySelector('#gp-tin-myfile');
    screen.querySelector('#gp-tin-mypick')?.addEventListener('click', (e) => {
        if (e.target.closest('#gp-tin-myregen')) return;
        file?.click();
    });
    file?.addEventListener('change', async () => {
        const f = file.files?.[0];
        if (!f) return;
        try {
            _tinMePhoto = await compressImage(f, 720, 0.82);
            render();
        } catch (e) { toast('Не удалось загрузить фото', 'fa-circle-exclamation'); }
    });
    const drawMine = async () => {
        const draft = saveTinderMe(collect());
        if (!draft.look) { toast('Опиши, как выглядишь', 'fa-circle-exclamation'); return; }
        if (!isImageGenAvailable()) { toast('Генерация картинок не настроена', 'fa-circle-exclamation'); return; }
        _imgGenBusy.add('tin:me');
        render();
        try {
            const src = await drawTinderPhoto({ ...draft, id: 'me' }, true);
            if (src) { setTinderMePhoto(src); _tinMePhoto = null; }
        } catch (err) {
            if (!(err instanceof ImageGenCancelled)) toast(String(err?.message || err).slice(0, 70), 'fa-circle-exclamation');
        } finally {
            _imgGenBusy.delete('tin:me');
            render();
        }
    };
    screen.querySelector('#gp-tin-mydraw')?.addEventListener('click', drawMine);
    screen.querySelector('#gp-tin-myregen')?.addEventListener('click', (e) => { e.stopPropagation(); drawMine(); });
}

// ═══ НОВОСТИ ═══

let _newsBusy = false;
let _newsCancel = false;
const pvGenerationGrace = (ms = 1100) => new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
        if (_newsCancel) return reject(Object.assign(new Error('Отменено до отправки запроса'), { name: 'PVPreflightCancelled' }));
        if (Date.now() - started >= ms) return resolve();
        setTimeout(tick, 80);
    }; tick();
});
function renderNews(screen) {
    currentScreen = 'news';
    const n = getNews();
    const rp = getRpDateTime();
    const issueDate = rp?.label || 'Хроника текущего дня';
    const issues = Array.isArray(n.issues) ? n.issues : [];
    if (typeof n.viewIssue !== 'number') n.viewIssue = Math.max(0, issues.length - 1);
    n.viewIssue = Math.max(0, Math.min(n.viewIssue, Math.max(0, issues.length - 1)));
    const issue = issues[n.viewIssue] || null;
    const items = issue?.items || [];
    const hero = items[0];
    const rest = items.slice(1, 5);
    const issueNo = issue?.seq || 0;
    setHtmlKeepScroll(screen, '.gp-news-scroll', `
        <div class="gp-header gp-thread-header gp-chronicle-head">
            <button class="gp-iconbtn" id="gp-back">${ic('fa-chevron-left')}</button>
            <div><div class="gp-title gp-title-app gp-news-title">Хроника</div><div class="gp-chronicle-kicker">СВОДКА МИРА · ${esc(issueDate)}</div></div>
            ${_newsBusy ? `<button class="gp-iconbtn gp-stopgen" id="gp-news-stop" title="Отменить до отправки запроса">${ic('fa-stop')}</button>` : `<button class="gp-iconbtn" id="gp-news-refresh" title="Свежий выпуск">${ic('fa-rotate')}</button>`}
        </div>
        <div class="gp-news-scroll gp-chronicle-scroll">
            ${items.length === 0 ? `<section class="gp-chronicle-empty">
                <div class="gp-chronicle-mast">THE WORLD CHRONICLE</div><div class="gp-chronicle-rule"></div>
                <div class="gp-chronicle-symbol">✦</div><h3>Выпуск ещё не собран</h3>
                <p>Нажми ↻ — и мир сам расскажет, что происходило за пределами твоей сцены.</p>
                <button id="gp-news-first" class="gp-chronicle-print">СОБРАТЬ СВЕЖИЙ ВЫПУСК</button>
            </section>` : `<section class="gp-chronicle-paper">
                <header class="gp-chronicle-masthead"><span>№ ${String(issueNo).padStart(2,'0')}</span><b>THE WORLD CHRONICLE</b><span>${esc(issueDate)}</span></header>${issues.length > 1 ? `<nav class="gp-chronicle-issues"><button id="gp-news-prev" ${n.viewIssue<=0?'disabled':''}>‹</button><span>ВЫПУСК ${n.viewIssue+1} / ${issues.length}</span><button id="gp-news-next" ${n.viewIssue>=issues.length-1?'disabled':''}>›</button></nav>` : ''}
                <div class="gp-chronicle-rule"></div>
                ${hero ? `<article class="gp-chronicle-lead">
                    <div class="gp-chronicle-tag">${esc(hero.tag)}</div><h2>${esc(hero.title)}</h2><p>${esc(hero.text)}</p>
                    <div class="gp-chronicle-actions"><button data-share-news="${esc(hero.id)}">${ic('fa-comment-dots')} в ролевую</button><button data-del-news="${esc(hero.id)}">${ic('fa-xmark')}</button></div>
                </article>` : ''}
                <div class="gp-chronicle-divider"><span>✦</span></div>
                <div class="gp-chronicle-columns">${rest.map((it,i)=>`<article class="gp-chronicle-brief gp-chronicle-brief-${i%4}">
                    <div class="gp-chronicle-index">${String(i+2).padStart(2,'0')}</div><div class="gp-chronicle-tag">${esc(it.tag)}</div>
                    <h3>${esc(it.title)}</h3><p>${esc(it.text)}</p><small>${esc(timeAgo(it.time))}</small>
                    <div class="gp-chronicle-actions"><button data-share-news="${esc(it.id)}">${ic('fa-comment-dots')}</button><button data-del-news="${esc(it.id)}">${ic('fa-xmark')}</button></div>
                </article>`).join('')}</div>
                <footer class="gp-chronicle-footer">Что-то здесь — факт. Что-то — версия. Всё остальное мир договорит сам.</footer>
            </section>`}
        </div>`);
    screen.querySelector('#gp-back')?.addEventListener('click', () => goto('home'));
    const refresh = async () => {
        if (_newsBusy) return;
        _newsCancel = false; _newsBusy = true; render();
        try { await pvGenerationGrace(); if (_newsCancel) throw Object.assign(new Error('Отменено'), {name:'PVPreflightCancelled'}); const added = await refreshNews(); const nn=getNews(); nn.viewIssue=Math.max(0,(nn.issues||[]).length-1); toast(`Выпуск собран: ${added} материалов`, 'fa-newspaper'); }
        catch (e) { if (e?.name === 'PVPreflightCancelled') toast('Отменено — запрос не отправлен', 'fa-circle-stop'); else toast(String(e?.message || e).slice(0, 70), 'fa-circle-exclamation'); }
        finally { _newsBusy = false; _newsCancel = false; if (currentScreen === 'news') render(); }
    };
    screen.querySelector('#gp-news-refresh')?.addEventListener('click', refresh);
    screen.querySelector('#gp-news-first')?.addEventListener('click', refresh);
    screen.querySelector('#gp-news-stop')?.addEventListener('click', () => { _newsCancel = true; });
    screen.querySelector('#gp-news-prev')?.addEventListener('click', () => { n.viewIssue = Math.max(0, n.viewIssue - 1); render(); });
    screen.querySelector('#gp-news-next')?.addEventListener('click', () => { n.viewIssue = Math.min(issues.length - 1, n.viewIssue + 1); render(); });
    screen.querySelectorAll('[data-share-news]').forEach(btn => btn.addEventListener('click', () => {
        if (shareNews(btn.getAttribute('data-share-news'))) { applyChatHiding(); toast('Ушло в ролевую — персонажи могут отреагировать', 'fa-share'); }
    }));
    screen.querySelectorAll('[data-del-news]').forEach(btn => btn.addEventListener('click', () => { deleteNews(btn.getAttribute('data-del-news')); render(); }));
}

// ═══ ЗАМЕТКИ ═══

let _noteEditId = null;
// Draft UI state lives outside renderNotes so harmless phone re-renders cannot reset
// the selected mode/sticker/marker or make the editor appear to flicker.
let _noteDraft = { mode: 'private', sticker: '✦', color: 'lilac', text: '' };
let _noteDraftFor = null;
// Планы и важные даты — вторая вкладка заметок. Дни считаются по ролевому
// времени: «сегодня» — это сегодня в истории.
let _notesTab = 'notes';
let _planMonth = '';   // какой месяц открыт
let _planDay = '';     // выбранный день

function notesTabsHtml() {
    const due = plansBadgeCount();
    return `
        <div class="gp-notes-tabs" role="tablist">
            <button class="gp-notes-tab${_notesTab === 'notes' ? ' gp-active' : ''}" data-notestab="notes">Заметки</button>
            <button class="gp-notes-tab${_notesTab === 'plans' ? ' gp-active' : ''}" data-notestab="plans">Календарь${due ? `<i>${due}</i>` : ''}</button>
        </div>`;
}

function bindNotesTabs(screen) {
    screen.querySelectorAll('[data-notestab]').forEach(b => b.addEventListener('click', () => {
        _notesTab = b.getAttribute('data-notestab');
        render(true);
    }));
}

function planRowHtml(p) {
    return `
    <div class="gp-plan${p.done ? ' gp-done' : ''}">
        <label class="gp-plan-check"><input type="checkbox" data-plantoggle="${esc(p.id)}" ${p.done ? 'checked' : ''}></label>
        <div class="gp-plan-body">
            <div class="gp-plan-text">${esc(p.text)}</div>
            <div class="gp-plan-meta">
                <span>${esc(fmtPlanDate(p.date))}${p.time ? ` · ${esc(p.time)}` : ''}</span>
                <span class="gp-plan-who">${esc(PLAN_WHO[p.who] || PLAN_WHO.user)}</span>
                ${p.source === 'rp' ? `<span class="gp-plan-src" title="Из ролевой">${ic('fa-comment')}</span>` : ''}
            </div>
        </div>
        <button class="gp-plan-visibility" data-planvisible="${esc(p.id)}" title="${p.visible === false ? 'Личное: модель не видит' : 'Для сюжета: модель учитывает'}">${p.visible === false ? '🔒' : '👁'}</button>
        ${!p.done && p.date < rpToday() ? `<button class="gp-plan-reschedule" data-planmove="${esc(p.id)}" title="Перенести на выбранную дату">↪</button>` : ''}
        <button class="gp-bank-tx-del" data-plandel="${esc(p.id)}" title="Удалить">${ic('fa-xmark')}</button>
    </div>`;
}

function renderPlans(screen) {
    currentScreen = 'notes';
    const today = rpToday();
    if (!_planDay) _planDay = today;
    if (!_planMonth) _planMonth = monthOf(_planDay);
    const cells = monthGrid(_planMonth);
    const [my, mm] = _planMonth.split('-').map(Number);
    const monthName = MONTHS_I18N[lang()][mm - 1];
    const title = `${monthName[0].toUpperCase()}${monthName.slice(1).replace(/я$/, 'ь').replace(/а$/, '')}`;
    const dayPlans = plansByDate(_planDay);
    const g = groupedPlans();
    const suggestions = getPlanSuggestions();
    const missed = g.overdue.slice(0, 12);
    const soon = [...g.overdue, ...g.today, ...g.tomorrow, ...g.week].filter(p => p.date !== _planDay).slice(0, 6);

    const week = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
    const grid = cells.map(c => `
        <button class="gp-cal-day${c.inMonth ? '' : ' gp-out'}${c.isToday ? ' gp-today' : ''}${c.iso === _planDay ? ' gp-sel' : ''}" data-calday="${c.iso}">
            <span>${c.day}</span>
            ${c.total ? `<i class="${c.open ? (c.past ? 'gp-late' : '') : 'gp-done'}"></i>` : ''}
        </button>`).join('');

    const planList = (arr, empty) => (arr.length
        ? arr.map(planRowHtml).join('')
        : `<div class="gp-cal-empty">${empty}</div>`);

    setHtmlKeepScroll(screen, '.gp-notes-scroll', `
        <div class="gp-header gp-thread-header">
            <button class="gp-iconbtn" id="gp-back">${ic('fa-chevron-left')}</button>
            <div class="gp-title gp-title-app gp-notes-title">Заметки</div>
            <span style="width:32px"></span>
        </div>
        ${notesTabsHtml()}
        <div class="gp-notes-scroll">
            <div class="gp-cal gp-cal-xii" data-month-card="${pvRoman(mm - 1)}">
                <span class="gp-cal-card-index">${pvRoman(mm - 1)}</span><span class="gp-cal-card-suit">${pvSuit(mm - 1)}</span>
                <div class="gp-cal-head">
                    <button class="gp-iconbtn" id="gp-cal-prev" title="Прошлый месяц">${ic('fa-chevron-left')}</button>
                    <b>${esc(title)} ${my}</b>
                    <button class="gp-iconbtn" id="gp-cal-next" title="Следующий месяц">${ic('fa-chevron-right')}</button>
                </div>
                <div class="gp-cal-week">${week.map(d => `<span>${d}</span>`).join('')}</div>
                <div class="gp-cal-grid">${grid}</div>
            </div>
            ${suggestions.length ? `<div class="gp-chan-section">✨ Предложено из ролевой · ${suggestions.length}</div>
                ${suggestions.slice(0, 8).map(p => `<div class="gp-plan gp-plan-suggestion"><div class="gp-plan-body"><div class="gp-plan-text">${esc(p.text)}</div><div class="gp-plan-meta">${esc(fmtPlanDate(p.date))}${p.time ? ' · ' + esc(p.time) : ''} · ${esc(PLAN_WHO[p.who] || 'вместе')}</div></div><button class="gp-primary" data-planaccept="${esc(p.id)}">✓</button><button class="gp-iconbtn" data-planreject="${esc(p.id)}" title="Отклонить">✕</button></div>`).join('')}` : ''}
            ${missed.length ? `<div class="gp-chan-section">⏳ Не решено после таймскипа · ${missed.length}</div><div class="gp-cal-empty">События не считаются произошедшими автоматически. ✓ — подтвердить, ↪ — перенести на выбранный день.</div>${missed.map(planRowHtml).join('')}` : ''}
            <div class="gp-chan-section">${_planDay === today ? 'Сегодня' : esc(fmtPlanDate(_planDay))}</div>
            ${planList(dayPlans, 'В этот день пусто')}
            <div class="gp-notes-editor gp-plan-editor">
                <input type="text" id="gp-plan-text" placeholder="Что запланировано на ${esc(fmtPlanDate(_planDay))}…">
                <div class="gp-plan-form">
                    <input type="text" id="gp-plan-time" placeholder="19:00" value="">
                    <select id="gp-plan-visible" title="Кто видит событие"><option value="yes">👁 Сюжет</option><option value="no">🔒 Личное</option></select>
                    <select id="gp-plan-who">
                        <option value="user">я</option>
                        <option value="char">он/она</option>
                        <option value="both">вместе</option>
                    </select>
                    <button class="gp-primary" id="gp-plan-add">${ic('fa-plus')} Добавить</button>
                </div>
            </div>
            ${soon.length ? `<div class="gp-chan-section">Ближайшее</div>${soon.map(planRowHtml).join('')}` : ''}
        </div>`);

    screen.querySelector('#gp-back')?.addEventListener('click', () => goto('home'));
    bindNotesTabs(screen);
    // Calendar controls: a single delegated handler survives child/icon taps and
    // avoids binding a separate listener to each dynamically generated element.
    // Use the same event channel for every action, including add/delete.
    screen.onclick = (event) => {
        if (currentScreen !== 'notes' || _notesTab !== 'plans') return;
        const button = event.target.closest('button');
        if (!button || !screen.contains(button)) return;
        if (button.id === 'gp-cal-prev' || button.id === 'gp-cal-next') {
            _planMonth = shiftMonth(_planMonth, button.id === 'gp-cal-prev' ? -1 : 1);
            render(true); return;
        }
        if (button.hasAttribute('data-calday')) {
            _planDay = button.dataset.calday;
            _planMonth = monthOf(_planDay);
            render(true); return;
        }
        if (button.id === 'gp-plan-add') {
            const value = screen.querySelector('#gp-plan-text')?.value.trim();
            if (!value) { toast('Напиши название события', 'fa-calendar'); return; }
            addPlan({ text:value, date:_planDay,
                time:screen.querySelector('#gp-plan-time')?.value,
                who:screen.querySelector('#gp-plan-who')?.value,
                visible:screen.querySelector('#gp-plan-visible')?.value !== 'no' });
            clearDraft('gp-plan-text'); clearDraft('gp-plan-time');
            updatePhoneInjection(); render(true); return;
        }
        if (button.dataset.planaccept) { acceptPlanSuggestion(button.dataset.planaccept); updatePhoneInjection(); render(true); return; }
        if (button.dataset.planreject) { dismissPlanSuggestion(button.dataset.planreject); render(true); return; }
        if (button.dataset.planvisible) {
            const p = getPlans().find(x => x.id === button.dataset.planvisible);
            if (p) { setPlanVisible(p.id, p.visible === false); updatePhoneInjection(); render(true); }
            return;
        }
        if (button.dataset.planmove) { reschedulePlan(button.dataset.planmove, _planDay); updatePhoneInjection(); render(true); return; }
        if (button.dataset.plandel) { deletePlan(button.dataset.plandel); updatePhoneInjection(); render(true); }
    };
    screen.onchange = (event) => {
        const el = event.target.closest('[data-plantoggle]');
        if (!el || currentScreen !== 'notes' || _notesTab !== 'plans') return;
        togglePlan(el.dataset.plantoggle); updatePhoneInjection(); render(true);
    };
    screen.querySelector('#gp-plan-text')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); screen.querySelector('#gp-plan-add')?.click(); }
    });
}

function renderNotes(screen) {
    currentScreen = 'notes';
    if (_notesTab === 'plans') { renderPlans(screen); return; }
    const notes = getNotes();
    const editing = _noteEditId ? notes.find(n => n.id === _noteEditId) : null;
    const modeOf = n => n.mode || (n.shared ? 'aware' : 'private');
    const modeLabel = m => m === 'aware' ? '👁 Учитывать' : m === 'todo' ? '📌 Не забыть' : '🔒 Только мне';
    setHtmlKeepScroll(screen, '.gp-notes-scroll', `
        <div class="gp-header gp-thread-header">
            <button class="gp-iconbtn" id="gp-back">${ic('fa-chevron-left')}</button>
            <div class="gp-title gp-title-app gp-notes-title">Дневник</div><span style="width:32px"></span>
        </div>
        ${notesTabsHtml()}
        <div class="gp-notes-scroll gp-journal">
            <div class="gp-journal-head"><span>MY LITTLE NOTES</span><b>мысли · планы · секреты</b></div>
            <div class="gp-notes-editor gp-paper-editor">
                <span class="gp-paper-tape"></span>
                <textarea id="gp-note-text" rows="3" placeholder="Запиши, пока не забыла…"></textarea>
                <div class="gp-note-modes">
                    <button type="button" data-note-mode="private" class="gp-note-mode gp-active">🔒 Только мне</button>
                    <button type="button" data-note-mode="aware" class="gp-note-mode">👁 Учитывать</button>
                    <button type="button" data-note-mode="todo" class="gp-note-mode">📌 Не забыть</button>
                </div>
                <button class="gp-primary" id="gp-note-save">${editing ? 'Сохранить запись' : '✎ Добавить в дневник'}</button>
                ${editing ? `<button class="gp-secondary gp-unequip" id="gp-note-cancel">Отменить правку</button>` : ''}
            </div>
            ${notes.length === 0 ? `<div class="gp-journal-empty"><i>✎</i><b>Чистая страница</b><span>Секретные записи остаются только здесь. «Учитывать» даёт нарратору короткую подсказку.</span></div>`
                : `<div class="gp-note-board">${notes.map((n,i) => { const m=modeOf(n); return `
                <article class="gp-note gp-note-${esc(n.color||'lilac')} ${m==='aware'?'gp-note-shared':''} ${n.done?'gp-done':''}" style="--note-tilt:${[-.7,.5,-.35,.65][i%4]}deg">
                    <span class="gp-note-sticker">${esc(n.sticker||'✦')}</span><span class="gp-note-tape"></span>
                    ${m==='todo'?`<button class="gp-note-check" data-note-done="${esc(n.id)}" title="Выполнено">${n.done?'✓':'○'}</button>`:''}
                    <div class="gp-note-text" data-edit-note="${esc(n.id)}">${esc(n.text)}</div>
                    <div class="gp-note-meta"><span>${modeLabel(m)} · ${esc(timeAgo(n.time))}</span>
                        <button class="gp-bank-tx-del" data-del-note="${esc(n.id)}" title="Удалить">${ic('fa-xmark')}</button></div>
                </article>`}).join('')}</div>`}
        </div>`);
    const area = screen.querySelector('#gp-note-text');
    const draftKey = editing?.id || '__new__';
    if (_noteDraftFor !== draftKey) {
        _noteDraftFor = draftKey;
        _noteDraft = editing
            ? { mode: modeOf(editing), sticker: editing.sticker || '✦', color: editing.color || 'lilac', text: editing.text || '' }
            : { mode: 'private', sticker: '✦', color: 'lilac', text: '' };
    }
    let chosenMode = _noteDraft.mode; let chosenSticker = _noteDraft.sticker; let chosenColor = _noteDraft.color;
    if (area) area.value = _noteDraft.text || '';
    area?.addEventListener('input', () => { _noteDraft.text = area.value; });
    const paint = () => {
        screen.querySelectorAll('[data-note-mode]').forEach(b => b.classList.toggle('gp-active', b.dataset.noteMode === chosenMode));
    };
    paint();
    // Simple click handlers: no touch interception, forced focus or keyboard manipulation.
    screen.querySelectorAll('[data-note-mode]').forEach(b => b.addEventListener('click', () => {
        chosenMode = b.dataset.noteMode;
        _noteDraft.mode = chosenMode;
        paint();
    }));
    screen.querySelector('#gp-back')?.addEventListener('click', () => { _noteEditId = null; goto('home'); }); bindNotesTabs(screen);
    screen.querySelector('#gp-note-save')?.addEventListener('click', () => { const text=area?.value.trim(); if(!text)return;
        if(_noteEditId){ updateNote(_noteEditId,text); updateNoteDecor(_noteEditId,{mode:chosenMode,sticker:chosenSticker,color:chosenColor}); _noteEditId=null; }
        else addNote(text,{mode:chosenMode,sticker:chosenSticker,color:chosenColor}); _noteDraftFor=null; _noteDraft={mode:'private',sticker:'✦',color:'lilac',text:''}; updatePhoneInjection(); render(true); });
    screen.querySelector('#gp-note-cancel')?.addEventListener('click',()=>{_noteEditId=null;_noteDraftFor=null;render(true);});
    screen.querySelectorAll('[data-edit-note]').forEach(el=>el.addEventListener('click',()=>{_noteEditId=el.dataset.editNote;_noteDraftFor=null;render(true);}));
    screen.querySelectorAll('[data-note-done]').forEach(b=>b.addEventListener('click',()=>{const n=getNotes().find(x=>x.id===b.dataset.noteDone); if(n) updateNoteDecor(n.id,{done:!n.done}); render(true);}));
    screen.querySelectorAll('[data-del-note]').forEach(btn=>btn.addEventListener('click',()=>{if(confirm('Удалить заметку?')){const id=btn.dataset.delNote;deleteNote(id);if(_noteEditId===id)_noteEditId=null;updatePhoneInjection();render(true);}}));
}

// ═══ СКАМ-СМС: доставка призраком ═══

export function deliverScamSms(sms) {
    if (!sms || !sms.from || !sms.text) return;
    const tag = { from: sms.from, text: sms.text };
    if (sms.shot) tag.shot = sms.shot;
    const mesText = `<!--tel:sms:${JSON.stringify(tag)}-->`;
    insertGhostReply(sms.from, mesText);
    setTimeout(() => {
        checkNewIncoming();
        updateFabBadge();
        applyChatHiding();
        if (isPhoneOpen()) render();
    }, 300);
}


// ═══ КАНАЛЫ ═══
// Свой канал и чужие: посты, реакции, просмотры, обсуждение. Отклик приходит
// двумя путями — комментами под постом и личными сообщениями в смс.

let _chanId = null;
let _chanPostId = null;
let _chanBusy = false;
let _chanCancel = false;
let _chanReplyTo = null;     // имя комментатора, которому она отвечает
let _chanDraftImage = null;  // фото к своему посту

// Канал ведёт человек: если он известен телефону, у канала его лицо —
// загруженный аватар, карточка персонажа или реф из картинко-расширения
function chanAk(ch) {
    return ch.mine ? 'user' : resolveAuthorKey(ch.author || ch.name);
}

function chanAvatar(ch, cls = 'gp-avatar gp-avatar-sm') {
    const src = ch.avatar || avatarForAuthor(chanAk(ch));
    if (src) return avatarHtml(ch.name, src, cls);
    return `<div class="${cls} gp-chan-ava" style="${avatarStyle('ch' + ch.name)}">${esc(ch.name.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase() || 'K')}</div>`;
}

function fmtSubs(n) {
    const v = Math.max(0, Math.round(n || 0));
    return v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}K` : String(v);
}

function subsLine(ch) {
    return `${fmtSubs(ch.subs)} ${plural(ch.subs, 'подписчик', 'подписчика', 'подписчиков')}`;
}

// Пост канала — входящий пузырь: медиа сверху, реакции и просмотры в подвале,
// обсуждение отрезано волоском и работает отдельной кнопкой.
// Чип над анонимкой: «тебе» — обращаются по @нику, «твой пост» — своя же
// анонимка (видно только владельцу телефона, в канале имени нет)
function anonTagHtml(post) {
    if (!post?.anon) return '';
    if (post.byUser) {
        return post.bustedBy
            ? `<span class="gp-chan-tag">${esc(post.bustedBy)} знает, что это ты</span><br>`
            : `<span class="gp-chan-tag gp-chan-tag-mine">твой пост</span><br>`;
    }
    if (anonPostToUser(post)) return `<span class="gp-chan-tag">тебе</span><br>`;
    return '';
}

// @ник внутри текста подсвечиваем — иначе обращение теряется в абзаце.
// Экранируем ДО подстановки, поэтому в разметку ничего чужого не попадёт.
function atHtml(text) {
    return esc(String(text || '')).replace(/@[A-Za-z0-9_.]{2,24}/g, m => `<span class="gp-chan-at">${m}</span>`);
}

function chanPostHtml(ch, post) {
    bumpViews(ch, post);
    const busy = _imgGenBusy.has(post.id);
    let media = '';
    if (post.image) {
        media = `<div class="gp-chan-img"><img src="${esc(post.image)}" alt="" data-zoom>
            <button class="gp-img-regen" data-chanimg="${esc(post.id)}" title="Перегенерировать фото" ${busy ? 'disabled' : ''}>${ic(busy ? 'fa-spinner fa-spin' : 'fa-rotate-right')}</button>
            ${busy ? stopGenBtn(post.id) : ''}</div>`;
    } else if (post.imgDesc) {
        media = `<button class="gp-chan-img gp-chan-img-gen" data-chanimg="${esc(post.id)}" ${busy ? 'disabled' : ''}>
            <span>${ic(busy ? 'fa-spinner fa-spin' : 'fa-image')}</span><i>${esc(post.imgDesc)}</i>${busy ? stopGenBtn(post.id) : ''}</button>`;
    }
    const reacts = (post.reacts || []).map(r => `
        <button class="gp-chan-react${r.mine ? ' gp-mine' : ''}" data-chanreact="${esc(post.id)}|${esc(r.emoji)}">${r.emoji} ${r.n}</button>`).join('');
    const n = post.comments?.length || 0;
    const canDraw = ch.mine && !post.image && !post.imgDesc && post.text;
    return `
    <div class="gp-chan-post" data-chanpost="${esc(post.id)}">
        ${media}
        <div class="gp-chan-body">
            ${post.text ? `<div class="gp-chan-text">${anonTagHtml(post)}${atHtml(post.text)}</div>` : ''}
            <div class="gp-chan-foot">
                <div class="gp-chan-reacts">${reacts}<button class="gp-chan-react gp-chan-react-add" data-chanreactadd="${esc(post.id)}">${ic('fa-plus')}</button></div>
                <span class="gp-chan-views">${ic('fa-eye')} ${fmtSubs(post.views)} · ${esc(timeAgo(post.time))}</span>
            </div>
        </div>
        <div class="gp-chan-bar${post.commentsOn ? '' : ' gp-off'}">
            ${post.commentsOn
                ? `<button class="gp-chan-comments" data-chanopen="${esc(post.id)}">
                       ${ic('fa-comment')} ${n ? `${n} ${plural(n, 'комментарий', 'комментария', 'комментариев')}` : 'Обсудить'}
                   </button>`
                : `<span class="gp-chan-comments">${ic('fa-comment-slash')} обсуждение выключено</span>`}
            <span class="gp-chan-tools">
                <button class="gp-chan-tool" data-chanshare="${esc(post.id)}" title="Отправить в лс">${ic('fa-share')}</button>
                ${canDraw ? `<button class="gp-chan-tool" data-chanimg="${esc(post.id)}" title="Нарисовать фото" ${busy ? 'disabled' : ''}>${ic(busy ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles')}</button>` : ''}
                ${ch.mine ? `<button class="gp-chan-tool" data-chantoggle="${esc(post.id)}" title="${post.commentsOn ? 'Выключить обсуждение' : 'Включить обсуждение'}">${ic(post.commentsOn ? 'fa-comment-slash' : 'fa-comment')}</button>
                <button class="gp-chan-tool gp-danger" data-chandel="${esc(post.id)}" title="Удалить пост">${ic('fa-xmark')}</button>` : ''}
            </span>
        </div>
    </div>`;
}

// Аватарка канала: своя загружается с диска, чужую можно нарисовать —
// у канала знакомого это его портрет, у новостного — эмблема по теме.
function chanAvatarSheet(ch) {
    const screen = document.getElementById('gp-screen');
    if (!screen) return;
    const overlay = document.createElement('div');
    overlay.className = 'gp-member-overlay';
    overlay.innerHTML = `
        <div class="gp-member-overlay-panel gp-chan-avasheet-panel">
            <div class="gp-member-overlay-header">
                <span>Аватарка канала</span>
                <button class="gp-iconbtn" id="gp-chanava-close">${ic('fa-xmark')}</button>
            </div>
            <div class="gp-chan-avasheet">
                <input type="file" id="gp-chanava-file" accept="image/*" style="display:none">
                <button class="gp-secondary" id="gp-chanava-pick">${ic('fa-image')} Загрузить фото</button>
                <button class="gp-primary" id="gp-chanava-draw" ${_chanBusy ? 'disabled' : ''}>${ic(_chanBusy ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles')} Нарисовать</button>
                ${ch.avatar ? `<button class="gp-secondary gp-danger" id="gp-chanava-clear">${ic('fa-trash-can')} Убрать</button>` : ''}
            </div>
        </div>`;
    screen.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector('#gp-chanava-close')?.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    const file = overlay.querySelector('#gp-chanava-file');
    overlay.querySelector('#gp-chanava-pick')?.addEventListener('click', () => file?.click());
    file?.addEventListener('change', async () => {
        const f = file.files?.[0];
        if (!f) return;
        try {
            setChannelAvatar(ch.id, await compressImage(f, 320, 0.85));
            close();
            render();
            toast('Аватарка канала обновлена', 'fa-image');
        } catch (e) { toast('Не удалось загрузить фото', 'fa-circle-exclamation'); }
    });

    overlay.querySelector('#gp-chanava-clear')?.addEventListener('click', () => {
        clearChannelAvatar(ch.id);
        close();
        render();
    });

    overlay.querySelector('#gp-chanava-draw')?.addEventListener('click', async () => {
        close();
        if (!_imgGenReady) {
            const ready = await isImageGenAvailable();
            if (!ready) { toast('Картинко-расширение не установлено — генерация недоступна', 'fa-circle-exclamation'); return; }
            _imgGenReady = true;
        }
        await chanBusyRun(async () => {
            const src = await drawChannelAvatar(ch);
            if (!src) throw new Error('Аватарка не нарисовалась');
            setChannelAvatar(ch.id, src);
            toast('Аватарка канала готова', 'fa-image');
        });
    });
}

// Канал человека рисуем портретом (реф подтянется по ak), тематический —
// эмблемой: лицо на новостном канале выглядело бы чужим аккаунтом.
function drawChannelAvatar(ch) {
    const ak = chanAk(ch);
    const person = ch.mine || !!ch.person || ak.startsWith('contact:');
    const who = ch.mine ? getUserName() : (ch.author || '');
    return generatePostImage({
        ak, kind: 'ig', aspect: '1:1',
        author: who || ch.name,
        imgDesc: person && who
            ? `${who}${ch.desc ? `. ${ch.desc}` : ''}`
            : `${ch.name}${ch.desc ? ` — ${ch.desc}` : ''}`,
        framing: person
            ? 'square profile avatar, close-up head-and-shoulders portrait, one person, clean readable face, simple unobtrusive background, no text, no watermark'
            : 'square avatar for a local channel: one characteristic object or a simple emblem, flat and readable at small size, no people, no text, no letters, no watermark',
    }, null, `chanava:${ch.id}`);
}

function renderChannels(screen) {
    currentScreen = 'chans';
    const echo = anonEnabled() ? getAnonChannel() : null;
    const echoKinds = ['СЛУХ','СЛЕД','ШЁПОТ','СВИДЕТЕЛЬСТВО','ПРЕДУПРЕЖДЕНИЕ','ОБЪЯВЛЕНИЕ','ТАЙНА'];
    const echoMarks = ['✦','⌁','◌','✎','!','◇','☾'];
    const posts = echo?.posts || [];
    const arcIds = [...new Set(posts.map(p => p.arcId || echo?.currentArc || 'arc-1'))];
    const currentArc = echo?.currentArc || arcIds[0] || 'arc-1';
    const titleOf = id => echo?.arcTitles?.[id] || (id === currentArc ? 'Текущая глава' : 'Архивная глава');
    const note = (post,i) => `<button class="gp-echo-note gp-echo-note-${i%7}" data-echopost="${esc(post.id)}"><span class="gp-echo-pin"></span><i>${echoMarks[i%echoMarks.length]}</i><b>${esc(post.kind || echoKinds[i%echoKinds.length])}</b><span>${esc(String(post.text||'').slice(0,145))}</span><small>${post.status ? `<em class="gp-echo-status">${esc(post.status)}</em>` : ''}${esc(timeAgo(post.time))}</small></button>`;
    const currentPosts = posts.filter(p => (p.arcId || currentArc) === currentArc).slice(0,8);
    const archived = arcIds.filter(id => id !== currentArc);
    const echoBoard = echo ? `<section class="gp-echo-board">
        <div class="gp-echo-boardhead"><div><div class="gp-echo-kicker">VII · WORLD WHISPERS</div><div class="gp-echo-title">Эхо</div></div><button class="gp-echo-arcnew" id="gp-echo-newarc" title="Новая арка">＋</button></div>
        <div class="gp-echo-arcbar"><span>ARC ${String(echo.arcSeq || 1).padStart(2,'0')}</span><button id="gp-echo-renamearc">${esc(titleOf(currentArc))}</button><small>${currentPosts.length} следов</small></div>
        <div class="gp-echo-grid">${currentPosts.map(note).join('') || `<button class="gp-echo-empty" id="gp-echo-awaken"><span>✦</span><b>Здесь пока тихо</b><small>Коснись — и послушаем этот мир.</small></button>`}</div>
        ${archived.length ? `<details class="gp-echo-archive"><summary>АРХИВ · ${archived.length} ${archived.length===1?'АРКА':'АРКИ'}</summary>${archived.map((id,ai)=>{const ps=posts.filter(p=>(p.arcId||'')===id);return `<details class="gp-echo-oldarc"><summary><b>ARC ${String(Math.max(1,(echo.arcSeq||1)-ai-1)).padStart(2,'0')} · ${esc(titleOf(id))}</b><span>${ps.length} следов</span></summary><div class="gp-echo-grid">${ps.slice(0,8).map(note).join('')}</div></details>`}).join('')}</details>`:''}
        <div class="gp-echo-foot">Не всё здесь правда. Но всё может оставить след.</div>
    </section>` : '';

    setHtmlKeepScroll(screen, '.gp-chan-scroll', `
        <div class="gp-header gp-thread-header gp-echo-header"><button class="gp-iconbtn" id="gp-back">${ic('fa-chevron-left')}</button><div><div class="gp-title gp-title-app">Эхо</div><div class="gp-echo-headsub">ШЁПОТ МИРА</div></div>${_chanBusy ? `<button class="gp-iconbtn gp-stopgen" id="gp-chan-stop" title="Отменить до отправки запроса">${ic('fa-stop')}</button>` : `<button class="gp-iconbtn" id="gp-chan-find" title="Послушать мир">${ic('fa-magnifying-glass')}</button>`}</div>
        <div class="gp-chan-scroll gp-echo-scroll">${echoBoard}
            <button class="gp-echo-myvoice" id="gp-echo-myvoice">${ic('fa-feather')}<span><b>Оставить свой след</b><small>анонимно · в эту арку</small></span>${ic('fa-chevron-right')}</button>
        </div>`);

    screen.querySelector('#gp-back')?.addEventListener('click', () => goto('home'));
    screen.querySelectorAll('[data-echopost]').forEach(b => b.addEventListener('click', () => {
        const post = (echo.posts || []).find(x => x.id === b.getAttribute('data-echopost'));
        if (!post) return;
        // Android/WebView-safe top layer, mirroring Scene Omens' proven dialog pattern.
        // Native <dialog>.showModal() escapes transformed/scaled PocketVerse/ST ancestors.
        const veil = document.createElement('dialog'); veil.className='gp-echo-modal';
        veil.innerHTML=`<div class="gp-echo-open"><button class="gp-echo-close">×</button><div class="gp-echo-openkind">${esc(post.kind||'СЛЕД')}</div><div class="gp-echo-opentext">${esc(post.text||'')}</div><div class="gp-echo-stamps"><button data-stamp="ВАЖНО">ВАЖНО</button><button data-stamp="ПОДТВЕРЖДЕНО">ПОДТВЕРЖДЕНО</button><button data-stamp="???">???</button><button data-stamp="ЛОЖЬ">ЛОЖЬ</button><button data-stamp="">СНЯТЬ</button></div><small>${esc(timeAgo(post.time))}</small></div>`;
        document.documentElement.appendChild(veil);
        try { veil.showModal(); } catch { veil.setAttribute('open',''); }
        const closeEcho = () => { try { veil.close?.(); } catch {} veil.remove(); };
        veil.querySelector('.gp-echo-close')?.addEventListener('click', closeEcho);
        veil.addEventListener('click',(e)=>{ if(e.target===veil) closeEcho(); });
        veil.addEventListener('cancel',(e)=>{ e.preventDefault(); closeEcho(); },{once:true});
        veil.querySelectorAll('[data-stamp]').forEach(x=>x.addEventListener('click',()=>{updateEchoPost(post.id,{status:x.getAttribute('data-stamp')});closeEcho();render();}));
    }));
    screen.querySelector('#gp-echo-myvoice')?.addEventListener('click', () => {
        const text = prompt('Какой след оставить в этой арке?');
        if (!text?.trim()) return;
        addAnonPosts([{ kind:'ЗАПИСКА', text:text.trim(), from:getUserName?.() || 'Я' }]); render(); toast('След приколот к доске','fa-thumbtack');
    });
    screen.querySelector('#gp-echo-newarc')?.addEventListener('click', () => {
        const name = prompt('Название новой арки', 'Новая глава');
        if (name === null) return;
        startEchoArc(name.trim() || 'Новая глава'); render(); toast('Новая арка открыта', 'fa-layer-group');
    });
    screen.querySelector('#gp-echo-renamearc')?.addEventListener('click', () => {
        const name = prompt('Название этой арки', titleOf(currentArc));
        if (name === null || !name.trim()) return;
        renameEchoArc(currentArc, name.trim()); render();
    });
    const awakenEcho = () => chanBusyRun(async () => {
        await new Promise((resolve, reject) => { const started=Date.now(); const tick=()=>{ if(_chanCancel) return reject(Object.assign(new Error('Отменено'),{name:'PVPreflightCancelled'})); if(Date.now()-started>=1100) return resolve(); setTimeout(tick,80); }; tick(); });
        const ch = getAnonChannel();
        const arr = await generateAnonFeed(ch.name, (ch.posts || []).slice(0, 8).map(x => x.text), getUserHandle());
        const n = addAnonPosts(arr);
        updatePhoneInjection(); applyChatHiding();
        toast(`Эхо принесло ${n} новых следов`, 'fa-wand-magic-sparkles');
    });
    screen.querySelector('#gp-chan-find')?.addEventListener('click', awakenEcho);
    screen.querySelector('#gp-echo-awaken')?.addEventListener('click', awakenEcho);
    screen.querySelector('#gp-chan-stop')?.addEventListener('click', () => { _chanCancel = true; });
}
async function chanBusyRun(fn) {
    if (_chanBusy) return;
    _chanCancel = false;
    _chanBusy = true;
    render();
    try { await fn(); }
    catch (e) { if (e?.name === 'PVPreflightCancelled') toast('Отменено — запрос не отправлен', 'fa-circle-stop'); else toast(String(e?.message || e).slice(0, 70), 'fa-circle-exclamation'); }
    finally { _chanBusy = false; _chanCancel = false; render(); }
}

function renderChannel(screen) {
    const ch = findChannel(_chanId);
    if (!ch) { goto('chans'); return; }
    currentScreen = 'chan';
    markChannelRead(ch.id);

    // Анонимка: подписки нет (канал системный), вместо неё — своя анонимка
    const composer = ch.system ? `
        <div class="gp-chan-composer">
            <button class="gp-primary" id="gp-anon-new">${ic('fa-feather')} Написать анонимно</button>
        </div>` : ch.mine ? `
        <div class="gp-chan-composer">
            ${_chanDraftImage ? `<div class="gp-sms-attach"><img src="${esc(_chanDraftImage)}" alt=""><span>Фото приложено</span><button class="gp-iconbtn gp-danger" id="gp-chan-imgclear">${ic('fa-xmark')}</button></div>` : ''}
            <textarea id="gp-chan-text" rows="2" placeholder="Написать в канал…"></textarea>
            <div class="gp-chan-composer-row">
                <input type="file" id="gp-chan-file" accept="image/*" style="display:none">
                <button class="gp-iconbtn" id="gp-chan-pick" title="Приложить фото">${ic('fa-image')}</button>
                <button class="gp-iconbtn" id="gp-chan-draw" title="Нарисовать по описанию">${ic('fa-wand-magic-sparkles')}</button>
                <button class="gp-primary" id="gp-chan-post" ${_chanBusy ? 'disabled' : ''}>${_chanBusy ? ic('fa-spinner fa-spin') : ic('fa-paper-plane')} Опубликовать</button>
            </div>
        </div>` : `
        <div class="gp-chan-composer">
            <button class="${ch.subscribed ? 'gp-secondary' : 'gp-primary'}" id="gp-chan-sub">${ic(ch.subscribed ? 'fa-bell-slash' : 'fa-bell')} ${ch.subscribed ? 'Отписаться' : 'Подписаться'}</button>
        </div>`;

    setHtmlKeepScroll(screen, '.gp-chan-scroll', `
        <div class="gp-header gp-thread-header">
            <button class="gp-iconbtn" id="gp-back">${ic('fa-chevron-left')}</button>
            <button class="gp-chan-avabtn" id="gp-chan-ava" title="Аватарка канала">${chanAvatar(ch)}</button>
            <div class="gp-thread-title">
                <div class="gp-row-name">${esc(ch.name)}</div>
                <div class="gp-thread-number">${ch.mine ? 'мой канал · ' : ''}${subsLine(ch)}${ch.author && !ch.mine ? ` · ${esc(ch.author)}` : ''}</div>
            </div>
            ${ch.mine
                ? `<button class="gp-iconbtn gp-danger" id="gp-chan-drop" title="Удалить канал">${ic('fa-trash-can')}</button>`
                : ch.system
                    ? `<button class="gp-iconbtn" id="gp-chan-refresh" title="Что там нового" ${_chanBusy ? 'disabled' : ''}>${ic(_chanBusy ? 'fa-spinner fa-spin' : 'fa-rotate')}</button>`
                    : `<button class="gp-iconbtn" id="gp-chan-refresh" title="Свежие посты" ${_chanBusy ? 'disabled' : ''}>${ic(_chanBusy ? 'fa-spinner fa-spin' : 'fa-rotate')}</button>
                   <button class="gp-iconbtn gp-danger" id="gp-chan-drop" title="Убрать канал">${ic('fa-trash-can')}</button>`}
        </div>
        <div class="gp-chan-scroll">
            ${ch.desc ? `<div class="gp-chan-desc">${esc(ch.desc)}</div>` : ''}
            ${(ch.posts || []).map(p => chanPostHtml(ch, p)).join('') || `
                <div class="gp-empty"><div class="gp-empty-icon">${ic('fa-paper-plane')}</div>
                <div class="gp-empty-text">${ch.system ? 'Нажми ↻ — город начнёт сплетничать' : ch.mine ? 'Напиши первый пост — подписчики<br>отреагируют сами' : 'Нажми ↻ — канал наполнится'}</div></div>`}
        </div>
        ${composer}`);

    screen.querySelector('#gp-back')?.addEventListener('click', () => goto('chans'));
    screen.querySelector('#gp-chan-ava')?.addEventListener('click', () => chanAvatarSheet(ch));
    bindChanPostActions(screen, ch);

    screen.querySelector('#gp-anon-new')?.addEventListener('click', () => goto('anonnew'));
    screen.querySelector('#gp-chan-refresh')?.addEventListener('click', () => chanBusyRun(async () => {
        if (ch.system) {
            const arr = await generateAnonFeed(ch.name, (ch.posts || []).slice(0, 6).map(x => x.text), getUserHandle());
            const n = addAnonPosts(arr);
            if (!n) throw new Error('Город молчит — попробуй ещё раз');
            markChannelRead(ch.id);
            toast(`Новых анонимок: ${n}`, 'fa-user-secret');
            return;
        }
        const arr = await generateChannelPosts(ch, (ch.posts || []).slice(0, 5).map(x => x.text || x.imgDesc));
        const n = addChannelPosts(ch.id, arr);
        if (!n) throw new Error('Канал молчит — попробуй ещё раз');
        markChannelRead(ch.id);
        toast(`Новых постов: ${n}`, 'fa-paper-plane');
    }));

    screen.querySelector('#gp-chan-sub')?.addEventListener('click', () => {
        const on = toggleSubscribe(ch.id);
        updatePhoneInjection();
        applyChatHiding();
        render();
        toast(on ? 'Подписка оформлена' : 'Отписались', on ? 'fa-bell' : 'fa-bell-slash');
    });

    screen.querySelector('#gp-chan-drop')?.addEventListener('click', () => {
        if (ch.mine) {
            if (!confirm('Удалить свой канал вместе со всеми постами?')) return;
            deleteMyChannel();
        } else {
            if (!confirm(`Убрать канал «${ch.name}» из телефона?`)) return;
            deleteChannel(ch.id);
        }
        updatePhoneInjection();
        applyChatHiding();
        _chanId = null;
        goto('chans');
    });

    // Фото к своему посту
    const file = screen.querySelector('#gp-chan-file');
    screen.querySelector('#gp-chan-pick')?.addEventListener('click', () => file?.click());
    file?.addEventListener('change', async () => {
        const f = file.files?.[0];
        if (!f) return;
        try {
            _chanDraftImage = await compressImage(f, 900, 0.82);
            render();
        } catch (e) { toast('Не удалось загрузить фото', 'fa-circle-exclamation'); }
    });
    screen.querySelector('#gp-chan-imgclear')?.addEventListener('click', () => { _chanDraftImage = null; render(); });
    screen.querySelector('#gp-chan-draw')?.addEventListener('click', async () => {
        const desc = (screen.querySelector('#gp-chan-text')?.value || '').trim();
        if (!desc) { toast('Сначала напиши текст поста — по нему и рисуем', 'fa-circle-exclamation'); return; }
        if (!_imgGenReady) {
            const ready = await isImageGenAvailable();
            if (!ready) { toast('Картинко-расширение не установлено — генерация недоступна', 'fa-circle-exclamation'); return; }
            _imgGenReady = true;
        }
        await chanBusyRun(async () => {
            _chanDraftImage = await generatePostImage(
                { ak: 'user', kind: 'ig', author: getUserName(), imgDesc: desc, aspect: '4:3' }, null, 'chan-draft');
            toast('Фото готово', 'fa-image');
        });
    });

    screen.querySelector('#gp-chan-post')?.addEventListener('click', async () => {
        const box = screen.querySelector('#gp-chan-text');
        const text = (box?.value || '').trim();
        if (!text && !_chanDraftImage) { toast('Пустой пост', 'fa-circle-exclamation'); return; }
        let post;
        try {
            post = publishToMyChannel({ text, image: _chanDraftImage, imgDesc: '' });
        } catch (e) { toast(String(e?.message || e).slice(0, 60), 'fa-circle-exclamation'); return; }
        _chanDraftImage = null;
        if (box) box.value = '';
        clearDraft('gp-chan-text');
        render();
        await chanBusyRun(async () => {
            const r = await generateMyChannelFeedback(ch, post);
            if (!r) throw new Error('Подписчики молчат — реакции не пришли');
            if (r.photo && !post.imgDesc) post.imgDesc = String(r.photo).slice(0, 300);
            addReacts(post, r.reactions);
            if (post.commentsOn) addComments(post, r.comments, { channel: ch });
            const delta = Math.max(-50, Math.min(300, Math.round(Number(r.new_subs) || 0)));
            if (delta) addSubs(ch, delta);
            saveMeta();
            // Журнал: описание фото уже готово, сам снимок в чат не уходит
            logSocialToChat(`${getUserName()} публикует пост в своём канале «${ch.name}»${post.text ? `: «${post.text.slice(0, 300)}»` : ''}${post.imgDesc ? ` (на фото: ${post.imgDesc})` : ''}. Подписчиков: ${ch.subs}.`);
            applyChatHiding();
            // Личка от тех, кто не стал писать при всех
            for (const dm of (Array.isArray(r.dms) ? r.dms : []).slice(0, 2)) {
                if (!dm?.from || !dm?.text) continue;
                deliverScamSms({
                    from: dm.from,
                    text: dm.text,
                    shot: { app: 'ch', id: post.id, author: ch.name, text: (post.text || post.imgDesc || '').slice(0, 200) },
                });
            }
            updatePhoneInjection();
            toast(`Пост опубликован${delta ? ` · ${delta > 0 ? '+' : ''}${delta} подписчиков` : ''}`, 'fa-paper-plane');
        });
    });
}

// Общие действия над карточкой поста (лента канала и экран обсуждения)
function bindChanPostActions(root, ch) {
    root.querySelectorAll('[data-chanreact]').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation();
        const [pid, emoji] = b.getAttribute('data-chanreact').split('|');
        toggleReact(ch.id, pid, emoji);
        render();
    }));
    root.querySelectorAll('[data-chanreactadd]').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation();
        const pid = b.getAttribute('data-chanreactadd');
        const wrap = b.parentElement;
        if (wrap?.querySelector('.gp-chan-react-picker')) { render(); return; }
        const picker = document.createElement('div');
        picker.className = 'gp-chan-react-picker';
        picker.innerHTML = CHAN_REACTS.map(x => `<button data-chanreact="${esc(pid)}|${esc(x)}">${x}</button>`).join('');
        wrap?.appendChild(picker);
        picker.querySelectorAll('[data-chanreact]').forEach(x => x.addEventListener('click', (ev) => {
            ev.stopPropagation();
            const [pid2, emoji] = x.getAttribute('data-chanreact').split('|');
            toggleReact(ch.id, pid2, emoji);
            render();
        }));
    }));
    root.querySelectorAll('[data-chanopen]').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation();
        _chanPostId = b.getAttribute('data-chanopen');
        _chanReplyTo = null;
        goto('chanpost');
    }));
    root.querySelectorAll('[data-chantoggle]').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation();
        const on = toggleComments(ch.id, b.getAttribute('data-chantoggle'));
        render();
        toast(on ? 'Обсуждение включено' : 'Обсуждение выключено', on ? 'fa-comment' : 'fa-comment-slash');
    }));
    root.querySelectorAll('[data-chandel]').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!confirm('Удалить пост из канала?')) return;
        deleteChanPost(ch.id, b.getAttribute('data-chandel'));
        render();
    }));
    root.querySelectorAll('[data-chanshare]').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation();
        const post = findChanPost(ch.id, b.getAttribute('data-chanshare'));
        if (!post) return;
        openShareSheet({ app: 'ch', id: post.id, author: ch.name, text: (post.text || post.imgDesc || '').slice(0, 200) });
    }));
    root.querySelectorAll('[data-chanimg]').forEach(b => b.addEventListener('click', async (e) => {
        e.stopPropagation();
        const post = findChanPost(ch.id, b.getAttribute('data-chanimg'));
        const imgDesc = post?.imgDesc || post?.text || '';
        if (!post || !imgDesc || _imgGenBusy.has(post.id)) return;
        if (!_imgGenReady) {
            const ready = await isImageGenAvailable();
            if (!ready) { toast('Картинко-расширение не установлено — генерация недоступна', 'fa-circle-exclamation'); return; }
            _imgGenReady = true;
        }
        _imgGenBusy.add(post.id);
        render();
        try {
            post.image = await generatePostImage(
                {
                    ak: chanAk(ch), kind: 'ig',
                    author: ch.mine ? getUserName() : (ch.author || ch.name),
                    imgDesc,
                    // Текст поста в промпт не идёт, но по нему ищутся знакомые лица
                    caption: post.text,
                    // Канал — не лента селфи: автор в кадре, только если описан
                    blog: true,
                    aspect: '4:3',
                },
                null, post.id);
            saveMeta();
            toast('Фото готово', 'fa-image');
        } catch (err) {
            if (err?.name === 'ImageGenCancelled' || err?.name === 'AbortError') toast('Генерация остановлена', 'fa-circle-stop');
            else toast(`Не получилось: ${String(err?.message || err).slice(0, 60)}`, 'fa-circle-exclamation');
        } finally {
            _imgGenBusy.delete(post.id);
            render();
        }
    }));
}

// Пробить автора: деньги настоящие, поэтому спрашиваем прямо и показываем,
// сколько на карте. Узнаёт только она — в канале ничего не меняется.
function anonBuySheet(post) {
    const screen = document.getElementById('gp-screen');
    if (!screen || !post || post.revealed) return;
    const price = anonRevealPrice();
    const overlay = document.createElement('div');
    overlay.className = 'gp-member-overlay';
    overlay.innerHTML = `
        <div class="gp-member-overlay-panel">
            <div class="gp-anon-pay">
                <b>Пробить автора</b>
                <div class="gp-anon-pay-sum">${esc(fmtMoney(price))}</div>
                <p>Админ канала сольёт, кто прислал этот пост. Узнаешь только ты — в канале ничего не изменится, и автор не поймёт, что его вычислили.</p>
                <div class="gp-anon-pay-row">
                    <button class="gp-anon-pay-no" id="gp-anonpay-no">Не надо</button>
                    <button class="gp-anon-pay-yes" id="gp-anonpay-yes">Заплатить</button>
                </div>
                <small>На карте ${esc(fmtMoney(getBank().balance))}</small>
            </div>
        </div>`;
    screen.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector('#gp-anonpay-no')?.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('#gp-anonpay-yes')?.addEventListener('click', async () => {
        const yes = overlay.querySelector('#gp-anonpay-yes');
        try {
            chargeAnonReveal(post.id);
        } catch (e) {
            toast(String(e?.message || e).slice(0, 60), 'fa-circle-exclamation');
            return;
        }
        // Имени в посте может не быть — админ «пробивает» его отдельно.
        // Деньги уже списаны, поэтому имя обязано появиться.
        let info = {};
        if (anonAuthorNeedsLookup(post.id)) {
            if (yes) { yes.disabled = true; yes.innerHTML = `${ic('fa-spinner fa-spin')} Пробиваю…`; }
            try {
                info = (await resolveAnonAuthor(ANON_NAME, post)) || {};
            } catch (e) {
                console.warn('[GlassPhone] anon author lookup failed:', e);
            }
        }
        setAnonAuthor(post.id, info);
        close();
        applyChatHiding();
        updatePhoneInjection();
        render();
        const who = findChanPost(ANON_ID, post.id)?.realAuthor;
        toast(who ? `Автор: ${who}` : 'Автора не нашли', 'fa-user-secret');
    });
}

// Шапка обсуждения анонимки: сам пост и платное вскрытие автора.
// Пока не заплачено — имени нет нигде, даже в разметке.
function anonHeadHtml(post) {
    if (!post?.anon) return '';
    const label = post.byUser ? 'анонимно · от тебя' : (anonPostToUser(post) ? 'анонимно · тебе' : 'анонимно');
    let action;
    if (post.byUser) {
        action = post.bustedBy
            ? `<div class="gp-anon-known">
                <span class="gp-anon-known-ava">${esc(String(post.bustedBy).slice(0, 1).toUpperCase())}</span>
                <span class="gp-anon-known-text">
                    <b>${esc(post.bustedBy)} тебя пробил</b>
                    <small>заплатил админу и знает, что это писала ты</small>
                </span>
            </div>`
            : `<div class="gp-anon-note">Это твой пост. Имени в канале нет — но его можно пробить за деньги, как и любой другой.</div>`;
    } else if (post.revealed) {
        const who = post.realAuthor || 'автор так и не найден';
        action = `
        <div class="gp-anon-known">
            <span class="gp-anon-known-ava">${esc(who.slice(0, 1).toUpperCase())}</span>
            <span class="gp-anon-known-text">
                <b>${esc(who)}</b>
                <small>${post.realWho ? `${esc(post.realWho)} · ` : ''}знаешь только ты</small>
            </span>
        </div>`;
    } else {
        const price = anonRevealPrice();
        const can = canAffordAnonReveal();
        action = `<button class="gp-anon-buy${can ? '' : ' gp-anon-buy-off'}" data-anonbuy="${esc(post.id)}" ${can ? '' : 'disabled'}>
            ${ic('fa-user-secret')} ${can ? 'Узнать, кто написал' : 'Не хватает денег'} — <b>${esc(fmtMoney(price))}</b>
        </button>`;
    }
    return `
    <div class="gp-anon-head">
        <div class="gp-anon-head-text"><small>${label}</small>${atHtml(post.text)}</div>
        ${action}
    </div>`;
}

// Своя анонимка. Поле «кому» ставит @ — так пост адресуется человеку,
// ровно как это делают с ней.
function renderAnonNew(screen) {
    currentScreen = 'anonnew';
    const ch = getAnonChannel();
    screen.innerHTML = `
        <div class="gp-header gp-thread-header">
            <button class="gp-iconbtn" id="gp-back">${ic('fa-chevron-left')}</button>
            <div class="gp-title gp-title-app">Написать анонимно</div>
            <span style="width:32px"></span>
        </div>
        <div class="gp-anon-write">
            <textarea id="gp-anon-text" rows="6" maxlength="900" placeholder="Что рассказать городу…"></textarea>
            <div class="gp-anon-to">
                <span>Кому (необязательно)</span>
                <input type="text" id="gp-anon-to" maxlength="24" placeholder="@ник">
            </div>
            <button class="gp-primary" id="gp-anon-send">${ic('fa-paper-plane')} Отправить в канал</button>
            <div class="gp-anon-note">
                Пост выйдет от «Анонима» — ни имени, ни ника. В ролевой это правда: слух пойдёт по городу.
                Но автора тут продают за деньги, так что при желании это могут пробить и прийти к тебе.
            </div>
        </div>`;
    screen.querySelector('#gp-back')?.addEventListener('click', () => goto('chan'));
    screen.querySelector('#gp-anon-send')?.addEventListener('click', () => {
        const text = screen.querySelector('#gp-anon-text')?.value.trim() || '';
        const to = screen.querySelector('#gp-anon-to')?.value.trim() || '';
        if (!text) { toast('Напиши текст', 'fa-circle-exclamation'); return; }
        try {
            postAnonAsUser(text, to);
            clearDraft('gp-anon-text');
            _chanId = ch.id;
            applyChatHiding();
            goto('chan');
            toast('Анонимка ушла в канал', 'fa-user-secret');
        } catch (e) {
            toast(String(e?.message || e).slice(0, 60), 'fa-circle-exclamation');
        }
    });
}

// Кого цитирует ответ: ПОСЛЕДНЮЮ реплику этого человека до текущей.
// Раньше брали первую попавшуюся, и вся ветка ссылалась на одну и ту же
// старую фразу — обсуждение читалось как каша.
function quotedFor(all, ci, replyTo) {
    if (!replyTo) return null;
    const want = keyOf(replyTo);
    for (let qi = ci - 1; qi >= 0; qi--) {
        if (keyOf(all[qi].author) === want) return all[qi];
    }
    return all.find(x => keyOf(x.author) === want) || null;
}

function renderChanPost(screen) {
    const ch = findChannel(_chanId);
    const post = ch ? findChanPost(ch.id, _chanPostId) : null;
    if (!ch || !post) { goto('chans'); return; }
    currentScreen = 'chanpost';

    // Пузыри те же, что в переписке: класс .gp-bubble тянет за собой всё
    // оформление темы, включая ширину, хвост и контраст
    const all = post.comments || [];
    const comments = all.map((c, ci) => {
        const mine = c.ak === 'user';
        const quoted = quotedFor(all, ci, c.replyTo);
        // Содержимое пузыря склеиваем без переносов: у .gp-bubble white-space
        // pre-wrap, и отступы разметки превратились бы в пустые строки в тексте
        const sender = mine ? '' : `<div class="gp-bubble-sender" style="color:${senderColor(c.author)}">${esc(c.author)}${c.handle ? ` <i>${esc(c.handle)}</i>` : ''}</div>`;
        const quote = c.replyTo
            ? `<div class="gp-chan-quote"><b>${esc(c.replyTo)}</b><span>${esc(String(quoted?.text || 'комментарий').slice(0, 70))}</span></div>`
            : '';
        const foot = `${esc(fmtTime(new Date(c.ts)))}${mine ? '' : `<button data-chanreply="${esc(c.author)}">Ответить</button>`}<button class="gp-danger" data-chancdel="${esc(c.id)}">Удалить</button>`;
        return `
        <div class="gp-bubble-wrap ${mine ? 'gp-out' : 'gp-in'}">
            <div class="gp-bubble">${sender}${quote}${esc(c.text)}</div>
            <div class="gp-bubble-time">${foot}</div>
        </div>`;
    }).join('');

    setHtmlKeepScroll(screen, '.gp-msgs', `
        <div class="gp-header gp-thread-header">
            <button class="gp-iconbtn" id="gp-back">${ic('fa-chevron-left')}</button>
            <div class="gp-thread-title">
                <div class="gp-row-name">Обсуждение</div>
                <div class="gp-thread-number">${esc((post.text || post.imgDesc || 'пост').slice(0, 40))}</div>
            </div>
            <button class="gp-iconbtn" id="gp-chan-more" title="Ещё комментарии" ${_chanBusy ? 'disabled' : ''}>${ic(_chanBusy ? 'fa-spinner fa-spin' : 'fa-rotate')}</button>
        </div>
        ${anonHeadHtml(post)}
        <div class="gp-msgs">
            ${comments || `<div class="gp-empty"><div class="gp-empty-icon">${ic('fa-comment')}</div>
                <div class="gp-empty-text">Пока тихо. Напиши первым<br>или нажми ↻</div></div>`}
        </div>
        <div class="gp-chan-composer">
            ${_chanReplyTo ? `<div class="gp-chan-replychip">${ic('fa-reply')}<span>Ответ ${esc(_chanReplyTo)}</span><button id="gp-chan-replyoff">${ic('fa-xmark')}</button></div>` : ''}
            <div class="gp-chan-composer-row">
                <textarea id="gp-chan-comment" rows="1" placeholder="Написать в обсуждение…"></textarea>
                <button class="gp-chan-send" id="gp-chan-send" ${_chanBusy ? 'disabled' : ''}>${_chanBusy ? ic('fa-spinner fa-spin') : ic('fa-paper-plane')}</button>
            </div>
        </div>`);

    screen.querySelector('#gp-back')?.addEventListener('click', () => goto('chan'));
    screen.querySelector('[data-anonbuy]')?.addEventListener('click', () => anonBuySheet(post));
    screen.querySelector('#gp-chan-replyoff')?.addEventListener('click', () => { _chanReplyTo = null; render(); });
    screen.querySelectorAll('[data-chanreply]').forEach(b => b.addEventListener('click', () => {
        _chanReplyTo = b.getAttribute('data-chanreply');
        render();
    }));
    screen.querySelectorAll('[data-chancdel]').forEach(b => b.addEventListener('click', () => {
        deleteComment(post, b.getAttribute('data-chancdel'));
        render();
    }));

    screen.querySelector('#gp-chan-more')?.addEventListener('click', () => chanBusyRun(async () => {
        const n = addComments(post, ch.system
            ? await generateAnonComments(ch.name, post)
            : await generateChannelComments(ch, post), { channel: ch });
        if (!n) throw new Error('Обсуждение молчит — попробуй ещё раз');
        toast(`Новых комментариев: ${n}`, 'fa-comment');
    }));

    screen.querySelector('#gp-chan-send')?.addEventListener('click', async () => {
        const box = screen.querySelector('#gp-chan-comment');
        const text = (box?.value || '').trim();
        if (!text) return;
        const replyTo = _chanReplyTo;
        addMyComment(post, text, replyTo);
        _chanReplyTo = null;
        if (box) box.value = '';
        clearDraft('gp-chan-comment');
        logSocialToChat(replyTo
            ? `${getUserName()} отвечает ${replyTo} в обсуждении канала «${ch.name}»: «${text}»`
            : `${getUserName()} пишет в обсуждении канала «${ch.name}» (пост «${String(post.text || post.imgDesc || '').slice(0, 60)}»): «${text}»`);
        applyChatHiding();
        render();
        await chanBusyRun(async () => {
            addComments(post, ch.system
                ? await generateAnonComments(ch.name, post, { userComment: text, replyTo })
                : await generateChannelComments(ch, post, { userComment: text, replyTo }), { channel: ch });
            applyChatHiding();
            updatePhoneInjection();
        });
    });
}

// ═══ Просмотр картинки ═══
// Тап по фото открывает его поверх всего: колесо и щипок приближают,
// перетаскивание двигает, двойной тап — туда-обратно.
function openZoom(src) {
    if (!src) return;
    document.getElementById('gp-zoom')?.remove();
    const box = document.createElement('div');
    box.id = 'gp-zoom';
    box.innerHTML = `<button class="gp-zoom-close" title="Закрыть">${ic('fa-xmark')}</button><img src="${esc(src)}" alt="">`;
    (document.getElementById('gp-overlay') || document.body).appendChild(box);

    const img = box.querySelector('img');
    let scale = 1, tx = 0, ty = 0, drag = null, pinch = null;

    // Пока смотрим картинку, страница под ней не едет
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Дальше краёв не оттащить: увеличенная картинка не должна улетать с экрана
    const clamp = () => {
        const r = img.getBoundingClientRect();
        const w = r.width / scale, h = r.height / scale;
        const maxX = Math.max(0, (w * scale - window.innerWidth) / 2);
        const maxY = Math.max(0, (h * scale - (window.visualViewport?.height || window.innerHeight)) / 2);
        tx = Math.min(maxX, Math.max(-maxX, tx));
        ty = Math.min(maxY, Math.max(-maxY, ty));
    };
    const apply = () => {
        clamp();
        img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
        box.classList.toggle('gp-zoomed', scale > 1);
    };
    // Увеличиваем В ТОЧКУ, куда смотрят пальцы или курсор, а не в центр:
    // иначе на вытянутом кадре верх уезжает за экран
    const zoomAt = (next, cx, cy) => {
        const prev = scale;
        scale = Math.min(6, Math.max(1, next));
        if (scale === prev) return;
        if (scale === 1) { tx = 0; ty = 0; apply(); return; }
        if (cx !== undefined) {
            const r = box.getBoundingClientRect();
            const px = cx - r.left - r.width / 2;
            const py = cy - r.top - r.height / 2;
            tx = px - (px - tx) * (scale / prev);
            ty = py - (py - ty) * (scale / prev);
        }
        apply();
    };

    const onKey = (e) => { if (e.key === 'Escape') close(); };
    function close() {
        document.removeEventListener('keydown', onKey);
        document.body.style.overflow = prevOverflow;
        box.remove();
    }
    document.addEventListener('keydown', onKey);
    box.addEventListener('click', (e) => { if (e.target === box) close(); });
    box.querySelector('.gp-zoom-close')?.addEventListener('click', close);

    box.addEventListener('wheel', (e) => {
        e.preventDefault();
        zoomAt(scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX, e.clientY);
    }, { passive: false });

    img.addEventListener('dblclick', (e) => {
        if (scale > 1) zoomAt(1);
        else zoomAt(2.5, e.clientX, e.clientY);
    });

    // Мышь тащит картинку; палец обрабатываем ниже своими touch-событиями,
    // иначе одно и то же движение приедет дважды
    img.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'touch' || scale <= 1) return;
        drag = { x: e.clientX - tx, y: e.clientY - ty };
        try { img.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });
    img.addEventListener('pointermove', (e) => {
        if (!drag) return;
        tx = e.clientX - drag.x;
        ty = e.clientY - drag.y;
        apply();
    });
    const dropDrag = () => { drag = null; };
    img.addEventListener('pointerup', dropDrag);
    img.addEventListener('pointercancel', dropDrag);

    // Пальцы: щипок с привязкой к середине между ними + перетаскивание одним
    const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const mid = (t) => ({ x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 });
    let pan = null;
    box.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            pan = null;
            pinch = { d: dist(e.touches), s: scale };
        } else if (e.touches.length === 1 && scale > 1) {
            pan = { x: e.touches[0].clientX - tx, y: e.touches[0].clientY - ty };
        }
    }, { passive: false });
    box.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2 && pinch) {
            e.preventDefault();
            const m = mid(e.touches);
            zoomAt(pinch.s * (dist(e.touches) / pinch.d), m.x, m.y);
            return;
        }
        if (e.touches.length === 1 && pan) {
            e.preventDefault();
            tx = e.touches[0].clientX - pan.x;
            ty = e.touches[0].clientY - pan.y;
            apply();
        }
    }, { passive: false });
    const endTouch = (e) => {
        if (e.touches.length < 2) pinch = null;
        if (e.touches.length === 0) pan = null;
    };
    box.addEventListener('touchend', endTouch, { passive: true });
    box.addEventListener('touchcancel', endTouch, { passive: true });
}

// Делегат на экран: картинки перерисовываются постоянно, слушатель нужен один
function bindZoom(screen) {
    if (screen.dataset.zoomBound) return;
    screen.dataset.zoomBound = '1';
    screen.addEventListener('click', (e) => {
        const img = e.target.closest?.('img[data-zoom]');
        if (!img) return;
        // Карточка ленты по клику открывает сам пост — там увеличение не нужно
        if (img.closest('[data-open-ig]')) return;
        e.stopPropagation();
        e.preventDefault();
        openZoom(img.getAttribute('src'));
    });
}

// ═══ Скрин поста в личку ═══
// Пересылается не картинка, а ссылка на пост: карточку телефон рисует сам,
// тап открывает исходный пост в его приложении.

const SHOT_APPS = {
    tw: { icon: 'fa-x-twitter', label: 'твиттер' },
    ig: { icon: 'fa-instagram', label: 'инстаграм' },
    st: { icon: 'fa-circle-play', label: 'сторис' },
    of: { icon: 'fa-lock', label: 'OnlyFans' },
    ch: { icon: 'fa-paper-plane', label: 'канал' },
};

// Короткая подпись скрина для видимой строки и для промпта
function shotLabel(shot) {
    const meta = SHOT_APPS[String(shot?.app || '').toLowerCase()];
    const who = shot?.author ? ` ${shot.author}` : '';
    const txt = shot?.text ? `: «${String(shot.text).slice(0, 100)}»` : '';
    return `${meta ? meta.label : 'пост'}${who}${txt}`;
}

// Что именно прислали: ищем пост по id, а если модель его выдумала — по автору
// и тексту. Не нашли — карточка останется серой заглушкой без перехода.
function resolveShot(shot) {
    if (!shot || !shot.app) return null;
    const app = String(shot.app).toLowerCase();
    const byId = (arr) => (shot.id ? arr.find(x => x.id === shot.id) : null);
    if (app === 'tw') {
        const arr = getTweets();
        return byId(arr) || matchPostByText(arr, shot.text, shot.author);
    }
    if (app === 'ig') {
        const arr = getIgPosts();
        return byId(arr) || matchPostByText(arr, shot.text, shot.author);
    }
    if (app === 'of') {
        const arr = getOfPosts();
        return byId(arr) || matchPostByText(arr, shot.text, shot.author);
    }
    if (app === 'st') {
        const arr = getStories();
        return byId(arr) || matchPostByText(arr, shot.text, shot.author);
    }
    if (app === 'ch') {
        for (const ch of allChannels()) {
            const hit = (ch.posts || []).find(x => shot.id && x.id === shot.id) || matchPostByText(ch.posts || [], shot.text, '');
            if (hit) return { ...hit, _chanId: ch.id };
        }
    }
    return null;
}

function shotHtml(m) {
    const shot = m.shot;
    if (!shot || !shot.app) return '';
    const meta = SHOT_APPS[String(shot.app).toLowerCase()] || { icon: 'fa-image', label: 'пост' };
    const found = resolveShot(shot);
    const author = shot.author || found?.author || '';
    const text = String(found?.text || found?.caption || shot.text || found?.imgDesc || '').slice(0, 220);
    const img = found?.image || null;
    // Карточка живёт внутри пузыря с white-space: pre-wrap — собираем её одной
    // строкой, иначе отступы разметки станут пустыми строками в сообщении
    const head = `<div class="gp-shot-head">${ic(meta.icon)} ${esc(meta.label)}${author ? ` · ${esc(author)}` : ''}</div>`;
    const pic = img ? `<div class="gp-shot-img"><img src="${esc(img)}" alt="" data-zoom></div>` : '';
    const body = text ? `<div class="gp-shot-text">${esc(text)}</div>` : '';
    const dead = found ? '' : `<div class="gp-shot-dead">${ic('fa-link-slash')} поста нет в телефоне</div>`;
    const link = found ? ` data-shot="${esc(JSON.stringify({ app: shot.app, id: found.id, chan: found._chanId || '' }))}"` : '';
    return `<div class="gp-shot${found ? ' gp-shot-live' : ''}"${link}>${head}${pic}${body}${dead}</div>`;
}

function openShot(raw) {
    let j = null;
    try { j = JSON.parse(raw); } catch (e) { return; }
    const app = String(j?.app || '').toLowerCase();
    if (app === 'tw') { currentTweetId = j.id; goto('twthread'); }
    else if (app === 'ig') { currentPostId = j.id; goto('igview'); }
    else if (app === 'of') { currentPostId = j.id; goto('ofview'); }
    else if (app === 'st') { goto('igstory'); }
    else if (app === 'ch') {
        _chanId = j.chan || _chanId;
        _chanPostId = j.id;
        const ch = findChannel(_chanId);
        if (ch) { markChannelRead(ch.id); goto('chan'); }
    }
}

// Выбор адресата: один контакт или групповой чат + подпись
let _shareShot = null;
let _shareTo = null;

function openShareSheet(shot) {
    if (!shot) return;
    _shareShot = shot;
    _shareTo = null;
    renderShareSheet();
}

function renderShareSheet() {
    const screen = document.getElementById('gp-screen');
    if (!screen || !_shareShot) return;
    screen.querySelector('.gp-share-overlay')?.remove();
    const threads = getThreadList();
    const overlay = document.createElement('div');
    overlay.className = 'gp-member-overlay gp-share-overlay';
    overlay.innerHTML = `
        <div class="gp-member-overlay-panel">
            <div class="gp-member-overlay-header">
                <span>Отправить в лс</span>
                <button class="gp-iconbtn" id="gp-share-close">${ic('fa-xmark')}</button>
            </div>
            <div class="gp-member-overlay-list">
                ${threads.length ? threads.map(t => `
                    <button class="gp-share-row${_shareTo === t.key ? ' gp-selected' : ''}" data-shareto="${esc(t.key)}">
                        ${t.isGroup ? `<div class="gp-avatar gp-avatar-xs gp-avatar-group">${ic('fa-users')}</div>` : avatarHtml(t.name, getContactAvatar(t.key), 'gp-avatar gp-avatar-xs')}
                        <span>${esc(t.name)}</span>
                        ${ic(_shareTo === t.key ? 'fa-circle-check' : 'fa-circle')}
                    </button>`).join('') : '<div class="gp-empty-text">Сначала заведи контакты</div>'}
            </div>
            <textarea id="gp-share-note" rows="1" placeholder="Подписать…"></textarea>
            <button class="gp-primary" id="gp-share-send" ${_shareTo ? '' : 'disabled'}>${ic('fa-paper-plane')} Отправить</button>
        </div>`;
    screen.appendChild(overlay);
    const close = () => { _shareShot = null; _shareTo = null; overlay.remove(); };
    overlay.querySelector('#gp-share-close')?.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelectorAll('[data-shareto]').forEach(b => b.addEventListener('click', () => {
        const note = overlay.querySelector('#gp-share-note')?.value || '';
        _shareTo = b.getAttribute('data-shareto');
        renderShareSheet();
        const box = document.getElementById('gp-share-note');
        if (box) box.value = note;
    }));
    overlay.querySelector('#gp-share-send')?.addEventListener('click', async () => {
        const note = (overlay.querySelector('#gp-share-note')?.value || '').trim();
        const to = _shareTo;
        const shot = _shareShot;
        close();
        if (!to || !shot) return;
        currentThreadKey = to;
        goto('thread');
        await doSend(to, { text: note, shot });
    });
}

// ═══ Удаление одного сообщения ═══
// Сообщение телефона — это тег внутри реплики чата. Вырезаем ровно его: если в
// той же реплике были другие теги или текст ролевой, она остаётся на месте, а
// уходит только этот пузырь. Опустевшая реплика (своя смс, «призрак» с ответом)
// удаляется из истории целиком.

// Видимая строка своей смс: «[СМС → Вера] привет», «[Голосовое в чат «Клуб»] …»
const OUT_LINE_RE = /^[ \t]*\[(?:СМС|SMS|Голосовое|Voice)[^\]\n]*\][^\n]*\n?/im;

// Удалить сообщение из истории. deleteMessage у ST сам убирает пузырь из ленты и
// перенумеровывает mesid — без этого applyChatHiding прятал бы чужие реплики.
async function removeChatMessage(ctx, idx) {
    const drawn = !!document.querySelector(`#chat .mes[mesid="${idx}"]`);
    if (drawn && typeof ctx.deleteMessage === 'function') {
        await ctx.deleteMessage(idx);
        return;
    }
    // Старая реплика не отрисована (лента подгружается кусками) — ST её не найдёт
    ctx.chat.splice(idx, 1);
    invalidateChatCache();
    await saveChatConditional();
    if (typeof ctx.reloadCurrentChat === 'function') await ctx.reloadCurrentChat();
}

async function deleteSmsFromChat(msg) {
    try {
        const ctx = SillyTavern.getContext();
        const chatMsg = ctx?.chat?.[msg.idx];
        if (!chatMsg || typeof chatMsg.mes !== 'string') {
            logFail('удаление смс', `нет сообщения #${msg.idx}`);
            toast('Сообщение не найдено — история изменилась', 'fa-circle-exclamation');
            return false;
        }

        let text = chatMsg.mes;
        let cut = false;
        // 1) по точному тексту тега: индексы из scanChat посчитаны по версии без
        //    <think> и съезжают, если модель писала в размышлениях
        if (msg.tagText) {
            const at = text.indexOf(msg.tagText);
            if (at !== -1) { text = text.slice(0, at) + text.slice(at + msg.tagText.length); cut = true; }
        }
        // 2) по сохранённым индексам — только если там действительно наш тег
        if (!cut && Number.isInteger(msg.tagStart) && Number.isInteger(msg.tagEnd)
            && /^<!--\s*tel:(?:sms|out):/i.test(text.slice(msg.tagStart, msg.tagEnd))) {
            text = text.slice(0, msg.tagStart) + text.slice(msg.tagEnd);
            cut = true;
        }
        // 3) тег переписали после скана (реакция, дорисованное фото) — ищем по содержимому
        if (!cut) {
            const re = msg.dir === 'out'
                ? /<!--\s*tel:out:(\{[\s\S]*?\})\s*-->/gi
                : /<!--\s*tel:sms:(\{[\s\S]*?\})\s*-->/gi;
            const hit = [...text.matchAll(re)].find(x => {
                let j = null;
                try { j = JSON.parse(x[1]); } catch (e) { return false; }
                const sameText = String(j.text || '') === String(msg.text || '');
                return msg.dir === 'out' ? sameText : (keyOf(j.from || '') === keyOf(msg.from || '') && sameText);
            });
            if (hit) { text = text.slice(0, hit.index) + text.slice(hit.index + hit[0].length); cut = true; }
        }
        if (!cut) {
            logFail('удаление смс', 'тег не найден (правка/свайп?)');
            toast('Не нашла это сообщение в истории', 'fa-circle-exclamation');
            return false;
        }

        // Своя смс: вместе с маркером уходит и видимая строка — она и есть пузырь
        if (msg.dir === 'out') text = text.replace(OUT_LINE_RE, '');

        text = text.replace(/\n{3,}/g, '\n\n').trim();
        // В реплике мог быть не один пузырь: «призрак» с ответами часто держит
        // несколько тегов, и соседние удалять нельзя
        const otherTags = /<!--\s*tel:(?:sms|out):/i.test(text);
        const visible = text.replace(/<!--[\s\S]*?-->/g, '').trim();

        if (!otherTags && !visible) {
            await removeChatMessage(ctx, msg.idx);
            logOk('удаление смс', `сообщение #${msg.idx} целиком`);
        } else {
            chatMsg.mes = text;
            invalidateChatCache();
            await saveChatConditional();
            logOk('удаление смс', `тег в #${msg.idx}`);
        }
        invalidateChatCache();
        return true;
    } catch (e) {
        console.error('[GlassPhone] deleteSmsFromChat failed:', e);
        logFail('удаление смс', String(e?.message || e));
        toast('Не удалось удалить', 'fa-circle-exclamation');
        return false;
    }
}

// ═══ Отправка смс ═══

// «Призрак»: вставка ответа в чат БЕЗ генерации через основной пайплайн —
// is_system:true на 1.5с, чтобы ExtBlocks/JS Runner не триггерились,
// потом флаг снимается и сообщение живёт в контексте модели как обычное.
async function insertGhostReply(name, mesText, chatName = '') {
    // Legacy call-site compatibility, but NO ghost is inserted anymore.
    // Quiet phone output is parsed and stored only in PocketVerse metadata.
    const accepted = ingestQuietPhoneReply(mesText, name, chatName);
    console.info('[PocketVerse] quiet phone reply', { accepted, chars: String(mesText || '').length, isolated: true });
    if (!accepted && String(mesText || '').trim() && !/<!--\s*tel:silent\s*-->/i.test(String(mesText))) {
        toast('Телефонный ответ не распознан · RP-чат не изменён', 'fa-shield-halved');
    }
    invalidateChatCache();
    return accepted;
}

// opts: {text, shot} — так уходит пересланный скрин поста (адресата и подпись
// выбирают в шторке, поле ввода треда при этом не участвует)
async function sendUserGiphy(key, g) {
    if (sending || !g?.url) return;
    const t=getThread(key); if(!t) return;
    const name=t.name||key, isGroup=!!t.isGroup;
    // Media selection is LOCAL ONLY. Never call the LLM on a tap: user explicitly
    // decides when to spend context/tokens with ✨, same contract as the text ladder.
    addLocalSms({dir:'out', name, chat:isGroup?name:'', text:'', gif:g.url, meme:g.title||'', mediaKind:g.kind||'gif'});
    pvQueueMedia(key, g.kind||'gif', g.title||'reaction');
    toast('GIF отправлена локально · ✨ когда захочешь ответ персонажа', 'fa-wand-magic-sparkles');
    render(); updateFabBadge();
}

function pvPhoneRawPrompt(t, items, isGroup = false) {
    const st = getSettings();
    const mode = String(st.brainMode || 'balanced');
    const ctx = SillyTavern.getContext?.() || {};
    const user = String(ctx?.name1 || 'User');
    const charName = String(t?.name || ctx?.name2 || 'Character');
    const esc = v => String(v ?? '').replace(/\s+/g, ' ').trim();

    // Controlled phone context. Unlike generateQuietPrompt, generateRaw receives only
    // the context we deliberately assemble here; the whole RP transcript is not copied in.
    let card = '';
    try {
        const cid = ctx.characterId;
        const ch = (Array.isArray(ctx.characters) && cid != null) ? ctx.characters[cid] : null;
        if (ch) card = [ch.name, ch.description, ch.personality, ch.scenario, ch.mes_example]
            .filter(Boolean).map(String).join('\n\n');
    } catch(e) {}

    const cfg = mode === 'lite'
        ? { card: 1400, rpMsgs: 0, rpEach: 0, sms: 8, smsChars: 1800, out: 1100 }
        : mode === 'deep'
            ? { card: 9000, rpMsgs: 10, rpEach: 1100, sms: 24, smsChars: 5200, out: 1400 }
            : { card: 5000, rpMsgs: 5, rpEach: 900, sms: 14, smsChars: 3400, out: 1200 };

    card = card.slice(0, cfg.card);
    const rp = cfg.rpMsgs ? (Array.isArray(ctx.chat) ? ctx.chat.slice(-cfg.rpMsgs) : [])
        .map(m => `${m?.is_user ? user : (ctx?.name2 || charName)}: ${esc(m?.mes).slice(0,cfg.rpEach)}`)
        .join('\n') : '';
    const sms = (Array.isArray(t?.messages) ? t.messages.slice(-cfg.sms) : [])
        .map(m => `${m?.dir === 'out' ? user : (m?.from || charName)}: ${esc(m?.text || m?.memeQuery || (m?.gifUrl ? '[GIF]' : ''))}`)
        .join('\n').slice(-cfg.smsChars);
    const custom = esc(st.phoneCustomInstructions || '').slice(0, mode === 'lite' ? 260 : 700);
    const mediaRule = st.phoneMemes ? 'You may naturally add "meme":"short English GIPHY search phrase" when a GIF/meme reaction fits; do not force it.' : '';
    const photoRule = st.phonePhotos !== false ? 'You may add "photo":"short visual description" when a photo is genuinely natural.' : '';
    const groupRule = st.phoneGroups !== false ? 'For groups, every tag must contain "chat":"Group name" and the real sender in "from".' : '';
    const incoming = items.map((x,i)=>`${i+1}. ${x}`).join('\n');
    // Direct selfie/photo requests are commands, not a probabilistic "maybe photo" hint.
    // Keep this local/deterministic so a model cannot spend 300 thinking tokens deciding
    // whether "пришли селфи" really means "send a selfie".
    // A user can send a ladder like: "пришли селфи" -> "жду" and only then press ✨.
    // In that case `items` contains only the final "жду", so looking at `incoming` alone loses
    // the actual media command. Include all still-unanswered outgoing SMS since the last inbound.
    const recentMsgs = Array.isArray(t?.messages) ? t.messages : [];
    let lastInbound = -1;
    for (let i = recentMsgs.length - 1; i >= 0; i--) {
        if (recentMsgs[i]?.dir === 'in') { lastInbound = i; break; }
    }
    const unansweredUserText = recentMsgs.slice(lastInbound + 1)
        .filter(m => m?.dir === 'out')
        .map(m => esc(m?.text || ''))
        .filter(Boolean)
        .join(' | ')
        .slice(-1800);
    const photoIntentText = `${unansweredUserText} | ${incoming}`;
    const directPhotoRequest = /(?:пришл|скин|отправ|давай|сделай|сфот|фоткай|покаж)(?:[\s\S]{0,45})(?:селфи|фото|фотк|снимок)|(?:send|show|take|snap)(?:[\s\S]{0,35})(?:selfie|photo|pic|picture)/iu.test(photoIntentText);
    const forcedPhotoRule = directPhotoRequest && st.phonePhotos !== false
        ? `DIRECT PHOTO REQUEST DETECTED. You MUST send a photo in this reply. Do not merely promise it. At least one tel:sms tag MUST contain both "photo" and "media". If the user asked for your selfie, media.type="selfie", media.sender="${charName}", media.visible MUST include "${charName}", media.camera="front camera selfie". Preserve the exact CURRENT RP location, clothing/state, nearby visible people, action and environment anchors. Example SHAPE only: <!--tel:sms:{"from":"${charName}","text":"short in-character caption","photo":"concrete selfie shot","media":{"type":"selfie","sender":"${charName}","visible":["${charName}"],"camera":"front camera selfie","location":"current RP location","clothing":{"${charName}":"current clothing"},"action":"visible action","pose":"pose","expression":"expression","gaze":"gaze","environment":"established anchors","continuity":"temporary visual facts"}}-->`
        : '';

    const prompt = `PRIVATE PHONE GENERATION. This is an isolated PocketVerse request, not prose RP.\n`+
        `User: ${user}\nContact: ${charName}${isGroup ? `\nGroup members: ${(t?.members||[]).join(', ')}` : ''}\n`+
        (card ? `\nCHARACTER CARD EXCERPT:\n${card}\n` : '')+
        (rp ? `\nRECENT RELEVANT RP EXCERPT:\n${rp}\n` : '')+
        (sms ? `\nRECENT PHONE CHAT:\n${sms}\n` : '')+
        `\nNEW ITEMS FROM ${user}:\n${incoming}\n\n`+
        `Reply naturally in character like real texting. Usually 1-3 short bubbles; maximum 4. No narration. `+
        `Output ONLY hidden tags: <!--tel:sms:{"from":"Name","text":"..."}-->. `+
        `${groupRule} ${mediaRule} ${photoRule} ${forcedPhotoRule} `+
        `IMPORTANT: spend tokens on the FINAL hidden tags, not analysis. Close every JSON object and every --> tag before stopping. `+
        `Never output NPC-to-NPC private messages unless this is a group containing ${user}. Never output HeartPulse/state/reasoning. `+
        (custom ? `Phone preference: ${custom}` : '');
    return { prompt, responseLength: cfg.out, mode };
}

async function pvGeneratePhoneReply(t, items, isGroup = false) {
    const req = pvPhoneRawPrompt(t, items, isGroup);
    console.info('[PocketVerse] controlled phone request', { mode:req.mode, chars:req.prompt.length, approxTokens:Math.round(req.prompt.length/4), responseLength:req.responseLength });
    let raw = await generateRaw({ prompt:req.prompt, responseLength:req.responseLength, trimNames:false });
    // Gemini may consume much of responseLength as hidden thinking and truncate the
    // only tel:sms tag. Retry once with a compact repair request instead of showing
    // "phone reply not recognized" after the user waited for generation.
    const hasCompleteTag = /<!--\s*tel:sms:\{[\s\S]*?\}\s*-->/i.test(String(raw||''));
    if (!hasCompleteTag) {
        console.warn('[PocketVerse] phone reply truncated/unparseable; compact retry');
        const ctx = SillyTavern.getContext?.() || {};
        const name = String(t?.name || ctx?.name2 || 'Character');
        const user = String(ctx?.name1 || 'User');
        const incoming = items.map(x=>String(x||'')).join(' | ').slice(-1200);
        const recentMsgs = Array.isArray(t?.messages) ? t.messages : [];
        let lastInbound = -1;
        for (let i = recentMsgs.length - 1; i >= 0; i--) { if (recentMsgs[i]?.dir === 'in') { lastInbound = i; break; } }
        const unanswered = recentMsgs.slice(lastInbound + 1).filter(m=>m?.dir === 'out').map(m=>String(m?.text||'')).join(' | ').slice(-1800);
        const directPhoto = /(?:пришл|скин|отправ|давай|сделай|сфот|фоткай|покаж)(?:[\s\S]{0,45})(?:селфи|фото|фотк|снимок)|(?:send|show|take|snap)(?:[\s\S]{0,35})(?:selfie|photo|pic|picture)/iu.test(`${unanswered} | ${incoming}`);
        const repair = `POCKETVERSE PHONE REPAIR. Output ONLY 1-3 complete <!--tel:sms:{...}--> tags. No analysis, markdown or prose. Sender=${name}; recipient=${user}. New user message: ${incoming}. `+
            (directPhoto ? `The user directly requested a selfie/photo: the reply MUST include photo plus media. For selfie use media={"type":"selfie","sender":"${name}","visible":["${name}"],"camera":"front camera selfie","location":"preserve current RP location","clothing":{"${name}":"preserve current clothing"},"action":"selfie action","pose":"natural selfie pose","expression":"in-character expression","gaze":"at phone camera","environment":"preserve established RP anchors","continuity":"do not move scene"}. ` : '')+
            `Close JSON and --> before stopping.`;
        raw = await generateRaw({ prompt:repair, responseLength:1400, trimNames:false });
    }
    return raw;
}


// ── PocketVerse Video Circle Drafts ──────────────────────────────────────────
// Stage 1 is deliberately planning-only: the language model may draft WHAT the
// character would record, but no paid video provider is contacted until the user
// explicitly chooses one in the approval sheet. Provider transport is added in
// the next stage, keeping paid generation impossible by accident.
function pvExtractJsonObject(raw) {
    const text = String(raw || '').replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
    // Gemini/other phone models sometimes prepend a short explanation before the JSON,
    // or even return more than one brace block. Try every balanced object instead of
    // taking first "{" through last "}", which made a valid draft look invalid.
    const candidates = [];
    let depth = 0, start = -1, inString = false, escaped = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inString) {
            if (escaped) escaped = false;
            else if (ch === '\\') escaped = true;
            else if (ch === '"') inString = false;
            continue;
        }
        if (ch === '"') { inString = true; continue; }
        if (ch === '{') { if (depth === 0) start = i; depth++; }
        else if (ch === '}' && depth > 0) {
            depth--;
            if (depth === 0 && start >= 0) { candidates.push(text.slice(start, i + 1)); start = -1; }
        }
    }
    for (let i = candidates.length - 1; i >= 0; i--) {
        try {
            const obj = JSON.parse(candidates[i]);
            if (obj && typeof obj === 'object' && (obj.speech || obj.scene || obj.speaker)) return obj;
        } catch (_) {}
    }
    return null;
}

async function pvPlanVideoCircle(t) {
    const ctx = SillyTavern.getContext?.() || {};
    const user = String(ctx?.name1 || 'User');
    const name = String(t?.name || ctx?.name2 || 'Character');
    const recentSms = (Array.isArray(t?.messages) ? t.messages.slice(-8) : [])
        .map(m => `${m?.dir === 'out' ? user : (m?.from || name)}: ${String(m?.text || '').replace(/\s+/g,' ').trim()}`)
        .filter(x => !x.endsWith(': ')).join('\n').slice(-1800);
    const recentRp = (Array.isArray(ctx?.chat) ? ctx.chat.slice(-3) : [])
        .map(m => `${m?.is_user ? user : (ctx?.name2 || name)}: ${String(m?.mes || '').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,700)}`)
        .join('\n');
    let card='';
    try {
        const ch = Array.isArray(ctx.characters) && ctx.characterId != null ? ctx.characters[ctx.characterId] : null;
        if (ch) card=[ch.name,ch.description,ch.personality].filter(Boolean).join('\n').slice(0,1600);
    } catch(_) {}
    const prompt = `PRIVATE POCKETVERSE VIDEO-CIRCLE DRAFT. Do NOT roleplay prose. Plan one short Telegram-like round video message that ${name} could naturally record for ${user} RIGHT NOW.\n`+
        `The spoken line must sound exactly like the character and fit a very short round video. Aim for about 4-8 seconds of natural speech (Veo reference-video is 8 seconds; Grok can be longer later), and use the language from the recent phone chat. Do not invent a dramatic event just to justify video.\n`+
        `SCENE CONTINUITY IS STRICT: RECENT RP is the authority for physical location, nearby people, clothing and ongoing action. The phone chat may suggest speech/tone but MUST NOT move the character to a new place or invent walking/travel. If RECENT RP says library/fireplace, the video stays there.\n`+
        `The scene must describe only visible/actionable video facts: sender, CURRENT RP location, current clothing if known, phone-camera framing, pose/action, expression/gaze, and any NPC visibly present. Preserve exact character/NPC names. Never invent an NPC merely to fill the frame.\n`+
        `Return ONLY JSON with keys: speaker, speech, scene, visibleCharacters. visibleCharacters is an array of exact names.\n\n`+
        (card ? `CHARACTER CARD EXCERPT:\n${card}\n\n` : '')+
        (recentRp ? `RECENT RP:\n${recentRp}\n\n` : '')+
        (recentSms ? `RECENT PHONE CHAT:\n${recentSms}\n` : '');
    // Gemini thinking tokens count against the output budget. 320 was too small:
    // the model could spend the whole budget thinking and truncate the JSON.
    // Keep the context compact and leave enough room for thinking + the tiny JSON.
    let raw = await generateRaw({prompt, responseLength:720, trimNames:false});
    let j = pvExtractJsonObject(raw);
    // One resilient retry only when the first answer was truncated/unparseable.
    // The retry deliberately contains no RP/card dump: it asks for the same tiny draft
    // from a compact summary, so we don't repeatedly pay for a huge context.
    if (!j) {
        const retryPrompt = `POCKETVERSE VIDEO-CIRCLE JSON RETRY. Output ONLY one valid JSON object, no analysis, markdown or prose.\n`+
            `Keys: speaker, speech, scene, visibleCharacters.\n`+
            `Speaker: ${name}. Recipient: ${user}. Speech must be natural and short (4-8 seconds), in the phone-chat language. Scene: only visible camera facts. Do not invent NPCs.\n`+
            (recentSms ? `Recent phone chat:\n${recentSms.slice(-1200)}\n` : '')+
            `JSON now:`;
        raw = await generateRaw({prompt:retryPrompt, responseLength:900, trimNames:false});
        j = pvExtractJsonObject(raw);
    }
    if (!j) throw new Error('Модель снова оборвала JSON — попробуй ещё раз');
    return {
        speaker: String(j.speaker || name).trim().slice(0,80),
        speech: String(j.speech || '').trim().slice(0,500),
        scene: String(j.scene || '').trim().slice(0,1200),
        visibleCharacters: Array.isArray(j.visibleCharacters) ? j.visibleCharacters.map(x=>String(x).trim()).filter(Boolean).slice(0,8) : [name],
    };
}

function pvSleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
async function pvImageToDataUrl(src){
    src=String(src||'').trim(); if(!src) return '';
    if(src.startsWith('data:')) return src;
    const r=await fetch(src); if(!r.ok) throw new Error(`Не удалось прочитать референс (${r.status})`);
    const b=await r.blob();
    return await new Promise((ok,bad)=>{const fr=new FileReader();fr.onload=()=>ok(String(fr.result||''));fr.onerror=bad;fr.readAsDataURL(b);});
}
function pvDataParts(data){ const m=String(data||'').match(/^data:([^;]+);base64,(.+)$/); return m?{mime:m[1],data:m[2]}:null; }
async function pvCircleRefs(t,draft){
    const ctx=SillyTavern.getContext?.()||{}; const user=String(ctx?.name1||'User'); const out=[];
    for(const n0 of (draft.visibleCharacters||[]).slice(0,3)){
        const n=String(n0||'').trim(); if(!n) continue;
        let src='';
        if(n.toLowerCase()===user.toLowerCase()) src=getUserAvatar?.()||'';
        else src=getContactAvatar(keyOf(n))||'';
        if(!src && n.toLowerCase()===String(t?.name||'').toLowerCase()) src=getContactAvatar(t.key)||'';
        if(src){ try{ const d=await pvImageToDataUrl(src); if(d) out.push({name:n,dataUrl:d}); }catch(e){console.warn('[PocketVerse] circle ref skipped',n,e);} }
    }
    return out;
}
function pvCircleIdentityText(t){
    const ctx=SillyTavern.getContext?.()||{};
    try{
        const ch=Array.isArray(ctx.characters)&&ctx.characterId!=null?ctx.characters[ctx.characterId]:null;
        if(ch && String(ch.name||'').toLowerCase()===String(t?.name||'').toLowerCase()){
            return String(ch.description||ch.data?.description||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,1800);
        }
    }catch(_){}
    return '';
}
function pvCirclePrompt(draft,t){
    const identity=pvCircleIdentityText(t);
    return `Vertical 9:16 Telegram-style selfie video message. STRICT CONTINUITY: do not change location, outfit, cast, or visual identity.\nSCENE: ${draft.scene}\n`+
      (identity?`CHARACTER IDENTITY/CARD (use only visual traits that apply to ${draft.speaker}): ${identity}\n`:'')+
      `REFERENCE IMAGE IS THE PRIMARY VISUAL AUTHORITY. Preserve the same character, face, hair, eye appearance and the SAME ART/VISUAL STYLE as the reference. Do NOT convert an illustrated/anime reference into a photorealistic human.\n`+
      `Spoken dialogue in Russian, natural synchronized speech: "${draft.speech}"\nNatural phone-camera motion and facial/lip motion. Do not add subtitles or on-screen text.`;
}
async function pvPollJson(url,headers,tries=90){
    for(let i=0;i<tries;i++){ const r=await fetch(url,{headers}); const j=await r.json().catch(()=>({})); if(!r.ok) throw new Error(j?.error?.message||`HTTP ${r.status}`); if(j.done||j.status==='done'||j.status==='failed') return j; await pvSleep(5000); }
    throw new Error('Видео слишком долго генерируется');
}
async function pvGenerateGrokCircle(key,draft,refs){
    const body={model:'grok-imagine-video-1.5',prompt:pvCirclePrompt(draft,null),duration:8,aspect_ratio:'9:16',resolution:'720p'};
    if(refs.length) body.reference_images=refs.slice(0,7).map(x=>({url:x.dataUrl}));
    const r=await fetch('https://api.x.ai/v1/videos/generations',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
    const j=await r.json().catch(()=>({})); if(!r.ok) throw new Error(j?.error?.message||`Grok HTTP ${r.status}`);
    const id=j.request_id||j.id; if(!id) throw new Error('Grok не вернул request_id');
    const done=await pvPollJson(`https://api.x.ai/v1/videos/${encodeURIComponent(id)}`,{Authorization:`Bearer ${key}`});
    if(done.status==='failed') throw new Error(done?.error?.message||'Grok: генерация не удалась');
    const url=done?.video?.url; if(!url) throw new Error('Grok не вернул видео'); return url;
}
async function pvGenerateVeoCircle(key,draft,refs){
    const inst={prompt:pvCirclePrompt(draft,draft._thread)};
    if(refs.length) inst.referenceImages=refs.slice(0,3).map(x=>{const q=pvDataParts(x.dataUrl);return q?{image:{mimeType:q.mime,bytesBase64Encoded:q.data},referenceType:'asset'}:null;}).filter(Boolean);
    const body={instances:[inst],parameters:{aspectRatio:'9:16',durationSeconds:8,resolution:'720p'}};
    const base='https://generativelanguage.googleapis.com/v1beta';
    const r=await fetch(`${base}/models/veo-3.1-fast-generate-preview:predictLongRunning`,{method:'POST',headers:{'x-goog-api-key':key,'Content-Type':'application/json'},body:JSON.stringify(body)});
    const j=await r.json().catch(()=>({})); if(!r.ok) throw new Error(j?.error?.message||`Veo HTTP ${r.status}`); if(!j.name) throw new Error('Veo не вернул operation');
    const done=await pvPollJson(`${base}/${j.name}`,{'x-goog-api-key':key},120);
    if(done.error) throw new Error(done.error.message||'Veo: генерация не удалась');
    const uri=done?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri; if(!uri) throw new Error('Veo не вернул видео');
    const vr=await fetch(uri,{headers:{'x-goog-api-key':key}}); if(!vr.ok) throw new Error(`Veo download HTTP ${vr.status}`); return URL.createObjectURL(await vr.blob());
}
function pvOpenVideoCircleSheet(screen, t, draft) {
    screen.querySelector('.gp-video-circle-overlay')?.remove();
    const overlay=document.createElement('div'); overlay.className='gp-video-circle-overlay';
    overlay.innerHTML=`<div class="gp-video-circle-sheet">
      <div class="gp-video-circle-head"><b>⭕ Кружочек · черновик</b><button class="gp-iconbtn" data-vc-close>${ic('fa-xmark')}</button></div>
      <small>Проверь речь и сцену. Платный запрос уйдёт только после финальной кнопки «Сгенерировать».</small>
      <label>Кто записывает<input data-vc-speaker value="${esc(draft.speaker)}"></label>
      <label>Что говорит<textarea data-vc-speech rows="3">${esc(draft.speech)}</textarea></label>
      <label>Что видно в видео<textarea data-vc-scene rows="5">${esc(draft.scene)}</textarea></label>
      <div class="gp-video-circle-cast"><b>В кадре:</b> ${draft.visibleCharacters.length ? draft.visibleCharacters.map(esc).join(', ') : esc(draft.speaker)}</div>
      <div class="gp-video-circle-models"><button class="gp-primary" data-vc-model="grok">Grok Video</button><button class="gp-primary" data-vc-model="veo">Gemini Veo</button></div>
      <div class="gp-video-circle-confirm" hidden></div><div class="gp-video-circle-status">Выбери модель, когда черновик устраивает.</div>
    </div>`; screen.appendChild(overlay);
    const close=()=>overlay.remove(); overlay.querySelector('[data-vc-close]')?.addEventListener('click',close); overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
    const liveDraft=()=>({speaker:String(overlay.querySelector('[data-vc-speaker]')?.value||draft.speaker),speech:String(overlay.querySelector('[data-vc-speech]')?.value||''),scene:String(overlay.querySelector('[data-vc-scene]')?.value||''),visibleCharacters:draft.visibleCharacters,_thread:t});
    overlay.querySelectorAll('[data-vc-model]').forEach(btn=>btn.addEventListener('click',()=>{
        const provider=btn.dataset.vcModel; const st=getSettings(); const isV=provider==='veo'; const box=overlay.querySelector('.gp-video-circle-confirm');
        box.hidden=false; box.innerHTML=`<b>${isV?'Gemini Veo 3.1 Fast':'Grok Imagine Video 1.5'}</b><small>8 сек · 9:16 · 720p · со звуком</small><div class="gp-video-circle-audit" data-vc-audit>Собираю БЕСПЛАТНЫЙ предпросмотр запроса…</div><label>API key<input type="password" data-vc-key autocomplete="off" placeholder="${isV?'Gemini API key':'xAI API key'}" value="${esc(isV?(st.videoGeminiApiKey||''):(st.videoGrokApiKey||''))}"></label><label class="gp-video-circle-check"><input type="checkbox" data-vc-check> Я проверила сцену, внешность и референс</label><button class="gp-primary gp-video-circle-go" data-vc-go disabled>Сгенерировать · платный запрос</button><small>Пока галочка не поставлена, платный API-вызов технически заблокирован.</small>`;
        const go=box.querySelector('[data-vc-go]'); const check=box.querySelector('[data-vc-check]'); const audit=box.querySelector('[data-vc-audit]');
        let auditedRefs=[];
        (async()=>{ try{ const d=liveDraft(); auditedRefs=await pvCircleRefs(t,d); const prompt=pvCirclePrompt(d,t); if(!auditedRefs.length){audit.innerHTML='<b>⛔ Референс не найден.</b><br>Платная генерация заблокирована.'; check.disabled=true; return;} audit.innerHTML=`<b>🎬 Что реально уйдёт в ${isV?'Veo':'Grok'}</b><div class="gp-video-circle-refrow">${auditedRefs.map(r=>`<div><img src="${esc(r.dataUrl)}"><small>${esc(r.name)}</small></div>`).join('')}</div><b>Сцена:</b><div>${esc(d.scene)}</div><b>Речь:</b><div>${esc(d.speech)}</div><details><summary>Финальный video prompt</summary><pre>${esc(prompt)}</pre></details>`; }catch(e){audit.textContent='Ошибка предпросмотра: '+String(e?.message||e); check.disabled=true;} })();
        check?.addEventListener('change',()=>{go.disabled=!(check.checked&&auditedRefs.length);});
        go?.addEventListener('click',async()=>{
            const key=String(box.querySelector('[data-vc-key]')?.value||'').trim(); if(!key){toast('Вставь API key выбранного видеопровайдера','fa-key');return;}
            if(!check?.checked||!auditedRefs.length){toast('Сначала проверь бесплатный предпросмотр и поставь галочку','fa-shield-halved');return;}
            if(isV) st.videoGeminiApiKey=key; else st.videoGrokApiKey=key; saveSettingsDebounced();
            go.disabled=true; const status=overlay.querySelector('.gp-video-circle-status');
            try{
                const d=liveDraft(); const refs=await pvCircleRefs(t,d); if(!refs.length) throw new Error('Референс исчез — платный запрос отменён'); status.textContent=`Проверено. Референсов: ${refs.length}. Генерирую видео…`;
                const url=isV?await pvGenerateVeoCircle(key,d,refs):await pvGenerateGrokCircle(key,d,refs);
                status.innerHTML=`<b>Готово 🎉</b><div class="gp-video-circle-preview"><video src="${esc(url)}" controls autoplay playsinline></video></div><small>Кружочек добавлен в переписку.</small>`;
                addLocalSms({dir:'in', name:d.speaker||t.name, from:d.speaker||t.name, chat:t.isGroup?t.name:'', text:'', videoCircle:url});
                setTimeout(()=>{ try{ overlay.remove(); render(); }catch(_){} },900);
            }catch(e){console.error('[PocketVerse] video circle generation failed',e); status.textContent=`Ошибка видео: ${String(e?.message||e).slice(0,220)}`; go.disabled=false;}
        });
    }));
}


function pvOpenOwnSelfieSheet(screen, t) {
    screen.querySelector('.gp-own-selfie-overlay')?.remove();
    const overlay=document.createElement('div');
    overlay.className='gp-own-selfie-overlay';
    overlay.innerHTML=`<div class="gp-own-selfie-sheet">
      <div class="gp-video-circle-head"><b>🤳 Моё селфи</b><button class="gp-iconbtn" data-os-close>${ic('fa-xmark')}</button></div>
      <small>Пиши сцену своими словами. Это НЕ отправляется персонажу как запрос — текст идёт в генератор изображения.</small>
      <label>Что должно быть на фото<textarea data-os-desc rows="5" placeholder="Например: Ханаби лежит на кровати в чёрном платье, снимает себя сверху, растрёпанные волосы..."></textarea></label>
      <label>Подпись под фото <input data-os-caption placeholder="Например: Ну как? 😏"></label>
      <button class="gp-primary gp-own-selfie-go" data-os-go>${ic('fa-wand-magic-sparkles')} Сгенерировать и отправить</button>
      <div class="gp-own-selfie-status" data-os-status>Будет использован текущий провайдер и стиль Silly Images Plus.</div>
    </div>`;
    screen.appendChild(overlay);
    const close=()=>overlay.remove();
    overlay.querySelector('[data-os-close]')?.addEventListener('click',close);
    overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
    overlay.querySelector('[data-os-go]')?.addEventListener('click',async()=>{
        const desc=String(overlay.querySelector('[data-os-desc]')?.value||'').trim();
        const caption=String(overlay.querySelector('[data-os-caption]')?.value||'').trim();
        if(!desc){toast('Сначала опиши селфи','fa-image');return;}
        const go=overlay.querySelector('[data-os-go]'), status=overlay.querySelector('[data-os-status]');
        go.disabled=true; status.textContent='Генерирую селфи через Silly Images Plus…';
        try{
            if(!_imgGenReady){ const ready=await isImageGenAvailable(); if(!ready) throw new Error('Silly Images Plus недоступен'); _imgGenReady=true; }
            const author=getUserName();
            const mediaIntent={type:'selfie',sender:author,visible:[author],camera:'front camera selfie',action:desc,continuity:'preserve current RP appearance and scene'};
            const src=await generatePostImage({imgDesc:desc,mediaIntent,author,ak:'user',kind:'ig',mms:false},v=>{status.textContent=v||'Генерирую…';},`own-selfie-${Date.now()}`);
            addLocalSms({dir:'out',name:t.name,chat:t.isGroup?t.name:'',text:caption,photo:desc,media:mediaIntent,img:src});
            status.textContent='Готово 🤳 Отправляю персонажу контекст фото…';
            close(); render(); updatePhoneInjection();
            // One normal phone-brain response, but the image itself was built from the user's text.
            sending=true; typingKey=t.key; render();
            try{
                setPhoneTurnActive(true);
                const items=[`selfie/photo from ${author}: ${desc}`, ...(caption?[`text: ${caption}`]:[])];
                const rawReply=await pvGeneratePhoneReply(t,items,!!t.isGroup);
                if(rawReply&&rawReply.trim()) await insertGhostReply(t.name,rawReply.trim(),t.isGroup?t.name:'');
            } finally { setPhoneTurnActive(false); sending=false; typingKey=null; render(); updateFabBadge(); applyChatHiding(); }
        }catch(e){console.error('[PocketVerse] own selfie failed',e); status.textContent='Ошибка: '+String(e?.message||e).slice(0,140); go.disabled=false;}
    });
}

async function flushPending(key) {
    if (sending) return;
    const pending = pvPending(key);
    const pendingMedia = pvPendingMedia(key);
    if (!pending.length && !pendingMedia.length) return;
    const t = getThread(key); if (!t) return;
    const batch = pending.map(x => x.text).filter(Boolean);
    const mediaBatch = pendingMedia.map(x => `${x.kind === 'sticker' ? 'animated sticker' : 'GIF/meme reaction'}: "${x.title}"`);
    if (!batch.length && !mediaBatch.length) return;
    // Сначала записываем каждую реплику как отдельное сообщение пользователя. Это НЕ вызывает модель.
    // Затем делаем ровно один generateQuietPrompt на всю лесенку.
    sending = true;
    try {
        const name = t.name || key, isGroup = !!t.isGroup;
        for (const text of batch) {
            addLocalSms({ dir:'out', name, chat: isGroup ? name : '', text });
        }
        pvClear(key);
        applyChatHiding(); typingKey = key; render(); updatePhoneInjection();
        _pvThreadRenderFrozen = true;
        const items = [...batch.map(x => `text: ${x}`), ...mediaBatch];
        setPhoneTurnActive(true);
        let rawReply = '';
        try { rawReply = await pvGeneratePhoneReply(t, items, isGroup); }
        finally { setPhoneTurnActive(false); }
        if (rawReply && rawReply.trim()) await insertGhostReply(name, rawReply.trim(), isGroup ? name : '');
    } catch(e) {
        console.error('[PocketVerse] ladder send failed:', e); toast('Не удалось отправить лесенку', 'fa-circle-exclamation');
    } finally { setPhoneTurnActive(false); _pvThreadRenderFrozen=false; sending=false; typingKey=null; render(); updateFabBadge(); applyChatHiding(); }
}

async function doSend(key, opts = {}) {
    if (sending) return;
    const input = document.getElementById('gp-input');
    const fromInput = opts.text === undefined;
    const text = (fromInput ? (input?.value || '') : opts.text).trim();
    const shot = opts.shot || null;
    if (!text && !_smsDraftImage && !shot) return;
    const t = getThread(key);
    const name = t ? t.name : key;
    const isGroup = !!t?.isGroup;
    const draftImg = _smsDraftImage;
    _smsDraftImage = null;
    const asVoice = _smsDraftVoice && !!text; // голосовое без расшифровки не бывает
    _smsDraftVoice = false;

    sending = true;
    if (input && fromInput) input.value = '';

    // Сообщение чата: скрытый маркер + видимый текст (модель и без инжекции поймёт формат)
    const markerBase = isGroup ? { to: `группа:${name}` } : { to: name };
    if (asVoice) markerBase.voice = true;
    if (shot) markerBase.shot = shot;
    const marker = `<!--tel:out:${JSON.stringify(markerBase)}-->`;
    // Видимый формат по языку интерфейса ([SMS → X] на англ); сканер понимает оба
    const en = lang() === 'en';
    const kindTok = asVoice ? (en ? 'Voice' : 'Голосовое') : (en ? 'SMS' : 'СМС');
    const visible = isGroup
        ? (en ? `[${kindTok} to chat «${name}»]` : `[${kindTok} в чат «${name}»]`)
        : `[${kindTok} → ${name}]`;
    const photoTok = en ? '*photo*' : '*фото*';
    // Скрин виден и модели: она должна понимать, ЧТО именно переслали
    const shotTok = shot ? `*${en ? 'screenshot' : 'скрин'}: ${shotLabel(shot)}*` : '';
    const mes = `${marker}\n${visible} ${draftImg ? photoTok + ' ' : ''}${shotTok ? shotTok + ' ' : ''}${text}`;

    try {
        // ISOLATED PHONE: outgoing messages live in PocketVerse metadata only.
        // Never call sendMessageAsUser here: changing main chat[] can reindex or
        // invalidate Scene Blocks / media metadata owned by other extensions.
        addLocalSms({
            dir:'out', name, chat: isGroup ? name : '', text, voice: asVoice,
            img: draftImg || undefined, shot: shot || undefined,
        });

        let photoHandled = false;
        if (draftImg) {
            try {
                applyChatHiding(); typingKey = key; render();
                const combo = await generateSmsPhotoReply({
                    contactName: name, isGroup, members: t?.members || [],
                    userText: text, image: draftImg,
                });
                if (combo) {
                    // Keep the visual description locally; never rewrite an RP message.
                    if (combo.replies?.length) {
                        for (const r of combo.replies) {
                            addLocalSms({
                                dir:'in', name: String(r.from || name), from: String(r.from || name),
                                chat: isGroup ? name : '', text: String(r.text || ''),
                            });
                        }
                    }
                    photoHandled = true;
                }
            } catch (e) {
                console.warn('[PocketVerse] isolated photo reply failed:', e);
            }
        }
        if (photoHandled) return; // finally всё приберёт

        applyChatHiding(); // спрятать свою смс из ленты сразу
        typingKey = key;
        render(); // своя смс уже видна (она в чате), плюс «печатает…»

        updatePhoneInjection();

        // Генерируем ответ «тихо» — generateQuietPrompt не триггерит JS Runner,
        // Extra блоки и другие скрипты. Результат вставляем призраком.
        const ctx = SillyTavern.getContext();
        const msgKind = asVoice ? 'VOICE message (they hear their voice; this is the transcript)' : 'message';
        const quietPrompt = isGroup
            ? `Continue the roleplay. The group chat «${name}» (members: ${(t.members || []).join(', ')}) just received this ${msgKind} from ${ctx?.name1 || 'User'}: "${text}"${draftImg ? ' (with a photo attached)' : ''}${shot ? ` (with a forwarded screenshot — ${shotLabel(shot)})` : ''}. Reply as the group members — ONLY hidden tel:sms tags with the "chat" field (RULE 3 — PHONE-ONLY MODE), one tag per message, several members may text. No visible prose.`
            : `Continue the roleplay. ${name} just received this ${asVoice ? msgKind : 'SMS'} from ${ctx?.name1 || 'User'}: "${text}"${draftImg ? ' (with a photo attached)' : ''}${shot ? ` (with a forwarded screenshot — ${shotLabel(shot)}; react to what is IN it)` : ''}. Reply in-character with ONLY hidden tel:sms tags (RULE 3 — PHONE-ONLY MODE). No visible prose.`;
        const rawReply = await pvGeneratePhoneReply(t, [`${msgKind}: ${text}${draftImg ? ' [photo attached]' : ''}${shot ? ` [forwarded screenshot: ${shotLabel(shot)}]` : ''}`], isGroup);
        if (rawReply && rawReply.trim()) {
            await insertGhostReply(name, rawReply.trim(), isGroup ? name : '');
        }
    } catch (e) {
        console.error('[GlassPhone] send failed:', e);
        toast('Не удалось отправить', 'fa-circle-exclamation');
    } finally {
        sending = false;
        typingKey = null;
        render();
        updateFabBadge();
        applyChatHiding();
    }
}

// Индикатор «печатает» из внешних событий (регены/свайпы в основном чате)
export function setTyping(key) {
    typingKey = key;
    if (isPhoneOpen() && currentScreen === 'thread') render();
}

// ═══ Тосты и детект новых входящих ═══

// Тип события по иконке — от него цвет ребра в стиле «плашка»
function toastKind(icon) {
    if (/^fa-(building-columns|landmark|file-invoice-dollar|money|coins|wallet)/.test(icon)) return 'money';
    if (/^fa-(truck|box-open|bag-shopping|user$)/.test(icon)) return 'delivery';
    if (/^fa-(instagram|x-twitter|twitter|heart|wand-sparkles|image)/.test(icon)) return 'social';
    return 'sms';
}

// Заголовок и вторую строку берём из самого текста: тосты про сообщения
// приходят как «Имя: текст», остальные — одной фразой.
function splitToast(text, threadKey) {
    if (threadKey) {
        const at = text.indexOf(': ');
        if (at > 0 && at < 42) return { title: text.slice(0, at), sub: text.slice(at + 2) };
    }
    const dot = text.indexOf(' · ');
    if (dot > 0) return { title: text.slice(0, dot), sub: text.slice(dot + 3) };
    // «Заказ доставлен: Диван Осло» — тоже две строки, но только если слева
    // короткая шапка, иначе разрежет фразу пополам
    const colon = text.indexOf(': ');
    if (colon > 0 && colon <= 24) return { title: text.slice(0, colon), sub: text.slice(colon + 2) };
    return { title: text, sub: '' };
}

// Часы ролевой — для стиля со временем справа
function toastClock() {
    try {
        const d = getRpDateTime();
        if (d && d.hours !== undefined) return `${String(d.hours).padStart(2, '0')}:${String(d.minutes || 0).padStart(2, '0')}`;
    } catch (e) { /* ignore */ }
    const n = new Date();
    return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
}

// Выбранный стиль. Старые значения (island/glass/bar/accent) больше не
// существуют — такие настройки молча падают на «Аврору».
function toastStyleId() {
    const id = getSettings().toastStyle;
    return TOAST_STYLES.some(t => t.id === id) ? id : 'aurora';
}

export function toast(text, icon = 'fa-comment-dots', threadKey = null) {
    text = tr(text); // перевод тостов (точный словарь + regex-правила)
    const style = toastStyleId();
    const el = document.createElement('div');
    el.className = `gp-toast gp-toast-${style} gp-toast-k-${toastKind(icon)}`;
    const { title, sub } = splitToast(text, threadKey);
    // Бренд-иконки (twitter/instagram) — семейство fa-brands, остальные fa-solid
    const fam = /^fa-(x-twitter|twitter|instagram)$/.test(icon) ? 'fa-brands' : 'fa-solid';
    // У сообщения лицо собеседника вместо иконки приложения
    let avaSrc = '';
    if (threadKey && !String(threadKey).startsWith('group:')) {
        try { avaSrc = avatarForAuthor(`contact:${threadKey}`) || ''; } catch (e) { /* ignore */ }
    }
    const head = threadKey
        ? avatarHtml(title, avaSrc, 'gp-toast-ava')
        : `<span class="gp-toast-icon"><i class="${fam} ${icon}"></i></span>`;
    el.innerHTML = `${head}
        <span class="gp-toast-body">
            <span class="gp-toast-title">${esc(title)}</span>
            ${sub ? `<span class="gp-toast-text">${esc(sub)}</span>` : ''}
        </span>
        <span class="gp-toast-time">${esc(toastClock())}</span>
        <svg class="gp-toast-arc" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="16"></circle></svg>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('gp-toast-show'));
    if (threadKey) {
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => {
            openPhone(threadKey);
            el.remove();
        });
    }
    setTimeout(() => {
        el.classList.remove('gp-toast-show');
        setTimeout(() => el.remove(), 400);
    }, 4200);
}

// Сравниваем количество входящих по тредам с прошлым замером — новые → тост.
export function checkNewIncoming({ silent = false } = {}) {
    const list = getThreadList();
    const fresh = new Map();
    for (const t of list) {
        fresh.set(t.key, t.messages.filter(m => m.dir === 'in').length);
    }
    if (!silent) {
        for (const [key, count] of fresh) {
            const prev = prevIncomingCounts.get(key) ?? count; // новый тред без замера — не спамим
            if (count > prev) {
                const t = list.find(x => x.key === key);
                const lastIn = [...t.messages].reverse().find(m => m.dir === 'in');
                const isViewing = isPhoneOpen() && currentScreen === 'thread' && currentThreadKey === key;
                // Счётчик входящих может скакнуть и на уже прочитанном треде
                // (правка сообщения, свайп, скрытая строка журнала) — тогда
                // прилетал тост о том, что она давно прочитала. Сверяемся с
                // курсором прочтения, а не только с прошлым замером.
                if (!isViewing && lastIn && t.unread > 0) {
                    toast(`${t.name}: ${lastIn.text.slice(0, 70)}`, 'fa-comment-dots', key);
                }
            }
        }
    }
    prevIncomingCounts = fresh;
    updateFabBadge();
    if (isPhoneOpen()) render();
}

export function resetIncomingCounters() {
    prevIncomingCounts = new Map();
    checkNewIncoming({ silent: true });
}

// ═══ Инициализация ═══

// Приложение-обёртка (Tauri Tavern и подобные) рисует свою системную панель
// поверх страницы. Два шага: просим у вьюпорта безопасные отступы и, если
// обёртка их всё-таки не отдаёт, помечаем body — CSS подставит запасные.
function setupNativeShell() {
    try {
        const meta = document.querySelector('meta[name="viewport"]');
        if (meta && !/viewport-fit/i.test(meta.content || '')) {
            meta.content = `${meta.content}, viewport-fit=cover`;
        }
        const forced = getSettings().forceSafeArea;
        const isNative = !!(window.__TAURI__ || window.__TAURI_INTERNALS__ || window.Capacitor || /wv|Tauri/i.test(navigator.userAgent));
        if (!isNative && !forced) return;
        document.body.classList.add('gp-native-shell');
        if (forced) return;   // выставлено вручную — автопроверка не отменяет
        // Проверяем, отдала ли обёртка настоящие отступы: если да, запасные не нужны
        requestAnimationFrame(() => {
            const probe = document.createElement('div');
            probe.style.cssText = 'position:fixed;top:0;height:env(safe-area-inset-top,0px);visibility:hidden';
            document.body.appendChild(probe);
            const real = probe.getBoundingClientRect().height;
            probe.remove();
            if (real > 0) document.body.classList.remove('gp-native-shell');
        });
    } catch (e) { /* ignore */ }
}

export function initUI() {
    setupNativeShell();
    createFab();
    createPhone();
    createWandButton();
    // Wand-меню может создаваться позже нашего init — доб. отложенные попытки
    setTimeout(createWandButton, 2000);
    setTimeout(createWandButton, 6000);
    updateFabBadge();
}

// Консольные хелперы
if (typeof window !== 'undefined') {
    window.glassPhoneOpen = () => openPhone();
}
