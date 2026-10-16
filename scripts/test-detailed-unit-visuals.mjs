import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { compositeUnitChroma, detailedInfantryPose, detailedCrewFrame, detailedUnitAssetDirectory, DETAILED_UNIT_PAGES, GETTYSBURG_ART_PASS_ID } from '../src/battle/detailedUnitVisual.js';
import { getBattleEngineConfig } from '../src/battle/battleDefinitions.js';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { landmarkField } from '../src/battle/historicalLandmarks.js';
import { siegeTargetAssets } from '../src/battle/siegeTargetVisual.js';
import { siegeTerrainAssets } from '../src/battle/siegeTerrainVisual.js';
import { createFreshCampaignState } from '../src/game/campaignStorage.js';
import { gettysburgInfantryFamilyAssets } from '../src/battle/gettysburgInfantryFamily.js';
import { gettysburgInfantryClipAssets } from '../src/battle/gettysburgInfantryClipAssets.js';

function getGettysburgPreloadUrls(artPassSearch = '', scenarioId = 'gettysburg') {
  const source = readFileSync(new URL('../src/battle/CivilWarBattlefield.jsx', import.meta.url), 'utf8');
  const method = source.slice(source.indexOf('  preload() {'), source.indexOf('  create() {'));
  const Loader = vm.runInNewContext(`(class {${method}})`, {
    siegeTargetAssets,
    siegeTerrainAssets,
    landmarkField,
    DETAILED_UNIT_PAGES,
    detailedUnitAssetDirectory,
    gettysburgInfantryFamilyAssets,
    gettysburgInfantryClipAssets,
    PUBLIC_BASE: '',
  });
  const loader = new Loader();
  const urls = [];
  loader.scenarioId = scenarioId;
  loader.artPassSearch = artPassSearch;
  loader.engine = new CivilWarBattleEngine(scenarioId, createFreshCampaignState(1861), 'option_a');
  loader.config = {
    ...getBattleEngineConfig(scenarioId),
    terrain: { key: 'gettysburg-terrain-v3', src: 'images/battles/gettysburg-terrain-v3.png' },
  };
  loader.load = {
    image(_key, url) { urls.push(url); },
    json(_key, url) { urls.push(url); },
    atlas(_key, image, json) { urls.push(image, json); },
  };
  loader.preload();
  return urls;
}

test('Gettysburg art-pass candidates are explicit, ready-only and reversible', () => {
  const requested = `?artPass=${GETTYSBURG_ART_PASS_ID}`;
  assert.equal(detailedUnitAssetDirectory('gettysburg', 'ready', requested), GETTYSBURG_ART_PASS_ID);
  assert.equal(detailedUnitAssetDirectory('gettysburg', 'walk', requested), 'detailed-v2');
  assert.equal(detailedUnitAssetDirectory('gettysburg_jackson', 'ready', requested), 'detailed-v2');
  assert.equal(detailedUnitAssetDirectory('gettysburg', 'ready', ''), 'detailed-v2');
  for (const side of ['union', 'confederate']) {
    const base = new URL(`../public/images/units/${GETTYSBURG_ART_PASS_ID}/${side}-ready`, import.meta.url);
    const data = JSON.parse(readFileSync(`${base.pathname}.json`));
    const bytes = readFileSync(`${base.pathname}.png`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), data.meta.sha256);
    assert.equal(bytes.readUInt32BE(16), data.meta.size.w);
    assert.equal(bytes.readUInt32BE(20), data.meta.size.h);
    assert.deepEqual(Object.keys(data.frames), ['0', '1', '2', '3', '4', '5', '6', '7']);
    for (const frame of Object.values(data.frames)) {
      assert.ok(frame.frame.x >= 0 && frame.frame.y >= 0);
      assert.ok(frame.frame.x + frame.frame.w <= data.meta.size.w);
      assert.ok(frame.frame.y + frame.frame.h <= data.meta.size.h);
      assert.ok(frame.bodyHeight >= 450 && frame.bodyHeight <= 510);
      assert.ok(frame.pivot.x > 0 && frame.pivot.x < 1 && frame.pivot.y > .9 && frame.pivot.y <= 1);
    }
  }
});

test('the real Gettysburg preload selects only the opt-in ready candidates', () => {
  const stable = getGettysburgPreloadUrls();
  const candidate = getGettysburgPreloadUrls(`?artPass=${GETTYSBURG_ART_PASS_ID}`);
  for (const side of ['union', 'confederate']) {
    for (const extension of ['png', 'json']) {
      const acceptedReady = `images/units/detailed-v2/${side}-ready.${extension}`;
      const candidateReady = `images/units/${GETTYSBURG_ART_PASS_ID}/${side}-ready.${extension}`;
      assert.ok(stable.includes(acceptedReady));
      assert.ok(!stable.includes(candidateReady));
      assert.ok(candidate.includes(candidateReady));
      assert.ok(!candidate.includes(acceptedReady));
    }
    for (const page of ['walk', 'aim', 'crew']) {
      assert.ok(candidate.includes(`images/units/detailed-v2/${side}-${page}.png`));
      assert.ok(candidate.includes(`images/units/detailed-v2/${side}-${page}.json`));
    }
  }
});

