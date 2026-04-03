// widget.js — PokeMMO Shiny Tracker Widget v2
// Sprites: PokeAPI (pas de CORS) + fallback numéro
// Layout: remplit toute la fenêtre OBS

const p = new URLSearchParams(location.search);
const TYPE = p.get('t') || 'chase';
const SB_URL = p.get('u') ? decodeURIComponent(p.get('u')) : '';
const SB_KEY = p.get('k') ? decodeURIComponent(p.get('k')) : '';

// ── SPRITE SOURCES (sans CORS) ────────────────────────
// PokeAPI = pas de restrictions CORS, marche dans OBS
function sUrl(slug, anim) {
  if (!slug) return '';
  // Animated shiny: on utilise pokemondb via un proxy CORS public
  // Fallback: PokeAPI officiel (toujours dispo, pas de CORS)
  if (anim) {
    // Showdown sprites = hébergés sur GitHub, pas de CORS
    return `https://play.pokemonshowdown.com/sprites/ani-shiny/${slug}.gif`;
  }
  // Static: PokeAPI sprites officiels
  return `https://play.pokemonshowdown.com/sprites/gen5/${slug}.png`;
}

function ft(ms) {
  const s=Math.floor(ms/1000), h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sc=s%60;
  return [h,m,sc].map(x=>String(x).padStart(2,'0')).join(':');
}
function rgba(hex, op) {
  try {
    const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${op/100})`;
  } catch(e) { return 'transparent'; }
}

let STATE = null;
let lastTs = 0;
let connected = false;

async function fetchState() {
  if (!SB_URL || !SB_KEY) return;
  try {
    const res = await fetch(`${SB_URL}/rest/v1/state?id=eq.main&select=data,updated_at`, {
      headers: {
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) { connected = false; return; }
    const rows = await res.json();
    if (!rows || !rows[0]) return;
    connected = true;
    const ts = new Date(rows[0].updated_at).getTime();
    if (ts !== lastTs) {
      lastTs = ts;
      STATE = rows[0].data;
      render();
    }
  } catch(e) { connected = false; }
}

function render() {
  if (!STATE) {
    document.getElementById('root').innerHTML = `
      <div style="color:#f0c040;font-family:'Press Start 2P',monospace;font-size:10px;text-align:center;padding:20px;">
        En attente de données...
      </div>`;
    return;
  }
  if (TYPE==='chase') renderChase();
  else if (TYPE==='list') renderList();
  else if (TYPE==='history') renderHistory();
}

// ── WIDGET CHASSE ─────────────────────────────────────
function renderChase() {
  const S = STATE;
  const h = S.hunts && S.hunts.find(x => x.id===S.activeId && !x.found);
  const cfg = Object.assign({
    layout:'v', m:['name','count','time'], o:['shadow','bg','anim'],
    bg:'#0d1117', tx:'#f0c040', sub:'#8b949e', op:90
  }, S.wc||{});

  const anim = cfg.o.includes('anim');
  const hasBg = cfg.o.includes('bg');
  const hasShadow = cfg.o.includes('shadow');
  const hideSprite = cfg.o.includes('hsprite');
  const show = k => cfg.m.includes(k);

  const slug = h ? h.slug : '';
  const now = Date.now();
  const sess = h ? ((h.elapsed||0)+(h.startTime&&!S.paused?now-h.startTime:0)) : 0;
  const total = (S.totalElapsed||0)+(!S.paused&&S.globalStart?now-S.globalStart:0);
  const prob = h ? ((1-Math.pow(1-1/h.odds,h.count))*100).toFixed(1)+'%' : '0%';

  const isH = cfg.layout==='h' || cfg.layout==='hf';
  const isFlip = cfg.layout==='hf';
  const spriteOnly = cfg.layout==='sprite';
  const countOnly = cfg.layout==='count';
  const timeOnly = cfg.layout==='time';

  const bgSt = hasBg
    ? `background:${rgba(cfg.bg,cfg.op)};border:2px solid ${cfg.tx};`
    : 'background:transparent;border:none;';

  const shadow = hasShadow ? `text-shadow:0 0 20px ${cfg.tx}80;` : '';

  let spriteHTML = '';
  if (!hideSprite && !countOnly && !timeOnly && slug) {
    const sz = 'var(--sprite-size)';
    spriteHTML = `<img src="${sUrl(slug,anim)}"
      style="width:${sz};height:${sz};image-rendering:pixelated;object-fit:contain;flex-shrink:0;"
      onerror="this.src='${sUrl(slug,false)}';this.onerror=null;">`;
  }

  let infoHTML = '';
  if (!spriteOnly) {
    infoHTML = `<div style="display:flex;flex-direction:column;gap:4px;${isH?'':'align-items:center;'}">`;
    if (show('name'))
      infoHTML += `<div style="font-family:'Press Start 2P',monospace;font-size:var(--name-size);color:${cfg.tx};margin-bottom:2px;">${h ? h.name.toUpperCase() : 'EN CHASSE'}</div>`;
    if (show('count') && !timeOnly)
      infoHTML += `<div style="font-family:'Press Start 2P',monospace;font-size:var(--count-size);color:${cfg.tx};${shadow}">${h ? h.count.toLocaleString() : '0'}</div>`;
    if (show('time') && !countOnly)
      infoHTML += `<div style="font-size:var(--sub-size);color:${cfg.sub};font-family:'DM Sans',sans-serif;">⏱ ${ft(sess)}</div>`;
    if (show('totaltime'))
      infoHTML += `<div style="font-size:var(--sub-size);color:${cfg.sub};font-family:'DM Sans',sans-serif;">⏱ Tot. ${ft(total)}</div>`;
    if (show('phase'))
      infoHTML += `<div style="font-size:var(--sub-size);color:${cfg.sub};font-family:'DM Sans',sans-serif;">Phase ${h ? h.phase : 1}</div>`;
    if (show('prob'))
      infoHTML += `<div style="font-size:var(--sub-size);color:${cfg.sub};font-family:'DM Sans',sans-serif;">Proba: ${prob}</div>`;
    infoHTML += `</div>`;
  }

  const flexDir = isFlip ? 'row-reverse' : isH ? 'row' : 'column';
  const align = isH ? 'center' : 'center';

  document.getElementById('root').innerHTML = `
    <div style="
      display:inline-flex;
      flex-direction:${flexDir};
      align-items:${align};
      gap:var(--gap);
      ${bgSt}
      border-radius:12px;
      padding:var(--padding);
      box-sizing:border-box;
    ">
      ${spriteHTML}
      ${infoHTML}
    </div>`;
}

// ── WIDGET LISTE ──────────────────────────────────────
function renderList() {
  const S = STATE;
  const cfg = Object.assign({
    m:['lname','lcount','lsprite','lanim'], bg:'#0d1117', tx:'#f0c040', sub:'#8b949e', op:90
  }, S.wl||{});

  const active = (S.hunts||[]).filter(h => !h.found);
  const sA=cfg.m.includes('lanim'), sSp=cfg.m.includes('lsprite');
  const sN=cfg.m.includes('lname'), sC=cfg.m.includes('lcount');
  const sPh=cfg.m.includes('lphase'), sT=cfg.m.includes('ltime');
  const sTT=cfg.m.includes('ltotaltime');
  const total = (S.totalElapsed||0)+(!S.paused&&S.globalStart?Date.now()-S.globalStart:0);

  if (!active.length) {
    document.getElementById('root').innerHTML = `
      <div style="background:${rgba(cfg.bg,cfg.op)};border:2px solid ${cfg.tx};border-radius:12px;padding:var(--padding);">
        <div style="font-size:var(--sub-size);color:${cfg.sub};font-family:'DM Sans',sans-serif;">Aucune chasse active</div>
      </div>`;
    return;
  }

  let rows = active.map(h => {
    const hs = (h.elapsed||0)+(h.startTime&&!S.paused?Date.now()-h.startTime:0);
    const isA = h.id===S.activeId;
    let row = `<div style="display:flex;align-items:center;gap:10px;border-bottom:1px solid rgba(255,255,255,.1);padding-bottom:var(--row-gap);margin-bottom:var(--row-gap);">`;
    if (sSp) row += `<img src="${sUrl(h.slug,sA)}" style="width:var(--sprite-sm);height:var(--sprite-sm);image-rendering:pixelated;flex-shrink:0;" onerror="this.src='${sUrl(h.slug,false)}';this.onerror=null;">`;
    row += `<div style="flex:1;min-width:0;">`;
    if (sN) row += `<div style="font-size:var(--name-size);font-weight:700;color:${isA?cfg.tx:'#aaa'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:'DM Sans',sans-serif;">${isA?'● ':''}${h.name}</div>`;
    if (sPh) row += `<div style="font-size:var(--sub-size);color:${cfg.sub};font-family:'DM Sans',sans-serif;">Phase ${h.phase}</div>`;
    if (sT) row += `<div style="font-size:var(--sub-size);color:${cfg.sub};font-family:'DM Sans',sans-serif;">⏱ ${ft(hs)}</div>`;
    if (sTT) row += `<div style="font-size:var(--sub-size);color:${cfg.sub};font-family:'DM Sans',sans-serif;">⏱ Tot. ${ft(total)}</div>`;
    row += `</div>`;
    if (sC) row += `<div style="font-family:'Press Start 2P',monospace;font-size:var(--count-sm);color:${cfg.tx};white-space:nowrap;margin-left:auto;">${h.count.toLocaleString()}</div>`;
    row += `</div>`;
    return row;
  }).join('');

  // Remove last border
  rows = rows.replace(/border-bottom:[^;]+;padding-bottom:[^;]+;margin-bottom:[^;]+;"><\/div><\/div>$/, '"><\/div><\/div>');

  document.getElementById('root').innerHTML = `
    <div style="background:${rgba(cfg.bg,cfg.op)};border:2px solid ${cfg.tx};border-radius:12px;padding:var(--padding);width:100%;">
      ${rows}
    </div>`;
}

// ── WIDGET HISTORIQUE ─────────────────────────────────
function renderHistory() {
  const S = STATE;
  const cfg = Object.assign({
    layout:'list', m:['hname','hcount','hsprite','hanim'], nb:3,
    bg:'#0d1117', tx:'#f0c040', sub:'#8b949e', op:90
  }, S.wh||{});

  const items = (S.history||[]).slice(0, cfg.nb||3);
  const sA=cfg.m.includes('hanim'), sSp=cfg.m.includes('hsprite');
  const sN=cfg.m.includes('hname'), sC=cfg.m.includes('hcount');
  const sD=cfg.m.includes('hdate'), sT=cfg.m.includes('htime'), sPh=cfg.m.includes('hphase');
  const layout = cfg.layout||'list';

  if (!items.length) {
    document.getElementById('root').innerHTML = `
      <div style="background:${rgba(cfg.bg,cfg.op)};border:2px solid ${cfg.tx};border-radius:12px;padding:var(--padding);">
        <div style="font-size:var(--sub-size);color:${cfg.sub};font-family:'DM Sans',sans-serif;">Aucun shiny encore...</div>
      </div>`;
    return;
  }

  if (layout==='last1') {
    const h = items[0];
    let o = `<div style="background:${rgba(cfg.bg,cfg.op)};border:2px solid ${cfg.tx};border-radius:12px;padding:var(--padding);display:inline-flex;flex-direction:column;align-items:center;text-align:center;gap:8px;">`;
    if (sSp) o += `<img src="${sUrl(h.slug,sA)}" style="width:var(--sprite-lg);height:var(--sprite-lg);image-rendering:pixelated;" onerror="this.src='${sUrl(h.slug,false)}';this.onerror=null;">`;
    if (sN) o += `<div style="font-family:'Press Start 2P',monospace;font-size:var(--name-size);color:${cfg.tx};">✦ ${h.name}</div>`;
    if (sC) o += `<div style="font-family:'Press Start 2P',monospace;font-size:var(--count-size);color:${cfg.tx};">${h.count.toLocaleString()}</div>`;
    if (sD) o += `<div style="font-size:var(--sub-size);color:${cfg.sub};font-family:'DM Sans',sans-serif;">${h.date}</div>`;
    o += `</div>`;
    document.getElementById('root').innerHTML = o;
    return;
  }

  const isCard = layout==='cards';
  const isH = layout==='horizontal';
  const flexDir = isCard||isH ? 'row' : 'column';

  let rows = items.map((h,i) => {
    const mins = Math.floor((h.elapsed||0)/60000);
    const ts = mins>60 ? `${Math.floor(mins/60)}h ${mins%60}m` : `${mins}m`;
    const isLast = i===items.length-1;

    if (isCard) {
      let o = `<div style="display:flex;flex-direction:column;align-items:center;text-align:center;background:rgba(255,255,255,.05);border-radius:8px;padding:10px;gap:4px;min-width:80px;">`;
      if (sSp) o += `<img src="${sUrl(h.slug,sA)}" style="width:var(--sprite-sm);height:var(--sprite-sm);image-rendering:pixelated;" onerror="this.src='${sUrl(h.slug,false)}';this.onerror=null;">`;
      if (sN) o += `<div style="font-size:var(--sub-size);font-weight:700;color:${cfg.tx};font-family:'DM Sans',sans-serif;">✦ ${h.name}</div>`;
      if (sC) o += `<div style="font-family:'Press Start 2P',monospace;font-size:var(--count-sm);color:${cfg.tx};">${h.count.toLocaleString()}</div>`;
      if (sD) o += `<div style="font-size:var(--sub-size);color:${cfg.sub};font-family:'DM Sans',sans-serif;">${h.date}</div>`;
      o += `</div>`;
      return o;
    }

    let o = `<div style="display:flex;align-items:center;gap:10px;${!isLast?'border-bottom:1px solid rgba(255,255,255,.1);padding-bottom:var(--row-gap);margin-bottom:var(--row-gap);':''}">`;
    if (sSp) o += `<img src="${sUrl(h.slug,sA)}" style="width:var(--sprite-sm);height:var(--sprite-sm);image-rendering:pixelated;flex-shrink:0;" onerror="this.src='${sUrl(h.slug,false)}';this.onerror=null;">`;
    o += `<div style="flex:1;min-width:0;">`;
    if (sN) o += `<div style="font-size:var(--name-size);font-weight:700;color:${cfg.tx};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:'DM Sans',sans-serif;">✦ ${h.name}</div>`;
    if (sD) o += `<div style="font-size:var(--sub-size);color:${cfg.sub};font-family:'DM Sans',sans-serif;">${h.date}${sPh?' • Ph.'+h.phase:''}</div>`;
    if (sT) o += `<div style="font-size:var(--sub-size);color:${cfg.sub};font-family:'DM Sans',sans-serif;">⏱ ${ts}</div>`;
    o += `</div>`;
    if (sC) o += `<div style="font-family:'Press Start 2P',monospace;font-size:var(--count-sm);color:${cfg.tx};white-space:nowrap;">${h.count.toLocaleString()}</div>`;
    o += `</div>`;
    return o;
  }).join('');

  document.getElementById('root').innerHTML = `
    <div style="background:${rgba(cfg.bg,cfg.op)};border:2px solid ${cfg.tx};border-radius:12px;padding:var(--padding);display:flex;flex-direction:${flexDir};gap:var(--row-gap);flex-wrap:${isCard?'wrap':'nowrap'};">
      ${rows}
    </div>`;
}

// ── INIT ──────────────────────────────────────────────
if (!SB_URL || !SB_KEY) {
  document.getElementById('root').innerHTML = `
    <div style="color:#f85149;font-family:'Press Start 2P',monospace;font-size:9px;padding:10px;text-align:center;">
      URL ou clé Supabase manquante
    </div>`;
} else {
  fetchState();
  setInterval(fetchState, 2000);
  setInterval(() => { if (STATE) render(); }, 1000);
}
