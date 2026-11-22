// One active Worker request plus one replaceable desired input; never queue old aims.
export function createPredictionQueue({ worker, onResult, record = () => {}, count = () => {}, now = () => performance.now(), intervalMs = 33 }) {
  let desired = null, flight = null, result = null, failedKey = null, lastSent = -Infinity;
  let sequence = 0, destroyed = false;
  const identity = value => value?.continuityKey || value?.baseKey;
  const compatible = (a, b) => Boolean(identity(a) && identity(a) === identity(b));
  function setDesired(input) {
    if ((input?.key ?? null) === (desired?.key ?? null)) return;
    const keepResult = compatible(input, result);
    desired = input; failedKey = null;
    if (!keepResult) { result = null; onResult(null); }
  }
  function fail(error) {
    count('predictionErrors');
    failedKey = flight?.key ?? desired?.key; flight = null;
    console.error('Aim prediction:', error);
  }
  worker.onmessage = ({ data }) => {
    if (destroyed || !flight || data.requestId !== flight.id) return;
    record('workerRoundTripMs', now() - flight.started);
    record('workerComputeMs', data.computeMs);
    const completed = flight;
    flight = null;
    if (data.key !== completed.key || !desired || (data.key !== desired.key
      && !compatible(completed, desired))) { count('predictionStale'); return; }
    if (data.error) { failedKey = data.key; count('predictionErrors'); return; }
    result = { ...data.result, key: completed.key, contactBallId: completed.contactBallId, baseKey: completed.baseKey, continuityKey: completed.continuityKey };
    count('predictionAccepted'); onResult(result);
  };
  worker.onerror = error => fail(error.message || error);
  return {
    setDesired,
    pump(time = now()) {
      if (destroyed || !desired || flight || result?.key === desired.key || desired.key === failedKey || time - lastSent < intervalMs) return;
      flight = { key: desired.key, baseKey: desired.baseKey, continuityKey: desired.continuityKey, contactBallId: desired.contactBallId, id: ++sequence, started: now() }; lastSent = time;
      try { const {build,...request}=desired;const payload=build?build():request.payload;worker.postMessage({ ...request,payload,requestId: flight.id }); count('predictionSent'); }
      catch (error) { fail(error); }
    },
    diagnostics: () => ({ desiredKey: desired?.key ?? null, inFlight: Boolean(flight),
      pending: Boolean(desired && desired.key !== flight?.key && result?.key !== desired.key && desired.key !== failedKey),
      failedKey, hasResult: Boolean(result) }),
    destroy() { destroyed = true; worker.onmessage = worker.onerror = null; worker.terminate(); flight = desired = result = null; },
  };
}
