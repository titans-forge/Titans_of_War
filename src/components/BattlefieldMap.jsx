import React, { useRef, useEffect, useState } from 'react';
import { resolveScenarioMediaSet } from '../game/mediaCatalog.js';
import { getMapAnnotation, MAP_CANVAS_SIZE } from '../game/mapAnnotations.js';
import { publicAssetUrl } from '../game/publicPath.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function computeCoverCropRect(image, targetWidth, targetHeight, focus = { x: 0.5, y: 0.5 }, zoom = 1) {
  const naturalWidth = image.naturalWidth || image.width || targetWidth;
  const naturalHeight = image.naturalHeight || image.height || targetHeight;
  const targetAspect = targetWidth / targetHeight;
  const imageAspect = naturalWidth / naturalHeight;

  let cropWidth = naturalWidth;
  let cropHeight = naturalHeight;

  if (imageAspect > targetAspect) {
    cropWidth = naturalHeight * targetAspect;
  } else {
    cropHeight = naturalWidth / targetAspect;
  }

  const zoomFactor = Math.max(1, zoom);
  cropWidth /= zoomFactor;
  cropHeight /= zoomFactor;

  const centerX = naturalWidth * (focus?.x ?? 0.5);
  const centerY = naturalHeight * (focus?.y ?? 0.5);
  const maxX = Math.max(0, naturalWidth - cropWidth);
  const maxY = Math.max(0, naturalHeight - cropHeight);

  return {
    sx: clamp(centerX - cropWidth / 2, 0, maxX),
    sy: clamp(centerY - cropHeight / 2, 0, maxY),
    sWidth: cropWidth,
    sHeight: cropHeight,
  };
}

function computeContainDrawRect(image, targetWidth, targetHeight, zoom = 1) {
  const naturalWidth = image.naturalWidth || image.width || targetWidth;
  const naturalHeight = image.naturalHeight || image.height || targetHeight;
  const scale = Math.min(targetWidth / naturalWidth, targetHeight / naturalHeight) * Math.max(1, zoom);
  const drawWidth = naturalWidth * scale;
  const drawHeight = naturalHeight * scale;

  return {
    dx: (targetWidth - drawWidth) / 2,
    dy: (targetHeight - drawHeight) / 2,
    dWidth: drawWidth,
    dHeight: drawHeight,
  };
}

