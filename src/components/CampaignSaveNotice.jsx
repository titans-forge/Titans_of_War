import React from 'react';

export function CampaignSaveNotice({ status, protectedSave = false, demo = false, onRetry, onExport }) {
  const failed = protectedSave || status?.ok === false;
  return <section className={`campaign-save-notice${failed ? ' save-failed' : ''}`} aria-label="Campaign save status">
    <p role={failed ? 'alert' : 'status'}>{protectedSave
      ? 'Progress is not auto-saving. The previous unreadable save is protected; export this campaign to keep your progress.'
      : status?.ok === false
        ? `Progress is not saved in this browser. ${status.error} Retry saving or export your campaign before leaving.`
        : status?.ok
          ? `${demo ? 'Demo' : 'Campaign'} saved on this device · turn ${status.turn}.`
          : 'Preparing campaign save…'}</p>
    {failed && <div className="campaign-save-actions">
      {!protectedSave && <button className="tactical-button" onClick={onRetry}>Retry save</button>}
      <button className="tactical-button" onClick={onExport}>Export campaign save</button>
    </div>}
  </section>;
}
