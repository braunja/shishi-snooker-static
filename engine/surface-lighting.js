import { reviewTextureUrl } from './texture-review.js';
import { loadAppearanceConfig } from './appearance-config.js';
import { loadPreparedClothReflection, PREPARED_CLOTH_ROUGHNESS } from './cloth-reflection.js';
import * as THREE from 'three';

// Bake a single metric projection into each render triangle after calibration.
// Pocket reshaping invalidates the source atlas density. Choosing the face plane
// once keeps vertical skirts and cushion jaws from stretching, without doing
// three texture reads and blending their results for every screen pixel.
export function prepareClothDetailUV(mesh) {
  const role=mesh.material?.userData.surfaceRole;
  if(role!=='baize' && role!=='cushionSurface')return;
  for (let part = mesh; part; part = part.parent) {
    if (part.userData.approvedLightmap) throw new Error('台呢网格不能绑定场馆光照贴图 ' + mesh.name);
  }
  const geometry=mesh.geometry,position=geometry.attributes.position,index=geometry.index;
  // The calibrated cloth meshes are triangle streams; do not touch collision
  // geometry or change vertex/index counts just to attach texture coordinates.
  if(geometry.hasAttribute('clothDetailUv'))return;
  if(index)throw new Error('Cloth detail UV requires calibrated triangle geometry');
  const uv=new Float32Array(position.count*2),a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
  const normal=new THREE.Vector3(),edge=new THREE.Vector3();
  // Keep the normalized UI footprint fixed. The final 1024px asset contains
  // threefold finer grain than the first real-baize candidate, baked offline.
  // Do not reapply the retired central-410px crop compensation here.
  const density=1.4,points=[a,b,c];
  for(let i=0;i<position.count;i+=3){
    for(let j=0;j<3;j++)points[j].fromBufferAttribute(position,i+j).applyMatrix4(mesh.matrixWorld);
    normal.subVectors(b,a).cross(edge.subVectors(c,a));
    const x=Math.abs(normal.x),y=Math.abs(normal.y),z=Math.abs(normal.z);
    for(let j=0;j<3;j++){
      const p=points[j],u=x>y&&x>z?p.y:p.x,v=z>y&&z>=x?p.y:p.z;
      uv[(i+j)*2]=(role==='baize'?(u*.265244+.500180)*20:u*6.72)*density;
      uv[(i+j)*2+1]=(role==='baize'?(-v*.518163+.499699)*15:v*6.72)*density;
    }
  }
  geometry.setAttribute('clothDetailUv',new THREE.BufferAttribute(uv,2));
}

