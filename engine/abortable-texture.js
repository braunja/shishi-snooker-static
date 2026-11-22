import * as THREE from 'three';

// Inspection pages own a short-lived signal. Gameplay keeps Three's normal
// loader; an inspection abort also cancels requests and releases decoded maps.
export async function loadTexture(url,signal){
 if(!signal)return new THREE.TextureLoader().loadAsync(url);
 signal.throwIfAborted();
 const response=await fetch(url,{signal});
 if(!response.ok)throw Error('Missing texture: '+url);
 const blob=await response.blob();signal.throwIfAborted();
 const objectURL=URL.createObjectURL(blob);
 try{
  return await new Promise((resolve,reject)=>{
   let texture,settled=false;
   const aborted=()=>{texture?.dispose();if(!settled){settled=true;const image=texture?.image;if(image)image.src='';reject(signal.reason||new DOMException('Aborted','AbortError'));}};
   signal.addEventListener('abort',aborted,{once:true});
   texture=new THREE.TextureLoader().load(objectURL,()=>{if(signal.aborted){aborted();return;}settled=true;resolve(texture);},undefined,error=>{if(settled)return;settled=true;signal.removeEventListener('abort',aborted);texture?.dispose();reject(error);});
   if(signal.aborted)aborted();
  });
 }finally{URL.revokeObjectURL(objectURL);}
}
