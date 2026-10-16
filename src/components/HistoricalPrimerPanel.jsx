// Titans of War — Historical Primer Panel
//
// Opt-in side panel that surfaces the 1-3 sourced primers tagged on the
// active scenario. The player must press the "Historical context" button in
// ScenarioTheater to open it; nothing pops automatically. Each primer renders
// in the same structural order the rubric checks for: period_voice up top,
// then power_analysis (structural framing), then complexity_note, then the
// historical outcome summary, then sourceNotes. No modern academic vocabulary.

import React, { useEffect, useState, useRef } from 'react';
import { useDialogFocus } from './useDialogFocus';
import { resolvePrimersForScenario } from '../game/historicalPrimers.js';

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(8, 12, 18, 0.72)',
  backdropFilter: 'blur(2px)',
  zIndex: 200,
  display: 'flex',
  justifyContent: 'flex-end',
};

const panelStyle = {
  width: 'min(560px, 92vw)',
  height: '100vh',
  background: 'linear-gradient(180deg, #0f1621 0%, #0a0f17 100%)',
  borderLeft: '1px solid rgba(212, 175, 55, 0.35)',
  boxShadow: '-12px 0 40px rgba(0, 0, 0, 0.5)',
  color: 'var(--text-primary, #e5e7eb)',
  display: 'flex',
  flexDirection: 'column',
  fontFamily: 'inherit',
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0.9rem 1.1rem',
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  background: 'rgba(212, 175, 55, 0.04)',
};

const tabRowStyle = {
  display: 'flex',
  gap: '0.25rem',
  padding: '0.5rem 0.6rem',
  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  background: 'rgba(0, 0, 0, 0.2)',
  overflowX: 'auto',
};

const tabButtonBase = {
  background: 'transparent',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: 4,
  color: 'var(--text-secondary, #94a3b8)',
  padding: '0.4rem 0.7rem',
  fontSize: '0.72rem',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const activeTabStyle = {
  ...tabButtonBase,
  color: 'var(--accent-gold, #d4af37)',
  borderColor: 'rgba(212, 175, 55, 0.45)',
  background: 'rgba(212, 175, 55, 0.08)',
};

const bodyStyle = {
  flex: 1,
  overflowY: 'auto',
  padding: '1rem 1.25rem 1.5rem',
  lineHeight: 1.55,
};

const sectionLabelStyle = {
  display: 'block',
  fontSize: '0.65rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--accent-gold, #d4af37)',
  marginTop: '1.2rem',
  marginBottom: '0.35rem',
};

const periodVoiceStyle = {
  borderLeft: '3px solid rgba(212, 175, 55, 0.5)',
  paddingLeft: '0.75rem',
  margin: 0,
  fontStyle: 'italic',
  color: '#d6dbe3',
};

const closeButtonStyle = {
  background: 'rgba(255, 255, 255, 0.06)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  color: 'inherit',
  borderRadius: 4,
  padding: '0.35rem 0.7rem',
  cursor: 'pointer',
  fontSize: '0.72rem',
};

const sourcesStyle = {
  fontSize: '0.72rem',
  color: 'var(--text-secondary, #94a3b8)',
  borderTop: '1px dashed rgba(255, 255, 255, 0.12)',
  paddingTop: '0.6rem',
  marginTop: '1rem',
};

const footerNoteStyle = {
  padding: '0.6rem 1.25rem',
  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
  fontSize: '0.7rem',
  color: 'var(--text-secondary, #94a3b8)',
  background: 'rgba(0, 0, 0, 0.2)',
};

function primerTabLabel(primer) {
  if (primer.id === 'conscription_substitution') return 'Manpower';
  if (primer.id === 'impressment_bread_riots') return 'Home Front Strain';
  if (primer.id === 'confederate_black_military_service') return 'Black Military Service';
  return primer.topic.split(' — ')[0];
}

export default function HistoricalPrimerPanel({ scenario, open, onClose, onPrimerConsulted }) {
  const dialogRef = useRef(null);
  useDialogFocus(dialogRef, open, onClose);
  const primers = resolvePrimersForScenario(scenario);
  const [activeId, setActiveId] = useState(primers[0]?.id || null);

  useEffect(() => {
    if (open && primers[0] && !primers.find((primer) => primer.id === activeId)) {
      setActiveId(primers[0].id);
    }
  }, [open, primers, activeId]);

  useEffect(() => {
    if (!open) return;
    if (!activeId) return;
    if (typeof onPrimerConsulted === 'function') {
      onPrimerConsulted(activeId);
    }
  }, [open, activeId, onPrimerConsulted]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || primers.length === 0) return null;
  const active = primers.find((primer) => primer.id === activeId) || primers[0];

  return (
    <div ref={dialogRef} tabIndex={-1} style={overlayStyle} onClick={onClose} role="dialog" aria-modal="true" aria-label="Historical context primers">
      <aside style={panelStyle} onClick={(event) => event.stopPropagation()}>
        <header style={headerStyle}>
          <div>
            <div style={{ fontSize: '0.7rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--accent-gold, #d4af37)' }}>
              Historical Context
            </div>
            <div style={{ fontSize: '0.95rem', marginTop: '0.2rem' }}>{scenario?.title || 'Active turn'}</div>
          </div>
          <button type="button" onClick={onClose} style={closeButtonStyle} aria-label="Close historical context">
            Close
          </button>
        </header>

        {primers.length > 1 && (
          <nav style={tabRowStyle} aria-label="Available primers">
            {primers.map((primer) => (
              <button
                key={primer.id}
                type="button"
                onClick={() => setActiveId(primer.id)}
                style={primer.id === activeId ? activeTabStyle : tabButtonBase}
              >
                {primerTabLabel(primer)}
              </button>
            ))}
          </nav>
        )}

        <div style={bodyStyle}>
          <h3 style={{ margin: '0 0 0.6rem', fontSize: '1.05rem', color: 'var(--accent-gold, #d4af37)' }}>
            {active.topic}
          </h3>

          <span style={sectionLabelStyle}>{active.periodVoiceLabel || 'Period Voice'}</span>
          <blockquote style={periodVoiceStyle}>{active.period_voice}</blockquote>

          <span style={sectionLabelStyle}>Strategic Context</span>
          <p style={{ margin: 0 }}>{active.power_analysis}</p>

          <span style={sectionLabelStyle}>Where It Was Complicated</span>
          <p style={{ margin: 0 }}>{active.complexity_note}</p>

          <span style={sectionLabelStyle}>Historical Outcome</span>
          <p style={{ margin: 0 }}>{active.summary}</p>

          <div style={sourcesStyle}>
            <strong style={{ color: 'var(--text-primary, #e5e7eb)' }}>Sources:</strong> {active.sourceNotes}
          </div>
        </div>

        <div style={footerNoteStyle}>
          Editorial approach: period sources, institutional incentives, and competing perspectives. Historical records, later interpretations, and simulated outcomes should be read separately. Sources are listed above.
        </div>
      </aside>
    </div>
  );
}
