
import { setExtensionPrompt, extension_prompt_types, extension_prompt_roles } from '../../../../script.js';
import { getSettings, getMeta, scanChat, getBlockedSmsKeys, keyOf, EXT_NAME } from './state.js';
import { getSocialActivitySummary } from './social.js';
import { getBankSummaryLine, bankInjectRule } from './bank.js';
import { notesInjectBlock } from './notes.js';
import { channelInjectLine, anonInjectLine } from './channels.js';
import { plansInjectLine, plansInjectRule, getPlans, getPlanSuggestions } from './plans.js';
import { twitchInjectLine } from './twitch.js';
import { tinderInjectLine, inAppMatchNames } from './tinder.js';
import { pendingConsequences } from './social-events.js';

const CHAT_KEY = EXT_NAME;
const SYS_KEY = EXT_NAME + '_sys';

// Explicit phone-only runtime gate. Local PocketVerse messages no longer live in ST chat[],
// so phone mode must never be inferred from old RP markers.
let _pvPhoneTurnActive = false;
export function setPhoneTurnActive(v) { _pvPhoneTurnActive = !!v; updatePhoneInjection(); }


// Телефонный ход: последнее сообщение юзера — смс/голосовое из телефона.
// Полные правила «phone-only mode» (самый жирный блок директивы) нужны ТОЛЬКО
// в этот момент; в обычном ходе они балласт. 'now' — отвечать тегами,
// 'justEnded' — прошлый ход был смс, надо вплести переписку в сцену.
function phoneTurnState() {
    // Since v1.0.2 phone traffic is isolated from SillyTavern chat[].
    // Only an explicit quiet-phone request may wake the full phone brain.
    return _pvPhoneTurnActive ? 'now' : null;
}

// Соцсети/группы подаются только когда реально используются
function socialActive() {
    try {
        const s = getMeta().social;
        return !!(s && ((s.tweets || []).length || (s.igPosts || []).length || (s.ofPosts || []).length));
    } catch (e) { return false; }
}

