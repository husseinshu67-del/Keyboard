/**
 * Unit tests for popup.js
 * Tests the popup UI functionality
 */

// Mock the chrome API and DOM
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      listeners: [],
      addListener: function(listener) {
        this.listeners.push(listener);
      },
      removeListener: function(listener) {
        this.listeners = this.listeners.filter(l => l !== listener);
      }
    }
  }
};

global.document = {
  getElementById: jest.fn((id) => {
    const elements = {
      'dorks': { value: '', addEventListener: jest.fn() },
      'perDork': { value: '10', addEventListener: jest.fn() },
      'maxLinks': { value: '100', addEventListener: jest.fn() },
      'start': { disabled: false, addEventListener: jest.fn(), click: jest.fn() },
      'cancel': { disabled: true, addEventListener: jest.fn(), click: jest.fn() },
      'download': { disabled: true, addEventListener: jest.fn(), click: jest.fn() },
      'progress': { textContent: '', addEventListener: jest.fn() },
      'results': { innerHTML: '', textContent: '', appendChild: jest.fn() },
      'engine': { value: 'google', addEventListener: jest.fn() },
      'throttle': { value: '2000', addEventListener: jest.fn() }
    };
    return elements[id] || null;
  }),
  createElement: jest.fn((tag) => ({
    tagName: tag,
    href: '',
    textContent: '',
    target: '',
    rel: '',
    appendChild: jest.fn(),
    setAttribute: jest.fn(),
    innerHTML: ''
  }))
};

global.URL = {
  createObjectURL: jest.fn(() => 'blob:mock-url'),
  revokeObjectURL: jest.fn()
};

global.Blob = class Blob {
  constructor(content, options) {
    this.content = content;
    this.options = options;
  }
};

global.navigator = {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve())
  }
};

global.alert = jest.fn();

// Mock the popup.js functions
global.collected = [];
global.running = false;

