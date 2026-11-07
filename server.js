const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

// Auto-load .env configuration
if (fs.existsSync(path.join(__dirname, '.env'))) {
  try { process.loadEnvFile(path.join(__dirname, '.env')); } catch (_) { }
}
const axios = require('axios');
const crypto = require('crypto');
const { spawn } = require('child_process');

let TikTokLiveConnection;
let ttlModule = null;
try {
  ttlModule = require('tiktok-live-connector');
  TikTokLiveConnection = ttlModule.TikTokLiveConnection || ttlModule.WebcastPushConnection;
} catch (e) {
  console.warn('[TikTok] tiktok-live-connector not yet ready or failed to load:', e.message);
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;

// Process Safety Guards (Prevent server crashes from unhandled network exceptions)
process.on('uncaughtException', (err) => {
  console.error('[Process] Uncaught Exception:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.warn('[Process] Unhandled Rejection:', reason);
});


app.use(express.json());
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});
// Copy & serve attached custom gift images from e:\Buddha\ของขวัญ\
const customGifts = [
  {
    route: ['/rose.png', '/rose.webp', '/rose_1.png'],
    source: path.join(__dirname, 'ของขวัญ', 'ลำดับที่ 1.png'),
    dest: path.join(__dirname, 'public', 'rose.png')
  },
  {
    route: ['/omamori.png', '/omamori.webp', '/amulet.png'],
    source: path.join(__dirname, 'ของขวัญ', 'ลำดับที่ 2.png'),
    dest: path.join(__dirname, 'public', 'omamori.png')
  },
  {
    route: ['/lucky_9.png', '/lucky_9.webp'],
    source: path.join(__dirname, 'ของขวัญ', 'ลำดับที่ 3.png'),
    dest: path.join(__dirname, 'public', 'lucky_9.png')
  },
  {
    route: ['/rose_99.png', '/rose_99.webp'],
    source: path.join(__dirname, 'ของขวัญ', 'ลำดับที่ 4.png'),
    dest: path.join(__dirname, 'public', 'rose_99.png')
  },
  {
    route: ['/garland.png', '/garland.webp'],
    source: path.join(__dirname, 'ของขวัญ', 'ลำดับที่ 5.png'),
    dest: path.join(__dirname, 'public', 'garland.png')
  },
  {
    route: ['/cologne.png', '/cologne.webp'],
    source: path.join(__dirname, 'ของขวัญ', 'ลำดับที่ 6.png'),
    dest: path.join(__dirname, 'public', 'cologne.png')
  },
  {
    route: ['/donut.png', '/donut.webp', '/doughnut.png'],
    source: path.join(__dirname, 'ของขวัญ', 'ลำดับที่ 7.png'),
    dest: path.join(__dirname, 'public', 'donut.png')
  },
  {
    route: ['/four_hearts.png', '/four_hearts.webp'],
    source: path.join(__dirname, 'ของขวัญ', 'ลำดับที่ 8.png'),
    dest: path.join(__dirname, 'public', 'four_hearts.png')
  },
  {
    route: ['/portal.png', '/portal.webp', '/gate.png'],
    source: path.join(__dirname, 'ของขวัญ', 'ลำดับที่ 9.png'),
    dest: path.join(__dirname, 'public', 'portal.png')
  },
  {
    route: ['/dragon.png', '/dragon.webp', '/alebrije.png'],
    source: path.join(__dirname, 'ของขวัญ', 'ลำดับที่ 10.png'),
    dest: path.join(__dirname, 'public', 'dragon.png')
  },
  {
    route: ['/seamsi.png', '/seamsi.webp', '/hari_raya.png', '/love_you.png', '/hug_heart.png'],
    source: 'C:/Users/BINARY/.gemini/antigravity/brain/7a20d83f-7817-49a0-aa95-c0145116b164/.user_uploaded/media_1793976636041_08732252.png',
    dest: path.join(__dirname, 'public', 'seamsi.png')
  }
];

// Always ensure custom gift images are mirrored to public/
customGifts.forEach(g => {
  try {
    if (fs.existsSync(g.source)) {
      fs.copyFileSync(g.source, g.dest);
    }
  } catch (_) { }

  app.get(g.route, (req, res) => {
    try {
      if (fs.existsSync(g.source) && !fs.existsSync(g.dest)) {
        fs.copyFileSync(g.source, g.dest);
      }
    } catch (_) { }
    if (fs.existsSync(g.dest)) return res.sendFile(g.dest);
    if (fs.existsSync(g.source)) return res.sendFile(g.source);
    res.status(404).send('Gift image not found');
  });
});

// ---------------------------------------------------------------------
// Heavenly Paradise Sanctuary Background (สวนสวรรค์ พระแม่กวนอิม)
// Direct image deployment from user upload
// ---------------------------------------------------------------------
const CELESTIAL_BG_SOURCE = 'C:/Users/BINARY/.gemini/antigravity/brain/7a20d83f-7817-49a0-aa95-c0145116b164/.user_uploaded/media_1794047302649_51e079b8.jpg';
const CELESTIAL_BG_DEST = path.join(__dirname, 'public', 'background.jpg');
const CELESTIAL_BG_PARADISE = path.join(__dirname, 'public', 'heavenly_paradise.jpg');

function syncCelestialBackground() {
  try {
    if (fs.existsSync(CELESTIAL_BG_SOURCE)) {
      fs.copyFileSync(CELESTIAL_BG_SOURCE, CELESTIAL_BG_DEST);
      fs.copyFileSync(CELESTIAL_BG_SOURCE, CELESTIAL_BG_PARADISE);
      console.log('[Background] Heavenly Paradise background synced successfully to public/background.jpg');
    }
  } catch (err) {
    console.warn('[Background Sync Notice]:', err.message);
  }
}
syncCelestialBackground();

app.get('/api/sync-paradise-bg', (req, res) => {
  syncCelestialBackground();
  res.json({ success: true, message: 'Heavenly Paradise background synced!' });
});

app.get(['/background.jpg', '/heavenly_paradise.jpg'], (req, res) => {
  syncCelestialBackground();
  if (fs.existsSync(CELESTIAL_BG_DEST)) {
    res.set('Cache-Control', 'no-cache');
    return res.sendFile(CELESTIAL_BG_DEST);
  }
  if (fs.existsSync(CELESTIAL_BG_SOURCE)) {
    res.set('Cache-Control', 'no-cache');
    return res.sendFile(CELESTIAL_BG_SOURCE);
  }
  res.status(404).send('Background image not found');
});

// ---------------------------------------------------------------------
// Background Video Route (พื้นหลังใหม่.mp4 / background_video.mp4)
// High-efficiency range streaming for TikTok Live & OBS Studio
// ---------------------------------------------------------------------
const BG_VIDEO_SOURCE_CANDIDATES = [
  'C:/Users/BINARY/Desktop/พื้นหลัง.mp4',
  'c:/Users/BINARY/Desktop/พื้นหลัง.mp4',
  path.join(process.env.USERPROFILE || 'C:/Users/BINARY', 'Desktop', 'พื้นหลัง.mp4'),
  'C:/Users/BINARY/Desktop/พื้นหลังใหม่.mp4',
  'c:/Users/BINARY/Desktop/พื้นหลังใหม่.mp4',
  path.join(process.env.USERPROFILE || 'C:/Users/BINARY', 'Desktop', 'พื้นหลังใหม่.mp4'),
  'C:/Users/BINARY/Desktop/gemini_generated_video_e3c530b7.mp4'
];
const BG_VIDEO_DEST = path.join(__dirname, 'public', 'background_video.mp4');
const BG_VIDEO_ALT_DEST = path.join(__dirname, 'public', 'bg-video.mp4');
const BG_VIDEO_THAI_DEST = path.join(__dirname, 'public', 'background.mp4');

function getActiveBgVideoSource() {
  for (const src of BG_VIDEO_SOURCE_CANDIDATES) {
    try {
      if (fs.existsSync(src)) return src;
    } catch (_) {}
  }
  return null;
}

function syncBgVideo() {
  const src = getActiveBgVideoSource();
  if (src && fs.existsSync(src)) {
    try {
      const srcStat = fs.statSync(src);
      const destExists = fs.existsSync(BG_VIDEO_DEST);
      const destStat = destExists ? fs.statSync(BG_VIDEO_DEST) : null;
      if (!destExists || srcStat.size !== destStat.size || srcStat.mtimeMs > destStat.mtimeMs) {
        fs.copyFileSync(src, BG_VIDEO_DEST);
        try { fs.copyFileSync(src, BG_VIDEO_ALT_DEST); } catch (_) {}
        try { fs.copyFileSync(src, BG_VIDEO_THAI_DEST); } catch (_) {}
        console.log(`[Video] Synced new background video from ${src} to ${BG_VIDEO_DEST} (${srcStat.size} bytes)`);
      }
    } catch (e) {
      console.warn('[Video] Copy notice:', e.message);
    }
  }
}
syncBgVideo();

app.get('/api/sync-bg-video', (req, res) => {
  syncBgVideo();
  const activeSrc = getActiveBgVideoSource();
  const exists = fs.existsSync(BG_VIDEO_DEST);
  const size = exists ? fs.statSync(BG_VIDEO_DEST).size : 0;
  res.json({ success: true, activeSrc, exists, size });
});

app.get(['/background_video.mp4', '/bg-video.mp4', '/video.mp4', '/background.mp4'], (req, res) => {
  try {
    syncBgVideo();
  } catch (_) { }

  const videoPath = fs.existsSync(BG_VIDEO_DEST) ? BG_VIDEO_DEST : getActiveBgVideoSource();
  if (!videoPath || !fs.existsSync(videoPath)) {
    return res.status(404).send('Background video not found');
  }

  try {
    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4'
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache'
      };
      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }
  } catch (err) {
    console.warn('[Video Stream Error]:', err.message);
    res.status(500).send('Error streaming video');
  }
});

// ---------------------------------------------------------------------
// Authentic Da Bei Zhou Sacred Chanting Soundtrack (Original MP3)
// ---------------------------------------------------------------------
const bgmPublicDir = path.join(__dirname, 'public');
const bgmTargetPath = path.join(bgmPublicDir, 'bgm.mp3');
const bgmBackupPath = path.join(bgmPublicDir, 'bgm_backup_commercial.mp3');

try {
  // Ensure the authentic Da Bei Zhou sacred chanting audio is restored and preserved
  if (fs.existsSync(bgmBackupPath)) {
    if (!fs.existsSync(bgmTargetPath) || fs.statSync(bgmBackupPath).size !== fs.statSync(bgmTargetPath).size) {
      fs.copyFileSync(bgmBackupPath, bgmTargetPath);
      console.log('[BGM Audio] Restored authentic Da Bei Zhou sacred chanting audio to public/bgm.mp3');
    }
  }
} catch (e) {
  console.warn('[BGM Restore Error]:', e.message);
}

app.get(['/bgm.mp3', '/bgm.wav', '/bgm_zen_original.wav'], (req, res) => {
  const fileToServe = fs.existsSync(bgmTargetPath) ? bgmTargetPath : (fs.existsSync(bgmBackupPath) ? bgmBackupPath : null);

  if (fileToServe) {
    res.set('Content-Type', 'audio/mpeg');
    res.set('Accept-Ranges', 'bytes');
    res.set('Cache-Control', 'no-cache');
    return res.sendFile(fileToServe);
  }

  res.status(404).send('BGM track not found');
});

const PUBLIC_DIR = path.join(__dirname, 'public');
if (!fs.existsSync(PUBLIC_DIR)) {
  try { fs.mkdirSync(PUBLIC_DIR, { recursive: true }); } catch (_) { }
}
app.use(express.static(PUBLIC_DIR, { etag: false, maxAge: 0 }));
app.use('/vendor/three', express.static(path.join(__dirname, 'node_modules/three/build')));

// Avatar Proxy: Guarantees clean CORS headers for Three.js CanvasTexture on WebGL
app.get('/api/avatar-proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl || typeof targetUrl !== 'string' || !targetUrl.startsWith('http')) {
    return res.status(400).send('Invalid url');
  }
  try {
    const response = await axios.get(targetUrl, {
      responseType: 'arraybuffer',
      timeout: 6000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    return res.send(Buffer.from(response.data));
  } catch (err) {
    return res.status(404).send('Avatar not accessible');
  }
});

// ---------------------------------------------------------------------
// ---------------------------------------------------------------------
// High-Definition Neural AI Voice (Google Neural TTS + Edge-TTS Multi-Tier)
// ---------------------------------------------------------------------
const CACHE_DIR = path.join(__dirname, 'public', 'audio_cache');
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
} else {
  // Purge dynamic cache files (preserving default_* files) so Edge-TTS generates fresh authentic voice
  try {
    const files = fs.readdirSync(CACHE_DIR);
    for (const f of files) {
      if (!f.startsWith('default_') && f.endsWith('.mp3')) {
        try { fs.unlinkSync(path.join(CACHE_DIR, f)); } catch (_) {}
      }
    }
    console.log('[TTS Cache] Cleaned stale dynamic audio cache for authentic Edge-TTS regeneration');
  } catch (err) {
    console.warn('[TTS Cache Clean Error]:', err.message);
  }
}

function getFallbackAudioUrl(action = '') {
  const act = (action || '').toLowerCase();
  try {
    if (act.includes('welcome') || act.includes('join') || act.includes('ต้อนรับ') || act.includes('เจริญสติ')) {
      if (fs.existsSync(path.join(CACHE_DIR, 'default_welcome.mp3'))) return '/audio_cache/default_welcome.mp3';
    }
    if (act.includes('follow') || act.includes('ติดตาม')) {
      if (fs.existsSync(path.join(CACHE_DIR, 'default_follow.mp3'))) return '/audio_cache/default_follow.mp3';
    }
    if (fs.existsSync(path.join(CACHE_DIR, 'default_blessing.mp3'))) {
      return '/audio_cache/default_blessing.mp3';
    }
  } catch (_) { }
  return '/audio_cache/default_blessing.mp3';
}

