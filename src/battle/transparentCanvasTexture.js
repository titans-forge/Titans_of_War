// Artwork must not inherit a renderer's immutable alpha:false context from
// Phaser's global CanvasPool. Register a fresh, explicitly transparent source
// once at scene creation; the texture manager retains normal ownership.
export function createTransparentCanvasTexture(scene, key, width, height) {
  if (scene.textures.exists(key)) return scene.textures.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d', { alpha: true });
  return scene.textures.addCanvas(key, canvas);
}
