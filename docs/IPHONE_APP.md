# Civil War iPhone edition — 0.33.0 / v46

The v46 game ships in the bundled Capacitor iPhone app as native version 1.0 (2).

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

## Verification

Run `node scripts/check-civil-war-current.mjs` for current-source tests. To verify historical preservation, pass the separately frozen v44 directory as the optional argument. The old strict package hash belongs to that archived release.

For device testing, verify touch orders, both orientations, campaign suspend and resume, and local audio. This build is intended for testing on registered devices with Apple developer signing.

## Licensing and source provenance

The v44 baseline was verified against its 1,675-file frozen source inventory before conversion. The iPhone build uses the same game assets as the v46 web package. Forge Game License 2.0 and all earlier licensing notices are retained; native dependencies retain their MIT notices. No personal provisioning profile, signing certificate, device receipt or signed phone binary is included in the repository.
