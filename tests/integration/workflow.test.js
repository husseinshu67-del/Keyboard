/**
 * Integration tests for the complete workflow
 * Tests the interaction between different components
 */

require('../setup');

// Import the necessary modules
const fs = require('fs');
const path = require('path');

// Read the files
const backgroundPath = path.join(__dirname, '../../background.js');
const popupPath = path.join(__dirname, '../../popup.js');
const backgroundContent = fs.readFileSync(backgroundPath, 'utf8');
const popupContent = fs.readFileSync(popupPath, 'utf8');

// Mock state for integration testing
let testState = {
  collected: [],
  running: false,
  active: false,
  controller: { cancelRequested: false },
  aggregated: []
};

describe('Integration Tests - Complete Workflow', () => {
  let originalChrome, originalDocument;

  beforeEach(() => {
    // Reset state
    testState = {
      collected: [],
      running: false,
      active: false,
      controller: { cancelRequested: false },
      aggregated: []
    };

    // Mock chrome API
    originalChrome = global.chrome;
    global.chrome = {
      runtime: {
        sendMessage: jest.fn((message, callback) => {
          // Handle different message types
          if (message.action === 'start') {
            testState.active = true;
            testState.controller.cancelRequested = false;
            testState.aggregated = [];
            
            // Simulate the background processing
            setTimeout(() => {
              testState.aggregated = ['http://example.com', 'http://test.com'];
              
              // Send progress updates
              chrome.runtime.onMessage.listeners.forEach(listener => {
                listener({ type: 'progress', text: 'معالجة dork 1/1: test' });
                listener({ type: 'result', urls: testState.aggregated });
                listener({ type: 'done' });
              });
            }, 50);
            
            return Promise.resolve({});
          }
          
          if (message.action === 'cancel') {
            testState.controller.cancelRequested = true;
            testState.active = false;
            
            setTimeout(() => {
              chrome.runtime.onMessage.listeners.forEach(listener => {
                listener({ type: 'stopped' });
              });
            }, 10);
            
            return Promise.resolve({});
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
          const tab = { id: tabId, url: options.url };
          if (callback) callback(tab);
          return Promise.resolve(tab);
        }),
        remove: jest.fn((tabId, callback) => {
          if (callback) callback();
          return Promise.resolve();
        }),
        onUpdated: {
          addListener: jest.fn(),
          removeListener: jest.fn()
        }
      },
      scripting: {
        executeScript: jest.fn((options, callback) => {
          // Simulate scraping results
          const results = ['http://example.com', 'http://test.com'];
          if (callback) callback([{ result: results }]);
          return Promise.resolve([{ result: results }]);
        })
      }
    };

    // Mock DOM
    originalDocument = global.document;
    global.document = {
      getElementById: jest.fn((id) => {
        const elements = {
          'dorks': { value: 'test query', addEventListener: jest.fn() },
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
        setAttribute: jest.fn()
      })),
      querySelectorAll: jest.fn(() => [])
    };

    // Mock URL and Blob
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();
    global.Blob = class Blob {
      constructor(content, options) {
        this.content = content;
        this.options = options;
      }
    };
    global.navigator.clipboard = {
      writeText: jest.fn(() => Promise.resolve())
    };
  });

  afterEach(() => {
    global.chrome = originalChrome;
    global.document = originalDocument;
    jest.clearAllMocks();
  });

  describe('Complete Collection Workflow', () => {
    test('should complete full workflow from start to download', async () => {
      // Evaluate popup.js to set up event listeners
      eval(popupContent);

      // Simulate user input
      const dorksEl = document.getElementById('dorks');
      dorksEl.value = 'test query';

      // Simulate click on start button
      const startBtn = document.getElementById('start');
      const startHandler = startBtn.addEventListener.mock.calls[0][1];
      
      // Wait for the workflow to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      startHandler();

      // Wait for background processing
      await new Promise(resolve => setTimeout(resolve, 150));

      // Check that start message was sent
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'start',
        dorks: ['test query'],
        perDork: 10,
        maxLinks: 100,
        engine: 'google',
        throttle: 2000
      });

      // Check that UI was updated
      const progressEl = document.getElementById('progress');
      expect(progressEl.textContent).toContain('مرسل المهام إلى الخلفية');

      // Check that start button was disabled
      expect(startBtn.disabled).toBe(true);

      // Check that cancel button was enabled
      const cancelBtn = document.getElementById('cancel');
      expect(cancelBtn.disabled).toBe(false);

      // Wait for results to be processed
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check that results were received and UI updated
      const resultsEl = document.getElementById('results');
      expect(resultsEl.innerHTML).not.toBe('');

      // Check that download button was enabled
      const downloadBtn = document.getElementById('download');
      expect(downloadBtn.disabled).toBe(false);

      // Check that progress shows completion
      expect(progressEl.textContent).toContain('اكتمل');
    });

    test('should handle cancellation workflow', async () => {
      // Evaluate popup.js
      eval(popupContent);

      // Simulate user input
      const dorksEl = document.getElementById('dorks');
      dorksEl.value = 'test query';

      // Simulate click on start button
      const startBtn = document.getElementById('start');
      const startHandler = startBtn.addEventListener.mock.calls[0][1];
      
      startHandler();

      // Wait a bit then cancel
      await new Promise(resolve => setTimeout(resolve, 30));

      // Simulate click on cancel button
      const cancelBtn = document.getElementById('cancel');
      const cancelHandler = cancelBtn.addEventListener.mock.calls[0][1];
      cancelHandler();

      // Wait for cancellation to process
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check that cancel message was sent
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'cancel'
      });

      // Check that UI was updated for cancellation
      const progressEl = document.getElementById('progress');
      expect(progressEl.textContent).toContain('جاري إلغاء العملية');

      // Check that buttons were updated
      expect(startBtn.disabled).toBe(false);
      expect(cancelBtn.disabled).toBe(true);
    });

    test('should handle download after collection', async () => {
      // Evaluate popup.js
      eval(popupContent);

      // Simulate that we have collected results
      const collected = ['http://example.com', 'http://test.com'];
      const resultsEl = document.getElementById('results');
      const downloadBtn = document.getElementById('download');

      // Manually set the collected state and update UI
      window.collected = collected;
      window.updateUI();

      // Check that download button is enabled
      expect(downloadBtn.disabled).toBe(false);

      // Simulate click on download button
      const downloadHandler = downloadBtn.addEventListener.mock.calls[0][1];
      downloadHandler();

      // Check that Blob was created with correct content
      expect(Blob).toHaveBeenCalledWith([collected.join('\n')], { type: 'text/plain;charset=utf-8' });

      // Check that URL.createObjectURL was called
      expect(URL.createObjectURL).toHaveBeenCalled();

      // Check that download link was created
      expect(document.createElement).toHaveBeenCalledWith('a');

      // Check that URL was revoked
      expect(URL.revokeObjectURL).toHaveBeenCalled();
    });
  });

  describe('Message Handling Integration', () => {
    test('should handle progress messages correctly', async () => {
      // Evaluate popup.js
      eval(popupContent);

      // Get the message handler
      const messageHandler = chrome.runtime.onMessage.addListener.mock.calls[0][0];

      // Send a progress message
      messageHandler({ type: 'progress', text: 'جاري المعالجة...' });

      // Check that progress was updated
      const progressEl = document.getElementById('progress');
      expect(progressEl.textContent).toBe('جاري المعالجة...');
    });

    test('should handle result messages correctly', async () => {
      // Evaluate popup.js
      eval(popupContent);

      // Get the message handler
      const messageHandler = chrome.runtime.onMessage.addListener.mock.calls[0][0];

      // Send a result message
      const testUrls = ['http://example.com', 'http://test.com'];
      messageHandler({ type: 'result', urls: testUrls });

      // Check that collected was updated
      expect(window.collected).toEqual(testUrls);

      // Check that UI was updated
      expect(window.updateUI).toHaveBeenCalled();
    });

    test('should handle done message correctly', async () => {
      // Evaluate popup.js
      eval(popupContent);

      // Set running state
      window.running = true;
      const startBtn = document.getElementById('start');
      const cancelBtn = document.getElementById('cancel');
      startBtn.disabled = true;
      cancelBtn.disabled = false;

      // Get the message handler
      const messageHandler = chrome.runtime.onMessage.addListener.mock.calls[0][0];

      // Send a done message
      messageHandler({ type: 'done' });

      // Check that state was updated
      expect(window.running).toBe(false);
      expect(startBtn.disabled).toBe(false);
      expect(cancelBtn.disabled).toBe(true);

      // Check that progress was updated
      const progressEl = document.getElementById('progress');
      expect(progressEl.textContent).toBe('اكتمل.');
    });

    test('should handle stopped message correctly', async () => {
      // Evaluate popup.js
      eval(popupContent);

      // Set running state
      window.running = true;
      const startBtn = document.getElementById('start');
      const cancelBtn = document.getElementById('cancel');
      startBtn.disabled = true;
      cancelBtn.disabled = false;

      // Get the message handler
      const messageHandler = chrome.runtime.onMessage.addListener.mock.calls[0][0];

      // Send a stopped message
      messageHandler({ type: 'stopped' });

      // Check that state was updated
      expect(window.running).toBe(false);
      expect(startBtn.disabled).toBe(false);
      expect(cancelBtn.disabled).toBe(true);

      // Check that progress was updated
      const progressEl = document.getElementById('progress');
      expect(progressEl.textContent).toBe('توقفت العملية.');
    });
  });

  describe('Error Handling Integration', () => {
    test('should show alert when dorks input is empty', async () => {
      // Mock alert
      global.alert = jest.fn();

      // Evaluate popup.js
      eval(popupContent);

      // Set empty dorks
      const dorksEl = document.getElementById('dorks');
      dorksEl.value = '';

      // Simulate click on start button
      const startBtn = document.getElementById('start');
      const startHandler = startBtn.addEventListener.mock.calls[0][1];
      startHandler();

      // Check that alert was shown
      expect(global.alert).toHaveBeenCalled();
    });

    test('should not start collection when dorks is empty', async () => {
      // Mock alert
      global.alert = jest.fn();

      // Evaluate popup.js
      eval(popupContent);

      // Set empty dorks
      const dorksEl = document.getElementById('dorks');
      dorksEl.value = '';

      // Simulate click on start button
      const startBtn = document.getElementById('start');
      const startHandler = startBtn.addEventListener.mock.calls[0][1];
      startHandler();

      // Check that no message was sent to background
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({ action: 'start' })
      );
    });

    test('should not download when no results', async () => {
      // Evaluate popup.js
      eval(popupContent);

      // Ensure no results
      window.collected = [];
      window.updateUI();

      // Simulate click on download button
      const downloadBtn = document.getElementById('download');
      const downloadHandler = downloadBtn.addEventListener.mock.calls[0][1];
      downloadHandler();

      // Check that Blob was not created
      expect(Blob).not.toHaveBeenCalled();
    });
  });
});
