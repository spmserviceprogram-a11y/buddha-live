const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');

console.log('=== [AUTO GIT PUSH WATCHER ACTIVE] ===');
console.log('ระบบกำลังเฝ้าตรวจจับการแก้ไขไฟล์... เมื่อบันทึกไฟล์จะ Push ขึ้น GitHub ให้อัตโนมัติทันที\n');

let debounceTimer = null;
const DEBOUNCE_DELAY = 3500; // 3.5 วินาทีหลังการบันทึกครั้งสุดท้าย

const IGNORED_DIRS = ['node_modules', '.git', '.system_generated', 'dist', 'audio_cache', 'public/audio_cache', 'public\\audio_cache', 'logs', '.cache'];

const customGiftsToSync = [
  {
    source: path.join(__dirname, 'ของขวัญ', 'ลำดับที่ 1.png'),
    dest: path.join(__dirname, 'public', 'rose.png')
  },
  {
    source: path.join(__dirname, 'ของขวัญ', 'ลำดับที่ 2.png'),
    dest: path.join(__dirname, 'public', 'omamori.png')
  },
  {
    source: path.join(__dirname, 'ของขวัญ', 'ลำดับที่ 3.png'),
    dest: path.join(__dirname, 'public', 'lucky_9.png')
  },
  {
    source: path.join(__dirname, 'ของขวัญ', 'ลำดับที่ 4.png'),
    dest: path.join(__dirname, 'public', 'rose_99.png')
  },
  {
    source: path.join(__dirname, 'ของขวัญ', 'ลำดับที่ 5.png'),
    dest: path.join(__dirname, 'public', 'garland.png')
  },
  {
    source: path.join(__dirname, 'ของขวัญ', 'ลำดับที่ 6.png'),
    dest: path.join(__dirname, 'public', 'cologne.png')
  },
  {
    source: path.join(__dirname, 'ของขวัญ', 'ลำดับที่ 7.png'),
    dest: path.join(__dirname, 'public', 'donut.png')
  },
  {
    source: path.join(__dirname, 'ของขวัญ', 'ลำดับที่ 8.png'),
    dest: path.join(__dirname, 'public', 'four_hearts.png')
  },
  {
    source: path.join(__dirname, 'ของขวัญ', 'ลำดับที่ 9.png'),
    dest: path.join(__dirname, 'public', 'portal.png')
  },
  {
    source: path.join(__dirname, 'ของขวัญ', 'ลำดับที่ 10.png'),
    dest: path.join(__dirname, 'public', 'dragon.png')
  }
];

const blessingVideosToSync = [
  { num: 4, dest: path.join(__dirname, 'public', 'videos', 'blessing_tier1.mp4'), name: 'พร 4.mp4' },
  { num: 3, dest: path.join(__dirname, 'public', 'videos', 'blessing_tier2.mp4'), name: 'พร 3.mp4' },
  { num: 1, dest: path.join(__dirname, 'public', 'videos', 'blessing_climax_a.mp4'), name: 'พร 1.mp4' },
  { num: 2, dest: path.join(__dirname, 'public', 'videos', 'blessing_climax_b.mp4'), name: 'พร 2.mp4' }
];

function syncBlessingVideosAuto() {
  const desktopDirs = [
    'C:/Users/BINARY/Desktop',
    'c:/Users/BINARY/Desktop',
    path.join(process.env.USERPROFILE || 'C:/Users/BINARY', 'Desktop')
  ];
  const videosDir = path.join(__dirname, 'public', 'videos');
  if (!fs.existsSync(videosDir)) {
    try { fs.mkdirSync(videosDir, { recursive: true }); } catch (_) {}
  }
  blessingVideosToSync.forEach(v => {
    try {
      let src = null;
      for (const d of desktopDirs) {
        const cands = [
          path.join(d, v.name),
          path.join(d, `ให้พร ${v.num}.mp4`),
          path.join(d, `blessing_${v.num}.mp4`)
        ];
        for (const c of cands) {
          if (fs.existsSync(c)) {
            src = c;
            break;
          }
        }
        if (src) break;
      }
      if (src && fs.existsSync(src)) {
        const srcStat = fs.statSync(src);
        const destStat = fs.existsSync(v.dest) ? fs.statSync(v.dest) : null;
        if (!destStat || destStat.size !== srcStat.size || srcStat.mtimeMs > destStat.mtimeMs) {
          fs.copyFileSync(src, v.dest);
          console.log(`[Auto-Sync] ซิงค์วิดีโอมงคล 10s: ${path.basename(v.dest)} (${srcStat.size} bytes)`);
        }
      }
    } catch (e) {
      console.warn(`[Auto-Sync Video Warning] ${v.name}:`, e.message);
    }
  });
}
syncBlessingVideosAuto();

