// Pointer coordinates stay relative to the grab point, never snap to the ball centre.
export function createPracticeBallDrag() {
  let hold = null;
  function track(point) {
    if(!hold)return;
    hold.point={...point};
    if(!hold.active&&Math.hypot(point.x-hold.start.x,point.y-hold.start.y)>8)hold.cancelled=true;
  }
  return {
    begin(id, point, now) { hold = {id, start:{...point}, point:{...point}, at:now, active:false, cancelled:false}; },
    update(now, project, position) {
      if (!hold || hold.active || hold.cancelled || now-hold.at<200) return;
      const p=project(hold.point), ball=position(hold.id);
      if (!ball) {hold=null;return;}
      hold.offset={x:ball.x-p.x,y:ball.y-p.y};hold.active=true;
    },
    move(point, project, moveBall) {
      if (!hold) return;
      track(point);
      if (!hold.active) return;
      const p=project(point);
      moveBall(hold.id,{x:p.x+hold.offset.x,y:p.y+hold.offset.y});
    },
    // Preserve long-press cancellation even when placement solves are batched.
    track,
    pending:()=>Boolean(hold&&!hold.active&&!hold.cancelled),
    activeId:()=>hold?.active?hold.id:null,
    end(){hold=null;},
  };
}
