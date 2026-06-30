// @section: keyword-intelligence-engine
document.documentElement.classList.add("js-ready");

// ══════════════════════════════════════════════════════
//  Keyword Intelligence Engine PRO v3.0 — Main JS
// ══════════════════════════════════════════════════════

/* ── State ── */
const state = {
  engine: 'both',
  results: 0,
  features: { keybert: true, yake: true, gliner: true, tfidf: true, clustering: true, bm25: false },
  keywords: [],
  dorks: [],
  clusters: [],
  running: false,
  analysisData: null,
};

/* ── Demo data pools ── */
const DEMO_KEYWORDS = [
  { kw:'SQL Injection', score:95.2, type:'topic',   src:'Yahoo+Bing', freq:47 },
  { kw:'XSS Attack',    score:92.7, type:'topic',   src:'Bing',       freq:39 },
  { kw:'admin panel',   score:88.4, type:'keyword', src:'Yahoo',      freq:33 },
  { kw:'login bypass',  score:85.1, type:'keyword', src:'Yahoo+Bing', freq:28 },
  { kw:'CVE-2024',      score:82.9, type:'product', src:'Bing',       freq:24 },
  { kw:'penetration test',score:80.3,type:'topic',  src:'Yahoo',      freq:21 },
  { kw:'OWASP Top 10',  score:78.6, type:'org',     src:'Yahoo+Bing', freq:19 },
  { kw:'zero-day',      score:76.1, type:'topic',   src:'Bing',       freq:17 },
  { kw:'firewall bypass',score:73.8,type:'keyword', src:'Yahoo',      freq:15 },
  { kw:'metasploit',    score:70.2, type:'product', src:'Yahoo+Bing', freq:13 },
  { kw:'burp suite',    score:67.9, type:'product', src:'Bing',       freq:11 },
  { kw:'nmap scan',     score:64.5, type:'keyword', src:'Yahoo',      freq:9  },
];

const DEMO_CLUSTERS = [
  { id:'C_0', name:'Web Exploitation', tags:['SQL Injection','XSS','LFI','CSRF','RCE'] },
  { id:'C_1', name:'Network Security', tags:['nmap','firewall','proxy','VPN','MITM'] },
  { id:'C_2', name:'Tools & Frameworks', tags:['metasploit','burpsuite','sqlmap','hydra'] },
  { id:'C_3', name:'Admin & Auth',     tags:['admin panel','login bypass','credentials','JWT'] },
];

const DORK_TEMPLATES = {
  sqli: [
    { tpl:'site:{t} inurl:product.php?id=', risk:'h' },
    { tpl:'site:{t} inurl:news.php?id=',    risk:'h' },
    { tpl:'site:{t} inurl:article.php?id=', risk:'h' },
    { tpl:'site:{t} inurl:index.php?id= AND 1=1', risk:'h' },
    { tpl:'site:{t} "SELECT * FROM" inurl:.php', risk:'h' },
  ],
  xss: [
    { tpl:'site:{t} inurl:search?q=',  risk:'m' },
    { tpl:'site:{t} inurl:q=',         risk:'m' },
    { tpl:'site:{t} inurl:s=',         risk:'m' },
    { tpl:'site:{t} inurl:query=',     risk:'m' },
    { tpl:'site:{t} inurl:keyword=',   risk:'m' },
  ],
  lfi: [
    { tpl:'site:{t} inurl:page=',      risk:'h' },
    { tpl:'site:{t} inurl:file=',      risk:'h' },
    { tpl:'site:{t} inurl:include=',   risk:'h' },
    { tpl:'site:{t} inurl:path=',      risk:'m' },
  ],
  admin: [
    { tpl:'site:{t} inurl:admin',      risk:'m' },
    { tpl:'site:{t} inurl:login',      risk:'m' },
    { tpl:'site:{t} intitle:"Admin Panel"', risk:'m' },
    { tpl:'site:{t} "Welcome to Administration"', risk:'m' },
    { tpl:'site:{t} inurl:wp-admin',   risk:'m' },
  ],
  sensitive: [
    { tpl:'site:{t} filetype:log',     risk:'h' },
    { tpl:'site:{t} filetype:sql',     risk:'h' },
    { tpl:'site:{t} filetype:env',     risk:'h' },
    { tpl:'site:{t} filetype:conf',    risk:'h' },
    { tpl:'site:{t} filetype:backup',  risk:'h' },
  ],
  hqi: [
    { tpl:'site:{t} inurl:admin intitle:"Login"',            risk:'h' },
    { tpl:'site:{t} "index.php?id=" "OR 1=1"',            risk:'h' },
    { tpl:'site:{t} inurl:/wp-content/ "password"',         risk:'h' },
    { tpl:'site:{t} intitle:"Dashboard" inurl:admin',        risk:'m' },
    { tpl:'site:{t} intext:"sqlmap" OR "union select"',    risk:'h' },
    { tpl:'site:{t} filetype:env OR filetype:sql',            risk:'h' },
    { tpl:'site:{t} "index of" "backup"',                 risk:'m' },
    { tpl:'site:{t} inurl:=login intext:"username"',        risk:'m' },
  ],
};

