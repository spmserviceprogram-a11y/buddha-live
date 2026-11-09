# Control Panel Tabbed Quick-Deck Spec

## Intent & Why
The existing `#control-panel` in `public/index.html` was rendered as a single long vertical drawer (>1,000px). On desktop streaming setups, adjusting settings or triggering test events during a live broadcast required continuous scrolling up and down. This redesign organizes all controls into 4 clean segmented tabs with a quick-status header.

## Approaches Considered
1. **Approach 1 (Selected): 380px Tabbed Slide-out Drawer**
   - Keeps altar scene visible while live streaming.
   - 4 segmented tabs (`🔴 เชื่อมต่อ`, `🧪 จำลอง/บอท`, `🔊 เสียง/AI`, `🎙️ ไมค์ Live`).
   - Compact 4-column grid for the 11 gift test buttons.
2. **Approach 2: Centered Floating Modal (680px)**
   - Rejected because it occludes the 3D altar scene and prostrating characters during live testing.
3. **Approach 3: Collapsible Accordion**
   - Rejected because it still causes vertical layout shifts and requires scrolling.

## Design Details
- **Header**: Quick indicators for TikTok connection (`#conn-status-mini`), Round number (`#panel-round-indicator`), Chrome BGM quick mute, and Close button.
- **Tab Bar**: 4 tabs (`[data-tab="connect"]`, `[data-tab="simulate"]`, `[data-tab="audio"]`, `[data-tab="mic"]`).
- **Pane 1 (Connect)**: TikTok Live Username `@`, EulerStream Key, Connect/Disconnect buttons, `#conn-status`.
- **Pane 2 (Simulate)**: Bot count buttons (0, 8, 16, 22), 4-column gift simulation grid (`.sim-gift-grid`), Action buttons (Join, Follow, Chat "สาธุ", Share bridge, Fast 8s round cycle, Video 33%, 66%, Climax).
- **Pane 3 (Audio & AI)**: Voice checkboxes, SFX bell, 432Hz Zen, Sound style dropdown, Volume slider.
- **Pane 4 (Mic Router)**: VU meter, Mic mode select, Device sink select & scan, diagnostic guide, keepalive, dual-monitor, test mic, reset scene.

## Non-Breaking Compatibility
All existing HTML IDs and JavaScript event listener attachments remain 100% untouched.
