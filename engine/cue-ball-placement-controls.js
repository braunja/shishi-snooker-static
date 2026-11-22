import { createCueBallPlacementHint } from './cue-ball-placement-hint.js';

// Rule placement uses the offset drag handle and connector only. Keep the
// renderer interface without allocating a flashing mesh beneath the cue ball.
export function createCueBallPlacementControls(options){
 const handle=createCueBallPlacementHint(options);
 return {...handle,mesh:()=>null,isVisible:()=>false,
  diagnostics:()=>({visible:false,handleVisible:handle.isVisible(),dragging:handle.isDragging()})};
}