test('Gettysburg skips unused foliage while other field boards retain it', () => {
  for (const query of ['', '?artPass=gettysburg-v1', '?artPass=gettysburg-v2']) {
    const urls = getGettysburgPreloadUrls(query);
    assert.ok(!urls.includes('images/battles/realistic-v2/foliage.png'));
    assert.ok(!urls.includes('images/battles/realistic-v2/foliage.json'));
    assert.ok(urls.includes('images/battles/realistic-v2/earthworks.png'));
    const familyUrls = urls.filter(url => url.includes('/gettysburg-v2/'));
    assert.equal(familyUrls.length, query.includes('gettysburg-v2') ? 8 : 0);
  }
  for (const scenarioId of ['gettysburg_jackson', 'first_manassas', 'shiloh']) {
    const urls = getGettysburgPreloadUrls('?artPass=gettysburg-v2', scenarioId);
    assert.ok(urls.includes('images/battles/realistic-v2/foliage.png'));
    assert.ok(!urls.some(url => url.includes('/gettysburg-v2/')));
  }
});

test('the real v3 preload adds exactly one clip and keeps accepted action fallbacks', () => {
  const normal = getGettysburgPreloadUrls();
  const candidate = getGettysburgPreloadUrls('?artPass=gettysburg-v3');
  const added = candidate.filter(url => !normal.includes(url));
  assert.deepEqual(added, [
    'images/units/gettysburg-v3/union-a-march-e.png',
    'images/units/gettysburg-v3/union-a-march-e.json',
  ]);
  for (const url of normal) assert.ok(candidate.includes(url), `accepted fallback retained: ${url}`);
  assert.ok(!candidate.some(url => url.includes('/gettysburg-v2/')));
  for (const scenario of ['gettysburg_jackson', 'first_manassas', 'shiloh']) {
    assert.ok(!getGettysburgPreloadUrls('?artPass=gettysburg-v3', scenario).some(url => url.includes('/gettysburg-v3/')));
  }
});

test('the real v4 preload shares one action atlas and retains every accepted fallback', () => {
  const normal = getGettysburgPreloadUrls();
  const candidate = getGettysburgPreloadUrls('?artPass=gettysburg-v4');
  assert.deepEqual(candidate.filter(url => !normal.includes(url)), [
    'images/units/gettysburg-v4/union-a-march-e.png',
    'images/units/gettysburg-v4/union-a-march-e.json',
    'images/units/gettysburg-v4/union-a-actions-e.png',
    'images/units/gettysburg-v4/union-a-actions-e.json',
  ]);
  for (const url of normal) assert.ok(candidate.includes(url));
  assert.ok(!candidate.some(url => /\/gettysburg-v[23]\//.test(url)));
  for (const scenario of ['gettysburg_jackson', 'first_manassas', 'shiloh']) {
    assert.ok(!getGettysburgPreloadUrls('?artPass=gettysburg-v4', scenario).some(url => url.includes('/gettysburg-v4/')));
  }
});

test('chroma compositor clears backdrop and spill while preserving cloth, skin and metal', () => {
  const original = new Uint8ClampedArray([0,255,0,255, 10,235,10,255, 40,55,78,255, 148,112,85,255, 115,119,114,255, 110,175,110,255]);
  const out = compositeUnitChroma(original.slice());
  assert.equal(out[3],0); assert.equal(out[7],0);
  assert.deepEqual(out.slice(8,20),original.slice(8,20));
  assert.ok(out[23]>0 && out[23]<255); assert.equal(out[21],110);
});

test('every detailed pose resolves in bounds and preserves native artwork hashes', () => {
  for (const side of ['union','confederate']) {
    const pages = {};
    for (const page of DETAILED_UNIT_PAGES) {
      const base = new URL(`../public/images/units/detailed-v2/${side}-${page}`,import.meta.url);
      const data = JSON.parse(readFileSync(`${base.pathname}.json`));
      const bytes = readFileSync(`${base.pathname}.png`);
      assert.equal(createHash('sha256').update(bytes).digest('hex'),data.meta.sha256);
      assert.equal(bytes.readUInt32BE(16),data.meta.size.w); assert.equal(bytes.readUInt32BE(20),data.meta.size.h);
      pages[page] = data.frames;
      for (const f of Object.values(data.frames)) {
        assert.ok(f.frame.x>=0 && f.frame.y>=0 && f.frame.x+f.frame.w<=1536 && f.frame.y+f.frame.h<=1024);
        assert.ok(f.bodyHeight>=400 && f.bodyHeight<=500);
        assert.ok(f.pivot.x>0 && f.pivot.x<1 && f.pivot.y>.98 && f.pivot.y<1);
      }
    }
    for (let direction=0;direction<8;direction++) for (let frame=0;frame<4;frame++) for (const action of ['idle','walk','route','fire','reload','melee','fall']) {
      const figure={id:1,direction,frame,action,scale:.82,fallen:action==='fall'};
      const p=detailedInfantryPose('a',figure,3);
      assert.ok(pages[p.page][p.frame]);
      assert.deepEqual(detailedInfantryPose('a',figure,3),p,'pause is deterministic');
      assert.deepEqual(detailedInfantryPose('a',figure,3,true),detailedInfantryPose('a',figure,9,true));
      assert.ok(pages.crew[detailedCrewFrame(direction,true).frame]);
      assert.ok(pages.crew[detailedCrewFrame(direction,false).frame]);
    }
  }
});

test('idle stays planted and reduced motion freezes gait, with explicit correct rear-fire fallback', () => {
  const figure={id:2,action:'idle',direction:6,frame:2,scale:.82};
  assert.equal(detailedInfantryPose('a',figure,0).page,'ready');
  assert.equal(detailedInfantryPose('a',{...figure,action:'walk'},2,true).page,'ready');
  assert.equal(detailedInfantryPose('a',{...figure,action:'fire'},2).useLegacyRearAim,true);
  assert.equal(detailedCrewFrame(6,true).frame,'2');
});
