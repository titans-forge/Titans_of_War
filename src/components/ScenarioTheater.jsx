import React, { useState } from 'react';
import { Image as ImageIcon, Map, Camera } from 'lucide-react';
import { resolveScenarioMedia } from '../game/mediaCatalog.js';
import { resolvePresentationArt } from '../game/presentationArt.js';
import { publicAssetUrl } from '../game/publicPath.js';
import BattlefieldMap from './BattlefieldMap.jsx';
import './scenarioPresentation.css';

/** Scene interpretation, archive evidence and the game map have distinct views. */
export default function ScenarioTheater({ scenario, gameState, selectedChoiceId }) {
  const art = resolvePresentationArt(scenario?.id);
  const [view, setView] = useState(null);
  const mode = view?.scenarioId === scenario?.id ? view.mode : art ? 'art' : 'archive';
  const [failedSources, setFailedSources] = useState([]);
  const catalog = resolveScenarioMedia(scenario?.id);
  const archive = catalog.assetKey === 'unknown' && scenario?.image
    ? { ...catalog, src: scenario.image, title: `${scenario.title} scenario art`, caption: 'Generated scenario artwork for this campaign decision.', historicalMedium: 'generated-art', credit: 'Titans Forge project archive' }
    : catalog;
  const artFailed = art && failedSources.includes(art.src);
  const showingArt = mode === 'art' && art && !artFailed;
  const media = showingArt ? art : archive;
  const medium = showingArt ? art.label : ({
    'generated-art': 'Generated interpretation', 'period-art': 'Historical painting',
    'period-photo': 'Historical photograph', 'modern-photo': 'Modern battlefield photograph',
    reenactment: 'Reenactment photograph', map: 'Archive map',
  }[archive.historicalMedium] || 'Unclassified image');
  const choose = next => setView({ scenarioId: scenario?.id, mode: next });
  const button = (id, label, Icon) => <button type="button" aria-pressed={mode === id} onClick={() => choose(id)}><Icon size={15} aria-hidden="true" />{label}</button>;
  return <section className="scenario-theater">
    <div className="scenario-identity">
      <div><h2>{scenario?.title}</h2><p className="scenario-command">{scenario?.actor || gameState?.actor} · {scenario?.roleLabel || gameState?.roleLabel}</p></div>
    </div>
    <div className="scenario-view-controls" role="group" aria-label="Scenario views">
      {art && button('art', 'Scene art', ImageIcon)}
      {button('archive', art ? 'Archive' : 'Image', Camera)}
      {button('tactical', 'Map', Map)}
    </div>
    {mode === 'tactical' ? <BattlefieldMap scenarioId={scenario?.id} selectedChoiceId={selectedChoiceId} /> : <figure className="scenario-figure">
      <div className="scenario-visual">
        {!failedSources.includes(media.src) ? <img
          src={publicAssetUrl(media.src)} alt={media.alt || media.title}
          width={showingArt ? 1672 : undefined} height={showingArt ? 941 : undefined}
          decoding="async" fetchPriority="high"
          style={{ objectFit: showingArt || media.cropMode === 'contain' ? 'contain' : 'cover', objectPosition: `${(media.cropFocus?.x ?? 0.5) * 100}% ${(media.cropFocus?.y ?? 0.5) * 100}%` }}
          onError={() => setFailedSources(previous => previous.includes(media.src) ? previous : [...previous, media.src])}
        /> : <p className="scene-unavailable">This image is unavailable. The briefing and map are still accessible.</p>}
      </div>
      <figcaption>
        <span className="scene-medium">{medium}{!showingArt && archive.provenanceStatus !== 'verified' ? ' · provenance unverified' : ''}</span>
        {mode === 'art' && artFailed && <p>Scene artwork could not load. Showing the project archive image.</p>}
        <p>{media.caption}</p>
        <details className="scene-source"><summary>About this image</summary>
          <p>{media.credit || 'Generated for Titans Forge · 2026'}</p>
          {showingArt ? <><p>New interpretive artwork. Use the historical context and source material to check the record; visual details are not documentary evidence.</p>
            {media.sourceLinks?.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label || source.title || 'Historical source'}</a>)}
          </> : <><p>{media.provenanceStatus === 'verified' ? media.license : 'Source attribution still needs review.'}</p>{media.sourceUrl && <a href={media.sourceUrl} target="_blank" rel="noreferrer">Archive source</a>}</>}
        </details>
      </figcaption>
    </figure>}
    {(scenario?.description?.length || 0) > 420 ? <>
      <p className="briefing-preview">{scenario.description.match(/^.*?[.!?](?:\s|$)/)?.[0] || `${scenario.description.slice(0,220)}…`}</p>
      <details className="scenario-briefing"><summary>Full briefing</summary><p>{scenario.description}</p></details>
    </> : <p className="scenario-briefing-text">{scenario?.description}</p>}
  </section>;
}
