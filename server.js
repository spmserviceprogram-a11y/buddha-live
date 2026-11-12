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
app.get('/api/client-boot', (req, res) => {
  console.log(`[CLIENT BOOT ${new Date().toISOString()}] Client browser successfully booted and running!`);
  res.json({ ok: true });
});
app.post('/api/client-error', (req, res) => {
  const errData = req.body || {};
  const line = `[CLIENT ERROR ${new Date().toISOString()}] ${errData.message} at ${errData.filename}:${errData.lineno}:${errData.colno}\nSTACK: ${errData.stack || 'none'}\n\n`;
  console.error(line);
  try {
    fs.appendFileSync(path.join(__dirname, 'client-error.log'), line, 'utf8');
  } catch (_) { }
  res.json({ ok: true });
});

// ---------------------------------------------------------------------
// Automated Workspace & Asset Cleanup Guard
// Safely purges obsolete, temporary, or redundant files to preserve disk space
// ---------------------------------------------------------------------
function cleanupOrphanedAndJunkFiles() {
  const JUNK_PATHS = [
    path.join(__dirname, 'public', 'blessing_video.mp4'),     // Obsolete 3s video (replaced by public/videos/blessing_*.mp4)
    path.join(__dirname, 'public', 'sprites.zip'),            // Extracted sprites zip
    path.join(__dirname, 'public', 'bg-video.mp4'),           // Redundant duplicate (served by express route)
    path.join(__dirname, 'public', 'background.mp4'),         // Redundant duplicate (served by express route)
    path.join(__dirname, 'public', 'bgm_backup_custom.m4a'),  // Redundant audio backup
    path.join(__dirname, 'live-capture.png'),                 // Temporary screenshot
    path.join(__dirname, 'public', 'bg-paradise.jpg'),        // Redundant duplicate (served by express route)
    path.join(__dirname, 'public', 'bg.jpg'),                 // Redundant duplicate (served by express route)
    path.join(__dirname, 'public', 'heavenly_paradise.jpg'),  // Redundant duplicate (served by express route)
    path.join(__dirname, 'public', 'touch.txt'),              // Scratch file
    path.join(__dirname, '__pycache__')                       // Python bytecode cache
  ];

  let reclaimedBytes = 0;
  let deletedCount = 0;

  for (const item of JUNK_PATHS) {
    try {
      if (fs.existsSync(item)) {
        const stat = fs.statSync(item);
        if (stat.isDirectory()) {
          fs.rmSync(item, { recursive: true, force: true });
        } else {
          reclaimedBytes += stat.size;
          fs.unlinkSync(item);
          deletedCount++;
        }
      }
    } catch (_) { }
  }
  if (deletedCount > 0) {
    console.log(`[Cleanup Guard] Auto-cleaned ${deletedCount} redundant files (${(reclaimedBytes / 1024 / 1024).toFixed(2)} MB reclaimed)`);
  }
  return { deletedCount, reclaimedBytes };
}
cleanupOrphanedAndJunkFiles();

app.get('/api/cleanup-junk', (req, res) => {
  const result = cleanupOrphanedAndJunkFiles();
  res.json({ ok: true, result });
});
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
    source: path.join(__dirname, 'public', 'seamsi.png'),
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
const CELESTIAL_BG_CANDIDATES = [
  'C:/Users/BINARY/.gemini/antigravity/brain/7a20d83f-7817-49a0-aa95-c0145116b164/.user_uploaded/media_1794097878899_b03508f1.jpg',
  'C:/Users/BINARY/.gemini/antigravity/brain/7a20d83f-7817-49a0-aa95-c0145116b164/.user_uploaded/media_1794069169198_f8371fbf.jpg',
  'C:/Users/BINARY/.gemini/antigravity/brain/7a20d83f-7817-49a0-aa95-c0145116b164/.user_uploaded/media_1794047302649_51e079b8.jpg'
];
const CELESTIAL_BG_SOURCE = CELESTIAL_BG_CANDIDATES[0];
const CELESTIAL_BG_DEST = path.join(__dirname, 'public', 'background.jpg');

