// Rendering defaults come from the saved project/release scheme, never browser storage.
export function resolveAppearanceConfig(input) {
  let presets = input?.presets;
  if (Array.isArray(presets)) {
    const latest = {};
    for (const p of [...presets].sort((a,b)=>(a.savedAt||0)-(b.savedAt||0))) latest[p.kind] = p;
    presets = latest;
  }
  const scene = { ...presets?.scene?.values };
  if (!scene.railWoodStyle || !scene.floorMaterial) throw new Error('场景配置缺少木材或地毯方案');
  return { scene, lighting: { ...presets?.lighting?.values, floorMaterial: scene.floorMaterial },
    revisions: { scene: presets.scene.revisionId, lighting: presets.lighting?.revisionId },
    source: input.source || 'project presets' };
}

export async function loadAppearanceConfig() {
  if (globalThis.SnookerTrialTuning?.snapshot) return resolveAppearanceConfig(globalThis.SnookerTrialTuning.snapshot);
  const response = await fetch('/api/presets', { cache: 'no-store' });
  if (response.ok) return resolveAppearanceConfig(await response.json());
  if (response.status !== 404) throw new Error('无法读取项目场景配置');
  const snapshot = await fetch('./project-presets.json', { cache: 'no-store' });
  if (!snapshot.ok) throw new Error('无法读取场景配置快照');
  return resolveAppearanceConfig(await snapshot.json());
}
