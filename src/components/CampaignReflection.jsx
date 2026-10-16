import React from 'react';
import { getLearningReflection, LEARNING_SOURCES } from '../game/learningReflections.js';

/** Optional after-action discussion. Nothing is scored, submitted or stored. */
export default function CampaignReflection({ scenarioId }) {
  const reflection = getLearningReflection(scenarioId);
  if (!reflection) return null;

  return (
    <section className="campaign-reflection" aria-labelledby={`reflection-${reflection.id}`} style={{ marginTop: '1rem', lineHeight: 1.6 }}>
      <h3 id={`reflection-${reflection.id}`}>{reflection.title}</h3>
      <p><strong>Historical record. </strong>{reflection.history}</p>
      <p><strong>This simulation. </strong>{reflection.simulation}</p>
      <p><strong>Consider a changed situation. </strong>{reflection.prompt}</p>
      <details>
        <summary style={{ cursor: 'pointer', padding: '0.65rem 0' }}>Compare your reasoning</summary>
        <p>{reflection.reasoningGuide}</p>
        <p>Use this as a discussion prompt. Opening it does not measure learning.</p>
      </details>
      <details>
        <summary style={{ cursor: 'pointer', padding: '0.65rem 0' }}>Read the evidence and its limits</summary>
        <ul>
          {reflection.sourceIds.map((id) => {
            const source = LEARNING_SOURCES[id];
            return <li key={id} style={{ marginBottom: '0.75rem' }}>
              <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a>
              <p>{source.evidenceType}. {source.section}.</p>
              <p>{source.limitation}</p>
            </li>;
          })}
        </ul>
      </details>
    </section>
  );
}