const DORK_TYPES_META = {
  sqli:      { icon:'🔍', name:'SQL Injection', risk:'h' },
  hqi:        { icon:'⚡', name:'HQI Dorks',        risk:'h' },
  xss:       { icon:'💥', name:'XSS',           risk:'m' },
  lfi:       { icon:'📁', name:'LFI / RFI',     risk:'h' },
  admin:     { icon:'🔐', name:'Admin Panels',  risk:'m' },
  sensitive: { icon:'🗄️', name:'Sensitive Files',risk:'h'},
  dir:       { icon:'📂', name:'Dir Listing',   risk:'l' },
};

/* ── Helpers ── */
const $  = (s, ctx=document) => ctx.querySelector(s);
const $$ = (s, ctx=document) => [...ctx.querySelectorAll(s)];
const ts = () => new Date().toLocaleTimeString('en-GB',{hour12:false});

function log(msg, type='info'){
  const log = $('#stream-log'); if(!log) return;
  const el = document.createElement('div');
  el.className = `log-ln ${type}`;
  el.innerHTML = `<span class="log-ts">[${ts()}]</span> ${msg}`;
  log.appendChild(el); log.scrollTop = log.scrollHeight;
}

function notify(msg, type='info'){
  const wrap = $('#notif-wrap'); if(!wrap) return;
  const n = document.createElement('div');
  n.className = `notif ${type}`;
  const icon = type==='ok'?'✅':type==='err'?'❌':'ℹ️';
  n.textContent = `${icon} ${msg}`;
  wrap.appendChild(n);
  setTimeout(()=>n.remove(), 3200);
}

function setStatus(s){
  const dot = $('#status-dot');
  const txt = $('#status-txt');
  if(dot){ dot.className = `status-dot ${s}`; }
  if(txt){ txt.textContent = s==='idle'?'جاهز':s==='busy'?'يعمل...':'خطأ'; }
}

function getResultCount(){
  const val = parseInt($('#result-count')?.value, 10);
  if(Number.isNaN(val) || val < 1) return 50;
  return Math.min(val, 1000);
}

function getDorkCount(){
  const val = parseInt($('#dork-count-sel')?.value, 10);
  if(Number.isNaN(val) || val < 1) return 10;
  return val;
}

// Increased the allowable Dork URL count to support large exports (e.g. 1000+)
function getDorkUrlCount(){
  const val = parseInt($('#dork-url-count')?.value, 10);
  if(Number.isNaN(val) || val < 1) return 10;
  // Allow larger request counts (up to 5000) — adjust if you need higher
  return Math.min(val, 5000);
}

function animateCounter(el, end, dur=1200){
  if(!el) return;
  let start=0, step=end/60;
  const iv = setInterval(()=>{
    start = Math.min(start+step, end);
    el.textContent = Math.round(start).toLocaleString();
    if(start>=end) clearInterval(iv);
  }, dur/60);
}

/* ── Engine Selector ── */
function initEngineSelector(){
  $$('.eng-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.eng-btn').forEach(b=>b.classList.remove('on','both'));
      const v = btn.dataset.eng;
      state.engine = v;
      if(v==='both') btn.classList.add('both');
      else btn.classList.add('on');
    });
  });
  // default
  const def = $(`.eng-btn[data-eng="both"]`);
  if(def) def.classList.add('both');
}

