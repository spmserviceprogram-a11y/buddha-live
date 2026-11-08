const path = require('path');
const fs = require('fs');
const vm = require('vm');

const files = [
  'server.js',
  'auto-push.js',
  'public/app.js'
];

let hasError = false;
console.log('=== [SYNTAX & AST INTEGRITY AUDIT] ===');
for (const rel of files) {
  const full = path.join(__dirname, rel);
  if (!fs.existsSync(full)) {
    console.warn(`[SKIP] ${rel} not found`);
    continue;
  }
  try {
    const code = fs.readFileSync(full, 'utf8');
    const scriptCode = code.replace(/import\s+\*\s+as\s+THREE\s+from\s+['"][^'"]+['"];?/, '// stripped import');
    new vm.Script(scriptCode, { filename: rel });
    console.log(`✅ [VALID] ${rel}`);
  } catch (err) {
    hasError = true;
    console.error(`❌ [ERROR] ${rel} has syntax/compile errors:`);
    console.error(err.message);
    if (err.stack) console.error(err.stack.split('\n').slice(0, 5).join('\n'));
  }
}

if (hasError) {
  process.exit(1);
} else {
  console.log('>>> ALL CORE JAVASCRIPT FILES ARE SYNTACTICALLY VALID <<<\n');
}
