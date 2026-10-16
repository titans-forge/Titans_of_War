import React from 'react';
import { CAMPAIGN_STORAGE_KEY, backupOriginalCampaignRaw } from '../game/campaignStorage.js';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Titans of War campaign render failed.', error, info);
  }

  reload = () => {
    window.location.reload();
  };

  clearSaveAndReload = () => {
    const backup = backupOriginalCampaignRaw();
    if (!backup.ok) {
      this.setState({ recoveryError: `Your original save is preserved. ${backup.error || 'A recovery copy could not be verified.'}` });
      return;
    }
    try {
      window.localStorage?.removeItem(CAMPAIGN_STORAGE_KEY);
    } catch (error) {
      this.setState({ recoveryError: 'The original save could not be cleared. Reload or export it from the campaign desk.' });
      return;
    }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="error-boundary" role="alert">
        <section className="error-boundary-panel">
          <h1>Campaign display interrupted</h1>
          <p>
            A scenario or saved state could not be rendered. Reload first; if
            the problem returns, keep a recovery copy of the browser auto-save and start a fresh
            campaign.
          </p>
          {this.state.recoveryError && <p>{this.state.recoveryError}</p>}
          <div className="error-boundary-actions">
            <button type="button" className="tactical-button primary" onClick={this.reload}>
              Reload campaign
            </button>
            <button type="button" className="tactical-button" onClick={this.clearSaveAndReload}>
              Keep recovery copy and restart
            </button>
          </div>
        </section>
      </main>
    );
  }
}
