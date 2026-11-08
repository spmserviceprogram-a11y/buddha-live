const fs = require('fs');
const code = fs.readFileSync('e:/Buddha/public/app.js', 'utf8');

const mockEl = {
  style: {},
  appendChild: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  classList: { add: () => {}, remove: () => {}, contains: () => false },
  setAttribute: () => {},
  getAttribute: () => '',
  getContext: () => ({
    fillRect: () => {}, fillText: () => {}, strokeText: () => {},
    beginPath: () => {}, arc: () => {}, fill: () => {}, stroke: () => {},
    save: () => {}, restore: () => {}, measureText: () => ({ width: 100 }),
    drawImage: () => {}, clearRect: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} })
  }),
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 720, height: 1280 }),
  children: [],
  querySelectorAll: () => [],
  querySelector: () => null
};

global.window = global;
global.document = {
  getElementById: (id) => ({ ...mockEl, id }),
  createElement: (tag) => ({ ...mockEl, tagName: tag.toUpperCase() }),
  querySelectorAll: () => [],
  querySelector: () => null,
  body: { ...mockEl, tagName: 'BODY' },
  head: { ...mockEl, tagName: 'HEAD' },
  addEventListener: () => {},
  removeEventListener: () => {}
};
global.navigator = { userAgent: 'Chrome', mediaDevices: { enumerateDevices: async () => [] } };
global.location = { search: '', href: 'http://localhost:3000/' };
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.Audio = function() { return { ...mockEl, play: async () => {}, pause: () => {}, addEventListener: () => {} }; };
global.Image = function() { return { ...mockEl, complete: true, naturalWidth: 100, naturalHeight: 100 }; };
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);
global.io = () => ({ on: () => {}, emit: () => {} });
global.THREE = require('three');

console.log('Testing execution of app.js...');
try {
  const stripped = code.replace(/import\s+\*\s+as\s+THREE\s+from\s+['"][^'"]+['"];?/, '');
  eval(stripped);
  console.log('SUCCESS! app.js executed without top-level throwing.');
} catch (err) {
  console.error('ERROR AT RUNTIME IN APP.JS:');
  console.error(err.stack || err);
}
