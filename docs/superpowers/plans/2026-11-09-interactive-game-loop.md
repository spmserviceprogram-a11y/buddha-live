# Interactive Round-Based Game Loop & Active AI Host Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the TikTok LIVE 3D Sanctuary into an authentic, interactive round-based game with real-time comment participation ("สาธุ" merit gauge), 3-tier milestone rewards, 3D Seam-Si divination climax, Round MVP spotlight, and an active AI Host/MC speaking directly to chat every 10–15s to permanently resolve TikTok's 2-minute unoriginal content detection.

**Architecture:** A client-server synchronized 60-second state machine (`RoundManager`) orchestrating comment parsing, dynamic HUD progress bars, 3D Three.js ceremonial animations, and ultra-fast (~200ms) Google Neural Thai TTS audio announcements. Server ingests live TikTok chat comments via `tiktok-live-connector` and emits scored merit points, while the client drives the visual lifecycle and AI host commentary.

**Tech Stack:** Node.js, Express, Socket.IO, `tiktok-live-connector`, Three.js, Vanilla HTML5/CSS3 (Glassmorphism), Google Translate Neural Thai TTS (Tier 1) + Edge-TTS (Tier 2).

**Spec:** `e:/Buddha/docs/superpowers/specs/2026-11-09-interactive-game-loop-design.md`

## Global Constraints
- **Zero Terminal Interruption (Rule 10 in `GEMINI.md`):** All file edits and modifications must use native tool calls (`read_file`, `edit_file`, `write_file`) with ZERO `run_command` routine audits to prevent IDE permission prompts.
- **Zero Monetization Clutter (Anti-Ban):** Strictly NO coin price numbers (`🪙 1`, etc.) or commercial solicitation text anywhere in HTML/CSS/JS.
- **Brisk MC Speech (Rule 10):** All AI Host speech lines must be 8–10 words (~1.5–2.0s duration), ending with `"นะคะ"`, and incorporating `"ฉากจำลอง"` to satisfy TikTok guidelines.
- **Continuous Optical Flow:** Three.js scene must maintain camera drifting and particle floating without freezes.
- **Deterministic Loop:** If chat is idle, ambient devotees contribute 1–2 "สาธุ" every 5s so rounds never stall.

## Review Focus
1. **Comment Flood / High Throughput:** When 50+ viewers spam "สาธุ" simultaneously, gauge updates must batch or throttle via `requestAnimationFrame` to avoid DOM reflow lag.
2. **Audio Queue Collisions:** If a viewer sends a gift during the round countdown, the gift announcement must cleanly interrupt or duck the round MC voice without overlapping or corrupting audio streams.
3. **Round Desync / Disconnect:** If client reconnects mid-round, server must provide current round timestamp and merit state so client resynchronizes instantly.
4. **Zero-Point Tie for MVP:** If no viewers type in a round, ambient devotee is selected as MVP without throwing `undefined` or null reference errors.
5. **Memory Leak over Extended Broadcasts:** Contributor Maps and sparkle particles must be purged at the end of each round to keep memory stable indefinitely.

---

### Task 1: Server-Side Comment Scoring & Round Sync Engine (`server.js`)

**Files:**
- Modify: `e:/Buddha/server.js:1400-1460`

**Interfaces:**
- Consumes: `tiktokConnection.on('chat')`, `tiktokConnection.on('like')`, `tiktokConnection.on('gift')`
- Produces: Socket event `round_action_chat` with `{ nickname, uniqueId, avatar, comment, meritDelta, isKeyword, category }` and `round_sync_state`

- [ ] **Step 1: Inspect and enhance `tiktokConnection.on('chat')` in `server.js`**
  - Add regex matching for keywords: `/(สาธุ|สาทุ|สาดุ|sadhu|sathu|ขอพร|รวย|เฮง|โชคดี|บารมี)/i` (+1 merit point) and Seam-Si stick numbers `/(?:เลข)?\s*([1-9]|[12][0-9]|3[0-6])\b/` (records stick vote).
  - Track per-round contribution accumulator in `state.currentRoundData = { roundNum: 1, meritPoints: 0, contributors: new Map() }`.

- [ ] **Step 2: Add `round_action_chat` and `round_sync_state` socket emitters**
  - Emit `round_action_chat` on every valid comment with calculated `meritDelta`.
  - Add API / socket handler `get_round_state` so newly connected clients receive current round status.

- [ ] **Step 3: Verify server-side syntax and event emission**
  - Verify `server.js` parses cleanly without syntax errors using native file read inspection.

