# Browser acceptance cases (defined before app implementation)

- Fresh state: choose coffee; one starter and 30/5/0/0 inventory. No fabricated map before GPS.
- Location denied/stale/inaccurate: visible explanation; collection remains available; catch/raid blocked.
- Nearby wild -> capture -> centered upward drag -> result -> collection. Capture persisted exactly once.
- Empty bag cannot throw; supplies give five basic balls once per five minutes.
- Master cancellation does not consume; confirmed master catches even on a miss.
- Collection filter, descending CP, detail preview, affordable upgrade changes displayed CP and dust.
- Five pets cannot start raid; exactly six distinct pets can; attack, charged, dodge, health and timer respond.
- Six early pets defeat beginner; victory persists reward and resumes boss encounter after reload.
- Quest reward cannot be claimed twice, and high-tier balls require all listed tasks.
- 320/390/768/1280 widths, rotation and double touch do not overflow or pan map behind capture.
- Corrupt storage offers download and explicit reset; blocked storage preserves memory and warns.
- Tile/WebGL failure displays retry; actual GPS walking must be reported separately from fixture checks.
- GPS callback must retain the actual nearby/menu button nodes while location status is unchanged. Regression reproduced: references were replaced each 5-second fix, causing detached clicks. Verify same node after two updates.
- Map attribution becomes visible after first GPS fix, not only after revisiting map.
