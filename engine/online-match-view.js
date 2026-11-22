// Choose starting views once per new game, without resetting them on focus.
// The renderer separately returns the incoming shooter to aim on a turn handoff.
export function createOnlineMatchView(){
 let applied=null;
 return{
  next(online,state){
   const room=online?.room;
   if(!room||room.status!=='playing'||room.matchState?.frameOver||online.recovering||state.shotSeq!==room.matchState.shotSeq||state.currentPlayerId!==room.matchState.currentPlayerId)return null;
   const key=JSON.stringify([room.roomId,room.matchSequence]);
   if(key===applied)return null;
   applied=key;
   return online.self?.role!=='spectator'&&online.self?.playerId===state.currentPlayerId?'aim':'broadcast';
  },
 };
}
