import * as THREE from 'three';
import { instanceStaticMeshes, mergeStaticTriangleStreams } from './static-scene-batches.js';

// A single-table, reference-inspired Crucible-style arena, in metres. Scenery only.
// Repeated chairs and step lights are instanced, not separate draws.
export function createCrucibleEnvironment({renderer,blueBannerMap} = {}) {
  const root = new THREE.Group(); root.name = '克鲁斯堡';
  root.userData.worldAligned = true;
  const batches = new Map(), dummy = new THREE.Object3D();
  const material = (name,color) => new THREE.MeshBasicMaterial({name:'Crucible / '+name,color});
  const dark = material('charcoal acoustic walls',0x111117), tier = material('tier risers',0x1c1c22);
  const red = material('championship blue',0x164b9b), silver = material('brushed silver plinth',0x77797f);
  const steel = material('black steel',0x24242b), seat = material('burgundy upholstery',0x805566);
  const blue = material('aisle blue',0x2346a1), white = material('stair nosing',0x777f8d);
  function shade(m, auditorium=false) {
    m.onBeforeCompile = shader => {
      shader.vertexShader = 'varying float arenaShade;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vec3 an = normal; vec4 ap = vec4(position,1.0);
        #ifdef USE_INSTANCING
          an = mat3(instanceMatrix) * an; ap = instanceMatrix * ap;
        #endif
        vec3 arenaNormal = normalize(mat3(modelMatrix) * an); float arenaHeight = (modelMatrix * ap).y;
        arenaShade = (0.30 + 0.55 * max(0.0,dot(arenaNormal,normalize(vec3(-0.3,0.9,0.5)))))
          ${auditorium ? '* mix(0.75,0.34,smoothstep(1.0,4.7,arenaHeight))' : ''};`);
      shader.fragmentShader = 'varying float arenaShade;\n' + shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        diffuseColor.rgb *= arenaShade;`);
    };
    m.customProgramCacheKey=()=> 'crucible-vertex-shade-'+auditorium; return m;
  }
  [red,silver,steel,seat,tier].forEach(m=>shade(m,m===seat||m===tier));
  const boxGeometry = new THREE.BoxGeometry(1,1,1);
  const cylinder = new THREE.CylinderGeometry(1,1,1,6);
  // Two double-sided planes preserve the distant seated silhouette; no
  // undersides, padding thickness or separate support geometry is needed.
  const seatPlane=new THREE.PlaneGeometry(.47,.43).toNonIndexed();
  seatPlane.rotateX(-Math.PI/2);seatPlane.translate(0,.495,0);
  const backPlane=new THREE.PlaneGeometry(.47,.57).toNonIndexed();
  backPlane.translate(0,.77,-.19);
  const audienceGeometry=mergeStaticTriangleStreams([seatPlane,backPlane]);
  seatPlane.dispose();backPlane.dispose();seat.side=THREE.DoubleSide;seat.forceSinglePass=true;
  const box = (name,position,size,mat,rotation=0,parent=root) => {
    const mesh = new THREE.Mesh(boxGeometry,mat); mesh.name=name;
    mesh.position.fromArray(position); mesh.scale.fromArray(size); mesh.rotation.y=rotation;
    parent.add(mesh); return mesh;
  };
  function instance(key,geometry,mat,position,scale,rotation=0,color=null) {
    if (!batches.has(key)) batches.set(key,{geometry,mat,items:[]});
    dummy.position.fromArray(position); dummy.scale.fromArray(scale); dummy.rotation.set(0,rotation,0);dummy.updateMatrix();
    batches.get(key).items.push({matrix:dummy.matrix.clone(),color});
  }
  function rod(a,b,r=.022,mat=steel,parent=root) {
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),d=end.clone().sub(start);
    const mesh=new THREE.Mesh(cylinder,mat);mesh.name='Crucible / structural rail';mesh.position.copy(start).add(end).multiplyScalar(.5);
    mesh.scale.set(r,d.length(),r);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());parent.add(mesh);return mesh;
  }
  function canvasTexture(name,width,height,draw) {
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    draw(canvas.getContext('2d'),width,height);
    const texture=new THREE.CanvasTexture(canvas);texture.name='Crucible / '+name;texture.colorSpace=THREE.SRGBColorSpace;return texture;
  }
  // Contact shadows follow the actual enclosure footprints; the selectable carpet stays independent.
  const shadowPixels=new Uint8Array(128*64*4);
  for(let y=0;y<64;y++)for(let x=0;x<128;x++){
    const u=Math.abs((x+.5)/64-1),v=Math.abs((y+.5)/32-1);
    const endFade=1-THREE.MathUtils.smoothstep(u,.76,1);
    const sideFade=1-THREE.MathUtils.smoothstep(v,.06,1);
    shadowPixels[(y*128+x)*4+3]=Math.round(255*endFade*sideFade*sideFade);
  }
  const contactMap=new THREE.DataTexture(shadowPixels,128,64);contactMap.name='Crucible / soft footprint mask';
  contactMap.magFilter=THREE.LinearFilter;contactMap.minFilter=THREE.LinearFilter;contactMap.needsUpdate=true;
  const contactMaterials=new Map();
  function contactShadow(name,x,z,width,depth,parent,opacity=.25){
    if(!contactMaterials.has(opacity))contactMaterials.set(opacity,new THREE.MeshBasicMaterial({name:'Crucible / contact shadow',map:contactMap,transparent:true,opacity,depthWrite:false,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,depth),contactMaterials.get(opacity));
    mesh.name='Crucible / contact shadow / '+name;mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.008,z);
    mesh.userData.environmentCategory='floor';mesh.userData.contactShadow=true;parent.add(mesh);return mesh;
  }
  // floor materials and floor lighting are owned by the shared scene controls.
  // An open horseshoe leaves the front walk-on/camera area free.
  const aisles=[Math.PI/3,Math.PI/2,2*Math.PI/3,Math.PI,4*Math.PI/3,3*Math.PI/2,5*Math.PI/3];
  const terraceSections = [];
  let seats=0;
  for(let row=0;row<8;row++) {
    const rx=9.4+row*.64,rz=10.3+row*.62,y=.88+row*.36;
    // Solid annular terrace sections, separated by stepped aisles.
    const breaks=[.48,...aisles,Math.PI*2-.48];
    for(let k=0;k<breaks.length-1;k++){
      const a=breaks[k]+.055,b=breaks[k+1]-.055,shape=new THREE.Shape();
      for(let j=0;j<=6;j++){const t=a+(b-a)*j/6,x=(rx+.34)*Math.sin(t),z=-(rz+.34)*Math.cos(t);if(!j)shape.moveTo(x,z);else shape.lineTo(x,z);}
      for(let j=6;j>=0;j--){const t=a+(b-a)*j/6;shape.lineTo((rx-.35)*Math.sin(t),-(rz-.35)*Math.cos(t));}shape.closePath();
      const g=new THREE.ExtrudeGeometry(shape,{depth:y,bevelEnabled:false,steps:1});g.rotateX(-Math.PI/2);
      // Keep each aisle sector in two-row bands. Joining all eight rows gives
      // the narrow broadcast view a much larger bounding sphere than it needs.
      (terraceSections[k * 4 + Math.floor(row / 2)] ||= []).push(g);
    }
    const count=104+row*6;
    for(let i=0;i<count;i++){
      const t=.5+(Math.PI*2-1)*(i+.5)/count;
      if(aisles.some(a=>Math.abs(t-a)<.065))continue;
      const x=rx*Math.sin(t),z=rz*Math.cos(t),angle=t+Math.PI;
      instance('audience chairs',audienceGeometry,seat,[x,y,z],[1,1,1],angle);
      seats++;

    }
    for(const t of aisles){
      for(let j=0;j<2;j++){
        const rr=-.19+j*.31,h=y-.18+j*.18;
        instance('aisle steps',boxGeometry,tier,[(rx+rr)*Math.sin(t),h/2,(rz+rr)*Math.cos(t)],[.79,h,.32],t);
        instance('step safety strips',boxGeometry,white,[(rx+rr-.13)*Math.sin(t),h+.004,(rz+rr-.13)*Math.cos(t)],[.73,.012,.026],t);
      }
      if(row%2===0)instance('blue aisle markers',boxGeometry,blue,[rx*Math.sin(t),y+.045,rz*Math.cos(t)],[.04,.025,.09],t);
    }
  }
  for (let sector = 0; sector < terraceSections.length; sector++) {
    const parts = terraceSections[sector];
    const geometry = mergeStaticTriangleStreams(parts);
    const mesh = new THREE.Mesh(geometry, tier); mesh.name = 'Crucible / raked seating terrace / sector ' + sector;
    mesh.userData.staticBatchCount = parts.length; root.add(mesh);
    for (const part of parts) part.dispose();
  }
  // Rear acoustic envelope stays dark, with faceted wall panels.
  for(let i=0;i<34;i++){
    const t=.38+(Math.PI*2-.76)*(i+.5)/34;
    box('Crucible / auditorium wall',[15.2*Math.sin(t),3.6,15.9*Math.cos(t)],[2.8,7.2,.16],dark,t);
  }
  for(const t of aisles){
    const a=[9.05*Math.sin(t),1.65,9.96*Math.cos(t)],b=[14.25*Math.sin(t),4.52,14.96*Math.cos(t)];rod(a,b,.025);
    for(let j=0;j<5;j++){const f=j/4,x=a[0]+(b[0]-a[0])*f,z=a[2]+(b[2]-a[2])*f,y=a[1]+(b[1]-a[1])*f;rod([x,y-.72,z],[x,y,z],.018);}
  }
  const banner = canvasTexture('blue championship fascia',2048,256,(c,w,h)=>{
    const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#245fb8');g.addColorStop(1,'#103878');c.fillStyle=g;c.fillRect(0,0,w,h);
    c.fillStyle='#d5b6a0';c.fillRect(45,30,w-90,2);c.fillRect(45,h-32,w-90,2);
    c.textAlign='center';c.fillStyle='#fff4e9';c.font='bold 54px Arial';c.fillText('WORLD SNOOKER',w/2,109);
    c.font='28px Arial';c.fillText('C H A M P I O N S H I P',w/2,157);
    c.font='bold 40px Georgia';c.fillText('CRUCIBLE',250,116);c.font='20px Arial';c.fillText('S H E F F I E L D',250,153);
    c.font='bold 35px Georgia';c.fillText('CRUCIBLE',w-260,135);
  });
  const bannerMat=new THREE.MeshBasicMaterial({name:'Crucible / blue championship fascia',map:banner});
  const blueBannerMat=new THREE.MeshBasicMaterial({name:'Crucible / blue side fascia',map:blueBannerMap||null,color:blueBannerMap?0xffffff:0x25488c});
  const bluePanel=shade(material('blue side panel',0x25488c));
  function board(x,z,width,angle,arched=false,blueSign=false){
    const group=new THREE.Group();group.position.set(x,0,z);group.rotation.y=angle;root.add(group);
    contactShadow('barrier base',0,arched?-.38:0,width+.4,arched?1.6:1.3,group,arched?.48:.46);
    if(arched){
      const s=new THREE.Shape();s.moveTo(-width/2,0);s.lineTo(-width*.4,0);s.absellipse(0,0,width*.4,.68,Math.PI,0,true);s.lineTo(width/2,0);s.lineTo(width/2,1.1);s.lineTo(-width/2,1.1);s.closePath();
      const g=new THREE.ExtrudeGeometry(s,{depth:.18,bevelEnabled:true,bevelSize:.014,bevelThickness:.014,bevelSegments:1,steps:1});
      const m=new THREE.Mesh(g,red);m.name='Crucible / arched player enclosure';m.position.z=-.08;group.add(m);
      // The arch is a shallow recess, not a passage through to the outside of the auditorium.
      box('Crucible / arch recess back',[0,.53,-.65],[width,1.06,.12],bluePanel,0,group);
      for(const side of [-1,1])box('Crucible / arch recess return',[side*(width/2-.06),.53,-.34],[.12,1.06,.62],bluePanel,0,group);
      box('Crucible / arch recess soffit',[0,1.08,-.34],[width,.08,.62],bluePanel,0,group);
    }else box('Crucible / silver barrier',[0,.43,0],[width,.86,.18],silver,0,group);
    box(blueSign?'Crucible / blue side rail':'Crucible / red rail',[0,1.15,0],[width,.78,.22],blueSign?bluePanel:red,0,group);
    const face=new THREE.Mesh(new THREE.PlaneGeometry(width-.04,.72),blueSign?blueBannerMat:bannerMat);face.position.set(0,1.16,.116);group.add(face);
    box('Crucible / black coping',[0,1.57,0],[width+.04,.055,.26],steel,0,group);
  }
  // Table length follows X. The pair of arches is centred on z=0 behind the baulk end.
  for(const z of [-1.65,1.65])board(6.4,z,3.3,-Math.PI/2,true);
  for(const x of [-4.3,0,4.3]){
    board(x,-7.2,4.3,0,false,true);
    board(x,7.2,4.3,Math.PI,false,true);
  }
  for(const z of [-4.8,0,4.8])board(-6.4,z,4.8,Math.PI/2,false,true);

  // Mirrored recessed player stations: sloping tall signs, upholstered armchairs,
  // side tables, small monitors and silver cabinet fronts, as in the supplied photos.
  const chairMat=shade(material('player chair grey upholstery',0x999b9c));
  const seamMat=shade(material('upholstery seam',0x575b61));
  function padded(name,pos,size,parent,mat=chairMat){
    const [w,h,d]=size,r=Math.min(w,h,d)*.24,shape=new THREE.Shape();
    shape.moveTo(-w/2+r,-h/2);shape.lineTo(w/2-r,-h/2);shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);
    shape.lineTo(w/2,h/2-r);shape.quadraticCurveTo(w/2,h/2,w/2-r,h/2);
    shape.lineTo(-w/2+r,h/2);shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);
    shape.lineTo(-w/2,-h/2+r);shape.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:d-2*r,bevelEnabled:true,bevelSize:r,bevelThickness:r,bevelSegments:1,curveSegments:2});
    geometry.translate(0,0,-d/2+r);
    const mesh=new THREE.Mesh(geometry,mat);mesh.name='Crucible / '+name;mesh.position.fromArray(pos);parent.add(mesh);return mesh;
  }

  const stationMap=canvasTexture('player station championship sign',1024,1024,(c,w,h)=>{
    c.fillStyle='#164c9c';c.fillRect(0,0,w,h);
    c.textAlign='center';c.fillStyle='#f3efe0';c.font='bold 67px Arial';
    c.fillText('WORLD SNOOKER',w/2,210);c.fillText('CHAMPIONSHIP',w/2,295);
    c.fillStyle='#e7cc77';c.fillRect(140,360,744,8);
    c.font='48px Georgia';c.fillStyle='#ffffff';c.fillText('THE CRUCIBLE',w/2,480);
    c.font='30px Arial';c.fillText('S H E F F I E L D',w/2,558);
  });
  const stationMat=new THREE.MeshBasicMaterial({name:'Crucible / player station sign',map:stationMap});
  for(const sign of [-1,1]){
    const g=new THREE.Group();g.name='Crucible / player station '+sign;
    g.position.set(6.65,0,sign*5.15);
    // Local +Z is the front of the chair and enclosure: aim the whole station at the table centre.
    g.rotation.y=Math.atan2(-g.position.x,-g.position.z);root.add(g);
    g.userData.facingTarget=[0,0,0];
    g.updateMatrixWorld(true);
    const join=(side,end)=>{
      const start=g.localToWorld(new THREE.Vector3(side*1.3,0,.6));
      const finish=new THREE.Vector3(end[0],0,end[1]);
      const delta=finish.clone().sub(start),length=delta.length();
      const transition=new THREE.Group();transition.name='Crucible / rising player surround';
      transition.position.copy(start);transition.rotation.y=Math.atan2(-delta.z,delta.x);root.add(transition);
      contactShadow('sloped surround base',length/2,0,length+.36,1.15,transition,.44);
      box('Crucible / surround silver base',[length/2,.31,0],[length,.62,.18],silver,0,transition);
      const outline=new THREE.Shape();outline.moveTo(0,.62);outline.lineTo(length,.62);
      outline.lineTo(length,1.54);outline.lineTo(0,.94);outline.closePath();
      const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(outline,{depth:.2,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:2}),bluePanel);
      mesh.position.z=-.1;transition.add(mesh);
      rod([0,.965,0],[length,1.565,0],.024,steel,transition);
    };
    join(-sign,[6.4,sign*3.3]);
    join(sign,[6.45,sign*7.2]);
    contactShadow('station rear',0,-.43,3.05,1.2,g,.46);
    for(const side of [-1,1]){const edge=contactShadow('station side',side*1.3,-.12,1.75,.8,g,.4);edge.rotation.z=Math.PI/2;}
    contactShadow('chair foot',-sign*.3,.09,.9,.88,g,.24);
    contactShadow('drinks cabinet',sign*.85,.28,.87,.86,g,.25);
    box('Crucible / station rear',[0,.9,-.48],[2.65,1.8,.18],red,0,g);
    const signBack=box('Crucible / sloping sign frame',[0,2.5,-.94],[2.65,1.95,.12],steel,0,g);signBack.rotation.x=-.48;
    const panel=new THREE.Mesh(new THREE.PlaneGeometry(2.51,1.81),stationMat);
    panel.position.set(0,2.53,-.86);panel.rotation.x=-.48;g.add(panel);
    for(const side of [-1,1]){
      const cheek=new THREE.Shape();
      cheek.moveTo(.6,0);cheek.lineTo(.6,1.08);cheek.lineTo(-.49,1.65);
      cheek.lineTo(-1.39,3.37);cheek.lineTo(-1.5,3.37);cheek.lineTo(-.58,0);cheek.closePath();
      const cheekGeometry=new THREE.ExtrudeGeometry(cheek,{depth:.1,bevelEnabled:false});
      cheekGeometry.rotateY(-Math.PI/2);
      const wing=new THREE.Mesh(cheekGeometry,red);wing.name='Crucible / sloping station side cheek';
      wing.position.x=side*1.3+.05;g.add(wing);
      padded('padded chair arm',[side*.35,.67,.11],[.14,.21,.65],g);
      padded('chair side bolster',[side*.32,.43,.07],[.13,.34,.53],g);
    }
    box('Crucible / player chair base',[0,.24,.07],[.62,.42,.57],steel,0,g);
    padded('seat cushion seam',[0,.468,.15],[.59,.14,.58],g,seamMat);
    padded('player seat',[0,.49,.15],[.57,.13,.56],g);
    const back=padded('player back',[0,.86,-.19],[.63,.7,.16],g);back.rotation.x=-.12;
    padded('lumbar cushion',[0,.69,-.08],[.48,.22,.11],g);
    for(const dx of [-.24,.24])rod([dx-sign*.3,.06,.28],[dx-sign*.3,.35,.12],.023,steel,g);
    box('Crucible / drinks cabinet',[sign*.85,.3,.28],[.62,.6,.64],silver,0,g);
    box('Crucible / drinks counter',[sign*.85,.63,.28],[.7,.065,.71],red,0,g);
    for(let n=0;n<3;n++)box('Crucible / cabinet vent',[sign*.85,.18+n*.06,.608],[.32,.018,.008],steel,0,g);
    // Inset back panel, metal jambs and a framed player-name display.
    box('Crucible / inset station back',[0,1.065,-.37],[2.4,1.42,.05],bluePanel,0,g);
    for(const side of [-1,1])rod([side*1.22,.08,-.4],[side*1.22,1.71,-.5],.032,silver,g);
    box('Crucible / sign lower trim',[0,1.65,-.44],[2.59,.035,.1],steel,0,g);
    const labelMap=canvasTexture('player name '+sign,512,256,(c,w,h)=>{
      c.fillStyle='#1232a8';c.fillRect(0,0,w,h);c.strokeStyle='#6487df';c.lineWidth=8;c.strokeRect(8,8,w-16,h-16);
      c.textAlign='center';c.fillStyle='#e5ebff';c.font='bold 25px Arial';c.fillText('THE CRUCIBLE',w/2,58);
      c.font='bold 49px Arial';c.fillText('PLAYER '+(sign<0?'1':'2'),w/2,153);
    });
    box('Crucible / player monitor',[0,1.43,-.306],[.64,.35,.055],steel,0,g);
    const display=new THREE.Mesh(new THREE.PlaneGeometry(.59,.3),new THREE.MeshBasicMaterial({name:'Crucible / player name display',map:labelMap}));
    display.position.set(0,1.43,-.274);g.add(display);
    box('Crucible / drinks tray',[sign*.85,.675,.28],[.56,.025,.51],silver,0,g);
    const bottleMat=shade(material('water bottle glass',0x93b6c7));
    const labelMat=material('bottle label',0xa02135),capMat=material('bottle cap',0xc5ced0);
    for(const [dx,dz,h]of [[-.15,-.08,.27],[0,-.08,.3],[.14,.1,.21]]){
      const x=sign*.85+dx,z=.28+dz;
      const profile=[[.034,0],[.038,.02],[.037,h*.62],[.017,h*.8],[.017,h]].map(([r,y])=>new THREE.Vector2(r,y));
      const bottle=new THREE.Mesh(new THREE.LatheGeometry(profile,8),bottleMat);bottle.name='Crucible / shaped water bottle';bottle.position.set(x,.69,z);g.add(bottle);
      for(const [radius,height,y,mat]of [[.039,.072,.08,labelMat],[.02,.026,h,capMat]]){
        const ring=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,8),mat);ring.position.set(x,.69+y,z);g.add(ring);
      }
    }
    const bucket=new THREE.Mesh(new THREE.LatheGeometry([[.045,0],[.068,0],[.088,.17],[.078,.17],[.059,.018]].map(p=>new THREE.Vector2(...p)),10),silver);
    bucket.name='Crucible / drinks cooler';bucket.position.set(sign*.65,.69,.43);g.add(bucket);
    // Keep the armchair beside the drinks table rather than centred under the name panel.
    const chairNames=['padded chair arm','chair side bolster','player chair base','seat cushion seam','player seat','player back','lumbar cushion'];
    for(const part of g.children)if(chairNames.some(name=>part.name==='Crucible / '+name))part.position.x-=sign*.3;


  }
  // Broadcast truss and hanging venue monitors.
  for(const z of [-3.65,3.65]){
    for(const y of [4.85,5.15])rod([-4.8,y,z],[4.8,y,z],.036);
    for(let x=-4.8;x<4.8;x+=.6)rod([x,4.85,z],[x+.6,5.15,z],.014);
  }
  for(const x of [-4.8,4.8]){rod([x,4.85,-3.65],[x,4.85,3.65],.035);rod([x,5.15,-3.65],[x,5.15,3.65],.035);}
  const screenMap=canvasTexture('broadcast venue display',1024,512,(c,w,h)=>{
    c.fillStyle='#0a1428';c.fillRect(0,0,w,h);c.fillStyle='#164b9b';c.fillRect(0,0,w,70);
    c.fillStyle='#e8e7dc';c.textAlign='center';c.font='bold 40px Arial';c.fillText('THE CRUCIBLE',w/2,49);
    c.font='24px Arial';c.fillStyle='#adb8d1';c.fillText('S H E F F I E L D',w/2,112);
    c.fillStyle='#1a5838';c.fillRect(255,173,514,255);c.strokeStyle='#b3a471';c.lineWidth=14;c.strokeRect(255,173,514,255);
    c.font='19px Arial';c.fillStyle='#d3d8e6';c.fillText('WORLD SNOOKER CHAMPIONSHIP',w/2,478);
  });
  const screenMat=new THREE.MeshBasicMaterial({name:'Crucible / venue monitor',map:screenMap});
  for(const x of [-2.4,2.4]){
    box('Crucible / monitor casing',[x,3.52,-4.07],[1.58,.86,.12],steel);
    const panel=new THREE.Mesh(new THREE.PlaneGeometry(1.49,.77),screenMat);panel.position.set(x,3.52,-3.998);root.add(panel);
    rod([x,3.96,-4.05],[x,4.87,-3.65],.022);
  }
  for(const x of [-3.6,-1.2,1.2,3.6])for(const z of [-3.55,3.55]){
    box('Crucible / television light housing',[x,4.73,z],[.48,.15,.35],steel);
    box('Crucible / diffuser',[x,4.64,z],[.41,.025,.29],material('softbox diffuser',0x9399ae));
  }
  for(const [name,batch]of batches){
    const mesh=new THREE.InstancedMesh(batch.geometry,batch.mat,batch.items.length);mesh.name='Crucible / '+name;
    batch.items.forEach((item,i)=>{mesh.setMatrixAt(i,item.matrix);if(item.color)mesh.setColorAt(i,item.color);});mesh.computeBoundingSphere();root.add(mesh);
  }
  const staticBatching = instanceStaticMeshes(root, mesh => ['Crucible / structural rail', 'Crucible / auditorium wall'].includes(mesh.name));
  root.userData.staticBatching = { ...staticBatching, terraceSources: terraceSections.reduce((n, parts) => n + parts.length, 0), terraceBatches: terraceSections.length };
  // The inspection camera can orbit outside the auditorium. Clip only this
  // environment's near side, leaving the table and all gameplay geometry alone.
  const cut=new THREE.Plane(), toward=new THREE.Vector3();
  let cutX=NaN,cutZ=NaN;
  if(renderer)renderer.localClippingEnabled=true;
  root.traverse(mesh=>{
    if(!mesh.isMesh||(mesh.userData.environmentCategory==='floor'&&!mesh.userData.contactShadow))return;
    mesh.material.clippingPlanes=[cut];
    mesh.onBeforeRender=(_r,_s,camera)=>{if(cutX===camera.position.x&&cutZ===camera.position.z)return;cutX=camera.position.x;cutZ=camera.position.z;toward.set(-camera.position.x,0,-camera.position.z);if(toward.lengthSq()<1e-8)toward.set(0,0,-1);toward.normalize();cut.set(toward,8.8);};
  });
  root.userData.design={name:'克鲁斯堡',reference:'single-table final and two-table arena photos, stylistic reconstruction',stageSizeMetres:[12.8,14.4],archCentres:[[6.4,0,-1.65],[6.4,0,1.65]],playerStationCentres:[[6.65,0,-5.15],[6.65,0,5.15]],seats,spectators:0,physicsChanged:false};
  return root;
}
