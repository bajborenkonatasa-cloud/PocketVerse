// PocketVerse v0.7: conservative, per-chat story invitations. No extra API calls.
import { getMeta, saveMeta } from './state.js';
import { worldDate, addWorldEvent, worldSettingHint } from './world-calendar.js';
const cap=(x,n=180)=>String(x||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
function store(){const m=getMeta();if(!m.worldInvitations||typeof m.worldInvitations!=='object')m.worldInvitations={items:[],enabled:true};const s=m.worldInvitations;if(!Array.isArray(s.items))s.items=[];return s;}
export function storyInvitations(){return store().items;}
export function invitationEnabled(){return store().enabled!==false;}
export function setInvitationEnabled(v){store().enabled=!!v;saveMeta();}
function sourceKey(m,index){return `${index}:${String(m?.mes||'').length}:${String(m?.mes||'').slice(-80)}`;}
// Strictly an invitation addressed to the player; do not manufacture events from narration.
function parseInvitation(message){
 const text=cap(message,3500);
 if(!/(приглашаю тебя|пригласить тебя|пойд[её]шь со мной|пойд[её]м (?:со мной|вместе)|хочешь пойти со мной|составишь мне компанию|would you like to (?:come|join|go)|come with me|i invite you)/i.test(text))return null;
 const m=text.match(/(?:на |в |во |к |to |at )(бал|праздник|ужин|свидание|прогулку|ярмарку|пир|торжество|встречу|концерт|фестиваль|ball|dinner|date|festival|party|walk)/i);
 const title=m?`Приглашение: ${m[1]}`:'Приглашение провести время вместе';
 return {title,excerpt:text.slice(0,220)};
}
export function scanStoryInvitations(){
 if(!invitationEnabled())return null;
 const chat=globalThis.SillyTavern?.getContext?.()?.chat||[];
 const index=chat.length-1,m=chat[index];
 if(index<0||!m||m.is_user||m.is_system||!m.mes)return null;
 const s=store(),key=sourceKey(m,index);
 if(s.items.some(x=>x.source===key))return null;
 const found=parseInvitation(m.mes);if(!found)return null;
 const item={id:`invite_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`,source:key,who:cap(m.name,65)||'Персонаж',title:found.title,excerpt:found.excerpt,date:worldDate(),status:'pending'};
 s.items.unshift(item);s.items=s.items.slice(0,25);saveMeta();return item;
}
export function resolveStoryInvitation(id,status){
 const s=store(),item=s.items.find(x=>x.id===id);
 if(!item||!['accepted','declined','later'].includes(status))return false;
 item.status=status;item.resolvedOn=worldDate();
 // No automatic calendar booking without a known date. No relationship changes.
 saveMeta();return true;
}
export function invitationPromptLine(){
 const pending=storyInvitations().filter(x=>x.status!=='pending'&&!x.contextDelivered).slice(0,2);
 if(!pending.length)return '';
 // Stable concise note; not an imperative to force emotion.
 return '\n<story_invitation_decisions>'+pending.map(x=>`${x.who}: ${x.title}; user ${x.status==='accepted'?'accepted':x.status==='declined'?'declined':'asked to postpone'}. Respond naturally in-character when relevant; do not force hurt feelings or assume a new date.`).join(' ')+'</story_invitation_decisions>';
}
export function markInvitationDecisionsDelivered(){
 const s=store();let changed=false;
 for(const x of s.items)if(x.status!=='pending'&&!x.contextDelivered){x.contextDelivered=true;changed=true;}
 if(changed)saveMeta();
}
export function invitationTheme(){const c=worldSettingHint()?.culture||'';return /fantasy|medieval|фэнтези|средневек/i.test(c)?'parchment':'modern';}
