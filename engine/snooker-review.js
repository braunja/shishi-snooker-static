// Compatibility adapter for callers that still submit a review request. The
// current game core resolves this geometric question synchronously at settle.
export function createSnookerReview(getGame) {
  return {
    reset() {},dispose() {},
    review(request) {
      if(!request)return;
      const result=globalThis.SnookerThreeCore.assessOpponentOpportunity(request.input);
      getGame()?.completeSnookerReview(request.seq,result);
    },
  };
}
