const fs = require('fs');
const content = fs.readFileSync('e:/Buddha/node_modules/tiktok-live-connector/dist/lib-DWhiWLli.js', 'utf8');

let pos = 0;
while (true) {
  const idx = content.indexOf("emit('gift'", pos);
  if (idx === -1) break;
  console.log('=== MATCH AT', idx, '===');
  console.log(content.slice(Math.max(0, idx - 150), Math.min(content.length, idx + 400)));
  pos = idx + 1;
}
