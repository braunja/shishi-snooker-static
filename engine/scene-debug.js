import * as THREE from 'three';
import { createRoomEnvironments } from './room-environments.js';
import { liteSceneParameterUnavailable } from './test-field-models.js';
const BALL_TEXTURE_VERSIONS = [
  {value: 'current', label: 'V3 微调（当前）'},
  {value: 'v3', label: 'V3 初版'},
  {value: 'v2', label: 'V2'},
  {value: 'v1', label: 'V1 原版'},
];

// Render-only inspection. Layer masks preserve gameplay visibility and physics.
export function createSceneDebug({scene,tableRoot,cue,balls,ballShadows,renderer,camera,lighting,onChange=()=>{},trackMaterialChanges=true,getVenueRoot}) {
 const labels={room:'房间环境',floor:'地面与地毯',legs:'桌腿',panels:'侧板与底座',rails:'库边与木边',cloth:'台呢',leather:'袋口皮革',net:'网袋',rings:'金属圆环',slides:'滑轨与托架',cue:'球杆',balls:'球体',other:'其他桌面标记'};
 const entries=[],materials=new Map(),swaps=new Map(),originalBackground=scene.background;
 function category(o){let p=o,inTable=false,lightmap;while(p){if(p===cue)return 'cue';if(p===balls||p===ballShadows)return 'balls';if(p.name.includes('Reference gold fluted leg'))return 'legs';if(p===tableRoot)inTable=true;lightmap??=p.userData.approvedLightmap;p=p.parent;}
  const m=Array.isArray(o.material)?o.material[0]:o.material,n=m?.userData.sourceMaterial||m?.name||'';
  if(/^floor/.test(n))return 'floor';if(!inTable)return null;
  if(m?.userData.tableBodyRole==='leg'||lightmap==='legs')return 'legs';
  if(m?.userData.tableBodyRole||['body','ribs','sidewood'].includes(lightmap))return 'panels';
  if(lightmap==='leather')return 'leather';
  if(n.includes('Pocket ring'))return 'rings';if(n==='tablePocketRail'||n==='tablePocketStrap')return 'slides';if(/^pocketLeather/.test(n))return 'leather';if(n==='pocketNet')return 'net';if(/Cloth/.test(n))return 'cloth';if(/tableRail(?:Wood|EdgeWood)|underside/.test(n))return 'rails';if(/panel|tableLongApronWood|tableEndApronWood|tableBrandLogo/.test(n))return 'panels';return 'other';
 }
 function collect(root, onlyTable=false) {
  root.traverse(mesh=>{
   if(!mesh.isMesh)return;
   const key=category(mesh);
   if(!key)return;
   let parent=mesh;
   while(parent && parent!==tableRoot)parent=parent.parent;
   if(onlyTable && !parent)return;
   entries.push({mesh,key,mask:mesh.layers.mask,table:!!parent});
  });
 }
 collect(scene);
 function tableChanged() {
  for(let i=entries.length-1;i>=0;i--){
   const {mesh,mask,table}=entries[i];
   if(!table)continue;
   mesh.layers.mask=mask;
   if(swaps.has(mesh)){mesh.material=swaps.get(mesh);swaps.delete(mesh);}
   entries.splice(i,1);
  }
  collect(tableRoot,true);
  cachedStats=null;
  update(true);
 }
 const venueLegs = [];
 let inspectedVenue;
 function bindVenueLegs(root) {
  if (root === inspectedVenue) return false;
  for (const {mesh, mask} of venueLegs) mesh.layers.mask = mask;
  venueLegs.length = 0;
  inspectedVenue = root;
  root?.traverse(mesh => {
   if (!mesh.isMesh) return;
   const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
   const isLeg = materials.some(({userData}) => userData.tableBodyRole === 'leg' || userData.cr26ProbeRegion?.startsWith('leg-'));
   if (isLeg) {
    venueLegs.push({mesh, key: 'legs', mask: mesh.layers.mask});
   }
  });
  return true;
 }
 bindVenueLegs(getVenueRoot?.());
 const ballMaterials = new Map();
 for (const {material} of balls.children) {
  if (material?.uniforms?.lightLut && material.name.startsWith('ballSphere / ')) {
   ballMaterials.set(material.name.slice('ballSphere / '.length), material);
  }
 }
 const currentBallTextures = new Map([...ballMaterials].map(([color, material]) =>
  [color, material.uniforms.lightLut.value]));
 const ballTextureSets = new Map([['current', currentBallTextures]]);
 let ballTextureVersion = 'current';
 let ballTexturesLoading = false;
 const white=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);white.needsUpdate=true;
 const whiteMat=new THREE.MeshBasicMaterial({color:0xdddddd,side:THREE.DoubleSide}),normalMat=new THREE.MeshNormalMaterial({side:THREE.DoubleSide});
 let redWoodMap=entries.map(e=>e.mesh.material?.uniforms?.baseMap?.value).find(t=>t?.image?.src?.includes('/table-wood/red-brown-v4.jpg'))||null,redWoodOwned=false,redWoodLoading=null,disposed=false;
 function loadRedWood(){
  if(redWoodMap||redWoodLoading)return;
  redWoodLoading=new THREE.TextureLoader().loadAsync('./textures/table-wood/red-brown-v4.jpg').then(texture=>{
   if(disposed){texture.dispose();return;}
   texture.colorSpace=THREE.NoColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
   texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());redWoodMap=texture;redWoodOwned=true;dirty=true;update();
  }).catch(error=>{redWoodLoading=null;console.error('球桌木纹加载失败',error);});
 }
 const parameters=[];
 const add=(id,nameZh,group,type,def,extra={})=>parameters.push({id,nameZh,group,type,default:def,...extra});
 const available = key => key === 'room' || (window.SnookerTestFieldModels && !['floor','cue','balls'].includes(key)) || (key === 'legs' && venueLegs.length > 0) || entries.some(e => e.key === key);
 for(const [key,label] of Object.entries(labels))if(available(key))add('show_'+key,label,'部件显示','checkbox',true);
 add('isolate','仅显示部件','部件显示','select','all',{options:[{value:'all',label:'全部'},...Object.entries(labels).filter(([key])=>available(key)).map(([value,label])=>({value,label}))]});
 let nativeVenueId=tableRoot.userData.venueLabel==='2026 克鲁斯堡'?'crucible-2026':'crucible';
 const nativeVenuePicker=tableRoot.userData.nativeVenue&&document.documentElement.dataset.product!=='trial';
 add('roomEnvironment','房间环境','场景与地面','select',tableRoot.userData.nativeVenue?nativeVenueId:'none',{
  options:tableRoot.userData.nativeVenue?(nativeVenuePicker?[{value:'crucible',label:'原克鲁斯堡'},{value:'crucible-2026',label:'2026 克鲁斯堡'}]:[{value:'crucible',label:'新场馆（与练球房一致）'}]):[{value:'none',label:'空场景（仅地面）'},{value:'arena',label:'比赛场'},{value:'room',label:'练习场'},{value:'crucible',label:'克鲁斯堡'}],
  ...(nativeVenuePicker?{description:'只切换场馆，保留当前球位、视角和调试参数。',async onSelect(value){
    if(!['crucible','crucible-2026'].includes(value)||value===nativeVenueId)return;
    await tableRoot.userData.switchVenue(value);nativeVenueId=value;values.roomEnvironment=value;dirty=true;cachedStats=null;update();
  }}:{})
 });
 add('background','背景颜色','场景与地面','color','#07100e');
 const floorParam=lighting.parameters.find(p=>p.id==='floorMaterial');
 if(floorParam)parameters.push({...floorParam,group:'场景与地面',default:lighting.getValues().floorMaterial});
 add('carpetCustom','自定义地毯颜色','场景与地面','checkbox',false);
 add('carpetColor','地毯颜色','场景与地面','color','#783039');
 add('floorRepeat','地面纹理倍率','场景与地面',undefined,1,{min:.25,max:4,step:.05});
 const liteVenue = window.SnookerTestFieldModels?.venueAssets || window.SnookerProductLite?.venueAssets;
 if(window.SnookerTestFieldModels || liteVenue){
  add('carpetDetailMaterial','地毯纹理材质','场景与地面','select',liteVenue?'dense-low-pile':'baked',{
   options:[{value:'baked',label:'原烘焙地毯'},{value:'short-pile',label:'短绒'},{value:'fine-wool',label:'细羊毛'},{value:'dense-low-pile',label:'炭黑密实低绒'}],
  });
  add('carpetDetailRepeat','地毯纹理倍率','场景与地面',undefined,1,{min:.25,max:4,step:.05,
   description:'倍率越大，绒纹越细密。仅影响平铺纹理。'});
 }
 const configuredWood=tableRoot.userData.sceneAppearance?.railWoodStyle;
 add('railWoodStyle','球桌木材样式','木材样式','select',configuredWood,{options:[{value:'walnut',label:'胡桃木'},{value:'redBrown',label:'深红棕木纹'}]});
 add('allTextures','启用全部贴图','材质检查','checkbox',true);
 add('colorMaps','颜色贴图','材质检查','checkbox',true);add('normalMaps','法线与凹凸贴图','材质检查','checkbox',true);add('roughnessMaps','粗糙度贴图','材质检查','checkbox',true);
 add('mode','检查模式','材质检查','select','original',{options:[{value:'original',label:'原材质'},{value:'white',label:'无贴图白模'},{value:'normal',label:'法线方向'}]});
 add('wireframe','线框显示','材质检查','checkbox',false);
 for(const parameter of parameters) {
  const saved=tableRoot.userData.sceneAppearance;
  if(saved&&Object.hasOwn(saved,parameter.id))parameter.default=saved[parameter.id];
 }
 if(tableRoot.userData.nativeVenue)for(const parameter of parameters)if(['show_floor','floorMaterial','carpetCustom','carpetColor','floorRepeat'].includes(parameter.id)){
  parameter.disabled=true;parameter.description='新场馆使用烘焙地毯，此旧控制不适用。';
 }
 if(tableRoot.userData.nativeVenue)parameters.find(p=>p.id==='roomEnvironment').default=nativeVenueId;
 const defaults=Object.fromEntries(parameters.map(p=>[p.id,p.default]));let values={...defaults},lastStats=0,cachedStats=null,dirty=true;
 const rooms=createRoomEnvironments({scene,nativeVenue:tableRoot.userData.nativeVenue,offset:tableRoot.position.clone(),renderer,onLoad(root){root.traverse(mesh=>{if(mesh.isMesh)entries.push({mesh,key:mesh.userData.environmentCategory||'room',mask:mesh.layers.mask});});dirty=true;cachedStats=null;update();}});
 function remember(m){if(materials.has(m))return materials.get(m);const s={wireframe:m.wireframe,maps:{},uniforms:{},compile:m.onBeforeCompile,cacheKey:m.customProgramCacheKey,colorSwitch:{value:1}};
  if(!m.isShaderMaterial){const previousKey=m.customProgramCacheKey();m.onBeforeCompile=function(shader,renderer){s.compile.call(this,shader,renderer);shader.uniforms.sceneDebugColorEnabled=s.colorSwitch;shader.fragmentShader='uniform float sceneDebugColorEnabled;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nif(sceneDebugColorEnabled<.5) diffuseColor.rgb=vec3(1.);').replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\nif(sceneDebugColorEnabled<.5) totalEmissiveRadiance=emissive;');};m.customProgramCacheKey=()=>previousKey+' / scene-inspection';m.needsUpdate=true;}
  for(const k of ['map','emissiveMap','normalMap','bumpMap','roughnessMap'])s.maps[k]=m[k];
  for(const k of ['baseMap','detailMap','lightLut','tint','recolor','mainRepeat','detailRepeat','cleanCarpet','redWoodAtlas','redWoodPanel'])if(m.uniforms?.[k]){const v=m.uniforms[k].value;s.uniforms[k]=v?.clone&&!v.isTexture?v.clone():v;}
  materials.set(m,s);return s;
 }
 let lightingRevision=-1;
 async function setBallTextureVersion(version) {
  if (disposed || ballTexturesLoading || !BALL_TEXTURE_VERSIONS.some(option => option.value === version)) return false;
  if (version === ballTextureVersion) return true;
  let textures = ballTextureSets.get(version);
  if (!textures) {
   const loader = new THREE.TextureLoader();
   ballTexturesLoading = true;
   const colors = [...ballMaterials.keys()];
   const results = await Promise.allSettled(colors.map(color =>
    loader.loadAsync(`./test-field/ball-textures/${version}/${color}-ball.png`)));
   ballTexturesLoading = false;
   if (disposed || results.some(result => result.status === 'rejected')) {
    for (const result of results) if (result.status === 'fulfilled') result.value.dispose();
    return false;
   }
   textures = new Map(colors.map((color, index) => {
    const texture = results[index].value;
    const original = currentBallTextures.get(color);
    texture.colorSpace = original.colorSpace;
    texture.anisotropy = original.anisotropy;
    texture.name = `${version.toUpperCase()} · ${color}`;
    return [color, texture];
   }));
   ballTextureSets.set(version, textures);
  }
  // Model inspection can temporarily hide the LUT; update its saved source.
  for (const [color, material] of ballMaterials) {
   remember(material).uniforms.lightLut = textures.get(color);
  }
  ballTextureVersion = version;
  cachedStats = null;
  update(true);
  return true;
 }
 function update(force=false){
  const currentVenue = window.SnookerTestFieldModels?.selection.venue;
  if (currentVenue && currentVenue !== nativeVenueId) {
    nativeVenueId = values.roomEnvironment = currentVenue;
    if (liteSceneParameterUnavailable('show_'+values.isolate)) values.isolate = 'all';
    dirty = true;
    cachedStats = null;
  }
  if (bindVenueLegs(getVenueRoot?.())) { dirty = true; cachedStats = null; }
  const revision=lighting.getRevision?.()??0;if(lightingRevision!==revision){lightingRevision=revision;dirty=true;}
  if(force)dirty=true;
  if(!dirty&&(!trackMaterialChanges||entries.every(e=>e.lastMaterial===e.mesh.material)))return;
  getVenueRoot?.()?.userData.setCarpetDetail?.(
   values.mode==='original'&&values.allTextures&&values.colorMaps?values.carpetDetailMaterial:'baked',
   values.carpetDetailRepeat);
  scene.background=values.background===defaults.background?originalBackground:new THREE.Color(values.background);
  whiteMat.wireframe=normalMat.wireframe=values.wireframe;
  const showLegs = values.show_legs && (values.isolate === 'all' || values.isolate === 'legs');
  for (const {mesh, mask} of venueLegs) mesh.layers.mask = showLegs ? mask : 0;
  for(const {mesh,key,mask} of entries){mesh.layers.mask=values['show_'+key]&&(values.isolate==='all'||values.isolate===key)?mask:0;
   // Preserve the original practice-room floor and shadow layers.
   if(key==='floor'&&values.roomEnvironment==='crucible'&&/^floorBakedLight$/.test(mesh.material.userData.sourceMaterial||mesh.material.name))mesh.layers.mask=0;
   if(key==='floor'&&values.carpetCustom&&mesh.material.name==='floorBakedLight')mesh.layers.mask=0;
   let original=swaps.get(mesh);
   if(original&&mesh.material!==whiteMat&&mesh.material!==normalMat){swaps.delete(mesh);original=null;}
   const current=original||mesh.material;
   if(values.mode==='original'){if(original){mesh.material=original;swaps.delete(mesh);}}else{if(!original)swaps.set(mesh,current);mesh.material=values.mode==='white'?whiteMat:normalMat;}
   for(const m of(Array.isArray(current)?current:[current])){const s=remember(m);s.colorSwitch.value=values.allTextures&&values.colorMaps?1:0;m.wireframe=values.wireframe||s.wireframe;let dirty=false;
    for(const k of Object.keys(s.maps)){const enabled=values.allTextures&&(k==='normalMap'||k==='bumpMap'?values.normalMaps:k==='roughnessMap'?values.roughnessMaps:values.colorMaps);const next=enabled?s.maps[k]:s.maps[k]&&['map','emissiveMap'].includes(k)?white:null;if(m[k]!==next){m[k]=next;dirty=true;}}
    for(const k of ['baseMap','detailMap','lightLut'])if(m.uniforms?.[k])m.uniforms[k].value=values.allTextures&&values.colorMaps?s.uniforms[k]:white;
    if(m.uniforms?.redWoodAtlas)m.uniforms.redWoodAtlas.value=false;
    if(m.uniforms?.redWoodPanel)m.uniforms.redWoodPanel.value=false;
    const woodSource=m.userData.sourceMaterial||m.name;
    if(/^table(?:Rail(?:Wood|EdgeWood)|LongApronWood|EndApronWood)/.test(woodSource)&&m.uniforms?.baseMap){
     if(m.uniforms.tint&&s.uniforms.tint)m.uniforms.tint.value.copy(s.uniforms.tint);
   if(!liteSceneParameterUnavailable('railWoodStyle')&&values.railWoodStyle==='redBrown'&&redWoodMap&&values.allTextures&&values.colorMaps){
      m.uniforms.baseMap.value=redWoodMap;
      if(m.uniforms.redWoodAtlas)m.uniforms.redWoodAtlas.value=true;
      if(m.uniforms.redWoodPanel)m.uniforms.redWoodPanel.value=/^table(?:LongApronWood|EndApronWood)/.test(woodSource);
      if(m.uniforms.tint)m.uniforms.tint.value.multiply(new THREE.Vector3(1.06,.86,1.12));
     }
    }
    if(key==='floor'&&m.uniforms){const u=m.uniforms;if(u.recolor&&u.tint){u.recolor.value=values.carpetCustom||s.uniforms.recolor;if(values.carpetCustom){const c=new THREE.Color(values.carpetColor).convertLinearToSRGB();u.tint.value.set(c.r,c.g,c.b);}else u.tint.value.copy(s.uniforms.tint);}
     for(const k of ['mainRepeat','detailRepeat'])if(u[k]&&s.uniforms[k])u[k].value.copy(s.uniforms[k]).multiplyScalar(values.floorRepeat);
     if(u.cleanCarpet)u.cleanCarpet.value=!u.newGreyCarpet?.value&&values.roomEnvironment==='crucible'&&m.userData.sourceMaterial==='floorCarpet'&&values.allTextures&&values.colorMaps;

    }
    if(dirty)m.needsUpdate=true;
   }
  }
  for(const e of entries)e.lastMaterial=e.mesh.material;dirty=false;onChange();
 }
 function apply(patch){for(const p of parameters){if(!(p.id in patch)||liteSceneParameterUnavailable(p.id))continue;let v=patch[p.id];if(p.type==='checkbox')v=Boolean(v);else if(p.type==='color'){if(!/^#[0-9a-f]{6}$/i.test(v))continue;}else if(p.type==='select'){if(!p.options.some(o=>o.value===v)||p.id==='isolate'&&liteSceneParameterUnavailable('show_'+v))continue;}else{v=Number(v);if(!Number.isFinite(v))continue;v=THREE.MathUtils.clamp(v,p.min,p.max);}values[p.id]=v;}
  if(!liteSceneParameterUnavailable('railWoodStyle')&&values.railWoodStyle==='redBrown')loadRedWood();
  if(tableRoot.userData.nativeVenue)values.roomEnvironment=nativeVenueId;
  if('roomEnvironment'in patch)rooms.select(tableRoot.userData.nativeVenue?'crucible':values.roomEnvironment);
  if('floorMaterial'in patch&&!liteSceneParameterUnavailable('floorMaterial'))lighting.apply({floorMaterial:values.floorMaterial});
  dirty=true;cachedStats=null;update();return true;
 }
 function stats(){const now=performance.now();if(cachedStats&&now-lastStats<500)return cachedStats;lastStats=now;let triangles=0,meshes=0;const textures=new Map();
  for(const e of entries){let visible=!!e.mesh.layers.mask,p=e.mesh;while(p){visible&&=p.visible;p=p.parent;}if(!visible)continue;meshes++;const g=e.mesh.geometry;triangles+=(g.index?.count??g.attributes.position.count)/3*(e.mesh.isInstancedMesh?e.mesh.count:1);const m=swaps.get(e.mesh)||e.mesh.material;
   for(const mat of(Array.isArray(m)?m:[m])){const s=remember(mat);for(const t of [...Object.values(s.maps),...Object.values(s.uniforms)])if(t?.isTexture&&!t.isCubeTexture){const i=t.image;textures.set(t.uuid,{name:t.name||'未命名贴图',width:i?.width||0,height:i?.height||0});}}
  }
  for (const {mesh} of venueLegs) {
   if (!mesh.layers.mask) continue;
   meshes++;
   triangles += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3;
   for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
    for (const t of [mat.map, mat.normalMap, mat.roughnessMap, mat.lightMap]) {
     if (t) textures.set(t.uuid, {name:t.name||'未命名贴图',width:t.image?.width||0,height:t.image?.height||0});
    }
   }
  }
  cachedStats={roomStatus:tableRoot.userData.nativeVenue?(nativeVenueId==='crucible-2026'?'2026 克鲁斯堡':'原克鲁斯堡'):rooms.status(),triangles,meshes,drawCalls:renderer.info.render.calls,textures:[...textures.values()],groups:Object.fromEntries(Object.keys(labels).map(k=>[k,entries.filter(e=>e.key===k).length+(k==='legs'?venueLegs.length:0)]))};return cachedStats;
 }
 function dispose(){disposed=true;if(redWoodOwned)redWoodMap?.dispose();for(const e of entries)e.mesh.layers.mask=e.mask;for(const [mesh,m]of swaps)mesh.material=m;for(const [m,s]of materials){m.onBeforeCompile=s.compile;m.customProgramCacheKey=s.cacheKey;m.wireframe=s.wireframe;for(const [k,v]of Object.entries(s.maps))m[k]=v;for(const [k,v]of Object.entries(s.uniforms))m.uniforms[k].value=v;m.needsUpdate=true;}rooms.dispose();scene.background=originalBackground;white.dispose();whiteMat.dispose();normalMat.dispose();}
 function disposeBallTextureVersions() {
  for (const [color, material] of ballMaterials) {
   material.uniforms.lightLut.value = currentBallTextures.get(color);
  }
  for (const [version, textures] of ballTextureSets) {
   if (version !== 'current') for (const texture of textures.values()) texture.dispose();
  }
  ballTextureSets.clear();
 }
 return {parameters,defaults,getValues:()=>({...values}),apply,update,stats,tableChanged,
  dispose() { bindVenueLegs(undefined); dispose(); disposeBallTextureVersions(); },
  ballTextureVersions: BALL_TEXTURE_VERSIONS, getBallTextureVersion: () => ballTextureVersion, setBallTextureVersion};
}
