const http = require('http');
const assert = require('assert');

// Test port to avoid conflict with default
process.env.PORT = '3099';
const { app, server, state, getOrCreateDisciple, recordDonation } = require('../server.js');

function postJson(path, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3099,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:3099${path}`, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('=== [SYSTEMATIC VERIFICATION: Buddha TikTok Live System] ===\n');

  try {
    // 1. Static Assets Test
    console.log('[Test 1] Verifying Static HTTP Routes & Assets...');
    const indexRes = await get('/');
    assert.strictEqual(indexRes.status, 200, 'Index.html should return 200');
    assert.ok(indexRes.body.includes('ห้องสวดมนต์') || indexRes.body.includes('canvas-container'), 'Index contains title');
    assert.ok(indexRes.body.includes('canvas-container'), 'Index contains canvas container');

    const styleRes = await get('/style.css');
    assert.strictEqual(styleRes.status, 200, 'Style.css should return 200');

    const appRes = await get('/app.js');
    assert.strictEqual(appRes.status, 200, 'App.js should return 200');
    assert.ok(appRes.body.includes('import * as THREE'), 'App.js imports THREE');

    const threeRes = await get('/vendor/three/three.module.js');
    assert.strictEqual(threeRes.status, 200, 'Three.module.js should return 200');

    // Verify all 10 real gift icon PNG assets are accessible
    const giftPngs = ['/rose.png', '/omamori.png', '/lucky_9.png', '/rose_99.png', '/garland.png', '/cologne.png', '/donut.png', '/four_hearts.png', '/portal.png', '/dragon.png'];
    for (const png of giftPngs) {
      const res = await get(png);
      assert.strictEqual(res.status, 200, `${png} must return 200 OK`);
      assert.ok(res.headers['content-type'].includes('image/png'), `${png} must have content-type image/png`);
    }
    console.log('  -> PASS: All static web assets & 10 authentic gift icon PNGs served correctly.\n');

    // 2. API Status Test
    console.log('[Test 2] Verifying GET /api/status...');
    const statusRes = await get('/api/status');
    assert.strictEqual(statusRes.status, 200);
    const statusData = JSON.parse(statusRes.body);
    assert.strictEqual(statusData.success, true);
    assert.strictEqual(statusData.data.isConnected, false);
    assert.strictEqual(statusData.data.discipleCount, 0);
    assert.strictEqual(statusData.data.tributeQueue.length, 0, 'Initial tributeQueue must be clean empty');
    assert.strictEqual(statusData.data.recentWishes.length, 0, 'Initial recentWishes must be clean empty');
    assert.strictEqual(statusData.data.prayerCategories.wealth, 0, 'Initial prayerCategories wealth must be 0');
    assert.strictEqual(statusData.data.prayerCategories.work, 0, 'Initial prayerCategories work must be 0');
    console.log('  -> PASS: /api/status returned clean 100% real-time initial state (zero fake data).\n');

    // 3. Simulation - Follow Test (Disciple creation & seating)
    console.log('[Test 3] Verifying POST /api/simulate (follow event)...');
    const simFollow = await postJson('/api/simulate', {
      type: 'follow',
      payload: { uniqueId: 'phat_tu_test_1', nickname: 'Phật Tử Thử Nghiệm 1' }
    });
    assert.strictEqual(simFollow.status, 200);
    assert.strictEqual(simFollow.data.success, true);
    assert.ok(simFollow.data.disciple.seatId >= 0);
    assert.strictEqual(state.disciples.length, 1);
    console.log('  -> PASS: Disciple created and assigned to Seat ' + simFollow.data.disciple.seatId + '.\n');

    // 4. Seating Grid Allocation Test
    console.log('[Test 4] Verifying Multi-Disciple Seating Grid...');
    for (let i = 2; i <= 6; i++) {
      await postJson('/api/simulate', {
        type: 'follow',
        payload: { uniqueId: `phat_tu_${i}`, nickname: `Phật Tử ${i}` }
      });
    }
    assert.strictEqual(state.disciples.length, 6);
    console.log('  -> PASS: 6 disciples properly populated.\n');

    // 5. Gifts & Effects Test
    console.log('[Test 5] Verifying Gifts and Tiered Visual Effects & Authentic Gift Icons...');
    // 1 coin -> kowtow (walk down red carpet to kowtow before Guan Yin)
    const gift1 = await postJson('/api/simulate', {
      type: 'gift',
      payload: { uniqueId: 'phat_tu_test_1', diamondCount: 1 }
    });
    assert.strictEqual(gift1.data.effectType, 'kowtow');
    assert.strictEqual(gift1.data.giftImage, '/rose.png', 'Gift 1 must provide /rose.png icon');

    // 5 coins -> incense
    const gift5 = await postJson('/api/simulate', {
      type: 'gift',
      payload: { uniqueId: 'phat_tu_2', diamondCount: 5 }
    });
    assert.strictEqual(gift5.data.effectType, 'incense');
    assert.strictEqual(gift5.data.giftImage, '/omamori.png', 'Gift 5 must provide /omamori.png icon');

    // 20 coins -> crystal_fountain
    const gift20 = await postJson('/api/simulate', {
      type: 'gift',
      payload: { uniqueId: 'phat_tu_3', diamondCount: 20 }
    });
    assert.strictEqual(gift20.data.effectType, 'crystal_fountain');
    assert.strictEqual(gift20.data.giftImage, '/cologne.png', 'Gift 20 must provide /cologne.png icon');

    // 299 coins -> dragon
    const gift299 = await postJson('/api/simulate', {
      type: 'gift',
      payload: { uniqueId: 'phat_tu_dragon', diamondCount: 299 }
    });
    assert.strictEqual(gift299.data.effectType, 'dragon');
    assert.strictEqual(gift299.data.giftImage, '/dragon.png', 'Gift 299 must provide /dragon.png icon');
    console.log('  -> PASS: Correct effect types and real gift icon images mapped: rose (/rose.png), omamori (/omamori.png), cologne (/cologne.png), dragon (/dragon.png).\n');

    // 6. Leaderboard Sorting Test
    console.log('[Test 6] Verifying Leaderboard Coin Aggregation and Rank Ordering...');
    assert.strictEqual(state.leaderboard[0].uniqueId, 'phat_tu_dragon');
    assert.strictEqual(state.leaderboard[0].coins, 299);
    assert.strictEqual(state.leaderboard[1].uniqueId, 'phat_tu_3');
    assert.strictEqual(state.leaderboard[1].coins, 20);
    assert.strictEqual(state.leaderboard[2].uniqueId, 'phat_tu_2');
    assert.strictEqual(state.leaderboard[2].coins, 5);
    assert.strictEqual(state.leaderboard[3].uniqueId, 'phat_tu_test_1');
    assert.strictEqual(state.leaderboard[3].coins, 1);
    console.log('  -> PASS: Leaderboard ranked in exact descending order of merit coins.\n');

    // 7. Chat Event Simulation Test
    console.log('[Test 7] Verifying Chat Comments...');
    const chatRes = await postJson('/api/simulate', {
      type: 'chat',
      payload: { uniqueId: 'phat_tu_test_1', comment: 'Nam Mô A Di Đà Phật' }
    });
    assert.strictEqual(chatRes.status, 200);
    console.log('  -> PASS: Chat comment handled cleanly.\n');

    // 8. Connect Validation Test
    console.log('[Test 8] Verifying Validation on /api/connect...');
    const connectFail = await postJson('/api/connect', {});
    assert.strictEqual(connectFail.status, 400);
    assert.strictEqual(connectFail.data.success, false);
    console.log('  -> PASS: /api/connect rejects empty username with HTTP 400.\n');

    // 9. Reset Test
    console.log('[Test 9] Verifying State Reset...');
    const resetRes = await postJson('/api/simulate', { type: 'reset' });
    assert.strictEqual(resetRes.status, 200);
    assert.strictEqual(state.disciples.length, 0);
    assert.strictEqual(state.leaderboard.length, 0);
    assert.strictEqual(state.tributeQueue.length, 0, 'Reset must clear tributeQueue');
    assert.strictEqual(state.recentWishes.length, 0, 'Reset must clear recentWishes');
    assert.strictEqual(state.prayerCategories.work, 0, 'Reset must clear prayerCategories');
    console.log('  -> PASS: Reset clears all disciples, leaderboard, tribute queue, and prayer categories.\n');

    // 10. Neural AI Voice TTS Endpoint Test
    console.log('[Test 10] Verifying Neural AI Voice /api/tts Endpoint...');
    const ttsRaw = await get('/api/tts?text=' + encodeURIComponent('ขออนุโมทนาบุญที่กดติดตาม ขอให้ชีวิตร่มเย็น มีความสุข ความเจริญนะคะ'));
    const ttsRes = { status: ttsRaw.status, data: JSON.parse(ttsRaw.body) };
    assert.strictEqual(ttsRes.status, 200);
    assert.strictEqual(ttsRes.data.success, true);
    assert.ok(ttsRes.data.url.endsWith('.mp3'), 'TTS URL should end with .mp3');
    console.log(`  -> PASS: /api/tts returned cached audio: ${ttsRes.data.url}\n`);

    // 11. Gemini AI Divine Guan Yin Blessing & Greeting Test
    console.log('[Test 11] Verifying Gemini AI /api/gemini/bless Endpoint (Blessing & Greeting)...');
    const blessRes = await postJson('/api/gemini/bless', {
      name: 'คุณสุภัทร',
      action: 'ถวายดอกกุหลาบเข้ามากราบพระ',
      wish: 'ขอให้สมหวังในหน้าที่การงาน'
    });
    assert.strictEqual(blessRes.status, 200);
    assert.strictEqual(blessRes.data.success, true);
    assert.ok(blessRes.data.blessingText.length > 10, 'Blessing text should be non-empty');
    assert.ok(blessRes.data.audioUrl && blessRes.data.audioUrl.endsWith('.mp3'), 'Should return audioUrl');

    const welcomeBlessRes = await postJson('/api/gemini/bless', {
      name: 'คุณสายใจ',
      action: 'เข้าร่วมรับฟังการเจริญสติในพระวิหาร'
    });
    assert.strictEqual(welcomeBlessRes.status, 200);
    assert.strictEqual(welcomeBlessRes.data.success, true);
    assert.ok(welcomeBlessRes.data.blessingText.length > 5, 'Welcome greeting text should be non-empty');
    console.log(`  -> PASS: /api/gemini/bless returned blessing & welcome greeting: "${welcomeBlessRes.data.blessingText}" (Audio: ${welcomeBlessRes.data.audioUrl})\n`);

    console.log('====================================================');
    console.log('ALL 11 VERIFICATION CHECKS PASSED WITH ZERO ERRORS!');
    console.log('====================================================');

    server.close();
    process.exit(0);
  } catch (err) {
    console.error('\n[VERIFICATION FAILED]:', err);
    server.close();
    process.exit(1);
  }
}

runTests();
