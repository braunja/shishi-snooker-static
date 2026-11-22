import { PRESET_PREFIX, readPresetLibrary } from './debug-preset-store.js';

export function importPresetMigration(seed, storage=localStorage) {
  if(!seed?.id || !Array.isArray(seed.history))throw new Error('Invalid preset migration');
  const marker='snooker.3d-test-field.migration.'+seed.id;
  if(storage.getItem(marker))return false;
  const backupKey=marker+'.backup';
  if(!storage.getItem(backupKey)) {
    const backup={};
    for(let i=0;i<storage.length;i++){const k=storage.key(i);if(k.startsWith('snooker.3d-test-field.'))backup[k]=storage.getItem(k);}
    storage.setItem(backupKey,JSON.stringify(backup));
    if(!storage.getItem(backupKey))throw new Error('Preset backup failed');
  }
  const put=(key,value)=>{
    const raw=JSON.stringify(value),existing=storage.getItem(key);
    if(existing!==null && existing!==raw)throw new Error('Preset migration collision: '+key);
    storage.setItem(key,raw);
    if(storage.getItem(key)!==raw)throw new Error('Preset migration write failed');
  };
  seed.history.forEach((p,i)=>put(PRESET_PREFIX+seed.id+'-history-'+i,p));
  // Keep all old revisions, then explicitly select the source's latest schemes.
  const stampKey=marker+'.timestamp';
  let stamp=Number(storage.getItem(stampKey));
  if(!stamp){stamp=Math.max(Date.now(),...readPresetLibrary(storage).map(p=>(Number(p.savedAt)||0)+1));storage.setItem(stampKey,String(stamp));}
  for(const [kind,p] of Object.entries(seed.latest)) {
    const revisionId=seed.id+'-selected-'+kind;
    put(PRESET_PREFIX+revisionId,{...p,revisionId,savedAt:stamp,migratedFrom:seed.source});
  }
  storage.setItem(marker,seed.capturedAt);
  if(storage.getItem(marker)!==seed.capturedAt)throw new Error('Preset migration confirmation failed');
  return true;
}

export async function ensurePresetMigration() {
  if(location.port!=='8892')return;
  const response=await fetch('./preset-migration-8890.json',{cache:'no-store'});
  if(!response.ok)throw new Error('无法载入迁移的 3D 方案');
  importPresetMigration(await response.json());
}
