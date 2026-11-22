export const LITE_ASSETS = '/test-field-assets/lite/';
export const CLASSIC_VENUE_ASSETS = './resources/venues/crucible-v12-042/';
const selectionKey = 'snooker.test-field.models.lite-default';
const modelParameters = ['arena','table','tableLighting'];

export function liteSceneParameterUnavailable(id, selection = window.SnookerTestFieldModels?.selection) {
  if (selection?.venue === 'crucible-2026' &&
      ['background','show_room','show_floor','floorMaterial','carpetCustom','carpetColor','floorRepeat'].includes(id)) {
    return '2026 克鲁斯堡使用已验收的场馆背景和烘焙地面。';
  }
  if (selection?.table === 'v2' && id === 'railWoodStyle') return 'V2 使用已验收的木纹材质。';
  return '';
}

export function liteLightingParameterUnavailable(id, selection = window.SnookerTestFieldModels?.selection) {
  if (selection?.venue === 'crucible-2026' && /^(?:floorMaterial|floorBakedLight|floorSurface[A-Z]\w*)$/.test(id)) {
    return '2026 克鲁斯堡使用烘焙地面。';
  }
  if (selection?.table === 'v2' && selection.effectiveLighting === 'r135' &&
      /^(?:ambient(?:Color|Intensity)|(?:rail|leather|leg|wood)[A-Z]\w*|cushion(?:Reflection|Roughness|BaseLight))$/.test(id)) {
    return 'V2 使用已验收的烘焙光照和局部反射。';
  }
  return '';
}

const tableOptions = [
  {value:'v2', label:'V2 球桌 · Lite'},
  {value:'v1', label:'V1 球桌 · 经典'},
];
const venueOptions = [
  {value:'crucible-2026', label:'2026 克鲁斯堡 · Lite'},
  {value:'crucible', label:'经典克鲁斯堡'},
];

export function readTestFieldModels(location = window.location) {
  if (location.pathname !== '/') return null;
  const query = new URLSearchParams(location.search);
  let saved;
  try { saved = JSON.parse(sessionStorage.getItem(selectionKey)); } catch {}
  return resolveModelSelection({
    table: query.get('table') ?? saved?.table,
    venue: query.get('arena') ?? saved?.venue,
    lighting: query.get('tableLighting') ?? (query.has('table') ? 'auto' : saved?.lighting),
  });
}

export function resolveModelSelection(selection = {}) {
  const table = selection.table === 'v1' ? 'v1' : 'v2';
  const venue = selection.venue === 'crucible' ? 'crucible' : 'crucible-2026';
  const lighting = table === 'v2' && ['r135','default'].includes(selection.lighting) ? selection.lighting : 'auto';
  const effectiveLighting = table === 'v1' ? 'classic-v1' : lighting === 'auto'
    ? (venue === 'crucible-2026' ? 'r135' : 'default') : lighting;
  return {table, venue, lighting, effectiveLighting};
}

export function getTestFieldModelOptions({table,venue}) {
  const matching = venue === 'crucible-2026';
  return {
    table: tableOptions,
    venue: venueOptions,
    lighting: table === 'v1' ? [
      {value:'auto',label:matching ? '经典克鲁斯堡光影（借用）' : '自动 · 经典克鲁斯堡匹配光影'},
    ] : [
      {value:'auto',label:matching ? '自动 · 2026 克鲁斯堡匹配光影' : '自动 · 通用球桌光影（临时）'},
      {value:'default',label:'通用球桌光影（临时）'},
      {value:'r135',label:matching ? '2026 克鲁斯堡 · 已验收光影' : '借用 2026 克鲁斯堡光影'},
    ],
  };
}

export function saveModelSelection(selection) {
  try {
    sessionStorage.setItem(selectionKey, JSON.stringify(selection));
    return true;
  } catch { return false; }
}

export function cleanModelURL(location = window.location) {
  const url = new URL(location.href);
  for (const key of [...modelParameters,'venue']) url.searchParams.delete(key);
  return url;
}