---

### Task 2: Top Round Controller HUD & Glassmorphism UI (`index.html` & `style.css`)

**Files:**
- Modify: `e:/Buddha/public/index.html:120-220`
- Modify: `e:/Buddha/public/style.css:800-1100`

**Interfaces:**
- Consumes: DOM elements `#top-hud-bar`
- Produces: `#round-hud`, `#round-num`, `#round-timer`, `#round-phase-badge`, `#merit-progress-track`, `#merit-progress-fill`, `#merit-pct-label`, `#round-mvp-pill`, `#round-mvp-name`

- [ ] **Step 1: Add `#round-hud` markup to `public/index.html`**
  - Place `#round-hud` directly below or integrated with the top bar without obscuring the Buddha or devotee seats.
  - Include:
    - Round Badge: `🌿 รอบที่ <span id="round-num">1</span>`
    - Phase Pill: `<span id="round-phase-badge" class="phase-gathering">กำลังสะสมบุญ</span>`
    - Countdown Timer: `⏳ <span id="round-timer">45</span>s`
    - Progress Bar: `<div id="merit-progress-track"><div id="merit-progress-fill"></div><div class="milestone-notch" style="left:33%"></div><div class="milestone-notch" style="left:66%"></div><div class="milestone-notch" style="left:100%"></div></div>`
    - Merit Point & Percentage Label: `<span id="merit-pct-label">0% (0/88)</span>`
    - Round MVP Mini-Pill: `👑 ผู้นำบุญ: <span id="round-mvp-name">รอเปิดรอบ</span>`

- [ ] **Step 2: Add `#round-mvp-banner` modal to `public/index.html`**
  - Center-screen celebration card displaying the Round MVP's avatar, name, merit points, and congratulatory verse.

- [ ] **Step 3: Add modern glassmorphism and animated progress styling to `public/style.css`**
  - Style `#round-hud` with `backdrop-filter: blur(12px)`, gold trim (`rgba(255, 215, 0, 0.4)`), vibrant gradient fill (`linear-gradient(90deg, #10B981, #F59E0B, #8B5CF6)`).
  - Add pulse animation when passing 33%, 66%, and 100% milestone notches.
  - Ensure zero horizontal overflow and flawless mobile/vertical aspect ratio alignment.

- [ ] **Step 4: Verify UI layout and responsive rendering**
  - Verify HTML tags are closed properly and CSS selectors are scoped cleanly.

---

### Task 3: Client-Side Round State Machine & Scoring Manager (`public/app.js`)

**Files:**
- Modify: `e:/Buddha/public/app.js:12500-13500`

**Interfaces:**
- Consumes: Socket events `round_action_chat`, `action_like`, `action_gift`
- Produces: `window.roundManager` instance with methods `startRound()`, `addMerit()`, `updateTimer()`, `triggerClimax()`, `revealFortuneAndMVP()`, `resetRound()`

- [ ] **Step 1: Define `RoundManager` Class in `public/app.js`**
  - Configuration constants: `ROUND_DURATION = 60`, `GATHERING_DURATION = 45`, `TARGET_MERIT_POINTS = 88`.
  - States: `ROUND_START`, `GATHERING`, `CLIMAX`, `REVEAL`, `TRANSITION`.
  - Properties: `currentRound = 1`, `timeRemaining = 45`, `meritPoints = 0`, `contributors = new Map()`, `currentMVP = null`.

- [ ] **Step 2: Implement Merit Calculation and Tier Threshold Triggers**
  - `addMerit(user, points, reason)`: Increments `meritPoints`, updates contributor record, computes percentage (`Math.min(100, Math.round((meritPoints / TARGET_MERIT_POINTS) * 100))`).
  - Triggers Milestone Visual Effects:
    - Tier 1 (>=33%): Triggers `spawnPetalShower()` and updates UI glow.
    - Tier 2 (>=66%): Triggers `templeAudio.playLotusChime()` and golden altar aura.
    - Tier 3 (100%): Triggers divine bell toll and celestial celebration.
  - Updates `#merit-progress-fill` width smoothly using CSS transition.

- [ ] **Step 3: Implement Ambient Devotee Auto-Contribution Fallback**
  - If no incoming real comments arrive within 5s during `GATHERING` phase, an ambient seated devotee contributes 1 "สาธุ" to guarantee the gauge advances and rounds never freeze.

- [ ] **Step 4: Connect Socket.IO Listeners to `RoundManager`**
  - Wire `round_action_chat`, `action_like`, and `gift` into `roundManager.addMerit()`.

