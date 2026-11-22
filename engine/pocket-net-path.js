import * as THREE from 'three';

// Round a measured polyline inside its local control hull instead of extending
// a spline from a foreign exit point outside this table's net.
export function createNetChuteCurve(points) {
  const path=new THREE.CurvePath();let last=points[0];
  for(let i=1;i<points.length-1;i++){
    const p=points[i],incoming=points[i-1].clone().sub(p),outgoing=points[i+1].clone().sub(p);
    const cut=Math.min(incoming.length(),outgoing.length())*.2;
    if(cut<1e-8)continue;
    const before=p.clone().add(incoming.normalize().multiplyScalar(cut));
    const after=p.clone().add(outgoing.normalize().multiplyScalar(cut));
    if(last.distanceToSquared(before)>1e-16)path.add(new THREE.LineCurve3(last,before));
    path.add(new THREE.QuadraticBezierCurve3(before,p,after));last=after;
  }
  if(last.distanceToSquared(points.at(-1))>1e-16)path.add(new THREE.LineCurve3(last,points.at(-1)));
  path.arcLengthDivisions=160;return path;
}
