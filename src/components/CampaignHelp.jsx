import React, { useState } from 'react';
import { CampaignDialog } from './CampaignOverlays';

const STEPS = [
  ['Read your orders', 'Follow the Civil War through changing command roles. Read the date, your commander, and the briefing before choosing. Choose Standard or Story before your first decision. Preserve your forces and resources while shaping the campaign outcome; historical events and alternate-history possibilities appear along the way.'],
  ['Choose a strategy', 'Compare the four decision cards and their tradeoffs. Consult advisors or open Historical context for more detail. Select one available option, then Commit decision. Correspondence is optional.'],
  ['Plan your supplies', 'In a new campaign, the selected-order forecast includes upkeep and any recovery allocation. Open Order forecast and supply recovery to inspect the costs. Selecting an allocation changes only your plan; it takes effect with the decision. Battle losses can change the forecast. Older saved campaigns keep their original rules.'],
  ['Command the field', 'At supported battles, lead the formations yourself or delegate field command. Battles begin paused. Choose Learn command for six hands-on exercises in movement, support, firing range, artillery lanes and recovery. Quick battle lets you practice separately from your campaign.'],
  ['Read the consequences', 'The after-action report shows what changed and why, including upkeep and field-command effects. Continue to the next decision. Timeline divergence describes how far this run departs from the authored historical path; it is not a measure of good command.'],
  ['Keep your campaign', 'Open Campaign desk to inspect factions, campaign progress, audio, and save tools. Journal records your decisions and checkpoints. Campaign progress saves on this browser; export a save for a portable backup. In normal campaigns and practice battles, use Leave battle → Save and leave before closing the page. A field save resumes paused on the same device; it is separate from campaign exports.'],
];

export function CampaignWalkthrough({ onClose }) {
  const [step, setStep] = useState(0);
  return <CampaignDialog title="Campaign walkthrough" onClose={onClose} className="campaign-help">
    <p className="muted">Step {step + 1} of {STEPS.length}</p>
    <div aria-live="polite" aria-atomic="true"><h3>{STEPS[step][0]}</h3><p>{STEPS[step][1]}</p></div>
    <nav aria-label="Walkthrough steps">
      <button className="tactical-button" disabled={step === 0} onClick={() => setStep(step - 1)}>Previous</button>
      <button className="tactical-button primary" onClick={() => step === STEPS.length - 1 ? onClose() : setStep(step + 1)}>{step === STEPS.length - 1 ? 'Return to campaign' : 'Next step'}</button>
    </nav>
  </CampaignDialog>;
}

export function CampaignKeyboardHelp({ onClose }) {
  return <CampaignDialog title="Keyboard controls" onClose={onClose} className="campaign-help">
    <p>Campaign shortcuts work when you are not typing or using another control. In battle, use Tab to reach the roster and orders; Move destination accepts keyboard input.</p>
    <dl className="keyboard-controls">{[
      ['1 / 2 / 3 / 4', 'Select a decision'], ['Space', 'Commit the selected decision'],
      ['L', 'Open and focus correspondence'], ['U', 'Undo the last decision'],
      ['P', 'Play or pause music'], ['M', 'Mute or unmute music'], ['N', 'Next music track'],
      ['Escape', 'Close a dialog or open the battle leave prompt'], ['Tab / Shift + Tab', 'Move between controls'],
    ].map(([key, action]) => <div key={key}><dt><kbd>{key}</kbd></dt><dd>{action}</dd></div>)}</dl>
    <button className="tactical-button primary" onClick={onClose}>Return to campaign</button>
  </CampaignDialog>;
}