function buildPrompt() {
    const { contacts, threads } = scanChat();
    const meta = getMeta();
    let consequenceBlock = '';
    // Последствия — часть систем: выключены, значит и в промпт не идут.
    // Сводка активности остаётся: посты она пишет и без них, а персонажам
    // полезно знать, что она выкладывала.
    try {
        const pending = getSettings().socialSystems === false ? [] : pendingConsequences();
        if (pending.length) {
            consequenceBlock = `[PENDING STORY CONSEQUENCES FROM THE PHONE — established facts, not suggestions]\n${pending.map(c => `- (${c.urgency}; visibility: ${c.visibility}) ${c.summary}${c.actors?.length ? ` Actors: ${c.actors.join(', ')}.` : ''}`).join('\n')}\nIntroduce each naturally only when compatible with location, timing and who can know it. Do not retcon, repeat the phone exchange, force {{user}}'s actions, or reveal private knowledge. Once it appears clearly in the scene, do not keep restating it.`;
        }
    } catch (e) { /* ignore */ }

    // Мэтч из приложения в контактах телефона лежит (на нём держится тред),
    // но номера у него нет — в список «у них есть твой номер» он не идёт
    let inAppKeys = new Set();
    try { inAppKeys = new Set(inAppMatchNames().map(n => keyOf(n))); } catch (e) { /* ignore */ }
    const contactLines = [];
    for (const c of contacts.values()) {
        if (inAppKeys.has(keyOf(c.name))) continue;
        contactLines.push(`- ${c.name}${c.number ? ` (${c.number})` : ''}`);
    }
    let contactsBlock = contactLines.length > 0
        ? `Contacts already in {{user}}'s phone (these characters HAVE {{user}}'s number, and {{user}} has theirs):\n${contactLines.join('\n')}`
        : `{{user}}'s phone has NO contacts yet — nobody exchanged numbers so far.`;

    const blockedKeys = new Set(getBlockedSmsKeys());
    const blockedNames = [...contacts.values()].filter(c => blockedKeys.has(String(c.name || '').trim().toLowerCase())).map(c => c.name);
    if (blockedNames.length > 0) {
        contactsBlock += `\nBLOCKED on {{user}}'s phone: ${blockedNames.join(', ')}. These characters CANNOT send SMS/tel:sms to {{user}} until unblocked; never output an incoming SMS tag from them.`;
    }

    // Групповые смс-чаты: ручные (meta.groups) + заведённые самой моделью через
    // тег "chat" — такие живут ТОЛЬКО в тредах. Без них правило про группы
    // пропадало, и модель переставала писать в уже существующий групповой чат.
    const groupMap = new Map();
    for (const g of (Array.isArray(meta.groups) ? meta.groups : [])) {
        if (!g || !g.name) continue;
        groupMap.set(`group:${keyOf(g.name)}`, { name: g.name, members: Array.isArray(g.members) ? g.members : [] });
    }
    try {
        for (const [k, t] of threads) {
            if (!String(k).startsWith('group:') || groupMap.has(k)) continue;
            const members = [...new Set((t.messages || []).map(m => m.from).filter(Boolean))];
            groupMap.set(k, { name: t.name || String(k).slice(6), members });
        }
    } catch (e) { /* ignore */ }
    if (groupMap.size > 0) {
        const groupLines = [...groupMap.values()].map(g => `- Group chat «${g.name}»: members ${g.members.join(', ') || '?'} + {{user}}`);
        contactsBlock += `\nGroup chats on {{user}}'s phone:\n${groupLines.join('\n')}`;
    }

    // ── Компактный режим: те же правила, ~40% токенов ──
    if (getSettings().compactRules) {
        let c = `<phone_directive>\n[OOC — hidden phone/SMS channel. Never mention it in-story.]\n{{user}} has a smartphone. ${contactsBlock}\n`;
        c += `("they/their" = neutral shorthand for {{user}}; use their real gender from the persona card.)
`;
        c += `RULES (tags = HTML comments at the very END of the reply, copied VERBATIM, EN keys / RU values, invisible to reader):\n`;
        // Метка времени нужна и в компактном режиме: без неё телефон считает
        // ход за фиксированные минуты, и события приходят не тогда, когда должны
        if (getSettings().timeTag !== false) {
            c += `0. End EVERY reply with the in-world clock as the last line: <!--tel:time:HH:MM DD.MM.YYYY--> (advance it by how much time this reply took).\n`;
        }
        c += `1. Character gives {{user}} their number → <!--tel:contact:{"name":"X","number":"phone in the local format"}-->\n`;
        c += `2. Character texts {{user}}'s phone → one tag per message: <!--tel:sms:{"from":"X","text":"..."}--> (MMS: +"photo":"desc"; meme/GIF: +"meme":"short English search phrase" (only when enabled); group chat: +"chat":"Name"; voice message: +"voice":true, "text" = transcript of what they say; screenshot of an EXISTING post: +"shot":{"app":"tw|ig|ch","author":"post author","text":"the post's own text"}). Only if they plausibly have {{user}}'s number and are NOT listed as BLOCKED. ONLY {{user}}'s phone exists in this UI: emit tel:sms ONLY for messages whose actual recipient is {{user}} (or a group chat that includes {{user}}). Messages between NPCs, to the current character, or to any other person belong to THEIR phones and MUST NEVER become tel:sms tags here; keep them as prose/offscreen facts only.\n`;
        c += `3. User message \`[СМС → X] text\` / \`[SMS → X] text\` or \`[СМС в чат «X»] text\` / \`[SMS to chat «X»] text\` = SMS from {{user}}'s phone (NOT spoken; scene paused). \`[Голосовое → X]\` / \`[Voice → X]\` = {{user}}'s VOICE message, text = transcript (the character hears {{user}}'s voice). Reply ONLY with tel:sms tags (or <!--tel:silent--> if the character wouldn't answer) — zero visible prose. Resume prose on {{user}}'s next normal message, weaving the texting into the scene as a real event.\n`;
        c += `4. Character posts publicly → <!--tel:tweet:{"author":"X","text":"..."}--> / <!--tel:insta:{"author":"X","photo":"desc","caption":"..."}-->\n`;
        c += `NEVER write literal tag syntax inside <think>/reasoning — plan in plain words; each tag exactly once, in the final reply. Never paraphrase tags into visible text.\n`;
        let socialC = '';
        try { socialC = getSocialActivitySummary(); } catch (e) { /* ignore */ }
        if (socialC) c += `\n[{{user}}'S RECENT SOCIAL ACTIVITY — characters who follow them may react:]\n${socialC}\n`;
        if (consequenceBlock) c += `\n${consequenceBlock}\n`;
        try {
            const bankRule = bankInjectRule();
            if (bankRule) c += `\n${bankRule}\n`;
            const bankSum = getBankSummaryLine();
            if (bankSum) c += `${bankSum}\n`;
        } catch (e) { /* ignore */ }
        try {
            const chan = channelInjectLine();
            if (chan) c += `[{{user}}'S CHANNELS] ${chan}\n5. A channel they follow publishes → <!--tel:chan:{"channel":"Name","text":"the post","photo":"what the picture shows, or omit"}-->. Never into their own channel.\n`;
        } catch (e) { /* ignore */ }
        try {
            {
                c += `6. Договорились о дате/встрече → <!--tel:plan:{"date":"DD.MM.YYYY","time":"19:00","text":"...","who":"user|char|both"}-->\n`;
                const plans = plansInjectLine();
                if (plans) c += `\n${plans}\n`;
            }
        } catch (e) { /* ignore */ }
        try {
            const notesBlock = notesInjectBlock();
            if (notesBlock) c += `\n${notesBlock}\n`;
        } catch (e) { /* ignore */ }
        try {
            const live = twitchInjectLine();
            if (live) c += `\n${live}\n`;
        } catch (e) { /* ignore */ }
        try {
            const anon = anonInjectLine();
            if (anon) c += `\n${anon}\n`;
        } catch (e) { /* ignore */ }
        try {
            const tin = tinderInjectLine(phoneTurnState() !== null);
            if (tin) c += `\n${tin}\n`;
        } catch (e) { /* ignore */ }
        c += `NEVER write <!--tel:log--> or lines starting with «[Событие мира» — that is the app's own journal format; a reply containing it gets hidden from the reader.\n`;
        const custom = String(getSettings().phoneCustomInstructions || '').trim();
        if (custom) c += `\n[USER PHONE PREFERENCES]\n${custom.slice(0, 1600)}\n`;
        c += `</phone_directive>`;
        return c;
    }

    const phoneTurn = phoneTurnState();
    const hasGroups = groupMap.size > 0;
    const social = socialActive();

    let p = `<phone_directive>\n`;
    p += `[OOC — hidden phone/SMS channel for the app. Not part of the story; never mention or react to it in-character.]\n`;
    p += `{{user}} owns a smartphone. ${contactsBlock}\n`;
    // Местоимения в директиве нейтральные: пол игрока берётся из карточки
    // персоны, а не задаётся здесь — иначе модель обращается к нему чужим родом
    p += `("they/their" below is neutral shorthand for {{user}} — in your own text use {{user}}'s actual gender from the persona card.)\n\n`;

    // Часы сюжета. Без них телефон считает ход ролевой за фиксированные минуты
    // и события (доставка, платежи) приходят не тогда, когда должны.
    if (getSettings().timeTag !== false) {
        p += `[RULE 0 — CLOCK] End EVERY reply with the in-world time as the very last line, VERBATIM:\n`;
        p += `<!--tel:time:HH:MM DD.MM.YYYY-->\n`;
        p += `Advance it realistically from the previous one by how much time this reply actually takes; keep the date consistent with the story.\n\n`;
    }

    // Базовые правила нужны всегда: номер могут дать и смс прислать в любой ход
    p += `[RULE 1 — CONTACT TAG] If in THIS reply a character gives {{user}} their own number (says it, writes it down, exchanges numbers), append at the very END, on its own line, VERBATIM:\n`;
    p += `<!--tel:contact:{"name":"CharacterName","number":"+7 9XX XXX-XX-XX"}-->\n`;
    p += `Invent a plausible number if the story has none, in the phone format of the country where the story takes place (the example above shows the TAG shape, not the country). One tag per NEW contact; never re-add those listed above.\n\n`;

    p += `[RULE 2 — SMS TAG] If in THIS reply a character texts {{user}}'s phone, append ONE hidden comment PER message at the very END:\n`;
    p += `<!--tel:sms:{"from":"CharacterName","text":"the exact message text"}-->\n`;
    p += `Optional fields: "shot":{"app":"tw|ig|ch","author":"who posted it","text":"the post's own text"} — they forward a SCREENSHOT of a post that ALREADY exists (a tweet, an Instagram post, a channel post they or {{user}} can see); quote enough of its text for the app to find it · "photo":"what the photo shows" (MMS) · "meme":"short English search phrase" when meme/GIF sending is enabled and it naturally fits · "voice":true — then "text" is the transcript of what they SAY, spoken register (use when it fits the moment, not every message)${hasGroups ? ' · "chat":"GroupChatName" for a group chat, where several members may text in a row (one tag each)' : ''}.\n`;
    p += `You may also narrate the buzz in prose and show the text in your usual visible style (backticks). Duplicate as a tag ONLY what {{user}} receives. Only characters who plausibly have {{user}}'s number can text {{user}}.\n`;
    p += `NEVER emit a tel:sms whose "from" is {{user}} — their own messages are sent from the app, not written by you.\n`;
    p += `CRITICAL SCOPE: tel:sms is EXCLUSIVELY for messages arriving on {{user}}'s OWN phone. What ANY other character (including yours) gets on THEIR phone — prose only, NEVER a tag; if tagged anyway it MUST carry "to":"RecipientName" so the app discards it.\n\n`;
    if (s.phonePhotos !== false) p += `[PHOTO INITIATIVE — SMART SELFIES v2] A character may spontaneously send {{user}} a photo/selfie when it is naturally motivated by the current story or phone conversation — to show where they are, what they are doing/wearing/holding, their mood/reaction, an injury/result, to tease, reassure, prove something, answer “show me”, or share a meaningful moment. Do NOT attach photos randomly or on every reply. When a photo is sent, keep the normal short "photo" description for compatibility AND add a structured "media" object so PocketVerse cannot lose the RP scene between the phone reply and image generation. Shape: {"from":"X","text":"...","photo":"short concrete shot description","media":{"type":"selfie|photo","sender":"X","visible":["X","Exact NPC Name"],"camera":"front camera selfie / mirror selfie / phone photo","location":"EXACT current RP place","clothing":{"X":"EXACT current visible clothing"},"action":"what is visibly happening NOW","pose":"pose/body position","expression":"visible expression","gaze":"where they look","environment":"2-5 visible scene anchors already established in RP","continuity":"only temporary visual facts that must not be lost"}}. For a SELFIE, sender MUST be in visible. For an ordinary photo, sender may be behind camera. Use exact character/NPC names. CURRENT RP is authoritative: preserve the actual room/place, current clothes or undressed state, who is physically present, props and current action. Never replace an established location with a generic street/bedroom/studio. Do not put artist/style/quality tags in media; Silly Images Plus owns style and references.\n\n`;

    // Самый жирный блок — только в телефонный ход
    if (phoneTurn === 'now') {
        p += `[RULE 3 — PHONE-ONLY MODE — ACTIVE NOW] Their last message came FROM THEIR PHONE: \`[СМС → Name]\`/\`[SMS → Name]\` (direct), \`[СМС в чат «Name»]\`/\`[SMS to chat «Name»]\` (group — reply as its members, each with "chat"), \`[Голосовое → Name]\`/\`[Voice → Name]\` (voice message: text is the transcript, the character HEARS {{user}}'s voice), \`*фото*\`/\`*photo*\` (photo attached — look at it if you can see images).\n`;
        p += `It is NOT spoken aloud and the RP scene is PAUSED. Your reply MUST be ONLY hidden tags — zero visible prose, narration or actions:\n`;
        p += `- 1-5 <!--tel:sms:...--> tags in the character's own texting voice: short, informal, realistic pacing.\n`;
        p += `- If they realistically would NOT reply now (asleep, busy, offended, phone off), output exactly: <!--tel:silent-->\n\n`;
    } else if (phoneTurn === 'justEnded') {
        p += `[RULE 3 — RESUMING AFTER TEXTING] The previous exchange happened on {{user}}'s phone. Weave it into the scene as a real event: {{user}} was holding the phone, reading and typing — it took time and attention, and others present may have noticed. Do NOT resume as if nothing happened.\n\n`;
    }

    // Соцсети — только когда ими реально пользуются
    if (social) {
        p += `[RULE 4 — SOCIAL TAGS] If a character posts publicly as a story event, append at the END:\n`;
        p += `<!--tel:tweet:{"author":"CharacterName","text":"tweet text"}--> / <!--tel:insta:{"author":"CharacterName","photo":"short visual description","caption":"caption text"}-->\n`;
        p += `Only when the story actually involves posting — do not spam. NEVER post as {{user}}: their own posts are written by them in the app, and a tag with their name is discarded.\n`;
    }

    let socialSummary = '';
    try { socialSummary = getSocialActivitySummary(); } catch (e) { /* ignore */ }
    if (socialSummary) {
        p += `\n[{{user}}'S RECENT SOCIAL MEDIA ACTIVITY] Characters who follow them may have seen these and can react naturally:\n${socialSummary}\n`;
    }
    if (consequenceBlock) p += `\n${consequenceBlock}\n`;

    // Банк — правило + сводка ТОЛЬКО если приложение реально используется
    try {
        const bankRule = bankInjectRule();
        if (bankRule) {
            p += `\n${bankRule}\n`;
            const bankSum = getBankSummaryLine();
            if (bankSum) p += `[{{user}}'S FINANCES] ${bankSum}\n`;
        }
    } catch (e) { /* ignore */ }
    // Каналы — одной строкой, только если она их завела или на что-то подписана.
    // Правило про тег идёт следом: чужие каналы ведёт модель, свой — она сама.
    try {
        const chan = channelInjectLine();
        if (chan) {
            p += `\n[{{user}}'S CHANNELS] ${chan}\n`;
            p += `[RULE 5 — CHANNEL POST] When a channel above would really publish something about what is happening now (news, a warning, the blogger's own remark), append at the END: <!--tel:chan:{"channel":"exact channel name","text":"the post as that channel writes it","photo":"one line of what the picture shows — or omit the field"}-->\n`;
            p += `A channel not listed above may appear this way too — give it a plain "channel" name and the app adds it. NEVER post into {{user}}'s OWN channel: those are written by them in the app, and such a tag is discarded. Do not spam: at most 1-2 channel posts per reply, and only when the story gives a reason.\n`;
        }
    } catch (e) { /* ignore */ }
    // Календарь: правило ставим, только когда планы вообще заведены —
    // пустой календарь не должен занимать место в директиве
    try {
        p += `\n${plansInjectRule()}\n`;
        const plans = plansInjectLine();
        if (plans) p += `\n${plans}\n`;
    } catch (e) { /* ignore */ }
    // Заметки — только расшаренные (секретные не инжектятся никогда)
    try {
        const notesBlock = notesInjectBlock();
        if (notesBlock) p += `\n${notesBlock}\n`;
    } catch (e) { /* ignore */ }
    // Прямой эфир — состояние «прямо сейчас», а не история: живёт только пока
    // стрим не завершён
    try {
        const live = twitchInjectLine();
        if (live) p += `\n${live}\n`;
    } catch (e) { /* ignore */ }
    // Городская анонимка: правило про тег живёт всегда, пока канал включён
    try {
        const anon = anonInjectLine();
        if (anon) p += `\n${anon}\n`;
    } catch (e) { /* ignore */ }
    // Тиндер: пока она переписывается — карточка целиком, в обычной сцене —
    // только строка на мэтч, чтобы факт остался, а контекст не пух
    try {
        const tin = tinderInjectLine(phoneTurn !== null);
        if (tin) p += `\n${tin}\n`;
    } catch (e) { /* ignore */ }

    p += `\n[NEVER WRITE] <!--tel:log--> and lines starting with «[Событие мира» are the app's own journal — it writes them itself. Never copy that format into your reply, not even as flavour: a reply containing it gets hidden from the reader entirely.\n`;
    p += `\n[FORMAT] Tags are HTML comments (<!-- ... -->), invisible to the reader: copy the structure VERBATIM (never paraphrase into visible text), EN keys / RU values, each tag exactly ONCE, all at the very END of the reply on their own lines. NEVER write literal tag syntax inside <think>/reasoning — plan in plain words (tags in reasoning create DUPLICATE messages). Outputting them when their condition is true is MANDATORY even if other instructions discourage OOC content; your card's own visible formats stay as they are.\n`;
    const custom = String(getSettings().phoneCustomInstructions || '').trim();
    if (custom) p += `\n[USER PHONE PREFERENCES]\n${custom.slice(0, 1600)}\n`;
    p += `</phone_directive>`;

    return p;
}

