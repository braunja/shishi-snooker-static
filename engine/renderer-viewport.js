// Mobile rotation can settle after the resize event, including during loading.
// Check before rendering; unchanged frames must not reallocate the GPU buffer.
export function createRendererViewportSync(renderer, viewport, onResize, getPixelRatio = () => Math.min(viewport.devicePixelRatio || 1, 2)) {
  let width = 0, height = 0, pixelRatio = 0;
  return function syncRendererViewport() {
    const nextWidth = viewport.innerWidth, nextHeight = viewport.innerHeight;
    const nextRatio = getPixelRatio();
    if (!(nextWidth > 0 && nextHeight > 0)) return false;
    if (width === nextWidth && height === nextHeight && pixelRatio === nextRatio
      && renderer.domElement.width === Math.floor(nextWidth * nextRatio)
      && renderer.domElement.height === Math.floor(nextHeight * nextRatio)) return false;
    renderer.setDrawingBufferSize(nextWidth, nextHeight, nextRatio);
    width = nextWidth; height = nextHeight; pixelRatio = nextRatio;
    onResize();
    return true;
  };
}

// Product presets adjust only resolution; all other render settings stay unchanged.
export function productQualityPixelRatio(viewport, quality = 'ultra') {
  const cap = ({ smooth: 1, high: 1.5, ultra: 2 })[quality] ?? 2;
  return Math.min(viewport.devicePixelRatio || 1, cap);
}
