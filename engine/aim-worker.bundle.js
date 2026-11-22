(() => {

  const modules = {
0: [function(require, module, exports) {
const { predictRebound } = require('../../apps/three-game/src/core/aim/reboundPrediction');
const { predictAimPath } = require('../../apps/three-game/src/core/aim/aimPrediction');
self.onmessage = ({ data }) => {
  const start = performance.now();
  try { const result = data.payload.predictionKind === 'rebound' ? predictRebound(data.payload) : predictAimPath(data.payload);
    self.postMessage({ key: data.key, requestId: data.requestId, result, computeMs: performance.now() - start }); }
  catch (error) { self.postMessage({ key: data.key, requestId: data.requestId, computeMs: performance.now() - start, error: error.message }); }
};

}, {"../../apps/three-game/src/core/aim/reboundPrediction":1,"../../apps/three-game/src/core/aim/aimPrediction":76}, "assets/three-table-preview/aim-worker.cjs"],
1: [function(require, module, exports) {
const Runtime = require('../../runtime/shotRuntime');
const point = p => ({ x: p.x, y: p.y });
function matchesExpectedCushion(payload, event) {
  if (!payload.expectedColliderId || event.colliderId === payload.expectedColliderId) return true;
  // At a shared arc vertex the ray and swept sphere may select opposite adjacent
  // segments. Accept that same physical joint, never a different jaw or rail.
  if (payload.expectedColliderRole !== 'pocket-lip' || event.type !== 'ball-hit-pocket-jaw') return false;
  const expected = /^(.*):segment-(\d+)$/.exec(payload.expectedColliderId);
  const actual = /^(.*):segment-(\d+)$/.exec(event.colliderId || '');
  return Boolean(expected && actual && expected[1] === actual[1]
    && Math.abs(Number(expected[2]) - Number(actual[2])) <= 1);
}
function createReboundInput(payload, contact) {
  const { power, ...shotBase } = payload.shot;
  const baseKey = JSON.stringify({ kind: 'rebound', colliderId: contact.line?.id,
    balls: payload.balls, cueBallId: payload.cueBallId, tableBoundaryId: payload.tableBoundaryId,
    physicsOverrides: payload.physicsOverrides, shot: shotBase });
  const continuityKey = JSON.stringify({ kind: 'rebound', colliderId: contact.line?.id,
    balls: payload.balls, cueBallId: payload.cueBallId, tableBoundaryId: payload.tableBoundaryId,
    physicsOverrides: payload.physicsOverrides });
  return { key: JSON.stringify({ baseKey, power }), baseKey, continuityKey, power,
    payload: { ...payload, predictionKind: 'rebound', expectedColliderId: contact.line?.id, expectedColliderRole: contact.line?.role } };
}
function predictRebound(payload) {
  const { state, physics } = Runtime.startShot({ ...payload, captureFrames: false });
  const cue = state.balls.find(b => b.id === state.cueBallId);
  const result = { kind: 'rebound', hit: false, path: [], travelledMm: 0 };
  const dt = physics.params.fixedDt;
  for (let i = 0; i < Math.ceil(18 / dt); i++) {
    const before = point(cue.pos), incoming = point(cue.vel);
    physics.step(state, dt);
    const events = (state.physicsEvents || []).filter(e => e.ballId === cue.id || e.ballAId === cue.id || e.ballBId === cue.id);
    if (!result.hit && events.length) {
      const event = events[0];
      // Curved pocket jaws are cushion contacts too; ball-first shots remain excluded.
      if (!['ball-hit-rail', 'ball-hit-pocket-jaw'].includes(event.type) || !matchesExpectedCushion(payload, event)) break;
      result.hit = true; result.colliderId = event.colliderId;
      result.aimColliderId = payload.expectedColliderId || event.colliderId;
      result.path.push(event.point && event.normal
        ? { x: event.point.x + event.normal.x * cue.radius, y: event.point.y + event.normal.y * cue.radius }
        : before);
      result.incomingDirection = incoming; result.normal = event.normal;
      result.cueDistanceMm = Math.hypot(result.path[0].x - payload.balls.find(b=>b.id===cue.id).pos.x,
        result.path[0].y - payload.balls.find(b=>b.id===cue.id).pos.y);
      if (events.length > 1) break;
    } else if (result.hit && events.length) break;
    if (cue.potted) break;
    if (result.hit) {
      const previous = result.path.at(-1);
      const length = Math.hypot(cue.pos.x - previous.x, cue.pos.y - previous.y);
      if (length > 0.001) {
        const fraction = Math.min(1, (400 - result.travelledMm) / length);
        result.path.push({ x: previous.x + (cue.pos.x-previous.x)*fraction, y: previous.y+(cue.pos.y-previous.y)*fraction });
        result.travelledMm += length * fraction;
      }
      if (result.travelledMm >= 400) break;
    }
    if (!physics.isTableMoving(state)) break;
  }
  return result;
}
module.exports = { createReboundInput, predictRebound };

}, {"../../runtime/shotRuntime":2}, "apps/three-game/src/core/aim/reboundPrediction.js"],
2: [function(require, module, exports) {
const { BALL_KIND, COLOR_ORDER } = require('../config/constants');
const { BALL_COLORS } = require('../core/model/ballSpec');
const { createTableMarkings } = require('../core/model/tablePresentation');
const { colorSpot, createOpeningRackLayout } = require('../core/model/spotModel');
const { createTableModel } = require('../core/model/tableModel');
const { createTableColliderSet } = require('../core/model/tableColliderSet');
const {
  TABLE_BOUNDARY_PRESET_IDS,
  getTableBoundaryById,
} = require('../core/model/tableBoundaryPresets');
const { createBallState } = require('../core/state/ballState');
const {
  resetBallToTable,
  respotPottedColorBalls,
  respotPottedCueBallInD,
} = require('../core/rules/respot');
const {
  MISS_MODE,
  RULE_PHASE,
  applyPendingDecision,
  createDefaultRuleSettings,
  createInitialRuleState,
  createTimeoutFoul,
  prepareNextShotState,
  resolveShot,
} = require('../core/rules/rulesEngine');
const { createPhysicsEngine } = require('../core/physics/physicsEngine');
const { applyShot } = require('../core/physics/shotResolver');
const {
  assessCrowdReaction,
  createImmediateCrowdReactionTracker,
} = require('../audio/crowdReaction');

function normalize(vector) {
  const length = Math.hypot(vector.x, vector.y);
  if (length <= 0.000001) {
    return { x: 1, y: 0 };
  }
  return {
    x: vector.x / length,
    y: vector.y / length,
  };
}

function round(value, digits = 6) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function cloneVector2(vector) {
  return { x: vector.x, y: vector.y };
}

function cloneVector3(vector) {
  return { x: vector.x, y: vector.y, z: vector.z };
}

function cloneQuaternion(q) {
  return { x: q.x, y: q.y, z: q.z, w: q.w };
}

function colorSpotForKind(kind, fallback) {
  return COLOR_ORDER.includes(kind) ? colorSpot(kind) : fallback;
}

function inputOrientation(value) {
  if (!value || typeof value !== 'object') return null;
  const x = Number(value.x);
  const y = Number(value.y);
  const z = Number(value.z);
  const w = Number(value.w);
  if (![x, y, z, w].every(Number.isFinite)) return null;
  const length = Math.hypot(x, y, z, w);
  if (length <= 0.000001) return null;
  return { x: x / length, y: y / length, z: z / length, w: w / length };
}

function inputVector2(value, fallback = { x: 0, y: 0 }) {
  return {
    x: Number.isFinite(Number(value?.x)) ? Number(value.x) : fallback.x,
    y: Number.isFinite(Number(value?.y)) ? Number(value.y) : fallback.y,
  };
}

function inputVector3(value, fallback = { x: 0, y: 0, z: 0 }) {
  return {
    x: Number.isFinite(Number(value?.x)) ? Number(value.x) : fallback.x,
    y: Number.isFinite(Number(value?.y)) ? Number(value.y) : fallback.y,
    z: Number.isFinite(Number(value?.z)) ? Number(value.z) : fallback.z,
  };
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function createRuntimePlayers(players = []) {
  const fallback = [
    { id: 'p1', name: '玩家 A', score: 0, break: 0, frames: 0 },
    { id: 'p2', name: '玩家 B', score: 0, break: 0, frames: 0 },
  ];
  const source = Array.isArray(players) && players.length >= 2 ? players : fallback;
  return source.slice(0, 2).map((player, index) => ({
    id: player.id || fallback[index].id,
    name: player.name || fallback[index].name,
    score: Number(player.score) || 0,
    break: Number(player.break) || 0,
    frames: Number(player.frames) || 0,
  }));
}

function createRuntimeRuleSettings(settings = {}) {
  const missMode = Object.values(MISS_MODE).includes(settings.missMode)
    ? settings.missMode
    : MISS_MODE.LIMITED_THREE;
  return createDefaultRuleSettings({
    ...settings,
    missMode,
    missLimit: missMode === MISS_MODE.LIMITED_THREE
      ? Math.max(1, Math.round(Number(settings.missLimit) || 3))
      : settings.missLimit,
  });
}

function createRuntimeRuleState(ruleState = {}) {
  return {
    ...createInitialRuleState(),
    ...(ruleState || {}),
    pendingDecision: ruleState?.pendingDecision || null,
    missSequence: {
      count: Number(ruleState?.missSequence?.count) || 0,
      originalShotId: ruleState?.missSequence?.originalShotId || null,
    },
    touchingBallIds: Array.isArray(ruleState?.touchingBallIds) ? ruleState.touchingBallIds : [],
    touchingBalls: Array.isArray(ruleState?.touchingBalls) ? ruleState.touchingBalls : [],
  };
}

function serializeBall(ball) {
  return {
    id: ball.id,
    kind: ball.kind,
    color: ball.color,
    radius: round(ball.radius, 4),
    potted: Boolean(ball.potted),
    pocketMode: ball.pocketMode,
    pocketEntry: ball.pocketEntry ? cloneJson(ball.pocketEntry) : null,
    pocketMotion: serializePocketMotion(ball.pocketMotion),
    pos: cloneVector2(ball.pos),
    vel: cloneVector2(ball.vel),
    omega: cloneVector3(ball.omega),
    orientation: cloneQuaternion(ball.orientation),
  };
}

function serializeEvent(event) {
  return {
    type: event.type,
    ballId: event.ballId,
    ballAId: event.ballAId,
    ballBId: event.ballBId,
    pocketId: event.pocketId,
    potReason: event.potReason,
    colliderId: event.colliderId,
    point: event.point ? cloneVector2(event.point) : undefined,
    pocketCenter: event.pocketCenter ? cloneVector2(event.pocketCenter) : undefined,
    entryHeight: event.entryHeight,
    entryVerticalVelocity: event.entryVerticalVelocity,
    entryPosition: event.entryPosition ? cloneVector2(event.entryPosition) : undefined,
    entryVelocity: event.entryVelocity ? cloneVector2(event.entryVelocity) : undefined,
    entryAngularVelocity: event.entryAngularVelocity ? cloneVector3(event.entryAngularVelocity) : undefined,
    approachSpeedMmS: event.approachSpeedMmS,
    approachRadiusMm: event.approachRadiusMm,
    pocketEntrySpeedMmS: event.pocketEntrySpeedMmS,
    impactSpeed: Number.isFinite(event.impactSpeed) ? round(event.impactSpeed, 3) : undefined,
  };
}

function serializePocketMotion(motion) {
  if (!motion || motion.phase === 'done') {
    return null;
  }

  return {
    pocketId: motion.pocketId,
    phase: motion.phase,
    renderAlpha: round(motion.renderAlpha ?? 1, 4),
    renderScale: round(motion.renderScale ?? 1, 4),
    shadowAlpha: round(motion.shadowAlpha ?? 1, 4),
  };
}

function captureFrame(state, time, events = []) {
  return {
    t: round(time, 4),
    balls: state.balls.map(serializeBall),
    events: events.map(serializeEvent),
  };
}

function eventBallKind(state, event) {
  const ball = state.balls.find((candidate) => candidate.id === event.ballId);
  return ball?.kind || '';
}

function shotPottedKinds(state, events) {
  return (events || [])
    .filter((event) => event.type === 'ball-potted')
    .map((event) => eventBallKind(state, event))
    .filter(Boolean);
}

function usesTemporaryScenarioRules(payload) {
  return payload.matchRules === false && payload.scenarioCategory === 'match';
}

function usesTestFieldRules(payload) {
  return payload.testFieldRules === true;
}

function normalizeTestFieldRuleState(ruleState, balls) {
  const current = createRuntimeRuleState(ruleState);
  const redsRemaining = (balls || []).some((ball) => (
    ball.kind === BALL_KIND.RED && !ball.potted
  ));
  if (redsRemaining || current.phase !== RULE_PHASE.REDS) return current;
  return {
    ...current,
    phase: RULE_PHASE.COLOR_CHOICE,
    targetColorKind: null,
    colorAfterLastRedDue: true,
  };
}

function respotTestFieldCueBall(state, payload) {
  const cueBall = state.balls.find((ball) => ball.id === state.cueBallId || ball.kind === BALL_KIND.CUE);
  if (!cueBall?.potted) return [];
  const sourceCue = (payload.balls || []).find((ball) => (
    ball.id === state.cueBallId || ball.kind === BALL_KIND.CUE
  ));
  const pos = sourceCue?.pos || { x: 0, y: 0 };
  resetBallToTable(cueBall, pos);
  return [{ type: 'cue-ball-respotted', ballId: cueBall.id, pos: { ...pos } }];
}

function pottedColorKinds(state, events) {
  const kinds = shotPottedKinds(state, events);
  return kinds.filter((kind) => COLOR_ORDER.includes(kind));
}

function shouldRespotColorsForTemporaryScenario(state, events, payload) {
  if (!usesTemporaryScenarioRules(payload)) return false;
  const pottedColors = pottedColorKinds(state, events);
  if (pottedColors.length === 0) return false;
  return state.balls.some((ball) => ball.kind === BALL_KIND.RED && !ball.potted);
}

function nextTemporaryScenarioRuleState(state, events, payload) {
  if (!usesTemporaryScenarioRules(payload)) {
    return payload.snookerRuleState || { temporaryRule: 'free' };
  }

  const pottedKinds = shotPottedKinds(state, events);
  const redsRemaining = state.balls.some((ball) => ball.kind === BALL_KIND.RED && !ball.potted);
  const pottedRed = pottedKinds.includes(BALL_KIND.RED);
  const pottedColor = pottedKinds.some((kind) => COLOR_ORDER.includes(kind));
  const previousDue = Boolean(payload.snookerRuleState?.colorAfterLastRedDue);
  const colorAfterLastRedDue = !redsRemaining && (
    (previousDue && !pottedColor)
    || (pottedRed && !pottedColor)
  );

  return {
    ...(payload.snookerRuleState || {}),
    temporaryRule: 'one-red-one-color',
    phase: redsRemaining ? 'reds' : 'clearance',
    colorAfterLastRedDue,
  };
}

function shouldRespotColorsForShot(state, events, payload) {
  if (usesTestFieldRules(payload)) {
    const pottedKinds = shotPottedKinds(state, events);
    const redsRemaining = state.balls.some((ball) => ball.kind === BALL_KIND.RED && !ball.potted);
    return pottedKinds.some((kind) => COLOR_ORDER.includes(kind)) && redsRemaining;
  }
  if (payload.matchRules === false) return shouldRespotColorsForTemporaryScenario(state, events, payload);
  const pottedKinds = shotPottedKinds(state, events);
  const redsRemaining = state.balls.some((ball) => ball.kind === BALL_KIND.RED && !ball.potted);
  return redsRemaining
    || Boolean(payload.snookerRuleState?.colorAfterLastRedDue)
    || (pottedKinds.includes(BALL_KIND.RED) && redsRemaining);
}

function nextSnookerRuleState(state, events, payload) {
  if (usesTestFieldRules(payload) || payload.matchRules === false) {
    return {
      ...nextTemporaryScenarioRuleState(state, events, {
        ...payload,
        matchRules: false,
        scenarioCategory: 'match',
      }),
      pendingDecision: null,
      requiresNomination: false,
      nominationReason: null,
      foul: false,
    };
  }
  const pottedKinds = shotPottedKinds(state, events);
  const redsRemaining = state.balls.some((ball) => ball.kind === BALL_KIND.RED && !ball.potted);
  const pottedColor = pottedKinds.some((kind) => COLOR_ORDER.includes(kind));
  const pendingBefore = Boolean(payload.snookerRuleState?.colorAfterLastRedDue);
  return {
    colorAfterLastRedDue: pendingBefore
      ? !pottedColor
      : pottedKinds.includes(BALL_KIND.RED) && !redsRemaining,
  };
}

function buildState(payload) {
  const table = createTableModel();
  const tableBoundary = getTableBoundaryById(payload.tableBoundaryId);
  const tableColliderSet = createTableColliderSet(table, { boundary: tableBoundary });
  table.tableBoundaryId = tableColliderSet.boundaryId;
  table.throatWidthMm = { ...tableColliderSet.throatWidthMm };
  table.mouthWidthMm = { ...tableColliderSet.mouthWidthMm };
  const balls = (payload.balls || []).map((ball) => {
    const pos = {
      x: Number(ball.pos?.x) || 0,
      y: Number(ball.pos?.y) || 0,
    };
    const stateBall = createBallState(
      ball.id,
      ball.kind || BALL_KIND.RED,
      pos,
      colorSpotForKind(ball.kind, pos),
    );
    const orientation = inputOrientation(ball.orientation);
    if (orientation) stateBall.orientation = orientation;
    if (ball.radius !== undefined && Number.isFinite(Number(ball.radius))) {
      stateBall.radius = Number(ball.radius);
    }
    if (ball.color !== undefined) stateBall.color = ball.color;
    if (ball.value !== undefined && Number.isFinite(Number(ball.value))) {
      stateBall.value = Number(ball.value);
    }
    if (ball.mass !== undefined && Number.isFinite(Number(ball.mass))) {
      stateBall.mass = Number(ball.mass);
    }
    if (ball.inertia !== undefined && Number.isFinite(Number(ball.inertia))) {
      stateBall.inertia = Number(ball.inertia);
    }
    const prevPos = inputVector2(ball.prevPos || ball.previousPosition, pos);
    stateBall.prevPos = prevPos;
    stateBall.previousPosition = stateBall.prevPos;
    const velocity = inputVector2(ball.vel || ball.velocity);
    stateBall.vel = velocity;
    stateBall.velocity = stateBall.vel;
    const angularVelocity = inputVector3(ball.omega || ball.angularVelocity);
    stateBall.omega = angularVelocity;
    stateBall.angularVelocity = stateBall.omega;
    if (ball.spot) stateBall.spot = inputVector2(ball.spot, stateBall.spot);
    stateBall.contactMode = ball.contactMode || stateBall.contactMode;
    stateBall.pocketMode = ball.pocketMode || stateBall.pocketMode;
    stateBall.pocketEntry = ball.pocketEntry ? cloneJson(ball.pocketEntry) : null;
    stateBall.potted = Boolean(ball.potted);
    stateBall.isSliding = Boolean(ball.isSliding);
    stateBall.potting = ball.potting ? cloneJson(ball.potting) : null;
    stateBall.pocketState = ball.pocketState ? cloneJson(ball.pocketState) : null;
    stateBall.pocketMotion = ball.pocketMotion ? cloneJson(ball.pocketMotion) : null;
    return stateBall;
  });

  const state = {
    table,
    tableColliderSet,
    pockets: tableColliderSet.pockets,
    balls,
    cueBallId: payload.cueBallId || 'cue',
    players: createRuntimePlayers(payload.players),
    currentPlayerId: 'p1',
    targetMode: 'red',
    shot: null,
    aim: null,
    activeShot: null,
    lastShotRecord: null,
    physicsEvents: [],
    pocketWorld: {
      accumulator: 0,
      time: 0,
    },
    frameOver: Boolean(payload.frameOver),
    matchOver: Boolean(payload.matchOver),
    shotSeq: Number(payload.shotSeq) || 0,
  };

  state.currentPlayerId = state.players.some((player) => player.id === payload.currentPlayerId)
    ? payload.currentPlayerId
    : state.players[0].id;
  state.ruleSettings = createRuntimeRuleSettings(payload.ruleSettings);
  state.ruleState = usesTestFieldRules(payload)
    ? normalizeTestFieldRuleState(payload.ruleState || payload.snookerRuleState, balls)
    : createRuntimeRuleState(payload.ruleState || payload.snookerRuleState);
  prepareNextShotState(state);
  return state;
}

function normalizeInitialMotionEntries(initialMotion) {
  if (!initialMotion) return [];
  if (Array.isArray(initialMotion)) return initialMotion;
  if (Array.isArray(initialMotion.balls)) return initialMotion.balls;
  return [initialMotion];
}

function setInitialBallMotion(state, initialMotion) {
  const entries = normalizeInitialMotionEntries(initialMotion);
  entries.forEach((entry) => {
    const ball = state.balls.find((candidate) => candidate.id === entry.ballId || candidate.id === entry.id);
    if (!ball) return;
    const velocity = {
      x: Number(entry.velocity?.x) || 0,
      y: Number(entry.velocity?.y) || 0,
    };
    ball.vel = velocity;
    ball.velocity = ball.vel;

    const omega = entry.omega
      ? {
        x: Number(entry.omega.x) || 0,
        y: Number(entry.omega.y) || 0,
        z: Number(entry.omega.z) || 0,
      }
      : (entry.pureRolling === false ? { x: 0, y: 0, z: 0 } : {
        x: -velocity.y / (ball.radius || 26.25),
        y: velocity.x / (ball.radius || 26.25),
        z: 0,
      });
    ball.omega = omega;
    ball.angularVelocity = ball.omega;
    ball.contactMode = entry.pureRolling === false ? 'sliding' : 'rolling';
    ball.isSliding = entry.pureRolling === false;
  });
}

function startShot(payload) {
  const state = buildState(payload);
  const physicsOverrides = payload.physicsOverrides || {};
  const physics = createPhysicsEngine({
    targetPhysicsHz: Number(payload.physicsHz) || 120,
    ...physicsOverrides,
  });
  const shot = payload.shot || {};
  const direction = normalize(shot.direction || { x: 1, y: 0 });
  const power = Math.max(0, Math.min(100, Number(shot.power) || 0));
  const tipOffset = {
    x: Math.max(-0.8, Math.min(0.8, Number(shot.tipOffset?.x) || 0)),
    y: Math.max(-0.8, Math.min(0.8, Number(shot.tipOffset?.y) || 0)),
  };
  const cueBall = state.balls.find((ball) => ball.id === state.cueBallId);
  if (!cueBall) {
    const error = new Error('缺少母球 cue');
    error.statusCode = 400;
    throw error;
  }

  const captureFrames = payload.captureFrames !== false;
  const captureFps = Math.max(
    24,
    Math.min(60, Number(payload.captureFps) || (state.balls.length >= 16 ? 30 : 60)),
  );
  const startEvent = payload.initialMotion
    ? { type: 'motion-start', ballId: state.cueBallId }
    : { type: 'shot-start', ballId: state.cueBallId };

  if (payload.initialMotion) {
    setInitialBallMotion(state, payload.initialMotion);
  } else {
    applyShot(state, {
      direction,
      power,
      tipOffset,
      verticalAngle: Math.max(0,Math.min(90,Number(shot.verticalAngle)||0)),
      params: physics.params,
    });
  }

  const runtime = {
    state,
    physics,
    elapsed: 0,
    accumulator: 0,
    maxSeconds: Math.max(0.5, Math.min(30, Number(payload.maxSeconds) || 18)),
    stopWhenSettled: payload.stopWhenSettled !== false,
    captureFrames,
    captureDt: 1 / captureFps,
    nextCaptureAt: 0,
    events: [],
    frames: [],
    payload,
    physicsOverrides,
    settled: false,
    finalized: false,
  };
  if (captureFrames) {
    runtime.frames.push(captureFrame(state, 0, [startEvent]));
  }
  runtime.nextCaptureAt = runtime.captureDt;
  return runtime;
}

function stepShot(runtime, renderDt, options = {}) {
  if (!runtime || runtime.settled) {
    return runtime;
  }

  const fixedDt = runtime.physics.params.fixedDt;
  const rawDt = Math.max(0, Number(renderDt) || 0);
  const catchUp = Boolean(options.catchUp);
  const remainingDt = Math.max(0, runtime.maxSeconds - runtime.elapsed + fixedDt);
  runtime.accumulator += catchUp
    ? Math.min(rawDt, remainingDt)
    : Math.min(0.1, rawDt);
  const maxStepsPerFrame = catchUp
    ? Math.min(20000, Math.ceil(runtime.accumulator / fixedDt) + 1)
    : runtime.physics.params.maxFrameSteps || 12;
  let steps = 0;

  while (runtime.accumulator >= fixedDt && steps < maxStepsPerFrame && !runtime.settled) {
    runtime.physics.step(runtime.state, fixedDt);
    runtime.elapsed += fixedDt;
    runtime.accumulator -= fixedDt;
    steps += 1;

    const frameEvents = runtime.state.physicsEvents || [];
    // Optional display observer; local test field only, no serialized settings.
    options.onPhysicsStep?.(runtime.state);
    runtime.events.push(...frameEvents.map((event) => ({
      ...serializeEvent(event),
      t: round(runtime.elapsed, 4),
    })));

    if (runtime.captureFrames && runtime.elapsed + 0.000001 >= runtime.nextCaptureAt) {
      runtime.frames.push(captureFrame(runtime.state, runtime.elapsed, frameEvents));
      while (runtime.nextCaptureAt <= runtime.elapsed + 0.000001) {
        runtime.nextCaptureAt += runtime.captureDt;
      }
    }

    if (
      runtime.stopWhenSettled
      && runtime.elapsed > fixedDt * 8
      && !runtime.physics.isTableMoving(runtime.state)
    ) {
      runtime.settled = true;
    }
    if (runtime.elapsed >= runtime.maxSeconds) {
      // The live client stops advancing a settled runtime. Leaving residual
      // velocity here would therefore make physics.isTableMoving() stay true
      // forever and prevent the shot from being finalized. The time limit is
      // a safety boundary, so make the boundary state genuinely settled.
      runtime.state.balls.forEach((ball) => {
        ball.vel = { x: 0, y: 0 };
        ball.velocity = ball.vel;
        ball.omega = { x: 0, y: 0, z: 0 };
        ball.angularVelocity = ball.omega;
        ball.isSliding = false;
        ball.contactMode = 'rolling';
        if (ball.pocketMotion && ball.pocketMotion.phase !== 'done') {
          ball.pocketMotion = {
            ...ball.pocketMotion,
            phase: 'done',
            renderAlpha: 0,
            renderScale: 0,
            shadowAlpha: 0,
          };
        }
      });
      runtime.settled = true;
    }
  }

  return runtime;
}

function finalizeShot(runtime) {
  if (!runtime || runtime.finalized) {
    return runtime?.result || null;
  }

  if (
    runtime.captureFrames
    && runtime.frames[runtime.frames.length - 1]?.t < round(runtime.elapsed, 4)
  ) {
    runtime.frames.push(captureFrame(runtime.state, runtime.elapsed, []));
  }

  let respotEvents = [];
  let ruleResult = null;
  let crowdReaction = null;
  let snookerRuleState = runtime.state.ruleState || createInitialRuleState();

  if (usesTestFieldRules(runtime.payload)) {
    if (runtime.state.activeShot) {
      const resolution = resolveShot(runtime.state, runtime.state.activeShot, {
        detectFouls: runtime.payload.testFieldFoulRulesEnabled,
        respotColors: runtime.payload.testFieldColorRespotEnabled,
        respotCueBall: false,
      });
      ruleResult = resolution.result;
      respotEvents = [
        ...(resolution.events || []),
        ...respotTestFieldCueBall(runtime.state, runtime.payload),
      ];
      if (ruleResult) ruleResult.events = respotEvents;
      snookerRuleState = runtime.state.ruleState;
      crowdReaction = assessCrowdReaction(runtime.state, runtime.state.activeShot, ruleResult);
    }
  } else if (runtime.payload.matchRules === false) {
    respotEvents = [
      ...(shouldRespotColorsForShot(runtime.state, runtime.events, runtime.payload) ? respotPottedColorBalls(runtime.state) : []),
      ...(usesTemporaryScenarioRules(runtime.payload) ? respotPottedCueBallInD(runtime.state) : []),
    ];
    snookerRuleState = nextSnookerRuleState(runtime.state, runtime.events, runtime.payload);
    if (runtime.state.activeShot) {
      crowdReaction = assessCrowdReaction(runtime.state, runtime.state.activeShot, null);
    }
  } else if (runtime.state.activeShot) {
    const resolution = resolveShot(runtime.state, runtime.state.activeShot);
    ruleResult = resolution.result;
    respotEvents = resolution.events || [];
    snookerRuleState = runtime.state.ruleState;
    crowdReaction = assessCrowdReaction(runtime.state, runtime.state.activeShot, ruleResult);
  }

  if (respotEvents.length > 0) {
    runtime.events.push(...respotEvents.map((event) => ({
      ...serializeEvent(event),
      t: round(runtime.elapsed, 4),
    })));
    if (runtime.captureFrames) {
      runtime.frames.push(captureFrame(runtime.state, runtime.elapsed, respotEvents));
    }
  }

  if (!runtime.captureFrames) {
    runtime.frames.push(captureFrame(runtime.state, runtime.elapsed, respotEvents));
  }

  runtime.finalized = true;
  runtime.result = {
    duration: round(runtime.elapsed, 4),
    physicsHz: runtime.physics.params.targetPhysicsHz,
    captureFps: round(1 / runtime.captureDt, 3),
    frameCount: runtime.frames.length,
    physicsOverrides: cloneJson(runtime.physicsOverrides || {}),
    snookerRuleState,
    ruleState: cloneJson(runtime.state.ruleState || snookerRuleState),
    ruleSettings: cloneJson(runtime.state.ruleSettings || createDefaultRuleSettings()),
    ruleResult,
    crowdReaction,
    players: cloneJson(runtime.state.players || []),
    currentPlayerId: runtime.state.currentPlayerId,
    frameOver: Boolean(runtime.state.frameOver),
    matchOver: Boolean(runtime.state.matchOver),
    events: runtime.events,
    frames: runtime.frames,
  };
  return runtime.result;
}

function simulateShot(payload) {
  const runtime = startShot({
    ...payload,
    maxSeconds: Object.prototype.hasOwnProperty.call(payload, 'maxSeconds') ? payload.maxSeconds : 16,
  });
  while (!runtime.settled) {
    stepShot(runtime, runtime.physics.params.fixedDt, { catchUp: true });
  }
  return finalizeShot(runtime);
}

function currentFrame(runtime) {
  if (!runtime) return null;
  return captureFrame(runtime.state, runtime.elapsed, runtime.state.physicsEvents || []);
}

function serializeRuleDrivenState(state, extra = {}) {
  return {
    ...extra,
    balls: state.balls.map(serializeBall),
    players: cloneJson(state.players || []),
    currentPlayerId: state.currentPlayerId,
    ruleState: cloneJson(state.ruleState || createInitialRuleState()),
    ruleSettings: cloneJson(state.ruleSettings || createDefaultRuleSettings()),
    frameOver: Boolean(state.frameOver),
    matchOver: Boolean(state.matchOver),
  };
}

function applyRuleDecision(payload) {
  const state = buildState(payload);
  const result = applyPendingDecision(state, payload.decision);
  return serializeRuleDrivenState(state, {
    applied: result.applied,
    reason: result.reason || null,
  });
}

function resolveTimeout(payload) {
  const state = buildState(payload);
  const timeout = createTimeoutFoul(state, state.currentPlayerId);
  return serializeRuleDrivenState(state, {
    ruleResult: timeout.result,
  });
}

function serializeLine(line) {
  return {
    id: line.id,
    role: line.role,
    pocketId: line.pocketId,
    start: cloneVector2(line.start),
    end: cloneVector2(line.end),
  };
}

function serializePolyline(polyline) {
  return {
    id: polyline.id,
    role: polyline.role,
    pocketId: polyline.pocketId,
    points: (polyline.points || []).map(cloneVector2),
  };
}

function serializeTablePayload(tableBoundaryId = TABLE_BOUNDARY_PRESET_IDS.PRO_MATCH_84) {
  const table = createTableModel();
  const boundary = getTableBoundaryById(tableBoundaryId);
  const tableColliderSet = createTableColliderSet(table, { boundary });

  return {
    id: tableBoundaryId,
    name: boundary.name,
    playAreaMm: table.playAreaMm,
    outerBoundsMm: table.physicalOuterBoundsMm,
    markings: createTableMarkings(table),
    rails: tableColliderSet.rails.map(serializeLine),
    pocketLips: tableColliderSet.pocketLips.flatMap((lip) => (
      lip.segments.map(serializeLine)
    )),
    pocketDropEdges: (tableColliderSet.pocketDropEdges || []).map(serializePolyline),
    pockets: tableColliderSet.pockets.map((pocket) => ({
      id: pocket.id,
      type: pocket.type,
      center: cloneVector2(pocket.center),
      candidateRadius: round(pocket.candidateRadius, 4),
      captureRadius: round(pocket.capture.radius, 4),
      mouthWidthMm: round(pocket.mouthWidthMm, 3),
      throatWidthMm: round(pocket.throatWidthMm, 3),
    })),
  };
}

function createPlayableOpeningBalls() {
  let redIndex = 1;
  return createOpeningRackLayout().map((ball) => {
    let id = ball.kind;
    if (ball.kind === BALL_KIND.CUE) {
      id = 'cue';
    } else if (ball.kind === BALL_KIND.RED) {
      id = `red-${redIndex}`;
      redIndex += 1;
    }

    return {
      id,
      kind: ball.kind,
      color: BALL_COLORS[ball.kind],
      pos: cloneVector2(ball.pos),
    };
  });
}

function getTestFieldTableData() {
  const tableBoundaryId = TABLE_BOUNDARY_PRESET_IDS.PRO_MATCH_84;
  return {
    activeTableBoundaryId: tableBoundaryId,
    table: serializeTablePayload(tableBoundaryId),
    defaultBalls: createPlayableOpeningBalls(),
    ballColors: { ...BALL_COLORS },
    cueAssets: {
      fullTexture: '/assets/images/cue/snooker-cue-texture.png',
      buttTexture: '/assets/images/cue/snooker-cue-butt-control.png',
      fullLengthMm: 1450,
      buttPreviewLengthMm: 500,
    },
    tableAssets: {
      clothTexture: '/assets/images/table/full-table-baked-static-visuals-v2-smooth.png',
      carpetTexture: '/assets/images/table/dark-gray-wool-carpet.png',
    },
    visualTuning: {
      defaults: {},
      initialValues: {
        cueTrajectoryVisible: true,
        physicalBoundaryVisible: false,
        cueBallAppearance: 'six-red-dots',
        cueBallRedDotRadiusRatio: 0.13333333333333333,
        tableCenterLightStrength: 0,
        tableCenterLightSize: 0.35,
        tableCushionShadowStrength: 0.1,
        tableCushionShadowRangeMm: 30,
        tablePocketJawShadowStrength: 0.1,
        tablePocketJawShadowRangeMm: 30,
        cueStickShadowOpacity: 0.36,
        cueStickShadowRangePx: 27,
        cueStickShadowStrength: 1.95,
        ballLightStrength: 1,
        ballLightOffsetScale: 1,
        ballLightSize: 1,
        ballShadowStrength: 1,
        ballShadowOffsetScale: 1,
        ballShadowSize: 1,
        ballHighlightStrength: 1,
        ballHighlightOffsetScale: 1,
        ballHighlightSize: 1,
        ballRimShadowStrength: 1,
      },
    },
    threeLineTuning: {
      defaults: {},
      initialValues: {
        cueLineColor: '#ffffff',
        cueLineAlpha: 0.8,
        cueLineWidthMm: 5,
        cutAngleCurvePower: 1,
        distanceCurvePower: 1,
        objectMode: 'cone',
        objectMaxDistanceMm: 4000,
        objectLineMinLengthMm: 0,
        objectLineMaxLengthMm: 1200,
        objectLineWidthMm: 5,
        objectConeMinLengthMm: 50,
        objectConeMaxLengthMm: 1000,
        objectConeMinAngleDeg: 1,
        objectConeMaxAngleDeg: 20,
        objectConeStartWidthMm: 10,
        objectColor: '#35e96d',
        objectAlpha: 0.9,
        cueBallMode: 'cone',
        cueBallLineMinLengthMm: 25,
        cueBallLineMaxLengthMm: 1200,
        cueBallLineWidthMm: 5,
        cueBallConeMinLengthMm: 100,
        cueBallConeMaxLengthMm: 3000,
        cueBallConeMinAngleDeg: 1,
        cueBallConeMaxAngleDeg: 15,
        cueBallConeStartWidthMm: 5,
        cueBallColor: '#f5f5ee',
        cueBallAlpha: 0.8,
        cueBallRedOverlayEnabled: true,
        cueBallRedColor: '#ff3b30',
        cueBallRedAlpha: 0.8,
        ghostBallLineWidthMm: 5,
        ghostBallFillColor: '#ffffff',
        ghostBallFillAlpha: 0.3,
      },
    },
    matchRulesEnabled: true,
    ruleSettings: createDefaultRuleSettings(),
    ruleState: createInitialRuleState(),
    players: [
      { id: 'p1', name: '游客_6921', score: 0, break: 0, frames: 0 },
      { id: 'p2', name: '球友_1847', score: 0, break: 0, frames: 0 },
    ],
    currentPlayerId: 'p1',
  };
}

module.exports = {
  applyRuleDecision,
  currentFrame,
  finalizeShot,
  getTestFieldTableData,
  normalizeTestFieldRuleState,
  resolveTimeout,
  simulateShot,
  startShot,
  stepShot,
  createImmediateCrowdReactionTracker,
};

}, {"../config/constants":3,"../core/model/ballSpec":4,"../core/model/tablePresentation":5,"../core/model/spotModel":6,"../core/model/tableModel":7,"../core/model/tableColliderSet":13,"../core/model/tableBoundaryPresets":8,"../core/state/ballState":12,"../core/rules/respot":18,"../core/rules/rulesEngine":19,"../core/physics/physicsEngine":25,"../core/physics/shotResolver":67,"../audio/crowdReaction":72}, "apps/three-game/src/runtime/shotRuntime.js"],
3: [function(require, module, exports) {
const APP_NAME = '斯诺石狮三剑克';

const BALL_KIND = {
  CUE: 'cue',
  RED: 'red',
  YELLOW: 'yellow',
  GREEN: 'green',
  BROWN: 'brown',
  BLUE: 'blue',
  PINK: 'pink',
  BLACK: 'black',
};

const COLOR_ORDER = [
  BALL_KIND.YELLOW,
  BALL_KIND.GREEN,
  BALL_KIND.BROWN,
  BALL_KIND.BLUE,
  BALL_KIND.PINK,
  BALL_KIND.BLACK,
];

module.exports = {
  APP_NAME,
  BALL_KIND,
  COLOR_ORDER,
};

}, {}, "apps/three-game/src/config/constants.js"],
4: [function(require, module, exports) {
const { BALL_KIND } = require('../../config/constants');

const BALL_RADIUS_MM = 26.25;
const BALL_MASS = 1;
const BALL_INERTIA = (2 / 5) * BALL_MASS * BALL_RADIUS_MM * BALL_RADIUS_MM;

const BALL_VALUES = {
  [BALL_KIND.RED]: 1,
  [BALL_KIND.YELLOW]: 2,
  [BALL_KIND.GREEN]: 3,
  [BALL_KIND.BROWN]: 4,
  [BALL_KIND.BLUE]: 5,
  [BALL_KIND.PINK]: 6,
  [BALL_KIND.BLACK]: 7,
  [BALL_KIND.CUE]: 0,
};

const BALL_COLORS = {
  [BALL_KIND.CUE]: '#fff2bd',
  [BALL_KIND.RED]: '#e50012',
  [BALL_KIND.YELLOW]: '#f7a800',
  [BALL_KIND.GREEN]: '#08b976',
  [BALL_KIND.BROWN]: '#a86122',
  [BALL_KIND.BLUE]: '#0078bd',
  [BALL_KIND.PINK]: '#ff5a7d',
  [BALL_KIND.BLACK]: '#050505',
};

const BALL_SPEC = {
  radius: BALL_RADIUS_MM,
  mass: BALL_MASS,
  inertia: BALL_INERTIA,
};

function getBallSpec() {
  return { ...BALL_SPEC };
}

module.exports = {
  BALL_RADIUS_MM,
  BALL_MASS,
  BALL_INERTIA,
  BALL_VALUES,
  BALL_COLORS,
  BALL_SPEC,
  getBallSpec,
};

}, {"../../config/constants":3}, "apps/three-game/src/core/model/ballSpec.js"],
5: [function(require, module, exports) {
const { COLOR_ORDER } = require('../../config/constants');
const { BALL_COLORS } = require('./ballSpec');
const { colorSpot } = require('./spotModel');

function createTableMarkings(table) {
  const baulkLineHalfLength = table.baulkLineHalfLengthMm || table.halfPlayAreaMm.height;

  return {
    baulkLine: {
      start: { x: table.baulkLineMm, y: -baulkLineHalfLength },
      end: { x: table.baulkLineMm, y: baulkLineHalfLength },
    },
    dArea: {
      center: { x: table.baulkLineMm, y: 0 },
      radius: table.dRadiusMm,
    },
    colorSpots: COLOR_ORDER.map((kind) => ({
      kind,
      name: kind,
      color: BALL_COLORS[kind],
      pos: colorSpot(kind),
    })),
  };
}

function createPresentationTable(table, options = {}) {
  return {
    id: options.id || table.id || '',
    name: options.name || table.name || '',
    playAreaMm: table.playAreaMm,
    outerBoundsMm: table.physicalOuterBoundsMm || table.outerBoundsMm,
    markings: createTableMarkings(table),
  };
}

module.exports = {
  createPresentationTable,
  createTableMarkings,
};

}, {"../../config/constants":3,"./ballSpec":4,"./spotModel":6}, "apps/three-game/src/core/model/tablePresentation.js"],
6: [function(require, module, exports) {
const { BALL_KIND } = require('../../config/constants');
const { BALL_RADIUS_MM } = require('./ballSpec');
const {
  BAULK_LINE_X_MM,
  BLACK_SPOT_X_MM,
  D_RADIUS_MM,
  PINK_SPOT_X_MM,
} = require('./tableModel');

const CUE_BALL_BROWN_EDGE_CLEARANCE_MM = 20;
const OPENING_RACK_RED_EDGE_GAP_MM = 0.1;

function colorSpot(kind) {
  switch (kind) {
    case BALL_KIND.YELLOW:
      return { x: BAULK_LINE_X_MM, y: D_RADIUS_MM };
    case BALL_KIND.GREEN:
      return { x: BAULK_LINE_X_MM, y: -D_RADIUS_MM };
    case BALL_KIND.BROWN:
      return { x: BAULK_LINE_X_MM, y: 0 };
    case BALL_KIND.BLUE:
      return { x: 0, y: 0 };
    case BALL_KIND.PINK:
      return { x: PINK_SPOT_X_MM, y: 0 };
    case BALL_KIND.BLACK:
      return { x: BLACK_SPOT_X_MM, y: 0 };
    default:
      return { x: 0, y: 0 };
  }
}

function openingCueBallPosition(options = {}) {
  const baulkLineX = Number.isFinite(Number(options.baulkLineX))
    ? Number(options.baulkLineX)
    : BAULK_LINE_X_MM;
  const ballRadius = Number.isFinite(Number(options.ballRadius))
    ? Number(options.ballRadius)
    : BALL_RADIUS_MM;
  return {
    x: baulkLineX,
    y: ballRadius * 2 + CUE_BALL_BROWN_EDGE_CLEARANCE_MM,
  };
}

function createOpeningRackLayout() {
  const balls = [];
  let id = 0;

  balls.push({
    id: `ball-${id++}`,
    kind: BALL_KIND.CUE,
    pos: openingCueBallPosition(),
  });

  [
    BALL_KIND.YELLOW,
    BALL_KIND.GREEN,
    BALL_KIND.BROWN,
    BALL_KIND.BLUE,
    BALL_KIND.PINK,
    BALL_KIND.BLACK,
  ].forEach((kind) => {
    balls.push({
      id: `ball-${id++}`,
      kind,
      pos: colorSpot(kind),
    });
  });

  const apex = { x: PINK_SPOT_X_MM + BALL_RADIUS_MM * 2 + 5, y: 0 };
  const redCenterDistance = BALL_RADIUS_MM * 2 + OPENING_RACK_RED_EDGE_GAP_MM;
  const rowGap = redCenterDistance;
  const colGap = Math.sqrt(3) * redCenterDistance * 0.5;

  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col <= row; col += 1) {
      balls.push({
        id: `ball-${id++}`,
        kind: BALL_KIND.RED,
        pos: {
          x: apex.x + row * colGap,
          y: (col - row * 0.5) * rowGap,
        },
      });
    }
  }

  return balls;
}

function createOpeningRack() {
  const { createBallState } = require('../state/ballState');
  return createOpeningRackLayout().map((ball) => (
    createBallState(ball.id, ball.kind, ball.pos, ball.spot || ball.pos)
  ));
}

module.exports = {
  CUE_BALL_BROWN_EDGE_CLEARANCE_MM,
  OPENING_RACK_RED_EDGE_GAP_MM,
  colorSpot,
  createOpeningRack,
  createOpeningRackLayout,
  openingCueBallPosition,
};

}, {"../../config/constants":3,"./ballSpec":4,"./tableModel":7,"../state/ballState":12}, "apps/three-game/src/core/model/spotModel.js"],
7: [function(require, module, exports) {
const { getTableBoundaryById } = require('./tableBoundaryPresets');
const { STANDARD_TABLE } = require('./standardTableSpec');

const BOUNDARY = getTableBoundaryById();
const PLAY_AREA_MM = { width: STANDARD_TABLE.lengthMm, height: STANDARD_TABLE.widthMm };
const DEFAULT_PLAY_AREA_MM = { ...BOUNDARY.playAreaMm };
const HALF_PLAY_AREA_MM = {
  width: DEFAULT_PLAY_AREA_MM.width * 0.5,
  height: DEFAULT_PLAY_AREA_MM.height * 0.5,
};
const RAIL_WIDTH_MM = Math.min(BOUNDARY.playAreaOffsetMm.x, BOUNDARY.playAreaOffsetMm.y);
// Official snooker spot rules are inch-based: baulk line 29in from the baulk
// cushion, D radius 11.5in, black spot 12.75in from the top cushion, and the
// pink spot halfway between the blue spot and the top cushion.
const BAULK_LINE_FROM_LEFT_MM = STANDARD_TABLE.baulkFromBottomMm;
const D_RADIUS_MM = STANDARD_TABLE.dRadiusMm;
const BLACK_SPOT_FROM_TOP_MM = STANDARD_TABLE.blackFromTopMm;
const BAULK_LINE_X_MM = -HALF_PLAY_AREA_MM.width + BAULK_LINE_FROM_LEFT_MM;
const BAULK_LINE_HALF_LENGTH_MM = HALF_PLAY_AREA_MM.height;
const PINK_SPOT_X_MM = HALF_PLAY_AREA_MM.width * 0.5;
const BLACK_SPOT_X_MM = HALF_PLAY_AREA_MM.width - BLACK_SPOT_FROM_TOP_MM;
const TOP_UI_HEIGHT = 94;
const SCOREBOARD_HEIGHT = 118;
const RIGHT_CONTROL_WIDTH = 86;
const TABLE_REFERENCE_TEXTURE_PATH = 'assets/images/table/scene_reference_clean.png';
const REFERENCE_PLAY_RECT = {
  x: 256.5,
  y: 164.0,
  width: 1405.1,
  height: 700.0,
};

function createOuterSizeMm() {
  return {
    ...BOUNDARY.outerSizeMm,
  };
}

function createTableModel() {
  return {
    physicalModel: 'pro-match-84-parametric-boundary',
    rulesPlayAreaMm: { ...PLAY_AREA_MM },
    playAreaMm: { ...DEFAULT_PLAY_AREA_MM },
    halfPlayAreaMm: { ...HALF_PLAY_AREA_MM },
    railWidthMm: RAIL_WIDTH_MM,
    railWidthXMm: BOUNDARY.playAreaOffsetMm.x,
    railWidthYMm: BOUNDARY.playAreaOffsetMm.y,
    playAreaOffsetMm: { ...BOUNDARY.playAreaOffsetMm },
    outerSizeMm: createOuterSizeMm(),
    physicalOuterBoundsMm: { ...BOUNDARY.outerBoundsMm },
    throatWidthMm: { ...BOUNDARY.throatWidthMm },
    mouthWidthMm: { ...BOUNDARY.mouthWidthMm },
    baulkLineMm: BAULK_LINE_X_MM,
    baulkLineFromLeftMm: BAULK_LINE_FROM_LEFT_MM,
    baulkLineHalfLengthMm: BAULK_LINE_HALF_LENGTH_MM,
    dRadiusMm: D_RADIUS_MM,
    pinkSpotMm: PINK_SPOT_X_MM,
    blackSpotFromTopMm: BLACK_SPOT_FROM_TOP_MM,
    blackSpotMm: BLACK_SPOT_X_MM,
    topUiHeight: TOP_UI_HEIGHT,
    scoreboardHeight: SCOREBOARD_HEIGHT,
    rightControlWidth: RIGHT_CONTROL_WIDTH,
    referenceTexturePath: TABLE_REFERENCE_TEXTURE_PATH,
    referencePlayRect: { ...REFERENCE_PLAY_RECT },
  };
}

module.exports = {
  PLAY_AREA_MM,
  DEFAULT_PLAY_AREA_MM,
  HALF_PLAY_AREA_MM,
  RAIL_WIDTH_MM,
  BAULK_LINE_FROM_LEFT_MM,
  BAULK_LINE_X_MM,
  BAULK_LINE_HALF_LENGTH_MM,
  D_RADIUS_MM,
  PINK_SPOT_X_MM,
  BLACK_SPOT_FROM_TOP_MM,
  BLACK_SPOT_X_MM,
  TOP_UI_HEIGHT,
  SCOREBOARD_HEIGHT,
  RIGHT_CONTROL_WIDTH,
  TABLE_REFERENCE_TEXTURE_PATH,
  REFERENCE_PLAY_RECT,
  createOuterSizeMm,
  createTableModel,
};

}, {"./tableBoundaryPresets":8,"./standardTableSpec":9}, "apps/three-game/src/core/model/tableModel.js"],
8: [function(require, module, exports) {
const { STANDARD_TABLE } = require('./standardTableSpec');
const { PRO_MATCH_84_FULL_PHYSICAL_BOUNDARIES } = require('./proMatch84FullPhysicalBoundaries');
const TABLE_BOUNDARY_PRESET_IDS = {
  PRO_MATCH_84: 'pro-match-84',
};
const DEFAULT_TABLE_BOUNDARY_PRESET_ID = TABLE_BOUNDARY_PRESET_IDS.PRO_MATCH_84;
const PRO_MATCH_THROAT_WIDTH_MM = 84;

const PRO_MATCH_84_BOUNDARY = {
  id: TABLE_BOUNDARY_PRESET_IDS.PRO_MATCH_84,
  name: '职业赛 84mm',
  source: 'wpbsa-2005-6-parametric-runtime',
  coordinateSystem: 'center-origin-mm',
  playAreaMm: {
    width: STANDARD_TABLE.lengthMm,
    height: STANDARD_TABLE.widthMm,
  },
  outerSizeMm: {
    width: 3684.684885,
    height: 1989.532387,
  },
  outerBoundsMm: {
    minX: -1842.342442,
    maxX: 1842.342442,
    minY: -994.766193,
    maxY: 994.766193,
  },
  playAreaOffsetMm: {
    x: 302.263826,
    y: 227.654699,
  },
  straightRailBoundsMm: {
    minX: -STANDARD_TABLE.lengthMm / 2,
    maxX: STANDARD_TABLE.lengthMm / 2,
    minY: -STANDARD_TABLE.widthMm / 2,
    maxY: STANDARD_TABLE.widthMm / 2,
  },
  straightRailSizeMm: {
    width: STANDARD_TABLE.lengthMm,
    height: STANDARD_TABLE.widthMm,
  },
  throatWidthMm: {
    middle: PRO_MATCH_THROAT_WIDTH_MM,
    corner: PRO_MATCH_THROAT_WIDTH_MM,
  },
  mouthWidthMm: {
    middle: 226.424991,
    corner: 126.974133,
  },
  rails: [],
  pockets: [
    {
      id: 'middle-top',
      type: 'middle',
      side: 'top',
      center: { x: 0, y: -957.090867 },
      candidateRadius: 202.586199,
      renderRadius: 60.344825,
      captureRadius: 67.241377,
      dropDirection: { x: 0, y: -1 },
      lips: [],
    },
    {
      id: 'corner-top-right',
      type: 'corner',
      side: 'top-right',
      center: { x: 1814.830006, y: -918.190443 },
      candidateRadius: 211.206888,
      renderRadius: 63.793101,
      captureRadius: 67.241377,
      dropDirection: { x: 0.707107, y: -0.707107 },
      lips: [],
    },
    {
      id: 'corner-bottom-right',
      type: 'corner',
      side: 'bottom-right',
      center: { x: 1814.830006, y: 918.190443 },
      candidateRadius: 211.206888,
      renderRadius: 63.793101,
      captureRadius: 67.241377,
      dropDirection: { x: 0.707107, y: 0.707107 },
      lips: [],
    },
    {
      id: 'middle-bottom',
      type: 'middle',
      side: 'bottom',
      center: { x: 0, y: 957.090867 },
      candidateRadius: 202.586199,
      renderRadius: 60.344825,
      captureRadius: 67.241377,
      dropDirection: { x: 0, y: 1 },
      lips: [],
    },
    {
      id: 'corner-bottom-left',
      type: 'corner',
      side: 'bottom-left',
      center: { x: -1814.830006, y: 918.190443 },
      candidateRadius: 211.206888,
      renderRadius: 63.793101,
      captureRadius: 67.241377,
      dropDirection: { x: -0.707107, y: 0.707107 },
      lips: [],
    },
    {
      id: 'corner-top-left',
      type: 'corner',
      side: 'top-left',
      center: { x: -1814.830006, y: -918.190443 },
      candidateRadius: 211.206888,
      renderRadius: 63.793101,
      captureRadius: 67.241377,
      dropDirection: { x: -0.707107, y: -0.707107 },
      lips: [],
    },
  ],
};

function clonePoint(point) {
  return { x: point.x, y: point.y };
}

function cloneBoundary(boundary) {
  const shift = PRO_MATCH_84_FULL_PHYSICAL_BOUNDARIES.calibration.translationMm;
  return {
    ...boundary,
    playAreaMm: { ...boundary.playAreaMm },
    outerSizeMm: { ...boundary.outerSizeMm },
    outerBoundsMm: { ...boundary.outerBoundsMm },
    playAreaOffsetMm: { ...boundary.playAreaOffsetMm },
    straightRailBoundsMm: { ...boundary.straightRailBoundsMm },
    straightRailSizeMm: { ...boundary.straightRailSizeMm },
    throatWidthMm: { ...boundary.throatWidthMm },
    mouthWidthMm: { ...boundary.mouthWidthMm },
    rails: boundary.rails.map((rail) => ({
      ...rail,
      start: clonePoint(rail.start),
      end: clonePoint(rail.end),
    })),
    pockets: boundary.pockets.map((pocket) => ({
      ...pocket,
      center: {
        x: pocket.center.x + (pocket.type === 'middle' ? 0 : Math.sign(pocket.center.x) * shift.x),
        y: pocket.center.y + Math.sign(pocket.center.y) * shift.y,
      },
      dropDirection: { ...pocket.dropDirection },
      lips: [],
    })),
  };
}

function getTableBoundaryPreset() {
  return {
    id: PRO_MATCH_84_BOUNDARY.id,
    name: PRO_MATCH_84_BOUNDARY.name,
    description: 'WPBSA 参数化职业赛袋口边界。',
    boundary: cloneBoundary(PRO_MATCH_84_BOUNDARY),
  };
}

function getTableBoundaryById() {
  return getTableBoundaryPreset().boundary;
}

function listTableBoundaryPresets() {
  const boundary = PRO_MATCH_84_BOUNDARY;
  return [{
    id: boundary.id,
    name: boundary.name,
    description: 'WPBSA 参数化职业赛袋口边界。',
    throatWidthMm: { ...boundary.throatWidthMm },
    mouthWidthMm: { ...boundary.mouthWidthMm },
  }];
}

function measurePocketThroat() {
  return {
    widthMm: PRO_MATCH_THROAT_WIDTH_MM,
  };
}

module.exports = {
  DEFAULT_TABLE_BOUNDARY_PRESET_ID,
  PRO_MATCH_THROAT_WIDTH_MM,
  TABLE_BOUNDARY_PRESET_IDS,
  getTableBoundaryById,
  getTableBoundaryPreset,
  listTableBoundaryPresets,
  measurePocketThroat,
};

}, {"./standardTableSpec":9,"./proMatch84FullPhysicalBoundaries":10}, "apps/three-game/src/core/model/tableBoundaryPresets.js"],
9: [function(require, module, exports) {
// WPBSA 2024–25, Equipment §1. Bracketed metric dimensions in the rulebook
// are rounded; retain the inch dimensions exactly for shared simulation/rendering.
const INCH_MM = 25.4;
const STANDARD_TABLE = Object.freeze({
  lengthMm: 140.5 * INCH_MM,
  widthMm: 70 * INCH_MM,
  cushionTopHeightMm: 34 * INCH_MM,
  baulkFromBottomMm: 29 * INCH_MM,
  dRadiusMm: 11.5 * INCH_MM,
  blackFromTopMm: 12.75 * INCH_MM,
  source: 'https://wpbsa.com/wp-content/uploads/2198_WPBSA-Rulebook-2024-25.pdf',
});

module.exports = { INCH_MM, STANDARD_TABLE };

}, {}, "apps/three-game/src/core/model/standardTableSpec.js"],
10: [function(require, module, exports) {
// Generated from docs/physics/pro-match-84-wpbsa-parametric-boundary-candidate.json.
// This is the default full-table physical boundary set for the pro-match-84 preset.
// Straight rails and black-hole circles are retained from the previous hand-drawn boundary.
// Pocket rail and drop-judge lines are generated from the WPBSA 2005/6 parametric model.

const PRO_MATCH_84_FULL_PHYSICAL_BOUNDARIES = {
  "version": 2,
  "source": "wpbsa-2005-6-parametric-runtime",
  "boundaryId": "pro-match-84",
  "boundaryName": "职业赛 WPBSA 参数化",
  "sourceImagePath": "../../assets/images/table/full-table-clean-aligned-broadcast-green-smooth-edge10.png",
  "imagePhysicalRectPx": {
    "x": 103,
    "y": 63,
    "width": 2010,
    "height": 1085
  },
  "coordinateSystem": "center-origin-mm",
  "areas": [
    {
      "id": "rail-0",
      "kind": "straight-rail-area",
      "name": "直线库边 1",
      "boundaryTypes": [
        "straightRail"
      ],
      "focusImageRect": {
        "x": 1079.757,
        "y": 30.217,
        "width": 1043.798,
        "height": 180
      }
    },
    {
      "id": "rail-1",
      "kind": "straight-rail-area",
      "name": "直线库边 2",
      "boundaryTypes": [
        "straightRail"
      ],
      "focusImageRect": {
        "x": 1992.533,
        "y": 79.18,
        "width": 180,
        "height": 1052.64
      }
    },
    {
      "id": "rail-2",
      "kind": "straight-rail-area",
      "name": "直线库边 3",
      "boundaryTypes": [
        "straightRail"
      ],
      "focusImageRect": {
        "x": 1079.757,
        "y": 1000.783,
        "width": 1043.798,
        "height": 180
      }
    },
    {
      "id": "rail-3",
      "kind": "straight-rail-area",
      "name": "直线库边 4",
      "boundaryTypes": [
        "straightRail"
      ],
      "focusImageRect": {
        "x": 92.445,
        "y": 1000.783,
        "width": 1043.798,
        "height": 180
      }
    },
    {
      "id": "rail-4",
      "kind": "straight-rail-area",
      "name": "直线库边 5",
      "boundaryTypes": [
        "straightRail"
      ],
      "focusImageRect": {
        "x": 43.467,
        "y": 79.18,
        "width": 180,
        "height": 1052.64
      }
    },
    {
      "id": "rail-5",
      "kind": "straight-rail-area",
      "name": "直线库边 6",
      "boundaryTypes": [
        "straightRail"
      ],
      "focusImageRect": {
        "x": 92.445,
        "y": 30.217,
        "width": 1043.798,
        "height": 180
      }
    },
    {
      "id": "middle-top",
      "kind": "pocket-area",
      "name": "middle-top (middle)",
      "pocketId": "middle-top",
      "boundaryTypes": [
        "pocketRail",
        "dropJudge",
        "blackHole"
      ],
      "focusImageRect": {
        "x": 916.243,
        "y": -67,
        "width": 383.515,
        "height": 317.218
      }
    },
    {
      "id": "corner-top-right",
      "kind": "pocket-area",
      "name": "corner-top-right (corner)",
      "pocketId": "corner-top-right",
      "boundaryTypes": [
        "pocketRail",
        "dropJudge",
        "blackHole"
      ],
      "focusImageRect": {
        "x": 1918.556,
        "y": -23.754,
        "width": 307.955,
        "height": 307.934
      }
    },
    {
      "id": "corner-bottom-right",
      "kind": "pocket-area",
      "name": "corner-bottom-right (corner)",
      "pocketId": "corner-bottom-right",
      "boundaryTypes": [
        "pocketRail",
        "dropJudge",
        "blackHole"
      ],
      "focusImageRect": {
        "x": 1918.556,
        "y": 926.82,
        "width": 307.955,
        "height": 307.934
      }
    },
    {
      "id": "middle-bottom",
      "kind": "pocket-area",
      "name": "middle-bottom (middle)",
      "pocketId": "middle-bottom",
      "boundaryTypes": [
        "pocketRail",
        "dropJudge",
        "blackHole"
      ],
      "focusImageRect": {
        "x": 916.243,
        "y": 960.782,
        "width": 383.515,
        "height": 317.218
      }
    },
    {
      "id": "corner-bottom-left",
      "kind": "pocket-area",
      "name": "corner-bottom-left (corner)",
      "pocketId": "corner-bottom-left",
      "boundaryTypes": [
        "pocketRail",
        "dropJudge",
        "blackHole"
      ],
      "focusImageRect": {
        "x": -10.51,
        "y": 926.82,
        "width": 307.955,
        "height": 307.934
      }
    },
    {
      "id": "corner-top-left",
      "kind": "pocket-area",
      "name": "corner-top-left (corner)",
      "pocketId": "corner-top-left",
      "boundaryTypes": [
        "pocketRail",
        "dropJudge",
        "blackHole"
      ],
      "focusImageRect": {
        "x": -10.51,
        "y": -23.754,
        "width": 307.955,
        "height": 307.934
      }
    }
  ],
  "lines": [
    {
      "id": "table-rail-0",
      "name": "直线库边 1",
      "areaId": "rail-0",
      "boundaryType": "straightRail",
      "boundaryTypeName": "直线库边区",
      "tool": "line",
      "toolName": "直线",
      "source": "table-boundary-preset",
      "outputPointCount": 2,
      "endpointContact": {
        "startDistancePx": null,
        "endDistancePx": null,
        "startEndpointDistancePx": null,
        "endEndpointDistancePx": null
      },
      "controlImagePx": [
        [
          1169.757,
          120.217
        ],
        [
          2033.555,
          120.217
        ]
      ],
      "controlTableMm": [
        [
          113.211,
          -889.849
        ],
        [
          1696.706,
          -889.849
        ]
      ],
      "polylineImagePx": [
        [
          1169.757,
          120.217
        ],
        [
          2033.555,
          120.217
        ]
      ],
      "polylineTableMm": [
        [
          113.211,
          -889.849
        ],
        [
          1696.706,
          -889.849
        ]
      ]
    },
    {
      "id": "table-rail-1",
      "name": "直线库边 2",
      "areaId": "rail-1",
      "boundaryType": "straightRail",
      "boundaryTypeName": "直线库边区",
      "tool": "line",
      "toolName": "直线",
      "source": "table-boundary-preset",
      "outputPointCount": 2,
      "endpointContact": {
        "startDistancePx": null,
        "endDistancePx": null,
        "startEndpointDistancePx": null,
        "endEndpointDistancePx": null
      },
      "controlImagePx": [
        [
          2082.533,
          169.18
        ],
        [
          2082.533,
          1041.82
        ]
      ],
      "controlTableMm": [
        [
          1786.491,
          -800.067
        ],
        [
          1786.491,
          800.067
        ]
      ],
      "polylineImagePx": [
        [
          2082.533,
          169.18
        ],
        [
          2082.533,
          1041.82
        ]
      ],
      "polylineTableMm": [
        [
          1786.491,
          -800.067
        ],
        [
          1786.491,
          800.067
        ]
      ]
    },
    {
      "id": "table-rail-2",
      "name": "直线库边 3",
      "areaId": "rail-2",
      "boundaryType": "straightRail",
      "boundaryTypeName": "直线库边区",
      "tool": "line",
      "toolName": "直线",
      "source": "table-boundary-preset",
      "outputPointCount": 2,
      "endpointContact": {
        "startDistancePx": null,
        "endDistancePx": null,
        "startEndpointDistancePx": null,
        "endEndpointDistancePx": null
      },
      "controlImagePx": [
        [
          2033.555,
          1090.783
        ],
        [
          1169.757,
          1090.783
        ]
      ],
      "controlTableMm": [
        [
          1696.706,
          889.849
        ],
        [
          113.211,
          889.849
        ]
      ],
      "polylineImagePx": [
        [
          2033.555,
          1090.783
        ],
        [
          1169.757,
          1090.783
        ]
      ],
      "polylineTableMm": [
        [
          1696.706,
          889.849
        ],
        [
          113.211,
          889.849
        ]
      ]
    },
    {
      "id": "table-rail-3",
      "name": "直线库边 4",
      "areaId": "rail-3",
      "boundaryType": "straightRail",
      "boundaryTypeName": "直线库边区",
      "tool": "line",
      "toolName": "直线",
      "source": "table-boundary-preset",
      "outputPointCount": 2,
      "endpointContact": {
        "startDistancePx": null,
        "endDistancePx": null,
        "startEndpointDistancePx": null,
        "endEndpointDistancePx": null
      },
      "controlImagePx": [
        [
          1046.243,
          1090.783
        ],
        [
          182.445,
          1090.783
        ]
      ],
      "controlTableMm": [
        [
          -113.211,
          889.849
        ],
        [
          -1696.706,
          889.849
        ]
      ],
      "polylineImagePx": [
        [
          1046.243,
          1090.783
        ],
        [
          182.445,
          1090.783
        ]
      ],
      "polylineTableMm": [
        [
          -113.211,
          889.849
        ],
        [
          -1696.706,
          889.849
        ]
      ]
    },
    {
      "id": "table-rail-4",
      "name": "直线库边 5",
      "areaId": "rail-4",
      "boundaryType": "straightRail",
      "boundaryTypeName": "直线库边区",
      "tool": "line",
      "toolName": "直线",
      "source": "table-boundary-preset",
      "outputPointCount": 2,
      "endpointContact": {
        "startDistancePx": null,
        "endDistancePx": null,
        "startEndpointDistancePx": null,
        "endEndpointDistancePx": null
      },
      "controlImagePx": [
        [
          133.467,
          1041.82
        ],
        [
          133.467,
          169.18
        ]
      ],
      "controlTableMm": [
        [
          -1786.491,
          800.067
        ],
        [
          -1786.491,
          -800.067
        ]
      ],
      "polylineImagePx": [
        [
          133.467,
          1041.82
        ],
        [
          133.467,
          169.18
        ]
      ],
      "polylineTableMm": [
        [
          -1786.491,
          800.067
        ],
        [
          -1786.491,
          -800.067
        ]
      ]
    },
    {
      "id": "table-rail-5",
      "name": "直线库边 6",
      "areaId": "rail-5",
      "boundaryType": "straightRail",
      "boundaryTypeName": "直线库边区",
      "tool": "line",
      "toolName": "直线",
      "source": "table-boundary-preset",
      "outputPointCount": 2,
      "endpointContact": {
        "startDistancePx": null,
        "endDistancePx": null,
        "startEndpointDistancePx": null,
        "endEndpointDistancePx": null
      },
      "controlImagePx": [
        [
          182.445,
          120.217
        ],
        [
          1046.243,
          120.217
        ]
      ],
      "controlTableMm": [
        [
          -1696.706,
          -889.849
        ],
        [
          -113.211,
          -889.849
        ]
      ],
      "polylineImagePx": [
        [
          182.445,
          120.217
        ],
        [
          1046.243,
          120.217
        ]
      ],
      "polylineTableMm": [
        [
          -1696.706,
          -889.849
        ],
        [
          -113.211,
          -889.849
        ]
      ]
    },
    {
      "id": "boundary-mpdxxgec-1111",
      "name": "网袋黑洞区 4",
      "areaId": "middle-top",
      "boundaryType": "blackHole",
      "boundaryTypeName": "网袋黑洞区",
      "tool": "circle",
      "toolName": "圆形",
      "source": "editor",
      "outputPointCount": 20,
      "endpointContact": null,
      "controlImagePx": [
        [
          1108.421,
          93.34
        ]
      ],
      "controlTableMm": [
        [
          0.772,
          -939.133
        ]
      ],
      "polylineImagePx": [
        [
          1123.997,
          93.34
        ],
        [
          1123.235,
          98.153
        ],
        [
          1121.022,
          102.495
        ],
        [
          1117.576,
          105.941
        ],
        [
          1113.234,
          108.154
        ],
        [
          1108.421,
          108.916
        ],
        [
          1103.608,
          108.154
        ],
        [
          1099.266,
          105.941
        ],
        [
          1095.82,
          102.495
        ],
        [
          1093.607,
          98.153
        ],
        [
          1092.845,
          93.34
        ],
        [
          1093.607,
          88.527
        ],
        [
          1095.82,
          84.185
        ],
        [
          1099.266,
          80.739
        ],
        [
          1103.608,
          78.526
        ],
        [
          1108.421,
          77.764
        ],
        [
          1113.234,
          78.526
        ],
        [
          1117.576,
          80.739
        ],
        [
          1121.022,
          84.185
        ],
        [
          1123.235,
          88.527
        ],
        [
          1123.997,
          93.34
        ]
      ],
      "polylineTableMm": [
        [
          29.325,
          -939.133
        ],
        [
          27.928,
          -930.307
        ],
        [
          23.872,
          -922.345
        ],
        [
          17.555,
          -916.026
        ],
        [
          9.595,
          -911.969
        ],
        [
          0.772,
          -910.571
        ],
        [
          -8.052,
          -911.969
        ],
        [
          -16.012,
          -916.026
        ],
        [
          -22.329,
          -922.345
        ],
        [
          -26.384,
          -930.307
        ],
        [
          -27.782,
          -939.133
        ],
        [
          -26.384,
          -947.959
        ],
        [
          -22.329,
          -955.921
        ],
        [
          -16.012,
          -962.239
        ],
        [
          -8.052,
          -966.296
        ],
        [
          0.772,
          -967.694
        ],
        [
          9.595,
          -966.296
        ],
        [
          17.555,
          -962.239
        ],
        [
          23.872,
          -955.921
        ],
        [
          27.928,
          -947.959
        ],
        [
          29.325,
          -939.133
        ]
      ],
      "circleImagePx": {
        "center": [
          1108.421,
          93.34
        ],
        "radius": 15.576
      },
      "circleTableMm": {
        "center": [
          0.772,
          -939.133
        ],
        "radius": 28.554
      }
    },
    {
      "id": "boundary-mpdxxyrj-2976",
      "name": "网袋黑洞区 4",
      "areaId": "middle-bottom",
      "boundaryType": "blackHole",
      "boundaryTypeName": "网袋黑洞区",
      "tool": "circle",
      "toolName": "圆形",
      "source": "editor",
      "outputPointCount": 20,
      "endpointContact": null,
      "controlImagePx": [
        [
          1107.891,
          1113.304
        ]
      ],
      "controlTableMm": [
        [
          -0.2,
          931.145
        ]
      ],
      "polylineImagePx": [
        [
          1123.508,
          1113.304
        ],
        [
          1122.744,
          1118.13
        ],
        [
          1120.525,
          1122.483
        ],
        [
          1117.07,
          1125.938
        ],
        [
          1112.717,
          1128.157
        ],
        [
          1107.891,
          1128.921
        ],
        [
          1103.065,
          1128.157
        ],
        [
          1098.712,
          1125.938
        ],
        [
          1095.257,
          1122.483
        ],
        [
          1093.038,
          1118.13
        ],
        [
          1092.274,
          1113.304
        ],
        [
          1093.038,
          1108.478
        ],
        [
          1095.257,
          1104.125
        ],
        [
          1098.712,
          1100.67
        ],
        [
          1103.065,
          1098.451
        ],
        [
          1107.891,
          1097.687
        ],
        [
          1112.717,
          1098.451
        ],
        [
          1117.07,
          1100.67
        ],
        [
          1120.525,
          1104.125
        ],
        [
          1122.744,
          1108.478
        ],
        [
          1123.508,
          1113.304
        ]
      ],
      "polylineTableMm": [
        [
          28.429,
          931.145
        ],
        [
          27.028,
          939.994
        ],
        [
          22.961,
          947.977
        ],
        [
          16.628,
          954.313
        ],
        [
          8.647,
          958.38
        ],
        [
          -0.2,
          959.782
        ],
        [
          -9.047,
          958.38
        ],
        [
          -17.027,
          954.313
        ],
        [
          -23.361,
          947.977
        ],
        [
          -27.427,
          939.994
        ],
        [
          -28.829,
          931.145
        ],
        [
          -27.427,
          922.296
        ],
        [
          -23.361,
          914.313
        ],
        [
          -17.027,
          907.978
        ],
        [
          -9.047,
          903.91
        ],
        [
          -0.2,
          902.509
        ],
        [
          8.647,
          903.91
        ],
        [
          16.628,
          907.978
        ],
        [
          22.961,
          914.313
        ],
        [
          27.028,
          922.296
        ],
        [
          28.429,
          931.145
        ]
      ],
      "circleImagePx": {
        "center": [
          1107.891,
          1113.304
        ],
        "radius": 15.617
      },
      "circleTableMm": {
        "center": [
          -0.2,
          931.145
        ],
        "radius": 28.629
      }
    },
    {
      "id": "boundary-mpdxz7ag-3750",
      "name": "网袋黑洞区 6",
      "areaId": "corner-top-right",
      "boundaryType": "blackHole",
      "boundaryTypeName": "网袋黑洞区",
      "tool": "circle",
      "toolName": "圆形",
      "source": "editor",
      "outputPointCount": 20,
      "endpointContact": null,
      "controlImagePx": [
        [
          2083.017,
          111.332
        ]
      ],
      "controlTableMm": [
        [
          1787.378,
          -906.141
        ]
      ],
      "polylineImagePx": [
        [
          2096.845,
          111.332
        ],
        [
          2096.168,
          115.605
        ],
        [
          2094.204,
          119.46
        ],
        [
          2091.145,
          122.519
        ],
        [
          2087.29,
          124.483
        ],
        [
          2083.017,
          125.16
        ],
        [
          2078.744,
          124.483
        ],
        [
          2074.889,
          122.519
        ],
        [
          2071.83,
          119.46
        ],
        [
          2069.866,
          115.605
        ],
        [
          2069.189,
          111.332
        ],
        [
          2069.866,
          107.059
        ],
        [
          2071.83,
          103.204
        ],
        [
          2074.889,
          100.145
        ],
        [
          2078.744,
          98.181
        ],
        [
          2083.017,
          97.504
        ],
        [
          2087.29,
          98.181
        ],
        [
          2091.145,
          100.145
        ],
        [
          2094.204,
          103.204
        ],
        [
          2096.168,
          107.059
        ],
        [
          2096.845,
          111.332
        ]
      ],
      "polylineTableMm": [
        [
          1812.727,
          -906.141
        ],
        [
          1811.487,
          -898.306
        ],
        [
          1807.886,
          -891.237
        ],
        [
          1802.278,
          -885.628
        ],
        [
          1795.212,
          -882.026
        ],
        [
          1787.378,
          -880.785
        ],
        [
          1779.545,
          -882.026
        ],
        [
          1772.478,
          -885.628
        ],
        [
          1766.87,
          -891.237
        ],
        [
          1763.27,
          -898.306
        ],
        [
          1762.029,
          -906.141
        ],
        [
          1763.27,
          -913.977
        ],
        [
          1766.87,
          -921.045
        ],
        [
          1772.478,
          -926.655
        ],
        [
          1779.545,
          -930.256
        ],
        [
          1787.378,
          -931.497
        ],
        [
          1795.212,
          -930.256
        ],
        [
          1802.278,
          -926.655
        ],
        [
          1807.886,
          -921.045
        ],
        [
          1811.487,
          -913.977
        ],
        [
          1812.727,
          -906.141
        ]
      ],
      "circleImagePx": {
        "center": [
          2083.017,
          111.332
        ],
        "radius": 13.828
      },
      "circleTableMm": {
        "center": [
          1787.378,
          -906.141
        ],
        "radius": 25.349
      }
    },
    {
      "id": "line-mpdy0414-0-1016",
      "name": "网袋黑洞区 copy",
      "areaId": "corner-bottom-right",
      "boundaryType": "blackHole",
      "boundaryTypeName": "网袋黑洞区",
      "tool": "circle",
      "toolName": "圆形",
      "source": "editor copy",
      "outputPointCount": 20,
      "endpointContact": null,
      "controlImagePx": [
        [
          2083.482,
          1097.26
        ]
      ],
      "controlTableMm": [
        [
          1788.231,
          901.726
        ]
      ],
      "polylineImagePx": [
        [
          2097.31,
          1097.26
        ],
        [
          2096.633,
          1101.533
        ],
        [
          2094.669,
          1105.388
        ],
        [
          2091.61,
          1108.447
        ],
        [
          2087.755,
          1110.411
        ],
        [
          2083.482,
          1111.088
        ],
        [
          2079.209,
          1110.411
        ],
        [
          2075.354,
          1108.447
        ],
        [
          2072.295,
          1105.388
        ],
        [
          2070.331,
          1101.533
        ],
        [
          2069.654,
          1097.26
        ],
        [
          2070.331,
          1092.987
        ],
        [
          2072.295,
          1089.132
        ],
        [
          2075.354,
          1086.073
        ],
        [
          2079.209,
          1084.109
        ],
        [
          2083.482,
          1083.432
        ],
        [
          2087.755,
          1084.109
        ],
        [
          2091.61,
          1086.073
        ],
        [
          2094.669,
          1089.132
        ],
        [
          2096.633,
          1092.987
        ],
        [
          2097.31,
          1097.26
        ]
      ],
      "polylineTableMm": [
        [
          1813.58,
          901.726
        ],
        [
          1812.339,
          909.561
        ],
        [
          1808.739,
          916.63
        ],
        [
          1803.131,
          922.239
        ],
        [
          1796.064,
          925.841
        ],
        [
          1788.231,
          927.082
        ],
        [
          1780.397,
          925.841
        ],
        [
          1773.331,
          922.239
        ],
        [
          1767.723,
          916.63
        ],
        [
          1764.122,
          909.561
        ],
        [
          1762.882,
          901.726
        ],
        [
          1764.122,
          893.89
        ],
        [
          1767.723,
          886.822
        ],
        [
          1773.331,
          881.212
        ],
        [
          1780.397,
          877.611
        ],
        [
          1788.231,
          876.37
        ],
        [
          1796.064,
          877.611
        ],
        [
          1803.131,
          881.212
        ],
        [
          1808.739,
          886.822
        ],
        [
          1812.339,
          893.89
        ],
        [
          1813.58,
          901.726
        ]
      ],
      "circleImagePx": {
        "center": [
          2083.482,
          1097.26
        ],
        "radius": 13.828
      },
      "circleTableMm": {
        "center": [
          1788.231,
          901.726
        ],
        "radius": 25.349
      }
    },
    {
      "id": "line-mpdy0d0h-0-5919",
      "name": "网袋黑洞区 copy",
      "areaId": "corner-bottom-left",
      "boundaryType": "blackHole",
      "boundaryTypeName": "网袋黑洞区",
      "tool": "circle",
      "toolName": "圆形",
      "source": "editor copy",
      "outputPointCount": 20,
      "endpointContact": null,
      "controlImagePx": [
        [
          133.277,
          1096.282
        ]
      ],
      "controlTableMm": [
        [
          -1786.839,
          899.932
        ]
      ],
      "polylineImagePx": [
        [
          147.105,
          1096.282
        ],
        [
          146.428,
          1100.555
        ],
        [
          144.464,
          1104.41
        ],
        [
          141.405,
          1107.469
        ],
        [
          137.55,
          1109.433
        ],
        [
          133.277,
          1110.11
        ],
        [
          129.004,
          1109.433
        ],
        [
          125.149,
          1107.469
        ],
        [
          122.09,
          1104.41
        ],
        [
          120.126,
          1100.555
        ],
        [
          119.449,
          1096.282
        ],
        [
          120.126,
          1092.009
        ],
        [
          122.09,
          1088.154
        ],
        [
          125.149,
          1085.095
        ],
        [
          129.004,
          1083.131
        ],
        [
          133.277,
          1082.454
        ],
        [
          137.55,
          1083.131
        ],
        [
          141.405,
          1085.095
        ],
        [
          144.464,
          1088.154
        ],
        [
          146.428,
          1092.009
        ],
        [
          147.105,
          1096.282
        ]
      ],
      "polylineTableMm": [
        [
          -1761.49,
          899.932
        ],
        [
          -1762.731,
          907.768
        ],
        [
          -1766.331,
          914.836
        ],
        [
          -1771.939,
          920.446
        ],
        [
          -1779.006,
          924.047
        ],
        [
          -1786.839,
          925.288
        ],
        [
          -1794.673,
          924.047
        ],
        [
          -1801.739,
          920.446
        ],
        [
          -1807.347,
          914.836
        ],
        [
          -1810.948,
          907.768
        ],
        [
          -1812.189,
          899.932
        ],
        [
          -1810.948,
          892.097
        ],
        [
          -1807.347,
          885.029
        ],
        [
          -1801.739,
          879.419
        ],
        [
          -1794.673,
          875.817
        ],
        [
          -1786.839,
          874.576
        ],
        [
          -1779.006,
          875.817
        ],
        [
          -1771.939,
          879.419
        ],
        [
          -1766.331,
          885.029
        ],
        [
          -1762.731,
          892.097
        ],
        [
          -1761.49,
          899.932
        ]
      ],
      "circleImagePx": {
        "center": [
          133.277,
          1096.282
        ],
        "radius": 13.828
      },
      "circleTableMm": {
        "center": [
          -1786.839,
          899.932
        ],
        "radius": 25.349
      }
    },
    {
      "id": "line-mpdy0kq4-0-1069",
      "name": "网袋黑洞区 copy",
      "areaId": "corner-top-left",
      "boundaryType": "blackHole",
      "boundaryTypeName": "网袋黑洞区",
      "tool": "circle",
      "toolName": "圆形",
      "source": "editor copy",
      "outputPointCount": 20,
      "endpointContact": null,
      "controlImagePx": [
        [
          133.374,
          111.734
        ]
      ],
      "controlTableMm": [
        [
          -1786.662,
          -905.404
        ]
      ],
      "polylineImagePx": [
        [
          147.202,
          111.734
        ],
        [
          146.525,
          116.007
        ],
        [
          144.561,
          119.862
        ],
        [
          141.502,
          122.921
        ],
        [
          137.647,
          124.885
        ],
        [
          133.374,
          125.562
        ],
        [
          129.101,
          124.885
        ],
        [
          125.246,
          122.921
        ],
        [
          122.187,
          119.862
        ],
        [
          120.223,
          116.007
        ],
        [
          119.546,
          111.734
        ],
        [
          120.223,
          107.461
        ],
        [
          122.187,
          103.606
        ],
        [
          125.246,
          100.547
        ],
        [
          129.101,
          98.583
        ],
        [
          133.374,
          97.906
        ],
        [
          137.647,
          98.583
        ],
        [
          141.502,
          100.547
        ],
        [
          144.561,
          103.606
        ],
        [
          146.525,
          107.461
        ],
        [
          147.202,
          111.734
        ]
      ],
      "polylineTableMm": [
        [
          -1761.312,
          -905.404
        ],
        [
          -1762.553,
          -897.569
        ],
        [
          -1766.154,
          -890.5
        ],
        [
          -1771.762,
          -884.891
        ],
        [
          -1778.828,
          -881.289
        ],
        [
          -1786.662,
          -880.048
        ],
        [
          -1794.495,
          -881.289
        ],
        [
          -1801.561,
          -884.891
        ],
        [
          -1807.169,
          -890.5
        ],
        [
          -1810.77,
          -897.569
        ],
        [
          -1812.011,
          -905.404
        ],
        [
          -1810.77,
          -913.24
        ],
        [
          -1807.169,
          -920.308
        ],
        [
          -1801.561,
          -925.918
        ],
        [
          -1794.495,
          -929.519
        ],
        [
          -1786.662,
          -930.76
        ],
        [
          -1778.828,
          -929.519
        ],
        [
          -1771.762,
          -925.918
        ],
        [
          -1766.154,
          -920.308
        ],
        [
          -1762.553,
          -913.24
        ],
        [
          -1761.312,
          -905.404
        ]
      ],
      "circleImagePx": {
        "center": [
          133.374,
          111.734
        ],
        "radius": 13.828
      },
      "circleTableMm": {
        "center": [
          -1786.662,
          -905.404
        ],
        "radius": 25.349
      }
    },
    {
      "id": "middle-top:wpbsa-param:left-pocket-rail",
      "name": "middle-top left pocket rail",
      "areaId": "middle-top",
      "boundaryType": "pocketRail",
      "boundaryTypeName": "袋口库边区",
      "tool": "parametricPolyline",
      "toolName": "参数化多段线",
      "source": "wpbsa-2005-6-parametric-candidate",
      "outputPointCount": 39,
      "polylineTableMm": [
        [
          -113.211,
          -889.849
        ],
        [
          -110.4,
          -889.898
        ],
        [
          -107.592,
          -890.043
        ],
        [
          -104.79,
          -890.285
        ],
        [
          -101.999,
          -890.624
        ],
        [
          -99.221,
          -891.06
        ],
        [
          -96.46,
          -891.59
        ],
        [
          -93.719,
          -892.216
        ],
        [
          -91.001,
          -892.936
        ],
        [
          -88.31,
          -893.749
        ],
        [
          -85.648,
          -894.655
        ],
        [
          -83.019,
          -895.652
        ],
        [
          -80.426,
          -896.74
        ],
        [
          -77.872,
          -897.916
        ],
        [
          -75.36,
          -899.179
        ],
        [
          -72.893,
          -900.529
        ],
        [
          -70.475,
          -901.963
        ],
        [
          -68.107,
          -903.479
        ],
        [
          -65.793,
          -905.077
        ],
        [
          -63.586,
          -906.818
        ],
        [
          -62.057,
          -908.146
        ],
        [
          -60.525,
          -909.467
        ],
        [
          -59.044,
          -910.843
        ],
        [
          -57.614,
          -912.274
        ],
        [
          -56.239,
          -913.756
        ],
        [
          -54.919,
          -915.288
        ],
        [
          -53.657,
          -916.868
        ],
        [
          -52.455,
          -918.494
        ],
        [
          -51.313,
          -920.163
        ],
        [
          -50.234,
          -921.873
        ],
        [
          -49.22,
          -923.622
        ],
        [
          -48.27,
          -925.408
        ],
        [
          -47.388,
          -927.227
        ],
        [
          -46.573,
          -929.078
        ],
        [
          -45.828,
          -930.958
        ],
        [
          -45.153,
          -932.864
        ],
        [
          -44.549,
          -934.794
        ],
        [
          -44.017,
          -936.745
        ],
        [
          -43.557,
          -938.714
        ]
      ],
      "polylineImagePx": [
        [
          1046.243,
          120.217
        ],
        [
          1047.777,
          120.191
        ],
        [
          1049.309,
          120.111
        ],
        [
          1050.837,
          119.979
        ],
        [
          1052.359,
          119.794
        ],
        [
          1053.875,
          119.557
        ],
        [
          1055.381,
          119.267
        ],
        [
          1056.876,
          118.926
        ],
        [
          1058.359,
          118.534
        ],
        [
          1059.827,
          118.09
        ],
        [
          1061.279,
          117.596
        ],
        [
          1062.713,
          117.052
        ],
        [
          1064.128,
          116.459
        ],
        [
          1065.521,
          115.818
        ],
        [
          1066.891,
          115.129
        ],
        [
          1068.237,
          114.393
        ],
        [
          1069.556,
          113.611
        ],
        [
          1070.848,
          112.784
        ],
        [
          1072.11,
          111.913
        ],
        [
          1073.314,
          110.963
        ],
        [
          1074.148,
          110.239
        ],
        [
          1074.983,
          109.518
        ],
        [
          1075.791,
          108.768
        ],
        [
          1076.571,
          107.988
        ],
        [
          1077.322,
          107.179
        ],
        [
          1078.041,
          106.344
        ],
        [
          1078.73,
          105.482
        ],
        [
          1079.386,
          104.595
        ],
        [
          1080.009,
          103.685
        ],
        [
          1080.597,
          102.752
        ],
        [
          1081.151,
          101.799
        ],
        [
          1081.668,
          100.825
        ],
        [
          1082.15,
          99.833
        ],
        [
          1082.594,
          98.823
        ],
        [
          1083.001,
          97.798
        ],
        [
          1083.369,
          96.759
        ],
        [
          1083.699,
          95.706
        ],
        [
          1083.989,
          94.642
        ],
        [
          1084.24,
          93.568
        ]
      ]
    },
    {
      "id": "middle-top:wpbsa-param:right-pocket-rail",
      "name": "middle-top right pocket rail",
      "areaId": "middle-top",
      "boundaryType": "pocketRail",
      "boundaryTypeName": "袋口库边区",
      "tool": "parametricPolyline",
      "toolName": "参数化多段线",
      "source": "wpbsa-2005-6-parametric-candidate",
      "outputPointCount": 39,
      "polylineTableMm": [
        [
          113.211,
          -889.849
        ],
        [
          110.4,
          -889.898
        ],
        [
          107.592,
          -890.043
        ],
        [
          104.79,
          -890.285
        ],
        [
          101.999,
          -890.624
        ],
        [
          99.221,
          -891.06
        ],
        [
          96.46,
          -891.59
        ],
        [
          93.719,
          -892.216
        ],
        [
          91.001,
          -892.936
        ],
        [
          88.31,
          -893.749
        ],
        [
          85.648,
          -894.655
        ],
        [
          83.019,
          -895.652
        ],
        [
          80.426,
          -896.74
        ],
        [
          77.872,
          -897.916
        ],
        [
          75.36,
          -899.179
        ],
        [
          72.893,
          -900.529
        ],
        [
          70.475,
          -901.963
        ],
        [
          68.107,
          -903.479
        ],
        [
          65.793,
          -905.077
        ],
        [
          63.586,
          -906.818
        ],
        [
          62.057,
          -908.146
        ],
        [
          60.525,
          -909.467
        ],
        [
          59.044,
          -910.843
        ],
        [
          57.614,
          -912.274
        ],
        [
          56.239,
          -913.756
        ],
        [
          54.919,
          -915.288
        ],
        [
          53.657,
          -916.868
        ],
        [
          52.455,
          -918.494
        ],
        [
          51.313,
          -920.163
        ],
        [
          50.234,
          -921.873
        ],
        [
          49.22,
          -923.622
        ],
        [
          48.27,
          -925.408
        ],
        [
          47.388,
          -927.227
        ],
        [
          46.573,
          -929.078
        ],
        [
          45.828,
          -930.958
        ],
        [
          45.153,
          -932.864
        ],
        [
          44.549,
          -934.794
        ],
        [
          44.017,
          -936.745
        ],
        [
          43.557,
          -938.714
        ]
      ],
      "polylineImagePx": [
        [
          1169.757,
          120.217
        ],
        [
          1168.223,
          120.191
        ],
        [
          1166.691,
          120.111
        ],
        [
          1165.163,
          119.979
        ],
        [
          1163.641,
          119.794
        ],
        [
          1162.125,
          119.557
        ],
        [
          1160.619,
          119.267
        ],
        [
          1159.124,
          118.926
        ],
        [
          1157.641,
          118.534
        ],
        [
          1156.173,
          118.09
        ],
        [
          1154.721,
          117.596
        ],
        [
          1153.287,
          117.052
        ],
        [
          1151.872,
          116.459
        ],
        [
          1150.479,
          115.818
        ],
        [
          1149.109,
          115.129
        ],
        [
          1147.763,
          114.393
        ],
        [
          1146.444,
          113.611
        ],
        [
          1145.152,
          112.784
        ],
        [
          1143.89,
          111.913
        ],
        [
          1142.686,
          110.963
        ],
        [
          1141.852,
          110.239
        ],
        [
          1141.017,
          109.518
        ],
        [
          1140.209,
          108.768
        ],
        [
          1139.429,
          107.988
        ],
        [
          1138.678,
          107.179
        ],
        [
          1137.959,
          106.344
        ],
        [
          1137.27,
          105.482
        ],
        [
          1136.614,
          104.595
        ],
        [
          1135.991,
          103.685
        ],
        [
          1135.403,
          102.752
        ],
        [
          1134.849,
          101.799
        ],
        [
          1134.332,
          100.825
        ],
        [
          1133.85,
          99.833
        ],
        [
          1133.406,
          98.823
        ],
        [
          1132.999,
          97.798
        ],
        [
          1132.631,
          96.759
        ],
        [
          1132.301,
          95.706
        ],
        [
          1132.011,
          94.642
        ],
        [
          1131.76,
          93.568
        ]
      ]
    },
    {
      "id": "middle-top:wpbsa-param:drop-judge",
      "name": "middle-top drop judge",
      "areaId": "middle-top",
      "boundaryType": "dropJudge",
      "boundaryTypeName": "落袋判定区",
      "tool": "parametricPolyline",
      "toolName": "参数化多段线",
      "source": "wpbsa-2005-6-parametric-candidate",
      "outputPointCount": 20,
      "polylineTableMm": [
        [
          -50.338,
          -921.703
        ],
        [
          -47.355,
          -915.657
        ],
        [
          -43.65,
          -910.025
        ],
        [
          -39.279,
          -904.894
        ],
        [
          -34.308,
          -900.34
        ],
        [
          -28.814,
          -896.434
        ],
        [
          -22.88,
          -893.235
        ],
        [
          -16.597,
          -890.792
        ],
        [
          -10.06,
          -889.142
        ],
        [
          -3.371,
          -888.311
        ],
        [
          3.371,
          -888.311
        ],
        [
          10.06,
          -889.142
        ],
        [
          16.597,
          -890.792
        ],
        [
          22.88,
          -893.235
        ],
        [
          28.814,
          -896.434
        ],
        [
          34.308,
          -900.34
        ],
        [
          39.279,
          -904.894
        ],
        [
          43.65,
          -910.025
        ],
        [
          47.355,
          -915.657
        ],
        [
          50.338,
          -921.703
        ]
      ],
      "polylineImagePx": [
        [
          1080.54,
          102.846
        ],
        [
          1082.168,
          106.143
        ],
        [
          1084.189,
          109.214
        ],
        [
          1086.573,
          112.012
        ],
        [
          1089.285,
          114.496
        ],
        [
          1092.282,
          116.626
        ],
        [
          1095.519,
          118.371
        ],
        [
          1098.946,
          119.703
        ],
        [
          1102.512,
          120.602
        ],
        [
          1106.161,
          121.056
        ],
        [
          1109.839,
          121.056
        ],
        [
          1113.488,
          120.602
        ],
        [
          1117.054,
          119.703
        ],
        [
          1120.481,
          118.371
        ],
        [
          1123.718,
          116.626
        ],
        [
          1126.715,
          114.496
        ],
        [
          1129.427,
          112.012
        ],
        [
          1131.811,
          109.214
        ],
        [
          1133.832,
          106.143
        ],
        [
          1135.46,
          102.846
        ]
      ]
    },
    {
      "id": "middle-bottom:wpbsa-param:left-pocket-rail",
      "name": "middle-bottom left pocket rail",
      "areaId": "middle-bottom",
      "boundaryType": "pocketRail",
      "boundaryTypeName": "袋口库边区",
      "tool": "parametricPolyline",
      "toolName": "参数化多段线",
      "source": "wpbsa-2005-6-parametric-candidate",
      "outputPointCount": 39,
      "polylineTableMm": [
        [
          -113.211,
          889.849
        ],
        [
          -110.4,
          889.898
        ],
        [
          -107.592,
          890.043
        ],
        [
          -104.79,
          890.285
        ],
        [
          -101.999,
          890.624
        ],
        [
          -99.221,
          891.06
        ],
        [
          -96.46,
          891.59
        ],
        [
          -93.719,
          892.216
        ],
        [
          -91.001,
          892.936
        ],
        [
          -88.31,
          893.749
        ],
        [
          -85.648,
          894.655
        ],
        [
          -83.019,
          895.652
        ],
        [
          -80.426,
          896.74
        ],
        [
          -77.872,
          897.916
        ],
        [
          -75.36,
          899.179
        ],
        [
          -72.893,
          900.529
        ],
        [
          -70.475,
          901.963
        ],
        [
          -68.107,
          903.479
        ],
        [
          -65.793,
          905.077
        ],
        [
          -63.586,
          906.818
        ],
        [
          -62.057,
          908.146
        ],
        [
          -60.525,
          909.467
        ],
        [
          -59.044,
          910.843
        ],
        [
          -57.614,
          912.274
        ],
        [
          -56.239,
          913.756
        ],
        [
          -54.919,
          915.288
        ],
        [
          -53.657,
          916.868
        ],
        [
          -52.455,
          918.494
        ],
        [
          -51.313,
          920.163
        ],
        [
          -50.234,
          921.873
        ],
        [
          -49.22,
          923.622
        ],
        [
          -48.27,
          925.408
        ],
        [
          -47.388,
          927.227
        ],
        [
          -46.573,
          929.078
        ],
        [
          -45.828,
          930.958
        ],
        [
          -45.153,
          932.864
        ],
        [
          -44.549,
          934.794
        ],
        [
          -44.017,
          936.745
        ],
        [
          -43.557,
          938.714
        ]
      ],
      "polylineImagePx": [
        [
          1046.243,
          1090.783
        ],
        [
          1047.777,
          1090.809
        ],
        [
          1049.309,
          1090.889
        ],
        [
          1050.837,
          1091.021
        ],
        [
          1052.359,
          1091.206
        ],
        [
          1053.875,
          1091.443
        ],
        [
          1055.381,
          1091.733
        ],
        [
          1056.876,
          1092.074
        ],
        [
          1058.359,
          1092.466
        ],
        [
          1059.827,
          1092.91
        ],
        [
          1061.279,
          1093.404
        ],
        [
          1062.713,
          1093.948
        ],
        [
          1064.128,
          1094.541
        ],
        [
          1065.521,
          1095.182
        ],
        [
          1066.891,
          1095.871
        ],
        [
          1068.237,
          1096.607
        ],
        [
          1069.556,
          1097.389
        ],
        [
          1070.848,
          1098.216
        ],
        [
          1072.11,
          1099.087
        ],
        [
          1073.314,
          1100.037
        ],
        [
          1074.148,
          1100.762
        ],
        [
          1074.983,
          1101.482
        ],
        [
          1075.791,
          1102.232
        ],
        [
          1076.571,
          1103.012
        ],
        [
          1077.322,
          1103.821
        ],
        [
          1078.041,
          1104.656
        ],
        [
          1078.73,
          1105.518
        ],
        [
          1079.386,
          1106.405
        ],
        [
          1080.009,
          1107.315
        ],
        [
          1080.597,
          1108.248
        ],
        [
          1081.151,
          1109.201
        ],
        [
          1081.668,
          1110.175
        ],
        [
          1082.15,
          1111.167
        ],
        [
          1082.594,
          1112.177
        ],
        [
          1083.001,
          1113.202
        ],
        [
          1083.369,
          1114.242
        ],
        [
          1083.699,
          1115.294
        ],
        [
          1083.989,
          1116.358
        ],
        [
          1084.24,
          1117.432
        ]
      ]
    },
    {
      "id": "middle-bottom:wpbsa-param:right-pocket-rail",
      "name": "middle-bottom right pocket rail",
      "areaId": "middle-bottom",
      "boundaryType": "pocketRail",
      "boundaryTypeName": "袋口库边区",
      "tool": "parametricPolyline",
      "toolName": "参数化多段线",
      "source": "wpbsa-2005-6-parametric-candidate",
      "outputPointCount": 39,
      "polylineTableMm": [
        [
          113.211,
          889.849
        ],
        [
          110.4,
          889.898
        ],
        [
          107.592,
          890.043
        ],
        [
          104.79,
          890.285
        ],
        [
          101.999,
          890.624
        ],
        [
          99.221,
          891.06
        ],
        [
          96.46,
          891.59
        ],
        [
          93.719,
          892.216
        ],
        [
          91.001,
          892.936
        ],
        [
          88.31,
          893.749
        ],
        [
          85.648,
          894.655
        ],
        [
          83.019,
          895.652
        ],
        [
          80.426,
          896.74
        ],
        [
          77.872,
          897.916
        ],
        [
          75.36,
          899.179
        ],
        [
          72.893,
          900.529
        ],
        [
          70.475,
          901.963
        ],
        [
          68.107,
          903.479
        ],
        [
          65.793,
          905.077
        ],
        [
          63.586,
          906.818
        ],
        [
          62.057,
          908.146
        ],
        [
          60.525,
          909.467
        ],
        [
          59.044,
          910.843
        ],
        [
          57.614,
          912.274
        ],
        [
          56.239,
          913.756
        ],
        [
          54.919,
          915.288
        ],
        [
          53.657,
          916.868
        ],
        [
          52.455,
          918.494
        ],
        [
          51.313,
          920.163
        ],
        [
          50.234,
          921.873
        ],
        [
          49.22,
          923.622
        ],
        [
          48.27,
          925.408
        ],
        [
          47.388,
          927.227
        ],
        [
          46.573,
          929.078
        ],
        [
          45.828,
          930.958
        ],
        [
          45.153,
          932.864
        ],
        [
          44.549,
          934.794
        ],
        [
          44.017,
          936.745
        ],
        [
          43.557,
          938.714
        ]
      ],
      "polylineImagePx": [
        [
          1169.757,
          1090.783
        ],
        [
          1168.223,
          1090.809
        ],
        [
          1166.691,
          1090.889
        ],
        [
          1165.163,
          1091.021
        ],
        [
          1163.641,
          1091.206
        ],
        [
          1162.125,
          1091.443
        ],
        [
          1160.619,
          1091.733
        ],
        [
          1159.124,
          1092.074
        ],
        [
          1157.641,
          1092.466
        ],
        [
          1156.173,
          1092.91
        ],
        [
          1154.721,
          1093.404
        ],
        [
          1153.287,
          1093.948
        ],
        [
          1151.872,
          1094.541
        ],
        [
          1150.479,
          1095.182
        ],
        [
          1149.109,
          1095.871
        ],
        [
          1147.763,
          1096.607
        ],
        [
          1146.444,
          1097.389
        ],
        [
          1145.152,
          1098.216
        ],
        [
          1143.89,
          1099.087
        ],
        [
          1142.686,
          1100.037
        ],
        [
          1141.852,
          1100.762
        ],
        [
          1141.017,
          1101.482
        ],
        [
          1140.209,
          1102.232
        ],
        [
          1139.429,
          1103.012
        ],
        [
          1138.678,
          1103.821
        ],
        [
          1137.959,
          1104.656
        ],
        [
          1137.27,
          1105.518
        ],
        [
          1136.614,
          1106.405
        ],
        [
          1135.991,
          1107.315
        ],
        [
          1135.403,
          1108.248
        ],
        [
          1134.849,
          1109.201
        ],
        [
          1134.332,
          1110.175
        ],
        [
          1133.85,
          1111.167
        ],
        [
          1133.406,
          1112.177
        ],
        [
          1132.999,
          1113.202
        ],
        [
          1132.631,
          1114.242
        ],
        [
          1132.301,
          1115.294
        ],
        [
          1132.011,
          1116.358
        ],
        [
          1131.76,
          1117.432
        ]
      ]
    },
    {
      "id": "middle-bottom:wpbsa-param:drop-judge",
      "name": "middle-bottom drop judge",
      "areaId": "middle-bottom",
      "boundaryType": "dropJudge",
      "boundaryTypeName": "落袋判定区",
      "tool": "parametricPolyline",
      "toolName": "参数化多段线",
      "source": "wpbsa-2005-6-parametric-candidate",
      "outputPointCount": 20,
      "polylineTableMm": [
        [
          -50.338,
          921.703
        ],
        [
          -47.355,
          915.657
        ],
        [
          -43.65,
          910.025
        ],
        [
          -39.279,
          904.894
        ],
        [
          -34.308,
          900.34
        ],
        [
          -28.814,
          896.434
        ],
        [
          -22.88,
          893.235
        ],
        [
          -16.597,
          890.792
        ],
        [
          -10.06,
          889.142
        ],
        [
          -3.371,
          888.311
        ],
        [
          3.371,
          888.311
        ],
        [
          10.06,
          889.142
        ],
        [
          16.597,
          890.792
        ],
        [
          22.88,
          893.235
        ],
        [
          28.814,
          896.434
        ],
        [
          34.308,
          900.34
        ],
        [
          39.279,
          904.894
        ],
        [
          43.65,
          910.025
        ],
        [
          47.355,
          915.657
        ],
        [
          50.338,
          921.703
        ]
      ],
      "polylineImagePx": [
        [
          1080.54,
          1108.154
        ],
        [
          1082.168,
          1104.858
        ],
        [
          1084.189,
          1101.786
        ],
        [
          1086.573,
          1098.988
        ],
        [
          1089.285,
          1096.504
        ],
        [
          1092.282,
          1094.374
        ],
        [
          1095.519,
          1092.63
        ],
        [
          1098.946,
          1091.297
        ],
        [
          1102.512,
          1090.398
        ],
        [
          1106.161,
          1089.944
        ],
        [
          1109.839,
          1089.944
        ],
        [
          1113.488,
          1090.398
        ],
        [
          1117.054,
          1091.297
        ],
        [
          1120.481,
          1092.63
        ],
        [
          1123.718,
          1094.374
        ],
        [
          1126.715,
          1096.504
        ],
        [
          1129.427,
          1098.988
        ],
        [
          1131.811,
          1101.786
        ],
        [
          1133.832,
          1104.858
        ],
        [
          1135.46,
          1108.154
        ]
      ]
    },
    {
      "id": "corner-top-right:wpbsa-param:left-pocket-rail",
      "name": "corner-top-right mirrored pocket rail",
      "areaId": "corner-top-right",
      "boundaryType": "pocketRail",
      "boundaryTypeName": "袋口库边区",
      "tool": "parametricPolyline",
      "toolName": "参数化多段线",
      "source": "wpbsa-2005-6-parametric-candidate",
      "outputPointCount": 40,
      "polylineTableMm": [
        [
          1786.491,
          -800.067
        ],
        [
          1786.517,
          -802.058
        ],
        [
          1786.596,
          -804.048
        ],
        [
          1786.726,
          -806.035
        ],
        [
          1786.909,
          -808.017
        ],
        [
          1787.144,
          -809.995
        ],
        [
          1787.431,
          -811.965
        ],
        [
          1787.769,
          -813.927
        ],
        [
          1788.159,
          -815.88
        ],
        [
          1788.6,
          -817.822
        ],
        [
          1789.092,
          -819.751
        ],
        [
          1789.635,
          -821.667
        ],
        [
          1790.227,
          -823.568
        ],
        [
          1790.87,
          -825.453
        ],
        [
          1791.562,
          -827.32
        ],
        [
          1792.302,
          -829.168
        ],
        [
          1793.091,
          -830.997
        ],
        [
          1793.928,
          -832.803
        ],
        [
          1794.811,
          -834.588
        ],
        [
          1795.742,
          -836.348
        ],
        [
          1796.652,
          -837.801
        ],
        [
          1797.505,
          -839.284
        ],
        [
          1798.38,
          -840.754
        ],
        [
          1799.278,
          -842.211
        ],
        [
          1800.197,
          -843.654
        ],
        [
          1801.138,
          -845.083
        ],
        [
          1802.1,
          -846.498
        ],
        [
          1803.083,
          -847.898
        ],
        [
          1804.087,
          -849.284
        ],
        [
          1805.112,
          -850.654
        ],
        [
          1806.158,
          -852.008
        ],
        [
          1807.224,
          -853.347
        ],
        [
          1808.31,
          -854.669
        ],
        [
          1809.415,
          -855.975
        ],
        [
          1810.54,
          -857.264
        ],
        [
          1811.685,
          -858.536
        ],
        [
          1812.848,
          -859.79
        ],
        [
          1814.031,
          -861.027
        ],
        [
          1815.231,
          -862.246
        ],
        [
          1833.844,
          -880.859
        ]
      ],
      "polylineImagePx": [
        [
          2082.533,
          169.18
        ],
        [
          2082.547,
          168.094
        ],
        [
          2082.59,
          167.009
        ],
        [
          2082.661,
          165.926
        ],
        [
          2082.761,
          164.844
        ],
        [
          2082.889,
          163.766
        ],
        [
          2083.046,
          162.691
        ],
        [
          2083.23,
          161.621
        ],
        [
          2083.443,
          160.556
        ],
        [
          2083.684,
          159.497
        ],
        [
          2083.952,
          158.445
        ],
        [
          2084.248,
          157.4
        ],
        [
          2084.571,
          156.364
        ],
        [
          2084.922,
          155.336
        ],
        [
          2085.299,
          154.318
        ],
        [
          2085.703,
          153.31
        ],
        [
          2086.133,
          152.313
        ],
        [
          2086.59,
          151.327
        ],
        [
          2087.072,
          150.354
        ],
        [
          2087.579,
          149.394
        ],
        [
          2088.076,
          148.602
        ],
        [
          2088.541,
          147.793
        ],
        [
          2089.019,
          146.991
        ],
        [
          2089.508,
          146.197
        ],
        [
          2090.009,
          145.41
        ],
        [
          2090.523,
          144.63
        ],
        [
          2091.048,
          143.859
        ],
        [
          2091.584,
          143.095
        ],
        [
          2092.132,
          142.34
        ],
        [
          2092.691,
          141.592
        ],
        [
          2093.261,
          140.854
        ],
        [
          2093.843,
          140.124
        ],
        [
          2094.435,
          139.403
        ],
        [
          2095.038,
          138.691
        ],
        [
          2095.652,
          137.988
        ],
        [
          2096.276,
          137.294
        ],
        [
          2096.911,
          136.61
        ],
        [
          2097.556,
          135.935
        ],
        [
          2098.211,
          135.27
        ],
        [
          2108.364,
          125.12
        ]
      ]
    },
    {
      "id": "corner-top-right:wpbsa-param:right-pocket-rail",
      "name": "corner-top-right pocket rail",
      "areaId": "corner-top-right",
      "boundaryType": "pocketRail",
      "boundaryTypeName": "袋口库边区",
      "tool": "parametricPolyline",
      "toolName": "参数化多段线",
      "source": "wpbsa-2005-6-parametric-candidate",
      "outputPointCount": 40,
      "polylineTableMm": [
        [
          1696.706,
          -889.849
        ],
        [
          1698.697,
          -889.875
        ],
        [
          1700.687,
          -889.954
        ],
        [
          1702.674,
          -890.084
        ],
        [
          1704.656,
          -890.267
        ],
        [
          1706.634,
          -890.502
        ],
        [
          1708.604,
          -890.789
        ],
        [
          1710.566,
          -891.128
        ],
        [
          1712.519,
          -891.518
        ],
        [
          1714.461,
          -891.959
        ],
        [
          1716.39,
          -892.451
        ],
        [
          1718.306,
          -892.994
        ],
        [
          1720.207,
          -893.586
        ],
        [
          1722.092,
          -894.229
        ],
        [
          1723.959,
          -894.92
        ],
        [
          1725.807,
          -895.661
        ],
        [
          1727.635,
          -896.45
        ],
        [
          1729.442,
          -897.287
        ],
        [
          1731.226,
          -898.171
        ],
        [
          1732.987,
          -899.101
        ],
        [
          1734.439,
          -900.011
        ],
        [
          1735.922,
          -900.864
        ],
        [
          1737.393,
          -901.74
        ],
        [
          1738.85,
          -902.637
        ],
        [
          1740.293,
          -903.556
        ],
        [
          1741.722,
          -904.497
        ],
        [
          1743.137,
          -905.459
        ],
        [
          1744.537,
          -906.443
        ],
        [
          1745.922,
          -907.447
        ],
        [
          1747.292,
          -908.472
        ],
        [
          1748.646,
          -909.518
        ],
        [
          1749.985,
          -910.584
        ],
        [
          1751.307,
          -911.669
        ],
        [
          1752.613,
          -912.775
        ],
        [
          1753.902,
          -913.9
        ],
        [
          1755.174,
          -915.045
        ],
        [
          1756.428,
          -916.208
        ],
        [
          1757.665,
          -917.391
        ],
        [
          1758.884,
          -918.591
        ],
        [
          1777.497,
          -937.205
        ]
      ],
      "polylineImagePx": [
        [
          2033.555,
          120.217
        ],
        [
          2034.641,
          120.203
        ],
        [
          2035.727,
          120.16
        ],
        [
          2036.81,
          120.089
        ],
        [
          2037.892,
          119.989
        ],
        [
          2038.971,
          119.861
        ],
        [
          2040.046,
          119.704
        ],
        [
          2041.116,
          119.52
        ],
        [
          2042.181,
          119.307
        ],
        [
          2043.24,
          119.066
        ],
        [
          2044.293,
          118.798
        ],
        [
          2045.338,
          118.502
        ],
        [
          2046.375,
          118.179
        ],
        [
          2047.403,
          117.829
        ],
        [
          2048.422,
          117.451
        ],
        [
          2049.43,
          117.047
        ],
        [
          2050.427,
          116.617
        ],
        [
          2051.413,
          116.161
        ],
        [
          2052.386,
          115.679
        ],
        [
          2053.346,
          115.171
        ],
        [
          2054.139,
          114.675
        ],
        [
          2054.948,
          114.21
        ],
        [
          2055.75,
          113.732
        ],
        [
          2056.544,
          113.243
        ],
        [
          2057.332,
          112.742
        ],
        [
          2058.111,
          112.229
        ],
        [
          2058.883,
          111.704
        ],
        [
          2059.647,
          111.168
        ],
        [
          2060.403,
          110.62
        ],
        [
          2061.15,
          110.061
        ],
        [
          2061.889,
          109.491
        ],
        [
          2062.619,
          108.909
        ],
        [
          2063.34,
          108.317
        ],
        [
          2064.052,
          107.714
        ],
        [
          2064.756,
          107.101
        ],
        [
          2065.449,
          106.476
        ],
        [
          2066.134,
          105.842
        ],
        [
          2066.808,
          105.197
        ],
        [
          2067.473,
          104.542
        ],
        [
          2077.627,
          94.392
        ]
      ]
    },
    {
      "id": "corner-top-right:wpbsa-param:drop-judge",
      "name": "corner-top-right drop judge",
      "areaId": "corner-top-right",
      "boundaryType": "dropJudge",
      "boundaryTypeName": "落袋判定区",
      "tool": "parametricPolyline",
      "toolName": "参数化多段线",
      "source": "wpbsa-2005-6-parametric-candidate",
      "outputPointCount": 20,
      "polylineTableMm": [
        [
          1749.641,
          -910.306
        ],
        [
          1751.094,
          -906.121
        ],
        [
          1752.756,
          -902.014
        ],
        [
          1754.621,
          -897.995
        ],
        [
          1756.685,
          -894.075
        ],
        [
          1758.943,
          -890.263
        ],
        [
          1761.389,
          -886.569
        ],
        [
          1764.017,
          -883.002
        ],
        [
          1766.821,
          -879.572
        ],
        [
          1769.793,
          -876.286
        ],
        [
          1772.926,
          -873.153
        ],
        [
          1776.212,
          -870.182
        ],
        [
          1779.642,
          -867.378
        ],
        [
          1783.209,
          -864.75
        ],
        [
          1786.903,
          -862.304
        ],
        [
          1790.715,
          -860.046
        ],
        [
          1794.635,
          -857.982
        ],
        [
          1798.654,
          -856.117
        ],
        [
          1802.761,
          -854.456
        ],
        [
          1806.946,
          -853.002
        ]
      ],
      "polylineImagePx": [
        [
          2062.431,
          109.061
        ],
        [
          2063.224,
          111.343
        ],
        [
          2064.13,
          113.583
        ],
        [
          2065.148,
          115.775
        ],
        [
          2066.274,
          117.912
        ],
        [
          2067.505,
          119.991
        ],
        [
          2068.84,
          122.006
        ],
        [
          2070.274,
          123.951
        ],
        [
          2071.803,
          125.822
        ],
        [
          2073.424,
          127.614
        ],
        [
          2075.133,
          129.322
        ],
        [
          2076.926,
          130.943
        ],
        [
          2078.797,
          132.472
        ],
        [
          2080.743,
          133.905
        ],
        [
          2082.758,
          135.239
        ],
        [
          2084.837,
          136.47
        ],
        [
          2086.976,
          137.596
        ],
        [
          2089.168,
          138.613
        ],
        [
          2091.408,
          139.519
        ],
        [
          2093.691,
          140.312
        ]
      ]
    },
    {
      "id": "corner-bottom-right:wpbsa-param:left-pocket-rail",
      "name": "corner-bottom-right mirrored pocket rail",
      "areaId": "corner-bottom-right",
      "boundaryType": "pocketRail",
      "boundaryTypeName": "袋口库边区",
      "tool": "parametricPolyline",
      "toolName": "参数化多段线",
      "source": "wpbsa-2005-6-parametric-candidate",
      "outputPointCount": 40,
      "polylineTableMm": [
        [
          1786.491,
          800.067
        ],
        [
          1786.517,
          802.058
        ],
        [
          1786.596,
          804.048
        ],
        [
          1786.726,
          806.035
        ],
        [
          1786.909,
          808.017
        ],
        [
          1787.144,
          809.995
        ],
        [
          1787.431,
          811.965
        ],
        [
          1787.769,
          813.927
        ],
        [
          1788.159,
          815.88
        ],
        [
          1788.6,
          817.822
        ],
        [
          1789.092,
          819.751
        ],
        [
          1789.635,
          821.667
        ],
        [
          1790.227,
          823.568
        ],
        [
          1790.87,
          825.453
        ],
        [
          1791.562,
          827.32
        ],
        [
          1792.302,
          829.168
        ],
        [
          1793.091,
          830.997
        ],
        [
          1793.928,
          832.803
        ],
        [
          1794.811,
          834.588
        ],
        [
          1795.742,
          836.348
        ],
        [
          1796.652,
          837.801
        ],
        [
          1797.505,
          839.284
        ],
        [
          1798.38,
          840.754
        ],
        [
          1799.278,
          842.211
        ],
        [
          1800.197,
          843.654
        ],
        [
          1801.138,
          845.083
        ],
        [
          1802.1,
          846.498
        ],
        [
          1803.083,
          847.898
        ],
        [
          1804.087,
          849.284
        ],
        [
          1805.112,
          850.654
        ],
        [
          1806.158,
          852.008
        ],
        [
          1807.224,
          853.347
        ],
        [
          1808.31,
          854.669
        ],
        [
          1809.415,
          855.975
        ],
        [
          1810.54,
          857.264
        ],
        [
          1811.685,
          858.536
        ],
        [
          1812.848,
          859.79
        ],
        [
          1814.031,
          861.027
        ],
        [
          1815.231,
          862.246
        ],
        [
          1833.844,
          880.859
        ]
      ],
      "polylineImagePx": [
        [
          2082.533,
          1041.82
        ],
        [
          2082.547,
          1042.906
        ],
        [
          2082.59,
          1043.991
        ],
        [
          2082.661,
          1045.074
        ],
        [
          2082.761,
          1046.156
        ],
        [
          2082.889,
          1047.234
        ],
        [
          2083.046,
          1048.309
        ],
        [
          2083.23,
          1049.379
        ],
        [
          2083.443,
          1050.444
        ],
        [
          2083.684,
          1051.503
        ],
        [
          2083.952,
          1052.555
        ],
        [
          2084.248,
          1053.6
        ],
        [
          2084.571,
          1054.636
        ],
        [
          2084.922,
          1055.664
        ],
        [
          2085.299,
          1056.682
        ],
        [
          2085.703,
          1057.69
        ],
        [
          2086.133,
          1058.688
        ],
        [
          2086.59,
          1059.673
        ],
        [
          2087.072,
          1060.646
        ],
        [
          2087.579,
          1061.606
        ],
        [
          2088.076,
          1062.398
        ],
        [
          2088.541,
          1063.207
        ],
        [
          2089.019,
          1064.009
        ],
        [
          2089.508,
          1064.803
        ],
        [
          2090.009,
          1065.59
        ],
        [
          2090.523,
          1066.37
        ],
        [
          2091.048,
          1067.141
        ],
        [
          2091.584,
          1067.905
        ],
        [
          2092.132,
          1068.661
        ],
        [
          2092.691,
          1069.408
        ],
        [
          2093.261,
          1070.146
        ],
        [
          2093.843,
          1070.876
        ],
        [
          2094.435,
          1071.597
        ],
        [
          2095.038,
          1072.31
        ],
        [
          2095.652,
          1073.012
        ],
        [
          2096.276,
          1073.706
        ],
        [
          2096.911,
          1074.39
        ],
        [
          2097.556,
          1075.065
        ],
        [
          2098.211,
          1075.73
        ],
        [
          2108.364,
          1085.88
        ]
      ]
    },
    {
      "id": "corner-bottom-right:wpbsa-param:right-pocket-rail",
      "name": "corner-bottom-right pocket rail",
      "areaId": "corner-bottom-right",
      "boundaryType": "pocketRail",
      "boundaryTypeName": "袋口库边区",
      "tool": "parametricPolyline",
      "toolName": "参数化多段线",
      "source": "wpbsa-2005-6-parametric-candidate",
      "outputPointCount": 40,
      "polylineTableMm": [
        [
          1696.706,
          889.849
        ],
        [
          1698.697,
          889.875
        ],
        [
          1700.687,
          889.954
        ],
        [
          1702.674,
          890.084
        ],
        [
          1704.656,
          890.267
        ],
        [
          1706.634,
          890.502
        ],
        [
          1708.604,
          890.789
        ],
        [
          1710.566,
          891.128
        ],
        [
          1712.519,
          891.518
        ],
        [
          1714.461,
          891.959
        ],
        [
          1716.39,
          892.451
        ],
        [
          1718.306,
          892.994
        ],
        [
          1720.207,
          893.586
        ],
        [
          1722.092,
          894.229
        ],
        [
          1723.959,
          894.92
        ],
        [
          1725.807,
          895.661
        ],
        [
          1727.635,
          896.45
        ],
        [
          1729.442,
          897.287
        ],
        [
          1731.226,
          898.171
        ],
        [
          1732.987,
          899.101
        ],
        [
          1734.439,
          900.011
        ],
        [
          1735.922,
          900.864
        ],
        [
          1737.393,
          901.74
        ],
        [
          1738.85,
          902.637
        ],
        [
          1740.293,
          903.556
        ],
        [
          1741.722,
          904.497
        ],
        [
          1743.137,
          905.459
        ],
        [
          1744.537,
          906.443
        ],
        [
          1745.922,
          907.447
        ],
        [
          1747.292,
          908.472
        ],
        [
          1748.646,
          909.518
        ],
        [
          1749.985,
          910.584
        ],
        [
          1751.307,
          911.669
        ],
        [
          1752.613,
          912.775
        ],
        [
          1753.902,
          913.9
        ],
        [
          1755.174,
          915.045
        ],
        [
          1756.428,
          916.208
        ],
        [
          1757.665,
          917.391
        ],
        [
          1758.884,
          918.591
        ],
        [
          1777.497,
          937.205
        ]
      ],
      "polylineImagePx": [
        [
          2033.555,
          1090.783
        ],
        [
          2034.641,
          1090.797
        ],
        [
          2035.727,
          1090.84
        ],
        [
          2036.81,
          1090.911
        ],
        [
          2037.892,
          1091.011
        ],
        [
          2038.971,
          1091.139
        ],
        [
          2040.046,
          1091.296
        ],
        [
          2041.116,
          1091.48
        ],
        [
          2042.181,
          1091.693
        ],
        [
          2043.24,
          1091.934
        ],
        [
          2044.293,
          1092.202
        ],
        [
          2045.338,
          1092.498
        ],
        [
          2046.375,
          1092.821
        ],
        [
          2047.403,
          1093.171
        ],
        [
          2048.422,
          1093.549
        ],
        [
          2049.43,
          1093.953
        ],
        [
          2050.427,
          1094.383
        ],
        [
          2051.413,
          1094.839
        ],
        [
          2052.386,
          1095.321
        ],
        [
          2053.346,
          1095.829
        ],
        [
          2054.139,
          1096.325
        ],
        [
          2054.948,
          1096.79
        ],
        [
          2055.75,
          1097.268
        ],
        [
          2056.544,
          1097.757
        ],
        [
          2057.332,
          1098.258
        ],
        [
          2058.111,
          1098.771
        ],
        [
          2058.883,
          1099.296
        ],
        [
          2059.647,
          1099.832
        ],
        [
          2060.403,
          1100.38
        ],
        [
          2061.15,
          1100.939
        ],
        [
          2061.889,
          1101.509
        ],
        [
          2062.619,
          1102.091
        ],
        [
          2063.34,
          1102.683
        ],
        [
          2064.052,
          1103.286
        ],
        [
          2064.756,
          1103.899
        ],
        [
          2065.449,
          1104.524
        ],
        [
          2066.134,
          1105.158
        ],
        [
          2066.808,
          1105.803
        ],
        [
          2067.473,
          1106.458
        ],
        [
          2077.627,
          1116.609
        ]
      ]
    },
    {
      "id": "corner-bottom-right:wpbsa-param:drop-judge",
      "name": "corner-bottom-right drop judge",
      "areaId": "corner-bottom-right",
      "boundaryType": "dropJudge",
      "boundaryTypeName": "落袋判定区",
      "tool": "parametricPolyline",
      "toolName": "参数化多段线",
      "source": "wpbsa-2005-6-parametric-candidate",
      "outputPointCount": 20,
      "polylineTableMm": [
        [
          1749.641,
          910.306
        ],
        [
          1751.094,
          906.121
        ],
        [
          1752.756,
          902.014
        ],
        [
          1754.621,
          897.995
        ],
        [
          1756.685,
          894.075
        ],
        [
          1758.943,
          890.263
        ],
        [
          1761.389,
          886.569
        ],
        [
          1764.017,
          883.002
        ],
        [
          1766.821,
          879.572
        ],
        [
          1769.793,
          876.286
        ],
        [
          1772.926,
          873.153
        ],
        [
          1776.212,
          870.182
        ],
        [
          1779.642,
          867.378
        ],
        [
          1783.209,
          864.75
        ],
        [
          1786.903,
          862.304
        ],
        [
          1790.715,
          860.046
        ],
        [
          1794.635,
          857.982
        ],
        [
          1798.654,
          856.117
        ],
        [
          1802.761,
          854.456
        ],
        [
          1806.946,
          853.002
        ]
      ],
      "polylineImagePx": [
        [
          2062.431,
          1101.939
        ],
        [
          2063.224,
          1099.657
        ],
        [
          2064.13,
          1097.417
        ],
        [
          2065.148,
          1095.226
        ],
        [
          2066.274,
          1093.088
        ],
        [
          2067.505,
          1091.009
        ],
        [
          2068.84,
          1088.994
        ],
        [
          2070.274,
          1087.049
        ],
        [
          2071.803,
          1085.178
        ],
        [
          2073.424,
          1083.386
        ],
        [
          2075.133,
          1081.678
        ],
        [
          2076.926,
          1080.057
        ],
        [
          2078.797,
          1078.528
        ],
        [
          2080.743,
          1077.095
        ],
        [
          2082.758,
          1075.761
        ],
        [
          2084.837,
          1074.53
        ],
        [
          2086.976,
          1073.404
        ],
        [
          2089.168,
          1072.387
        ],
        [
          2091.408,
          1071.481
        ],
        [
          2093.691,
          1070.689
        ]
      ]
    },
    {
      "id": "corner-bottom-left:wpbsa-param:left-pocket-rail",
      "name": "corner-bottom-left mirrored pocket rail",
      "areaId": "corner-bottom-left",
      "boundaryType": "pocketRail",
      "boundaryTypeName": "袋口库边区",
      "tool": "parametricPolyline",
      "toolName": "参数化多段线",
      "source": "wpbsa-2005-6-parametric-candidate",
      "outputPointCount": 40,
      "polylineTableMm": [
        [
          -1786.491,
          800.067
        ],
        [
          -1786.517,
          802.058
        ],
        [
          -1786.596,
          804.048
        ],
        [
          -1786.726,
          806.035
        ],
        [
          -1786.909,
          808.017
        ],
        [
          -1787.144,
          809.995
        ],
        [
          -1787.431,
          811.965
        ],
        [
          -1787.769,
          813.927
        ],
        [
          -1788.159,
          815.88
        ],
        [
          -1788.6,
          817.822
        ],
        [
          -1789.092,
          819.751
        ],
        [
          -1789.635,
          821.667
        ],
        [
          -1790.227,
          823.568
        ],
        [
          -1790.87,
          825.453
        ],
        [
          -1791.562,
          827.32
        ],
        [
          -1792.302,
          829.168
        ],
        [
          -1793.091,
          830.997
        ],
        [
          -1793.928,
          832.803
        ],
        [
          -1794.811,
          834.588
        ],
        [
          -1795.742,
          836.348
        ],
        [
          -1796.652,
          837.801
        ],
        [
          -1797.505,
          839.284
        ],
        [
          -1798.38,
          840.754
        ],
        [
          -1799.278,
          842.211
        ],
        [
          -1800.197,
          843.654
        ],
        [
          -1801.138,
          845.083
        ],
        [
          -1802.1,
          846.498
        ],
        [
          -1803.083,
          847.898
        ],
        [
          -1804.087,
          849.284
        ],
        [
          -1805.112,
          850.654
        ],
        [
          -1806.158,
          852.008
        ],
        [
          -1807.224,
          853.347
        ],
        [
          -1808.31,
          854.669
        ],
        [
          -1809.415,
          855.975
        ],
        [
          -1810.54,
          857.264
        ],
        [
          -1811.685,
          858.536
        ],
        [
          -1812.848,
          859.79
        ],
        [
          -1814.031,
          861.027
        ],
        [
          -1815.231,
          862.246
        ],
        [
          -1833.844,
          880.859
        ]
      ],
      "polylineImagePx": [
        [
          133.467,
          1041.82
        ],
        [
          133.453,
          1042.906
        ],
        [
          133.41,
          1043.991
        ],
        [
          133.339,
          1045.074
        ],
        [
          133.239,
          1046.156
        ],
        [
          133.111,
          1047.234
        ],
        [
          132.954,
          1048.309
        ],
        [
          132.77,
          1049.379
        ],
        [
          132.557,
          1050.444
        ],
        [
          132.316,
          1051.503
        ],
        [
          132.048,
          1052.555
        ],
        [
          131.752,
          1053.6
        ],
        [
          131.429,
          1054.636
        ],
        [
          131.078,
          1055.664
        ],
        [
          130.701,
          1056.682
        ],
        [
          130.297,
          1057.69
        ],
        [
          129.867,
          1058.688
        ],
        [
          129.41,
          1059.673
        ],
        [
          128.928,
          1060.646
        ],
        [
          128.421,
          1061.606
        ],
        [
          127.924,
          1062.398
        ],
        [
          127.459,
          1063.207
        ],
        [
          126.981,
          1064.009
        ],
        [
          126.492,
          1064.803
        ],
        [
          125.99,
          1065.59
        ],
        [
          125.477,
          1066.37
        ],
        [
          124.952,
          1067.141
        ],
        [
          124.416,
          1067.905
        ],
        [
          123.868,
          1068.661
        ],
        [
          123.309,
          1069.408
        ],
        [
          122.739,
          1070.146
        ],
        [
          122.157,
          1070.876
        ],
        [
          121.565,
          1071.597
        ],
        [
          120.962,
          1072.31
        ],
        [
          120.348,
          1073.012
        ],
        [
          119.724,
          1073.706
        ],
        [
          119.089,
          1074.39
        ],
        [
          118.444,
          1075.065
        ],
        [
          117.789,
          1075.73
        ],
        [
          107.636,
          1085.88
        ]
      ]
    },
    {
      "id": "corner-bottom-left:wpbsa-param:right-pocket-rail",
      "name": "corner-bottom-left pocket rail",
      "areaId": "corner-bottom-left",
      "boundaryType": "pocketRail",
      "boundaryTypeName": "袋口库边区",
      "tool": "parametricPolyline",
      "toolName": "参数化多段线",
      "source": "wpbsa-2005-6-parametric-candidate",
      "outputPointCount": 40,
      "polylineTableMm": [
        [
          -1696.706,
          889.849
        ],
        [
          -1698.697,
          889.875
        ],
        [
          -1700.687,
          889.954
        ],
        [
          -1702.674,
          890.084
        ],
        [
          -1704.656,
          890.267
        ],
        [
          -1706.634,
          890.502
        ],
        [
          -1708.604,
          890.789
        ],
        [
          -1710.566,
          891.128
        ],
        [
          -1712.519,
          891.518
        ],
        [
          -1714.461,
          891.959
        ],
        [
          -1716.39,
          892.451
        ],
        [
          -1718.306,
          892.994
        ],
        [
          -1720.207,
          893.586
        ],
        [
          -1722.092,
          894.229
        ],
        [
          -1723.959,
          894.92
        ],
        [
          -1725.807,
          895.661
        ],
        [
          -1727.635,
          896.45
        ],
        [
          -1729.442,
          897.287
        ],
        [
          -1731.226,
          898.171
        ],
        [
          -1732.987,
          899.101
        ],
        [
          -1734.439,
          900.011
        ],
        [
          -1735.922,
          900.864
        ],
        [
          -1737.393,
          901.74
        ],
        [
          -1738.85,
          902.637
        ],
        [
          -1740.293,
          903.556
        ],
        [
          -1741.722,
          904.497
        ],
        [
          -1743.137,
          905.459
        ],
        [
          -1744.537,
          906.443
        ],
        [
          -1745.922,
          907.447
        ],
        [
          -1747.292,
          908.472
        ],
        [
          -1748.646,
          909.518
        ],
        [
          -1749.985,
          910.584
        ],
        [
          -1751.307,
          911.669
        ],
        [
          -1752.613,
          912.775
        ],
        [
          -1753.902,
          913.9
        ],
        [
          -1755.174,
          915.045
        ],
        [
          -1756.428,
          916.208
        ],
        [
          -1757.665,
          917.391
        ],
        [
          -1758.884,
          918.591
        ],
        [
          -1777.497,
          937.205
        ]
      ],
      "polylineImagePx": [
        [
          182.445,
          1090.783
        ],
        [
          181.359,
          1090.797
        ],
        [
          180.273,
          1090.84
        ],
        [
          179.19,
          1090.911
        ],
        [
          178.108,
          1091.011
        ],
        [
          177.029,
          1091.139
        ],
        [
          175.954,
          1091.296
        ],
        [
          174.884,
          1091.48
        ],
        [
          173.819,
          1091.693
        ],
        [
          172.76,
          1091.934
        ],
        [
          171.707,
          1092.202
        ],
        [
          170.662,
          1092.498
        ],
        [
          169.625,
          1092.821
        ],
        [
          168.597,
          1093.171
        ],
        [
          167.578,
          1093.549
        ],
        [
          166.57,
          1093.953
        ],
        [
          165.573,
          1094.383
        ],
        [
          164.587,
          1094.839
        ],
        [
          163.614,
          1095.321
        ],
        [
          162.654,
          1095.829
        ],
        [
          161.861,
          1096.325
        ],
        [
          161.052,
          1096.79
        ],
        [
          160.25,
          1097.268
        ],
        [
          159.456,
          1097.757
        ],
        [
          158.668,
          1098.258
        ],
        [
          157.889,
          1098.771
        ],
        [
          157.117,
          1099.296
        ],
        [
          156.353,
          1099.832
        ],
        [
          155.597,
          1100.38
        ],
        [
          154.85,
          1100.939
        ],
        [
          154.111,
          1101.509
        ],
        [
          153.381,
          1102.091
        ],
        [
          152.66,
          1102.683
        ],
        [
          151.948,
          1103.286
        ],
        [
          151.244,
          1103.899
        ],
        [
          150.551,
          1104.524
        ],
        [
          149.866,
          1105.158
        ],
        [
          149.191,
          1105.803
        ],
        [
          148.527,
          1106.458
        ],
        [
          138.373,
          1116.609
        ]
      ]
    },
    {
      "id": "corner-bottom-left:wpbsa-param:drop-judge",
      "name": "corner-bottom-left drop judge",
      "areaId": "corner-bottom-left",
      "boundaryType": "dropJudge",
      "boundaryTypeName": "落袋判定区",
      "tool": "parametricPolyline",
      "toolName": "参数化多段线",
      "source": "wpbsa-2005-6-parametric-candidate",
      "outputPointCount": 20,
      "polylineTableMm": [
        [
          -1749.641,
          910.306
        ],
        [
          -1751.094,
          906.121
        ],
        [
          -1752.756,
          902.014
        ],
        [
          -1754.621,
          897.995
        ],
        [
          -1756.685,
          894.075
        ],
        [
          -1758.943,
          890.263
        ],
        [
          -1761.389,
          886.569
        ],
        [
          -1764.017,
          883.002
        ],
        [
          -1766.821,
          879.572
        ],
        [
          -1769.793,
          876.286
        ],
        [
          -1772.926,
          873.153
        ],
        [
          -1776.212,
          870.182
        ],
        [
          -1779.642,
          867.378
        ],
        [
          -1783.209,
          864.75
        ],
        [
          -1786.903,
          862.304
        ],
        [
          -1790.715,
          860.046
        ],
        [
          -1794.635,
          857.982
        ],
        [
          -1798.654,
          856.117
        ],
        [
          -1802.761,
          854.456
        ],
        [
          -1806.946,
          853.002
        ]
      ],
      "polylineImagePx": [
        [
          153.569,
          1101.939
        ],
        [
          152.776,
          1099.657
        ],
        [
          151.87,
          1097.417
        ],
        [
          150.852,
          1095.226
        ],
        [
          149.726,
          1093.088
        ],
        [
          148.495,
          1091.009
        ],
        [
          147.16,
          1088.994
        ],
        [
          145.726,
          1087.049
        ],
        [
          144.197,
          1085.178
        ],
        [
          142.576,
          1083.386
        ],
        [
          140.867,
          1081.678
        ],
        [
          139.074,
          1080.057
        ],
        [
          137.203,
          1078.528
        ],
        [
          135.257,
          1077.095
        ],
        [
          133.242,
          1075.761
        ],
        [
          131.163,
          1074.53
        ],
        [
          129.024,
          1073.404
        ],
        [
          126.832,
          1072.387
        ],
        [
          124.592,
          1071.481
        ],
        [
          122.309,
          1070.689
        ]
      ]
    },
    {
      "id": "corner-top-left:wpbsa-param:left-pocket-rail",
      "name": "corner-top-left mirrored pocket rail",
      "areaId": "corner-top-left",
      "boundaryType": "pocketRail",
      "boundaryTypeName": "袋口库边区",
      "tool": "parametricPolyline",
      "toolName": "参数化多段线",
      "source": "wpbsa-2005-6-parametric-candidate",
      "outputPointCount": 40,
      "polylineTableMm": [
        [
          -1786.491,
          -800.067
        ],
        [
          -1786.517,
          -802.058
        ],
        [
          -1786.596,
          -804.048
        ],
        [
          -1786.726,
          -806.035
        ],
        [
          -1786.909,
          -808.017
        ],
        [
          -1787.144,
          -809.995
        ],
        [
          -1787.431,
          -811.965
        ],
        [
          -1787.769,
          -813.927
        ],
        [
          -1788.159,
          -815.88
        ],
        [
          -1788.6,
          -817.822
        ],
        [
          -1789.092,
          -819.751
        ],
        [
          -1789.635,
          -821.667
        ],
        [
          -1790.227,
          -823.568
        ],
        [
          -1790.87,
          -825.453
        ],
        [
          -1791.562,
          -827.32
        ],
        [
          -1792.302,
          -829.168
        ],
        [
          -1793.091,
          -830.997
        ],
        [
          -1793.928,
          -832.803
        ],
        [
          -1794.811,
          -834.588
        ],
        [
          -1795.742,
          -836.348
        ],
        [
          -1796.652,
          -837.801
        ],
        [
          -1797.505,
          -839.284
        ],
        [
          -1798.38,
          -840.754
        ],
        [
          -1799.278,
          -842.211
        ],
        [
          -1800.197,
          -843.654
        ],
        [
          -1801.138,
          -845.083
        ],
        [
          -1802.1,
          -846.498
        ],
        [
          -1803.083,
          -847.898
        ],
        [
          -1804.087,
          -849.284
        ],
        [
          -1805.112,
          -850.654
        ],
        [
          -1806.158,
          -852.008
        ],
        [
          -1807.224,
          -853.347
        ],
        [
          -1808.31,
          -854.669
        ],
        [
          -1809.415,
          -855.975
        ],
        [
          -1810.54,
          -857.264
        ],
        [
          -1811.685,
          -858.536
        ],
        [
          -1812.848,
          -859.79
        ],
        [
          -1814.031,
          -861.027
        ],
        [
          -1815.231,
          -862.246
        ],
        [
          -1833.844,
          -880.859
        ]
      ],
      "polylineImagePx": [
        [
          133.467,
          169.18
        ],
        [
          133.453,
          168.094
        ],
        [
          133.41,
          167.009
        ],
        [
          133.339,
          165.926
        ],
        [
          133.239,
          164.844
        ],
        [
          133.111,
          163.766
        ],
        [
          132.954,
          162.691
        ],
        [
          132.77,
          161.621
        ],
        [
          132.557,
          160.556
        ],
        [
          132.316,
          159.497
        ],
        [
          132.048,
          158.445
        ],
        [
          131.752,
          157.4
        ],
        [
          131.429,
          156.364
        ],
        [
          131.078,
          155.336
        ],
        [
          130.701,
          154.318
        ],
        [
          130.297,
          153.31
        ],
        [
          129.867,
          152.313
        ],
        [
          129.41,
          151.327
        ],
        [
          128.928,
          150.354
        ],
        [
          128.421,
          149.394
        ],
        [
          127.924,
          148.602
        ],
        [
          127.459,
          147.793
        ],
        [
          126.981,
          146.991
        ],
        [
          126.492,
          146.197
        ],
        [
          125.99,
          145.41
        ],
        [
          125.477,
          144.63
        ],
        [
          124.952,
          143.859
        ],
        [
          124.416,
          143.095
        ],
        [
          123.868,
          142.34
        ],
        [
          123.309,
          141.592
        ],
        [
          122.739,
          140.854
        ],
        [
          122.157,
          140.124
        ],
        [
          121.565,
          139.403
        ],
        [
          120.962,
          138.691
        ],
        [
          120.348,
          137.988
        ],
        [
          119.724,
          137.294
        ],
        [
          119.089,
          136.61
        ],
        [
          118.444,
          135.935
        ],
        [
          117.789,
          135.27
        ],
        [
          107.636,
          125.12
        ]
      ]
    },
    {
      "id": "corner-top-left:wpbsa-param:right-pocket-rail",
      "name": "corner-top-left pocket rail",
      "areaId": "corner-top-left",
      "boundaryType": "pocketRail",
      "boundaryTypeName": "袋口库边区",
      "tool": "parametricPolyline",
      "toolName": "参数化多段线",
      "source": "wpbsa-2005-6-parametric-candidate",
      "outputPointCount": 40,
      "polylineTableMm": [
        [
          -1696.706,
          -889.849
        ],
        [
          -1698.697,
          -889.875
        ],
        [
          -1700.687,
          -889.954
        ],
        [
          -1702.674,
          -890.084
        ],
        [
          -1704.656,
          -890.267
        ],
        [
          -1706.634,
          -890.502
        ],
        [
          -1708.604,
          -890.789
        ],
        [
          -1710.566,
          -891.128
        ],
        [
          -1712.519,
          -891.518
        ],
        [
          -1714.461,
          -891.959
        ],
        [
          -1716.39,
          -892.451
        ],
        [
          -1718.306,
          -892.994
        ],
        [
          -1720.207,
          -893.586
        ],
        [
          -1722.092,
          -894.229
        ],
        [
          -1723.959,
          -894.92
        ],
        [
          -1725.807,
          -895.661
        ],
        [
          -1727.635,
          -896.45
        ],
        [
          -1729.442,
          -897.287
        ],
        [
          -1731.226,
          -898.171
        ],
        [
          -1732.987,
          -899.101
        ],
        [
          -1734.439,
          -900.011
        ],
        [
          -1735.922,
          -900.864
        ],
        [
          -1737.393,
          -901.74
        ],
        [
          -1738.85,
          -902.637
        ],
        [
          -1740.293,
          -903.556
        ],
        [
          -1741.722,
          -904.497
        ],
        [
          -1743.137,
          -905.459
        ],
        [
          -1744.537,
          -906.443
        ],
        [
          -1745.922,
          -907.447
        ],
        [
          -1747.292,
          -908.472
        ],
        [
          -1748.646,
          -909.518
        ],
        [
          -1749.985,
          -910.584
        ],
        [
          -1751.307,
          -911.669
        ],
        [
          -1752.613,
          -912.775
        ],
        [
          -1753.902,
          -913.9
        ],
        [
          -1755.174,
          -915.045
        ],
        [
          -1756.428,
          -916.208
        ],
        [
          -1757.665,
          -917.391
        ],
        [
          -1758.884,
          -918.591
        ],
        [
          -1777.497,
          -937.205
        ]
      ],
      "polylineImagePx": [
        [
          182.445,
          120.217
        ],
        [
          181.359,
          120.203
        ],
        [
          180.273,
          120.16
        ],
        [
          179.19,
          120.089
        ],
        [
          178.108,
          119.989
        ],
        [
          177.029,
          119.861
        ],
        [
          175.954,
          119.704
        ],
        [
          174.884,
          119.52
        ],
        [
          173.819,
          119.307
        ],
        [
          172.76,
          119.066
        ],
        [
          171.707,
          118.798
        ],
        [
          170.662,
          118.502
        ],
        [
          169.625,
          118.179
        ],
        [
          168.597,
          117.829
        ],
        [
          167.578,
          117.451
        ],
        [
          166.57,
          117.047
        ],
        [
          165.573,
          116.617
        ],
        [
          164.587,
          116.161
        ],
        [
          163.614,
          115.679
        ],
        [
          162.654,
          115.171
        ],
        [
          161.861,
          114.675
        ],
        [
          161.052,
          114.21
        ],
        [
          160.25,
          113.732
        ],
        [
          159.456,
          113.243
        ],
        [
          158.668,
          112.742
        ],
        [
          157.889,
          112.229
        ],
        [
          157.117,
          111.704
        ],
        [
          156.353,
          111.168
        ],
        [
          155.597,
          110.62
        ],
        [
          154.85,
          110.061
        ],
        [
          154.111,
          109.491
        ],
        [
          153.381,
          108.909
        ],
        [
          152.66,
          108.317
        ],
        [
          151.948,
          107.714
        ],
        [
          151.244,
          107.101
        ],
        [
          150.551,
          106.476
        ],
        [
          149.866,
          105.842
        ],
        [
          149.191,
          105.197
        ],
        [
          148.527,
          104.542
        ],
        [
          138.373,
          94.392
        ]
      ]
    },
    {
      "id": "corner-top-left:wpbsa-param:drop-judge",
      "name": "corner-top-left drop judge",
      "areaId": "corner-top-left",
      "boundaryType": "dropJudge",
      "boundaryTypeName": "落袋判定区",
      "tool": "parametricPolyline",
      "toolName": "参数化多段线",
      "source": "wpbsa-2005-6-parametric-candidate",
      "outputPointCount": 20,
      "polylineTableMm": [
        [
          -1749.641,
          -910.306
        ],
        [
          -1751.094,
          -906.121
        ],
        [
          -1752.756,
          -902.014
        ],
        [
          -1754.621,
          -897.995
        ],
        [
          -1756.685,
          -894.075
        ],
        [
          -1758.943,
          -890.263
        ],
        [
          -1761.389,
          -886.569
        ],
        [
          -1764.017,
          -883.002
        ],
        [
          -1766.821,
          -879.572
        ],
        [
          -1769.793,
          -876.286
        ],
        [
          -1772.926,
          -873.153
        ],
        [
          -1776.212,
          -870.182
        ],
        [
          -1779.642,
          -867.378
        ],
        [
          -1783.209,
          -864.75
        ],
        [
          -1786.903,
          -862.304
        ],
        [
          -1790.715,
          -860.046
        ],
        [
          -1794.635,
          -857.982
        ],
        [
          -1798.654,
          -856.117
        ],
        [
          -1802.761,
          -854.456
        ],
        [
          -1806.946,
          -853.002
        ]
      ],
      "polylineImagePx": [
        [
          153.569,
          109.061
        ],
        [
          152.776,
          111.343
        ],
        [
          151.87,
          113.583
        ],
        [
          150.852,
          115.775
        ],
        [
          149.726,
          117.912
        ],
        [
          148.495,
          119.991
        ],
        [
          147.16,
          122.006
        ],
        [
          145.726,
          123.951
        ],
        [
          144.197,
          125.822
        ],
        [
          142.576,
          127.614
        ],
        [
          140.867,
          129.322
        ],
        [
          139.074,
          130.943
        ],
        [
          137.203,
          132.472
        ],
        [
          135.257,
          133.905
        ],
        [
          133.242,
          135.239
        ],
        [
          131.163,
          136.47
        ],
        [
          129.024,
          137.596
        ],
        [
          126.832,
          138.613
        ],
        [
          124.592,
          139.519
        ],
        [
          122.309,
          140.312
        ]
      ]
    }
  ],
  "baseBoundaryId": "pro-match-84",
  "notes": [
    "Straight rails and black-hole circles are retained from the current hand-drawn boundary.",
    "Pocket rails and drop-judge edges are generated from WPBSA 2005/6 parametric arcs.",
    "Rubber/glue-edge boundary lines are intentionally omitted in this candidate."
  ],
  "parametricMetrics": {
    "arcPointCount": 20,
    "middle": {
      "computed_opening_in": 3.8630333358398308,
      "j_error_in": 0.006320049966819855,
      "k_x_in": 1.6713203375527703
    },
    "corner": {
      "computed_tangent_width_in": 3.3289994994423515,
      "r3_end_angle_deg": 118.61045966596524,
      "r45_start_angle_deg": 118.61045966596524
    }
  }
};

module.exports = {
  PRO_MATCH_84_FULL_PHYSICAL_BOUNDARIES: require('./calibratePhysicalBoundary')
    .calibratePhysicalBoundary(PRO_MATCH_84_FULL_PHYSICAL_BOUNDARIES),
};

}, {"./calibratePhysicalBoundary":11}, "apps/three-game/src/core/model/proMatch84FullPhysicalBoundaries.js"],
11: [function(require, module, exports) {
const { STANDARD_TABLE } = require('./standardTableSpec');

// Relocate complete pocket assemblies, rather than scaling their throat widths,
// lip radii or capture circles. The source remains an immutable measured asset.
function calibratePhysicalBoundary(source) {
  const straight = source.lines.filter(line => line.boundaryType === 'straightRail');
  const points = straight.flatMap(line => line.polylineTableMm);
  const oldHalfX = Math.max(...points.map(p => Math.abs(p[0])));
  const oldHalfY = Math.max(...points.map(p => Math.abs(p[1])));
  const dx = STANDARD_TABLE.lengthMm / 2 - oldHalfX;
  const dy = STANDARD_TABLE.widthMm / 2 - oldHalfY;
  const translate = (point, areaId) => {
    const middle = areaId.startsWith('middle-');
    const rail = areaId.startsWith('rail-');
    return [
      point[0] + (middle || (rail && Math.abs(point[0]) < oldHalfX / 2) ? 0 : Math.sign(point[0]) * dx),
      point[1] + Math.sign(point[1]) * dy,
    ];
  };
  return {
    ...source,
    calibration: { standard: STANDARD_TABLE.source, playAreaMm: { width: STANDARD_TABLE.lengthMm,
      height: STANDARD_TABLE.widthMm }, translationMm: { x: dx, y: dy }, pocketShapePreserved: true },
    lines: source.lines.map(line => ({
      ...line,
      controlTableMm: line.controlTableMm?.map(p => translate(p, line.areaId)),
      polylineTableMm: line.polylineTableMm?.map(p => translate(p, line.areaId)),
      ...(line.circleTableMm ? { circleTableMm: { ...line.circleTableMm,
        center: translate(line.circleTableMm.center, line.areaId) } } : {}),
    })),
  };
}

module.exports = { calibratePhysicalBoundary };

}, {"./standardTableSpec":9}, "apps/three-game/src/core/model/calibratePhysicalBoundary.js"],
12: [function(require, module, exports) {
const {
  BALL_COLORS,
  BALL_INERTIA,
  BALL_MASS,
  BALL_RADIUS_MM,
  BALL_VALUES,
} = require('../model/ballSpec');

function cloneVector2(vector) {
  return { x: vector.x, y: vector.y };
}

function createBallState(id, kind, pos, spot = pos) {
  const position = cloneVector2(pos);
  const previousPosition = cloneVector2(pos);
  const velocity = { x: 0, y: 0 };
  const angularVelocity = { x: 0, y: 0, z: 0 };

  return {
    id,
    kind,
    value: BALL_VALUES[kind],
    color: BALL_COLORS[kind],
    radius: BALL_RADIUS_MM,
    mass: BALL_MASS,
    inertia: BALL_INERTIA,
    pos: position,
    position,
    prevPos: previousPosition,
    previousPosition,
    vel: velocity,
    velocity,
    omega: angularVelocity,
    angularVelocity,
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    contactMode: 'rolling',
    pocketMode: 'table',
    pocketEntry: null,
    spot: cloneVector2(spot),
    potted: false,
    isSliding: false,
    potting: null,
    pocketState: null,
  };
}

module.exports = {
  createBallState,
};

}, {"../model/ballSpec":4}, "apps/three-game/src/core/state/ballState.js"],
13: [function(require, module, exports) {
const { createTableModel } = require('./tableModel');
const { createRailGeometry } = require('./railGeometry');
const { createPocketGeometry } = require('./pocketGeometry');
const { createCompositeLineCollider, createLineCollider, createSphereCollider } = require('./colliderPrimitives');
const { getPocketBoundaryOverride } = require('./pocketBoundaryOverrides');
const { PRO_MATCH_84_FULL_PHYSICAL_BOUNDARIES } = require('./proMatch84FullPhysicalBoundaries');
const { getTableBoundaryById } = require('./tableBoundaryPresets');

function createBoundaryRails(boundary) {
  return boundary.rails.map((rail) => createLineCollider(
    rail.id,
    rail.start,
    rail.end,
    {
      role: 'rail',
      material: 'cushion',
    },
  ));
}

function clonePoint(point) {
  return { x: point.x, y: point.y };
}

function pointFromArray(point) {
  if (Array.isArray(point)) {
    return { x: point[0], y: point[1] };
  }
  return clonePoint(point);
}

function midpoint(points) {
  if (!points.length) {
    return null;
  }
  return clonePoint(points[Math.floor((points.length - 1) / 2)]);
}

function physicalBoundaryDataFor(boundary) {
  if (boundary?.id === PRO_MATCH_84_FULL_PHYSICAL_BOUNDARIES.boundaryId) {
    return PRO_MATCH_84_FULL_PHYSICAL_BOUNDARIES;
  }
  return null;
}

function pointsFromPhysicalLine(line) {
  const points = line.polylineTableMm || line.controlTableMm || [];
  return points.map(pointFromArray).filter((point) => (
    Number.isFinite(point.x) && Number.isFinite(point.y)
  ));
}

function createPhysicalBoundaryRails(physicalBoundary) {
  return physicalBoundary.lines.reduce((rails, line) => {
    if (line.boundaryType !== 'straightRail') {
      return rails;
    }

    const points = pointsFromPhysicalLine(line);
    if (points.length >= 2) {
      rails.push(createLineCollider(
        line.id,
        points[0],
        points[points.length - 1],
        {
          role: 'rail',
          material: 'cushion',
        },
      ));
    }
    return rails;
  }, []);
}

function groupPhysicalLinesByArea(physicalBoundary) {
  const result = new Map();
  physicalBoundary.lines.forEach((line) => {
    if (!line.areaId) {
      return;
    }
    if (!result.has(line.areaId)) {
      result.set(line.areaId, []);
    }
    result.get(line.areaId).push(line);
  });
  return result;
}

function createPhysicalPocketLip(line) {
  return createCompositeLineCollider(
    line.id,
    pointsFromPhysicalLine(line),
    {
      role: 'pocket-lip',
      material: 'pocket-lip',
    },
  );
}

function createPhysicalDropEdge(line) {
  return createDropEdge({
    id: line.id,
    name: line.name,
    points: pointsFromPhysicalLine(line),
  });
}

function createBlackHoleCapture(line) {
  if (
    !line?.circleTableMm?.center
    || !Number.isFinite(line.circleTableMm.radius)
    || line.circleTableMm.radius <= 0
  ) {
    return null;
  }

  return {
    center: pointFromArray(line.circleTableMm.center),
    radius: line.circleTableMm.radius,
  };
}

function createBoundaryPocketsFromPhysicalData(boundary, physicalBoundary) {
  const linesByArea = groupPhysicalLinesByArea(physicalBoundary);

  return boundary.pockets.map((pocket) => {
    const pocketLines = linesByArea.get(pocket.id) || [];
    const throatWidthMm = boundary.throatWidthMm[pocket.type];
    const mouthWidthMm = boundary.mouthWidthMm[pocket.type];
    const lips = pocketLines
      .filter((line) => line.boundaryType === 'pocketRail' && pointsFromPhysicalLine(line).length >= 2)
      .map(createPhysicalPocketLip);
    const dropEdges = pocketLines
      .filter((line) => line.boundaryType === 'dropJudge' && pointsFromPhysicalLine(line).length >= 2)
      .map(createPhysicalDropEdge);
    const blackHole = createBlackHoleCapture(
      pocketLines
        .filter((line) => line.boundaryType === 'blackHole')
        .find((line) => createBlackHoleCapture(line)),
    );
    const center = blackHole?.center || pocket.center;
    const captureRadius = blackHole?.radius || pocket.captureRadius;
    const openingCenter = midpoint(dropEdges[0]?.points || []) || pocket.center;

    return {
      id: pocket.id,
      type: pocket.type,
      side: pocket.side,
      center: { ...center },
      candidateRadius: pocket.candidateRadius,
      renderRadius: pocket.renderRadius,
      throatWidthMm,
      mouthWidthMm,
      dropDirection: { ...pocket.dropDirection },
      capture: createSphereCollider(
        `${pocket.id}:capture`,
        center,
        captureRadius,
      ),
      blackHole: blackHole
        ? { center: { ...blackHole.center }, radius: blackHole.radius }
        : null,
      pocketDefinition: {
        id: pocket.id,
        type: pocket.type,
        direction: { ...pocket.dropDirection },
      },
      openingDefinition: {
        center: openingCenter,
        throatWidthMm,
        mouthWidthMm,
      },
      edgeDefinitions: lips,
      lips,
      dropEdges,
      boundaryOverrideSource: physicalBoundary.source,
    };
  });
}

function createDropEdge(definition) {
  return {
    id: definition.id,
    name: definition.name,
    type: 'polyline',
    role: definition.role || 'pocket-drop-edge',
    material: definition.material || 'pocket-drop-edge',
    points: definition.points.map(clonePoint),
  };
}

function createOverrideCollisionLine(definition) {
  return createCompositeLineCollider(
    definition.id,
    definition.points,
    {
      role: definition.role || 'pocket-rubber-boundary',
      material: definition.material || 'pocket-lip',
      restitution: definition.restitution,
      frictionMu: definition.frictionMu,
    },
  );
}

function createBoundaryPockets(boundary) {
  return boundary.pockets.map((pocket) => {
    const throatWidthMm = boundary.throatWidthMm[pocket.type];
    const mouthWidthMm = boundary.mouthWidthMm[pocket.type];
    const override = getPocketBoundaryOverride(boundary.id, pocket.id);
    const lips = pocket.lips.map((lip) => ({
      id: lip.id,
      type: 'composite-line',
      role: 'pocket-lip',
      material: 'pocket-lip',
      points: [],
      segments: lip.segments.map((segment) => createLineCollider(
        segment.id,
        segment.start,
        segment.end,
        {
          role: 'pocket-lip',
          material: 'pocket-lip',
        },
      )),
    }));
    const overrideCollisionLines = (override?.collisionLines || []).map(createOverrideCollisionLine);
    const dropEdges = (override?.dropEdges || []).map(createDropEdge);
    const edgeDefinitions = [...lips, ...overrideCollisionLines];

    return {
      id: pocket.id,
      type: pocket.type,
      side: pocket.side,
      center: { ...pocket.center },
      candidateRadius: pocket.candidateRadius,
      renderRadius: pocket.renderRadius,
      throatWidthMm,
      mouthWidthMm,
      dropDirection: { ...pocket.dropDirection },
      capture: createSphereCollider(
        `${pocket.id}:capture`,
        pocket.center,
        pocket.captureRadius,
      ),
      pocketDefinition: {
        id: pocket.id,
        type: pocket.type,
        direction: { ...pocket.dropDirection },
      },
      openingDefinition: {
        center: { ...pocket.center },
        throatWidthMm,
        mouthWidthMm,
      },
      edgeDefinitions,
      lips: edgeDefinitions,
      dropEdges,
      boundaryOverrideSource: override?.source || null,
    };
  });
}

function createLegacyColliderSet(table) {
  const rails = createRailGeometry(table);
  const pockets = createPocketGeometry(table);
  const pocketLips = pockets.flatMap((pocket) => pocket.lips);
  const pocketCaptures = pockets.map((pocket) => pocket.capture);

  return {
    coordinateSystem: 'center-origin-mm',
    rails,
    pockets,
    pocketLips,
    pocketCaptures,
  };
}

function createBoundaryColliderSet(boundary = getTableBoundaryById()) {
  const physicalBoundary = physicalBoundaryDataFor(boundary);
  const rails = physicalBoundary
    ? createPhysicalBoundaryRails(physicalBoundary)
    : createBoundaryRails(boundary);
  const pockets = physicalBoundary
    ? createBoundaryPocketsFromPhysicalData(boundary, physicalBoundary)
    : createBoundaryPockets(boundary);
  const pocketLips = pockets.flatMap((pocket) => pocket.lips);
  const pocketCaptures = pockets.map((pocket) => pocket.capture);
  const pocketDropEdges = pockets.flatMap((pocket) => pocket.dropEdges || []);

  return {
    coordinateSystem: boundary.coordinateSystem,
    source: physicalBoundary?.source || boundary.source,
    boundaryId: boundary.id,
    boundaryName: physicalBoundary?.boundaryName || boundary.name,
    rails,
    pockets,
    pocketLips,
    pocketCaptures,
    pocketDropEdges,
    throatWidthMm: { ...boundary.throatWidthMm },
    mouthWidthMm: { ...boundary.mouthWidthMm },
  };
}

function createTableColliderSet(table = createTableModel(), options = {}) {
  if (options.model === 'legacy' || table.physicalModel === 'legacy') {
    return createLegacyColliderSet(table);
  }

  return createBoundaryColliderSet(
    options.boundary || getTableBoundaryById(options.boundaryId || options.tableBoundaryId),
  );
}

module.exports = {
  createBoundaryColliderSet,
  createTableColliderSet,
};

}, {"./tableModel":7,"./railGeometry":14,"./pocketGeometry":16,"./colliderPrimitives":15,"./pocketBoundaryOverrides":17,"./proMatch84FullPhysicalBoundaries":10,"./tableBoundaryPresets":8}, "apps/three-game/src/core/model/tableColliderSet.js"],
14: [function(require, module, exports) {
const { createLineCollider } = require('./colliderPrimitives');
const { POCKET_GEOMETRY } = require('./pocketGeometry');

function createRailGeometry(table) {
  const half = table.halfPlayAreaMm;
  const middleGap = POCKET_GEOMETRY.middleMouthHalfWidthMm;
  const cornerCut = POCKET_GEOMETRY.cornerRailCutMm;

  return [
    createLineCollider(
      'rail-top-right',
      { x: middleGap, y: -half.height },
      { x: half.width - cornerCut, y: -half.height },
      { normal: { x: 0, y: 1 } },
    ),
    createLineCollider(
      'rail-right',
      { x: half.width, y: -half.height + cornerCut },
      { x: half.width, y: half.height - cornerCut },
      { normal: { x: -1, y: 0 } },
    ),
    createLineCollider(
      'rail-bottom-right',
      { x: half.width - cornerCut, y: half.height },
      { x: middleGap, y: half.height },
      { normal: { x: 0, y: -1 } },
    ),
    createLineCollider(
      'rail-bottom-left',
      { x: -middleGap, y: half.height },
      { x: -half.width + cornerCut, y: half.height },
      { normal: { x: 0, y: -1 } },
    ),
    createLineCollider(
      'rail-left',
      { x: -half.width, y: half.height - cornerCut },
      { x: -half.width, y: -half.height + cornerCut },
      { normal: { x: 1, y: 0 } },
    ),
    createLineCollider(
      'rail-top-left',
      { x: -half.width + cornerCut, y: -half.height },
      { x: -middleGap, y: -half.height },
      { normal: { x: 0, y: 1 } },
    ),
  ];
}

module.exports = {
  createRailGeometry,
};

}, {"./colliderPrimitives":15,"./pocketGeometry":16}, "apps/three-game/src/core/model/railGeometry.js"],
15: [function(require, module, exports) {
function clonePoint(point) {
  return { x: point.x, y: point.y };
}

function cloneVector(vector) {
  if (!vector) {
    return null;
  }
  return { x: vector.x, y: vector.y };
}

function createLineAabb(start, end) {
  return {
    minX: Math.min(start.x, end.x),
    maxX: Math.max(start.x, end.x),
    minY: Math.min(start.y, end.y),
    maxY: Math.max(start.y, end.y),
  };
}

function createLineCollider(id, start, end, options = {}) {
  return {
    id,
    type: 'line',
    role: options.role || 'rail',
    material: options.material || 'cushion',
    start: clonePoint(start),
    end: clonePoint(end),
    aabb: createLineAabb(start, end),
    normal: cloneVector(options.normal),
    restitution: options.restitution,
    frictionMu: options.frictionMu,
  };
}

function createCompositeLineCollider(id, points, options = {}) {
  const clonedPoints = points.map(clonePoint);
  const segments = [];

  for (let i = 0; i < clonedPoints.length - 1; i += 1) {
    segments.push(createLineCollider(
      `${id}:segment-${i}`,
      clonedPoints[i],
      clonedPoints[i + 1],
      {
        role: options.role || 'pocket-lip',
        material: options.material || 'pocket-lip',
        restitution: options.restitution,
        frictionMu: options.frictionMu,
      },
    ));
  }

  return {
    id,
    type: 'composite-line',
    role: options.role || 'pocket-lip',
    material: options.material || 'pocket-lip',
    points: clonedPoints,
    segments,
  };
}

function createSphereCollider(id, center, radius, options = {}) {
  return {
    id,
    type: 'sphere',
    role: options.role || 'pocket-capture',
    center: clonePoint(center),
    radius,
  };
}

module.exports = {
  createLineCollider,
  createCompositeLineCollider,
  createSphereCollider,
};

}, {}, "apps/three-game/src/core/model/colliderPrimitives.js"],
16: [function(require, module, exports) {
const { createCompositeLineCollider, createSphereCollider } = require('./colliderPrimitives');

const POCKET_GEOMETRY = {
  middleMouthHalfWidthMm: 113,
  middleCandidateRadiusMm: 235,
  middleCaptureOffsetMm: 68,
  middleCaptureRadiusMm: 66,
  middleRenderRadiusMm: 70,
  cornerRailCutMm: 88,
  cornerCandidateRadiusMm: 245,
  cornerCaptureOffsetMm: 54,
  cornerCaptureRadiusMm: 78,
  cornerRenderRadiusMm: 74,
};

function signName(value, negativeName, positiveName) {
  return value < 0 ? negativeName : positiveName;
}

function createMiddlePocket(table, verticalSign) {
  const half = table.halfPlayAreaMm;
  const side = signName(verticalSign, 'top', 'bottom');
  const id = `middle-${side}`;
  const y = verticalSign * half.height;
  const mouth = POCKET_GEOMETRY.middleMouthHalfWidthMm;
  const center = { x: 0, y };
  const captureCenter = {
    x: 0,
    y: y + verticalSign * POCKET_GEOMETRY.middleCaptureOffsetMm,
  };

  const leftLip = [
    { x: -mouth, y },
    { x: -82, y: y + verticalSign * 4 },
    { x: -48, y: y + verticalSign * 15 },
    { x: -22, y: y + verticalSign * 36 },
    { x: -8, y: y + verticalSign * 58 },
  ];
  const rightLip = leftLip.map((point) => ({ x: -point.x, y: point.y }));

  return {
    id,
    type: 'middle',
    side,
    center,
    candidateRadius: POCKET_GEOMETRY.middleCandidateRadiusMm,
    renderRadius: POCKET_GEOMETRY.middleRenderRadiusMm,
    dropDirection: { x: 0, y: verticalSign },
    capture: createSphereCollider(
      `${id}:capture`,
      captureCenter,
      POCKET_GEOMETRY.middleCaptureRadiusMm,
    ),
    lips: [
      createCompositeLineCollider(`${id}:left-lip`, leftLip),
      createCompositeLineCollider(`${id}:right-lip`, rightLip),
    ],
  };
}

function createCornerPocket(table, horizontalSign, verticalSign) {
  const half = table.halfPlayAreaMm;
  const horizontalName = signName(horizontalSign, 'left', 'right');
  const verticalName = signName(verticalSign, 'top', 'bottom');
  const id = `corner-${verticalName}-${horizontalName}`;
  const cut = POCKET_GEOMETRY.cornerRailCutMm;
  const corner = {
    x: horizontalSign * half.width,
    y: verticalSign * half.height,
  };
  const captureCenter = {
    x: corner.x + horizontalSign * POCKET_GEOMETRY.cornerCaptureOffsetMm,
    y: corner.y + verticalSign * POCKET_GEOMETRY.cornerCaptureOffsetMm,
  };
  const diagonal = Math.SQRT1_2;

  const longRailLip = [
    { x: horizontalSign * (half.width - cut), y: corner.y },
    { x: horizontalSign * (half.width - 54), y: corner.y + verticalSign * 6 },
    { x: horizontalSign * (half.width - 28), y: corner.y + verticalSign * 24 },
    { x: corner.x + horizontalSign * 10, y: corner.y + verticalSign * 50 },
  ];
  const shortRailLip = [
    { x: corner.x, y: verticalSign * (half.height - cut) },
    { x: corner.x + horizontalSign * 6, y: verticalSign * (half.height - 54) },
    { x: corner.x + horizontalSign * 24, y: verticalSign * (half.height - 28) },
    { x: corner.x + horizontalSign * 50, y: corner.y + verticalSign * 10 },
  ];

  return {
    id,
    type: 'corner',
    side: `${verticalName}-${horizontalName}`,
    center: corner,
    candidateRadius: POCKET_GEOMETRY.cornerCandidateRadiusMm,
    renderRadius: POCKET_GEOMETRY.cornerRenderRadiusMm,
    dropDirection: {
      x: horizontalSign * diagonal,
      y: verticalSign * diagonal,
    },
    capture: createSphereCollider(
      `${id}:capture`,
      captureCenter,
      POCKET_GEOMETRY.cornerCaptureRadiusMm,
    ),
    lips: [
      createCompositeLineCollider(`${id}:long-rail-lip`, longRailLip),
      createCompositeLineCollider(`${id}:short-rail-lip`, shortRailLip),
    ],
  };
}

function createPocketGeometry(table) {
  return [
    createCornerPocket(table, -1, -1),
    createMiddlePocket(table, -1),
    createCornerPocket(table, 1, -1),
    createCornerPocket(table, -1, 1),
    createMiddlePocket(table, 1),
    createCornerPocket(table, 1, 1),
  ];
}

module.exports = {
  POCKET_GEOMETRY,
  createPocketGeometry,
};

}, {"./colliderPrimitives":15}, "apps/three-game/src/core/model/pocketGeometry.js"],
17: [function(require, module, exports) {
const POCKET_BOUNDARY_POINT_DATA = {
  'middle-top': {
    blueRubber: [
      [-41.745, -966.392],
      [-41.337, -968.181],
      [-40.89, -969.929],
      [-40.407, -971.635],
      [-39.887, -973.301],
      [-39.332, -974.925],
      [-38.742, -976.509],
      [-38.119, -978.051],
      [-37.464, -979.552],
      [-36.776, -981.012],
      [-36.058, -982.431],
      [-35.31, -983.808],
      [-34.532, -985.145],
      [-33.727, -986.441],
      [-32.894, -987.695],
      [-32.034, -988.908],
      [-31.149, -990.08],
      [-30.239, -991.211],
      [-29.306, -992.301],
      [-28.349, -993.35],
      [-27.371, -994.358],
      [-26.371, -995.324],
      [-25.351, -996.25],
      [-24.311, -997.134],
      [-23.253, -997.977],
      [-22.177, -998.779],
      [-21.085, -999.54],
      [-19.977, -1000.26],
      [-18.853, -1000.939],
      [-17.716, -1001.577],
      [-16.565, -1002.173],
      [-15.402, -1002.728],
      [-14.227, -1003.243],
      [-13.042, -1003.716],
      [-11.847, -1004.148],
      [-10.644, -1004.539],
      [-9.432, -1004.888],
      [-8.213, -1005.197],
      [-6.988, -1005.464],
      [-5.758, -1005.691],
      [-4.524, -1005.876],
      [-3.285, -1006.02],
      [-2.045, -1006.123],
      [-0.802, -1006.185],
      [0.441, -1006.206],
      [1.685, -1006.186],
      [2.927, -1006.124],
      [4.168, -1006.022],
      [5.406, -1005.878],
      [6.641, -1005.693],
      [7.871, -1005.467],
      [9.096, -1005.2],
      [10.315, -1004.892],
      [11.527, -1004.542],
      [12.731, -1004.152],
      [13.926, -1003.72],
      [15.111, -1003.248],
      [16.286, -1002.734],
      [17.449, -1002.179],
      [18.6, -1001.583],
      [19.738, -1000.946],
      [20.861, -1000.267],
      [21.97, -999.548],
      [23.063, -998.787],
      [24.139, -997.986],
      [25.197, -997.143],
      [26.237, -996.259],
      [27.257, -995.334],
      [28.257, -994.368],
      [29.236, -993.36],
      [30.193, -992.312],
      [31.127, -991.222],
      [32.037, -990.091],
      [32.923, -988.92],
      [33.783, -987.707],
      [34.616, -986.453],
      [35.422, -985.157],
      [36.2, -983.821],
      [36.949, -982.444],
      [37.668, -981.025],
      [38.356, -979.565],
      [39.012, -978.064],
      [39.635, -976.522],
      [40.225, -974.939],
      [40.781, -973.315],
      [41.301, -971.65],
      [41.785, -969.943],
      [42.232, -968.195],
      [42.642, -966.407],
    ],
    whiteDrop: [
      [-52.689, -922.879],
      [-51.633, -921.547],
      [-50.567, -920.246],
      [-49.491, -918.977],
      [-48.406, -917.74],
      [-47.311, -916.535],
      [-46.207, -915.361],
      [-45.094, -914.22],
      [-43.973, -913.11],
      [-42.844, -912.032],
      [-41.706, -910.985],
      [-40.561, -909.97],
      [-39.408, -908.987],
      [-38.248, -908.036],
      [-37.082, -907.116],
      [-35.908, -906.229],
      [-34.728, -905.372],
      [-33.541, -904.548],
      [-32.349, -903.755],
      [-31.151, -902.994],
      [-29.948, -902.264],
      [-28.739, -901.566],
      [-27.526, -900.9],
      [-26.308, -900.265],
      [-25.086, -899.662],
      [-23.859, -899.09],
      [-22.629, -898.55],
      [-21.395, -898.042],
      [-20.157, -897.565],
      [-18.917, -897.12],
      [-17.674, -896.707],
      [-16.428, -896.325],
      [-15.18, -895.974],
      [-13.93, -895.655],
      [-12.678, -895.368],
      [-11.424, -895.112],
      [-10.17, -894.887],
      [-8.914, -894.694],
      [-7.658, -894.533],
      [-6.401, -894.403],
      [-5.143, -894.304],
      [-3.886, -894.237],
      [-2.629, -894.201],
      [-1.373, -894.197],
      [-0.118, -894.224],
      [1.137, -894.283],
      [2.39, -894.373],
      [3.641, -894.495],
      [4.891, -894.648],
      [6.138, -894.832],
      [7.383, -895.048],
      [8.626, -895.295],
      [9.865, -895.573],
      [11.102, -895.883],
      [12.335, -896.224],
      [13.564, -896.596],
      [14.789, -897],
      [16.011, -897.435],
      [17.227, -897.901],
      [18.439, -898.399],
      [19.647, -898.928],
      [20.848, -899.488],
      [22.045, -900.08],
      [23.235, -900.703],
      [24.42, -901.357],
      [25.598, -902.042],
      [26.77, -902.758],
      [27.935, -903.506],
      [29.093, -904.285],
      [30.244, -905.095],
      [31.387, -905.937],
      [32.522, -906.809],
      [33.649, -907.713],
      [34.768, -908.648],
      [35.878, -909.614],
      [36.98, -910.611],
      [38.072, -911.64],
      [39.155, -912.699],
      [40.228, -913.79],
      [41.291, -914.912],
      [42.344, -916.065],
      [43.387, -917.249],
      [44.419, -918.464],
      [45.44, -919.71],
      [46.45, -920.987],
      [47.448, -922.296],
      [48.435, -923.635],
      [49.41, -925.005],
      [50.372, -926.407],
    ],
  },
  'corner-top-right': {
    blueRubber: [
      [1778.185, -942.972],
      [1779.925, -946.084],
      [1781.705, -949.044],
      [1783.522, -951.855],
      [1785.374, -954.52],
      [1787.26, -957.04],
      [1789.176, -959.418],
      [1791.12, -961.656],
      [1793.091, -963.756],
      [1795.086, -965.72],
      [1797.103, -967.551],
      [1799.14, -969.25],
      [1801.194, -970.821],
      [1803.263, -972.265],
      [1805.345, -973.584],
      [1807.439, -974.781],
      [1809.54, -975.858],
      [1811.648, -976.817],
      [1813.76, -977.661],
      [1815.875, -978.391],
      [1817.988, -979.009],
      [1820.1, -979.519],
      [1822.206, -979.922],
      [1824.306, -980.22],
      [1826.396, -980.416],
      [1828.475, -980.512],
      [1830.541, -980.51],
      [1832.591, -980.412],
      [1834.622, -980.22],
      [1836.633, -979.938],
      [1838.622, -979.566],
      [1840.587, -979.108],
      [1842.524, -978.565],
      [1844.432, -977.939],
      [1846.309, -977.233],
      [1848.152, -976.45],
      [1849.959, -975.59],
      [1851.729, -974.657],
      [1853.458, -973.653],
      [1855.145, -972.58],
      [1856.787, -971.44],
      [1858.382, -970.235],
      [1859.928, -968.967],
      [1861.423, -967.64],
      [1862.864, -966.254],
      [1864.25, -964.813],
      [1865.577, -963.318],
      [1866.845, -961.772],
      [1868.05, -960.177],
      [1869.19, -958.535],
      [1870.263, -956.848],
      [1871.268, -955.118],
      [1872.201, -953.349],
      [1873.061, -951.541],
      [1873.845, -949.698],
      [1874.551, -947.82],
      [1875.177, -945.912],
      [1875.72, -943.974],
      [1876.179, -942.01],
      [1876.551, -940.021],
      [1876.834, -938.009],
      [1877.026, -935.977],
      [1877.124, -933.926],
      [1877.127, -931.86],
      [1877.032, -929.781],
      [1876.837, -927.69],
      [1876.539, -925.589],
      [1876.137, -923.482],
      [1875.628, -921.37],
      [1875.01, -919.256],
      [1874.281, -917.141],
      [1873.438, -915.028],
      [1872.48, -912.919],
      [1871.404, -910.816],
      [1870.208, -908.722],
      [1868.889, -906.639],
      [1867.446, -904.569],
      [1865.877, -902.514],
      [1864.178, -900.476],
      [1862.348, -898.458],
      [1860.385, -896.462],
      [1858.286, -894.49],
      [1856.049, -892.544],
      [1853.673, -890.627],
      [1851.154, -888.741],
      [1848.49, -886.887],
      [1845.68, -885.069],
      [1842.721, -883.288],
      [1839.611, -881.546],
    ],
    whiteDrop: [
      [1748.089, -911.765],
      [1748.302, -910.585],
      [1748.526, -909.417],
      [1748.762, -908.26],
      [1749.008, -907.115],
      [1749.266, -905.983],
      [1749.536, -904.862],
      [1749.816, -903.753],
      [1750.108, -902.656],
      [1750.411, -901.57],
      [1750.725, -900.497],
      [1751.051, -899.435],
      [1751.387, -898.386],
      [1751.735, -897.348],
      [1752.094, -896.322],
      [1752.464, -895.308],
      [1752.846, -894.306],
      [1753.239, -893.315],
      [1753.643, -892.337],
      [1754.058, -891.37],
      [1754.485, -890.416],
      [1754.922, -889.473],
      [1755.371, -888.542],
      [1755.831, -887.623],
      [1756.303, -886.716],
      [1756.785, -885.82],
      [1757.279, -884.937],
      [1757.784, -884.065],
      [1758.3, -883.205],
      [1758.828, -882.357],
      [1759.367, -881.521],
      [1759.917, -880.697],
      [1760.478, -879.885],
      [1761.05, -879.084],
      [1761.634, -878.296],
      [1762.229, -877.519],
      [1762.835, -876.754],
      [1763.452, -876.001],
      [1764.081, -875.26],
      [1764.721, -874.531],
      [1765.372, -873.814],
      [1766.034, -873.108],
      [1766.707, -872.415],
      [1767.392, -871.733],
      [1768.088, -871.063],
      [1768.795, -870.405],
      [1769.513, -869.759],
      [1770.243, -869.124],
      [1770.984, -868.502],
      [1771.736, -867.891],
      [1772.499, -867.293],
      [1773.273, -866.706],
      [1774.059, -866.131],
      [1774.856, -865.568],
      [1775.664, -865.017],
      [1776.484, -864.477],
      [1777.314, -863.95],
      [1778.156, -863.434],
      [1779.009, -862.931],
      [1779.874, -862.439],
      [1780.749, -861.959],
      [1781.636, -861.491],
      [1782.534, -861.034],
      [1783.443, -860.59],
      [1784.363, -860.157],
      [1785.295, -859.737],
      [1786.238, -859.328],
      [1787.192, -858.931],
      [1788.157, -858.546],
      [1789.134, -858.173],
      [1790.122, -857.811],
      [1791.121, -857.462],
      [1792.131, -857.124],
      [1793.152, -856.799],
      [1794.185, -856.485],
      [1795.229, -856.183],
      [1796.284, -855.893],
      [1797.35, -855.615],
      [1798.428, -855.348],
      [1799.517, -855.094],
      [1800.617, -854.851],
      [1801.728, -854.62],
      [1802.851, -854.401],
      [1803.984, -854.194],
      [1805.129, -853.999],
      [1806.285, -853.816],
      [1807.453, -853.644],
      [1808.631, -853.485],
      [1809.821, -853.337],
    ],
  },
  'corner-bottom-right': {
    blueRubber: [
      [1839.611, 881.546],
      [1842.46, 883.347],
      [1845.172, 885.178],
      [1847.747, 887.038],
      [1850.189, 888.925],
      [1852.499, 890.837],
      [1854.678, 892.773],
      [1856.73, 894.729],
      [1858.656, 896.704],
      [1860.458, 898.697],
      [1862.138, 900.705],
      [1863.698, 902.725],
      [1865.139, 904.758],
      [1866.464, 906.799],
      [1867.676, 908.848],
      [1868.774, 910.903],
      [1869.763, 912.96],
      [1870.643, 915.02],
      [1871.417, 917.078],
      [1872.086, 919.135],
      [1872.653, 921.186],
      [1873.119, 923.232],
      [1873.487, 925.269],
      [1873.758, 927.296],
      [1873.935, 929.31],
      [1874.019, 931.311],
      [1874.012, 933.295],
      [1873.916, 935.261],
      [1873.734, 937.207],
      [1873.467, 939.131],
      [1873.117, 941.03],
      [1872.686, 942.904],
      [1872.177, 944.75],
      [1871.59, 946.566],
      [1870.928, 948.35],
      [1870.193, 950.1],
      [1869.387, 951.814],
      [1868.512, 953.491],
      [1867.57, 955.128],
      [1866.563, 956.723],
      [1865.492, 958.275],
      [1864.361, 959.781],
      [1863.169, 961.239],
      [1861.921, 962.648],
      [1860.617, 964.005],
      [1859.26, 965.309],
      [1857.851, 966.558],
      [1856.392, 967.749],
      [1854.887, 968.88],
      [1853.335, 969.951],
      [1851.74, 970.958],
      [1850.103, 971.9],
      [1848.427, 972.775],
      [1846.713, 973.58],
      [1844.963, 974.315],
      [1843.179, 974.976],
      [1841.364, 975.563],
      [1839.518, 976.072],
      [1837.645, 976.503],
      [1835.745, 976.852],
      [1833.822, 977.119],
      [1831.877, 977.301],
      [1829.911, 977.396],
      [1827.927, 977.402],
      [1825.928, 977.317],
      [1823.914, 977.14],
      [1821.887, 976.869],
      [1819.851, 976.5],
      [1817.806, 976.033],
      [1815.755, 975.466],
      [1813.699, 974.796],
      [1811.641, 974.021],
      [1809.583, 973.14],
      [1807.526, 972.151],
      [1805.473, 971.051],
      [1803.424, 969.839],
      [1801.384, 968.513],
      [1799.352, 967.071],
      [1797.332, 965.51],
      [1795.326, 963.829],
      [1793.334, 962.027],
      [1791.36, 960.1],
      [1789.404, 958.047],
      [1787.47, 955.866],
      [1785.559, 953.555],
      [1783.673, 951.112],
      [1781.814, 948.535],
      [1779.984, 945.823],
      [1778.185, 942.972],
    ],
    whiteDrop: [
      [1805.782, 847.964],
      [1804.695, 848.26],
      [1803.617, 848.566],
      [1802.548, 848.881],
      [1801.488, 849.206],
      [1800.437, 849.54],
      [1799.394, 849.884],
      [1798.361, 850.238],
      [1797.337, 850.601],
      [1796.321, 850.973],
      [1795.315, 851.355],
      [1794.317, 851.747],
      [1793.328, 852.148],
      [1792.349, 852.558],
      [1791.378, 852.978],
      [1790.417, 853.408],
      [1789.464, 853.846],
      [1788.52, 854.295],
      [1787.586, 854.752],
      [1786.66, 855.22],
      [1785.744, 855.696],
      [1784.836, 856.182],
      [1783.938, 856.677],
      [1783.049, 857.182],
      [1782.168, 857.696],
      [1781.297, 858.22],
      [1780.435, 858.752],
      [1779.583, 859.295],
      [1778.739, 859.846],
      [1777.904, 860.407],
      [1777.079, 860.977],
      [1776.263, 861.556],
      [1775.456, 862.145],
      [1774.658, 862.743],
      [1773.869, 863.35],
      [1773.09, 863.966],
      [1772.319, 864.592],
      [1771.558, 865.227],
      [1770.806, 865.871],
      [1770.064, 866.524],
      [1769.33, 867.187],
      [1768.606, 867.858],
      [1767.892, 868.539],
      [1767.186, 869.229],
      [1766.49, 869.929],
      [1765.803, 870.637],
      [1765.125, 871.354],
      [1764.457, 872.081],
      [1763.798, 872.817],
      [1763.149, 873.562],
      [1762.509, 874.316],
      [1761.878, 875.079],
      [1761.256, 875.851],
      [1760.644, 876.632],
      [1760.041, 877.422],
      [1759.448, 878.221],
      [1758.864, 879.03],
      [1758.29, 879.847],
      [1757.725, 880.673],
      [1757.169, 881.509],
      [1756.623, 882.353],
      [1756.087, 883.206],
      [1755.559, 884.069],
      [1755.042, 884.94],
      [1754.534, 885.82],
      [1754.035, 886.709],
      [1753.546, 887.607],
      [1753.066, 888.514],
      [1752.596, 889.43],
      [1752.136, 890.355],
      [1751.685, 891.289],
      [1751.243, 892.231],
      [1750.811, 893.183],
      [1750.389, 894.143],
      [1749.977, 895.112],
      [1749.574, 896.09],
      [1749.18, 897.077],
      [1748.796, 898.072],
      [1748.422, 899.077],
      [1748.058, 900.09],
      [1747.703, 901.112],
      [1747.358, 902.143],
      [1747.022, 903.182],
      [1746.697, 904.231],
      [1746.38, 905.288],
      [1746.074, 906.354],
      [1745.777, 907.428],
      [1745.491, 908.511],
      [1745.213, 909.603],
    ],
  },
  'middle-bottom': {
    blueRubber: [
      [-42.13, 957.209],
      [-41.511, 959.029],
      [-40.869, 960.808],
      [-40.204, 962.545],
      [-39.516, 964.24],
      [-38.807, 965.893],
      [-38.077, 967.504],
      [-37.326, 969.074],
      [-36.555, 970.601],
      [-35.765, 972.087],
      [-34.955, 973.531],
      [-34.127, 974.933],
      [-33.281, 976.293],
      [-32.418, 977.612],
      [-31.538, 978.888],
      [-30.641, 980.123],
      [-29.729, 981.315],
      [-28.802, 982.466],
      [-27.86, 983.575],
      [-26.904, 984.643],
      [-25.934, 985.668],
      [-24.951, 986.651],
      [-23.956, 987.593],
      [-22.949, 988.493],
      [-21.93, 989.351],
      [-20.901, 990.167],
      [-19.861, 990.941],
      [-18.812, 991.674],
      [-17.753, 992.364],
      [-16.685, 993.013],
      [-15.61, 993.62],
      [-14.526, 994.185],
      [-13.436, 994.708],
      [-12.339, 995.189],
      [-11.237, 995.629],
      [-10.128, 996.026],
      [-9.015, 996.382],
      [-7.898, 996.696],
      [-6.777, 996.968],
      [-5.652, 997.198],
      [-4.525, 997.386],
      [-3.396, 997.533],
      [-2.265, 997.637],
      [-1.133, 997.7],
      [0, 997.721],
      [1.133, 997.7],
      [2.265, 997.637],
      [3.396, 997.533],
      [4.525, 997.386],
      [5.652, 997.198],
      [6.777, 996.968],
      [7.898, 996.696],
      [9.015, 996.382],
      [10.128, 996.026],
      [11.237, 995.629],
      [12.339, 995.189],
      [13.436, 994.708],
      [14.526, 994.185],
      [15.61, 993.62],
      [16.685, 993.013],
      [17.753, 992.364],
      [18.812, 991.674],
      [19.861, 990.941],
      [20.901, 990.167],
      [21.93, 989.351],
      [22.949, 988.493],
      [23.956, 987.593],
      [24.951, 986.651],
      [25.934, 985.668],
      [26.904, 984.643],
      [27.86, 983.575],
      [28.802, 982.466],
      [29.729, 981.315],
      [30.641, 980.123],
      [31.538, 978.888],
      [32.418, 977.612],
      [33.281, 976.293],
      [34.127, 974.933],
      [34.955, 973.531],
      [35.765, 972.087],
      [36.555, 970.601],
      [37.326, 969.074],
      [38.077, 967.504],
      [38.807, 965.893],
      [39.516, 964.24],
      [40.204, 962.545],
      [40.869, 960.808],
      [41.511, 959.029],
      [42.13, 957.209],
    ],
    whiteDrop: [
      [52.35, 922.021],
      [51.752, 920.386],
      [51.113, 918.787],
      [50.436, 917.225],
      [49.72, 915.698],
      [48.967, 914.209],
      [48.177, 912.755],
      [47.352, 911.338],
      [46.493, 909.958],
      [45.6, 908.614],
      [44.674, 907.306],
      [43.717, 906.035],
      [42.728, 904.8],
      [41.709, 903.602],
      [40.662, 902.441],
      [39.586, 901.316],
      [38.483, 900.227],
      [37.353, 899.175],
      [36.198, 898.16],
      [35.019, 897.182],
      [33.816, 896.24],
      [32.59, 895.335],
      [31.342, 894.467],
      [30.074, 893.635],
      [28.785, 892.84],
      [27.478, 892.082],
      [26.152, 891.361],
      [24.809, 890.677],
      [23.449, 890.029],
      [22.074, 889.419],
      [20.685, 888.845],
      [19.282, 888.308],
      [17.866, 887.808],
      [16.438, 887.345],
      [15, 886.919],
      [13.551, 886.531],
      [12.093, 886.179],
      [10.628, 885.864],
      [9.154, 885.586],
      [7.675, 885.346],
      [6.19, 885.142],
      [4.701, 884.976],
      [3.208, 884.847],
      [1.712, 884.755],
      [0.214, 884.7],
      [-1.284, 884.683],
      [-2.782, 884.702],
      [-4.28, 884.759],
      [-5.776, 884.854],
      [-7.269, 884.985],
      [-8.758, 885.154],
      [-10.243, 885.361],
      [-11.722, 885.604],
      [-13.195, 885.886],
      [-14.66, 886.204],
      [-16.118, 886.56],
      [-17.566, 886.954],
      [-19.004, 887.385],
      [-20.432, 887.853],
      [-21.847, 888.359],
      [-23.25, 888.903],
      [-24.639, 889.484],
      [-26.014, 890.103],
      [-27.373, 890.759],
      [-28.715, 891.454],
      [-30.041, 892.185],
      [-31.348, 892.955],
      [-32.636, 893.762],
      [-33.904, 894.607],
      [-35.151, 895.49],
      [-36.376, 896.41],
      [-37.579, 897.368],
      [-38.758, 898.365],
      [-39.912, 899.399],
      [-41.041, 900.47],
      [-42.143, 901.58],
      [-43.218, 902.728],
      [-44.265, 903.913],
      [-45.283, 905.137],
      [-46.271, 906.398],
      [-47.227, 907.698],
      [-48.152, 909.035],
      [-49.045, 910.411],
      [-49.903, 911.825],
      [-50.727, 913.276],
      [-51.516, 914.766],
      [-52.268, 916.294],
      [-52.982, 917.86],
      [-53.659, 919.465],
    ],
  },
  'corner-bottom-left': {
    blueRubber: [
      [-1839.611, 881.546],
      [-1842.425, 883.285],
      [-1845.101, 885.057],
      [-1847.642, 886.859],
      [-1850.049, 888.691],
      [-1852.325, 890.549],
      [-1854.471, 892.432],
      [-1856.489, 894.339],
      [-1858.382, 896.266],
      [-1860.151, 898.213],
      [-1861.798, 900.176],
      [-1863.325, 902.155],
      [-1864.735, 904.147],
      [-1866.029, 906.15],
      [-1867.209, 908.162],
      [-1868.278, 910.181],
      [-1869.236, 912.205],
      [-1870.087, 914.232],
      [-1870.832, 916.261],
      [-1871.473, 918.289],
      [-1872.012, 920.314],
      [-1872.451, 922.334],
      [-1872.792, 924.348],
      [-1873.038, 926.352],
      [-1873.189, 928.347],
      [-1873.248, 930.328],
      [-1873.218, 932.295],
      [-1873.099, 934.245],
      [-1872.895, 936.176],
      [-1872.606, 938.087],
      [-1872.235, 939.976],
      [-1871.784, 941.839],
      [-1871.256, 943.676],
      [-1870.651, 945.485],
      [-1869.972, 947.263],
      [-1869.22, 949.008],
      [-1868.399, 950.719],
      [-1867.509, 952.394],
      [-1866.553, 954.03],
      [-1865.533, 955.626],
      [-1864.451, 957.179],
      [-1863.309, 958.688],
      [-1862.108, 960.15],
      [-1860.851, 961.564],
      [-1859.54, 962.928],
      [-1858.176, 964.239],
      [-1856.762, 965.496],
      [-1855.3, 966.697],
      [-1853.791, 967.839],
      [-1852.238, 968.921],
      [-1850.643, 969.941],
      [-1849.007, 970.897],
      [-1847.332, 971.786],
      [-1845.622, 972.607],
      [-1843.876, 973.358],
      [-1842.099, 974.037],
      [-1840.29, 974.642],
      [-1838.454, 975.17],
      [-1836.59, 975.621],
      [-1834.702, 975.991],
      [-1832.792, 976.279],
      [-1830.861, 976.483],
      [-1828.911, 976.601],
      [-1826.945, 976.631],
      [-1824.964, 976.571],
      [-1822.971, 976.42],
      [-1820.966, 976.174],
      [-1818.953, 975.832],
      [-1816.934, 975.392],
      [-1814.909, 974.852],
      [-1812.882, 974.21],
      [-1810.854, 973.465],
      [-1808.828, 972.613],
      [-1806.804, 971.654],
      [-1804.786, 970.585],
      [-1802.775, 969.404],
      [-1800.773, 968.109],
      [-1798.782, 966.698],
      [-1796.804, 965.17],
      [-1794.842, 963.522],
      [-1792.896, 961.752],
      [-1790.97, 959.858],
      [-1789.064, 957.839],
      [-1787.182, 955.692],
      [-1785.325, 953.415],
      [-1783.494, 951.007],
      [-1781.693, 948.465],
      [-1779.922, 945.788],
      [-1778.185, 942.972],
    ],
    whiteDrop: [
      [-1806.124, 848.419],
      [-1805.305, 848.482],
      [-1804.476, 848.57],
      [-1803.639, 848.685],
      [-1802.795, 848.825],
      [-1801.943, 848.991],
      [-1801.084, 849.181],
      [-1800.219, 849.396],
      [-1799.347, 849.634],
      [-1798.47, 849.896],
      [-1797.587, 850.181],
      [-1796.699, 850.489],
      [-1795.807, 850.819],
      [-1794.911, 851.171],
      [-1794.011, 851.544],
      [-1793.107, 851.939],
      [-1792.201, 852.354],
      [-1791.292, 852.789],
      [-1790.38, 853.244],
      [-1789.468, 853.719],
      [-1788.553, 854.212],
      [-1787.638, 854.724],
      [-1786.723, 855.254],
      [-1785.807, 855.802],
      [-1784.892, 856.368],
      [-1783.977, 856.95],
      [-1783.064, 857.549],
      [-1782.152, 858.164],
      [-1781.242, 858.794],
      [-1780.334, 859.44],
      [-1779.429, 860.101],
      [-1778.527, 860.776],
      [-1777.629, 861.466],
      [-1776.734, 862.169],
      [-1775.844, 862.885],
      [-1774.959, 863.614],
      [-1774.079, 864.355],
      [-1773.205, 865.109],
      [-1772.336, 865.874],
      [-1771.474, 866.65],
      [-1770.619, 867.437],
      [-1769.771, 868.234],
      [-1768.93, 869.041],
      [-1768.098, 869.858],
      [-1767.274, 870.684],
      [-1766.459, 871.519],
      [-1765.653, 872.362],
      [-1764.856, 873.213],
      [-1764.07, 874.071],
      [-1763.294, 874.937],
      [-1762.529, 875.809],
      [-1761.776, 876.687],
      [-1761.033, 877.571],
      [-1760.303, 878.461],
      [-1759.586, 879.355],
      [-1758.881, 880.255],
      [-1758.19, 881.158],
      [-1757.512, 882.065],
      [-1756.849, 882.976],
      [-1756.2, 883.89],
      [-1755.566, 884.806],
      [-1754.947, 885.724],
      [-1754.344, 886.644],
      [-1753.757, 887.565],
      [-1753.186, 888.487],
      [-1752.633, 889.41],
      [-1752.097, 890.333],
      [-1751.578, 891.255],
      [-1751.078, 892.177],
      [-1750.596, 893.098],
      [-1750.134, 894.017],
      [-1749.69, 894.934],
      [-1749.267, 895.849],
      [-1748.863, 896.761],
      [-1748.48, 897.669],
      [-1748.119, 898.574],
      [-1747.778, 899.475],
      [-1747.46, 900.372],
      [-1747.163, 901.264],
      [-1746.89, 902.15],
      [-1746.639, 903.031],
      [-1746.411, 903.906],
      [-1746.208, 904.774],
      [-1746.029, 905.636],
      [-1745.874, 906.49],
      [-1745.745, 907.336],
      [-1745.641, 908.175],
      [-1745.562, 909.004],
      [-1745.51, 909.825],
    ],
  },
  'corner-top-left': {
    blueRubber: [
      [-1778.185, -942.972],
      [-1779.97, -945.997],
      [-1781.79, -948.876],
      [-1783.644, -951.611],
      [-1785.53, -954.204],
      [-1787.444, -956.656],
      [-1789.386, -958.972],
      [-1791.353, -961.151],
      [-1793.342, -963.198],
      [-1795.353, -965.112],
      [-1797.382, -966.898],
      [-1799.427, -968.557],
      [-1801.487, -970.09],
      [-1803.56, -971.5],
      [-1805.643, -972.79],
      [-1807.733, -973.961],
      [-1809.83, -975.016],
      [-1811.931, -975.956],
      [-1814.033, -976.783],
      [-1816.135, -977.501],
      [-1818.235, -978.11],
      [-1820.33, -978.613],
      [-1822.419, -979.013],
      [-1824.498, -979.31],
      [-1826.567, -979.508],
      [-1828.623, -979.608],
      [-1830.663, -979.613],
      [-1832.687, -979.525],
      [-1834.691, -979.345],
      [-1836.673, -979.077],
      [-1838.632, -978.721],
      [-1840.566, -978.28],
      [-1842.471, -977.757],
      [-1844.347, -977.153],
      [-1846.19, -976.47],
      [-1848, -975.711],
      [-1849.773, -974.878],
      [-1851.508, -973.972],
      [-1853.202, -972.997],
      [-1854.854, -971.953],
      [-1856.461, -970.844],
      [-1858.021, -969.671],
      [-1859.532, -968.436],
      [-1860.992, -967.141],
      [-1862.399, -965.79],
      [-1863.751, -964.383],
      [-1865.046, -962.922],
      [-1866.281, -961.411],
      [-1867.454, -959.851],
      [-1868.563, -958.243],
      [-1869.607, -956.592],
      [-1870.583, -954.897],
      [-1871.489, -953.162],
      [-1872.322, -951.389],
      [-1873.082, -949.579],
      [-1873.764, -947.735],
      [-1874.369, -945.859],
      [-1874.893, -943.953],
      [-1875.334, -942.02],
      [-1875.69, -940.06],
      [-1875.959, -938.077],
      [-1876.139, -936.073],
      [-1876.228, -934.049],
      [-1876.224, -932.007],
      [-1876.124, -929.951],
      [-1875.926, -927.882],
      [-1875.629, -925.801],
      [-1875.231, -923.712],
      [-1874.728, -921.617],
      [-1874.12, -919.516],
      [-1873.403, -917.413],
      [-1872.576, -915.31],
      [-1871.637, -913.208],
      [-1870.583, -911.111],
      [-1869.413, -909.019],
      [-1868.124, -906.936],
      [-1866.715, -904.862],
      [-1865.182, -902.801],
      [-1863.525, -900.754],
      [-1861.74, -898.724],
      [-1859.827, -896.713],
      [-1857.782, -894.722],
      [-1855.603, -892.754],
      [-1853.289, -890.812],
      [-1850.837, -888.896],
      [-1848.246, -887.009],
      [-1845.512, -885.154],
      [-1842.635, -883.332],
      [-1839.611, -881.546],
    ],
    whiteDrop: [
      [-1749.941, -913.104],
      [-1750.246, -912.044],
      [-1750.561, -910.994],
      [-1750.884, -909.952],
      [-1751.216, -908.918],
      [-1751.557, -907.893],
      [-1751.907, -906.876],
      [-1752.266, -905.868],
      [-1752.634, -904.868],
      [-1753.011, -903.877],
      [-1753.397, -902.894],
      [-1753.792, -901.92],
      [-1754.196, -900.954],
      [-1754.608, -899.997],
      [-1755.03, -899.049],
      [-1755.46, -898.109],
      [-1755.899, -897.178],
      [-1756.347, -896.255],
      [-1756.804, -895.341],
      [-1757.27, -894.435],
      [-1757.745, -893.538],
      [-1758.229, -892.65],
      [-1758.721, -891.77],
      [-1759.222, -890.899],
      [-1759.732, -890.037],
      [-1760.251, -889.183],
      [-1760.779, -888.338],
      [-1761.316, -887.501],
      [-1761.861, -886.673],
      [-1762.415, -885.854],
      [-1762.978, -885.044],
      [-1763.55, -884.242],
      [-1764.13, -883.448],
      [-1764.719, -882.664],
      [-1765.318, -881.888],
      [-1765.924, -881.121],
      [-1766.54, -880.363],
      [-1767.164, -879.613],
      [-1767.797, -878.872],
      [-1768.439, -878.139],
      [-1769.089, -877.416],
      [-1769.749, -876.701],
      [-1770.417, -875.995],
      [-1771.093, -875.298],
      [-1771.778, -874.609],
      [-1772.472, -873.929],
      [-1773.175, -873.258],
      [-1773.886, -872.596],
      [-1774.607, -871.943],
      [-1775.335, -871.298],
      [-1776.073, -870.662],
      [-1776.819, -870.035],
      [-1777.573, -869.417],
      [-1778.337, -868.807],
      [-1779.108, -868.207],
      [-1779.889, -867.615],
      [-1780.678, -867.032],
      [-1781.476, -866.458],
      [-1782.282, -865.893],
      [-1783.097, -865.336],
      [-1783.921, -864.789],
      [-1784.753, -864.25],
      [-1785.594, -863.72],
      [-1786.443, -863.2],
      [-1787.301, -862.688],
      [-1788.167, -862.184],
      [-1789.042, -861.69],
      [-1789.926, -861.205],
      [-1790.818, -860.729],
      [-1791.718, -860.261],
      [-1792.628, -859.803],
      [-1793.545, -859.353],
      [-1794.471, -858.912],
      [-1795.406, -858.481],
      [-1796.349, -858.058],
      [-1797.301, -857.644],
      [-1798.261, -857.239],
      [-1799.229, -856.844],
      [-1800.207, -856.457],
      [-1801.192, -856.079],
      [-1802.186, -855.71],
      [-1803.188, -855.35],
      [-1804.199, -854.999],
      [-1805.219, -854.658],
      [-1806.246, -854.325],
      [-1807.283, -854.001],
      [-1808.327, -853.686],
      [-1809.38, -853.381],
      [-1810.442, -853.084],
    ],
  },
};

function toPoints(points) {
  return points.map(([x, y]) => ({ x, y }));
}

function createPocketOverride(pocketId, data) {
  return {
    source: `pocket-boundary-editor ${pocketId} high precision arc data`,
    collisionLines: [],
    dropEdges: [
      {
        id: `${pocketId}:white-drop-edge`,
        name: `${pocketId} white drop edge`,
        role: 'pocket-drop-edge',
        material: 'pocket-drop-edge',
        points: toPoints(data.whiteDrop),
      },
    ],
  };
}
const PRO_MATCH_84_OVERRIDES = Object.fromEntries(
  Object.entries(POCKET_BOUNDARY_POINT_DATA).map(([pocketId, pocketData]) => [
    pocketId,
    createPocketOverride(pocketId, pocketData),
  ]),
);

const POCKET_BOUNDARY_OVERRIDES = {
  'pro-match-84': PRO_MATCH_84_OVERRIDES,
};

function getPocketBoundaryOverride(boundaryId, pocketId) {
  return POCKET_BOUNDARY_OVERRIDES[boundaryId]?.[pocketId] || null;
}

module.exports = {
  POCKET_BOUNDARY_OVERRIDES,
  getPocketBoundaryOverride,
};

}, {}, "apps/three-game/src/core/model/pocketBoundaryOverrides.js"],
18: [function(require, module, exports) {
const { BALL_KIND, COLOR_ORDER } = require('../../config/constants');
const { BALL_RADIUS_MM } = require('../model/ballSpec');
const { BAULK_LINE_X_MM, D_RADIUS_MM, HALF_PLAY_AREA_MM } = require('../model/tableModel');
const { colorSpot, openingCueBallPosition } = require('../model/spotModel');

function respotColor(state, kind) {
  return { state, kind };
}

const COLOR_RESPOT_ORDER = [
  BALL_KIND.BLACK,
  BALL_KIND.PINK,
  BALL_KIND.BLUE,
  BALL_KIND.BROWN,
  BALL_KIND.GREEN,
  BALL_KIND.YELLOW,
];

function isColorBallKind(kind) {
  return COLOR_ORDER.includes(kind);
}

function tableBaulkLineX(state) {
  return state?.table?.baulkLineMm ?? BAULK_LINE_X_MM;
}

function tableDRadius(state) {
  return state?.table?.dRadiusMm ?? D_RADIUS_MM;
}

function isInsideDZone(state, pos) {
  const baulkLineX = tableBaulkLineX(state);
  const dRadius = tableDRadius(state);
  return (
    pos.x <= baulkLineX + 0.001
    && Math.hypot(pos.x - baulkLineX, pos.y) <= dRadius + 0.001
  );
}

function isCuePlacementBlocked(state, pos, cueBall) {
  const cueRadius = cueBall?.radius || BALL_RADIUS_MM;
  return isPositionBlocked(state, pos, {
    ignoreBallId: cueBall?.id,
    radius: cueRadius,
  });
}

function isPositionBlocked(state, pos, options = {}) {
  const radius = options.radius || BALL_RADIUS_MM;
  const ignoreBallId = options.ignoreBallId || null;
  return (state?.balls || []).some((ball) => {
    if (ball.id === ignoreBallId || ball.potted || !ball.pos) return false;
    const clearance = radius + (ball.radius || BALL_RADIUS_MM) + 0.6;
    return Math.hypot(ball.pos.x - pos.x, ball.pos.y - pos.y) < clearance;
  });
}

function tableLimitX(state, ball) {
  const radius = ball?.radius || BALL_RADIUS_MM;
  return (state?.table?.halfPlayAreaMm?.width ?? HALF_PLAY_AREA_MM.width) - radius;
}

function tableMinX(state, ball) {
  const radius = ball?.radius || BALL_RADIUS_MM;
  return -((state?.table?.halfPlayAreaMm?.width ?? HALF_PLAY_AREA_MM.width) - radius);
}

function isInsidePlayAreaX(state, ball, x) {
  return Number.isFinite(x)
    && x >= tableMinX(state, ball)
    && x <= tableLimitX(state, ball);
}

function findOpenPointOnSpotLine(state, ball, spot, direction) {
  const radius = ball?.radius || BALL_RADIUS_MM;
  const step = Math.max(1, radius / 10);
  const limit = direction > 0 ? tableLimitX(state, ball) : tableMinX(state, ball);
  let blockedX = spot.x;

  for (
    let x = spot.x + direction * step;
    direction > 0 ? x <= limit : x >= limit;
    x += direction * step
  ) {
    const candidate = { x, y: spot.y };
    if (!isInsidePlayAreaX(state, ball, candidate.x)) break;
    if (!isPositionBlocked(state, candidate, { ignoreBallId: ball.id, radius })) {
      let openX = x;
      for (let i = 0; i < 14; i += 1) {
        const mid = (blockedX + openX) * 0.5;
        const refined = { x: mid, y: spot.y };
        if (!isPositionBlocked(state, refined, { ignoreBallId: ball.id, radius })) {
          openX = mid;
        } else {
          blockedX = mid;
        }
      }
      return { x: openX, y: spot.y };
    }
    blockedX = x;
  }

  return null;
}

function findRespottedColorPosition(state, ball) {
  const ownSpot = colorSpot(ball.kind);
  if (!isPositionBlocked(state, ownSpot, {
    ignoreBallId: ball.id,
    radius: ball.radius || BALL_RADIUS_MM,
  })) {
    return ownSpot;
  }

  const officialSpot = COLOR_RESPOT_ORDER
    .map(colorSpot)
    .find((spot) => !isPositionBlocked(state, spot, {
      ignoreBallId: ball.id,
      radius: ball.radius || BALL_RADIUS_MM,
    }));
  if (officialSpot) return officialSpot;

  return findOpenPointOnSpotLine(state, ball, ownSpot, 1)
    || findOpenPointOnSpotLine(state, ball, ownSpot, -1)
    || ownSpot;
}

function defaultCueBallDPosition(state) {
  return openingCueBallPosition({ baulkLineX: tableBaulkLineX(state) });
}

function findCueBallDPosition(state, cueBall) {
  const preferred = defaultCueBallDPosition(state);
  if (isInsideDZone(state, preferred) && !isCuePlacementBlocked(state, preferred, cueBall)) {
    return preferred;
  }

  const baulkLineX = tableBaulkLineX(state);
  const dRadius = tableDRadius(state);
  const cueRadius = cueBall?.radius || BALL_RADIUS_MM;
  const radialStep = Math.max(cueRadius * 1.05, dRadius / 5);
  const angleStep = Math.PI / 12;

  for (let radius = radialStep; radius <= dRadius; radius += radialStep) {
    for (let angle = Math.PI; angle >= 0; angle -= angleStep) {
      const candidate = {
        x: baulkLineX - Math.sin(angle) * radius,
        y: Math.cos(angle) * radius,
      };
      if (isInsideDZone(state, candidate) && !isCuePlacementBlocked(state, candidate, cueBall)) {
        return candidate;
      }
    }
  }

  return preferred;
}

function resetBallToTable(ball, pos) {
  for(const key of Object.keys(ball))if(/^sp[A-Z]/.test(key))delete ball[key];
  ball.potted = false;
  ball.potting = null;
  ball.pocketState = null;
  ball.pocketMotion = null;
  ball.pocketEntry = null;
  ball.pocketMode = 'table';
  ball.pos = { ...pos };
  ball.position = ball.pos;
  ball.prevPos = { ...pos };
  ball.previousPosition = ball.prevPos;
  ball.vel = { x: 0, y: 0 };
  ball.velocity = ball.vel;
  ball.omega = { x: 0, y: 0, z: 0 };
  ball.angularVelocity = ball.omega;
}

function respotPottedCueBallInD(state) {
  const cueBallId = state?.cueBallId;
  const cueBall = state?.balls?.find((ball) => (
    ball.id === cueBallId || ball.kind === BALL_KIND.CUE
  ));

  if (!cueBall || !cueBall.potted) {
    return [];
  }

  const pos = findCueBallDPosition(state, cueBall);
  resetBallToTable(cueBall, pos);
  return [{
    type: 'cue-ball-respotted',
    ballId: cueBall.id,
    pos: { ...pos },
  }];
}

function respotPottedColorBalls(state, options = {}) {
  const includeKinds = options.includeKinds || null;
  const includeBallIds = options.includeBallIds
    ? new Set(options.includeBallIds)
    : null;
  const excludeKinds = options.excludeKinds || [];
  const events = [];
  (state?.balls || [])
    .filter((ball) => (
      ball.potted
      && isColorBallKind(ball.kind)
      && (!includeBallIds || includeBallIds.has(ball.id))
      && (!includeKinds || includeKinds.includes(ball.kind))
      && !excludeKinds.includes(ball.kind)
    ))
    .sort((a, b) => COLOR_ORDER.indexOf(b.kind) - COLOR_ORDER.indexOf(a.kind))
    .forEach((ball) => {
      const from = {
        potted: Boolean(ball.potted),
        pos: ball.pos ? { ...ball.pos } : null,
        pocketMode: ball.pocketMode || null,
      };
      const pos = findRespottedColorPosition(state, ball);
      resetBallToTable(ball, pos);
      events.push({
        type: 'color-respotted',
        ballId: ball.id,
        kind: ball.kind,
        from,
        pos: { ...pos },
      });
    });
  return events;
}

module.exports = {
  defaultCueBallDPosition,
  findRespottedColorPosition,
  findCueBallDPosition,
  isColorBallKind,
  isInsideDZone,
  isPositionBlocked,
  resetBallToTable,
  respotPottedColorBalls,
  respotPottedCueBallInD,
  respotColor,
};

}, {"../../config/constants":3,"../model/ballSpec":4,"../model/tableModel":7,"../model/spotModel":6}, "apps/three-game/src/core/rules/respot.js"],
19: [function(require, module, exports) {
const { BALL_KIND, COLOR_ORDER } = require('../../config/constants');
const { BALL_RADIUS_MM } = require('../model/ballSpec');
const { colorSpot } = require('../model/spotModel');
const { ballValue } = require('./scoring');
const {
  MISS_MODE,
  createDefaultRuleSettings,
} = require('./ruleSettingsAdapter');
const {
  findCueBallDPosition,
  findRespottedColorPosition,
  isColorBallKind,
  resetBallToTable,
  respotPottedColorBalls,
  respotPottedCueBallInD,
} = require('./respot');
const { restoreBallsFromSnapshot } = require('./ruleSnapshot');
const { anyPlayerRequiresSnookers } = require('./scoreAvailability');
const { isSnookered, effectiveSnookeringBalls } = require('./snookerGeometry');

const RULE_PHASE = {
  REDS: 'reds',
  COLOR_CHOICE: 'colorChoice',
  CLEARANCE: 'clearance',
  FINAL_BLACK: 'finalBlack',
  RESPOTTED_BLACK: 'respottedBlack',
  FRAME_OVER: 'frameOver',
};

const DECISION = {
  PLAY_SELF: 'play-self',
  PLAY_AGAIN: 'play-again',
  RESTORE_PLAY_AGAIN: 'restore-play-again',
};

const BREAK_POT_KINDS = [
  BALL_KIND.RED,
  BALL_KIND.YELLOW,
  BALL_KIND.GREEN,
  BALL_KIND.BROWN,
  BALL_KIND.BLUE,
  BALL_KIND.PINK,
  BALL_KIND.BLACK,
];

function createBreakPotCounts() {
  return Object.fromEntries(BREAK_POT_KINDS.map((kind) => [kind, 0]));
}

function createInitialRuleState() {
  return {
    phase: RULE_PHASE.REDS,
    targetColorKind: null,
    cueBallInHand: true,
    currentBreak: 0,
    currentBreakPots: createBreakPotCounts(),
    pendingDecision: null,
    freeBallAvailable: false,
    freeBallKind: null,
    requiresNomination: false,
    nominationReason: null,
    nominatedColorKind: null,
    touchingBallIds: [],
    touchingBalls: [],
    missSequence: {
      count: 0,
      originalShotId: null,
    },
    lastRuleResult: null,
  };
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function getRuleSettings(state) {
  state.ruleSettings = {
    ...createDefaultRuleSettings(),
    ...(state.ruleSettings || {}),
  };
  return state.ruleSettings;
}

function ensureRuleState(state) {
  if (!state.ruleState) {
    state.ruleState = createInitialRuleState();
  }
  state.ruleState.currentBreakPots = {
    ...createBreakPotCounts(),
    ...(state.ruleState.currentBreakPots || {}),
  };
  return state.ruleState;
}

function activeBalls(state) {
  return (state.balls || []).filter((ball) => !ball.potted);
}

function getCueBall(state) {
  return (state.balls || []).find((ball) => (
    ball.id === state.cueBallId || ball.kind === BALL_KIND.CUE
  ));
}

function findBallById(state, id) {
  return (state.balls || []).find((ball) => ball.id === id) || null;
}

function isRedKind(kind) {
  return kind === BALL_KIND.RED;
}

function isColorKind(kind) {
  return isColorBallKind(kind);
}

function redCount(state) {
  return activeBalls(state).filter((ball) => isRedKind(ball.kind)).length;
}

function remainingTablePoints(state, ruleState = ensureRuleState(state)) {
  const reds = redCount(state);
  const colors = activeBalls(state).filter((ball) => isColorKind(ball.kind));
  const colorSequencePoints = colors.reduce((sum, ball) => sum + ballValue(ball.kind), 0);
  if (reds > 0) {
    const colorAfterRedPoints = ruleState.phase === RULE_PHASE.COLOR_CHOICE
      ? ballValue(BALL_KIND.BLACK)
      : 0;
    return reds * (ballValue(BALL_KIND.RED) + ballValue(BALL_KIND.BLACK))
      + colorAfterRedPoints
      + 27;
  }
  if (ruleState.phase === RULE_PHASE.COLOR_CHOICE || ruleState.colorAfterLastRedDue) {
    return ballValue(BALL_KIND.BLACK) + colorSequencePoints;
  }
  return colorSequencePoints;
}

function anyPlayerRequiresPenaltyPoints(state, ruleState = ensureRuleState(state)) {
  const players = state.players || [];
  if (players.length < 2) return false;
  const remaining = remainingTablePoints(state, ruleState);
  const firstScore = Number(players[0].score) || 0;
  const secondScore = Number(players[1].score) || 0;
  return Math.abs(firstScore - secondScore) > remaining;
}

function firstActiveColorKind(state) {
  return COLOR_ORDER.find((kind) => activeBalls(state).some((ball) => ball.kind === kind)) || null;
}

function hasOnlyBlackObjectBall(state) {
  const objectBalls = activeBalls(state).filter((ball) => ball.kind !== BALL_KIND.CUE);
  return objectBalls.length === 1 && objectBalls[0].kind === BALL_KIND.BLACK;
}

function otherPlayerId(state, playerId) {
  return (state.players || []).find((player) => player.id !== playerId)?.id || playerId;
}

function findPlayer(state, playerId) {
  return (state.players || []).find((player) => player.id === playerId) || null;
}

function addPlayerScore(state, playerId, points) {
  const player = findPlayer(state, playerId);
  if (!player || points <= 0) return;
  player.score += points;
}

function addPlayerBreak(state, playerId, points) {
  const player = findPlayer(state, playerId);
  if (!player || points <= 0) return;
  player.break += points;
  ensureRuleState(state).currentBreak = player.break;
}

function addCurrentBreakPots(state, balls) {
  const ruleState = ensureRuleState(state);
  (balls || []).forEach((ball) => {
    if (!BREAK_POT_KINDS.includes(ball?.kind)) return;
    ruleState.currentBreakPots[ball.kind] = (ruleState.currentBreakPots[ball.kind] || 0) + 1;
  });
}

function resetBreak(state, playerId) {
  const player = findPlayer(state, playerId);
  if (player) player.break = 0;
  const ruleState = ensureRuleState(state);
  ruleState.currentBreak = 0;
  ruleState.currentBreakPots = createBreakPotCounts();
}

function getTargetColorKind(ruleState, state) {
  if (ruleState.targetColorKind) return ruleState.targetColorKind;
  return firstActiveColorKind(state);
}

function targetKindsForRule(ruleState, state) {
  if (ruleState.testFieldOpenTargets) return [...new Set(activeBalls(state)
    .filter(ball => ball.kind !== BALL_KIND.CUE).map(ball => ball.kind))];
  switch (ruleState.phase) {
    case RULE_PHASE.REDS:
      return [BALL_KIND.RED];
    case RULE_PHASE.COLOR_CHOICE:
      return COLOR_ORDER.filter((kind) => activeBalls(state).some((ball) => ball.kind === kind));
    case RULE_PHASE.CLEARANCE:
      return [getTargetColorKind(ruleState, state)].filter(Boolean);
    case RULE_PHASE.FINAL_BLACK:
    case RULE_PHASE.RESPOTTED_BLACK:
      return [BALL_KIND.BLACK];
    default:
      return [];
  }
}

function isKindOn(ruleState, state, kind) {
  return targetKindsForRule(ruleState, state).includes(kind);
}

function normalizeShotRecord(shotRecord) {
  return {
    playerId: shotRecord?.playerId,
    firstContactBallId: shotRecord?.firstContactBallId
      ?? shotRecord?.physicsResult?.firstContactBallId
      ?? null,
    pottedBallIds: shotRecord?.pottedBallIds
      || shotRecord?.physicsResult?.pottedBallIds
      || [],
    cueBallPotted: Boolean(
      shotRecord?.cueBallPotted ?? shotRecord?.physicsResult?.cueBallPotted,
    ),
    events: shotRecord?.events || [],
    preShotSnapshot: shotRecord?.preShotSnapshot || null,
    preShotRuleState: shotRecord?.preShotRuleState || shotRecord?.preShotSnapshot?.ruleState || null,
    shotInput: shotRecord?.shotInput || null,
  };
}

function isSnookeredOnTargets(state, ruleState) {
  return isSnookered(state, getCueBall(state), targetKindsForRule(ruleState, state),
    ruleState.cueBallInHand ?? state.ruleState?.cueBallInHand ?? false);
}

function isSnookeredByBallKind(state, ruleState, blockerKind) {
  return effectiveSnookeringBalls(state, getCueBall(state), targetKindsForRule(ruleState, state))
    .some(ball => ball.kind === blockerKind);
}

function detectTouchingBalls(state, ruleState, settings = getRuleSettings(state)) {
  const cueBall = getCueBall(state);
  if (!cueBall || cueBall.potted) return [];
  const tolerance = Math.max(2, Number(settings.touchingBallToleranceMm) || 0);
  return activeBalls(state)
    .filter((ball) => ball.id !== cueBall.id)
    .filter((ball) => (
      Math.hypot(ball.pos.x - cueBall.pos.x, ball.pos.y - cueBall.pos.y)
      <= (ball.radius || BALL_RADIUS_MM) + (cueBall.radius || BALL_RADIUS_MM) + tolerance
    ))
    .map((ball) => ({
      ballId: ball.id,
      kind: ball.kind,
      isOn: isKindOn(ruleState, state, ball.kind),
    }));
}

function prepareNextShotState(state) {
  const ruleState = ensureRuleState(state);
  const settings = getRuleSettings(state);
  const touching = detectTouchingBalls(state, ruleState, settings);
  ruleState.touchingBallIds = touching.map((entry) => entry.ballId);
  ruleState.touchingBalls = touching;
  // Only an obstructed open-colour escape needs an explicit target.
  // Free balls continue to be inferred from first contact.
  const needsTarget = !state.ruleSettings?.practiceAutoColorTarget
    && !state.frameOver && !ruleState.testFieldOpenTargets
    && !ruleState.pendingDecision && !ruleState.freeBallAvailable
    && ruleState.phase === RULE_PHASE.COLOR_CHOICE
    && isSnookered(state, getCueBall(state), targetKindsForRule(ruleState, state), ruleState.cueBallInHand);
  ruleState.requiresNomination = needsTarget && !ruleState.nominatedColorKind;
  ruleState.nominationReason = ruleState.requiresNomination ? 'snookered-color-choice' : null;
  return ruleState;
}

function inferShotTarget(state, ruleState, shot) {
  const firstContactBall = findBallById(state, shot.firstContactBallId);
  const firstKind = firstContactBall?.kind || null;
  const freeBallAvailable = Boolean(ruleState.freeBallAvailable);

  if (freeBallAvailable && firstKind && !isKindOn(ruleState, state, firstKind)) {
    const ballOnKinds = targetKindsForRule(ruleState, state);
    return {
      // The nominated physical ball is the legal first-contact target, but it
      // acquires the identity and value of the actual ball on. Keeping these
      // two concepts separate is essential in the colour clearance: a Blue
      // nominated for Yellow must score and display as Yellow, not Blue.
      targetKinds: [firstKind],
      targetKind: ballOnKinds[0] || null,
      freeBallKind: firstKind,
      source: 'free-ball-inferred',
    };
  }

  if (ruleState.phase === RULE_PHASE.COLOR_CHOICE) {
    const nominated = ruleState.nominatedColorKind;
    if (nominated) {
      return {
        targetKinds: [nominated],
        targetKind: nominated,
        freeBallKind: null,
        source: 'nominated-color',
      };
    }
    if (firstKind && isColorKind(firstKind)) {
      return {
        targetKinds: [firstKind],
        targetKind: firstKind,
        freeBallKind: null,
        source: 'color-choice-inferred',
      };
    }
  }

  const targetKinds = targetKindsForRule(ruleState, state);
  return {
    targetKinds,
    targetKind: targetKinds[0] || null,
    freeBallKind: null,
    source: 'rule-state',
  };
}

function wasTouchingTargetSatisfied(state, ruleState, shotTarget, shot) {
  return (ruleState.touchingBalls || []).some((entry) => (
    shotTarget.targetKinds.includes(entry.kind)
    && isShotPlayedAwayFromTouchingBall(state, shot, entry.ballId)
  ));
}

function cueInvolvedInBallHit(state, event) {
  return event?.type === 'ball-hit-ball'
    && (event.ballAId === state.cueBallId || event.ballBId === state.cueBallId);
}

function otherBallInCueHit(state, event) {
  if (!cueInvolvedInBallHit(state, event)) return null;
  return event.ballAId === state.cueBallId ? event.ballBId : event.ballAId;
}

function cueHitRail(event, cueBallId) {
  return (
    (event?.type === 'ball-hit-rail' || event?.type === 'ball-hit-pocket-jaw')
    && event.ballId === cueBallId
  );
}

function normalizedShotDirection(shot) {
  const direction = shot?.shotInput?.direction;
  const x = Number(direction?.x);
  const y = Number(direction?.y);
  const length = Math.hypot(x, y);
  if (!Number.isFinite(length) || length <= 0.000001) return null;
  return { x: x / length, y: y / length };
}

function preShotBallById(shot, ballId) {
  return (shot?.preShotSnapshot?.balls || []).find((ball) => ball.id === ballId) || null;
}

function isShotPlayedAwayFromTouchingBall(state, shot, touchingBallId) {
  const cueBefore = preShotBallById(shot, state.cueBallId) || getCueBall(state);
  const touchingBefore = preShotBallById(shot, touchingBallId) || findBallById(state, touchingBallId);
  const direction = normalizedShotDirection(shot);
  if (!cueBefore?.pos || !touchingBefore?.pos || !direction) {
    return !shot.firstContactBallId;
  }

  const toTouching = {
    x: touchingBefore.pos.x - cueBefore.pos.x,
    y: touchingBefore.pos.y - cueBefore.pos.y,
  };
  const distance = Math.hypot(toTouching.x, toTouching.y);
  if (distance <= 0.000001) return false;
  const towardTouching = (direction.x * toTouching.x + direction.y * toTouching.y) / distance;
  return towardTouching <= 0.05;
}

function directlyPushedTouchingBall(state, shot, touchingBallId) {
  if (isShotPlayedAwayFromTouchingBall(state, shot, touchingBallId)) {
    return false;
  }

  if (shot.firstContactBallId && shot.firstContactBallId !== touchingBallId) {
    return false;
  }

  const events = Array.isArray(shot.events) ? shot.events : [];
  for (const event of events) {
    if (cueHitRail(event, state.cueBallId)) {
      return false;
    }

    const hitBallId = otherBallInCueHit(state, event);
    if (!hitBallId) continue;
    return hitBallId === touchingBallId;
  }

  return !shot.firstContactBallId || shot.firstContactBallId === touchingBallId;
}

function detectMovedTouchingTarget(state, ruleState, shot) {
  const touchingIds = ruleState.touchingBallIds || [];
  if (!shot.preShotSnapshot || touchingIds.length === 0) return null;
  for (const ballId of touchingIds) {
    const before = shot.preShotSnapshot.balls.find((ball) => ball.id === ballId);
    const after = findBallById(state, ballId);
    if (!before || !after || after.potted) continue;
    if (
      Math.hypot(after.pos.x - before.pos.x, after.pos.y - before.pos.y) > 1.2
      && directlyPushedTouchingBall(state, shot, ballId)
    ) {
      return after;
    }
  }
  return null;
}

function pottedBalls(state, shot) {
  return shot.pottedBallIds
    .map((id) => findBallById(state, id))
    .filter(Boolean);
}

function detectFouls(state, ruleState, shot, shotTarget) {
  const fouls = [];
  const firstContactBall = findBallById(state, shot.firstContactBallId);
  const potted = pottedBalls(state, shot);
  const pottedObjectBalls = potted.filter((ball) => ball.kind !== BALL_KIND.CUE);
  const touchingMoved = detectMovedTouchingTarget(state, ruleState, shot);
  const touchingSatisfied = wasTouchingTargetSatisfied(state, ruleState, shotTarget, shot);

  if (!touchingSatisfied) {
    if (!firstContactBall) {
      fouls.push({ code: 'no-contact', kind: shotTarget.targetKind });
    } else if (!shotTarget.targetKinds.includes(firstContactBall.kind)) {
      fouls.push({ code: 'wrong-first-contact', kind: firstContactBall.kind });
    }
  }

  if (shot.cueBallPotted) {
    fouls.push({ code: 'cue-ball-potted', kind: shotTarget.targetKind });
  }

  pottedObjectBalls.forEach((ball) => {
    const isFreeBall = shotTarget.freeBallKind && ball.kind === shotTarget.freeBallKind;
    const isTarget = shotTarget.targetKinds.includes(ball.kind);
    if (ruleState.phase === RULE_PHASE.REDS && isTarget) {
      return;
    }
    if (shotTarget.freeBallKind && (isFreeBall || isKindOn(ruleState, state, ball.kind))) {
      return;
    }
    if (ruleState.phase === RULE_PHASE.COLOR_CHOICE && isTarget) {
      return;
    }
    if (
      [RULE_PHASE.CLEARANCE, RULE_PHASE.FINAL_BLACK, RULE_PHASE.RESPOTTED_BLACK].includes(ruleState.phase)
      && isTarget
    ) {
      return;
    }
    fouls.push({ code: 'non-target-potted', kind: ball.kind });
  });

  if (touchingMoved) {
    fouls.push({ code: 'touching-ball-moved', kind: touchingMoved.kind });
  }

  if (shotTarget.freeBallKind) {
    const pottedFreeOrTrueTarget = pottedObjectBalls.some((ball) => (
      ball.kind === shotTarget.freeBallKind || isKindOn(ruleState, state, ball.kind)
    ));
    const onlyPinkAndBlackRemain = activeBalls(state)
      .filter((ball) => ball.kind !== BALL_KIND.CUE)
      .every((ball) => ball.kind === BALL_KIND.PINK || ball.kind === BALL_KIND.BLACK);
    if (
      !pottedFreeOrTrueTarget
      && !onlyPinkAndBlackRemain
      && isSnookeredByBallKind(state, ruleState, shotTarget.freeBallKind)
    ) {
      fouls.push({ code: 'free-ball-snooker', kind: shotTarget.targetKind });
    }
  }

  return fouls;
}

function calculatePenalty(fouls, shotTarget) {
  const values = [4];
  if (shotTarget.targetKind) values.push(ballValue(shotTarget.targetKind));
  fouls.forEach((foul) => {
    if (foul.kind) values.push(ballValue(foul.kind));
  });
  return Math.max(...values);
}

function createTimeoutFoul(state, playerId = state.currentPlayerId) {
  const ruleState = ensureRuleState(state);
  const penalty = [RULE_PHASE.FINAL_BLACK, RULE_PHASE.RESPOTTED_BLACK].includes(ruleState.phase)
    ? Math.max(ballValue(BALL_KIND.BLACK), getRuleSettings(state).timeoutPenalty || 4)
    : Math.max(4, getRuleSettings(state).timeoutPenalty || 4);
  const nonOffenderId = otherPlayerId(state, playerId);
  addPlayerScore(state, nonOffenderId, penalty);
  resetBreak(state, playerId);
  if ([RULE_PHASE.FINAL_BLACK, RULE_PHASE.RESPOTTED_BLACK].includes(ruleState.phase)) {
    const events = [];
    if (ruleState.phase === RULE_PHASE.RESPOTTED_BLACK) {
      awardFrame(state, nonOffenderId, 'respotted-black-foul');
    } else {
      finishFinalBlack(state, playerId, true, events);
    }
    const winnerId = ruleState.lastRuleResult?.winnerId;
    const reason = ruleState.lastRuleResult?.reason;
    ruleState.lastRuleResult = {
      type: state.frameOver ? 'frame-over' : 'foul',
      foul: true,
      fouls: ['shot-clock-timeout'],
      foulDetails: [{ code: 'shot-clock-timeout', kind: null }],
      miss: false,
      points: 0,
      penalty,
      pottedBallIds: [],
      firstContactBallId: null,
      nextPlayerId: null,
      nextTarget: targetKindsForRule(ruleState, state),
      pendingDecision: ruleState.pendingDecision,
      events,
      frameOver: Boolean(state.frameOver),
      winnerId: state.frameOver ? winnerId : null,
      reason: state.frameOver ? reason : 'black-respotted',
    };
    prepareNextShotState(state);
    return { state, result: ruleState.lastRuleResult };
  }
  const nextRule = nextPhaseAfterFoul(state, ruleState);
  const pendingDecision = {
    type: 'foul',
    offenderId: playerId,
    nonOffenderId,
    penalty,
    fouls: ['shot-clock-timeout'],
    foulDetails: [{ code: 'shot-clock-timeout', kind: null }],
    miss: false,
    missMode: getRuleSettings(state).missMode,
    options: [DECISION.PLAY_AGAIN],
    nextRuleState: nextRule,
    restoreSnapshot: null,
    freeBallAvailableIfSelf: isSnookeredOnTargets(state, nextRule),
  };

  // Like an ordinary foul, the opponent owns the next shot immediately,
  // including while choosing whether to send the offender back.
  state.currentPlayerId = nonOffenderId;
  clearPostShotFlags(state);
  ruleState.pendingDecision = pendingDecision;
  ruleState.phase = nextRule.phase;
  ruleState.targetColorKind = nextRule.targetColorKind || null;
  ruleState.freeBallAvailable = false;
  ruleState.freeBallKind = null;
  ruleState.lastRuleResult = {
    foul: true,
    fouls: ['shot-clock-timeout'],
    foulDetails: pendingDecision.foulDetails,
    miss: false,
    points: 0,
    penalty,
    shotTarget: {
      targetKinds: targetKindsForRule(ruleState, state),
      targetKind: getTargetColorKind(ruleState, state),
      freeBallKind: null,
      source: 'timeout',
    },
    pottedBallIds: [],
    firstContactBallId: null,
    nextPlayerId: null,
    nextTarget: targetKindsForRule(ruleState, state),
    pendingDecision,
    events: [],
    frameOver: Boolean(state.frameOver),
  };
  prepareNextShotState(state);
  return { state, result: ruleState.lastRuleResult };
}

function displayFoulCode(code) {
  const labels = {
    'no-contact': '未碰到目标球',
    'wrong-first-contact': '先碰错球',
    'cue-ball-potted': '母球入袋',
    'non-target-potted': '非目标球入袋',
    'touching-ball-moved': '连击',
    'free-ball-snooker': '自由球形成斯诺克',
    'shot-clock-timeout': '超时',
  };
  return labels[code] || code;
}

function calculateLegalScore(state, ruleState, shot, shotTarget) {
  const potted = pottedBalls(state, shot).filter((ball) => ball.kind !== BALL_KIND.CUE);
  if (shotTarget.freeBallKind) {
    const pottedFreeBall = potted.some((ball) => ball.kind === shotTarget.freeBallKind);
    const pottedTrueTargets = potted.filter((ball) => isKindOn(ruleState, state, ball.kind));
    if (ruleState.phase === RULE_PHASE.REDS) {
      return potted.filter((ball) => ball.kind === BALL_KIND.RED || ball.kind === shotTarget.freeBallKind).length;
    }
    return pottedFreeBall || pottedTrueTargets.length > 0 ? ballValue(shotTarget.targetKind) : 0;
  }

  if (ruleState.phase === RULE_PHASE.REDS) {
    return potted.filter((ball) => ball.kind === BALL_KIND.RED).length;
  }

  return potted.some((ball) => ball.kind === shotTarget.targetKind)
    ? ballValue(shotTarget.targetKind)
    : 0;
}

function shouldRespotColorAfterLegalShot(ruleState, kind, shotTarget) {
  if (!isColorKind(kind)) return false;
  if (shotTarget.freeBallKind && kind === shotTarget.freeBallKind) return true;
  if ([RULE_PHASE.REDS, RULE_PHASE.COLOR_CHOICE].includes(ruleState.phase)) return true;
  return false;
}

function respotSelectedPottedColors(state, kinds, reason) {
  const events = [];
  kinds.forEach((kind) => {
    const ball = (state.balls || []).find((candidate) => candidate.potted && candidate.kind === kind);
    if (!ball) return;
    const from = {
      potted: Boolean(ball.potted),
      pos: ball.pos ? { ...ball.pos } : null,
      pocketMode: ball.pocketMode || null,
    };
    const pos = findRespottedColorPosition(state, ball);
    resetBallToTable(ball, pos);
    events.push({
      type: 'color-respotted',
      reason,
      ballId: ball.id,
      kind: ball.kind,
      from,
      pos: { ...pos },
    });
  });
  return events;
}

function scoreDifference(state) {
  const [a, b] = state.players || [];
  return (a?.score || 0) - (b?.score || 0);
}

function awardFrame(state, winnerId, reason) {
  const winner = findPlayer(state, winnerId);
  if (winner) winner.frames = (winner.frames || 0) + 1;
  state.frameOver = true;
  const ruleState = ensureRuleState(state);
  ruleState.phase = RULE_PHASE.FRAME_OVER;
  ruleState.pendingDecision = null;
  ruleState.lastRuleResult = {
    type: 'frame-over',
    winnerId,
    reason,
  };
}

function endFrame(state, winnerId, reason = 'manual') {
  awardFrame(state, winnerId, reason);
  return {
    state,
    result: ensureRuleState(state).lastRuleResult,
  };
}

function handleRespottedBlack(state, currentPlayerId, foul, blackPotted = false) {
  const otherId = otherPlayerId(state, currentPlayerId);
  if (foul) {
    awardFrame(state, otherId, 'respotted-black-foul');
    return;
  }

  if (blackPotted) {
    awardFrame(state, currentPlayerId, 'respotted-black-potted');
    return;
  }

  resetBreak(state, currentPlayerId);
  state.currentPlayerId = otherId;
  const ruleState = ensureRuleState(state);
  ruleState.phase = RULE_PHASE.RESPOTTED_BLACK;
  ruleState.targetColorKind = BALL_KIND.BLACK;
  ruleState.cueBallInHand = false;
  ruleState.pendingDecision = null;
  ruleState.missSequence = { count: 0, originalShotId: null };
}

function enterRespottedBlack(state) {
  const black = (state.balls || []).find((ball) => ball.kind === BALL_KIND.BLACK);
  if (black) {
    resetBallToTable(black, colorSpot(BALL_KIND.BLACK));
  }
  const cueBall = getCueBall(state);
  const cueEvents = [];
  if (cueBall) {
    const cuePos = findCueBallDPosition(state, cueBall);
    resetBallToTable(cueBall, cuePos);
    cueEvents.push({
      type: 'cue-ball-respotted',
      reason: 'respotted-black',
      ballId: cueBall.id,
      pos: { ...cuePos },
    });
  }
  const ruleState = ensureRuleState(state);
  ruleState.phase = RULE_PHASE.RESPOTTED_BLACK;
  ruleState.targetColorKind = BALL_KIND.BLACK;
  ruleState.cueBallInHand = true;
  ruleState.pendingDecision = {
    type: 'respotted-black-break-off',
    options: ['current-player-breaks', 'other-player-breaks'],
  };
  return [{
    type: 'black-respotted',
    kind: BALL_KIND.BLACK,
  }, ...cueEvents];
}

function finishFinalBlack(state, currentPlayerId, foul, events) {
  const diff = scoreDifference(state);
  if (diff === 0) {
    events.push(...enterRespottedBlack(state));
    return;
  }
  const winnerId = diff > 0 ? state.players[0].id : state.players[1].id;
  awardFrame(state, winnerId, foul ? 'final-black-foul' : 'final-black-potted');
}

function nextClearancePhase(state) {
  const nextColor = firstActiveColorKind(state);
  if (!nextColor) {
    return { phase: RULE_PHASE.FRAME_OVER, targetColorKind: null };
  }
  if (nextColor === BALL_KIND.BLACK && hasOnlyBlackObjectBall(state)) {
    return { phase: RULE_PHASE.FINAL_BLACK, targetColorKind: BALL_KIND.BLACK };
  }
  return { phase: RULE_PHASE.CLEARANCE, targetColorKind: nextColor };
}

function nextPhaseAfterLegalShot(state, ruleState, score) {
  if (ruleState.phase === RULE_PHASE.REDS) {
    return score > 0
      ? { phase: RULE_PHASE.COLOR_CHOICE, targetColorKind: null }
      : { phase: RULE_PHASE.REDS, targetColorKind: null };
  }

  if (ruleState.phase === RULE_PHASE.COLOR_CHOICE) {
    if (redCount(state) > 0) {
      return { phase: RULE_PHASE.REDS, targetColorKind: null };
    }
    return nextClearancePhase(state);
  }

  if (ruleState.phase === RULE_PHASE.CLEARANCE) {
    return score > 0
      ? nextClearancePhase(state)
      : { phase: RULE_PHASE.CLEARANCE, targetColorKind: ruleState.targetColorKind };
  }

  return { phase: ruleState.phase, targetColorKind: ruleState.targetColorKind };
}

function nextPhaseAfterFoul(state, ruleState) {
  if ([RULE_PHASE.FINAL_BLACK, RULE_PHASE.RESPOTTED_BLACK].includes(ruleState.phase)) {
    return { phase: ruleState.phase, targetColorKind: BALL_KIND.BLACK };
  }
  if (redCount(state) > 0) {
    return { phase: RULE_PHASE.REDS, targetColorKind: null };
  }
  return nextClearancePhase(state);
}

function canCallMiss(state, shot, fouls, options = {}) {
  const settings = getRuleSettings(state);
  if (settings.missMode === MISS_MODE.OFF) return false;
  if (options.anyPlayerRequiresPenaltyPoints) return false;
  if (!fouls.some((foul) => foul.code === 'no-contact' || foul.code === 'wrong-first-contact')) {
    return false;
  }
  if (settings.missMode === MISS_MODE.LIMITED_THREE) {
    const count = ensureRuleState(state).missSequence?.count || 0;
    return count < settings.missLimit;
  }
  return true;
}

function buildFoulDecision(state, shot, ruleState, penalty, fouls, nextRule, missCalled) {
  const offenderId = shot.playerId || state.currentPlayerId;
  const nonOffenderId = otherPlayerId(state, offenderId);
  // Playing the next shot is the implicit/default action.  Only choices that
  // hand control back to the offender need buttons in the HUD.
  const options = [DECISION.PLAY_AGAIN];
  if (missCalled && shot.preShotSnapshot) {
    options.push(DECISION.RESTORE_PLAY_AGAIN);
  }

  return {
    type: 'foul',
    offenderId,
    nonOffenderId,
    penalty,
    fouls: fouls.map((foul) => foul.code),
    foulDetails: fouls,
    miss: missCalled,
    missMode: getRuleSettings(state).missMode,
    options,
    nextRuleState: nextRule,
    restoreSnapshot: shot.preShotSnapshot || null,
    restoreShotInput: missCalled && shot.shotInput?.direction
      ? {
        direction: {
          x: Number(shot.shotInput.direction.x) || 0,
          y: Number(shot.shotInput.direction.y) || 0,
        },
        tipOffset: {
          x: Number(shot.shotInput.tipOffset?.x) || 0,
          y: Number(shot.shotInput.tipOffset?.y) || 0,
        },
      }
      : null,
    freeBallAvailableIfSelf: isSnookeredOnTargets(state, {
      ...nextRule,
      cueBallInHand: Boolean(shot.cueBallPotted),
    }),
  };
}

function applyRuleStatePatch(state, patch) {
  const ruleState = ensureRuleState(state);
  ruleState.phase = patch.phase;
  ruleState.targetColorKind = patch.targetColorKind || null;
  ruleState.freeBallAvailable = Boolean(patch.freeBallAvailable);
  ruleState.freeBallKind = patch.freeBallKind || null;
  ruleState.nominatedColorKind = null;
}

function applyFoulResult(state, shot, ruleState, shotTarget, fouls, events, options = {}) {
  const offenderId = shot.playerId || state.currentPlayerId;
  const nonOffenderId = otherPlayerId(state, offenderId);
  const penalty = calculatePenalty(fouls, shotTarget);
  const requiredPenaltyPointsBeforeFoul = anyPlayerRequiresPenaltyPoints(state, ruleState);
  addPlayerScore(state, nonOffenderId, penalty);
  resetBreak(state, offenderId);

  // A final-black foul ends the frame with the balls where the shot left them.
  // A tied score is the exception; finishFinalBlack handles that respot itself.
  if (ruleState.phase === RULE_PHASE.RESPOTTED_BLACK) {
    handleRespottedBlack(state, offenderId, true);
    return { penalty, pendingDecision: null, missCalled: false };
  }

  if (ruleState.phase === RULE_PHASE.FINAL_BLACK) {
    finishFinalBlack(state, offenderId, true, events);
    return { penalty, pendingDecision: null, missCalled: false };
  }

  if (options.respotColors !== false) {
    events.push(...respotPottedColorBalls(state, {
      includeBallIds: shot.pottedBallIds || [],
    }));
  }
  if (options.respotCueBall !== false) events.push(...respotPottedCueBallInD(state));

  const nextRule = nextPhaseAfterFoul(state, ruleState);
  const missCalled = canCallMiss(state, shot, fouls, {
    anyPlayerRequiresPenaltyPoints: (
      requiredPenaltyPointsBeforeFoul
      || anyPlayerRequiresPenaltyPoints(state, nextRule)
    ),
  });
  const pendingDecision = buildFoulDecision(
    state,
    shot,
    ruleState,
    penalty,
    fouls,
    nextRule,
    missCalled,
  );

  const currentRuleState = ensureRuleState(state);
  // The non-offender owns the default next shot while deciding whether to
  // play or send the offender back. Keeping the offender as current player
  // makes online turn indicators and private aim guides appear on the wrong
  // client while this decision is pending.
  state.currentPlayerId = nonOffenderId;
  clearPostShotFlags(state);
  currentRuleState.pendingDecision = pendingDecision;
  currentRuleState.phase = nextRule.phase;
  currentRuleState.targetColorKind = nextRule.targetColorKind;
  currentRuleState.freeBallAvailable = false;
  currentRuleState.freeBallKind = null;
  currentRuleState.cueBallInHand = Boolean(shot.cueBallPotted);
  if (missCalled) {
    currentRuleState.missSequence = {
      count: (currentRuleState.missSequence?.count || 0) + 1,
      originalShotId: shot.shotInput ? JSON.stringify(shot.shotInput) : null,
    };
  } else {
    currentRuleState.missSequence = { count: 0, originalShotId: null };
  }

  return { penalty, pendingDecision, missCalled };
}

function clearPostShotFlags(state) {
  const ruleState = ensureRuleState(state);
  ruleState.freeBallAvailable = false;
  ruleState.freeBallKind = null;
  ruleState.nominatedColorKind = null;
  ruleState.requiresNomination = false;
  ruleState.nominationReason = null;
}

function applyLegalResult(state, shot, ruleState, shotTarget, score, events, options = {}) {
  const playerId = shot.playerId || state.currentPlayerId;
  const potted = pottedBalls(state, shot).filter((ball) => ball.kind !== BALL_KIND.CUE);
  const respotKinds = [...new Set(
    potted
      .map((ball) => ball.kind)
      .filter((kind) => shouldRespotColorAfterLegalShot(ruleState, kind, shotTarget)),
  )];
  if (options.respotColors !== false) {
    events.push(...respotSelectedPottedColors(state, respotKinds, 'legal-shot'));
  }

  if (score > 0) {
    addPlayerScore(state, playerId, score);
    addPlayerBreak(state, playerId, score);
    let scoringPots = potted;
    if (shotTarget.freeBallKind) {
      if (ruleState.phase === RULE_PHASE.REDS) {
        scoringPots = potted
          .filter((ball) => (
            ball.kind === BALL_KIND.RED || ball.kind === shotTarget.freeBallKind
          ))
          .map((ball) => ({ ...ball, kind: BALL_KIND.RED }));
      } else {
        // On colours a free ball and the true ball on potted in the same
        // stroke score only once. The break strip therefore records one ball
        // on, irrespective of which physical ball(s) entered a pocket.
        scoringPots = shotTarget.targetKind ? [{ kind: shotTarget.targetKind }] : [];
      }
    }
    addCurrentBreakPots(state, scoringPots);
  }

  if (ruleState.phase === RULE_PHASE.RESPOTTED_BLACK) {
    handleRespottedBlack(state, playerId, false, score > 0);
    return;
  }

  if (ruleState.phase === RULE_PHASE.FINAL_BLACK && score > 0) {
    finishFinalBlack(state, playerId, false, events);
    return;
  }

  const next = nextPhaseAfterLegalShot(state, ruleState, score);
  applyRuleStatePatch(state, next);
  ensureRuleState(state).cueBallInHand = false;

  if (score <= 0) {
    resetBreak(state, playerId);
    state.currentPlayerId = otherPlayerId(state, playerId);
  }

  ensureRuleState(state).missSequence = { count: 0, originalShotId: null };
  clearPostShotFlags(state);
}

function resolveShot(state, shotRecord, options = {}) {
  const shot = normalizeShotRecord(shotRecord || state.activeShot);
  const preRuleState = cloneJson(shot.preShotRuleState || ensureRuleState(state));
  // Test-field layouts start with an open choice. Resolve the first scoring
  // stroke using normal red/colour rules, then retain normal progression.
  if (preRuleState.testFieldOpenTargets) {
    const first = findBallById(state, shot.firstContactBallId);
    const beforeBalls = shot.preShotSnapshot?.balls || (state.balls || []).filter(ball =>
      !ball.potted || shot.pottedBallIds.includes(ball.id));
    const hadReds = beforeBalls.some(ball => ball.kind === BALL_KIND.RED
      && (!ball.potted || !shot.preShotSnapshot));
    preRuleState.testFieldOpenTargets = false;
    preRuleState.phase = first?.kind === BALL_KIND.RED ? RULE_PHASE.REDS
      : !hadReds && first?.kind === BALL_KIND.YELLOW ? RULE_PHASE.CLEARANCE
        : RULE_PHASE.COLOR_CHOICE;
    preRuleState.targetColorKind = preRuleState.phase === RULE_PHASE.CLEARANCE ? BALL_KIND.YELLOW : null;
  }
  const snookersRequiredBeforeShot = anyPlayerRequiresSnookers(shot.preShotSnapshot || state);
  const events = [];
  const shotTarget = inferShotTarget(state, preRuleState, shot);
  const fouls = options.detectFouls === false
    ? []
    : detectFouls(state, preRuleState, shot, shotTarget);
  const score = fouls.length > 0 ? 0 : calculateLegalScore(state, preRuleState, shot, shotTarget);

  let penalty = 0;
  let pendingDecision = null;
  let missCalled = false;

  if (fouls.length > 0) {
    const foulResult = applyFoulResult(
      state,
      shot,
      preRuleState,
      shotTarget,
      fouls,
      events,
      options,
    );
    penalty = foulResult.penalty;
    pendingDecision = foulResult.pendingDecision;
    missCalled = foulResult.missCalled;
  } else {
    applyLegalResult(state, shot, preRuleState, shotTarget, score, events, options);
  }

  const ruleState = ensureRuleState(state);
  const frameResult = state.frameOver && ruleState.lastRuleResult?.type === 'frame-over'
    ? cloneJson(ruleState.lastRuleResult)
    : null;
  if (score > 0 && ruleState.testFieldOpenTargets) ruleState.testFieldOpenTargets = false;
  const result = {
    type: frameResult?.type || 'shot-result',
    foul: fouls.length > 0,
    fouls: fouls.map((foul) => foul.code),
    foulDetails: fouls,
    miss: missCalled,
    points: score,
    penalty,
    shotTarget,
    pottedBallIds: shot.pottedBallIds,
    firstContactBallId: shot.firstContactBallId,
    nextPlayerId: pendingDecision ? null : state.currentPlayerId,
    nextTarget: targetKindsForRule(ruleState, state),
    pendingDecision,
    events,
    frameOver: Boolean(state.frameOver),
    winnerId: frameResult?.winnerId || null,
    reason: frameResult?.reason || null,
    overSnooker: !snookersRequiredBeforeShot && anyPlayerRequiresSnookers(state),
  };

  ruleState.lastRuleResult = result;
  prepareNextShotState(state);
  if (shotRecord) {
    shotRecord.ruleResult = result;
  }

  return { state, shotRecord, result, events };
}

function applyPendingDecision(state, decision) {
  const ruleState = ensureRuleState(state);
  const pending = ruleState.pendingDecision;
  if (pending?.type === 'respotted-black-break-off') {
    if (!pending.options.includes(decision)) {
      return { state, applied: false, reason: 'decision-not-allowed' };
    }
    if (decision === 'other-player-breaks') {
      state.currentPlayerId = otherPlayerId(state, state.currentPlayerId);
    }
    ruleState.pendingDecision = null;
    ruleState.phase = RULE_PHASE.RESPOTTED_BLACK;
    ruleState.targetColorKind = BALL_KIND.BLACK;
    prepareNextShotState(state);
    return { state, applied: true };
  }

  if (!pending || pending.type !== 'foul') {
    return { state, applied: false, reason: 'no-pending-foul-decision' };
  }
  const implicitPlaySelf = decision === DECISION.PLAY_SELF && pending.type === 'foul';
  if (!implicitPlaySelf && !pending.options.includes(decision)) {
    return { state, applied: false, reason: 'decision-not-allowed' };
  }

  if (decision === DECISION.RESTORE_PLAY_AGAIN && pending.restoreSnapshot) {
    const restoredShotInput = pending.restoreShotInput?.direction
      ? cloneJson(pending.restoreShotInput)
      : null;
    const playersAfterPenalty = cloneJson(state.players || []);
    restoreBallsFromSnapshot(state, pending.restoreSnapshot);
    state.players = playersAfterPenalty;
    state.currentPlayerId = pending.offenderId;
    state.ruleState = {
      ...cloneJson(pending.restoreSnapshot.ruleState || createInitialRuleState()),
      pendingDecision: null,
      freeBallAvailable: false,
      freeBallKind: null,
      missSequence: ensureRuleState(state).missSequence,
    };
    // Keep the restored controls in the authoritative match state until the
    // replayed shot starts. This makes room-state reconciliation and reconnect
    // restore the same direction and cue-tip point, without restoring power.
    state.nextShotInput = restoredShotInput;
    prepareNextShotState(state);
    return { state, applied: true };
  }

  state.currentPlayerId = decision === DECISION.PLAY_SELF
    ? pending.nonOffenderId
    : pending.offenderId;
  // A clock foul does not move the balls or consume the saved 3D stance.
  // Keep it for either player; a physical shot foul still clears it.
  state.nextShotInput = pending.fouls?.includes('shot-clock-timeout') && state.nextShotInput?.direction
    ? { ...cloneJson(state.nextShotInput), power: 0 }
    : null;
  ruleState.pendingDecision = null;
  ruleState.phase = pending.nextRuleState.phase;
  ruleState.targetColorKind = pending.nextRuleState.targetColorKind || null;
  ruleState.freeBallAvailable = decision === DECISION.PLAY_SELF
    ? Boolean(pending.freeBallAvailableIfSelf)
    : false;
  ruleState.freeBallKind = null;
  // As in 2D, placement before choosing the next player is not a stroke.
  if (pending.fouls?.includes('cue-ball-potted')) {
    ruleState.cueBallInHand = true;
    state.cueBallInHandReminder = null;
  }
  prepareNextShotState(state);
  return { state, applied: true };
}

function setNominatedColor(state, kind) {
  const ruleState = ensureRuleState(state);
  if (!COLOR_ORDER.includes(kind)) {
    return { state, applied: false, reason: 'not-a-color' };
  }
  ruleState.nominatedColorKind = kind;
  ruleState.requiresNomination = false;
  ruleState.nominationReason = null;
  return { state, applied: true };
}

function createRulesEngine() {
  return {
    resolveShot,
    applyPendingDecision,
    endFrame,
    prepareNextShotState,
    setNominatedColor,
    createTimeoutFoul,
  };
}

module.exports = {
  DECISION,
  MISS_MODE,
  RULE_PHASE,
  applyPendingDecision,
  createDefaultRuleSettings,
  createInitialRuleState,
  createRulesEngine,
  createTimeoutFoul,
  detectTouchingBalls,
  displayFoulCode,
  endFrame,
  isSnookeredOnTargets,
  prepareNextShotState,
  resolveShot,
  setNominatedColor,
  targetKindsForRule,
};

}, {"../../config/constants":3,"../model/ballSpec":4,"../model/spotModel":6,"./scoring":20,"./ruleSettingsAdapter":21,"./respot":18,"./ruleSnapshot":22,"./scoreAvailability":23,"./snookerGeometry":24}, "apps/three-game/src/core/rules/rulesEngine.js"],
20: [function(require, module, exports) {
function ballValue(kind) {
  const values = {
    red: 1,
    yellow: 2,
    green: 3,
    brown: 4,
    blue: 5,
    pink: 6,
    black: 7,
  };

  return values[kind] || 0;
}

module.exports = {
  ballValue,
};

}, {}, "apps/three-game/src/core/rules/scoring.js"],
21: [function(require, module, exports) {
(function installRuleSettingsAdapter(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SnookerRuleSettingsAdapter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this), function createRuleSettingsAdapter() {
const MISS_MODE = {
  OFF: 'off',
  LIMITED_THREE: 'limited3',
  UNLIMITED: 'unlimited',
};

function clampNumber(value, min, max, fallback = min) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function createDefaultRuleSettings(overrides = {}) {
  return {
    missMode: MISS_MODE.LIMITED_THREE,
    missLimit: 3,
    autoInferColorChoice: true,
    autoInferFreeBall: true,
    requireNominationWhenSnookered: true,
    touchingBallToleranceMm: 0.8,
    shotClockSeconds: 60,
    timeoutPenalty: 4,
    ...overrides,
  };
}

function normalizeRuleSettings(settings = {}) {
  const missMode = Object.values(MISS_MODE).includes(settings.missMode)
    ? settings.missMode
    : MISS_MODE.LIMITED_THREE;
  const missLimit = Math.max(1, Math.round(Number(settings.missLimit) || 3));
  return createDefaultRuleSettings({
    ...settings,
    missMode,
    missLimit: missMode === MISS_MODE.LIMITED_THREE
      ? missLimit
      : Math.max(1, Math.round(Number(settings.missLimit) || 3)),
  });
}

function missLimitModeFromRuleSettings(settings = {}) {
  const normalized = normalizeRuleSettings(settings);
  if (normalized.missMode === MISS_MODE.OFF) return 'off';
  if (normalized.missMode === MISS_MODE.UNLIMITED) return 'unlimited';
  return Number(normalized.missLimit) <= 1 ? 'one' : 'three';
}

function ruleSettingsFromRuleValues(values = {}) {
  const defaults = createDefaultRuleSettings();
  const missLimitMode = ['off', 'one', 'three', 'unlimited'].includes(values.missLimitMode)
    ? values.missLimitMode
    : 'three';
  return normalizeRuleSettings({
    matchRulesEnabled: Boolean(values.matchRulesEnabled),
    autoInferColorChoice: values.autoInferColorChoice !== false,
    illegalAimHintEnabled: values.illegalAimHintEnabled !== false,
    autoInferFreeBall: values.autoInferFreeBall !== false,
    requireNominationWhenSnookered: values.requireNominationWhenSnookered !== false,
    touchingBallToleranceMm: clampNumber(values.touchingBallToleranceMm, 0, 5, defaults.touchingBallToleranceMm),
    shotClockSeconds: clampNumber(values.shotClockSeconds, 8, 180, defaults.shotClockSeconds),
    timeoutPenalty: clampNumber(values.timeoutPenalty, 4, 7, defaults.timeoutPenalty),
    missMode: missLimitMode === 'off'
      ? MISS_MODE.OFF
      : missLimitMode === 'unlimited'
        ? MISS_MODE.UNLIMITED
        : MISS_MODE.LIMITED_THREE,
    missLimit: missLimitMode === 'one' ? 1 : 3,
  });
}

function ruleValuesFromRuleSettings(settings = {}, matchRulesEnabled = false) {
  const normalized = normalizeRuleSettings(settings);
  return {
    matchRulesEnabled: Boolean(matchRulesEnabled),
    autoInferColorChoice: Boolean(normalized.autoInferColorChoice),
    illegalAimHintEnabled: normalized.illegalAimHintEnabled !== false,
    autoInferFreeBall: Boolean(normalized.autoInferFreeBall),
    requireNominationWhenSnookered: Boolean(normalized.requireNominationWhenSnookered),
    missLimitMode: missLimitModeFromRuleSettings(normalized),
    touchingBallToleranceMm: normalized.touchingBallToleranceMm,
    shotClockSeconds: normalized.shotClockSeconds,
    timeoutPenalty: normalized.timeoutPenalty,
  };
}

return {
  MISS_MODE,
  createDefaultRuleSettings,
  missLimitModeFromRuleSettings,
  normalizeRuleSettings,
  ruleSettingsFromRuleValues,
  ruleValuesFromRuleSettings,
};
});

}, {}, "apps/three-game/src/core/rules/ruleSettingsAdapter.js"],
22: [function(require, module, exports) {
function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function sanitizeRestoreSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return null;
  return {
    balls: cloneJson(snapshot.balls || []),
    players: cloneJson(snapshot.players || []),
    currentPlayerId: snapshot.currentPlayerId || null,
    targetMode: snapshot.targetMode || null,
    ruleState: sanitizeRuleStateSnapshot(snapshot.ruleState, { includePendingRestore: false }),
    frameOver: Boolean(snapshot.frameOver),
    matchOver: Boolean(snapshot.matchOver),
  };
}

function sanitizePendingDecision(pendingDecision, options = {}) {
  if (!pendingDecision || typeof pendingDecision !== 'object') return null;
  const { restoreSnapshot, ...rest } = pendingDecision;
  const sanitized = cloneJson(rest);
  if (options.includeRestore && restoreSnapshot) {
    sanitized.restoreSnapshot = sanitizeRestoreSnapshot(restoreSnapshot);
  } else if ('restoreSnapshot' in pendingDecision) {
    sanitized.restoreSnapshot = null;
  }
  return sanitized;
}

function sanitizeRuleStateSnapshot(ruleState, options = {}) {
  if (!ruleState || typeof ruleState !== 'object') return null;
  const {
    lastRuleResult,
    pendingDecision,
    ...rest
  } = ruleState;
  const sanitized = cloneJson(rest);
  sanitized.pendingDecision = sanitizePendingDecision(pendingDecision, {
    includeRestore: options.includePendingRestore === true,
  });
  if (lastRuleResult && typeof lastRuleResult === 'object') {
    const { pendingDecision: resultPendingDecision, ...resultRest } = lastRuleResult;
    sanitized.lastRuleResult = {
      ...cloneJson(resultRest),
      pendingDecision: sanitizePendingDecision(resultPendingDecision, { includeRestore: false }),
    };
  } else {
    sanitized.lastRuleResult = null;
  }
  return sanitized;
}

function createPreShotSnapshot(state) {
  return {
    balls: cloneJson(state.balls || []),
    players: cloneJson(state.players || []),
    currentPlayerId: state.currentPlayerId,
    targetMode: state.targetMode,
    // A pre-shot restore point must not retain older restore points. Without
    // this boundary every foul can embed the previous foul snapshot again,
    // causing exponential match:state payload growth and transport framing
    // failures after several fouls.
    ruleState: sanitizeRuleStateSnapshot(state.ruleState, { includePendingRestore: false }),
    frameOver: Boolean(state.frameOver),
    matchOver: Boolean(state.matchOver),
  };
}

function restoreBallsFromSnapshot(state, snapshot) {
  if (!snapshot || !Array.isArray(snapshot.balls)) {
    return;
  }

  state.balls = cloneJson(snapshot.balls);
}

module.exports = {
  createPreShotSnapshot,
  restoreBallsFromSnapshot,
  sanitizeRuleStateSnapshot,
};

}, {}, "apps/three-game/src/core/rules/ruleSnapshot.js"],
23: [function(require, module, exports) {
const { BALL_KIND } = require('../../config/constants');
const { ballValue } = require('./scoring');

// A colour owed after a red belongs only to the current visit. A player
// coming to the table starts on reds (or the clearance), without that colour.
function availablePointsForPlayer(state, playerId) {
  const balls = (state?.balls || []).filter(ball => !ball.potted);
  const reds = balls.filter(ball => ball.kind === BALL_KIND.RED).length;
  const colors = balls.filter(ball => ball.kind !== BALL_KIND.CUE && ball.kind !== BALL_KIND.RED);
  const base = reds > 0 ? reds * 8 + 27 : colors.reduce((sum, ball) => sum + ballValue(ball.kind), 0);
  const rule = state?.ruleState || {};
  const owesColor = rule.phase === 'colorChoice' || rule.colorAfterLastRedDue;
  return base + (owesColor && state.currentPlayerId === playerId ? 7 : 0);
}

function playerRequiresSnookers(state, playerId) {
  const player = state?.players?.find(player => player.id === playerId);
  const opponent = state?.players?.find(player => player.id !== playerId);
  return Boolean(player && opponent
    && Number(opponent.score) - Number(player.score) > availablePointsForPlayer(state, playerId));
}

function anyPlayerRequiresSnookers(state) {
  return (state?.players || []).some(player => playerRequiresSnookers(state, player.id));
}

module.exports = { availablePointsForPlayer, playerRequiresSnookers, anyPlayerRequiresSnookers };

}, {"../../config/constants":3,"./scoring":20}, "apps/three-game/src/core/rules/scoreAvailability.js"],
24: [function(require, module, exports) {
const { BALL_RADIUS_MM } = require('../model/ballSpec');
const { BAULK_LINE_X_MM, D_RADIUS_MM } = require('../model/tableModel');

const EPS = 1e-7;
// Ambiguous regions smaller than this are treated as a possible escape, never
// as grounds to award a free ball. Units are physical table millimetres.
const D_SEARCH_TOLERANCE_MM = 0.0001;
const radiusOf = ball => ball.radius || BALL_RADIUS_MM;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function segmentDistance(point, start, end) {
  const dx = end.x - start.x, dy = end.y - start.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq > EPS * EPS
    ? Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq))
    : 0;
  return Math.hypot(point.x - start.x - t * dx, point.y - start.y - t * dy);
}

// Tangents to the target expanded by the cue radius give the cue-centre paths
// for the two thinnest contacts. Stop at contact, not beyond the target.
function extremeContacts(pos, target, cueRadius) {
  const dx = pos.x - target.pos.x, dy = pos.y - target.pos.y;
  const d = Math.hypot(dx, dy), r = cueRadius + radiusOf(target);
  if (d <= r + EPS) return [pos, pos];
  const along = r * r / (d * d);
  const across = r * Math.sqrt(d * d - r * r) / (d * d);
  return [-1, 1].map(sign => ({
    x: target.pos.x + along * dx - sign * across * dy,
    y: target.pos.y + along * dy + sign * across * dx,
  }));
}

function edgeClearances(pos, target, cueRadius, blockers) {
  return extremeContacts(pos, target, cueRadius).map(end => (
    blockers.reduce((clearance, ball) => Math.min(clearance,
      segmentDistance(ball.pos, pos, end) - cueRadius - radiusOf(ball)), Infinity)
  ));
}

function hasBothEdgesClear(pos, target, cueRadius, blockers) {
  return edgeClearances(pos, target, cueRadius, blockers).every(value => value >= -EPS);
}

// Bound the motion of a tangent endpoint over a cell of radius h. Distance
// to the corresponding segment changes by no more than its moving endpoints.
function edgeMotionBound(pos, target, cueRadius, h) {
  const d = distance(pos, target.pos), r = cueRadius + radiusOf(target);
  if (d - h <= r) return Infinity;
  const angle = Math.acos(r / d);
  const angleChange = Math.asin(Math.min(1, h / d)) + Math.max(
    angle - Math.acos(r / (d - h)), Math.acos(r / (d + h)) - angle,
  );
  return Math.max(h, r * angleChange);
}

function hasEscapeInD(state, cue, targets, blockers, objects) {
  const markings = state.table?.markings?.dArea;
  const center = {
    x: state.table?.baulkLineMm ?? markings?.center?.x ?? BAULK_LINE_X_MM,
    y: markings?.center?.y ?? 0,
  };
  const radius = state.table?.dRadiusMm ?? markings?.radius ?? D_RADIUS_MM;
  const cueRadius = radiusOf(cue);
  const valid = pos => pos.x <= center.x + EPS
    && distance(pos, center) <= radius + EPS
    && objects.every(ball => distance(pos, ball.pos) >= cueRadius + radiusOf(ball) - EPS);
  const escape = pos => valid(pos)
    && targets.some(target => hasBothEdgesClear(pos, target, cueRadius, blockers));
  if ([cue.pos, center, { x: center.x, y: center.y - radius },
    { x: center.x, y: center.y + radius }, { x: center.x - radius, y: center.y }].some(escape)) return true;

  // Search the entire D, including its boundary. Prune only cells proved to
  // be outside it, occupied, or blocked for every target. This avoids a fixed
  // placement grid missing a narrow legal escape between obstruction shadows.
  const cells = [{ x: center.x - radius / 2, y: center.y, hx: radius / 2, hy: radius }];
  while (cells.length) {
    const cell = cells.pop();
    const pos = { x: cell.x, y: cell.y }, h = Math.hypot(cell.hx, cell.hy);
    const near = { x: Math.max(cell.x - cell.hx, Math.min(center.x, cell.x + cell.hx)),
      y: Math.max(cell.y - cell.hy, Math.min(center.y, cell.y + cell.hy)) };
    if (distance(near, center) > radius + EPS) continue;
    if (objects.some(ball => distance(pos, ball.pos) + h < cueRadius + radiusOf(ball) - EPS)) continue;
    if (escape(pos)) return true;
    if (targets.every(target => {
      const bound = edgeMotionBound(pos, target, cueRadius, h);
      return edgeClearances(pos, target, cueRadius, blockers).some(value => value + bound < -EPS);
    })) continue;
    if (h <= D_SEARCH_TOLERANCE_MM) return true;
    if (cell.hx >= cell.hy) {
      const hx = cell.hx / 2;
      cells.push({ ...cell, x: cell.x - hx, hx }, { ...cell, x: cell.x + hx, hx });
    } else {
      const hy = cell.hy / 2;
      cells.push({ ...cell, y: cell.y - hy, hy }, { ...cell, y: cell.y + hy, hy });
    }
  }
  return false;
}

function isSnookered(state, cue, targetKinds, inHand = false) {
  if (!cue || (cue.potted && !inHand)) return false;
  const objects = (state.balls || []).filter(ball => !ball.potted && ball.id !== cue.id);
  const targets = objects.filter(ball => targetKinds.includes(ball.kind));
  if (!targets.length) return false;
  // Other balls on and cushions do not count as snookering obstacles.
  const blockers = objects.filter(ball => !targetKinds.includes(ball.kind));
  if (inHand) return !hasEscapeInD(state, cue, targets, blockers, objects);
  return !targets.some(target => hasBothEdgesClear(cue.pos, target, radiusOf(cue), blockers));
}

function effectiveSnookeringBalls(state, cue, targetKinds) {
  if (!cue || cue.potted) return [];
  const objects = (state.balls || []).filter(ball => !ball.potted && ball.id !== cue.id);
  const targets = objects.filter(ball => targetKinds.includes(ball.kind));
  const blockers = objects.filter(ball => !targetKinds.includes(ball.kind));
  if (!targets.length) return [];
  let common = null;
  for (const target of targets) {
    const obstructing = blockers.filter(ball => !hasBothEdgesClear(cue.pos, target, radiusOf(cue), [ball]));
    if (!obstructing.length) return [];
    const nearest = Math.min(...obstructing.map(ball => distance(cue.pos, ball.pos)));
    const effective = obstructing.filter(ball => distance(cue.pos, ball.pos) <= nearest + EPS);
    // WPBSA 2.17: nearest obstructions (including ties) are effective. When
    // different reds have different effective obstacles, no ball is effective
    // for the snooker as a whole, even if a farther ball also blocks each red.
    common = common === null ? effective : common.filter(ball => effective.some(other => other.id === ball.id));
    if (!common.length) return [];
  }
  return common || [];
}

module.exports = { isSnookered, effectiveSnookeringBalls };

}, {"../model/ballSpec":4,"../model/tableModel":7}, "apps/three-game/src/core/rules/snookerGeometry.js"],
25: [function(require, module, exports) {
const {
  PHYSICS_DEFAULTS,
  applyPhysicsRate,
  createPhysicsParams,
} = require('./config/physicsParams');
const { stepPhysicsWorld } = require('./physicsWorld');
const { stepPhysicsWorldV2 } = require('./physicsWorldV2');
const { isPocketMotionActive } = require('./pocketMotion');
const { normalizeSP } = require('./sp/config');
const { stepSPWorld } = require('./sp/world');
const { adaptV3PhysicsOptions } = require('./v3Config');

function createPhysicsEngine(options = {}) {
  const engineVersion = (options.physicsEngine === 'v3' || options.physicsVariant === 'SP')
    ? 'v3'
    : (options.physicsEngine === 'v2' ? 'v2' : 'legacy');
  if (options.physicsVariant === 'SP') {
    const sp = normalizeSP(options.sp);
    options = { ...options, physicsEngine: 'v3', sp, v3: sp, lowSpeedCutoff: .1, lowOmegaCutoff: .01 };
  }
  const normalizedOptions = engineVersion === 'v3' ? adaptV3PhysicsOptions(options) : options;
  const params = createPhysicsParams(normalizedOptions);

  return {
    params,
    engineVersion,
    step(state, dt) {
      if (engineVersion === 'v2' || engineVersion === 'v3') {
        if (params.physicsVariant === 'SP') {
          // Original runtime advances at a fixed 1 ms independent of render Hz.
          state.spTimeRemainder = (state.spTimeRemainder || 0) + Math.max(0, dt);
          const events = [];
          while (state.spTimeRemainder >= .001 - 1e-12) {
            stepSPWorld(state, params, .001);
            events.push(...(state.physicsEvents || []));
            state.spTimeRemainder -= .001;
          }
          state.physicsEvents = events;
        } else stepPhysicsWorldV2(state, params, dt);
      } else {
        stepPhysicsWorld(state, params, dt);
      }
      return state;
    },
    setPhysicsRateHz(hz) {
      return applyPhysicsRate(params, hz);
    },
    isTableMoving(state) {
      return state.balls.some((ball) => (
        isPocketMotionActive(ball) || Boolean(ball.pocketEntry)
        || (!ball.potted && (
          (params.physicsVariant === 'SP' && ((ball.spHeightMm || 0) > .01 || Math.abs(ball.spVerticalSpeedMmS || 0) > .1)) ||
          Math.hypot(ball.vel.x, ball.vel.y) > params.lowSpeedCutoff
          || Math.hypot(ball.omega.x, ball.omega.y, ball.omega.z) > params.lowOmegaCutoff
        ))
      ));
    },
  };
}

module.exports = {
  PHYSICS_DEFAULTS,
  createPhysicsEngine,
};

}, {"./config/physicsParams":26,"./physicsWorld":33,"./physicsWorldV2":53,"./pocketMotion":52,"./sp/config":59,"./sp/world":60,"./v3Config":66}, "apps/three-game/src/core/physics/physicsEngine.js"],
26: [function(require, module, exports) {
const { createMaterialProfiles } = require('../materialProfiles');
const { CUE_PARAM_DEFAULTS } = require('./cueDefaults');
const { MATERIAL_PARAM_DEFAULTS } = require('./materialDefaults');
const { POCKET_PARAM_DEFAULTS } = require('./pocketDefaults');
const {
  DEFAULT_MAX_FRAME_STEPS,
  DEFAULT_PHYSICS_HZ,
  DEFAULT_POCKET_WORLD_HZ,
  DEFAULT_REFRESH_HZ_BUCKETS,
  MAX_PHYSICS_HZ,
  MIN_PHYSICS_HZ,
  SIMULATION_MODE,
  SOLVER_PARAM_DEFAULTS,
  applyPhysicsRate,
  clampPhysicsHz,
  fixedDtForHz,
  maxFrameStepsForRate,
  nearestRefreshHz,
  normalizeRefreshBuckets,
} = require('./solverDefaults');
const referenceParams = require('./referenceParams');

const PHYSICS_DEFAULTS = {
  ...SOLVER_PARAM_DEFAULTS,
  ...MATERIAL_PARAM_DEFAULTS,
  ...CUE_PARAM_DEFAULTS,
  ...POCKET_PARAM_DEFAULTS,
};

const DEPRECATED_PHYSICS_OPTION_KEYS = [
  'legacyCueBallMass',
  'velocityDependentFriction',
  'sideSpinDecay',
  'useHeightOffsetInCollision',
  'heightOffsetRadiusFactor',
  'railHeight',
  'railHeightRadiusFraction',
  'railHeightSpinDamping',
  'railSpinRetain',
  'railSideSpinThrow',
  'railSpinThrowMaxRatio',
  'railRollBaseLoss',
  'pocketLipRestitution',
  'pocketLipFrictionMu',
  'pocketDeepCaptureRatio',
  'pocketOutwardSpeedTolerance',
];

function normalizePhysicsOptions(options = {}) {
  const normalized = { ...options };
  const legacyCueMass = Number(options.legacyCueBallMass);
  const legacyTopBack = Number(options.cueSpinMultiplierXZ);

  if (
    Object.prototype.hasOwnProperty.call(options, 'legacyCueBallMass')
    && Number.isFinite(legacyCueMass)
    && legacyCueMass > 0
    && Number.isFinite(legacyTopBack)
  ) {
    normalized.cueSpinMultiplierXZ = legacyTopBack * Math.sqrt(legacyCueMass);
  }

  DEPRECATED_PHYSICS_OPTION_KEYS.forEach((key) => {
    delete normalized[key];
  });

  return normalized;
}

function createPhysicsParams(rawOptions = {}) {
  const options = normalizePhysicsOptions(rawOptions);
  const simulationMode = options.simulationMode || PHYSICS_DEFAULTS.simulationMode;
  const hasFixedDt = Number.isFinite(options.fixedDt) && options.fixedDt > 0;
  const requestedHz = simulationMode === SIMULATION_MODE.DETERMINISTIC
    ? (options.targetPhysicsHz || DEFAULT_PHYSICS_HZ)
    : (options.targetPhysicsHz || (hasFixedDt ? 1 / options.fixedDt : PHYSICS_DEFAULTS.targetPhysicsHz));
  const targetPhysicsHz = clampPhysicsHz(
    requestedHz,
  );
  const fixedDt = fixedDtForHz(targetPhysicsHz);
  const pocketWorldHz = clampPhysicsHz(options.pocketWorldHz || PHYSICS_DEFAULTS.pocketWorldHz);
  const pocketFixedDt = fixedDtForHz(pocketWorldHz);
  const maxFrameDt = Number.isFinite(options.maxFrameDt) && options.maxFrameDt > 0
    ? options.maxFrameDt
    : PHYSICS_DEFAULTS.maxFrameDt;
  const maxFrameSteps = Number.isFinite(options.maxFrameSteps) && options.maxFrameSteps > 0
    ? Math.floor(options.maxFrameSteps)
    : maxFrameStepsForRate(maxFrameDt, fixedDt);

  const params = {
    ...PHYSICS_DEFAULTS,
    ...options,
    simulationMode,
    targetPhysicsHz,
    pocketWorldHz,
    fixedDt,
    pocketFixedDt,
    maxFrameDt,
    maxFrameSteps,
    refreshHzBuckets: normalizeRefreshBuckets(options.refreshHzBuckets || PHYSICS_DEFAULTS.refreshHzBuckets),
  };

  params.materials = createMaterialProfiles(params, options.materials);
  return params;
}

function createDeterministicPhysicsParams(options = {}) {
  return createPhysicsParams({
    ...options,
    simulationMode: SIMULATION_MODE.DETERMINISTIC,
    targetPhysicsHz: options.targetPhysicsHz || DEFAULT_PHYSICS_HZ,
  });
}

module.exports = {
  DEFAULT_PHYSICS_HZ,
  DEFAULT_POCKET_WORLD_HZ,
  MIN_PHYSICS_HZ,
  MAX_PHYSICS_HZ,
  DEFAULT_MAX_FRAME_STEPS,
  DEFAULT_REFRESH_HZ_BUCKETS,
  SIMULATION_MODE,
  PHYSICS_DEFAULTS,
  SOLVER_PARAM_DEFAULTS,
  MATERIAL_PARAM_DEFAULTS,
  CUE_PARAM_DEFAULTS,
  POCKET_PARAM_DEFAULTS,
  normalizePhysicsOptions,
  ...referenceParams,
  applyPhysicsRate,
  clampPhysicsHz,
  fixedDtForHz,
  nearestRefreshHz,
  normalizeRefreshBuckets,
  createDeterministicPhysicsParams,
  createPhysicsParams,
};

}, {"../materialProfiles":27,"./cueDefaults":28,"./materialDefaults":30,"./pocketDefaults":31,"./solverDefaults":32,"./referenceParams":29}, "apps/three-game/src/core/physics/config/physicsParams.js"],
27: [function(require, module, exports) {
function mergeProfile(base, override = {}) {
  return {
    ...base,
    ...override,
  };
}

function createMaterialProfiles(params, overrides = {}) {
  return {
    cloth: mergeProfile({
      slidingAccel: params.tableSlidingAccel,
      rollingFriction: params.rollingFriction,
      spinDecay: params.spinDecay,
      sideSpinLinearDecay: params.sideSpinLinearDecay,
    }, overrides.cloth),
    ball: mergeProfile({
      restitution: params.ballRestitution,
      frictionMu: params.ballFrictionMu,
      spinTransfer: params.ballSpinTransfer,
      applyThrow: params.applyThrow,
      throwVelocityScale: params.throwVelocityScale,
    }, overrides.ball),
    rail: mergeProfile({
      restitution: params.railRestitution,
      frictionMu: params.railFrictionMu,
      spinDamping: params.railSpinDamping,
      rollCorrection: params.railRollCorrection,
      rollExcessRetention: params.railRollExcessRetention,
      rollTangentLoss: params.railRollTangentLoss,
    }, overrides.rail),
    pocket: mergeProfile({
      minPocketVelocity: params.minPocketVelocity,
      maxPocketVelocity: params.maxPocketVelocity,
      approachDotMin: params.pocketApproachDotMin,
      openingBallRadiusMarginRatio: params.pocketOpeningBallRadiusMarginRatio,
      waitToBeCloseToPocketCentreBeforePutting: params.waitToBeCloseToPocketCentreBeforePutting,
      timeToPot: params.timeToPot,
      visualMotionEnabled: params.pocketVisualMotionEnabled,
      directDropSpeed: params.pocketDirectDropSpeed,
      rattleSpeed: params.pocketRattleSpeed,
      rattleRestitution: params.pocketRattleRestitution,
      rattleFriction: params.pocketRattleFriction,
      rattleMinContacts: params.pocketRattleMinContacts,
      rattleMaxContacts: params.pocketRattleMaxContacts,
      rattleMaxDuration: params.pocketRattleMaxDuration,
      dropDuration: params.pocketDropDuration,
      drainDuration: params.pocketDrainDuration,
      drainDistanceMm: params.pocketDrainDistanceMm,
      finalScale: params.pocketFinalScale,
    }, overrides.pocket),
  };
}

module.exports = {
  createMaterialProfiles,
};

}, {}, "apps/three-game/src/core/physics/materialProfiles.js"],
28: [function(require, module, exports) {
const {
  REFERENCE_COLLISION_SPIN_FACTOR_D,
} = require('./referenceParams');

const CUE_PARAM_DEFAULTS = {
  cueSpinMultiplierXZ: 1.0,
  cueSpinMultiplierY: REFERENCE_COLLISION_SPIN_FACTOR_D,
  cueLowSpeedSpinBoost: 0.30,
  maxTipOffsetRatio: 0.50,
  minCuePower: 0.0,
  maxCuePower: 7800.0,
};

module.exports = {
  CUE_PARAM_DEFAULTS,
};

}, {"./referenceParams":29}, "apps/three-game/src/core/physics/config/cueDefaults.js"],
29: [function(require, module, exports) {
const GRAVITY_MM_PER_SECOND_SQUARED = 9810;

function resolveLegacyFloatRange(normalized, min, max) {
  return min + normalized * (max - min);
}

const REFERENCE_GREAT_TABLE_SERIALIZED = {
  breakStiffnessPower: 1.0,
  totalStepsInForceResolution: 35,
  useImprovedMultiBodyResolution: false,
  updateAngularVelocityInMultiBodyResolution: false,
  resolverVersion: 0,
  clothRoll: [0.55, 0.03, 0.005],
  clothStickiness: [0.015, 0.15, 0.4],
  railBounciness: [0.85, 0.4, 0.9],
  railStickiness: [0.351, 0.15, 0.4],
  useDifferentValueForLips: true,
  lipBounciness: [0.3, 0.4, 0.9],
  lipStickiness: [0, 0, 0],
  ballBounciness: [1.0, 0.92, 1.0],
  ballStickiness: [0.037, 0.03, 0.08],
};

const REFERENCE_GREAT_TABLE_PARAMS = {
  breakStiffnessPower: REFERENCE_GREAT_TABLE_SERIALIZED.breakStiffnessPower,
  totalStepsInForceResolution: REFERENCE_GREAT_TABLE_SERIALIZED.totalStepsInForceResolution,
  useImprovedMultiBodyResolution: REFERENCE_GREAT_TABLE_SERIALIZED.useImprovedMultiBodyResolution,
  updateAngularVelocityInMultiBodyResolution: REFERENCE_GREAT_TABLE_SERIALIZED.updateAngularVelocityInMultiBodyResolution,
  resolverVersion: REFERENCE_GREAT_TABLE_SERIALIZED.resolverVersion,
  clothRoll: resolveLegacyFloatRange(...REFERENCE_GREAT_TABLE_SERIALIZED.clothRoll),
  clothStickiness: resolveLegacyFloatRange(...REFERENCE_GREAT_TABLE_SERIALIZED.clothStickiness),
  railBounciness: resolveLegacyFloatRange(...REFERENCE_GREAT_TABLE_SERIALIZED.railBounciness),
  railStickiness: resolveLegacyFloatRange(...REFERENCE_GREAT_TABLE_SERIALIZED.railStickiness),
  useDifferentValueForLips: REFERENCE_GREAT_TABLE_SERIALIZED.useDifferentValueForLips,
  lipBounciness: resolveLegacyFloatRange(...REFERENCE_GREAT_TABLE_SERIALIZED.lipBounciness),
  lipStickiness: resolveLegacyFloatRange(...REFERENCE_GREAT_TABLE_SERIALIZED.lipStickiness),
  ballBounciness: resolveLegacyFloatRange(...REFERENCE_GREAT_TABLE_SERIALIZED.ballBounciness),
  ballStickiness: resolveLegacyFloatRange(...REFERENCE_GREAT_TABLE_SERIALIZED.ballStickiness),
};

const REFERENCE_BALL_BASE_RADIUS_M = 0.03185;
const REFERENCE_SNOOKER_BALL_PREFAB_SCALE = 0.8;
const REFERENCE_EFFECTIVE_SNOOKER_BALL_RADIUS_MM = REFERENCE_BALL_BASE_RADIUS_M
  * REFERENCE_SNOOKER_BALL_PREFAB_SCALE
  * 1000;
const REFERENCE_NORMALIZED_BALL_MASS = 1;
const REFERENCE_COLLISION_SPIN_FACTOR_A = 0.4;
const REFERENCE_COLLISION_SPIN_FACTOR_B = 0.009951;
const REFERENCE_COLLISION_SPIN_FACTOR_D = 1.088;

const REFERENCE_TABLE_DYNAMIC_FRICTION_COEFFICIENT = REFERENCE_GREAT_TABLE_PARAMS.clothStickiness;
const REFERENCE_TABLE_ROLLING_FRICTION_COEFFICIENT = REFERENCE_GREAT_TABLE_PARAMS.clothRoll;
const REFERENCE_TABLE_SLIDING_ACCEL = REFERENCE_TABLE_DYNAMIC_FRICTION_COEFFICIENT
  * GRAVITY_MM_PER_SECOND_SQUARED;
const REFERENCE_TABLE_ROLLING_DECEL = REFERENCE_TABLE_ROLLING_FRICTION_COEFFICIENT
  * GRAVITY_MM_PER_SECOND_SQUARED;

module.exports = {
  GRAVITY_MM_PER_SECOND_SQUARED,
  REFERENCE_BALL_BASE_RADIUS_M,
  REFERENCE_COLLISION_SPIN_FACTOR_A,
  REFERENCE_COLLISION_SPIN_FACTOR_B,
  REFERENCE_COLLISION_SPIN_FACTOR_D,
  REFERENCE_EFFECTIVE_SNOOKER_BALL_RADIUS_MM,
  REFERENCE_GREAT_TABLE_PARAMS,
  REFERENCE_GREAT_TABLE_SERIALIZED,
  REFERENCE_NORMALIZED_BALL_MASS,
  REFERENCE_SNOOKER_BALL_PREFAB_SCALE,
  REFERENCE_TABLE_DYNAMIC_FRICTION_COEFFICIENT,
  REFERENCE_TABLE_ROLLING_FRICTION_COEFFICIENT,
  REFERENCE_TABLE_SLIDING_ACCEL,
  REFERENCE_TABLE_ROLLING_DECEL,
  resolveLegacyFloatRange,
};

}, {}, "apps/three-game/src/core/physics/config/referenceParams.js"],
30: [function(require, module, exports) {
const {
  REFERENCE_COLLISION_SPIN_FACTOR_A,
  REFERENCE_COLLISION_SPIN_FACTOR_B,
  REFERENCE_GREAT_TABLE_PARAMS,
} = require('./referenceParams');

const CLOTH_PARAM_DEFAULTS = {
  tableSlidingAccel: 1800,
  slipEpsilon: 7.0,
  rollingFriction: 60,
  spinDecay: 0.35,
  sideSpinLinearDecay: 20,
  lowSpeedCutoff: 8.0,
  lowOmegaCutoff: 0.70,
};

const BALL_COLLISION_PARAM_DEFAULTS = {
  ballRestitution: REFERENCE_GREAT_TABLE_PARAMS.ballBounciness,
  ballFrictionMu: 0,
  ballSpinTransfer: REFERENCE_COLLISION_SPIN_FACTOR_A,
  applyThrow: true,
  throwVelocityScale: REFERENCE_COLLISION_SPIN_FACTOR_B,
};

const RAIL_PARAM_DEFAULTS = {
  railRestitution: 0.975,
  railFrictionMu: 0.10,
  railSpinDamping: 0.02,
  railRollCorrection: 0.85,
  railRollExcessRetention: 1,
  railRollTangentLoss: 0.6,
};

const MATERIAL_PARAM_DEFAULTS = {
  ...BALL_COLLISION_PARAM_DEFAULTS,
  ...RAIL_PARAM_DEFAULTS,
  ...CLOTH_PARAM_DEFAULTS,
};

module.exports = {
  BALL_COLLISION_PARAM_DEFAULTS,
  CLOTH_PARAM_DEFAULTS,
  MATERIAL_PARAM_DEFAULTS,
  RAIL_PARAM_DEFAULTS,
};

}, {"./referenceParams":29}, "apps/three-game/src/core/physics/config/materialDefaults.js"],
31: [function(require, module, exports) {
const POCKET_PARAM_DEFAULTS = {
  // angle: speed-based middle entry gate; immediate: unconditional edge handoff.
  // controlled retains the earlier inset capture experiment.
  // live is retained for regression/performance comparisons only.
  pocketCaptureMode: 'angle',
  minPocketVelocity: 0.0,
  maxPocketVelocity: Infinity,
  pocketApproachDotMin: 0.0,
  pocketOpeningBallRadiusMarginRatio: 0.65,
  waitToBeCloseToPocketCentreBeforePutting: true,
  timeToPot: 0.0,
  pocketVisualMotionEnabled: false,
  pocketDirectDropSpeed: 520,
  pocketRattleSpeed: 700,
  pocketRattleRestitution: 0.38,
  pocketRattleFriction: 0.22,
  pocketRattleMinContacts: 1,
  pocketRattleMaxContacts: 3,
  pocketRattleMaxDuration: 0.42,
  pocketDropDuration: 0.1,
  pocketDrainDuration: 0.28,
  pocketDrainDistanceMm: 58,
  pocketFinalScale: 1,
};

module.exports = {
  POCKET_PARAM_DEFAULTS,
};

}, {}, "apps/three-game/src/core/physics/config/pocketDefaults.js"],
32: [function(require, module, exports) {
const DEFAULT_PHYSICS_HZ = 60;
const DEFAULT_POCKET_WORLD_HZ = 120;
const MIN_PHYSICS_HZ = 30;
const MAX_PHYSICS_HZ = 240;
const DEFAULT_MAX_FRAME_STEPS = 12;
const DEFAULT_REFRESH_HZ_BUCKETS = [60, 90, 120, 144, 165];

const SIMULATION_MODE = {
  DETERMINISTIC: 'deterministic',
};

function clampPhysicsHz(hz) {
  if (!Number.isFinite(hz)) {
    return DEFAULT_PHYSICS_HZ;
  }

  return Math.max(MIN_PHYSICS_HZ, Math.min(MAX_PHYSICS_HZ, hz));
}

function fixedDtForHz(hz) {
  return 1 / clampPhysicsHz(hz);
}

function normalizeRefreshBuckets(buckets = DEFAULT_REFRESH_HZ_BUCKETS) {
  return [...new Set(
    buckets
      .filter((hz) => Number.isFinite(hz))
      .map((hz) => clampPhysicsHz(hz)),
  )].sort((a, b) => a - b);
}

function nearestRefreshHz(hz, buckets = DEFAULT_REFRESH_HZ_BUCKETS) {
  const normalized = normalizeRefreshBuckets(buckets);
  if (!Number.isFinite(hz) || normalized.length === 0) {
    return DEFAULT_PHYSICS_HZ;
  }

  return normalized.reduce((best, candidate) => (
    Math.abs(candidate - hz) < Math.abs(best - hz) ? candidate : best
  ), normalized[0]);
}

function maxFrameStepsForRate(maxFrameDt, fixedDt) {
  return Math.max(DEFAULT_MAX_FRAME_STEPS, Math.ceil(maxFrameDt / fixedDt));
}

function applyPhysicsRate(params, hz) {
  const targetPhysicsHz = clampPhysicsHz(hz);
  const fixedDt = fixedDtForHz(targetPhysicsHz);
  params.targetPhysicsHz = targetPhysicsHz;
  params.fixedDt = fixedDt;
  params.maxFrameSteps = maxFrameStepsForRate(params.maxFrameDt, fixedDt);
  return params;
}

const SOLVER_PARAM_DEFAULTS = {
  simulationMode: SIMULATION_MODE.DETERMINISTIC,
  targetPhysicsHz: DEFAULT_PHYSICS_HZ,
  pocketWorldHz: DEFAULT_POCKET_WORLD_HZ,
  fixedDt: fixedDtForHz(DEFAULT_PHYSICS_HZ),
  pocketFixedDt: fixedDtForHz(DEFAULT_POCKET_WORLD_HZ),
  maxFrameDt: 0.08,
  maxFrameSteps: DEFAULT_MAX_FRAME_STEPS,
  refreshHzBuckets: DEFAULT_REFRESH_HZ_BUCKETS,
  refreshSampleFrames: 24,
  refreshHzTolerance: 10,
  renderInterpolation: true,
  forceResolutionSteps: 35,
  maxCollisionSubsteps: 30,
  pocketForceResolutionSteps: 20,
  pocketMaxCollisionSubsteps: 5,
  minDistanceForContact: 0.01,
  pocketMinDistanceForContact: 0.001,
  contactResolutionIterations: 35,
  contactPositionPercent: 0.65,
  collisionEpsilon: 0.0001,
  positionSlop: 0.02,
  contactSlop: 0.05,
  minCollisionEventSpeed: 40.0,
};

module.exports = {
  DEFAULT_PHYSICS_HZ,
  DEFAULT_POCKET_WORLD_HZ,
  MIN_PHYSICS_HZ,
  MAX_PHYSICS_HZ,
  DEFAULT_MAX_FRAME_STEPS,
  DEFAULT_REFRESH_HZ_BUCKETS,
  SIMULATION_MODE,
  SOLVER_PARAM_DEFAULTS,
  applyPhysicsRate,
  clampPhysicsHz,
  fixedDtForHz,
  maxFrameStepsForRate,
  nearestRefreshHz,
  normalizeRefreshBuckets,
};

}, {}, "apps/three-game/src/core/physics/config/solverDefaults.js"],
33: [function(require, module, exports) {
const { accumulateCueTravel } = require('./cueTravel');
const {
  activeBalls,
  createStaticLineIndex,
  createSweptAabb,
  getPotentialLinesForAabb,
  getPotentialBallLinePairs,
  getPotentialBallPairs,
} = require('./broadPhase');
const { sweepBallBall, sweepBallLine } = require('./continuousCollision');
const { closestPointOnSegment } = require('./continuousCollision');
const {
  resolveBallBallCollision,
  resolveBallLineCollision,
} = require('./collisionResolution');
const { solveContactGroups } = require('./contactSolver');
const {
  length,
  normalize,
  scale,
  sub,
} = require('./vector');
const { applyTableFriction, settleBallIfSlow } = require('./friction');
const { integrateBallOrientation } = require('./spin');
const { markPocketLipContact } = require('./pocketState');
const { registerShotEvent } = require('./physicsEvents');
const { stepPocketWorld } = require('./pocketWorld');
const { stepPocketMotions } = require('./pocketMotion');

function nowMs() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

function createStepTrace(params) {
  if (!params.perfTraceEnabled) return null;
  return {
    sections: {},
    startedAt: nowMs(),
  };
}

function measureStepSection(trace, name, action) {
  if (!trace) return action();
  const startedAt = nowMs();
  try {
    return action();
  } finally {
    trace.sections[name] = (trace.sections[name] || 0) + (nowMs() - startedAt);
  }
}

function recordStepTrace(state, trace) {
  if (!trace) return;
  const frame = state.__physicsPerfFrame || {
    sections: {},
    steps: 0,
    totalMs: 0,
  };
  frame.steps += 1;
  frame.totalMs += nowMs() - trace.startedAt;
  Object.entries(trace.sections).forEach(([name, value]) => {
    frame.sections[name] = (frame.sections[name] || 0) + value;
  });
  state.__physicsPerfFrame = frame;
}

function collectStaticLines(state) {
  const colliderSet = state.tableColliderSet;
  if (!colliderSet) {
    return [];
  }

  if (colliderSet._staticLines) {
    return colliderSet._staticLines;
  }

  const rails = colliderSet.rails || [];
  const lips = (colliderSet.pocketLips || []).flatMap((lip) => lip.segments || []);
  colliderSet._staticLines = [...rails, ...lips];
  return colliderSet._staticLines;
}

function collectStaticLineIndex(state) {
  const colliderSet = state.tableColliderSet;
  if (!colliderSet) {
    return null;
  }

  const lines = collectStaticLines(state);
  if (!colliderSet._staticLineIndex || colliderSet._staticLineIndex.lines !== lines) {
    colliderSet._staticLineIndex = createStaticLineIndex(lines);
  }
  return colliderSet._staticLineIndex;
}

function integrateBalls(balls, dt, state) {
  balls.forEach((ball) => {
    accumulateCueTravel(state, ball, dt);
    ball.pos.x += ball.vel.x * dt;
    ball.pos.y += ball.vel.y * dt;
    integrateBallOrientation(ball, dt);
  });
}

function findEarliestCollision(state, dt) {
  const balls = activeBalls(state.balls);
  const lines = collectStaticLines(state);
  const lineIndex = collectStaticLineIndex(state);
  let best = null;

  getPotentialBallPairs(balls, dt).forEach(([a, b]) => {
    const collision = sweepBallBall(a, b, dt);
    if (collision && (!best || collision.toi < best.toi)) {
      best = collision;
    }
  });

  getPotentialBallLinePairs(balls, lines, dt, lineIndex).forEach(([ball, line]) => {
    const collision = sweepBallLine(ball, line, dt);
    if (collision && (!best || collision.toi < best.toi)) {
      best = collision;
    }
  });

  return best;
}

function attachPocketIdToJawEvent(state, event) {
  if (!event || event.type !== 'ball-hit-pocket-jaw') {
    return event;
  }

  const pocket = (state.tableColliderSet.pockets || []).find((candidate) => (
    candidate.lips.some((lip) => lip.segments.some((segment) => segment.id === event.colliderId))
  ));

  if (!pocket) {
    return event;
  }

  const ball = state.balls.find((candidate) => candidate.id === event.ballId);
  if (ball) {
    markPocketLipContact(ball, pocket.id, event.impactSpeed, state.physicsParams);
    ball.pocketMode = 'jaw';
  }

  return {
    ...event,
    pocketId: pocket.id,
  };
}

function resolveCollision(state, collision, params) {
  if (collision.type === 'ball-ball') {
    return resolveBallBallCollision(collision, params);
  }

  if (collision.type === 'ball-line') {
    return attachPocketIdToJawEvent(
      state,
      resolveBallLineCollision(collision, params),
    );
  }

  return null;
}

function separateBallPair(a, b, params) {
  const delta = sub(b.pos, a.pos);
  const distance = length(delta);
  const radius = (a.radius || 0) + (b.radius || 0);
  const overlap = radius - distance;

  if (overlap <= params.contactSlop) {
    return false;
  }

  const normal = distance > 0.000001 ? scale(delta, 1 / distance) : { x: 1, y: 0 };
  const correction = (overlap - params.contactSlop) * params.contactPositionPercent * 0.5;
  a.pos.x -= normal.x * correction;
  a.pos.y -= normal.y * correction;
  b.pos.x += normal.x * correction;
  b.pos.y += normal.y * correction;
  return true;
}

function separateBallFromLine(ball, line, params) {
  const closest = closestPointOnSegment(ball.pos, line.start, line.end);
  const delta = sub(ball.pos, closest);
  const distance = length(delta);
  const radius = ball.radius || 0;
  const overlap = radius - distance;

  if (overlap <= params.contactSlop) {
    return false;
  }

  const normal = distance > 0.000001
    ? normalize(delta)
    : normalize(line.normal || { x: 1, y: 0 });
  const correction = (overlap - params.contactSlop) * params.contactPositionPercent;
  ball.pos.x += normal.x * correction;
  ball.pos.y += normal.y * correction;
  return true;
}

function resolveResidualContacts(state, params) {
  const balls = activeBalls(state.balls);
  const lines = collectStaticLines(state);
  const lineIndex = collectStaticLineIndex(state);

  for (let iteration = 0; iteration < params.contactResolutionIterations; iteration += 1) {
    let corrected = false;
    for (let i = 0; i < balls.length; i += 1) {
      for (let j = i + 1; j < balls.length; j += 1) {
        corrected = separateBallPair(balls[i], balls[j], params) || corrected;
      }
    }

    balls.forEach((ball) => {
      const ballAabb = createSweptAabb(ball, 0);
      getPotentialLinesForAabb(lines, ballAabb, lineIndex)
        .forEach(({ line }) => {
          corrected = separateBallFromLine(ball, line, params) || corrected;
        });
    });

    if (!corrected) {
      break;
    }
  }
}

function stepPhysicsWorld(state, params, dt) {
  const trace = createStepTrace(params);
  state.physicsParams = params;
  const events = [];
  const balls = activeBalls(state.balls);

  measureStepSection(trace, 'friction', () => {
    balls.forEach((ball) => {
      ball.prevPos = { ...ball.pos };
      ball.previousPosition = ball.prevPos;
      if (!ball.pocketEntry) applyTableFriction(ball, params, dt);
    });
  });

  let remaining = dt;
  let substep = 0;

  measureStepSection(trace, 'continuousCollision', () => {
    while (remaining > params.collisionEpsilon && substep < params.maxCollisionSubsteps) {
      const collision = findEarliestCollision(state, remaining);

      if (!collision) {
        integrateBalls(balls, remaining, state);
        remaining = 0;
        break;
      }

      if (collision.toi > params.collisionEpsilon) {
        integrateBalls(balls, collision.toi, state);
        remaining -= collision.toi;
      }

      const event = resolveCollision(state, collision, params);
      if (event) {
        events.push(event);
        registerShotEvent(state, event);
      }

      substep += 1;
    }

    if (remaining > params.collisionEpsilon) {
      integrateBalls(balls, remaining, state);
    }
  });

  const pocketEvents = measureStepSection(trace, 'pocketWorld', () => stepPocketWorld(state, params, dt));
  events.push(...pocketEvents);
  measureStepSection(trace, 'pocketMotion', () => stepPocketMotions(state, params, dt));

  measureStepSection(trace, 'contactGroups', () => {
    solveContactGroups(state, collectStaticLines(state), params, collectStaticLineIndex(state));
  });
  measureStepSection(trace, 'residualContacts', () => resolveResidualContacts(state, params));

  measureStepSection(trace, 'settle', () => {
    activeBalls(state.balls).forEach((ball) => {
      if (!ball.pocketEntry) settleBallIfSlow(ball, params);
    });
  });

  state.physicsEvents = events;
  recordStepTrace(state, trace);
  return events;
}

module.exports = {
  collectStaticLineIndex,
  collectStaticLines,
  resolveResidualContacts,
  stepPhysicsWorld,
};

}, {"./cueTravel":34,"./broadPhase":35,"./continuousCollision":36,"./collisionResolution":38,"./contactSolver":41,"./vector":37,"./friction":42,"./spin":43,"./pocketState":44,"./physicsEvents":39,"./pocketWorld":45,"./pocketMotion":52}, "apps/three-game/src/core/physics/physicsWorld.js"],
34: [function(require, module, exports) {
// Integrate actual free-flight segments, excluding overlap correction and respots.
function accumulateCueTravel(state, ball, dt) {
  if (!state?.activeShot || ball.id !== state.cueBallId || ball.potted || dt <= 0) return;
  state.activeShot.cueTravelDistanceMm = (state.activeShot.cueTravelDistanceMm || 0) + Math.hypot(ball.vel.x,ball.vel.y)*dt;
}
module.exports = {accumulateCueTravel};

}, {}, "apps/three-game/src/core/physics/cueTravel.js"],
35: [function(require, module, exports) {
const { BALL_RADIUS_MM } = require('../model/ballSpec');

const STATIC_LINE_GRID_CELL_SIZE_MM = 180;

function getBallRadius(ball) {
  return ball.radius || BALL_RADIUS_MM;
}

function createSweptAabb(ball, dt, padding = getBallRadius(ball), out = {}) {
  const x0 = ball.pos.x;
  const y0 = ball.pos.y;
  const x1 = x0 + ball.vel.x * dt;
  const y1 = y0 + ball.vel.y * dt;

  out.minX = Math.min(x0, x1) - padding;
  out.maxX = Math.max(x0, x1) + padding;
  out.minY = Math.min(y0, y1) - padding;
  out.maxY = Math.max(y0, y1) + padding;
  return out;
}

// Private scratch for SM's planar sweeps. Rebuild bounds after every impulse;
// only storage is reused. Callbacks keep the original ball/line visit order.
// Stationary bodies remain collision targets and positional/contact solvers
// still see them. Two stationary centres cannot create a new planar impact.
function createMotionBroadPhase() {
  const balls = [], bounds = [], moving = [], collisions = [];
  let markedLines = null, marks = new Uint32Array(0), epoch = 0;
  function prepare(input, dt) {
    balls.length = 0; collisions.length = 0;
    for (const ball of input) {
      if (ball.potted) continue;
      const i = balls.length;
      balls.push(ball);
      bounds[i] ||= {};
      createSweptAabb(ball, dt, getBallRadius(ball), bounds[i]);
      moving[i] = ball.vel.x !== 0 || ball.vel.y !== 0;
    }
  }
  function forEachBallPair(visit, target) {
    for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) {
      if ((moving[i] || moving[j]) && overlaps(bounds[i], bounds[j])) visit(balls[i], balls[j], target);
    }
  }
  function visitLines(box, lines, index, visit, ball, target) {
    if (!index || index.lines !== lines) {
      for (const line of lines) visit(ball, line, target);
      return;
    }
    if (markedLines !== lines || marks.length !== lines.length) {
      markedLines = lines; marks = new Uint32Array(lines.length); epoch = 0;
    }
    epoch = (epoch + 1) >>> 0;
    if (!epoch) { marks.fill(0); epoch = 1; }
    const cell = index.cellSize;
    const x0 = Math.floor(box.minX / cell), x1 = Math.floor(box.maxX / cell);
    const y0 = Math.floor(box.minY / cell), y1 = Math.floor(box.maxY / cell);
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
      const bucket = index.cells.get(gridCellKey(x, y));
      if (!bucket) continue;
      for (const n of bucket) {
        if (marks[n] === epoch) continue;
        marks[n] = epoch;
        if (overlaps(box, index.lineAabbs[n])) visit(ball, lines[n], target);
      }
    }
  }
  function forEachBallLine(lines, index, visit, target) {
    for (let i = 0; i < balls.length; i++) {
      if (moving[i]) visitLines(bounds[i], lines, index, visit, balls[i], target);
    }
  }
  function forEachLine(box, lines, index, visit, target) {
    visitLines(box, lines, index, visit, null, target);
  }
  return { prepare, forEachBallPair, forEachBallLine, forEachLine, balls, collisions };
}

function createLineAabb(line, padding = 0) {
  if (line.aabb) {
    return {
      minX: line.aabb.minX - padding,
      maxX: line.aabb.maxX + padding,
      minY: line.aabb.minY - padding,
      maxY: line.aabb.maxY + padding,
    };
  }

  return {
    minX: Math.min(line.start.x, line.end.x) - padding,
    maxX: Math.max(line.start.x, line.end.x) + padding,
    minY: Math.min(line.start.y, line.end.y) - padding,
    maxY: Math.max(line.start.y, line.end.y) + padding,
  };
}

function overlaps(a, b) {
  return !(
    a.maxX < b.minX
    || a.minX > b.maxX
    || a.maxY < b.minY
    || a.minY > b.maxY
  );
}

function activeBalls(balls) {
  return balls.filter((ball) => !ball.potted);
}

function getPotentialBallPairs(balls, dt) {
  const active = activeBalls(balls);
  const aabbs = active.map((ball) => createSweptAabb(ball, dt));
  const pairs = [];

  for (let i = 0; i < active.length; i += 1) {
    for (let j = i + 1; j < active.length; j += 1) {
      if (overlaps(aabbs[i], aabbs[j])) {
        pairs.push([active[i], active[j]]);
      }
    }
  }

  return pairs;
}

function gridCellKey(x, y) {
  return `${x}:${y}`;
}

function gridRangeForAabb(aabb, cellSize) {
  return {
    minCellX: Math.floor(aabb.minX / cellSize),
    maxCellX: Math.floor(aabb.maxX / cellSize),
    minCellY: Math.floor(aabb.minY / cellSize),
    maxCellY: Math.floor(aabb.maxY / cellSize),
  };
}

function createStaticLineIndex(lines, options = {}) {
  const padding = Number.isFinite(options.padding) ? options.padding : BALL_RADIUS_MM;
  const cellSize = Number.isFinite(options.cellSize) && options.cellSize > 0
    ? options.cellSize
    : STATIC_LINE_GRID_CELL_SIZE_MM;
  const lineAabbs = lines.map((line) => createLineAabb(line, padding));
  const cells = new Map();

  lineAabbs.forEach((aabb, index) => {
    const range = gridRangeForAabb(aabb, cellSize);
    for (let cellX = range.minCellX; cellX <= range.maxCellX; cellX += 1) {
      for (let cellY = range.minCellY; cellY <= range.maxCellY; cellY += 1) {
        const key = gridCellKey(cellX, cellY);
        const bucket = cells.get(key);
        if (bucket) {
          bucket.push(index);
        } else {
          cells.set(key, [index]);
        }
      }
    }
  });

  return {
    lines,
    lineAabbs,
    cells,
    cellSize,
  };
}

function getPotentialLinesForAabb(lines, queryAabb, lineIndex = null) {
  if (!lineIndex || lineIndex.lines !== lines) {
    return lines.map((line) => ({
      line,
      aabb: createLineAabb(line, BALL_RADIUS_MM),
    }));
  }

  const range = gridRangeForAabb(queryAabb, lineIndex.cellSize);
  const candidateIndexes = new Set();
  for (let cellX = range.minCellX; cellX <= range.maxCellX; cellX += 1) {
    for (let cellY = range.minCellY; cellY <= range.maxCellY; cellY += 1) {
      const bucket = lineIndex.cells.get(gridCellKey(cellX, cellY));
      if (bucket) bucket.forEach((index) => candidateIndexes.add(index));
    }
  }

  return [...candidateIndexes]
    .map((index) => ({
      line: lineIndex.lines[index],
      aabb: lineIndex.lineAabbs[index],
    }))
    .filter((candidate) => overlaps(queryAabb, candidate.aabb));
}

function getPotentialBallLinePairs(balls, lines, dt, lineIndex = null) {
  const pairs = [];
  activeBalls(balls).forEach((ball) => {
    const ballAabb = createSweptAabb(ball, dt);
    getPotentialLinesForAabb(lines, ballAabb, lineIndex).forEach(({ line }) => {
      pairs.push([ball, line]);
    });
  });
  return pairs;
}

module.exports = {
  activeBalls,
  createLineAabb,
  createStaticLineIndex,
  createSweptAabb,
  createMotionBroadPhase,
  getBallRadius,
  getPotentialLinesForAabb,
  getPotentialBallLinePairs,
  getPotentialBallPairs,
  overlaps,
};

}, {"../model/ballSpec":4}, "apps/three-game/src/core/physics/broadPhase.js"],
36: [function(require, module, exports) {
const { BALL_RADIUS_MM } = require('../model/ballSpec');
const {
  dot,
  lengthSquared,
  normalize,
  scale,
  sub,
} = require('./vector');

const EPSILON = 0.000001;

function getBallRadius(ball) {
  return ball.radius || BALL_RADIUS_MM;
}

function pointAt(point, velocity, t) {
  return {
    x: point.x + velocity.x * t,
    y: point.y + velocity.y * t,
  };
}

function closestPointOnSegment(point, start, end) {
  const segment = sub(end, start);
  const lenSq = lengthSquared(segment);
  if (lenSq <= EPSILON) {
    return { ...start };
  }

  const t = Math.max(0, Math.min(1, dot(sub(point, start), segment) / lenSq));
  return {
    x: start.x + segment.x * t,
    y: start.y + segment.y * t,
  };
}

function solveMovingPointToCircle(point, velocity, center, radius, dt) {
  const offset = sub(point, center);
  const a = lengthSquared(velocity);
  const b = 2 * dot(offset, velocity);
  const c = lengthSquared(offset) - radius * radius;

  if (a <= EPSILON || b >= 0) {
    return null;
  }
  if (c <= 0) {
    return b < -EPSILON ? 0 : null;
  }

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) {
    return null;
  }

  const t = (-b - Math.sqrt(discriminant)) / (2 * a);
  return t >= -EPSILON && t <= dt + EPSILON ? Math.max(0, t) : null;
}

function sweepBallBall(a, b, dt) {
  const radius = getBallRadius(a) + getBallRadius(b);
  const relativePosition = sub(b.pos, a.pos);
  const relativeVelocity = sub(b.vel, a.vel);
  const t = solveMovingPointToCircle(
    relativePosition,
    relativeVelocity,
    { x: 0, y: 0 },
    radius,
    dt,
  );

  if (t === null) {
    return null;
  }

  const aPos = pointAt(a.pos, a.vel, t);
  const bPos = pointAt(b.pos, b.vel, t);
  const normal = normalize(sub(bPos, aPos));

  return {
    type: 'ball-ball',
    toi: t,
    ballA: a,
    ballB: b,
    normal,
    point: {
      x: aPos.x + normal.x * getBallRadius(a),
      y: aPos.y + normal.y * getBallRadius(a),
    },
  };
}

function candidateLineNormals(line) {
  if (line.normal) {
    return [normalize(line.normal)];
  }

  const segment = sub(line.end, line.start);
  const normal = normalize({ x: -segment.y, y: segment.x });
  return [normal, scale(normal, -1)];
}

function sweepBallLineInterior(ball, line, dt) {
  const radius = getBallRadius(ball);
  const segment = sub(line.end, line.start);
  const lenSq = lengthSquared(segment);
  if (lenSq <= EPSILON) {
    return null;
  }

  let best = null;
  candidateLineNormals(line).forEach((normal) => {
    const signedDistance = dot(sub(ball.pos, line.start), normal);
    const normalSpeed = dot(ball.vel, normal);

    if (Math.abs(normalSpeed) <= EPSILON) {
      return;
    }

    const targetDistance = signedDistance >= 0 ? radius : -radius;
    const t = (targetDistance - signedDistance) / normalSpeed;
    if (t < -EPSILON || t > dt + EPSILON) {
      return;
    }

    const clampedT = Math.max(0, t);
    const centerAtImpact = pointAt(ball.pos, ball.vel, clampedT);
    const segmentT = dot(sub(centerAtImpact, line.start), segment) / lenSq;
    if (segmentT < -EPSILON || segmentT > 1 + EPSILON) {
      return;
    }

    const point = closestPointOnSegment(centerAtImpact, line.start, line.end);
    const result = {
      type: 'ball-line',
      toi: clampedT,
      ball,
      line,
      normal: signedDistance >= 0 ? normal : scale(normal, -1),
      point,
    };

    // A ball that starts exactly on the cushion and is already travelling
    // away is not a new impact. Returning a t=0 collision here makes the
    // world solver rediscover the same contact until its substep budget is
    // exhausted, which shows up as a small hitch on the bounce frame.
    if (clampedT <= EPSILON && dot(ball.vel, result.normal) >= -EPSILON) {
      return;
    }

    if (!best || result.toi < best.toi) {
      best = result;
    }
  });

  return best;
}

function sweepBallLineEndpoint(ball, line, dt) {
  let best = null;
  [line.start, line.end].forEach((endpoint) => {
    const t = solveMovingPointToCircle(ball.pos, ball.vel, endpoint, getBallRadius(ball), dt);
    if (t === null) {
      return;
    }

    const centerAtImpact = pointAt(ball.pos, ball.vel, t);
    const normal = normalize(sub(centerAtImpact, endpoint));
    const result = {
      type: 'ball-line',
      toi: t,
      ball,
      line,
      normal,
      point: { ...endpoint },
    };

    if (!best || result.toi < best.toi) {
      best = result;
    }
  });

  return best;
}

function sweepBallLine(ball, line, dt) {
  const interior = sweepBallLineInterior(ball, line, dt);
  const endpoint = sweepBallLineEndpoint(ball, line, dt);

  if (!interior) {
    return endpoint;
  }
  if (!endpoint) {
    return interior;
  }
  return interior.toi <= endpoint.toi ? interior : endpoint;
}

module.exports = {
  closestPointOnSegment,
  pointAt,
  sweepBallBall,
  sweepBallLine,
};

}, {"../model/ballSpec":4,"./vector":37}, "apps/three-game/src/core/physics/continuousCollision.js"],
37: [function(require, module, exports) {
function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y };
}

function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y };
}

function scale(v, scalar) {
  return { x: v.x * scalar, y: v.y * scalar };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

function length(v) {
  return Math.hypot(v.x, v.y);
}

function lengthSquared(v) {
  return v.x * v.x + v.y * v.y;
}

function normalize(v) {
  const len = length(v);
  if (len <= 0.000001) {
    return { x: 1, y: 0 };
  }
  return { x: v.x / len, y: v.y / len };
}

function moveToward(value, target, step) {
  if (value < target) {
    return Math.min(value + step, target);
  }
  return Math.max(value - step, target);
}

module.exports = {
  add,
  sub,
  scale,
  dot,
  length,
  lengthSquared,
  normalize,
  moveToward,
};

}, {}, "apps/three-game/src/core/physics/vector.js"],
38: [function(require, module, exports) {
const { createPhysicsEvent } = require('./physicsEvents');
const {
  dot,
  length,
  normalize,
  scale,
  sub,
} = require('./vector');
const {
  applyBallBallTangentImpulse,
  applyBallLineTangentImpulse,
  applyThrowToBall,
  getBallBallTangentDenominator,
  getBallBallTangentSpeed,
  getBallContactTangentSpeed,
  getBallLineTangentDenominator,
} = require('./contactEffects');

function invMass(ball) {
  return ball.mass > 0 ? 1 / ball.mass : 1;
}

function addVelocity(ball, impulse, factor) {
  ball.vel.x += impulse.x * factor;
  ball.vel.y += impulse.y * factor;
}

function positionalNudge(ball, normal, distance) {
  ball.pos.x += normal.x * distance;
  ball.pos.y += normal.y * distance;
}

function shouldEmitCollisionEvent(impactSpeed, params) {
  return impactSpeed >= (params.minCollisionEventSpeed ?? 0);
}

function isCueBall(ball) {
  return ball.kind === 'cue' || ball.id === 'cue';
}

function isNearFullBallHit(relativeVel, normal, tangent) {
  const normalApproach = Math.abs(dot(relativeVel, normal));
  const tangentApproach = Math.abs(dot(relativeVel, tangent));
  return normalApproach > 40 && tangentApproach <= normalApproach * 0.02;
}

function createTangentReactionScales(a, b, relativeVel, normal, tangent) {
  if (!isNearFullBallHit(relativeVel, normal, tangent)) {
    return {
      linearScaleA: 1,
      linearScaleB: 1,
      throwScaleA: 1,
      throwScaleB: 1,
    };
  }

  return {
    linearScaleA: isCueBall(a) ? 0 : 1,
    linearScaleB: isCueBall(b) ? 0 : 1,
    throwScaleA: isCueBall(a) ? 0 : 1,
    throwScaleB: isCueBall(b) ? 0 : 1,
  };
}

function setNormalVelocity(ball, normal, nextNormalSpeed) {
  const currentNormalSpeed = dot(ball.vel, normal);
  const delta = nextNormalSpeed - currentNormalSpeed;
  ball.vel.x += normal.x * delta;
  ball.vel.y += normal.y * delta;
  return delta;
}

function applyFullHitEnergyTransfer(a, b, normal, restitution) {
  const aNormalSpeed = dot(a.vel, normal);
  const bNormalSpeed = dot(b.vel, normal);
  const closingSpeed = aNormalSpeed - bNormalSpeed;
  const speedRetain = Math.sqrt(Math.max(0, restitution));
  const aApproach = Math.max(0, aNormalSpeed);
  const bApproach = Math.max(0, -bNormalSpeed);
  let deltaA = 0;
  let deltaB = 0;

  if (aApproach >= bApproach) {
    deltaA = setNormalVelocity(a, normal, bNormalSpeed);
    deltaB = setNormalVelocity(b, normal, bNormalSpeed + closingSpeed * speedRetain);
  } else {
    deltaA = setNormalVelocity(a, normal, aNormalSpeed - closingSpeed * speedRetain);
    deltaB = setNormalVelocity(b, normal, aNormalSpeed);
  }

  const impulseA = Math.abs(deltaA) / invMass(a);
  const impulseB = Math.abs(deltaB) / invMass(b);
  return Math.max(impulseA, impulseB);
}

function resolveBallBallCollision(collision, params) {
  const a = collision.ballA;
  const b = collision.ballB;
  const delta = sub(b.pos, a.pos);
  const normal = length(delta) > 0.000001 ? normalize(delta) : collision.normal;
  const relativeVel = sub(b.vel, a.vel);
  const normalSpeed = dot(relativeVel, normal);

  if (normalSpeed >= 0) {
    return null;
  }

  const invA = invMass(a);
  const invB = invMass(b);
  const ballMaterial = params.materials?.ball || {};
  const tangent = { x: -normal.y, y: normal.x };
  const restitution = ballMaterial.restitution ?? params.ballRestitution;
  let impulseMagnitude = 0;

  if (isNearFullBallHit(relativeVel, normal, tangent)) {
    impulseMagnitude = applyFullHitEnergyTransfer(a, b, normal, restitution);
  } else {
    impulseMagnitude = (-(1 + restitution) * normalSpeed) / (invA + invB);
    const impulse = scale(normal, impulseMagnitude);
    addVelocity(a, impulse, -invA);
    addVelocity(b, impulse, invB);
  }

  const tangentSpeed = getBallBallTangentSpeed(a, b, tangent, params);
  const maxTangentImpulse = Math.abs(impulseMagnitude) * (ballMaterial.frictionMu ?? params.ballFrictionMu);
  const tangentDenominator = getBallBallTangentDenominator(a, b, params);
  const tangentImpulseMagnitude = Math.max(
    -maxTangentImpulse,
    Math.min(maxTangentImpulse, -tangentSpeed / tangentDenominator),
  );
  const tangentReactionScales = createTangentReactionScales(a, b, relativeVel, normal, tangent);
  applyBallBallTangentImpulse(a, b, tangent, tangentImpulseMagnitude, params, tangentReactionScales);
  applyThrowToBall(a, tangent, -tangentImpulseMagnitude * invA * tangentReactionScales.throwScaleA, params);
  applyThrowToBall(b, tangent, tangentImpulseMagnitude * invB * tangentReactionScales.throwScaleB, params);

  positionalNudge(a, normal, -params.positionSlop);
  positionalNudge(b, normal, params.positionSlop);

  const impactSpeed = Math.abs(normalSpeed);
  if (!shouldEmitCollisionEvent(impactSpeed, params)) {
    return null;
  }

  return createPhysicsEvent('ball-hit-ball', {
    ballAId: a.id,
    ballBId: b.id,
    point: collision.point,
    normal,
    impactSpeed,
  });
}

function applyLineTangentFriction(
  ball,
  normal,
  frictionMu,
  normalImpulseMagnitude,
  params,
) {
  const tangent = { x: -normal.y, y: normal.x };
  const tangentSpeed = getBallContactTangentSpeed(ball, tangent);
  const tangentDenominator = getBallLineTangentDenominator(ball);
  const maxTangentImpulse = Math.abs(normalImpulseMagnitude) * frictionMu;
  const tangentImpulseMagnitude = Math.max(
    -maxTangentImpulse,
    Math.min(maxTangentImpulse, -tangentSpeed / tangentDenominator),
  );
  applyBallLineTangentImpulse(ball, tangent, tangentImpulseMagnitude, params);

  return { tangent, tangentImpulseMagnitude };
}

function applyRailSpinDamping(ball, dampingRatio) {
  if (!ball.omega) return;
  const ratio = Math.max(0, Math.min(1, Number(dampingRatio) || 0));
  ball.omega.z *= 1 - ratio;
}

function clamp01(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(1, numeric));
}

function rollAxisForVelocity(velocity) {
  const speed = Math.hypot(velocity.x, velocity.y);
  if (speed <= 0.000001) {
    return null;
  }

  return {
    axis: {
      x: -velocity.y / speed,
      y: velocity.x / speed,
    },
    speed,
  };
}

function horizontalOmega(omega) {
  return {
    x: omega?.x || 0,
    y: omega?.y || 0,
  };
}

function applyRailRollSpinCorrection(
  ball,
  incomingOmega,
  params,
  rail,
  line,
  normal,
  normalImpactSpeed,
) {
  if (!ball.omega || !ball.radius) return;

  const frontSpinRailLossSlope = Math.max(
    0,
    Number(line.rollCorrection ?? rail.rollCorrection ?? params.railRollCorrection ?? 0) || 0,
  );
  const backSpinRetention = clamp01(
    line.rollExcessRetention ?? rail.rollExcessRetention ?? params.railRollExcessRetention ?? 0.65,
    0.65,
  );
  const tangentRollLoss = clamp01(
    line.rollTangentLoss ?? rail.rollTangentLoss ?? params.railRollTangentLoss ?? 0.6,
    0.6,
  );
  if (frontSpinRailLossSlope <= 0 && tangentRollLoss <= 0) return;

  const outRoll = rollAxisForVelocity(ball.vel);

  const radius = ball.radius;
  const beforeOmega = horizontalOmega(incomingOmega);
  const railTangent = { x: -normal.y, y: normal.x };
  const normalRollAxis = railTangent;
  const tangentRollAxis = { x: -normal.x, y: -normal.y };
  const normalRollSpinSpeed = -radius * dot(beforeOmega, normalRollAxis);
  const tangentRollSpinSpeed = radius * dot(beforeOmega, tangentRollAxis);
  const rollLossCap = frontSpinRailLossSlope
    * Math.max(0, Number(normalImpactSpeed) || 0);
  const backLossScale = Math.max(0.25, 1 - backSpinRetention * 0.75);
  let nextNormalRollSpinSpeed = normalRollSpinSpeed;

  if (normalRollSpinSpeed > 0) {
    nextNormalRollSpinSpeed = Math.max(0, normalRollSpinSpeed - rollLossCap);
  } else if (normalRollSpinSpeed < 0) {
    nextNormalRollSpinSpeed = Math.min(0, normalRollSpinSpeed + rollLossCap * backLossScale);
  }
  const nextTangentRollSpinSpeed = tangentRollSpinSpeed * (1 - tangentRollLoss);

  ball.omega.x = (
    -normalRollAxis.x * nextNormalRollSpinSpeed
    + tangentRollAxis.x * nextTangentRollSpinSpeed
  ) / radius;
  ball.omega.y = (
    -normalRollAxis.y * nextNormalRollSpinSpeed
    + tangentRollAxis.y * nextTangentRollSpinSpeed
  ) / radius;

  if (!outRoll) return;
  const actualRollSpinSpeed = radius * dot(horizontalOmega(ball.omega), outRoll.axis);
  const rollSlip = Math.abs(outRoll.speed - actualRollSpinSpeed);
  if (rollSlip <= (params.slipEpsilon ?? 0)) {
    ball.contactMode = 'rolling';
    ball.isSliding = false;
  } else {
    ball.contactMode = 'sliding';
    ball.isSliding = true;
  }
}

function resolveBallLineCollision(collision, params, options = {}) {
  const { ball, line } = collision;
  const normal = collision.normal;
  const normalSpeed = dot(ball.vel, normal);
  const incomingOmega = ball.omega ? { ...ball.omega } : { x: 0, y: 0, z: 0 };

  if (normalSpeed >= 0) {
    if (options.positionNudge !== false) {
      positionalNudge(ball, normal, params.positionSlop);
    }
    return null;
  }

  const isPocketLip = line.role === 'pocket-lip' || line.material === 'pocket-lip';
  const rail = params.materials?.rail || {};
  const restitution = line.restitution
    ?? rail.restitution
    ?? params.railRestitution;
  const frictionMu = line.frictionMu
    ?? rail.frictionMu
    ?? params.railFrictionMu;
  const spinDamping = line.spinDamping ?? rail.spinDamping ?? params.railSpinDamping ?? 0;

  const normalImpulseMagnitude = -((1 + restitution) * normalSpeed) / invMass(ball);
  ball.vel.x += normal.x * normalImpulseMagnitude * invMass(ball);
  ball.vel.y += normal.y * normalImpulseMagnitude * invMass(ball);
  applyLineTangentFriction(
    ball,
    normal,
    frictionMu,
    normalImpulseMagnitude,
    params,
  );
  applyRailSpinDamping(ball, spinDamping);
  applyRailRollSpinCorrection(
    ball,
    incomingOmega,
    params,
    rail,
    line,
    normal,
    Math.abs(normalSpeed),
  );
  if (options.positionNudge !== false) {
    positionalNudge(ball, normal, params.positionSlop);
  }

  const impactSpeed = Math.abs(normalSpeed);
  if (!shouldEmitCollisionEvent(impactSpeed, params)) {
    return null;
  }

  return createPhysicsEvent(isPocketLip ? 'ball-hit-pocket-jaw' : 'ball-hit-rail', {
    ballId: ball.id,
    colliderId: line.id,
    point: collision.point,
    normal,
    impactSpeed,
    role: line.role,
    material: line.material,
  });
}

module.exports = {
  resolveBallBallCollision,
  resolveBallLineCollision,
};

}, {"./physicsEvents":39,"./vector":37,"./contactEffects":40}, "apps/three-game/src/core/physics/collisionResolution.js"],
39: [function(require, module, exports) {
function createPhysicsEvent(type, payload = {}) {
  return {
    type,
    ...payload,
  };
}

function registerShotEvent(state, event) {
  if (!state.activeShot) {
    return;
  }

  if (!state.activeShot.events) {
    state.activeShot.events = [];
  }
  state.activeShot.events.push(event);

  if (event.type === 'ball-hit-ball' && state.activeShot.firstContactBallId === null) {
    if (event.ballAId === state.cueBallId) {
      state.activeShot.firstContactBallId = event.ballBId;
    } else if (event.ballBId === state.cueBallId) {
      state.activeShot.firstContactBallId = event.ballAId;
    }
  }

  if (event.type === 'ball-potted' || event.type === 'cue-ball-potted') {
    if (!state.activeShot.pottedBallIds.includes(event.ballId)) {
      state.activeShot.pottedBallIds.push(event.ballId);
    }
    if (event.ballId === state.cueBallId) {
      state.activeShot.cueBallPotted = true;
    }
  }
}

module.exports = {
  createPhysicsEvent,
  registerShotEvent,
};

}, {}, "apps/three-game/src/core/physics/physicsEvents.js"],
40: [function(require, module, exports) {
const { dot, scale, sub } = require('./vector');

function invMass(ball) {
  return ball.mass > 0 ? 1 / ball.mass : 1;
}

function getBallContactTangentSpeed(ball, tangent) {
  if (!ball.omega || !ball.radius) {
    return dot(ball.vel, tangent);
  }

  return dot(ball.vel, tangent) - (ball.omega.z || 0) * ball.radius;
}

function getBallBallTangentSpeed(a, b, tangent, params) {
  const relativeVel = sub(b.vel, a.vel);
  const base = dot(relativeVel, tangent);
  const spin = (
    (a.omega?.z || 0) * (a.radius || 0)
    + (b.omega?.z || 0) * (b.radius || 0)
  );

  return base - spin;
}

function getBallBallTangentDenominator(a, b, params) {
  const spinTransfer = params.materials?.ball?.spinTransfer ?? params.ballSpinTransfer ?? 1;
  const rotationalA = a.inertia && a.radius ? (a.radius * a.radius / a.inertia) : 0;
  const rotationalB = b.inertia && b.radius ? (b.radius * b.radius / b.inertia) : 0;

  return invMass(a)
    + invMass(b)
    + (rotationalA + rotationalB) * spinTransfer;
}

function getBallLineTangentDenominator(ball) {
  const rotational = ball.inertia && ball.radius ? (ball.radius * ball.radius / ball.inertia) : 0;
  return invMass(ball) + rotational;
}

function applyTangentImpulseSpin(ball, tangentImpulseMagnitude, sign, params) {
  if (!ball.omega || !ball.inertia || !ball.radius) {
    return;
  }

  ball.omega.z += sign
    * tangentImpulseMagnitude
    * ball.radius
    / ball.inertia
    * (params.materials?.ball?.spinTransfer ?? params.ballSpinTransfer);
}

function applyBallBallTangentImpulse(a, b, tangent, tangentImpulseMagnitude, params, options = {}) {
  const linearScaleA = options.linearScaleA ?? 1;
  const linearScaleB = options.linearScaleB ?? 1;

  a.vel.x -= tangent.x * tangentImpulseMagnitude * invMass(a) * linearScaleA;
  a.vel.y -= tangent.y * tangentImpulseMagnitude * invMass(a) * linearScaleA;
  b.vel.x += tangent.x * tangentImpulseMagnitude * invMass(b) * linearScaleB;
  b.vel.y += tangent.y * tangentImpulseMagnitude * invMass(b) * linearScaleB;
  applyTangentImpulseSpin(a, tangentImpulseMagnitude, -1, params);
  applyTangentImpulseSpin(b, tangentImpulseMagnitude, -1, params);
}

function applyBallLineTangentImpulse(ball, tangent, tangentImpulseMagnitude) {
  ball.vel.x += tangent.x * tangentImpulseMagnitude * invMass(ball);
  ball.vel.y += tangent.y * tangentImpulseMagnitude * invMass(ball);

  if (ball.omega && ball.inertia && ball.radius) {
    ball.omega.z -= tangentImpulseMagnitude * ball.radius / ball.inertia;
  }
}

function applyThrowToBall(ball, tangent, tangentImpulseMagnitude, params) {
  const ballMaterial = params.materials?.ball || {};
  if ((ballMaterial.applyThrow ?? params.applyThrow) === false) {
    return;
  }

  const throwScale = ballMaterial.throwVelocityScale ?? params.throwVelocityScale ?? 0;
  const throwVelocity = scale(tangent, tangentImpulseMagnitude * throwScale);
  ball.vel.x += throwVelocity.x;
  ball.vel.y += throwVelocity.y;
}

module.exports = {
  applyBallBallTangentImpulse,
  applyBallLineTangentImpulse,
  applyTangentImpulseSpin,
  applyThrowToBall,
  getBallBallTangentDenominator,
  getBallBallTangentSpeed,
  getBallContactTangentSpeed,
  getBallLineTangentDenominator,
};

}, {"./vector":37}, "apps/three-game/src/core/physics/contactEffects.js"],
41: [function(require, module, exports) {
const {
  activeBalls,
  createSweptAabb,
  getPotentialLinesForAabb,
} = require('./broadPhase');
const { closestPointOnSegment } = require('./continuousCollision');
const {
  applyBallBallTangentImpulse,
  applyBallLineTangentImpulse,
  getBallBallTangentDenominator,
  getBallBallTangentSpeed,
  getBallContactTangentSpeed,
  getBallLineTangentDenominator,
} = require('./contactEffects');
const {
  dot,
  length,
  normalize,
  scale,
  sub,
} = require('./vector');

function invMass(ball) {
  return ball.mass > 0 ? 1 / ball.mass : 1;
}

function collectBallBallContact(a, b, params) {
  const delta = sub(b.pos, a.pos);
  const distance = length(delta);
  const radius = (a.radius || 0) + (b.radius || 0);
  const penetration = radius - distance;

  if (penetration <= params.minDistanceForContact) {
    return null;
  }

  const normal = distance > 0.000001 ? scale(delta, 1 / distance) : { x: 1, y: 0 };
  return {
    type: 'ball-ball',
    a,
    b,
    normal,
    penetration,
  };
}

function collectBallLineContact(ball, line, params) {
  const closest = closestPointOnSegment(ball.pos, line.start, line.end);
  const delta = sub(ball.pos, closest);
  const distance = length(delta);
  const penetration = (ball.radius || 0) - distance;

  if (penetration <= params.minDistanceForContact) {
    return null;
  }

  return {
    type: 'ball-line',
    ball,
    line,
    normal: distance > 0.000001 ? normalize(delta) : normalize(line.normal || { x: 1, y: 0 }),
    penetration,
  };
}

function collectContacts(state, lines, params, lineIndex = null) {
  const balls = activeBalls(state.balls);
  const contacts = [];

  for (let i = 0; i < balls.length; i += 1) {
    for (let j = i + 1; j < balls.length; j += 1) {
      const contact = collectBallBallContact(balls[i], balls[j], params);
      if (contact) {
        contacts.push(contact);
      }
    }
  }

  balls.forEach((ball) => {
    const ballAabb = createSweptAabb(ball, 0);
    getPotentialLinesForAabb(lines, ballAabb, lineIndex)
      .forEach(({ line }) => {
        const contact = collectBallLineContact(ball, line, params);
        if (contact) {
          contacts.push(contact);
        }
      });
  });

  return contacts;
}

function solveBallBallContact(contact, params) {
  const { a, b, normal } = contact;
  const relativeVel = sub(b.vel, a.vel);
  const normalSpeed = dot(relativeVel, normal);
  const invA = invMass(a);
  const invB = invMass(b);
  const invSum = invA + invB;

  if (invSum <= 0) {
    return;
  }

  const correction = Math.max(0, contact.penetration - params.contactSlop)
    * params.contactPositionPercent
    / invSum;
  a.pos.x -= normal.x * correction * invA;
  a.pos.y -= normal.y * correction * invA;
  b.pos.x += normal.x * correction * invB;
  b.pos.y += normal.y * correction * invB;

  let impulseMagnitude = 0;
  if (normalSpeed < 0) {
    impulseMagnitude = -normalSpeed / invSum;
    a.vel.x -= normal.x * impulseMagnitude * invA;
    a.vel.y -= normal.y * impulseMagnitude * invA;
    b.vel.x += normal.x * impulseMagnitude * invB;
    b.vel.y += normal.y * impulseMagnitude * invB;
  }

  const tangent = { x: -normal.y, y: normal.x };
  const ballMaterial = params.materials?.ball || {};
  const frictionMu = ballMaterial.frictionMu ?? params.ballFrictionMu;
  const maxTangentImpulse = Math.abs(impulseMagnitude) * frictionMu;
  if (maxTangentImpulse > 0) {
    const tangentSpeed = getBallBallTangentSpeed(a, b, tangent, params);
    const tangentDenominator = getBallBallTangentDenominator(a, b, params);
    const tangentImpulseMagnitude = Math.max(
      -maxTangentImpulse,
      Math.min(maxTangentImpulse, -tangentSpeed / tangentDenominator),
    );
    applyBallBallTangentImpulse(a, b, tangent, tangentImpulseMagnitude, params);
  }
}

function solveBallLineContact(contact, params) {
  const { ball, normal, line } = contact;
  const correction = Math.max(0, contact.penetration - params.contactSlop)
    * params.contactPositionPercent;
  ball.pos.x += normal.x * correction;
  ball.pos.y += normal.y * correction;

  const normalSpeed = dot(ball.vel, normal);
  let normalImpulseMagnitude = 0;
  if (normalSpeed < 0) {
    normalImpulseMagnitude = -normalSpeed / invMass(ball);
    ball.vel.x += normal.x * normalImpulseMagnitude * invMass(ball);
    ball.vel.y += normal.y * normalImpulseMagnitude * invMass(ball);
  }

  const rail = params.materials?.rail || {};
  const frictionMu = line.frictionMu
    ?? rail.frictionMu
    ?? params.railFrictionMu;
  const maxTangentImpulse = Math.abs(normalImpulseMagnitude) * frictionMu;
  if (maxTangentImpulse > 0) {
    const tangent = { x: -normal.y, y: normal.x };
    const tangentSpeed = getBallContactTangentSpeed(ball, tangent);
    const tangentDenominator = getBallLineTangentDenominator(ball);
    const tangentImpulseMagnitude = Math.max(
      -maxTangentImpulse,
      Math.min(maxTangentImpulse, -tangentSpeed / tangentDenominator),
    );
    applyBallLineTangentImpulse(ball, tangent, tangentImpulseMagnitude, params);
  }
}

function solveContact(contact, params) {
  if (contact.type === 'ball-ball') {
    solveBallBallContact(contact, params);
  } else if (contact.type === 'ball-line') {
    solveBallLineContact(contact, params);
  }
}

function solveContactGroups(state, lines, params, lineIndex = null) {
  for (let iteration = 0; iteration < params.forceResolutionSteps; iteration += 1) {
    const contacts = collectContacts(state, lines, params, lineIndex);
    if (contacts.length === 0) {
      break;
    }

    contacts.forEach((contact) => solveContact(contact, params));
  }
}

module.exports = {
  collectContacts,
  solveContactGroups,
};

}, {"./broadPhase":35,"./continuousCollision":36,"./contactEffects":40,"./vector":37}, "apps/three-game/src/core/physics/contactSolver.js"],
42: [function(require, module, exports) {
function getContactSlipVelocity(ball) {
  const radius = ball.radius || 26.25;
  const omega = ball.omega || { x: 0, y: 0, z: 0 };

  return {
    x: ball.vel.x - omega.y * radius,
    y: ball.vel.y + omega.x * radius,
  };
}

function applyAngularChangeFromFriction(ball, deltaVel) {
  if (!ball.omega || !ball.inertia || !ball.radius) {
    return;
  }

  const mass = ball.mass || 1;
  const impulseX = deltaVel.x * mass;
  const impulseY = deltaVel.y * mass;

  ball.omega.x += ball.radius * impulseY / ball.inertia;
  ball.omega.y -= ball.radius * impulseX / ball.inertia;
}

function snapToPureRolling(ball) {
  if (!ball.omega || !ball.radius) {
    return;
  }

  ball.omega.x = -ball.vel.y / ball.radius;
  ball.omega.y = ball.vel.x / ball.radius;
  ball.contactMode = 'rolling';
  ball.isSliding = false;
}

function decaySideSpin(ball, cloth, params, dt) {
  if (!ball.omega) {
    return;
  }

  const sideSpinLinearDecay = cloth.sideSpinLinearDecay ?? params.sideSpinLinearDecay ?? 0;
  const omegaZ = ball.omega.z || 0;
  const nextMagnitude = Math.max(0, Math.abs(omegaZ) - sideSpinLinearDecay * dt);
  ball.omega.z = Math.sign(omegaZ) * nextMagnitude;
}

function applyRollingFriction(ball, params, cloth, speed, dt) {
  if (speed <= 0) {
    return;
  }

  const decel = cloth.rollingFriction ?? params.rollingFriction;
  const nextSpeed = Math.max(0, speed - decel * dt);

  if (nextSpeed <= params.lowSpeedCutoff) {
    ball.vel.x = 0;
    ball.vel.y = 0;
  } else {
    const ratio = nextSpeed / speed;
    ball.vel.x *= ratio;
    ball.vel.y *= ratio;
  }

  snapToPureRolling(ball);
}

function applySlidingFriction(ball, params, cloth, slip, slipSpeed, speed, dt) {
  void speed;
  const slidingAccel = cloth.slidingAccel ?? params.tableSlidingAccel;
  const radius = ball.radius || 26.25;
  const inertia = ball.inertia || (2 / 5) * (ball.mass || 1) * radius * radius;
  const mass = ball.mass || 1;
  const slipCoupling = 1 + (mass * radius * radius / inertia);
  const maxLinearChange = Math.min(slidingAccel * dt, slipSpeed / slipCoupling);
  const deltaVel = {
    x: -slip.x / slipSpeed * maxLinearChange,
    y: -slip.y / slipSpeed * maxLinearChange,
  };

  ball.vel.x += deltaVel.x;
  ball.vel.y += deltaVel.y;
  applyAngularChangeFromFriction(ball, deltaVel);
  ball.contactMode = 'sliding';
  ball.isSliding = true;

  const nextSlip = getContactSlipVelocity(ball);
  const nextSlipSpeed = Math.hypot(nextSlip.x, nextSlip.y);
  if (nextSlipSpeed <= params.slipEpsilon) {
    snapToPureRolling(ball);
  }
}

function applyTableFriction(ball, params, dt) {
  const cloth = params.materials?.cloth || {};
  const speed = Math.hypot(ball.vel.x, ball.vel.y);
  const slip = getContactSlipVelocity(ball);
  const slipSpeed = Math.hypot(slip.x, slip.y);

  if (speed <= 0 && slipSpeed <= params.slipEpsilon) {
    decaySideSpin(ball, cloth, params, dt);
    return;
  }

  if (slipSpeed > params.slipEpsilon || ball.contactMode === 'sliding' || ball.isSliding) {
    applySlidingFriction(ball, params, cloth, slip, Math.max(slipSpeed, 0.000001), speed, dt);
  } else {
    applyRollingFriction(ball, params, cloth, speed, dt);
  }

  decaySideSpin(ball, cloth, params, dt);

  const nextSpeed = Math.hypot(ball.vel.x, ball.vel.y);
  const nextOmega = ball.omega ? Math.hypot(ball.omega.x, ball.omega.y, ball.omega.z) : 0;
  if (nextSpeed <= params.lowSpeedCutoff && nextOmega <= params.lowOmegaCutoff) {
    ball.vel.x = 0;
    ball.vel.y = 0;
    if (ball.omega) {
      ball.omega.x = 0;
      ball.omega.y = 0;
      ball.omega.z = 0;
    }
    ball.isSliding = false;
    ball.contactMode = 'rolling';
  }
}

function settleBallIfSlow(ball, params) {
  const speed = Math.hypot(ball.vel.x, ball.vel.y);
  const omega = Math.hypot(ball.omega.x, ball.omega.y, ball.omega.z);

  if (speed <= params.lowSpeedCutoff && omega <= params.lowOmegaCutoff) {
    ball.vel.x = 0;
    ball.vel.y = 0;
    ball.omega.x = 0;
    ball.omega.y = 0;
    ball.omega.z = 0;
    ball.contactMode = 'rolling';
    ball.isSliding = false;
  }
}

module.exports = {
  applyTableFriction,
  getContactSlipVelocity,
  settleBallIfSlow,
};

}, {}, "apps/three-game/src/core/physics/friction.js"],
43: [function(require, module, exports) {
function normalizeQuaternion(q) {
  const len = Math.hypot(q.x, q.y, q.z, q.w) || 1;
  q.x /= len;
  q.y /= len;
  q.z /= len;
  q.w /= len;
  return q;
}

function multiplyQuaternion(left, right) {
  return {
    x: left.w * right.x + left.x * right.w + left.y * right.z - left.z * right.y,
    y: left.w * right.y - left.x * right.z + left.y * right.w + left.z * right.x,
    z: left.w * right.z + left.x * right.y - left.y * right.x + left.z * right.w,
    w: left.w * right.w - left.x * right.x - left.y * right.y - left.z * right.z,
  };
}

function integrateBallOrientation(ball, dt, exact = false) {
  if (!ball.orientation || !ball.omega) {
    return;
  }

  const { x, y, z } = ball.omega;
  const speed = Math.hypot(x, y, z);
  if (speed <= 0.000001) {
    return;
  }

  const q = ball.orientation;
  if (exact) {
    const halfAngle = speed * dt / 2;
    const axisScale = Math.sin(halfAngle) / speed;
    const delta = {
      x: x * axisScale,
      y: y * axisScale,
      z: z * axisScale,
      w: Math.cos(halfAngle),
    };
    const next = multiplyQuaternion(delta, q);
    q.x = next.x;
    q.y = next.y;
    q.z = next.z;
    q.w = next.w;
    normalizeQuaternion(q);
    return;
  }
  const halfDt = 0.5 * dt;
  const dx = (x * q.w + y * q.z - z * q.y) * halfDt;
  const dy = (-x * q.z + y * q.w + z * q.x) * halfDt;
  const dz = (x * q.y - y * q.x + z * q.w) * halfDt;
  const dw = (-x * q.x - y * q.y - z * q.z) * halfDt;

  q.x += dx;
  q.y += dy;
  q.z += dz;
  q.w += dw;
  normalizeQuaternion(q);
}

function applyCueSpin(cueBall, shot, params) {
  const radius = cueBall.radius || 26.25;
  const side = Math.max(-params.maxTipOffsetRatio, Math.min(params.maxTipOffsetRatio, shot.tipOffset?.x || 0));
  const topBack = Math.max(-params.maxTipOffsetRatio, Math.min(params.maxTipOffsetRatio, shot.tipOffset?.y || 0));
  const speed = Math.hypot(cueBall.vel.x, cueBall.vel.y);
  const spinMultiplierXZ = params.cueSpinMultiplierXZ ?? 0;
  const spinMultiplierY = params.cueSpinMultiplierY ?? 1;
  const maxCuePower = Math.max(1, params.maxCuePower || 1);
  const lowSpeedSpinBoost = Math.max(0, params.cueLowSpeedSpinBoost ?? 0);
  const speedRatio = Math.max(0, Math.min(1, speed / maxCuePower));
  const contactTimeFactor = 1 + lowSpeedSpinBoost * (1 - speedRatio);
  const momentFactor = (cueBall.mass || 1) * radius * radius
    / (cueBall.inertia || ((2 / 5) * (cueBall.mass || 1) * radius * radius));
  const rollSpinFactor = topBack * spinMultiplierXZ * momentFactor * contactTimeFactor;

  cueBall.omega.x = (-cueBall.vel.y / radius) * rollSpinFactor;
  cueBall.omega.y = (cueBall.vel.x / radius) * rollSpinFactor;
  cueBall.omega.z = -side * (speed / radius) * spinMultiplierY * contactTimeFactor;
  cueBall.contactMode = 'sliding';
  cueBall.isSliding = true;
}

module.exports = {
  applyCueSpin,
  integrateBallOrientation,
  normalizeQuaternion,
};

}, {}, "apps/three-game/src/core/physics/spin.js"],
44: [function(require, module, exports) {
function createPocketState(pocketId) {
  return {
    pocketId,
    candidate: true,
    touchedLip: false,
    lipContactCount: 0,
    maxImpactSpeed: 0,
    minDistanceToCenter: Infinity,
    isRattle: false,
    frames: 0,
    potReason: null,
    timeToPotRemaining: null,
  };
}

function updatePocketCandidate(ball, pocket) {
  if (!ball.pocketState || ball.pocketState.pocketId !== pocket.id) {
    ball.pocketState = createPocketState(pocket.id);
  }

  const state = ball.pocketState;
  if (pocket.center) {
    state.minDistanceToCenter = Math.min(
      state.minDistanceToCenter,
      Math.hypot(ball.pos.x - pocket.center.x, ball.pos.y - pocket.center.y),
    );
  }
  state.frames += 1;

  return state;
}

function clearPocketCandidate(ball, pocketId) {
  if (ball.pocketState && ball.pocketState.pocketId === pocketId) {
    ball.pocketState = null;
  }
}

function markPocketLipContact(ball, pocketId, impactSpeed, params) {
  const state = updatePocketCandidate(ball, { id: pocketId });
  state.touchedLip = true;
  state.lipContactCount += 1;
  state.maxImpactSpeed = Math.max(state.maxImpactSpeed, impactSpeed);
  state.isRattle = true;

  return state;
}

module.exports = {
  updatePocketCandidate,
  clearPocketCandidate,
  markPocketLipContact,
};

}, {}, "apps/three-game/src/core/physics/pocketState.js"],
45: [function(require, module, exports) {
const { registerShotEvent } = require('./physicsEvents');
const { resolvePocketStates } = require('./pocketCollision');

function ensurePocketWorldState(state) {
  if (!state.pocketWorld) {
    state.pocketWorld = {
      accumulator: 0,
      time: 0,
    };
  }
  return state.pocketWorld;
}

function stepPocketWorld(state, params, dt) {
  const pocketWorld = ensurePocketWorldState(state);
  const fixedDt = params.pocketFixedDt;
  const events = [];

  pocketWorld.accumulator += dt;
  while (pocketWorld.accumulator >= fixedDt) {
    const pocketEvents = resolvePocketStates(state, params, fixedDt);
    pocketEvents.forEach((event) => registerShotEvent(state, event));
    events.push(...pocketEvents);
    pocketWorld.accumulator -= fixedDt;
    pocketWorld.time += fixedDt;
  }

  return events;
}

module.exports = {
  stepPocketWorld,
};

}, {"./physicsEvents":39,"./pocketCollision":46}, "apps/three-game/src/core/physics/pocketWorld.js"],
46: [function(require, module, exports) {
const { length, sub } = require('./vector');
const {
  clearPocketCandidate,
  updatePocketCandidate,
} = require('./pocketState');
const {
  createBallPocketState,
} = require('./pocketManager');
const { isInsidePocketCapture, sampleDropEdgePoint } = require('./pocketDropRegion');
const { advancePocketEntry, canCommitPocketEntry } = require('./pocketEntry');
const { pocketCaptureInset, allowsPocketAngle } = require('./pocketCaptureSweep');
const { startPocketMotion } = require('./pocketMotion');

function rejectPocketAngle(ball, pocket) {
  updatePocketCandidate(ball, pocket).angleRejected = true;
  // Rejection is still a table ball. No falling support or velocity damping;
  // the existing finite jaw colliders determine the actual rebound.
  ball.pocketEntry = null;
  ball.pocketMode = 'jaw';
}

function potBall(state, ball, pocket, events, params) {
  const impactSpeed = Math.hypot(ball.vel.x, ball.vel.y);
  const pocketEntrySpeedMmS = ball.pocketEntry?.mouthSpeedMmS ?? impactSpeed;
  const entryPosition = { ...ball.pos };
  const entryVelocity = { ...ball.vel };
  const entryAngularVelocity = { ...ball.omega };
  const entryHeight = ball.pocketEntry?.height ?? ball.radius;
  const entryVerticalVelocity = ball.pocketEntry?.verticalVelocity ?? 0;
  ball.pocketEntry = null;
  const potReason = ball.pocketState?.potReason || null;
  const pocketMotion = startPocketMotion(ball, pocket, params, impactSpeed);
  ball.potted = true;
  if (!pocketMotion) {
    ball.pos = { ...pocket.capture.center };
    ball.position = ball.pos;
  }
  ball.vel = { x: 0, y: 0 };
  ball.velocity = ball.vel;
  ball.omega = { x: 0, y: 0, z: 0 };
  ball.angularVelocity = ball.omega;
  ball.potting = {
    pocketId: pocket.id,
    type: pocket.type,
  };
  ball.pocketState = null;
  ball.pocketMode = 'potted';

  if (state.activeShot) {
    if (!state.activeShot.pottedBallIds.includes(ball.id)) {
      state.activeShot.pottedBallIds.push(ball.id);
    }
    if (ball.id === state.cueBallId) {
      state.activeShot.cueBallPotted = true;
    }
  }

  events.push({
    type: ball.id === state.cueBallId ? 'cue-ball-potted' : 'ball-potted',
    ballId: ball.id,
    pocketId: pocket.id,
    point: { ...pocket.capture.center },
    pocketCenter: { ...pocket.capture.center },
    impactSpeed,
    pocketEntrySpeedMmS,
    entryPosition, entryVelocity, entryAngularVelocity, entryHeight, entryVerticalVelocity,
    potReason,
  });
}

function isInsideCapture(ball, pocket) {
  return isInsidePocketCapture(ball, pocket);
}

function shouldEnterPocket(ball, pocket, params) {
  const pocketMaterial = params.materials?.pocket || {};
  const timeToPot = pocketMaterial.timeToPot ?? params.timeToPot;
  return isInsideCapture(ball, pocket) && timeToPot >= 0;
}

function advanceTimeToPot(ball, pocket, params, dt, events, state) {
  const pocketMaterial = params.materials?.pocket || {};
  const timeToPot = pocketMaterial.timeToPot ?? params.timeToPot;
  const pocketState = updatePocketCandidate(ball, pocket);

  ball.pocketMode = 'falling';
  if (timeToPot <= 0) {
    potBall(state, ball, pocket, events, params);
    return;
  }

  if (pocketState.timeToPotRemaining === null) {
    pocketState.timeToPotRemaining = timeToPot;
  }

  pocketState.timeToPotRemaining -= dt;
  if (pocketState.timeToPotRemaining <= 0) {
    potBall(state, ball, pocket, events, params);
  }
}

function resolvePocketStates(state, params, dt = 0) {
  const events = [];
  const pockets = state.tableColliderSet ? state.tableColliderSet.pockets : [];

  state.balls.forEach((ball) => {
    if (ball.potted) {
      return;
    }

    pockets.forEach((pocket) => {
      if (ball.potted) {
        return;
      }

      const distanceToMouth = length(sub(ball.pos, pocket.center));
      const inCandidateArea = distanceToMouth <= pocket.candidateRadius;
      const wasPocketCandidate = ball.pocketState?.pocketId === pocket.id
        || ball.pocketEntry?.pocketId === pocket.id;

      if (inCandidateArea) {
        const pocketState = updatePocketCandidate(ball, pocket);
        pocketState.ballPocketState = createBallPocketState(ball, pocket, params);
        if (ball.pocketMode === 'table') {
          ball.pocketMode = 'jaw';
        }
      } else {
        clearPocketCandidate(ball, pocket.id);
        if (ball.pocketMode === 'jaw') {
          ball.pocketMode = 'table';
        }
      }

      if (!inCandidateArea && !wasPocketCandidate) {
        return;
      }

      if (pocket.dropEdges?.length) {
        if (params.pocketCaptureMode === 'angle') {
          const sample = sampleDropEdgePoint(ball.pos, pocket);
          if (ball.pocketState?.pocketId === pocket.id && ball.pocketState?.angleRejected) {
            if (sample && sample.signedCenterDepth < -1e-4) delete ball.pocketState.angleRejected;
            // Rejection only gives the jaw a chance to return the ball. A
            // stationary ball inside the lip must fall, including old replay
            // snapshots carrying a stale rejection. Deep entries have no
            // cloth support even if their original angle was too shallow.
            else if (sample?.signedCenterDepth > 1e-6 && (
              Math.hypot(ball.vel.x, ball.vel.y) <= (params.lowSpeedCutoff ?? 8)
              || sample.signedCenterDepth >= ball.radius
            )) potBall(state, ball, pocket, events, params);
            ball.pocketEntry = null;
            return;
          }
          // Endpoint fallback for a ball initially placed inside the region.
          // Ordinary moving entries are decided by the continuous sweep.
          if (sample?.signedCenterDepth > 1e-6) {
            if (allowsPocketAngle(ball, pocket)) potBall(state, ball, pocket, events, params);
            else rejectPocketAngle(ball, pocket);
          }
          return;
        }
        const entry = advancePocketEntry(ball, pocket, ball.pocketEntryAdvanced ? 0 : dt);
        if (entry) ball.pocketMode = 'entry';
        else if (ball.pocketMode === 'entry') ball.pocketMode = 'table';
        if ((params.pocketCaptureMode === 'live' ? canCommitPocketEntry(ball,pocket,entry) : entry && entry.depth >= pocketCaptureInset(ball,pocket,params.pocketCaptureMode) && entry.entry.verticalVelocity<=0)) potBall(state, ball, pocket, events, params);
        return;
      }
      if (shouldEnterPocket(ball, pocket, params)) {
        advanceTimeToPot(ball, pocket, params, dt, events, state);
      }
    });
  });

  return events;
}

module.exports = {
  potBall,
  rejectPocketAngle,
  resolvePocketStates,
};

}, {"./vector":37,"./pocketState":44,"./pocketManager":47,"./pocketDropRegion":48,"./pocketEntry":49,"./pocketCaptureSweep":51,"./pocketMotion":52}, "apps/three-game/src/core/physics/pocketCollision.js"],
47: [function(require, module, exports) {
const { dot, length, normalize, scale, sub } = require('./vector');
const { isInsidePocketCapture } = require('./pocketDropRegion');

function getPocketDefinition(tableColliderSet, pocketId) {
  const pocket = (tableColliderSet?.pockets || []).find((candidate) => candidate.id === pocketId);
  return pocket ? pocket.pocketDefinition : null;
}

function getPocketDefinitionWithDirection(tableColliderSet, pocketId) {
  const pocket = (tableColliderSet?.pockets || []).find((candidate) => candidate.id === pocketId);
  if (!pocket) {
    return null;
  }

  return {
    pocketDefinition: pocket.pocketDefinition,
    direction: { ...pocket.dropDirection },
    pocket,
  };
}

function getOpeningPos(pocket) {
  return { ...pocket.openingDefinition.center };
}

function getOpeningDirection(pocket, position) {
  const opening = getOpeningPos(pocket);
  return normalize(sub(opening, position));
}

function getPocketMouthHalfWidth(pocket) {
  return (pocket.openingDefinition.mouthWidthMm || pocket.mouthWidthMm || 0) * 0.5;
}

function getPocketThroatHalfWidth(pocket) {
  return (pocket.openingDefinition.throatWidthMm || pocket.throatWidthMm || 0) * 0.5;
}

function getPocketOpeningTangent(pocket) {
  const direction = normalize(pocket.dropDirection || { x: 1, y: 0 });
  return { x: -direction.y, y: direction.x };
}

function projectOntoOpening(pocket, position) {
  const opening = getOpeningPos(pocket);
  const tangent = getPocketOpeningTangent(pocket);
  const offset = sub(position, opening);
  const projectedDistance = dot(offset, tangent);
  const halfWidth = getPocketMouthHalfWidth(pocket);
  const clampedDistance = Math.max(-halfWidth, Math.min(halfWidth, projectedDistance));

  return {
    x: opening.x + tangent.x * clampedDistance,
    y: opening.y + tangent.y * clampedDistance,
  };
}

function getOpeningPosFromPosition(pocket, position) {
  const opening = projectOntoOpening(pocket, position);
  const toOpening = sub(opening, position);
  const direction = normalize(toOpening);

  return {
    opening,
    direction,
    distance: length(toOpening),
  };
}

function getClosestPocket(tableColliderSet, position) {
  let closest = null;
  (tableColliderSet?.pockets || []).forEach((pocket) => {
    const openingInfo = getOpeningPosFromPosition(pocket, position);
    if (!closest || openingInfo.distance < closest.distance) {
      closest = {
        pocket,
        distance: openingInfo.distance,
        opening: openingInfo.opening,
        direction: openingInfo.direction,
      };
    }
  });
  return closest;
}

function createOverPocketState(ball, pocket) {
  const centerOffset = sub(ball.pos, pocket.capture.center);
  return {
    ballId: ball.id,
    pocketId: pocket.id,
    distanceToPocketCentre: length(centerOffset),
    isOverPocket: isInsidePocketCapture(ball, pocket),
  };
}

function getPocketVelocityRange(params) {
  const pocketMaterial = params.materials?.pocket || {};
  return {
    minSpeed: pocketMaterial.minPocketVelocity ?? params.minPocketVelocity,
    maxSpeed: pocketMaterial.maxPocketVelocity ?? params.maxPocketVelocity,
  };
}

function getOpeningClearance(ball, pocket, params) {
  const pocketMaterial = params.materials?.pocket || {};
  const opening = getOpeningPos(pocket);
  const tangent = getPocketOpeningTangent(pocket);
  const offset = sub(ball.pos, opening);
  const lateralDistance = dot(offset, tangent);
  const mouthHalfWidth = getPocketMouthHalfWidth(pocket);
  const throatHalfWidth = getPocketThroatHalfWidth(pocket);
  const marginRatio = pocketMaterial.openingBallRadiusMarginRatio
    ?? params.pocketOpeningBallRadiusMarginRatio
    ?? 0.65;
  const ballMargin = (ball.radius || 0) * marginRatio;
  const mouthPathHalfWidth = Math.max(0, mouthHalfWidth - ballMargin);
  const throatPathHalfWidth = Math.max(0, throatHalfWidth - ballMargin);

  return {
    lateralDistance,
    absLateralDistance: Math.abs(lateralDistance),
    mouthHalfWidth,
    throatHalfWidth,
    mouthPathHalfWidth,
    throatPathHalfWidth,
    withinMouthPath: Math.abs(lateralDistance) <= mouthPathHalfWidth,
    withinThroatPath: Math.abs(lateralDistance) <= throatPathHalfWidth,
  };
}

function createBallPocketState(ball, pocket, params) {
  const openingInfo = getOpeningPosFromPosition(pocket, ball.pos);
  const velocity = { ...ball.vel };
  const speed = Math.hypot(velocity.x, velocity.y);
  const velocityDirection = speed > 0 ? normalize(velocity) : { x: 0, y: 0 };
  const velocityRange = getPocketVelocityRange(params);
  const overPocketState = createOverPocketState(ball, pocket);
  const openingClearance = getOpeningClearance(ball, pocket, params);
  const approachDot = speed > 0 ? dot(velocityDirection, openingInfo.direction) : 0;
  const approachDotMin = params.materials?.pocket?.approachDotMin ?? params.pocketApproachDotMin ?? 0;
  const openingDirection = normalize(pocket.dropDirection || openingInfo.direction);
  const signedDepth = dot(sub(ball.pos, getOpeningPos(pocket)), openingDirection);
  const isPastOpeningPlane = signedDepth >= -(ball.radius || 0);
  const canEnterOpening = openingClearance.withinMouthPath || overPocketState.isOverPocket;

  return {
    ballId: ball.id,
    pocketId: pocket.id,
    ballPosition: { ...ball.pos },
    pocketDefinition: pocket.pocketDefinition,
    openingDefinition: pocket.openingDefinition,
    edgeDefinitions: pocket.edgeDefinitions,
    overPocketState,
    distanceToOpening: openingInfo.distance,
    directionToOpening: openingInfo.direction,
    openingDirection,
    velocity,
    speed,
    minSpeed: velocityRange.minSpeed,
    maxSpeed: velocityRange.maxSpeed,
    approachDot,
    approachDotMin,
    signedDepth,
    isPastOpeningPlane,
    movingTowardOpening: approachDot > approachDotMin,
    canEnterOpening,
    openingClearance,
    openingProjection: openingInfo.opening,
    openingHalfWidth: getPocketMouthHalfWidth(pocket),
    isPotted: false,
  };
}

function isBallPocketStateHittableByBall(ballPocketState, hitBall) {
  if (!hitBall || hitBall.potted) {
    return false;
  }

  const toTargetBall = sub(ballPocketState.ballPosition, hitBall.pos);
  const hitDirection = normalize(toTargetBall);
  const pocketDirection = ballPocketState.directionToOpening;

  return dot(hitDirection, pocketDirection) > (ballPocketState.hittableDotMin ?? 0.05);
}

function isBallPocketStatePossible(ballPocketState, params) {
  const shouldWait = params.materials?.pocket?.waitToBeCloseToPocketCentreBeforePutting
    ?? params.waitToBeCloseToPocketCentreBeforePutting;

  if (ballPocketState.speed < ballPocketState.minSpeed) {
    return false;
  }

  if (Number.isFinite(ballPocketState.maxSpeed) && ballPocketState.speed > ballPocketState.maxSpeed) {
    return false;
  }

  if (shouldWait && !ballPocketState.overPocketState.isOverPocket) {
    return false;
  }

  return ballPocketState.overPocketState.isOverPocket
    || (
      ballPocketState.movingTowardOpening
      && ballPocketState.canEnterOpening
      && ballPocketState.isPastOpeningPlane
    );
}

function addBallPocketStatesToList(list, ball, pockets, params) {
  pockets.forEach((pocket) => {
    list.push(createBallPocketState(ball, pocket, params));
  });
}

function fillPocketPutManager(state, params) {
  const pockets = state.tableColliderSet?.pockets || [];
  const ballPocketStates = [];

  state.balls.forEach((ball) => {
    if (ball.potted) {
      return;
    }

    addBallPocketStatesToList(ballPocketStates, ball, pockets, params);
  });

  return {
    ballPocketStates,
  };
}

module.exports = {
  addBallPocketStatesToList,
  createBallPocketState,
  createOverPocketState,
  fillPocketPutManager,
  getClosestPocket,
  getOpeningDirection,
  getOpeningPos,
  getOpeningPosFromPosition,
  getPocketMouthHalfWidth,
  getPocketThroatHalfWidth,
  getPocketDefinition,
  getPocketDefinitionWithDirection,
  isBallPocketStateHittableByBall,
  isBallPocketStatePossible,
};

}, {"./vector":37,"./pocketDropRegion":48}, "apps/three-game/src/core/physics/pocketManager.js"],
48: [function(require, module, exports) {
const {
  dot,
  length,
  normalize,
  sub,
} = require('./vector');

function getPrimaryDropEdge(pocket) {
  return (pocket.dropEdges || []).find((edge) => (
    edge.role === 'pocket-drop-edge' && edge.points && edge.points.length >= 2
  )) || null;
}

function closestPointOnSegment(point, start, end) {
  const segment = sub(end, start);
  const denom = dot(segment, segment);
  const t = denom > 0.000001
    ? Math.max(0, Math.min(1, dot(sub(point, start), segment) / denom))
    : 0;
  return {
    point: {
      x: start.x + segment.x * t,
      y: start.y + segment.y * t,
    },
    t,
  };
}

function closestPointOnPolyline(point, points) {
  let best = null;

  for (let i = 1; i < points.length; i += 1) {
    const closest = closestPointOnSegment(point, points[i - 1], points[i]);
    const offset = sub(point, closest.point);
    const distanceToSegment = length(offset);
    if (!best || distanceToSegment < best.distance) {
      best = {
        ...closest,
        distance: distanceToSegment,
        segmentIndex: i - 1,
      };
    }
  }

  return best;
}

function sampleDropEdgePoint(pos, pocket) {
  const edge = getPrimaryDropEdge(pocket);
  if (!edge) {
    return null;
  }

  const closest = closestPointOnPolyline(pos, edge.points);
  if (!closest) {
    return {
      inside: false,
      maxDepth: 0,
      currentInside: false,
      closestPoint: null,
    };
  }

  const centerDirection = normalize(sub(pocket.capture?.center || pocket.center, closest.point));
  const signedCenterDepth = dot(sub(pos, closest.point), centerDirection);
  const inside = signedCenterDepth >= 0;

  return {
    inside,
    maxDepth: inside ? Math.max(0, signedCenterDepth) : 0,
    currentInside: inside,
    closestPoint: closest.point,
    signedCenterDepth,
  };
}

function createDropEdgeCaptureSample(ball, pocket, dt = 0) {
  const current = sampleDropEdgePoint(ball.pos, pocket);
  if (!current) {
    return null;
  }

  const previous = ball.prevPos || ball.previousPosition || ball.pos;
  const previousSample = sampleDropEdgePoint(previous, pocket);
  const inside = current.inside || Boolean(previousSample?.inside);
  const maxDepth = Math.max(
    current.maxDepth || 0,
    previousSample?.maxDepth || 0,
  );

  return {
    inside,
    insideDuration: inside ? Math.max(0, dt) : 0,
    maxDepth,
    currentInside: current.inside,
    currentDepth: current.inside ? Math.max(0, current.signedCenterDepth || 0) : 0,
  };
}

function createCircleCaptureSample(ball, pocket, dt = 0) {
  const distanceToCaptureCenter = length(sub(ball.pos, pocket.capture.center));
  const inside = distanceToCaptureCenter <= pocket.capture.radius;
  return {
    inside,
    insideDuration: inside ? Math.max(0, dt) : 0,
    maxDepth: inside ? Math.max(0, pocket.capture.radius - distanceToCaptureCenter) : 0,
    currentInside: inside,
  };
}

function createCaptureSampleForPocket(ball, pocket, dt = 0) {
  return createDropEdgeCaptureSample(ball, pocket, dt)
    || createCircleCaptureSample(ball, pocket, dt);
}

function isInsidePocketCapture(ball, pocket) {
  return createCaptureSampleForPocket(ball, pocket, 0).inside;
}

module.exports = {
  sampleDropEdgePoint,
  createCaptureSampleForPocket,
  createDropEdgeCaptureSample,
  isInsidePocketCapture,
};

}, {"./vector":37}, "apps/three-game/src/core/physics/pocketDropRegion.js"],
49: [function(require, module, exports) {
const { sampleDropEdgePoint } = require('./pocketDropRegion');
const { sweepPocketJaw } = require('./pocketJawCollision');

// Millimetres and seconds. This is still a live ball: jaw collisions remain in
// the normal continuous solver until it has cleared the mouth safely.
function advancePocketEntry(ball, pocket, dt) {
  const sample = sampleDropEdgePoint(ball.pos, pocket);
  if (!sample) return null;
  if (!sample.inside || (sample.signedCenterDepth < 1e-6 && Math.hypot(ball.vel.x, ball.vel.y) < 1e-6)) {
    if (ball.pocketEntry?.pocketId === pocket.id) ball.pocketEntry = null;
    return null;
  }
  const r = ball.radius;
  const entry = ball.pocketEntry?.pocketId === pocket.id ? ball.pocketEntry :
    (ball.pocketEntry = { pocketId: pocket.id, height: r, verticalVelocity: 0, mouthSpeedMmS: Math.hypot(ball.vel.x, ball.vel.y) });
  entry.height += entry.verticalVelocity * dt - .5 * 9810 * dt * dt;
  entry.verticalVelocity -= 9810 * dt;
  const depth = sample.signedCenterDepth;
  const towardX = pocket.capture.center.x - sample.closestPoint.x;
  const towardY = pocket.capture.center.y - sample.closestPoint.y;
  const towardLength = Math.hypot(towardX, towardY) || 1;
  entry.supportDepth = depth;
  entry.supportNormal = { x: towardX / towardLength, y: towardY / towardLength };
  if (depth < r) {
    const support = Math.sqrt(Math.max(0, r * r - depth * depth));
    if (entry.height < support) {
      entry.height = support;
      const dx = pocket.capture.center.x - sample.closestPoint.x;
      const dy = pocket.capture.center.y - sample.closestPoint.y;
      const length = Math.hypot(dx, dy) || 1;
      const nx = dx / length * depth / r, ny = dy / length * depth / r, nz = support / r;
      const inward = ball.vel.x * nx + ball.vel.y * ny + entry.verticalVelocity * nz;
      if (inward < 0) {
        ball.vel.x -= inward * nx; ball.vel.y -= inward * ny;
        entry.verticalVelocity -= inward * nz;
      }
    }
  }
  return { entry, depth };
}

function canCommitPocketEntry(ball, pocket, sample) {
  if (!sample) return false;
  const { entry, depth } = sample, r = ball.radius;
  // Below the bed with the whole sphere inside the mouth: no return to play.
  if (depth >= r && entry.height <= -r) return true;
  if (depth < r) return false;
  const edgeSample = sampleDropEdgePoint(ball.pos, pocket);
  const intoX = pocket.dropDirection?.x ?? (pocket.capture.center.x - edgeSample.closestPoint.x);
  const intoY = pocket.dropDirection?.y ?? (pocket.capture.center.y - edgeSample.closestPoint.y);
  if (ball.vel.x * intoX + ball.vel.y * intoY < 0) return false;
  // A fully cleared mouth can hand off early only if the ball's swept sphere
  // cannot reach a jaw before descending below the bed. Otherwise it stays live
  // and the existing solver may reject the pot by bouncing it onto the cloth.
  const horizon = (entry.verticalVelocity + Math.sqrt(entry.verticalVelocity ** 2
    + 2 * 9810 * Math.max(0, entry.height + r))) / 9810;
  for (const lip of pocket.lips || []) {
    for (let i = 1; i < lip.points.length; i++) {
      const line = { start: lip.points[i - 1], end: lip.points[i] };
      if (sweepPocketJaw(ball, line, horizon)) return false;
    }
  }
  const exitHorizon = Math.min(horizon, r / Math.max(1, Math.hypot(ball.vel.x, ball.vel.y)));
  const end = { x: ball.pos.x + ball.vel.x * exitHorizon, y: ball.pos.y + ball.vel.y * exitHorizon };
  return Boolean(sampleDropEdgePoint(end, pocket)?.inside);
}
module.exports = { advancePocketEntry, canCommitPocketEntry };

}, {"./pocketDropRegion":48,"./pocketJawCollision":50}, "apps/three-game/src/core/physics/pocketEntry.js"],
50: [function(require, module, exports) {
const { closestPointOnSegment, sweepBallLine } = require('./continuousCollision');

// The calibrated jaw nose lies in the resting ball-centre plane. Once the
// centre descends, a jaw intersects a smaller sphere section, not a full disc.
function entryHeightAt(ball, time = 0) {
  const entry = ball.pocketEntry;
  if (!entry) return ball.radius;
  let height = entry.height + entry.verticalVelocity * time - .5 * 9810 * time * time;
  if (entry.supportNormal) {
    const depth = entry.supportDepth + (ball.vel.x * entry.supportNormal.x + ball.vel.y * entry.supportNormal.y) * time;
    if (depth < ball.radius) height = Math.max(height, Math.sqrt(Math.max(0, ball.radius ** 2 - Math.max(0, depth) ** 2)));
  }
  return height;
}
function jawContactRadius(ball, time = 0) {
  const offset = entryHeightAt(ball, time) - ball.radius;
  return Math.sqrt(Math.max(0, ball.radius ** 2 - offset ** 2));
}
function sweepPocketJaw(ball, line, dt) {
  if (!ball.pocketEntry) return sweepBallLine(ball, line, dt);
  const speed = Math.hypot(ball.vel.x, ball.vel.y);
  if (speed < 1e-9) return null;
  // Conservative advancement against the sphere and finite-height nose line.
  // This tests every possible contact interval, including line endpoints.
  const bound = speed + Math.abs(ball.pocketEntry.verticalVelocity) + 9810 * dt + 1;
  let time = 0;
  for (let iteration = 0; iteration < 160 && time <= dt; iteration++) {
    const pos = { x: ball.pos.x + ball.vel.x * time, y: ball.pos.y + ball.vel.y * time };
    const point = closestPointOnSegment(pos, line.start, line.end);
    const dx = pos.x - point.x, dy = pos.y - point.y, horizontal = Math.hypot(dx, dy);
    const distance = Math.hypot(horizontal, entryHeightAt(ball, time) - ball.radius);
    if (distance <= ball.radius + 1e-5) {
      const verticalSpeed = (entryHeightAt(ball, time + 1e-7) - entryHeightAt(ball, time)) / 1e-7;
      if (dx * ball.vel.x + dy * ball.vel.y + (entryHeightAt(ball, time)-ball.radius)*verticalSpeed >= -1e-8) return null;
      return { type:'ball-line', toi:time, ball, line, point,
        normal:{x:dx/(horizontal||1),y:dy/(horizontal||1)} };
    }
    time += Math.max(1e-8, (distance - ball.radius) / bound);
  }
  return null;
}
function resolvePocketJaw(collision, params) {
  const {ball,line,point}=collision, entry=ball.pocketEntry;
  const dx=ball.pos.x-point.x,dy=ball.pos.y-point.y,dz=entry.height-ball.radius;
  const length=Math.hypot(dx,dy,dz)||1,nx=dx/length,ny=dy/length,nz=dz/length;
  const approach=ball.vel.x*nx+ball.vel.y*ny+entry.verticalVelocity*nz;
  if(approach>=0)return null;
  const railRestitution=line.restitution??params.materials?.rail?.restitution??params.railRestitution;
  // Gameplay calibration for the unsupported inner facing, not a claimed
  // material constant. Keep the front jaw's rail response; progressively
  // dissipate normal energy once the sphere has rolled into the pocket.
  const depth=entry.supportDepth??0;
  const t=Math.max(0,Math.min(1,(depth/ball.radius-.5)/.5));
  const blend=t*t*(3-2*t);
  const innerRestitution=Math.min(railRestitution,params.pocketInnerJawRestitution??.2);
  const restitution=railRestitution+(innerRestitution-railRestitution)*blend;
  const impulse=-(1+restitution)*approach;
  // Use the contact normal in all three dimensions. Below the nose, its
  // downward component directs the same impulse into the bag; no added kick.
  ball.vel.x+=impulse*nx;ball.vel.y+=impulse*ny;
  entry.verticalVelocity+=impulse*nz;
  return {type:'ball-hit-pocket-jaw',ballId:ball.id,colliderId:line.id,point:{...point},
    normal:{x:nx,y:ny,z:nz},impactSpeed:-approach,role:line.role,material:line.material};
}
module.exports = { entryHeightAt, jawContactRadius, sweepPocketJaw, resolvePocketJaw };

}, {"./continuousCollision":36}, "apps/three-game/src/core/physics/pocketJawCollision.js"],
51: [function(require, module, exports) {
const { sampleDropEdgePoint } = require('./pocketDropRegion');

// Gameplay calibration for middle pockets: a rolling ball can be committed
// near the edge; a fast ball must clear more of the facing before handoff.
// Use local speed (mm/s), never cue power: travel and ball impacts lose energy.
// The 0.5–6.7 m/s range targets roughly 13–20 degrees on the practice table.
function pocketCaptureInset(ball, pocket, mode = 'angle', speed) {
  if (mode === 'immediate' || mode === 'angle') return 0;
  if (pocket.type !== 'middle') return ball.radius * 0.2;
  const t = Math.max(0, Math.min(1, ((speed ?? Math.hypot(ball.vel.x, ball.vel.y)) - 500) / 6200));
  return ball.radius * 0.45 * t;
}

// Local segment sweeps, in mm/s. The inset is a presentation handoff region,
// not a material or gravity constant. Front-jaw contacts remain ordinary CCD.
// Calibrated gameplay threshold, not a physical material constant. Middle
// rails are horizontal in table coordinates; both sides use the same rule.
function allowsPocketAngle(ball, pocket, speed = Math.hypot(ball.vel.x, ball.vel.y)) {
  if (pocket.type !== 'middle' || speed < 1e-6) return true;
  const t = Math.max(0, Math.min(1, (speed - 500) / 6200));
  const minAngle = (13 + 7 * t) * Math.PI / 180;
  return Math.abs(ball.vel.y) + 1e-7 >= speed * Math.sin(minAngle);
}

function sweepPocketCapture(ball, pocket, dt, mode = 'angle') {
  const speed = Math.hypot(ball.vel.x, ball.vel.y);
  const reach = pocket.candidateRadius + speed * dt;
  if (Math.hypot(ball.pos.x-pocket.center.x, ball.pos.y-pocket.center.y)>reach) return null;
  const rejected = mode === 'angle' && ball.pocketState?.pocketId === pocket.id && ball.pocketState?.angleRejected;
  // A rejected mouth crossing may rebound out, but cannot disable capture
  // beyond the lip: once the whole ball clears it there is no table support.
  // Sweep this safety boundary as well so fast balls cannot tunnel past it.
  const inset = rejected ? ball.radius : pocketCaptureInset(ball, pocket, mode, speed);
  let best = null;
  for (const edge of pocket.dropEdges || []) for (let i=1;i<edge.points.length;i++) {
    const a=edge.points[i-1],b=edge.points[i],sx=b.x-a.x,sy=b.y-a.y,len=Math.hypot(sx,sy);
    if(!len)continue;
    let nx=-sy/len,ny=sx/len;
    if((pocket.capture.center.x-a.x)*nx+(pocket.capture.center.y-a.y)*ny<0){nx=-nx;ny=-ny;}
    const approach=ball.vel.x*nx+ball.vel.y*ny;
    if(approach<=1e-9)continue;
    const depth=(ball.pos.x-a.x)*nx+(ball.pos.y-a.y)*ny;
    const t=(inset-depth)/approach;
    if(t < -1e-9 || t>dt || (best&&t>=best.toi))continue;
    const time=Math.max(0,t),pos={x:ball.pos.x+ball.vel.x*time,y:ball.pos.y+ball.vel.y*time};
    const along=((pos.x-a.x)*sx+(pos.y-a.y)*sy)/(len*len);
    if(along < -1e-8 || along>1+1e-8)continue;
    // Finite segments only: an infinite extension must not capture a ball
    // passing alongside the pocket or an adjacent rail.
    const probe={x:pos.x+nx*1e-5,y:pos.y+ny*1e-5};
    if(!sampleDropEdgePoint(probe,pocket)?.inside)continue;
    best={type:'pocket-capture',toi:time,ball,pocket,accepted:rejected || mode !== 'angle' || allowsPocketAngle(ball,pocket,speed)};
  }
  return best;
}
module.exports={sweepPocketCapture,pocketCaptureInset,allowsPocketAngle};

}, {"./pocketDropRegion":48}, "apps/three-game/src/core/physics/pocketCaptureSweep.js"],
52: [function(require, module, exports) {
const { BALL_RADIUS_MM } = require('../model/ballSpec');
const { dot, length, normalize, sub } = require('./vector');

const INTERNAL_BOUNCE_SPEED_THRESHOLD = 1500;
const INTERNAL_BOUNCE_SPEED_LOSS = 0.5;
const INTERNAL_BOUNCE_MAX_CONTACTS = 3;
const INTERNAL_BOUNCE_MAX_DURATION = 0.5;
const CENTER_ROLL_DURATION = 0.1;
const BOUNDARY_SLOP_MM = 0.2;

function clamp01(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

function lerp(a, b, t) {
  return a + (b - a) * clamp01(t);
}

function negate(vector) {
  return { x: -vector.x, y: -vector.y };
}

function addScaled(point, vector, scale) {
  return {
    x: point.x + vector.x * scale,
    y: point.y + vector.y * scale,
  };
}

function segmentT(point, start, end) {
  const segment = sub(end, start);
  const lenSq = dot(segment, segment);
  if (lenSq <= 0.000001) {
    return 0;
  }
  return dot(sub(point, start), segment) / lenSq;
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededNoise(seed, index) {
  let x = (seed + Math.imul(index + 1, 374761393)) >>> 0;
  x ^= x >>> 13;
  x = Math.imul(x, 1274126177) >>> 0;
  x ^= x >>> 16;
  return (x / 0xffffffff) * 2 - 1;
}

function shouldUsePocketVisualMotion(params) {
  const pocketMaterial = params.materials?.pocket || {};
  return Boolean(
    pocketMaterial.visualMotionEnabled
      ?? params.pocketVisualMotionEnabled
  );
}

function getMotionParams(params) {
  const pocketMaterial = params.materials?.pocket || {};
  return {
    directDropSpeed: pocketMaterial.directDropSpeed ?? params.pocketDirectDropSpeed ?? 520,
    centerRollDuration: pocketMaterial.dropDuration ?? params.pocketDropDuration ?? CENTER_ROLL_DURATION,
    drainDuration: pocketMaterial.drainDuration ?? params.pocketDrainDuration ?? 0.28,
    finalScale: pocketMaterial.finalScale ?? params.pocketFinalScale ?? 1,
  };
}

function getPocketMotionRender(ball) {
  const motion = ball.pocketMotion;
  if (!motion || motion.phase === 'done') {
    return null;
  }

  return {
    alpha: clamp01(motion.renderAlpha ?? 1),
    scale: Math.max(0, motion.renderScale ?? 1),
    shadowAlpha: clamp01(motion.shadowAlpha ?? 1),
  };
}

function isPocketMotionActive(ball) {
  return Boolean(ball.pocketMotion && ball.pocketMotion.phase !== 'done');
}

function isPocketMotionVisible(ball) {
  const render = getPocketMotionRender(ball);
  return Boolean(render && render.alpha > 0.01 && render.scale > 0.01);
}

function segmentsFromPolyline(points, idPrefix, role) {
  const result = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i];
    const end = points[i + 1];
    if (length(sub(end, start)) <= 0.000001) {
      continue;
    }
    result.push({
      id: `${idPrefix}:segment-${i}`,
      role,
      start,
      end,
    });
  }
  return result;
}

function pocketBoundarySegments(pocket) {
  const insidePoint = pocket.capture?.center || pocket.center;
  const rawSegments = [
    ...(pocket.lips || []).flatMap((lip) => (
      lip.segments?.length
        ? lip.segments.map((segment) => ({
          id: segment.id,
          role: 'pocket-lip',
          start: segment.start,
          end: segment.end,
        }))
        : segmentsFromPolyline(lip.points || [], lip.id, 'pocket-lip')
    )),
    ...(pocket.dropEdges || []).flatMap((edge) => segmentsFromPolyline(
      edge.points || [],
      edge.id,
      'pocket-drop-edge',
    )),
  ];

  return rawSegments.map((segment) => {
    const tangent = sub(segment.end, segment.start);
    let normal = normalize({ x: -tangent.y, y: tangent.x });
    if (dot(sub(insidePoint, segment.start), normal) < 0) {
      normal = negate(normal);
    }
    return {
      ...segment,
      normal,
    };
  });
}

function signedInsideDistance(point, segment) {
  return dot(sub(point, segment.start), segment.normal);
}

function enforceBoundaryClearance(point, segments, collisionRadius = 0) {
  const protectedDistance = collisionRadius + BOUNDARY_SLOP_MM;
  const adjusted = { ...point };

  for (let pass = 0; pass < 3; pass += 1) {
    segments.forEach((segment) => {
      const t = segmentT(adjusted, segment.start, segment.end);
      if (t < -0.05 || t > 1.05) {
        return;
      }

      const penetration = protectedDistance - signedInsideDistance(adjusted, segment);
      if (penetration <= 0) {
        return;
      }

      adjusted.x += segment.normal.x * penetration;
      adjusted.y += segment.normal.y * penetration;
    });
  }

  return adjusted;
}

function findBoundaryExit(pos, vel, dt, segments, collisionRadius = 0) {
  let best = null;
  segments.forEach((segment) => {
    const protectedDistance = collisionRadius + BOUNDARY_SLOP_MM;
    const startDistance = signedInsideDistance(pos, segment) - protectedDistance;
    const normalSpeed = dot(vel, segment.normal);
    const endDistance = startDistance + normalSpeed * dt;
    if ((startDistance < 0 && normalSpeed >= 0) || endDistance >= 0) {
      return;
    }

    const denominator = startDistance - endDistance;
    if (denominator <= 0.000001) {
      return;
    }

    const toi = Math.max(0, Math.min(dt, startDistance / denominator));
    const hitPoint = addScaled(pos, vel, toi);
    const t = segmentT(hitPoint, segment.start, segment.end);
    if (t < -0.08 || t > 1.08) {
      return;
    }

    if (!best || toi < best.toi) {
      best = {
        toi,
        segment,
        point: hitPoint,
      };
    }
  });
  return best;
}

function findContainmentExit(pos, vel, dt, pocket, collisionRadius = BALL_RADIUS_MM) {
  const center = pocket.capture?.center || pocket.center;
  const radius = Math.max(
    8,
    Math.max(
      pocket.renderRadius || 0,
      (pocket.capture?.radius || 0) * 2.25,
      56,
    ) - collisionRadius - BOUNDARY_SLOP_MM,
  );
  const offset = sub(pos, center);
  const a = dot(vel, vel);
  const b = 2 * dot(offset, vel);
  const c = dot(offset, offset) - radius * radius;

  if (a <= 0.000001) {
    return null;
  }

  if (c > 0 && dot(offset, vel) > 0) {
    return {
      toi: 0,
      segment: {
        id: `${pocket.id}:internal-containment`,
        role: 'pocket-internal-containment',
        normal: normalize(sub(center, pos)),
      },
      point: pos,
    };
  }

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) {
    return null;
  }

  const root = Math.sqrt(discriminant);
  const toi = [(-b - root) / (2 * a), (-b + root) / (2 * a)]
    .filter((candidate) => candidate >= -0.000001 && candidate <= dt + 0.000001)
    .sort((left, right) => left - right)[0];
  if (!Number.isFinite(toi)) {
    return null;
  }

  const point = addScaled(pos, vel, Math.max(0, toi));
  const normal = normalize(sub(center, point));
  if (dot(vel, normal) >= 0) {
    return null;
  }

  return {
    toi: Math.max(0, toi),
    segment: {
      id: `${pocket.id}:internal-containment`,
      role: 'pocket-internal-containment',
      normal,
    },
    point,
  };
}

function withTangentNoise(velocity, normal, seed, contactIndex) {
  const reflectedNormalSpeed = dot(velocity, normal);
  const reflected = {
    x: velocity.x - normal.x * 2 * reflectedNormalSpeed,
    y: velocity.y - normal.y * 2 * reflectedNormalSpeed,
  };
  const targetSpeed = Math.hypot(reflected.x, reflected.y) * INTERNAL_BOUNCE_SPEED_LOSS;
  const tangent = { x: -normal.y, y: normal.x };
  reflected.x += tangent.x * seededNoise(seed, contactIndex) * targetSpeed * 0.08;
  reflected.y += tangent.y * seededNoise(seed, contactIndex + 11) * targetSpeed * 0.08;
  const speed = Math.hypot(reflected.x, reflected.y);
  if (speed <= 0.000001) {
    return { x: 0, y: 0 };
  }
  return {
    x: reflected.x / speed * targetSpeed,
    y: reflected.y / speed * targetSpeed,
  };
}

function startPocketMotion(ball, pocket, params, impactSpeed) {
  if (!shouldUsePocketVisualMotion(params)) {
    return null;
  }

  const config = getMotionParams(params);
  const start = { ...ball.pos };
  const seed = hashString(`${ball.id}:${pocket.id}:${Math.round(impactSpeed)}`);
  const boundarySegments = pocketBoundarySegments(pocket);
  const shouldBounceInside = impactSpeed >= INTERNAL_BOUNCE_SPEED_THRESHOLD
    && boundarySegments.length >= 3;

  ball.pocketMotion = {
    pocketId: pocket.id,
    phase: shouldBounceInside ? 'internal-bounce' : 'center-roll',
    elapsed: 0,
    phaseElapsed: 0,
    impactSpeed,
    seed,
    internalVel: { ...ball.vel },
    internalContacts: 0,
    maxInternalContacts: INTERNAL_BOUNCE_MAX_CONTACTS,
    internalSpeedThreshold: INTERNAL_BOUNCE_SPEED_THRESHOLD,
    internalMaxDuration: INTERNAL_BOUNCE_MAX_DURATION,
    centerRollDuration: Math.max(0.001, config.centerRollDuration),
    drainDuration: config.drainDuration,
    finalScale: config.finalScale,
    renderAlpha: 1,
    renderScale: 1,
    shadowAlpha: 1,
    centerStart: shouldBounceInside ? null : start,
    centerEnd: shouldBounceInside ? null : { ...(pocket.capture?.center || pocket.center) },
    drainStart: null,
    drainEnd: null,
  };

  return ball.pocketMotion;
}

function enterCenterRoll(ball, pocket) {
  const motion = ball.pocketMotion;
  if (!motion) {
    return;
  }

  motion.phase = 'center-roll';
  motion.phaseElapsed = 0;
  motion.centerStart = { ...ball.pos };
  motion.centerEnd = { ...(pocket.capture?.center || pocket.center) };
}

function enterDrain(ball, pocket) {
  const motion = ball.pocketMotion;
  if (!motion) {
    return;
  }

  const center = pocket.capture?.center || pocket.center;
  const drainDirection = pocket.type === 'corner'
    ? { x: center.x < 0 ? 1 : -1, y: 0 }
    : { x: 1, y: 0 };
  const drainDistanceMm = (pocket.capture?.radius || pocket.renderRadius || 28)
    + (ball.radius || BALL_RADIUS_MM)
    + 2;
  motion.phase = 'drain';
  motion.phaseElapsed = 0;
  motion.drainStart = { ...ball.pos };
  motion.drainEnd = {
    x: center.x + drainDirection.x * drainDistanceMm,
    y: center.y + drainDirection.y * drainDistanceMm,
  };
}

function finishMotion(ball) {
  const motion = ball.pocketMotion;
  if (!motion) {
    return;
  }

  motion.phase = 'done';
  motion.renderAlpha = 0;
  motion.renderScale = 0;
  motion.shadowAlpha = 0;
  ball.pocketMode = 'potted';
  ball.vel = { x: 0, y: 0 };
  ball.velocity = ball.vel;
}

function stepInternalBounce(ball, pocket, dt) {
  const motion = ball.pocketMotion;
  const segments = pocketBoundarySegments(pocket);
  let remaining = dt;
  let collisionsThisStep = 0;

  motion.phaseElapsed += dt;
  ball.prevPos = { ...ball.pos };
  ball.previousPosition = ball.prevPos;

  if (!segments.length) {
    enterCenterRoll(ball, pocket);
    return;
  }

  while (remaining > 0.000001 && collisionsThisStep < 4) {
    const lineHit = findBoundaryExit(
      ball.pos,
      motion.internalVel,
      remaining,
      segments,
      ball.radius || BALL_RADIUS_MM,
    );
    const containmentHit = findContainmentExit(
      ball.pos,
      motion.internalVel,
      remaining,
      pocket,
      ball.radius || BALL_RADIUS_MM,
    );
    const hit = lineHit && containmentHit
      ? (lineHit.toi <= containmentHit.toi ? lineHit : containmentHit)
      : (lineHit || containmentHit);
    if (!hit) {
      ball.pos = addScaled(ball.pos, motion.internalVel, remaining);
      ball.pos = enforceBoundaryClearance(
        ball.pos,
        segments,
        ball.radius || BALL_RADIUS_MM,
      );
      remaining = 0;
      break;
    }

    ball.pos = addScaled(hit.point, hit.segment.normal, BOUNDARY_SLOP_MM);
    ball.pos = enforceBoundaryClearance(
      ball.pos,
      segments,
      ball.radius || BALL_RADIUS_MM,
    );
    motion.internalContacts += 1;
    collisionsThisStep += 1;
    motion.internalVel = withTangentNoise(
      motion.internalVel,
      hit.segment.normal,
      motion.seed,
      motion.internalContacts,
    );
    remaining -= hit.toi;

    if (
      Math.hypot(motion.internalVel.x, motion.internalVel.y) <= motion.internalSpeedThreshold
      || motion.internalContacts >= motion.maxInternalContacts
    ) {
      break;
    }
  }

  ball.position = ball.pos;
  motion.renderScale = 1;
  motion.renderAlpha = 1;
  motion.shadowAlpha = 0.75;

  if (
    Math.hypot(motion.internalVel.x, motion.internalVel.y) <= motion.internalSpeedThreshold
    || motion.internalContacts >= motion.maxInternalContacts
    || motion.phaseElapsed >= motion.internalMaxDuration
  ) {
    enterCenterRoll(ball, pocket);
  }
}

function stepCenterRoll(ball, pocket, dt) {
  const motion = ball.pocketMotion;
  if (!motion.centerStart) {
    enterCenterRoll(ball, pocket);
  }

  motion.phaseElapsed += dt;
  const t = clamp01(motion.phaseElapsed / Math.max(0.001, motion.centerRollDuration));
  const eased = 1 - (1 - t) * (1 - t);

  ball.prevPos = { ...ball.pos };
  ball.previousPosition = ball.prevPos;
  ball.pos = {
    x: lerp(motion.centerStart.x, motion.centerEnd.x, eased),
    y: lerp(motion.centerStart.y, motion.centerEnd.y, eased),
  };
  ball.position = ball.pos;
  motion.renderScale = 1;
  motion.renderAlpha = 1;
  motion.shadowAlpha = lerp(0.65, 0.25, eased);

  if (t >= 1) {
    enterDrain(ball, pocket);
  }
}

function stepDrain(ball, dt) {
  const motion = ball.pocketMotion;
  motion.phaseElapsed += dt;
  const t = clamp01(motion.phaseElapsed / Math.max(0.001, motion.drainDuration));
  const eased = t * t * (3 - 2 * t);

  ball.prevPos = { ...ball.pos };
  ball.previousPosition = ball.prevPos;
  ball.pos = {
    x: lerp(motion.drainStart.x, motion.drainEnd.x, eased),
    y: lerp(motion.drainStart.y, motion.drainEnd.y, eased),
  };
  ball.position = ball.pos;
  motion.renderScale = 1;
  motion.renderAlpha = 1;
  motion.shadowAlpha = 0;

  if (t >= 1) {
    finishMotion(ball);
  }
}

function stepPocketMotion(ball, pockets, params, dt) {
  const motion = ball.pocketMotion;
  if (!motion || motion.phase === 'done') {
    return;
  }

  const pocket = pockets.find((candidate) => candidate.id === motion.pocketId);
  if (!pocket) {
    finishMotion(ball);
    return;
  }

  motion.elapsed += dt;
  if (motion.phase === 'internal-bounce') {
    stepInternalBounce(ball, pocket, dt);
  } else if (motion.phase === 'center-roll') {
    stepCenterRoll(ball, pocket, dt);
  } else if (motion.phase === 'drain') {
    stepDrain(ball, dt);
  }
}

function stepPocketMotions(state, params, dt) {
  const pockets = state.tableColliderSet?.pockets || state.pockets || [];
  state.balls.forEach((ball) => stepPocketMotion(ball, pockets, params, dt));
}

module.exports = {
  getPocketMotionRender,
  isPocketMotionActive,
  isPocketMotionVisible,
  shouldUsePocketVisualMotion,
  startPocketMotion,
  stepPocketMotions,
};

}, {"../model/ballSpec":4,"./vector":37}, "apps/three-game/src/core/physics/pocketMotion.js"],
53: [function(require, module, exports) {
const { accumulateCueTravel } = require('./cueTravel');
const { samplePocketApproach } = require('./pocketApproach');
const { sweepPocketCapture } = require('./pocketCaptureSweep');
const { potBall, rejectPocketAngle } = require('./pocketCollision');
const {
  activeBalls,
  getBallRadius,
  createSweptAabb,
  createMotionBroadPhase,
} = require('./broadPhase');
const { sweepPocketJaw, jawContactRadius, resolvePocketJaw } = require('./pocketJawCollision');
const { closestPointOnSegment, sweepBallBall, sweepBallLine } = require('./continuousCollision');
const { resolveBallLineCollision } = require('./collisionResolution');
const { resolveV3CushionCollision } = require('./v3CushionCollision');
const { applyV3BallContactFriction } = require('./v3BallContact');
const { collectStaticLineIndex, collectStaticLines } = require('./physicsWorld');
const { applyTableFriction, settleBallIfSlow } = require('./friction');
const { integrateBallOrientation } = require('./spin');
const { createPhysicsEvent, registerShotEvent } = require('./physicsEvents');
const { markPocketLipContact } = require('./pocketState');
const { advancePocketEntry } = require('./pocketEntry');
const { stepPocketWorld } = require('./pocketWorld');
const { stepPocketMotions } = require('./pocketMotion');
const { dot, length, normalize, scale, sub } = require('./vector');

// These tolerances only group mathematically simultaneous contacts and stop
// numerical iteration. They do not add separation or change collision energy.
const SIMULTANEOUS_TOI_EPSILON_S = 1e-7;
const TOUCHING_DISTANCE_EPSILON_MM = 0.002;
const IMPULSE_CONVERGENCE_MM_S = 0.001;
const MAX_CLUSTER_ITERATIONS = 64;
const MAX_IMPACT_WAVES = 64;
const MAX_POSITION_CORRECTION_PASSES = 16;
// Per-state ownership prevents games, prediction workers and replays from
// sharing mutable scratch. Reset/abandoned states release it through the GC.
const collisionQueries = new WeakMap();

function invMass(ball) {
  return ball.mass > 0 ? 1 / ball.mass : 1;
}

function integrateBalls(balls, dt, exactOrientation = false, state = null, events = null) {
  balls.forEach((ball) => {
    if (ball.potted) return;
    const translating = ball.vel.x !== 0 || ball.vel.y !== 0;
    if (translating) samplePocketApproach(state, ball, dt, events);
    accumulateCueTravel(state, ball, dt);
    ball.pos.x += ball.vel.x * dt;
    ball.pos.y += ball.vel.y * dt;
    if(ball.pocketEntry && state){
      const pocket=state.tableColliderSet.pockets.find(p=>p.id===ball.pocketEntry.pocketId);
      if(pocket){advancePocketEntry(ball,pocket,dt);ball.pocketEntryAdvanced=true;}
    }
    if (ball.omega && (ball.omega.x !== 0 || ball.omega.y !== 0 || ball.omega.z !== 0))
      integrateBallOrientation(ball, dt, exactOrientation);
  });
}

function collectBallCollision(a, b, target) {
  const collision = sweepBallBall(a, b, target.dt);
  if (collision) target.collisions.push(collision);
}
function collectLineCollision(ball, line, target) {
  const collision = line.role === 'pocket-lip' ? sweepPocketJaw(ball, line, target.dt) : sweepBallLine(ball, line, target.dt);
  if (collision) target.collisions.push(collision);
}
function collisionQuery(state) {
  let query = collisionQueries.get(state);
  if (!query) { query = createMotionBroadPhase(); collisionQueries.set(state, query); }
  return query;
}
function collectCollisionCandidates(state, dt) {
  const query = collisionQuery(state);
  query.prepare(state.balls, dt); query.dt = dt;
  const balls = query.balls;
  const lines = collectStaticLines(state);
  const lineIndex = collectStaticLineIndex(state);
  const collisions = query.collisions;
  query.forEachBallPair(collectBallCollision, query);
  query.forEachBallLine(lines, lineIndex, collectLineCollision, query);
  if (state.physicsParams?.pocketCaptureMode !== 'live') {
    for (const ball of balls) for (const pocket of state.tableColliderSet?.pockets || []) {
      const crossing=sweepPocketCapture(ball,pocket,dt,state.physicsParams?.pocketCaptureMode);
      if(crossing)collisions.push(crossing);
    }
  }
  return collisions;
}

function findEarliestCollisionSet(state, dt) {
  const collisions = collectCollisionCandidates(state, dt);
  if (collisions.length === 0) return null;
  const toi = collisions.reduce((best, collision) => Math.min(best, collision.toi), Infinity);
  return {
    toi,
    collisions: collisions.filter((collision) => (
      Math.abs(collision.toi - toi) <= SIMULTANEOUS_TOI_EPSILON_S
    )),
  };
}

function ballPairKey(a, b) {
  return [String(a.id), String(b.id)].sort().join('\u0000');
}

function createBallContact(a, b) {
  const radius = (a.radius || 0) + (b.radius || 0);
  const limit = radius + TOUCHING_DISTANCE_EPSILON_MM;
  if (Math.abs(b.pos.x - a.pos.x) > limit || Math.abs(b.pos.y - a.pos.y) > limit) return null;
  const delta = sub(b.pos, a.pos);
  const distance = length(delta);
  if (distance > radius + TOUCHING_DISTANCE_EPSILON_MM) return null;
  const normal = distance > 0.000001 ? scale(delta, 1 / distance) : { x: 1, y: 0 };
  return {
    a,
    b,
    key: ballPairKey(a, b),
    normal,
    point: {
      x: a.pos.x + normal.x * (a.radius || 0),
      y: a.pos.y + normal.y * (a.radius || 0),
    },
    maxApproachSpeed: 0,
  };
}

function collectConnectedBallContacts(state, seedCollisions) {
  if (!seedCollisions.some(collision => collision.type === 'ball-ball')) return [];
  const balls = activeBalls(state.balls);
  const connectedIds = new Set();
  const contacts = new Map();
  // Positions do not change while discovering this contact graph. A visited
  // pair has already contributed its contact (or miss); do not test it again.
  const checked = balls.length <= 30 ? [] : null;

  seedCollisions.filter((collision) => collision.type === 'ball-ball').forEach((collision) => {
    connectedIds.add(collision.ballA.id);
    connectedIds.add(collision.ballB.id);
    const contact = createBallContact(collision.ballA, collision.ballB);
    if (contact) contacts.set(contact.key, contact);
  });
  if (connectedIds.size === 0) return [];

  let grew = true;
  while (grew) {
    grew = false;
    for (let i = 0; i < balls.length; i += 1) {
      for (let j = i + 1; j < balls.length; j += 1) {
        const a = balls[i];
        const b = balls[j];
        if (!connectedIds.has(a.id) && !connectedIds.has(b.id)) continue;
        if (checked) {
          const bit = 1 << j;
          if (checked[i] & bit) continue;
          checked[i] = (checked[i] || 0) | bit;
        }
        const contact = createBallContact(a, b);
        if (!contact) continue;
        if (!contacts.has(contact.key)) contacts.set(contact.key, contact);
        if (!connectedIds.has(a.id) || !connectedIds.has(b.id)) {
          connectedIds.add(a.id);
          connectedIds.add(b.id);
          grew = true;
        }
      }
    }
  }

  return [...contacts.values()].sort((left, right) => left.key.localeCompare(right.key));
}

function applyNormalImpulse(contact, magnitude) {
  const invA = invMass(contact.a);
  const invB = invMass(contact.b);
  contact.a.vel.x -= contact.normal.x * magnitude * invA;
  contact.a.vel.y -= contact.normal.y * magnitude * invA;
  contact.b.vel.x += contact.normal.x * magnitude * invB;
  contact.b.vel.y += contact.normal.y * magnitude * invB;
}

function solveImpactWave(contacts, restitution) {
  contacts.forEach((contact) => {
    contact.compressionImpulse = 0;
  });
  for (let iteration = 0; iteration < MAX_CLUSTER_ITERATIONS; iteration += 1) {
    let maxClosingSpeed = 0;
    contacts.forEach((contact) => {
      const relativeVelocity = sub(contact.b.vel, contact.a.vel);
      const normalSpeed = dot(relativeVelocity, contact.normal);
      const approachSpeed = Math.max(0, -normalSpeed);
      contact.maxApproachSpeed = Math.max(contact.maxApproachSpeed, approachSpeed);

      const inverseMassSum = invMass(contact.a) + invMass(contact.b);
      const impulseDelta = -normalSpeed / inverseMassSum;
      const nextImpulse = Math.max(0, contact.compressionImpulse + impulseDelta);
      const appliedDelta = nextImpulse - contact.compressionImpulse;
      contact.compressionImpulse = nextImpulse;
      if (Math.abs(appliedDelta) > 0) applyNormalImpulse(contact, appliedDelta);
      maxClosingSpeed = Math.max(maxClosingSpeed, approachSpeed);
    });
    if (maxClosingSpeed <= IMPULSE_CONVERGENCE_MM_S) break;
  }

  contacts.forEach((contact) => {
    applyNormalImpulse(contact, restitution * contact.compressionImpulse);
    contact.normalImpulseTotal = (contact.normalImpulseTotal || 0)
      + (1 + restitution) * contact.compressionImpulse;
    delete contact.compressionImpulse;
  });
}

function solveBallContactCluster(state, collisions, params) {
  const contacts = collectConnectedBallContacts(state, collisions);
  const restitution = params.materials?.ball?.restitution ?? params.ballRestitution;

  // A touching rack transmits impact as a sequence of contact wavefronts. Only
  // contacts that are actually closing participate in the current wave; newly
  // closing neighbours are solved in the next wave. Multiple contacts in the
  // same wave are still coupled, preserving symmetric branches in a rack.
  for (let wave = 0; wave < MAX_IMPACT_WAVES; wave += 1) {
    const activeContacts = contacts.filter((contact) => {
      const normalSpeed = dot(sub(contact.b.vel, contact.a.vel), contact.normal);
      const approachSpeed = Math.max(0, -normalSpeed);
      contact.maxApproachSpeed = Math.max(contact.maxApproachSpeed, approachSpeed);
      return approachSpeed > IMPULSE_CONVERGENCE_MM_S;
    });
    if (activeContacts.length === 0) break;
    solveImpactWave(activeContacts, restitution);
  }

  if (params.physicsModelVersion === 3) {
    const frictionMu = params.v3?.ballContactFrictionMu ?? params.ballFrictionMu;
    contacts.forEach((contact) => {
      applyV3BallContactFriction(contact, frictionMu);
      contact.a.contactMode = 'sliding';
      contact.a.isSliding = true;
      contact.b.contactMode = 'sliding';
      contact.b.isSliding = true;
    });
  }

  return contacts
    // Rule events must include soft/glancing hits. Only contacts that received
    // a solved normal impulse count; static neighbours and position correction
    // alone are not impacts. The solver already applies its convergence epsilon.
    .filter((contact) => contact.normalImpulseTotal > 0)
    .map((contact) => createPhysicsEvent('ball-hit-ball', {
      ballAId: contact.a.id,
      ballBId: contact.b.id,
      point: contact.point,
      normal: contact.normal,
      impactSpeed: contact.maxApproachSpeed,
    }));
}

function attachPocketIdToJawEvent(state, event) {
  if (!event || event.type !== 'ball-hit-pocket-jaw') return event;
  const pocket = (state.tableColliderSet.pockets || []).find((candidate) => (
    candidate.lips.some((lip) => lip.segments.some((segment) => segment.id === event.colliderId))
  ));
  if (!pocket) return event;
  const ball = state.balls.find((candidate) => candidate.id === event.ballId);
  if (ball) {
    markPocketLipContact(ball, pocket.id, event.impactSpeed, state.physicsParams);
    ball.pocketMode = 'jaw';
  }
  return { ...event, pocketId: pocket.id };
}

function resolveCollisionSet(state, collisionSet, params) {
  const events = solveBallContactCluster(state, collisionSet, params);
  collisionSet.filter((collision) => collision.type === 'ball-line').forEach((collision) => {
    const isV3Cushion = params.physicsModelVersion === 3 && collision.line.role === 'rail';
    const submergedJaw = collision.line.role === 'pocket-lip' && collision.ball.pocketEntry
      && collision.ball.pocketEntry.height < collision.ball.radius - 1e-5;
    const event = attachPocketIdToJawEvent(
      state,
      submergedJaw ? resolvePocketJaw(collision, params) : isV3Cushion
        ? resolveV3CushionCollision(collision, params, { positionNudge: false })
        : resolveBallLineCollision(collision, params, { positionNudge: false }),
    );
    if (event) events.push(event);
  });
  return events;
}

function collectCorrectionLine(_ball, line, target) { target.push(line); }

function correctNumericalPenetration(state) {
  const balls = activeBalls(state.balls);
  const lines = collectStaticLines(state);
  const lineIndex = collectStaticLineIndex(state);
  const query = collisionQuery(state);
  const cache = query.correction ||= { clean: false, snapshots: [], linesByBall: new WeakMap() };
  const previous = cache.snapshots;
  const sameBalls = cache.clean && previous.length === balls.length
    && balls.every((ball, i) => previous[i].ball === ball);
  // Only skip pairs certified by a previous pass with NO position correction.
  // Compare actual coordinates, so placement/replay edits cannot leave stale
  // sleep flags. Corrections wake both bodies immediately, in original order.
  let dirty = 0;
  const useMask = balls.length <= 30;
  for (let i = 0; i < balls.length; i++) {
    const ball = balls[i], old = previous[i];
    if (!sameBalls || old.x !== ball.pos.x || old.y !== ball.pos.y || old.radius !== ball.radius)
      dirty |= 1 << i;
  }
  cache.clean = false;
  for (let pass = 0; pass < MAX_POSITION_CORRECTION_PASSES; pass += 1) {
    let largestCorrection = 0;
    let corrected = false;
    for (let i = 0; i < balls.length; i += 1) {
      for (let j = i + 1; j < balls.length; j += 1) {
        if (useMask && !(dirty & (1 << i))) {
          const remaining = dirty & (-1 << j);
          if (!remaining) break;
          j = 31 - Math.clz32(remaining & -remaining);
        }
        const a = balls[i];
        const b = balls[j];
        const radius = (a.radius || 0) + (b.radius || 0);
        // Conservative rejection before allocating a delta and taking a root.
        // Keep the existing correction order and arithmetic for overlaps.
        if (Math.abs(b.pos.x - a.pos.x) >= radius || Math.abs(b.pos.y - a.pos.y) >= radius) continue;
        const delta = sub(b.pos, a.pos);
        const distance = length(delta);
        const penetration = (a.radius || 0) + (b.radius || 0) - distance;
        if (penetration <= TOUCHING_DISTANCE_EPSILON_MM) continue;
        const normal = distance > 0.000001 ? scale(delta, 1 / distance) : { x: 1, y: 0 };
        const invA = invMass(a);
        const invB = invMass(b);
        const correction = (penetration - TOUCHING_DISTANCE_EPSILON_MM) / (invA + invB);
        corrected = true;
        dirty |= (1 << i) | (1 << j);
        a.pos.x -= normal.x * correction * invA;
        a.pos.y -= normal.y * correction * invA;
        b.pos.x += normal.x * correction * invB;
        b.pos.y += normal.y * correction * invB;
        largestCorrection = Math.max(largestCorrection, correction);
      }
    }

    balls.forEach((ball, ballIndex) => {
      let record = cache.linesByBall.get(ball);
      if (!record) { record = { candidates: [], bounds: {} }; cache.linesByBall.set(ball, record); }
      const radius = getBallRadius(ball);
      if (record.x !== ball.pos.x || record.y !== ball.pos.y || record.radius !== radius
        || record.lines !== lines || record.index !== lineIndex) {
        record.x = ball.pos.x; record.y = ball.pos.y; record.radius = radius;
        record.lines = lines; record.index = lineIndex; record.candidates.length = 0;
        query.forEachLine(createSweptAabb(ball, 0, undefined, record.bounds), lines,
          lineIndex, collectCorrectionLine, record.candidates);
      }
      record.candidates.forEach((line) => {
        const closest = closestPointOnSegment(ball.pos, line.start, line.end);
        const delta = sub(ball.pos, closest);
        const distance = length(delta);
        const penetration = (line.role === 'pocket-lip' && ball.pocketEntry ? jawContactRadius(ball) : (ball.radius || 0)) - distance;
        if (penetration <= TOUCHING_DISTANCE_EPSILON_MM) return;
        const normal = distance > 0.000001
          ? scale(delta, 1 / distance)
          : normalize(line.normal || { x: 1, y: 0 });
        const correction = penetration - TOUCHING_DISTANCE_EPSILON_MM;
        corrected = true;
        dirty |= 1 << ballIndex;
        ball.pos.x += normal.x * correction;
        ball.pos.y += normal.y * correction;
        largestCorrection = Math.max(largestCorrection, correction);
      });
    });
    if (!corrected) cache.clean = true;
    if (largestCorrection <= TOUCHING_DISTANCE_EPSILON_MM) break;
  }
  previous.length = balls.length;
  for (let i = 0; i < balls.length; i++) {
    const ball = balls[i], saved = previous[i] ||= {};
    saved.ball = ball; saved.x = ball.pos.x; saved.y = ball.pos.y; saved.radius = ball.radius;
  }
}

function stepPhysicsWorldV2(state, params, dt) {
  state.physicsParams = params;
  const events = [];
  const balls = activeBalls(state.balls);

  balls.forEach((ball) => {
    ball.pocketEntryAdvanced=false;
    ball.prevPos = { ...ball.pos };
    ball.previousPosition = ball.prevPos;
    if (!ball.pocketEntry && (ball.vel.x !== 0 || ball.vel.y !== 0 ||
      (ball.omega && (ball.omega.x !== 0 || ball.omega.y !== 0 || ball.omega.z !== 0))))
      applyTableFriction(ball, params, dt);
  });

  let remaining = dt;
  let substep = 0;
  while (remaining > params.collisionEpsilon && substep < params.maxCollisionSubsteps) {
    const earliest = findEarliestCollisionSet(state, remaining);
    if (!earliest) {
      integrateBalls(balls, remaining, params.physicsModelVersion === 3, state, events);
      remaining = 0;
      break;
    }
    if (earliest.toi > SIMULTANEOUS_TOI_EPSILON_S) {
      integrateBalls(balls, earliest.toi, params.physicsModelVersion === 3, state, events);
      remaining -= earliest.toi;
    }
    // At coincident times the physical jaw wins. Recompute after its impulse.
    const solid=earliest.collisions.filter(c=>c.type!=='pocket-capture');
    for(const capture of earliest.collisions.filter(c=>c.type==='pocket-capture')){
      // An unrelated ball's simultaneous collision must not suppress entry.
      if(solid.some(c=>c.ball===capture.ball || c.ballA===capture.ball || c.ballB===capture.ball)) continue;
      if(!capture.ball.potted){
        if(capture.accepted===false){rejectPocketAngle(capture.ball,capture.pocket);continue;}
        const pocketEvents=[];
        potBall(state,capture.ball,capture.pocket,pocketEvents,params);
        for(const event of pocketEvents){events.push(event);registerShotEvent(state,event);}
      }
    }
    resolveCollisionSet(state, solid, params).forEach((event) => {
      events.push(event);
      registerShotEvent(state, event);
    });
    substep += 1;
  }
  if (remaining > params.collisionEpsilon) integrateBalls(balls, remaining, params.physicsModelVersion === 3, state, events);

  events.push(...stepPocketWorld(state, params, dt));
  stepPocketMotions(state, params, dt);

  // V2 deliberately skips the legacy contact impulse layer. This position-only
  // fallback is reached only for genuine floating-point penetration.
  correctNumericalPenetration(state);
  activeBalls(state.balls).forEach((ball) => { if (!ball.pocketEntry) settleBallIfSlow(ball, params); });
  state.physicsEvents = events;
  return events;
}

module.exports = {
  collectConnectedBallContacts,
  correctNumericalPenetration,
  findEarliestCollisionSet,
  solveBallContactCluster,
  stepPhysicsWorldV2,
};

}, {"./cueTravel":34,"./pocketApproach":54,"./pocketCaptureSweep":51,"./pocketCollision":46,"./broadPhase":35,"./pocketJawCollision":50,"./continuousCollision":36,"./collisionResolution":38,"./v3CushionCollision":55,"./v3BallContact":58,"./physicsWorld":33,"./friction":42,"./spin":43,"./physicsEvents":39,"./pocketState":44,"./pocketEntry":49,"./pocketWorld":45,"./pocketMotion":52,"./vector":37}, "apps/three-game/src/core/physics/physicsWorldV2.js"],
54: [function(require, module, exports) {
const APPROACH_RADIUS_MM = 157.5;
// Called on every swept free-flight segment, before jaw/cushion impulses.
function samplePocketApproach(state, ball, dt, events) {
  if (!state?.activeShot || ball.kind === 'cue' || ball.potted) return;
  const v = ball.vel, vv = v.x*v.x + v.y*v.y;
  if (vv < 1) return;
  const samples = state.activeShot.pocketApproachSamples ||= {};
  for (const pocket of state.tableColliderSet?.pockets || []) {
    const key = `${ball.id}:${pocket.id}`;
    if (samples[key]) continue;
    const center = pocket.openingDefinition?.center || pocket.center;
    const x = ball.pos.x-center.x, y = ball.pos.y-center.y;
    const toward = x*v.x+y*v.y;
    if (toward >= 0) continue;
    const c = x*x+y*y-APPROACH_RADIUS_MM**2;
    const discriminant = toward*toward-vv*c;
    if (discriminant < 0) continue;
    const t = c <= 0 ? 0 : (-toward-Math.sqrt(discriminant))/vv;
    if (t < 0 || t > dt) continue;
    const event = { type:'ball-pocket-approach', ballId:ball.id, pocketId:pocket.id,
      approachSpeedMmS:Math.sqrt(vv), approachRadiusMm:APPROACH_RADIUS_MM,
      point:{x:ball.pos.x+v.x*t,y:ball.pos.y+v.y*t} };
    samples[key] = event;
    events?.push(event);
  }
}
module.exports = { samplePocketApproach, APPROACH_RADIUS_MM };

}, {}, "apps/three-game/src/core/physics/pocketApproach.js"],
55: [function(require, module, exports) {
const { createPhysicsEvent } = require('./physicsEvents');
const { dot } = require('./vector');
const { correctedRestitution } = require('./smCushionSpeedCorrection');
const Empirical = require('./smEmpiricalCushion');

const DEFAULT_IMPULSE_STEPS = 128;
const SLIP_EPSILON_MM_S = 1e-7;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function localState(ball, normal) {
  const tangent = { x: -normal.y, y: normal.x };
  const towardCushion = { x: -normal.x, y: -normal.y };
  return {
    tangent,
    towardCushion,
    vx: dot(ball.vel, tangent),
    vy: dot(ball.vel, towardCushion),
    wx: dot(ball.omega || { x: 0, y: 0 }, tangent),
    wy: dot(ball.omega || { x: 0, y: 0 }, towardCushion),
    wz: ball.omega?.z || 0,
  };
}

function contactSlip(state, radius, sinTheta, cosTheta) {
  return {
    cushionX: state.vx + radius * (state.wy * sinTheta - state.wz * cosTheta),
    cushionYPrime: radius * state.wx - state.vy * sinTheta,
    clothX: state.vx - radius * state.wy,
    clothY: state.vy + radius * state.wx,
  };
}

// Keep the same slip equations and normalization order without allocating
// three temporary vectors at every impulse iteration.
function applyImpulseStep(state, settings, dPI) {
  const { radius, sinTheta, cosTheta, cushionMu, clothMu, inverseMass, angularScale } = settings;
  const cushionX = state.vx + radius * (state.wy * sinTheta - state.wz * cosTheta);
  const cushionYPrime = radius * state.wx - state.vy * sinTheta;
  const clothX = state.vx - radius * state.wy;
  const clothY = state.vy + radius * state.wx;
  const cushionMagnitude = Math.hypot(cushionX, cushionYPrime);
  const cushionDirectionX = cushionMagnitude <= SLIP_EPSILON_MM_S ? 0 : cushionX / cushionMagnitude;
  const cushionDirectionY = cushionMagnitude <= SLIP_EPSILON_MM_S ? 0 : cushionYPrime / cushionMagnitude;
  const dPxI = -cushionMu * cushionDirectionX * dPI;
  const dPyPrimeI = -cushionMu * cushionDirectionY * dPI;
  const dPC = Math.max(0, (sinTheta + cushionMu * cushionDirectionY * cosTheta) * dPI);
  const clothMagnitude = Math.hypot(clothX, clothY);
  const clothDirectionX = clothMagnitude <= SLIP_EPSILON_MM_S ? 0 : clothX / clothMagnitude;
  const clothDirectionY = clothMagnitude <= SLIP_EPSILON_MM_S ? 0 : clothY / clothMagnitude;
  const dPxC = -clothMu * clothDirectionX * dPC;
  const dPyC = -clothMu * clothDirectionY * dPC;
  state.vx += (dPxI + dPxC) * inverseMass;
  state.vy += (-dPI * cosTheta - dPyPrimeI * sinTheta + dPyC) * inverseMass;
  state.wx += angularScale * (dPyPrimeI + dPyC);
  state.wy += angularScale * (dPxI * sinTheta - dPxC);
  state.wz -= angularScale * dPxI * cosTheta;
}

function writeLocalState(ball, state) {
  ball.vel.x = state.tangent.x * state.vx + state.towardCushion.x * state.vy;
  ball.vel.y = state.tangent.y * state.vx + state.towardCushion.y * state.vy;
  if (!ball.omega) ball.omega = { x: 0, y: 0, z: 0 };
  ball.omega.x = state.tangent.x * state.wx + state.towardCushion.x * state.wy;
  ball.omega.y = state.tangent.y * state.wx + state.towardCushion.y * state.wy;
  ball.omega.z = state.wz;
  ball.contactMode = 'sliding';
  ball.isSliding = true;
}

function applySpinCorrection(state, radius, incomingNormalSpeed, strength) {
  if (!(strength > 0) || !(incomingNormalSpeed > 0)) return;
  const surfaceSpinSpeed = radius * state.wx;
  const removableSurfaceSpinSpeed = strength * incomingNormalSpeed;
  const correctedMagnitude = Math.max(
    0,
    Math.abs(surfaceSpinSpeed) - removableSurfaceSpinSpeed,
  );
  state.wx = Math.sign(surfaceSpinSpeed) * correctedMagnitude / radius;
}

function resolveV3CushionCollision(collision, params, options = {}) {
  const { ball, line } = collision;
  const normal = collision.normal;
  const approachSpeed = -dot(ball.vel, normal);
  if (approachSpeed <= 0) return null;

  const v3 = params.v3 || {};
  const mass = ball.mass > 0 ? ball.mass : 1;
  const radius = ball.radius || 26.25;
  const experiment = Empirical.normalize(params.testFieldSMCushionResponse);
  const incomingState = localState(ball, normal);
  const experimentRequested = params.physicsVariant !== 'SP' && experiment.mode === 'empirical';
  const unsupported = experimentRequested ? Empirical.unsupportedReason(incomingState, radius) : null;
  const useEmpirical = experimentRequested && !unsupported && line.role === 'rail';
  const noseRatio = clamp(Number(v3.cushionNoseHeightRadiusRatio) || 1.4, 1, 2);
  const sinTheta = clamp(noseRatio - 1, 0, 0.999999);
  const cosTheta = Math.sqrt(Math.max(1e-12, 1 - sinTheta * sinTheta));
  const cushionMu = Math.max(0, Number(v3.cushionContactFrictionMu) || 0);
  const clothMu = Math.max(0, Number(v3.clothSlidingMu) || 0);
  const energeticRestitution = correctedRestitution(
    clamp(Number(v3.cushionEnergeticRestitution) || 0, 0, 1),
    approachSpeed,
    params.physicsVariant === 'SP' ? 0 : (params.testFieldSMCushionSpeedCorrectionStrength ?? v3.cushionSpeedCorrectionStrength),
  );
  const spinCorrectionStrength = clamp(
    Number(v3.cushionSpinCorrectionStrength) || 0,
    0,
    2,
  );
  const impulseSteps = Math.round(clamp(
    Number(v3.cushionImpulseSteps) || DEFAULT_IMPULSE_STEPS,
    16,
    20000,
  ));
  const state = localState(ball, normal);
  const incomingVy = state.vy;
  const estimatedCompressionImpulse = mass * incomingVy / Math.max(cosTheta, 0.1);
  const dPI = estimatedCompressionImpulse / impulseSteps;
  const settings = { radius, sinTheta, cosTheta, cushionMu, clothMu,
    inverseMass: 1 / mass, angularScale: 5 / (2 * mass * radius) };
  let compressionWork = 0;
  let recoveryWork = 0;
  let compressed = false;
  let previousNormalSpeed = state.vy * cosTheta;
  let iterations = 0;

  for (; iterations < impulseSteps * 4; iterations += 1) {
    applyImpulseStep(state, settings, dPI);
    const normalSpeed = state.vy * cosTheta;
    const averageNormalSpeed = (previousNormalSpeed + normalSpeed) / 2;
    if (!compressed) {
      if (averageNormalSpeed > 0) compressionWork += averageNormalSpeed * dPI;
      if (normalSpeed <= 0) compressed = true;
    } else {
      recoveryWork += Math.max(0, -averageNormalSpeed) * dPI;
      if (recoveryWork >= energeticRestitution * energeticRestitution * compressionWork) break;
    }
    previousNormalSpeed = normalSpeed;
  }

  let response;
  if (useEmpirical) {
    response = Empirical.applyResponse(incomingState, {
      radius, mass, inertia: ball.inertia || .4 * mass * radius * radius,
    }, experiment, state);
    Object.assign(state, incomingState);
  } else applySpinCorrection(
    state,
    radius,
    incomingVy * cosTheta,
    spinCorrectionStrength,
  );
  writeLocalState(ball, state);
  if (options.positionNudge !== false) {
    ball.pos.x += normal.x * params.positionSlop;
    ball.pos.y += normal.y * params.positionSlop;
  }

  if (approachSpeed < (params.minCollisionEventSpeed ?? 0)) return null;
  return createPhysicsEvent('ball-hit-rail', {
    ballId: ball.id,
    colliderId: line.id,
    point: collision.point,
    normal,
    impactSpeed: approachSpeed,
    role: line.role,
    material: line.material,
    cushionModel: useEmpirical ? 'sm-empirical-oblique-v2' : 'mathavan-2010-cumulative-impulse',
    impulseIterations: iterations + 1,
    highSpeedCalibrated: false,
    ...(useEmpirical ? response : experimentRequested ? { empiricalFallback: unsupported || 'non-straight-rail' } : {}),
  });
}

module.exports = {
  applySpinCorrection,
  contactSlip,
  resolveV3CushionCollision,
};

}, {"./physicsEvents":39,"./vector":37,"./smCushionSpeedCorrection":56,"./smEmpiricalCushion":57}, "apps/three-game/src/core/physics/v3CushionCollision.js"],
56: [function(require, module, exports) {
// SM cushion calibration. Enabled by an explicit strength parameter; absent means off.
// Speeds are horizontal rail-normal m/s.
// 2026-10-21 user revision: approx. 90% at <=1 m/s and 80% at >=7 m/s.
// Coefficient knots are calibrated for the current .14/.17, 64-step SM solver.
// These are engineering targets, not the paper's original fitted curve.
const KNOTS = Object.freeze([
  [1, .95], [2, .94], [3, .92], [3.5, .91], [5, .865], [7, .83],
].map(Object.freeze));
const secants = KNOTS.slice(1).map((p, i) => (p[1] - KNOTS[i][1]) / (p[0] - KNOTS[i][0]));
// Monotone cubic Hermite slopes; flat endpoints join the constant tails smoothly.
const slopes = KNOTS.map((p, i) => {
  if (i === 0 || i === KNOTS.length - 1) return 0;
  const left = p[0] - KNOTS[i - 1][0], right = KNOTS[i + 1][0] - p[0];
  const w1 = 2 * right + left, w2 = right + 2 * left;
  return (w1 + w2) / (w1 / secants[i - 1] + w2 / secants[i]);
});

function normalizeStrength(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
}

function calibratedRestitution(normalSpeedMmS) {
  const speed = Math.max(0, Number(normalSpeedMmS) || 0) / 1000;
  if (speed <= KNOTS[0][0]) return KNOTS[0][1];
  const last = KNOTS.length - 1;
  if (speed >= KNOTS[last][0]) return KNOTS[last][1];
  const i = KNOTS.findIndex((p, j) => j < last && speed >= p[0] && speed < KNOTS[j + 1][0]);
  const [x, y] = KNOTS[i], [nextX, nextY] = KNOTS[i + 1];
  const h = nextX - x, t = (speed - x) / h;
  return (2 * t ** 3 - 3 * t ** 2 + 1) * y
    + (t ** 3 - 2 * t ** 2 + t) * h * slopes[i]
    + (-2 * t ** 3 + 3 * t ** 2) * nextY
    + (t ** 3 - t ** 2) * h * slopes[i + 1];
}

function correctedRestitution(base, normalSpeedMmS, strength) {
  const k = normalizeStrength(strength);
  if (k === 0) return base;
  return Math.max(0, Math.min(1, base + k * (calibratedRestitution(normalSpeedMmS) - 0.95)));
}

module.exports = { KNOTS, normalizeStrength, calibratedRestitution, correctedRestitution };

}, {}, "apps/three-game/src/core/physics/smCushionSpeedCorrection.js"],
57: [function(require, module, exports) {
// Engineering response, not a reconstruction of the cushion deformation.
// Straight rails: empirical normal response + SM tangential friction response.
// The oblique extension is an engineering experiment, not measured calibration.
const DEFAULTS = Object.freeze({ mode: 'current', stunRoll: .25, spinLimit: 1.4,
  spinSpeed: .055, lowRetention: .90, highRetention: .80 });
function bounded(value, min, max, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}
function normalize(values = {}) {
  values = values && typeof values === 'object' ? values : {};
  return { mode: values.mode === 'empirical' ? 'empirical' : 'current',
    stunRoll: bounded(values.stunRoll, 0, .5, DEFAULTS.stunRoll),
    spinLimit: bounded(values.spinLimit, 1, 3, DEFAULTS.spinLimit),
    spinSpeed: bounded(values.spinSpeed, 0, .2, DEFAULTS.spinSpeed),
    lowRetention: bounded(values.lowRetention, .5, 1, DEFAULTS.lowRetention),
    highRetention: bounded(values.highRetention, .5, 1, DEFAULTS.highRetention) };
}
function unsupportedReason(s) {
  if (!(s.vy > 0)) return 'not-approaching';
  return null;
}
function naturalRetention(speedMmS, values) {
  const p = normalize(values), t = Math.max(0, Math.min(1, (speedMmS / 1000 - 1) / 6));
  return p.lowRetention + (p.highRetention - p.lowRetention) * t * t * (3 - 2 * t);
}
function energy(s, mass, inertia) {
  return .5 * mass * (s.vx ** 2 + s.vy ** 2)
    + .5 * inertia * (s.wx ** 2 + s.wy ** 2 + s.wz ** 2);
}
function applyResponse(s, { radius, mass, inertia }, values, tangentialResponse = s) {
  const p = normalize(values), before = energy(s, mass, inertia), speed = s.vy;
  const spin = -radius * s.wx / speed;
  const impulse = Math.max(-p.spinLimit, Math.min(p.spinLimit, p.stunRoll + (1 - p.stunRoll) * spin));
  const desired = Math.max(0, (naturalRetention(speed, p) + p.spinSpeed * (spin - 1)) * speed);
  // Transfer the SM solver's coupled tangential velocity / horizontal rolling /
  // side spin together. Never reset side spin to zero or align it to the path.
  s.vx = tangentialResponse.vx;
  s.wy = tangentialResponse.wy;
  s.wz = tangentialResponse.wz;
  s.wx = (impulse - spin) * speed / radius;
  // Extremely strong side spin or grazing impacts may leave insufficient energy
  // for the proposed tangential response after the normal spin conversion.
  const tangentEnergy = .5 * mass * s.vx ** 2 + .5 * inertia * (s.wy ** 2 + s.wz ** 2);
  const tangentBudget = Math.max(0, before - .5 * inertia * s.wx ** 2);
  const tangentScale = tangentEnergy > tangentBudget ? Math.sqrt(tangentBudget / tangentEnergy) : 1;
  s.vx *= tangentScale; s.wy *= tangentScale; s.wz *= tangentScale;
  // Preserve the requested angular impulse; limit translation by the FULL
  // initial energy budget (rather than scaling spin after bounding impulse).
  const remaining = before - .5 * mass * s.vx ** 2
    - .5 * inertia * (s.wx ** 2 + s.wy ** 2 + s.wz ** 2);
  const limit = Math.sqrt(Math.max(0, 2 * remaining / mass));
  s.vy = -Math.min(desired, limit);
  return { incomingSpinRatio: spin, energyLimited: desired > limit || tangentScale < 1,
    energyRetention: before > 0 ? energy(s, mass, inertia) / before : 0 };
}
module.exports = { DEFAULTS, normalize, unsupportedReason, naturalRetention, applyResponse };

}, {}, "apps/three-game/src/core/physics/smEmpiricalCushion.js"],
58: [function(require, module, exports) {
const { dot, sub } = require('./vector');

function invMass(ball) {
  return ball.mass > 0 ? 1 / ball.mass : 1;
}

function inertia(ball) {
  if (ball.inertia > 0) return ball.inertia;
  const mass = ball.mass > 0 ? ball.mass : 1;
  const radius = ball.radius || 26.25;
  return (2 / 5) * mass * radius * radius;
}

function applyV3BallContactFriction(contact, frictionMu) {
  const mu = Math.max(0, Number(frictionMu) || 0);
  const normalImpulse = Math.max(0, Number(contact.normalImpulseTotal) || 0);
  if (mu <= 0 || normalImpulse <= 0) return { horizontalImpulse: 0, verticalImpulse: 0 };

  const { a, b, normal } = contact;
  const tangent = { x: -normal.y, y: normal.x };
  const radiusA = a.radius || 26.25;
  const radiusB = b.radius || 26.25;
  const inertiaA = inertia(a);
  const inertiaB = inertia(b);
  const relativeVelocity = sub(b.vel, a.vel);
  const horizontalSlip = dot(relativeVelocity, tangent)
    - radiusA * (a.omega?.z || 0)
    - radiusB * (b.omega?.z || 0);
  const verticalSlip = radiusA * dot(a.omega || { x: 0, y: 0 }, tangent)
    + radiusB * dot(b.omega || { x: 0, y: 0 }, tangent);
  const horizontalDenominator = invMass(a) + invMass(b)
    + radiusA * radiusA / inertiaA
    + radiusB * radiusB / inertiaB;
  // The tabletop constrains vertical translation during an ordinary snooker
  // collision, but the vertical contact impulse still changes horizontal spin.
  const verticalDenominator = radiusA * radiusA / inertiaA
    + radiusB * radiusB / inertiaB;
  let horizontalImpulse = -horizontalSlip / horizontalDenominator;
  let verticalImpulse = -verticalSlip / verticalDenominator;
  const requestedMagnitude = Math.hypot(horizontalImpulse, verticalImpulse);
  const maxMagnitude = mu * normalImpulse;
  if (requestedMagnitude > maxMagnitude && requestedMagnitude > 0) {
    const scale = maxMagnitude / requestedMagnitude;
    horizontalImpulse *= scale;
    verticalImpulse *= scale;
  }

  const invA = invMass(a);
  const invB = invMass(b);
  a.vel.x -= tangent.x * horizontalImpulse * invA;
  a.vel.y -= tangent.y * horizontalImpulse * invA;
  b.vel.x += tangent.x * horizontalImpulse * invB;
  b.vel.y += tangent.y * horizontalImpulse * invB;
  if (!a.omega) a.omega = { x: 0, y: 0, z: 0 };
  if (!b.omega) b.omega = { x: 0, y: 0, z: 0 };
  a.omega.z -= radiusA * horizontalImpulse / inertiaA;
  b.omega.z -= radiusB * horizontalImpulse / inertiaB;
  a.omega.x += tangent.x * radiusA * verticalImpulse / inertiaA;
  a.omega.y += tangent.y * radiusA * verticalImpulse / inertiaA;
  b.omega.x += tangent.x * radiusB * verticalImpulse / inertiaB;
  b.omega.y += tangent.y * radiusB * verticalImpulse / inertiaB;

  return { horizontalImpulse, verticalImpulse };
}

module.exports = {
  applyV3BallContactFriction,
};

}, {"./vector":37}, "apps/three-game/src/core/physics/v3BallContact.js"],
59: [function(require, module, exports) {
// Independent SP test-field parameters. No SM physical defaults are consumed.
const DEFINITIONS = [
 ['gravityMmS2','重力加速度（毫米/秒²）',9800,1000,20000,10],
 ['maxCueElevationDeg','最大抬杆角度',30,2.5,85,.5],
 ['maxTipOffsetRatio','最大打点 / 球半径',.5,.1,.6,.01],
 ['spMaxCueSpeedMS','最大杆速（米/秒）',5.333333333333333,.1,10.8,.01],
 ['spCueRestitution','球杆击球恢复系数',.75,.5,1,.01],
 ['spCueWeightKg','球杆重量属性（千克）',.25,.15,.5,.005],
 ['spCueEndMassKg','前节等效端部质量（千克）',.02,.001,.1,.001],
 ['spCueTipDiameterMm','杆头直径（毫米）',9.5,7,14,.1],
 ['spCuePowerRating','球杆力量属性',100,1,100,1],
 ['spBallMassKg','球质量（千克）',.141,.1,.2,.001],
 ['spBallRestitution','球球恢复系数',.95,0,1,.005],
 ['spBallTangentialFactor','球球切向相对速度倍率',.95,0,1,.005],
 ['spBallFrictionBase','普通球球摩擦曲线底值',.009951,0,.15,.001],
 ['spClusterFrictionBase','球堆碰撞摩擦曲线底值',.02,0,.15,.001],
 ['spBallFrictionAmplitude','球球摩擦曲线幅度',.108,0,.3,.001],
 ['spBallFrictionExponent','球球摩擦曲线指数',-1.088,-5,0,.01],
 ['spPocketFaceRestitution','袋口胶边恢复系数',.7,0,1,.005],
 ['spPocketLiningRestitution','袋内挡边恢复系数',.1,0,1,.005],
 ['spPocketLiningFriction','袋内挡边摩擦系数',.1,0,.5,.005],
 ['spSlidingMu','台呢滑动摩擦系数',.21068874172185434,0,.5,.001],
 ['spRollingMu','台呢顺向滚动阻力系数',.00876666666666667,0,.03,.0001],
 ['spReverseRollingMu','台呢反向滚动阻力系数',.008866666666666665,0,.03,.0001],
 ['spCushionRestitution','库边恢复系数',.715,0,1,.005],
 ['spCushionFrictionMultiplier','库边摩擦倍率（相对台呢）',1.1,0,3,.01],
 ['spCushionHeightMm','有效库边接触高度（毫米）',29,26.3,42,.1],
 ['spCushionSpinFriction','库边旋转摩擦系数',.035,0,.3,.001],
 ['spCushionImpulseFactor','库边旋转冲量倍率',1,0,2,.01],
 ['spCushionHeightFactor','库边高度力矩倍率',.18,0,1,.01],
 ['spClothWear','台呢磨损（旋转冲量修正）',40,0,100,1],
 ['spSideSpinFactor','台呢侧旋衰减倍率',.8,0,2,.01],
 ['spFloorRestitution','落台恢复系数',.55,0,.9,.01],
 ['spUpwardRetention','库边向上速度保留率',.7,0,1,.01],
 ['spDownwardRetention','库边向下速度保留率',.28,0,1,.01],
];
const SP_PARAMETERS=DEFINITIONS.map(([id,nameZh,value,min,max,step])=>({id,nameZh,label:id,group:'SP · Snooker Classic / No.10',type:'number',default:value,min,max,step}));
const SP_DEFAULTS=Object.freeze(Object.fromEntries(DEFINITIONS.map(([id,,v])=>[id,v])));
function normalizeSP(values={}) {
 const out={...SP_DEFAULTS};
 for(const p of SP_PARAMETERS){const n=Number(values[p.id]??p.default);out[p.id]=Number.isFinite(n)?Math.min(p.max,Math.max(p.min,n)):p.default;}
 // Import earlier SP presets' maximum speed; retain the public display alias.
 if(values.spMaxCueSpeedMS===undefined&&Number.isFinite(values.maxCenterBallSpeedMmS))out.spMaxCueSpeedMS=Math.min(10.8,Math.max(.1,values.maxCenterBallSpeedMmS/1312.5));
 out.maxCenterBallSpeedMmS=out.spMaxCueSpeedMS*1312.5;
 return out;
}
module.exports={SP_PARAMETERS,SP_DEFAULTS,normalizeSP};

}, {}, "apps/three-game/src/core/physics/sp/config.js"],
60: [function(require, module, exports) {
// Independent SP world. Shared modules below provide geometry, rotation and
// rule-event bookkeeping only; all physical response comes from ./sp kernels.
const {sweepBallLine}=require('../continuousCollision');
const {createStaticLineIndex,getPotentialBallPairs,getPotentialBallLinePairs}=require('../broadPhase');
const {integrateBallOrientation}=require('../spin');
const {registerShotEvent}=require('../physicsEvents');
const {accumulateCueTravel}=require('../cueTravel');
const {ballResponse}=require('./ballContact');
const {cushion}=require('./cushion');
const {freeStep,floorImpact}=require('./freeMotion');
const {readBody,writeBody}=require('./body');
const {openingState,updatePocketSupport}=require('./pockets');
const EPS=1e-9;
function ballContact(a,b,dt,tolerance=0){
 const p=[b.pos.x-a.pos.x,b.pos.y-a.pos.y,(b.spHeightMm||0)-(a.spHeightMm||0)];
 const v=[b.vel.x-a.vel.x,b.vel.y-a.vel.y,(b.spVerticalSpeedMmS||0)-(a.spVerticalSpeedMmS||0)];
 const R=a.radius+b.radius+tolerance,A=v.reduce((s,x)=>s+x*x,0),B=p.reduce((s,x,i)=>s+x*v[i],0),C=p.reduce((s,x)=>s+x*x,0)-R*R;
 if(A<1e-12||B>=-1e-9)return null;
 let toi=0;if(C>0){const disc=B*B-A*C;if(disc<0)return null;toi=(-B-Math.sqrt(disc))/A;}
 if(toi< -EPS||toi>dt+EPS)return null;
 const delta=p.map((x,i)=>x+v[i]*toi),l=Math.hypot(...delta)||1,normal=delta.map(x=>x/l);
 return {type:'ball-ball',toi:Math.max(0,toi),a,b,normal,impactSpeed:-B/(Math.hypot(...p)||1)};
}
function distance(a,b){return Math.hypot(b.pos.x-a.pos.x,b.pos.y-a.pos.y,(b.spHeightMm||0)-(a.spHeightMm||0));}
function tagTouchingGroups(balls,cueId){
 for(const b of balls)b.spContactFlag=0;
 const visited=new Set();
 for(const start of balls){if(start.id===cueId||visited.has(start))continue;
  const group=[start];visited.add(start);
  for(let i=0;i<group.length;i++)for(const b of balls){if(b.id===cueId||visited.has(b))continue;
   if(distance(group[i],b)-group[i].radius-b.radius<.01){group.push(b);visited.add(b);}
  }
  if(group.length>=2)for(const b of group)b.spContactFlag=group.length;
 }
}
// 0x4fd5d0: directional spherical-cap weight, recursively accumulated and
// bounded to 1.65 ball masses. This is distinct from the connected-group size.
function effectiveRackMass(start,direction,balls,p,visited=new Set()){
 const mass=p.spBallMassKg??.141;let total=mass;
 for(const b of balls){if(b===start||visited.has(b)||b.potted)continue;
  const dx=b.pos.x-start.pos.x,dy=b.pos.y-start.pos.y,dz=(b.spHeightMm||0)-(start.spHeightMm||0),d=Math.hypot(dx,dy,dz);
  if(d>start.radius+b.radius+1||d===0)continue;
  const normal=[dx/d,dy/d,dz/d],cos=normal.reduce((s,x,i)=>s+x*direction[i],0);
  if(cos<=0)continue;
  const sin=Math.sqrt(Math.max(0,1-cos*cos)),weight=1.1*(2+sin)*(1-sin)**2/4;
  let neighbourMass=mass;
  if(b.spContactFlag>=2){visited.add(start);neighbourMass=effectiveRackMass(b,normal,balls,p,visited);}
  total+=weight*neighbourMass;
 }
 return Math.min(1.65*mass,total);
}
function emit(state,events,event){registerShotEvent(state,event);events.push(event);}
function resolvePair(state,hit,p,events,clusterContact=false){
 const {a,b,normal}=hit;
 const bodyA=readBody(a,p),bodyB=readBody(b,p);
 if(!clusterContact){
  if(a.id===state.cueBallId&&b.spContactFlag>=2)bodyB.impactMass=effectiveRackMass(b,normal,state.balls,p,new Set([a]));
  else if(b.id===state.cueBallId&&a.spContactFlag>=2)bodyA.impactMass=effectiveRackMass(a,normal.map(x=>-x),state.balls,p,new Set([b]));
 }
 const out=ballResponse(bodyA,bodyB,normal,{...p,clusterContact});
 writeBody(a,out.a);writeBody(b,out.b);
 if(a.spVerticalSpeedMmS!==0)a.spSupported=false;if(b.spVerticalSpeedMmS!==0)b.spSupported=false;
 emit(state,events,{type:'ball-hit-ball',ballAId:a.id,ballBId:b.id,point:{x:a.pos.x+normal[0]*a.radius,y:a.pos.y+normal[1]*a.radius},normal:{x:normal[0],y:normal[1]},impactSpeed:hit.impactSpeed,physicsVariant:'SP'});
}
function resolveBallNetwork(state,hit,p,events){
 const grouped=hit.a.spContactFlag>=2||hit.b.spContactFlag>=2;
 resolvePair(state,hit,p,events,false);
 if(!grouped)return;
 // Original 0x4f79f0 uses a queue, processes forward contacts first and limits
 // each body's visits to 100. It repeatedly calls the pair's cluster branch.
 const queue=[hit.a,hit.b],visits=new Map(),balls=state.balls.filter(b=>!b.potted);
 const groupFlag=Math.max(hit.a.spContactFlag,hit.b.spContactFlag);
 hit.a.spContactFlag=hit.b.spContactFlag=groupFlag;
 for(let head=0;head<queue.length;head++){
  const a=queue[head],n=(visits.get(a)||0)+1;visits.set(a,n);if(n>100)continue;
  const candidates=[];
  for(const b of balls){if(a===b||b.spContactFlag<2)continue;
   const h=ballContact(a,b,0,.1);if(h&&h.impactSpeed>1e-5){
    const speed=Math.hypot(a.vel.x,a.vel.y,a.spVerticalSpeedMmS||0)||1;
    h.angle=Math.acos(Math.max(-1,Math.min(1,(a.vel.x*h.normal[0]+a.vel.y*h.normal[1]+(a.spVerticalSpeedMmS||0)*h.normal[2])/speed)));
    candidates.push(h);
   }
  }
  candidates.sort((a,b)=>a.angle-b.angle);
  for(const h of candidates){const current=ballContact(h.a,h.b,0,.1);if(!current||current.impactSpeed<=1e-5)continue;resolvePair(state,current,p,events,true);if((visits.get(h.b)||0)<100)queue.push(h.b);}
 }
 for(const b of balls)b.spContactFlag=0;
}
function resolveLine(state,hit,p,events){
 const {ball,normal,line}=hit,n=[normal.x,normal.y],t=[n[1],-n[0]];
 const body=readBody(ball,p),local=a=>[a[0]*t[0]+a[1]*t[1],a[0]*n[0]+a[1]*n[1],a[2]],world=a=>[a[0]*t[0]+a[1]*n[0],a[0]*t[1]+a[1]*n[1],a[2]];
 const approach=-(ball.vel.x*n[0]+ball.vel.y*n[1]);if(approach<=0)return;
 const jaw=line.role!=='rail';
 const material=jaw?{...p,spCushionRestitution:p.spPocketFaceRestitution??.7,spCushionFrictionMultiplier:.9}:p;
 const output=cushion(local(body.v),local(body.w),body.r,body.m,{...material,spCushionHeightMm:p.spCushionHeightMm-(ball.spHeightMm||0)});
 writeBody(ball,{...body,v:world(output.v),w:world(output.w),supported:false});
 emit(state,events,{type:jaw?'ball-hit-pocket-jaw':'ball-hit-rail',ballId:ball.id,colliderId:line.id,point:hit.point,normal,impactSpeed:approach,role:line.role,material:line.material,cushionModel:'sp-1.10.4-port',physicsVariant:'SP'});
}
function findContact(state,balls,lines,lineIndex,dt,p){
 let best=null;const consider=h=>{if(h&&(!best||h.toi<best.toi-EPS))best=h;};
 for(const [a,b] of getPotentialBallPairs(balls,dt))consider(ballContact(a,b,dt));
 for(const [ball,line] of getPotentialBallLinePairs(balls,lines,dt,lineIndex)){
  const dz=p.spCushionHeightMm-(ball.spHeightMm||0)-ball.radius;
  if(Math.abs(dz)>=ball.radius)continue;
  const radius=Math.sqrt(ball.radius*ball.radius-dz*dz),proxy={...ball,radius};
  const hit=sweepBallLine(proxy,line,dt);if(hit)consider({...hit,ball});
 }
 for(const ball of balls){
  if(openingState(ball,state.tableColliderSet?.pockets||[]))continue;
  const h=ball.spHeightMm||0,v=ball.spVerticalSpeedMmS||0;
  if(v<0){const toi=h>0?h/-v:0;if(toi<=dt+EPS)consider({type:'floor',ball,toi});}
 }
 return best;
}
function advance(state,balls,dt,p,events){
 if(dt<=0)return;
 for(const ball of balls){if(ball.potted)continue;
  accumulateCueTravel(state,ball,dt);integrateBallOrientation(ball,dt,true);
  const unsupported=openingState(ball,state.tableColliderSet?.pockets||[]);
  const b=readBody(ball,p);if(unsupported||b.p[2]>EPS||b.v[2]!==0)b.supported=false;
  const out=freeStep(b,dt,p,(p.gravityMmS2??9800)/1000);writeBody(ball,out);
  updatePocketSupport(state,ball,{sp:p},events);
 }
}
function stepSPWorld(state,params,dt){
 const p=params.sp,events=[],balls=state.balls.filter(b=>!b.potted),colliders=state.tableColliderSet;
 const lines=colliders?(colliders._spLines||(colliders._spLines=[...(colliders.rails||[]),...(colliders.pocketLips||[]).flatMap(l=>l.segments||[])])):[];
 const lineIndex=colliders?(colliders._spLineIndex||(colliders._spLineIndex=createStaticLineIndex(lines))):null;
 state.physicsParams=params;
 for(const b of balls){b.prevPos={...b.pos};b.previousPosition=b.prevPos;delete b.pocketEntry;}
 tagTouchingGroups(balls,state.cueBallId);
 let remaining=dt,iterations=0;
 while(remaining>EPS&&iterations++<256){
  const active=balls.filter(b=>!b.potted),hit=findContact(state,active,lines,lineIndex,remaining,p);
  if(!hit){advance(state,active,remaining,p,events);remaining=0;break;}
  if(hit.toi>EPS){advance(state,active,hit.toi,p,events);remaining-=hit.toi;}
  if(hit.type==='ball-ball')resolveBallNetwork(state,hit,p,events);
  else if(hit.type==='floor')writeBody(hit.ball,floorImpact(readBody(hit.ball,p),p));
  else resolveLine(state,hit,p,events);
 }
 if(remaining>EPS)advance(state,balls,remaining,p,events);
 state.physicsEvents=events;
 return events;
}
module.exports={stepSPWorld,ballContact,tagTouchingGroups,effectiveRackMass};

}, {"../continuousCollision":36,"../broadPhase":35,"../spin":43,"../physicsEvents":39,"../cueTravel":34,"./ballContact":61,"./cushion":62,"./freeMotion":63,"./body":64,"./pockets":65}, "apps/three-game/src/core/physics/sp/world.js"],
61: [function(require, module, exports) {
// Recovered arithmetic of 外部参考实现 1.10.4 0x4f5850 / 0x4f65b0.
// SI units. Original binary outputs are retained in fixtures/sp/ball-original.json.
const add=(a,b)=>a.map((x,i)=>x+b[i]),scale=(a,s)=>a.map(x=>x*s);
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=a=>{const l=Math.hypot(...a);return l?scale(a,1/l):[0,0,0];};
function ballResponse(a,b,normal,p={}) {
 // Original chooses the faster body as primary, including its friction curve.
 if(Math.hypot(...b.v)>Math.hypot(...a.v)){
  const r=ballResponse(b,a,scale(normal,-1),p);return {a:r.b,b:r.a};
 }
 const n=scale(unit(normal),-1),t=Math.hypot(n[0],n[1])>1e-8?unit([n[1],-n[0],0]):[1,0,0];
 const basis=[unit(cross(t,n)),t,n],local=v=>basis.map(r=>dot(r,v));
 const world=v=>[0,1,2].map(i=>v.reduce((s,x,j)=>s+x*basis[j][i],0));
 const av=local(a.v),bv=local(b.v),aw=local(a.w),bw=local(b.w),R=a.r;
 const ma=a.impactMass??a.m??.141,mb=b.impactMass??b.m??.141,targetMass=b.m??.141,e=p.spBallRestitution??.95;
 const an=[av[0],av[1],(ma*av[2]+mb*bv[2]+e*mb*(bv[2]-av[2]))/(ma+mb)];
 const bn=[bv[0],bv[1],(ma*av[2]+targetMass*bv[2]+e*ma*(av[2]-bv[2]))/(ma+targetMass)];
 aw[2]=bw[2]=0;
 const k=[0,0,1],surface=cross(k,add(scale(aw,R),scale(bw,b.r)));
 const vt=[av[0]-bv[0],av[1]-bv[1],0],eq=scale([surface[1],surface[0],0],2/(R+b.r));
 const relative=add(scale(vt,(p.spBallTangentialFactor??.95)*((b.contactFlag||0)>=2?.55:1)),surface);
 const wear=((a.wear||0)+(b.wear||0))/2;
 const mu=Math.fround(((p.clusterContact?(p.spClusterFrictionBase??.02):(p.spBallFrictionBase??.009951))+(p.spBallFrictionAmplitude??.108)*Math.exp((p.spBallFrictionExponent??-1.088)*Math.hypot(...relative)))*(1+wear*.85/100));
 let cv=scale(vt,-1),cw=scale(eq,-1);
 const slip=add(cv,scale(cross(k,cw),R)),mag=Math.hypot(...slip),acc=Math.abs(bv[2]-av[2])/.0005;
 if(mag>1e-10&&acc*mu>0){
  const dt=Math.min(2*mag/(7*acc*mu),.001),u=scale(slip,1/mag);
  cw=add(cw,scale(cross(k,u),acc*5*dt*mu/(2*R)));
  cv=add(cv,scale(u,-dt*acc*mu));
 }
 let dw=world(add(cw,eq).map((x,i)=>i===0?-x:x));
 const speed=Math.hypot(...a.v);
 const fh=(a.contactFlag||0)>=2?.2:(b.contactFlag||0)>=2?Math.max(.8,Math.min(3.1,.8+(speed-1.5)*2.3/2.5)):1;
 const fz=(a.contactFlag||0)>=2?1:(b.contactFlag||0)>=2?Math.max(.2,Math.min(1.4,.2+(speed-1.5)*1.2/2.5)):1;
 dw=dw.map((x,i)=>x*(i===2?fz:fh));
 const dv=scale(add(cv,vt),.5),boost=Math.abs(b.height||0)<.001?1.255:1;
 const out={a:{v:world(add(an,scale(dv,-1))),w:add(a.w,dw.map((x,i)=>x*.5*(i===2?1:boost)))},b:{v:world(add(bn,dv)),w:add(b.w,scale(dw,.5))}};
 // Original airborne-primary / grounded-cluster vertical transfer.
 if((a.height||0)>.0001&&Math.abs(b.height||0)<1e-6&&(b.contactFlag||0)>2){
  out.a.v[2]-=out.b.v[2]*Math.max(.5,Math.min(4,4-Math.abs(out.b.v[2])*3.5/1.2));
 }
 if(Math.hypot(...out.a.v)<.015&&Math.hypot(...out.a.w)*R<.015&&Math.hypot(...out.b.v)<.015&&Math.hypot(...out.b.w)*b.r<.015){
  out.a={v:[0,0,0],w:[0,0,0]};out.b={v:[0,0,0],w:[0,0,0]};
 }
 return out;
}
module.exports={ballResponse};

}, {}, "apps/three-game/src/core/physics/sp/ballContact.js"],
62: [function(require, module, exports) {
// Arithmetic port of 1.10.4's default snooker straight-rail function 0x4fbea0.
// Source evidence: diagnostics/外部参考实现-1.10.4-analysis-20261020/deep-analysis.
// SI internally; SP world handles table geometry and contact scheduling.
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),add=(a,b)=>a.map((x,i)=>x+b[i]),mul=(a,s)=>a.map(x=>x*s);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=a=>Math.hypot(...a)>0?mul(a,1/Math.hypot(...a)):[0,0,0];
function cushion(v,w,R,m,sp) {
 const h=sp.spCushionHeightMm/1000,s=Math.min(.999999,Math.max(-.999999,(h-R)/R)),c=Math.sqrt(1-s*s);
 const t=[-1,0,0],n=[0,c,-s],basis=[cross(t,n),t,n],z=[0,0,1];
 const q0=basis.map(u=>dot(v,u)),p0=basis.map(u=>dot(w,u));let q=[q0[0],q0[1],0],p=[...p0];
 const T=Math.PI*Math.sqrt(m/1500),A=Math.abs(2*q0[2]/T*Math.cos(s));
 const mud=Math.fround(sp.spSlidingMu)*sp.spCushionFrictionMultiplier,mu=Math.fround(mud),e=Math.fround(sp.spCushionRestitution),k=sp.spCushionSpinFriction;
 const slip=add(q,mul(cross(z,p),R)),u=Math.hypot(...slip),d=unit(slip);
 const tau=mu*A>0?Math.min(T,2*u/(7*mu*A)):T;
 p=add(p,mul(cross(z,d),5*mu*A*tau/(2*R)));q=add(q,mul(d,-mu*A*tau));
 if(T>tau){q=add(q,mul(unit(q),-k*A*(T-tau)));const pp=mul(cross(z,q),1/R);p=[pp[0],pp[1],p[2]];}
 p[2]=Math.sign(p[2])*Math.max(0,Math.abs(p[2])-5*.9*k*A*T/(2*R));q[2]=-e*q0[2];
 const wear=Math.max(1,Math.min(1.2,1+(sp.spClothWear-5)*.2/95));
 let py=p0[1]+5*(1+e)*(-q0[2])/(2*R*R)*(mud*R*Math.min(1,sp.spCushionImpulseFactor*wear)+(h-R)*sp.spCushionHeightFactor);
 if(p0[1]>0&&py*p0[1]>0)py=Math.min(.95*p0[1],py);p[1]=py;
 const world=a=>[0,1,2].map(i=>a.reduce((sum,x,j)=>sum+x*basis[j][i],0));
 const vo=world(q);vo[2]*=vo[2]<0?sp.spDownwardRetention:sp.spUpwardRetention;
 return {v:vo,w:world(p)};
}
module.exports={cushion};

}, {}, "apps/three-game/src/core/physics/sp/cushion.js"],
63: [function(require, module, exports) {
// Flat, undamaged cloth path of SP 1.10.4 0x4c7440 / 0x4c7a10.
// SI state; excludes the optional random cloth-imperfection generator.
function freeStep(body,dt,p={},load=9.8){
 const v=[...body.v],w=[...body.w],pos=[...(body.p||[0,0,0])],r=body.r;
 if(v.every(x=>x===0)&&w.every(x=>x===0))return {...body,v,w,p:pos};
 // The original default integrator advances position before velocity.
 for(let i=0;i<3;i++)pos[i]+=v[i]*dt;
 if(!body.supported){v[2]-=load*dt;return {...body,v,w,p:pos};}
 const mu=Math.fround(p.spSlidingMu??.21068874172185434),roll=Math.fround(p.spRollingMu??.00876666666666667),back=Math.fround(p.spReverseRollingMu??.008866666666666665);
 let mx=v[1]>0?roll:Math.fround(roll+back)*.5,my=v[1]>0?roll:back;
 const sx=v[0]-r*w[1],sy=v[1]+r*w[0],slip=Math.hypot(sx,sy),oldSide=w[2];
 let speed=Math.hypot(v[0],v[1]);
 if(slip*slip<.0001){
  let magnitude=Math.hypot(mx,my);
  if(speed<.05){const base=magnitude>.005?.25:.4,factor=base+speed*(1-base)/.05;mx*=factor;my*=factor;magnitude*=factor;}
  if(dt>=speed/(magnitude*load)){v[0]=v[1]=v[2]=0;w.fill(0);speed=0;}
  else {v[0]-=mx*load*dt*v[0]/speed;v[1]-=my*load*dt*v[1]/speed;speed=Math.hypot(v[0],v[1]);w[0]=-v[1]/r;w[1]=v[0]/r;}
 }else{
  const dv=mu*load*dt;
  v[0]-=dv*sx/slip;v[1]-=dv*sy/slip;
  w[0]-=2.5*dv/r*sy/slip;w[1]+=2.5*dv/r*sx/slip;
  speed=Math.hypot(v[0],v[1]);
 }
 // Anisotropic nap coupling uses the coefficient difference and pre-step side spin.
 const average=Math.fround(roll+back)*.5;
 if(Math.abs(average-my)>.0001&&speed>.01)v[0]+=mx*oldSide*9.75e-6;
 const decay=(p.spSideSpinFactor??.8)*5*roll*load*dt/(2*r);
 w[2]=Math.sign(oldSide)*Math.max(0,Math.abs(oldSide)-decay);
 return {...body,v,w,p:pos};
}
function floorImpact(body,p={}){
 const pos=[...(body.p||[0,0,0])];pos[2]=0;
 const incoming=body.v[2];
 if(incoming>-.05)return {...body,p:pos,v:[body.v[0],body.v[1],0],w:[...body.w],supported:true};
 let next={...body,supported:true,p:pos};
 for(let i=0;i<10;i++)next=freeStep(next,.0001,p,-incoming/.001);
 next.v[2]=-incoming*Math.fround(p.spFloorRestitution??.55);
 return {...next,p:pos,supported:body.supported};
}
module.exports={freeStep,floorImpact};

}, {}, "apps/three-game/src/core/physics/sp/freeMotion.js"],
64: [function(require, module, exports) {
// The SP boundary uses metres, seconds, kilograms and rad/s.
function readBody(ball,p={}){
 return {p:[ball.pos.x/1000,ball.pos.y/1000,(ball.spHeightMm||0)/1000],v:[ball.vel.x/1000,ball.vel.y/1000,(ball.spVerticalSpeedMmS||0)/1000],w:[ball.omega.x,ball.omega.y,ball.omega.z],r:ball.radius/1000,m:p.spBallMassKg??.141,height:(ball.spHeightMm||0)/1000,supported:ball.spSupported??(!(ball.spHeightMm>0)&&!ball.spVerticalSpeedMmS),contactFlag:ball.spContactFlag||0};
}
function writeBody(ball,b){
 if(b.p){ball.pos.x=b.p[0]*1000;ball.pos.y=b.p[1]*1000;ball.spHeightMm=b.p[2]*1000;}
 ball.vel.x=b.v[0]*1000;ball.vel.y=b.v[1]*1000;ball.spVerticalSpeedMmS=b.v[2]*1000;
 Object.assign(ball.omega,{x:b.w[0],y:b.w[1],z:b.w[2]});
 if(b.supported!==undefined)ball.spSupported=b.supported;
 const slip=Math.hypot(ball.vel.x-ball.radius*ball.omega.y,ball.vel.y+ball.radius*ball.omega.x);
 ball.isSliding=slip>=10;ball.contactMode=ball.spSupported===false?'airborne':ball.isSliding?'sliding':'rolling';
}
module.exports={readBody,writeBody};

}, {}, "apps/three-game/src/core/physics/sp/body.js"],
65: [function(require, module, exports) {
// SP surface/contact semantics on the test field's own table geometry.
// No SM pot-angle filters, jaw impulse, entry damping or capture timers.
const {closestPointOnSegment}=require('../continuousCollision');
const {floorImpact}=require('./freeMotion');
const {readBody,writeBody}=require('./body');
const {registerShotEvent}=require('../physicsEvents');
function sampleOpening(ball,pocket){
 const center=pocket.capture?.center||pocket.center;let best=null;
 for(const edge of pocket.dropEdges||[])for(let i=1;i<(edge.points||[]).length;i++){
  const a=edge.points[i-1],b=edge.points[i],q=closestPointOnSegment(ball.pos,a,b),dx=center.x-q.x,dy=center.y-q.y,l=Math.hypot(dx,dy)||1;
  const depth=(ball.pos.x-q.x)*dx/l+(ball.pos.y-q.y)*dy/l,dist=Math.hypot(ball.pos.x-q.x,ball.pos.y-q.y);
  if(!best||dist<best.distance)best={point:q,depth,distance:dist,inward:[dx/l,dy/l]};
 }
 if(!best){const dx=ball.pos.x-center.x,dy=ball.pos.y-center.y,l=Math.hypot(dx,dy),radius=pocket.capture?.radius||40;best={depth:radius-l,distance:Math.abs(l-radius),point:{x:center.x+dx/(l||1)*radius,y:center.y+dy/(l||1)*radius},inward:[-dx/(l||1),-dy/(l||1)]};}
 return best;
}
function pocketAt(ball,pockets){
 return pockets.find(p=>Math.hypot(ball.pos.x-p.center.x,ball.pos.y-p.center.y)<(p.candidateRadius||180))||pockets.find(p=>p.id===ball.spPocketId)||null;
}
function openingState(ball,pockets){
 const pocket=pocketAt(ball,pockets);if(!pocket)return null;
 const sample=sampleOpening(ball,pocket);
 if(sample.depth<=0){if(ball.spHeightMm>=-.01){delete ball.spPocketId;delete ball.spPocketEntrySpeed;if(ball.pocketMode==='entry')ball.pocketMode='table';}else if(ball.spHeightMm < -ball.radius && ball.spPocketId === pocket.id)return {pocket,...sample};return null;}
 ball.spPocketId=pocket.id;
 return {pocket,...sample};
}
function finishPot(state,ball,pocket,events){
 const event={type:ball.id===state.cueBallId?'cue-ball-potted':'ball-potted',ballId:ball.id,pocketId:pocket.id,point:{...ball.pos},pocketCenter:{...(pocket.capture?.center||pocket.center)},impactSpeed:Math.hypot(ball.vel.x,ball.vel.y),pocketEntrySpeedMmS:ball.spPocketEntrySpeed??Math.hypot(ball.vel.x,ball.vel.y),entryPosition:{...ball.pos},entryVelocity:{...ball.vel},entryAngularVelocity:{...ball.omega},entryHeight:ball.radius+(ball.spHeightMm||0),entryVerticalVelocity:ball.spVerticalSpeedMmS||0,physicsVariant:'SP'};
 ball.potted=true;ball.potting={pocketId:pocket.id,type:pocket.type};ball.pocketMode='potted';ball.pocketEntry=null;ball.pocketState=null;
 ball.vel.x=ball.vel.y=0;ball.omega.x=ball.omega.y=ball.omega.z=0;ball.spVerticalSpeedMmS=0;ball.spSupported=false;
 registerShotEvent(state,event);events.push(event);
}
function updatePocketSupport(state,ball,params,events){
 const opening=openingState(ball,state.tableColliderSet?.pockets||[]);
 if(!opening)return false;
 const {pocket,point,depth,inward}=opening,r=ball.radius;
 ball.spPocketEntrySpeed??=Math.hypot(ball.vel.x,ball.vel.y);
 ball.pocketMode='entry';ball.spSupported=false;
 // Finite cloth-mesh edge: sphere contact with the edge point. Rotate the
 // original SP surface-impact calculation into that contact's local frame.
 if(depth<r&&ball.spHeightMm<0){
  const dz=ball.spHeightMm+r,dx=ball.pos.x-point.x,dy=ball.pos.y-point.y,dist=Math.hypot(dx,dy,dz);
  if(dist<r&&dz>0){
   const n=[dx/dist,dy/dist,dz/dist],t=[-inward[1],inward[0],0],x=[t[1]*n[2],-t[0]*n[2],t[0]*n[1]-t[1]*n[0]],body=readBody(ball,params.sp);
   const dot=(a,b)=>a.reduce((s,z,i)=>s+z*b[i],0),basis=[x,t,n],local=v=>basis.map(a=>dot(v,a)),world=v=>[0,1,2].map(i=>v.reduce((s,z,j)=>s+z*basis[j][i],0));
   const v=local(body.v);
   if(v[2]<0){const out=floorImpact({...body,p:[0,0,0],v,w:local(body.w),supported:false},params.sp);body.v=world(out.v);body.w=world(out.w);writeBody(ball,body);}
   // Geometric depenetration, independent of velocity or energy.
   const correction=r-dist;ball.pos.x+=n[0]*correction;ball.pos.y+=n[1]*correction;ball.spHeightMm+=n[2]*correction;
  }
 }
 // Pocket-lining surface from pocket_limit.srf (friction/restitution .1).
 // Use the local capture contour as the well boundary, including its back
 // wall; a fast ball may rebound before falling into the capture volume.
 const center=pocket.capture?.center||pocket.center,rx=ball.pos.x-center.x,ry=ball.pos.y-center.y,radial=Math.hypot(rx,ry),limit=pocket.capture?.radius||40;
 const behind=rx*inward[0]+ry*inward[1]>0;
 if(ball.spHeightMm<0&&radial>limit&&(behind||ball.spHeightMm < -r)){
  const nx=-rx/radial,ny=-ry/radial,body=readBody(ball,params.sp),basis=[[0,0,1],[-ny,nx,0],[nx,ny,0]];
  const local=v=>basis.map(a=>a.reduce((s,x,i)=>s+x*v[i],0)),world=v=>[0,1,2].map(i=>v.reduce((s,x,j)=>s+x*basis[j][i],0)),v=local(body.v);
  if(v[2]<0){
   const output=floorImpact({...body,p:[0,0,0],v,w:local(body.w),supported:false},{...params.sp,spSlidingMu:params.sp.spPocketLiningFriction??.1,spRollingMu:params.sp.spPocketLiningFriction??.1,spReverseRollingMu:params.sp.spPocketLiningFriction??.1,spFloorRestitution:params.sp.spPocketLiningRestitution??.1});
   body.v=world(output.v);body.w=world(output.w);writeBody(ball,body);
   const event={type:'ball-hit-pocket-jaw',ballId:ball.id,pocketId:pocket.id,colliderId:pocket.id+':sp-lining',point:{x:ball.pos.x-nx*r,y:ball.pos.y-ny*r},normal:{x:nx,y:ny},impactSpeed:-v[2]*1000,physicsVariant:'SP',material:'pocket-limit'};
   registerShotEvent(state,event);events.push(event);
  }
  ball.pos.x=center.x+rx/radial*limit;ball.pos.y=center.y+ry/radial*limit;
 }
 // The capture surface is a geometric volume below the mouth, analogous to
 // original contact type 4. Its depth follows this table's ball-sized throat.
 if((ball.spHeightMm||0)<=-2*r&&(depth>=r||ball.spPocketId===pocket.id))finishPot(state,ball,pocket,events);
 return true;
}
module.exports={sampleOpening,openingState,updatePocketSupport,finishPot};

}, {"../continuousCollision":36,"./freeMotion":63,"./body":64,"../physicsEvents":39}, "apps/three-game/src/core/physics/sp/pockets.js"],
66: [function(require, module, exports) {
const V3_PHYSICS_DEFAULTS = Object.freeze({
  gravityMmS2: 9810,
  maxCenterBallSpeedMmS: 7000,
  maxTipOffsetRatio: 0.5,
  maxTipSpeedRetention: 0.95,
  cueSpinEfficiency: 0.7,
  clothSlidingMu: 0.18,
  clothRollingDecelMmS2: 110,
  clothSideSpinDecelRadS2: 16,
  ballNormalRestitution: 0.95,
  ballContactFrictionMu: 0,
  cushionContactFrictionMu: 0.18,
  cushionNoseHeightRadiusRatio: 1.4,
  cushionEnergeticRestitution: 0.98,
  cushionSpinCorrectionStrength: 0.32,
  // Missing values retain the pre-calibration fixed-restoration model.
  cushionSpeedCorrectionStrength: 0,
  cushionImpulseSteps: 64,
});

function finite(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clamp(value, min, max, fallback) {
  return Math.max(min, Math.min(max, finite(value, fallback)));
}

function normalizeV3PhysicsValues(values = {}) {
  return {
    gravityMmS2: clamp(values.gravityMmS2, 1000, 20000, V3_PHYSICS_DEFAULTS.gravityMmS2),
    maxCenterBallSpeedMmS: clamp(values.maxCenterBallSpeedMmS, 1000, 12000, V3_PHYSICS_DEFAULTS.maxCenterBallSpeedMmS),
    maxTipOffsetRatio: clamp(values.maxTipOffsetRatio, 0, 0.5, V3_PHYSICS_DEFAULTS.maxTipOffsetRatio),
    maxTipSpeedRetention: clamp(values.maxTipSpeedRetention, 0.5, 1, V3_PHYSICS_DEFAULTS.maxTipSpeedRetention),
    cueSpinEfficiency: clamp(values.cueSpinEfficiency, 0, 1.2, V3_PHYSICS_DEFAULTS.cueSpinEfficiency),
    clothSlidingMu: clamp(values.clothSlidingMu, 0, 0.5, V3_PHYSICS_DEFAULTS.clothSlidingMu),
    clothRollingDecelMmS2: clamp(values.clothRollingDecelMmS2, 0, 500, V3_PHYSICS_DEFAULTS.clothRollingDecelMmS2),
    clothSideSpinDecelRadS2: clamp(values.clothSideSpinDecelRadS2, 0, 100, V3_PHYSICS_DEFAULTS.clothSideSpinDecelRadS2),
    ballNormalRestitution: clamp(values.ballNormalRestitution, 0, 1, V3_PHYSICS_DEFAULTS.ballNormalRestitution),
    ballContactFrictionMu: clamp(values.ballContactFrictionMu, 0, 0.5, V3_PHYSICS_DEFAULTS.ballContactFrictionMu),
    cushionContactFrictionMu: clamp(values.cushionContactFrictionMu, 0, 0.5, V3_PHYSICS_DEFAULTS.cushionContactFrictionMu),
    cushionNoseHeightRadiusRatio: clamp(values.cushionNoseHeightRadiusRatio, 1, 1.6, V3_PHYSICS_DEFAULTS.cushionNoseHeightRadiusRatio),
    cushionEnergeticRestitution: clamp(values.cushionEnergeticRestitution, 0, 1, V3_PHYSICS_DEFAULTS.cushionEnergeticRestitution),
    cushionSpinCorrectionStrength: clamp(values.cushionSpinCorrectionStrength, 0, 2, V3_PHYSICS_DEFAULTS.cushionSpinCorrectionStrength),
    cushionSpeedCorrectionStrength: clamp(values.cushionSpeedCorrectionStrength, 0, 1, 0),
    cushionImpulseSteps: Math.round(clamp(values.cushionImpulseSteps, 16, 20000, V3_PHYSICS_DEFAULTS.cushionImpulseSteps)),
  };
}

function adaptV3PhysicsOptions(options = {}) {
  const v3 = normalizeV3PhysicsValues(options.v3 || options.v3Physics || {});
  return {
    ...options,
    physicsEngine: 'v3',
    physicsModelVersion: 3,
    v3,
    minCuePower: 0,
    maxCuePower: v3.maxCenterBallSpeedMmS,
    maxTipOffsetRatio: v3.maxTipOffsetRatio,
    tableSlidingAccel: v3.clothSlidingMu * v3.gravityMmS2,
    rollingFriction: v3.clothRollingDecelMmS2,
    sideSpinLinearDecay: v3.clothSideSpinDecelRadS2,
    ballRestitution: v3.ballNormalRestitution,
    ballFrictionMu: v3.ballContactFrictionMu,
    // Pocket lips still use the existing 2D material path. Straight rails are
    // resolved exclusively by the V3 cumulative-impulse cushion solver.
    railRestitution: 0.91,
    railFrictionMu: v3.cushionContactFrictionMu,
    railSpinDamping: 0,
    railRollCorrection: 0,
    railRollExcessRetention: 1,
    railRollTangentLoss: 0,
  };
}

module.exports = {
  V3_PHYSICS_DEFAULTS,
  adaptV3PhysicsOptions,
  normalizeV3PhysicsValues,
};

}, {}, "apps/three-game/src/core/physics/v3Config.js"],
67: [function(require, module, exports) {
const { PHYSICS_DEFAULTS } = require('./config/physicsParams');
const { createHitBallParams } = require('./hitBallParams');
const { applyCueSpin } = require('./spin');
const { createPreShotSnapshot } = require('../rules/ruleSnapshot');
const { resolveCueSpeed } = require('./cueSpeed');
const { applyV3CueStrike } = require('./v3CueStrike');
const { applySPCueStrike } = require('./sp/cueStrike');

function applyShot(state, shot) {
  const cueBall = state.balls.find((ball) => ball.id === state.cueBallId);
  if (!cueBall || cueBall.potted) {
    return state;
  }

  const params = shot.params || PHYSICS_DEFAULTS;
  const centerSpeed = params.physicsVariant === 'SP' ? 0 : resolveCueSpeed(shot, params);
  let tipOffset = shot.tipOffset || { x: 0, y: 0 };
  const cueBallRotationBefore = { ...cueBall.orientation };
  const preShotSnapshot = createPreShotSnapshot(state);

  if (params.physicsVariant === 'SP') {
    const strike = applySPCueStrike(cueBall, shot.direction, { ...shot, tipOffset }, params);
    tipOffset = strike.tipOffset;
    state.spTimeRemainder = 0;
  } else if (params.physicsModelVersion === 3) {
    const strike = applyV3CueStrike(cueBall, shot.direction, centerSpeed, { ...shot, tipOffset }, params);
    tipOffset = strike.tipOffset;
  } else {
    const scale = Math.cos(Math.max(0,Math.min(90,Number(shot.verticalAngle)||0))*Math.PI/180);
    cueBall.vel.x = shot.direction.x * centerSpeed * scale;
    cueBall.vel.y = shot.direction.y * centerSpeed * scale;
    applyCueSpin(cueBall, { ...shot, tipOffset }, params);
  }

  const hitBallParams = createHitBallParams(
    state,
    { ...shot, tipOffset },
    cueBall,
    params,
    cueBallRotationBefore,
  );

  state.shot = {
    ...shot,
    tipOffset,
    hitBallParams,
    linearVelocity: { ...cueBall.vel },
    angularVelocity: { ...cueBall.omega },
    cueBallRotationBefore,
  };
  state.activeShot = {
    playerId: state.currentPlayerId,
    firstContactBallId: null,
    pottedBallIds: [],
    cueBallPotted: false,
    events: [],
    shotInput: {
      direction: { ...shot.direction },
      power: shot.power,
      tipOffset: { ...tipOffset },
      verticalAngle: shot.verticalAngle || 0,
      nominatedPocket: shot.nominatedPocket || null,
    },
    hitBallParams,
    preShotSnapshot,
    preShotRuleState: preShotSnapshot.ruleState,
  };
  state.aim = null;
  return state;
}

module.exports = {
  applyShot,
  resolveCueSpeed,
};

}, {"./config/physicsParams":26,"./hitBallParams":68,"./spin":43,"../rules/ruleSnapshot":22,"./cueSpeed":69,"./v3CueStrike":70,"./sp/cueStrike":71}, "apps/three-game/src/core/physics/shotResolver.js"],
68: [function(require, module, exports) {
function cloneVector2(vector) {
  return {
    x: vector.x,
    y: vector.y,
  };
}

function cloneVector3(vector) {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z,
  };
}

function cloneQuaternion(q) {
  return {
    x: q.x,
    y: q.y,
    z: q.z,
    w: q.w,
  };
}

function angleFromDirection(direction) {
  return Math.atan2(direction.y, direction.x);
}

function createHitBallParams(state, shot, cueBall, params, cueBallRotationBefore) {
  const tipOffset = shot.tipOffset || { x: 0, y: 0 };
  const normPower = Math.max(0, Math.min(1, shot.power / 100));

  return {
    cueBallId: cueBall.id,
    cueBallPosition: cloneVector2(cueBall.pos),
    cueBallRotation: cloneQuaternion(cueBallRotationBefore || cueBall.orientation),
    newVelocity: cloneVector2(cueBall.vel),
    newAngularVelocity: cloneVector3(cueBall.omega),
    spin: {
      x: tipOffset.x || 0,
      y: tipOffset.y || 0,
    },
    verticalAngle: shot.verticalAngle || 0,
    angle: Number.isFinite(shot.angle) ? shot.angle : angleFromDirection(shot.direction),
    normPower,
    symDeltaTime: params.fixedDt,
    integrateDeltaTime: params.fixedDt,
    nominatedPocket: shot.nominatedPocket || null,
  };
}

module.exports = {
  createHitBallParams,
};

}, {}, "apps/three-game/src/core/physics/hitBallParams.js"],
69: [function(require, module, exports) {
// Effective pull progress maps directly to centre-hit launch speed.
// Tip-offset retention and elevation are applied separately by the cue strike.
function resolveCueSpeed(shot, params = {}) {
  const power = Math.max(0, Math.min(100, Number(shot?.power) || 0));
  const maxSpeed = Math.max(0, Number(shot?.maxPower ?? params.maxCuePower) || 0);
  return power === 0 ? 0 : maxSpeed * (power / 100);
}

module.exports = { resolveCueSpeed };

}, {}, "apps/three-game/src/core/physics/cueSpeed.js"],
70: [function(require, module, exports) {
function clampTipOffsetCircle(tipOffset = {}, maxRatio = 0.6) {
  let x = Number(tipOffset.x) || 0;
  let y = Number(tipOffset.y) || 0;
  const magnitude = Math.hypot(x, y);
  if (magnitude > maxRatio && magnitude > 0) {
    const scale = maxRatio / magnitude;
    x *= scale;
    y *= scale;
  }
  return { x, y };
}

// Shared by the shot solver and effective-power display.
function resolveV3SpeedRetention(tipOffset = {}, params = {}) {
  const v3 = params.v3 || {};
  const maxOffset = Math.max(0.000001, Number(v3.maxTipOffsetRatio) || 0.5);
  const retention = Math.max(0.5, Math.min(1, Number(v3.maxTipSpeedRetention ?? 0.92)));
  const offset = clampTipOffsetCircle(tipOffset, Number(v3.maxTipOffsetRatio ?? params.maxTipOffsetRatio) || 0.5);
  const normalizedOffset = Math.min(1, Math.hypot(offset.x, offset.y) / maxOffset);
  return 1 - (1 - retention) * normalizedOffset * normalizedOffset;
}

// Experimental elevation calibration: minimum elevation is full effective speed.
// Smoothstep keeps both endpoints continuous with zero slope; above 20 degrees
// retain the calibrated endpoint (the current practice-room elevation limit).
function resolveV3ElevationRetention(elevation = 2.5) {
  const angle = Number.isFinite(Number(elevation)) ? Number(elevation) : 2.5;
  const t = Math.max(0, Math.min(1, (angle - 2.5) / 17.5));
  return 1 - 0.15 * t * t * (3 - 2 * t);
}

// Use the same combined retention for the shot and the white loss segment.
function resolveV3EffectivePower(power, tipOffset, params, elevation = 2.5) {
  const raw = Math.max(0, Math.min(100, Number(power) || 0));
  return raw * resolveV3SpeedRetention(tipOffset, params) * resolveV3ElevationRetention(elevation);
}

function applyV3CueStrike(cueBall, direction, centerSpeed, shot, params) {
  const radius = cueBall.radius || 26.25;
  const v3 = params.v3 || {};
  const tipOffset = clampTipOffsetCircle(
    shot.tipOffset,
    Number(v3.maxTipOffsetRatio ?? params.maxTipOffsetRatio) || 0.5,
  );
  const spinEfficiency = Math.max(0, Number(v3.cueSpinEfficiency) || 0);
  const impulseMomentFactor = 5 / 2;
  const speedRetention = resolveV3SpeedRetention(tipOffset, params);
  // Calibrated effective horizontal speed; do not apply cosine loss twice.
  const elevationScale = resolveV3ElevationRetention(shot.verticalAngle);
  const speed = centerSpeed * speedRetention * elevationScale;
  const topBackSpinRatio = impulseMomentFactor * spinEfficiency * tipOffset.y;
  const sideSpinRatio = impulseMomentFactor * spinEfficiency * tipOffset.x;

  cueBall.vel.x = direction.x * speed;
  cueBall.vel.y = direction.y * speed;
  cueBall.omega.x = (-cueBall.vel.y / radius) * topBackSpinRatio;
  cueBall.omega.y = (cueBall.vel.x / radius) * topBackSpinRatio;
  cueBall.omega.z = -(speed / radius) * sideSpinRatio;
  cueBall.contactMode = 'sliding';
  cueBall.isSliding = true;

  return { speed, speedRetention, tipOffset };
}

module.exports = {
  applyV3CueStrike,
  resolveV3SpeedRetention,
  resolveV3EffectivePower,
  resolveV3ElevationRetention,
  clampTipOffsetCircle,
};

}, {}, "apps/three-game/src/core/physics/v3CueStrike.js"],
71: [function(require, module, exports) {
// SP 1.10.4 cue impulse and shaft deflection (0x4f45b0). SI internally.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const add=(a,b)=>a.map((x,i)=>x+b[i]),mul=(a,s)=>a.map(x=>x*s);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=a=>{const n=Math.hypot(...a);return n?mul(a,1/n):[0,0,0];};
// 0x5770b0 multiplies a double matrix by float32 vector components.
function rotateFloat(v,axis,angle){
 const [x,y,z]=axis,c=Math.cos(angle),s=Math.sin(angle),d=1-c,f=Math.fround;
 const rows=[[c+x*x*d,x*y*d-z*s,x*z*d+y*s],[y*x*d+z*s,c+y*y*d,y*z*d-x*s],[z*x*d-y*s,z*y*d+x*s,c+z*z*d]];
 return rows.map(row=>f(f(f(f(row[0])*f(v[0]))+f(f(row[1])*f(v[1])))+f(f(row[2])*f(v[2]))));
}
function cueResponse({offset=[0,0],elevation=2.5,speed=3,radius=.02619375},p={}){
 const R=radius,side=offset[0],high=offset[1],r=Math.hypot(side,high),q=r/R;
 const restitution=p.spCueRestitution??.75,weight=p.spCueWeightKg??.25,endmass=p.spCueEndMassKg??.02,tipDiameter=p.spCueTipDiameterMm===undefined?.0095:p.spCueTipDiameterMm/1000;
 const a=elevation*Math.PI/180,d=[Math.cos(a),0,-Math.sin(a)],up=[Math.sin(a),0,Math.cos(a)];
 const radial=unit(add(mul(up,high),[0,side,0])),axis=cross(radial,d);
 const base=((1-restitution/3)**2+(1+restitution)**2/3)/(16/9),denom=1+2.5*q*q;
 const effectiveRestitution=Math.sqrt(Math.max(0,base-3*(1-base)*denom));
 const speedCap=Math.max(.01,Math.min(speed*1.283697,(p.spCuePowerRating??100)*13.88/100))/1.283697;
 const V=speedCap*(1+effectiveRestitution)/(denom+1/3),omega=V*r*2.5/(R*R);
 let v=mul(d,V),w=mul(axis,omega);
 // Tip/butt mass limits the downward component before shaft deflection.
 let factor=clamp(1-(weight-.15)*.7/.35,0,1);
 factor=clamp(1+(factor-1)*(elevation-45)/45,0,1);
 v[2]*=factor*(restitution>=.8?1.1:.6);
 const tipRadius=Math.fround(tipDiameter)*.505;
 const threshold=.008955/R*r*clamp(1-(tipRadius-.0125)*.085/-.0035,.8,1);
 const miscue=r>R*.5||threshold>tipRadius;
 const effectiveEndMass=endmass*(miscue?(q-.5)*1472*2+28:1);
 const sx=-side/R,sy=-high/R;
 const squirt=Math.atan(2.5*sx*Math.sqrt(Math.max(0,1-sx*sx))/((p.spBallMassKg??.141)/effectiveEndMass+1+2.5*(1-sx*sx)));
 // 0x46c2f0 is a double precision rotation about the table's vertical.
 const c=Math.cos(squirt),s=Math.sin(squirt);v=[c*v[0]-s*v[1],s*v[0]+c*v[1],v[2]];
 const verticalMass=endmass*(high>0?5:2)*(restitution>=.84?2:1);
 const vertical=Math.atan(2.5*sy*Math.sqrt(Math.max(0,1-sy*sy))/((p.spBallMassKg??.141)/verticalMass+1+2.5*(1-sy*sy)));
 v=rotateFloat(v,[0,-1,0],vertical);
 if(miscue){
  const vz=v[2],scale=.6-(q-.5)*.55*2;
  v=mul(v,scale);v[2]=vz;w=mul(w,.01);
  if(high<0)v[2]=Math.abs(high)*10/R*v[2];else if(high>0)v=mul(v,.75);
 }
 return {v,w,miscue};
}
function applySPCueStrike(ball,direction,shot,params){
 const p=params.sp,R=ball.radius/1000,max=p.maxTipOffsetRatio??.5;
 for(const key of ['spPocketId','spPocketEntrySpeed','spContactFlag'])delete ball[key];
 let tip={x:Number(shot.tipOffset?.x)||0,y:Number(shot.tipOffset?.y)||0};
 const l=Math.hypot(tip.x,tip.y);if(l>max)tip={x:tip.x*max/l,y:tip.y*max/l};
 const power=clamp(Number(shot.power)||0,0,100);
 const speed=(p.spMaxCueSpeedMS??5.333333333333333)*power/100;
 const out=cueResponse({offset:[tip.x*R,tip.y*R],elevation:Number(shot.verticalAngle)||0,speed,radius:R},p);
 const n=Math.hypot(direction.x,direction.y)||1,dx=direction.x/n,dy=direction.y/n;
 const world=a=>[dx*a[0]-dy*a[1],dy*a[0]+dx*a[1],a[2]],v=world(out.v),w=world(out.w);
 ball.vel.x=v[0]*1000;ball.vel.y=v[1]*1000;Object.assign(ball.omega,{x:w[0],y:w[1],z:w[2]});
 ball.spVerticalSpeedMmS=v[2]*1000;ball.spHeightMm=0;ball.spSupported=v[2]<=0;ball.spMiscue=out.miscue;
 ball.contactMode='sliding';ball.isSliding=true;
 return {tipOffset:tip,speed:Math.hypot(v[0],v[1])*1000};
}
function resolveSPEffectivePower(power,tip={},params={},elevation=2.5){
 const p=params.sp||params,R=.02625,max=p.maxTipOffsetRatio??.5;
 let x=Number(tip.x)||0,y=Number(tip.y)||0;const l=Math.hypot(x,y);if(l>max){x*=max/l;y*=max/l;}
 const raw=clamp(Number(power)||0,0,100),speed=p.spMaxCueSpeedMS??5.333333333333333;
 if(raw===0)return 0;
 const out=cueResponse({offset:[x*R,y*R],elevation,speed:speed*raw/100,radius:R},p);
 const center=cueResponse({offset:[0,0],elevation:2.5,speed,radius:R},p);
 return Math.min(raw,100*Math.hypot(out.v[0],out.v[1])/Math.hypot(center.v[0],center.v[1]));
}
module.exports={cueResponse,applySPCueStrike,resolveSPEffectivePower};

}, {}, "apps/three-game/src/core/physics/sp/cueStrike.js"],
72: [function(require, module, exports) {
const { createNearMissTracker } = require('./nearMissCrowd');
const { startedSnookered, selfSnookeredAfterPot } = require('./snookerCrowd');
const { BALL_KIND, COLOR_ORDER } = require('../config/constants');
const { BALL_RADIUS_MM, BALL_VALUES } = require('../core/model/ballSpec');
const { resolveShot, RULE_PHASE } = require('../core/rules/rulesEngine');
const { availablePointsForPlayer } = require('../core/rules/scoreAvailability');

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const BALL_DIAMETER_MM = BALL_RADIUS_MM * 2;
const COLOR_CLEARANCE_POINTS = COLOR_ORDER.reduce((sum, kind) => sum + (BALL_VALUES[kind] || 0), 0);

const DEFAULT_OPTIONS = {
  aimErrorMinutes: 5,
  sampleSigmaCount: 4,
  sampleCount: 81,
  maxPotAttemptDeviationDeg: 2.5,
  potAttemptPocketMarginMm: BALL_DIAMETER_MM * 2,
  blockerClearanceMm: BALL_DIAMETER_MM - 1,
  minPocketWindowMm: 4,
};

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function mergeOptions(options = {}) {
  return {
    ...DEFAULT_OPTIONS,
    ...options,
  };
}

function clonePoint(point) {
  if (!point) return null;
  const x = Number(point.x);
  const y = Number(point.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

function ballPosition(ball) {
  return clonePoint(ball?.pos || ball?.position);
}

function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y };
}

function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y };
}

function scale(vector, amount) {
  return { x: vector.x * amount, y: vector.y * amount };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

function length(vector) {
  return Math.hypot(vector.x, vector.y);
}

function distance(a, b) {
  return length(sub(a, b));
}

function normalize(vector) {
  const vectorLength = length(vector);
  if (vectorLength <= 0.000001) return null;
  return { x: vector.x / vectorLength, y: vector.y / vectorLength };
}

function angleOf(vector) {
  return Math.atan2(vector.y, vector.x);
}

function vectorFromAngle(angle) {
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

function normalizeAngle(angle) {
  let result = angle;
  while (result <= -Math.PI) result += Math.PI * 2;
  while (result > Math.PI) result -= Math.PI * 2;
  return result;
}

function angleDiffAbs(a, b) {
  return Math.abs(normalizeAngle(a - b));
}

function gaussianWeight(delta, sigma) {
  if (sigma <= 0) return delta === 0 ? 1 : 0;
  const z = delta / sigma;
  return Math.exp(-0.5 * z * z);
}

function pointSegmentDistance(point, start, end) {
  const segment = sub(end, start);
  const segmentLengthSq = dot(segment, segment);
  if (segmentLengthSq <= 0.000001) return distance(point, start);
  const t = Math.max(0, Math.min(1, dot(sub(point, start), segment) / segmentLengthSq));
  return distance(point, add(start, scale(segment, t)));
}

function activeBallsFromList(balls) {
  return (balls || []).filter((ball) => !ball.potted);
}

function findBallById(balls, id) {
  return (balls || []).find((ball) => ball.id === id) || null;
}

function findCueBall(balls, cueBallId) {
  return (balls || []).find((ball) => ball.id === cueBallId || ball.kind === BALL_KIND.CUE) || null;
}

function findPocket(state, pocketId) {
  return (state.tableColliderSet?.pockets || state.pockets || []).find((pocket) => pocket.id === pocketId) || null;
}

function pocketOpeningCenter(pocket) {
  return (
    clonePoint(pocket?.openingDefinition?.center)
    || clonePoint(pocket?.capture?.center)
    || clonePoint(pocket?.center)
  );
}

function effectivePocketWindowMm(pocket, options) {
  const opening = pocket?.openingDefinition || {};
  const throatWidth = Number(opening.throatWidthMm || pocket?.throatWidthMm);
  const mouthWidth = Number(opening.mouthWidthMm || pocket?.mouthWidthMm);
  const width = Number.isFinite(throatWidth) && throatWidth > 0 ? throatWidth : mouthWidth;
  if (!Number.isFinite(width) || width <= 0) return options.minPocketWindowMm;
  return Math.max(options.minPocketWindowMm, width - BALL_DIAMETER_MM);
}

function createPotGeometry(objectBall, pocket, options) {
  const objectPos = ballPosition(objectBall);
  const center = pocketOpeningCenter(pocket);
  if (!objectPos || !center) return null;

  const objectToPocket = sub(center, objectPos);
  const objectToPocketDistance = length(objectToPocket);
  const potDirection = normalize(objectToPocket);
  if (!potDirection || objectToPocketDistance <= 1) return null;

  const targetCueCenter = sub(objectPos, scale(potDirection, BALL_DIAMETER_MM));
  const halfWindowAngle = Math.atan((effectivePocketWindowMm(pocket, options) * 0.5) / objectToPocketDistance);

  return {
    center,
    objectPos,
    potDirection,
    targetCueCenter,
    objectToPocketDistance,
    halfWindowAngle,
  };
}

function aimAngleForPot(cueBall, objectBall, pocket, options = {}) {
  const resolvedOptions = mergeOptions(options);
  const cuePos = ballPosition(cueBall);
  const geometry = createPotGeometry(objectBall, pocket, resolvedOptions);
  if (!cuePos || !geometry) return null;
  const cueToTarget = sub(geometry.targetCueCenter, cuePos);
  const aimDirection = normalize(cueToTarget);
  if (!aimDirection) return null;
  return {
    angle: angleOf(aimDirection),
    geometry,
    cuePos,
  };
}

function objectDirectionFromCueAim(cuePos, objectPos, aimAngle) {
  const direction = vectorFromAngle(aimAngle);
  const cueToObject = sub(objectPos, cuePos);
  const projection = dot(cueToObject, direction);
  if (projection <= 0) return null;

  const closestDistanceSq = dot(cueToObject, cueToObject) - projection * projection;
  const collisionRadius = BALL_DIAMETER_MM;
  const radiusSq = collisionRadius * collisionRadius;
  if (closestDistanceSq > radiusSq) return null;

  const offset = Math.sqrt(Math.max(0, radiusSq - closestDistanceSq));
  const impactDistance = projection - offset;
  if (impactDistance <= 0) return null;

  const cueCenterAtImpact = add(cuePos, scale(direction, impactDistance));
  return normalize(sub(objectPos, cueCenterAtImpact));
}

function pathBlockedByBalls(start, end, balls, ignoredIds, clearanceMm) {
  const path = sub(end, start);
  const pathLengthSq = dot(path, path);
  if (pathLengthSq <= 0.000001) return false;

  return activeBallsFromList(balls).some((ball) => {
    if (!ball?.id || ignoredIds.has(ball.id)) return false;
    const pos = ballPosition(ball);
    if (!pos) return false;
    const projection = dot(sub(pos, start), path) / pathLengthSq;
    if (projection <= 0.02 || projection >= 0.98) return false;
    return pointSegmentDistance(pos, start, end) < clearanceMm;
  });
}

function estimatePotProbability(input = {}, options = {}) {
  const resolvedOptions = mergeOptions(options);
  const cueBall = input.cueBall;
  const objectBall = input.objectBall;
  const pocket = input.pocket;
  const balls = input.balls || [];
  const aim = aimAngleForPot(cueBall, objectBall, pocket, resolvedOptions);
  if (!aim) {
    return {
      probability: 0,
      valid: false,
      reason: 'missing-geometry',
    };
  }

  const ignoredIds = new Set([
    cueBall?.id,
    objectBall?.id,
  ].filter(Boolean));
  const cuePathBlocked = pathBlockedByBalls(
    aim.cuePos,
    aim.geometry.targetCueCenter,
    balls,
    ignoredIds,
    resolvedOptions.blockerClearanceMm,
  );
  const objectPathBlocked = pathBlockedByBalls(
    aim.geometry.objectPos,
    aim.geometry.center,
    balls,
    ignoredIds,
    resolvedOptions.blockerClearanceMm,
  );

  if (cuePathBlocked || objectPathBlocked) {
    return {
      probability: 0,
      valid: true,
      reason: cuePathBlocked ? 'cue-path-blocked' : 'object-path-blocked',
      nominalAimAngle: aim.angle,
      halfWindowDeg: aim.geometry.halfWindowAngle * RAD_TO_DEG,
      cuePathBlocked,
      objectPathBlocked,
    };
  }

  const sigma = (Number(resolvedOptions.aimErrorMinutes) || 0) / 60 * DEG_TO_RAD;
  const sampleCount = Math.max(3, Math.floor(Number(resolvedOptions.sampleCount) || DEFAULT_OPTIONS.sampleCount));
  const sampleSigmaCount = Math.max(1, Number(resolvedOptions.sampleSigmaCount) || DEFAULT_OPTIONS.sampleSigmaCount);
  const maxDelta = Math.max(sigma * sampleSigmaCount, 0);
  let successWeight = 0;
  let totalWeight = 0;

  for (let index = 0; index < sampleCount; index += 1) {
    const ratio = sampleCount === 1 ? 0 : index / (sampleCount - 1);
    const delta = maxDelta === 0 ? 0 : -maxDelta + maxDelta * 2 * ratio;
    const weight = gaussianWeight(delta, sigma);
    totalWeight += weight;

    const objectDirection = objectDirectionFromCueAim(
      aim.cuePos,
      aim.geometry.objectPos,
      aim.angle + delta,
    );
    if (!objectDirection) continue;

    if (angleDiffAbs(angleOf(objectDirection), angleOf(aim.geometry.potDirection)) <= aim.geometry.halfWindowAngle) {
      successWeight += weight;
    }
  }

  return {
    probability: totalWeight > 0 ? clamp01(successWeight / totalWeight) : 0,
    valid: true,
    reason: 'estimated',
    nominalAimAngle: aim.angle,
    halfWindowDeg: aim.geometry.halfWindowAngle * RAD_TO_DEG,
    cuePathBlocked,
    objectPathBlocked,
  };
}

function pottedObjectEvents(shot) {
  return (shot?.events || []).filter((event) => event?.type === 'ball-potted' && event.ballId);
}

function estimateHardestPottedBall(state, shot, options = {}) {
  const snapshotBalls = shot?.preShotSnapshot?.balls || [];
  const cueBall = findCueBall(snapshotBalls, state.cueBallId);
  if (!cueBall) return null;

  const estimates = pottedObjectEvents(shot)
    .map((event) => {
      const objectBall = findBallById(snapshotBalls, event.ballId);
      const pocket = findPocket(state, event.pocketId);
      if (!objectBall || objectBall.kind === BALL_KIND.CUE || !pocket) return null;
      return {
        event,
        objectBall,
        pocket,
        ...estimatePotProbability({
          cueBall,
          objectBall,
          pocket,
          balls: snapshotBalls,
        }, options),
      };
    })
    .filter((estimate) => estimate?.valid);

  if (estimates.length === 0) return null;
  return estimates.reduce((hardest, estimate) => (
    estimate.probability < hardest.probability ? estimate : hardest
  ), estimates[0]);
}

function shotDirectionAngle(shot) {
  const direction = shot?.shotInput?.direction;
  const directionPoint = clonePoint(direction);
  if (!directionPoint) return null;
  const normalized = normalize(directionPoint);
  return normalized ? angleOf(normalized) : null;
}

function estimateMissedPotAttempt(state, shot, options = {}) {
  const resolvedOptions = mergeOptions(options);
  const snapshotBalls = shot?.preShotSnapshot?.balls || [];
  const cueBall = findCueBall(snapshotBalls, state.cueBallId);
  const objectBall = findBallById(snapshotBalls, shot?.firstContactBallId);
  const shotAngle = shotDirectionAngle(shot);
  if (!cueBall || !objectBall || objectBall.kind === BALL_KIND.CUE || shotAngle === null) return null;

  const candidates = (state.tableColliderSet?.pockets || state.pockets || [])
    .map((pocket) => {
      const aim = aimAngleForPot(cueBall, objectBall, pocket, resolvedOptions);
      if (!aim) return null;
      // A close, easy pot can be missed by more than 2.5 degrees and still
      // plainly be an attempt at this pocket. Check the object's projected
      // path near the opening as well, rather than treating it as a safety.
      const objectDirection = objectDirectionFromCueAim(aim.cuePos, aim.geometry.objectPos, shotAngle);
      const forward = objectDirection ? dot(objectDirection, aim.geometry.potDirection) : 0;
      const side = objectDirection
        ? Math.abs(objectDirection.x * aim.geometry.potDirection.y - objectDirection.y * aim.geometry.potDirection.x)
        : Infinity;
      const pocketMissDistanceMm = forward > 0
        ? aim.geometry.objectToPocketDistance * side / forward : Infinity;
      const nearPocketAttempt = pocketMissDistanceMm <= effectivePocketWindowMm(pocket, resolvedOptions) / 2 + resolvedOptions.potAttemptPocketMarginMm;
      return {
        pocket,
        nearPocketAttempt,
        towardPocket: forward > 0,
        pocketMissDistanceMm,
        aimDeviationDeg: angleDiffAbs(shotAngle, aim.angle) * RAD_TO_DEG,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.aimDeviationDeg - b.aimDeviationDeg);

  const qualifies = candidate => candidate.towardPocket
    && (candidate.aimDeviationDeg <= resolvedOptions.maxPotAttemptDeviationDeg || candidate.nearPocketAttempt);
  const best = candidates.find(qualifies) || candidates[0];
  if (!best || !qualifies(best)) {
    return best
      ? { valid: false, reason: 'not-pot-attempt', aimDeviationDeg: best.aimDeviationDeg }
      : null;
  }

  return {
    pocket: best.pocket,
    objectBall,
    aimDeviationDeg: best.aimDeviationDeg,
    ...estimatePotProbability({
      cueBall,
      objectBall,
      pocket: best.pocket,
      balls: snapshotBalls,
    }, resolvedOptions),
  };
}

function findPlayer(players, playerId) {
  return (players || []).find((player) => player.id === playerId) || null;
}

function otherPlayer(players, playerId) {
  return (players || []).find((player) => player.id !== playerId) || null;
}

function remainingTablePointsFromBalls(balls) {
  const activeObjects = activeBallsFromList(balls).filter((ball) => ball.kind !== BALL_KIND.CUE);
  const redsLeft = activeObjects.filter((ball) => ball.kind === BALL_KIND.RED).length;
  if (redsLeft > 0) {
    return redsLeft * (BALL_VALUES[BALL_KIND.RED] + BALL_VALUES[BALL_KIND.BLACK]) + COLOR_CLEARANCE_POINTS;
  }

  return activeObjects.reduce((sum, ball) => sum + (BALL_VALUES[ball.kind] || 0), 0);
}

function isOverSnookerShot(state, shot, ruleResult) {
  if (ruleResult?.foul || Number(ruleResult?.points) <= 0) return false;

  const playerId = shot?.playerId || shot?.preShotSnapshot?.currentPlayerId || state.currentPlayerId;
  const prePlayers = shot?.preShotSnapshot?.players || [];
  const postPlayers = state.players || [];
  const prePlayer = findPlayer(prePlayers, playerId);
  const preOpponent = otherPlayer(prePlayers, playerId);
  const postPlayer = findPlayer(postPlayers, playerId);
  const postOpponent = otherPlayer(postPlayers, playerId);
  if (!prePlayer || !preOpponent || !postPlayer || !postOpponent) return false;

  const preLead = (Number(prePlayer.score) || 0) - (Number(preOpponent.score) || 0);
  const postLead = (Number(postPlayer.score) || 0) - (Number(postOpponent.score) || 0);
  const preRemaining = availablePointsForPlayer(shot.preShotSnapshot, preOpponent.id);
  const postRemaining = availablePointsForPlayer(state, postOpponent.id);

  return preLead <= preRemaining && postLead > postRemaining;
}

function isCenturyBreakShot(state, shot, ruleResult) {
  if (ruleResult?.foul || Number(ruleResult?.points) <= 0) return false;

  const playerId = shot?.playerId || shot?.preShotSnapshot?.currentPlayerId || state.currentPlayerId;
  const preBreak = Number(findPlayer(shot?.preShotSnapshot?.players || [], playerId)?.break) || 0;
  const postBreak = Number(findPlayer(state.players || [], playerId)?.break) || 0;
  return preBreak < 100 && postBreak >= 100;
}

function breakBeforeAndAfter(state, shot) {
  const playerId = shot?.playerId || shot?.preShotSnapshot?.currentPlayerId || state.currentPlayerId;
  return {
    preBreak: Number(findPlayer(shot?.preShotSnapshot?.players || [], playerId)?.break) || 0,
    postBreak: Number(findPlayer(state.players || [], playerId)?.break) || 0,
  };
}

function isMaximumBreakShot(state, shot, ruleResult) {
  if (ruleResult?.foul || Number(ruleResult?.points) <= 0) return false;
  const { preBreak, postBreak } = breakBeforeAndAfter(state, shot);
  return preBreak < 147 && postBreak === 147;
}

function isFinalBlackPotShot(shot, ruleResult) {
  if (ruleResult?.foul) return false;

  const snapshotBalls = shot?.preShotSnapshot?.balls || [];
  const blackPotted = (ruleResult?.pottedBallIds || shot?.pottedBallIds || []).some((ballId) => (
    findBallById(snapshotBalls, ballId)?.kind === BALL_KIND.BLACK
  ));
  if (!blackPotted) return false;

  const phase = shot?.preShotRuleState?.phase || shot?.preShotSnapshot?.ruleState?.phase;
  if (phase === RULE_PHASE.RESPOTTED_BLACK) return false;
  return (
    phase === RULE_PHASE.FINAL_BLACK
    || Boolean(ruleResult?.frameOver)
  );
}

function isFiftyPlusFinalBlackShot(state, shot, ruleResult) {
  if (!isFinalBlackPotShot(shot, ruleResult)) return false;
  return breakBeforeAndAfter(state, shot).postBreak > 50;
}

function potReactionForProbability(probability, flags = {}) {
  if (flags.maximum147 || flags.century || flags.fiftyPlusFinalBlack) {
    const reason = flags.maximum147
      ? 'maximum-147'
      : flags.century
        ? 'century'
        : 'fifty-plus-final-black';
    return { bankName: 'crowdAmazing', intensity: 1, reason };
  }
  if (flags.overSnooker) {
    return { bankName: 'crowdGreat', intensity: 0.9, reason: 'over-snooker' };
  }

  if (probability > 0.60) return null;
  if (probability >= 0.40) return { bankName: 'crowdOk', intensity: 0.35, reason: 'modest-pot' };
  if (probability >= 0.25) return { bankName: 'crowdGood', intensity: 0.62, reason: 'good-pot' };
  if (probability >= 0.1) return { bankName: 'crowdGreat', intensity: 0.82, reason: 'great-pot' };
  return { bankName: 'crowdAmazing', intensity: 1, reason: 'amazing-pot' };
}

function missReactionForProbability(probability) {
  if (probability > 0.80) return { bankName: 'crowdTerrible', intensity: 0.9, reason: 'easy-miss' };
  if (probability >= 0.50) return { bankName: 'crowdTerribleSoft', intensity: 0.58, reason: 'makeable-miss' };
  return null;
}

function isFullClearanceShot(state, shot, result) {
  if (!isFinalBlackPotShot(shot, result)) return false;
  const pots = state.ruleState?.currentBreakPots || {};
  return pots.red >= 15 && COLOR_ORDER.every(kind => pots[kind] >= 1)
    && COLOR_ORDER.reduce((sum, kind) => sum + (pots[kind] || 0), 0) >= 21;
}
function milestoneFlags(state, shot, result) {
  return {breakAfter:breakBeforeAndAfter(state,shot).postBreak, overSnooker:isOverSnookerShot(state,shot,result), century:isCenturyBreakShot(state,shot,result),
    maximum147:isMaximumBreakShot(state,shot,result), fiftyPlusFinalBlack:isFiftyPlusFinalBlackShot(state,shot,result),
    finalBlackClearance:isFinalBlackPotShot(shot,result), fullClearance:isFullClearanceShot(state,shot,result)};
}
// Half-width in degrees. Exact .05 belongs to praise 1; exact .03 to 1, .01 to 2.
function potReactionForTolerance(tolerance, flags = {}) {
  let level = Number.isFinite(tolerance) && tolerance >= 0 && tolerance <= .05
    ? tolerance < .01 ? 3 : tolerance < .03 ? 2 : 1 : 0;
  let reason = 'angular-tolerance-pot';
  if (flags.overSnooker) {
    level = Math.max(Number(flags.breakAfter) >= 50 ? 3 : 2, level); reason = 'over-snooker';
  }
  if (flags.finalBlackClearance) {level = Math.max(3, level); reason = 'final-black-clearance';}
  if (flags.century || flags.fiftyPlusFinalBlack) {
    level = 4; reason = flags.century ? 'century' : 'fifty-plus-final-black';
  }
  if (flags.maximum147 || flags.fullClearance) {
    level = 5; reason = flags.maximum147 ? 'maximum-147' : 'full-clearance';
  }
  if (!level) return null;
  return {bankName:['','crowdOk','crowdGood','crowdGreat','crowdAmazing','crowdAmazing'][level],
    intensity:[0,.35,.62,.82,.92,1][level], praiseLevel:level, toleranceDegrees:tolerance, flags, reason};
}
function missReactionForTolerance(tolerance) {
  if (!Number.isFinite(tolerance)) return null;
  if (tolerance > .1) return {bankName:'crowdTerrible',intensity:.9,reason:'easy-miss',toleranceDegrees:tolerance};
  if (tolerance >= .05) return {bankName:'crowdTerribleSoft',intensity:.58,reason:'makeable-miss',toleranceDegrees:tolerance};
  return null;
}
function shotTolerance(shot, ballId, pocketId) {
  const r = shot?.crowdTolerance;
  return r?.status === 'ok' && (!ballId || r.targetId === ballId) && (!pocketId || r.pocketId === pocketId)
    ? r.tolerance : undefined;
}
function projectedMilestones(state, pottedIds) {
  const shot = state.activeShot;
  if (!shot?.preShotSnapshot) return {};
  const projected = JSON.parse(JSON.stringify(state));
  const prefix = {...shot, pottedBallIds:[...pottedIds], cueBallPotted:false};
  projected.players = JSON.parse(JSON.stringify(shot.preShotSnapshot.players || state.players));
  projected.balls = JSON.parse(JSON.stringify(shot.preShotSnapshot.balls));
  for (const ball of projected.balls) if (pottedIds.includes(ball.id)) ball.potted = true;
  projected.ruleState = JSON.parse(JSON.stringify(shotRuleState(state)));
  const result = resolveShot(projected, prefix, {detectFouls:false}).result;
  return milestoneFlags(projected,prefix,result);
}

function reactionVolume(reaction) {
  if (!reaction) return 0;
  const intensity = clamp01(reaction.intensity ?? 1);
  if (reaction.bankName?.startsWith('crowdTerrible')) {
    return 0.18 + intensity * 0.42;
  }
  return 0.2 + intensity * 0.5;
}

function assessCrowdReaction(state, shot, ruleResult, options = {}) {
  if (!state || !shot) return null;

  if (ruleResult?.foul || shot.cueBallPotted) {
    const failedEscape = !shot.cueBallPotted && startedSnookered(state,shot)
      && (!shot.firstContactBallId || (ruleResult?.fouls || []).some(f => (f.code || f) === 'wrong-first-contact'));
    const reaction = foulReaction('foul-or-cue-ball',null,failedEscape);
    return {...reaction, type:'negative'};
  }

  const pottedEstimate = estimateHardestPottedBall(state, shot, options);
  if (pottedEstimate) {
    const flags = milestoneFlags(state,shot,ruleResult);
    const reaction = potReactionForTolerance(shotTolerance(shot, pottedEstimate.objectBall.id, pottedEstimate.pocket.id), flags);
    if (!reaction) return null;
    return {
      ...reaction,
      type: 'positive',
      approachSpeedMmS: shot.crowdTolerance?.approachSpeedMmS,
      ballId: pottedEstimate.objectBall.id,
      pocketId: pottedEstimate.pocket.id,
      flags,
      volume: reactionVolume(reaction),
    };
  }

  // Missing geometry must not turn an already recorded legal pot into a miss.
  if (pottedObjectEvents(shot).length || (ruleResult?.pottedBallIds || shot.pottedBallIds || []).length) return null;

  const missedAttempt = estimateMissedPotAttempt(state, shot, options);
  if (!missedAttempt?.valid) return null;

  const reaction = missReactionForTolerance(shotTolerance(shot, missedAttempt.objectBall.id, missedAttempt.pocket.id));
  if (!reaction) return null;
  return {
    ...reaction,
    type: 'negative',
    approachSpeedMmS: shot.crowdTolerance?.approachSpeedMmS,
    ballId: missedAttempt.objectBall.id,
    pocketId: missedAttempt.pocket.id,
    aimDeviationDeg: missedAttempt.aimDeviationDeg,
    volume: reactionVolume(reaction),
  };
}

function createCrowdAudioController(audio, options = {}) {
  return {
    assessShotReaction(state, shot, ruleResult) {
      return assessCrowdReaction(state, shot, ruleResult, options);
    },
    playShotReaction(state, shot, ruleResult) {
      const reaction = assessCrowdReaction(state, shot, ruleResult, options);
      if (!reaction) return null;
      const playback = audio.play(reaction.bankName, reaction.intensity, {
        volume: reaction.volume,
      });
      return {
        ...reaction,
        playback,
      };
    },
  };
}

function firstContactBallIdFromEvents(events, cueBallId) {
  const hit = (events || []).find((event) => (
    event?.type === 'ball-hit-ball'
    && (event.ballAId === cueBallId || event.ballBId === cueBallId)
  ));
  if (!hit) return null;
  return hit.ballAId === cueBallId ? hit.ballBId : hit.ballAId;
}

function isFoulReaction(reaction) {
  return reaction?.bankName === 'crowdTerrible' || reaction?.bankName === 'crowdTerribleSoft';
}

function isSettlementMilestoneReaction(reaction) {
  return [
    'maximum-147',
    'century',
    'fifty-plus-final-black',
    'over-snooker',
  ].includes(reaction?.reason);
}

function shotSnapshotBalls(state) {
  return state?.activeShot?.preShotSnapshot?.balls || state?.balls || [];
}

function shotRuleState(state) {
  return state?.activeShot?.preShotRuleState
    || state?.activeShot?.preShotSnapshot?.ruleState
    || state?.ruleState
    || {};
}

function baseTargetKinds(state, ruleState = shotRuleState(state)) {
  const balls = shotSnapshotBalls(state).filter((ball) => !ball.potted);
  switch (ruleState.phase) {
    case RULE_PHASE.REDS:
      return [BALL_KIND.RED];
    case RULE_PHASE.COLOR_CHOICE:
      return COLOR_ORDER.filter((kind) => balls.some((ball) => ball.kind === kind));
    case RULE_PHASE.CLEARANCE:
      return [ruleState.targetColorKind].filter(Boolean);
    case RULE_PHASE.FINAL_BLACK:
    case RULE_PHASE.RESPOTTED_BLACK:
      return [BALL_KIND.BLACK];
    default:
      return [];
  }
}

function instantaneousShotTarget(state, firstContactBallId) {
  const ruleState = shotRuleState(state);
  const balls = shotSnapshotBalls(state);
  const firstContactBall = findBallById(balls, firstContactBallId);
  const targetsBeforeContact = baseTargetKinds(state, ruleState);
  const firstKind = firstContactBall?.kind || null;

  if (ruleState.freeBallAvailable && firstKind && !targetsBeforeContact.includes(firstKind)) {
    return { targetKinds: [firstKind], freeBallKind: firstKind, ruleState };
  }
  if (ruleState.phase === RULE_PHASE.COLOR_CHOICE && COLOR_ORDER.includes(firstKind)) {
    return { targetKinds: [firstKind], freeBallKind: null, ruleState };
  }
  return { targetKinds: targetsBeforeContact, freeBallKind: null, ruleState };
}

function touchingTargetAlreadySatisfiesContact(state, targetKinds) {
  const ruleState = shotRuleState(state);
  return (ruleState.touchingBalls || []).some((entry) => (
    entry?.isOn || targetKinds.includes(entry?.kind)
  ));
}

function foulReaction(reason, event, soft = false) {
  const reaction = {
    bankName: soft ? 'crowdTerribleSoft' : 'crowdTerrible',
    intensity: soft ? 0.58 : 0.82,
    reason,
    ballId: event?.ballId || null,
    point: event?.point || event?.pocketCenter || null,
  };
  return {
    ...reaction,
    volume: reactionVolume(reaction),
  };
}

function createImmediateCrowdReactionTracker(options = {}) {
  const resolvedOptions = mergeOptions(options);
  const nearMiss = createNearMissTracker();
  let softIncidentReacted = false;
  let targetBallId = null;
  let firstOutcome = null;
  let reacted = false;
  let firstContactChecked = false;
  let foulReacted = false;
  let queuedReactions = [];
  let missedAttempt;
  let nearestPocketDistance = Infinity;
  let targetMoved = false;
  let legalPots = [], pendingPot = null, missEventAt = null;

  function reset() {
    nearMiss.reset(); softIncidentReacted = false;
    targetBallId = null;
    firstOutcome = null;
    reacted = false;
    firstContactChecked = false;
    foulReacted = false;
    queuedReactions = [];
    missedAttempt = undefined;
    nearestPocketDistance = Infinity;
    targetMoved = false;
    legalPots = []; pendingPot = null; missEventAt = null;
  }

  function targetId(state, events) {
    if (targetBallId) return targetBallId;
    targetBallId = state?.activeShot?.firstContactBallId
      || firstContactBallIdFromEvents(events, state?.cueBallId);
    return targetBallId;
  }

  function reactionForPot(state, event) {
    const shot = state?.activeShot || {};
    const snapshotBalls = shot?.preShotSnapshot?.balls || state?.balls || [];
    const objectBall = findBallById(snapshotBalls, event.ballId);
    const cueBall = findCueBall(snapshotBalls, state?.cueBallId);
    const pocket = findPocket(state, event.pocketId);
    if (!objectBall || objectBall.kind === BALL_KIND.CUE || !cueBall || !pocket) return null;
    const flags = event.flags || projectedMilestones(state, legalPots);
    const tolerance = shotTolerance(shot, event.ballId, event.pocketId);
    const reaction = potReactionForTolerance(tolerance, flags);
    if (tolerance === undefined && !reaction && shot.crowdTolerance?.status === 'pending') {
      pendingPot = {...event,flags,eventAt:event.eventAt ?? performance.now()};
      return null;
    }
    return reaction ? {...reaction, ballId:event.ballId, pocketId:event.pocketId,
      point:event.point || event.pocketCenter || null, eventAt:event.eventAt,
      volume:reactionVolume(reaction)} : null;
  }

  function handleEvents(state, events = [], deltaSeconds = 0) {
    const target = targetId(state, events);
    const balls = shotSnapshotBalls(state);
    const shotTarget = instantaneousShotTarget(state, target);

    if (pendingPot && !foulReacted && state.activeShot?.crowdTolerance?.status !== 'pending') {
      const event = pendingPot; pendingPot = null;
      const reaction = reactionForPot(state, event);
      if (reaction) queuedReactions.push(reaction);
    }
    events.forEach((event) => {
      if (
        !firstContactChecked
        && event?.type === 'ball-hit-ball'
        && (event.ballAId === state?.cueBallId || event.ballBId === state?.cueBallId)
      ) {
        firstContactChecked = true;
        const contactedBallId = event.ballAId === state.cueBallId ? event.ballBId : event.ballAId;
        const contactedBall = findBallById(balls, contactedBallId);
        const legalBeforeContact = baseTargetKinds(state);
        const touchingTarget = touchingTargetAlreadySatisfiesContact(state, legalBeforeContact);
        const freeBallContact = shotRuleState(state).freeBallAvailable;
        if (
          !foulReacted
          && !touchingTarget
          && !freeBallContact
          && contactedBall
          && !legalBeforeContact.includes(contactedBall.kind)
        ) {
          foulReacted = true;
          queuedReactions.push(foulReaction('wrong-first-contact-immediate', event, startedSnookered(state,state.activeShot)));
        }
      }

      const cueBallPotted = event?.type === 'cue-ball-potted'
        || (event?.type === 'ball-potted' && event.ballId === state?.cueBallId);
      if (!foulReacted && cueBallPotted) {
        foulReacted = true;
        queuedReactions.push(foulReaction('cue-ball-potted-immediate', event));
        return;
      }

      if (event?.type !== 'ball-potted' || event.ballId === state?.cueBallId) return;
      const pottedBall = findBallById(balls, event.ballId);
      if (!pottedBall) return;
      const isFreeBall = shotTarget.freeBallKind && pottedBall.kind === shotTarget.freeBallKind;
      const isTrueTargetDuringFreeBall = shotTarget.freeBallKind
        && baseTargetKinds(state, shotTarget.ruleState).includes(pottedBall.kind);
      const isTarget = shotTarget.targetKinds.includes(pottedBall.kind);

      if (!foulReacted && (!reacted || firstOutcome === 'miss')
        && (isTarget || isFreeBall || isTrueTargetDuringFreeBall)) {
        legalPots.push(event.ballId);
        const reaction = reactionForPot(state, event);
        // An easy legal pot may not deserve applause, but is never a miss.
        firstOutcome = 'pot';
        reacted = true;
        if (reaction) {
          queuedReactions.push(reaction);
        }
      }

      if (!foulReacted && !isFreeBall && !isTrueTargetDuringFreeBall && !isTarget) {
        foulReacted = true;
        queuedReactions.push(foulReaction('non-target-ball-potted-immediate', event));
      }
    });

    if (!reacted && !foulReacted && !softIncidentReacted && target) {
      if (missedAttempt === undefined) missedAttempt = estimateMissedPotAttempt(state, state.activeShot, resolvedOptions);
      const liveBall = findBallById(state.balls, target);
      const pocket = missedAttempt?.valid && missedAttempt.pocket;
      const center = pocket && pocketOpeningCenter(pocket);
      const position = ballPosition(liveBall);
      if (center && position && !liveBall.potted) {
        const velocity = liveBall.vel || liveBall.velocity || {x:0,y:0};
        const speed = length(velocity);
        targetMoved ||= speed > 1;
        const gap = distance(position, center);
        nearestPocketDistance = Math.min(nearestPocketDistance, gap);
        const passedPocket = nearestPocketDistance < BALL_DIAMETER_MM * 4
          && gap > nearestPocketDistance + 50 && dot(sub(position, center), velocity) > 0;
        const stoppedShort = targetMoved && speed <= 1;
        const falling = liveBall.pocketEntry || liveBall.potting
          || ['entry','falling','captured','potted'].includes(liveBall.pocketMode);
        if ((passedPocket || stoppedShort) && !falling && missEventAt === null) missEventAt = performance.now();
        const reaction = (passedPocket || stoppedShort) && !falling
          ? missReactionForTolerance(shotTolerance(state.activeShot, target, pocket.id)) : null;
        if (reaction) {
          reacted = true;
          firstOutcome = 'miss';
          queuedReactions.push({...reaction, reason:'target-ball-missed-immediate',
            ballId:target, eventAt:missEventAt, volume:reactionVolume(reaction)});
        }
      }
    }
    const incident = nearMiss.update(state, events, deltaSeconds, b => b.id === state.cueBallId
      || (!shotTarget.targetKinds.includes(b.kind) && b.kind !== shotTarget.freeBallKind
        && !(shotTarget.freeBallKind && baseTargetKinds(state, shotTarget.ruleState).includes(b.kind))));
    if (!foulReacted && !softIncidentReacted && incident
      && !queuedReactions.some(isFoulReaction) && firstOutcome !== 'miss') {
      softIncidentReacted = true;
      queuedReactions.push({...foulReaction(incident.reason, incident, true),
        pocketId:incident.pocketId, eventAt:performance.now(), softIncident:true});
    }
    if (foulReacted) queuedReactions = queuedReactions.filter(isFoulReaction);
    return queuedReactions.shift() || null;
  }

  function finalize(finalReaction, finalContext = {}) {
    if (queuedReactions.length > 0) return queuedReactions.shift();
    if (!foulReacted && !softIncidentReacted
      && selfSnookeredAfterPot(finalContext.state,finalContext.shot,finalContext.ruleResult)) {
      softIncidentReacted = true; pendingPot = null;
      return {...foulReaction('self-snookered-after-pot', null, true),softIncident:true,eventAt:performance.now()};
    }
    if (softIncidentReacted && isFoulReaction(finalReaction)
      && !finalContext.ruleResult?.foul && !finalContext.shot?.cueBallPotted) return null;
    if (!finalReaction) return null;
    const hasLegalPot = firstOutcome === 'pot'
      || (finalContext.ruleResult?.pottedBallIds || finalContext.shot?.pottedBallIds || []).length > 0;
    if (hasLegalPot && isFoulReaction(finalReaction)
      && !finalContext.ruleResult?.foul && !finalContext.shot?.cueBallPotted) return null;
    if (isFoulReaction(finalReaction) && foulReacted) return null;
    if (!reacted) {
      firstOutcome = isFoulReaction(finalReaction) ? 'miss' : 'pot';
      reacted = true;
      return finalReaction;
    }
    if (firstOutcome === 'pot' && isFoulReaction(finalReaction)) return finalReaction;
    // Legal pots, including milestones, were handled at the pot event.
    if (firstOutcome === 'pot') return null;
    return null;
  }

  reset();
  return {
    handleEvents,
    drain: () => queuedReactions.splice(0),
    finalize,
    reset,
    getState: () => ({ targetBallId, firstOutcome, reacted, foulReacted, softIncidentReacted }),
  };
}

module.exports = {
  assessCrowdReaction,
  createCrowdAudioController,
  createImmediateCrowdReactionTracker,
  estimateMissedPotAttempt,
  estimatePotProbability,
  isCenturyBreakShot,
  isFiftyPlusFinalBlackShot,
  isMaximumBreakShot,
  isFullClearanceShot,
  isOverSnookerShot,
  potReactionForTolerance,
  missReactionForTolerance,
  potReactionForProbability,
  missReactionForProbability,
  remainingTablePointsFromBalls,
};

}, {"./nearMissCrowd":73,"./snookerCrowd":74,"../config/constants":3,"../core/model/ballSpec":4,"../core/rules/rulesEngine":19,"../core/rules/scoreAvailability":23}, "apps/three-game/src/audio/crowdReaction.js"],
73: [function(require, module, exports) {
const { BALL_RADIUS_MM } = require('../core/model/ballSpec');
const falling = b => b.potted || b.pocketEntry || b.potting
  || ['entry','falling','captured','potted'].includes(b.pocketMode);

// Read-only pocket geometry: the cloth-side strip is one ball radius wide.
function segments(pocket) {
  const out=[];
  for(const edge of pocket.dropEdges || []) for(let i=1;i<edge.points.length;i++) {
    const a=edge.points[i-1],b=edge.points[i],sx=b.x-a.x,sy=b.y-a.y,l=Math.hypot(sx,sy);
    if(!l || !pocket.capture?.center)continue;
    let nx=-sy/l,ny=sx/l;
    if((pocket.capture.center.x-a.x)*nx+(pocket.capture.center.y-a.y)*ny<0){nx=-nx;ny=-ny;}
    out.push({a,sx,sy,l,nx,ny});
  }
  return out;
}
function depth(p,s){return (p.x-s.a.x)*s.nx+(p.y-s.a.y)*s.ny;}
function approaching(p,v,s,r,dt=0) {
  const speed=v.x*s.nx+v.y*s.ny,d=depth(p,s);
  if(speed<=1e-6 || d>0 || d+speed*dt < -r)return false;
  const t=-d/speed,x=p.x+v.x*t,y=p.y+v.y*t;
  const along=((x-s.a.x)*s.sx+(y-s.a.y)*s.sy)/(s.l*s.l);
  return along>=0 && along<=1;
}
function createNearMissTracker() {
  let previous=new Map(),pending=new Map();
  return {
    reset(){previous.clear();pending.clear();},
    update(state,events,dt,eligible) {
      const pockets=state.tableColliderSet?.pockets || state.pockets || [];
      const result=[];
      for(const b of state.balls || []) {
        const old=previous.get(b.id),p=b.pos,v=b.vel || b.velocity || {x:0,y:0};
        previous.set(b.id,{pos:{...p},vel:{...v}});
        if(!p || !eligible(b) || falling(b)){pending.delete(b.id);continue;}
        const r=b.radius || BALL_RADIUS_MM;
        for(const pocket of pockets) {
          for(const s of segments(pocket)) {
            const jaw=events.find(e=>e.type==='ball-hit-pocket-jaw'&&e.ballId===b.id&&e.pocketId===pocket.id);
            const contact=jaw?.point && jaw?.normal && {
              x:jaw.point.x+jaw.normal.x*r,y:jaw.point.y+jaw.normal.y*r};
            // Use a swept segment for sparse playback frames; for a jaw rebound
            // the collision point reconstructs the centre at impact, so a bounce
            // outside the danger strip cannot be armed by extrapolation.
            const travel=old && {x:p.x-old.pos.x,y:p.y-old.pos.y};
            if(approaching(p,v,s,r) || (old && approaching(old.pos,travel,s,r,1))
              || (old && contact && approaching(contact,old.vel,s,r))) {
              pending.set(b.id,{pocketId:pocket.id,segment:s});
            }
          }
        }
        const candidate=pending.get(b.id);
        if(!candidate)continue;
        const s=candidate.segment,d=depth(p,s),outward=v.x*s.nx+v.y*s.ny<0;
        if(d<=0 && ((d < -r && outward) || Math.hypot(v.x,v.y)<=1)) {
          result.push({ballId:b.id,pocketId:candidate.pocketId,point:{...p},
            reason:b.id===state.cueBallId?'cue-ball-near-scratch':'non-target-near-pot'});
          pending.delete(b.id);
        }
      }
      return result[0] || null;
    },
  };
}
module.exports={createNearMissTracker};

}, {"../core/model/ballSpec":4}, "apps/three-game/src/audio/nearMissCrowd.js"],
74: [function(require, module, exports) {
const Rules = require('../core/rules/rulesEngine');
const { completelyBlocked } = require('./directContact');
function distancePraiseLevel(mm) {
  if (!Number.isFinite(mm) || mm <= 1000) return 0;
  return mm <= 2000 ? 1 : mm <= 3000 ? 2 : 3;
}
function startedSnookered(state, shot) {
  const snapshot = shot?.preShotSnapshot;
  if (!snapshot || snapshot.ruleState?.cueBallInHand) return false;
  const pre = {...state,...snapshot,cueBallId:state.cueBallId};
  return Rules.isSnookeredOnTargets(pre,shot.preShotRuleState || snapshot.ruleState || {});
}
function assessSnookerContext(state,shot,result,{foul=false}={}) {
  const level = distancePraiseLevel(shot?.cueTravelDistanceMm);
  if (!shot || foul || result?.foul || shot.cueBallPotted || !shot.firstContactBallId) return null;
  const snapshot = shot.preShotSnapshot;
  const escaped = !!snapshot && completelyBlocked(
    {...state,...snapshot,cueBallId:state.cueBallId},
    shot.preShotRuleState || snapshot.ruleState || {});
  const potted = (result?.pottedBallIds || shot.pottedBallIds || []).length > 0;
  const passedTurn = !potted && !state.frameOver;
  const made = passedTurn && !state.ruleState?.cueBallInHand && completelyBlocked(state,state.ruleState);
  if (!escaped && !made) return null;
  return {escaped,made,level,distanceMm:shot.cueTravelDistanceMm || 0,
    needsOpportunityCheck:escaped && level > 0 && passedTurn};
}
function selfSnookeredAfterPot(state,shot,result) {
  if(!state || !shot || result?.foul || shot.cueBallPotted || state.frameOver
    || state.ruleState?.cueBallInHand || !shot.firstContactBallId) return false;
  const playerId=shot.playerId || shot.preShotSnapshot?.currentPlayerId;
  if(!playerId || state.currentPlayerId!==playerId) return false;
  const priorBreak=shot.preShotSnapshot?.players?.find(p=>p.id===playerId)?.break || 0;
  if(priorBreak<=0 || !(result?.pottedBallIds || shot.pottedBallIds || []).length) return false;
  return completelyBlocked(state,state.ruleState);
}
function chooseSnookerReaction(context,potReaction,opportunity='unknown') {
  if (!context) return potReaction || null;
  // An escape that leaks an easy pot cannot earn tactical applause, even if it
  // also leaves a partial snooker. Unknown searches do not award false praise.
  const eligible = !context.needsOpportunityCheck || opportunity === 'safe';
  const level = eligible ? context.level : 0;
  if (!level || (potReaction?.praiseLevel || 0) >= level) return potReaction || null;
  const intensity=[0,.35,.62,.82][level];
  return {bankName:['','crowdOk','crowdGood','crowdGreat'][level],intensity,volume:.2+intensity*.5,
    praiseLevel:level,reason:context.escaped?'snooker-escape':'snooker-made',distanceMm:context.distanceMm};
}
module.exports={selfSnookeredAfterPot,distancePraiseLevel,startedSnookered,assessSnookerContext,chooseSnookerReaction};

}, {"../core/rules/rulesEngine":19,"./directContact":75}, "apps/three-game/src/audio/snookerCrowd.js"],
75: [function(require, module, exports) {
const Rules = require('../core/rules/rulesEngine');
const { BALL_RADIUS_MM } = require('../core/model/ballSpec');

// Sweep exact angular visibility cells, rather than sampling aim directions.
// First-contact identity can change only at a circle tangent or intersection.
function completelyBlocked(state, ruleState = state.ruleState) {
  if (ruleState?.cueBallInHand) return false;
  const cue = state.balls?.find(b => b.id === state.cueBallId || b.kind === 'cue');
  if (!cue || cue.potted) return false;
  const kinds = Rules.targetKindsForRule(ruleState || {}, state);
  const circles = state.balls.filter(b => !b.potted && b.id !== cue.id).map(b => ({
    x: b.pos.x - cue.pos.x, y: b.pos.y - cue.pos.y,
    r: (cue.radius || BALL_RADIUS_MM) + (b.radius || BALL_RADIUS_MM),
    legal: kinds.includes(b.kind),
  }));
  if (!circles.some(c => c.legal)) return false;
  const angles = [-Math.PI, Math.PI];
  for (const c of circles) {
    const d = Math.hypot(c.x, c.y);
    // Touching/overlapping positions cannot prove complete obstruction.
    if (d <= c.r + 1e-7) return false;
    const a = Math.atan2(c.y, c.x), h = Math.asin(c.r / d);
    for (const v of [a - h, a + h]) angles.push(Math.atan2(Math.sin(v), Math.cos(v)));
  }
  for (let i = 0; i < circles.length; i++) for (let j = i + 1; j < circles.length; j++) {
    const a = circles[i], b = circles[j], dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.hypot(dx, dy);
    if (!d || d > a.r + b.r || d < Math.abs(a.r - b.r)) continue;
    const t = (a.r * a.r - b.r * b.r + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, a.r * a.r - t * t));
    for (const s of [-1, 1]) angles.push(Math.atan2(
      a.y + t * dy / d + s * h * dx / d,
      a.x + t * dx / d - s * h * dy / d));
  }
  angles.sort((a, b) => a - b);
  function canContact(angle) {
    const ux = Math.cos(angle), uy = Math.sin(angle);
    let legal = Infinity, illegal = Infinity;
    for (const c of circles) {
      const projection = c.x * ux + c.y * uy;
      const cross = c.x * uy - c.y * ux;
      const disc = c.r * c.r - cross * cross;
      if (projection < 0 || disc < -1e-7) continue;
      const entry = Math.max(0, projection - Math.sqrt(Math.max(0, disc)));
      if (c.legal) legal = Math.min(legal, entry);
      else illegal = Math.min(illegal, entry);
    }
    return Number.isFinite(legal) && legal <= illegal + 1e-7;
  }
  // Include boundaries: a detectable thin edge must not earn snooker applause.
  for (let i = 0; i < angles.length; i++) {
    if (canContact(angles[i])) return false;
    if (i && canContact((angles[i - 1] + angles[i]) / 2)) return false;
  }
  return true;
}
module.exports = { completelyBlocked };

}, {"../core/rules/rulesEngine":19,"../core/model/ballSpec":4}, "apps/three-game/src/audio/directContact.js"],
76: [function(require, module, exports) {
const { BALL_KIND, COLOR_ORDER } = require('../../config/constants');
const { createBallState } = require('../state/ballState');
const { createTableModel } = require('../model/tableModel');
const { createTableColliderSet } = require('../model/tableColliderSet');
const { colorSpot } = require('../model/spotModel');
const { TABLE_BOUNDARY_PRESET_IDS } = require('../model/tableBoundaryPresets');
const { createPhysicsEngine } = require('../physics/physicsEngine');
const { applyTableFriction, getContactSlipVelocity } = require('../physics/friction');
const { applyShot } = require('../physics/shotResolver');
const { normalizePhysicsOptions, PHYSICS_DEFAULTS } = require('../physics/config/physicsParams');
const { normalizeV3PhysicsValues } = require('../physics/v3Config');
const { normalize } = require('../physics/vector');

const DEFAULT_AIM_PHYSICS_HZ = 120;
const DEFAULT_TABLE_BOUNDARY_ID = TABLE_BOUNDARY_PRESET_IDS.PRO_MATCH_84;

function round(value, digits = 6) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function cloneVector2(vector) {
  return {
    x: round(vector.x, 4),
    y: round(vector.y, 4),
  };
}

function sanitizePhysicsOverrides(overrides = {}) {
  if (overrides.physicsEngine === 'v3' || overrides.physicsVariant === 'SP') {
    return {
      physicsEngine: 'v3',
      ...(overrides.physicsVariant !== 'SP' && Object.hasOwn(overrides, 'testFieldSMCushionResponse')
        ? { testFieldSMCushionResponse: require('../physics/smEmpiricalCushion').normalize(overrides.testFieldSMCushionResponse) } : {}),
      ...(overrides.physicsVariant === 'SP' ? { physicsVariant: 'SP', sp: require('../physics/sp/config').normalizeSP(overrides.sp) } : {}),
      ...(overrides.physicsVariant !== 'SP' && Object.hasOwn(overrides, 'testFieldSMCushionSpeedCorrectionStrength')
        ? { testFieldSMCushionSpeedCorrectionStrength: require('../physics/smCushionSpeedCorrection').normalizeStrength(overrides.testFieldSMCushionSpeedCorrectionStrength) } : {}),
      v3: normalizeV3PhysicsValues(overrides.v3 || overrides.v3Physics || {}),
    };
  }
  const normalized = normalizePhysicsOptions(overrides);
  const sanitized = {};
  Object.entries(normalized).forEach(([key, raw]) => {
    if (!Object.prototype.hasOwnProperty.call(PHYSICS_DEFAULTS, key)) return;
    if (typeof raw === 'boolean') {
      sanitized[key] = raw;
      return;
    }
    const value = Number(raw);
    if (Number.isFinite(value)) sanitized[key] = value;
  });
  return sanitized;
}

function colorSpotForKind(kind, fallback) {
  return COLOR_ORDER.includes(kind) ? colorSpot(kind) : fallback;
}

function inputOrientation(value) {
  if (!value || typeof value !== 'object') return null;
  const x = Number(value.x);
  const y = Number(value.y);
  const z = Number(value.z);
  const w = Number(value.w);
  if (![x, y, z, w].every(Number.isFinite)) return null;
  const length = Math.hypot(x, y, z, w);
  if (length <= 0.000001) return null;
  return { x: x / length, y: y / length, z: z / length, w: w / length };
}

function createAimBallState(input) {
  const position = {
    x: Number(input.pos?.x) || 0,
    y: Number(input.pos?.y) || 0,
  };
  const ball = createBallState(
    input.id,
    input.kind || BALL_KIND.RED,
    position,
    colorSpotForKind(input.kind, position),
  );
  const orientation = inputOrientation(input.orientation);
  if (orientation) ball.orientation = orientation;
  return ball;
}

// Reuse fixed aim geometry; retain fresh per-request motion and solver scratch.
let aimTableGeometry = null;
function getAimTableGeometry(tableBoundaryId) {
  const boundaryId = tableBoundaryId || DEFAULT_TABLE_BOUNDARY_ID;
  if (aimTableGeometry?.boundaryId === boundaryId) return aimTableGeometry;
  const table = createTableModel();
  const tableColliderSet = createTableColliderSet(table, {
    tableBoundaryId: boundaryId,
  });
  table.tableBoundaryId = boundaryId;
  table.throatWidthMm = { ...tableColliderSet.throatWidthMm };
  table.mouthWidthMm = { ...tableColliderSet.mouthWidthMm };
  aimTableGeometry = { boundaryId, table, tableColliderSet };
  return aimTableGeometry;
}

function createAimState(balls, options = {}) {
  const { table, tableColliderSet } = getAimTableGeometry(options.tableBoundaryId);

  return {
    table,
    tableColliderSet,
    pockets: tableColliderSet.pockets,
    balls,
    cueBallId: options.cueBallId || 'cue',
    shot: null,
    aim: null,
    activeShot: null,
    lastShotRecord: null,
    physicsEvents: [],
    pocketWorld: {
      accumulator: 0,
      time: 0,
    },
    frameOver: false,
    matchOver: false,
  };
}

function buildState(payload) {
  const balls = (payload.balls || []).map(createAimBallState);
  return createAimState(balls, {
    cueBallId: payload.cueBallId || 'cue',
    tableBoundaryId: payload.tableBoundaryId || DEFAULT_TABLE_BOUNDARY_ID,
  });
}

function eventInvolvesBallId(event, ballId) {
  return [event.ballId, event.ballAId, event.ballBId].filter(Boolean).includes(ballId);
}

function isCueTargetEvent(event, cueBallId, targetBallId) {
  return event?.type === 'ball-hit-ball'
    && eventInvolvesBallId(event, cueBallId)
    && eventInvolvesBallId(event, targetBallId);
}

function appendPathPoint(points, point, minDistance = 10) {
  const last = points[points.length - 1];
  if (!last || Math.hypot(point.x - last.x, point.y - last.y) >= minDistance) {
    points.push(cloneVector2(point));
  }
}

function velocityDirection(ball, minSpeed = 0.001) {
  const speed = Math.hypot(ball?.vel?.x || 0, ball?.vel?.y || 0);
  if (speed <= minSpeed) return null;
  return {
    x: ball.vel.x / speed,
    y: ball.vel.y / speed,
  };
}

function pureRollingDirection(ball, params) {
  const direction = velocityDirection(ball, Math.max(0.001, params.lowSpeedCutoff || 0));
  if (!direction) return null;
  const slip = getContactSlipVelocity(ball);
  const slipSpeed = Math.hypot(slip.x, slip.y);
  const slipEpsilon = params.physicsVariant === 'SP' ? 10 : Math.max(0.001, params.slipEpsilon || 0);
  return slipSpeed <= slipEpsilon ? direction : null;
}

function cloneBallMotion(ball) {
  const radius = ball.radius || 26.25;
  return {
    radius,
    mass: ball.mass || 1,
    inertia: ball.inertia || (2 / 5) * (ball.mass || 1) * radius * radius,
    vel: {
      x: Number(ball.vel?.x) || 0,
      y: Number(ball.vel?.y) || 0,
    },
    omega: {
      x: Number(ball.omega?.x) || 0,
      y: Number(ball.omega?.y) || 0,
      z: Number(ball.omega?.z) || 0,
    },
    contactMode: ball.contactMode || 'sliding',
    isSliding: ball.isSliding !== false,
    ...(ball.spHeightMm !== undefined ? {spHeightMm:ball.spHeightMm,spVerticalSpeedMmS:ball.spVerticalSpeedMmS,spSupported:ball.spSupported} : {}),
  };
}

function predictUnblockedPureRollingDirection(ball, params) {
  const virtualBall = cloneBallMotion(ball);
  const dt = params.fixedDt || (1 / DEFAULT_AIM_PHYSICS_HZ);
  const maxSteps = Math.ceil(8 / dt);
  const spEngine=params.physicsVariant==='SP'?createPhysicsEngine({physicsVariant:'SP',sp:params.sp}):null;
  if(spEngine&&!virtualBall.pos)virtualBall.pos={x:0,y:0};
  const spState=spEngine?{balls:[virtualBall],cueBallId:virtualBall.id}:null;
  let lastDirection = velocityDirection(virtualBall);

  for (let step = 0; step < maxSteps; step += 1) {
    const rollingDirection = pureRollingDirection(virtualBall, params);
    if (rollingDirection) return rollingDirection;

    if(spEngine)spEngine.step(spState,dt);else applyTableFriction(virtualBall, params, dt);
    const currentDirection = velocityDirection(virtualBall);
    if (currentDirection) lastDirection = currentDirection;

    const speed = Math.hypot(virtualBall.vel.x, virtualBall.vel.y);
    const omega = Math.hypot(
      virtualBall.omega.x,
      virtualBall.omega.y,
      virtualBall.omega.z,
    );
    if (speed <= params.lowSpeedCutoff && omega <= params.lowOmegaCutoff) {
      return lastDirection;
    }
  }

  return pureRollingDirection(virtualBall, params) || lastDirection;
}

function predictUnblockedCueMotion(ball, params, startPoint, maxPathMm) {
  const virtualBall = cloneBallMotion(ball);
  virtualBall.pos = cloneVector2(startPoint);
  const dt = params.fixedDt || (1 / DEFAULT_AIM_PHYSICS_HZ);
  const maxSteps = Math.ceil(8 / dt);
  const path = [cloneVector2(startPoint)];
  const maxPath = Math.max(120, Number(maxPathMm) || 1400);
  let travelled = 0;
  let rollingDirection = null;
  const spEngine=params.physicsVariant==='SP'?createPhysicsEngine({physicsVariant:'SP',sp:params.sp}):null;
  if(spEngine&&!virtualBall.pos)virtualBall.pos={x:0,y:0};
  const spState=spEngine?{balls:[virtualBall],cueBallId:virtualBall.id}:null;
  let lastDirection = velocityDirection(virtualBall);

  for (let step = 0; step < maxSteps; step += 1) {
    if (!rollingDirection) {
      rollingDirection = pureRollingDirection(virtualBall, params);
    }

    const previousPos = cloneVector2(virtualBall.pos);
    if(spEngine)spEngine.step(spState,dt);else applyTableFriction(virtualBall, params, dt);
    const currentDirection = velocityDirection(virtualBall);
    if (currentDirection) lastDirection = currentDirection;

    if(!spEngine){virtualBall.pos.x += virtualBall.vel.x * dt;
    virtualBall.pos.y += virtualBall.vel.y * dt;}

    const segmentLength = Math.hypot(
      virtualBall.pos.x - previousPos.x,
      virtualBall.pos.y - previousPos.y,
    );

    if (segmentLength > 0.001) {
      if (travelled + segmentLength >= maxPath) {
        const remain = Math.max(0, maxPath - travelled);
        const ratio = segmentLength > 0 ? remain / segmentLength : 0;
        path.push({
          x: previousPos.x + (virtualBall.pos.x - previousPos.x) * ratio,
          y: previousPos.y + (virtualBall.pos.y - previousPos.y) * ratio,
        });
        travelled = maxPath;
        break;
      }
      travelled += segmentLength;
      appendPathPoint(path, virtualBall.pos, 10);
    }

    const speed = Math.hypot(virtualBall.vel.x, virtualBall.vel.y);
    const omega = Math.hypot(
      virtualBall.omega.x,
      virtualBall.omega.y,
      virtualBall.omega.z,
    );
    if (speed <= params.lowSpeedCutoff && omega <= params.lowOmegaCutoff) {
      break;
    }
  }

  return {
    cuePath: path,
    rollingDirection: rollingDirection || pureRollingDirection(virtualBall, params) || lastDirection,
  };
}

// Continue the post-contact cue alone against the real 3D cushions. Other balls
// remain excluded, as in the existing assist-only prediction.
function predictCueCushionPaths(ball, state, physics, startPoint, maxPathMm) {
  const cue = {...ball, ...cloneBallMotion(ball), pos:cloneVector2(startPoint), potted:false};
  const virtualState = {...state, balls:[cue], physicsEvents:[]};
  const paths = [[cloneVector2(startPoint)]];
  let travelled = 0, cushionNormal = null;
  const append = point => {
    const path = paths[paths.length-1], previous=path[path.length-1];
    const distance=Math.hypot(point.x-previous.x,point.y-previous.y);
    if(distance<0.001)return;
    const ratio=Math.min(1,Math.max(0,maxPathMm-travelled)/distance);
    path.push({x:previous.x+(point.x-previous.x)*ratio,y:previous.y+(point.y-previous.y)*ratio});
    travelled+=distance*ratio;
  };
  for(let step=0;step<Math.ceil(8/physics.params.fixedDt);step++) {
    physics.step(virtualState,physics.params.fixedDt);
    const events=(virtualState.physicsEvents||[]).filter(e=>e.ballId===cue.id);
    const rail=events.find(e=>e.type==='ball-hit-rail'||e.type==='ball-hit-pocket-jaw');
    if(rail) {
      const point=rail.point&&rail.normal?{x:rail.point.x+rail.normal.x*cue.radius,y:rail.point.y+rail.normal.y*cue.radius}:cue.pos;
      append(point);
      if(paths.length===2||travelled>=maxPathMm)break;
      cushionNormal = rail.normal ? {...rail.normal} : null;
      paths.push([{...paths[0][paths[0].length-1]}]);
    }
    if(cue.potted)break;
    append(cue.pos);
    if(travelled>=maxPathMm||!physics.isTableMoving(virtualState))break;
  }
  return {paths, normal:cushionNormal};
}

function buildAimPredictionState(payload) {
  if (!payload.assistOnly) return buildState(payload);

  const balls = Array.isArray(payload.balls) ? payload.balls : [];
  const cueBallId = payload.cueBallId || 'cue';
  const targetBallId = payload.contactBallId;
  const cueBall = balls.find((ball) => ball.id === cueBallId);
  const targetBall = balls.find((ball) => ball.id === targetBallId);
  if (!cueBall || !targetBall) return buildState(payload);

  return buildState({
    ...payload,
    balls: [cueBall, targetBall],
  });
}

function normalizePredictionStopCondition(value) {
  return value === 'cue-rest' ? 'cue-rest' : 'time-window';
}

function predictAimPath(payload) {
  const state = buildAimPredictionState(payload);
  const physicsOverrides = sanitizePhysicsOverrides(payload.physicsOverrides || {});
  const physics = createPhysicsEngine({
    targetPhysicsHz: Number(payload.physicsHz) || DEFAULT_AIM_PHYSICS_HZ,
    ...physicsOverrides,
  });
  const cueBallId = state.cueBallId;
  const cueBall = state.balls.find((ball) => ball.id === cueBallId);
  const targetBallId = payload.contactBallId;
  const targetBall = state.balls.find((ball) => ball.id === targetBallId);

  if (!cueBall || !targetBall) {
    const error = new Error('缺少预测所需的母球或目标球');
    error.statusCode = 400;
    throw error;
  }

  const shot = payload.shot || {};
  const direction = normalize(shot.direction || { x: 1, y: 0 });
  const power = Math.max(0, Math.min(100, Number(shot.power) || 0));
  const tipOffset = {
    x: Math.max(-0.8, Math.min(0.8, Number(shot.tipOffset?.x) || 0)),
    y: Math.max(-0.8, Math.min(0.8, Number(shot.tipOffset?.y) || 0)),
  };
  const contactPoint = {
    x: Number(payload.contactPoint?.x) || cueBall.pos.x,
    y: Number(payload.contactPoint?.y) || cueBall.pos.y,
  };
  const stopCondition = normalizePredictionStopCondition(payload.stopCondition);
  const maxSeconds = stopCondition === 'cue-rest'
    ? Math.max(1, Math.min(30, Number(payload.maxSafetySeconds) || Number(payload.maxSeconds) || 18))
    : Math.max(0.25, Math.min(4, Number(payload.maxSeconds) || 1.2));
  const maxCuePathMm = Math.max(120, Math.min(2400, Number(payload.maxCuePathMm) || 1400));
  const maxTargetPathMm = Math.max(120, Math.min(2600, Number(payload.maxTargetPathMm) || 1800));
  const assistOnly = Boolean(payload.assistOnly);
  const dt = physics.params.fixedDt;
  const maxSteps = Math.ceil(maxSeconds / dt);
  let cuePath = [cloneVector2(contactPoint)];
  const targetPath = [cloneVector2(targetBall.pos)];
  let elapsed = 0;
  let hit = false;
  let cueDone = false;
  let targetDone = false;
  let cueTravelled = 0;
  let targetTravelled = 0;
  let cuePostContactSpeed = 0;
  let cueRollingDirection = null;
  let cuePostContactDirection = null;
  let cueCushionPaths = null, cueCushionNormal = null;

  applyShot(state, {
    direction,
    power,
    tipOffset,
    ...(physics.params.physicsVariant === 'SP' ? {verticalAngle:Number(shot.verticalAngle)||0} : {}),
    params: physics.params,
  });

  for (let step = 0; step < maxSteps; step += 1) {
    physics.step(state, dt);
    elapsed += dt;
    const frameEvents = state.physicsEvents || [];

    if (!hit) {
      const hitThisStep = frameEvents.some((event) => isCueTargetEvent(event, cueBallId, targetBallId));
      if (hitThisStep) {
        hit = true;
        cuePostContactSpeed = Math.hypot(cueBall.vel.x || 0, cueBall.vel.y || 0);
        cuePostContactDirection = velocityDirection(cueBall);
        const unblockedCueMotion = predictUnblockedCueMotion(
          cueBall,
          physics.params,
          contactPoint,
          maxCuePathMm,
        );
        cueRollingDirection = unblockedCueMotion.rollingDirection;
        if (assistOnly) {
          cuePath = unblockedCueMotion.cuePath;
          const cushion = predictCueCushionPaths(cueBall, state, physics, contactPoint, 4000);
          cueCushionPaths = cushion.paths; cueCushionNormal = cushion.normal;
        }
        if (assistOnly) break;
      }
    } else {
      const cueBlockedThisStep = frameEvents.some((event) => eventInvolvesBallId(event, cueBallId));
      if (!cueRollingDirection && !cueBlockedThisStep && !cueBall.potted) {
        cueRollingDirection = pureRollingDirection(cueBall, physics.params);
      }
      cueDone = cueDone || cueBlockedThisStep;
      targetDone = targetDone || frameEvents.some((event) => eventInvolvesBallId(event, targetBallId));
    }

    if (hit && !cueBall.potted && !cueDone) {
      const previous = cuePath[cuePath.length - 1];
      if (Math.hypot(cueBall.pos.x - previous.x, cueBall.pos.y - previous.y) >= 10) {
        cueTravelled += Math.hypot(cueBall.pos.x - previous.x, cueBall.pos.y - previous.y);
        cuePath.push(cloneVector2(cueBall.pos));
      }
      if (cueTravelled >= maxCuePathMm) cueDone = true;
    }

    if (hit && !targetBall.potted && !targetDone) {
      const previous = targetPath[targetPath.length - 1];
      if (Math.hypot(targetBall.pos.x - previous.x, targetBall.pos.y - previous.y) >= 14) {
        targetTravelled += Math.hypot(targetBall.pos.x - previous.x, targetBall.pos.y - previous.y);
        targetPath.push(cloneVector2(targetBall.pos));
      }
      if (targetTravelled >= maxTargetPathMm) targetDone = true;
    }

    if (!hit && step > 8 && !physics.isTableMoving(state)) break;
    if (hit && !assistOnly && step > 8 && !physics.isTableMoving(state)) break;
    if (cueDone && (!hit || targetDone)) break;
  }

  return {
    hit,
    duration: round(elapsed, 4),
    cueCushionPaths, cueCushionNormal,
    cuePostContactSpeed: round(cuePostContactSpeed, 3),
    cueRollingDirection: cueRollingDirection || cuePostContactDirection,
    cuePath,
    targetPath,
  };
}

module.exports = {
  DEFAULT_AIM_PHYSICS_HZ,
  sanitizePhysicsOverrides,
  normalizePredictionStopCondition,
  predictAimPath,
};

}, {"../../config/constants":3,"../state/ballState":12,"../model/tableModel":7,"../model/tableColliderSet":13,"../model/spotModel":6,"../model/tableBoundaryPresets":8,"../physics/physicsEngine":25,"../physics/friction":42,"../physics/shotResolver":67,"../physics/config/physicsParams":26,"../physics/v3Config":66,"../physics/vector":37,"../physics/smEmpiricalCushion":57,"../physics/sp/config":59,"../physics/smCushionSpeedCorrection":56}, "apps/three-game/src/core/aim/aimPrediction.js"]
  };
  const cache = {};

  function load(id) {
    if (cache[id]) return cache[id].exports;
    const record = modules[id];
    if (!record) throw new Error('Module not found: ' + id);
    const [factory, deps, filename] = record;
    const module = { exports: {} };
    cache[id] = module;
    function localRequire(request) {
      if (typeof request === 'number') return load(request);
      if (!Object.prototype.hasOwnProperty.call(deps, request)) {
        throw new Error('Cannot require ' + request + ' from ' + filename);
      }
      return load(deps[request]);
    }
    factory(localRequire, module, module.exports);
    return module.exports;
  }

  load(0);
})();