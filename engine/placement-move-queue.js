// Pointer events can arrive several times per paint. Solve the latest placement
// for that paint, and flush synchronously before committing a release.
export function createPlacementMoveQueue(apply) {
  let pending=null,last=null;
  return {
    push(point){pending={...point};},
    flush(){
      if(!pending)return false;
      const point=pending;pending=null;
      if(last&&point.x===last.x&&point.y===last.y)return false;
      last=point;apply(point);return true;
    },
    clear(){pending=last=null;},
    pending:()=>!!pending,
  };
}
