const resultCaches = new WeakMap();
// One reusable worker per consumer. Cancellation is cooperative in the worker;
// jobs never queue behind obsolete searches. Cache only complete exact results.
export function createToleranceClient() {
  let worker=null, serial=0, callback=null, busy=false, context=null;
  let cache=new Map(), keyForJob,job=null;
  let suspended=globalThis.document?.hidden===true;
  function cancel(){serial++;callback=null;busy=false;job=null;worker?.postMessage({cancel:true});}
  const api={
    cancel,
    get busy(){return busy;},
    request(input,done){
      cancel();
      job={input,done};
      if(suspended){busy=true;return;}
      const {physics,state,...options}=input;
      if(!context||context.physics!==physics||context.table!==state.tableColliderSet){
        context={physics,table:state.tableColliderSet};
        let tables=resultCaches.get(physics);
        if(!tables){tables=new WeakMap();resultCaches.set(physics,tables);}
        cache=tables.get(state.tableColliderSet);
        if(!cache){cache=new Map();tables.set(state.tableColliderSet,cache);}
        worker?.terminate();worker=null;
      }
      const {tableColliderSet,...dynamicState}=state;
      const key=JSON.stringify([dynamicState,options]);
      if(cache.has(key)){job=null;done(cache.get(key));return;}
      if(!worker){
        worker=new Worker((window.SnookerTestFieldModels ?? window.SnookerProductLite)?.workerUrl('pot-tolerance-worker.bundle.js') ?? new URL('./pot-tolerance-worker.bundle.js',import.meta.url));
        worker.postMessage({context:{physics,tableColliderSet}});
        worker.onmessage=({data})=>{
          if(data.key!==serial)return;
          busy=false;job=null;const cb=callback;callback=null;
          if(data.result?.status==='ok'){
            cache.set(keyForJob,data.result);
            if(cache.size>8)cache.delete(cache.keys().next().value);
          }
          cb?.(data.result);
        };
        worker.onerror=()=>{const cb=callback;cancel();worker?.terminate();worker=null;cb?.({status:'error'});};
      }
      keyForJob=key;callback=done;busy=true;
      worker.postMessage({key:serial,input:{...options,state:dynamicState},useContext:true});
    },
    dispose(){globalThis.document?.removeEventListener('visibilitychange',visibility);cancel();worker?.terminate();worker=null;context=null;},
  };
  function visibility(){
    suspended=globalThis.document.hidden;
    if(suspended){serial++;worker?.terminate();worker=null;}
    else if(job){const pending=job;api.request(pending.input,pending.done);}
  }
  globalThis.document?.addEventListener('visibilitychange',visibility);
  return api;
}
