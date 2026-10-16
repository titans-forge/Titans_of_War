import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const JSONHash = require('phaser/src/textures/parsers/JSONHash');
const Frame = require('phaser/src/textures/Frame');

// Exercise the installed Phaser parser and Frame without opening a browser or
// creating a renderer. Only the texture/source container is a test double.
export function gettysburgClipTestTextures(atlases) {
  const loaded = new Map();
  for (const [key, atlas] of atlases) {
    const texture = {
      key, source: [{ width: atlas.meta.size.w, height: atlas.meta.size.h }],
      customData: {}, frames: new Map(),
      add(name, sourceIndex, x, y, width, height) {
        if (this.frames.has(name)) return null;
        const frame = new Frame(this, name, sourceIndex, x, y, width, height);
        this.frames.set(name, frame);
        return frame;
      },
      has(name) { return this.frames.has(name); },
      get(name) { return this.frames.get(name); },
    };
    JSONHash(texture, 0, atlas);
    loaded.set(key, texture);
  }
  return {
    loaded,
    exists: key => loaded.has(key),
    get: key => loaded.get(key),
  };
}
