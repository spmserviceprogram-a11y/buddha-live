# Buddha TikTok Live Stream System Standards (E:\Buddha)

## 1. Zero Dead Code in TikTok Connector (`server.js`)
- In `connectToTikTok(username, sessionId, apiKey)`, ALL `tiktokConnection.on(...)` handlers (`member`, `chat`, `gift`, `like`, `roomUser`, `follow`, `share`, `disconnected`, `error`) **MUST ALWAYS** be attached to the connection instance **BEFORE** calling `tiktokConnection.connect()` or returning the connection Promise.
- Never place event listener attachments after `return new Promise(...)` or any return statement (which causes them to be unreachable dead code).

## 2. Protobuf & Legacy Dual Decoding (Robust Extractor)
- `tiktok-live-connector` v2 emits raw Protobuf objects where attributes are nested (`data.user.nickname`, `data.user.displayId`, `data.content`, `data.total`, `data.giftDetails`).
- Always use `extractTikTokUser(data)`, `extractTikTokChat(data)`, and `extractTikTokGift(data)` to safely extract `nickname`, `uniqueId`, `userId`, `avatar`, `comment`, `diamondCount`, `repeatCount`, `totalLikes`, and `viewerCount`.
- Never read bare `data.nickname`, `data.comment`, or `data.viewerCount` directly without fallbacks.
- Keep `enableExtendedGiftInfo: false` to avoid triggering paid enterprise EulerStream endpoints.

## 3. Gift Streak & 1-Coin Real-time Tapping Integrity
- Streakable gifts (`giftType === 1`, e.g., Rose 1 coin) must update in real time on EVERY tap. Never block on `!data.repeatEnd`.
- Use `giftStreakTracker` with delta diamonds (`(rawRepeatCount - prevRepeat) * unitDiamonds`) to call `recordDonation` and emit `leaderboard_update` immediately.
- Clear streak entries only when `data.repeatEnd === true`.

## 4. Instant Real-Time Viewer Seating
- Every viewer interaction (`member`, `chat`, `gift`, `follow`) must allocate a seat via `getOrCreateDisciple` on the server and trigger `seatRealViewer` on the client.
- Real viewers immediately replace initial placeholder bots, receiving prominent High-DPI nameplates (512x100 canvas, Sarabun/Kanit font with dark stroke) and speech bubbles (800x240 canvas, white card, gold border, ruby red header pill).

## 5. Socket.IO Transport & Client Robustness
- Client socket must initialize with `{ transports: ['websocket', 'polling'], reconnection: true, reconnectionAttempts: Infinity, reconnectionDelay: 1000 }` for seamless stability across Render cloud proxies.
- Bot crowd adjustments must stay guarded with `isAdjustingCrowd` mutex and remain outside `addOrUpdateDiscipleInScene`.
- Crowd size defaults to 8 serene flank disciples to prevent main thread frame drops.

## 6. 100% Unattended Autonomous Execution (Zero Permission Prompts)
- **Zero Terminal Interruption**: Never invoke `run_command` for routine file audits or code checks unless the user explicitly asks to run a command/server. Routine terminal calls trigger IDE permission dialogs (`Yes, allow this time`) which block unattended background execution.
- **Native Tools Only**: All file edits, inspections, code modifications, and updates must execute strictly using native tool calls (`read_file`, `edit_file`, `write_file`). These run 100% silently and autonomously with zero user prompts.
- **No Elevated Privileges**: Never pass `BypassSandbox: true` or trigger manual confirmation dialogs, allowing the user to step away from the computer while tasks complete automatically.

## 7. Google AI Studio Key & Interactions API Standards
- **Support Modern Auth Keys (`AQ.`) & Legacy Keys (`AIzaSy`)**:
  - Google AI Studio issues new Authorization Keys (Auth Keys) starting with `AQ.Ab8RN6...` in addition to legacy `AIzaSy...` keys.
  - **NEVER** hardcode prefix checks like `apiKey.startsWith('AIzaSy')`. Validate keys using `apiKey && apiKey.length >= 20`.
  - Always send authentication via both query parameter `?key=${apiKey}` AND HTTP header `x-goog-api-key: apiKey`.
