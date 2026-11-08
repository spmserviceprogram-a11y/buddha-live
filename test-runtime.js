const path = require('path');
const fs = require('fs');
const vm = require('vm');
const THREE = require('three');

function createMockElement(tag = 'div', id = '') {
  return {
    tagName: tag.toUpperCase(),
    id: id,
    style: {},
    classList: {
      add: () => {},
      remove: () => {},
      contains: () => false,
      toggle: () => {}
    },
    dataset: {},
    appendChild: () => {},
    removeChild: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    setAttribute: () => {},
    getAttribute: () => null,
    getBoundingClientRect: () => ({ width: 1080, height: 1920, top: 0, left: 0, right: 1080, bottom: 1920 }),
    clientWidth: 1080,
    clientHeight: 1920,
    offsetWidth: 1080,
    offsetHeight: 1920,
    getContext: () => ({
      clearRect: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      beginPath: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      arc: () => {},
      ellipse: () => {},
      quadraticCurveTo: () => {},
      bezierCurveTo: () => {},
      fill: () => {},
      stroke: () => {},
      clip: () => {},
      save: () => {},
      restore: () => {},
      setTransform: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} }),
      measureText: (txt) => ({ width: (txt || '').length * 10 }),
      fillText: () => {},
      strokeText: () => {},
      drawImage: () => {},
      roundRect: () => {}
    })
  };
}

const mockDoc = {
  getElementById: (id) => createMockElement('div', id),
  querySelector: (sel) => createMockElement('div'),
  querySelectorAll: () => [],
  createElement: (tag) => createMockElement(tag),
  body: createMockElement('body'),
  addEventListener: () => {},
  removeEventListener: () => {}
};

const mockWindow = {
  document: mockDoc,
  location: { href: 'http://localhost:3000', search: '', pathname: '/' },
  addEventListener: () => {},
  removeEventListener: () => {},
  innerWidth: 1080,
  innerHeight: 1920,
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  },
  setInterval: () => 1,
  clearInterval: () => {},
  setTimeout: () => 1,
  clearTimeout: () => {},
  requestAnimationFrame: () => 1,
  cancelAnimationFrame: () => {},
  Audio: class {
    constructor() { this.style = {}; }
    addEventListener() {}
    play() { return Promise.resolve(); }
    pause() {}
  },
  Image: class {
    constructor() { this.complete = true; this.naturalWidth = 100; this.naturalHeight = 100; }
  },
  fetch: () => Promise.resolve({ json: () => Promise.resolve({}) }),
  io: () => ({
    on: () => {},
    emit: () => {}
  }),
  THREE: THREE
};

const context = vm.createContext({
  ...mockWindow,
  window: mockWindow,
  document: mockDoc,
  navigator: { userAgent: 'NodeMock' },
  localStorage: mockWindow.localStorage,
  Audio: mockWindow.Audio,
  Image: mockWindow.Image,
  fetch: mockWindow.fetch,
  THREE: THREE,
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval
});

try {
  let code = fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8');
  code = code.replace(/import\s+\*\s+as\s+THREE\s+from\s+['"][^'"]+['"];?/, '// stripped import');
  console.log('Running app.js in simulated browser runtime...');
  vm.runInContext(code, context, { filename: 'app.js' });
  console.log('✅ app.js executed successfully without any top-level exceptions!');
} catch (err) {
  console.error('❌ Top-level runtime error in app.js:');
  console.error(err);
}
