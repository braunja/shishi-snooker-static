// Short, frame-driven transitions between physical solutions. No fabricated fallback paths.
const lerp = (a, b, t) => a + (b-a)*t;
const point = (a,b,t) => ({x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t)});
function direction(a,b,t) {
  const start=Math.atan2(a.y,a.x), end=Math.atan2(b.y,b.x);
  const delta=Math.atan2(Math.sin(end-start),Math.cos(end-start));
  const angle=start+delta*t;
  return {x:Math.cos(angle),y:Math.sin(angle)};
}
function sample(path, count=32) {
  const lengths=[0];
  for(let i=1;i<path.length;i++) lengths.push(lengths.at(-1)+Math.hypot(path[i].x-path[i-1].x,path[i].y-path[i-1].y));
  let j=1;
  return Array.from({length:count},(_,i)=>{
    const distance=lengths.at(-1)*i/(count-1);
    while(j<path.length-1 && lengths[j]<distance)j++;
    return point(path[j-1],path[j],(distance-lengths[j-1])/(lengths[j]-lengths[j-1]||1));
  });
}
function blendPath(a,b,t) {
  const origin=point(a[0],b[0],t);
  return a.map((p,i)=>{
    if(!i)return origin;
    const va={x:p.x-a[0].x,y:p.y-a[0].y},vb={x:b[i].x-b[0].x,y:b[i].y-b[0].y};
    const angle=direction(va,vb,t),radius=lerp(Math.hypot(va.x,va.y),Math.hypot(vb.x,vb.y),t);
    return {x:origin.x+angle.x*radius,y:origin.y+angle.y*radius};
  });
}
export function createPredictionDisplay({durationMs=80}={}) {
  let current=null, target=null, finalTarget=null, from=null, started=0, paths={};
  function update(now) {
    if(!from)return false;
    const t=Math.max(0,Math.min(1,(now-started)/durationMs));
    if(t>=1){current=finalTarget;from=null;return true;}
    current={...target, displayAlpha:lerp(from.displayAlpha ?? 1, target.displayAlpha ?? 1,t)};
    for(const [key,pair] of Object.entries(paths)) {
      if (key === 'cueCushionPaths') {
        current[key] = pair.map(([a,b]) => a.map((p,i) => point(p,b[i],t)));
      } else current[key]=blendPath(pair[0],pair[1],t);
    }
    for(const key of ['cueRollingDirection','incomingDirection']) {
      if(from[key] && target[key])current[key]=direction(from[key],target[key],t);
    }
    if(Number.isFinite(from.travelledMm)&&Number.isFinite(target.travelledMm))current.travelledMm=lerp(from.travelledMm,target.travelledMm,t);
    return true;
  }
  return {
    set(value,now) {
      update(now);
      const same=(current?.continuityKey||current?.baseKey)===(value?.continuityKey||value?.baseKey);
      if(!current || !value || !same || current.kind!==value.kind) {
        current=target=finalTarget=value;from=null;return;
      }
      if(!current.hit && !value.hit){current=target=finalTarget=value;from=null;return;}
      finalTarget=value;
      if(current.hit && !value.hit) {
        // Fade the last valid path out instead of removing it on the first low-power sample.
        from=current;target={...current,key:value.key,baseKey:value.baseKey,displayAlpha:0};
      } else if(!current.hit && value.hit) {
        from={...value,displayAlpha:0};current=from;target={...value,displayAlpha:1};
      } else {
        from=current;target={...value,displayAlpha:1};
      }
      started=now;paths={};
      if(from.cueCushionPaths?.length && target.cueCushionPaths?.length) {
        const a=from.cueCushionPaths,b=target.cueCushionPaths;
        const segment=(list,i)=>list[i]?.length>=2?sample(list[i]):Array.from({length:32},()=>({...list.at(-1).at(-1)}));
        paths.cueCushionPaths=Array.from({length:Math.max(a.length,b.length)},(_,i)=>[segment(a,i),segment(b,i)]);
      }
      for(const key of ['path','cuePath','targetPath']) {
        if(from[key]?.length>=2&&target[key]?.length>=2)paths[key]=[sample(from[key]),sample(target[key])];
      }
    },
    update,
    get:()=>current,
    isAnimating:()=>Boolean(from),
  };
}
