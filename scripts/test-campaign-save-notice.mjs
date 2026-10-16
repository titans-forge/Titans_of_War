import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
try {
  const { CampaignSaveNotice } = await vite.ssrLoadModule('/src/components/CampaignSaveNotice.jsx');
  const { CampaignJournal } = await vite.ssrLoadModule('/src/components/CampaignOverlays.jsx');
  const render = props => renderToStaticMarkup(React.createElement(CampaignSaveNotice, props));
  test('failed saves expose recovery actions and an alert', () => {
    const html = render({ status: { ok: false, error: 'Quota exceeded' } });
    assert.match(html, /role="alert"/); assert.match(html, /Retry save/); assert.match(html, /Export campaign save/); assert.doesNotMatch(html, /saved on this device/);
  });
  test('protected original takes precedence over stale success and never offers an overwrite retry', () => {
    const html = render({ protectedSave: true, status: { ok: true, turn: 3 } });
    assert.match(html, /previous unreadable save is protected/); assert.doesNotMatch(html, /Retry save|saved on this device/); assert.match(html, /Export campaign save/);
  });
  test('successful demo save is identified separately from campaign save', () => {
    assert.match(render({ demo: true, status: { ok: true, turn: 9 } }), /Demo saved on this device · turn 9/);
    assert.match(render({ status: { ok: true, turn: 4 } }), /Campaign saved on this device · turn 4/);
  });
  test('journal restores legacy field reports without inventing missing loss estimates', () => {
    const html = renderToStaticMarkup(React.createElement(CampaignJournal, { history: [{ scenarioId: 'manassas_battlefield', scenarioTitle: 'Manassas', battleResult: { result: 'costly-win', score: 60, delegated: true, confederateLossRate: .125 } }], checkpoints: [] }));
    assert.match(html, /Field report/); assert.match(html, /Delegated to staff/); assert.match(html, /Confederate losses 13%/); assert.doesNotMatch(html, /Union losses|NaN/);
  });
} finally { await vite.close(); }