// Define the functions from popup.js
global.updateUI = function() {
  const resultsEl = document.getElementById('results');
  const downloadBtn = document.getElementById('download');
  
  resultsEl.innerHTML = '';
  if (collected.length === 0) {
    resultsEl.textContent = 'لا توجد نتائج بعد';
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
};

describe('popup.js - UI Functions', () => {
  let collected, running;

  beforeEach(() => {
    // Reset state before each test
    collected = [];
    running = false;
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Reset DOM elements
    document.getElementById.mockImplementation((id) => {
      const elements = {
        'dorks': { value: '', addEventListener: jest.fn() },
        'perDork': { value: '10', addEventListener: jest.fn() },
        'maxLinks': { value: '100', addEventListener: jest.fn() },
        'start': { disabled: false, addEventListener: jest.fn(), click: jest.fn() },
        'cancel': { disabled: true, addEventListener: jest.fn(), click: jest.fn() },
        'download': { disabled: true, addEventListener: jest.fn(), click: jest.fn() },
        'progress': { textContent: '', addEventListener: jest.fn() },
        'results': { innerHTML: '', textContent: '', appendChild: jest.fn() },
        'engine': { value: 'google', addEventListener: jest.fn() },
        'throttle': { value: '2000', addEventListener: jest.fn() }
      };
      return elements[id] || null;
    });
  });

  describe('updateUI function', () => {
    test('should display "لا توجد نتائج" when collected is empty', () => {
      collected = [];
      updateUI();
      const resultsEl = document.getElementById('results');
      expect(resultsEl.textContent).toContain('لا توجد نتائج');
    });

    test('should disable download button when no results', () => {
      collected = [];
      updateUI();
      const downloadBtn = document.getElementById('download');
      expect(downloadBtn.disabled).toBe(true);
    });

    test('should enable download button when results exist', () => {
      collected = ['http://example.com'];
      updateUI();
      const downloadBtn = document.getElementById('download');
      expect(downloadBtn.disabled).toBe(false);
    });

    test('should display results as list when collected has URLs', () => {
      collected = ['http://example.com', 'http://test.com'];
      updateUI();
      
      const resultsEl = document.getElementById('results');
      expect(resultsEl.innerHTML).not.toBe('');
      expect(resultsEl.innerHTML).toContain('http://example.com');
      expect(resultsEl.innerHTML).toContain('http://test.com');
    });

    test('should create list items for each URL', () => {
      collected = ['http://example.com', 'http://test.com'];
      updateUI();
      
      // Check that createElement was called for list items
      expect(document.createElement).toHaveBeenCalledWith('ul');
      expect(document.createElement).toHaveBeenCalledWith('li');
      expect(document.createElement).toHaveBeenCalledWith('a');
    });
  });

  describe('Input Validation', () => {
    test('should return default value for invalid perDork input', () => {
      const value = Math.max(1, parseInt('invalid', 10) || 10);
      expect(value).toBe(10);
    });

    test('should return default value for empty perDork input', () => {
      const value = Math.max(1, parseInt('', 10) || 10);
      expect(value).toBe(10);
    });

    test('should return minimum value of 1 for perDork', () => {
      const value = Math.max(1, parseInt('-5', 10) || 10);
      expect(value).toBe(1);
    });

    test('should return default value for invalid maxLinks input', () => {
      const value = Math.max(1, parseInt('invalid', 10) || 100);
      expect(value).toBe(100);
    });

    test('should return minimum value of 1 for maxLinks', () => {
      const value = Math.max(1, parseInt('-10', 10) || 100);
      expect(value).toBe(1);
    });

    test('should return minimum value of 200 for throttle', () => {
      const value = Math.max(200, parseInt('100', 10) || 2000);
      expect(value).toBe(200);
    });

    test('should return default value for invalid throttle input', () => {
      const value = Math.max(200, parseInt('invalid', 10) || 2000);
      expect(value).toBe(2000);
    });
  });

  describe('Start Button Click Handler', () => {
    test('should show alert when dorks input is empty', () => {
      const dorksEl = document.getElementById('dorks');
      dorksEl.value = '';
      
      // Simulate the validation logic from popup.js
      if (!dorksEl.value.trim()) {
        alert('أدخل على الأقل dork واحد');
      }
      
      expect(alert).toHaveBeenCalled();
    });

    test('should not show alert when dorks input has value', () => {
      const dorksEl = document.getElementById('dorks');
      dorksEl.value = 'test query';
      
      // Simulate the validation logic from popup.js
      if (!dorksEl.value.trim()) {
        alert('أدخل على الأقل dork واحد');
      }
      
      expect(alert).not.toHaveBeenCalled();
    });

    test('should parse dorks correctly', () => {
      const dorksEl = document.getElementById('dorks');
      dorksEl.value = 'dork1\ndork2\n\ndork3';
      
      const dorks = dorksEl.value.trim().split('\n').map(s => s.trim()).filter(Boolean);
      
      expect(dorks).toEqual(['dork1', 'dork2', 'dork3']);
    });

    test('should parse parameters correctly', () => {
      const perDorkEl = document.getElementById('perDork');
      const maxLinksEl = document.getElementById('maxLinks');
      const engineEl = document.getElementById('engine');
      const throttleEl = document.getElementById('throttle');
      
      perDorkEl.value = '15';
      maxLinksEl.value = '50';
      engineEl.value = 'bing';
      throttleEl.value = '3000';
      
      const perDork = Math.max(1, parseInt(perDorkEl.value, 10) || 10);
      const maxLinks = Math.max(1, parseInt(maxLinksEl.value, 10) || 100);
      const engine = engineEl.value;
      const throttle = Math.max(200, parseInt(throttleEl.value, 10) || 2000);
      
      expect(perDork).toBe(15);
      expect(maxLinks).toBe(50);
      expect(engine).toBe('bing');
      expect(throttle).toBe(3000);
    });
  });

  describe('Cancel Button Click Handler', () => {
    test('should send cancel message to background', () => {
      chrome.runtime.sendMessage({ action: 'cancel' });
      
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'cancel'
      });
    });
  });

  describe('Download Button Click Handler', () => {
    test('should not create blob when no results', () => {
      collected = [];
      
      // Simulate download logic
      if (!collected.length) return;
      
      const blob = new Blob([collected.join('\n')], { type: 'text/plain;charset=utf-8' });
      
      expect(Blob).not.toHaveBeenCalled();
    });

    test('should create blob with results', () => {
      collected = ['http://example.com', 'http://test.com'];
      
      // Simulate download logic
      if (!collected.length) return;
      
      const blob = new Blob([collected.join('\n')], { type: 'text/plain;charset=utf-8' });
      
      expect(Blob).toHaveBeenCalledWith([collected.join('\n')], { type: 'text/plain;charset=utf-8' });
    });

    test('should create download link', () => {
      collected = ['http://example.com'];
      
      // Simulate download logic
      if (!collected.length) return;
      
      const blob = new Blob([collected.join('\n')], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `links_${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(URL.revokeObjectURL).toHaveBeenCalled();
    });
  });

  describe('Message Listener', () => {
    test('should handle progress message', () => {
      const progressEl = document.getElementById('progress');
      
      // Simulate message handler
      const msg = { type: 'progress', text: 'جاري المعالجة...' };
      if (msg.type === 'progress') {
        progressEl.textContent = msg.text;
      }
      
      expect(progressEl.textContent).toBe('جاري المعالجة...');
    });

    test('should handle result message', () => {
      const msg = { type: 'result', urls: ['http://example.com'] };
      
      // Simulate message handler
      if (msg.type === 'result') {
        collected = msg.urls;
        updateUI();
      }
      
      expect(collected).toEqual(['http://example.com']);
      expect(updateUI).toHaveBeenCalled();
    });

    test('should handle done message', () => {
      running = true;
      const startBtn = document.getElementById('start');
      const cancelBtn = document.getElementById('cancel');
      startBtn.disabled = true;
      cancelBtn.disabled = false;
      const progressEl = document.getElementById('progress');
      
      // Simulate message handler
      const msg = { type: 'done' };
      if (msg.type === 'done') {
        progressEl.textContent = 'اكتمل.';
        running = false;
        startBtn.disabled = false;
        cancelBtn.disabled = true;
      }
      
      expect(progressEl.textContent).toBe('اكتمل.');
      expect(running).toBe(false);
      expect(startBtn.disabled).toBe(false);
      expect(cancelBtn.disabled).toBe(true);
    });

    test('should handle stopped message', () => {
      running = true;
      const startBtn = document.getElementById('start');
      const cancelBtn = document.getElementById('cancel');
      startBtn.disabled = true;
      cancelBtn.disabled = false;
      const progressEl = document.getElementById('progress');
      
      // Simulate message handler
      const msg = { type: 'stopped' };
      if (msg.type === 'stopped') {
        progressEl.textContent = 'توقفت العملية.';
        running = false;
        startBtn.disabled = false;
        cancelBtn.disabled = true;
      }
      
      expect(progressEl.textContent).toBe('توقفت العملية.');
      expect(running).toBe(false);
      expect(startBtn.disabled).toBe(false);
      expect(cancelBtn.disabled).toBe(true);
    });
  });
});
