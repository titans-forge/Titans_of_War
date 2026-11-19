import React, { useId, useState } from 'react';
import { Image as ImageIcon, Map, Camera, ChevronDown } from 'lucide-react';
import { resolveScenarioMediaSet } from '../game/mediaCatalog.js';
import { resolvePresentationArt } from '../game/presentationArt.js';
import { publicAssetUrl } from '../game/publicPath.js';
import BattlefieldMap from './BattlefieldMap.jsx';
import './scenarioPresentation.css';

function situationExcerpt(description) {
  const opening = description.match(/^(?:.+?[.!?](?:\s+|$)){1,2}/s)?.[0].trim() || description;
  const limit = 180;
  if (opening.length <= limit) return opening;
  const first = opening.match(/^.+?[.!?](?:\s+|$)/s)?.[0].trim();
  if (first && first.length <= limit) return first;
  const end = opening.lastIndexOf(' ', limit - 1);
  return `${opening.slice(0, end > 0 ? end : limit - 1)}…`;
}

/** Scene interpretation, archive evidence and the game map have distinct views. */
export default function ScenarioTheater({ scenario, gameState, children }) {
  const art = resolvePresentationArt(scenario?.id);
  const [view, setView] = useState(null);
  const [failedSources, setFailedSources] = useState([]);
  const [detailsView, setDetailsView] = useState(null);
  const detailsId = useId();
  const expanded = detailsView !== null && detailsView.scenarioId === scenario?.id;
  const description = scenario?.description || '';
  const { theater: catalog, briefingMap } = resolveScenarioMediaSet(scenario?.id);
  const hasMap = briefingMap && !failedSources.includes(briefingMap.src);
  const requestedMode = view?.scenarioId === scenario?.id ? view?.mode : null;
  const mode = requestedMode && (requestedMode !== 'map' || hasMap) ? requestedMode : art ? 'art' : 'archive';
  const markUnavailable = src => setFailedSources(previous => previous.includes(src) ? previous : [...previous, src]);
  const archive = catalog.assetKey === 'unknown' && scenario?.image
    ? { ...catalog, src: scenario.image, title: `${scenario.title} scenario art`, caption: 'Generated scenario artwork for this campaign decision.', historicalMedium: 'generated-art', credit: 'Titans Forge project archive' }
    : catalog;
  const alternateLabel = archive.historicalMedium === 'generated-art' ? 'Project art' : archive.sourceUrl ? 'Archive' : 'Image';
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
    {description && <p className="scenario-situation">{situationExcerpt(description)}</p>}
    <button type="button" className="scenario-detail-toggle" aria-controls={detailsId} aria-expanded={expanded}
      onClick={() => setDetailsView(expanded ? null : { scenarioId: scenario?.id })}>
      Briefing details &amp; media <ChevronDown size={16} aria-hidden="true" />
    </button>
    <div id={detailsId} className="scenario-detail-content">
      <div className="scenario-detail-body">
        {(art || hasMap) && <div className="scenario-view-controls" role="group" aria-label="Scenario views">
          {art && button('art', 'Scene art', ImageIcon)}
          {button('archive', art ? alternateLabel : 'Image', Camera)}
          {hasMap && button('map', 'Historical map', Map)}
        </div>}
        {mode === 'map'
          ? <BattlefieldMap key={briefingMap.src} map={briefingMap} onUnavailable={() => markUnavailable(briefingMap.src)} />
          : <figure className="scenario-figure">
          <div className="scenario-visual">
            {!failedSources.includes(media.src) ? <img
              src={publicAssetUrl(media.src)} alt={media.alt || media.title}
              width={showingArt ? 1672 : undefined} height={showingArt ? 941 : undefined}
              decoding="async" loading="lazy"
              style={{ objectFit: showingArt || media.cropMode === 'contain' ? 'contain' : 'cover', objectPosition: `${(media.cropFocus?.x ?? 0.5) * 100}% ${(media.cropFocus?.y ?? 0.5) * 100}%` }}
              onError={() => markUnavailable(media.src)}
            /> : <p className="scene-unavailable">This image is unavailable. The briefing is below.</p>}
          </div>
          <figcaption>
            <span className="scene-medium">{medium}{!showingArt && archive.provenanceStatus !== 'verified' ? ' · provenance unverified' : ''}</span>
            {mode === 'art' && artFailed && <p>Scene artwork could not load. Showing the alternate image.</p>}
            <p>{media.caption}</p>
            <details className="scene-source"><summary>About this image</summary>
              <p>{media.credit || 'Generated for Titans Forge · 2026'}</p>
              {showingArt ? <><p>New interpretive artwork. Use the historical context and source material to check the record; visual details are not documentary evidence.</p>
                {media.scopeNote && <p>{media.scopeNote}</p>}
                {media.sourceLinks?.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label || source.title || 'Historical source'}</a>)}
              </> : <><p>{media.provenanceStatus === 'verified' ? media.license : 'Source attribution still needs review.'}</p>{media.sourceUrl && <a href={media.sourceUrl} target="_blank" rel="noreferrer">Archive source</a>}</>}
            </details>
          </figcaption>
        </figure>}
        {description.length > 420 ? <>
          <p className="briefing-preview">{description.match(/^.*?[.!?](?:\s|$)/)?.[0] || `${description.slice(0,220)}…`}</p>
          <details className="scenario-briefing"><summary>Full briefing</summary><p>{description}</p></details>
        </> : <p className="scenario-briefing-text">{description}</p>}
      </div>
      {children}
    </div>
  </section>;
}
