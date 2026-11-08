const fs = require('fs');
const content = fs.readFileSync('e:/Buddha/node_modules/tiktok-live-connector/dist/lib-DWhiWLli.js', 'utf8');

const idx = content.indexOf('fetchAvailableGifts()');
if (idx !== -1) {
  console.log(content.slice(idx - 50, idx + 800));
} else {
  const idx2 = content.indexOf('fetchAvailableGifts');
  console.log(content.slice(idx2 - 50, idx2 + 800));
}