// Samples and final output intentionally use the original gamma-space math.
export async function loadSurfaceLighting({ renderer, originalSceneMatrix, tableOffset, initialFloor, initialWood, legacyFloor=true, burgundyRail=false, onChange=()=>{} }) {
  if (initialFloor === undefined || initialWood === undefined) {
    const { scene } = await loadAppearanceConfig();
    initialFloor ??= scene.floorMaterial;
    initialWood ??= scene.railWoodStyle;
  }
  const response = await fetch('./resources/materials/surfaces.json');
  if (!response.ok) throw new Error('Missing surface-lighting material library');
  const { materials: records } = await response.json();
  const loader = new THREE.TextureLoader(), cubes = new THREE.CubeTextureLoader();
  const cache = new Map(), owned = new Set(), groups = { rail: [], baize: [], cushionSurface: [], floorSurface: [] };
  const railViewReflection = { value: 1 };
  const floorMeshes = [], floorOverlays = [];
  const tableFinishes={leather:new Set(),leg:new Set()};
  const filteredCloth = new Map(), cueProbes = new Map();
  let preparedCloth = null;
  function preparedClothProbe() {
    if(!preparedCloth)preparedCloth=loadPreparedClothReflection().then(probe=>{
      owned.add(probe.texture);
      for(const face of probe.texture.images)owned.add(face);
      return probe;
    });
    return preparedCloth;
  }
  async function clothProbe(cube) {
    if (!filteredCloth.has(cube)) {
      const linearSource = cube.clone();
      linearSource.colorSpace = THREE.SRGBColorSpace;
      linearSource.needsUpdate = true;
      const generator = new THREE.PMREMGenerator(renderer);
      try {
        const target = generator.fromCubemap(linearSource);
        owned.add(target);
        filteredCloth.set(cube, target);
      } finally { generator.dispose(); linearSource.dispose(); }
    }
    return filteredCloth.get(cube);
  }
  const white = new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);white.needsUpdate=true;owned.add(white);
  const getTexture = async record => {
    if (!record) return white;
    const key = record.faces ? 'crucible-continuous-soft-20260914' : record.file;
    if (!cache.has(key)) cache.set(key, (async () => {
      const t = record.faces ? await cubes.loadAsync(['px','nx','py','ny','pz','nz'].map(f=>'./textures/crucible-continuous-soft/cube-'+f+'.png')) : await loader.loadAsync(reviewTextureUrl('./resources/'+record.file));
      t.colorSpace = THREE.NoColorSpace;
      if (!record.faces) t.wrapS=t.wrapT=THREE.RepeatWrapping;
      if(record.file==='textures/surface/cloth-weave-detail.png'){
        // Oblique table views compress the weave heavily along one axis.
        // Filter that footprint instead of letting repeated fibres alias into
        // broad bands. Keep mipmaps for the distant cloth and its mean color.
        t.generateMipmaps=true;
        t.minFilter=THREE.LinearMipmapLinearFilter;
        t.magFilter=THREE.LinearFilter;
        t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
      }
      owned.add(t);return t;
    })());
    return cache.get(key);
  };
  const vertexShader = `varying vec2 surfaceUv; varying vec3 worldPoint,worldNormal;
    #ifdef USE_PREPARED_CLOTH_REFLECTION
      uniform mat3 originalNormalMatrix;
      uniform mat4 originalSceneMatrix;
      varying vec3 clothOriginalNormal,clothOriginalView;
    #endif
    #ifdef USE_CLOTH_FILTER
      attribute vec2 clothDetailUv;
      varying vec2 clothUv;
    #endif
    void main(){surfaceUv=uv;vec4 p=modelMatrix*vec4(position,1.);
      worldPoint=p.xyz;worldNormal=normalize(mat3(modelMatrix)*normal);
      #ifdef USE_CLOTH_FILTER
        clothUv=clothDetailUv;
      #endif
      #ifdef USE_PREPARED_CLOTH_REFLECTION
        // Linear transforms commute with perspective-correct interpolation.
        // Normalize in the fragment stage, as in the original material.
        clothOriginalNormal=originalNormalMatrix*(worldNormal*vec3(-1.,1.,1.));
        clothOriginalView=mat3(originalSceneMatrix)*((worldPoint-cameraPosition)*vec3(-1.,1.,1.));
      #endif
      gl_Position=projectionMatrix*viewMatrix*p;}`;
  const fragmentShader = `
    #ifdef USE_PREPARED_CLOTH_REFLECTION
      uniform samplerCube clothPreparedMap;
      varying vec3 clothOriginalNormal,clothOriginalView;
    #endif
    #ifdef USE_CLOTH_FILTER
      varying vec2 clothUv;
      uniform sampler2D clothFilteredMap;
      uniform float clothRoughness;
      #ifndef USE_PREPARED_CLOTH_REFLECTION
      #include <cube_uv_reflection_fragment>
      vec3 clothDisplayColor(vec3 c) {
        return mix(12.92*c,1.055*pow(max(c,vec3(0.)),vec3(1./2.4))-.055,step(vec3(.0031308),c));
      }
      #endif
    #endif
    uniform sampler2D baseMap,detailMap; uniform samplerCube reflectionMap;
    uniform vec2 mainRepeat,mainOffset,detailRepeat,detailOffset; uniform vec2 roofDimensions; uniform bool railRoof;
    uniform mat4 originalSceneMatrix; uniform mat3 originalNormalMatrix;
    uniform vec3 tableOffset,boxMin,boxMax,cubePosition,reflectionColor,fresnelColor,tint;
    uniform float amount,mainAmount,diffuseAmount,detailLighten,detailPow,detailPow2,fresnelAmount,fresnelFocus,fresnelReflection,fresnelIntensity;
    uniform float baseGain,reflectionGain,edgeGain,focusGain,detailGain,detailScale,viewResponse,viewReflectionGain;
    uniform vec3 authoredLightResponse;
    uniform bool baizeWeave,redWoodAtlas,redWoodPanel;
    uniform vec3 carpetMean; uniform float carpetContrast,carpetTiling;
    uniform int kind; uniform bool floorAtlas,worldDetail,recolor,cleanCarpet,newGreyCarpet;
    varying vec2 surfaceUv;varying vec3 worldPoint,worldNormal;
    void main(){
      vec2 uv=surfaceUv*mainRepeat+mainOffset;
      // Keep the user's clean tabletop color atlas aligned with the calibrated
      // bed. Fiber density is supplied separately by the prepared mesh UVs.
      vec2 baizeUv=worldPoint.xz*vec2(.265244,-.518163)+vec2(.500180,.499699);
      if(baizeWeave)uv=baizeUv*mainRepeat+mainOffset;
      if(floorAtlas)uv=vec2(.211356,.261227)+surfaceUv*vec2(.576917,.138882);
      // Sample only the original carpet's clean central weave, mirrored for seamless repetition.
      // Its outer area contains baked silhouettes of the source arena.
      if(cleanCarpet&&!newGreyCarpet){
        vec2 weave=abs(fract(worldPoint.xz*3.0*mainRepeat)*2.0-1.0);
        uv=vec2(.32)+weave*.36;
      }
      if(newGreyCarpet)uv=worldPoint.xz*carpetTiling*mainRepeat;
      vec3 base=texture2D(baseMap,uv).rgb;
      if(newGreyCarpet){
        // The authored fine-pile swatch supplies the texture; retain soft contrast.
        base=mix(carpetMean,base,carpetContrast);
      }
      if(redWoodAtlas){
        // Image rows increase downward; OBJ UV V increases upward. The same atlas
        // covers the cap, rolled edge and side. Match walnut's measured row profile.
        float row=clamp(1.0-uv.y,0.0,1.0);
        // A single monotonic cap-to-side transition, with no painted highlight
        // at the rolled edge or at the bottom of the shared wood atlas.
        float shade=mix(1.0,.29,smoothstep(.56,.81,row));
        // Apron/panel atlas has a different layout: upper occlusion under the
        // rail, visible wood below. Also used by the wooden inserts in gold legs.
        if(redWoodPanel)shade=mix(.015,.85,smoothstep(.34,.60,row))
          *(1.-.30*smoothstep(.90,1.,row));
        // Low-contrast stained timber beneath a continuous clear lacquer layer.
        base=(vec3(0.235851,0.096979,0.071446)+(base-vec3(0.236486,0.093386,0.064838))*.95)*shade;
      }
      if(cleanCarpet&&!newGreyCarpet){
        // Remove low-frequency lighting inside the sample so repeated patches do not form a grid.
        vec3 smoothBase=(texture2D(baseMap,uv+vec2(.045,0.)).rgb+texture2D(baseMap,uv-vec2(.045,0.)).rgb
          +texture2D(baseMap,uv+vec2(0.,.045)).rgb+texture2D(baseMap,uv-vec2(0.,.045)).rgb)*.25;
        base=texture2D(baseMap,vec2(.5)).rgb*.82+clamp((base-smoothBase)*2.0,vec3(-.035),vec3(.035));
      }
      if(recolor)base=vec3(max(base.r,max(base.g,base.b)))*tint;else base*=tint;
      if(kind==0){
        if(cleanCarpet||newGreyCarpet){
          float grazing=1.0-abs(dot(normalize(worldNormal),normalize(cameraPosition-worldPoint)));
          float stageLight=.82+.18*exp(-dot(worldPoint.xz,worldPoint.xz)/65.0);
          base*=stageLight*(.96+.22*pow(grazing,2.0));
        }
        gl_FragColor=vec4(base*baseGain,1.);return;
      }
      vec3 flip=vec3(-1.,1.,1.);
      vec3 p=worldPoint;
      #ifdef USE_PREPARED_CLOTH_REFLECTION
      vec3 n=normalize(clothOriginalNormal);
      vec3 v=normalize(clothOriginalView);
      #else
      vec3 n=normalize(originalNormalMatrix*(worldNormal*flip));
      vec3 v=normalize(mat3(originalSceneMatrix)*((worldPoint-cameraPosition)*flip));
      #endif
      vec3 eyeRay=isOrthographic ? -vec3(viewMatrix[0][2],viewMatrix[1][2],viewMatrix[2][2]) : normalize(worldPoint-cameraPosition);
      vec3 r=reflect(eyeRay,normalize(worldNormal));
      // Stable slab intersection, including rays parallel to box faces.
      vec3 safeR=mix(vec3(-1.),vec3(1.),step(vec3(0.),r))*max(abs(r),vec3(.000001));
      vec3 a=(boxMin-p)/safeR,b=(boxMax-p)/safeR;
      vec3 lo=min(a,b),hi=max(a,b);
      float enter=max(max(lo.x,lo.y),lo.z),leave=min(min(hi.x,hi.y),hi.z);
      vec3 direction=r;
      if(leave>=max(enter,0.)) direction=p+r*(enter>0.?enter:leave)-cubePosition;
      // Remap only upper reflection directions; retain the baked blur and radiance.
      if(railRoof && direction.y>0.){
        direction.x*=5./roofDimensions.x;
        float z=abs(direction.z)*1.2/direction.y;
        z=z<=.225?z:.225+(z-.225)*.75/roofDimensions.y;
        direction.z=sign(direction.z)*z*direction.y/1.2;
      }
      vec3 reflected;
      #ifdef USE_PREPARED_CLOTH_REFLECTION
        // The fixed roughness filtering and gamma-space response are authored
        // into this cube. Do not regenerate or color-convert it per pixel.
        reflected=textureCube(clothPreparedMap,direction).rgb;
      #elif defined(USE_CLOTH_FILTER)
        // PMREM's imported cubemap convention flips X. Convert back to the
        // existing material's gamma-space composition only after linear filtering.
        reflected=clothDisplayColor(textureCubeUV(clothFilteredMap,normalize(direction)*vec3(-1.,1.,1.),max(.001,clothRoughness)).rgb);
      #else
        reflected=textureCube(reflectionMap,direction).rgb;
      #endif
      reflected *= viewReflectionGain;
      float fresnel=pow(max(0.,1.-abs(dot(n,v))),max(.001,fresnelFocus*focusGain*64.));
      if(redWoodAtlas){
        // Use the environment reflection alone; the additive rim term produced
        // continuous bright outlines absent from the broadcast reference.
        fresnel=0.;
      }
      #ifdef USE_CLOTH_FILTER
        // Keep the fabric sheen weak and independent of the reflection blur.
        // Edge gain controls sheen strength; roughness only selects PMREM filtering.
        fresnel *= .1;
      #endif
      vec3 color;
      if(kind==1){
        vec2 duv=worldDetail ? worldPoint.xz/.7*detailScale : surfaceUv*detailRepeat*detailScale+detailOffset;
        #ifdef USE_CLOTH_FILTER
          duv=clothUv*detailScale+detailOffset;
        #endif
        // Uniform authored tile: one filtered read, no runtime patch blending
        // or low-frequency/color correction. Cushion base cleanup is baked.
        vec3 detail=texture2D(detailMap,duv).rgb;
        detail=mix(vec3(1.),detail,detailGain);
        vec3 powered=pow(max(detail,vec3(.00001)),vec3(detailPow));
        vec3 c=(detail+detailLighten)*base*powered*detailPow2;
        color=c*(mainAmount+diffuseAmount)*baseGain*authoredLightResponse+
          ((reflected*(fresnelReflection+fresnel)*fresnelIntensity*powered*detailPow2*amount*reflectionGain)+fresnel*fresnelAmount*edgeGain)*detail*base*viewResponse;
        #ifdef USE_DIRECTIONAL_CLOTH
          // The legacy cloth terms above are display-encoded. Apply the relative
          // irradiance of the game ceiling and a weak ambient hemisphere.
          float up = normalize(worldNormal).y * (gl_FrontFacing ? 1.0 : -1.0);
          float sky = 0.5 + 0.5 * up;
          float irradiance = 0.002 + 0.198 * sky * sky + 0.8 * max(up, 0.0);
          color *= pow(irradiance, 1.0 / 2.2);
        #endif
      }else{
        #ifdef BURGUNDY_RAIL
          // Keep the stained wood texture. Roll off side lighting and let the
          // cooler lacquer show more strongly when the cap is viewed edge-on.
          vec3 railNormal=normalize(worldNormal);
          float cap=smoothstep(.28,.92,railNormal.y);
          float grazing=1.-clamp(abs(dot(railNormal,eyeRay)),0.,1.);
          vec3 glaze=vec3(.013,.006,.205)*cap*pow(grazing,4.);
          color=base*vec3(1.08,.13,.40)*mainAmount*baseGain*mix(.24,1.,cap)
            +amount*reflected*reflectionGain*mix(.40,1.,cap)
            +glaze+.65*fresnel*fresnelAmount*reflectionColor*edgeGain;
        #else
        color=base*mainAmount*baseGain*authoredLightResponse+amount*reflected*(kind==3?reflectionColor:vec3(1.))*reflectionGain+
          fresnel*fresnelAmount*(kind==3?fresnelColor:reflectionColor)*edgeGain;
        #endif
      }
      gl_FragColor=vec4(max(color,vec3(0.)),1.);
    }`;
  function applySurfaceValues(material, group, values) {
    const { uniforms, defines } = material;
    if (group === 'rail') {
      uniforms.roofDimensions.value.set(values.roofLength ?? 5, values.roofWidth ?? .75);
      const heightDelta = (values.roofHeight ?? 3.5) - 3.5;
      uniforms.boxMax.value.y = 4.3249288373 + heightDelta;
      uniforms.cubePosition.value.y = 3.1249288373 + heightDelta;
    }
    const roughness = values[group + 'Roughness'];
    if (uniforms.clothRoughness && roughness !== undefined) {
      uniforms.clothRoughness.value = roughness;
      // Recompile only when crossing the preset with a prefiltered texture.
      const prepared = Math.abs(roughness - PREPARED_CLOTH_ROUGHNESS) < 1e-6;
      if (Boolean(defines.USE_PREPARED_CLOTH_REFLECTION) !== prepared) {
        if (prepared) defines.USE_PREPARED_CLOTH_REFLECTION = 1;
        else delete defines.USE_PREPARED_CLOTH_REFLECTION;
        material.needsUpdate = true;
      }
    }
    const scale = ['baize', 'cushionSurface'].includes(group) ? 'WeaveScale' : 'Scale';
    const parameters = [
      ['Base', 'baseGain'], ['Reflection', 'reflectionGain'], ['Edge', 'edgeGain'],
      ['Focus', 'focusGain'], ['Detail', 'detailGain'], [scale, 'detailScale'],
      ['SoftReflection', 'viewResponse'],
    ];
    for (const [suffix, uniform] of parameters) {
      const value = values[group + suffix];
      if (value !== undefined) uniforms[uniform].value = value;
    }
  }

  async function make(record, group, baseOverride = null, options = {}) {
    const f=record.floats,c=record.colors,t=record.textures;
    const isCloth=record.shadingModel==='cloth',isMetal=record.shadingModel==='metal';
    const kind=isCloth?1:isMetal?3:record.shadingModel==='wood'?2:0;
    const vec=(key,fallback)=>new THREE.Vector3().fromArray(c[key]||fallback);
    if(!baseOverride && initialWood==='redBrown' && /^table(?:Rail(?:Wood|EdgeWood)|LongApronWood|EndApronWood)/.test(record.name)){
      baseOverride=await getTexture({file:'../textures/table-wood/red-brown-v4.jpg'});
    }
    const [base,detail,cube]=await Promise.all([baseOverride ? Promise.resolve(baseOverride) : getTexture(t.baseMap),getTexture(t.detailMap),getTexture(t.reflectionMap || records.tableRailWood.textures.reflectionMap)]);
    if(group==='rail'){
      // Preserve matching base-level face borders; do not sample independently
      // downsampled face edges for the sharp lacquer reflection.
      cube.generateMipmaps=false;cube.minFilter=THREE.LinearFilter;cube.needsUpdate=true;
    }
    const main=options.authoredUV
      ? {repeat:base.repeat.toArray(),offset:base.offset.toArray()}
      : t.baseMap||{repeat:[1,1],offset:[0,0]};
    const det=t.detailMap||{repeat:[1,1],offset:[0,0]};
    const u={railRoof:group==='rail',roofDimensions:new THREE.Vector2(5,.75),baseMap:base,detailMap:detail,reflectionMap:cube,mainRepeat:new THREE.Vector2(...main.repeat),mainOffset:new THREE.Vector2(...main.offset),detailRepeat:new THREE.Vector2(...det.repeat),detailOffset:new THREE.Vector2(...det.offset),originalSceneMatrix,originalNormalMatrix:new THREE.Matrix3().getNormalMatrix(originalSceneMatrix),tableOffset,
      boxMin:new THREE.Vector3(-8.5,0,-9.5),boxMax:new THREE.Vector3(8.5,4.3249288373,9.5),cubePosition:new THREE.Vector3(-.00017792,3.1249288373,-.000623382),reflectionColor:vec('reflectionColor',[1,1,1]),fresnelColor:vec('fresnelColor',[1,1,1]),tint:new THREE.Vector3(...(options.tint||[1,1,1])),
      amount:f.amount??1,mainAmount:f.mainAmount??1,diffuseAmount:f.diffuseAmount??1,detailLighten:f.detailsLighten??0,detailPow:f.detailsPow??1,detailPow2:f.detailsPow2??1,fresnelAmount:f.fresnelAmount??0,fresnelFocus:f.fresnelFocus??.1,fresnelReflection:f.fresnelReflection??.1,fresnelIntensity:f.fresnelReflectionIntensity??1,
      redWoodAtlas:!options.authoredUV&&initialWood==='redBrown'&&/^table(?:Rail(?:Wood|EdgeWood)|LongApronWood|EndApronWood)/.test(record.name),redWoodPanel:initialWood==='redBrown'&&/^table(?:LongApronWood|EndApronWood)/.test(record.name),baizeWeave:!options.authoredUV&&group==='baize',baseGain:1,reflectionGain:1,viewReflectionGain:1,edgeGain:1,focusGain:1,detailGain:1,detailScale:1,viewResponse:['baize','cushionSurface'].includes(group)?0:1,kind,carpetMean:new THREE.Vector3(.322,.313,.304),carpetContrast:options.carpetContrast??.42,carpetTiling:options.carpetTiling??2.2,newGreyCarpet:!!options.newGreyCarpet,cleanCarpet:false,floorAtlas:!!options.floorAtlas,worldDetail:!!options.worldDetail,recolor:!!options.tint};
    u.authoredLightResponse = new THREE.Vector3(...(options.authoredLightResponse || [1,1,1]));
    const clothSurface=['baize','cushionSurface'].includes(group);
    const defines={};
    if (clothSurface && options.directionalCloth) defines.USE_DIRECTIONAL_CLOTH = 1;
    if(burgundyRail&&!options.authoredUV&&record.name==='tableRailWood')defines.BURGUNDY_RAIL=1;
    if(clothSurface){
      const [target,prepared]=await Promise.all([clothProbe(cube),preparedClothProbe()]);
      u.clothFilteredMap=target.texture;
      u.clothPreparedMap=prepared.texture;
      u.clothRoughness=prepared.roughness;
      u.viewResponse=.35;
      Object.assign(defines,{USE_CLOTH_FILTER:1,USE_PREPARED_CLOTH_REFLECTION:1,ENVMAP_TYPE_CUBE_UV:1,
        CUBEUV_TEXEL_WIDTH:1/target.width,CUBEUV_TEXEL_HEIGHT:1/target.height,
        CUBEUV_MAX_MIP:Math.log2(target.height/4).toFixed(1)});
    }
    const mat=new THREE.ShaderMaterial({name:record.name+' / table surface',defines,uniforms:Object.fromEntries(Object.entries(u).map(([k,value])=>[k,{value}])),vertexShader,fragmentShader,toneMapped:false,side:options.side ?? THREE.FrontSide});
    if(group==='rail')mat.uniforms.viewReflectionGain.value=railViewReflection.value;
    // Table switching can create materials after the lighting preset is active.
    if (lastValues) applySurfaceValues(mat, group, lastValues);
    mat.userData.surfaceRole=group;mat.userData.sourceMaterial=record.name;groups[group].push(mat);owned.add(mat);return mat;
  }
  const floorVariants = {}, floorPending=new Map();
  let disposed=false,lastValues=null;
  const floorDefinitions={red:['floorCarpet',{}],newGrey:['floorCarpet',{newGreyCarpet:true}],woolV2:['floorCarpet',{newGreyCarpet:true,carpetContrast:1,carpetTiling:3.0}]};
  function ensureFloor(id){
    if(!floorDefinitions[id])id='red';
    if(floorVariants[id])return Promise.resolve(floorVariants[id]);
    if(!floorPending.has(id))floorPending.set(id,(async()=>{
      const [name,options]=floorDefinitions[id];let map=null;
      if(id==='newGrey'||id==='woolV2'){
        map=await loader.loadAsync(id==='woolV2'?'./textures/carpet/wool-ivory-v2.jpg':'./textures/carpet/crucible-new-grey-v2.jpg');
        map.colorSpace=THREE.NoColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());owned.add(map);
      }
      const mat=await make(records[name],'floorSurface',map,options);
      floorVariants[id]=mat;
      if(disposed)for(const resource of owned)resource.dispose();
      return mat;
    })().finally(()=>floorPending.delete(id)));
    return floorPending.get(id);
  }
  const firstFloor=legacyFloor ? await ensureFloor(initialFloor) : null;
  const parameters=[];
  parameters.push({id:'floorMaterial',nameZh:'地面材质',group:'地面材质',type:'select',default:floorDefinitions[initialFloor]?initialFloor:'red',options:[{value:'red',label:'原版红地毯'},{value:'newGrey',label:'灰地毯 V1'},{value:'woolV2',label:'羊毛地毯 V2'}]});
  const add=(id,nameZh,group,min,max,step,value,description)=>parameters.push({id,nameZh,group,min,max,step,default:value,description});
  for(const [prefix,title] of [['rail','木边原版反射'],['baize','主台呢光效'],['cushionSurface','布库边光效'],['floorSurface','地面原版光效']]){
    if(['baize','cushionSurface'].includes(prefix)) {
      add(prefix+'Roughness','表面粗糙度',title,0,1,.01,.95,'越高，灯箱倒影越模糊、分散；不再额外衰减高光亮度。反光强度和掠视角高光分别调节。');
      add(prefix+'SoftReflection','布面反光强度',title,0,1,.01,.35,'控制粗糙布面的柔和环境反光；与粗糙度独立，0 才是完全关闭。');
    }
    add(prefix+'Base','底色亮度倍率',title,0,3,.01,1,'以原版材质为基准调整底色亮度。');
    if(!['baize','cushionSurface'].includes(prefix)) add(prefix+'Reflection','环境反射倍率',title,0,3,.01,1,'按实际位置和观察方向计算；地毯不产生镜面反射。');
    add(prefix+'Edge','掠视角高光倍率',title,0,3,.01,1,'控制低角度观察时的高光；地毯不使用此项。');
    add(prefix+'Focus','高光集中度倍率',title,.1,3,.01,1,'越高，高光越集中在掠视角。');
    if(prefix!=='rail'){
      add(prefix+'Detail','细节强度',title,0,1,.01,1,'控制台呢或瓷砖细节参与原版光照计算的程度。');
      const cloth=['baize','cushionSurface'].includes(prefix);
      add(prefix+(cloth?'WeaveScale':'Scale'),'细节纹理密度',title,cloth?.125:.25,4,.01,1,cloth?'1 倍为当前细纤维的默认密度；增大可让纤维更细密。':'瓷砖按世界尺寸平铺。');
      if(cloth)Object.assign(parameters.at(-1),{legacyId:prefix+'Scale',legacyScale:.5});
    }
  }
  for(const [id,title,roughness] of [['leather','袋口皮革光泽',.38],['leg','桌腿漆面光泽',.32]]){
    add(id+'Reflection','环境反射强度',title,0,3,.01,1,'使用与木边同源的灯箱环境，按材质粗糙度过滤。');
    add(id+'Roughness','表面粗糙度',title,.05,1,.01,roughness,'越高反光越宽、越柔和；不改变底色贴图。');
  }
  add('floorBakedLight','地毯预制亮光强度','地面材质',0,1,.01,1,'只用于地毯；反射地面关闭预制亮光，避免叠加。');
  if(!legacyFloor)for(const parameter of parameters)if(parameter.id==='floorMaterial'||parameter.id==='floorBakedLight'||parameter.id.startsWith('floorSurface')){
    parameter.disabled=true;parameter.description='新场馆使用烘焙地毯，此旧控制不适用。';
  }
  const api={
    parameters, records, railViewReflection,
    setRailViewReflection(value){
      railViewReflection.value=value;
      for(const mat of groups.rail)mat.uniforms.viewReflectionGain.value=value;
    },
    getRoomProbe(){return groups.rail[0].uniforms;},
    getRoomEnvironment(){return clothProbe(groups.rail[0].uniforms.reflectionMap.value);},
    async attachTableFinishes(root){
      const rail=groups.rail[0];if(!rail)return;
      const target=await clothProbe(rail.uniforms.reflectionMap.value);
      root.traverse(o=>{
        if(!o.isMesh)return;
        for(const m of (Array.isArray(o.material)?o.material:[o.material])){
          // Structural upgrades clone the wood shader before tuning registers.
          if(m.userData.surfaceRole==='rail'&&!groups.rail.includes(m))groups.rail.push(m);
          if(!m.isMeshStandardMaterial)continue;
          const group=/^pocketLeather/.test(m.name)?'leather':m.userData.tableFinish==='leg'?'leg':null;
          if(!group)continue;
          m.envMap=target.texture;m.envMapIntensity=1;
          m.roughness=group==='leather'?.38:.32;
          if(group==='leather'){
            // Same source probe, coordinate conversion and box projection as the rail.
            const u=this.attachCueMaterial(m);
            if(u){u.cueRoomStrength.value=1;u.cueDiffuseFill.value=.12;u.cueDiffuseTop.value=.45;}
            m.emissiveIntensity=0;m.vertexColors=false;
          }
          m.needsUpdate=true;
          tableFinishes[group].add(m);
        }
      });
    },
    async createMaterial(source,map,options){
      if(source.name==='floorCarpet')return firstFloor;
      const record=records[source.name];if(!record)return null;
      const group=source.render.surface;
      if(!group)return null;
      const clone=map?.clone();if(clone){clone.colorSpace=THREE.NoColorSpace;clone.needsUpdate=true;owned.add(clone);}
      return make(record,group,clone,options);
    },
    attachCueMaterial(material){
      if(material.userData.cueRoomReflection)return material.userData.cueRoomReflection;
      // Keep the cue's procedural inlays and PBR base, but share the rail probe,
      // original coordinate conversion and box projection for its varnish sheen.
      const source=groups.rail.find(m=>m.userData.sourceMaterial==='tableRailWood')||groups.rail[0];
      if(!source)return null;
      const uniforms={cueRoomStrength:{value:.8},cueRoomEdge:{value:1},cueRoomFocus:{value:1},cueDiffuseFill:{value:.25},cueDiffuseTop:{value:.85}};
      for(const key of ['reflectionMap','originalSceneMatrix','originalNormalMatrix','tableOffset','boxMin','boxMax','cubePosition'])
        uniforms['cueRoom_'+key]=source.uniforms[key];
      const sourceCube=source.uniforms.reflectionMap.value;
      // A cue needs roughness mip levels, but must not change the shared rail
      // sampler: independently generated cube-face mips can reveal face seams.
      if(!cueProbes.has(sourceCube)){
        const cube=sourceCube.clone();
        cube.generateMipmaps=true;cube.minFilter=THREE.LinearMipmapLinearFilter;cube.needsUpdate=true;
        cueProbes.set(sourceCube,cube);owned.add(cube);
      }
      uniforms.cueRoom_reflectionMap={value:cueProbes.get(sourceCube)};
      const previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey();
      material.envMap=null;
      material.onBeforeCompile=function(shader,renderer){
        previous.call(this,shader,renderer);
        Object.assign(shader.uniforms,uniforms);
        shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 cueRoomPoint;')
          .replace('#include <project_vertex>','cueRoomPoint=(modelMatrix*vec4(transformed,1.)).xyz;\n#include <project_vertex>');
        shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
          varying vec3 cueRoomPoint;
          uniform samplerCube cueRoom_reflectionMap;
          uniform mat4 cueRoom_originalSceneMatrix;
          uniform mat3 cueRoom_originalNormalMatrix;
          uniform vec3 cueRoom_tableOffset,cueRoom_boxMin,cueRoom_boxMax,cueRoom_cubePosition;
          uniform float cueRoomStrength,cueRoomEdge,cueRoomFocus,cueDiffuseFill,cueDiffuseTop;
          vec3 cueRoomReflection(vec3 worldNormal,float rough){
            vec3 flip=vec3(-1.,1.,1.);
            vec3 p=cueRoomPoint;
            vec3 n=normalize(cueRoom_originalNormalMatrix*(worldNormal*flip));
            vec3 v=normalize(mat3(cueRoom_originalSceneMatrix)*((cueRoomPoint-cameraPosition)*flip));
            vec3 eyeRay=isOrthographic ? -vec3(viewMatrix[0][2],viewMatrix[1][2],viewMatrix[2][2]) : normalize(cueRoomPoint-cameraPosition);
            vec3 r=reflect(eyeRay,normalize(worldNormal));
            vec3 safeR=mix(vec3(-1.),vec3(1.),step(vec3(0.),r))*max(abs(r),vec3(.000001));
            vec3 a=(cueRoom_boxMin-p)/safeR,b=(cueRoom_boxMax-p)/safeR;
            vec3 lo=min(a,b),hi=max(a,b);
            float enter=max(max(lo.x,lo.y),lo.z),leave=min(min(hi.x,hi.y),hi.z);
            vec3 direction=r;
            if(leave>=max(enter,0.))direction=p+r*(enter>0.?enter:leave)-cueRoom_cubePosition;
            vec3 reflected=textureCube(cueRoom_reflectionMap,direction,rough*5.).rgb;
            float edge=pow(max(0.,1.-abs(dot(n,v))),max(.1,8.704*cueRoomFocus));
            // Convert the gamma-space source probe into the cue's linear PBR pipeline.
            return sRGBTransferEOTF(vec4(reflected,1.)).rgb*cueRoomStrength*
              (.24+.622*edge*cueRoomEdge)*(1.-.7*rough);
          }`)
          .replace('#include <opaque_fragment>',`vec3 cueWorldNormal=inverseTransformDirection(normal,viewMatrix);
            // Broad neutral overhead illumination, separate from view-dependent varnish.
            // Multiply albedo so dark inlays remain dark; metals keep their specular response.
            outgoingLight+=diffuseColor.rgb*(1.-metalnessFactor)*
              (cueDiffuseFill+cueDiffuseTop*max(0.,cueWorldNormal.y));
            outgoingLight+=cueRoomReflection(cueWorldNormal,roughnessFactor);
            #include <opaque_fragment>`);
      };
      material.customProgramCacheKey=()=>previousKey+'|cue-room-lighting-v2';
      material.userData.cueRoomReflection=uniforms;material.needsUpdate=true;
      return uniforms;
    },
    bind(scene){scene.updateMatrixWorld(true);scene.traverse(o=>{if(!o.isMesh)return;prepareClothDetailUV(o);if(legacyFloor&&o.material?.userData.sourceMaterial==='floorCarpet')floorMeshes.push(o);
      if(legacyFloor&&o.material?.name==='floorBakedLight'){
        const recolor={value:false},tint={value:new THREE.Color(1,1,1)};
        o.material.onBeforeCompile=shader=>{
          shader.uniforms.carpetRecolor=recolor;shader.uniforms.carpetTint=tint;
          shader.fragmentShader='uniform bool carpetRecolor; uniform vec3 carpetTint;\n'+shader.fragmentShader.replace('#include <map_fragment>',
            '#include <map_fragment>\nif(carpetRecolor) diffuseColor.rgb=vec3(max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b)))*carpetTint;');
        };
        o.material.customProgramCacheKey=()=> 'carpet-light-colorway-v1';o.material.needsUpdate=true;
        floorOverlays.push({mesh:o,opacity:o.material.opacity,recolor,tint});
      }});},
    apply(values){
      // Retired saved floor IDs fall back to the original red carpet.
      if(values.floorMaterial&&!floorDefinitions[values.floorMaterial])values={...values,floorMaterial:'red'};
      lastValues=values;
      const selected=values.floorMaterial;
      if(legacyFloor&&floorDefinitions[selected]&&!floorVariants[selected]&&!floorPending.has(selected)){
        ensureFloor(selected).then(()=>{if(!disposed){api.apply(lastValues);onChange();}}).catch(error=>console.error('Floor material load failed:',error));
      }
      for(const [group,mats] of Object.entries(tableFinishes))for(const m of mats){
        if(values[group+'Reflection']!==undefined){m.envMapIntensity=values[group+'Reflection'];if(group==='leather'&&m.userData.cueRoomReflection)m.userData.cueRoomReflection.cueRoomStrength.value=values[group+'Reflection'];}
        if(values[group+'Roughness']!==undefined)m.roughness=values[group+'Roughness'];
      }
      const floor=floorVariants[values.floorMaterial]||firstFloor;
      for(const mesh of floorMeshes)mesh.material=floor;
      for(const {mesh,opacity,recolor,tint} of floorOverlays){
        mesh.visible=['red','newGrey','woolV2'].includes(values.floorMaterial);mesh.material.opacity=opacity*values.floorBakedLight;
        recolor.value=['newGrey','woolV2'].includes(values.floorMaterial);
        tint.value.setRGB(...(values.floorMaterial==='woolV2'?[.80,.75,.68]:[.32,.31,.30])).convertSRGBToLinear();
      }
      for(const [prefix,mats] of Object.entries(groups))for(const mat of mats){
        applySurfaceValues(mat, prefix, values);
      }
    },
    inspect:()=>({floors:floorMeshes.length,variants:Object.keys(floorVariants),groups:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,v.length]))}),
    dispose(){disposed=true;for(const resource of owned)resource.dispose();},
  };
  return api;
}