/* ── Toggles ── */
function initToggles(){
  $$('.tog').forEach(tog=>{
    tog.addEventListener('click',()=>{
      tog.classList.toggle('on');
      const key = tog.dataset.feat;
      if(key) state.features[key] = tog.classList.contains('on');
    });
  });
  // init state defaults
  $$('.tog.on').forEach(tog=>{
    const key=tog.dataset.feat;
    if(key) state.features[key]=true;
  });
}

/* ── Tabs ── */
function initTabs(){
  $$('[data-tab-group]').forEach(group=>{
    const gid = group.dataset.tabGroup;
    $$(`[data-tab-btn][data-group="${gid}"]`).forEach(btn=>{
      btn.addEventListener('click',()=>{
        $$(`[data-tab-btn][data-group="${gid}"]`).forEach(b=>b.classList.remove('on'));
        btn.classList.add('on');
        const pane = btn.dataset.pane;
        $$(`[data-tab-pane][data-group="${gid}"]`).forEach(p=>{
          p.classList.toggle('on', p.dataset.paneId===pane);
        });
      });
    });
  });
}

/* ── Search Simulation ── */
async function runSearch(){
  const q = $('#main-search')?.value?.trim();
  if(!q){ notify('أدخل كلمة بحث أولاً','err'); return; }
  if(state.running) return;
  state.running = true;

  const runBtn = $('#run-btn');
  const progWrap = $('#prog-wrap');
  const progFill = $('#prog-fill');
  const progTxt  = $('#prog-txt');
  const progPct  = $('#prog-pct');

  if(runBtn){ runBtn.disabled=true; runBtn.querySelector('i').className='fa-solid fa-spinner spin'; }
  if(progWrap) progWrap.classList.add('show');
  setStatus('busy');
  log(`بدء التحليل: "${q}" | المحرك: ${state.engine}`,'info');

  const steps = [
    { pct:10, msg:`🔍 الاتصال بـ ${state.engine==='both'?'Yahoo + Bing':state.engine}...` },
    { pct:25, msg:`📥 جلب النتائج (${getResultCount()} نتيجة)...` },
    { pct:40, msg:`🧠 تحليل KeyBERT + YAKE...` },
    { pct:55, msg:`🏷️ استخراج الكيانات GLiNER + spaCy...` },
    { pct:68, msg:`📊 حساب TF-IDF + BM25...` },
    { pct:78, msg:`🔗 بناء الرسم البياني المعرفي...` },
    { pct:88, msg:`🧩 تجميع الكلمات UMAP + HDBSCAN...` },
    { pct:95, msg:`⚙️ توليد Dorks الذكية...` },
    { pct:100,msg:`✅ اكتملت المعالجة` },
  ];

  for(const s of steps){
    await sleep(280+Math.random()*220);
    if(progFill) progFill.style.width = s.pct+'%';
    if(progTxt)  progTxt.textContent  = s.msg;
    if(progPct)  progPct.textContent  = s.pct+'%';
    log(s.msg, s.pct===100?'ok':'info');
  }

  await sleep(300);
  buildResults(q);

  state.running = false;
  if(runBtn){ runBtn.disabled=false; runBtn.querySelector('i').className='fa-solid fa-bolt'; }
  if(progWrap) progWrap.classList.remove('show');
  setStatus('idle');
  notify(`تم تحليل "${q}" بنجاح ✅`,'ok');
  log(`انتهى التحليل | ${state.keywords.length} كلمة مفتاحية | ${state.dorks.length} dork`,'ok');
}

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

/* ── Build Results ── */
function buildResults(q){
  state.results = getResultCount();
  state.keywords = DEMO_KEYWORDS.map(k=>({...k}));
  state.clusters  = DEMO_CLUSTERS.map(c=>({...c}));

  // Animate stats
  animateCounter($('#stat-words'),  state.keywords.length);
  animateCounter($('#stat-sources'),state.engine==='both'?2:1);
  animateCounter($('#stat-rels'),   47);
  animateCounter($('#stat-clusters'),state.clusters.length);

  renderKeywordsTable();
  renderClusters();
  renderBarChart();
  renderNetwork();
  updateDorkTarget(q);
  generateDorks(q, 'sqli');
}

