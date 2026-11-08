const fs = require('fs');
const content = fs.readFileSync('e:/Buddha/node_modules/tiktok-live-connector/dist/lib-DWhiWLli.js', 'utf8');

const regex = /["']gift["']/g;
let match;
while ((match = regex.exec(content)) !== null) {
  const idx = match.index;
  console.log('=== MATCH AT', idx, '===');
  console.log(content.slice(Math.max(0, idx - 100), Math.min(content.length, idx + 200)));
}

