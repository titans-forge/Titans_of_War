# Civil War iPhone edition — 0.32.0 / v45

The existing v44 game is now packaged as a bundled Capacitor iPhone app. Native version 1.0 (1). The bronze cannon icon was generated for this edition.

## Playing and saves

Use Quick battle for a practice encounter, Learn command for guided controls, or begin a campaign. Portrait and landscape are supported. On a short landscape phone use Find on field for sector and exit locations; formation details and the command brief remain accessible.

Game assets and music are bundled. Historical reference links require internet. Saves are local to the app and separate from Safari/itch storage. Use the campaign desk to export through Apple's share sheet, selecting Save to Files. Closing the sheet does not prove that a file was saved. Export before deleting the app.

Leaving the app pauses battle/training and stops campaign audio. Campaign battles request a suspended checkpoint through the existing save flow. Quick battles and training are not preserved across termination. Desktop local AI is unavailable in the native app.

## Rebuild

Run from this project directory:

```sh
npm ci
npm run ios:sync
npm run ios:check
npm run ios:open
```

In Xcode use scheme **App**, your Apple developer signing team, and your registered phone. Increment the native build number for subsequent distributed test builds. Never edit `ios/App/App/public` directly: `ios:sync` regenerates it and stages license files.

This is a development-signed installation. It is not an App Store submission or a generally distributable IPA; signing/provisioning must remain valid for the registered device.

## Verification and limitations

The predecessor native test build (v44 content) was installed and launched on an iPhone 14 Pro Max. Simulator checks exercised opening menus, setup scrolling, Manassas rendering in portrait and Gettysburg rendering/start/overview controls in landscape. Long setup-dialog scrolling and landscape HUD sizing were repaired. A final small objective-strip adjustment still needs a complete touch walkthrough.

Web production, simulator and signed device builds passed. All 401 bundled distribution files matched the native bundle. Battle engine, 44 battle-choice integrations, deterministic checkpoints, close combat, mobile controls and UI lifecycle checks passed during conversion. These checks are not a full phone campaign playthrough.

The historical full test suite stops at its frozen v44 package.json checksum: adding native dependencies and a new version changes that file. The preservation assertion has not been weakened. A distinct native release baseline is needed before claiming the complete suite passes. Dependency installation reported four audit advisories (three moderate, one high); remediation remains pending.

Next real-device checks: touch navigation and order confirmation in both orientations; campaign background/suspend and force-close recovery; export/import round trip through Files; music, thermal behavior and sustained performance. This is an early native testing edition, not App Store-qualified.

## Licensing and source provenance

The v44 baseline was verified against its 1,675-file frozen source inventory before conversion. This release adds native packaging and version metadata. Forge Game License 2.0 and all earlier licensing notices are retained; native dependencies retain their MIT notices. No personal provisioning profile, signing certificate, device receipt or signed phone binary is included in the repository.
