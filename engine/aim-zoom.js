// Projection-space anchoring keeps the grabbed image point under moving fingers.
export function zoomedViewOffset({width,height,offsetX,offsetY,zoom,nextZoom,point,previousPoint=point}) {
 const ratio=nextZoom/zoom;
 return {x:ratio*(previousPoint.x-width/2+offsetX)+width/2-point.x,
   y:ratio*(previousPoint.y-height/2+offsetY)+height/2-point.y};
}
