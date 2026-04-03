// widget.js — PokeMMO Shiny Tracker Widget
// Lit les données depuis Supabase en temps réel

const p = new URLSearchParams(location.search);
const TYPE = p.get('t') || 'chase';
const SB_URL = p.get('u');
const SB_KEY = p.get('k');

if(!SB_URL || !SB_KEY) {
  document.getElementById('root').innerHTML = '<div style="color:#f85149;font-family:monospace;font-size:12px;padding:10px;">URL ou clé Supabase manquante</div>';
}

function ft(ms){
  const s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sc=s%60;
  return [h,m,sc].map(x=>String(x).padStart(2,'0')).join(':');
}
function rgba(hex,op){
  try{const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return`rgba(${r},${g},${b},${op/100})`;}
  catch(e){return'transparent';}
}
function sUrl(slug,anim){
  return anim
    ? `https://img.pokemondb.net/sprites/black-white/anim/shiny/${slug}.gif`
    : `https://img.pokemondb.net/sprites/black-white/normal/${slug}.png`;
}

let STATE = null;
let lastTs = 0;

async function fetchState() {
  try {
    const res = await fetch(`${SB_URL}/rest/v1/state?id=eq.main&select=data,updated_at`, {
      headers: {
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    if(!res.ok) return;
    const rows = await res.json();
    if(!rows||!rows[0]) return;
    const ts = new Date(rows[0].updated_at).getTime();
    if(ts !== lastTs) {
      lastTs = ts;
      STATE = rows[0].data;
      render();
    }
  } catch(e) {}
}

function render() {
  if(!STATE) return;
  if(TYPE==='chase') renderChase();
  else if(TYPE==='list') renderList();
  else if(TYPE==='history') renderHistory();
}

function renderChase() {
  const S = STATE;
  const h = S.hunts && S.hunts.find(x=>x.id===S.activeId&&!x.found);
  const cfg = Object.assign({layout:'v',m:['name','count','time'],o:['shadow','bg','anim'],bg:'#0d1117',tx:'#f0c040',sub:'#8b949e',op:90}, S.wc||{});
  const anim=cfg.o.includes('anim'),hasBg=cfg.o.includes('bg'),hasShadow=cfg.o.includes('shadow'),hideSprite=cfg.o.includes('hsprite');
  const show=k=>cfg.m.includes(k);
  const slug=h?h.slug:'';
  const now=Date.now();
  const sess=h?((h.elapsed||0)+(h.startTime&&!S.paused?now-h.startTime:0)):0;
  const total=(S.totalElapsed||0)+(!S.paused&&S.globalStart?now-S.globalStart:0);
  const prob=h?((1-Math.pow(1-1/h.odds,h.count))*100).toFixed(1)+'%':'0%';
  const lc=cfg.layout==='h'?'wh':cfg.layout==='hf'?'whf':'wv';
  const bgSt=hasBg?`background:${rgba(cfg.bg,cfg.op)};border-color:${cfg.tx};border-width:2px;`:'border:none;background:transparent;';
  let o=`<div class="wgt ${lc}${hasShadow?' sh':''}" style="${bgSt}">`;
  if(!hideSprite&&cfg.layout!=='count'&&cfg.layout!=='time'&&slug)
    o+=`<img src="${sUrl(slug,anim)}" style="width:60px;height:60px;" onerror="this.style.display='none'">`;
  if(cfg.layout!=='sprite'){
    o+=`<div>`;
    if(show('name'))o+=`<div class="wpn" style="color:${cfg.tx};">${h?h.name.toUpperCase():'EN CHASSE'}</div>`;
    if(show('count')&&cfg.layout!=='time')o+=`<div class="wpc" style="color:${cfg.tx};">${h?h.count.toLocaleString():'0'}</div>`;
    if(show('time')&&cfg.layout!=='count')o+=`<div class="wps" style="color:${cfg.sub};">⏱ ${ft(sess)}</div>`;
    if(show('totaltime'))o+=`<div class="wps" style="color:${cfg.sub};">⏱ Tot. ${ft(total)}</div>`;
    if(show('phase'))o+=`<div class="wps" style="color:${cfg.sub};">Phase ${h?h.phase:1}</div>`;
    if(show('prob'))o+=`<div class="wps" style="color:${cfg.sub};">Proba: ${prob}</div>`;
    o+=`</div>`;
  }
  o+=`</div>`;
  document.getElementById('root').innerHTML=o;
}

function renderList() {
  const S = STATE;
  const cfg=Object.assign({m:['lname','lcount','lsprite','lanim'],bg:'#0d1117',tx:'#f0c040',sub:'#8b949e',op:90},S.wl||{});
  const active=(S.hunts||[]).filter(h=>!h.found);
  const sA=cfg.m.includes('lanim'),sSp=cfg.m.includes('lsprite'),sN=cfg.m.includes('lname'),sC=cfg.m.includes('lcount'),sPh=cfg.m.includes('lphase'),sT=cfg.m.includes('ltime'),sTT=cfg.m.includes('ltotaltime');
  const total=(S.totalElapsed||0)+(!S.paused&&S.globalStart?Date.now()-S.globalStart:0);
  if(!active.length){document.getElementById('root').innerHTML=`<div class="wlist" style="background:${rgba(cfg.bg,cfg.op)};border-color:${cfg.tx};"><div style="font-size:11px;color:${cfg.sub};padding:4px;">Aucune chasse active</div></div>`;return;}
  let o=`<div class="wlist" style="background:${rgba(cfg.bg,cfg.op)};border-color:${cfg.tx};">`;
  active.forEach(h=>{
    const hs=(h.elapsed||0)+(h.startTime&&!S.paused?Date.now()-h.startTime:0);
    const isA=h.id===S.activeId;
    o+=`<div class="wli">`;
    if(sSp)o+=`<img src="${sUrl(h.slug,sA)}" style="width:36px;height:36px;" onerror="this.style.display='none'">`;
    o+=`<div style="flex:1;min-width:0;">`;
    if(sN)o+=`<div style="font-size:12px;font-weight:600;color:${isA?cfg.tx:'#aaa'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${isA?'● ':''}${h.name}</div>`;
    if(sPh)o+=`<div style="font-size:10px;color:${cfg.sub};">Phase ${h.phase}</div>`;
    if(sT)o+=`<div style="font-size:10px;color:${cfg.sub};">⏱ ${ft(hs)}</div>`;
    if(sTT)o+=`<div style="font-size:10px;color:${cfg.sub};">⏱ Tot. ${ft(total)}</div>`;
    o+=`</div>`;
    if(sC)o+=`<div class="wlc" style="color:${cfg.tx};">${h.count.toLocaleString()}</div>`;
    o+=`</div>`;
  });
  o+=`</div>`;
  document.getElementById('root').innerHTML=o;
}

function renderHistory() {
  const S = STATE;
  const cfg=Object.assign({layout:'list',m:['hname','hcount','hsprite','hanim'],nb:3,bg:'#0d1117',tx:'#f0c040',sub:'#8b949e',op:90},S.wh||{});
  const items=(S.history||[]).slice(0,cfg.nb||3);
  const sA=cfg.m.includes('hanim'),sSp=cfg.m.includes('hsprite'),sN=cfg.m.includes('hname'),sC=cfg.m.includes('hcount'),sD=cfg.m.includes('hdate'),sT=cfg.m.includes('htime'),sPh=cfg.m.includes('hphase');
  const layout=cfg.layout||'list';
  if(!items.length){document.getElementById('root').innerHTML=`<div class="whist" style="background:${rgba(cfg.bg,cfg.op)};border-color:${cfg.tx};"><div style="font-size:11px;color:${cfg.sub};padding:6px;">Aucun shiny encore...</div></div>`;return;}
  if(layout==='last1'){
    const h=items[0];
    let o=`<div class="whist" style="background:${rgba(cfg.bg,cfg.op)};border-color:${cfg.tx};align-items:center;text-align:center;gap:6px;">`;
    if(sSp)o+=`<img src="${sUrl(h.slug,sA)}" style="width:64px;height:64px;" onerror="this.style.display='none'">`;
    if(sN)o+=`<div class="wpn" style="color:${cfg.tx};">✦ ${h.name}</div>`;
    if(sC)o+=`<div class="wpc" style="color:${cfg.tx};">${h.count.toLocaleString()}</div>`;
    if(sD)o+=`<div style="font-size:10px;color:${cfg.sub};">${h.date}</div>`;
    o+=`</div>`;
    document.getElementById('root').innerHTML=o;return;
  }
  const isCard=layout==='cards',isH=layout==='horizontal';
  let o=`<div class="whist${isCard||isH?' wh':''}" style="background:${rgba(cfg.bg,cfg.op)};border-color:${cfg.tx};">`;
  items.forEach(h=>{
    const mins=Math.floor((h.elapsed||0)/60000);
    const ts=mins>60?`${Math.floor(mins/60)}h ${mins%60}m`:`${mins}m`;
    if(isCard){
      o+=`<div class="whc">`;
      if(sSp)o+=`<img src="${sUrl(h.slug,sA)}" style="width:40px;height:40px;" onerror="this.style.display='none'">`;
      if(sN)o+=`<div style="font-size:10px;font-weight:700;color:${cfg.tx};">✦ ${h.name}</div>`;
      if(sC)o+=`<div style="font-family:'Press Start 2P',monospace;font-size:10px;color:${cfg.tx};">${h.count.toLocaleString()}</div>`;
      if(sD)o+=`<div style="font-size:9px;color:${cfg.sub};">${h.date}</div>`;
      if(sPh)o+=`<div style="font-size:9px;color:${cfg.sub};">Ph.${h.phase}</div>`;
      o+=`</div>`;
    } else {
      o+=`<div class="whi">`;
      if(sSp)o+=`<img src="${sUrl(h.slug,sA)}" style="width:36px;height:36px;" onerror="this.style.display='none'">`;
      o+=`<div style="flex:1;min-width:0;">`;
      if(sN)o+=`<div style="font-size:11px;font-weight:700;color:${cfg.tx};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">✦ ${h.name}</div>`;
      if(sD)o+=`<div style="font-size:9px;color:${cfg.sub};">${h.date}${sPh?' • Ph.'+h.phase:''}</div>`;
      if(sT)o+=`<div style="font-size:9px;color:${cfg.sub};">⏱ ${ts}</div>`;
      o+=`</div>`;
      if(sC)o+=`<div style="font-family:'Press Start 2P',monospace;font-size:11px;color:${cfg.tx};white-space:nowrap;">${h.count.toLocaleString()}</div>`;
      o+=`</div>`;
    }
  });
  o+=`</div>`;
  document.getElementById('root').innerHTML=o;
}

// Poll Supabase every 2 seconds
fetchState();
setInterval(fetchState, 2000);
// Also re-render every second for live timers
setInterval(() => { if(STATE) render(); }, 1000);
