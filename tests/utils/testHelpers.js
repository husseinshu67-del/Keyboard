/**
 * Test helpers for extracting pure functions from source files
 */

// Extract pure functions from background.js
const fs = require('fs');
const path = require('path');

// Read background.js content
const backgroundPath = path.join(__dirname, '../../background.js');
const backgroundContent = fs.readFileSync(backgroundPath, 'utf8');

// Extract the buildSearchUrl function
const buildSearchUrl = (engine, dork, perDork, pageIndex) => {
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
};

// Extract the sleep function
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Extract the scrapePage function
const scrapePage = (engine) => {
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
      if (\/\/aclk\?|\/adclick\?/.test(u)) return false;
      if (u.includes('translate.google') || u.includes('webcache.googleusercontent')) return false;
      return true;
    });

    // Limit per page to reduce noise
    return filtered.slice(0, 200);
  } catch (e) {
    return [];
  }
};

// Extract functions from assets/main.js
const mainPath = path.join(__dirname, '../../assets/main.js');
const mainContent = fs.readFileSync(mainPath, 'utf8');

// Extract buildSearchUrl from main.js (different implementation)
const mainBuildSearchUrl = (dork, engine, page) => {
  const q = encodeURIComponent(dork);
  if (engine === 'yahoo') {
    return `https://search.yahoo.com/search?p=${q}&b=${page}`;
  }
  return `https://www.bing.com/search?q=${q}&first=${page}`;
};

// Extract sleep from main.js (same as background.js)
const mainSleep = (ms) => new Promise(r => setTimeout(r, ms));

// Mock DORK_TEMPLATES for testing
const DORK_TEMPLATES = {
  sqli: [
    { tpl: 'site:{t} inurl:product.php?id=', risk: 'h' },
    { tpl: 'site:{t} inurl:news.php?id=', risk: 'h' },
    { tpl: 'site:{t} inurl:article.php?id=', risk: 'h' },
    { tpl: 'site:{t} inurl:index.php?id= AND 1=1', risk: 'h' },
    { tpl: 'site:{t} "SELECT * FROM" inurl:.php', risk: 'h' },
  ],
  xss: [
    { tpl: 'site:{t} inurl:search?q=', risk: 'm' },
    { tpl: 'site:{t} inurl:q=', risk: 'm' },
    { tpl: 'site:{t} inurl:s=', risk: 'm' },
    { tpl: 'site:{t} inurl:query=', risk: 'm' },
    { tpl: 'site:{t} inurl:keyword=', risk: 'm' },
  ],
  admin: [
    { tpl: 'site:{t} inurl:admin', risk: 'm' },
    { tpl: 'site:{t} inurl:login', risk: 'm' },
    { tpl: 'site:{t} intitle:\"Admin Panel\"', risk: 'm' },
    { tpl: 'site:{t} \"Welcome to Administration\"', risk: 'm' },
    { tpl: 'site:{t} inurl:wp-admin', risk: 'm' },
  ]
};

// Mock generateDorks function
const generateDorks = (target, type, count = 10) => {
  const tmpl = DORK_TEMPLATES[type] || DORK_TEMPLATES.sqli;
  const base = target || 'target.com';
  return Array.from({ length: count }, (_, idx) => {
    const template = tmpl[idx % tmpl.length];
    const suffix = idx >= tmpl.length ? ` #${idx + 1}` : '';
    const text = `${template.tpl.replace(/{t}/g, base)}${suffix}`.replace(/\s+/g, ' ').trim();
    return {
      text,
      risk: template.risk,
      type,
      quality: type === 'hqi' ? 'HQI' : undefined,
    };
  });
};

// Mock utility functions
const getResultCount = () => {
  const val = parseInt(document.getElementById('result-count')?.value, 10);
  if (Number.isNaN(val) || val < 1) return 50;
  return Math.min(val, 1000);
};

const getDorkCount = () => {
  const val = parseInt(document.getElementById('dork-count-sel')?.value, 10);
  if (Number.isNaN(val) || val < 1) return 10;
  return val;
};

const getDorkUrlCount = () => {
  const val = parseInt(document.getElementById('dork-url-count')?.value, 10);
  if (Number.isNaN(val) || val < 1) return 10;
  return Math.min(val, 5000);
};

module.exports = {
  // From background.js
  buildSearchUrl,
  scrapePage,
  sleep,
  
  // From assets/main.js
  mainBuildSearchUrl,
  mainSleep,
  generateDorks,
  getResultCount,
  getDorkCount,
  getDorkUrlCount,
  DORK_TEMPLATES
};
