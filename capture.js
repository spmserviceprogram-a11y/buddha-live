const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9333;

const chrome = spawn(chromePath, [
  '--headless=new',
  `--remote-debugging-port=${port}`,
  '--no-sandbox',
  '--disable-gpu',
  '--window-size=720,1280',
  'http://localhost:3000'
]);

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

setTimeout(async () => {
  try {
    const targets = await getJson(`http://127.0.0.1:${port}/json`);
    const page = targets.find(t => t.type === 'page');
    if (!page) {
      chrome.kill();
      process.exit(1);
    }

    const ws = new WebSocket(page.webSocketDebuggerUrl);

    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
    });

    ws.addEventListener('message', event => {
      const msg = JSON.parse(event.data);
      if (msg.id === 10) {
        const base64 = msg.result?.data;
        if (base64) {
          fs.writeFileSync('e:/Buddha/live-capture.png', Buffer.from(base64, 'base64'));
          console.log('✅ Screenshot captured successfully: e:/Buddha/live-capture.png');
        }
      }
    });

    // Wait 3 seconds for Three.js and devotees to initialize and render, then capture
    setTimeout(() => {
      ws.send(JSON.stringify({ id: 10, method: 'Page.captureScreenshot', params: { format: 'png' } }));
      setTimeout(() => {
        ws.close();
        chrome.kill();
        process.exit(0);
      }, 1000);
    }, 3000);
  } catch (err) {
    chrome.kill();
    process.exit(1);
  }
}, 2000);
