// popup.js runs in the popup context and orchestrates with background service worker
const dorksEl = document.getElementById('dorks');
const perDorkEl = document.getElementById('perDork');
const maxLinksEl = document.getElementById('maxLinks');
const startBtn = document.getElementById('start');
const cancelBtn = document.getElementById('cancel');
const downloadBtn = document.getElementById('download');
const progressEl = document.getElementById('progress');
const resultsEl = document.getElementById('results');
const engineEl = document.getElementById('engine');
const throttleEl = document.getElementById('throttle');

let collected = [];
let running = false;

startBtn.addEventListener('click', async () => {
  const raw = dorksEl.value.trim();
  if (!raw) return alert('أدخل على الأقل dork واحد');
  const dorks = raw.split('\n').map(s => s.trim()).filter(Boolean);
  const perDork = Math.max(1, parseInt(perDorkEl.value,10) || 10);
  const maxLinks = Math.max(1, parseInt(maxLinksEl.value,10) || 100);
  const engine = engineEl.value;
  const throttle = Math.max(200, parseInt(throttleEl.value,10) || 2000);

  collected = [];
  updateUI();

  running = true;
  startBtn.disabled = true;
  cancelBtn.disabled = false;
  progressEl.textContent = 'مرسِل المهام إلى الخلفية...';

  chrome.runtime.sendMessage({
    action: 'start',
    dorks, perDork, maxLinks, engine, throttle
  });
});

cancelBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'cancel' });
  progressEl.textContent = 'جارٍ إلغاء العملية...';
});

// استقبال التحديثات من الخلفية
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'progress') {
    progressEl.textContent = msg.text;
  } else if (msg.type === 'result') {
    collected = msg.urls;
    updateUI();
  } else if (msg.type === 'done') {
    progressEl.textContent = 'اكتمل.';
    running = false;
    startBtn.disabled = false;
    cancelBtn.disabled = true;
  } else if (msg.type === 'stopped') {
    progressEl.textContent = 'توقفت العملية.';
    running = false;
    startBtn.disabled = false;
    cancelBtn.disabled = true;
  }
});

downloadBtn.addEventListener('click', () => {
  if (!collected.length) return;
  const blob = new Blob([collected.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `links_${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
});

function updateUI() {
  resultsEl.innerHTML = '';
  if (collected.length === 0) {
    resultsEl.textContent = 'لا توجد روابط بعد';
    downloadBtn.disabled = true;
    return;
  }
  const ul = document.createElement('ul');
  collected.forEach(u => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = u;
    a.textContent = u;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    li.appendChild(a);
    ul.appendChild(li);
  });
  resultsEl.appendChild(ul);
  downloadBtn.disabled = false;
}
