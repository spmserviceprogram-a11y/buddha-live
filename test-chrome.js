const { spawn } = require('child_process');
const http = require('http');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9333;

const chrome = spawn(chromePath, [
  '--headless=new',
  `--remote-debugging-port=${port}`,
  '--no-sandbox',
  '--disable-gpu',
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
      console.log('No page target found:', targets);
      chrome.kill();
      process.exit(1);
    }

    console.log('Found page target:', page.url);
    const wsUrl = page.webSocketDebuggerUrl;

    const ws = new WebSocket(wsUrl);

    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Console.enable' }));
      ws.send(JSON.stringify({ id: 3, method: 'Log.enable' }));
      ws.send(JSON.stringify({ id: 4, method: 'Page.enable' }));
      ws.send(JSON.stringify({ id: 5, method: 'Page.reload' }));
    });

    ws.addEventListener('message', event => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.exceptionThrown') {
        console.error('\n🚨 [CHROME RUNTIME EXCEPTION]:');
        console.error(JSON.stringify(msg.params.exceptionDetails, null, 2));
      } else if (msg.method === 'Console.messageAdded') {
        console.log('[CHROME CONSOLE]:', msg.params.message.text);
      } else if (msg.method === 'Runtime.consoleAPICalled') {
        console.log(`[CHROME LOG ${msg.params.type}]:`, msg.params.args.map(a => a.value || a.description).join(' '));
      }
    });

    setTimeout(() => {
      console.log('\n--- Chrome evaluation completed ---');
      ws.close();
      chrome.kill();
      process.exit(0);
    }, 6000);
  } catch (err) {
    console.error('Error connecting to Chrome CDP:', err.message);
    chrome.kill();
    process.exit(1);
  }
}, 2000);
