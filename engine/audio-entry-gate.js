// Loading is complete before this gate is created. A real click starts resume
// synchronously; neither a rejected nor a late resume can silently enter play.
export function createAudioEntryGate({ready,activate,enter,show,timeoutMs=5000}) {
  let pending=false,entered=false,disposed=false,timer=null,cancel=null,generation=0;
  function finish(){if(disposed||entered)return;entered=true;enter();}
  async function start(event){
    if(disposed||entered||pending)return;
    if(ready()){finish();return;}
    pending=true;const request=++generation;show({pending:true,message:''});
    try{
      const activation=activate(event); // Must stay inside the user's event handler.
      await Promise.race([Promise.resolve(activation),new Promise((resolve,reject)=>{cancel=resolve;timer=setTimeout(()=>reject(Error('activation_timeout')),timeoutMs);})]);
      if(disposed||request!==generation)return;
      if(ready())finish();
      else show({pending:false,message:'暂时无法开始，请重试。'});
    }catch{if(!disposed&&request===generation)show({pending:false,message:'暂时无法开始，请重试。'});}
    finally{clearTimeout(timer);timer=null;cancel=null;pending=false;}
  }
  if(ready())finish();else show({pending:false,message:''});
  return {start,dispose(){disposed=true;generation++;cancel?.();cancel=null;clearTimeout(timer);timer=null;}};
}
