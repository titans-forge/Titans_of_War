import { useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useDialogFocus } from './useDialogFocus.js';
import license from '../../LICENSE?raw';
import notices from '../../NATIVE_THIRD_PARTY_NOTICES.txt?raw';

export function AppInformation() {
  const [open, setOpen] = useState(false);
  const panel = useRef(null);
  useDialogFocus(panel, open, () => setOpen(false));
  if (!Capacitor.isNativePlatform()) return null;
  return <>
    <button className="tactical-button" onClick={() => setOpen(true)}>About this app</button>
    {open && <div className="native-about-backdrop">
      <section ref={panel} tabIndex={-1} className="native-about" role="dialog" aria-modal="true" aria-label="About Civil War for iPhone">
        <button onClick={() => setOpen(false)}>Close</button>
        <h2>Titans of War: Civil War</h2>
        <p>iPhone test build 1 · Game 0.32.0 / v45 · Titans Forge</p>
        <p>Campaigns, battles, art and music are bundled for offline play. Historical reference links require internet. Desktop local AI is unavailable in this edition.</p>
        <p>Your campaign is stored on this device, separately from Safari or itch. Export it before deleting the app. Use the campaign desk to import a browser save or export through Apple's share sheet, choosing Save to Files to keep a backup.</p>
        <p>Leaving the app pauses the battle. Campaign battles are suspended when saving is available; resume starts paused. Quick battles and training pause but are not saved across closing the app.</p>
        <p>No account, advertising or analytics SDK is included. No game progress is uploaded. Exports go only to the destination you choose.</p>
        <details><summary>Forge Game License 2.0</summary><pre>{license}</pre></details>
        <details><summary>Native software notices</summary><pre>{notices}</pre></details>
      </section>
    </div>}
  </>;
}