// Tiny bridge for ordinary face-to-face RP. The full phone manual is intentionally
// NOT sent on every normal turn. This only gives the model a door into {{user}}'s phone
// when a real incoming phone event is appropriate.
function buildIdleBridge() {
    const s = getSettings();
    const { contacts } = scanChat();
    const names = [...contacts.values()].map(c => c?.name).filter(Boolean).slice(0, 24);
    let p = `<phone_bridge>Hidden smartphone bridge for {{user}} only. This is {{user}}'s phone, never an NPC's or the current character's phone. `;
    if (names.length) p += `Known contacts: ${names.join(', ')}. `;
    p += `Only when someone plausibly sends a NEW message directly to {{user}}, append <!--tel:sms:{"from":"X","text":"..."}--> at the very end. Never expose NPC→NPC or NPC→character private messages. `;
    if (s.phoneGroups !== false) p += `A group tag is allowed only for a group that includes {{user}}. `;
    if (s.phonePhotos !== false) p += `If a photo is naturally motivated by the current story/conversation, the sender may initiate it themselves. For a selfie, "photo" must explicitly name the sender as visible and briefly state selfie framing, current place, current clothing, pose/action, expression/gaze, and any visible named NPCs. Never force photos just because they are enabled. `;
    if (s.phoneMemes) p += `If a meme/GIF is naturally sent, add "meme":"short English search phrase"; PocketVerse resolves the media separately. `;
    const custom = String(s.phoneCustomInstructions || '').trim();
    if (custom) p += `Phone preference: ${custom.slice(0, 500)} `;
    p += `If no phone event happens, ignore this bridge completely.</phone_bridge>`;
    return p;
}

