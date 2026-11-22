// A local prediction may animate immediately; result-dependent crowd audio
// waits for the accepted packet. No trajectories or rules are recomputed here.
export function createOnlineCrowdPolicy(play,{selfSnookered=()=>false}={}){
 let key='',packet=null,pending=[];
 const identity=p=>JSON.stringify([p.roomId,p.matchSequence||0,p.shotSeq||0]);
 function begin(shot){const next=identity(shot);if(next===key)return;key=next;packet=null;pending=[];}
 function valid(reaction){
  const result=packet?.ruleResult;if(!result)return false;
  const sigh=['crowdTerrible','crowdTerribleSoft'].includes(reaction.bankName);
  if(result.foul)return sigh;
  if(!sigh)return true;
  if(result.pottedBallIds?.length){return reaction.reason==='self-snookered-after-pot'&&selfSnookered(packet);}
  if(reaction.softIncident)return true;
  return !['wrong-first-contact-immediate','non-target-ball-potted-immediate','cue-ball-potted-immediate'].includes(reaction.reason);
 }
 function enqueue(reaction){if(!reaction)return false;if(!packet){if(pending.length<32)pending.push(reaction);return false;}if(!valid(reaction))return false;play(reaction);return true;}
 return {begin,enqueue,authority(value){begin(value);packet=value;const queued=pending;pending=[];for(const reaction of queued)enqueue(reaction);},reset(){key='';packet=null;pending=[];}};
}
