// Intersect guide triangles with a triangulated (possibly concave) drop-edge outline.
const cross=(a,b,p)=>(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);
export function clipGuideTriangles(vertices, triangles) {
  const output=[];
  for(let i=0;i<vertices.length;i+=9){
    const original=[0,3,6].map(j=>({x:vertices[i+j],y:vertices[i+j+1],z:vertices[i+j+2]}));
    const minX=Math.min(...original.map(p=>p.x)),maxX=Math.max(...original.map(p=>p.x));
    const minY=Math.min(...original.map(p=>p.y)),maxY=Math.max(...original.map(p=>p.y));
    for(const tri of triangles){
      if(maxX<tri.minX||minX>tri.maxX||maxY<tri.minY||minY>tri.maxY)continue;
      let polygon=original;
      for(let edge=0;edge<3&&polygon.length;edge++){
        const a=tri.points[edge],b=tri.points[(edge+1)%3],next=[];
        for(let j=0;j<polygon.length;j++){
          const p=polygon[j],q=polygon[(j+1)%polygon.length];
          const dp=cross(a,b,p)*tri.sign,dq=cross(a,b,q)*tri.sign;
          if(dp>=0)next.push(p);
          if((dp>=0)!==(dq>=0)){const t=dp/(dp-dq);next.push({x:p.x+(q.x-p.x)*t,y:p.y+(q.y-p.y)*t,z:p.z+(q.z-p.z)*t});}
        }
        polygon=next;
      }
      for(let j=1;j<polygon.length-1;j++)for(const p of [polygon[0],polygon[j],polygon[j+1]])output.push(p.x,p.y,p.z);
    }
  }
  return output;
}
export function prepareClipTriangles(points, indices) {
  return indices.map(ids=>{
    const triangle=ids.map(i=>points[i]);
    return {points:triangle,sign:Math.sign(cross(...triangle))||1,
      minX:Math.min(...triangle.map(p=>p.x)),maxX:Math.max(...triangle.map(p=>p.x)),
      minY:Math.min(...triangle.map(p=>p.y)),maxY:Math.max(...triangle.map(p=>p.y))};
  });
}
