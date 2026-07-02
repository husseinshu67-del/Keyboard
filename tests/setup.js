// Jest setup file for testing Chrome Extension
// This file mocks Chrome API functions and DOM for testing

// Mock chrome API
global.chrome = {
  runtime: {
    sendMessage: jest.fn((message, callback) => {
      // Simulate message handling
      if (message.action === 'start') {
        return Promise.resolve({ success: true });
      }
      if (message.action === 'cancel') {
        return Promise.resolve({ success: true });
      }
      return Promise.resolve({});
    }),
    onMessage: {
      listeners: [],
      addListener: function(listener) {
        this.listeners.push(listener);
      },
      removeListener: function(listener) {
        this.listeners = this.listeners.filter(l => l !== listener);
      }
    }
  },
  tabs: {
    create: jest.fn((options, callback) => {
      const tabId = Math.floor(Math.random() * 1000);
      const tab = { id: tabId, url: options.url, active: options.active || false };
      if (callback) {
        callback(tab);
      }
      return Promise.resolve(tab);
    }),
    remove: jest.fn((tabId, callback) => {
      if (callback) {
        callback();
      }
      return Promise.resolve();
    }),
    onUpdated: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  scripting: {
    executeScript: jest.fn((options, callback) => {
      // Simulate script execution
      const result = options.func ? options.func(...(options.args || [])) : [];
      if (callback) {
        callback([{ result }]);
      }
      return Promise.resolve([{ result }]);
    })
  },
  storage: {
    local: {
      get: jest.fn((keys, callback) => {
        if (callback) {
          callback({});
        }
        return Promise.resolve({});
      }),
      set: jest.fn((items, callback) => {
        if (callback) {
          callback();
        }
        return Promise.resolve();
      })
    }
  }
};

// Mock DOM for Node.js environment (since we're not using jsdom)
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
  })),
  querySelectorAll: jest.fn(() => []),
  body: {
    innerHTML: ''
  }
};

// Mock window object
global.window = {
  collected: [],
  running: false,
  updateUI: jest.fn(),
  location: {
    href: 'chrome-extension://test'
  }
};

// Mock URL and Blob
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

// Mock navigator
global.navigator = {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve())
  },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

// Mock alert
global.alert = jest.fn();

// Mock setTimeout and clearTimeout for testing async code
global.setTimeout = jest.fn((callback, delay) => {
  return setImmediate(callback);
});

global.clearTimeout = jest.fn();

global.setInterval = jest.fn((callback, delay) => {
  return setImmediate(callback);
});

global.clearInterval = jest.fn();

// Export mocks for testing
module.exports = {
  chrome,
  document,
  window,
  URL,
  Blob,
  navigator,
  alert
};
