// Each explicit save has its own immutable key. Tabs never rewrite one shared
// preset array, so a stale tab cannot erase another tab's newly saved schemes.
export const LEGACY_KEY = 'snooker.3d-test-field.tuning.v1';
export const PRESET_PREFIX = 'snooker.3d-test-field.preset.v2.';
let projectPresets = null, projectWritable = false;
const kinds = ['aim', 'physics', 'lighting', 'scene', 'sound'];
function parse(raw) { try { return JSON.parse(raw); } catch { return null; } }
function valid(p) {
  return p && typeof p.id === 'string' && typeof p.name === 'string'
    && kinds.includes(p.kind) && p.values && typeof p.values === 'object' && !Array.isArray(p.values);
}
export function readPresetHistory(storage = localStorage) {
  const presets = [];
  let legacy;
  try { legacy = parse(storage.getItem(LEGACY_KEY)); } catch { /* Storage unavailable: use defaults. */ }
  for (const [index, p] of (Array.isArray(legacy?.presets) ? legacy.presets : []).entries()) {
    if (valid(p)) presets.push({ ...p, savedAt: Number(p.savedAt) || 0, order: index });
  }
  // Preserve previously saved current values even if the old UI never named them.
  for (const kind of kinds) {
    const values = legacy?.current?.[kind];
    if (values && typeof values === 'object' && !Array.isArray(values)
      && !presets.some(p => p.kind === kind && JSON.stringify(p.values) === JSON.stringify(values))) {
      presets.push({ id: `legacy-current-${kind}`, kind, name: '此前保存的参数', values, savedAt: 0, order: presets.length });
    }
  }
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key?.startsWith(PRESET_PREFIX)) continue;
      const p = parse(storage.getItem(key));
      if (valid(p)) presets.push(p);
    }
  } catch { /* Existing readable schemes remain available. */ }
  return presets.sort((a, b) => (Number(a.savedAt) || 0) - (Number(b.savedAt) || 0)
    || (Number(a.order) || 0) - (Number(b.order) || 0) || a.id.localeCompare(b.id));
}
export function readPresetLibrary(storage = localStorage) {
  if(arguments.length===0&&projectPresets)return structuredClone(projectPresets);
  const latest = new Map();
  for (const preset of readPresetHistory(storage)) latest.set(`${preset.kind}:${preset.id}`, preset);
  return [...latest.values()].sort((a, b) => (Number(a.savedAt) || 0) - (Number(b.savedAt) || 0));
}
export function latestPreset(presets, kind) { return presets.filter(p => p.kind === kind).at(-1) || null; }
function saveLocalPreset({ kind, name, values, sourceId }, storage = localStorage) {
  const presets = readPresetLibrary(storage);
  const label = name.trim();
  if (!label || !kinds.includes(kind)) throw new Error('Invalid scheme');
  const source = presets.find(p => p.kind === kind && p.id === sourceId);
  const editing = source && source.name === label;
  if (!editing && presets.some(p => p.kind === kind && p.name === label)) {
    throw new Error('该名称已被其他方案使用，请换一个名称，或先载入该方案再编辑。');
  }
  const revisionId = crypto.randomUUID();
  const preset = { id: editing ? source.id : crypto.randomUUID(), revisionId, kind, name: label,
    savedAt: Math.max(Date.now(), ...presets.map(p => (Number(p.savedAt) || 0) + 1)), values: structuredClone(values) };
  // One immutable record per revision; the picker shows only the latest revision
  // of each scheme. Older parameter values remain intact in storage.
  const key = PRESET_PREFIX + revisionId;
  if (storage.getItem(key) !== null) throw new Error('Scheme ID collision');
  const raw = JSON.stringify(preset);
  storage.setItem(key, raw);
  if (storage.getItem(key) !== raw) throw new Error('Scheme write verification failed');
  return preset;
}

async function projectRequest(endpoint,body){
  const response=await fetch(endpoint,{cache:'no-store',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
  if(!response.ok){let error;try{error=(await response.json()).error;}catch{}throw new Error(error||'项目方案服务不可用，请启动或重启 3D 测试场服务');}
  return response.json();
}
export async function initializeProjectPresets(){
  const response=await fetch('/api/presets',{cache:'no-store'});
  if(response.status===404&&location.port!=='8892'){
    const snapshot=await fetch('./project-presets.json',{cache:'no-store'});
    if(!snapshot.ok)throw new Error('无法读取项目方案快照');projectPresets=(await snapshot.json()).presets;return readPresetLibrary();
  }
  if(!response.ok)throw new Error('项目方案服务不可用，请重启 3D 测试场服务');
  projectPresets=(await response.json()).presets;projectWritable=true;
  // Migrate immutable browser records once; originals remain as a recovery backup.
  const history=readPresetHistory();
  if(history.length){const imported=await projectRequest('/api/presets/import',{history});projectPresets=imported.presets;}
  return readPresetLibrary();
}
export function savePreset(input,storage){
  // Explicit storage is retained only for legacy migration tests and import utilities.
  if(storage)return saveLocalPreset(input,storage);
  if(!projectWritable)return Promise.reject(new Error('项目方案服务尚未连接，未保存'));
  const source=projectPresets.find(p=>p.kind===input.kind&&p.id===input.sourceId);
  return projectRequest('/api/presets',{...input,expectedRevisionId:source?.revisionId}).then(result=>{
    projectPresets=result.presets;return result.preset;
  });
}