---

### Task 4: 3D Climax Divination & Round MVP Spotlight Walk (`public/app.js`)

**Files:**
- Modify: `e:/Buddha/public/app.js:5880-6100`

**Interfaces:**
- Consumes: `drawSeamSiFortune()`, `showSeamSiFortuneScroll()`, `showLuckyNumbersModal()`, `DiscipleManager`
- Produces: `executeRoundClimax(fortune, mvpUser)` and `spotlightRoundMVP(mvpUser)`

- [ ] **Step 1: Implement Phase 3 Climax Animation (`executeRoundClimax`)**
  - When timer reaches 0s in `GATHERING`:
    - Set phase to `CLIMAX`.
    - Shake the 3D Seam-Si bamboo cylinder at altar center for 4 seconds with sound effect (`templeAudio.playWoodblock()`).
    - Lock progress bar at current percentage.

- [ ] **Step 2: Implement Phase 4 Fortune & MVP Reveal (`revealFortuneAndMVP`)**
  - Draw auspicious fortune stick via `drawSeamSiFortune()`.
  - Display `showSeamSiFortuneScroll(mvpName, fortune)`.
  - Show Round MVP Trophy Card with recipient's avatar and points.
  - Find or spawn the MVP devotee and call `walkToAltarAndKowtow()` so their avatar walks up the red carpet to receive blessings.

- [ ] **Step 3: Implement Phase 5 Transition & Reset**
  - After 6 seconds of reveal, hide modals cleanly.
  - Reset `meritPoints = 0`, clear `contributors` map, increment `currentRound++`.
  - Transition state to `ROUND_START` of next round.

---

### Task 5: Active AI Host/MC Live Commentary Coordinator (`public/app.js`)

**Files:**
- Modify: `e:/Buddha/public/app.js:13200-13600`

**Interfaces:**
- Consumes: `getAudioUrlForText()`, `templeAudio.duckBgm()`
- Produces: `speakHostMC(text)` with queue management and gift priority ducking

- [ ] **Step 1: Implement `speakHostMC(text)` with Rule 10 Compliance**
  - Enforce phrase length: 8–10 words (~1.5–2.0s duration), ending with `"นะคะ"`.
  - Incorporate `"ฉากจำลอง"` into round announcements.
  - Automatically duck BGM to 18% during speech and restore to 100% on complete.
  - Immediate cancel / yield if a real live gift arrives so donor blessings are never delayed.

- [ ] **Step 2: Implement Scheduled Round Milestone Announcements**
  - **Round Start (T=0s):** `"ยินดีต้อนรับสู่ฉากจำลอง รอบที่ [N] พิมพ์สาธุสะสมบุญกันนะคะ"`
  - **Mid-Round Momentum (T=22s):** `"คุณ [UserA] และคุณ [UserB] ร่วมส่งใจ บารมีใกล้ถึงเป้าหมายแล้วนะคะ"`
  - **Countdown Warning (T=38s):** `"อีก 7 วินาทีสุดท้าย พิมพ์สาธุเร่งพลังบุญรอบนี้กันนะคะ"`
  - **Climax & MVP (T=52s):** `"ยินดีกับคุณ [MVP_Name] ผู้นำบุญรอบนี้ และนี่คือเซียมซีมงคลนะคะ"`

---

### Task 6: Autonomous Simulation & End-to-End Verification

**Files:**
- Test via client simulation in `public/app.js` and inspection

**Interfaces:**
- Consumes: Complete integrated system
- Produces: Verified 60-second self-sustaining round lifecycle with zero console errors

- [ ] **Step 1: Verify all files for syntax and reference integrity**
  - Inspect `server.js`, `public/index.html`, `public/style.css`, and `public/app.js` with `read_file`.
  - Ensure zero unresolved symbols or broken DOM selectors.

- [ ] **Step 2: Trigger synthetic test round and verify lifecycle stages**
  - Verify Round 1 starts -> Gathering Phase ticks down -> Gauge animates on comments -> Bamboo cylinder shakes -> Fortune scroll reveals -> MVP spotlight walks -> Round 2 starts automatically.

- [ ] **Step 3: Verify audio ducking and zero overlap**
  - Verify BGM volume ducks to ~18% during MC announcements and returns smoothly to 100%.

- [ ] **Step 4: Update cache-busting tokens**
  - Update `?v=paradise_v41` in `public/index.html` to guarantee fresh browser load.
