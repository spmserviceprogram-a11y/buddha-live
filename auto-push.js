const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');

console.log('=== [AUTO GIT PUSH WATCHER ACTIVE] ===');
console.log('ระบบกำลังเฝ้าตรวจจับการแก้ไขไฟล์... เมื่อบันทึกไฟล์จะ Push ขึ้น GitHub ให้อัตโนมัติทันที\n');

let debounceTimer = null;
const DEBOUNCE_DELAY = 3500; // 3.5 วินาทีหลังการบันทึกครั้งสุดท้าย

const IGNORED_DIRS = ['node_modules', '.git', '.system_generated', 'dist'];

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
  },
  {
    source: 'C:/Users/BINARY/.gemini/antigravity/brain/7a20d83f-7817-49a0-aa95-c0145116b164/.user_uploaded/media_1793976636041_08732252.png',
    dest: path.join(__dirname, 'public', 'seamsi.png')
  },
  {
    source: 'C:/Users/BINARY/.gemini/antigravity/brain/7a20d83f-7817-49a0-aa95-c0145116b164/.user_uploaded/media_1794047302649_51e079b8.jpg',
    dest: path.join(__dirname, 'public', 'background.jpg')
  },
  {
    source: 'C:/Users/BINARY/.gemini/antigravity/brain/7a20d83f-7817-49a0-aa95-c0145116b164/.user_uploaded/media_1794047302649_51e079b8.jpg',
    dest: path.join(__dirname, 'public', 'heavenly_paradise.jpg')
  },
  {
    source: 'C:/Users/BINARY/Desktop/พื้นหลังใหม่.mp4',
    dest: path.join(__dirname, 'public', 'background_video.mp4')
  },
  {
    source: 'C:/Users/BINARY/Desktop/พื้นหลังใหม่.mp4',
    dest: path.join(__dirname, 'public', 'bg-video.mp4')
  }
];

function syncCustomGifts() {
  try {
    const backupPath = path.join(__dirname, 'public', 'bgm_backup_commercial.mp3');
    const bgmTarget = path.join(__dirname, 'public', 'bgm.mp3');
    // Ensure the authentic Da Bei Zhou sacred chanting audio is restored and preserved
    if (fs.existsSync(backupPath)) {
      if (!fs.existsSync(bgmTarget) || fs.statSync(backupPath).size !== fs.statSync(bgmTarget).size) {
        fs.copyFileSync(backupPath, bgmTarget);
        console.log('[Auto-Sync] Restored authentic Da Bei Zhou chanting track to public/bgm.mp3');
      }
    }
  } catch (e) {
    console.warn('[BGM Restore Notice]:', e.message);
  }

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
  for (const dir of IGNORED_DIRS) {
    if (filename.includes(dir)) return true;
  }
  return false;
}

function commitAndPush(forcePush = false) {
  try {
    syncCustomGifts();
    const status = execSync('git status --porcelain', { encoding: 'utf-8' }).trim();
    if (status) {
      console.log(`[${new Date().toLocaleTimeString()}] ตรวจพบการแก้ไขไฟล์ กำลังอัปโหลดขึ้น GitHub...`);
      const timeStr = new Date().toLocaleString('th-TH');

      execSync('git add .');
      execSync(`git commit -m "auto: update ${timeStr}"`);
      console.log(`  -> ทำการ Commit สำเร็จ`);
    } else if (!forcePush) {
      return;
    }

    exec('git push --force origin main', (err) => {
      if (err) {
        console.warn(`[คำเตือน] Push ไปยัง spmserviceprogram-a11y/buddha-live ยังติดสิทธิ์ 403 (ต้องเพิ่ม suphat060841 เป็น Collaborator):`, err.message);
      } else {
        console.log(`>>> [SUCCESS] อัปเดตขึ้น GitHub (spmserviceprogram-a11y/buddha-live) สำเร็จแล้ว! Render จะเริ่มบิลด์ให้อัตโนมัติ <<<\n`);
      }
    });
    exec('git push backup main', () => {});
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

