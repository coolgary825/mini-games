# Coffee GO acceptance evidence

Date: 2026-10-17. Browser: ego-browser task space 1; localhost:8017.

- Pure game rule tests: 29 passing at initial integration (capture, save, GPS, raid, research, gestures).
- Existing chess regression: 11 passing after installing jsdom into an external temporary test tool directory; no runtime dependency added to arcade.
- Real DOM controls: starter/continue, nearby list, wild encounter, keyboard throw, mouse drag throw, result, collection and reload checked.
- Capture: six pets to seven, basic balls 30 to 29; successful reload retains collection.
- Raid: exactly six selected, actual attack/charged/dodge button actions defeat tier 1; +500 dust and one victory recorded. Reload resumes boss encounter. Drag capture adds the boss once.
- Research: high-tier quests award exactly hyper 3 / master 1; repeat reward buttons disabled.
- Master ball: cancelled confirmation leaves one; accepted confirmation consumes one and captures.
- GPS refresh regression: retained DOM reference across a new fix; rapid focus transitions no longer destroy control nodes or empty nearby list.
- Actual generated 3D canvas and all nine portrait renders inspected. Proportions revised for smaller eyes/ears and less inflated muzzle. Dragon portrait framing corrected.
- Full-window screenshot initially blocked by ego/Chrome capture error (“window minimized”) even while CDP reported maximized. DOM snapshots, geometry and actual WebGL canvas exports used; full-window screenshot remains an environment limitation unless subsequently recorded below.
- Physical outdoor GPS walking: not performed. Fixture GPS checks do not prove physical device location accuracy.

- Independent review: no critical findings; two important issues reproduced and fixed in one pass. Nearby sheet now refreshes on time/cell changes; landscape root no longer exceeds the viewport. Research rollover and HUD stale text grouped into the same time-dependent presentation fix.
- RED evidence: 568×320 viewport had root bottom 400 and menu bottom 369; click was intercepted. Ten-minute rollover retained the old entity ID and clicking did nothing. Daily research stayed enabled after advancing one day.
- GREEN evidence: root bottom 320, menu bottom 289; updated nearby entry opens raid. Executed `browser-regressions.mjs`: six-member gate, landscape battle/capture controls at 568×320 and 667×375, empty bag lock, and daily research reset all pass.
- CP upgrade: visible CP 918→1146 and dust 300→0; further upgrade disabled. Inaccurate location blocks capture. Empty bag can receive exactly five supply balls; repeat supply is blocked. Collection widths 320/390/768/1280 have no horizontal overflow.
- Final pure suite remains 29/29 passing. No deferred review defects.

Implementation decisions and limits:
- Native worktree tool could not open the parent non-repository directory; used an isolated Git worktree in mini-games. Existing unrelated edits preserved.
- Missing execution helper scripts replaced by a manual ledger; no runtime behavior change.
- Spawn anchors use deterministic 55m geographic cells rather than a saved coordinate anchor. Crossing cells can replace the visible encounter set; completed IDs prevent repeat collection in the same cell/time period.
- Ordinary boss catch level is 5 + 2 × tier so its CP is below boss CP; the reward pet is weaker than the original planned level.
- Outdoor GPS accuracy and real-device touch remain unverified. Real GPS integration uses browser geolocation; fixture locations only prove deterministic UI behavior.
- Library internals were not audited; locally vendored libraries include licenses. External map service availability is not guaranteed and has retry feedback.
- Full-window image capture remains blocked by the browser environment; actual 3D renders and DOM geometry were inspected. Non-chibi style uses original proportional 3D models, not original Pokémon assets.

Final integration: copied identical coffee-go files into the original workspace; targeted launcher insertion preserves all prior content. Ego verified 12 launcher cards, no horizontal overflow at390px, and the new card opens the production welcome screen. Integrated rule tests29/29 and existing chess tests11/11 pass. Local server runs from original mini-games on port8017; no public deployment.


Discovery update (approved scope: 9 additional species, shiny variants, two capture berries, type matchups, rotating raid bosses):
- Rule/model suite: 41 tests pass, including all new species reachable/catchable, deterministic variants, actual berry outcomes, one-use effects, old save migration without replaying master rewards, bidirectional battle multipliers and model silhouettes/palettes.
- Browser RED before UI: no berry action. GREEN: visible icewolf chance27%→40%, catch berry3→2, second berry blocked, ball30→29 on catch, shiny identity and consumption survive reload; collection shiny filter shows both saved variants.
- Browser/cache RED: loaded old createPetModel while network source was updated; all new animals appeared as cats and shiny/normal portraits matched. Versioned the production import graph and CSS; GREEN normal/shiny portrait bytes differ and all36 actual WebGL portraits inspected.
- Full-window screenshot capture is available in this update. Inspected forest capture and the contact sheet of all18 normal/shiny models. New animal shapes differ from the original cats; birds have layered feather wings and crystal dragon has additional crystal armor.
- Beginner raid simulations with six level5 coffee pets: espresso win31s, pudding win18s, cocoa win52s using attacks/charged/dodge. Higher tiers retain existing progression.