// Tier 1: Google Translate Neural Thai TTS (Ultra-fast ~200ms, zero-crash, crystal clear Thai name pronunciation)
async function synthesizeGoogleTTS(text, filename) {
  const filePath = path.join(CACHE_DIR, filename);
  if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1000) {
    return `/audio_cache/${filename}`;
  }

  // Google Translate TTS accepts chunks up to ~180 characters
  const maxLen = 170;
  const chunks = [];
  let remaining = text.trim();
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }
    let splitIdx = -1;
    const puncts = [' ', '，', ',', '。', '.', '!', '?', 'ๆ'];
    for (const p of puncts) {
      const idx = remaining.lastIndexOf(p, maxLen);
      if (idx > 30 && idx > splitIdx) splitIdx = idx;
    }
    if (splitIdx <= 0) splitIdx = maxLen;
    chunks.push(remaining.slice(0, splitIdx).trim());
    remaining = remaining.slice(splitIdx).trim();
  }

  const audioBuffers = [];
  for (const chunk of chunks) {
    if (!chunk) continue;
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=th&client=tw-ob&q=${encodeURIComponent(chunk)}`;
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://translate.google.com/'
      },
      timeout: 8000
    });
    if (response.data && response.data.length > 200) {
      audioBuffers.push(Buffer.from(response.data));
    }
  }

  if (audioBuffers.length > 0) {
    const finalBuffer = Buffer.concat(audioBuffers);
    fs.writeFileSync(filePath, finalBuffer);
    console.log(`[Google TTS] Generated ${finalBuffer.length} bytes -> ${filename} ("${text.slice(0, 35)}...")`);
    return `/audio_cache/${filename}`;
  }
  return null;
}

// Tier 2: Edge-TTS Subprocess with UTF-8 stdin pipe & multi-voice fallback
function synthesizeEdgeTTS(clean, filename) {
  return new Promise((resolve) => {
    const pyCmd = process.platform === 'win32' ? 'python' : (process.env.PYTHON_BIN || 'python3');
    let finished = false;

    try {
      const py = spawn(pyCmd, [path.join(__dirname, 'tts_worker.py'), filename], {
        env: {
          ...process.env,
          PYTHONIOENCODING: 'utf-8',
          PYTHONUTF8: '1'
        }
      });
      let out = '';
      let errOut = '';
      py.stdout.on('data', d => out += d);
      py.stderr.on('data', d => errOut += d);

      py.on('error', err => {
        if (finished) return;
        finished = true;
        console.warn(`[Edge TTS Subprocess Error (${pyCmd})]:`, err.message);
        resolve(null);
      });

      py.on('close', code => {
        if (finished) return;
        finished = true;
        const resultFile = (out.trim() || filename);
        if (code === 0 && fs.existsSync(path.join(CACHE_DIR, resultFile)) && fs.statSync(path.join(CACHE_DIR, resultFile)).size > 1000) {
          console.log(`[Edge TTS] Generated -> ${resultFile}`);
          resolve(`/audio_cache/${resultFile}`);
        } else {
          console.warn(`[Edge TTS Exit ${code}]:`, (errOut || '').slice(0, 150));
          resolve(null);
        }
      });

      // Pass UTF-8 clean text via stdin to eliminate Windows CLI mangling
      py.stdin.write(clean, 'utf-8');
      py.stdin.end();

      setTimeout(() => {
        if (finished) return;
        finished = true;
        try { py.kill(); } catch (_) { }
        resolve(null);
      }, 10000);

    } catch (err) {
      console.warn('[Edge TTS Spawn Exception]:', err.message);
      resolve(null);
    }
  });
}

// Main Dynamic Neural TTS Orchestrator (Original Studio-Grade Bodhisattva Guan Yin Voice)
async function getAudioUrlForText(text, callback, action = '') {
  const clean = (text || '').trim();
  if (!clean) return callback(null, getFallbackAudioUrl(action));
  const hash = crypto.createHash('md5').update(clean).digest('hex');
  const filename = `${hash}.mp3`;
  const filePath = path.join(CACHE_DIR, filename);

  // Return cached audio if already synthesized
  if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1000) {
    return callback(null, `/audio_cache/${filename}`);
  }

  // Tier 1: Authentic Maternal Edge-TTS (th-TH-PremwadeeNeural via tts_worker.py)
  try {
    const edgeUrl = await synthesizeEdgeTTS(clean, filename);
    if (edgeUrl) return callback(null, edgeUrl);
  } catch (err) {
    console.warn('[Edge TTS Primary Notice, falling back to secondary]:', err.message);
  }

  // Tier 2: Google Translate Neural Thai TTS (Direct Node.js Fallback)
  try {
    const googleUrl = await synthesizeGoogleTTS(clean, filename);
    if (googleUrl) return callback(null, googleUrl);
  } catch (err) {
    console.warn('[Google TTS Fallback Notice]:', err.message);
  }

  // Tier 3: If server synthesis is unavailable, return null so client speaks via Web Speech API
  console.warn(`[TTS Engine] Dynamic audio unavailable for: "${clean.slice(0, 30)}...". Delegating to client speech.`);
  return callback(null, null);
}

// Dedicated TTS generation endpoint
app.post('/api/tts', (req, res) => {
  const text = (req.body?.text || '').trim();
  if (!text) return res.status(400).json({ success: false, error: 'Text required' });
  getAudioUrlForText(text, (err, url) => {
    if (err || !url) return res.json({ success: false, url: null });
    res.json({ success: true, url });
  });
});

// Explicit route to serve index.html (with root fallback if uploaded flat on GitHub)
app.get('/', (req, res) => {
  const publicIndex = path.join(__dirname, 'public', 'index.html');
  const rootIndex = path.join(__dirname, 'index.html');
  if (fs.existsSync(publicIndex)) return res.sendFile(publicIndex);
  if (fs.existsSync(rootIndex)) return res.sendFile(rootIndex);
  res.status(404).send('Missing public/index.html on server. Please push the public/ folder to GitHub.');
});

// Global State
const MAX_SEATS = 22; // 2 rows per side, 11 devotees per side (total 22 seats)
const VIP_SEATS_COUNT = 5; // Seats 0..4 are TOP 5 VIP front seats (on Golden Mats)

const defaultPrayerWishes = [
  'ขอให้สมหวังทุกประการ สาธุ 🙏',
  'ขอให้เรียนจบ สมหวังดังใจ 📚',
  'ขอให้ร่ำรวย โชคลาภเงินทอง 💰',
  'ขอให้สุขภาพแข็งแรง มีความสุข 🌿',
  'ขอให้การงานก้าวหน้า ค้าขายร่ำรวย 💼'
];

let genericWishRotation = 0;
const genericCategories = ['wealth', 'work', 'health', 'love', 'study'];

function classifyWish(text) {
  if (!text) {
    return genericCategories[(genericWishRotation++) % genericCategories.length];
  }
  const t = text.toLowerCase();
  if (t.includes('งาน') || t.includes('ตำแหน่ง') || t.includes('ธุรกิจ') || t.includes('ค้าขาย') || t.includes('ออเดอร์') || t.includes('ลูกค้า') || t.includes('สำเร็จ') || t.includes('ก้าวหน้า') || t.includes('กิจการ') || t.includes('บริษัท')) return 'work';
  if (t.includes('รวย') || t.includes('เงิน') || t.includes('โชค') || t.includes('หวย') || t.includes('ลาภ') || t.includes('ทอง') || t.includes('ปัง') || t.includes('เฮง') || t.includes('ปลดหนี้') || t.includes('ทรัพย์')) return 'wealth';
  if (t.includes('รัก') || t.includes('แฟน') || t.includes('คู่') || t.includes('ครอบครัว') || t.includes('คนรัก') || t.includes('เมตตา') || t.includes('เอ็นดู') || t.includes('พ่อแม่') || t.includes('บุตร')) return 'love';
  if (t.includes('สุขภาพ') || t.includes('แข็งแรง') || t.includes('หายป่วย') || t.includes('ปลอดภัย') || t.includes('โรค') || t.includes('อายุยืน') || t.includes('แคล้วคลาด') || t.includes('ผ่าตัด') || t.includes('หายไว')) return 'health';
  if (t.includes('เรียน') || t.includes('สอบ') || t.includes('เกรด') || t.includes('จบ') || t.includes('ครู') || t.includes('ปริญญา') || t.includes('มหาลัย') || t.includes('โรงเรียน') || t.includes('ปัญญา')) return 'study';

  // For general blessings ("สาธุ", "สาธุๆ", "🙏", etc.), rotate through all 5 categories
  return genericCategories[(genericWishRotation++) % genericCategories.length];
}

const giftStreakTracker = new Map();

const state = {
  tiktokUsername: '',
  isConnected: false,
  userExplicitlyDisconnected: false,
  viewersCount: 0,
  disciples: [], // Array of seat assignments: { seatId, userId, uniqueId, nickname, avatar, coins, joinedAt, lastActiveAt }
  donorRegistry: new Map(), // Lifetime persistent donor registry (never lost across seat rotations/departure sweeps): key -> { uniqueId, userId, nickname, avatar, coins, lastGiftName, lastGiftIcon, lastGiftImage, lastAt }
  leaderboard: [], // Top 5 lifetime donors
  sadhuScores: new Map(), // key: uniqueId/userId -> { uniqueId, nickname, avatar, count, lastAt }
  topSadhu: [], // TOP 3 Sadhu participants: [{ rank, uniqueId, nickname, avatar, count }]
  tributeQueue: [],
  recentWishes: [],
  prayerCategories: {
    work: 0,
    wealth: 0,
    love: 0,
    health: 0,
    study: 0
  },
  micRouterConfig: {
    mode: 'voice_split', // Default: auto-route voice into virtual mic cable
    sinkId: 'default',
    deviceName: 'cable', // Preferred device label keyword (CABLE Input / VB-Audio / Virtual)
    acousticsEnabled: true,
    keepAliveEnabled: true,
    dualMonitorEnabled: false, // Disabled by default to prevent audio duplication / reverb / echo
    updatedAt: Date.now()
  },
  historyEvents: []
};

let tiktokConnection = null;

// Find or allocate a seat for a user
function getOrCreateDisciple(userData, isFollow = false, isSyncOnly = false) {
  const { userId, uniqueId, nickname, avatar } = userData;
  let existing = null;

  if (uniqueId) {
    existing = state.disciples.find(d => d.uniqueId === uniqueId);
  }
  if (!existing && userId) {
    existing = state.disciples.find(d => d.userId === userId);
  }

  if (existing) {
    existing.lastActiveAt = Date.now();
    if (nickname) existing.nickname = nickname;
    if (avatar) existing.avatar = avatar;
    return existing;
  }

  let assignedSeatId = -1;

  if (state.disciples.length >= MAX_SEATS) {
    // Rotation System: Rotate out oldest non-donor (coins == 0), or lowest donor if all donated
    let candidateIdx = -1;
    let minCoins = Infinity;
    let oldestTime = Infinity;

    for (let i = 0; i < state.disciples.length; i++) {
      const d = state.disciples[i];
      const coins = d.coins || 0;
      const t = d.lastActiveAt || d.joinedAt || 0;
      if (coins === 0) {
        if (candidateIdx === -1 || (state.disciples[candidateIdx].coins || 0) > 0 || t < oldestTime) {
          candidateIdx = i;
          oldestTime = t;
        }
      } else if (candidateIdx === -1 || (state.disciples[candidateIdx].coins || 0) > 0) {
        if (coins < minCoins || (coins === minCoins && t < oldestTime)) {
          minCoins = coins;
          oldestTime = t;
          candidateIdx = i;
        }
      }
    }

    if (candidateIdx !== -1) {
      const evicted = state.disciples.splice(candidateIdx, 1)[0];
      assignedSeatId = evicted.seatId;
      io.emit('disciple_left', {
        seatId: evicted.seatId,
        uniqueId: evicted.uniqueId,
        nickname: evicted.nickname
      });
    }
  }

  // Allocate available seatId: prefer general seats (VIP_SEATS_COUNT..MAX_SEATS-1) first
  // so front Golden Mats (0..VIP_SEATS_COUNT-1) remain reserved for TOP donors!
  if (assignedSeatId === -1) {
    const takenSeats = new Set(state.disciples.map(d => d.seatId));
    for (let s = VIP_SEATS_COUNT; s < MAX_SEATS; s++) {
      if (!takenSeats.has(s)) {
        assignedSeatId = s;
        break;
      }
    }
    // If all general seats are occupied, fill available VIP seat
    if (assignedSeatId === -1) {
      for (let s = 0; s < VIP_SEATS_COUNT; s++) {
        if (!takenSeats.has(s)) {
          assignedSeatId = s;
          break;
        }
      }
    }
    if (assignedSeatId === -1) assignedSeatId = state.disciples.length % MAX_SEATS;
  }

  const generatedId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  existing = {
    seatId: assignedSeatId,
    userId: userId || generatedId,
    uniqueId: uniqueId || generatedId,
    nickname: nickname || uniqueId || 'ผู้เจริญสติ',
    avatar: (avatar && !avatar.includes('tos-maliva-avt-0068/7311181283626287110')) ? avatar : '',
    coins: 0,
    joinedAt: Date.now(),
    lastActiveAt: Date.now()
  };
  state.disciples.push(existing);

  // Only emit disciple_joined if not background sync (avoids duplicate welcomes from roomUser / stats)
  if (!isSyncOnly) {
    io.emit('disciple_joined', {
      disciple: existing,
      total: state.disciples.length,
      isFollow
    });
  }

  return existing;
}

// 10-Tier Devotional System: Central Single Source of Truth
const DEVOTIONAL_TIERS = [
  {
    tier: 10,
    unitCoins: 299,
    effectType: 'dragon',
    effectName: 'มังกรทองเหิน',
    giftName: 'มังกรแฟนตาซี',
    icon: '🐉',
    image: '/dragon.png',
    isLegend: true,
    keywords: ['มังกรแฟนตาซี', 'alebrije', 'มังกร', 'มังกรทอง', 'ระฆังใหญ่', 'big bell', 'dragon', 'universe', 'จักรวาล', 'galaxy', 'phoenix']
  },
  {
    tier: 9,
    unitCoins: 100,
    effectType: 'castle',
    effectName: 'เปิดวิมานทิพย์',
    giftName: 'ประตูมิติ',
    icon: '🧨',
    image: '/portal.png',
    isLegend: true,
    keywords: ['ประตูมิติ', 'portal', 'gate', 'magical portal', 'ประตู', 'ประทัด ๙๙๙', 'ประทัด999', 'ประทัด', 'firecracker', 'firecrackers', 'วิมาน', 'ปราสาท', 'castle', 'lion', 'whale']
  },
  {
    tier: 8,
    unitCoins: 99,
    effectType: 'fireworks',
    effectName: 'พลุเพลิงบุญ',
    giftName: 'หัวใจ 4 ดวง',
    icon: '🕊️',
    image: '/four_hearts.png',
    isLegend: true,
    keywords: ['หัวใจ 4 ดวง', 'หัวใจ ๔ ดวง', 'four hearts', '4 hearts', 'hearts', 'ปิดทอง', 'gold leaf', 'crane', 'นกกระเรียน', 'พลุ', 'firework', 'fireworks', 'elephant', 'ช้าง']
  },
  {
    tier: 7,
    unitCoins: 30,
    effectType: 'royal_carriage',
    effectName: 'ขบวนราชรถ',
    giftName: 'โดนัท',
    icon: '🍩',
    image: '/donut.png',
    isLegend: false,
    keywords: ['โดนัท', 'donut', 'doughnut', 'นางรำ ๔ คน', 'นางรำ4คน', 'นางรำ', 'dancer', 'dancers', 'ราชรถ', 'carriage', 'car', 'รถ']
  },
  {
    tier: 6,
    unitCoins: 20,
    effectType: 'crystal_fountain',
    effectName: 'ธารน้ำพุมณี',
    giftName: 'โคโลญจน์',
    icon: '🎁',
    image: '/cologne.png',
    isLegend: false,
    keywords: ['โคโลญจน์', 'cologne', 'น้ำหอม', 'สั่นฆ้อง', 'ฆ้อง', 'gong', 'perfume', 'ธารน้ำพุ', 'น้ำพุ', 'fountain', 'box']
  },
  {
    tier: 5,
    unitCoins: 15,
    effectType: 'golden_bell',
    effectName: 'สั่นระฆังทอง',
    giftName: 'พวงมาลัย',
    icon: '📿',
    image: '/garland.png',
    isLegend: false,
    keywords: ['พวงมาลัย', 'garland', 'wreath', 'ระฆังทอง', 'golden bell', 'กระดิ่ง', 'ระฆัง']
  },
  {
    tier: 4,
    unitCoins: 10,
    effectType: 'flowers',
    effectName: 'โปรยบุปผามงคล',
    giftName: 'กุหลาบ ๙๙',
    icon: '🌹',
    image: '/rose_99.png',
    isLegend: false,
    keywords: ['กุหลาบ ๙๙', 'กุหลาบ99', 'rose 99', 'rose99', 'rose_99', 'บุปผา', 'flower', 'ดอกไม้']
  },
  {
    tier: 3,
    unitCoins: 9,
    effectType: 'lotus',
    effectName: 'สระดอกบัวทิพย์',
    giftName: 'Lucky 9',
    icon: '9️⃣',
    image: '/lucky_9.png',
    isLegend: false,
    keywords: ['lucky 9', 'lucky9', 'lucky_9', 'ขอเลข', 'บัว', 'lotus', 'ดอกบัว']
  },
  {
    tier: 1.5,
    unitCoins: 1,
    effectType: 'seamsi',
    effectName: 'เสี่ยงเซียมซีมหาโชค',
    giftName: 'รักนะมากๆ (เซียมซี)',
    icon: '🎋',
    image: '/seamsi.png',
    isLegend: false,
    keywordOnly: true,
    keywords: ['รักนะมากๆ', 'รักนะมาก ๆ', 'รักนะ', 'กอดหัวใจ', 'love you', 'heart hug', 'hug heart', 'hug', 'เซียมซี', 'เสี่ยงเซียมซี', 'ซองเขียว', 'ซองมงคล', 'อั่งเปาเขียว', 'hari raya', 'selamat', 'aidilfitri', 'sampul', 'raya', 'green envelope', 'envelope', 'fortune stick', 'kau cim', 'siamsi', 'seamsi']
  },
  {
    tier: 2,
    unitCoins: 5,
    effectType: 'incense',
    effectName: 'จุดประทีปบูชาธูปทอง',
    giftName: 'เครื่องราง',
    icon: '🫰',
    image: '/omamori.png',
    isLegend: false,
    keywords: ['เครื่องราง', 'omamori', 'amulet', 'ดอกไม้มงคล', 'finger heart', 'มินิฮาร์ต', 'มินิฮาร์ท', 'incense', 'ธูป', 'เทียน', 'ประทีป', 'lamp']
  },
  {
    tier: 1,
    unitCoins: 1,
    effectType: 'kowtow',
    effectName: 'กราบเบญจางคประดิษฐ์',
    giftName: 'กุหลาบ',
    icon: '🌹',
    image: '/rose.png',
    isLegend: false,
    keywords: ['กุหลาบ', 'rose', 'roses', 'diya', 'heart', 'ใจ']
  }
];

// Helper: Map TikTok Gift name & coins to authentic visual icon and image
function getGiftIcon(giftName, diamonds = 1) {
  return resolveGiftEffect(giftName, diamonds, diamonds).icon;
}
function getGiftImage(giftName, diamonds = 1) {
  return resolveGiftEffect(giftName, diamonds, diamonds).image;
}

// 10-Tier Authentic Devotional Ritual Mapper (Deterministic Keyword + Unit Diamond Fallback)
function resolveGiftEffect(giftName, unitDiamonds = 1, totalDiamonds = 1) {
  const name = String(giftName || '').toLowerCase().trim();

  // 1. Explicit Keyword matching (Tier 10 down to Tier 1)
  for (const t of DEVOTIONAL_TIERS) {
    for (const kw of t.keywords) {
      if (kw === 'ดอกไม้' && name.includes('ดอกไม้มงคล')) continue;
      if ((kw === 'heart' || kw === 'ใจ') && (name.includes('finger heart') || name.includes('four hearts') || name.includes('4 hearts') || name.includes('รักนะ') || name.includes('hug'))) continue;
      if (kw === 'ระฆัง' && name.includes('ระฆังใหญ่')) continue;
      if (name.includes(kw)) {
        return {
          tier: t.tier,
          type: t.effectType,
          name: t.effectName,
          giftName: t.giftName,
          icon: t.icon,
          image: t.image,
          isLegend: t.isLegend
        };
      }
    }
  }

  // 2. Unit Diamond price evaluation for unlisted/custom gifts (Strictly unit price, NOT combo streak total)
  const uCoins = Number(unitDiamonds) || 1;
  for (const t of DEVOTIONAL_TIERS) {
    if (t.keywordOnly) continue;
    if (uCoins >= t.unitCoins) {
      return {
        tier: t.tier,
        type: t.effectType,
        name: t.effectName,
        giftName: t.giftName,
        icon: t.icon,
        image: t.image,
        isLegend: t.isLegend
      };
    }
  }

  // Tier 1 Default
  const t1 = DEVOTIONAL_TIERS[DEVOTIONAL_TIERS.length - 1];
  return {
    tier: t1.tier,
    type: t1.effectType,
    name: t1.effectName,
    giftName: t1.giftName,
    icon: t1.icon,
    image: t1.image,
    isLegend: t1.isLegend
  };
}

// Update donor leaderboard & promote top donors to VIP front seats (0..4 on Golden Mats)
function recordDonation(disciple, diamondCount, giftName = '', giftIcon = '', giftImage = '') {
  disciple.coins = (disciple.coins || 0) + diamondCount;
  disciple.lastActiveAt = Date.now();
  if (giftName) disciple.lastGiftName = giftName;
  if (giftIcon) disciple.lastGiftIcon = giftIcon;
  if (giftImage) disciple.lastGiftImage = giftImage;

  // 1. Lifetime Persistent Donor Registry (Never wiped during seat rotations or departure sweeps)
  const donorKey = String(disciple.uniqueId || disciple.userId || disciple.nickname || '').trim();
  if (donorKey) {
    let entry = state.donorRegistry.get(donorKey);
    if (!entry) {
      entry = {
        uniqueId: disciple.uniqueId || donorKey,
        userId: disciple.userId || '',
        nickname: disciple.nickname || 'ผู้มีจิตศรัทธา',
        avatar: (disciple.avatar && !disciple.avatar.includes('tos-maliva-avt-0068/7311181283626287110')) ? disciple.avatar : '',
        coins: 0,
        lastGiftName: giftName || 'กุหลาบ',
        lastGiftIcon: giftIcon || '🌹',
        lastGiftImage: giftImage || '/rose.png',
        lastAt: Date.now()
      };
      state.donorRegistry.set(donorKey, entry);
    }
    entry.coins = (entry.coins || 0) + diamondCount;
    entry.lastAt = Date.now();
    if (giftName) entry.lastGiftName = giftName;
    if (giftIcon) entry.lastGiftIcon = giftIcon;
    if (giftImage) entry.lastGiftImage = giftImage;
    if (disciple.nickname && disciple.nickname !== 'ผู้เจริญสติ' && disciple.nickname !== 'ผู้มีจิตศรัทธา') {
      entry.nickname = disciple.nickname;
    }
    if (disciple.avatar && !disciple.avatar.includes('tos-maliva-avt-0068/7311181283626287110')) {
      entry.avatar = disciple.avatar;
    }
  }

  // 2. Global Leaderboard: Sorted by total lifetime coins descending across ALL session donors
  const allDonors = Array.from(state.donorRegistry.values())
    .filter(d => (d.coins || 0) > 0)
    .sort((a, b) => (b.coins || 0) - (a.coins || 0));

  state.leaderboard = allDonors.slice(0, 5).map((d, idx) => ({
    rank: idx + 1,
    nickname: d.nickname,
    uniqueId: d.uniqueId,
    coins: d.coins,
    avatar: d.avatar,
    lastGiftName: d.lastGiftName || 'กุหลาบ',
    lastGiftIcon: d.lastGiftIcon || '🌹',
    lastGiftImage: d.lastGiftImage || '/rose.png'
  }));

  // 3. Position top donors currently in room sequentially into Front VIP Golden Mats (Seats 0..4)
  const topDisciples = [...state.disciples]
    .filter(d => (d.coins || 0) > 0)
    .sort((a, b) => (b.coins || 0) - (a.coins || 0))
    .slice(0, VIP_SEATS_COUNT);

  for (let rank = 0; rank < topDisciples.length; rank++) {
    const targetDonor = topDisciples[rank];
    const targetSeat = rank; // Rank 1 -> Seat 0, Rank 2 -> Seat 1, ...
    if (targetDonor.seatId !== targetSeat) {
      const occupant = state.disciples.find(d => d.seatId === targetSeat);
      const oldSeat = targetDonor.seatId;
      if (occupant) {
        occupant.seatId = oldSeat;
        targetDonor.seatId = targetSeat;
        io.emit('disciple_swapped', {
          userA: targetDonor.uniqueId,
          seatA: targetDonor.seatId,
          userB: occupant.uniqueId,
          seatB: occupant.seatId
        });
      } else {
        targetDonor.seatId = targetSeat;
        io.emit('disciple_swapped', {
          userA: targetDonor.uniqueId,
          seatA: targetDonor.seatId,
          userB: '',
          seatB: oldSeat
        });
      }
    }
  }

  io.emit('leaderboard_update', state.leaderboard);
}

// Helper: Extract stable identifier for Sadhu leaderboard tracking
function getSadhuUserKey(user) {
  if (!user) return '';
  const uid = String(user.uniqueId || '').trim();
  const rawUid = (uid && !uid.startsWith('user_') && !uid.startsWith('u_') && !uid.startsWith('sim_chat_')) ? uid : '';
  const nick = String(user.nickname || '').trim();
  const rawNick = (nick && nick !== 'ผู้เจริญสติ' && nick !== 'ผู้มีจิตศรัทธา') ? nick : '';
  const userId = String(user.userId || '').trim();
  const rawUserId = (userId && !userId.startsWith('u_') && !userId.startsWith('user_')) ? userId : '';
  return rawUid || rawUserId || rawNick || uid || userId || nick || '';
}

// Record and update TOP 5 Sadhu participants (+1 point whenever viewer types "สาธุ")
function recordSadhuPoint(user, increment = 1, comment = '') {
  if (!user) return null;
  const key = getSadhuUserKey(user);
  if (!key) return null;

  let entry = state.sadhuScores.get(key);
  if (!entry) {
    entry = {
      userId: user.userId || '',
      uniqueId: user.uniqueId || key,
      nickname: user.nickname || 'ผู้มีจิตศรัทธา',
      avatar: (user.avatar && !user.avatar.includes('tos-maliva-avt-0068/7311181283626287110')) ? user.avatar : '',
      count: 0,
      lastAt: Date.now()
    };
    state.sadhuScores.set(key, entry);
  }

  if (user.nickname && user.nickname !== 'ผู้เจริญสติ' && user.nickname !== 'ผู้มีจิตศรัทธา') {
    entry.nickname = user.nickname;
  }
  if (user.avatar && !entry.avatar && !user.avatar.includes('tos-maliva-avt-0068/7311181283626287110')) {
    entry.avatar = user.avatar;
  }
  entry.count += increment;
  entry.lastAt = Date.now();

  // Recompute TOP 5 ordered by count descending, then recent activity on ties
  const sorted = Array.from(state.sadhuScores.values())
    .filter(e => e.count > 0)
    .sort((a, b) => (b.count - a.count) || (b.lastAt - a.lastAt))
    .slice(0, 5);

  state.topSadhu = sorted.map((s, idx) => ({
    rank: idx + 1,
    uniqueId: s.uniqueId,
    nickname: s.nickname,
    avatar: s.avatar,
    count: s.count
  }));

  const payload = {
    topSadhu: state.topSadhu,
    latest: {
      uniqueId: entry.uniqueId,
      nickname: entry.nickname,
      avatar: entry.avatar,
      count: entry.count,
      increment
    }
  };

  io.emit('sadhu_update', payload);
  return state.topSadhu;
}

// Helper: Robust TikTok Data Extractor (Supports both modern protobuf and legacy flattened objects)
function extractTikTokUser(data) {
  if (!data) return { userId: `u_${Date.now()}`, uniqueId: `user_${Date.now()}`, nickname: 'ผู้เจริญสติ', avatar: '' };
  const u = data.user || data.sender || {};
  const userId = String(data.userId || u.idStr || u.id || data.secUid || u.secUid || `u_${Date.now()}`);
  const rawUniqueId = data.uniqueId || u.displayId || u.uniqueId || '';
  const rawNickname = data.nickname || u.nickname || '';
  const uniqueId = String(rawUniqueId || (rawNickname ? rawNickname.replace(/\s+/g, '_') : '') || `user_${Date.now()}`);
  const nickname = String(rawNickname || rawUniqueId || 'ผู้เจริญสติ');

  let avatar = data.profilePictureUrl || u.profilePictureUrl || '';
  if (!avatar && u.avatarThumb?.urlList?.length) avatar = u.avatarThumb.urlList[0];
  if (!avatar && u.avatarMedium?.urlList?.length) avatar = u.avatarMedium.urlList[0];
  if (!avatar && u.avatarLarge?.urlList?.length) avatar = u.avatarLarge.urlList[0];
  if (!avatar && u.avatar168x168?.urlList?.length) avatar = u.avatar168x168.urlList[0];
  if (!avatar && u.avatar300x300?.urlList?.length) avatar = u.avatar300x300.urlList[0];
  if (!avatar && u.avatarThumb?.urls?.length) avatar = u.avatarThumb.urls[0];
  if (!avatar && u.avatarMedium?.urls?.length) avatar = u.avatarMedium.urls[0];
  if (!avatar && u.avatarLarge?.urls?.length) avatar = u.avatarLarge.urls[0];
  if (!avatar && data.sender?.profilePictureUrl) avatar = data.sender.profilePictureUrl;
  if (!avatar && data.sender?.avatarThumb?.urlList?.length) avatar = data.sender.avatarThumb.urlList[0];
  if (avatar && avatar.includes('tos-maliva-avt-0068/7311181283626287110')) avatar = '';

  return { userId, uniqueId, nickname, avatar };
}

function extractTikTokChat(data) {
  if (!data) return { comment: '' };
  const comment = String(
    data.comment ||
    data.content ||
    data.message ||
    data.text ||
    data.payload?.comment ||
    data.chatDetails?.comment ||
    ''
  ).trim();
  return { comment };
}

function extractTikTokGift(data) {
  if (!data) {
    return {
      giftId: 'gift_default',
      giftName: 'ของขวัญ',
      unitDiamonds: 1,
      repeatCount: 1,
      isStreakable: false,
      repeatEnd: false
    };
  }

  const giftDetails = data.giftDetails || data.gift || data.extendedGiftInfo || {};
  const giftId = String(
    data.giftId ||
    giftDetails.giftId ||
    giftDetails.id ||
    giftDetails.gift_id ||
    data.gift_id ||
    'gift_default'
  );

  let rawName = String(
    data.giftName ||
    giftDetails.giftName ||
    giftDetails.name ||
    giftDetails.gift_name ||
    giftDetails.describe ||
    data.describe ||
    data.common?.describe ||
    ''
  ).trim();

  // If giftName was wrapped in describe text like "ส่ง ดอกกุหลาบ x 1" or "user: sent Rose x 1"
  if (rawName) {
    const cleanMatch = rawName.match(/(?:ส่ง|sent)\s+([^x\d]+)(?:\s+x\s*\d+)?/i);
    if (cleanMatch && cleanMatch[1]) {
      rawName = cleanMatch[1].trim();
    }
  }
  const giftName = rawName || 'ของขวัญ';

  const unitDiamonds = Math.max(1, Number(
    data.diamondCount ||
    giftDetails.diamondCount ||
    giftDetails.diamond_count ||
    data.diamond_count ||
    1
  ));

  const repeatCount = Math.max(1, Number(
    data.repeatCount ||
    data.comboCount ||
    data.groupCount ||
    data.repeat_count ||
    giftDetails.repeat_count ||
    giftDetails.repeatCount ||
    1
  ));

  // tiktok-live-proto v3 uses gift.type (1 = streakable) and gift.combo (boolean)
  const giftType = Number(
    data.giftType ??
    giftDetails.giftType ??
    giftDetails.type ??
    giftDetails.gift_type ??
    (giftDetails.combo ? 1 : 0)
  );
  const isStreakable = Boolean(giftType === 1 || giftDetails.combo === true);
  const repeatEnd = Boolean(
    Number(data.repeatEnd ?? data.repeat_end ?? giftDetails.repeatEnd ?? giftDetails.repeat_end ?? 0) === 1 ||
    data.repeatEnd === true ||
    data.repeat_end === true
  );

  return {
    giftId,
    giftName,
    unitDiamonds,
    repeatCount,
    isStreakable,
    repeatEnd
  };
}

let isConnectingToTikTok = false;
let autoReconnectTimer = null;
let reconnectAttempts = 0;

function scheduleAutoReconnect() {
  if (autoReconnectTimer) clearTimeout(autoReconnectTimer);
  if (state.userExplicitlyDisconnected || !state.tiktokUsername || state.isConnected) {
    reconnectAttempts = 0;
    return;
  }
  reconnectAttempts++;
  const delayMs = Math.min(30000, 8000 + (reconnectAttempts - 1) * 4000);
  console.log(`[TikTok Reconnect] Attempt #${reconnectAttempts} scheduled in ${delayMs / 1000}s...`);

  autoReconnectTimer = setTimeout(async () => {
    if (state.userExplicitlyDisconnected || !state.tiktokUsername || state.isConnected) return;
    try {
      console.log(`[TikTok Reconnect] Retrying connection to @${state.tiktokUsername}...`);
      await connectToTikTok(state.tiktokUsername, null, process.env.SIGN_API_KEY || '');
      reconnectAttempts = 0;
      console.log(`[TikTok Reconnect] Successfully reconnected to @${state.tiktokUsername}!`);
    } catch (err) {
      console.warn(`[TikTok Reconnect] Attempt #${reconnectAttempts} failed: ${err.message}`);
      scheduleAutoReconnect();
    }
  }, delayMs);
}

