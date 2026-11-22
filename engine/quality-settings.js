import { formatGpuTiming } from './gpu-timing.js';
// Test-field-only preferences. The trial never reads this storage key.
export const CLARITY_LEVELS = Object.freeze({
  smooth: { label: '流畅', dprCap: 1, resolutionScale: 1 },
  balanced: { label: '均衡', dprCap: 1.5, resolutionScale: 1 },
  high: { label: '高清', dprCap: 2, resolutionScale: 1 },
});
export const QUALITY_KEY = 'snooker.test-field.quality.v1';
export const QUALITY_DEFAULTS = Object.freeze({ dprCap: 2, resolutionScale: 1, antialias: true, anisotropy: 0, textureFilter: 'original', toneMapping: 'none', exposure: 1 });
export function normalizeQuality(input = {}) {
  const out = { ...QUALITY_DEFAULTS };
  for (const [key, min, max] of [['dprCap', .5, 3], ['resolutionScale', .25, 1.5], ['exposure', .25, 3]]) {
    if (typeof input[key] === 'number' && Number.isFinite(input[key])) out[key] = Math.min(max, Math.max(min, input[key]));
  }
  if (typeof input.antialias === 'boolean') out.antialias = input.antialias;
  if ([0, 1, 2, 4, 8, 16].includes(input.anisotropy)) out.anisotropy = input.anisotropy;
  if (['original', 'linear', 'nearest'].includes(input.textureFilter)) out.textureFilter = input.textureFilter;
  if (['none', 'aces', 'neutral'].includes(input.toneMapping)) out.toneMapping = input.toneMapping;
  return out;
}
export function readQuality(storage) {
  try {
    const saved = normalizeQuality(JSON.parse(storage.getItem(QUALITY_KEY)) || {});
    // Map legacy custom resolution settings to a preset, preserving all other parameters.
    const ratio = saved.dprCap * saved.resolutionScale;
    const level = Object.values(CLARITY_LEVELS).reduce((best, next) => Math.abs(next.dprCap * next.resolutionScale - ratio) < Math.abs(best.dprCap * best.resolutionScale - ratio) ? next : best);
    return { ...saved, dprCap: level.dprCap, resolutionScale: level.resolutionScale };
  } catch { return { ...QUALITY_DEFAULTS }; }
}
export function qualityPixelRatio(viewport, settings) {
  return Math.min(viewport.devicePixelRatio || 1, settings.dprCap) * settings.resolutionScale;
}

