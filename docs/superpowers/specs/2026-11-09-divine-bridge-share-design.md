# Design Document: Unified Divine Bridge Share Engagement System
**Project:** TikTok LIVE Sanctuary 3D Interactive Broadcast (`E:\Buddha`)  
**Date:** 2026-11-09  
**Status:** Pending Approval  

---

## 1. Intent & The Why

### Problem & Opportunity
On TikTok LIVE, the **"Share (แชร์ไลฟ์)"** metric is one of the highest-weighted signals in the recommendation algorithm. When viewers actively share a stream, TikTok detects high viral engagement and pushes the broadcast into the **"For You Feed" (ฟีดสำหรับคุณ)**, multiplying organic viewership.

In our Buddhist & temple sanctuary context, sharing the stream is culturally understood as **"การร่วมเป็นสะพานบุญ / บอกบุญกัลยาณมิตร"** (Spreading good deeds and blessings). It is 100% compliant with TikTok Community Guidelines (unlike cash sweepstakes) and creates immense positive social proof.

The user selected to combine all 3 approaches into a **Unified Master Share Engagement System**.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- **G1: Immediate Round Game Impact (+5 Merit Points):** Every share adds **+5 Merit Points** to the current round gauge (5x the weight of a comment), accelerating progress toward 33%, 66%, and 100% milestone video miracles.
- **G2: VIP Front-Row Golden Mat Elevation:** The sharer's 3D avatar is automatically promoted to the front-row VIP Golden Mats (Seats 0–4), stepping forward on screen.
- **G3: Visual Distinction (Share Emblem & Halo Aura):** The sharer's nameplate gains a sacred **`🕊️ สะพานบุญ`** title and a radiant golden halo rotating around their mat.
- **G4: Real-Time AI Vocal Gratitude:** The AI Host (Bodhisattva Guan Yin) immediately speaks a personalized blessing addressing the sharer by name:
  > *"อนุโมทนาคุณ [ชื่อ] ร่วมเปิดสะพานบุญแชร์ไลฟ์นี้นะคะ ขอให้บารมีหนุนนำเปิดทางเศรษฐีนะคะ"*
- **G5: Cumulative Community Share Milestone (Every 20 Shares):** Every 20 total shares triggers a sanctuary-wide celebration: golden coin rain and temple bell chimes.

### Non-Goals
- Promising real-world money, physical goods, or lottery draws (strictly prohibited by TikTok policies).

### Anti-Goals
- **Zero Voice Overlap:** Share voice blessings must yield to active gift offerings to maintain donor priority per Rule 10.
- **No Layout Breakage:** VIP seat swaps must handle seat capacity gracefully without displacing active stage actors.

---

## 3. System Architecture & Components

```mermaid
flowchart TD
    TikTok[TikTok Live Webcast Share Event] -->|tiktokConnection.on('share')| Server[server.js]
    Server -->|io.emit('action_share')| Client[public/app.js]

    subgraph Client Actions
        Client --> A[1. RoundManager.addMerit +5 Pts]
        Client --> B[2. Promote Devotee to VIP Front Row Seat 0-4]
        Client --> C[3. Attach Golden Aura & 🕊️ สะพานบุญ Tag]
        Client --> D[4. Show Golden Toast Banner]
        Client --> E[5. AI Host Speaks Personalized Blessing]
        Client --> F[6. Increment Share Counter: Every 20 Shares -> Golden Rain]
    end
```

### 3.1 Server Event Ingestion (`server.js`)
- In `tiktokConnection.on('share', data)`:
  - Extract user profile (`uniqueId`, `nickname`, `avatar`).
  - Seat user via `getOrCreateDisciple(user, false, true)`.
  - Emit structured socket event `action_share` with `{ uniqueId, nickname, avatar, timestamp: Date.now() }`.

### 3.2 Client Processing (`public/app.js`)
- `onShareEvent(share)`:
  1. `roundManager.addMerit(share, 5, 'เปิดสะพานบุญ')`.
  2. Locate disciple in `disciplesMap`. If not already in seats 0–4, promote to available VIP seat via `disciple.moveToNewSeat(vipSeat)`.
  3. Set `disciple.userData.isSharer = true`. Add `🕊️ สะพานบุญ` to nameplate text.
  4. Trigger golden screen banner:
     `<div class="share-toast">✨ ขออนุโมทนาคุณ [ชื่อ] ร่วมเปิดสะพานบุญแชร์ไลฟ์ ✨</div>`
  5. Queue AI Host voice blessing:
     `"อนุโมทนาคุณ ${cleanName} ร่วมเปิดสะพานบุญแชร์ไลฟ์นี้นะคะ ขอให้บารมีหนุนนำนะคะ"` (Rule 10 compliant: 8-10 words, ~1.5s, ends with "นะคะ").
  6. Increment `cumulativeShares++`. If `cumulativeShares % 20 === 0`, trigger sanctuary celebration (`triggerGoldenBellEffect()`).

---

## 4. Safety & Anti-Ban Guarantees
- **Zero Terminal Interruption (Rule 10):** All changes executed using native tool calls (`read_file`, `write_file`, `edit_file`).
- **TikTok Policy Safe:** The wording is framed strictly as devotional community contribution ("สะพานบุญ / บอกบุญกัลยาณมิตร") with zero commercial solicitation.
