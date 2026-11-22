// Audio recovery is best effort. Never retain, defer or cancel a released shot.
export function createShotAudioRecovery({activate,prepare,isReady,onUnavailable=()=>{},now=()=>performance.now(),noticeIntervalMs=10000}) {
  let preparing=false,destroyed=false,lastNotice=-Infinity;
  function attempt(){
    if(destroyed)return;
    // resume() must be requested synchronously inside the release gesture.
    try{Promise.resolve(activate()).catch(()=>{});}catch{}
    // Only one observer of the shared decode request; no per-shot decode queue.
    if(!preparing){
      preparing=true;
      try{Promise.resolve(prepare()).catch(()=>{}).finally(()=>{preparing=false;});}
      catch{preparing=false;}
    }
    try{
      if(isReady()){lastNotice=-Infinity;return;}
      const time=now();
      if(time-lastNotice>=noticeIntervalMs){lastNotice=time;onUnavailable();}
    }catch{} // Audio/UI failures must not escape into the input controller.
  }
  return {attempt,destroy(){destroyed=true;}};
}

export function createAudioShot({game,recovery,beforeShoot=()=>{},now=()=>performance.now()}){
  return ()=>{
    beforeShoot();
    try{recovery.attempt();}catch{}
    // Preserve the synchronous input contract, power and server deadline.
    return game.shoot(now());
  };
}
