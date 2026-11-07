# 0001. Live Viewer Tribute & HUD Architecture

## Context
Previously, new live viewers were only allocated a 3D avatar when executing a TikTok Follow event, requiring viewers to follow before seeing any presence in the temple. Furthermore, the 1-coin gift triggered stationary incense smoke rather than an engaging character action, and the bottom viewport was heavily obstructed by a bulky bottom-docked leaderboard and recommendation banners that occluded the 3D congregation.

## Decision
1. **Room Join Allocation**: Automatically allocate newly arrived viewers to available sanctuary seats upon entering the room (`member`/`join`), seating them in peaceful meditation facing the altar.
2. **Follow Blessing**: Repurpose the Follow event to trigger a stationary Devotional Bow and Golden Blessing Aura with radiant petal bursts at the devotee's assigned cushion.
3. **Rose Tribute Kowtow Walk**: Designate the 1-coin Rose gift as the primary interactive ceremonial event, prompting the devotee to walk down the red carpet aisle and perform the 3-phase Benjangkhapradit kowtow before Guan Yin.
4. **Top HUD Layout**: Bifurcate the status displays to the upper corners—Top-Right for the Top Donor Podium and Top-Left for the Tribute Guide ticker—leaving the center altar vista and bottom sanctuary floor completely unobstructed.

## Consequences
- Immediate visual gratification for all arriving live viewers, increasing audience retention.
- Greatly enhanced incentive for 1-coin Rose donations as viewers actively send their avatar to perform the full altar kowtow ceremony.
- The bottom 40% of the screen is cleared of heavy drawers, maximizing visibility of the 3D anime devotees, red carpet, and sacred sanctuary environment.

