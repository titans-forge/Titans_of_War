# Civil War 0.32.0 / v45 — iPhone source edition

This release brings GitHub main forward from 0.3.1 to the polished v44 game and its new Capacitor iPhone app. The game mechanics remain those of v44; v45 adds native packaging, an original cannon icon, safe-area and landscape layout fixes, native file sharing and pause/suspend handling.

The browser ZIP is playable through a static web server. It is not an installable iPhone package. Build the iPhone app from `ios/App/App.xcodeproj` using your own developer signing team; no private certificates or personal device profiles are distributed. Hosted GitHub Pages and itch remain on their existing v44 release.

## Verification

Production build and license staging pass. The native predecessor was built, signed, installed and launched on an iPhone 14 Pro Max. Targeted battle engine, campaign-integration, checkpoint, mobile-control, close-combat and UI-lifecycle tests passed during conversion. This is a first native test edition; full real-device playthrough and file-sharing round trips are pending.

The historical complete suite contains byte-for-byte v44 packaging preservation assertions and stops on changed package.json bytes. These assertions were not weakened to accept the native edition. See IPHONE_APP.md for remaining checks and dependency advisory status.

## Rights

Forge Game License 2.0 remains unchanged. Earlier MIT and Forge grants remain preserved. Assets retain their individual media terms and native dependencies retain their MIT notices. The existing licensing checkpoint is the original adoption record, not a new whole-tree rights reassignment.
