import React, { useEffect, useReducer, useState } from 'react';
import { GETTYSBURG_MOTION_STUDIES, getGettysburgMotionStudyCell } from '../battle/gettysburgMotionStudies.js';
import { createGettysburgMarchComparison, createGettysburgMotionPlaybackState,
  getGettysburgMotionPlaybackPresets, getGettysburgMotionPlaybackInitialPreset, reduceGettysburgMotionPlayback } from '../battle/gettysburgMotionPlayback.js';
import './InfantryMotionReview.css';

// Give long weapons room in both directions, including the retained V4 shot.
const BODY_PREVIEW = { width: 640, height: 520, referenceHeight: 300, rootX: .47, groundY: .82 };
const PLAYBACK_PRESETS = getGettysburgMotionPlaybackPresets(GETTYSBURG_MOTION_STUDIES);

function PoseCell({ study, phase, height, bodyHeight, guides, registered = false, onLoad, onError }) {
  const cell = getGettysburgMotionStudyCell(study, phase);
  const sourceRoot = study.phaseRoots?.[phase] || study.root;
  const register = registered && study.status !== 'rejected' && study.root.kind !== 'nominal';
  const normalized = register && Number.isFinite(study.referenceHeight) && study.referenceHeight > 0
    && Number.isFinite(bodyHeight) && bodyHeight > 0;
  const zoom = normalized ? bodyHeight / BODY_PREVIEW.referenceHeight : 1;
  const cellHeight = normalized ? cell.h * bodyHeight / study.referenceHeight : height;
  const cellWidth = cellHeight * cell.w / cell.h;
  const stageWidth = normalized ? BODY_PREVIEW.width * zoom : cellWidth;
  const stageHeight = normalized ? BODY_PREVIEW.height * zoom : cellHeight;
  const shownRoot = normalized ? { x: BODY_PREVIEW.rootX, y: BODY_PREVIEW.groundY }
    : register ? { x: .5, y: study.root.y } : sourceRoot;
  // Scale the original cell uniformly, clip it, then move that isolated cell
  // into common inspection coordinates. Adjacent source phases cannot leak.
  const offsetX = stageWidth * shownRoot.x - cellWidth * sourceRoot.x;
  const offsetY = stageHeight * shownRoot.y - cellHeight * sourceRoot.y;
  return (
    <div className={`motion-review-pose${guides ? ' has-guides' : ''}`} role="img"
      aria-label={`${study.label}, ${study.phases[phase]}, ${normalized ? 'common body height and registered ground root' : register ? 'registered body root' : 'raw source cell'}`}
      style={{ width: stageWidth, height: stageHeight, '--root-x': `${shownRoot.x * 100}%`, '--root-y': `${shownRoot.y * 100}%` }}>
      <div className="motion-review-source-cell" style={{ width: cellWidth, height: cellHeight, transform: `translate(${offsetX}px, ${offsetY}px)` }}>
        <img src={study.source} alt="" aria-hidden="true" draggable="false" onLoad={onLoad} onError={onError}
          style={{ width: `${study.columns * 100}%`, height: `${study.rows * 100}%`,
            left: `${-cell.x / cell.w * 100}%`, top: `${-cell.y / cell.h * 100}%` }} />
      </div>
      {guides && <div className="motion-review-guides" aria-hidden="true"><span className="motion-review-root" /></div>}
    </div>
  );
}