- **Interactions API & Fast Live Latency (`thinking_level: 'minimal'`)**:
  - Use the Interactions API (`https://generativelanguage.googleapis.com/v1beta/interactions`) with `gemini-3.5-flash`, `gemini-3.6-flash`, or `gemini-3.8-flash`.
  - **CRITICAL**: Always set `"generation_config": { "thinking_level": "minimal" }` to minimize thought token latency and ensure speech generates within ~1.5-2.5s for live broadcasts.
  - Keep a 9-second timeout with graceful instant Thai template fallback if Google API encounters temporary 503 high-demand spikes.

## 8. Multi-Tier Neural TTS & 100% Viewer Name Reading Guarantee
- **Tier 1 Primary Voice Engine (Google Translate Neural Thai TTS - Direct Node.js)**:
  - Generates crystal-clear Thai speech with viewer names directly via `https://translate.google.com/translate_tts?ie=UTF-8&tl=th&client=tw-ob&q=...`.
  - Saves binary MP3 to `public/audio_cache/<hash>.mp3` in ~200ms with zero Python subprocesses or WebSocket failures.
- **Tier 2 Secondary Engine (Edge-TTS Subprocess with Multi-Voice Fallback)**:
  - `tts_worker.py` must use UTF-8 standard streams on Windows (`sys.stdin.reconfigure(encoding='utf-8')`) and read text from `stdin` to avoid Windows CLI mangling.
  - Multi-voice fallback chain: `th-TH-PremwadeeNeural` ➔ `th-TH-NiwatNeural` ➔ `th-TH-AcharaNeural`.
- **Pure Name Sanitizer (`cleanViewerName`)**:
  - Always strip emojis (`\u{1F600}-\u{1F64F}`, `\u{1F300}-\u{1F5FF}`, etc.) and special punctuation before TTS so names like `🩷🐶kukkik🐶fc...` or `บออิวอบิว🧸` are spoken fluidly.
- **Zero Fake Fallback Policy (Never Mask as Personalized Audio)**:
  - If dynamic synthesis fails, `getAudioUrlForText` must return `null` instead of static files (`default_welcome.mp3`/`default_blessing.mp3`).
  - In `app.js`, if `audioUrl` is missing or contains `default_`, client automatically triggers `window.speechSynthesis` (`playBrowserTTS`) to read the viewer's name aloud in Thai.

## 9. Single-Trigger Gift Speech Blessing (Zero Duplicate Thank-Yous)
- Speech blessings for gift donors must be triggered strictly once upon receiving the gift event (`onGiftEvent`).
- Stage ritual completion handlers (`executeStageRitual`) must NEVER invoke voice blessings (`speak*Blessing`), which previously caused the AI to thank the donor twice in a row.

## 10. Automatic Audio Ducking Standard
- `TempleAudio.prototype.duckBgm(duck = true, durationMs = 350)` smoothly ramps `bgmAudio.volume` down to ~18% whenever AI speech begins (`playAudioUrl` or `playBrowserTTS`), and smoothly restores volume to 100% when speech ends or cancels.

## 11. Brisk & Fluid Maternal Voice Tuning (เสียงคล่องแคล่ว ว่องไว 8-10 คำ)
- **Cadence & Speed**: `audio.playbackRate = 1.15` and `utter.rate = 1.15; utter.pitch = 1.0;` to create a brisk, fluid, responsive, natural Thai cadence.
- **Edge-TTS**: Tuned with `rate='+15%'` for crisp, fluid speech.
- **Prompt Mandate**: Instruct Gemini to produce exactly 1 short sentence of 8-10 words speaking within 1.5-2 seconds ending with "นะคะ" (`อย่างคล่องแคล่ว ว่องไว กระชับฉับไว 1 ประโยคสั้นๆ เพียง 8-10 คำ (พูดจบใน 1.5-2 วินาที) ลงท้ายด้วย "นะคะ"`).

