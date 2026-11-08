const fs = require('fs');
const vm = require('vm');
const code = fs.readFileSync('e:/Buddha/public/app.js', 'utf8');

// strip import statement
const stripped = code.replace(/import\s+\*\s+as\s+THREE\s+from\s+['"][^'"]+['"];?/, '// import stripped');

try {
  new vm.Script(stripped, { filename: 'public/app.js' });
  console.log('Script parsed cleanly with vm.Script!');
} catch (err) {
  console.error('Exact Syntax Error in app.js:');
  console.error(err);
  console.error('Stack:', err.stack);
}