function StudyPanel({ panel, study, onStudy, phase, onPhase, zoom, guides, registered }) {
  const [imageError, setImageError] = useState('');
  useEffect(() => setImageError(''), [study?.id]);
  if (!study) return <section className="motion-review-study"><p className="motion-review-empty">No source study is registered for this panel.</p></section>;
  const shownPhase = phase % study.phases.length;
  const cell = getGettysburgMotionStudyCell(study, shownPhase);
  return (
    <section className="motion-review-study" aria-label={study.label}>
      <header className="motion-review-study-header">
        <label>{panel === 'left' ? 'Left' : 'Right'} source study
          <select value={study.id} onChange={event => onStudy(event.target.value)}>
            {GETTYSBURG_MOTION_STUDIES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <span className={`motion-review-status status-${study.status}`}>{study.statusLabel}</span>
      </header>
      <div className="motion-review-stage">
        <div className="motion-review-stage-content">
          <PoseCell study={study} phase={shownPhase} height={360 * zoom} bodyHeight={BODY_PREVIEW.referenceHeight * zoom} guides={guides} registered={registered}
            onError={() => setImageError('Source image did not load. Run this reviewer through the development server.')}
            onLoad={event => setImageError(event.target.naturalWidth === study.width && event.target.naturalHeight === study.height
              ? '' : 'Source dimensions differ from this study registry. Recheck the cell divisions before review.')} />
        </div>
      </div>
      {imageError && <p className="motion-review-error" role="alert">{imageError}</p>}
      <div className="motion-review-phase-caption">
        <strong>Sample {shownPhase + 1} / {study.phases.length}</strong>
        <span>{study.phases[shownPhase]}</span>
      </div>
      <div className="motion-review-panel-controls" aria-label={`${panel} panel source inspection`}>
        <button type="button" aria-label={`Previous source sample in ${panel} panel`}
          onClick={() => onPhase((shownPhase - 1 + study.phases.length) % study.phases.length)}>← Previous source</button>
        <button type="button" aria-label={`Next source sample in ${panel} panel`}
          onClick={() => onPhase((shownPhase + 1) % study.phases.length)}>Next source →</button>
        <span>Inspecting a source pauses playback and changes this panel only.</span>
      </div>
      <p className="motion-review-mode">{registered && study.status !== 'rejected' && study.root.kind !== 'nominal'
        ? Number.isFinite(study.referenceHeight) && study.referenceHeight > 0 ? `Common body-height preview · ${BODY_PREVIEW.referenceHeight * zoom} display px reference · fixed ground line`
          : 'Registered preview · fixed body root · source-cell scale'
        : study.root.kind === 'nominal' ? 'Raw preview · nominal guide only' : 'Raw preview · recorded source root'} · filmstrip shows raw cells</p>
      <div className="motion-review-filmstrip" aria-label={`${study.label} filmstrip`}>
        {study.phases.map((label, index) => (
          <button type="button" key={label} aria-label={`Show ${study.label} sample ${index + 1}: ${label}`}
            aria-pressed={shownPhase === index} onClick={() => onPhase(index)}>
            <PoseCell study={study} phase={index} height={84} guides={guides} />
            <span>{index + 1}</span>
          </button>
        ))}
      </div>
      <div className="motion-review-source-details">
        <p>{study.width} × {study.height} px · {study.columns} × {study.rows} equal cells · current cell {cell.w} × {cell.h} px</p>
        <p>{study.root.meaning}</p>
        {study.referenceHeight && <p>Body reference: {study.referenceHeight} source px{study.id === 'union-e-rig' ? ' (approximate cap-to-ground)' : ' (shared across phases)'}</p>}
        <ul>{study.limitations.map(item => <li key={item}>{item}</li>)}</ul>
        <div className="motion-review-source-links">
          <a href={study.source} target="_blank" rel="noreferrer">Open original PNG</a>
          {study.receipt && <a href={study.receipt} target="_blank" rel="noreferrer">Read render receipt</a>}
        </div>
      </div>
    </section>
  );
}

export default function InfantryMotionReview() {
  const [playback, dispatch] = useReducer(reduceGettysburgMotionPlayback, GETTYSBURG_MOTION_STUDIES, studies => {
    const initial = createGettysburgMotionPlaybackState(studies);
    const comparison = getGettysburgMotionPlaybackInitialPreset(PLAYBACK_PRESETS);
    return comparison ? reduceGettysburgMotionPlayback(initial, { type: 'preset', preset: comparison }) : initial;
  });
  const [automaticPlayback, setAutomaticPlayback] = useState(() => !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const [fps, setFps] = useState(4);
  const [zoom, setZoom] = useState(1);
  const [guides, setGuides] = useState(true);
  const [registered, setRegistered] = useState(true);
  useEffect(() => {
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const update = event => {
      if (event.matches) { setAutomaticPlayback(false); dispatch({ type: 'pause' }); }
    };
    preference?.addEventListener?.('change', update);
    return () => preference?.removeEventListener?.('change', update);
  }, []);
  useEffect(() => {
    if (!playback.playing || !automaticPlayback) return undefined;
    const timer = window.setInterval(() => dispatch({ type: 'advance' }), 1000 / fps);
    return () => window.clearInterval(timer);
  }, [playback.playing, automaticPlayback, fps]);
  const inspect = (panel, studyId, phase) => dispatch({ type: 'inspect', panel, sample: { studyId, phase } });
  const selectedMarch = {
    id: 'selected-march', label: 'Selected sources: synchronized march',
    description: 'Both selected marching sources share the same contact and passing phase.',
    sequence: createGettysburgMarchComparison(GETTYSBURG_MOTION_STUDIES, playback.panels.left?.studyId, playback.panels.right?.studyId),
  };
  const selectedPreset = PLAYBACK_PRESETS.find(preset => preset.id === playback.presetId)
    || (playback.presetId === selectedMarch.id ? selectedMarch : null);
  const choosePreset = id => {
    if (id === 'inspection') { dispatch({ type: 'inspection' }); return; }
    const preset = id === selectedMarch.id ? selectedMarch : PLAYBACK_PRESETS.find(item => item.id === id);
    if (preset) dispatch({ type: 'preset', preset });
  };
  const currentSample = playback.sequence[playback.sampleIndex];
  const hasSequence = playback.sequence.length > 0;
  const returnUrl = new URL(window.location.href);
  returnUrl.searchParams.delete('artReview');
  return (
    <main className="motion-review">
      <header className="motion-review-header">
        <div><p className="motion-review-kicker">Development tool · Gettysburg infantry</p>
          <h1>Inspect the movement.</h1><p>Compare the contact legs, passing poses, equipment sides, and body registration before accepting a source.</p></div>
        <a className="motion-review-back" href={returnUrl.href}>Return to game</a>
      </header>
      <p className="motion-review-notice">None of these studies is approved for production. Playback and guides support visual inspection; atlas geometry cannot certify anatomical footwork.</p>
      <div className="motion-review-preset-row">
        <label>Comparison and playback
          <select value={playback.presetId} onChange={event => choosePreset(event.target.value)}>
            <option value="inspection">Independent source inspection</option>
            <option value={selectedMarch.id} disabled={!selectedMarch.sequence.length}>{selectedMarch.label}</option>
            {PLAYBACK_PRESETS.map(preset => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
          </select>
        </label>
        <p>{selectedPreset?.description || 'Choose each source and inspect its raw samples independently. Select an explicit sequence to play actions or compare marching phases.'}
          {!PLAYBACK_PRESETS.some(preset => preset.id.startsWith('v5-') || preset.id.startsWith('v4-v5-'))
            && ' V5 comparisons will appear when their complete source studies are registered.'}</p>
      </div>
      <div className="motion-review-controls" aria-label="Motion review controls">
        <button type="button" className="motion-review-play" aria-pressed={playback.playing}
          disabled={!hasSequence || !automaticPlayback} aria-controls="motion-review-comparison"
          onClick={() => dispatch({ type: playback.playing ? 'pause' : 'play' })}>{playback.playing ? 'Pause' : 'Play sequence'}</button>
        <button type="button" aria-label="Previous playback sample" disabled={!hasSequence}
          onClick={() => dispatch({ type: 'step', delta: -1 })}>← Previous sample</button>
        <button type="button" aria-label="Next playback sample" disabled={!hasSequence}
          onClick={() => dispatch({ type: 'step', delta: 1 })}>Next sample →</button>
        <label>Playback <select value={fps} onChange={event => setFps(Number(event.target.value))}>{[2, 4, 6, 8].map(value => <option key={value} value={value}>{value} fps</option>)}</select></label>
        <label>Close view <select value={zoom} onChange={event => setZoom(Number(event.target.value))}>{[1, 1.5, 2, 3].map(value => <option key={value} value={value}>{value}×</option>)}</select></label>
        <label className="motion-review-guide-toggle"><input type="checkbox" checked={guides} onChange={event => setGuides(event.target.checked)} /> Root and cell guides</label>
        <label className="motion-review-guide-toggle"><input type="checkbox" checked={registered} onChange={event => setRegistered(event.target.checked)} /> Register to body root</label>
        <label className="motion-review-guide-toggle"><input type="checkbox" checked={automaticPlayback} onChange={event => {
          setAutomaticPlayback(event.target.checked); dispatch({ type: 'pause' });
        }} /> Allow automatic playback</label>
      </div>
      <p className="motion-review-sequence" aria-live={playback.playing ? 'off' : 'polite'} aria-atomic="true">
        {hasSequence ? `Playback sample ${playback.sampleIndex + 1} / ${playback.sequence.length} · ${currentSample.label} · ${playback.playing ? 'playing' : 'paused'}`
          : 'Independent source inspection · playback paused'}
        {!automaticPlayback && ' · Automatic playback is off; manual stepping remains available.'}
      </p>
      <p className="motion-review-help">Presets provide explicit source samples at an inspection cadence; they do not reproduce battle timings, a full loading drill, or interpolated turns. Pause keeps the current sample. A source or filmstrip selection changes only its own panel and returns to independent inspection. With registration enabled, reference-bearing studies use a common 300 display px body height at 1× and a ground line at 82% of the inspection height. Each source cell is cropped before uniform scaling and root translation, preserving proportions and measurement uncertainty. Filmstrips stay raw. Scroll within a close view to inspect the full figure.</p>
      <div className="motion-review-comparison" id="motion-review-comparison">
        {['left', 'right'].map(panel => <StudyPanel key={panel} panel={panel}
          study={GETTYSBURG_MOTION_STUDIES.find(item => item.id === playback.panels[panel]?.studyId)}
          onStudy={id => inspect(panel, id, 0)} phase={playback.panels[panel]?.phase || 0}
          onPhase={phase => inspect(panel, playback.panels[panel].studyId, phase)}
          zoom={zoom} guides={guides} registered={registered} />)}
      </div>
    </main>
  );
}