/* ── Keywords Table ── */
function renderKeywordsTable(){
  const tbody = $('#kw-tbody'); if(!tbody) return;
  tbody.innerHTML = '';
  state.keywords.forEach((k,i)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-family:var(--font-mono);color:var(--text-muted);font-size:10px;">${i+1}</td>
      <td style="font-weight:600;color:var(--text-primary);">${k.kw}</td>
      <td><span class="kw-chip chip-${k.type}">${k.type}</span></td>
      <td>
        <div class="score-bar">
          <div class="score-track"><div class="score-fill" style="width:${k.score}%"></div></div>
          <span class="score-num">${k.score}</span>
        </div>
      </td>
      <td style="font-family:var(--font-mono);font-size:10px;color:var(--cyan);">${k.freq}</td>
      <td style="font-size:10px;color:var(--text-muted);">${k.src}</td>
    `;
    tbody.appendChild(tr);
  });
}

/* ── Clusters ── */
function renderClusters(){
  const grid = $('#clusters-grid'); if(!grid) return;
  grid.innerHTML = '';
  state.clusters.forEach(c=>{
    const el = document.createElement('div');
    el.className = 'cluster-item';
    el.innerHTML = `
      <div class="cl-name">${c.id} :: ${c.name}</div>
      <div class="cl-tags">${c.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>
    `;
    grid.appendChild(el);
  });
}

/* ── Bar Chart ── */
let barChart = null;
function renderBarChart(){
  const ctx = $('#bar-chart'); if(!ctx) return;
  if(barChart){ barChart.destroy(); barChart=null; }
  const labels = state.keywords.slice(0,8).map(k=>k.kw);
  const data   = state.keywords.slice(0,8).map(k=>k.score);
  barChart = new Chart(ctx,{
    type:'bar',
    data:{
      labels,
      datasets:[{
        label:'درجة الفرصة',
        data,
        backgroundColor: data.map((_,i)=>`hsla(${200+i*15},80%,55%,0.7)`),
        borderColor:     data.map((_,i)=>`hsla(${200+i*15},80%,60%,1)`),
        borderWidth:1, borderRadius:4,
      }]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{callbacks:{label:v=>`Score: ${v.raw}`}} },
      scales:{
        x:{ ticks:{ color:'#64748b', font:{size:9}, maxRotation:30 }, grid:{color:'rgba(83,104,163,.1)'} },
        y:{ ticks:{ color:'#64748b', font:{size:9} }, grid:{color:'rgba(83,104,163,.1)'}, min:0, max:100 },
      }
    }
  });
}

/* ── Doughnut (distribution) ── */
let donutChart = null;
function renderDonutChart(){
  const ctx = $('#donut-chart'); if(!ctx) return;
  if(donutChart){ donutChart.destroy(); donutChart=null; }
  const counts = {};
  state.keywords.forEach(k=>{ counts[k.type]=(counts[k.type]||0)+1; });
  donutChart = new Chart(ctx,{
    type:'doughnut',
    data:{
      labels: Object.keys(counts),
      datasets:[{
        data: Object.values(counts),
        backgroundColor:['#00d4ff','#e94560','#ffd700','#a855f7','#00ff88'],
        borderColor:'#0d0d1a', borderWidth:2, hoverOffset:4,
      }]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{
        legend:{ position:'bottom', labels:{ color:'#94a3b8', font:{size:10}, padding:12 } }
      },
      cutout:'65%',
    }
  });
}

/* ── Network Graph (Canvas) ── */
let netNodes=[], netEdges=[], netDrag=null, netOff={x:0,y:0}, netScale=1;
function renderNetwork(){
  const canvas = $('#net-canvas'); if(!canvas) return;
  const W=canvas.clientWidth, H=canvas.clientHeight;
  canvas.width=W; canvas.height=H;
  const cx=W/2, cy=H/2;

  netNodes = state.keywords.slice(0,8).map((k,i)=>{
    const angle = (i/8)*Math.PI*2;
    const r = 90+Math.random()*30;
    return { id:i, label:k.kw, x:cx+Math.cos(angle)*r, y:cy+Math.sin(angle)*r, vx:0, vy:0, score:k.score };
  });
  netNodes.push({ id:99, label:'HUB', x:cx, y:cy, vx:0, vy:0, score:100, hub:true });
  netEdges = netNodes.filter(n=>!n.hub).map(n=>({ s:99, t:n.id, w: n.score/100 }));
  // add some cross-edges
  for(let i=0;i<4;i++){
    const a=Math.floor(Math.random()*8), b=Math.floor(Math.random()*8);
    if(a!==b) netEdges.push({s:a,t:b,w:.4});
  }
  drawNet();
}
function drawNet(){
  const canvas = $('#net-canvas'); if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const W=canvas.width, H=canvas.height;
  ctx.clearRect(0,0,W,H);
  // edges
  netEdges.forEach(e=>{
    const a=netNodes.find(n=>n.id===e.s), b=netNodes.find(n=>n.id===e.t);
    if(!a||!b) return;
    ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y);
    ctx.strokeStyle=`rgba(0,212,255,${e.w*.4})`; ctx.lineWidth=1;
    ctx.stroke();
  });
  // nodes
  netNodes.forEach(n=>{
    const r = n.hub?16:6+n.score/20;
    const grad=ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,r);
    grad.addColorStop(0, n.hub?'#e94560':'#00d4ff');
    grad.addColorStop(1, n.hub?'rgba(233,69,96,0)':'rgba(0,212,255,0)');
    ctx.beginPath(); ctx.arc(n.x,n.y,r,0,Math.PI*2);
    ctx.fillStyle=grad; ctx.fill();
    ctx.beginPath(); ctx.arc(n.x,n.y,r*.5,0,Math.PI*2);
    ctx.fillStyle=n.hub?'#e94560':'#00d4ff'; ctx.fill();
    ctx.font=`${n.hub?11:9}px JetBrains Mono, monospace`;
    ctx.fillStyle='rgba(240,244,255,.8)';
    ctx.textAlign='center'; ctx.fillText(n.label,n.x,n.y+(r*.5)+12);
  });
}

/* ── Dorks Generator ── */
function updateDorkTarget(q){
  const inp = $('#dork-target'); if(inp) inp.value=q;
}

function generateDorks(target, type, count=getDorkCount()){
  const tmpl = DORK_TEMPLATES[type] || DORK_TEMPLATES.sqli;
  const base = target||'target.com';
  state.dorks = Array.from({ length: count }, (_, idx) => {
    const template = tmpl[idx % tmpl.length];
    const suffix = idx >= tmpl.length ? ` #${idx+1}` : '';
    const text = `${template.tpl.replace(/{t}/g, base)}${suffix}`.replace(/\s+/g, ' ').trim();
    return {
      text,
      risk: template.risk,
      type,
      quality: type==='hqi' ? 'HQI' : undefined,
    };
  });
  renderDorks();
}

