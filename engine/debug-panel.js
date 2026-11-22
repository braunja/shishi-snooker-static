import { createTuningUpdateQueue } from './tuning-update-queue.js';
import { mountSoundVolumes } from './sound-volumes.js';
import { AIM_DIFFICULTIES, createAimDraft, activeAimValues } from './aim-difficulty.js';
import { readPresetLibrary, latestPreset, savePreset } from './debug-preset-store.js';
import { mountCushionResponseLab } from './cushion-response-lab.js';
import { createAiPanel } from './ai-panel.js';
import { liteSceneParameterUnavailable, liteLightingParameterUnavailable } from './test-field-models.js';
const modelGroups = [
  ['场馆', ['roomEnvironment', 'show_room']],
  ['地面与背景', ['background', 'show_floor', 'carpetDetailMaterial', 'carpetDetailRepeat', 'floorMaterial', 'carpetCustom', 'carpetColor', 'floorRepeat']],
  ['台呢', ['show_cloth']],
  ['库边与木材', ['show_rails', 'railWoodStyle']],
  ['桌腿', ['show_legs']],
  ['桌身与标记', ['show_panels', 'show_other']],
  ['袋口与回球', ['show_leather', 'show_net', 'show_rings', 'show_slides']],
  ['球体', ['show_balls']],
  ['球杆', ['show_cue']],
  ['全局查看工具', ['isolate', 'mode', 'wireframe', 'allTextures', 'colorMaps', 'normalMaps', 'roughnessMaps']],
];
const modelLabels = {
  roomEnvironment: '选择场馆',
  show_room: '显示场馆布景',
  background: '背景颜色',
  show_floor: '显示地面和地毯',
  floorMaterial: '地面样式',
  carpetCustom: '使用自定义地毯颜色',
  floorRepeat: '地面花纹密度',
  show_cloth: '显示台呢',
  show_rails: '显示库边与木边',
  railWoodStyle: '库边和桌身的木纹',
  show_legs: '显示桌腿',
  show_panels: '显示侧板与底座',
  show_other: '显示其他桌面标记',
  show_leather: '显示袋口皮革',
  show_net: '显示网兜',
  show_rings: '显示金属圆环',
  show_slides: '显示回球滑轨与托架',
  show_balls: '显示球',
  isolate: '只看某个部件',
  show_cue: '显示球杆',
  mode: '模型查看方式',
  wireframe: '显示模型网格线',
  allTextures: '使用全部贴图',
  colorMaps: '使用颜色贴图',
  normalMaps: '使用表面凹凸效果',
  roughnessMaps: '使用表面光泽变化',
};
const modelHelp = {
  floorRepeat: '数值越大，同一块地面上的花纹越小、重复越密。',
  railWoodStyle: '同时切换库边和球桌侧板的木纹。',
  isolate: '临时只看选中的部件。选择“全部”即可返回各分类自己的显示设置。',
  mode: '白模便于看轮廓，法线用颜色表示表面朝向。',
};

function orderModelParameters(parameters) {
  const remaining = new Map(parameters.map(parameter => [parameter.id, parameter]));
  const ordered = [];
  for (const [group, ids] of modelGroups) {
    for (const id of ids) {
      const parameter = remaining.get(id);
      if (!parameter) continue;
      remaining.delete(id);
      ordered.push({ ...parameter, group, nameZh: modelLabels[id] ?? parameter.nameZh,
        description: parameter.description || modelHelp[id] });
    }
  }
  return ordered.concat([...remaining.values()].map(parameter => ({ ...parameter, group: '其他模型参数' })));
}

function modelFoldout(title) {
  const details = document.createElement('details');
  details.className = 'debug-model-foldout';
  const summary = document.createElement('summary');
  summary.textContent = title;
  details.append(summary);
  return details;
}

