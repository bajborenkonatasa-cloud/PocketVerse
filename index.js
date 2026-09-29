import { getContext } from '../../../extensions.js';
import { generateRaw, getThumbnailUrl } from '../../../../script.js';

const VERSION = '0.3.1';
  const ID='pocketverse-root';
  const STORE='pocketverse.v0.1';
  const BRAIN_STORE='pocketverse.brain.v0.3';
  const state={screen:'home', chatId:null, replyTo:null, generating:false, showReactions:null};
  function load(){try{return JSON.parse(localStorage.getItem(STORE)||'{}')}catch{return {}}}
  function save(v){localStorage.setItem(STORE,JSON.stringify(v));}
  function chatKey(){
    const ctx=getContext?.();
    return String(ctx?.chatId ?? ctx?.chat_metadata?.chat_id ?? ctx?.characterId ?? location.pathname);
  }
  function data(){const all=load(); const k=chatKey(); all[k]??={threads:{demo:{name:(getContext?.()?.name2 || getContext?.()?.characterName || 'Персонаж'),messages:[]}}}; return {all,k,box:all[k]};}
  function persist(all){save(all);}
  function esc(s=''){return String(s).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
  function mount(){
    if(document.getElementById(ID))return;
    const root=document.createElement('div'); root.id=ID;
    root.innerHTML=`<button class="pv-fab" aria-label="PocketVerse">📱</button><div class="pv-overlay" hidden><section class="pv-phone"><header class="pv-status"><span class="pv-clock"></span><span>◔  Wi‑Fi  ▰</span></header><main class="pv-screen"></main><footer class="pv-nav"><button data-pv="back">‹</button><button data-pv="home">●</button><button data-pv="close">×</button></footer></section></div>`;
    document.body.appendChild(root);
    root.querySelector('.pv-fab').onclick=()=>open();
    root.addEventListener('click',onClick);
    render(); setInterval(clock,30000); clock();
  }
  function clock(){const el=document.querySelector('.pv-clock');if(el)el.textContent=new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});}
  function open(){document.querySelector('.pv-overlay').hidden=false; state.screen='home';render();}
  function close(){document.querySelector('.pv-overlay').hidden=true;}
  function onClick(e){const b=e.target.closest('[data-pv]'); if(!b)return; const a=b.dataset.pv;
    if(a==='close')return close(); if(a==='home'){state.screen='home';return render();} if(a==='back'){state.screen=state.screen==='thread'?'messages':state.screen==='brain'?'thread':'home';return render();}
    if(a==='messages'){state.screen='messages';return render();} if(a==='thread'){state.screen='thread';state.chatId=b.dataset.id;return render();}
    if(a==='send-local'){sendLocal();} if(a==='ai-reply'){generateCharacterReply();} if(a==='react-menu'){state.showReactions=state.showReactions===b.dataset.id?null:b.dataset.id;render();} if(a==='react'){reactTo(b.dataset.id,b.dataset.emoji);} if(a==='reply'){startReply(b.dataset.id);} if(a==='cancel-reply'){state.replyTo=null;render();} if(a==='brain'){state.screen='brain';render();}
  }

  function findMessage(box,id){for(const t of Object.values(box.threads||{})){const m=(t.messages||[]).find(x=>String(x.id)===String(id));if(m)return m;}return null;}
  function reactTo(id,emoji){const {all,box}=data();const m=findMessage(box,id);if(!m)return;m.reactions??={};m.reactions[emoji]=(m.reactions[emoji]||0)+1;persist(all);render();}
  function startReply(id){state.replyTo=id;render();setTimeout(()=>document.querySelector('.pv-input')?.focus(),0);}
  function messageHtml(m,t){
    const replied=m.replyTo?(t.messages||[]).find(x=>String(x.id)===String(m.replyTo)):null;
    const reacts=Object.entries(m.reactions||{}).map(([e,n])=>`<span>${e}${n>1?' '+n:''}</span>`).join('');
    const menu=state.showReactions===String(m.id)?`<div class="pv-reactmenu">${['❤️','😂','😭','💀','👀','👍','😡','🥹','🤌🏻','😅','🔥','💔'].map(e=>`<button data-pv="react" data-id="${esc(m.id)}" data-emoji="${e}">${e}</button>`).join('')}</div>`:'';
    return `<div class="pv-msgwrap ${m.from==='user'?'me':'them'}"><div class="pv-bubble ${m.from==='user'?'me':'them'}" data-mid="${esc(m.id)}">${replied?`<div class="pv-quote">↪ ${esc(replied.text.slice(0,90))}</div>`:''}${esc(m.text)}<small>${new Date(m.at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</small></div><div class="pv-msgtools"><button data-pv="reply" data-id="${esc(m.id)}">↩</button><button data-pv="react-menu" data-id="${esc(m.id)}">☺</button></div>${menu}${reacts?`<div class="pv-reactions">${reacts}</div>`:''}</div>`;
  }

  function currentCharacter(){
    const ctx=getContext?.()||{}; const cid=ctx.characterId;
    const c=(ctx.characters && cid!=null)?ctx.characters[cid]:null;
    return {ctx,c,name:c?.name||ctx.name2||ctx.characterName||'Персонаж'};
  }
  function cleanText(v=''){
    return String(v)
      .replace(/<START>[\s\S]*$/i,' ')
      .replace(/<[^>]+>/g,' ')
      .replace(/\{\{[^}]+\}\}/g,' ')
      .replace(/\s+/g,' ').trim();
  }
  function compactPersona(){
    const {c,name}=currentCharacter();
    if(!c) return `Name: ${name}. Stay strictly in character.`;
    const personality=cleanText(c.personality||'').slice(0,420);
    let desc=cleanText(c.description||'');
    // Description cards often contain appearance + examples. Messages only need stable behavioral traits.
    desc=desc.replace(/\[[^\]]*(?:body|hair|eyes|skin|teeth|lips|dress|clothes|appearance)[^\]]*\]/ig,' ');
    desc=desc.replace(/(?:body|appearance|looks?)\s*[:=][^.;]{0,260}/ig,' ');
    desc=desc.replace(/\s+/g,' ').trim().slice(0,260);
    const scenario=cleanText(c.scenario||'').slice(0,180);
    const parts=[`Name: ${name}`];
    if(personality) parts.push(`Core personality: ${personality}`);
    else if(desc) parts.push(`Behavior: ${desc}`);
    if(scenario) parts.push(`Relevant setting: ${scenario}`);
    return parts.join('\n');
  }
  function sanitizeRpText(v=''){
    let x=String(v||'')
      .replace(/<[^>]+>/g,' ')
      .replace(/\[Scene image:[\s\S]*?(?=(?:\n|$))/ig,' ')
      .replace(/Scene image\s*:[^\n]*/ig,' ')
      .replace(/\b(?:masterpiece|best quality|amazing quality|highres|very aesthetic|painterly|detailed face|1boy|1girl)\b[^\n]*/ig,' ')
      .replace(/\((?:ooc|OOC)[\s\S]*?\)/g,' ')
      .replace(/\b(?:prompt|negative prompt)\s*:[^\n]*/ig,' ')
      .replace(/\{\{[^}]+\}\}/g,' ')
      .replace(/[ \t]+/g,' ')
      .replace(/\n{2,}/g,'\n').trim();
    // Extension/service lines are useful in the main chat but poison a tiny phone context.
    x=x.split('\n').filter(line=>{
      const l=line.trim();
      if(!l) return false;
      return !/(?:scene\s*blocks?|sillyimages?|hanabi\s*:\s*\(?ooc|negative\s*prompt|masterpiece|best\s*quality)/i.test(l);
    }).join(' ');
    return x.replace(/\s+/g,' ').trim();
  }
  function recentRpDigest(){
    const {ctx}=currentCharacter(); const chat=Array.isArray(ctx.chat)?ctx.chat:[];
    const rows=[];
    for(const m of chat.slice(-10)){
      const clean=sanitizeRpText(m.mes||'');
      if(!clean || clean.length<3) continue;
      const who=m.is_user?(ctx.name1||'User'):(ctx.name2||'Character');
      rows.push(`${who}: ${clean.slice(0,190)}`);
      if(rows.length>4) rows.shift();
    }
    // Hard local budget: this is an excerpt of recent RP, not the full chat and not an LLM summary.
    return rows.join('\n').slice(0,620);
  }
  function brainInfo(t){
    const persona=compactPersona(), rp=recentRpDigest();
    const msgs=(t?.messages||[]).slice(-10).map(m=>`${m.from==='user'?'User':'Character'}: ${m.text}`).join('\n');
    const approx=x=>Math.ceil(String(x||'').length/4);
    return {persona,rp,msgs,tokens:{persona:approx(persona),rp:approx(rp),messages:approx(msgs)}};
  }
  function extractJson(text){
    const raw=String(text||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/```$/,'').trim();
    try{return JSON.parse(raw)}catch{}
    const a=raw.indexOf('{'),b=raw.lastIndexOf('}'); if(a>=0&&b>a){try{return JSON.parse(raw.slice(a,b+1))}catch{}}
    return {messages:[raw.slice(0,500)]};
  }
  async function generateCharacterReply(){
    if(state.generating)return; const {all,box}=data(); const id=state.chatId||'demo'; const t=box.threads[id]; if(!t)return;
    state.generating=true; render();
    try{
      const {name}=currentCharacter(); const bi=brainInfo(t);
      const prompt=`You are writing ONLY a private messenger reply as ${name}.\n\nCOMPACT CHARACTER:\n${bi.persona}\n\nRECENT RP EVENTS:\n${bi.rp||'(none available)'}\n\nRECENT PHONE CHAT:\n${bi.msgs||'(empty)'}\n\nRules: stay strictly in character; react to the newest phone messages; write like texting, not prose; never narrate actions; never write for User; keep it short. Return ONLY valid JSON: {"messages":["bubble 1","bubble 2"],"reaction":"optional emoji or empty"}. Use 1-4 bubbles, usually 1-3. Total reply under 90 words.`;
      const raw=await generateRaw({prompt,systemPrompt:'',quietToLoud:false,instructOverride:true,responseLength:180,trimNames:false});
      const obj=extractJson(typeof raw==='string'?raw:(raw?.text||raw?.content||''));
      const arr=Array.isArray(obj.messages)?obj.messages.slice(0,4):[];
      for(const txt of arr){if(!String(txt).trim())continue; t.messages.push({id:crypto.randomUUID?.()||String(Date.now()+Math.random()),from:'char',text:String(txt).trim().slice(0,700),at:Date.now(),replyTo:null,reactions:{},media:[]});}
      persist(all);
    }catch(e){console.error('[PocketVerse] character reply failed',e); if(window.toastr)toastr.error(String(e?.message||e),'PocketVerse');}
    finally{state.generating=false;render(); setTimeout(()=>{const b=document.querySelector('.pv-bubbles'); if(b)b.scrollTop=b.scrollHeight},0);}
  }

  function sendLocal(){const inp=document.querySelector('.pv-input');const text=inp?.value.trim();if(!text)return;const {all,k,box}=data(); const id=state.chatId||'demo';box.threads[id]??={name:'Чат',messages:[]};box.threads[id].messages.push({id:crypto.randomUUID?.()||String(Date.now()),from:'user',text,at:Date.now(),replyTo:state.replyTo||null,reactions:{},media:[]});state.replyTo=null;persist(all);inp.value='';render();}
  function render(){const s=document.querySelector('.pv-screen');if(!s)return;
    if(state.screen==='home') s.innerHTML=`<div class="pv-home"><div class="pv-bigtime">${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div><div class="pv-date">${new Date().toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'})}</div><div class="pv-grid"><button class="pv-app" data-pv="messages"><span>💬</span><b>Сообщения</b></button><button class="pv-app pv-disabled"><span>📸</span><b>Social</b><small>скоро</small></button><button class="pv-app pv-disabled"><span>📌</span><b>Campus</b><small>скоро</small></button><button class="pv-app pv-disabled"><span>👥</span><b>Контакты</b><small>скоро</small></button></div><p class="pv-zero">Навигация и локальные сообщения: 0 запросов к модели.</p></div>`;
    if(state.screen==='messages'){const {box}=data();s.innerHTML=`<div class="pv-title">💬 Сообщения</div><div class="pv-list">${Object.entries(box.threads).map(([id,t])=>`<button class="pv-thread" data-pv="thread" data-id="${esc(id)}"><span class="pv-avatar">${esc((t.name||'?')[0])}</span><span><b>${esc(t.name)}</b><small>${esc(t.messages.at(-1)?.text||'Локальный тестовый чат')}</small></span><i>›</i></button>`).join('')}</div>`;}
    if(state.screen==='brain'){const {box}=data();const t=box.threads[state.chatId]||box.threads.demo;const bi=brainInfo(t);const total=bi.tokens.persona+bi.tokens.rp+bi.tokens.messages+110;s.innerHTML=`<div class="pv-title">🧠 Compact Context</div><div class="pv-braincard"><b>Persona · ~${bi.tokens.persona} ток.</b><pre>${esc(bi.persona)}</pre></div><div class="pv-braincard"><b>Последний RP · ~${bi.tokens.rp} ток.</b><pre>${esc(bi.rp||'Нет доступного RP-контекста')}</pre></div><div class="pv-braincard"><b>Телефон · ~${bi.tokens.messages} ток.</b><pre>${esc(bi.msgs||'Пока пусто')}</pre></div><div class="pv-tokenline">Контекст PocketVerse: ~${total} токенов · обычная ➤ отправка = 0 запросов</div>`;}
    if(state.screen==='thread'){const {box}=data();const t=box.threads[state.chatId]||box.threads.demo;s.innerHTML=`<div class="pv-chathead"><button data-pv="back">‹</button><b>${esc(t.name)}</b><span>${state.generating?'печатает…':'онлайн'}</span><button class="pv-brainbtn" data-pv="brain">🧠</button></div><div class="pv-bubbles">${t.messages.map(m=>messageHtml(m,t)).join('')||'<div class="pv-empty">Напиши несколько сообщений лесенкой, а потом нажми ✨ — это будет один запрос 🙂</div>'}</div>${state.replyTo?`<div class="pv-replybar">↪ Ответ на сообщение <button data-pv="cancel-reply">×</button></div>`:''}<div class="pv-compose"><button class="pv-attach" disabled title="Медиа будет в v0.4">📎</button><textarea class="pv-input" rows="1" placeholder="Сообщение"></textarea><button data-pv="send-local">➤</button><button class="pv-ai" data-pv="ai-reply" ${state.generating?'disabled':''}>${state.generating?'…':'✨'}</button></div>`;}
  }
  function mountSettings(){
    if(document.getElementById('pocketverse-settings')) return;
    const host=document.getElementById('extensions_settings2') || document.getElementById('extensions_settings');
    if(!host) return;
    const card=document.createElement('div');
    card.id='pocketverse-settings';
    card.className='extension_container';
    card.innerHTML=`<div class="inline-drawer"><div class="inline-drawer-toggle inline-drawer-header"><b>📱 PocketVerse · ${VERSION}</b><div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div></div><div class="inline-drawer-content"><p>Карманный RP-мир. v0.3.1: Context Cleanup — компактная Persona + очищенный RP без image/OOC мусора + короткие ответы по ✨.</p><button type="button" class="menu_button" id="pocketverse-open-settings">📱 Открыть PocketVerse</button></div></div>`;
    host.appendChild(card);
    card.querySelector('#pocketverse-open-settings')?.addEventListener('click', open);
  }
  function mountAll(){ mount(); mountSettings(); }
  const ctx=getContext?.();
  const ev=ctx?.eventSource;
  const types=ctx?.eventTypes || ctx?.event_types;
  if(ev && types?.APP_READY) ev.on(types.APP_READY, mountAll);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', mountAll, {once:true}); else mountAll();
  setTimeout(mountAll, 500);
  setTimeout(mountAll, 1500);

export { VERSION };