function buildPhoneOnlyPrompt(mode = 'balanced') {
    const s = getSettings();
    const { contacts } = scanChat();
    const names = [...contacts.values()].map(c => c?.name).filter(Boolean).slice(0, mode === 'lite' ? 12 : 30);
    let p = `<phone_directive>PRIVATE PHONE MODE for {{user}}. Output phone data only; no visible narration. `;
    if (names.length) p += `Known contacts: ${names.join(', ')}. `;
    p += `Reply with 1-3 hidden tags only: <!--tel:sms:{"from":"X","text":"..."}-->. Keep messages natural, short and in character. Never expose NPC→NPC or NPC→character private messages. `;
    if (s.phoneGroups !== false) p += `For a group containing {{user}}, add "chat":"Group name" and the real sender in "from". `;
    if (s.phonePhotos !== false) p += `When a photo is naturally motivated by the conversation, the sender may initiate it themselves. For a selfie, "photo" must explicitly name the sender as visible and briefly state selfie framing, current place, current clothing, pose/action, expression/gaze, and any visible named NPCs. Do not force photos every turn. `;
    if (s.phoneMemes) p += `When a reaction/meme/GIF is natural, add "meme":"short English GIPHY search phrase". Do not force media every turn. `;
    if (mode === 'balanced') p += `You may return up to 4 short bubbles when emotion or group flow calls for it. Respect the character card, current relationship and immediately relevant RP facts already supplied by SillyTavern. `;
    const custom = String(s.phoneCustomInstructions || '').trim();
    if (custom) p += `User phone preferences: ${custom.slice(0, mode === 'lite' ? 260 : 700)} `;
    p += `If the character would not answer, output <!--tel:silent-->. Never output technical state, HeartPulse blocks, reasoning or prose.</phone_directive>`;
    return p;
}

