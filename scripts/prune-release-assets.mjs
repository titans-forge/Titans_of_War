import { readdir, readFile, rm, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'vite';

const DIST_PICTURE_DIR = resolve('dist/images/cw_pictures');
const EXCLUDED_RELEASE_ASSETS = new Set([
  '/images/cw_pictures/shiloh_pittsburg_landing_theater_flux2.jpg',
  '/images/cw_pictures/richmond_evacuation_theater_flux2.jpg',
]);

function campaignPicturePath(value) {
  if (typeof value !== 'string' || !value.startsWith('/images/cw_pictures/')) return null;
  return value;
}

async function loadCampaignPictureAllowlist() {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });

  try {
    const { STATIC_SCENARIOS } = await vite.ssrLoadModule('/src/game/scenarios.js');
    const { resolveCampaignEndingMedia } = await vite.ssrLoadModule('/src/game/mediaCatalog.js');
    const allowed = new Set();

    for (const scenario of STATIC_SCENARIOS) {
      for (const candidate of [scenario.image, scenario.historicalImage]) {
        const picture = campaignPicturePath(candidate);
        if (picture) allowed.add(picture);
      }
    }

    for (const choiceId of ['option_a', 'option_b', 'option_c', 'option_d']) {
      const endingMedia = resolveCampaignEndingMedia({
        history: [{ scenarioId: 'southern_independence_1864', choiceId }],
      });
      const picture = campaignPicturePath(endingMedia?.src);
      if (picture) allowed.add(picture);
    }

    for (const excluded of EXCLUDED_RELEASE_ASSETS) allowed.delete(excluded);
    return allowed;
  } finally {
    await vite.close();
  }
}

async function removeUnusedPictures(allowed) {
  const files = await readdir(DIST_PICTURE_DIR, { withFileTypes: true });
  let removedFiles = 0;
  let removedBytes = 0;

  for (const entry of files) {
    if (!entry.isFile()) continue;
    const publicPath = `/images/cw_pictures/${entry.name}`;
    if (allowed.has(publicPath)) continue;

    const file = resolve(DIST_PICTURE_DIR, entry.name);
    removedBytes += (await stat(file)).size;
    await rm(file, { force: true });
    removedFiles += 1;
  }

  return { removedFiles, removedBytes };
}

async function collectBuiltPictureReferences() {
  const assetDir = resolve('dist/assets');
  const assets = await readdir(assetDir, { withFileTypes: true });
  const textFiles = [resolve('dist/index.html')];
  for (const entry of assets) {
    if (entry.isFile() && /\.(?:js|css)$/.test(entry.name)) textFiles.push(resolve(assetDir, entry.name));
  }

  const referenced = new Set();
  const pattern = /\/images\/cw_pictures\/[^"'`]+?\.(?:jpe?g|png|webp|avif|svg)/gi;
  for (const file of textFiles) {
    const contents = await readFile(file, 'utf8');
    for (const match of contents.matchAll(pattern)) referenced.add(match[0]);
  }

  return referenced;
}

async function verifyBuiltPictureReferences(referenced) {
  const missing = [];
  for (const publicPath of referenced) {
    if (EXCLUDED_RELEASE_ASSETS.has(publicPath)) continue;
    try {
      await stat(resolve(`dist${publicPath}`));
    } catch {
      missing.push(publicPath);
    }
  }

  if (missing.length) {
    throw new Error(`Release pruning removed referenced campaign media:\n${missing.map((item) => `  - ${item}`).join('\n')}`);
  }

  return referenced.size;
}

const allowed = await loadCampaignPictureAllowlist();
const builtReferences = await collectBuiltPictureReferences();
for (const publicPath of builtReferences) allowed.add(publicPath);
for (const excluded of EXCLUDED_RELEASE_ASSETS) allowed.delete(excluded);
const { removedFiles, removedBytes } = await removeUnusedPictures(allowed);
const verifiedReferences = await verifyBuiltPictureReferences(builtReferences);
const removedMegabytes = (removedBytes / (1024 * 1024)).toFixed(1);

console.log(
  `Release asset pruning removed ${removedFiles} unused campaign pictures (${removedMegabytes} MB); `
  + `kept ${allowed.size} campaign/ending assets and verified ${verifiedReferences} built references.`,
);
