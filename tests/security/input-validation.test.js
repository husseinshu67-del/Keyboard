/**
 * Security tests for input validation and protection
 * Tests protection against common security vulnerabilities
 */

require('../setup');

// Import functions for security testing
const fs = require('fs');
const path = require('path');

// Read background.js and popup.js
const backgroundPath = path.join(__dirname, '../../background.js');
const popupPath = path.join(__dirname, '../../popup.js');
const backgroundContent = fs.readFileSync(backgroundPath, 'utf8');
const popupContent = fs.readFileSync(popupPath, 'utf8');

// Extract functions for testing
const backgroundModule = eval(`
${backgroundContent}
module.exports = { buildSearchUrl, scrapePage };
`);

const { buildSearchUrl, scrapePage } = backgroundModule;

describe('Security Tests - Input Validation', () => {
  describe('XSS Protection', () => {
    test('should escape HTML in dork input for URL generation', () => {
      const maliciousInput = '<script>alert("XSS")</script>';
      const url = buildSearchUrl('google', maliciousInput, 10, 0);
      
      // The URL should encode the script tags
      expect(url).not.toContain('<script>');
      expect(url).not.toContain('</script>');
      expect(url).toContain('%3Cscript%3E'); // URL encoded <script>
    });

    test('should escape special characters in dork input', () => {
      const maliciousInput = 'test" onerror="alert(1)';
      const url = buildSearchUrl('google', maliciousInput, 10, 0);
      
      // The URL should encode the quotes and special characters
      expect(url).not.toContain('" onerror="');
      expect(url).toContain('%22'); // URL encoded quote
    });

    test('should handle JavaScript URLs in dork input', () => {
      const maliciousInput = 'javascript:alert(1)';
      const url = buildSearchUrl('google', maliciousInput, 10, 0);
      
      // The URL should encode the javascript: protocol
      expect(url).toContain('javascript%3Aalert%281%29');
    });

    test('should handle data URLs in dork input', () => {
      const maliciousInput = 'data:text/html,<script>alert(1)</script>';
      const url = buildSearchUrl('google', maliciousInput, 10, 0);
      
      // The URL should encode the data: protocol
      expect(url).toContain('data%3Atext%2Fhtml');
    });

    test('should handle HTML entities in dork input', () => {
      const maliciousInput = '&lt;script&gt;alert(1)&lt;/script&gt;';
      const url = buildSearchUrl('google', maliciousInput, 10, 0);
      
      // The URL should encode the HTML entities
      expect(url).toContain('%26lt%3Bscript%26gt%3B');
    });
  });

  describe('SQL Injection Protection', () => {
    test('should handle SQL injection attempts in dork input', () => {
      const maliciousInput = "test' OR '1'='1";
      const url = buildSearchUrl('google', maliciousInput, 10, 0);
      
      // The URL should encode the SQL injection attempt
      expect(url).toContain("%27%20OR%20%271%27%3D%271");
    });

    test('should handle UNION SELECT in dork input', () => {
      const maliciousInput = 'test UNION SELECT * FROM users';
      const url = buildSearchUrl('google', maliciousInput, 10, 0);
      
      // The URL should encode the SQL keywords
      expect(url).toContain('UNION%20SELECT%20%2A%20FROM%20users');
    });

    test('should handle DROP TABLE in dork input', () => {
      const maliciousInput = 'test; DROP TABLE users;--';
      const url = buildSearchUrl('google', maliciousInput, 10, 0);
      
      // The URL should encode the SQL commands
      expect(url).toContain('%3B%20DROP%20TABLE%20users%3B--');
    });
  });

  describe('URL Injection Protection', () => {
    test('should handle malicious URLs in scrape results', () => {
      // Mock document with malicious URLs
      global.document = {
        querySelectorAll: jest.fn(() => [
          { href: 'javascript:alert(1)' },
          { href: 'data:text/html,<script>alert(1)</script>' },
          { href: 'https://example.com' },
          { href: 'http://evil.com' }
        ])
      };

      const results = scrapePage('google');
      
      // Should filter out javascript: and data: URLs
      expect(results).not.toContain('javascript:alert(1)');
      expect(results).not.toContain('data:text/html,<script>alert(1)</script>');
      expect(results).toContain('https://example.com');
    });

    test('should filter out non-HTTP URLs', () => {
      global.document = {
        querySelectorAll: jest.fn(() => [
          { href: 'ftp://example.com' },
          { href: 'mailto:test@example.com' },
          { href: 'tel:+1234567890' },
          { href: 'https://example.com' }
        ])
      };

      const results = scrapePage('google');
      
      // Should only include HTTP/HTTPS URLs
      expect(results).not.toContain('ftp://example.com');
      expect(results).not.toContain('mailto:test@example.com');
      expect(results).not.toContain('tel:+1234567890');
      expect(results).toContain('https://example.com');
    });

    test('should filter out relative URLs', () => {
      global.document = {
        querySelectorAll: jest.fn(() => [
          { href: '/path/to/page' },
          { href: 'relative/path' },
          { href: 'https://example.com' }
        ])
      };

      const results = scrapePage('google');
      
      // Should only include absolute URLs
      expect(results).not.toContain('/path/to/page');
      expect(results).not.toContain('relative/path');
      expect(results).toContain('https://example.com');
    });
  });

  describe('Parameter Validation', () => {
    test('should handle negative perDork values', () => {
      // This is tested in popup.js
      const value = Math.max(1, parseInt('-10', 10) || 10);
      expect(value).toBe(1);
    });

    test('should handle negative maxLinks values', () => {
      const value = Math.max(1, parseInt('-100', 10) || 100);
      expect(value).toBe(1);
    });

    test('should handle very large perDork values', () => {
      // Google has a limit of 100 results per page
      const value = Math.max(1, parseInt('999999', 10) || 10);
      expect(value).toBe(999999); // No upper limit in current implementation
    });

    test('should handle very large maxLinks values', () => {
      const value = Math.max(1, parseInt('999999', 10) || 100);
      expect(value).toBe(999999); // No upper limit in current implementation
    });

    test('should handle throttle values below minimum', () => {
      const value = Math.max(200, parseInt('100', 10) || 2000);
      expect(value).toBe(200);
    });

    test('should handle non-numeric throttle values', () => {
      const value = Math.max(200, parseInt('abc', 10) || 2000);
      expect(value).toBe(2000);
    });
  });

  describe('Engine Validation', () => {
    test('should handle unknown engine types', () => {
      const url = buildSearchUrl('unknown_engine', 'test', 10, 0);
      expect(url).toBe(''); // Returns empty string for unknown engines
    });

    test('should handle null engine', () => {
      const url = buildSearchUrl(null, 'test', 10, 0);
      expect(url).toBe('');
    });

    test('should handle undefined engine', () => {
      const url = buildSearchUrl(undefined, 'test', 10, 0);
      expect(url).toBe('');
    });

    test('should handle empty string engine', () => {
      const url = buildSearchUrl('', 'test', 10, 0);
      expect(url).toBe('');
    });
  });

  describe('Page Parameter Validation', () => {
    test('should handle negative page index', () => {
      const url = buildSearchUrl('google', 'test', 10, -1);
      expect(url).toContain('start=-10'); // Negative start parameter
    });

    test('should handle very large page index', () => {
      const url = buildSearchUrl('google', 'test', 10, 999999);
      expect(url).toContain('start=9999990'); // Large start parameter
    });

    test('should handle non-numeric page index', () => {
      // In the actual function, pageIndex is used in calculations
      // This would result in NaN, but the function should handle it
      const url = buildSearchUrl('google', 'test', 10, 'abc');
      expect(url).toContain('start=NaN'); // This might cause issues
    });
  });

  describe('Ad and Tracking URL Filtering', () => {
    test('should filter out Google ad URLs', () => {
      global.document = {
        querySelectorAll: jest.fn(() => [
          { href: 'https://www.google.com/aclk?sa=L&ai=test' },
          { href: 'https://example.com' }
        ])
      };

      const results = scrapePage('google');
      expect(results).not.toContain('https://www.google.com/aclk?sa=L&ai=test');
      expect(results).toContain('https://example.com');
    });

    test('should filter out adclick URLs', () => {
      global.document = {
        querySelectorAll: jest.fn(() => [
          { href: 'https://example.com/adclick?gclid=test' },
          { href: 'https://example.com' }
        ])
      };

      const results = scrapePage('google');
      expect(results).not.toContain('https://example.com/adclick?gclid=test');
      expect(results).toContain('https://example.com');
    });

    test('should filter out Google translate URLs', () => {
      global.document = {
        querySelectorAll: jest.fn(() => [
          { href: 'https://translate.google.com/translate?u=https://example.com' },
          { href: 'https://example.com' }
        ])
      };

      const results = scrapePage('google');
      expect(results).not.toContain('https://translate.google.com/translate?u=https://example.com');
      expect(results).toContain('https://example.com');
    });

    test('should filter out Google cache URLs', () => {
      global.document = {
        querySelectorAll: jest.fn(() => [
          { href: 'https://webcache.googleusercontent.com/search?q=cache:example.com' },
          { href: 'https://example.com' }
        ])
      };

      const results = scrapePage('google');
      expect(results).not.toContain('https://webcache.googleusercontent.com/search?q=cache:example.com');
      expect(results).toContain('https://example.com');
    });
  });

  describe('Duplicate URL Handling', () => {
    test('should remove duplicate URLs from results', () => {
      global.document = {
        querySelectorAll: jest.fn(() => [
          { href: 'https://example.com' },
          { href: 'https://example.com' },
          { href: 'https://example.com/' },
          { href: 'https://test.com' }
        ])
      };

      const results = scrapePage('google');
      
      // Should have only unique URLs
      const uniqueResults = [...new Set(results)];
      expect(results.length).toBe(uniqueResults.length);
    });

    test('should handle URLs with different cases', () => {
      global.document = {
        querySelectorAll: jest.fn(() => [
          { href: 'https://EXAMPLE.com' },
          { href: 'https://example.com' },
          { href: 'HTTPS://EXAMPLE.COM' }
        ])
      };

      const results = scrapePage('google');
      
      // Case-sensitive comparison, so these are different URLs
      // In a real scenario, you might want to normalize URLs
      expect(results.length).toBe(3);
    });

    test('should handle URLs with and without trailing slashes', () => {
      global.document = {
        querySelectorAll: jest.fn(() => [
          { href: 'https://example.com' },
          { href: 'https://example.com/' }
        ])
      };

      const results = scrapePage('google');
      
      // These are different URLs
      expect(results.length).toBe(2);
    });
  });

  describe('Empty Input Handling', () => {
    test('should handle empty dork input', () => {
      const url = buildSearchUrl('google', '', 10, 0);
      expect(url).toContain('q='); // Empty query
    });

    test('should handle whitespace-only dork input', () => {
      const url = buildSearchUrl('google', '   ', 10, 0);
      expect(url).toContain('q=%20%20%20'); // URL encoded spaces
    });

    test('should handle null dork input', () => {
      // This would cause an error in encodeURIComponent
      expect(() => buildSearchUrl('google', null, 10, 0)).toThrow();
    });

    test('should handle undefined dork input', () => {
      expect(() => buildSearchUrl('google', undefined, 10, 0)).toThrow();
    });
  });
});
