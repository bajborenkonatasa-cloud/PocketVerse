import { getContext } from '../../../extensions.js';

const VERSION = '0.2.0';
  const ID='pocketverse-root';
  const STORE='pocketverse.v0.1';
  const state={screen:'home', chatId:null};
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
    if(a==='close')return close(); if(a==='home'){state.screen='home';return render();} if(a==='back'){state.screen=state.screen==='thread'?'messages':'home';return render();}
    if(a==='messages'){state.screen='messages';return render();} if(a==='thread'){state.screen='thread';state.chatId=b.dataset.id;return render();}
    if(a==='send-local'){sendLocal();} if(a==='react'){reactTo(b.dataset.id,b.dataset.emoji);} if(a==='reply'){startReply(b.dataset.id);} if(a==='cancel-reply'){state.replyTo=null;render();}
  }

  state.replyTo=null;
  function findMessage(box,id){for(const t of Object.values(box.threads||{})){const m=(t.messages||[]).find(x=>String(x.id)===String(id));if(m)return m;}return null;}
  function reactTo(id,emoji){const {all,box}=data();const m=findMessage(box,id);if(!m)return;m.reactions??={};m.reactions[emoji]=(m.reactions[emoji]||0)+1;persist(all);render();}
  function startReply(id){state.replyTo=id;render();setTimeout(()=>document.querySelector('.pv-input')?.focus(),0);}
  function messageHtml(m,t){const replied=m.replyTo?(t.messages||[]).find(x=>String(x.id)===String(m.replyTo)):null;const reacts=Object.entries(m.reactions||{}).map(([e,n])=>`<span>${e}${n>1?' '+n:''}</span>`).join('');return `<div class="pv-msgwrap ${m.from==='user'?'me':'them'}"><div class="pv-bubble ${m.from==='user'?'me':'them'}" data-mid="${esc(m.id)}">${replied?`<div class="pv-quote">↪ ${esc(replied.text.slice(0,90))}</div>`:''}${esc(m.text)}<small>${new Date(m.at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</small></div><div class="pv-msgtools"><button data-pv="reply" data-id="${esc(m.id)}">↩</button>${['❤️','😂','😭','💀','👀','👍'].map(e=>`<button data-pv="react" data-id="${esc(m.id)}" data-emoji="${e}">${e}</button>`).join('')}</div>${reacts?`<div class="pv-reactions">${reacts}</div>`:''}</div>`;}

  function sendLocal(){const inp=document.querySelector('.pv-input');const text=inp?.value.trim();if(!text)return;const {all,k,box}=data(); const id=state.chatId||'demo';box.threads[id]??={name:'Чат',messages:[]};box.threads[id].messages.push({id:crypto.randomUUID?.()||String(Date.now()),from:'user',text,at:Date.now(),replyTo:state.replyTo||null,reactions:{},media:[]});state.replyTo=null;persist(all);inp.value='';render();}
  function render(){const s=document.querySelector('.pv-screen');if(!s)return;
    if(state.screen==='home') s.innerHTML=`<div class="pv-home"><div class="pv-bigtime">${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div><div class="pv-date">${new Date().toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'})}</div><div class="pv-grid"><button class="pv-app" data-pv="messages"><span>💬</span><b>Сообщения</b></button><button class="pv-app pv-disabled"><span>📸</span><b>Social</b><small>скоро</small></button><button class="pv-app pv-disabled"><span>📌</span><b>Campus</b><small>скоро</small></button><button class="pv-app pv-disabled"><span>👥</span><b>Контакты</b><small>скоро</small></button></div><p class="pv-zero">Навигация и локальные сообщения: 0 запросов к модели.</p></div>`;
    if(state.screen==='messages'){const {box}=data();s.innerHTML=`<div class="pv-title">💬 Сообщения</div><div class="pv-list">${Object.entries(box.threads).map(([id,t])=>`<button class="pv-thread" data-pv="thread" data-id="${esc(id)}"><span class="pv-avatar">${esc((t.name||'?')[0])}</span><span><b>${esc(t.name)}</b><small>${esc(t.messages.at(-1)?.text||'Локальный тестовый чат')}</small></span><i>›</i></button>`).join('')}</div>`;}
    if(state.screen==='thread'){const {box}=data();const t=box.threads[state.chatId]||box.threads.demo;s.innerHTML=`<div class="pv-chathead"><button data-pv="back">‹</button><b>${esc(t.name)}</b><span>локально</span></div><div class="pv-bubbles">${t.messages.map(m=>messageHtml(m,t)).join('')||'<div class="pv-empty">Напиши несколько сообщений подряд — модель пока вообще не вызывается 🙂</div>'}</div>${state.replyTo?`<div class="pv-replybar">↪ Ответ на сообщение <button data-pv="cancel-reply">×</button></div>`:''}<div class="pv-compose"><textarea class="pv-input" rows="1" placeholder="Сообщение"></textarea><button data-pv="send-local">➤</button><button class="pv-ai" disabled title="Ответ персонажа подключим следующим этапом">✨</button></div>`;}
  }
  function mountSettings(){
    if(document.getElementById('pocketverse-settings')) return;
    const host=document.getElementById('extensions_settings2') || document.getElementById('extensions_settings');
    if(!host) return;
    const card=document.createElement('div');
    card.id='pocketverse-settings';
    card.className='extension_container';
    card.innerHTML=`<div class="inline-drawer"><div class="inline-drawer-toggle inline-drawer-header"><b>📱 PocketVerse · ${VERSION}</b><div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div></div><div class="inline-drawer-content"><p>Карманный RP-мир. v0.2.0: Messages — лесенка, цитаты и реакции локально, без запросов к модели.</p><button type="button" class="menu_button" id="pocketverse-open-settings">📱 Открыть PocketVerse</button></div></div>`;
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
