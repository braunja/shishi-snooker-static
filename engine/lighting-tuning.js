import { liteLightingParameterUnavailable } from './test-field-models.js';

// Per-colour calibration; the panel's mainAmount remains a shared multiplier.
export const BALL_BASE_BRIGHTNESS = Object.freeze({
  yellow:1.1, green:1.1, red:.9, pink:.9, white:1, brown:1, blue:1, black:1,
});
// Renderer-only tuning; never enters the physics core or its saved parameters.
export function createLightingTuning({ balls, ballShadows, ambient, tableMaterials = [], onChange=()=>{} }) {
  const materials = [...new Set(balls.children.map(ball => ball.material))];
  const roofBases = new Map(materials.filter(m=>m.uniforms.roofPlane).map(m=>[m,m.uniforms.roofPlane.value.y-3.5]));
  const white = materials.find(material => material.name === 'ballSphere / white');
  const colored = materials.find(material => material !== white);
  const sample = colored || white;
  const parameters = [];
  const add = (id, nameZh, group, min, max, step, value, description) => {
    parameters.push({ id, nameZh, group, min, max, step, default: value, description });
  };
  add('roofLength','每排灯板长度（米）','主灯箱几何',2,8,.05,5,'同时调整球面与木边顶部主灯反射的等效长度。');
  add('roofWidth','每排灯板宽度（米）','主灯箱几何',.2,2,.01,.75,'调整发光宽度，保留两排之间的间距。');
  add('roofHeight','灯板距台面高度（米）','主灯箱几何',1,6,.05,3.5,'同时调整球面与木边顶部反射的安装高度。');
  const shadow = ballShadows.children[0]?.material;
  add('shadowOpacity', '阴影透明度', '台面接触阴影', 0, 1, .01, shadow?.opacity ?? 1, '越低越浅；建议先试 0.55。');
  add('shadowSize', '阴影范围', '台面接触阴影', .25, 2, .01, 1, '相对于当前阴影尺寸的倍数，不改变球体大小。');
  add('shadowOffsetStrength', '随球位偏心强度', '台面接触阴影', 0, 2, .01, .5, '0 居中；越大越向远离主灯中心的方向偏移。外层偏移明显，内层为其四分之一。');
  add('shadowInnerStrength', '内层阴影强度', '台面接触阴影', 0, 1, .01, .75, '球底深色接触阴影。');
  add('shadowOuterStrength', '外层阴影强度', '台面接触阴影', 0, 1, .01, .28, '外围较浅的半影。');
  add('shadowInnerRadius', '内层阴影范围', '台面接触阴影', .1, .65, .01, .50, '内层半径，相对于阴影面的半宽。');
  add('shadowOuterRadius', '外层阴影范围', '台面接触阴影', .67, .94, .01, .78, '外层半径，始终大于内层。');
  add('shadowInnerBlur', '内层阴影模糊程度', '台面接触阴影', 0, 1, .01, .2, '0 接近硬边，越大过渡越柔和；独立控制内层边缘。');
  add('shadowOuterBlur', '外层阴影模糊程度', '台面接触阴影', 0, 1, .01, .25, '0 接近硬边，越大过渡越柔和；独立控制外层边缘。');
  parameters.push({ id: 'ballContactShadowEnabled', nameZh: '显示球底接触阴影', group: '台面接触阴影', type: 'checkbox', default: true });
  add('ballContactShadowStrength', '球底阴影强度', '台面接触阴影', 0, 1, .01, .65, '压暗球体贴近台面的部分；独立于台面上的投影和球体反射。');
  add('ballContactShadowRange', '球底阴影范围', '台面接触阴影', .01, .3, .005, .10, '球底渐暗区域的高度，占球直径的比例；固定在台面接触处，不随灯光轴倾斜。');
  add('whiteWarmth', '母球暖黄程度', '球面明暗', 0, 1, .01, .35, '只调整母球底色，不染黄灯箱反光。');
  parameters.push({ id: 'shadowEnabled', nameZh: '显示接触阴影', group: '台面接触阴影', type: 'checkbox', default: true });
  add('colorReflection', '彩球反射亮度', '球面反射', 0, 3, .01, colored?.uniforms.amount.value ?? 1.34, '控制灯箱和周围环境在彩球上的反射。');
  add('whiteReflection', '白球反射亮度', '球面反射', 0, 3, .01, white?.uniforms.amount.value ?? .65, '单独控制白球的环境反射。');
  add('ballEnvironmentIntensity', '场馆与台呢反射强度', '球面反射', 0, 1, .01, 1, '调节球面的场馆和台呢反射；新 1.0 等于旧 0.5，顶部灯箱独立保留。');
  Object.assign(parameters.at(-1), {legacyId:'ballEnvironmentStrength', legacyScale:2});
  add('ballLowerReflection', '台面方向反射强度', '球面反射', 0, 3, .01, 1, '额外调节朝向下半球的环境反射，主要是台呢；0 关闭，1 原亮度。水平附近柔和过渡，顶部灯箱不受影响。');
  add('ballLightAxisTilt', '球体光影轴倾角', '球面反射', 0, 1, .01, 0, '0 垂直于台面；1 指向主灯箱中心。随球位及灯板高度实时变化，只改变球体底色与明暗贴图。');
  add('pocketBrightness', '落袋球基础亮度', '落袋球光影', 0, 3, .01, 1, '只调整袋网、滑轨中球的基础明暗；落袋后无环境反光，1 保持原亮度。');
  add('mainAmount', '球面底色亮度', '球面明暗', 0, 2, .01, 1, '以各球校准后的底色为基准统一调节；1 为默认，灯箱反光不受此项影响。');
  add('aoStrength', '反射暗部衰减', '球面明暗', 0, 1, .01, 1, '降低可减弱明暗贴图对反射的压暗；不改变底色贴图。');
  add('fresnelAmount', '边缘亮光强度', '球面反射', 0, 2, .01, sample.uniforms.fresnelAmount.value, '控制随观察角度变化的额外亮光。');
  add('fresnelFocus', '边缘亮光集中度', '球面反射', .01, 1, .01, sample.uniforms.fresnelFocus.value, '控制额外亮光的集中程度。');
  add('roughness', '反射粗糙度', '球面反射', 0, 1, .01, sample.uniforms.roughness.value, '当前只影响反射强度查表，不会模糊灯箱贴图。');
  add('ambientIntensity', '环境光强度', '场景环境光', 0, 3, .01, ambient.intensity, '影响接收环境光的球桌材质；球体由上面的独立参数控制。');
  parameters.push({ id: 'ambientColor', nameZh: '环境光颜色', group: '场景环境光', type: 'color', default: '#' + ambient.color.getHexString() });
  for (const [prefix, title] of [['wood', '木边哑光反射'], ['cushion', '布库边反射']]) {
    const material = tableMaterials.find(m => m.userData.lightingGroup === prefix);
    if (!material) continue;
    add(prefix + 'Reflection', '环境反射强度', title, 0, 4, .01, material.envMapIntensity, '控制周围赛场和灯箱形成的柔和反光。');
    add(prefix + 'Roughness', '表面粗糙度', title, .05, 1, .01, material.roughness, '越高反射越模糊、越哑光；越低越接近亮漆。');
    add(prefix + 'BaseLight', '底图自发光比例', title, 0, 1.5, .01, prefix === 'wood' ? .65 : 1, '降低可减少底图平亮感，让环境光泽更明显。');
  }
  const defaults = Object.fromEntries(parameters.map(p => [p.id, p.default]));
  const originalAmbientColor = ambient.color.clone();
  let revision=0;
  let current = { ...defaults };
  const extensions = [];
  function apply(patch = {}) {
    const next = { ...current };
    for (const p of parameters) {
      if (liteLightingParameterUnavailable(p.id)) continue;
      // Parameters whose units changed accept old saved keys only on import.
      // getValues emits the current key, so reapplying it never converts twice.
      const key=Object.hasOwn(patch,p.id)?p.id:p.legacyId;
      if (!key || !Object.hasOwn(patch,key)) continue;
      const value = patch[key];
      if (p.type === 'checkbox') { if (typeof value === 'boolean') next[p.id] = value; }
      else if (p.type === 'select') { if (p.options.some(option => option.value === value)) next[p.id] = value; }
      else if (p.type === 'color') { if (/^#[\da-f]{6}$/i.test(value)) next[p.id] = value; }
      else if (value !== null && String(value).trim() !== '' && Number.isFinite(Number(value))) next[p.id] = Math.min(p.max, Math.max(p.min, Number(value)*(key===p.id?1:p.legacyScale??1)));
    }
    current = next;revision++;onChange();
    for (const material of materials) {
      if(roofBases.has(material)) {
        material.uniforms.roofPlane.value.y=roofBases.get(material)+next.roofHeight;
        material.uniforms.roofDimensions?.value.set(next.roofLength,next.roofWidth);
      }
      material.uniforms.amount.value = material === white ? next.whiteReflection : next.colorReflection;
      const colour=material.name.replace('ballSphere / ', '');
      material.uniforms.mainAmount.value=next.mainAmount*(BALL_BASE_BRIGHTNESS[colour]??1);
      for (const key of ['aoStrength', 'fresnelAmount', 'fresnelFocus', 'roughness', 'pocketBrightness']) material.uniforms[key].value = next[key];
      if (material.uniforms.ballLightAxisTilt) material.uniforms.ballLightAxisTilt.value=next.ballLightAxisTilt;
      if (material.uniforms.ballContactShadowStrength) material.uniforms.ballContactShadowStrength.value=next.ballContactShadowEnabled?next.ballContactShadowStrength:0;
      if (material.uniforms.ballContactShadowRange) material.uniforms.ballContactShadowRange.value=next.ballContactShadowRange;
      if(material.uniforms.ballEnvironmentStrength)material.uniforms.ballEnvironmentStrength.value=next.ballEnvironmentIntensity*.5;
      if(material.uniforms.ballLowerReflection)material.uniforms.ballLowerReflection.value=next.ballLowerReflection;
    }
    if (white) white.uniforms.whiteWarmth.value = next.whiteWarmth;
    ballShadows.visible = next.shadowEnabled;
    for (const mesh of ballShadows.children) {
      mesh.material.opacity = next.shadowOpacity;
      const u=mesh.material.uniforms;
      u.opacity.value=next.shadowOpacity;
      for (const key of ['innerStrength','outerStrength','innerRadius','outerRadius','innerBlur','outerBlur'])
        u[key].value=next['shadow'+key[0].toUpperCase()+key.slice(1)];
      mesh.scale.set(next.shadowSize, next.shadowSize, 1);
    }
    for (const material of tableMaterials) {
      const prefix = material.userData.lightingGroup;
      if (!prefix || next[prefix + 'Reflection'] === undefined) continue;
      material.envMapIntensity = next[prefix + 'Reflection'];
      material.roughness = next[prefix + 'Roughness'];
      material.emissiveIntensity = material.userData.originalEmissiveIntensity * next[prefix + 'BaseLight'];
    }
    ambient.intensity = next.ambientIntensity;
    // Preserve original linear color exactly until a color edit is requested.
    if (next.ambientColor === defaults.ambientColor) ambient.color.copy(originalAmbientColor);
    else if (next.ambientColor !== '#' + ambient.color.getHexString()) ambient.color.set(next.ambientColor);
    for (const extension of extensions) extension.apply(next);
    return true;
  }
  function register(extension) {
    for (const parameter of extension.parameters) {
      if (parameters.some(p => p.id === parameter.id)) throw new Error("Duplicate lighting parameter: " + parameter.id);
      parameters.push(parameter);
      defaults[parameter.id] = parameter.default;
      current[parameter.id] = parameter.default;
    }
    extensions.push(extension);
    extension.apply(current);
  }
  return { register, parameters, defaults, getValues: () => ({ ...current }), getRevision:()=>revision, apply };
}
