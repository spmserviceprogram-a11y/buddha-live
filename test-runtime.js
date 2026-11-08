const path = require('path');
const fs = require('fs');
const vm = require('vm');

function createMockElement(tag = 'div', id = '') {
  const el = {
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
    options: [{ textContent: 'Default', value: 'default' }],
    selectedIndex: 0,
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
  return el;
}

const mockDoc = {
  getElementById: (id) => createMockElement('div', id),
  querySelector: (sel) => createMockElement('div'),
  querySelectorAll: () => [],
  createElement: (tag) => createMockElement(tag),
  createElementNS: (ns, tag) => createMockElement(tag),
  body: createMockElement('body'),
  addEventListener: () => {},
  removeEventListener: () => {}
};

class MockAudioContext {
  constructor() {
    this.destination = {};
  }
  createGain() {
    return {
      connect: () => {},
      gain: { value: 1, setValueAtTime: () => {}, linearRampToValueAtTime: () => {} }
    };
  }
  createBiquadFilter() {
    return {
      connect: () => {},
      frequency: { value: 1000 },
      Q: { value: 1 }
    };
  }
  createOscillator() {
    return {
      connect: () => {},
      frequency: { value: 440 },
      start: () => {},
      stop: () => {}
    };
  }
}

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
  AudioContext: MockAudioContext,
  webkitAudioContext: MockAudioContext,
  AbortController: global.AbortController
};

global.window = mockWindow;
global.document = mockDoc;
global.navigator = { userAgent: 'NodeMock' };
global.AudioContext = MockAudioContext;
global.webkitAudioContext = MockAudioContext;

const THREE = require('three');

const context = vm.createContext({
  ...mockWindow,
  window: mockWindow,
  document: mockDoc,
  navigator: global.navigator,
  localStorage: mockWindow.localStorage,
  Audio: mockWindow.Audio,
  Image: mockWindow.Image,
  fetch: mockWindow.fetch,
  AbortController: global.AbortController,
  AudioContext: MockAudioContext,
  webkitAudioContext: MockAudioContext,
  THREE: THREE,
  console: console,
  setTimeout: () => 1,
  clearTimeout: () => {},
  setInterval: () => 1,
  clearInterval: () => {}
});

try {
  let code = fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8');
  code = code.replace(/import\s+\*\s+as\s+THREE\s+from\s+['"][^'"]+['"];?/, '// stripped import');
  // Replace WebGLRenderer instantiation with a dummy object
  code = code.replace(
    /const renderer = new THREE\.WebGLRenderer\([^)]*\);?/,
    'const renderer = { domElement: document.createElement("canvas"), shadowMap: {}, setSize: ()=>{}, setPixelRatio: ()=>{}, render: ()=>{} };'
  );
  console.log('Running app.js in simulated browser runtime...');
  vm.runInContext(code, context, { filename: 'app.js' });
  console.log('🎉🎉🎉 SUCCESS! app.js executed from line 1 to line 14423 without any exceptions!');
} catch (err) {
  console.error('❌ Top-level runtime error in app.js:');
  console.error(err);
}
