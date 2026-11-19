import React, { useState } from 'react';
import { Maximize2, Minus, Plus } from 'lucide-react';
import { publicAssetUrl } from '../game/publicPath.js';
import { CampaignDialog } from './CampaignOverlays.jsx';

const ZOOM_LEVELS = [1, 1.5, 2, 3, 4];

function MapInspector({ map, src, onClose, onUnavailable }) {
  const [level, setLevel] = useState(0);
  const [aspect, setAspect] = useState(1);
  const zoom = ZOOM_LEVELS[level];

  return <CampaignDialog title={map.title} onClose={onClose} className="cw-map-inspector">
    <div className="cw-map-tools" role="group" aria-label="Map zoom">
      <button type="button" className="tactical-button" aria-label="Zoom out" disabled={level === 0} onClick={() => setLevel(level - 1)}><Minus size={18} /></button>
      <button type="button" className="tactical-button" data-dialog-initial-focus onClick={() => setLevel(0)}>Fit map</button>
      <button type="button" className="tactical-button" aria-label="Zoom in" disabled={level === ZOOM_LEVELS.length - 1} onClick={() => setLevel(level + 1)}><Plus size={18} /></button>
      <output aria-live="polite">{zoom === 1 ? 'Fitted' : `${zoom}× fit`}</output>
    </div>
    <div className="cw-map-scroll" role="region" aria-label="Historical map. Scroll to see more when zoomed in." tabIndex={0}
      style={{ '--map-aspect': aspect, '--map-zoom': zoom }}>
      <img src={src} alt={map.alt || map.title} draggable={false}
        onLoad={({ currentTarget }) => setAspect(currentTarget.naturalWidth / currentTarget.naturalHeight)}
        onError={onUnavailable} />
    </div>
    <a className="cw-map-source" href={map.sourceUrl} target="_blank" rel="noreferrer">View archive source</a>
  </CampaignDialog>;
}

export default function BattlefieldMap({ map, onUnavailable }) {
  const [inspecting, setInspecting] = useState(false);
  const src = publicAssetUrl(map.src);
  return <>
    <figure className="scenario-figure cw-briefing-map">
      <button type="button" className="cw-map-preview" aria-label={`Inspect map · ${map.title}`} onClick={() => setInspecting(true)}>
        <img src={src} alt={map.alt || map.title} decoding="async" onError={onUnavailable} />
        <span><Maximize2 size={15} aria-hidden="true" /> Inspect map</span>
      </button>
      <figcaption>
        <span className="scene-medium">Historical map</span>
        <h3>{map.title}</h3>
        <p>{map.caption}</p>
        <a className="cw-map-source" href={map.sourceUrl} target="_blank" rel="noreferrer">{map.sourceInstitution}</a>
      </figcaption>
    </figure>
    {inspecting && <MapInspector map={map} src={src} onClose={() => setInspecting(false)} onUnavailable={onUnavailable} />}
  </>;
}
