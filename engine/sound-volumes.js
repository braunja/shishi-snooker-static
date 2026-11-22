export const SOUND_GROUPS = [
  ['speech','语音播报'],['impact','击球音效'],['crowd','观众反应'],['ambient','环境人群声'],
];
const KEY='snooker.three.test-field.sound-volumes.v1';
export function createSoundVolumes(backend,crowd,storage){
  const values={speech:1,impact:1,crowd:crowd.getVolume(),ambient:crowd.getAmbientVolume()};
  try{const saved=JSON.parse(storage?.getItem(KEY)||'null');for(const [key]of SOUND_GROUPS)if(Number.isFinite(saved?.[key]))values[key]=Math.max(0,Math.min(2,saved[key]));}catch(_){}
  function apply(key){
    if(key==='crowd'){crowd.setVolume(1);backend.setGroupVolume('crowd',values[key]);}
    else if(key==='ambient')crowd.setAmbientVolume(values[key]);
    else backend.setGroupVolume(key,values[key]);
  }
  for(const [key]of SOUND_GROUPS)apply(key);
  try{storage?.setItem(KEY,JSON.stringify(values));}catch(_){}
  return {get:key=>values[key],set(key,value){
    if(!Object.hasOwn(values,key)||!Number.isFinite(value))return;
    values[key]=Math.max(0,Math.min(2,value));apply(key);
    try{storage?.setItem(KEY,JSON.stringify(values));}catch(_){}
  }};
}
export function mountSoundVolumes(container,settings,onChange=()=>{}){
  for(const [key,label]of SOUND_GROUPS){
    const row=document.createElement('label'),title=document.createElement('span'),output=document.createElement('output'),input=document.createElement('input');
    title.textContent=label+' ';input.type='range';input.min='0';input.max='200';input.step='5';input.value=String(Math.round(settings.get(key)*100));
    input.id='debug-volume-'+key;input.setAttribute('aria-label',label);output.htmlFor=input.id;output.value=input.value+'%';
    input.addEventListener('input',()=>{settings.set(key,Number(input.value)/100);output.value=input.value+'%';onChange();});
    row.append(title,output,input);container.append(row);
  }
}