function buildSearchUrl(dork, engine, page){
  const q = encodeURIComponent(dork);
  if(engine==='yahoo'){
    return `https://search.yahoo.com/search?p=${q}&b=${page}`;
  }
  return `https://www.bing.com/search?q=${q}&first=${page}`;
}

function generateDorkUrls(target, count=getDorkUrlCount()){
  if(!target){ notify('أدخل هدفاً صحيحاً لإنتاج روابط','err'); return; }
  if(!state.dorks.length){ notify('قم أولاً بتوليد Dorks ثم جلب الروابط','err'); return; }

  const engineList = state.engine==='both' ? ['bing','yahoo'] : [state.engine];
  const urls = [];
  for(let i=0;i<count;i++){
    const dork = state.dorks[i % state.dorks.length].text;
    const engine = engineList[i % engineList.length];
    const page = Math.floor(i / (10 * engineList.length)) * 10 + 1;
    urls.push({
      url: buildSearchUrl(dork, engine, page),
      engine,
      dork,
      idx:i+1,
    });
  }
  state.dorkUrls = urls;
  renderDorkUrls();
  notify(`تم جلب ${urls.length} رابط Dork بجودة عالية`,'ok');
}

function renderDorkUrls(){
  const out = $('#dork-urls-out'); if(!out) return;
  if(!state.dorkUrls?.length){
    out.innerHTML = `<div class="empty" style="padding:24px;"><i class="fa-solid fa-link"></i><p>اضغط "جلب الروابط" لإنشاء قائمة URL من Dorks</p></div>`;
    return;
  }
  out.innerHTML = state.dorkUrls.map(item=>`
    <div class="dork-url-line">
      <div style="flex:1;min-width:0;">
        <a href="${item.url}" target="_blank" rel="noreferrer">${item.idx}. ${item.url}</a>
        <div style="font-size:9px;color:var(--text-muted);margin-top:4px;">Dork: ${item.dork}</div>
      </div>
      <span style="font-size:9px;color:var(--cyan);white-space:nowrap;margin-left:10px;">${item.engine.toUpperCase()}</span>
      <button class="dork-url-copy" onclick="copyDorkUrl(this,'${item.url.replace(/'/g,"\\'")}');" title="نسخ"><i class="fa-regular fa-copy"></i></button>
    </div>
  `).join('');
}

