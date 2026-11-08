const fs = require('fs');
const content = fs.readFileSync('e:/Buddha/node_modules/tiktok-live-connector/dist/lib-DWhiWLli.js', 'utf8');

let pos = 0;
while (true) {
  const idx = content.indexOf('_availableGifts', pos);
  if (idx === -1) break;
  console.log('=== AT', idx, '===');
  console.log(content.slice(Math.max(0, idx - 50), Math.min(content.length, idx + 200)));
  pos = idx + 1;
}





