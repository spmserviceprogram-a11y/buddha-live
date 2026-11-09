# Blessing Videos & Divine Bridge Share System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate 4 cinematic miracle videos of Bodhisattva Guan Yin (`ให้พร 1-4.mp4`) as dynamic tier rewards (33%, 66%, Climax) into the Round Game System, and deploy the Unified Divine Bridge Share System (+5 round merit points, front-row VIP Golden Mat elevation, `🕊️ สะพานบุญ` emblem, AI voice gratitude, and 20-share milestone rewards) to maximize TikTok viral recommendation and eliminate 120s static content flags.

**Architecture:** Video assets served with HTTP range streaming and played via smooth CSS opacity crossfade behind transparent Three.js WebGL canvas. Server ingests live TikTok share events via `tiktok-live-connector` and emits `action_share`. Client `RoundManager` coordinates video transitions, merit boosts, avatar seat promotions, and AI host voice blessings.

**Tech Stack:** Node.js, Express (Range streaming), Three.js, HTML5 Video, CSS3 Transitions, Google Translate Neural Thai TTS.

**Specs:** 
- `e:/Buddha/docs/superpowers/specs/2026-11-09-blessing-videos-integration-design.md`
- `e:/Buddha/docs/superpowers/specs/2026-11-09-divine-bridge-share-design.md`

## Global Constraints
- **Zero Terminal Interruption (Rule 10 in `GEMINI.md`):** All file copying, inspection, and modifications must use native tool calls (`read_file`, `write_file`, `edit_file`) with ZERO `run_command` routine audits.
- **Seamless Video Crossfade:** Base background image must remain visible underneath `<video id="bg-video">` at all times; opacity fades 0 -> 1 on start and 1 -> 0 on end (250ms), preventing black screens.
- **Brisk Voice Cadence (Rule 10):** All AI voice blessings for sharers must be 8–10 words, ending with `"นะคะ"`.
- **Zero Monetization Clutter:** No commercial solicitation or coin prices in the share UI.

## Review Focus
1. **Video File Access / Permissions on Windows:** Videos copied from `c:/Users/BINARY/Desktop/` to `public/videos/` must be readable by Express static server without lock contention.
2. **Rapid Video Triggering:** If merit jumps rapidly from 0% to 70%, video triggers must debounce or queue cleanly without abort errors.
3. **VIP Seat Capacity:** If all 5 front-row seats (0–4) are occupied by real viewers, the oldest seated viewer in the front row yields their seat gracefully.
4. **Mobile Video Autoplay Policies:** Background video must remain strictly `muted` to guarantee unblocked programmatic `play()`.
5. **Memory Leak from Video Buffers:** Video elements must pause and reset `src` when idle to release GPU decoders.

---

### Task 1: Video Asset Migration & Server Range Streaming Route (`server.js`)

**Files:**
- Create/Copy: `e:/Buddha/public/videos/blessing_tier1.mp4`, `blessing_tier2.mp4`, `blessing_climax_a.mp4`, `blessing_climax_b.mp4`
- Modify: `e:/Buddha/server.js:280-320`, `1400-1420`

**Interfaces:**
- Consumes: `c:/Users/BINARY/Desktop/ให้พร 1.mp4`, `ให้พร 2.mp4`, `ให้พร 3.mp4`, `ให้พร 4.mp4`, `tiktokConnection.on('share')`
- Produces: `/videos/:filename` endpoint, `action_share` socket event

- [ ] **Step 1: Copy video files from Desktop to `e:/Buddha/public/videos/`**
  - Implement startup sync function in `server.js` using `fs.copyFileSync` (ensuring `public/videos` directory exists).
  - Map:
    - `ให้พร 4.mp4` -> `public/videos/blessing_tier1.mp4`
    - `ให้พร 3.mp4` -> `public/videos/blessing_tier2.mp4`
    - `ให้พร 1.mp4` -> `public/videos/blessing_climax_a.mp4`
    - `ให้พร 2.mp4` -> `public/videos/blessing_climax_b.mp4`

- [ ] **Step 2: Add HTTP 206 Byte-Range Streaming Route for `/videos/:filename`**
  - Support `Range` header requests for instantaneous video seeking and memory-efficient streaming.

- [ ] **Step 3: Enhance `tiktokConnection.on('share')` in `server.js`**
  - Seat user and emit `action_share` with `{ uniqueId, nickname, avatar, meritDelta: 5, timestamp: Date.now() }`.

---

### Task 2: Seamless Background Video Crossfade Controller (`index.html`, `style.css`, `app.js`)

**Files:**
- Modify: `e:/Buddha/public/index.html:30-45`
- Modify: `e:/Buddha/public/style.css:4800-4880`
- Modify: `e:/Buddha/public/app.js:13400-13480`

