// Game snapshots contain data, not DOM nodes or callbacks. Preserve numeric
// values (including Infinity), undefined and typed arrays unlike a JSON copy.
export function cloneGameData(value){
 if(typeof globalThis.structuredClone==='function'){
  try{return globalThis.structuredClone(value);}catch{/* Embedded browser fallback. */}
 }
 const seen=new Map();
 function copy(item){
  if(typeof item==='function'||typeof item==='symbol')throw new TypeError('Game snapshot contains non-data values');
  if(item===null||typeof item!=='object')return item;
  if(seen.has(item))return seen.get(item);
  if(item instanceof Date){const out=new Date(item.getTime());seen.set(item,out);return out;}
  if(item instanceof ArrayBuffer){const out=item.slice(0);seen.set(item,out);return out;}
  if(ArrayBuffer.isView(item)){const buffer=copy(item.buffer);const out=item instanceof DataView?new DataView(buffer,item.byteOffset,item.byteLength):new item.constructor(buffer,item.byteOffset,item.length);seen.set(item,out);return out;}
  const out=Array.isArray(item)?new Array(item.length):item instanceof Map?new Map():item instanceof Set?new Set():{};seen.set(item,out);
  if(item instanceof Map){for(const [key,v] of item)out.set(copy(key),copy(v));}
  else if(item instanceof Set){for(const v of item)out.add(copy(v));}
  else for(const key of Object.keys(item))Object.defineProperty(out,key,{value:copy(item[key]),enumerable:true,configurable:true,writable:true});
  return out;
 }
 return copy(value);
}
