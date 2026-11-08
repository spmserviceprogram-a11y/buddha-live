const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const files = [
  'server.js',
  'auto-push.js',
  'public/app.js'
];

let hasError = false;
console.log('=== [SYNTAX INTEGRITY AUDIT] ===');
for (const rel of files) {
  const full = path.join(__dirname, rel);
  if (!fs.existsSync(full)) {
    console.warn(`[SKIP] ${rel} not found`);
    continue;
  }
  try {
    execSync(`node --check "${full}"`, { stdio: 'pipe' });
    console.log(`✅ [VALID] ${rel}`);
  } catch (err) {
    hasError = true;
    const msg = err.stderr ? err.stderr.toString().trim() : err.message;
    console.error(`❌ [ERROR] ${rel} has syntax errors:`);
    console.error(msg);
  }
}

if (hasError) {
  process.exit(1);
} else {
  console.log('>>> ALL CORE JAVASCRIPT FILES ARE SYNTACTICALLY VALID <<<\n');
}