window.copyDorkUrl = function(btn, txt){
  navigator.clipboard?.writeText(txt).then(()=>{
    btn.innerHTML = '<i class="fa-solid fa-check" style="color:var(--green)"></i>';
    setTimeout(()=>{ btn.innerHTML = '<i class="fa-regular fa-copy"></i>'; },1500);
  });
}

function exportDorkUrlsTXT(){
  const content = state.dorkUrls?.map(item=>item.url).join('\n') || '# No Dork URLs generated yet';
  download('dork-urls.txt', content, 'text/plain');
  notify('تم تنزيل روابط Dork بصيغة TXT','ok');
}

function renderDorks(){
  const out = $('#dorks-out'); if(!out) return;
  if(!state.dorks.length){
    out.innerHTML='<div class="empty" style="padding:24px"><i class="fa-solid fa-wand-magic-sparkles"></i><p>أدخل هدف وابدأ التوليد</p></div>';
    return;
  }
  out.innerHTML = state.dorks.map(d=>{
    const riskClass = d.risk==='h'?'risk-h':d.risk==='m'?'risk-m':'risk-l';
    const riskLabel = d.risk==='h'?'HIGH':d.risk==='m'?'MED':'LOW';
    const colored = d.text
      .replace(/(site:|inurl:|intitle:|intext:|filetype:)/g,'<span class="op">$1</span>')
      .replace(/("[^"]*")/g,'<span class="val">$1</span>');
    return `<div class="dork-line">
      <div class="dork-txt">${colored}</div>
      <span class="risk-badge ${riskClass}">${riskLabel}</span>
      <button class="copy-btn" onclick="copyDork(this,'${d.text.replace(/'/g,"\\'")}')" title="نسخ"><i class="fa-regular fa-copy"></i></button>
    </div>`;
  }).join('');
}

window.copyDork = function(btn, txt){
  navigator.clipboard?.writeText(txt).then(()=>{
    btn.innerHTML='<i class="fa-solid fa-check" style="color:var(--green)"></i>';
    setTimeout(()=>{ btn.innerHTML='<i class="fa-regular fa-copy"></i>'; },1500);
  });
};

function initDorkTypeCards(){
  $$('.dt-card').forEach(card=>{
    card.addEventListener('click',()=>{
      $$('.dt-card').forEach(c=>c.classList.remove('on'));
      card.classList.add('on');
      const type = card.dataset.type;
      const target = $('#dork-target')?.value || 'target.com';
      generateDorks(target, type);
    });
  });
  // default active
  const first = $('.dt-card');
  if(first) first.classList.add('on');
}

/* ── Export ── */
function exportJSON(){
  const data = { keywords:state.keywords, clusters:state.clusters, dorks:state.dorks, ts:new Date().toISOString() };
  download('keywords.json', JSON.stringify(data,null,2), 'application/json');
  notify('تم تصدير JSON','ok');
}
function exportCSV(){
  const rows=[['#','Keyword','Type','Score','Freq','Source'],...state.keywords.map((k,i)=>[i+1,k.kw,k.type,k.score,k.freq,k.src])];
  download('keywords.csv', rows.map(r=>r.join(',')).join('\n'), 'text/csv');
  notify('تم تصدير CSV','ok');
}
function exportDorksTXT(){
  download('dorks.txt', state.dorks.map(d=>d.text).join('\n') || '# No dorks generated yet', 'text/plain');
  notify('تم تصدير Dorks','ok');
}

// Fixed and robust exportReport implementation
function exportReport(){
  const clustersCount = state.clusters?.length || 0;
  const content = [
    'KEYWORD INTELLIGENCE ENGINE — Report',
    '='.repeat(50),
    `Date: ${new Date().toLocaleString()}`,
    `Engine: ${state.engine}`,
    `Keywords: ${state.keywords.length}`,
    `Clusters: ${clustersCount}`,
    '',
    '--- Keywords ---',
    ...state.keywords.map(k => `- ${k.kw} (${k.type}) score:${k.score} freq:${k.freq}`),
    '',
    '--- Dorks ---',
    ...state.dorks.map(d => `- ${d.text}`),
    ''
  ].join('\n');

  download('report.txt', content, 'text/plain');
  notify('تم تصدير التقرير','ok');
}
function download(name, content, mime){
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([content],{type:mime}));
  a.download=name; a.click(); URL.revokeObjectURL(a.href);
}

