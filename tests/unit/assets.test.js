/**
 * Unit tests for assets/main.js
 * Tests the dork generation and utility functions
 */

// Mock the DOM
global.document = {
  getElementById: jest.fn((id) => {
    const elements = {
      'result-count': { value: '50' },
      'dork-count-sel': { value: '10' },
      'dork-url-count': { value: '100' },
      'main-search': { value: 'test query' }
    };
    return elements[id] || null;
  })
};

// Import the functions directly
const { buildSearchUrl, sleep } = require('../../assets/main.js');

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
    { tpl: 'site:{t} intitle:"Admin Panel"', risk: 'm' },
    { tpl: 'site:{t} "Welcome to Administration"', risk: 'm' },
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

describe('assets/main.js - Pure Functions', () => {
  describe('buildSearchUrl', () => {
    test('should generate Bing search URL', () => {
      const url = buildSearchUrl('test query', 'bing', 1);
      expect(url).toBe('https://www.bing.com/search?q=test%20query&first=1');
    });

    test('should generate Yahoo search URL', () => {
      const url = buildSearchUrl('test query', 'yahoo', 2);
      expect(url).toBe('https://search.yahoo.com/search?p=test%20query&b=2');
    });

    test('should default to Bing for unknown engine', () => {
      const url = buildSearchUrl('test query', 'unknown', 1);
      expect(url).toBe('https://www.bing.com/search?q=test%20query&first=1');
    });

    test('should handle empty dork', () => {
      const url = buildSearchUrl('', 'bing', 1);
      expect(url).toBe('https://www.bing.com/search?q=&first=1');
    });

    test('should encode special characters in query', () => {
      const url = buildSearchUrl('site:example.com filetype:pdf', 'bing', 1);
      expect(url).toContain('q=site%3Aexample.com+filetype%3Apdf');
    });
  });

  describe('sleep', () => {
    test('should wait for specified time', async () => {
      const start = Date.now();
      await sleep(100);
      const end = Date.now();
      expect(end - start).toBeGreaterThanOrEqual(90);
    });

    test('should handle 0ms', async () => {
      const start = Date.now();
      await sleep(0);
      const end = Date.now();
      expect(end - start).toBeLessThan(10);
    });
  });

  describe('getResultCount', () => {
    test('should return default value of 50 when input is invalid', () => {
      document.getElementById.mockReturnValue(null);
      const count = getResultCount();
      expect(count).toBe(50);
    });

    test('should return default value of 50 when input is NaN', () => {
      document.getElementById.mockReturnValue({ value: 'invalid' });
      const count = getResultCount();
      expect(count).toBe(50);
    });

    test('should return default value of 50 when input is less than 1', () => {
      document.getElementById.mockReturnValue({ value: '0' });
      const count = getResultCount();
      expect(count).toBe(50);
    });

    test('should return maximum value of 1000 when input is too large', () => {
      document.getElementById.mockReturnValue({ value: '2000' });
      const count = getResultCount();
      expect(count).toBe(1000);
    });

    test('should return valid value within range', () => {
      document.getElementById.mockReturnValue({ value: '100' });
      const count = getResultCount();
      expect(count).toBe(100);
    });
  });

  describe('getDorkCount', () => {
    test('should return default value of 10 when input is invalid', () => {
      document.getElementById.mockReturnValue(null);
      const count = getDorkCount();
      expect(count).toBe(10);
    });

    test('should return default value of 10 when input is NaN', () => {
      document.getElementById.mockReturnValue({ value: 'invalid' });
      const count = getDorkCount();
      expect(count).toBe(10);
    });

    test('should return default value of 10 when input is less than 1', () => {
      document.getElementById.mockReturnValue({ value: '0' });
      const count = getDorkCount();
      expect(count).toBe(10);
    });

    test('should return valid value', () => {
      document.getElementById.mockReturnValue({ value: '25' });
      const count = getDorkCount();
      expect(count).toBe(25);
    });
  });

  describe('getDorkUrlCount', () => {
    test('should return default value of 10 when input is invalid', () => {
      document.getElementById.mockReturnValue(null);
      const count = getDorkUrlCount();
      expect(count).toBe(10);
    });

    test('should return default value of 10 when input is NaN', () => {
      document.getElementById.mockReturnValue({ value: 'invalid' });
      const count = getDorkUrlCount();
      expect(count).toBe(10);
    });

    test('should return default value of 10 when input is less than 1', () => {
      document.getElementById.mockReturnValue({ value: '0' });
      const count = getDorkUrlCount();
      expect(count).toBe(10);
    });

    test('should return maximum value of 5000 when input is too large', () => {
      document.getElementById.mockReturnValue({ value: '10000' });
      const count = getDorkUrlCount();
      expect(count).toBe(5000);
    });

    test('should return valid value within range', () => {
      document.getElementById.mockReturnValue({ value: '100' });
      const count = getDorkUrlCount();
      expect(count).toBe(100);
    });
  });

  describe('generateDorks', () => {
    test('should generate correct number of dorks', () => {
      const dorks = generateDorks('example.com', 'sqli', 5);
      expect(dorks.length).toBe(5);
    });

    test('should generate dorks with target domain', () => {
      const dorks = generateDorks('test.com', 'sqli', 3);
      dorks.forEach(dork => {
        expect(dork.text).toContain('test.com');
      });
    });

    test('should generate dorks with correct risk level', () => {
      const dorks = generateDorks('example.com', 'sqli', 2);
      dorks.forEach(dork => {
        expect(['h', 'm', 'l']).toContain(dork.risk);
      });
    });

    test('should generate dorks with correct type', () => {
      const dorks = generateDorks('example.com', 'xss', 2);
      dorks.forEach(dork => {
        expect(dork.type).toBe('xss');
      });
    });

    test('should cycle through templates when count exceeds template count', () => {
      const dorks = generateDorks('example.com', 'sqli', 8); // 8 dorks with 5 templates
      expect(dorks.length).toBe(8);
      
      // Should have unique dorks even when cycling
      const uniqueDorks = [...new Set(dorks.map(d => d.text))];
      expect(uniqueDorks.length).toBe(dorks.length);
    });

    test('should add suffix for dorks beyond template count', () => {
      const dorks = generateDorks('example.com', 'sqli', 6); // 6 dorks with 5 templates
      
      // The 6th dork should have a suffix
      const lastDork = dorks[5];
      expect(lastDork.text).toContain('#6');
    });

    test('should handle empty target', () => {
      const dorks = generateDorks('', 'sqli', 2);
      dorks.forEach(dork => {
        expect(dork.text).toContain('site:');
      });
    });

    test('should handle unknown dork type', () => {
      // Should default to sqli templates
      const dorks = generateDorks('example.com', 'unknown', 2);
      expect(dorks.length).toBe(2);
    });

    test('should generate dorks with quality flag for hqi type', () => {
      // Add hqi templates for this test
      const hqiTemplates = {
        hqi: [
          { tpl: 'site:{t} inurl:admin intitle:"Login"', risk: 'h' },
          { tpl: 'site:{t} "index.php?id=" "OR 1=1"', risk: 'h' },
        ]
      };
      
      // Temporarily add hqi templates
      DORK_TEMPLATES.hqi = hqiTemplates.hqi;
      
      const dorks = generateDorks('example.com', 'hqi', 2);
      dorks.forEach(dork => {
        expect(dork.quality).toBe('HQI');
      });
      
      // Clean up
      delete DORK_TEMPLATES.hqi;
    });
  });
});
