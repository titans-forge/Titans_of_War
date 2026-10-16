# Battle display continuity and earlier facing controls

Save and leave records Fire arc, Mission markers and Tactical overlay in optional `presentation.displayPreferences`. Resume initializes the three checkboxes and renderer flags from that record. Version 1 records contain the battle ID and three booleans; legacy, mismatched or malformed optional data uses the existing defaults. Getter-backed optional data is not executed. Audio permission is deliberately not serialized.

The actual field wrapper captures the three current declarative choices through its public checkpoint ref, sets `showRange` when creating a Scene and synchronizes checkbox changes. The encounter suspend callback remains exact. Its Scene class, engine, checksum and save transaction remain byte-for-byte unchanged. The checkpoint helper returns a new wrapper/presentation object while preserving combat and other presentation owners. Camera, selected formation, unconfirmed commands and detail expansion are outside this preference repair.

Front and target controls now follow Formation order before long briefing and status material. The group opens initially on phone-size viewports. All eight facing handlers, target behavior and inactive/artillery restrictions keep their existing rules; longer explanations follow immediate controls. Small screens may still require ordinary panel scrolling.

The focused suite executes the current preference module, component handlers, field-wrapper initialization/recreation and real field storage/engine round trips. Its controlled hooks and Phaser stub are source-behavior evidence; public browser checks own real React effects, phone reachability and rendered pixels. Preservation binds the exact installed v40 baseline without refreshing prior fixtures, ledgers or behavioral assertions.

This pass supplies no new artwork and does not resolve the prior 5,830-pixel or current 1,376-pixel neighboring-body continuation findings. North-facing Union walking clips, dense-column readability and physical Windows/phone testing remain separate priorities. Work receipts and public QA evidence live outside the game checkout under `civil-war-v41-20261007`.