/* ── WebSocket Simulation ── */
function simulateWS(){
  const msgs=[
    { t:'info', m:'WebSocket متصل ✅' },
    { t:'info', m:'في انتظار استفسار البحث...' },
  ];
  msgs.forEach((m,i)=>setTimeout(()=>log(m.m,m.t),500+i*400));
}

/* ── Dark mode toggle ── */
function initTheme(){
  const btn = $('#theme-toggle');
  if(!btn) return;
  btn.addEventListener('click',()=>{
    document.body.classList.toggle('light');
    btn.innerHTML = document.body.classList.contains('light')
      ? '<i class="fa-solid fa-moon"></i>'
      : '<i class="fa-solid fa-sun"></i>';
  });
}

/* ── Mobile sidebar ── */
function initMobileSidebar(){
  const btn = $('#mobile-menu-btn');
  const sb  = $('.sidebar');
  if(!btn||!sb) return;
  btn.addEventListener('click',()=>sb.classList.toggle('open'));
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', ()=>{
  initEngineSelector();
  initToggles();
  initTabs();
  initDorkTypeCards();
  initTheme();
  initMobileSidebar();
  simulateWS();
  renderDonutChart();

  // Search button
  document.getElementById('run-btn')?.addEventListener('click', runSearch);
  document.getElementById('main-search')?.addEventListener('keydown', e=>{ if(e.key==='Enter') runSearch(); });

  // Sidebar run
  document.getElementById('sb-run-btn')?.addEventListener('click', ()=>{
    const q = document.getElementById('sb-query')?.value;
    if(q){ document.getElementById('main-search').value=q; }
    runSearch();
  });

  // Dorks generate
  document.getElementById('generate-dorks-btn')?.addEventListener('click',()=>{
    const t = document.getElementById('dork-target')?.value||'target.com';
    const type = document.querySelector('.dt-card.on')?.dataset?.type||'sqli';
    generateDorks(t, type);
    notify('تم توليد Dorks جديدة','ok');
  });
  document.getElementById('generate-dork-urls-btn')?.addEventListener('click',()=>{
    const t = document.getElementById('dork-target')?.value||'target.com';
    generateDorkUrls(t, getDorkUrlCount());
  });

  // Export buttons
  document.getElementById('exp-json')?.addEventListener('click', exportJSON);
  document.getElementById('exp-csv')?.addEventListener('click', exportCSV);
  document.getElementById('exp-dorks')?.addEventListener('click', exportDorksTXT);
  document.getElementById('exp-report')?.addEventListener('click', exportReport);
  document.getElementById('export-dork-links')?.addEventListener('click', exportDorkUrlsTXT);

  // Copy all dorks
  document.getElementById('copy-all-dorks')?.addEventListener('click',()=>{
    const all = state.dorks.map(d=>d.text).join('\n');
    navigator.clipboard?.writeText(all).then(()=>notify('تم النسخ','ok'));
  });

  // Initial demo (show skeleton state)
  log('Keyword Intelligence Engine PRO v3.0 جاهز','ok');
  log('أدخل كلمة بحث وابدأ التحليل','info');
});