function buildActivePrompt() {
    const s = getSettings();
    const turn = phoneTurnState();
    if (!turn) return buildIdleBridge();
    const mode = String(s.brainMode || 'balanced');
    if (mode === 'lite') return buildPhoneOnlyPrompt('lite');
    if (mode === 'balanced') return buildPhoneOnlyPrompt('balanced');
    // Deep deliberately keeps the complete legacy Phone-ST directive.
    const oldCompact = s.compactRules;
    try { s.compactRules = false; return buildPrompt(); }
    finally { s.compactRules = oldCompact; }
}

export function updatePhoneInjection() {
    try {
        const s = getSettings();
        setExtensionPrompt(CHAT_KEY, '', extension_prompt_types.IN_CHAT, 0);
        setExtensionPrompt(SYS_KEY, '', extension_prompt_types.IN_PROMPT, 0);

        if (!s.isEnabled || !s.injectPrompt) return;

        // ОДНА инжекция: IN_CHAT depth-0 роль USER (Клод надёжно выполняет инструкции
        // из последнего user-хода). Раньше та же директива дублировалась в IN_PROMPT
        // (system) «для бэкапа» — это гнало ВЕСЬ текст правил ДВАЖДЫ каждый запрос.
        const prompt = buildActivePrompt();
        const depth = s.injectDepth || 0;
        setExtensionPrompt(CHAT_KEY, prompt, extension_prompt_types.IN_CHAT, depth, false, extension_prompt_roles.USER);
    } catch (e) { /* тихо: инжект не критичен */ }
}