const isCurrentPhysicsPreset = p => p?.values?.physicsVersion !== 'SP' && p?.values?.physicsVariant !== 'SP';
// Old saved schemes must not restore retired experiments.
function withoutRetiredPhysicsValues(values = {}) {
  const retired = new Set(['cushionHighSpeedAngleCorrection','rackLayoutMode','rackGapMinMm','rackGapMaxMm','physicsVersion','physicsVariant','sp','currentClusterRandomStrength','hybridRandomStrength','testFieldCurrentClusterRandomStrength','testFieldHybridRandomStrength','testFieldHybridRandomSeed','pocketCaptureMode']);
  return Object.fromEntries(Object.entries(values).filter(([key])=>!retired.has(key)&&!/^sp[A-Z]/.test(key)));
}
export function testFieldPhysicsValues(values = {}) {
  return { cushionSpeedCorrectionStrength: 1, ballClusterLogic: 'current', redRackGapMaxMm: .1, ...withoutRetiredPhysicsValues(values) };
}
export function loadDebugConfig(api, defaults) {
  const library = readPresetLibrary();
  try { localStorage.removeItem('snooker.3d-test-field.physics-version'); } catch {}
  const saved = Object.fromEntries(['aim', 'physics'].map(kind => [kind, latestPreset(kind === 'physics' ? library.filter(isCurrentPhysicsPreset) : library, kind)?.values || {}]));
  return api.createGameClientConfig({ ...defaults,
    aim: { ...defaults.aim, values: { ...defaults.aim.values, ...activeAimValues(createAimDraft(saved.aim, defaults.aim.values)) } },
    physics: { ...defaults.physics, settings: window.SnookerTestFieldModels
      ? { ...defaults.physics.settings, pocketCaptureMode: 'angle' } : defaults.physics.settings,
      overrides: { ...defaults.physics.overrides, ...testFieldPhysicsValues(saved.physics) } },
  });
}
export function createDebugPanel({ quality, lighting, sceneDebug, core, api, defaults, soundVolumes, soundSettings, cueTrajectory, onTuningChange = () => {} }) {
  const root = document.createElement('aside');
  root.className = 'debug-dock';
  root.setAttribute('aria-label', '3D 调试面板');
  root.innerHTML = `
    <nav class="debug-rail" aria-label="调试分类">
      <span class="debug-rail-label">调试</span>
      <button type="button" data-debug-tab="aim" aria-expanded="false" aria-controls="debug-content">瞄准</button>
      <button type="button" data-debug-tab="physics" aria-expanded="false" aria-controls="debug-content">物理</button>
      <button type="button" data-debug-tab="quality" aria-expanded="false" aria-controls="debug-content">画质</button>
      <button type="button" data-debug-tab="lighting" aria-expanded="false" aria-controls="debug-content">光影</button>
      <button type="button" data-debug-tab="scene" aria-expanded="false" aria-controls="debug-content">模型</button>
      <button type="button" data-debug-tab="sound" aria-expanded="false" aria-controls="debug-content">声音</button>
      <button type="button" data-debug-tab="cases" aria-expanded="false" aria-controls="debug-content">用例</button>
      <button type="button" data-debug-tab="ai" aria-expanded="false" aria-controls="debug-content">AI</button>
    </nav>
    <section id="debug-content" class="debug-content" aria-labelledby="debug-title" hidden>
      <header><div><h2 id="debug-title">瞄准</h2><span id="debug-version"></span></div><button type="button" id="debug-close" aria-label="收起调试面板">收起 ›</button></header>
      <p id="debug-loaded" class="debug-note"></p>
      <p class="debug-note">即时预览 · 保存方案写入项目配置文件</p>
      <fieldset class="debug-fields">
        <div class="param-row debug-ball-textures" hidden>
          <label for="debug-ball-texture-version">球的外观版本</label>
          <select id="debug-ball-texture-version"></select>
          <p id="debug-ball-texture-status" role="status"></p>
        </div>
        <div class="debug-presets">
          <label for="debug-preset">已保存方案</label><select id="debug-preset"><option value="">选择方案</option></select>
          <input id="debug-name" aria-label="方案名称" placeholder="方案名称" maxlength="40">
          <button type="button" id="debug-save">保存方案</button>
          <button type="button" id="debug-reset">恢复本栏默认</button>
        </div>
        <label id="debug-difficulty-row" hidden>难度级别 <select id="debug-difficulty"></select></label>
        <div class="debug-parameters"></div>
      </fieldset>
      <p id="debug-status" role="status">修改即时生效，物理参数用于下一杆。</p>
    </section>`;
  document.querySelector('#viewer').append(root);
  const content = root.querySelector('#debug-content');
  const fields = root.querySelector('fieldset');
  const parameterContainer = root.querySelector('.debug-parameters');
  const status = root.querySelector('#debug-status');
  const presetsPanel = root.querySelector('.debug-presets');
  const loadedNote = root.querySelector('#debug-loaded');
  const saveNote = loadedNote.nextElementSibling;
  const select = root.querySelector('#debug-preset');
  const name = root.querySelector('#debug-name');
  const ballTexturePanel = root.querySelector('.debug-ball-textures');
  const ballTexturePicker = root.querySelector('#debug-ball-texture-version');
  const ballTextureStatus = root.querySelector('#debug-ball-texture-status');
  const modelVenue = modelFoldout('场馆');
  const modelTable = modelFoldout('球桌');
  const modelBalls = modelFoldout('球体');
  const modelCue = modelFoldout('球杆');
  for (const category of [modelVenue, modelTable, modelBalls, modelCue]) category.classList.add('debug-model-category');
  modelVenue.open = true;
  const modelGround = modelFoldout('地面与背景');
  const modelChecks = modelFoldout('全局查看工具');
  const modelStats = modelFoldout('统计');
  const modelPresets = modelFoldout('模型方案');
  const statsBox = document.createElement('pre');
  statsBox.className = 'scene-debug-stats';
  modelStats.append(statsBox);
  const venueStatus = document.createElement('p');
  venueStatus.className = 'debug-model-note';
  venueStatus.setAttribute('role', 'status');
  const tableStatus = venueStatus.cloneNode();
  let venueSwitching = false;
  const models = window.SnookerTestFieldModels;
  if (models) modelTable.open = true;
  function syncCarpetControls() {
    if (!models) return;
    const available = models.selection.venue === 'crucible-2026';
    const baked = sceneDebug.getValues().carpetDetailMaterial === 'baked';
    for (const control of modelGround.querySelectorAll('[data-parameter^="carpetDetail"]')) {
      control.disabled = !available || (baked && control.dataset.parameter === 'carpetDetailRepeat');
      control.title = !available ? '适用于 2026 克鲁斯堡' : '';
    }
  }
  function syncModelPicker(picker) {
    const key = picker.dataset.modelChoice;
    const options = models.options(models.selection)[key];
    picker.replaceChildren(...options.map(option => new Option(option.label, option.value)));
    picker.value = models.selection[key];
    picker.disabled = venueSwitching || options.length < 2;
  }
  function modelPicker(key, label) {
    const row = document.createElement('label');
    row.className = 'param-row debug-model-picker';
    const picker = document.createElement('select');
    picker.setAttribute('aria-label', label);
    picker.dataset.modelChoice = key;
    syncModelPicker(picker);
    picker.addEventListener('change', async () => {
      const value = picker.value;
      if (venueSwitching || value === models.selection[key]) return;
      venueSwitching = true;
      for (const control of parameterContainer.querySelectorAll('[data-model-choice]')) control.disabled = true;
      const target = key === 'venue' ? '场馆' : key === 'table' ? '球桌' : '球桌光影';
      const status = key === 'venue' ? venueStatus : tableStatus;
      status.textContent = `正在加载${target}…`;
      try {
        await models.switch({[key]:value});
        status.textContent = key === 'table' ? '球桌已切换，已按对应的碰撞边界重新开局。' : `${target}已切换，当前球局和镜头已保留。`;
        if (kind === 'scene') render();
      } catch (error) {
        status.textContent = `${target}切换失败：${error.message}`;
      } finally {
        venueSwitching = false;
        for (const control of parameterContainer.querySelectorAll('[data-model-choice]')) syncModelPicker(control);
        syncCarpetControls();
      }
    });
    row.append(label, picker);
    return row;
  }

  function arrangeModelGroups() {
    const groups = new Map([...parameterContainer.children].map(group => [group.firstElementChild.textContent, group]));
    const venue = groups.get('场馆');
    const ground = groups.get('地面与背景');
    const balls = groups.get('球体');
    const cue = groups.get('球杆');
    const checks = groups.get('全局查看工具');
    for (const group of [venue, ground, balls, cue, checks]) group?.firstElementChild.remove();
    const venuePicker = venue.querySelector('.param-row');
    if (models) venuePicker.replaceWith(modelPicker('venue', '选择场馆'), venueStatus);
    else venuePicker.after(venueStatus);
    modelGround.replaceChildren(modelGround.firstElementChild, ground);
    if (sceneParameters.find(parameter => parameter.id === 'floorMaterial')?.disabled) {
      const note = document.createElement('p');
      note.className = 'debug-model-note';
      note.textContent = models ? '2026 克鲁斯堡支持在烘焙光影上叠加细纹。' : '这个场馆的地毯已随场景制作，灰色选项在这里不能调。';
      ground.before(note);
    }
    modelVenue.replaceChildren(modelVenue.firstElementChild, venue, modelGround);
    syncCarpetControls();
    const tableSections = ['台呢', '库边与木材', '桌腿', '桌身与标记', '袋口与回球'].map(title => groups.get(title)).filter(Boolean);
    modelTable.replaceChildren(modelTable.firstElementChild, ...tableSections);
    if (models) {
      const choices = document.createElement('div');
      choices.className = 'debug-model-selection';
      const note = document.createElement('p');
      note.className = 'debug-model-note';
      note.textContent = '切换球桌会按对应的物理边界重新开局。';
      choices.append(modelPicker('table', '选择球桌'), modelPicker('lighting', '球桌光影'), note, tableStatus);
      modelTable.firstElementChild.after(choices);
    }
    modelBalls.replaceChildren(modelBalls.firstElementChild, ...(balls ? [balls] : []), ballTexturePanel);
    if (cue) modelCue.replaceChildren(modelCue.firstElementChild, cue);
    modelChecks.replaceChildren(modelChecks.firstElementChild, checks, modelStats);
    const remaining = groups.get('其他模型参数');
    if (remaining) modelStats.before(remaining);
    parameterContainer.replaceChildren(modelVenue, modelTable, modelBalls, ...(cue ? [modelCue] : []), modelChecks);
  }
  for (const {value, label} of sceneDebug.ballTextureVersions) {
    ballTexturePicker.add(new Option(label, value));
  }
  ballTexturePicker.value = sceneDebug.getBallTextureVersion();
  ballTexturePicker.addEventListener('change', async () => {
    ballTexturePicker.disabled = true;
    ballTextureStatus.textContent = '正在加载球面贴图…';
    try {
      const applied = await sceneDebug.setBallTextureVersion(ballTexturePicker.value);
      ballTexturePicker.value = sceneDebug.getBallTextureVersion();
      ballTextureStatus.textContent = applied
        ? `已切换到 ${ballTexturePicker.selectedOptions[0].text}`
        : '加载失败，仍使用原选版本。请重试。';
    } finally {
      ballTexturePicker.disabled = false;
    }
  });
  const aiPanel = createAiPanel({core,api});
  let kind = null;
  let controls = new Map();
  let presets = readPresetLibrary();
  const selected = Object.fromEntries(['aim', 'physics', 'lighting', 'scene', 'sound'].map(k => [k, latestPreset(presets, k)]));
  selected.physics = latestPreset(presets.filter(isCurrentPhysicsPreset),'physics');
  const draftNames = {};
  let aimDraft = createAimDraft(selected.aim?.values, defaults.aim.values);
  const difficulty = root.querySelector('#debug-difficulty');
  AIM_DIFFICULTIES.forEach(d=>difficulty.add(new Option(d.label,d.id)));
  difficulty.addEventListener('change',()=>{
    draftNames.aim=name.value;
    const previous=aimDraft.activeDifficulty;aimDraft.activeDifficulty=difficulty.value;
    if(apply({aim:activeAimValues(aimDraft)})){markUnsaved();render();}
    else {aimDraft.activeDifficulty=previous;difficulty.value=previous;}
  });
  lighting.apply(selected.lighting?.values || {});
  sceneDebug.apply(selected.scene?.values || {floorMaterial:lighting.getValues().floorMaterial});
  soundSettings?.apply(selected.sound?.values || soundSettings.defaults);
  const physicsUpdates = createTuningUpdateQueue({ apply(patch) {
    const ok = apply({ physics: patch });
    if (ok) {
      dirty.add('physics');
      if (kind === 'physics') status.textContent = Object.hasOwn(patch, 'redRackGapMaxMm')
        ? `未保存 · 间距上限 ${core.getPhysicsValues().redRackGapMaxMm} mm，重新摆球后生效。`
        : '未保存 · 修改已生效，刷新后恢复已保存参数。';
    }
    else status.textContent = '请等待本杆结束后调节。';
    if (kind === 'physics') {
      for (const parameter of parameters()) {
        if (Object.hasOwn(patch, parameter.id)) api.ParameterPanel.syncParameterControl(controls, parameter, values()[parameter.id]);
      }
    }
    return ok;
  } });
  const values = () => kind === 'sound' ? soundSettings.getValues() : kind === 'scene' ? sceneDebug.getValues() : kind === 'lighting' ? lighting.getValues() : kind === 'aim' ? core.getConfig().aim.values : {
    ...withoutRetiredPhysicsValues(core.getPhysicsValues()),
    ...physicsUpdates.values(),
  };
  const sceneParameters = orderModelParameters(sceneDebug.parameters);
  function withAvailability(parameters, unavailable) {
    return parameters.map(parameter => {
      const reason = unavailable(parameter.id);
      if (parameter.id === 'isolate') {
        return {...parameter, options:parameter.options.filter(option=>!unavailable('show_'+option.value))};
      }
      return reason ? {...parameter, disabled:true, description:reason} : parameter;
    });
  }
  const parameters = () => kind === 'scene' ? withAvailability(sceneParameters, liteSceneParameterUnavailable) :
    kind === 'lighting' ? withAvailability(lighting.parameters.filter(p=>p.id!=='floorMaterial')
      .sort((a, b) => Number(b.group === '击球视角') - Number(a.group === '击球视角')), liteLightingParameterUnavailable) :
    kind === 'aim' ? api.Tuning.AIM_V2_PARAMETERS :
      api.Tuning.V3_TUNING_PARAMETERS.filter(p => !p.testFieldPocketTuning ||
        core.getState().tableColliderSet?.pockets.some(pocket => pocket.adjustableCapture));
  function apply(patch) {
    if (patch.sound) return soundSettings.apply(patch.sound);
    if (patch.scene) return sceneDebug.apply(patch.scene);
    if (patch.lighting) {const ok=lighting.apply(patch.lighting);sceneDebug.update(true);return ok;}
    if (patch.physics) patch = { ...patch, physics: withoutRetiredPhysicsValues(patch.physics) };
    if (!core.updateTuning(patch)) return false;
    if(patch.aim) aimDraft.difficultyProfiles[aimDraft.activeDifficulty] = {...core.getConfig().aim.values};
    onTuningChange();
    return true;
  }
  const dirty = new Set();
  function markUnsaved() {
    dirty.add(kind);
    status.textContent = '未保存 · 修改已即时生效，刷新后恢复已保存参数。';
  }
  function renderPresets() {
    presets = readPresetLibrary();
    const fallback = kind === 'sound' ? '默认声音方案' : kind === 'scene' ? '默认模型方案' : kind === 'aim' ? '默认瞄准方案' : kind === 'physics' ? '默认物理方案' : '默认光影方案';
    select.replaceChildren(new Option(fallback, ''));
    presets.filter(p => p.kind === kind && (kind!=='physics'||isCurrentPhysicsPreset(p))).slice().reverse().forEach(p => select.add(new Option(p.name, p.id)));
    select.value = selected[kind]?.id || '';
    name.value = draftNames[kind] ?? selected[kind]?.name ?? fallback;
    const currentName = selected[kind]?.name || fallback;
    loadedNote.textContent = `当前载入：${currentName}`;
    if (kind === 'scene') modelPresets.firstElementChild.textContent = `模型方案 · ${currentName}`;

  }
  function render() {
    root.querySelector('#debug-trajectory-controls')?.remove();
    const isCases = kind === 'cases';
    const isQuality = kind === 'quality';
    const isAi = kind === 'ai';
    const isScene = kind === 'scene';
    ballTexturePanel.hidden = !isScene;
    if (isScene) {
      fields.append(modelPresets);
      modelPresets.append(loadedNote, saveNote, presetsPanel);
    } else if (modelPresets.isConnected) {
      fields.before(loadedNote, saveNote);
      fields.prepend(presetsPanel);
      modelPresets.remove();
    }
    status.hidden = isAi;
    presetsPanel.hidden = loadedNote.hidden = saveNote.hidden = isCases || isQuality || isAi;
    if (isAi) {
      root.querySelector('#debug-difficulty-row').hidden = true;
      aiPanel.mount(root.querySelector('.debug-parameters'));
      return;
    }
    if (isQuality) {
      root.querySelector('#debug-difficulty-row').hidden = true;
      quality.mount(root.querySelector('.debug-parameters'));
      return;
    }
    if (kind === 'sound') { renderSoundPanel(); renderPresets(); return; }
    if (isCases) {
      root.querySelector('#debug-difficulty-row').hidden = true;
      const container = root.querySelector('.debug-parameters');
      container.innerHTML = '<label>球型用例 <select id="debug-scenario"></select></label><p id="debug-scenario-description" class="debug-note"></p><button type="button" id="debug-scenario-reload">重置当前用例</button>';
      const picker = container.querySelector('#debug-scenario');
      api.TestFieldScenarios.scenarios.forEach(s => picker.add(new Option(s.name, s.id)));
      picker.value = core.getScenarioId();
      let lab = null;
      const describe = () => {
        const scenario = api.TestFieldScenarios.scenarios.find(s => s.id === picker.value);
        const randomRack=scenario?.id===api.TestFieldScenarios.FULL_FRAME_ID||scenario?.randomOpeningRack;
        container.querySelector('#debug-scenario-description').textContent = (scenario?.description || '')
          +(randomRack?` 当前设置范围：0～${core.getPhysicsValues().redRackGapMaxMm} mm。`:'');
        lab?.remove(); lab = null;
        if (picker.value === api.CushionResponseLab.SCENARIO_ID) {
          lab = document.createElement('div'); container.append(lab);
          mountCushionResponseLab(lab, { api, core });
        }
      };
      const load = () => { if (core.loadScenario(picker.value)) { onTuningChange(); status.textContent = '已载入用例，可摆球和击球。'; } else { picker.value = core.getScenarioId(); status.textContent = '请等待本杆结束后切换用例。'; } describe(); };
      picker.addEventListener('change', load);
      container.querySelector('#debug-scenario-reload').addEventListener('click', load);
      describe();
      return;
    }

    root.querySelector('#debug-difficulty-row').hidden=kind!=='aim';
    difficulty.value=aimDraft.activeDifficulty;
    root.querySelector('#debug-reset').textContent=kind==='aim'?'恢复当前难度默认':'恢复本栏默认';
    controls = api.ParameterPanel.renderParameterControls({
      container: parameterContainer, parameters: parameters(), values: values(),
      async onValueChange(parameter, value, metadata = {}) {
        if(parameter.disabled)return;
        if(typeof parameter.onSelect==='function'){
          if (venueSwitching) return;
          venueSwitching = true;
          controls.get(parameter.id).select.disabled = true;
          venueStatus.textContent = '正在加载场馆，当前球位和参数保持不变…';
          try {
            await parameter.onSelect(value);
            venueStatus.textContent = '场馆已切换，球位、视角和调试参数已保留。';
          } catch (error) {
            venueStatus.textContent = '场馆切换失败，保留原场馆：' + error.message;
          } finally {
            venueSwitching = false;
            if (kind === 'scene') {
              controls.get(parameter.id).select.disabled = false;
              api.ParameterPanel.syncParameterControl(controls, parameter, sceneDebug.getValues()[parameter.id]);
            }
          }
          return;
        }
        if (parameter.type !== 'checkbox' && parameter.type !== 'select' && parameter.type !== 'color') {
          if (String(value).trim() === '' || !Number.isFinite(Number(value))) {
            api.ParameterPanel.syncParameterControl(controls, parameter, values()[parameter.id]); return;
          }
          value = Number(value);
        }
        if (kind === 'physics') {
          // Range and number stay responsive without rebuilding physics per pixel.
          if (physicsUpdates.update({ [parameter.id]: value }, metadata.continuous)) {
            markUnsaved();
            if(parameter.id==='redRackGapMaxMm')status.textContent='间距上限已设置 · 点击“按当前上限重新摆球”后生效。';
            else if (metadata.continuous) status.textContent = '拖动中 · 松手或短暂停顿后更新球路。';
          }
        } else if (apply({ [kind]: { [parameter.id]: value } })) markUnsaved();
        else status.textContent = '请等待本杆结束后调节。';
        api.ParameterPanel.syncParameterControl(controls, parameter, values()[parameter.id]);
        if (parameter.id === 'carpetDetailMaterial') syncCarpetControls();
      },
    });
    if (kind === 'physics' && cueTrajectory) {
      const row = document.createElement('div');
      row.id = 'debug-trajectory-controls';
      row.innerHTML = '<label><input type="checkbox" id="debug-cue-trajectory"> 显示母球实际轨迹</label><button type="button" id="debug-clear-trajectory">清除轨迹</button><p class="debug-note">记录本杆实际走球路线，停球后保留；下一杆、重置或切换回放杆次时清除。仅测试场显示。</p>';
      const checkbox=row.querySelector('input');checkbox.checked=cueTrajectory.isVisible();
      checkbox.addEventListener('change',()=>cueTrajectory.setVisible(checkbox.checked));
      row.querySelector('button').addEventListener('click',()=>cueTrajectory.clear());
      content.insertBefore(row,fields);
    }
    parameters().forEach(parameter => {
      const entry = controls.get(parameter.id);
      for (const [key, element] of Object.entries(entry || {})) {
        if (element?.setAttribute) {
          element.setAttribute('aria-label', (parameter.nameZh || parameter.label) + (key === 'range' ? '滑块' : ''));
          element.dataset.parameter = parameter.id;
          if (parameter.id === 'roomEnvironment' && venueSwitching) element.disabled = true;
          if(parameter.disabled){
            element.disabled=true;
            const row=element.closest('.param-row');
            if(row){row.classList.add('is-unavailable');row.title=parameter.description;row.setAttribute('aria-disabled','true');}
          }
        }
      }
    });
    if (isScene) arrangeModelGroups();
    if (kind === 'physics') {
      const row=controls.get('redRackGapMaxMm')?.number?.closest('.param-row');
      if(row){
        const button=document.createElement('button');button.type='button';button.id='debug-rack-reroll';
        button.textContent='按当前上限重新摆球';button.style.gridColumn='1 / -1';
        const id=core.getScenarioId();
        button.disabled=id!==api.TestFieldScenarios.FULL_FRAME_ID&&!api.TestFieldScenarios.scenarios.find(s=>s.id===id)?.randomOpeningRack;
        button.title=button.disabled?'仅对完整开局和随机间距球堆用例生效':'重新生成红球位置，碰撞物理不变';
        button.addEventListener('click',()=>{
          if(!physicsUpdates.flush()||!core.loadScenario(core.getScenarioId())){status.textContent='请等待本杆结束后重新摆球。';return;}
          onTuningChange();status.textContent=`已重新摆球 · 相邻红球间距 0～${core.getPhysicsValues().redRackGapMaxMm} mm。`;
        });
        row.append(button);
      }
    }
    renderPresets();
  }
  function renderSoundPanel() {
    root.querySelector('#debug-difficulty-row').hidden = true;
    root.querySelector('#debug-reset').textContent = '恢复本栏默认';
    const container = root.querySelector('.debug-parameters');
    container.innerHTML = `<div class="sound-pack-controls">
      <label>完整音效包<select id="debug-sound-pack" aria-label="完整音效包"></select></label>
      <div id="debug-sound-volumes"></div>
      <p class="sound-pack-note">每个包都包含出杆、球球碰撞、碰库、入袋、观众反应和环境声。切换即时生效；保存方案同时保存音效包与四类音量，刷新后恢复最近保存的方案。</p>
      <p class="sound-pack-note">新版包使用大厅混响素材；练球房包使用降噪、升调、自然收尾素材。逐条试听按素材100%增益播放；实际击球按力度调整音量。两者都受击球音量设置控制，语音播报音量独立控制。</p>
      <button type="button" id="debug-sound-stop">停止试听</button>
      <div id="debug-sound-clips" class="sound-clip-list"></div>
    </div>`;
    const picker = container.querySelector('#debug-sound-pack');
    soundSettings.packs.forEach(pack => picker.add(new Option(pack.label, pack.id)));
    picker.value = soundSettings.getPack();
    mountSoundVolumes(container.querySelector('#debug-sound-volumes'),soundVolumes,markUnsaved);
    const renderClips = () => {
      const list = container.querySelector('#debug-sound-clips');
      list.replaceChildren();
      let group=null;
      const labels={cue:'出杆',ball:'球球碰撞',cushion:'碰库',pocket:'入袋',crowd:'观众反应与环境声'};
      for (const clip of soundSettings.list()) {
        if(clip.group!==group){group=clip.group;const heading=document.createElement('h3');heading.textContent=labels[group]||group;list.append(heading);}
        const row = document.createElement('div'); row.className = 'sound-clip-row';
        const text = document.createElement('span');
        text.textContent = clip.label + (clip.duration ? ` · ${clip.duration.toFixed(2)} 秒` : '');
        const button = document.createElement('button'); button.type = 'button'; button.textContent = '试听';
        button.setAttribute('aria-label', '试听 ' + clip.label); button.dataset.soundClip = clip.id;
        button.addEventListener('click', () => {
          const played = soundSettings.preview(clip.id);
          status.textContent = played?.played === false ? '未能播放，请检查是否开启了声音。' : '正在试听：' + clip.label;
        });
        row.append(text, button); list.append(row);
      }
    };
    picker.addEventListener('change', () => {soundSettings.setPack(picker.value);renderClips();markUnsaved();});
    container.querySelector('#debug-sound-stop').addEventListener('click', () => {soundSettings.stopPreview();status.textContent = '试听已停止。';});
    renderClips();
  }
  function show(next) {
    physicsUpdates.flush();
    if (kind === 'sound' && next !== 'sound') soundSettings?.stopPreview();
    if (kind) draftNames[kind] = name.value;
    kind = next;
    content.hidden = !kind;
    root.querySelectorAll('[data-debug-tab]').forEach(button => {
      const active = kind === button.dataset.debugTab;
      button.setAttribute('aria-expanded', String(active));
      button.classList.toggle('is-active', active);
    });
    if (kind) {
      root.querySelector('h2').textContent = kind === 'quality' ? '画质' : kind === 'sound' ? '声音' : kind === 'cases' ? '用例' : kind === 'scene' ? '场景与模型' : kind === 'lighting' ? '光影' : kind === 'aim' ? '瞄准' : '物理';
      root.querySelector('#debug-version').textContent = kind === 'quality' ? '分辨率 · 抗锯齿 · 纹理采样' : kind === 'sound' ? '完整音效包 · 音量 · 逐条试听' : kind === 'cases' ? '球型切换 · 默认完整球局' : kind === 'scene' ? '场馆 · 球桌 · 球体 · 球杆' : kind === 'lighting' ? '光影' : kind === 'aim' ? '四档独立参数 · 保存方案将保存全部档位' : 'V3 物理参数';
      if(kind==='ai'){root.querySelector('h2').textContent='AI 玩家';root.querySelector('#debug-version').textContent='能力 · 杆法搜索 · 自动击球';}
      render();
      wasBusy = null;
      updateAvailability();
    }
  }
  root.querySelectorAll('[data-debug-tab]').forEach(button => button.addEventListener('click', () => show(kind === button.dataset.debugTab ? null : button.dataset.debugTab)));
  root.querySelector('#debug-close').addEventListener('click', () => {
    const tab = kind; show(null); root.querySelector(`[data-debug-tab="${tab}"]`).focus();
  });
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape') { const tab = kind; show(null); root.querySelector(`[data-debug-tab="${tab}"]`)?.focus(); }
    event.stopPropagation();
  });
  for (const type of ['pointerdown', 'pointermove', 'pointerup', 'wheel', 'touchstart', 'touchmove', 'touchend']) {
    root.addEventListener(type, event => event.stopPropagation(), { passive: true });
  }
  root.querySelector('#debug-reset').addEventListener('click', () => {
    physicsUpdates.flush();
    const value = kind === 'sound' ? soundSettings.defaults : kind === 'scene' ? sceneDebug.defaults : kind === 'lighting' ? lighting.defaults : kind === 'aim' ? createAimDraft({}, defaults.aim.values).difficultyProfiles[aimDraft.activeDifficulty] : defaults.physics.overrides;
    if (apply({ [kind]: kind === 'physics' ? testFieldPhysicsValues(value) : value })) { markUnsaved(); render(); }
  });
  root.querySelector('#debug-save').addEventListener('click', async () => {
    if (!physicsUpdates.flush()) return;
    const label = name.value.trim();
    if (!label) { status.textContent = '请输入方案名称。'; name.focus(); return; }
    const savedKind=kind,saveButton=root.querySelector('#debug-save');saveButton.disabled=true;
    try {
      const editing = selected[kind]?.name === label;
      const preset = await savePreset({ kind, name: label, values: kind==='aim' ? structuredClone(aimDraft) : values(), sourceId: selected[kind]?.id });
      selected[savedKind] = preset; draftNames[savedKind] = preset.name; dirty.delete(savedKind);
      renderPresets();
      status.textContent = editing ? '当前方案已写入项目配置' : '新方案已写入项目配置';
    } catch (error) { status.textContent = '保存失败 · '+error.message; } finally {saveButton.disabled=false;}
  });
  select.addEventListener('change', () => {
    physicsUpdates.flush();
    const preset = presets.find(p => p.id === select.value && p.kind === kind && (kind!=='physics'||isCurrentPhysicsPreset(p)));
    const loaded = preset || { values: kind === 'sound' ? soundSettings.defaults : kind === 'scene' ? sceneDebug.defaults : kind === 'lighting' ? lighting.defaults : kind === 'aim' ? defaults.aim.values : defaults.physics.overrides };
    const nextAim=kind==='aim'?createAimDraft(loaded.values,defaults.aim.values):null;
    const nextValues = kind === 'lighting' ? {
      shotCameraSetback: lighting.defaults.shotCameraSetback,
      shotCameraFov: lighting.defaults.shotCameraFov,
      ...loaded.values,
    } : loaded.values;
    if (apply({ [kind]: nextAim?activeAimValues(nextAim):kind === 'physics' ? testFieldPhysicsValues(nextValues) : nextValues })) {
      if(nextAim)aimDraft=nextAim;
      selected[kind] = preset || null; delete draftNames[kind];
      markUnsaved(); render();
    }
  });
  let wasBusy = null;
  function updateAvailability() {
    const busy = !['lighting','scene','sound','quality','ai'].includes(kind) && core.isBusy();
    if (busy === wasBusy) return;
    wasBusy = busy; fields.disabled = busy;
    status.textContent = busy ? '击球进行中，结束后可调节。' : dirty.has(kind) ? '未保存 · 修改已即时生效，刷新后恢复已保存参数。' : kind === 'quality' ? '仅测试场生效，自动保存在当前浏览器。' : kind === 'sound' ? '切换和音量调整即时生效；点击保存方案写入项目配置。' : kind === 'cases' ? '切换将重置球局；刷新后默认完整球局。' : kind === 'scene' ? (models ? '球桌版本决定测试场使用的碰撞边界。' : '仅改变测试场显示，不改变碰撞和正式试玩场。') : kind === 'lighting' ? '光影修改即时生效，不影响物理计算。' : '修改即时生效，物理参数用于下一杆。';
  }
  let renderedStats = null;
  function updateModelStats() {
    if (kind !== 'scene' || !modelChecks.open || !modelStats.open) return;
    const stats = sceneDebug.stats();
    if (stats === renderedStats) return;
    renderedStats = stats;
    statsBox.textContent = [
      `显示部件（含视野外）：${stats.triangles.toLocaleString()} 三角面 / ${stats.meshes} 网格`,
      `上一帧全场绘制：${stats.drawCalls} 次`,
      `关联贴图（含暂时关闭）：${stats.textures.length} 张`,
      ...stats.textures.map(texture => `${texture.width}×${texture.height}  ${texture.name}`),
      '房间环境：' + stats.roomStatus,
    ].join('\n');
  }
  modelChecks.addEventListener('toggle', updateModelStats);
  modelStats.addEventListener('toggle', updateModelStats);
  return { difficulty:()=>aimDraft.activeDifficulty, update(){updateAvailability();if(kind==='quality')quality.update();updateModelStats();} };
}