// Connect to TikTok Live
async function connectToTikTok(username, sessionId, apiKey) {
  if (!TikTokLiveConnection) {
    throw new Error('tiktok-live-connector not available');
  }

  if (isConnectingToTikTok) {
    console.log(`[TikTok] Connection already in progress, skipping duplicate request.`);
    return;
  }
  isConnectingToTikTok = true;

  if (tiktokConnection) {
    try {
      tiktokConnection.disconnect();
    } catch (_) { }
    tiktokConnection = null;
  }

  state.tiktokUsername = username;
  state.userExplicitlyDisconnected = false;

  // Configure EulerStream API Key to unlock rate limit
  const activeApiKey = (apiKey || process.env.SIGN_API_KEY || '').trim();
  if (activeApiKey) {
    process.env.SIGN_API_KEY = activeApiKey;
    if (ttlModule && ttlModule.SignConfig) {
      ttlModule.SignConfig.apiKey = activeApiKey;
      ttlModule.SignConfig.cachedInstance = void 0; // invalidate cached client to use new key
    }
    console.log('[TikTok] Using EulerStream Sign API Key for authentication.');
  }

  const options = {
    processInitialData: false,
    enableExtendedGiftInfo: false
  };

  if (activeApiKey) {
    options.signApiKey = activeApiKey;
  }

  if (sessionId) {
    options.sessionId = sessionId;
    options.session = { cookie: { sessionId } };
  }

  tiktokConnection = new TikTokLiveConnection(username, options);

  // Register all listeners BEFORE calling connect() so zero real-time events are dropped!

  // Event: Follow (Lễ Phật)
  tiktokConnection.on('follow', data => {
    const user = extractTikTokUser(data);
    console.log(`[TikTok] Follow event from: ${user.nickname} (@${user.uniqueId})`);
    const disciple = getOrCreateDisciple(user, true, true);

    io.emit('action_follow', {
      disciple,
      message: `${user.nickname} ได้ติดตามและร่วมสร้างบุญบารมี`
    });
  });

  // Event: Member Join (ผู้เข้ามารับชมห้องไลฟ์ -> สร้างตัวละครนั่งกราบพระทันที)
  const handleMemberJoin = data => {
    const user = extractTikTokUser(data);
    console.log(`[TikTok] Viewer joined: ${user.nickname} (@${user.uniqueId})`);
    // Seat viewer without duplicate disciple_joined emit, action_join serves as the single event
    const disciple = getOrCreateDisciple(user, false, true);

    io.emit('action_join', {
      disciple,
      message: `${user.nickname} เข้าสู่ห้องสมาธิ`
    });
  };
  tiktokConnection.on('member', handleMemberJoin);
  tiktokConnection.on('join', handleMemberJoin);

  // Event: Room Viewers Count (อัปเดตยอดคนดู & ซิงค์ผู้ชมนั่งในวิหาร)
  tiktokConnection.on('roomUser', data => {
    const count = Number(data.viewerCount ?? data.total ?? data.totalUser ?? 0);
    if (count > 0) {
      state.viewersCount = count;
      io.emit('viewer_count', { count: state.viewersCount });
    }

    // Top viewers / ranks sync (isSyncOnly = true ensures background sync never triggers welcome speech)
    const topList = data.topViewers || data.ranks || [];
    if (Array.isArray(topList)) {
      topList.forEach(v => {
        const u = v.user || v;
        if (u) {
          const parsed = extractTikTokUser(u);
          if (parsed.nickname && parsed.nickname !== 'ผู้เจริญสติ') {
            getOrCreateDisciple(parsed, false, true);
          }
        }
      });
    }
  });

  // Event: Like (Tap screen to pray & like)
  tiktokConnection.on('like', data => {
    const user = extractTikTokUser(data);
    if (user.uniqueId && user.nickname && user.nickname !== 'ผู้เจริญสติ') {
      getOrCreateDisciple(user, false, true);
    }
    const totalLikes = Number(data.totalLikeCount ?? data.total ?? data.count ?? 0);
    io.emit('action_like', {
      uniqueId: user.uniqueId,
      totalLikes
    });
  });

  // Event: Share stream
  tiktokConnection.on('share', data => {
    const user = extractTikTokUser(data);
    if (user.uniqueId && user.nickname && user.nickname !== 'ผู้เจริญสติ') {
      getOrCreateDisciple(user, false, true);
    }
  });

  // Event: Chat Comment
  tiktokConnection.on('chat', data => {
    const user = extractTikTokUser(data);
    const { comment } = extractTikTokChat(data);
    if (!comment) return;

    const disciple = getOrCreateDisciple(user, false, true);

    const hasSadhu = /(สาธุ|สาทุ|สาดุ|sadhu|sathu|อนุโมทนา|โมทนา)/i.test(comment);
    if (hasSadhu) {
      recordSadhuPoint({
        uniqueId: user.uniqueId || disciple.uniqueId,
        userId: user.userId || disciple.userId,
        nickname: user.nickname || disciple.nickname,
        avatar: user.avatar || disciple.avatar
      }, 1, comment);
    }

    const cat = classifyWish(comment);
    if (state.prayerCategories[cat] !== undefined) {
      state.prayerCategories[cat]++;
    }

    const wishObj = {
      id: 'w_' + Date.now(),
      nickname: disciple.nickname,
      wish: comment,
      category: cat,
      timestamp: Date.now()
    };
    state.recentWishes.unshift(wishObj);
    if (state.recentWishes.length > 8) state.recentWishes.pop();

    io.emit('action_chat', {
      seatId: disciple.seatId,
      uniqueId: disciple.uniqueId,
      nickname: disciple.nickname,
      avatar: disciple.avatar,
      comment
    });
    io.emit('prayer_update', {
      recentWishes: state.recentWishes,
      prayerCategories: state.prayerCategories,
      latestWish: wishObj
    });
  });

  // Event: Gift (Dâng hương / Sen nở / Mưa sen)
  tiktokConnection.on('gift', data => {
    const user = extractTikTokUser(data);
    const gift = extractTikTokGift(data);
    const { giftId, giftName, unitDiamonds, repeatCount, isStreakable, repeatEnd } = gift;

    const streakKey = `${user.userId || user.uniqueId}_${giftId}`;

    let deltaGifts = 1;
    if (isStreakable) {
      const now = Date.now();
      const streakEntry = giftStreakTracker.get(streakKey);
      // Only skip if this is a trailing repeatEnd or duplicate packet of the exact same repeatCount
      if (streakEntry && repeatCount === streakEntry.count && (repeatEnd || (now - streakEntry.time < 900))) {
        if (repeatEnd) {
          giftStreakTracker.delete(streakKey);
        }
        return;
      }
      // If streak expired (>4.5s), or repeatCount reset to a smaller number (e.g. 1), or new single tap after 900ms, treat as fresh streak
      const isFreshStreak = !streakEntry ||
        (now - streakEntry.time > 4500) ||
        (repeatCount < streakEntry.count) ||
        (repeatCount === 1 && !repeatEnd && (now - streakEntry.time >= 900));

      const prevRepeat = isFreshStreak ? 0 : streakEntry.count;
      deltaGifts = Math.max(1, repeatCount - prevRepeat);

      if (repeatEnd) {
        giftStreakTracker.delete(streakKey);
      } else {
        giftStreakTracker.set(streakKey, { count: repeatCount, time: now });
      }
    }

    const diamondIncrement = deltaGifts * unitDiamonds;
    const totalDiamonds = unitDiamonds * repeatCount;

    // isSyncOnly = true ensures gift donation NEVER emits duplicate disciple_joined or triggers "ยินดีต้อนรับ"
    const disciple = getOrCreateDisciple(user, false, true);

    const effectData = resolveGiftEffect(giftName, unitDiamonds, totalDiamonds);
    const effectType = effectData.type;
    const effectName = effectData.name;
    const giftIcon = effectData.icon;
    const giftImage = effectData.image || '/rose.png';

    console.log(`[TikTok] Gift: ${disciple.nickname} sent ${giftName} x${repeatCount} (${totalDiamonds} coins) -> effect: ${effectType}`);

    const wish = defaultPrayerWishes[Math.floor(Math.random() * defaultPrayerWishes.length)];

    // FIFO Devotional Tribute Queue:
    // Match active donor by uniqueId or non-generic nickname to support streak combos cleanly
    const existingQueueIdx = state.tributeQueue.findIndex(q => {
      if (q.uniqueId && disciple.uniqueId && !disciple.uniqueId.startsWith('user_') && q.uniqueId === disciple.uniqueId) return true;
      if (q.nickname && disciple.nickname && disciple.nickname !== 'ผู้เจริญสติ' && disciple.nickname !== 'ผู้มีจิตศรัทธา' && q.nickname === disciple.nickname) return true;
      return false;
    });

    if (existingQueueIdx !== -1) {
      const item = state.tributeQueue[existingQueueIdx];
      item.giftIcon = giftIcon;
      item.giftImage = giftImage;
      item.giftName = giftName || effectName;
      item.diamondCount = totalDiamonds;
      item.comboCount = repeatCount || ((item.comboCount || 1) + deltaGifts);
      item.timestamp = Date.now();
      if (wish) item.wish = wish;
    } else {
      const rawAv = (disciple.avatar && !disciple.avatar.includes('tos-maliva-avt-0068/7311181283626287110')) ? disciple.avatar : '';
      const queueItem = {
        id: 'q_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        uniqueId: disciple.uniqueId,
        avatar: rawAv,
        nickname: disciple.nickname,
        giftIcon,
        giftImage,
        giftName: giftName || effectName,
        wish,
        diamondCount: totalDiamonds,
        comboCount: repeatCount || 1,
        timestamp: Date.now()
      };
      // FIFO: Append new donor to back of queue so active donor (index 0) finishes first
      state.tributeQueue.push(queueItem);
      if (state.tributeQueue.length > 6) state.tributeQueue.shift();
    }

    state.prayerCategories.wealth += Math.min(5, Math.max(1, Math.floor(diamondIncrement / 2) || 1));

    // CRITICAL: Emit action_gift and queue_update BEFORE recordDonation so client seats the donor
    // and starts the red-carpet altar ritual BEFORE leaderboard/VIP seat-promotion events arrive.
    io.emit('action_gift', {
      seatId: disciple.seatId,
      uniqueId: disciple.uniqueId,
      nickname: disciple.nickname,
      avatar: disciple.avatar,
      giftName,
      giftIcon,
      giftImage,
      wish,
      diamondCount: diamondIncrement,
      totalDiamonds,
      repeatCount,
      isStreakable,
      effectType,
      effectName
    });

    io.emit('queue_update', {
      tributeQueue: state.tributeQueue,
      prayerCategories: state.prayerCategories
    });

    // Update lifetime donor registry, TOP 5 leaderboard, and VIP golden mat assignments after action_gift
    recordDonation(disciple, diamondIncrement, giftName, giftIcon, giftImage);
  });

  tiktokConnection.on('disconnected', () => {
    state.isConnected = false;
    io.emit('status_change', { isConnected: false, username });
    console.log('[TikTok] Connection closed');
    if (!state.userExplicitlyDisconnected && state.tiktokUsername) {
      scheduleAutoReconnect();
    }
  });

  let lastErrorMsg = '';
  let repeatCount = 0;
  tiktokConnection.on('error', err => {
    const msg = err?.info || err?.message || JSON.stringify(err);
    if (msg === lastErrorMsg) {
      repeatCount++;
      if (repeatCount === 1) {
        console.warn(`[TikTok] (Suppressing duplicate error: ${msg})`);
      }
      return;
    }
    lastErrorMsg = msg;
    repeatCount = 0;
    console.error('[TikTok] Error:', err);
  });

  // Now initiate the connection Promise
  return new Promise((resolve, reject) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        isConnectingToTikTok = false;
        const timeoutMsg = `เชื่อมต่อกับ @${username} หมดเวลา (Timeout 25s) กรุณาตรวจสอบสถานะ Live หรือกรอก EulerStream API Key`;
        state.isConnected = false;
        state.lastError = timeoutMsg;
        io.emit('status_change', { isConnected: false, username, error: timeoutMsg });
        reject(new Error(timeoutMsg));
      }
    }, 25000);

    tiktokConnection.connect().then(roomState => {
      if (settled) return;
      settled = true;
      isConnectingToTikTok = false;
      if (autoReconnectTimer) clearTimeout(autoReconnectTimer);
      reconnectAttempts = 0;
      clearTimeout(timer);
      state.isConnected = true;
      state.lastError = null;
      state.roomId = roomState.roomId;
      console.log(`[TikTok] Connected to room: ${roomState.roomId} (${username})`);
      io.emit('status_change', { isConnected: true, username, roomId: roomState.roomId });
      resolve(roomState);
    }).catch(err => {
      if (settled) return;
      settled = true;
      isConnectingToTikTok = false;
      clearTimeout(timer);
      state.isConnected = false;
      let friendlyError = err.message;
      if (err.message.includes('rate_limit') || err.message.includes('Rate Limited') || err.message.includes('rate limit') || err.message.includes('SIGN SERVER MESSAGE')) {
        friendlyError = `[Rate Limited] ติดขีดจำกัดเชื่อมต่อฟรีของ EulerStream แนะนำให้นำ Free API Key จาก https://www.eulerstream.com/pricing มากรอกในช่อง 🔑 API Key เพื่อปลดล็อกทันที`;
      } else if (err.message.includes("isn't online") || err.message.includes('LIVE has ended')) {
        friendlyError = `ช่อง @${username} ยังไม่ได้เริ่มไลฟ์สด หรือไลฟ์จบไปแล้ว (โปรดเริ่มไลฟ์สดบน TikTok ก่อนกดเชื่อมต่อ)`;
      } else if (err.message.includes('user_not_found') || err.message.includes('Failed to retrieve Room ID')) {
        friendlyError = `ไม่พบห้องไลฟ์สดของ @${username} (โปรดตรวจสอบว่าไอดีถูกต้องและเริ่มไลฟ์สดแล้ว)`;
      }
      state.lastError = friendlyError;
      console.error(`[TikTok] Failed to connect to ${username}:`, friendlyError);
      io.emit('status_change', { isConnected: false, username, error: friendlyError });
      reject(new Error(friendlyError));
    });
  });
}

