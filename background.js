// background.js - service worker for the extension
let active = false;
let aggregated = [];
let controller = { cancelRequested: false };

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'start') {
    if (active) {
      chrome.runtime.sendMessage({ type: 'progress', text: 'عملية جارية بالفعل' });
      return;
    }
    aggregated = [];
    controller = { cancelRequested: false };
    active = true;
    runTasks(msg.dorks, msg.perDork, msg.maxLinks, msg.engine, msg.throttle)
      .then(() => {
        active = false;
        chrome.runtime.sendMessage({ type: 'result', urls: aggregated });
        chrome.runtime.sendMessage({ type: 'done' });
      })
      .catch(err => {
        active = false;
        chrome.runtime.sendMessage({ type: 'progress', text: 'خطأ: ' + err.message });
      });
  } else if (msg.action === 'cancel') {
    controller.cancelRequested = true;
  }
});

// Improved runTasks: added retries, exponential backoff, concurrency control (single tab by default)
async function runTasks(dorks, perDork, maxLinks, engine, throttle, opts={maxRetries:3}) {
  for (let i = 0; i < dorks.length; i++) {
    if (controller.cancelRequested) break;
    const d = dorks[i];
    chrome.runtime.sendMessage({ type: 'progress', text: `معالجة dork ${i+1}/${dorks.length}: ${d}` });

    let page = 0;
    let consecutiveEmpty=0;
    while (aggregated.length < maxLinks) {
      if (controller.cancelRequested) break;
      const qurl = buildSearchUrl(engine, d, perDork, page);
      chrome.runtime.sendMessage({ type: 'progress', text: `فتح: ${qurl}` });

      let attempt = 0;
      let urls = [];
      while(attempt <= opts.maxRetries){
        attempt++;
        let tab = null;
        try {
          tab = await createTab(qurl);
          await waitForTabComplete(tab.id, 20000 + attempt*3000);
          urls = await executeScrape(tab.id, engine);
        } catch (e) {
          // on error, wait exponentially and retry
          const waitMs = Math.min(3000 * Math.pow(2, attempt), 30000);
          chrome.runtime.sendMessage({ type: 'progress', text: `خطأ بالصفحة، محاولة ${attempt}/${opts.maxRetries}. الانتظار ${waitMs}ms` });
          await sleep(waitMs);
          urls = [];
        } finally {
          if(tab) await closeTab(tab.id);
        }
        if(urls && urls.length>0) break;
      }

      // Add unique results
      for (const u of urls) {
        if (aggregated.length >= maxLinks) break;
        if (!aggregated.includes(u)) aggregated.push(u);
      }

      chrome.runtime.sendMessage({ type: 'result', urls: aggregated });

      if (!urls || urls.length < Math.max(1, perDork)) {
        consecutiveEmpty++;
        if(consecutiveEmpty>=2) break; // if two consecutive pages returned nothing useful, move to next dork
      } else {
        consecutiveEmpty=0;
      }

      page++;
      // تأخير بين الطلبات
      await sleep(throttle || 2000);
    }
    if (aggregated.length >= maxLinks) break;
  }
  if (controller.cancelRequested) {
    chrome.runtime.sendMessage({ type: 'stopped' });
  }
}

function buildSearchUrl(engine, dork, perDork, pageIndex) {
  if (engine === 'google') {
    const start = pageIndex * perDork;
    return `https://www.google.com/search?q=${encodeURIComponent(dork)}&num=${perDork}&start=${start}&hl=en`;
  } else if (engine === 'bing') {
    const offset = pageIndex * perDork;
    return `https://www.bing.com/search?q=${encodeURIComponent(dork)}&count=${perDork}&first=${offset}`;
  } else if (engine === 'duckduckgo') {
    const offset = pageIndex * perDork;
    return `https://duckduckgo.com/html/?q=${encodeURIComponent(dork)}&s=${offset}`;
  } else if (engine === 'yahoo') {
    const b = pageIndex * perDork + 1;
    return `https://search.yahoo.com/search?p=${encodeURIComponent(dork)}&b=${b}&n=${perDork}`;
  }
  return '';
}

function createTab(url) {
  return new Promise(resolve => {
    chrome.tabs.create({ url, active: false }, (tab) => {
      resolve(tab);
    });
  });
}

function waitForTabComplete(tabId, timeout = 15000) {
  return new Promise((resolve) => {
    const start = Date.now();
    function listener(updatedTabId, info) {
      if (updatedTabId !== tabId) return;
      if (info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
    // Timeout fallback
    setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }, timeout);
  });
}

function executeScrape(tabId, engine) {
  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript({
      target: { tabId },
      func: scrapePage,
      args: [engine]
    }, (injectionResults) => {
      if (!injectionResults || !injectionResults[0]) return resolve([]);
      resolve(injectionResults[0].result || []);
    });
  });
}

function closeTab(tabId) {
  return new Promise(resolve => {
    chrome.tabs.remove(tabId, () => resolve());
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// content script function (serialized & injected)
function scrapePage(engine) {
  try {
    const results = [];
    const anchors = Array.from(document.querySelectorAll('a'));
    if (engine === 'google') {
      anchors.forEach(a => {
        const href = a.href;
        if (!href) return;
        if (href.startsWith('http') && !href.includes('google.com') && !href.includes('/search?') && !href.includes('/url?')) {
          results.push(href);
        }
      });
    } else if (engine === 'bing') {
      anchors.forEach(a => {
        const href = a.href;
        if (!href) return;
        if (href.startsWith('http') && !href.includes('bing.com') && !/\/search\?/.test(href)) {
          results.push(href);
        }
      });
    } else if (engine === 'duckduckgo') {
      const ddAnchors = Array.from(document.querySelectorAll('a.result__a, a[data-testid="result-title-a"]'));
      if (ddAnchors.length) {
        ddAnchors.forEach(a => { if (a.href && a.href.startsWith('http')) results.push(a.href); });
      } else {
        anchors.forEach(a => {
          const href = a.href;
          if (!href) return;
          if (href.startsWith('http') && !href.includes('duckduckgo.com')) results.push(href);
        });
      }
    } else if (engine === 'yahoo') {
      const yAnchors = Array.from(document.querySelectorAll('#web a, a.ac-algo, a[href^="http"]'));
      yAnchors.forEach(a => {
        const href = a.href;
        if (!href) return;
        if (href.startsWith('http') && !href.includes('search.yahoo.com')) results.push(href);
      });
    }

    const filtered = Array.from(new Set(results)).filter(u => {
      if (/\/aclk\?|\/adclick\?/.test(u)) return false;
      if (u.includes('translate.google') || u.includes('webcache.googleusercontent')) return false;
      return true;
    });

    // Limit per page to reduce noise
    return filtered.slice(0, 200);
  } catch (e) {
    return [];
  }
}
