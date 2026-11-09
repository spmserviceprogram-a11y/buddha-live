# Tabbed Control Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign and streamline the streaming control panel (`#control-panel`) into a 380px Desktop Tabbed Quick-Deck with 4 clean panes and a compact 4-column gift simulation grid, preserving all existing functionality and DOM IDs.

**Architecture:** 
- Restructure `#control-panel` in `public/index.html` with a sticky Quick-Status header, a 4-segmented tab navigation bar, and 4 dedicated tab content panes.
- Add CSS in `public/style.css` for desktop-optimized 380px drawer, active tab indicator, compact 4-column simulation gift grid, and quick-status tags.
- Add tab switching and quick-status synchronization in `public/app.js` without touching existing event listener bindings.

**Tech Stack:** Vanilla JavaScript (ES Module), HTML5, CSS3 Glassmorphism, Web Audio API, Socket.IO.

**Spec:** [Control Panel Tabbed Quick-Deck Spec](docs/superpowers/specs/2026-11-10-tabbed-control-panel-design.md)

## Global Constraints

- 100% Unattended Autonomous Execution (Rule 10 in `GEMINI.md`): Native tool calls only (`read_file`, `edit_file`, `write_file`), zero routine terminal commands.
- Zero breaking DOM changes: All existing element IDs (`#tiktok-user-input`, `#euler-api-key-input`, `#btn-connect`, `#btn-disconnect`, `#conn-status`, `#sim-gift-1`, `#chk-voice`, `#select-mic-device`, etc.) must remain intact.
- Thai typography: Kanit (headers/tabs) and Sarabun (content) with high-contrast gold-crimson temple theme.
- Cache buster: Bump cache query strings in `public/index.html` to `v19`.

## Review Focus

1. **Tab persistence & switching:** Switching tabs must not trigger any form submissions, audio interruptions, or reset any active toggles/inputs.
2. **Event listener preservation:** All 18 simulation buttons, connection buttons, audio toggles, and mic selectors must maintain their exact event handlers.
3. **Compact gift grid readability:** The 11 simulation gifts in Tab 2 must clearly show icon, gift name, and coins in a 4-column grid without text overflowing or vertical scroll sprawl.
4. **Quick Status synchronization:** The top header badges (TikTok connection status, Round number) must reflect live state immediately upon tab open or status change.
5. **Drawer viewport responsiveness:** Drawer must stay comfortably within 380px on desktop screens without overflowing the 3D altar scene.

---

### Task 1: Restructure Control Panel HTML (`public/index.html`)

**Files:**
- Modify: `E:/Buddha/public/index.html:590-836`

**Interfaces:**
- Consumes: Existing IDs and structure of `#control-panel`
- Produces: 
  - `.panel-quick-header`: Quick-status pills (TikTok status, Round number, Chrome BGM quick-mute, Close button)
  - `.panel-tab-bar`: 4 tab buttons (`[data-tab="connect"]`, `[data-tab="simulate"]`, `[data-tab="audio"]`, `[data-tab="mic"]`)
  - 4 `.panel-tab-pane`: `#pane-connect`, `#pane-simulate`, `#pane-audio`, `#pane-mic`
  - `.sim-gift-grid`: 4-column compact grid wrapping the 11 gift simulation buttons (`#sim-gift-1` to `#sim-gift-299`)

- [ ] **Step 1: Inspect and backup the exact line range of `#control-panel` in `public/index.html`**
- [ ] **Step 2: Edit `public/index.html` to insert the Quick Header, Tab Bar, and wrap the 4 sections into tab panes**
- [ ] **Step 3: Verify all 18 simulation buttons, inputs, and toggles retain their exact original IDs**
- [ ] **Step 4: Bump cache busters in `public/index.html` to `v19`**

---

### Task 2: Implement Tabbed & Compact Grid Styling (`public/style.css`)

**Files:**
- Modify: `E:/Buddha/public/style.css:3660-3860`

**Interfaces:**
- Consumes: `.panel-quick-header`, `.panel-tab-bar`, `.tab-btn`, `.panel-tab-pane`, `.sim-gift-grid`
- Produces: Polished 380px desktop drawer layout, active tab glowing indicator, 4-column compact gift cards with hover effects

- [ ] **Step 1: Update `.control-panel` CSS rules (width: 380px, right: -400px, transition)**
- [ ] **Step 2: Add styles for `.panel-quick-header`, status badges, and quick-action mute button**
- [ ] **Step 3: Add styles for `.panel-tab-bar` and `.tab-btn` (active gold glow, Kanit font)**
- [ ] **Step 4: Add styles for `.panel-tab-pane` (hidden by default, active displays flex column)**
- [ ] **Step 5: Add styles for `.sim-gift-grid` (4-column grid, compact gift pill, icon + name + coin)**
- [ ] **Step 6: Verify layout with no horizontal overflow and clean scrollbars**

---

### Task 3: Implement Tab Switching & Status Sync Logic (`public/app.js`)

**Files:**
- Modify: `E:/Buddha/public/app.js`

**Interfaces:**
- Consumes: Tab click events and system state (`roundManager.roundNum`, connection status)
- Produces: `initControlPanelTabs()` function and dynamic status updates

- [ ] **Step 1: Implement `initControlPanelTabs()` to handle tab switching on `.tab-btn` click**
- [ ] **Step 2: Add sync helper `updateControlPanelQuickStatus()` to update the top status badge when TikTok connects/disconnects and when rounds change**
- [ ] **Step 3: Wire quick-mute Chrome BGM button in header to toggle audio smoothly**
- [ ] **Step 4: Verify all simulation buttons (`#sim-gift-*`, `#sim-round-cycle`, `#sim-video-*`) continue firing correctly**

---

### Task 4: Full System Verification & Review

**Files:**
- Verify: `E:/Buddha/public/index.html`
- Verify: `E:/Buddha/public/style.css`
- Verify: `E:/Buddha/public/app.js`

- [ ] **Step 1: Read and verify HTML structure of `#control-panel`**
- [ ] **Step 2: Read and verify CSS declarations for `.control-panel`, `.panel-tab-bar`, `.sim-gift-grid`**
- [ ] **Step 3: Read and verify JavaScript tab logic and quick-status bindings in `app.js`**
- [ ] **Step 4: Confirm zero syntax errors, zero broken IDs, and 100% adherence to Rule 10**
