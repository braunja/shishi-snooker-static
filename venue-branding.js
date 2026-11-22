import {CanvasTexture,SRGBColorSpace} from './engine/vendor/three.module.min.js';

// Original UV regions are retained. The signs use our existing city-lion icon.
const bands=[
  [73,[[2,409],[413,817],[821,1227],[1231,1635],[1639,2046]]],
  [433,[[2,409],[413,817],[821,1227],[1231,1635],[1639,2046]]],
  [793,[[2,391],[395,776],[781,1163],[1167,1549],[1553,1942]]],
  [1153,[[2,454],[458,907],[911,1361],[1365,1816]]],
  [1513,[[2,290],[294,582],[598,864],[878,1144],[1158,1278],[1298,1524]]]
];
let texturePromise;
function brandingTexture(){
  if(!texturePromise)texturePromise=(async()=>{
    const lion=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src='/icons/shishi-black-gold-180.png';});
    const canvas=document.createElement('canvas');canvas.width=canvas.height=2048;
    const c=canvas.getContext('2d');c.fillStyle='#111116';c.fillRect(0,0,2048,2048);c.textAlign='center';c.textBaseline='middle';
    const fit=(text,x,y,max,size,color)=>{c.fillStyle=color;do{c.font=`600 ${size--}px system-ui,"PingFang SC",sans-serif`;}while(size>8&&c.measureText(text).width>max);c.fillText(text,x,y,max);};
    for(const[y,regions]of bands)for(const[index,[x0,x1]]of regions.entries()){
      const w=x1-x0,cx=(x0+x1)/2,red=index%2===0;
      c.fillStyle=red?'#8f1d35':'#c4bdb0';c.fillRect(x0,y,w,281);
      fit('斯诺石狮三剑克',cx,y-30,w*.9,Math.min(30,w*.075),'#d8bd79');
      if(red){const size=Math.min(145,w*.52);c.drawImage(lion,cx-size/2,y+38,size,size);fit('石狮斯诺克',cx,y+222,w*.88,Math.min(30,w*.10),'#f1dfac');}
      else{fit('斯诺石狮三剑克',cx,y+135,w*.89,Math.min(36,w*.085),'#5c1625');fit('Shishi Three Swords Snooker',cx,y+174,w*.88,Math.min(18,w*.045),'#5c1625');}
    }
    const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;texture.name='shishi-venue-brand-v1';return texture;
  })();
  return texturePromise;
}
window.StandaloneVenueBranding=async root=>{
  const targets=new Set();root.traverse(node=>{for(const m of Array.isArray(node.material)?node.material:[node.material])if(m?.map?.name==='perimeter-static-v13-4096')targets.add(m);});
  if(!targets.size)return;
  const master=await brandingTexture();
  const owned=[];
  for(const material of targets){const source=material.map,texture=master.clone();texture.flipY=source.flipY;texture.wrapS=source.wrapS;texture.wrapT=source.wrapT;texture.repeat.copy(source.repeat);texture.offset.copy(source.offset);texture.channel=source.channel;texture.anisotropy=source.anisotropy;texture.needsUpdate=true;material.map=texture;material.needsUpdate=true;owned.push(texture);}
  return()=>owned.forEach(texture=>texture.dispose());
};