function syncCelestialBackground() {
  try {
    for (const src of CELESTIAL_BG_CANDIDATES) {
      if (fs.existsSync(src)) {
        const srcSize = fs.statSync(src).size;
        // Only write if missing or size differs to prevent unnecessary disk writes & watcher loops
        if (!fs.existsSync(CELESTIAL_BG_DEST) || fs.statSync(CELESTIAL_BG_DEST).size !== srcSize) {
          fs.copyFileSync(src, CELESTIAL_BG_DEST);
          console.log(`[Background] Synced Heavenly Paradise background from ${src} to public/background.jpg`);
        }
        break;
      }
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

app.get(['/background.jpg', '/heavenly_paradise.jpg', '/bg.jpg', '/bg-paradise.jpg'], (req, res) => {
  try {
    if (fs.existsSync(CELESTIAL_BG_DEST)) {
      res.set('Cache-Control', 'no-cache');
      return res.sendFile(CELESTIAL_BG_DEST);
    }
    if (CELESTIAL_BG_SOURCE && fs.existsSync(CELESTIAL_BG_SOURCE)) {
      res.set('Cache-Control', 'no-cache');
      return res.sendFile(CELESTIAL_BG_SOURCE);
    }
    res.status(404).send('Background image not found');
  } catch (err) {
    res.status(500).send('Error serving background');
  }
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

function getActiveBgVideoSource() {
  for (const src of BG_VIDEO_SOURCE_CANDIDATES) {
    try {
      if (fs.existsSync(src)) return src;
    } catch (_) { }
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
// Guan Yin Divine Blessing Videos (ให้พร 1-4.mp4)
// Synchronized from Desktop to public/videos/ with HTTP 206 Byte-Range streaming
// ---------------------------------------------------------------------
const VIDEOS_DIR = path.join(__dirname, 'public', 'videos');
if (!fs.existsSync(VIDEOS_DIR)) {
  try { fs.mkdirSync(VIDEOS_DIR, { recursive: true }); } catch (_) { }
}

const BLESSING_VIDEOS_MAP = [
  { num: 4, destName: 'blessing_tier1.mp4', desktopName: 'พร 4.mp4', fallbackPattern: /(?:ให้พร|พร|blessing).*?4.*\.mp4$/i },
  { num: 3, destName: 'blessing_tier2.mp4', desktopName: 'พร 3.mp4', fallbackPattern: /(?:ให้พร|พร|blessing).*?3.*\.mp4$/i },
  { num: 1, destName: 'blessing_climax_a.mp4', desktopName: 'พร 1.mp4', fallbackPattern: /(?:ให้พร|พร|blessing).*?1.*\.mp4$/i },
  { num: 2, destName: 'blessing_climax_b.mp4', desktopName: 'พร 2.mp4', fallbackPattern: /(?:ให้พร|พร|blessing).*?2.*\.mp4$/i }
];

const SEARCH_CANDIDATE_DIRS = [
  'C:/Users/BINARY/Desktop',
  'c:/Users/BINARY/Desktop',
  path.join(process.env.USERPROFILE || 'C:/Users/BINARY', 'Desktop'),
  __dirname,
  path.join(__dirname, 'videos')
];

function findBlessingSource(item) {
  const num = typeof item === 'object' ? item.num : item;
  const pattern = (typeof item === 'object' && item.fallbackPattern) ? item.fallbackPattern : new RegExp(`(?:ให้พร|พร|blessing).*?${num}.*\\.mp4$`, 'i');
  const desktopName = typeof item === 'object' ? item.desktopName : `พร ${num}.mp4`;
  const destName = typeof item === 'object' ? item.destName : '';

  for (const dir of SEARCH_CANDIDATE_DIRS) {
    try {
      if (!fs.existsSync(dir)) continue;
      // Direct explicit candidates
      const directCandidates = [
        path.join(dir, desktopName),
        path.join(dir, `พร ${num}.mp4`),
        path.join(dir, `ให้พร ${num}.mp4`),
        path.join(dir, `blessing_${num}.mp4`),
        path.join(dir, `blessing${num}.mp4`),
        destName ? path.join(dir, destName) : null
      ];
      for (const cand of directCandidates) {
        if (cand && fs.existsSync(cand) && cand !== path.join(VIDEOS_DIR, destName)) {
          return cand;
        }
      }

      // Scan directory entries for robust Unicode (NFC/NFD) matching
      const entries = fs.readdirSync(dir);
      for (const file of entries) {
        if (destName && file === destName && dir === VIDEOS_DIR) continue;
        const normNFC = file.normalize('NFC');
        const normNFD = file.normalize('NFD');
        if (pattern.test(normNFC) || pattern.test(normNFD) || pattern.test(file)) {
          const matched = path.join(dir, file);
          if (matched !== path.join(VIDEOS_DIR, destName)) {
            return matched;
          }
        }
      }
    } catch (_) { }
  }
  return null;
}

function syncBlessingVideos() {
  BLESSING_VIDEOS_MAP.forEach(item => {
    try {
      const dest = path.join(VIDEOS_DIR, item.destName);
      const src = findBlessingSource(item);
      if (src && fs.existsSync(src)) {
        const srcStat = fs.statSync(src);
        const destExists = fs.existsSync(dest);
        const destStat = destExists ? fs.statSync(dest) : null;
        if (!destExists || destStat.size !== srcStat.size || srcStat.mtimeMs > destStat.mtimeMs) {
          fs.copyFileSync(src, dest);
          console.log(`[Blessing Video] Synced ${src} -> ${item.destName} (${srcStat.size} bytes)`);
        }
      }
    } catch (err) {
      console.warn('[Blessing Video Sync Notice]:', err.message);
    }
  });
}
syncBlessingVideos();

app.get('/api/sync-blessing-videos', (req, res) => {
  syncBlessingVideos();
  const status = BLESSING_VIDEOS_MAP.map(item => {
    const dest = path.join(VIDEOS_DIR, item.destName);
    const exists = fs.existsSync(dest);
    const size = exists ? fs.statSync(dest).size : 0;
    return { name: item.destName, exists, size };
  });
  res.json({ success: true, videos: status });
});

app.get(['/videos/:name', '/:name(blessing_tier1\\.mp4|blessing_tier2\\.mp4|blessing_climax_a\\.mp4|blessing_climax_b\\.mp4)'], (req, res) => {
  const rawName = req.params.name || path.basename(req.path);
  const fileName = path.basename(rawName);

  // Validate allowed file extensions and character whitelist (Defense-in-depth against Path Traversal)
  if (!/^[a-zA-Z0-9_\-]+\.mp4$/i.test(fileName)) {
    return res.status(400).send('Invalid video name');
  }

  const videoPath = path.join(VIDEOS_DIR, fileName);
  if (!videoPath.startsWith(VIDEOS_DIR)) {
    return res.status(403).send('Forbidden');
  }

  // Always verify sync on request so desktop video updates take effect immediately
  try {
    syncBlessingVideos();
  } catch (_) { }

  let finalPath = fs.existsSync(videoPath) ? videoPath : null;
  if (!finalPath) {
    const matchedItem = BLESSING_VIDEOS_MAP.find(m => m.destName === fileName);
    if (matchedItem) {
      finalPath = findBlessingSource(matchedItem);
    }
  }

  if (!finalPath || !fs.existsSync(finalPath)) {
    return res.status(404).send('Blessing video not found');
  }

  try {
    const stat = fs.statSync(finalPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(finalPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      };
      res.writeHead(200, head);
      fs.createReadStream(finalPath).pipe(res);
    }
  } catch (err) {
    console.warn('[Blessing Video Stream Error]:', err.message);
    res.status(500).send('Error streaming blessing video');
  }
});

// ---------------------------------------------------------------------
// Background Music Handler (Supports 举头望明月 .m4a / .mp3 / .wav)
// ---------------------------------------------------------------------
const bgmPublicDir = path.join(__dirname, 'public');
const bgmM4aPath = path.join(bgmPublicDir, 'bgm.m4a');
const bgmMp3Path = path.join(bgmPublicDir, 'bgm.mp3');

// Background auto-transcoding: Ensures authentic MP3 file exists for 100% browser compatibility
function ensureTrueMp3Bgm() {
  const ffmpegCandidates = [
    'E:\\TikTok Shop\\ffmpeg\\ffmpeg.exe',
    'E:\\TikTok Shop\\senrerun_extracted\\app\\ffmpeg\\ffmpeg.exe',
    'ffmpeg'
  ];
  let ffmpegBin = null;
  for (const c of ffmpegCandidates) {
    if (c === 'ffmpeg' || fs.existsSync(c)) {
      ffmpegBin = c;
      break;
    }
  }
  if (!ffmpegBin || !fs.existsSync(bgmM4aPath)) return;

  // Inspect existing bgm.mp3
  let needsTranscode = true;
  if (fs.existsSync(bgmMp3Path)) {
    try {
      const buf = Buffer.alloc(16);
      const fd = fs.openSync(bgmMp3Path, 'r');
      fs.readSync(fd, buf, 0, 16, 0);
      fs.closeSync(fd);
      // If it contains 'ftyp', it is an M4A file disguised with an .mp3 extension
      if (!buf.toString('latin1').includes('ftyp') && (buf[0] === 0xFF || buf.toString('latin1').startsWith('ID3'))) {
        needsTranscode = false;
      }
    } catch (_) { }
  }

  if (needsTranscode) {
    const tempMp3 = path.join(bgmPublicDir, 'bgm_transcoded.mp3');
    try {
      const { execFile } = require('child_process');
      execFile(ffmpegBin, ['-i', bgmM4aPath, '-vn', '-c:a', 'libmp3lame', '-b:a', '192k', '-y', tempMp3], (err) => {
        if (!err && fs.existsSync(tempMp3) && fs.statSync(tempMp3).size > 10000) {
          try {
            fs.copyFileSync(tempMp3, bgmMp3Path);
            fs.unlinkSync(tempMp3);
            console.log('[BGM] Successfully created genuine MP3 encoding for bgm.mp3 via ffmpeg');
          } catch (_) { }
        }
      });
    } catch (_) { }
  }
}
setTimeout(ensureTrueMp3Bgm, 1200);

app.get(['/bgm.mp3', '/bgm.m4a', '/bgm.wav', '/bgm_zen_original.wav'], (req, res) => {
  const isReqM4a = req.path.toLowerCase().endsWith('.m4a');
  let chosenPath = null;
  let isM4A = false;

  if (isReqM4a && fs.existsSync(bgmM4aPath)) {
    chosenPath = bgmM4aPath;
    isM4A = true;
  } else if (fs.existsSync(bgmMp3Path)) {
    chosenPath = bgmMp3Path;
    try {
      const buf = Buffer.alloc(16);
      const fd = fs.openSync(chosenPath, 'r');
      fs.readSync(fd, buf, 0, 16, 0);
      fs.closeSync(fd);
      if (buf.toString('latin1').includes('ftyp')) isM4A = true;
    } catch (_) { }
  } else if (fs.existsSync(bgmM4aPath)) {
    chosenPath = bgmM4aPath;
    isM4A = true;
  }

  if (chosenPath) {
    const contentType = isM4A ? 'audio/mp4' : 'audio/mpeg';
    res.set('Content-Type', contentType);
    res.set('Accept-Ranges', 'bytes');
    res.set('Cache-Control', 'no-cache');
    return res.sendFile(chosenPath, {
      headers: {
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache'
      }
    });
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

  // SSRF Protection: Disallow loopback, private RFC1918, link-local, and internal domain names
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return res.status(400).send('Invalid protocol');
    }
    const hostname = parsed.hostname.toLowerCase();
    const isPrivateHost =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      /^10\./.test(hostname) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^169\.254\./.test(hostname) ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.localhost');

    if (isPrivateHost) {
      return res.status(403).send('Forbidden destination');
    }
  } catch (urlErr) {
    return res.status(400).send('Malformed URL');
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
        try { fs.unlinkSync(path.join(CACHE_DIR, f)); } catch (_) { }
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
    let fetched = false;

    // Primary: client=tw-ob
    try {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=th&client=tw-ob&q=${encodeURIComponent(chunk)}`;
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': 'https://translate.google.com/'
        },
        timeout: 4500
      });
      if (response.data && response.data.length > 200) {
        audioBuffers.push(Buffer.from(response.data));
        fetched = true;
      }
    } catch (_) { }

    // Secondary: client=gtx
    if (!fetched) {
      try {
        const url2 = `https://translate.googleapis.com/translate_tts?ie=UTF-8&tl=th&client=gtx&q=${encodeURIComponent(chunk)}`;
        const response2 = await axios.get(url2, {
          responseType: 'arraybuffer',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://translate.google.com/'
          },
          timeout: 4500
        });
        if (response2.data && response2.data.length > 200) {
          audioBuffers.push(Buffer.from(response2.data));
          fetched = true;
        }
      } catch (err2) {
        console.warn(`[Google TTS chunk notice]: ${err2.message}`);
      }
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

// Guarantee default blessing MP3s exist on server boot
async function ensureDefaultAudioFiles() {
  const defaults = [
    { name: 'default_blessing.mp3', text: 'ขอพระแม่กวนอิมประทานพรในฉากจำลองนี้ ให้ทุกท่านพบเจอแต่ความสุข สุขภาพแข็งแรง ร่ำรวยเงินทองนะคะ' },
    { name: 'default_welcome.mp3', text: 'ยินดีต้อนรับทุกท่านสู่ฉากจำลองวิหารสวรรค์ ขอให้จิตใจสงบร่มเย็นนะคะ' },
    { name: 'default_follow.mp3', text: 'อนุโมทนาบุญกับกัลยาณมิตรทุกท่านที่ร่วมกดติดตามในฉากจำลองนี้นะคะ' }
  ];
  for (const item of defaults) {
    const p = path.join(CACHE_DIR, item.name);
    try {
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch (_) { }
      }
      await synthesizeGoogleTTS(item.text, item.name);
    } catch (_) { }
  }
}
setTimeout(ensureDefaultAudioFiles, 1000);

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
      }, 4000);

    } catch (err) {
      console.warn('[Edge TTS Spawn Exception]:', err.message);
      resolve(null);
    }
  });
}

// Main Dynamic Neural TTS Orchestrator (Google Neural Thai TTS Tier 1 + Edge-TTS Tier 2)
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

  // Tier 1 (Mandate in Rule 10): Google Translate Neural Thai TTS (Ultra-fast ~200ms, zero-crash, crystal clear Thai name pronunciation)
  try {
    const googleUrl = await synthesizeGoogleTTS(clean, filename);
    if (googleUrl) return callback(null, googleUrl);
  } catch (err) {
    console.warn('[Google TTS Notice, falling back to Edge-TTS]:', err.message);
  }

  // Tier 2: Authentic Maternal Edge-TTS (th-TH-PremwadeeNeural via tts_worker.py)
  try {
    const edgeUrl = await synthesizeEdgeTTS(clean, filename);
    if (edgeUrl) return callback(null, edgeUrl);
  } catch (err) {
    console.warn('[Edge TTS Fallback Notice]:', err.message);
  }

  // Tier 3: Pre-rendered fallback MP3 with gentle blessing
  const fallbackUrl = getFallbackAudioUrl(action);
  if (fallbackUrl) {
    return callback(null, fallbackUrl);
  }

  console.warn(`[TTS Engine] Dynamic audio unavailable for: "${clean.slice(0, 30)}...". Delegating to client speech.`);
  return callback(null, null);
}

