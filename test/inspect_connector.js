const fs = require('fs');
const content = fs.readFileSync('e:/Buddha/node_modules/tiktok-live-connector/dist/lib-DWhiWLli.js', 'utf8');

const idx = content.indexOf('fetchAvailableGifts(');
console.log(content.slice(idx, idx + 1000));