export function createQualitySettings({ THREE, renderer, scene, viewport = window, storage = window.localStorage, initial = readQuality(storage), gpuTiming = null, onChange = () => {} }) {
  let settings = normalizeQuality(initial), mounted = null;
  const activeAntialias = !!renderer.getContext().getContextAttributes()?.antialias;
  const gpuLabel = document.createElement('output');
  gpuLabel.className = 'quality-gpu-live';
  gpuLabel.title = 'GPU 理论最大帧率 = 1000 / 平均 GPU 毫秒；只反映场景 GPU 耗时，不代表包含 CPU、UI 和垂直同步限制的实际帧率。';
  document.querySelector('#test-frame-rates')?.append(gpuLabel);
  const roots = new Set([scene]);
  const originalTextures = new WeakMap();
  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
  function syncTextures() {
    for (const root of roots) root.traverse(node => {
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
        if (!material) continue;
        const textures = new Set(Object.values(material).filter(v => v?.isTexture));
        for (const uniform of Object.values(material.uniforms || {})) if (uniform?.value?.isTexture) textures.add(uniform.value);
        for (const texture of textures) {
          // Preserve lighting lookup data, render targets, depth and cube reflections.
          if (texture.isRenderTargetTexture || texture.isDepthTexture || texture.isCubeTexture || texture.isDataTexture || texture.isData3DTexture || texture.isDataArrayTexture) continue;
          if (!originalTextures.has(texture)) originalTextures.set(texture, { anisotropy: texture.anisotropy, minFilter: texture.minFilter, magFilter: texture.magFilter });
          const original = originalTextures.get(texture);
          const anisotropy = settings.anisotropy === 0 ? original.anisotropy : Math.min(settings.anisotropy, maxAnisotropy);
          const minFilter = settings.textureFilter === 'original' ? original.minFilter : settings.textureFilter === 'nearest' ? THREE.NearestFilter : THREE.LinearFilter;
          const magFilter = settings.textureFilter === 'original' ? original.magFilter : settings.textureFilter === 'nearest' ? THREE.NearestFilter : THREE.LinearFilter;
          if (texture.anisotropy !== anisotropy || texture.minFilter !== minFilter || texture.magFilter !== magFilter) {
            Object.assign(texture, { anisotropy, minFilter, magFilter, needsUpdate: true });
          }
        }
      }
    });
  }
  function apply(patch) {
    settings = normalizeQuality({ ...settings, ...patch });
    let saved = true;
    try { storage.setItem(QUALITY_KEY, JSON.stringify(settings)); } catch { saved = false; }
    renderer.toneMapping = { none: THREE.NoToneMapping, aces: THREE.ACESFilmicToneMapping, neutral: THREE.NeutralToneMapping }[settings.toneMapping];
    renderer.toneMappingExposure = settings.exposure;
    syncTextures(); onChange(); update();
    if (mounted) mounted.querySelector('[data-quality-status]').textContent = `${saved ? '已保存到本浏览器。' : '设置已生效，但浏览器无法保存。'}${settings.antialias !== activeAntialias ? '抗锯齿设置需重载页面生效。' : ''}`;
  }
  let lastGpuUpdate = -Infinity, gpuText = '';
  function update() {
    if (performance.now() - lastGpuUpdate > 250) {
      lastGpuUpdate = performance.now();
      gpuText = gpuTiming ? formatGpuTiming(gpuTiming.snapshot()) : 'GPU：不支持 GPU 计时';
      gpuLabel.textContent = gpuText;
    }
    if (!mounted?.isConnected || !mounted.querySelector('[data-quality-stats]')) return;
    const ratio = qualityPixelRatio(viewport, settings);
    mounted.querySelector('[data-quality-stats]').textContent = `窗口：${viewport.innerWidth} × ${viewport.innerHeight} CSS px\n设备 DPR：${viewport.devicePixelRatio || 1} · 渲染 DPR：${ratio.toFixed(2)}\n实际画布：${renderer.domElement.width} × ${renderer.domElement.height} px\n抗锯齿：${activeAntialias ? '开启' : '关闭'} · 各向异性上限：${maxAnisotropy}×\n${gpuText}`;
  }
  function mount(container) {
    mounted = container;
    container.innerHTML = `<div class="quality-controls">
      <p class="sound-pack-note">仅影响测试场，修改自动保存在本浏览器。分辨率档位仅组合 DPR 上限和渲染比例，不改变下方其他参数。</p>
      <label>渲染分辨率<select data-clarity>${Object.entries(CLARITY_LEVELS).map(([key, level]) => `<option value="${key}">${level.label}${key === 'high' ? '（默认）' : ''}</option>`).join('')}</select></label>
      <p class="sound-pack-note">流畅：DPR 上限 1 × 100%；均衡：DPR 上限 1.5 × 100%；高清：DPR 上限 2 × 100%。实际 DPR 不超过设备 DPR，窗口变化时自动适配。</p>
      <label><span>抗锯齿 MSAA（重载后生效）</span><input data-quality="antialias" type="checkbox"></label>
      <label>各向异性过滤<select data-quality="anisotropy"><option value="0">原始材质设置</option>${[1,2,4,8,16].map(v=>`<option value="${v}">${v}×</option>`).join('')}</select></label>
      <label>纹理过滤<select data-quality="textureFilter"><option value="original">原始材质设置（含 Mipmap）</option><option value="linear">双线性（不使用 Mipmap）</option><option value="nearest">最近邻（像素对比）</option></select></label>
      <label>色调映射<select data-quality="toneMapping"><option value="none">无（当前默认）</option><option value="aces">ACES Filmic</option><option value="neutral">Neutral</option></select></label>
      <label>曝光（启用色调映射后有效）<input data-quality="exposure" type="number" min="0.25" max="3" step="0.05"></label>
      <p class="sound-pack-note">纹理选项只调整采样，不改变贴图文件尺寸。场景中自定义着色材质可能不响应色调映射。</p>
      <p class="sound-pack-note">GPU 理论上限 = 1000 ÷ 平均 GPU 帧耗时（毫秒），按最近最多 60 个有效帧估算，每 250 毫秒刷新；不含 CPU、界面合成和垂直同步限制。</p>
      <pre data-quality-stats></pre><p data-quality-status role="status" class="sound-pack-note"></p>
      <button type="button" data-quality-reset>恢复默认画质</button><button type="button" data-quality-reload>重载页面</button>
    </div>`;
    const clarity = container.querySelector('[data-clarity]');
    clarity.value = Object.keys(CLARITY_LEVELS).find(key => CLARITY_LEVELS[key].dprCap === settings.dprCap && CLARITY_LEVELS[key].resolutionScale === settings.resolutionScale) || 'high';
    clarity.addEventListener('change', () => {
      const { dprCap, resolutionScale } = CLARITY_LEVELS[clarity.value];
      apply({ dprCap, resolutionScale });
    });
    for (const control of container.querySelectorAll('[data-quality]')) {
      const key = control.dataset.quality;
      if (control.type === 'checkbox') control.checked = settings[key]; else control.value = settings[key];
      control.addEventListener('change', () => {
        if (control.type === 'number' && (!control.value.trim() || !Number.isFinite(Number(control.value)))) { control.value = settings[key]; return; }
        apply({ [key]: control.type === 'checkbox' ? control.checked : ['textureFilter', 'toneMapping'].includes(key) ? control.value : Number(control.value) });
        if (control.type !== 'checkbox') control.value = settings[key];
      });
    }
    container.querySelector('[data-quality-reset]').onclick = () => { apply(QUALITY_DEFAULTS); const message = container.querySelector('[data-quality-status]').textContent; mount(container);container.querySelector('[data-quality-status]').textContent = message; };
    container.querySelector('[data-quality-reload]').onclick = () => viewport.location.reload();
    container.querySelector('[data-quality-status]').textContent = settings.antialias !== activeAntialias ? '抗锯齿设置需重载页面生效。' : '修改即时预览；抗锯齿需重载页面。';
    update();
  }
  // Apply persisted tone mapping before the first draw; textures arrive later.
  renderer.toneMapping = { none: THREE.NoToneMapping, aces: THREE.ACESFilmicToneMapping, neutral: THREE.NeutralToneMapping }[settings.toneMapping];
  renderer.toneMappingExposure = settings.exposure;
  return { mount, update, addRoot(root) { roots.add(root); syncTextures(); }, removeRoot(root) { roots.delete(root); }, dispose: () => { roots.clear(); gpuLabel.remove(); }, apply, syncTextures, pixelRatio: () => qualityPixelRatio(viewport, settings), getValues: () => ({ ...settings }) };
}
