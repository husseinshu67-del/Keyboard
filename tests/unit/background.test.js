/**
 * Unit tests for background.js
 * Tests the core functionality of the background service worker
 */

// Mock the chrome API and DOM
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  tabs: {
    create: jest.fn(),
    remove: jest.fn(),
    onUpdated: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  scripting: {
    executeScript: jest.fn()
  }
};

global.document = {
  querySelectorAll: jest.fn(),
  createElement: jest.fn()
};

// Import the functions directly
const { buildSearchUrl, scrapePage, sleep } = require('../../background.js');

describe('background.js - Pure Functions', () => {
  describe('buildSearchUrl', () => {
    test('should generate correct Google search URL', () => {
      const url = buildSearchUrl('google', 'test query', 10, 0);
      expect(url).toBe('https://www.google.com/search?q=test%20query&num=10&start=0&hl=en');
    });

    test('should generate correct Google search URL with special characters', () => {
      const url = buildSearchUrl('google', 'site:example.com filetype:pdf', 5, 1);
      expect(url).toContain('q=site%3Aexample.com+filetype%3Apdf');
      expect(url).toContain('num=5');
      expect(url).toContain('start=5');
    });

    test('should generate correct Bing search URL', () => {
      const url = buildSearchUrl('bing', 'test query', 8, 2);
      expect(url).toBe('https://www.bing.com/search?q=test%20query&count=8&first=16');
    });

    test('should generate correct DuckDuckGo search URL', () => {
      const url = buildSearchUrl('duckduckgo', 'test', 10, 3);
      expect(url).toBe('https://duckduckgo.com/html/?q=test&s=30');
    });

    test('should generate correct Yahoo search URL', () => {
      const url = buildSearchUrl('yahoo', 'test query', 5, 1);
      expect(url).toBe('https://search.yahoo.com/search?p=test%20query&b=6&n=5');
    });

    test('should return empty string for unknown engine', () => {
      const url = buildSearchUrl('unknown', 'test', 10, 0);
      expect(url).toBe('');
    });

    test('should handle empty dork', () => {
      const url = buildSearchUrl('google', '', 10, 0);
      expect(url).toContain('q=');
    });
  });

  describe('sleep', () => {
    test('should wait for specified time', async () => {
      const start = Date.now();
      await sleep(100);
      const end = Date.now();
      expect(end - start).toBeGreaterThanOrEqual(90); // Allow 10ms margin
    });

    test('should wait for 0ms', async () => {
      const start = Date.now();
      await sleep(0);
      const end = Date.now();
      expect(end - start).toBeLessThan(10);
    });

    test('should handle negative time', async () => {
      const start = Date.now();
      await sleep(-100);
      const end = Date.now();
      expect(end - start).toBeLessThan(10);
    });
  });

  describe('scrapePage', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should return empty array when no results found', () => {
      global.document.querySelectorAll.mockReturnValue([]);
      const results = scrapePage('google');
      expect(results).toEqual([]);
    });

    test('should filter out Google URLs for Google engine', () => {
      const mockAnchors = [
        { href: 'https://www.google.com/search?q=test' },
        { href: 'https://example.com' },
        { href: 'https://www.google.com' },
        { href: 'https://test.com' }
      ];
      
      global.document.querySelectorAll.mockReturnValue(mockAnchors);
      const results = scrapePage('google');
      
      expect(results).not.toContain('https://www.google.com/search?q=test');
      expect(results).not.toContain('https://www.google.com');
      expect(results).toContain('https://example.com');
      expect(results).toContain('https://test.com');
    });

    test('should filter out Bing URLs for Bing engine', () => {
      const mockAnchors = [
        { href: 'https://www.bing.com/search?q=test' },
        { href: 'https://example.com' },
        { href: 'https://www.bing.com' },
        { href: 'https://test.com' }
      ];
      
      global.document.querySelectorAll.mockReturnValue(mockAnchors);
      const results = scrapePage('bing');
      
      expect(results).not.toContain('https://www.bing.com/search?q=test');
      expect(results).not.toContain('https://www.bing.com');
      expect(results).toContain('https://example.com');
      expect(results).toContain('https://test.com');
    });

    test('should filter out DuckDuckGo URLs for DuckDuckGo engine', () => {
      const mockAnchors = [
        { href: 'https://duckduckgo.com/html/?q=test' },
        { href: 'https://example.com' },
        { href: 'https://duckduckgo.com' },
        { href: 'https://test.com' }
      ];
      
      global.document.querySelectorAll.mockReturnValue(mockAnchors);
      const results = scrapePage('duckduckgo');
      
      expect(results).not.toContain('https://duckduckgo.com/html/?q=test');
      expect(results).not.toContain('https://duckduckgo.com');
      expect(results).toContain('https://example.com');
      expect(results).toContain('https://test.com');
    });

    test('should filter out Yahoo URLs for Yahoo engine', () => {
      const mockAnchors = [
        { href: 'https://search.yahoo.com/search?p=test' },
        { href: 'https://example.com' },
        { href: 'https://search.yahoo.com' },
        { href: 'https://test.com' }
      ];
      
      global.document.querySelectorAll.mockReturnValue(mockAnchors);
      const results = scrapePage('yahoo');
      
      expect(results).not.toContain('https://search.yahoo.com/search?p=test');
      expect(results).not.toContain('https://search.yahoo.com');
      expect(results).toContain('https://example.com');
      expect(results).toContain('https://test.com');
    });

    test('should remove duplicate URLs', () => {
      const mockAnchors = [
        { href: 'https://example.com' },
        { href: 'https://example.com' },
        { href: 'https://test.com' },
        { href: 'https://test.com' }
      ];
      
      global.document.querySelectorAll.mockReturnValue(mockAnchors);
      const results = scrapePage('google');
      
      // Should have only unique URLs
      const uniqueResults = [...new Set(results)];
      expect(results.length).toBe(uniqueResults.length);
    });

    test('should filter out ad URLs', () => {
      const mockAnchors = [
        { href: 'https://example.com/aclk?sa=L' },
        { href: 'https://example.com/adclick?gclid=test' },
        { href: 'https://example.com' }
      ];
      
      global.document.querySelectorAll.mockReturnValue(mockAnchors);
      const results = scrapePage('google');
      
      expect(results).not.toContain('https://example.com/aclk?sa=L');
      expect(results).not.toContain('https://example.com/adclick?gclid=test');
      expect(results).toContain('https://example.com');
    });

    test('should filter out Google translate and cache URLs', () => {
      const mockAnchors = [
        { href: 'https://translate.google.com/translate?u=example.com' },
        { href: 'https://webcache.googleusercontent.com/search?q=cache:example.com' },
        { href: 'https://example.com' }
      ];
      
      global.document.querySelectorAll.mockReturnValue(mockAnchors);
      const results = scrapePage('google');
      
      expect(results).not.toContain('https://translate.google.com/translate?u=example.com');
      expect(results).not.toContain('https://webcache.googleusercontent.com/search?q=cache:example.com');
      expect(results).toContain('https://example.com');
    });

    test('should limit results to 200 per page', () => {
      // Create 250 mock anchors
      const mockAnchors = Array.from({ length: 250 }, (_, i) => ({
        href: `https://example${i}.com`
      }));
      
      global.document.querySelectorAll.mockReturnValue(mockAnchors);
      const results = scrapePage('google');
      
      expect(results.length).toBeLessThanOrEqual(200);
    });

    test('should handle null href attributes', () => {
      const mockAnchors = [
        { href: null },
        { href: undefined },
        { href: 'https://example.com' },
        { }
      ];
      
      global.document.querySelectorAll.mockReturnValue(mockAnchors);
      const results = scrapePage('google');
      
      expect(results).toEqual(['https://example.com']);
    });

    test('should handle errors gracefully', () => {
      // Mock querySelectorAll to throw an error
      global.document.querySelectorAll.mockImplementation(() => {
        throw new Error('Test error');
      });
      
      const results = scrapePage('google');
      expect(results).toEqual([]);
    });
  });
});