function syncCustomGifts() {
  syncBlessingVideosAuto();
  customGiftsToSync.forEach(g => {
    try {
      if (fs.existsSync(g.source)) {
        if (!fs.existsSync(g.dest) || fs.statSync(g.source).size !== fs.statSync(g.dest).size || fs.statSync(g.source).mtimeMs > fs.statSync(g.dest).mtimeMs) {
          fs.copyFileSync(g.source, g.dest);
          console.log(`[Auto-Sync] คัดลอกภาพของขวัญ ${path.basename(g.dest)} สำเร็จ (${fs.statSync(g.source).size} bytes)`);
        }
      }
    } catch (e) {
      console.warn(`[Auto-Sync Warning] ไม่สามารถคัดลอก ${g.dest}:`, e.message);
    }
  });
}
syncCustomGifts();

function shouldIgnore(filename) {
  if (!filename) return true;
  const normalized = filename.replace(/\\/g, '/');
  for (const dir of IGNORED_DIRS) {
    if (normalized.includes(dir)) return true;
  }
  if (normalized.endsWith('.tmp') || normalized.endsWith('~') || normalized.includes('.git')) {
    return true;
  }
  return false;
}

const gitEnv = {
  ...process.env,
  GIT_TERMINAL_PROMPT: '0',
  GCM_INTERACTIVE: 'never'
};

const vm = require('vm');

function verifySyntax() {
  const filesToCheck = [
    path.join(__dirname, 'server.js'),
    path.join(__dirname, 'public', 'app.js'),
    path.join(__dirname, 'auto-push.js')
  ];

  for (const file of filesToCheck) {
    if (fs.existsSync(file)) {
      try {
        const code = fs.readFileSync(file, 'utf8');
        if (file.endsWith('app.js')) {
          if (vm.SourceTextModule) {
            new vm.SourceTextModule(code, { identifier: path.basename(file) });
          } else {
            new vm.Script('"use strict";\n' + code.replace(/import\s+\*\s+as\s+THREE\s+from\s+['"][^'"]+['"];?/, '// stripped import'), { filename: path.basename(file) });
          }
        } else {
          new vm.Script(code, { filename: path.basename(file) });
        }
      } catch (err) {
        console.error(`\n❌ [SYNTAX SHIELD - COMMIT BLOCKED]`);
        console.error(`ไฟล์ ${path.basename(file)} มีข้อผิดพลาดทางไวยากรณ์ (Syntax Error):`);
        console.error(err.message);
        console.error(`🚨 ยกเลิกการ Commit และ Push อัตโนมัติ เพื่อป้องกันระบบบน Render/เว็บพัง\n`);
        return false;
      }
    }
  }
  return true;
}

function commitAndPush(forcePush = false) {
  try {
    syncCustomGifts();
    const status = execSync('git status --porcelain', { encoding: 'utf-8', env: gitEnv }).trim();
    if (!status && !forcePush) {
      return;
    }

    // --- SYNTAX GATE: Permanently protect production code ---
    if (!verifySyntax()) {
      return;
    }

    if (status) {
      console.log(`[${new Date().toLocaleTimeString()}] ตรวจพบการแก้ไขไฟล์ (ผ่านการตรวจไวยากรณ์เรียบร้อย) กำลังอัปโหลดขึ้น GitHub...`);
      const timeStr = new Date().toLocaleString('th-TH');

      execSync('git add .', { env: gitEnv });
      execSync(`git commit -m "auto: update ${timeStr}"`, { env: gitEnv });
      console.log(`  -> ทำการ Commit สำเร็จ`);
    }

    exec('git push --force origin main', { env: gitEnv }, (err) => {
      if (err) {
        console.warn(`[คำเตือน] Push ไปยัง spmserviceprogram-a11y/buddha-live:`, err.message);
      } else {
        console.log(`>>> [SUCCESS] อัปเดตขึ้น GitHub (spmserviceprogram-a11y/buddha-live) สำเร็จแล้ว! Render จะเริ่มบิลด์ให้อัตโนมัติ <<<\n`);
      }
    });
    // Note: backup push removed to prevent non-stop GCM browser OAuth popup windows
  } catch (err) {
    console.warn('[Auto-Push Error]:', err.message);
  }
}

// Initial sync & push on startup
commitAndPush(true);

// Watch directory recursively (Supported natively in Windows - Clean Production Sync v76)
fs.watch(__dirname, { recursive: true }, (eventType, filename) => {
  if (shouldIgnore(filename)) return;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    commitAndPush();
  }, DEBOUNCE_DELAY);
});