// REST Endpoints

// Neural AI Voice TTS Endpoint
app.get('/api/tts', (req, res) => {
  const text = (typeof req.query.text === 'string' ? req.query.text : '').trim().slice(0, 300);
  if (!text) return res.status(400).json({ success: false, error: 'Text required' });

  getAudioUrlForText(text, (err, url) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, url });
  });
});

app.post('/api/tts', (req, res) => {
  const text = (typeof req.body?.text === 'string' ? req.body.text : '').trim().slice(0, 300);
  if (!text) return res.status(400).json({ success: false, error: 'Text required' });

  getAudioUrlForText(text, (err, url) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, url });
  });
});

const INAPPROPRIATE_WORDS_REGEX = /(กู|มึง|เย็ด|ควย|เหี้ย|สัส|สัด|จวย|หำ|ห่า|เงี่ยน|แตด|ดอกทอง|ชิบหาย|ชาติชั่ว|หมาบ้า|fuck|shit|bitch|cunt|dick|pussy|porn|sex)/gi;

function formatNaturalSpeakerName(rawName) {
  if (!rawName || typeof rawName !== 'string') return 'กัลยาณมิตร';
  let clean = rawName.trim().replace(/^@+/, '');
  // Strip emojis so TTS reads pure names gracefully without stumbling
  clean = clean.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, ' ').trim();
  // Filter/replace crude pronouns smoothly without mangling the name
  clean = clean.replace(/กู/g, 'เรา').replace(/มึง/g, 'เธอ');
  if (INAPPROPRIATE_WORDS_REGEX.test(clean)) {
    clean = clean.replace(INAPPROPRIATE_WORDS_REGEX, '').trim();
  }
  // Replace auto-generated TikTok IDs (e.g. user84729184) with respectful Buddhist title
  if (/^user[_.]?\d{4,}/i.test(clean) || /^u_\d+/i.test(clean) || /^\d{5,}$/.test(clean)) {
    return 'กัลยาณมิตร';
  }
  // Remove trailing numbers (e.g. Somchai8899 -> Somchai) so TTS doesn't spell out digits
  clean = clean.replace(/[\d._-]+$/, '').trim();
  // Strip punctuation and special symbols
  clean = clean.replace(/[@#$_^&*~+=|\\/<>(){}\[\]"':;!?,.]+/g, ' ').trim();
  if (!clean || clean.length < 2) return 'กัลยาณมิตร';
  if (clean.length > 20) clean = clean.slice(0, 20).trim();
  return clean;
}

// Gemini AI Divine Guan Yin Blessing Generator
app.post('/api/gemini/bless', async (req, res) => {
  const { name, action, wish, giftName, effectName, effectType, coins, isGift, count } = req.body || {};
  const spokenName = formatNaturalSpeakerName(name);
  const cleanAction = String(action || 'กราบสักการะ').trim().slice(0, 60);
  const cleanWish = String(wish || '').trim().slice(0, 100);
  const cleanGift = String(giftName || '').trim() ||
    (cleanAction.includes('ถวาย') || cleanAction.includes('ร่วมบุญ') ? cleanAction.replace(/^(ถวาย|ร่วมบุญ)/, '').trim() : '');
  const isGiftAction = Boolean(isGift || effectName || effectType || cleanGift || cleanAction.includes('ถวาย') || cleanAction.includes('ร่วมบุญ') || cleanAction.includes('gift'));

  // Always resolve to the canonical 10-Tier Devotional Effect Name (never speak raw TikTok gift names)
  let spokenEffectName = String(effectName || '').trim();
  if (isGiftAction && !spokenEffectName) {
    const matchedByType = effectType ? DEVOTIONAL_TIERS.find(t => t.effectType === effectType) : null;
    if (matchedByType) {
      spokenEffectName = matchedByType.effectName;
    } else {
      const matchedByEffectLabel = DEVOTIONAL_TIERS.find(t => t.effectName === cleanGift);
      if (matchedByEffectLabel) {
        spokenEffectName = matchedByEffectLabel.effectName;
      } else {
        const uCoins = Number(coins) || 1;
        spokenEffectName = resolveGiftEffect(cleanGift, uCoins, uCoins).name;
      }
    }
  }

  let blessing = '';
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  const hasValidKey = Boolean(apiKey && apiKey.length >= 20);

  const isGreetingChat = Boolean(
    cleanAction.includes('ทักทาย') ||
    cleanWish.includes('สวัสดี') ||
    cleanWish.includes('หวัดดี') ||
    cleanWish.includes('กราบ') ||
    cleanWish.includes('นมัสการ') ||
    cleanWish.includes('ทักทาย') ||
    /^(hello|hi|ดีครับ|ดีค่ะ)/i.test(cleanWish)
  );

  const isSadhuChat = Boolean(
    cleanAction.includes('สาธุ') ||
    cleanAction.includes('อนุโมทนา') ||
    /(สาธุ|สาทุ|สาดุ|sadhu|sathu|อนุโมทนา|โมทนา)/i.test(cleanWish)
  );

  if (hasValidKey) {
    let prompt = '';
    if (isGiftAction) {
      const gLabel = spokenEffectName || 'กราบเบญจางคประดิษฐ์';
      prompt = `คุณคือพระแม่กวนอิมผู้เปี่ยมด้วยพระเมตตา อบอุ่น และมีมนุษยสัมพันธ์อันดียิ่งกับทุกคน จงกล่าวขอบคุณและให้พรแก่คุณโยม "${spokenName}" ที่ร่วมบุญ "${gLabel}" (ให้พูดชื่อการร่วมบุญ "${gLabel}" ห้ามพูดชื่อไอเทมของขวัญ และห้ามพูดคำว่า "ยินดีต้อนรับ" หรือ "ขอต้อนรับ" โดยเด็ดขาด ให้กล่าวขอบคุณและอนุโมทนาบุญโดยตรง) อย่างเป็นธรรมชาติ อบอุ่น มีชีวิตชีวา และไม่ใช้คำซ้ำซาก 1 ประโยคสั้นๆ (ความยาว 8-12 คำ) ให้สลับสำนวนหลากหลาย เช่น ขอบคุณคุณ... ที่ร่วมบุญ / อนุโมทนาบุญใหญ่คุณ... / ชื่นใจในจิตศรัทธาของคุณ... / ขอให้เปิดคลังทรัพย์รับโชค / ขอให้เงินทองไหลมาเทมา / ขอให้สุขภาพแข็งแรงและครอบครัวร่มเย็น ลงท้ายด้วย "นะคะ" หรือ "นะจ๊ะ"`;
    } else if (isGreetingChat) {
      prompt = `คุณคือพระแม่กวนอิมผู้เปี่ยมด้วยพระเมตตาและอบอุ่น จงกล่าวทักทายและตอบรับคำสวัสดีของคุณโยม "${spokenName}" อย่างเป็นกันเอง มีมนุษยสัมพันธ์ดียิ่ง 1 ประโยคสั้นๆ (8-12 คำ) สลับคำพูดหลากหลาย เช่น "เจริญพรสวัสดีคุณ... ขอให้มีความสุขกายสบายใจนะคะ" หรือ "สวัสดีจ้ะคุณ... ดีใจที่ได้พบกันในวันนี้นะคะ" หรือ "ยินดีต้อนรับคุณ... ขอพระเมตตาคุ้มครองให้โชคดีนะคะ" ลงท้ายด้วย "นะคะ" หรือ "นะจ๊ะ"`;
    } else if (isSadhuChat) {
      prompt = `คุณคือพระแม่กวนอิมผู้เปี่ยมด้วยพระเมตตา จงกล่าวอนุโมทนาบุญและให้พรคุณโยม "${spokenName}" ที่ร่วมพิมพ์สาธุบารมี อย่างอบอุ่นและชื่นใจ 1 ประโยคสั้นๆ (8-12 คำ) สลับสำนวน เช่น "สาธุอนุโมทนาบุญคุณ... ขอให้พบเจอแต่สิ่งมงคลนะคะ" หรือ "บารมีคุ้มครองคุณ... ขอให้จิตใจเบิกบานและมีโชคนะคะ" หรือ "อนุโมทนาในบุญบริสุทธิ์ของคุณ... ขอให้ชีวิตรุ่งเรืองนะคะ" ลงท้ายด้วย "นะคะ"`;
    } else if (cleanWish) {
      prompt = `คุณคือพระแม่กวนอิมผู้เปี่ยมด้วยความรักและเมตตา จงกล่าวให้พรตามคำขอพร "${cleanWish}" แก่คุณโยม "${spokenName}" อย่างอบอุ่น เข้าอกเข้าใจ และให้กำลังใจ 1 ประโยคสั้นๆ (8-12 คำ) สลับสำนวน เช่น "ขอให้คุณ... สมความปรารถนาและมีแต่รอยยิ้มนะคะ" หรือ "บารมีพระแม่คุ้มครองคุณ... ให้ผ่านพ้นทุกอุปสรรคและร่ำรวยนะคะ" ลงท้ายด้วย "นะคะ"`;
    } else {
      if (spokenName === 'กัลยาณมิตร' || spokenName === 'ผู้เจริญสติ' || spokenName === 'ผู้มีจิตศรัทธา') {
        prompt = `คุณคือพระแม่กวนอิมผู้เปี่ยมด้วยพระเมตตา จงกล่าวต้อนรับกัลยาณมิตรทุกท่านที่เข้ามาร่วมสร้างบุญบารมีในแดนธรรมอย่างอบอุ่น เป็นกันเอง และชื่นใจ 1 ประโยคสั้นๆ (8-12 คำ) สลับสำนวนหลากหลาย ไม่ซ้ำซาก เช่น "ยินดีต้อนรับทุกท่านสู่แดนธรรม ขอให้จิตใจสงบร่มเย็นนะคะ" หรือ "ขอต้อนรับกัลยาณมิตรทุกท่าน แวะมาพักใจและรับพลังบุญนะคะ" ลงท้ายด้วย "นะคะ"`;
      } else {
        prompt = `คุณคือพระแม่กวนอิมผู้เปี่ยมด้วยพระเมตตาและอบอุ่น จงกล่าวต้อนรับและทักทายคุณโยม "${spokenName}" ที่เข้ามารับชมไลฟ์อย่างเป็นมิตร อบอุ่น มีมนุษยสัมพันธ์ที่ดีเยี่ยม 1 ประโยคสั้นๆ (8-12 คำ) สลับสำนวน เช่น "ยินดีต้อนรับคุณ... สู่ศาลาธรรม ขอให้สุขใจในวันนี้นะคะ" หรือ "ดีใจที่ได้พบคุณ... ขอพระเมตตาคุ้มครองให้โชคดีนะคะ" หรือ "ยินดีต้อนรับคุณ... แวะมาเติมพลังบุญและความสุขนะคะ" ลงท้ายด้วย "นะคะ" หรือ "นะจ๊ะ"`;
      }
    }

    // Modern Gemini Interactions API (supports both Auth Keys AQ. and legacy AIzaSy keys)
    const interactionModels = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.8-flash'];
    for (const model of interactionModels) {
      try {
        const gRes = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/interactions?key=${apiKey}`,
          {
            model,
            input: prompt,
            generation_config: { thinking_level: 'minimal' }
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey
            },
            timeout: 9000
          }
        );
        const steps = gRes.data?.steps || [];
        const modelOutput = steps.find(s => s.type === 'model_output');
        const textPart = modelOutput?.content?.find(c => c.type === 'text');
        const candidate = textPart?.text || gRes.data?.output_text || gRes.data?.outputs?.[0]?.text;
        if (candidate) {
          blessing = candidate.trim().replace(/[*#"\n]/g, '').trim();
          console.log(`[Gemini AI (${model})] Generated dynamic blessing for ${spokenName}: "${blessing}"`);
          break;
        }
      } catch (e) {
        // Fallback to next interaction model or generateContent
      }
    }

    // Universal generateContent fallback for all Google AI Studio keys
    if (!blessing) {
      const contentModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
      for (const model of contentModels) {
        try {
          const cRes = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 50
              }
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey
              },
              timeout: 9000
            }
          );
          const candidate = cRes.data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidate) {
            blessing = candidate.trim().replace(/[*#"\n]/g, '').trim();
            console.log(`[Gemini AI (${model} generateContent)] Generated dynamic blessing for ${spokenName}: "${blessing}"`);
            break;
          }
        } catch (e) {
          // Continue to next or template fallback
        }
      }
    }
  }

  if (!blessing) {
    if (isGiftAction) {
      const specificEffect = spokenEffectName || 'กราบเบญจางคประดิษฐ์';
      if (specificEffect.includes('เซียมซี') || cleanEffectType === 'seamsi') {
        const seamsiBlessingTemplates = [
          `อนุโมทนาคุณ ${spokenName} ร่วมเสี่ยงเซียมซีมหาโชค ขอให้ได้ใบมงคลและรับโชคใหญ่นะคะ`,
          `ขอบคุณคุณ ${spokenName} ที่ร่วมเสี่ยงเซียมซีมหาโชค ขอให้คำทำนายนำพาความร่ำรวยมาให้นะคะ`,
          `สาธุอนุโมทนาคุณ ${spokenName} เสี่ยงเซียมซีมหาโชค ขอให้เปิดดวงรับทรัพย์ก้อนโตนะคะ`,
          `บารมีพระแม่คุ้มครองคุณ ${spokenName} ที่ร่วมเสี่ยงเซียมซี ขอให้สมหวังดั่งใจปรารถนานะคะ`,
          `ชื่นใจในศรัทธาของคุณ ${spokenName} ร่วมเสี่ยงเซียมซีมหาโชค ขอให้เฮงๆ ปังๆ นะคะ`,
          `ขออวยพรให้คุณ ${spokenName} ที่เสี่ยงเซียมซีมหาโชค ได้รับข่าวมงคลและโชคลาภลอยนะคะ`
        ];
        blessing = seamsiBlessingTemplates[Math.floor(Math.random() * seamsiBlessingTemplates.length)];
      } else {
        const giftBlessingTemplates = [
          `ขอบคุณคุณ ${spokenName} ที่ร่วมบุญ${specificEffect} ขอให้ร่ำรวยมีความสุขมากๆ นะคะ`,
          `อนุโมทนาคุณ ${spokenName} ที่ร่วมบุญ${specificEffect} ขอให้เงินทองไหลมาเทมานะคะ`,
          `ขอบคุณคุณ ${spokenName} ร่วมบุญ${specificEffect} ขอให้สุขภาพแข็งแรงและโชคดีนะคะ`,
          `ขอขอบใจคุณ ${spokenName} ร่วมบุญ${specificEffect} ขอให้สมปรารถนาดั่งใจหวังนะคะ`,
          `อนุโมทนาบุญคุณ ${spokenName} ร่วมบุญ${specificEffect} ขอให้ชีวิตรุ่งเรืองและราบรื่นนะคะ`,
          `ชื่นใจในบุญของคุณ ${spokenName} ร่วมบุญ${specificEffect} ขอให้มีแต่โชคลาภเงินทองนะคะ`,
          `อนุโมทนาสาธุคุณ ${spokenName} ขอให้บุญ${specificEffect} หนุนนำให้พบคู่บารมีและกัลยาณมิตรนะคะ`,
          `บารมีคุ้มครองคุณ ${spokenName} ที่ร่วมบุญ${specificEffect} ขอให้เปิดคลังทรัพย์รับโชคใหญ่นะคะ`,
          `ขอบคุณคุณ ${spokenName} ยิ่งนัก ขอให้บุญรักษา เทวดาคุ้มครอง และแคล้วคลาดปลอดภัยนะคะ`,
          `ขออวยพรให้คุณ ${spokenName} ที่ร่วมบุญ${specificEffect} การงานก้าวหน้า ค้าขายร่ำรวยนะคะ`,
          `อนุโมทนาบุญกุศลอันบริสุทธิ์คุณ ${spokenName} ขอให้ชีวิตสดใส ไร้โรคภัยเบียดเบียนนะคะ`,
          `ขอบคุณคุณ ${spokenName} ที่นำจิตศรัทธามาร่วมบุญ${specificEffect} ขอให้มีกินมีใช้ไม่ขาดมือนนะคะ`,
          `สาธุอนุโมทนาคุณ ${spokenName} ร่วมบุญ${specificEffect} ขอให้คำอธิษฐานสัมฤทธิผลทันใจนะคะ`,
          `ขอให้คุณ ${spokenName} รับพรมงคลร้อยแปดประการ ร่ำรวยมั่งคั่งและร่มเย็นเป็นสุขนะคะ`
        ];
        blessing = giftBlessingTemplates[Math.floor(Math.random() * giftBlessingTemplates.length)];
      }
    } else if (isGreetingChat) {
      const greetingChatTemplates = [
        `เจริญพรสวัสดีคุณ ${spokenName} ขอให้มีความสุขกายสบายใจในวันนี้นะคะ`,
        `สวัสดีจ้ะคุณ ${spokenName} ขอพระแม่ประทานพรให้โชคดีมีสุขนะคะ`,
        `สาธุเจริญพรคุณ ${spokenName} ยินดีต้อนรับ ขอให้พบเจอแต่สิ่งมงคลนะคะ`,
        `สวัสดีคุณ ${spokenName} ชื่นใจจริงที่ได้แวะมาทักทายกันในวันนี้นะคะ`,
        `เจริญสุขสวัสดีคุณ ${spokenName} ขอให้จิตใจผ่องใส สุขภาพแข็งแรงนะคะ`,
        `สวัสดีจ้ะคุณ ${spokenName} วันนี้ขอให้เป็นวันที่ดีและราบรื่นในทุกเรื่องนะคะ`,
        `กราบรับพรอันบริสุทธิ์นะจ๊ะคุณ ${spokenName} ขอให้ชีวิตมีแต่ความเจริญรุ่งเรืองนะคะ`,
        `ยินดีที่ได้ทักทายคุณ ${spokenName} ขอให้พบพานแต่กัลยาณมิตรที่ดีนะคะ`
      ];
      blessing = greetingChatTemplates[Math.floor(Math.random() * greetingChatTemplates.length)];
    } else if (isSadhuChat) {
      const sadhuTemplates = [
        `สาธุอนุโมทนาบุญคุณ ${spokenName} ขอให้พบเจอแต่สิ่งมงคลและเป็นสุขนะคะ`,
        `อนุโมทนาสาธุคุณ ${spokenName} ขอพระแม่ประทานพรให้เงินทองไหลมาเทมานะคะ`,
        `สาธุบารมีคุ้มครองคุณ ${spokenName} ขอให้สุขภาพแข็งแรงและโชคดีนะคะ`,
        `อนุโมทนาบุญคุณ ${spokenName} ขอให้สมความปรารถนาทุกประการนะคะ`,
        `สาธุในจิตอันเป็นกุศลของคุณ ${spokenName} ขอให้ผลบุญหนุนนำชีวิตให้รุ่งเรืองนะคะ`,
        `อนุโมทนาสาธุคุณ ${spokenName} ขอให้หมดหนี้หมดสิน มีกินมีใช้ตลอดไปนะคะ`,
        `สาธุรับบุญเต็มเปี่ยมนะจ๊ะคุณ ${spokenName} ขอให้ร่มเย็นเป็นสุขทั้งครอบครัวนะคะ`,
        `อนุโมทนาบุญบารมีคุณ ${spokenName} ขอให้เทวดาปกปักรักษาและมีโชคใหญ่นะคะ`
      ];
      blessing = sadhuTemplates[Math.floor(Math.random() * sadhuTemplates.length)];
    } else if (cleanAction.includes('เข้าร่วม') || cleanAction.includes('ต้อนรับ') || cleanAction.includes('เจริญสติ') || cleanAction.includes('join')) {
      let welcomeTemplates = [];
      if (spokenName === 'กัลยาณมิตร' || spokenName === 'ผู้เจริญสติ' || spokenName === 'ผู้มีจิตศรัทธา') {
        welcomeTemplates = [
          `ยินดีต้อนรับทุกท่านสู่แดนธรรม ขอให้จิตใจสงบร่มเย็นและมีความสุขนะคะ`,
          `เจริญพรต้อนรับกัลยาณมิตรผู้มีจิตศรัทธา แวะมาพักใจและรับพลังบุญนะคะ`,
          `ยินดีต้อนรับสู่ศาลาธรรม ขอพระเมตตาคุ้มครองให้พบเจอแต่สิ่งดีงามนะคะ`,
          `ขอต้อนรับทุกท่านด้วยความยินดียิ่ง ขอให้ชีวิตรุ่งเรืองและราบรื่นนะคะ`,
          `เจริญสุขแด่กัลยาณมิตรทุกท่าน เข้ามาร่วมเจริญสติและรับมงคลชัยนะคะ`,
          `ยินดีต้อนรับทุกท่าน ขอให้คลายความเหนื่อยล้า และมีแต่รอยยิ้มในใจนะคะ`,
          `ขอต้อนรับเข้าสู่วิหารธรรม ขอให้บุญรักษาและโชคดีตลอดวันนะคะ`
        ];
      } else {
        welcomeTemplates = [
          `ยินดีต้อนรับคุณ ${spokenName} สู่แดนธรรม ขอให้จิตใจสงบร่มเย็นนะคะ`,
          `เจริญพรต้อนรับคุณ ${spokenName} ขอให้พบเจอแต่ความสุขใจในวันนี้นะคะ`,
          `ยินดีที่ได้พบคุณ ${spokenName} ขอพระเมตตาคุ้มครองให้โชคดีมีสุขนะคะ`,
          `ขอต้อนรับคุณ ${spokenName} ด้วยความยินดียิ่ง ขอให้มีโชคลาภเงินทองนะคะ`,
          `สวัสดีต้อนรับคุณ ${spokenName} แวะเข้ามาพักผ่อนจิตใจในศาลาธรรมนี้นะคะ`,
          `ชื่นใจที่ได้พบคุณ ${spokenName} ขอให้สิ่งศักดิ์สิทธิ์อำนวยพรให้ราบรื่นนะคะ`,
          `ยินดีต้อนรับคุณ ${spokenName} ขอให้วันนี้เป็นวันที่สดใสและสมหวังนะคะ`,
          `เจริญสุขคุณ ${spokenName} ขอต้อนรับเข้าสู่ร่มเงาแห่งธรรม ขอให้เป็นสุขนะคะ`,
          `ดีใจที่ได้พบคุณ ${spokenName} มาร่วมสร้างบุญบารมี ขอให้ชีวิตรุ่งโรจน์นะคะ`,
          `ขอต้อนรับคุณ ${spokenName} ด้วยความอบอุ่น ขอให้สุขภาพแข็งแรงและร่ำรวยนะคะ`
        ];
      }
      blessing = welcomeTemplates[Math.floor(Math.random() * welcomeTemplates.length)];
    } else if (cleanAction.includes('ติดตาม') || cleanAction.includes('follow')) {
      const followTemplates = [
        `อนุโมทนาบุญคุณ ${spokenName} ที่กดติดตาม ขอให้เจริญรุ่งเรืองนะคะ`,
        `ขอบคุณคุณ ${spokenName} ที่ร่วมเป็นกัลยาณมิตร ขอให้โชคดีมีสุขนะคะ`,
        `ยินดีที่ได้ร่วมทางธรรมกับคุณ ${spokenName} ขอให้สมปรารถนานะคะ`,
        `ขอบคุณคุณ ${spokenName} ที่มาร่วมเป็นสายบุญด้วยกัน ขอให้มั่งมีศรีสุขนะคะ`,
        `อนุโมทนาบุญคุณ ${spokenName} ขอให้บุญสัมพันธ์นี้ นำพาความสุขความสำเร็จมาให้นะคะ`
      ];
      blessing = followTemplates[Math.floor(Math.random() * followTemplates.length)];
    } else if (cleanAction.includes('กุหลาบ') || cleanAction.includes('kowtow')) {
      const kowtowTemplates = [
        `อนุโมทนาคุณ ${spokenName} ถวายกุหลาบมงคล ขอให้ร่ำรวยโชคดีนะคะ`,
        `อนุโมทนาบุญคุณ ${spokenName} ขอให้เงินทองไหลมาเทมานะคะ`,
        `บารมีคุ้มครองคุณ ${spokenName} ขอให้สุขภาพแข็งแรงนะคะ`,
        `ขอให้คุณ ${spokenName} พบเจอแต่กัลยาณมิตรที่ดีนะคะ`,
        `ชื่นใจในจิตศรัทธาของคุณ ${spokenName} ขอให้ชีวิตสดใสและราบรื่นนะคะ`
      ];
      blessing = kowtowTemplates[Math.floor(Math.random() * kowtowTemplates.length)];
    } else if (cleanAction.includes('บัว') || cleanAction.includes('lotus')) {
      const lotusTemplates = [
        `อนุโมทนาคุณ ${spokenName} ถวายบัวทิพย์ ขอให้จิตใจผ่องใสนะคะ`,
        `อนุโมทนาบุญคุณ ${spokenName} ขอให้ชีวิตสงบร่มเย็นนะคะ`,
        `บารมีบัวทิพย์คุ้มครองคุณ ${spokenName} ขอให้ชีวิตรุ่งเรืองนะคะ`,
        `ขอให้ดวงใจของคุณ ${spokenName} ผุดผ่องดั่งดอกบัว และพบพานแต่สิ่งมงคลนะคะ`
      ];
      blessing = lotusTemplates[Math.floor(Math.random() * lotusTemplates.length)];
    } else if (cleanAction.includes('บุปผา') || cleanAction.includes('flowers')) {
      const flowerTemplates = [
        `อนุโมทนาบุญใหญ่คุณ ${spokenName} ขอให้มั่งมีศรีสุขนะคะ`,
        `อนุโมทนาบุญคุณ ${spokenName} ขอให้ปราศจากทุกข์โศกนะคะ`,
        `ขอให้กลิ่นบุญหอมฟุ้งจรุงใจคุณ ${spokenName} นำพาลาภยศและชื่อเสียงมาให้นะคะ`
      ];
      blessing = flowerTemplates[Math.floor(Math.random() * flowerTemplates.length)];
    } else if (cleanAction.includes('ขอพร') || cleanAction.includes('แชท') || cleanWish) {
      const shortWish = cleanWish
        .replace(/^(สาธุ|สาทุ|🙏|\s)+/gi, '')
        .replace(/^ขอ(พร)?(ให้)?\s*/gi, '')
        .replace(/(นะคะ|นะคร้า|นะครับ|จร้า|จ้า|ค่ะ|ครับ|\s)+$/gi, '')
        .trim();

      if (shortWish.length >= 2 && shortWish.length <= 40) {
        const wishReadTemplates = [
          `ขออวยพรให้คุณ ${spokenName} ที่ขอให้${shortWish} จงสัมฤทธิผลและสมปรารถนานะคะ`,
          `บารมีพระแม่คุ้มครองคุณ ${spokenName} ที่ขอให้${shortWish} ขอให้สำเร็จดั่งใจหวังนะคะ`,
          `ขอพรให้คุณ ${spokenName} ที่ตั้งจิตขอให้${shortWish} พบเจอแต่สิ่งมงคลและเป็นสุขนะคะ`,
          `ขอให้แรงอธิษฐานจิตของคุณ ${spokenName} ที่ขอให้${shortWish} สัมฤทธิผลรวดเร็วดั่งใจหวังนะคะ`,
          `พระเมตตาคุ้มครองคุณ ${spokenName} ที่ขอให้${shortWish} ขอให้เปิดทางสว่างและราบรื่นนะคะ`
        ];
        blessing = wishReadTemplates[Math.floor(Math.random() * wishReadTemplates.length)];
      } else if (cleanWish.includes('งาน') || cleanWish.includes('สำเร็จ') || cleanWish.includes('ก้าวหน้า') || cleanWish.includes('ค้าขาย') || cleanWish.includes('ออเดอร์')) {
        const workTemplates = [
          `ขออวยพรให้คุณ ${spokenName} การงานราบรื่น ค้าขายร่ำรวยและสำเร็จดั่งใจนะคะ`,
          `ขอให้คุณ ${spokenName} ธุรกิจเจริญก้าวหน้า ออเดอร์ปังๆ เงินทองไหลมาเทมานะคะ`,
          `บารมีเปิดทางให้คุณ ${spokenName} การงานก้าวกระโดด ผู้ใหญ่เมตตาเอ็นดูนะคะ`
        ];
        blessing = workTemplates[Math.floor(Math.random() * workTemplates.length)];
      } else if (cleanWish.includes('รวย') || cleanWish.includes('เงิน') || cleanWish.includes('โชค') || cleanWish.includes('ลาภ') || cleanWish.includes('ทอง') || cleanWish.includes('ปลดหนี้')) {
        const wealthTemplates = [
          `ขออวยพรให้คุณ ${spokenName} มั่งคั่งร่ำรวย เงินทองไหลมาเทมา ปลดหนี้สำเร็จนะคะ`,
          `ขอให้คุณ ${spokenName} มีโชคลาภก้อนโต หยิบจับสิ่งใดก็เป็นเงินเป็นทองนะคะ`,
          `ขอให้คลังทรัพย์เปิดรับคุณ ${spokenName} รับทรัพย์ใหญ่และมีกินมีใช้ไม่ขาดมือนนะคะ`
        ];
        blessing = wealthTemplates[Math.floor(Math.random() * wealthTemplates.length)];
      } else if (cleanWish.includes('สุขภาพ') || cleanWish.includes('ป่วย') || cleanWish.includes('แข็งแรง') || cleanWish.includes('หาย')) {
        const healthTemplates = [
          `ขอให้คุณ ${spokenName} สุขภาพแข็งแรง หายจากโรคภัยและมีอายุยืนยาวนะคะ`,
          `บารมีน้ำทิพย์คุ้มครองคุณ ${spokenName} ให้ร่างกายฟื้นฟู สมบูรณ์แข็งแรงในเร็วนี้นะคะ`,
          `ขอให้คุณ ${spokenName} คลาดแคล้วจากสรรพโรคภัย มีพลังกายพลังใจเต็มเปี่ยมนะคะ`
        ];
        blessing = healthTemplates[Math.floor(Math.random() * healthTemplates.length)];
      } else if (cleanWish.includes('รัก') || cleanWish.includes('ครอบครัว') || cleanWish.includes('แฟน') || cleanWish.includes('คู่')) {
        const loveTemplates = [
          `ขอให้คุณ ${spokenName} และครอบครัว ร่มเย็นเป็นสุข สมหวังในความรักนะคะ`,
          `ขอให้คุณ ${spokenName} พบเจอคู่บารมีที่เข้าใจ และมีความรักที่อบอุ่นมั่นคงนะคะ`,
          `ขอให้บ้านของคุณ ${spokenName} อบอวลด้วยความรัก ความเข้าใจ และรอยยิ้มนะคะ`
        ];
        blessing = loveTemplates[Math.floor(Math.random() * loveTemplates.length)];
      } else if (cleanWish.includes('เรียน') || cleanWish.includes('สอบ') || cleanWish.includes('เกรด') || cleanWish.includes('จบ')) {
        blessing = `ขอให้คุณ ${spokenName} ปัญญาเฉียบแหลม การเรียนและการสอบสำเร็จราบรื่นนะคะ`;
      } else {
        const wishTemplates = [
          `ขออวยพรให้คุณ ${spokenName} สมปรารถนาในทุกสิ่งที่ตั้งใจไว้นะคะ`,
          `บารมีพระแม่คุ้มครองคุณ ${spokenName} ให้พบเจอแต่สิ่งดีงามและเป็นสุขนะคะ`,
          `อนุโมทนาคุณ ${spokenName} ขอให้คำอธิษฐานจิตนี้สัมฤทธิผลโดยเร็วนะคะ`,
          `ขอให้สิ่งศักดิ์สิทธิ์ดลบันดาลให้คุณ ${spokenName} ประสบความสำเร็จทุกประการนะคะ`
        ];
        blessing = wishTemplates[Math.floor(Math.random() * wishTemplates.length)];
      }
    } else {
      blessing = `อนุโมทนาบุญคุณ ${spokenName} ขอให้สัมฤทธิผล สมปรารถนานะคะ`;
    }
  }

  getAudioUrlForText(blessing, (err, url) => {
    res.json({
      success: true,
      blessingText: blessing,
      audioUrl: err ? null : url
    });
  }, cleanAction);
});

app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    data: {
      isConnected: state.isConnected,
      tiktokUsername: state.tiktokUsername,
      lastError: state.lastError,
      roomId: state.roomId,
      viewersCount: state.viewersCount,
      discipleCount: state.disciples.length,
      disciples: state.disciples,
      leaderboard: state.leaderboard,
      topSadhu: state.topSadhu,
      tributeQueue: state.tributeQueue,
      recentWishes: state.recentWishes,
      prayerCategories: state.prayerCategories,
      micRouterConfig: state.micRouterConfig
    }
  });
});

app.get('/api/mic-router/config', (req, res) => {
  res.json({ success: true, config: state.micRouterConfig });
});

app.post('/api/mic-router/config', (req, res) => {
  const incoming = req.body || {};
  if (incoming.mode && ['stereo_mix', 'voice_split', 'all_to_mic'].includes(incoming.mode)) {
    state.micRouterConfig.mode = incoming.mode;
  }
  if (typeof incoming.sinkId === 'string') state.micRouterConfig.sinkId = incoming.sinkId;
  if (typeof incoming.deviceName === 'string') state.micRouterConfig.deviceName = incoming.deviceName;
  if (typeof incoming.acousticsEnabled === 'boolean') state.micRouterConfig.acousticsEnabled = incoming.acousticsEnabled;
  if (typeof incoming.keepAliveEnabled === 'boolean') state.micRouterConfig.keepAliveEnabled = incoming.keepAliveEnabled;
  if (typeof incoming.dualMonitorEnabled === 'boolean') state.micRouterConfig.dualMonitorEnabled = incoming.dualMonitorEnabled;
  state.micRouterConfig.updatedAt = Date.now();

  io.emit('mic_router_sync', state.micRouterConfig);
  res.json({ success: true, config: state.micRouterConfig });
});

app.post('/api/connect', async (req, res) => {
  const { username, sessionId, apiKey } = req.body || {};
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ success: false, error: 'Username required' });
  }

  const cleanUser = username.trim().replace(/^@/, '').slice(0, 60);
  if (!cleanUser || !/^[a-zA-Z0-9._-]+$/.test(cleanUser)) {
    return res.status(400).json({ success: false, error: 'Invalid TikTok username characters' });
  }

  try {
    const roomState = await connectToTikTok(cleanUser, sessionId, apiKey);
    res.json({
      success: true,
      message: `Connected to @${cleanUser}`,
      roomId: roomState?.roomId || state.roomId
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/disconnect', (req, res) => {
  state.userExplicitlyDisconnected = true;
  if (tiktokConnection) {
    try { tiktokConnection.disconnect(); } catch (_) { }
    tiktokConnection = null;
  }
  state.isConnected = false;
  io.emit('status_change', { isConnected: false });
  res.json({ success: true, message: 'Disconnected' });
});

// Test Simulation Endpoint
app.post('/api/simulate', (req, res) => {
  const { type, payload } = req.body;

  if (type === 'join' || type === 'member') {
    const autoId = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const disciple = getOrCreateDisciple({
      userId: payload?.userId || (payload?.uniqueId ? `u_${payload.uniqueId}` : autoId),
      uniqueId: payload?.uniqueId || autoId,
      nickname: payload?.nickname || 'ผู้เจริญสติใหม่',
      avatar: payload?.avatar
    }, false);

    io.emit('action_join', {
      disciple,
      message: `${disciple.nickname} เข้าร่วมห้องเจริญสติ`
    });
    return res.json({ success: true, disciple });
  }

  if (type === 'follow') {
    const autoId = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const disciple = getOrCreateDisciple({
      userId: payload?.userId || (payload?.uniqueId ? `u_${payload.uniqueId}` : autoId),
      uniqueId: payload?.uniqueId || autoId,
      nickname: payload?.nickname || 'มะม่วง 🥭',
      avatar: payload?.avatar
    }, false, true);

    io.emit('action_follow', {
      disciple,
      message: `${disciple.nickname} ติดตามและรับพรอภิวาทน์ ✨`
    });
    return res.json({ success: true, disciple });
  }

  if (type === 'gift') {
    const diamondCount = payload?.diamondCount || 1;
    const disciple = getOrCreateDisciple({
      userId: payload?.userId || `sim_donor_${Math.floor(Math.random() * 5)}`,
      uniqueId: payload?.uniqueId || 'ผู้มีจิตศรัทธา',
      nickname: payload?.nickname || 'ผู้มีจิตศรัทธา',
      avatar: payload?.avatar
    }, false, true);

    const giftName = payload?.giftName || (
      diamondCount >= 299 ? 'มังกรแฟนตาซี' :
        diamondCount >= 100 ? 'ประตูมิติ' :
          diamondCount >= 99 ? 'หัวใจ 4 ดวง' :
            diamondCount >= 30 ? 'โดนัท' :
              diamondCount >= 20 ? 'โคโลญจน์' :
                diamondCount >= 15 ? 'พวงมาลัย' :
                  diamondCount >= 10 ? 'กุหลาบ ๙๙' :
                    diamondCount >= 9 ? 'Lucky 9' :
                      diamondCount >= 5 ? 'เครื่องราง' : 'กุหลาบ'
    );
    const effectData = resolveGiftEffect(giftName, diamondCount, diamondCount);
    const effectType = effectData.type;
    const effectName = effectData.name;
    const giftIcon = effectData.icon;
    const giftImage = effectData.image || '/rose.png';

    const wish = payload?.wish || defaultPrayerWishes[Math.floor(Math.random() * defaultPrayerWishes.length)];
    const queueItem = {
      id: 'q_' + Date.now(),
      uniqueId: disciple.uniqueId,
      avatar: disciple.avatar || '',
      nickname: disciple.nickname,
      giftIcon,
      giftImage,
      giftName: payload?.giftName || effectName,
      wish,
      diamondCount,
      timestamp: Date.now()
    };
    state.tributeQueue.unshift(queueItem);
    if (state.tributeQueue.length > 8) state.tributeQueue.pop();

    state.prayerCategories.wealth += Math.min(5, Math.max(1, Math.floor(diamondCount / 2)));

    // Emit action_gift and queue_update BEFORE recordDonation so client seats donor & starts ritual first
    io.emit('action_gift', {
      seatId: disciple.seatId,
      uniqueId: disciple.uniqueId,
      nickname: disciple.nickname,
      avatar: disciple.avatar,
      giftName: payload?.giftName || effectName,
      giftIcon,
      giftImage,
      wish,
      diamondCount,
      totalDiamonds: diamondCount,
      effectType,
      effectName
    });

    io.emit('queue_update', {
      tributeQueue: state.tributeQueue,
      prayerCategories: state.prayerCategories
    });

    recordDonation(disciple, diamondCount, giftName, giftIcon, giftImage);

    return res.json({ success: true, disciple, effectType, effectName, giftName: payload?.giftName || effectName, giftIcon, giftImage, diamondCount });
  }

  if (type === 'chat') {
    const disciple = getOrCreateDisciple({
      userId: payload?.userId,
      uniqueId: payload?.uniqueId || 'An Nhiên',
      nickname: payload?.nickname || 'An Nhiên'
    }, false, true);

    const comment = payload?.comment || 'ขอให้สมหวังทุกประการ สาธุ 🙏';

    const hasSadhu = /(สาธุ|สาทุ|สาดุ|sadhu|sathu|อนุโมทนา|โมทนา)/i.test(comment);
    if (hasSadhu) {
      recordSadhuPoint({
        uniqueId: payload?.uniqueId || disciple.uniqueId,
        userId: payload?.userId || disciple.userId,
        nickname: payload?.nickname || disciple.nickname,
        avatar: payload?.avatar || disciple.avatar
      }, 1, comment);
    }

    const cat = classifyWish(comment);
    if (state.prayerCategories[cat] !== undefined) {
      state.prayerCategories[cat]++;
    }

    const wishObj = {
      id: 'w_' + Date.now(),
      nickname: disciple.nickname,
      wish: comment,
      category: cat,
      timestamp: Date.now()
    };
    state.recentWishes.unshift(wishObj);
    if (state.recentWishes.length > 8) state.recentWishes.pop();

    io.emit('action_chat', {
      seatId: disciple.seatId,
      uniqueId: disciple.uniqueId,
      nickname: disciple.nickname,
      comment
    });

    io.emit('prayer_update', {
      recentWishes: state.recentWishes,
      prayerCategories: state.prayerCategories,
      latestWish: wishObj
    });

    return res.json({ success: true, disciple });
  }

  if (type === 'reset') {
    state.disciples = [];
    state.donorRegistry.clear();
    state.leaderboard = [];
    state.sadhuScores.clear();
    state.topSadhu = [];
    state.tributeQueue = [];
    state.recentWishes = [];
    state.prayerCategories = { work: 0, wealth: 0, love: 0, health: 0, study: 0 };
    io.emit('state_reset');
    io.emit('leaderboard_update', []);
    io.emit('sadhu_update', []);
    return res.json({ success: true, message: 'Reset all state' });
  }

  res.status(400).json({ success: false, error: 'Unknown event type' });
});

// Socket.IO connection handler
io.on('connection', socket => {
  socket.emit('initial_state', {
    isConnected: state.isConnected,
    tiktokUsername: state.tiktokUsername,
    viewersCount: state.viewersCount,
    disciples: state.disciples,
    leaderboard: state.leaderboard,
    topSadhu: state.topSadhu,
    tributeQueue: state.tributeQueue,
    recentWishes: state.recentWishes,
    prayerCategories: state.prayerCategories,
    micRouterConfig: state.micRouterConfig
  });

  socket.on('connect-tiktok', data => {
    const username = data?.uniqueId || data?.username;
    if (username) {
      console.log(`[Socket] Received connect-tiktok for @${username}`);
      connectToTikTok(username, data.sessionId);
    }
  });

  socket.on('tribute_complete', data => {
    if (!data) return;
    const name = data.nickname || data.name || data.uniqueId;
    if (state.tributeQueue && state.tributeQueue.length > 0) {
      const idx = name ? state.tributeQueue.findIndex(q => q.nickname === name || q.uniqueId === name) : 0;
      if (idx !== -1) {
        state.tributeQueue.splice(idx, 1);
      } else {
        state.tributeQueue.shift();
      }
      io.emit('queue_update', {
        tributeQueue: state.tributeQueue,
        prayerCategories: state.prayerCategories
      });
    }
  });

  socket.on('disconnect-tiktok', () => {
    console.log('[Socket] Received disconnect-tiktok');
    state.userExplicitlyDisconnected = true;
    if (tiktokConnection) {
      try { tiktokConnection.disconnect(); } catch (_) { }
      tiktokConnection = null;
    }
    state.isConnected = false;
    io.emit('status_change', { isConnected: false });
  });

  socket.on('mic_router_sync', data => {
    if (data && typeof data === 'object') {
      if (data.mode && ['stereo_mix', 'voice_split', 'all_to_mic'].includes(data.mode)) {
        state.micRouterConfig.mode = data.mode;
      }
      if (typeof data.sinkId === 'string') state.micRouterConfig.sinkId = data.sinkId;
      if (typeof data.deviceName === 'string') state.micRouterConfig.deviceName = data.deviceName;
      if (typeof data.acousticsEnabled === 'boolean') state.micRouterConfig.acousticsEnabled = data.acousticsEnabled;
      if (typeof data.keepAliveEnabled === 'boolean') state.micRouterConfig.keepAliveEnabled = data.keepAliveEnabled;
      if (typeof data.dualMonitorEnabled === 'boolean') state.micRouterConfig.dualMonitorEnabled = data.dualMonitorEnabled;
      state.micRouterConfig.updatedAt = Date.now();
    }
    socket.broadcast.emit('mic_router_sync', state.micRouterConfig);
  });

  socket.on('mic_router_test', data => {
    io.emit('mic_router_test', data || {});
  });
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[ERROR] Port ${PORT} is already in use by another application or previous server instance.`);
    console.error(`[FIX] Automatically closing old process on port ${PORT} or run: taskkill /f /im node.exe\n`);
  } else {
    console.error('[Server Error]:', err);
  }
});

server.listen(PORT, () => {
  console.log(`[Server] Buddha TikTok Live Stream Server running on http://localhost:${PORT}`);
});

// Devotional Tribute Queue & Streak Auto-Expiry Sweep:
// If live stream is idle or ceremony completed, automatically dequeue stale entries older than 35s
setInterval(() => {
  if (state.tributeQueue && state.tributeQueue.length > 0) {
    const now = Date.now();
    const prevCount = state.tributeQueue.length;
    state.tributeQueue = state.tributeQueue.filter(item => (now - (item.timestamp || now)) < 35000);
    if (state.tributeQueue.length !== prevCount) {
      io.emit('queue_update', {
        tributeQueue: state.tributeQueue,
        prayerCategories: state.prayerCategories
      });
    }
  }

  // Clean stale streak entries older than 20s to ensure zero memory leaks over 24/7 stream
  const now = Date.now();
  for (const [key, val] of giftStreakTracker.entries()) {
    if (now - (val.time || 0) > 20000) {
      giftStreakTracker.delete(key);
    }
  }
}, 4000);

// Viewer Inactivity Departure Sweep:
// When viewers leave (no interaction for > 75s and no coins), gracefully remove them from temple
setInterval(() => {
  const now = Date.now();
  for (let i = state.disciples.length - 1; i >= 0; i--) {
    const d = state.disciples[i];
    // Preserve donors and TOP 5 VIPs
    if ((d.coins || 0) > 0) continue;

    if (now - (d.lastActiveAt || d.joinedAt || 0) > 75000) {
      const left = state.disciples.splice(i, 1)[0];
      console.log(`[Departure] Viewer ${left.nickname} left stream (Seat ${left.seatId})`);
      io.emit('disciple_left', {
        seatId: left.seatId,
        uniqueId: left.uniqueId,
        nickname: left.nickname
      });
    }
  }
}, 10000);

module.exports = { app, server, state, getOrCreateDisciple, recordDonation, resolveGiftEffect, getGiftIcon, DEVOTIONAL_TIERS };

// Auto-connect to TikTok Live on server startup
const bootChannel = process.env.TIKTOK_USERNAME || 'suphat.060841';
const bootApiKey = process.env.SIGN_API_KEY || '';

setTimeout(() => {
  if (!state.isConnected && bootChannel) {
    console.log(`[TikTok] Boot Auto-Connecting to @${bootChannel}...`);
    connectToTikTok(bootChannel, null, bootApiKey).then(room => {
      console.log(`[TikTok] Boot connection established to room ${room?.roomId}!`);
    }).catch(err => {
      console.log(`[TikTok] Boot connection note: ${err.message}`);
    });
  }
}, 3000);

// Auto-Reconnect & Connection Keeper: Keeps live stream connected 24/7
setInterval(() => {
  if (!state.isConnected && !state.userExplicitlyDisconnected) {
    const target = state.tiktokUsername || bootChannel;
    if (target) {
      connectToTikTok(target, null, bootApiKey).then(room => {
        console.log(`[TikTok Keeper] Connected to @${target} (Room: ${room?.roomId})`);
      }).catch(() => {
        // Quietly wait for next cycle
      });
    }
  }
}, 30000);
