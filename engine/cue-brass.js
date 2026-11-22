import * as THREE from 'three';

export function createCueBrassEnvironment(renderer) {
  const pmrem=new THREE.PMREMGenerator(renderer);
    const studio=new THREE.Scene();studio.background=new THREE.Color('#858585');
    for(const [pos,w,h,color] of [[[2,1,0],1.8,4,'#ffffff'],[[-2,0,1],1.2,4,'#eeeeee'],[[0,1,-2],.7,3,'#454545'],[[0,3,0],4,3,'#ffffff']]){
      const card=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));card.position.fromArray(pos);card.lookAt(0,0,0);studio.add(card);
    }
  const environment=pmrem.fromScene(studio,.03);
  studio.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
  pmrem.dispose();
  return environment;
}

export function applyCueBrass(material, environment) {
  // Brass needs neutral illumination: the dark green baize probe otherwise
  // dominates a fully metallic surface and hides its brass identity.
  material.userData.preserveCueMetalEnvironment = true;
  material.map=null;material.emissiveMap=null;material.emissiveIntensity=0;
  material.color.set('#d5bc85');material.metalness=1;material.roughness=.19;
  material.envMap=environment.texture;material.envMapIntensity=1.15;
}
