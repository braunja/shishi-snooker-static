// Virtual arena ceiling. Dimensions are the user's reconstruction hypothesis,
// not verified Crucible specifications. Only ball reflections use this roof.
export const BALL_ROOF = Object.freeze({height:3.5, length:5, panelWidth:.75, gap:.65,
  halfExtent:3.5, texture:'./textures/arena-roof/championship-clean-py.png'});

// Preserve the calibrated seam widths from the 4m light when extending to 5m.
// Side seams +50%, centre seam +100% relative to the original 2/266 ratio.
export const ROOF_SEAM_WIDTHS = Object.freeze([4*2/266*1.5,4*2/266*2,4*2/266*1.5]);
const sideHalf=ROOF_SEAM_WIDTHS[0]/2, middleHalf=ROOF_SEAM_WIDTHS[1]/2;
const halfLength=BALL_ROOF.length/2, quarterLength=BALL_ROOF.length/4;
const X_KNOTS=[-3.5,-halfLength,-quarterLength-sideHalf,-quarterLength+sideHalf,-middleHalf,middleHalf,quarterLength-sideHalf,quarterLength+sideHalf,halfLength,3.5];
const X_UV=[0,123/512,185.5/512,189.5/512,252.5/512,258.5/512,321.5/512,326.5/512,389/512,1];
// Calibrate the generated image's measured emitting boundaries to metric geometry.
// The 512px texture's bright panels occupy x=[123,389], y=[179,225]/[285,331].
export function roofTextureUV(x,z) {
  const lerp=(a,b,t)=>a+(b-a)*t;
  const piece=(v,knots,uv)=>{let i=0;while(i<knots.length-2&&v>knots[i+1])i++;
    return lerp(uv[i],uv[i+1],(v-knots[i])/(knots[i+1]-knots[i]));};
  return [piece(x,X_KNOTS,X_UV),
    piece(z,[-3.5,-1.075,-.325,.325,1.075,3.5],[0,179/512,225/512,285/512,331/512,1])];
}

export const BALL_ROOF_GLSL = `
  float roofU(float x) {
    ${X_KNOTS.slice(1).map((end,i)=>`if(x < ${end.toFixed(9)}) return mix(${X_UV[i].toFixed(9)},${X_UV[i+1].toFixed(9)},(x-(${X_KNOTS[i].toFixed(9)}))/${(end-X_KNOTS[i]).toFixed(9)});`).join('\n')}
    return 1.;
  }
  float roofV(float z) {
    if(z < -1.075) return mix(0.,179./512.,(z+3.5)/2.425);
    if(z < -.325) return mix(179./512.,225./512.,(z+1.075)/.75);
    if(z < .325) return mix(225./512.,285./512.,(z+.325)/.65);
    if(z < 1.075) return mix(285./512.,331./512.,(z-.325)/.75);
    return mix(331./512.,1.,(z-1.075)/2.425);
  }
`;

// Project from the main light centre onto the cloth. A bounded approximation
// for a large area light; strength is artistic, not a second light source.
export function ballShadowOffset(x,z,height,strength,radius) {
  const factor=Math.max(0,height)/Math.max(.1,BALL_ROOF.height-height)*Math.max(0,strength);
  let dx=x*factor,dz=z*factor;
  const length=Math.hypot(dx,dz),limit=radius*.75;
  if(length>limit){dx*=limit/length;dz*=limit/length;}
  return [dx,dz];
}