// PocketVerse Brain Inspector — read-only snapshot for the in-phone diagnostics UI.
// It never calls the model and never changes the active injection.
export function getPhoneBrainSnapshot() {
    const ctx = (() => { try { return SillyTavern.getContext?.() || {}; } catch (e) { return {}; } })();
    const prompt = (() => { try { return buildActivePrompt(); } catch (e) { return ''; } })();
    const chat = Array.isArray(ctx.chat) ? ctx.chat : [];
    const rpText = chat.slice(-24).map(m => `${m?.is_user ? 'USER' : 'CHAR'}: ${String(m?.mes || '')}`).join('\n');
    let cardText = '';
    try {
        const cid = ctx.characterId;
        const ch = (Array.isArray(ctx.characters) && cid != null) ? ctx.characters[cid] : null;
        if (ch) {
            const parts = [ch.name, ch.description, ch.personality, ch.scenario, ch.first_mes, ch.mes_example, ch.creator_notes]
                .filter(Boolean).map(String);
            cardText = parts.join('\n\n');
        }
    } catch (e) { /* diagnostic only */ }
    let personaText = '';
    try {
        personaText = String(ctx?.powerUserSettings?.persona_description || ctx?.persona_description || '');
    } catch (e) { /* diagnostic only */ }
    const chars = s => String(s || '').length;
    const tokens = s => Math.max(0, Math.round(chars(s) / 4)); // deliberately labelled estimate in UI
    return {
        phoneTurn: phoneTurnState() || 'normal',
        compactRules: !!getSettings().compactRules,
        brainMode: String(getSettings().brainMode || 'balanced'),
        idleBridge: !phoneTurnState(),
        injectionEnabled: !!(getSettings().isEnabled && getSettings().injectPrompt),
        depth: Number(getSettings().injectDepth) || 0,
        prompt,
        rpText,
        cardText,
        personaText,
        counts: {
            phone: tokens(prompt),
            rp: tokens(rpText),
            card: tokens(cardText),
            persona: tokens(personaText),
            phoneChars: chars(prompt),
        },
        note: 'PocketVerse can show its own injection exactly. SillyTavern preset/system prompt and provider-side tokenization are outside PocketVerse, so their exact token count is not claimed here.'
    };
}
