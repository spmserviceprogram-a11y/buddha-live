const fs = require('fs');
const content = fs.readFileSync('e:/Buddha/node_modules/tiktok-live-connector/dist/lib-DWhiWLli.js', 'utf8');

const idx = content.indexOf('WebcastGiftMessage:');
if (idx !== -1) {
  console.log(content.slice(idx, idx + 1000));
} else {
  const idx2 = content.indexOf('WebcastGiftMessage');
  console.log(content.slice(idx2, idx2 + 1000));
}



