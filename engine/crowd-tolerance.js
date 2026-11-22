// Sound classification needs the geometry at shot start only. No worker,
// pre-shot debounce, full-state clone or post-pot physical search is needed.
export function createCrowdTolerance(getGame, api) {
  let result = null;
  return {
    update() {},
    capture(shot) {
      const game=getGame();
      result=api.assessCrowdGeometry(game.getState(),shot);
      game.setCrowdTolerance(result);
    },
    observe(events) {
      if(result?.status!=='ok')return;
      const event=events.find(e=>e.type==='ball-pocket-approach' && e.ballId===result.targetId && e.pocketId===result.pocketId);
      if(!event)return;
      result={...result,approachSpeedMmS:event.approachSpeedMmS,speedSource:'measured'};
      getGame()?.setCrowdTolerance(result);
    },
    reset() {result=null;},
    settled() {},
    dispose() {result=null;},
  };
}