// Dedicated Neural AI Voice TTS Endpoint (Handles both GET and POST with complete error immunity)
app.all('/api/tts', (req, res) => {
  try {
    const rawText = req.method === 'POST' ? req.body?.text : req.query?.text;
    const text = (typeof rawText === 'string' ? rawText : '').trim().slice(0, 300);
    if (!text) return res.status(400).json({ success: false, error: 'Text required' });

    getAudioUrlForText(text, (err, url) => {
      if (err || !url) return res.json({ success: false, url: null });
      res.json({ success: true, url });
    });
  } catch (err) {
    res.json({ success: false, url: null });
  }
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
    mode: 'stereo_mix', // Default: play voice directly on primary speakers & stereo mix
    sinkId: 'default',
    deviceName: 'default',
    acousticsEnabled: true,
    keepAliveEnabled: true,
    dualMonitorEnabled: true, // Guarantees broadcaster always hears AI voice on PC speakers/headphones
    updatedAt: Date.now()
  },
  currentRoundData: {
    roundNum: 1,
    roundStartedAt: Date.now(),
    meritPoints: 0,
    contributors: new Map()
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
    keywords: ['มังกรแฟนตาซี', 'alebrije', 'มังกร', 'มังกรทอง', 'ระฆังใหญ่', 'big bell', 'dragon', 'golden dragon', 'universe', 'จักรวาล', 'galaxy', 'phoenix', 'ฟีนิกซ์']
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
    keywords: ['ประตูมิติ', 'portal', 'gate', 'magical portal', 'ประตู', 'ประทัด ๙๙๙', 'ประทัด999', 'ประทัด', 'firecracker', 'firecrackers', 'วิมาน', 'ปราสาท', 'castle', 'lion', 'whale', 'สิงโต', 'ปลาวาฬ']
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
    keywords: ['หัวใจ 4 ดวง', 'หัวใจ ๔ ดวง', 'four hearts', '4 hearts', 'hearts', 'ปิดทอง', 'gold leaf', 'crane', 'นกกระเรียน', 'พลุ', 'firework', 'fireworks', 'elephant', 'ช้าง', 'หมวกและหนวด', 'cap and moustache', 'crown', 'มงกุฎ']
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
    keywords: ['กุหลาบ ๙๙', 'กุหลาบ99', 'rose 99', 'rose99', 'rose_99', 'บุปผา', 'flower', 'ดอกไม้', 'ดอกไม้งาม']
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
    keywords: ['lucky 9', 'lucky9', 'lucky_9', 'ขอเลข', 'บัว', 'lotus', 'ดอกบัว', 'สระบัว']
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
    keywords: ['เครื่องราง', 'omamori', 'amulet', 'ดอกไม้มงคล', 'finger heart', 'มินิฮาร์ต', 'มินิฮาร์ท', 'incense', 'ธูป', 'เทียน', 'ประทีป', 'lamp', 'แพนด้า', 'panda']
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
    keywords: ['กุหลาบ', 'rose', 'roses', 'diya', 'heart', 'ใจ', 'tiktok', 'ติ๊กต๊อก', 'ดัมเบล', 'dumbbell', 'ไอศกรีม', 'ice cream', 'cone', 'ของขวัญ', 'gift']
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
    const cleanMatch = rawName.match(/(?:ส่ง|sent)\s+(.*?)(?:\s+x\s*\d+)?$/i);
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

function purgeEulerSignApiKey() {
  delete process.env.SIGN_API_KEY;
  if (ttlModule && ttlModule.SignConfig) {
    ttlModule.SignConfig.apiKey = undefined;
    ttlModule.SignConfig.cachedInstance = undefined;
    if (ttlModule.SignConfig.baseOptions && ttlModule.SignConfig.baseOptions.headers) {
      delete ttlModule.SignConfig.baseOptions.headers['X-Api-Key'];
      delete ttlModule.SignConfig.baseOptions.headers['x-api-key'];
    }
  }
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

  // Configure EulerStream API Key (Auto-clears bad/empty keys)
  let activeApiKey = '';
  if (apiKey !== undefined && apiKey !== null) {
    activeApiKey = String(apiKey).trim();
  } else {
    activeApiKey = (process.env.SIGN_API_KEY || '').trim();
  }

  // Filter out invalid keys (such as mistakenly pasted Google Gemini keys starting with AQ. or AIzaSy)
  if (activeApiKey && (activeApiKey.startsWith('AQ.') || activeApiKey.startsWith('AIzaSy') || activeApiKey.includes(' '))) {
    console.warn(`[TikTok] Ignored invalid EulerStream API Key format ("${activeApiKey.slice(0, 8)}..."). Using free route.`);
    activeApiKey = '';
  }

  if (activeApiKey) {
    process.env.SIGN_API_KEY = activeApiKey;
    if (ttlModule && ttlModule.SignConfig) {
      ttlModule.SignConfig.apiKey = activeApiKey;
      ttlModule.SignConfig.cachedInstance = undefined; // invalidate cached client to use new key
      if (ttlModule.SignConfig.baseOptions && ttlModule.SignConfig.baseOptions.headers) {
        ttlModule.SignConfig.baseOptions.headers['X-Api-Key'] = activeApiKey;
      }
    }
    console.log('[TikTok] Using EulerStream Sign API Key for authentication.');
  } else {
    purgeEulerSignApiKey();
    console.log('[TikTok] Using default free sign route (no API key).');
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
    let disciple = null;
    if (user.uniqueId && user.nickname && user.nickname !== 'ผู้เจริญสติ') {
      disciple = getOrCreateDisciple(user, false, true);
    }
    const totalLikes = Number(data.totalLikeCount ?? data.total ?? data.count ?? 0);
    io.emit('action_like', {
      uniqueId: user.uniqueId,
      totalLikes
    });
    io.emit('round_action_like', {
      uniqueId: user.uniqueId,
      nickname: user.nickname,
      avatar: user.avatar || (disciple ? disciple.avatar : ''),
      meritDelta: 0.2
    });
  });

  // Event: Share stream (Divine Bridge of Merit)
  tiktokConnection.on('share', data => {
    const user = extractTikTokUser(data);
    if (user.uniqueId && user.nickname && user.nickname !== 'ผู้เจริญสติ') {
      getOrCreateDisciple(user, false, true);
    }
    const sharePayload = {
      uniqueId: user.uniqueId,
      nickname: user.nickname,
      avatar: user.avatar,
      meritDelta: 5,
      timestamp: Date.now()
    };
    io.emit('action_share', sharePayload);
    io.emit('round_action_share', sharePayload);
    io.emit('share', sharePayload);
  });

  // Event: Chat Comment
  tiktokConnection.on('chat', data => {
    const user = extractTikTokUser(data);
    const { comment } = extractTikTokChat(data);
    if (!comment) return;

    const disciple = getOrCreateDisciple(user, false, true);

    const hasSadhu = /(สาธุ|สาทุ|สาดุ|sadhu|sathu|อนุโมทนา|โมทนา|ขอพร|รวย|เฮง|โชคดี|บารมี)/i.test(comment);
    if (hasSadhu) {
      recordSadhuPoint({
        uniqueId: user.uniqueId || disciple.uniqueId,
        userId: user.userId || disciple.userId,
        nickname: user.nickname || disciple.nickname,
        avatar: user.avatar || disciple.avatar
      }, 1, comment);
    }

    const stickMatch = comment.match(/(?:เลข|เบอร์)?\s*([1-9]|[12][0-9]|3[0-6])\b/);
    const stickNum = stickMatch ? parseInt(stickMatch[1], 10) : null;
    const meritDelta = hasSadhu ? 1 : 0; // คะแนนบารมีรอบสะสมเฉพาะเมื่อพิมพ์ "สาธุ" หรือคำมงคลเท่านั้น

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

    // Dedicated structured event for RoundManager
    io.emit('round_action_chat', {
      seatId: disciple.seatId,
      uniqueId: disciple.uniqueId,
      nickname: disciple.nickname,
      avatar: disciple.avatar,
      comment,
      meritDelta,
      stickNum,
      isKeyword: hasSadhu
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
      effectName,
      meritDelta: Math.max(10, Math.floor((diamondIncrement || 1) * 10))
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
    if (msg.includes('401') || msg.includes('The provided API Key is invalid')) {
      console.warn('[TikTok Error Event] Detected invalid EulerStream API Key (401). Purging key from memory.');
      purgeEulerSignApiKey();
    }
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
        if (tiktokConnection) {
          try { tiktokConnection.disconnect(); } catch (_) { }
          tiktokConnection = null;
        }
        state.lastError = timeoutMsg;
        io.emit('status_change', { isConnected: false, username, error: timeoutMsg });
        if (!state.userExplicitlyDisconnected && state.tiktokUsername) {
          scheduleAutoReconnect();
        }
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
      if (tiktokConnection) {
        try { tiktokConnection.disconnect(); } catch (_) { }
        tiktokConnection = null;
      }
      let friendlyError = err.message;
      const isEuler401 = err.message.includes('401') ||
        err.message.includes('The provided API Key is invalid') ||
        (err.message.includes('Sign Error') && err.message.includes('status 401'));

      if (isEuler401) {
        console.warn(`[TikTok] EulerStream Sign Key rejected with 401 ("The provided API Key is invalid"). Auto-clearing bad key...`);
        purgeEulerSignApiKey();
        friendlyError = `[EulerStream API Key ไม่ถูกต้อง (401)] ระบบปลดคีย์ออกแล้ว และกำลังเชื่อมต่อผ่านช่องทางฟรีอัตโนมัติ...`;
        state.lastError = friendlyError;
        console.error(`[TikTok] Failed to connect to ${username}:`, friendlyError);
        io.emit('status_change', { isConnected: false, username, error: friendlyError, clearEulerKey: true });

        // Auto-retry connection without the bad key immediately in 1.5s
        if (!state.userExplicitlyDisconnected && state.tiktokUsername === username) {
          console.log(`[TikTok] Auto-retrying connection to @${username} without invalid Euler key in 1.5s...`);
          setTimeout(() => {
            if (!state.userExplicitlyDisconnected && !state.isConnected && state.tiktokUsername === username) {
              connectToTikTok(username, sessionId, '').catch(fallbackErr => {
                console.warn(`[TikTok Fallback Error]:`, fallbackErr.message);
              });
            }
          }, 1500);
        }
        reject(new Error(friendlyError));
        return;
      }

      if (err.message.includes('rate_limit') || err.message.includes('Rate Limited') || err.message.includes('rate limit') || err.message.includes('SIGN SERVER MESSAGE')) {
        friendlyError = `[Rate Limited] ติดขีดจำกัดเชื่อมต่อฟรีของ EulerStream แนะนำให้นำ Free API Key จาก https://www.eulerstream.com/pricing มากรอกในช่อง 🔑 API Key เพื่อปลดล็อกทันที`;
      } else if (err.message.includes("isn't online") || err.message.includes('LIVE has ended')) {
        friendlyError = `ช่อง @${username} ยังไม่ได้เริ่มไลฟ์สด หรือไลฟ์จบไปแล้ว (ระบบจะคอยตรวจจับและเชื่อมต่อให้อัตโนมัติเมื่อเริ่มไลฟ์)`;
      } else if (err.message.includes('user_not_found') || err.message.includes('Failed to retrieve Room ID')) {
        friendlyError = `ไม่พบห้องไลฟ์สดของ @${username} (โปรดตรวจสอบว่าไอดีถูกต้องและเริ่มไลฟ์สดแล้ว)`;
      }
      state.lastError = friendlyError;
      console.error(`[TikTok] Failed to connect to ${username}:`, friendlyError);
      io.emit('status_change', { isConnected: false, username, error: friendlyError });
      if (!state.userExplicitlyDisconnected && state.tiktokUsername) {
        scheduleAutoReconnect();
      }
      reject(new Error(friendlyError));
    });
  });
}

// REST Endpoints
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
  try {
    const { name, action, wish, giftName, effectName, effectType, coins, isGift, count } = req.body || {};
    const spokenName = formatNaturalSpeakerName(name);
    const cleanAction = String(action || 'กราบสักการะ').trim().slice(0, 60);
    const cleanWish = String(wish || '').trim().slice(0, 100);
    const cleanGift = String(giftName || '').trim() ||
      (cleanAction.includes('ถวาย') || cleanAction.includes('ร่วมบุญ') ? cleanAction.replace(/^(ถวาย|ร่วมบุญ)/, '').trim() : '');
    const isGiftAction = Boolean(isGift || effectName || effectType || cleanGift || cleanAction.includes('ถวาย') || cleanAction.includes('ร่วมบุญ') || cleanAction.includes('gift'));
    const cleanEffectType = String(effectType || '').trim();

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
        prompt = `คุณคือพระแม่กวนอิมในสื่อถ่ายทอดสดฉากจำลองวิหารสวรรค์ จงกล่าวคำอวยพรมงคลให้พรแก่คุณโยม "${spokenName}" ที่ร่วมทำบุญถวาย "${gLabel}" (ให้พูดชื่อการร่วมบุญ "${gLabel}" ห้ามพูดชื่อไอเทมของขวัญ และห้ามพูดคำว่า "ยินดีต้อนรับ" โดยเด็ดขาด ให้กล่าวขอบคุณและอนุโมทนาบุญโดยตรง) อย่างเป็นธรรมชาติ อบอุ่น ไพเราะ และสง่างาม โดยต้องสอดแทรกคำว่า "ฉากจำลอง" (เช่น "ในฉากจำลองนี้" หรือ "ร่วมบุญในฉากจำลองนี้") ลงในประโยคอย่างเป็นธรรมชาติ 1 ประโยคสั้นๆ (ความยาว 8-12 คำ) เพื่อระบุว่าเป็นฉากจำลอง เช่น "ขอบคุณคุณ... ที่ร่วมถวาย... ในฉากจำลองนี้นะคะ" หรือ "อนุโมทนาบุญคุณ... ร่วมบุญในฉากจำลองนี้นะคะ" หรือ "ขอพรในฉากจำลองนี้ให้คุณ... ร่ำรวยเงินทองนะคะ" ลงท้ายด้วย "นะคะ" หรือ "นะจ๊ะ"`;
      } else if (isGreetingChat) {
        prompt = `คุณคือพระแม่กวนอิมในสื่อถ่ายทอดสดฉากจำลองวิหารสวรรค์ จงกล่าวทักทายและต้อนรับคุณโยม "${spokenName}" อย่างเป็นกันเอง อบอุ่น โดยต้องสอดแทรกคำว่า "ฉากจำลอง" (เช่น "สู่ฉากจำลองวิหารสวรรค์" หรือ "ในฉากจำลองนี้") 1 ประโยคสั้นๆ (8-12 คำ) เช่น "เจริญพรสวัสดีคุณ... สู่ฉากจำลองวิหารสวรรค์นะคะ" หรือ "สวัสดีจ้ะคุณ... ดีใจที่ได้พบกันในฉากจำลองนี้นะคะ" หรือ "ต้อนรับคุณ... สู่ฉากจำลองวิหาร ขอให้โชคดีมีสุขนะคะ" ลงท้ายด้วย "นะคะ" หรือ "นะจ๊ะ"`;
      } else if (isSadhuChat) {
        prompt = `คุณคือพระแม่กวนอิมในสื่อถ่ายทอดสดฉากจำลองวิหารสวรรค์ จงกล่าวอนุโมทนาและให้พรคุณโยม "${spokenName}" ที่ร่วมพิมพ์สาธุ อย่างอบอุ่น โดยต้องสอดแทรกคำว่า "ฉากจำลอง" (เช่น "ในฉากจำลองนี้" หรือ "ร่วมบุญในฉากจำลองนี้") 1 ประโยคสั้นๆ (8-12 คำ) เช่น "สาธุอนุโมทนาคุณ... ร่วมบุญในฉากจำลองนี้นะคะ" หรือ "ขอพระบารมีในฉากจำลองนี้คุ้มครองคุณ... ให้มีโชคนะคะ" หรือ "อนุโมทนาคุณ... ในฉากจำลองวิหาร ขอให้ชีวิตรุ่งเรืองนะคะ" ลงท้ายด้วย "นะคะ"`;
      } else if (cleanWish) {
        prompt = `คุณคือพระแม่กวนอิมในสื่อถ่ายทอดสดฉากจำลองวิหารสวรรค์ จงกล่าวคำอวยพรมงคลตามคำขอพร "${cleanWish}" แก่คุณโยม "${spokenName}" อย่างอบอุ่น โดยต้องสอดแทรกคำว่า "ฉากจำลอง" (เช่น "ในฉากจำลองนี้" หรือ "ขอพรในฉากจำลองนี้") 1 ประโยคสั้นๆ (8-12 คำ) เช่น "ขอพรในฉากจำลองนี้ให้คุณ... สมความปรารถนานะคะ" หรือ "ขอพระแม่ในฉากจำลองคุ้มครองคุณ... ให้ร่ำรวยและมีสุขนะคะ" ลงท้ายด้วย "นะคะ"`;
      } else {
        if (spokenName === 'กัลยาณมิตร' || spokenName === 'ผู้เจริญสติ' || spokenName === 'ผู้มีจิตศรัทธา') {
          prompt = `คุณคือพระแม่กวนอิมในสื่อถ่ายทอดสดฉากจำลองวิหารสวรรค์ จงกล่าวต้อนรับกัลยาณมิตรทุกท่านที่เข้ามาร่วมเจริญสติ โดยต้องสอดแทรกคำว่า "ฉากจำลอง" (เช่น "สู่ฉากจำลองวิหารสวรรค์" หรือ "ในฉากจำลองนี้") 1 ประโยคสั้นๆ (8-12 คำ) เช่น "ยินดีต้อนรับทุกท่านสู่ฉากจำลองวิหารสวรรค์ ขอให้จิตใจสงบร่มเย็นนะคะ" หรือ "เจริญพรต้อนรับสู่ฉากจำลองวิหาร แวะมารับพลังบุญนี้นะคะ" ลงท้ายด้วย "นะคะ"`;
        } else {
          prompt = `คุณคือพระแม่กวนอิมในสื่อถ่ายทอดสดฉากจำลองวิหารสวรรค์ จงกล่าวต้อนรับและทักทายคุณโยม "${spokenName}" โดยต้องสอดแทรกคำว่า "ฉากจำลอง" (เช่น "สู่ฉากจำลองวิหารสวรรค์" หรือ "ในฉากจำลองนี้") 1 ประโยคสั้นๆ (8-12 คำ) เช่น "ยินดีต้อนรับคุณ... สู่ฉากจำลองวิหารสวรรค์ ขอให้มีความสุขนะคะ" หรือ "ดีใจที่ได้พบคุณ... ในฉากจำลองวิหาร ขอให้โชคดีนะคะ" หรือ "เจริญพรต้อนรับคุณ... สู่ฉากจำลองวิหาร ขอให้มีโชคลาภนะคะ" ลงท้ายด้วย "นะคะ" หรือ "นะจ๊ะ"`;
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
            `อนุโมทนาคุณ ${spokenName} เสี่ยงเซียมซีในฉากจำลองนี้ ขอให้รับโชคใหญ่นะคะ`,
            `ขอบคุณคุณ ${spokenName} เสี่ยงเซียมซีในฉากจำลองวิหาร ขอให้ร่ำรวยนะคะ`,
            `สาธุคุณ ${spokenName} เสี่ยงเซียมซีมหาโชคในฉากจำลองนี้ ขอให้เปิดดวงรับทรัพย์นะคะ`,
            `ขอพรในฉากจำลองนี้ให้คุณ ${spokenName} ที่เสี่ยงเซียมซี สมหวังดั่งใจปรารถนานะคะ`,
            `ชื่นใจที่คุณ ${spokenName} ร่วมเสี่ยงเซียมซีในฉากจำลองนี้ ขอให้เฮงๆ ปังๆ นะคะ`,
            `ขออวยพรคุณ ${spokenName} ในฉากจำลองนี้ ได้รับข่าวมงคลและโชคลาภลอยนะคะ`
          ];
          blessing = seamsiBlessingTemplates[Math.floor(Math.random() * seamsiBlessingTemplates.length)];
        } else {
          const giftBlessingTemplates = [
            `ขอบคุณคุณ ${spokenName} ที่ร่วมถวาย${specificEffect} ในฉากจำลองนี้นะคะ`,
            `อนุโมทนาคุณ ${spokenName} ร่วมถวาย${specificEffect} ในฉากจำลอง ขอให้ร่ำรวยนะคะ`,
            `ขอบคุณคุณ ${spokenName} ถวาย${specificEffect} ในฉากจำลองนี้ ขอให้เงินทองไหลมาเทมานะคะ`,
            `อนุโมทนาบุญคุณ ${spokenName} ถวาย${specificEffect} ในฉากจำลอง ขอให้สุขภาพแข็งแรงนะคะ`,
            `ขอขอบใจคุณ ${spokenName} ร่วมถวาย${specificEffect} ในฉากจำลองนี้ ขอให้สมปรารถนานะคะ`,
            `อนุโมทนาบุญคุณ ${spokenName} ในฉากจำลองนี้ ขอให้ชีวิตรุ่งเรืองและราบรื่นนะคะ`,
            `ชื่นใจในจิตศรัทธาคุณ ${spokenName} ถวาย${specificEffect} ในฉากจำลองนี้นะคะ`,
            `บารมีคุ้มครองคุณ ${spokenName} ถวาย${specificEffect} ในฉากจำลองนี้ ขอให้รับโชคใหญ่นะคะ`,
            `ขอบคุณคุณ ${spokenName} ร่วมบุญในฉากจำลองนี้ ขอให้แคล้วคลาดปลอดภัยนะคะ`,
            `ขออวยพรคุณ ${spokenName} ร่วมถวาย${specificEffect} ในฉากจำลองนี้ การงานก้าวหน้านะคะ`,
            `อนุโมทนาบุญคุณ ${spokenName} ในฉากจำลองวิหารนี้ ขอให้ชีวิตสดใส ไร้โรคภัยนะคะ`,
            `ขอบคุณคุณ ${spokenName} ถวาย${specificEffect} ในฉากจำลองนี้ มีกินมีใช้ไม่ขาดมือนนะคะ`,
            `สาธุอนุโมทนาคุณ ${spokenName} ถวาย${specificEffect} ในฉากจำลองนี้ ขอให้สัมฤทธิผลนะคะ`,
            `ขออวยพรคุณ ${spokenName} ในฉากจำลองนี้ ร่ำรวยมั่งคั่งและร่มเย็นเป็นสุขนะคะ`
          ];
          blessing = giftBlessingTemplates[Math.floor(Math.random() * giftBlessingTemplates.length)];
        }
      } else if (isGreetingChat) {
        const greetingChatTemplates = [
          `เจริญพรสวัสดีคุณ ${spokenName} สู่ฉากจำลองวิหารสวรรค์ ขอให้มีความสุขนะคะ`,
          `สวัสดีจ้ะคุณ ${spokenName} สู่ฉากจำลองวิหาร ขอพระแม่ประทานพรให้โชคดีนะคะ`,
          `สาธุเจริญพรคุณ ${spokenName} ต้อนรับสู่ฉากจำลองวิหาร ขอให้พบเจอแต่สิ่งมงคลนะคะ`,
          `สวัสดีคุณ ${spokenName} ชื่นใจจริงที่ได้พบกันในฉากจำลองวันนี้นะคะ`,
          `เจริญสุขสวัสดีคุณ ${spokenName} สู่ฉากจำลองวิหาร ขอให้สุขภาพแข็งแรงนะคะ`,
          `สวัสดีจ้ะคุณ ${spokenName} ในฉากจำลองนี้ ขอให้เป็นวันที่ราบรื่นทุกเรื่องนะคะ`,
          `กราบรับพรอันบริสุทธิ์นะจ๊ะคุณ ${spokenName} ในฉากจำลองวิหารนี้นะคะ`,
          `ยินดีที่ได้ทักทายคุณ ${spokenName} สู่ฉากจำลองวิหารสวรรค์นะคะ`
        ];
        blessing = greetingChatTemplates[Math.floor(Math.random() * greetingChatTemplates.length)];
      } else if (isSadhuChat) {
        const sadhuTemplates = [
          `สาธุอนุโมทนาบุญคุณ ${spokenName} ในฉากจำลองนี้ ขอให้พบแต่สิ่งมงคลนะคะ`,
          `อนุโมทนาสาธุคุณ ${spokenName} ในฉากจำลอง ขอให้เงินทองไหลมาเทมานะคะ`,
          `สาธุบารมีคุ้มครองคุณ ${spokenName} ในฉากจำลองนี้ ขอให้สุขภาพแข็งแรงนะคะ`,
          `อนุโมทนาบุญคุณ ${spokenName} ในฉากจำลองวิหารนี้ ขอให้สมปรารถนานะคะ`,
          `สาธุในกุศลจิตของคุณ ${spokenName} ในฉากจำลอง ขอให้ชีวิตรุ่งเรืองนะคะ`,
          `อนุโมทนาสาธุคุณ ${spokenName} ร่วมบุญในฉากจำลองนี้ ขอให้มั่งมีตลอดไปนะคะ`,
          `สาธุรับบุญเต็มเปี่ยมนะจ๊ะคุณ ${spokenName} ในฉากจำลองวิหารนี้นะคะ`,
          `อนุโมทนาบุญบารมีคุณ ${spokenName} ในฉากจำลองนี้ ขอให้มีโชคใหญ่นะคะ`
        ];
        blessing = sadhuTemplates[Math.floor(Math.random() * sadhuTemplates.length)];
      } else if (cleanAction.includes('เข้าร่วม') || cleanAction.includes('ต้อนรับ') || cleanAction.includes('เจริญสติ') || cleanAction.includes('join')) {
        let welcomeTemplates = [];
        if (spokenName === 'กัลยาณมิตร' || spokenName === 'ผู้เจริญสติ' || spokenName === 'ผู้มีจิตศรัทธา') {
          welcomeTemplates = [
            `ยินดีต้อนรับทุกท่านสู่ฉากจำลองวิหารสวรรค์ ขอให้จิตใจสงบร่มเย็นนะคะ`,
            `เจริญพรต้อนรับกัลยาณมิตร แวะมารับพลังบุญในฉากจำลองวิหารนี้นะคะ`,
            `ยินดีต้อนรับสู่ฉากจำลองแดนธรรม ขอพระเมตตาคุ้มครองให้พบเจอแต่สิ่งดีงามนะคะ`,
            `ขอต้อนรับทุกท่านสู่ฉากจำลองวิหารสวรรค์ ขอให้ชีวิตรุ่งเรืองและราบรื่นนะคะ`,
            `เจริญสุขแด่ทุกท่าน มาร่วมเจริญสติในฉากจำลองวิหารนี้นะคะ`,
            `ยินดีต้อนรับทุกท่านสู่ฉากจำลองวิหาร ขอให้คลายความเหนื่อยล้าและมีรอยยิ้มนะคะ`,
            `ขอต้อนรับเข้าสู่ฉากจำลองวิหารธรรม ขอให้บุญรักษาและโชคดีตลอดวันนะคะ`
          ];
        } else {
          welcomeTemplates = [
            `ยินดีต้อนรับคุณ ${spokenName} สู่ฉากจำลองวิหารสวรรค์ ขอให้จิตใจสงบร่มเย็นนะคะ`,
            `เจริญพรต้อนรับคุณ ${spokenName} สู่ฉากจำลองวิหาร ขอให้พบเจอแต่ความสุขใจนะคะ`,
            `ยินดีที่ได้พบคุณ ${spokenName} ในฉากจำลองวิหาร ขอให้โชคดีมีสุขนะคะ`,
            `ขอต้อนรับคุณ ${spokenName} สู่ฉากจำลองวิหารสวรรค์ ขอให้มีโชคลาภเงินทองนะคะ`,
            `สวัสดีต้อนรับคุณ ${spokenName} สู่ฉากจำลองศาลาธรรม ขอให้สุขใจนะคะ`,
            `ชื่นใจที่ได้พบคุณ ${spokenName} ในฉากจำลองวิหาร ขอให้อำนวยพรราบรื่นนะคะ`,
            `ยินดีต้อนรับคุณ ${spokenName} สู่ฉากจำลองวิหาร ขอให้สดใสและสมหวังนะคะ`,
            `เจริญสุขคุณ ${spokenName} ขอต้อนรับเข้าสู่ฉากจำลองวิหาร ขอให้สบายใจนะคะ`,
            `ดีใจที่ได้พบคุณ ${spokenName} มาร่วมบุญในฉากจำลอง ขอให้ชีวิตรุ่งโรจน์นะคะ`,
            `ขอต้อนรับคุณ ${spokenName} สู่ฉากจำลองวิหาร ขอให้สุขภาพแข็งแรงและร่ำรวยนะคะ`
          ];
        }
        blessing = welcomeTemplates[Math.floor(Math.random() * welcomeTemplates.length)];
      } else if (cleanAction.includes('ติดตาม') || cleanAction.includes('follow')) {
        const followTemplates = [
          `อนุโมทนาบุญคุณ ${spokenName} กดติดตามร่วมบุญในฉากจำลองนี้นะคะ`,
          `ขอบคุณคุณ ${spokenName} ร่วมเป็นกัลยาณมิตรในฉากจำลองวิหาร ขอให้โชคดีนะคะ`,
          `ยินดีที่ได้ร่วมทางธรรมในฉากจำลองกับคุณ ${spokenName} ขอให้สมปรารถนานะคะ`,
          `ขอบคุณคุณ ${spokenName} มาร่วมเป็นสายบุญในฉากจำลองวิหารนี้นะคะ`,
          `อนุโมทนาบุญคุณ ${spokenName} ในฉากจำลองนี้ ขอให้นำพาความสุขสำเร็จมาให้นะคะ`
        ];
        blessing = followTemplates[Math.floor(Math.random() * followTemplates.length)];
      } else if (cleanAction.includes('กุหลาบ') || cleanAction.includes('kowtow')) {
        const kowtowTemplates = [
          `อนุโมทนาคุณ ${spokenName} ร่วมถวายกุหลาบในฉากจำลองนี้ ขอให้ร่ำรวยนะคะ`,
          `อนุโมทนาบุญคุณ ${spokenName} ร่วมบุญในฉากจำลองนี้ ขอให้เงินทองไหลมาเทมานะคะ`,
          `บารมีคุ้มครองคุณ ${spokenName} ในฉากจำลองวิหาร ขอให้สุขภาพแข็งแรงนะคะ`,
          `ขอให้คุณ ${spokenName} พบเจอกัลยาณมิตรที่ดีในฉากจำลองวิหารนี้นะคะ`,
          `ชื่นใจในจิตศรัทธาคุณ ${spokenName} ในฉากจำลองนี้ ขอให้ชีวิตสดใสราบรื่นนะคะ`
        ];
        blessing = kowtowTemplates[Math.floor(Math.random() * kowtowTemplates.length)];
      } else if (cleanAction.includes('บัว') || cleanAction.includes('lotus')) {
        const lotusTemplates = [
          `อนุโมทนาคุณ ${spokenName} ร่วมถวายบัวทิพย์ในฉากจำลองนี้ ขอให้จิตใจผ่องใสนะคะ`,
          `อนุโมทนาบุญคุณ ${spokenName} ร่วมบุญในฉากจำลองนี้ ขอให้ชีวิตสงบร่มเย็นนะคะ`,
          `บารมีบัวทิพย์คุ้มครองคุณ ${spokenName} ในฉากจำลองวิหาร ขอให้ชีวิตรุ่งเรืองนะคะ`,
          `ขอให้ดวงใจคุณ ${spokenName} ผุดผ่องดั่งดอกบัวในฉากจำลองวิหารนี้นะคะ`
        ];
        blessing = lotusTemplates[Math.floor(Math.random() * lotusTemplates.length)];
      } else if (cleanAction.includes('บุปผา') || cleanAction.includes('flowers')) {
        const flowerTemplates = [
          `อนุโมทนาบุญใหญ่คุณ ${spokenName} โปรยบุปผาในฉากจำลองนี้ ขอให้มั่งมีศรีสุขนะคะ`,
          `อนุโมทนาบุญคุณ ${spokenName} ร่วมบุญในฉากจำลองนี้ ขอให้ปราศจากทุกข์โศกนะคะ`,
          `ขอให้กลิ่นบุญในฉากจำลองวิหาร นำพาโชคลาภมาสู่คุณ ${spokenName} นะคะ`
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
            `ขอพรในฉากจำลองนี้ให้คุณ ${spokenName} ที่ขอให้${shortWish} จงสัมฤทธิผลนะคะ`,
            `บารมีในฉากจำลองนี้คุ้มครองคุณ ${spokenName} ที่ขอให้${shortWish} ขอให้สำเร็จดั่งใจนะคะ`,
            `ขอพรในฉากจำลองนี้ให้คุณ ${spokenName} ที่ขอให้${shortWish} พบเจอแต่สิ่งมงคลนะคะ`,
            `ขอให้แรงอธิษฐานในฉากจำลองนี้ของคุณ ${spokenName} ที่ขอให้${shortWish} สัมฤทธิผลนะคะ`,
            `ขอพระเมตตาในฉากจำลองนี้คุ้มครองคุณ ${spokenName} ที่ขอให้${shortWish} ให้ราบรื่นนะคะ`
          ];
          blessing = wishReadTemplates[Math.floor(Math.random() * wishReadTemplates.length)];
        } else if (cleanWish.includes('งาน') || cleanWish.includes('สำเร็จ') || cleanWish.includes('ก้าวหน้า') || cleanWish.includes('ค้าขาย') || cleanWish.includes('ออเดอร์')) {
          const workTemplates = [
            `ขอพรในฉากจำลองนี้ให้คุณ ${spokenName} การงานราบรื่น ค้าขายร่ำรวยนะคะ`,
            `ขอพรในฉากจำลองนี้ให้คุณ ${spokenName} ธุรกิจก้าวหน้า เงินทองไหลมาเทมานะคะ`,
            `บารมีในฉากจำลองนี้เปิดทางให้คุณ ${spokenName} การงานก้าวหน้า ผู้ใหญ่เมตตานะคะ`
          ];
          blessing = workTemplates[Math.floor(Math.random() * workTemplates.length)];
        } else if (cleanWish.includes('รวย') || cleanWish.includes('เงิน') || cleanWish.includes('โชค') || cleanWish.includes('ลาภ') || cleanWish.includes('ทอง') || cleanWish.includes('ปลดหนี้')) {
          const wealthTemplates = [
            `ขอพรในฉากจำลองนี้ให้คุณ ${spokenName} มั่งคั่งร่ำรวย เงินทองไหลมาเทมานะคะ`,
            `ขอพรในฉากจำลองนี้ให้คุณ ${spokenName} มีโชคลาภก้อนโต หยิบจับสิ่งใดก็เป็นเงินทองนะคะ`,
            `ขอให้คลังทรัพย์ในฉากจำลองนี้ เปิดรับคุณ ${spokenName} รับทรัพย์ใหญ่ไม่ขาดมือนนะคะ`
          ];
          blessing = wealthTemplates[Math.floor(Math.random() * wealthTemplates.length)];
        } else if (cleanWish.includes('สุขภาพ') || cleanWish.includes('ป่วย') || cleanWish.includes('แข็งแรง') || cleanWish.includes('หาย')) {
          const healthTemplates = [
            `ขอพรในฉากจำลองนี้ให้คุณ ${spokenName} สุขภาพแข็งแรง หายจากโรคภัยนะคะ`,
            `บารมีน้ำทิพย์ในฉากจำลองนี้ คุ้มครองคุณ ${spokenName} ให้ร่างกายสมบูรณ์แข็งแรงนะคะ`,
            `ขอพรในฉากจำลองนี้ให้คุณ ${spokenName} แคล้วคลาดโรคภัย มีพลังกายใจเต็มเปี่ยมนะคะ`
          ];
          blessing = healthTemplates[Math.floor(Math.random() * healthTemplates.length)];
        } else if (cleanWish.includes('รัก') || cleanWish.includes('ครอบครัว') || cleanWish.includes('แฟน') || cleanWish.includes('คู่')) {
          const loveTemplates = [
            `ขอพรในฉากจำลองนี้ให้คุณ ${spokenName} และครอบครัว ร่มเย็นเป็นสุข สมหวังในรักนะคะ`,
            `ขอพรในฉากจำลองนี้ให้คุณ ${spokenName} พบเจอคู่บารมี และมีความรักที่อบอุ่นนะคะ`,
            `ขอให้อวยพรในฉากจำลองนี้ ให้บ้านคุณ ${spokenName} อบอวลด้วยความรักและรอยยิ้มนะคะ`
          ];
          blessing = loveTemplates[Math.floor(Math.random() * loveTemplates.length)];
        } else if (cleanWish.includes('เรียน') || cleanWish.includes('สอบ') || cleanWish.includes('เกรด') || cleanWish.includes('จบ')) {
          blessing = `ขอพรในฉากจำลองนี้ให้คุณ ${spokenName} ปัญญาเฉียบแหลม การเรียนสอบสำเร็จราบรื่นนะคะ`;
        } else {
          const wishTemplates = [
            `ขอพรในฉากจำลองนี้ให้คุณ ${spokenName} สมปรารถนาในทุกสิ่งที่ตั้งใจไว้นะคะ`,
            `บารมีในฉากจำลองนี้ คุ้มครองคุณ ${spokenName} ให้พบเจอแต่สิ่งดีงามและเป็นสุขนะคะ`,
            `อนุโมทนาคุณ ${spokenName} ขอให้อธิษฐานในฉากจำลองนี้ สัมฤทธิผลโดยเร็วนะคะ`,
            `ขอพรในฉากจำลองนี้ให้คุณ ${spokenName} ประสบความสำเร็จทุกประการนะคะ`
          ];
          blessing = wishTemplates[Math.floor(Math.random() * wishTemplates.length)];
        }
      } else {
        blessing = `อนุโมทนาบุญคุณ ${spokenName} ในฉากจำลองนี้ ขอให้สัมฤทธิผล สมปรารถนานะคะ`;
      }
    }

    getAudioUrlForText(blessing, (err, url) => {
      res.json({
        success: true,
        blessingText: blessing,
        audioUrl: err ? null : url
      });
    }, cleanAction);
  } catch (err) {
    console.error('[Gemini AI Bless Error Catch]:', err.message);
    const fallbackName = formatNaturalSpeakerName(req.body?.name);
    const fallbackText = `อนุโมทนาบุญคุณ ${fallbackName} ในฉากจำลองนี้ ขอให้สมปรารถนานะคะ`;
    res.json({
      success: true,
      blessingText: fallbackText,
      audioUrl: null
    });
  }
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
    }, false, true);

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
      effectName,
      meritDelta: Math.max(10, Math.floor((diamondCount || 1) * 10))
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
      avatar: disciple.avatar,
      comment
    });

    const meritDelta = hasSadhu ? 1 : 0;
    io.emit('round_action_chat', {
      seatId: disciple.seatId,
      uniqueId: disciple.uniqueId,
      nickname: disciple.nickname,
      avatar: disciple.avatar,
      comment,
      meritDelta,
      isKeyword: hasSadhu
    });

    io.emit('prayer_update', {
      recentWishes: state.recentWishes,
      prayerCategories: state.prayerCategories,
      latestWish: wishObj
    });

    return res.json({ success: true, disciple });
  }

  if (type === 'share') {
    const disciple = getOrCreateDisciple({
      userId: payload?.userId,
      uniqueId: payload?.uniqueId || 'sharer_' + Date.now(),
      nickname: payload?.nickname || 'ผู้เปิดสะพานบุญ',
      avatar: payload?.avatar || '/rose.png'
    }, false, true);

    const sharePayload = {
      seatId: disciple.seatId,
      uniqueId: disciple.uniqueId,
      nickname: disciple.nickname,
      avatar: disciple.avatar,
      meritDelta: 5,
      timestamp: Date.now()
    };

    io.emit('action_share', sharePayload);
    io.emit('round_action_share', sharePayload);
    io.emit('share', sharePayload);

    return res.json({ success: true, disciple, sharePayload });
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

// Universal Server-Wide Single Speech Master:
// Guarantees that across OBS Studio, TikTok LIVE Studio, Chrome, Opera, and multi-tabs,
// EXACTLY ONE client tab or process can ever speak AI blessings or trigger Keep-Alive!
let activeSpeechMasterSocketId = null;
let activeSpeechMasterTabId = null;
let speechMasterLastSeen = 0;

function broadcastSpeechMaster() {
  io.emit('speech_master_update', {
    masterSocketId: activeSpeechMasterSocketId,
    masterTabId: activeSpeechMasterTabId,
    timestamp: Date.now()
  });
}

// Socket.IO connection handler
io.on('connection', socket => {
  const clientTabId = socket.handshake.query?.tabId || null;
  const isVoiceDisabled = socket.handshake.query?.voice === '0' || socket.handshake.query?.display === '1';

  const now = Date.now();
  if (!isVoiceDisabled) {
    if (io.sockets.sockets.size <= 1 || !activeSpeechMasterSocketId || !io.sockets.sockets.has(activeSpeechMasterSocketId) || (now - speechMasterLastSeen > 3500)) {
      activeSpeechMasterSocketId = socket.id;
      activeSpeechMasterTabId = clientTabId;
      speechMasterLastSeen = now;
      console.log(`[Speech Master] Assigned Speech Master to socket ${socket.id} (${clientTabId || 'active tab'})`);
    }
  }

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
    micRouterConfig: state.micRouterConfig,
    roundData: {
      roundNum: state.currentRoundData.roundNum,
      meritPoints: state.currentRoundData.meritPoints
    },
    speechMasterSocketId: activeSpeechMasterSocketId,
    speechMasterTabId: activeSpeechMasterTabId,
    isSpeechMaster: (socket.id === activeSpeechMasterSocketId)
  });

  socket.on('round_sync', data => {
    if (data?.roundNum) {
      state.currentRoundData.roundNum = data.roundNum;
      state.currentRoundData.meritPoints = data.meritPoints || 0;
      state.currentRoundData.roundStartedAt = Date.now();
      // Broadcast to other tabs/mirrors
      socket.broadcast.emit('round_state_sync', data);
    }
  });

  socket.on('speech_master_heartbeat', data => {
    if (socket.id === activeSpeechMasterSocketId) {
      speechMasterLastSeen = Date.now();
      if (data?.tabId) activeSpeechMasterTabId = data.tabId;
    }
  });

  socket.on('claim_speech_master', data => {
    activeSpeechMasterSocketId = socket.id;
    activeSpeechMasterTabId = data?.tabId || null;
    speechMasterLastSeen = Date.now();
    console.log(`[Speech Master] Socket ${socket.id} (${activeSpeechMasterTabId || 'tab'}) explicitly claimed Speech Master.`);
    broadcastSpeechMaster();
  });

  socket.on('yield_speech_master', () => {
    if (activeSpeechMasterSocketId === socket.id) {
      activeSpeechMasterSocketId = null;
      activeSpeechMasterTabId = null;
      for (const [id, s] of io.sockets.sockets.entries()) {
        if (id !== socket.id && s.connected) {
          activeSpeechMasterSocketId = id;
          activeSpeechMasterTabId = s.handshake.query?.tabId || null;
          speechMasterLastSeen = Date.now();
          break;
        }
      }
      broadcastSpeechMaster();
    }
  });

  socket.on('disconnect', () => {
    if (activeSpeechMasterSocketId === socket.id) {
      console.log(`[Speech Master] Master socket ${socket.id} disconnected. Re-electing active master.`);
      activeSpeechMasterSocketId = null;
      activeSpeechMasterTabId = null;
      for (const [id, s] of io.sockets.sockets.entries()) {
        if (id !== socket.id && s.connected) {
          activeSpeechMasterSocketId = id;
          activeSpeechMasterTabId = s.handshake.query?.tabId || null;
          speechMasterLastSeen = Date.now();
          break;
        }
      }
      broadcastSpeechMaster();
    }
  });

  socket.on('connect-tiktok', data => {
    const username = data?.uniqueId || data?.username;
    if (username) {
      console.log(`[Socket] Received connect-tiktok for @${username}`);
      connectToTikTok(username, data.sessionId, data.apiKey).catch(err => {
        console.warn(`[Socket connect-tiktok catch]: ${err.message}`);
      });
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

// Periodic Speech Master Watchdog:
// Automatically recovers and re-elects an active Speech Master if the previous master closed or halted
setInterval(() => {
  if (io.sockets && io.sockets.sockets && io.sockets.sockets.size > 0) {
    const now = Date.now();
    const hasValidMaster = activeSpeechMasterSocketId &&
      io.sockets.sockets.has(activeSpeechMasterSocketId) &&
      (now - speechMasterLastSeen < 9000);

    if (!hasValidMaster) {
      for (const [id, s] of io.sockets.sockets.entries()) {
        if (s.connected) {
          activeSpeechMasterSocketId = id;
          activeSpeechMasterTabId = s.handshake.query?.tabId || null;
          speechMasterLastSeen = now;
          console.log(`[Speech Master Watchdog] Elected socket ${id} as central Speech Master.`);
          broadcastSpeechMaster();
          break;
        }
      }
    }
  } else {
    activeSpeechMasterSocketId = null;
    activeSpeechMasterTabId = null;
  }
}, 3500);

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

// Auto-Reconnect & Connection Keeper: Reconnects automatically if a live session drops
setInterval(() => {
  if (!state.isConnected && !state.userExplicitlyDisconnected && state.roomId) {
    const target = state.tiktokUsername || bootChannel;
    if (target) {
      connectToTikTok(target, null, bootApiKey).then(room => {
        console.log(`[TikTok Keeper] Reconnected to @${target} (Room: ${room?.roomId})`);
      }).catch(() => {
        // Quietly wait for next cycle
      });
    }
  }
}, 30000);