**Interfaces:**
- Consumes: `#bg-video`, `#bg-paradise-img`
- Produces: `window.videoBlessingController.playMiracle(tier, onEnd)`

- [ ] **Step 1: Configure `#bg-video` in `public/index.html` & `public/style.css`**
  - Ensure `<video id="bg-video" playsinline muted>` is styled with `position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 0.28s ease-in-out; pointer-events: none; z-index: 1;`.
  - Ensure `<img id="bg-paradise-img">` sits at `z-index: 0;` so it is permanently visible beneath the video.

- [ ] **Step 2: Implement `VideoBlessingController` in `public/app.js`**
  - Manages `isPlaying`, preloads URLs, handles smooth 280ms fade-in, plays for duration (~3.5s), and smooth 300ms fade-out.
  - Automatically handles `onended` and error fallbacks.

---

### Task 3: Hook Video Miracles into `RoundManager` (`public/app.js`)

**Files:**
- Modify: `e:/Buddha/public/app.js` inside `RoundManager`

**Interfaces:**
- Consumes: `videoBlessingController.playMiracle()`
- Produces: Visual miracle transitions at 33%, 66%, and Climax

- [ ] **Step 1: Wire Tier 1 (33%) Miracle**
  - When merit passes 33%, call `videoBlessingController.playMiracle('tier1')` (โบกกิ่งหลิว 7 สี).

- [ ] **Step 2: Wire Tier 2 (66%) Miracle**
  - When merit passes 66%, call `videoBlessingController.playMiracle('tier2')` (ละอองทิพย์พวยพุ่ง).

- [ ] **Step 3: Wire Phase 3 Climax Miracle**
  - When `triggerClimax()` begins, call `videoBlessingController.playMiracle(this.roundNum % 2 === 1 ? 'climax_a' : 'climax_b')` (หลั่งน้ำทิพย์ / บัวแก้วบาน).

---

### Task 4: Divine Bridge Share Event Listener & VIP Golden Mat Elevation (`public/app.js`)

**Files:**
- Modify: `e:/Buddha/public/app.js`

**Interfaces:**
- Consumes: `socket.on('action_share')`
- Produces: VIP Seat elevation, `🕊️ สะพานบุญ` nameplate badge, AI voice blessing, community milestone count

- [ ] **Step 1: Implement `onShareEvent(share)`**
  - Add +5 points to `roundManager.addMerit(share, 5, 'เปิดสะพานบุญ')`.
  - Promote avatar to front-row seats 0–4 via `moveToNewSeat()`.
  - Mark `userData.isSharer = true` and update nameplate with `🕊️ สะพานบุญ`.
  - Display golden share toast.
  - Call `guanYinVoice.speak('อนุโมทนาคุณ ' + cleanName + ' ร่วมเปิดสะพานบุญแชร์ไลฟ์นี้นะคะ ขอให้บารมีหนุนนำนะคะ', 2)`.
  - Increment `cumulativeShares++`; trigger `triggerGoldenBellEffect()` every 20 shares.

---

### Task 5: UI Elements for Share Toasts & Share Counter (`index.html` & `style.css`)

**Files:**
- Modify: `e:/Buddha/public/index.html`
- Modify: `e:/Buddha/public/style.css`

**Interfaces:**
- Consumes: DOM elements `#round-hud`
- Produces: `#share-counter-pill`, `#share-toast-banner`

- [ ] **Step 1: Add Share Counter to `#round-hud`**
  - Add `<div class="share-counter-pill" id="share-counter-pill">🕊️ สะพานบุญ: <span id="share-count-val">0</span></div>` into `#round-hud-top`.
  - Style with gold trim, glassmorphic backdrop, and subtle lotus sparkle.

- [ ] **Step 2: Add `#share-toast-banner` styling**
  - Translucent golden floating card with slide-down animation and sparkle particle bursts.

---

### Task 6: Autonomous Verification & End-to-End Simulation

**Files:**
- Test via client simulation in `public/app.js`

**Interfaces:**
- Consumes: Complete integrated system
- Produces: Verified miracle video playback and share reaction flow

- [ ] **Step 1: Verify video file deployment**
  - Check that all 4 videos exist in `public/videos/` and return HTTP 200/206.

- [ ] **Step 2: Trigger `testRoundCycle()`**
  - Confirm video fades in and out smoothly at 33%, 66%, and Climax without crashing or frame jitter.

- [ ] **Step 3: Trigger `testShareEvent()`**
  - Confirm +5 merit boost, VIP seat walk, golden badge, and AI voice greeting.

- [ ] **Step 4: Update cache-busting token to `?v=blessing_share_v1`**