## 12. Lifetime Persistent Donor Registry & Flicker-Free TOP 5 Leaderboard
- **Server Persistence (`state.donorRegistry`)**: `server.js` maintains a lifetime `donorRegistry = new Map()` that accumulates total diamonds for every donor across the entire live broadcast session. Seat rotations and viewer departure sweeps in the 14-seat visual room never evict donors from the registry.
- **Client Flicker-Free Caching**: `public/app.js` caches `clientMeritList` in `localStorage` (`buddha_top_merit`), hydrats immediately on boot, skips DOM re-renders when data signature is unchanged (`_lastSignature`), and never clears the board with an empty list if donors have already contributed.

## 13. Anti-Lag & Bot Gift Throttling (ห้ามบอทเล่นของขวัญแพง / ห้ามเล่นเอฟเฟกต์ซ้อนกัน)
- **Humble Low-Tier Offerings Only**: Ambient bots are strictly limited to 1-coin Kowtow and 5-coin Incense (`{ type: 'kowtow', coins: 1 }`, `{ type: 'incense', coins: 5 }`).
- **Zero Expensive Bot Effects**: Bots NEVER trigger expensive gifts (dragon, castle, fireworks, royal carriage, crystal fountain, golden bell).
- **Live Gift Absolute Priority**: Any real viewer gift immediately purges pending ambient bots from `stageActionQueue` and postpones ambient bots by at least 60 seconds (`scheduleNextAmbientDevotion(60000)`).
- **Strict Concurrency Mutex**: Ambient bot triggers are deferred by 25s if `isStageActionRunning` or `stageActionQueue.length > 0`, or if any gift was received within the last 45 seconds (`Date.now() - lastRitualActivityTime < 45000`).

## 14. Character & Tribute Queue Zero-Drop Protection (ตัวละครไม่พัง คิวไม่หาย)
- **Zero In-Motion Eviction**: `seatRealViewer` NEVER evicts or destroys characters currently walking or performing an altar ritual (`d.isWalking || d.isPerformingAltarRitual`).
- **Targeted Tribute Queue Advance**: `advanceTributeQueue(finishedName)` only splices the queue if the finished entity actually exists in `clientTributeQueue` (`idx !== -1`). It NEVER mistakenly shifts/drops real donors when an ambient bot finishes.
- **Zero Lost Gifts Retry**: `processStageActionQueue` never drops an action if all devotees are temporarily busy; it unshifts `currentAction` back to the head of `stageActionQueue` and retries in 400ms.

## 15. Adaptive Audience-Scaling & Performance Auto-Tuning Engine
- **Low Viewers (0-3 Viewers) - Lively Sanctuary Mode**:
  - Natural bot walks paced every 20s - 35s.
  - Gentle seated micro-interactions (peaceful bowing & prayer bubbles) every 12s - 22s.
  - Keeps sanctuary spiritually alive and prevents TikTok automated moderation from flagging stream as static/inactive.
  - Bots never trigger AI voice blessings (only subtle bell/woodblock sounds).
- **Medium Viewers (4-10 Viewers) - Audience-First Mode**:
  - Bot walks automatically stretched out to 55s - 90s.
  - Any real viewer gift, chat, like, or follow defers bot devotions by at least 50 seconds.
  - Stage and AI voice dedicated primarily to real viewers.
- **Crowded Viewers (11-20 Viewers) - Crowded Mode**:
  - Bot walks stretched to 100s - 150s; seated micro-bubbles turned OFF.
  - Stage yields to human devotees for 80 seconds upon any real gift.
- **Surge / Viral Viewers (20+ Viewers) - Auto Anti-Lag & Pure Real Viewers**:
  - **100% Bots OFF**: Zero bot walks, zero bot actions.
  - **Runway Acceleration**: Walk speed automatically scales up to 1.75x - 2.2x so gift backlog never queues up for minutes.
  - **Bubble Cap**: Max active bubbles capped at 2 to prevent screen occlusion and preserve 60 FPS on streaming encoders.
- **Personable Guan Yin Persona (มีมนุษย์สัมพันธ์ดี อบอุ่น เป็นมิตร)**:
  - AI voice greets real viewers warmly by name like a compassionate spiritual mother welcoming family.
  - 1 short, melodious sentence of 8-10 words (~1.5-2s) ending with "นะคะ".



