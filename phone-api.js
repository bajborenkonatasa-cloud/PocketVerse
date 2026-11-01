// Optional independent PocketVerse phone API. Main SillyTavern connection is never changed.
import { getSettings } from './state.js';

export function selectedPhoneApi() {
    const s = getSettings();
    if (!s.phoneApiEnabled || !s.phoneApiSelected) return null;
    return (s.phoneApiProfiles || []).find(p => p.id === s.phoneApiSelected) || null;
}

export async function phoneApiRequest(prompt, { image = null, maxTokens = 1500 } = {}) {
    const profile = selectedPhoneApi();
    if (!profile) return null; // caller uses original SillyTavern route
    const url = String(profile.url || '').trim();
    const model = String(profile.model || '').trim();
    const key = String(profile.key || '').trim();
    if (!/^https:\/\//i.test(url)) throw new Error('Телефонный API: нужен HTTPS URL полного chat/completions endpoint.');
    if (!model || !key) throw new Error('Телефонный API: укажи модель и ключ в выбранном профиле.');
    const content = image
        ? [{type:'text', text:String(prompt)}, {type:'image_url',image_url:{url:String(image),detail:'auto'}}]
        : String(prompt);
    const response = await fetch(url, {
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},
        body:JSON.stringify({model,messages:[{role:'user',content}],max_tokens:maxTokens,stream:false}),
    });
    const payload = await response.json().catch(()=>null);
    if (!response.ok) throw new Error(`Телефонный API HTTP ${response.status}: ${String(payload?.error?.message || payload?.message || response.statusText).slice(0,250)}`);
    const message = payload?.choices?.[0]?.message;
    const result = typeof message?.content === 'string' ? message.content : Array.isArray(message?.content) ? message.content.filter(x=>x.type==='text').map(x=>x.text).join('\n') : '';
    if (!result) throw new Error('Телефонный API вернул пустой ответ или неподдерживаемый формат.');
    return result;
}