function drawTopography(ctx, width, height, topography) {
  ctx.save();

  switch (topography.type) {
    case 'harbor-fort': {
      ctx.strokeStyle = topography.waveStrokeStyle || 'rgba(59, 130, 246, 0.08)';
      ctx.lineWidth = 1;
      const waveSpacing = topography.waveSpacing || 20;
      for (let y = 0; y < height; y += waveSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(150, y - 10, 300, y + 10, width, y);
        ctx.stroke();
      }

      if (Array.isArray(topography.polygon) && topography.polygon.length > 2) {
        ctx.fillStyle = topography.fillStyle || '#1e2430';
        ctx.strokeStyle = topography.strokeStyle || 'rgba(212, 175, 55, 0.3)';
        ctx.lineWidth = topography.lineWidth || 2;
        ctx.beginPath();
        const [firstPoint, ...otherPoints] = topography.polygon;
        ctx.moveTo(firstPoint[0], firstPoint[1]);
        otherPoints.forEach(([x, y]) => ctx.lineTo(x, y));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
    case 'trench-crater': {
      const trench = topography.trench || {};
      ctx.strokeStyle = trench.strokeStyle || 'rgba(212, 175, 55, 0.08)';
      ctx.lineWidth = trench.lineWidth || 1.5;
      const startY = trench.startY || 30;
      const stepY = trench.stepY || 40;
      const xStep = trench.xStep || 25;
      const amplitude = trench.amplitude || 15;

      for (let y = startY; y < height; y += stepY) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        let segmentIndex = 0;
        for (let x = 10; x < width; x += xStep) {
          const offset = segmentIndex % 2 === 0 ? amplitude : -amplitude;
          ctx.lineTo(x, y + offset);
          segmentIndex += 1;
        }
        ctx.stroke();
      }

      const crater = topography.crater || {};
      ctx.fillStyle = crater.fillStyle || 'rgba(0, 0, 0, 0.6)';
      ctx.strokeStyle = crater.strokeStyle || 'rgba(239, 68, 68, 0.3)';
      ctx.lineWidth = crater.lineWidth || 1;
      ctx.beginPath();
      ctx.arc(crater.x || width / 2, crater.y || height / 2, crater.radius || 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'forest-fire': {
      const forestGrid = topography.forestGrid || {};
      ctx.fillStyle = forestGrid.fillStyle || 'rgba(16, 185, 129, 0.02)';
      for (let x = forestGrid.startX || 30; x < width; x += forestGrid.stepX || 60) {
        for (let y = forestGrid.startY || 20; y < height; y += forestGrid.stepY || 45) {
          ctx.beginPath();
          ctx.arc(x, y, forestGrid.radius || 18, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      (topography.fireZones || []).forEach((zone) => {
        ctx.fillStyle = zone.color || 'rgba(239, 68, 68, 0.03)';
        ctx.beginPath();
        ctx.arc(zone.x, zone.y, zone.radius || 60, 0, Math.PI * 2);
        ctx.fill();
      });
      break;
    }
    case 'contours':
    default: {
      ctx.strokeStyle = topography.strokeStyle || 'rgba(212, 175, 55, 0.04)';
      ctx.lineWidth = topography.lineWidth || 1;
      const layers = topography.layers || 4;
      for (let index = 1; index <= layers; index += 1) {
        ctx.beginPath();
        if (topography.shape === 'ellipse') {
          ctx.ellipse(
            topography.centerX || width / 2,
            topography.centerY || height / 2,
            (topography.radiusX || 35) * index,
            (topography.radiusY || 18) * index,
            topography.rotation || 0,
            0,
            Math.PI * 2,
          );
        } else {
          ctx.arc(
            topography.centerX || width / 2,
            topography.centerY || height / 2,
            (topography.radius || 35) * index,
            0,
            Math.PI * 2,
          );
        }
        ctx.stroke();
      }
      break;
    }
  }

  ctx.restore();
}

function drawWaterways(ctx, waterways) {
  waterways.forEach((waterway) => {
    if (waterway.type !== 'bezier') return;

    ctx.save();
    ctx.strokeStyle = waterway.strokeStyle || 'rgba(59, 130, 246, 0.4)';
    ctx.lineWidth = waterway.lineWidth || 3;
    ctx.beginPath();
    ctx.moveTo(...waterway.start);
    ctx.bezierCurveTo(...waterway.cp1, ...waterway.cp2, ...waterway.end);
    ctx.stroke();

    if (waterway.label?.text) {
      ctx.font = waterway.label.font || '8px "Share Tech Mono"';
      ctx.fillStyle = waterway.label.color || 'rgba(59, 130, 246, 0.6)';
      ctx.fillText(waterway.label.text, waterway.label.x, waterway.label.y);
    }
    ctx.restore();
  });
}

function drawLabels(ctx, labels) {
  labels.forEach((label) => {
    ctx.save();
    ctx.fillStyle = label.color || 'rgba(212, 175, 55, 0.4)';
    ctx.font = label.font || '9px "Share Tech Mono"';
    ctx.fillText(label.text, label.x, label.y);
    ctx.restore();
  });
}

function normalizeTroop(side, troop, defaults) {
  if (!troop) return null;

  return {
    side,
    x: troop.x,
    y: troop.y,
    width: troop.width || defaults.width,
    height: troop.height || 24,
    label: troop.label || defaults.label,
    labelOffsetX: troop.labelOffsetX || defaults.labelOffsetX,
    labelOffsetY: troop.labelOffsetY || 14,
    fillStyle: troop.fillStyle || defaults.fillStyle,
    strokeStyle: troop.strokeStyle || defaults.strokeStyle,
  };
}

function drawTroops(ctx, troops) {
  if (!troops?.union || !troops?.confederate) {
    return null;
  }

  const union = normalizeTroop('union', troops.union, {
    width: 65,
    label: 'UNION FORCES',
    labelOffsetX: 6,
    fillStyle: 'rgba(59, 130, 246, 0.85)',
    strokeStyle: '#3b82f6',
  });
  const confederate = normalizeTroop('confederate', troops.confederate, {
    width: 70,
    label: 'CONFED. FORCE',
    labelOffsetX: 5,
    fillStyle: 'rgba(239, 68, 68, 0.75)',
    strokeStyle: '#ef4444',
  });

  [union, confederate].forEach((troop) => {
    ctx.save();
    ctx.fillStyle = troop.fillStyle;
    ctx.strokeStyle = troop.strokeStyle;
    ctx.lineWidth = 1.5;
    ctx.fillRect(troop.x, troop.y, troop.width, troop.height);
    ctx.strokeRect(troop.x, troop.y, troop.width, troop.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px "Outfit"';
    ctx.fillText(troop.label, troop.x + troop.labelOffsetX, troop.y + troop.labelOffsetY);
    ctx.restore();
  });

  return { union, confederate };
}

function drawManeuver(ctx, selectedChoiceId, troopLayout, maneuvers, progress, height) {
  if (!troopLayout?.union || !troopLayout?.confederate || !selectedChoiceId) {
    return;
  }

  const maneuver = maneuvers[selectedChoiceId] || {};
  const confederate = troopLayout.confederate;
  const union = troopLayout.union;
  const startX = confederate.x + confederate.width / 2;
  const startY = confederate.y + confederate.height / 2;
  const unionCenterX = union.x + union.width / 2;
  const unionCenterY = union.y + union.height / 2;

  ctx.save();
  ctx.lineWidth = 4;

  if (selectedChoiceId === 'option_a') {
    const endX = maneuver.endX || unionCenterX;
    const endY = maneuver.endY || unionCenterY;
    const currentX = startX + (endX - startX) * progress;
    const currentY = startY + (endY - startY) * progress;
    const controlX = maneuver.controlX || startX + (endX - startX) * 0.2;
    const controlY = maneuver.controlY || startY + (endY - startY) * 0.8;

    ctx.strokeStyle = maneuver.strokeStyle || '#ef4444';
    ctx.fillStyle = maneuver.fillStyle || '#ef4444';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(controlX, controlY, currentX, currentY);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(currentX, currentY, maneuver.markerRadius || 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = maneuver.font || 'bold 9px "Share Tech Mono"';
    ctx.fillText(maneuver.label || 'TACTICAL CHARGE ENGAGED', startX - 40, startY - 15);
  } else if (selectedChoiceId === 'option_b') {
    ctx.strokeStyle = maneuver.strokeStyle || 'rgba(16, 185, 129, 0.85)';
    ctx.setLineDash(maneuver.lineDash || [4, 4]);
    ctx.beginPath();
    ctx.arc(startX, startY, maneuver.radius || 45, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = maneuver.fillStyle || 'rgba(16, 185, 129, 0.85)';
    ctx.font = maneuver.font || 'bold 9px "Share Tech Mono"';
    ctx.fillText(maneuver.label || 'DEFENSIVE BLOCKS FORMED', startX - 65, startY - 27);
  } else if (selectedChoiceId === 'option_c') {
    const endX = maneuver.endX || startX + (maneuver.endOffsetX || -100);
    const endY = maneuver.endY || height;
    const currentX = startX + (endX - startX) * progress;
    const currentY = startY + (endY - startY) * progress;

    ctx.strokeStyle = maneuver.strokeStyle || 'rgba(212, 175, 55, 0.85)';
    ctx.fillStyle = maneuver.fillStyle || 'rgba(212, 175, 55, 0.85)';
    ctx.setLineDash(maneuver.lineDash || [6, 3]);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(currentX, currentY, maneuver.markerRadius || 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = maneuver.font || 'bold 9px "Share Tech Mono"';
    ctx.fillText(maneuver.label || 'TACTICAL WITHDRAWAL ROUTE', startX - 45, startY - 15);
  } else if (selectedChoiceId === 'option_d') {
    const endX = maneuver.endX || (union.x - 25);
    const endY = maneuver.endY || unionCenterY;
    const currentX = startX + (endX - startX) * progress;
    const currentY = startY + (endY - startY) * progress;

    ctx.strokeStyle = maneuver.strokeStyle || 'rgba(245, 158, 11, 0.85)';
    ctx.fillStyle = maneuver.fillStyle || 'rgba(245, 158, 11, 0.85)';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(
      maneuver.cp1X || startX + 120,
      maneuver.cp1Y || startY - 50,
      maneuver.cp2X || endX + 80,
      maneuver.cp2Y || endY - 60,
      currentX,
      currentY,
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(currentX, currentY, maneuver.markerRadius || 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = maneuver.font || 'bold 9px "Share Tech Mono"';
    ctx.fillText(maneuver.label || 'FLANKING CAVALRY SWEEP', startX - 40, startY - 15);
  }

  ctx.restore();
}

function MapInspectorModal({ mapSrc, pins, media, onClose }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState('rgba(239, 68, 68, 0.85)'); // default red
  const [lineWidth, setLineWidth] = useState(3);
  const [drawModeActive, setDrawModeActive] = useState(false);

  // Resize canvas to match the parent container size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
  }, [drawModeActive]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const startDrawing = (e) => {
    if (!drawModeActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing || !drawModeActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(9, 12, 16, 0.96)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem'
    }}>
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '850px',
        background: '#11161d',
        border: '2px solid var(--border-color)',
        borderRadius: '8px',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        boxShadow: '0 10px 40px rgba(0,0,0,0.6)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(212,175,55,0.15)', paddingBottom: '0.6rem' }}>
          <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
            Historical map · {media.mapScopeLabel}
          </h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {/* Draw mode controls */}
            <button
              onClick={() => setDrawModeActive(!drawModeActive)}
              style={{
                background: drawModeActive ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
                border: '1px solid rgba(212, 175, 55, 0.35)',
                color: drawModeActive ? '#ffffff' : 'var(--accent-gold)',
                borderRadius: '3px',
                padding: '3px 8px',
                fontSize: '0.65rem',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              ✏️ {drawModeActive ? 'TACTICAL DRAWING ACTIVE' : 'DRAW PLAN'}
            </button>

            {drawModeActive && (
              <>
                <button
                  onClick={() => setDrawColor('rgba(239, 68, 68, 0.85)')}
                  style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.85)', border: drawColor === 'rgba(239, 68, 68, 0.85)' ? '2px solid white' : 'none', cursor: 'pointer' }}
                  title="Red Pencil"
                />
                <button
                  onClick={() => setDrawColor('rgba(59, 130, 246, 0.85)')}
                  style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.85)', border: drawColor === 'rgba(59, 130, 246, 0.85)' ? '2px solid white' : 'none', cursor: 'pointer' }}
                  title="Blue Pencil"
                />
                <button
                  onClick={() => setDrawColor('rgba(212, 175, 55, 0.85)')}
                  style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'rgba(212, 175, 55, 0.85)', border: drawColor === 'rgba(212, 175, 55, 0.85)' ? '2px solid white' : 'none', cursor: 'pointer' }}
                  title="Gold Pencil"
                />
                <button
                  onClick={clearDrawing}
                  style={{ background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.35)', color: 'var(--accent-red)', borderRadius: '3px', padding: '2px 6px', fontSize: '0.58rem', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}
                >
                  CLEAR SKETCH
                </button>
              </>
            )}

            <button 
              onClick={onClose}
              style={{ background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.25)', color: '#ffffff', borderRadius: '3px', padding: '3px 10px', fontSize: '0.65rem', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}
            >
              CLOSE [ESC]
            </button>
          </div>
        </div>

        {/* Map view wrapper with pins & sketch overlay */}
        <div style={{ position: 'relative', width: '100%', height: '380px', overflow: 'hidden', borderRadius: '4px', border: '1px solid rgba(212,175,55,0.1)', background: '#090c10' }}>
          <img src={mapSrc} style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} alt={media.title} />
          
          {/* Sketching Canvas Overlay */}
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 15,
              cursor: drawModeActive ? 'crosshair' : 'default',
              pointerEvents: drawModeActive ? 'auto' : 'none'
            }}
          />

          {/* Overlay Pins */}
          {!drawModeActive && pins.map((pin, i) => (
            <div 
              key={i} 
              style={{
                position: 'absolute',
                left: `${pin.x}%`,
                top: `${pin.y}%`,
                transform: 'translate(-50%, -50%)',
                cursor: 'help',
                zIndex: 20
              }}
              title={`${pin.label}: ${pin.desc}`}
            >
              <div style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: 'rgba(212, 175, 55, 0.95)',
                border: '2px solid #ffffff',
                boxShadow: '0 0 10px rgba(212, 175, 55, 0.95)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '8px',
                fontWeight: 'bold',
                color: '#000000'
              }}>
                ?
              </div>
              <div style={{
                position: 'absolute',
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(9, 12, 16, 0.95)',
                border: '1px solid var(--border-color)',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '0.65rem',
                color: 'var(--text-primary)',
                pointerEvents: 'none',
                fontFamily: 'var(--font-display)',
                boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                textAlign: 'center',
                width: '180px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}>
                <strong style={{ color: 'var(--accent-gold)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>{pin.label}</strong>
                <span>{pin.desc}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer plate caption */}
        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
          {drawModeActive 
            ? 'Your sketch is a personal annotation, not part of the historical source. Click and drag to draw.'
            : `${media.caption} Game positions and landmark pins are omitted because their coordinates have not been matched to this source.`}
        </div>
      </div>
    </div>
  );
}

export default function BattlefieldMap({ scenarioId, selectedChoiceId }) {
  const canvasRef = useRef(null);
  const [showLoupe, setShowLoupe] = useState(false);
  const media = resolveScenarioMediaSet(scenarioId).tacticalMap;
  const annotation = getMapAnnotation(scenarioId);
  const mapSrc = publicAssetUrl(media.src || '');
  const hasHistoricalMap = Boolean(mapSrc);
  const showGameOverlay = media.showGameOverlay !== false;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let arrowProgress = 0;
    let isDrawing = true;

    const dpr = window.devicePixelRatio || 1;
    const width = MAP_CANVAS_SIZE.width;
    const height = MAP_CANVAS_SIZE.height;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);


    // Load a curated map underlay when one exists; otherwise render the authored procedural schematic.
    const img = new Image();
    let imageLoaded = false;

    if (hasHistoricalMap) {
      img.src = mapSrc;
      img.onload = () => {
        imageLoaded = true;
        if (isDrawing) {
          drawMap();
        }
      };
    }

    const drawMap = () => {
      // 1. Clear with dark tactical grid background
      ctx.fillStyle = '#11161d';
      ctx.fillRect(0, 0, width, height);

      // 2. Draw historical map underlay with low opacity and crop coordinates
      if (imageLoaded) {
        ctx.save();
        ctx.globalAlpha = media.overlayOpacity ?? 0.35;
        if (media.cropMode === 'contain') {
          const draw = computeContainDrawRect(img, width, height, media.tacticalView?.zoom || 1);
          ctx.drawImage(img, 0, 0, img.naturalWidth || img.width, img.naturalHeight || img.height, draw.dx, draw.dy, draw.dWidth, draw.dHeight);
        } else {
          const crop = computeCoverCropRect(
            img,
            width,
            height,
            media.tacticalView?.focus || media.cropFocus || { x: 0.5, y: 0.5 },
            media.tacticalView?.zoom || 1,
          );
          ctx.drawImage(img, crop.sx, crop.sy, crop.sWidth, crop.sHeight, 0, 0, width, height);
        }
        ctx.restore();
      }

      // 3. Draw grid lines over the background
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      drawTopography(ctx, width, height, annotation.topography);
      drawWaterways(ctx, annotation.waterways);
      drawLabels(ctx, annotation.labels);

      const troopLayout = drawTroops(ctx, annotation.troops);
      if (selectedChoiceId && troopLayout) {
        arrowProgress = (arrowProgress + 0.025) % 1.0;
        drawManeuver(ctx, selectedChoiceId, troopLayout, annotation.maneuvers, arrowProgress, height);
      }
    };

    const animate = () => {
      if (!isDrawing) return;
      drawMap();
      if (selectedChoiceId) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    // Draw initially
    if (imageLoaded) {
      drawMap();
    } else {
      // Draw plain dark map first, then redraw when image finishes loading
      drawMap();
    }

    // Trigger animation loop only if there is an active choice being animated
    if (selectedChoiceId) {
      animate();
    }

    return () => {
      isDrawing = false;
      cancelAnimationFrame(animationFrameId);
    };
  }, [
    scenarioId,
    selectedChoiceId,
    media.cropFocus?.x,
    media.cropFocus?.y,
    media.cropMode,
    media.isProcedural,
    media.overlayOpacity,
    mapSrc,
    hasHistoricalMap,
    showGameOverlay,
    media.tacticalView?.focus?.x,
    media.tacticalView?.focus?.y,
    media.tacticalView?.zoom,
  ]);

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ position: 'relative', width: '100%', height: '320px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>

        {showGameOverlay ? <canvas
          ref={canvasRef} 
          role="img"
          aria-label={`${media.mapScopeLabel}. ${annotation.plateCaption}`}
          style={{ width: '100%', height: '100%', display: 'block' }}
        /> : <img
          src={mapSrc}
          alt={`${media.title}. ${media.mapScopeLabel}. Printed historical positions do not represent the current game.`}
          style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain', background: '#11161d' }}
        />}
        <div style={{ position: 'absolute', bottom: '10px', left: '10px', right: '10px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-primary)', background: 'rgba(9, 12, 16, 0.92)', padding: '4px 6px', border: '1px solid rgba(212, 175, 55, 0.2)', borderRadius: '3px', pointerEvents: 'none' }}>
          {hasHistoricalMap ? 'HISTORICAL REFERENCE · NO GAME OVERLAY' : 'ILLUSTRATIVE GAME SCHEMATIC · NOT TO SCALE'}
        </div>

        {/* Fullscreen Loupe Inspect button */}
        {hasHistoricalMap && (
          <button
            onClick={() => setShowLoupe(true)}
            style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(9, 12, 16, 0.85)', border: '1px solid var(--border-color)', color: 'var(--accent-gold)', borderRadius: '3px', padding: '3px 6px', fontSize: '9px', cursor: 'pointer', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '3px', zIndex: 10 }}
            title="Inspect high-resolution historical map"
          >
            INSPECT MAP
          </button>
        )}
      </div>

      {/* Styled historic plate caption */}
      <div style={{ fontSize: '0.8rem', lineHeight: 1.5, color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.65rem', fontFamily: 'var(--font-display)' }}>
        <strong>{media.mapScopeLabel}</strong><br />
        {hasHistoricalMap ? media.caption : `${media.caption} ${annotation.plateCaption}`}
        {hasHistoricalMap && media.sourceUrl && <><br /><a href={media.sourceUrl} target="_blank" rel="noreferrer">Source · {media.sourceInstitution}</a></>}
      </div>

      {/* Fullscreen Loupe Modal */}
      {showLoupe && hasHistoricalMap && (
        <MapInspectorModal mapSrc={mapSrc} pins={showGameOverlay ? annotation.inspectorPins : []} media={media} onClose={() => setShowLoupe(false)} />
      )}
    </div>
  );
}
