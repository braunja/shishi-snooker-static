import * as THREE from 'three';

// Keep a settled frame, then redraw only the animated placement indicator's
// screen rectangle. Crop both the viewport and projection so normal frustum
// culling also removes objects outside the rectangle. Scissor alone only avoids
// their fragments. Keep the ordinary depth, antialiasing and material shaders.
export function createIdleSceneCache(renderer) {
  let texture=null,valid=false,rectangle=null,cropCamera=null;
  const size=new THREE.Vector2(),scissor=new THREE.Vector4(),point=new THREE.Vector3();
  const camera=new THREE.Camera(),scene=new THREE.Scene();
  const viewport=new THREE.Vector4(),crop=new THREE.Matrix4();
  const material=new THREE.RawShaderMaterial({depthTest:false,depthWrite:false,
    uniforms:{image:{value:null}},
    vertexShader:'attribute vec3 position; varying vec2 uv; void main(){uv=position.xy*.5+.5;gl_Position=vec4(position,1.);}',
    fragmentShader:'precision highp float; uniform sampler2D image; varying vec2 uv; void main(){gl_FragColor=texture2D(image,uv);}' });
  const geometry=new THREE.PlaneGeometry(2,2);scene.add(new THREE.Mesh(geometry,material));
  function invalidate(){valid=false;rectangle=null;}
  function capture(){
    renderer.getDrawingBufferSize(size);
    if(!texture||texture.image.width!==size.x||texture.image.height!==size.y){
      texture?.dispose();texture=new THREE.FramebufferTexture(size.x,size.y);
      material.uniforms.image.value=texture;
    }
    renderer.copyFramebufferToTexture(texture);valid=true;rectangle=null;
  }
  function render(mesh,viewCamera,draw){
    if(!valid||!mesh?.visible)return false;
    renderer.getDrawingBufferSize(size);
    if(texture.image.width!==size.x||texture.image.height!==size.y){invalidate();return false;}
    if(!rectangle){
    mesh.updateWorldMatrix(true,false);viewCamera.updateMatrixWorld();
    const box=mesh.geometry.boundingBox||(mesh.geometry.computeBoundingBox(),mesh.geometry.boundingBox);
    let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
    for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
      point.set(x,y,z).applyMatrix4(mesh.matrixWorld).project(viewCamera);
      // A near-plane crossing needs the normal renderer, not an unsafe crop.
      if(point.z<=-1||!Number.isFinite(point.x+point.y))return false;
      const px=(point.x+1)*size.x/2,py=(point.y+1)*size.y/2;
      x0=Math.min(x0,px);x1=Math.max(x1,px);y0=Math.min(y0,py);y1=Math.max(y1,py);
    }
    x0=Math.max(0,Math.floor(x0)-3);y0=Math.max(0,Math.floor(y0)-3);
    x1=Math.min(size.x,Math.ceil(x1)+3);y1=Math.min(size.y,Math.ceil(y1)+3);
    rectangle={x0,y0,x1,y1};
    const width=x1-x0,height=y1-y0;
    if(width>0&&height>0){
      cropCamera=viewCamera.clone(false);
      // clip' = crop * clip; the matching viewport maps it back to the same
      // physical pixels. Preserve existing zoom, view offsets and depth range.
      crop.set(size.x/width,0,0,(size.x-2*x0-width)/width,
        0,size.y/height,0,(size.y-2*y0-height)/height,
        0,0,1,0,0,0,0,1);
      cropCamera.projectionMatrix.premultiply(crop);
      cropCamera.projectionMatrixInverse.copy(cropCamera.projectionMatrix).invert();
    }
    }
    const {x0,y0,x1,y1}=rectangle;
    const test=renderer.getScissorTest(),autoClear=renderer.autoClear;
    renderer.getScissor(scissor);renderer.getViewport(viewport);
    try{
      renderer.setScissorTest(false);renderer.autoClear=true;renderer.render(scene,camera);
      if(x1>x0&&y1>y0){
        const dpr=renderer.getPixelRatio();
        renderer.setScissor(x0/dpr,y0/dpr,(x1-x0)/dpr,(y1-y0)/dpr);
        renderer.setViewport(x0/dpr,y0/dpr,(x1-x0)/dpr,(y1-y0)/dpr);
        renderer.setScissorTest(true);draw(cropCamera);
      }
    }finally{renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(test);renderer.autoClear=autoClear;}
    return true;
  }
  return {capture,render,invalidate,release(){texture?.dispose();texture=null;material.uniforms.image.value=null;invalidate();},
    dispose(){this.release();geometry.dispose();material.dispose();}};
}
