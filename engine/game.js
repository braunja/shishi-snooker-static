import { createBackgroundPlayback } from './background-playback.js';
import { ENTRY_AUDIO } from './entry-audio-manifest.js';
import { essentialEntryAudio, commonAnnouncements } from './entry-audio-policy.mjs';
import { fetchEntryImpactAudio } from './entry-impact-audio.mjs';
import { installAudioActivation } from './audio-activation.js';
import { createShotAudioRecovery, createAudioShot } from './shot-audio-gate.js';
import { createOnlineCrowdPolicy } from './online-crowd-policy.js';
import {cloneGameData} from './clone-game-data.js';
import {createRemoteCueMotion} from './remote-cue-motion.js';
import {createRemoteAimCamera} from './remote-aim-camera.js';
import {createOnlineMatchView} from './online-match-view.js';
import { createSoundVolumes } from './sound-volumes.js';
import { createObservationJoystick } from './observation-joystick.js';
import { installIntroInputLock } from './intro-input-lock.js';
import { createSnookerReview } from './snooker-review.js';
import { createCrowdTolerance } from './crowd-tolerance.js';
import { createEffectivePowerBar } from './effective-power-bar.js';
import { referenceViewport, referenceFov, applyReferenceFraming } from './viewport-framing.js';
import { createReplayTest } from './replay-test.js';
import { createShotParametersHUD } from './shot-parameters.js';
import {ballShadowOffset} from './ball-roof.js';
import { installCameraProjection, capturePickingCamera } from './camera-projection.js';
import { zoomedViewOffset } from './aim-zoom.js';
import { viewAimEnabled, hideViewAimHelpers, viewAimAdjustmentEnabled } from './aim-difficulty.js';
import { createObservationOrbit, isMobileObservationDevice, OBSERVATION_PINCH_ZOOM_ENABLED } from './observation-camera.js';
import { createPracticeBallDrag } from './practice-ball-drag.js';
import { createPlacementMoveQueue } from './placement-move-queue.js';
import { createCueBallPlacementControls } from './cue-ball-placement-controls.js';
import { drawModelPowerTrack, powerTrackStrikeDistance } from './power-track-view.js';
import { createPredictionDisplay } from './prediction-display.js';
import { createSceneDebug } from './scene-debug.js';
import { createCueLighting } from './cue-lighting.js';
import * as THREE from 'three';
import { loadCueModel } from './cue-model.js';
import { measureCueSpace } from './table-calibration.js';
import { createDebugPanel, loadDebugConfig } from './debug-panel.js';
import { createPocketReturn } from './pocket-return.js';
import { createPredictionQueue } from './prediction-queue.js';
import { startAimInertia, sampleAimInertia, dragAimView, peekAngle, orbitPeekPoint, peekLiftMetres, peekAimSensitivity, peekZoomMultiplier, peekContactVisible, peekFreeOffsets, stepPeekMotion, stepPeekOffsets } from './aim-peek.js';
import { VectorAimContext } from './vector-aim-context.js';
import {createConfetti3D,createConfettiLandingField} from './confetti-3d.js';

export async function initializeGame({ environment, surfaceLighting, lighting, scene, tableRoot, camera, renderer, controls, balls, ballShadows, performanceMonitor: perf, requestFrame=()=>{}, quality = null, getVenueRoot }) {
  const C = window.SnookerThreeCore;
  const setProjection = installCameraProjection(camera);
  const isTrial = document.documentElement.dataset.product === 'trial';
  let celebration=null,celebrationLanding=null;
  if(isTrial){
    const floor=scene.getObjectByName('floor-part-0');
    const floorY=floor?new THREE.Box3().setFromObject(floor).max.y:(scene.getObjectByName('floorRoot')?.userData.venuePruning?.floorY ?? 0);
    celebrationLanding=createConfettiLandingField(tableRoot,floorY);
    const geometry=lighting.getValues(),height=geometry.broadcastHeight??8*Math.sin(25*Math.PI/180),elevation=(geometry.broadcastElevation??25)*Math.PI/180;
    celebration=createConfetti3D({scene,landing:celebrationLanding,flightBoundary:{x:1,z:0,offset:-height/Math.tan(elevation)+3.5}});
  }
  let trialUI = null, tipHeldAt = null;
  let shotParametersHUD = null, aimYawMotion = null;
  const aimZoomOffset={x:0,y:0};
  const canvas = renderer.domElement;
  const root = document.querySelector('#viewer');
  root.classList.add('is-playing');
  // Only the test field uses the legacy two-player score panel.
  const legacyHud = isTrial ? null : document.querySelector('.game-hud');
  const hudObserver = legacyHud ? new ResizeObserver(() => {
    const hud = legacyHud.getBoundingClientRect();
    root.style.setProperty('--hud-bottom', `${hud.bottom + 12}px`);
  }) : null;
  hudObserver?.observe(legacyHud);
  const surfaceY = window.tablePreviewReport.balls.surfaceY;
  const center = balls.getObjectByName('blue').position.clone();
  const world = (p, height = 0) => new THREE.Vector3(center.x - p.x / 1000, surfaceY + height, center.z - p.y / 1000);
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -surfaceY);
  function project(p, height = 0.02625) {
    const v = world(p, height).project(camera);
    return { x: (v.x + 1) * innerWidth / 2, y: (1 - v.y) * innerHeight / 2 };
  }
  let placementCamera = null, practiceDrag=null, placementHint=null;
  let placementDragInHand=false,placementDragOffset=null;
  const placementMoves=createPlacementMoveQueue(point=>{
    if(practiceDrag)movePlacementBall(point);
    else if(input.isRole('cue-ball-placement'))input.updateCueBallPlacement(point);
    drawAimDirty=true;
  });
  const practiceBallDrag=createPracticeBallDrag(), practiceLift=new Map();
  function setRay(point, viewCamera = camera) {
    raycaster.setFromCamera(new THREE.Vector2(point.x / innerWidth * 2 - 1, 1 - point.y / innerHeight * 2), viewCamera);
  }
  function tablePoint(point) {
    // Keep drag coordinates anchored to the view at pointer-down. Using the
    // following camera here would feed its movement back into ball placement.
    setRay(point, placementCamera || camera);
    const hit = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
    return hit ? { x: (center.x - hit.x) * 1000, y: (center.z - hit.z) * 1000 } : { ...game.getCueBall().pos };
  }
  const rawBackend = C.createBrowserAudioBackend({fetch:fetchEntryImpactAudio});
  let backgroundPlayback=null;
  let audioPreferences={};
  let preparedVoiceMode = null;
  let physicsAudio, crowdTolerance, snookerReview,shotAudioRecovery,criticalAudioReady=Promise.resolve();
  function applyAudioPreferences(p=audioPreferences){
    const previousVoice = currentVoiceMode();
    audioPreferences=p;
    const volume=p.soundEnabled===false?0:Number.isFinite(p.gameVolume)?p.gameVolume:.7;
    rawBackend.setMasterVolume(volume);
    rawBackend.setMuted(volume===0 || document.hidden&&p.backgroundAudioEnabled===false);
    const voice = currentVoiceMode();
    if (preparedVoiceMode !== null && voice !== preparedVoiceMode) {
      if (previousVoice !== voice) rawBackend.stopAnnouncements();
      prepareVoiceMode(voice);
    }
  }
  function currentVoiceMode(){
    return C.ScoreSpeech.normalizeScoreVoiceMode(audioPreferences.scoreVoiceMode ?? window.SnookerOnline?.preferences?.()?.scoreVoiceMode);
  }
  applyAudioPreferences(window.SnookerProduct?.preferences ?? window.SnookerPracticeSettings?.read());
  if(window.SnookerProduct||window.SnookerPracticeSettings){
    const onPreference=event=>applyAudioPreferences(event.detail);
    window.addEventListener('product-audio-preference',onPreference);
    const onDevicePreference=()=>{if(!window.SnookerProduct)applyAudioPreferences(window.SnookerPracticeSettings.read());};window.addEventListener('practice-settings-change',onDevicePreference);window.addEventListener('pagehide',()=>window.removeEventListener('practice-settings-change',onDevicePreference),{once:true});
    window.addEventListener('pagehide',()=>window.removeEventListener('product-audio-preference',onPreference),{once:true});
  }

  const assetUrl = source => new URL('./resources/' + source.replace(/^\/?assets\//, ''), import.meta.url).href;
  const soundBanks = Object.fromEntries(Object.entries(C.SOUND_BANKS).map(([name, paths]) => [name, paths.map(assetUrl)]));
  const audio = C.createAudioManager({ backend: rawBackend, soundBanks });
  // Begin loading the practice audio while the test-field panel applies its project preset.
  const crowdSounds = C.createCrowdSoundPackController({ audio, backend: rawBackend, assetUrl, ambientFollowsPack: !isTrial, defaultPack: 'recorded' });
  crowdSounds.setAmbientVolume(.5);
  C.createImpactSoundPackController({ soundBanks, backend: rawBackend, assetUrl, defaultPack: 'processed' });
  // The room's recorded crowd controller owns these voices; never preload retired clips.
  if(isTrial)for(const bank of Object.keys(soundBanks))if(bank.startsWith('crowd'))soundBanks[bank]=[];
  const soundVolumes = isTrial ? null : createSoundVolumes(rawBackend,crowdSounds,null);
  const crowdPlayback = C.createCrowdPlayback(crowdSounds);
  // A table reset can reconcile a settled snapshot or start local practice in
  // the same room. Live crowd voices have their own lifetime across those resets.
  const matchCrowdPlayback = window.SnookerOnline && C.createCrowdPlayback(crowdSounds);
  const onlineCrowd=createOnlineCrowdPolicy(reaction=>matchCrowdPlayback?.enqueue(reaction),{selfSnookered:packet=>{const s={...game.getState(),...packet.finalSnapshot};return !s.frameOver&&!s.ruleState?.cueBallInHand&&s.currentPlayerId===packet.playerId&&C.Rules.isSnookeredOnTargets(s,s.ruleState);}});
  let matchCrowdFade;
  function fadeMatchCrowd() {
    onlineCrowd.reset();
    const fadeMs = matchCrowdPlayback?.reset();
    if (fadeMs) {
      // Give the HTML audio fallback time for its final volume update before navigation.
      const fade = new Promise(resolve => setTimeout(resolve, fadeMs + 20));
      matchCrowdFade = fade;
      fade.then(() => { if (matchCrowdFade === fade) matchCrowdFade = undefined; });
    }
    return matchCrowdFade;
  }
  const enqueueCrowd=reaction=>{if(window.SnookerOnline?.isLocalPractice&&!window.SnookerOnline.isLocalPractice()&&!game.isReplay())onlineCrowd.enqueue(reaction);else crowdPlayback.enqueue(reaction);};
  const soundSettings = isTrial ? null : C.createTestFieldSoundPacks({soundBanks,backend:rawBackend,crowd:crowdSounds,volumes:soundVolumes,assetUrl,onPackChange:()=>crowdPlayback.reset()});
  const speechBackend = { playAnnouncement: (source, volume) => rawBackend.playAnnouncement(assetUrl(source), volume) };
  const activateAudio=event=>{
    const running=rawBackend.activate(event?.isTrusted===true);physicsAudio?.primeShot();
    if((!document.hidden||audioPreferences.backgroundAudioEnabled!==false)&&!document.getElementById('viewer')?.classList.contains('is-loading'))criticalAudioReady.then(()=>crowdSounds.startAmbient()).catch(()=>{});
    return running;
  };
  const disposeAudioActivation=installAudioActivation(window,activateAudio);
  let message = '开球';
  function reportGameError(error,stage){
    console.error('[3D '+stage+']',error);
    const errors=window.threeGameErrors||(window.threeGameErrors=[]);
    errors.push({stage,message:String(error?.message||error),at:Date.now()});if(errors.length>20)errors.shift();
    try{trialUI?.notice?.('运行遇到异常，请重试；若持续出现请刷新页面。');}catch{}
  }
  let eventCount = 0;
  let lastSound = null;
  let pocketReturn = null;
  let shotCamera = null, cameraClock = 0, cameraTransition = null;
  let aimIntro = null, clickAimAnimation = null;
  const disposeIntroInputLock = installIntroInputLock(window, () => aimIntro !== null, event => Boolean((event.composedPath?.() || [event.target]).some(node => node?.matches?.('button[data-action^="view-"],button[data-view]')) || window.SnookerProduct && event.target?.closest?.('#trial-fullscreen, #product-hud, .product-game-menu, .product-settings, .product-topbar, .product-game-panel, .product-player-drawer, .product-player-profile, .product-replay-controls, .product-game-auth, .product-practice-result, .product-session-ui, .product-social-notices, .product-join-request-notice, .product-join-waiting, .product-intermission, .product-match-statistics, .product-rematch-layer, .product-rematch-poor, .product-room-watch-confirm, .product-replay-error, .product-rules-confirmation')));
  let observationZoomReturn = null, observationWheelTimer = null;
  let cueMotion = null, replayView='broadcast';
  const remoteCueMotion=createRemoteCueMotion();
  const remoteAimCamera=createRemoteAimCamera();
  const isReplayPage=isTrial&&!window.SnookerOnline&&new URL(location.href).searchParams.has('replay');
  let replayEntryPending=isReplayPage,practiceCamera=null;
  const ballSyncKeys=new Map(),shadowSyncKeys=new Map();
  const testFieldModels = window.SnookerTestFieldModels ?? window.SnookerProductLite;
  const testFieldBoundaryIds = testFieldModels ? C.testFieldTableBoundaryIds : null;
  const testFieldBoundaryId = testFieldBoundaryIds?.[testFieldModels.selection.table] ?? window.SnookerProductLite?.boundary;
  let config = window.SnookerOnline ? window.SnookerOnline.createConfig(C,window.GAME_CLIENT_CONFIG) :
    isTrial ? window.SnookerTrialTuning.createConfig(C, window.GAME_CLIENT_CONFIG) : loadDebugConfig(C, window.GAME_CLIENT_CONFIG);
  if (window.SnookerProductLite) {
    config = {...config, physics:{...config.physics,settings:{
      ...config.physics.settings,tableBoundaryId:testFieldBoundaryId,pocketCaptureMode:'angle',
    }}};
  }
  let game = C.createThreeGameCore({ testFieldBoundaryId, testFieldRandomOpeningRack:!isTrial && !window.SnookerOnline, testFieldBallClusterTuning:!isTrial && !window.SnookerOnline, testFieldAI:!isTrial && !window.SnookerOnline, testFieldSMCushionSpeedCorrection:!isTrial && !window.SnookerOnline, trackCueTrajectory:!isTrial && !window.SnookerOnline, lockPracticeDifficulty:isTrial,onChange:()=>{requestFrame();backgroundPlayback?.wake();}, getDifficulty:()=>trialUI?.difficulty() || window.SnookerTrialTuning?.readDifficulty(), isReadOnly:()=>replayEntryPending || root.classList.contains('is-loading'), practice:isTrial && !window.SnookerOnline, randomOpeningRack:isTrial, freePlacement:!isTrial, config,
    isPresentationBusy: () => {
      if(document.hidden)return false; // Hidden audio never waits for mesh/camera animations.
      // Called by the core only once physics is settled: handle a shot that missed all balls.
      if(cueMotion?.followThroughDuration>0)cueMotion.settled=true;
      else C.CuePresentation.beginCueRetraction(cueMotion,[],null,cameraClock,true);
      return Boolean(pocketReturn?.isBlockingShot() || (cueMotion?.type === 'wait-contact' && cueMotion.followThroughDuration>0) || (cueMotion?.type === 'retract' &&
        !C.CuePresentation.sampleCuePresentation(cueMotion,cameraClock).done));
    },
    onEvent(event) {
      window.ProductReplay?.event?.(event);
      requestFrame();
      try {
      trialUI?.event(event);
      if(event.type==='replay-enter'){
        practiceCamera=event.preserveChallenge?{mode,snapshot:cameraSnapshot(),width:innerWidth,height:innerHeight}:null;
      }
      if(event.type==='replay-exit'){
        replayEntryPending=false;shotCamera?.cancel();cameraTransition=null;cueMotion=null;
        pocketReturn?.reset();crowdPlayback.reset();audio.stopAnnouncements();snookerReview?.reset();crowdTolerance?.reset();
        setMode(practiceCamera?.mode||'aim',true);
        if(practiceCamera){
          const saved=practiceCamera.snapshot;camera.position.copy(saved.position);camera.quaternion.copy(saved.quaternion);controls.target.copy(saved.target);
          for(const key of ['fov','zoom','near','far'])camera[key]=saved[key];
          if(saved.view){const v=saved.view;camera.setViewOffset(v.fullWidth,v.fullHeight,v.offsetX,v.offsetY,v.width,v.height);}else camera.clearViewOffset();
          camera.updateProjectionMatrix();camera.updateMatrixWorld();
          if(practiceCamera.width!==innerWidth||practiceCamera.height!==innerHeight)resizeViewport();
          practiceCamera=null;
        }
      }
      if (['replay-enter','replay-seek','replay-cut','replay-exit'].includes(event.type)) {
        predictions.setDesired(null);predictionDisplay.set(null,performance.now());prediction=null;aimRevision=-1;drawAimDirty=true;aimPlane.visible=false;
      }
      if (['replay-seek','replay-cut','replay-pause'].includes(event.type)) {
        const replayFrom=event.type==='replay-seek'&&event.automatic&&replayView==='aim'?cameraSnapshot():null;
        if(event.type!=='replay-pause'){shotCamera?.cancel();cameraTransition=null;cueMotion=null;}
        if(!event.automatic){crowdPlayback.reset();audio.stopAnnouncements();}

        if(event.type!=='replay-pause'){pocketReturn?.reset();snookerReview?.reset();crowdTolerance?.reset();}
        if(event.type==='replay-seek'&&replayView==='aim'){
          setMode('aim',true);
          if(replayFrom){
            cameraTransition={from:replayFrom,to:cameraSnapshot(),start:cameraClock,duration:700};
            game.delayReplayAim(700);
            updateCameraTransition();
          }
        }
      }
      if (event.type === 'shot-start') {
        remoteAimCamera.reset();
        if(window.SnookerOnline?.isObserver()&&window.SnookerOnline?.canUseAimView?.()&&mode==='aim')syncAimCamera(true);
        placementHint?.shotStarted();
        powerStrikePullPx = powerPullDistancePx || lastPowerPullDistancePx;
        snookerReview?.reset();
        crowdTolerance?.capture(event.shot);
        shotParametersHUD?.capture(event.shot);
        // A new shot does not cancel the previous shot's pending or playing crowd audio.
        cueMotion = null;
        if(isTrial&&(!window.SnookerOnline||selectedView==='aim')){aimZoomOffset.x=aimZoomOffset.y=0;camera.zoom=1;peekMagnification=1;camera.updateProjectionMatrix();if(mode==='aim')trialUI?.centerCamera(camera);}
        // Inspection views hold through motion, then return for the next shot.
        if (game.isReplay() && replayView!=='aim') { shotCamera?.cancel();cameraTransition=null; }
        else if (!game.isReplay() && ['camera','broadcast','god'].includes(mode)) {
          cameraTransition = null;
          shotCamera?.start(null, cameraClock, {retainBroadcast:true});
        } else {
          shotCamera?.start(event.cameraPlan, cameraClock, {retainBroadcast:!game.isReplay() && mode==='broadcast'});
        }
      } else if (event.type === 'shot') {
        cueMotion = {type:'wait-contact', start:cameraClock,
          pose:C.createCueDisplayPose(cloneGameData(game.getAnimation().cuePose), game.getCueBall().radius, game.getCueGeometry(), 0),
          displayPose:true, pull:0,
          followThroughOffset:game.getAnimation().followThroughOffset,
          followThroughDuration:game.getAnimation().followThroughDuration};
        C.CuePresentation.initializeCueBounds(cueMotion,game.getState().balls,game.getCueGeometry(),game.getState().cueBallId);
        physicsAudio.playShot({ ...event.shot, point: event.point });
        lastSound = 'cue'; message = '击球中';
      } else if (event.type === 'physics') {
        crowdTolerance?.observe(event.events);
        shotCamera?.physics(event.events, cameraClock);
        pocketReturn?.capture(event.events, game.getState());
        physicsAudio.playEvents(event.events);
        eventCount += event.events.length;
        lastSound = event.events.at(-1)?.type;
      } else if (event.type === 'crowd') {
        enqueueCrowd(event.reaction);
      } else if (event.type === 'settled') {
        snookerReview?.review(event.result.snookerReview);
        // Replay knows the actual next shot. Hold the finishing view until its
        // recorded aim is restored, then make one continuous return to that pose.
        if(game.isReplay())shotCamera?.cancel();
        else shotCamera?.settled(cameraClock);
        const result = event.result.ruleResult;
        const state = game.getState();
        const touchingBall=C.Intermission.hasTouchingBall(state);
        window.SnookerOnline?.ruleSettled?.(state);
        message = C.Intermission.createRuleResultMessages(state, result).join(' · ') || '换杆';
        if (result?.foul) C.ScoreSpeech.speakFoul(result.miss, currentVoiceMode(), { audioBackend: speechBackend, freeBall: C.Intermission.foulAwardsFreeBall(state, result),touchingBall });
        else if (result?.points > 0 || result?.score > 0 || state.players.find(p => p.id === event.shooter)?.break > 0) {
          C.ScoreSpeech.speakScore(state.players.find(p => p.id === event.shooter)?.break || 0, currentVoiceMode(), { audioBackend: speechBackend });
        }
        if(touchingBall&&!result?.foul)C.ScoreSpeech.speakTouchingBall(currentVoiceMode(),{audioBackend:speechBackend});
        const reaction = event.result.crowdReaction;
        enqueueCrowd(reaction);
        if (!isTrial && state.frameOver && result?.winnerId) C.ScoreSpeech.speakFrameWinner(result.winnerId === 'p1' ? 1 : 2, currentVoiceMode(), { audioBackend: speechBackend });
      } else if (event.type === 'reset') {
        onlineCrowd.reset();
        remoteAimCamera.reset();
        aimYawMotion?.cancel();
        snookerReview?.reset();
        crowdTolerance?.reset();
        shotParametersHUD?.reset();
        crowdPlayback.reset();
        practiceBallDrag.end();practiceDrag=null;placementCamera=null;placementMoves.clear();placementDragInHand=false;placementDragOffset=null;placementHint?.reset();practiceLift.clear();ballSyncKeys.clear();shadowSyncKeys.clear();
        const hadCamera = shotCamera?.diagnostics().phase !== 'idle' && shotCamera;
        shotCamera?.cancel(); cameraTransition = null; cueMotion = null; remoteCueMotion.reset();
        if (hadCamera && !game.isReplay()) setMode('aim', true);
        message = '开球'; audio.stopAnnouncements();
      }
      } catch(error) { reportGameError(error,'presentation:'+event.type); }
    } });
  snookerReview = createSnookerReview(() => game);
  crowdTolerance = createCrowdTolerance(() => game, C);
  physicsAudio = C.createPhysicsAudioController(audio);

  // Decode essential sounds while the remaining table assets load. Optional
  // crowd clips cannot take the four decode slots ahead of these sounds.
  const criticalBanks=Object.fromEntries(['cue','ball','cushion','pocket','pocketHard'].map(key=>[key,soundBanks[key]||[]]));
  criticalAudioReady=rawBackend.prepareCritical(criticalBanks);
  criticalAudioReady.then(()=>{
    if (isTrial) return;
    audio.prime(['roomJoin', 'shotClockTick']);
    crowdSounds.prepare();
  }).catch(()=>{});
  const voicePrefix = mode => 'assets/audio/announcements/' + mode + '/';
  function prepareVoiceMode(mode){
    preparedVoiceMode=mode;
    const sources=commonAnnouncements(ENTRY_AUDIO,mode).map(entry=>assetUrl(entry.source));
    // Playback of a requested announcement can promote its own download.
    for(const source of sources)rawBackend.prepareAnnouncement(source);
  }
  function prepareEntryAudio(onProgress){
    const mode=currentVoiceMode();
    preparedVoiceMode=mode;
    const entries=essentialEntryAudio(ENTRY_AUDIO,criticalBanks,assetUrl);
    return rawBackend.prepareEntry(entries.map(entry=>({...entry,source:assetUrl(entry.source)})),onProgress).then(async result=>{criticalAudioReady=rawBackend.prepareCritical(criticalBanks);await criticalAudioReady;return result;}).catch(error=>{rawBackend.destroy();throw error;});
  }
  async function prepareReplayAudio(){
    const banks=Object.fromEntries(['cue','ball','cushion','pocket','pocketHard'].map(key=>[key,soundBanks[key]||[]]));
    banks.crowd=crowdSounds.list().map(clip=>assetUrl(clip.source));
    // Sound is optional: HTML audio is prepared by the backend when decoding
    // fails, and silent playback remains available if neither route works.
    try {return (await rawBackend.preparePlayback(banks)).running;}
    catch (_) {return false;}
  }
  backgroundPlayback=createBackgroundPlayback({hidden:()=>document.hidden,busy:()=>!game.isPaused()&&(game.isBusy()||game.isReplay()&&!game.replayStatus()?.ended),tick:(dt,now)=>game.tick(dt,now),onError:error=>reportGameError(error,'background-playback')});
  const ambientVisibility=()=>{
    applyAudioPreferences();
    backgroundPlayback.visibility();
    if(document.hidden){if(audioPreferences.backgroundAudioEnabled===false)crowdSounds.stopAmbient();cancelInput();}
    else {lastTime=null;activateAudio();requestFrame();}
  };
  document.addEventListener('visibilitychange',ambientVisibility);
  const restoreBackgroundPlayback=event=>{if(event.persisted){backgroundPlayback.resume();ambientVisibility();}};
  window.addEventListener('pageshow',restoreBackgroundPlayback);

  window.addEventListener('pagehide',event=>{
    backgroundPlayback.stop();
    crowdSounds.stopAmbient();
    if(event.persisted)return;
    shotAudioRecovery?.destroy();
    document.removeEventListener('visibilitychange',ambientVisibility);
    window.removeEventListener('pageshow',restoreBackgroundPlayback);
    disposeAudioActivation();
  });

  const meshById = new Map();
  let clickAimEnabled=window.SnookerPracticeSettings?.read().clickAimEnabled!==false;
  const applyClickAimPreference=()=>{
    clickAimEnabled=window.SnookerPracticeSettings?.read().clickAimEnabled!==false;
    if(!clickAimEnabled)clickAimAnimation=null;
    requestFrame();
  };
  window.addEventListener('practice-settings-change',applyClickAimPreference);
  window.addEventListener('pagehide',()=>window.removeEventListener('practice-settings-change',applyClickAimPreference),{once:true});
  const shadowById = new Map();
  let redIndex = 1;
  game.getState().balls.forEach(ball => {
    const name = ball.kind === 'cue' ? 'white' : ball.kind === 'red' ? `red-${redIndex++}` : ball.kind;
    const mesh = balls.getObjectByName(name);
    mesh.userData.baseScale = mesh.scale.x;
    mesh.userData.ballId = ball.id;
    meshById.set(ball.id, mesh);
    shadowById.set(ball.id, ballShadows.children[balls.children.indexOf(mesh)]);
  });
  // A lifted ball must not fade the shared contact shadows of the other balls.
  const getShadowPockets = () => game.getState().tableColliderSet.pockets.map(p => ({
    center: world(p.capture.center), points: p.dropEdges[0].points.map(p => world(p))
  }));
  let shadowPockets = getShadowPockets();
  const alternatePockets = testFieldBoundaryIds
    ? C.createClientInitialGameState({physics:{settings:{tableBoundaryId:testFieldBoundaryIds[testFieldModels.selection.table === 'v1' ? 'v2' : 'v1']}}}).tableColliderSet.pockets
    : [];
  const shadowEdgeCount = Math.max(...shadowPockets.map(p => p.points.length),...alternatePockets.map(p=>p.dropEdges[0].points.length));
  for (const shadow of shadowById.values()) {
    const material = shadow.material = shadow.material.clone();
    Object.assign(material.uniforms, {
      pocketEdge: {value:Array.from({length:shadowEdgeCount},()=>new THREE.Vector2())},
      pocketEdgeCount: {value:0}, pocketCenter: {value:new THREE.Vector2()}
    });
    material.vertexShader = 'varying vec2 shadowWorld;\n' + material.vertexShader.replace(
      'gl_Position=projectionMatrix', 'shadowWorld=(modelMatrix*vec4(expanded,1.)).xz; gl_Position=projectionMatrix');
    material.fragmentShader = `varying vec2 shadowWorld;
      uniform vec2 pocketEdge[${shadowEdgeCount}], pocketCenter;
      uniform int pocketEdgeCount;
` + material.fragmentShader.replace('void main(){', `void main(){
        float nearest=1.e10; vec2 edgePoint=vec2(0.);
        for(int i=1;i<${shadowEdgeCount};i++){
          if(i>=pocketEdgeCount)break;
          vec2 a=pocketEdge[i-1], d=pocketEdge[i]-a;
          vec2 q=a+d*clamp(dot(shadowWorld-a,d)/max(dot(d,d),1.e-12),0.,1.);
          float distance2=dot(shadowWorld-q,shadowWorld-q);
          if(distance2<nearest){nearest=distance2;edgePoint=q;}
        }
        if(pocketEdgeCount>1 && dot(shadowWorld-edgePoint,pocketCenter-edgePoint)>=0.)discard;
      `);
  }
  pocketReturn = createPocketReturn({ meshById, world, surfaceY, tableRoot, pockets: game.getState().tableColliderSet.pockets,
    calibration: window.tablePreviewReport.calibration });

  const cue = new THREE.Group();
  // Cue fades use transparent materials without depth writes. Draw after the
  // table overlays (aim 10, contact shadows 20), retaining ball depth tests.
  cue.renderOrder = 30;
  const cueOrientation = new THREE.Matrix4();
  const cueLocalX = new THREE.Vector3();
  const cueLocalZ = new THREE.Vector3();
  const cueResponse = await fetch('./resources/materials/cue.json');
  if (!cueResponse.ok) throw new Error('Missing cue model');
  const cueSource = await cueResponse.json();
  cueSource.source = 'Snooker Master 001 / reference cue v18';
  cue.name = cueSource.source;
  const equipmentKey=p=>JSON.stringify([p?.cueAppearance||'default',p?.ferruleEquipmentId||'4-basic']);
  // Capture the profile before awaiting: account hydration may change it while loading.
  const initialCueProfile={cueAppearance:window.SnookerProduct?.cueAppearance||'default',ferruleEquipmentId:window.SnookerProduct?.ferruleEquipmentId||'4-basic'};
  const cueAsset = await loadCueModel(renderer, cueSource, {quality:'optimized',environment,...initialCueProfile});
  function prepareCueAsset(asset){
    const model=asset.cue;
    model.rotation.z=Math.PI/2;model.position.y=.725;model.updateMatrixWorld(true);
    const meshes=[];model.traverse(part=>{if(part.isMesh)meshes.push(part);});
    for(const part of meshes){
      part.geometry.applyMatrix4(part.matrixWorld);
      part.position.set(0,0,0);part.rotation.set(0,0,0);part.scale.setScalar(1);
      part.material.transparent=true;part.material.depthWrite=true;part.renderOrder=30;
    }
    return {asset,meshes};
  }
  let activeCueKey=equipmentKey(initialCueProfile),cueDisposed=false;
  const cueLoadAbort=new AbortController(),cueRetryAfter=new Map();
  const cueAssets=new Map([[activeCueKey,prepareCueAsset(cueAsset)]]),cueLoads=new Map();
  cue.add(...cueAssets.get(activeCueKey).meshes);
  function warmCue(profile){
    const key=equipmentKey(profile);if(cueDisposed||cueAssets.has(key)||cueLoads.has(key)||(cueRetryAfter.get(key)||0)>performance.now())return;
    const task=loadCueModel(renderer,cueSource,{quality:'optimized',environment,cueAppearance:profile.cueAppearance||'default',ferruleEquipmentId:profile.ferruleEquipmentId||'4-basic',signal:cueLoadAbort.signal}).then(asset=>{
      if(cueDisposed){asset.dispose();return;}
      try{cueAssets.set(key,prepareCueAsset(asset));cueRetryAfter.delete(key);requestFrame();}catch(error){asset.dispose();throw error;}
    }).catch(error=>{if(!cueDisposed){cueRetryAfter.set(key,performance.now()+5000);console.warn('球杆外观加载失败',error);}}).finally(()=>cueLoads.delete(key));
    cueLoads.set(key,task);
  }
  function syncCueEquipment(){
    for(const profile of window.SnookerOnline?.equipmentProfiles?.()||[])warmCue(profile);
    const profile=window.SnookerOnline?.cueEquipment?.();if(!profile)return;
    const key=equipmentKey(profile);warmCue(profile);
    if(key===activeCueKey||!cueAssets.has(key))return;
    cue.clear();cue.add(...cueAssets.get(key).meshes);activeCueKey=key;
    cueLighting.apply(lighting.getValues());lastCueState=null;lastCueRevision=-1;
  }
  scene.add(cue);
  const cueLighting = createCueLighting({ cue, tableRoot, surfaceLighting, cloth: tableRoot.getObjectByName('tableCloth'), scene, environment });
  lighting.register(cueLighting);
  const cueGeometryByTable = new Map();
  function useTableCueGeometry(version) {
    if (!cueGeometryByTable.has(version)) {
      const supplied = version === 'v2' ? null : cueAsset.cueSpace;
      cueGeometryByTable.set(version, supplied || measureCueSpace(tableRoot, cue, center, surfaceY));
    }
    game.setCueGeometry(cueGeometryByTable.get(version));
  }
  useTableCueGeometry(testFieldModels?.selection.table);

  // Keep the shared aim renderer, replace only its Canvas path output with GPU geometry.
  // The old backend remains explicitly selectable for controlled A/B diagnostics.
  const useCanvasAim = new URLSearchParams(location.search).get('aimBackend') === 'canvas';
  let aimCanvas = null, aimTexture = null, vectorAim = null, aimPlane, aimContext;
  if (useCanvasAim) {
    aimCanvas = document.createElement('canvas');
    aimCanvas.width = 2048; aimCanvas.height = 1024;
    aimContext = aimCanvas.getContext('2d');
    aimTexture = new THREE.CanvasTexture(aimCanvas);
    aimTexture.colorSpace = THREE.SRGBColorSpace;
    const aimGeometry = new THREE.PlaneGeometry(4, 2);
    aimGeometry.rotateX(-Math.PI / 2); aimGeometry.rotateY(Math.PI);
    aimPlane = new THREE.Mesh(aimGeometry, new THREE.MeshBasicMaterial({ map: aimTexture,
      transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    aimPlane.position.set(center.x, surfaceY + .001, center.z);
  } else {
    vectorAim = new VectorAimContext({ center, surfaceY, record: perf.record });
    aimContext = vectorAim; aimPlane = vectorAim.group;
  }
  const aimRenderer = new C.GameStageRenderer(aimContext);
  // Group order takes precedence over individual vector primitive orders.
  // Neither overlay writes depth, so shadows can blend over the guides.
  aimPlane.renderOrder = 10;
  scene.add(aimPlane);
  const transform = { toScreen: p => ({ x: 1024 + p.x * 0.512, y: 512 + p.y * 0.512 }),
    radius: r => r * 0.512, scale: 0.512, rotationDeg: 0 };
  const worker = new Worker(testFieldModels?.workerUrl('aim-worker.bundle.js', './aim-worker.bundle.js') ?? './aim-worker.bundle.js');
  let prediction = null;
  const predictionDisplay = createPredictionDisplay();
  let aimRevision = -1;
  let drawAimDirty = true;
  let guidesEnabled = true;
  const predictions = createPredictionQueue({ worker,
    onResult: value => { requestFrame(); predictionDisplay.set(value, performance.now()); prediction = predictionDisplay.get(); drawAimDirty = true; },
    record: perf.record, count: perf.count,
  });

  const tipPad = document.querySelector('#tip-pad');
  const powerTrack = document.querySelector('#power-track');
  let powerBarNeedsPaint = false;
  const effectivePowerBar = createEffectivePowerBar(document.querySelector('.toolbar'), powerTrack, () => { powerBarNeedsPaint = true; },{showValue:true,maxPower:()=>game.getPowerLimit?.()??100,valueFontSize:()=>35.2*(trialUI?.scale()||Math.min(innerWidth/1920,innerHeight/1080)),...(isTrial?{layout:()=>trialUI?.effectivePowerBarLayout()}:{})});
  const [powerBase, powerCue] = await Promise.all(['powerControllerBase', 'powerControllerCue'].map(async key => {
    const image = new Image();
    image.src = assetUrl(C.StageAssetSources[key].replace(/^\//, ''));
    await image.decode();
    return image;
  }));
  const shotAssets = { base: powerBase, cue: powerCue };
  let mode='aim',selectedView='aim';
  // The controller belongs to this player's signed opening loadout. Decode its
  // prepared sprite before enabling gameplay; no runtime model capture is needed.
  const modelPowerCue=new Image();modelPowerCue.src=assetUrl('images/ui/power-cues/'+encodeURIComponent(initialCueProfile.cueAppearance)+'.webp');await modelPowerCue.decode();
  if (window.SnookerOnline) window.SnookerOnline.attach(game);
  if (isTrial) trialUI = await window.SnookerTrialUI.initialize({ core: game, setView: value=>{if(trialUI?.isReplay()||game.isReplay())replayView=value;setMode(value);}, getView:()=>trialUI?.isReplay()?replayView:mode, getTipHeldAt:()=>tipHeldAt, prepareAudio:prepareReplayAudio, requestFrame,celebration });
  if(window.SnookerOnline){
    const online=window.SnookerOnline;
    online.attachUI(trialUI);
    const voice=()=>online.preferences().scoreVoiceMode;
    online.attachAudio({
      prepareReplay:prepareReplayAudio,crowdShot:onlineCrowd.begin,crowdAuthority:onlineCrowd.authority,fadeMatchCrowd,
      preferences(p){if(window.SnookerProduct)applyAudioPreferences(p);else rawBackend.setMuted(!p.soundEnabled);drawAimDirty=true;},
      turn(){rawBackend.playTurnNotification();},joined(){rawBackend.playTurnNotification();},
      frameStart(state){C.ScoreSpeech.speakFrameStart((state.players||[]).reduce((n,p)=>n+(p.frames||0),0)+1,state.currentPlayerId==='p2'?2:1,voice(),{audioBackend:speechBackend});},
      touching(result,state){if(result?.foul)C.ScoreSpeech.speakFoul(result.miss,voice(),{audioBackend:speechBackend,freeBall:C.Intermission.foulAwardsFreeBall(state,result),touchingBall:true});else C.ScoreSpeech.speakTouchingBall(voice(),{audioBackend:speechBackend});},
      concession(id){C.ScoreSpeech.speakConcession(1,id==='p2'?2:1,voice(),{audioBackend:speechBackend});},
      timeout(){C.ScoreSpeech.speakShotClockTimeout(voice(),{audioBackend:speechBackend});},
      winner(result){if(result?.winnerId)C.ScoreSpeech.speakFrameWinner(result.winnerId==='p2'?2:1,voice(),{audioBackend:speechBackend});},
      tick(clock){rawBackend.playShotClockTick({isCurrent:()=>{const r=online.getState().room;return !game.isBusy()&&r?.shotClock?.playerId===clock.playerId&&r?.shotClock?.deadlineAt>Date.now();}});}
    });
  }
  const rect = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
  const shotUiScale = () => trialUI?.scale() || Math.min(innerWidth/1920,innerHeight/1080);
  let testShotLayoutKey='';
  function syncTestShotLayout(){
    if(isTrial)return;
    const key=innerWidth+':'+innerHeight;
    if(key===testShotLayoutKey)return;
    testShotLayoutKey=key;
    const safeRight=parseFloat(getComputedStyle(powerTrack.parentElement).paddingRight)||0;
    const s=shotUiScale(),oy=(innerHeight-1080*s)/2;
    // Match the practice room desktop landscape layout and right-edge anchors.
    for(const [el,x,y,w,h] of [[tipPad,matchMedia('(pointer: coarse)').matches?innerWidth-safeRight-180*s:innerWidth-116*s+(58-175)*s/2,oy+770*s,175,175],[powerTrack,innerWidth-116*s,oy+(matchMedia('(pointer: coarse)').matches?(770+175/2+175*.42*1.04-398+4.5):328)*s,116,398]]){
      Object.assign(el.style,{position:'fixed',left:x+'px',top:y+'px',width:w*s+'px',height:h*s+'px'});
    }
  }
  const powerRect = () => {
    const r = rect(powerTrack);
    const header = 42 * shotUiScale() * (trialUI?.powerVisualScale?.()||1);
    return { ...r, y: r.y + header, height: r.height - header };
  };
  const pt = event => ({ x: event.clientX, y: event.clientY, pointerType:event.pointerType });

  let activePointer = null;
  aimYawMotion=C.createAimYawMotion({
    getDirection:()=>game.getState().aim?.direction,
    setDirection:direction=>perf.measure('cueSolveMs',()=>game.setDirection(direction)),
    getSensitivity:direction=>game.getAimRotationSensitivity(direction),
  });
  function flushAimYaw(){if(aimYawMotion.flush()){syncAimCamera(true);syncCue(0);}}
  let aimDrag = null;
  let aimInertia = null;
  let aimHeight = 0.12;
  const defaultAimSetback = 0.9;
  const defaultTestFieldFov = 36;
  const releasedCamera = isTrial ? window.SnookerTrialTuning.snapshot.presets.lighting?.values : null;
  const shotCameraSetback = isTrial ? THREE.MathUtils.clamp(Number(releasedCamera?.shotCameraSetback) || defaultAimSetback, .4, 3) : defaultAimSetback;
  const shotCameraFov = isTrial ? THREE.MathUtils.clamp(Number(releasedCamera?.shotCameraFov) || defaultTestFieldFov, 15, 60) : defaultTestFieldFov;
  let testFieldAimSetback = shotCameraSetback;
  let testFieldAimFov = defaultTestFieldFov;
  function aimReferenceFov(width, height) {
    const ratio = Math.tan(THREE.MathUtils.degToRad(shotCameraFov / 2)) / Math.tan(THREE.MathUtils.degToRad(defaultTestFieldFov / 2));
    return THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(referenceFov(width, height) / 2)) * (mode === 'aim' ? ratio : 1)));
  }
  function testFieldViewFov() {
    const baseFov = mode === 'aim' ? testFieldAimFov : defaultTestFieldFov;
    return THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(baseFov / 2)) / Math.min(1, camera.aspect)));
  }
  let peekPx = 0;
  let peekMotion = {position: 0, velocity: 0};
  let peekOffsets = {};
  let peekMagnification = 1;
  let peekAimInputGain = 1;
  let peekReturn = null;
  let peekReleaseTiming = null;
  function observationPeekMagnification() {
    return 1 + (peekReturn?.observationZoomPerPx ?? 0) * peekMotion.position;
  }
  function applyPeekMagnification(value) {
    camera.zoom = camera.zoom / peekMagnification * value;
    peekMagnification = value;
  }
  let powerPullDistancePx = 0, lastPowerPullDistancePx = 0, powerStrikePullPx = 0;
  const aimTouches = new Map();
  let pinch = null;
  let gestureZoom = null;
  let firstTouchAim = null;
  const observationBounds = new THREE.Box3().setFromObject(tableRoot);
  const tableSize = window.tablePreviewReport.size;
  const tableCorners = [];
  for (const x of [-tableSize[0] / 2, tableSize[0] / 2]) {
    for (const y of [0, tableSize[1]]) {
      for (const z of [-tableSize[2] / 2, tableSize[2] / 2]) tableCorners.push(new THREE.Vector3(x, y, z));
    }
  }
  // Capture the opening view's comfortable distance once. A cue-relative
  // setback must not become the orbit radius again after each shot.
  const observationOpeningDirection=game.getState().aim?.direction || {x:1,y:0};
  const observationOpeningOffset=world(game.getCueBall().pos).sub(center)
    .addScaledVector(new THREE.Vector3(observationOpeningDirection.x,0,observationOpeningDirection.y).normalize(),3);
  const observationBaseDistance=Math.max(3,Math.hypot(observationOpeningOffset.x,observationOpeningOffset.z));
  const observationOrbit=createObservationOrbit({camera,controls,canvas,bounds:observationBounds,surfaceY,isMobile:()=>isMobileObservationDevice(window.SnookerTrialLayout,navigator)});
  const mobileObservation=()=>window.SnookerTrialLayout ? window.SnookerTrialLayout.device==='mobile' : matchMedia('(pointer: coarse)').matches;
  let temporaryObservation=null;
  function beginTemporaryObservation(){
    if(mode==='camera')return true;
    if(window.SnookerOnline?.isObserver())return false;
    if(mode!=='aim' || aimIntro || cameraTransition || game.isBusy() || activePointer || powerPointer!==null || tipPointer!==null)return false;
    if (peekReturn && peekMotion.position > 0 && peekReturn.observationZoomPerPx === undefined) {
      // Keep the released Peek spring running independently of the orbit.
      peekReturn.observationZoomPerPx = (peekMagnification - 1) / peekMotion.position;
    }
    const saved={height:aimHeight,dolly:testFieldDolly,offset:{...aimZoomOffset},
      camera:cameraSnapshot(true),settlePeekPose:peekReturn?.observationZoomPerPx !== undefined};
    setMode('camera',false,true);
    temporaryObservation=saved;
    return true;
  }
  function endTemporaryObservation(){
    const saved=temporaryObservation;
    if(!saved)return;
    temporaryObservation=null;
    if(mode!=='camera')return;
    // Return from the currently displayed pose, including a partially completed entry.
    const from=cameraSnapshot(true);
    cameraTransition=null;
    setMode('aim',true,true);
    aimHeight=saved.height;testFieldDolly=saved.dolly;Object.assign(aimZoomOffset,saved.offset);
    const snapshot=saved.camera;
    camera.position.copy(snapshot.position);camera.quaternion.copy(snapshot.quaternion);controls.target.copy(snapshot.target);
    for(const key of ['fov','zoom','near','far'])camera[key]=snapshot[key];
    peekMagnification=1;
    if(snapshot.view){const v=snapshot.view;camera.setViewOffset(v.fullWidth,v.fullHeight,v.offsetX,v.offsetY,v.width,v.height);}else camera.clearViewOffset();
    if(saved.settlePeekPose)syncAimCamera(true);
    camera.updateProjectionMatrix();camera.updateMatrixWorld();drawAimDirty=true;
    cameraTransition={from,to:cameraSnapshot(true),start:cameraClock,duration:300,manual:true,wallStart:performance.now()};
    updateCameraTransition();
  }
  function observationJoystickVisible(){
    if(replayTest?.isOpen())return false;
    if(window.SnookerOnline?.isObserver())return mode==='camera';
    if(game.isReplay())return mode==='camera';
    return true;
  }
  function observationJoystickEnabled(){
    if(aimIntro)return false;
    // Looking around is local camera input, independent of the active striker.
    if(mode==='camera')return true;
    return !game.isReplay()&&!window.SnookerOnline?.isObserver()&&mode==='aim'&&game.canOperate();
  }
  const observationJoystick=createObservationJoystick({tipPad,powerTrack,powerCenter:()=>powerTrack.getBoundingClientRect().left+(isTrial?trialUI.powerContainerWidth():58)*shotUiScale()/2,isMobile:mobileObservation,layout:size=>globalThis.ProductReplay?.joystickRect?.(size),onHold:beginTemporaryObservation,onRelease:endTemporaryObservation,orbit:observationOrbit,visible:observationJoystickVisible,enabled:observationJoystickEnabled});
  const tabletopCorners = tableCorners.filter(corner => corner.y === tableSize[1]);

  function fitFixedView() {
    if (mode !== 'broadcast' && mode !== 'god') return;
    // The HUD is bottom-left: reserve space above it, not below it.
    const productFrame=globalThis.ProductReplay?.fixedViewRect?.(mode);
    const trialRect = trialUI?.viewRect();
    let top = trialRect?.top ?? 12;
    const hud = legacyHud?.getBoundingClientRect();
    const panel = document.querySelector('.shot-panel').getBoundingClientRect();
    const toolbarTop = document.querySelector('.toolbar').getBoundingClientRect().top - 12;
    const bottom = trialRect?.bottom ?? Math.min(toolbarTop, (hud?.top ?? innerHeight) - 12);
    const right = !isTrial && mode === 'broadcast' ? innerWidth - 12 : (trialRect?.right ?? panel.left - 12);
    let left = 12, width = Math.max(120, right - 12), height = Math.max(120, bottom - top);
    if (isTrial) {
      // Fit to the contained reference frame, never enlarge the table to fill
      // the extra area on a different aspect ratio.
      const ref=referenceViewport(innerWidth,innerHeight);
      const r=productFrame||trialUI?.referenceViewRect()||{left:ref.x+20*ref.scale,top:ref.y+20*ref.scale,right:ref.x+ref.width-20*ref.scale,bottom:ref.y+ref.height-100*ref.scale};
      left=r.left;top=r.top;width=Math.max(1,r.right-r.left);height=Math.max(1,r.bottom-r.top);
    }
    if (mode === 'god') {
      if(globalThis.ProductReplay)camera.up.set(...(productFrame?.rotateGod?[1,0,0]:[0,0,1]));
      // Trial uses a higher, narrower-angle overhead view to reduce perspective
      // distortion; the projection fit below preserves the table's screen size.
      const halfSpan = Math.max(tableSize[0] * innerHeight / width, tableSize[2] * innerHeight / height) * .5125;
      const heightAboveTop = isTrial ? 8 : Math.max(3.2, halfSpan / Math.tan(THREE.MathUtils.degToRad(30)));
      camera.position.set(0, tableSize[1] + heightAboveTop, 0);
      camera.lookAt(controls.target);
      camera.near = heightAboveTop * .5;
      camera.far = camera.position.y + 10;
    }
    camera.clearViewOffset();
    camera.aspect = innerWidth / innerHeight;
    camera.updateMatrixWorld();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const framingPoints = [...(mode === 'broadcast' || isTrial ? tabletopCorners : tableCorners)];
    if (isTrial && mode === 'broadcast') {
      tableRoot.updateMatrixWorld(true);
      tableRoot.traverse(mesh => {
        if (!mesh.isMesh || mesh.material?.name !== 'tableBrandLogo') return;
        const box = new THREE.Box3().setFromObject(mesh);
        for (const x of [box.min.x,box.max.x]) for (const y of [box.min.y,box.max.y])
          for (const z of [box.min.z,box.max.z]) framingPoints.push(new THREE.Vector3(x,y,z));
      });
    }
    for (const corner of framingPoints) {
      const p = corner.clone().applyMatrix4(camera.matrixWorldInverse);
      const depth = mode === 'god' ? camera.position.y - tableSize[1] : -p.z;
      const x = p.x / depth, y = p.y / depth;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    const tangent = Math.max((maxY - minY) * innerHeight / height, (maxX - minX) * innerHeight / width) * (isTrial ? 0.5 : 0.5125);
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(tangent));
    if (mode === 'god') setProjection(camera.position.y - tableSize[1]);
    const scale = innerHeight / (2 * tangent);
    camera.setViewOffset(innerWidth, innerHeight,
      innerWidth / 2 + (minX + maxX) * scale / 2 - (left + width / 2),
      innerHeight / 2 - (minY + maxY) * scale / 2 - (top + height / 2), innerWidth, innerHeight);
    camera.updateProjectionMatrix();
  }

  function constrainObservation() {
    if (mode === 'camera' && !cameraTransition) observationOrbit.update();
  }

  let testFieldDolly = 1;
  function currentZoomFactor() {
    if(mode==='camera')return observationOrbit.zoom();
    return !isTrial && mode === 'aim' ? testFieldDolly : camera.zoom;
  }
  function setAimZoom(value, point, previousPoint=point) {
    if(window.SnookerOnline?.isObserver())return;
    if(mode==='camera'){observationOrbit.setZoom(value);return;}
    if (!isTrial && (mode === 'aim' || mode === 'camera')) {
      const next = THREE.MathUtils.clamp(value, 0.3, 3);
      // Keep lens and look direction fixed; magnification is inverse distance.
      camera.position.sub(controls.target).multiplyScalar(testFieldDolly / next).add(controls.target);
      testFieldDolly = next;
      camera.updateMatrixWorld();
      return;
    }
    if (isTrial && mode !== 'camera') return;
    // Keep the tabletop point beneath the cursor fixed, including view offsets.
    camera.updateMatrixWorld();
    const anchor = mode === 'god' && point ? tablePoint(point) : null;
    camera.zoom = mode === 'aim' ? THREE.MathUtils.clamp(value, 0.3, 3) : THREE.MathUtils.clamp(value, 0.65, 2.5);
    camera.updateProjectionMatrix();
    if (anchor) {
      const after = tablePoint(point);
      const offset = world(anchor).sub(world(after));
      camera.position.add(offset);
      controls.target.add(offset);
      camera.updateMatrixWorld();
    }
  }

  function returnObservationZoom() {} // Observation distance persists after release.
  function updateObservationZoom() {}
  function touchCenter() {
    const [a, b] = [...aimTouches.values()];
    return a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : null;
  }

  function touchDistance() {
    const [a, b] = [...aimTouches.values()];
    return a && b ? Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)) : 1;
  }

  function updateAimIntro() {
    if (!aimIntro) return;
    if (mode !== 'aim' || game.isBusy()) { aimIntro = null; return; }
    const t = THREE.MathUtils.clamp((cameraClock - aimIntro.start) / aimIntro.duration, 0, 1);
    const progress = t * t * (3 - 2 * t);
    // Use the same height/distance path as manual aiming, with soft arrival.
    aimHeight = THREE.MathUtils.lerp(2.6, 0.12, progress);
    if (t === 1) aimIntro = null;
  }

  function syncAimCamera(force = false, peekDt = 0) {
    const remoteAimActive=!game.isReplay()&&!game.isBusy()&&mode==='aim'&&window.SnookerOnline?.isObserver()&&window.SnookerOnline?.canUseAimView?.();
    if(!remoteAimActive)remoteAimCamera.reset();
    if (placementCamera || practiceDrag || cameraTransition || mode !== 'aim' || (!force && game.isBusy() && !game.replayAimVisible())) return;
    const ball = game.getCueBall();
    const replayShot=game.getReplayShot();
    let direction = replayShot?.shot.direction || game.getState().aim?.direction;
    if (!ball || (!force && ball.potted) || !direction) return;
    const pos = replayShot ? replayShot.before.balls.find(b=>b.id===replayShot.before.cueBallId).pos : force && game.isBusy() ? game.getState().aim?.point || ball.pos : ball.pos;
    direction=remoteAimCamera.sample(direction,{active:remoteAimActive,dt:peekDt,immediate:force,identity:game.getState().currentPlayerId+':'+game.getState().shotSeq,anchor:pos});
    const target = world(pos, 0.05);
    // Height and setback share one linear progress, with the default at the near end.
    const heightRatio = THREE.MathUtils.clamp((aimHeight - 0.12) / (2.6 - 0.12), 0, 1);
    const farDistance = 3, farHeight = 2;
    const distance = THREE.MathUtils.lerp(testFieldAimSetback, farDistance, heightRatio);
    camera.fov = isTrial ? aimReferenceFov(innerWidth, innerHeight) : testFieldViewFov();
    let focusLead = 0.5;
    if (game.getState().table) {
      const half = game.getState().table.halfPlayAreaMm;
      // Balance the cue ball and the forward rail in the high view, including
      // the upward image offset that leaves room for the bottom controls.
      const farDepth = Math.max(0.5, ...[-1, 1].flatMap(x => [-1, 1].map(y =>
        ((x * (half.width + 150) - pos.x) * direction.x + (y * (half.height + 150) - pos.y) * direction.y) / 1000)));
      const rect = trialUI?.viewRect();
      const shift = rect ? (innerHeight - rect.top - rect.bottom) / innerHeight : 0;
      const focusHeightDelta = farHeight - 0.05;
      const pitch = (Math.atan2(focusHeightDelta, farDistance) + Math.atan2(focusHeightDelta, farDistance + farDepth)) / 2
        - Math.atan(shift * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
      const highLead = THREE.MathUtils.clamp(focusHeightDelta / Math.tan(pitch) - farDistance, 0.5, farDepth);
      focusLead = THREE.MathUtils.lerp(0.5, highLead, heightRatio);
    }
    controls.target.copy(target).add(new THREE.Vector3(-direction.x * focusLead, 0, -direction.y * focusLead));
    const wirelessPeek=(trialUI?.difficulty() ?? debugPanel.difficulty?.()) === 'no-lines';
    const peekValues=game.getConfig().aim.values;
    const observingDuringPeekReturn = peekReturn?.observationZoomPerPx !== undefined;
    const peekPosition = observingDuringPeekReturn ? 0 : peekMotion.position;
    peekAimInputGain=1;
    let peekPivot = null, peekRotation = 0, peekTargetId = null;
    if (peekPosition > 0 && !game.isBusy() && !wirelessPeek) {
      const renderState = C.createStageRenderState(game.getState());
      const contact = aimRenderer.findAimContact(renderState, pos, direction);
      const visiblePeekValues={...peekValues,cueLineBlurMaxLengthMm:aimRenderer.blurCueLineMaxLength(renderState,{...pos,radius:ball.radius},direction,peekValues)};
      if (peekContactVisible(contact,pos,visiblePeekValues,aimRenderer.isIllegalAimContact(renderState,contact))) {
        // The orbit must use the same current contact as its pivot. Worker
        // trajectories arrive asynchronously; using their old direction with
        // a new ghost point makes fine long-pot adjustments move in steps.
        const outgoing = { x: contact.ball.pos.x - contact.point.x, y: contact.ball.pos.y - contact.point.y };
        peekAimInputGain=peekAimSensitivity(pos,direction,contact,peekPosition,peekValues);
        peekTargetId = contact.ball.id;
        peekPivot = contact.point;
        // Include the test-field dolly in the actual eye-to-ghost orbit radius.
        const effectiveSetback = isTrial ? distance : (distance + focusLead) / testFieldDolly - focusLead;
        const orbitRadiusMm = Math.hypot(
          pos.x - direction.x * effectiveSetback * 1000 - peekPivot.x,
          pos.y - direction.y * effectiveSetback * 1000 - peekPivot.y);
        peekRotation = peekAngle(direction, outgoing, peekPosition, orbitRadiusMm, peekValues);
      }
    }
    const pose = replayShot?.cuePose || game.getAnimation()?.cuePose || game.getCuePose();
    const horizontalEye = { x: pos.x - direction.x * distance * 1000, y: pos.y - direction.y * distance * 1000 };
    const baseFocus = {x:pos.x+direction.x*focusLead*1000,y:pos.y+direction.y*focusLead*1000};
    const orbitPivot=peekPivot || pos;
    const orbitAngle=peekPivot?peekRotation:(wirelessPeek ? 0 : peekValues.peekFreeAngleDeg ?? 0)*Math.PI/180*Math.max(0,Math.min(1,peekPosition/180));
    const orbitEye = orbitPeekPoint(horizontalEye, orbitPivot, orbitAngle);
    const orbitFocus = orbitPeekPoint(baseFocus, orbitPivot, orbitAngle);
    const localOffset = (point, base) => ({
      forward:(point.x-base.x)*direction.x+(point.y-base.y)*direction.y,
      side:-(point.x-base.x)*direction.y+(point.y-base.y)*direction.x,
    });
    const eyeOffset=localOffset(orbitEye,horizontalEye), focusOffset=localOffset(orbitFocus,baseFocus);
    const freePeek=peekFreeOffsets(peekPosition,peekValues);
    const forward=peekPivot?(peekValues.peekTargetForwardCm ?? 0)*10*Math.max(0,Math.min(1,peekPosition/180)):freePeek.forwardMm;
    eyeOffset.forward+=forward;focusOffset.forward+=forward;
    const desiredPeekLift=peekPivot?peekLiftMetres(peekPosition,peekValues):freePeek.liftMetres;
    // Extra smoothing is restricted to changes of target, never normal Peek dragging.
    peekOffsets=stepPeekOffsets(peekOffsets,{
      zoomDelta:peekZoomMultiplier(peekPosition,Boolean(peekPivot),peekValues)-1,
      eyeLift:desiredPeekLift,eyeForward:eyeOffset.forward,eyeSide:eyeOffset.side,
      focusForward:focusOffset.forward,focusSide:focusOffset.side,
    },peekDt,peekTargetId,peekPosition / 180);
    const offsetPoint=(base,prefix)=>{
      const forward=peekOffsets[prefix+'Forward']?.position||0,side=peekOffsets[prefix+'Side']?.position||0;
      return {x:base.x+direction.x*forward-direction.y*side,y:base.y+direction.y*forward+direction.x*side};
    };
    const eye=offsetPoint(horizontalEye,'eye');
    controls.target.copy(world(offsetPoint(baseFocus,'focus'),0.05));
    // Fixed endpoint heights keep rise proportional to retreat. The near end
    // follows the cue; the far end is 2 m above the cloth.
    const floorAt = setback => C.cueEyeFloor(pose, {
      x: pos.x - direction.x * setback * 1000,
      y: pos.y - direction.y * setback * 1000,
    }).height / 1000;
    const eyeHeight = THREE.MathUtils.lerp(floorAt(testFieldAimSetback), farHeight, heightRatio);
    camera.position.copy(world(eye, Math.max(.03,eyeHeight + (peekOffsets.eyeLift?.position || 0))));
    if (!isTrial) camera.position.sub(controls.target).divideScalar(testFieldDolly).add(controls.target);
    applyPeekMagnification(observingDuringPeekReturn ? observationPeekMagnification() : 1 + (peekOffsets.zoomDelta?.position || 0));
    camera.updateProjectionMatrix();
    camera.lookAt(controls.target);
    camera.updateMatrixWorld();
  }

  const shotControlKeys = new WeakMap();
  function drawShotControls() {
    if(trialUI?.isReplay())return;
    syncTestShotLayout();
    const tip = game.getTip();
    const effectivePower = C.resolveV3EffectivePower(game.getPower(), tip, game.getPhysicsParams(), game.getCuePose()?.elevation);
    // Measure both controls before the meter changes DOM styles or text.
    // Reading client sizes after those writes forces layout during dragging.
    const tipWidth=tipPad.clientWidth,tipHeight=tipPad.clientHeight;
    const powerWidth=powerTrack.clientWidth,powerHeight=powerTrack.clientHeight;
    effectivePowerBar?.update(game.getPower(), effectivePower, (powerPointer !== null || input.isRole('power-pull')) && powerPullDistancePx >= Math.max(1,powerHeight-57*shotUiScale()*(trialUI?.powerVisualScale?.()||1))*.02);
    const enabled = game.canAdjustTip();
    const powerEnabled = game.canOperate() && !game.getState().ruleState.requiresNomination;
    const uiScale = shotUiScale();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const powerAppearance=game.getConfig().aim.values;
    const displayPowerPullPx = game.getAnimation()
      ? powerTrackStrikeDistance(game.getAnimation(), powerStrikePullPx) : powerPullDistancePx;
    for (const element of [tipPad, powerTrack]) {
      const w = element===tipPad?tipWidth:powerWidth, h = element===tipPad?tipHeight:powerHeight;
      const key = element === tipPad
        ? [tip.x, tip.y, enabled, w, h, uiScale, dpr].join(':')
        : [powerAppearance.powerTrackContainerAlpha, powerAppearance.powerTrackCueAlpha,
          game.getPower(), effectivePower, displayPowerPullPx, powerEnabled, w, h, uiScale, dpr].join(':');
      if (shotControlKeys.get(element) === key) continue;
      shotControlKeys.set(element, key);
      if (element.width !== Math.round(w * dpr) || element.height !== Math.round(h * dpr)) {
        element.width = Math.round(w * dpr); element.height = Math.round(h * dpr);
      }
      const ctx = element.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.scale(uiScale, uiScale);
      if(element===powerTrack){
        const scale=uiScale*(trialUI?.powerVisualScale?.()||1), width=w/scale, height=h/scale;
        ctx.scale(scale/uiScale,scale/uiScale);
        drawModelPowerTrack(ctx,{width,height,containerX:0,containerWidth:isTrial?trialUI.powerContainerWidth()/(trialUI.powerVisualScale?.()||1):58,cue:modelPowerCue,power:game.getPower(),pullDistance:displayPowerPullPx/scale,enabled:powerEnabled,containerAlpha:powerAppearance.powerTrackContainerAlpha,cueAlpha:powerAppearance.powerTrackCueAlpha,opaqueCue:Boolean(globalThis.SnookerProduct)});
        continue;
      }
      C.GameShotControlsRenderer.drawGameShotControls(ctx, {
        assets: shotAssets, power: game.getPower(), tipOffset: tip,
        powerPullDistancePx: powerPullDistancePx / uiScale, powerEnabled, tipEnabled: enabled,
        createTipPadRect: () => ({ x: 0, y: 0, width: w / uiScale, height: h / uiScale }),
        createPowerPullRect: () => ({ x: 0, y: 42, width: w / uiScale, height: h / uiScale - 42 }),
        createPowerMeterRect: () => ({ x: 0, y: 0, width: 0, height: 0 }),
        tipPadVisible: element === tipPad, powerPullVisible: element === powerTrack,
        powerMeterVisible: false,
      });
    }
    for (const [element, name, value] of [[powerTrack,'aria-valuenow',String(Math.round(effectivePower))], [powerTrack,'aria-disabled',String(!powerEnabled)], [tipPad,'aria-disabled',String(!enabled)]]) {
      if(element.getAttribute(name)!==value)element.setAttribute(name,value);
    }
  }
  const inputOptions = {
    getState: game.getState, getMode: () => 'playing', canLocalOperateGame: game.canOperate,
    canLocalUseShotControls: game.canOperate,
    canLocalHandlePendingDecision: () => false,
    isTableMoving: game.isBusy, getCueStrikeAnimation: game.getAnimation,
    getCueBallPlacementOptions:()=>game.getPlacementOptions(),
    getCueBall: game.getCueBall, getTipOffset: game.getTip, setTipOffset: game.setTip,
    getTipPad: () => rect(tipPad), getPowerPullTrack: powerRect,
    getPowerPullOptions: () => ({ controllerRect: null, deadZonePower:2, normalizeTouchStart:true, ignoreReleaseMotion:true, topPx: 0, bottomPx: Math.max(1,powerTrack.clientHeight-57*shotUiScale()*(trialUI?.powerVisualScale?.()||1)) }),
    pointInRect: (p, r) => p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height,
    corePointToWorld: tablePoint,
    createCoreStageTransform: () => ({ toScreen: project, radius: radius => {
      const p = game.getCueBall().pos; const a = project(p), b = project({ x: p.x + radius, y: p.y });
      return Math.hypot(a.x - b.x, a.y - b.y);
    } }),
    setShotPower: game.setPower, shoot: createAudioShot({game,recovery:{attempt:()=>shotAudioRecovery.attempt()},beforeShoot:flushAimYaw}),
    setPowerPullDistancePx: value => {
      if (value > 0) lastPowerPullDistancePx = value;
      powerPullDistancePx = value;
    },
    primeCueAudio: () => physicsAudio.primeShot(), now: () => performance.now(),
    rotateAimByDegrees: degrees => canAdjustViewAim() && game.rotateAim(degrees), restoreAimDirection: direction => canAdjustViewAim() && game.setDirection(direction),
    shouldUseFineAimControl: () => false,
    updateDefaultAim: game.defaultAim,
    syncCueBallInHandPlacement: options => C.Placement.syncCueBallInHandPlacement(game.getState(), options),
    scheduleAimPrediction: () => { drawAimDirty = true; },
  };
  shotAudioRecovery=createShotAudioRecovery({
    activate:()=>rawBackend.activate(true),
    prepare:()=>{criticalAudioReady=rawBackend.prepareCritical(criticalBanks);return criticalAudioReady;},
    isReady:()=>rawBackend.isImpactReady(),
  });
  const input = C.createGameInputController(inputOptions);
  const tipInput = C.createGameInputController({...inputOptions, canLocalUseShotControls:game.canAdjustTip});
  const powerInput = C.createGameInputController(inputOptions);
  placementHint=createCueBallPlacementControls({
    scene,ball:game.getCueBall,world,requestFrame,
    root:document.querySelector('#viewer'),project,size:()=>Math.max(64,72*shotUiScale()),
    offsetScale:()=>isMobileObservationDevice(window.SnookerTrialLayout,navigator) ? .6 : 1,
    bottomInset:()=>window.SnookerOnline?.scoreboardBounds?.().height||0,
    inHand:()=>!!game.getState().ruleState.cueBallInHand,
    sessionKey:()=>`${game.getState().shotSeq}:${game.getState().currentPlayerId}`,
    canPlace:()=>!game.isReplay()&&!game.isFreePlacement()&&!aimIntro&&input.canPlaceCueBallInHand(),
    onBegin(event){
      placementMoves.clear();placementCamera=capturePickingCamera(camera);const anchor=project(game.getCueBall().pos,0);
      if(!input.beginCueBallPlacement(project(game.getCueBall().pos),event.pointerId)){placementCamera=null;return null;}
      return anchor;
    },
    onMove(point){placementMoves.push(point);},
    onEnd(cancel){if(cancel){placementMoves.clear();input.clear();}else{placementMoves.flush();input.finishCueBallPlacement();}placementCamera=null;placementMoves.clear();drawAimDirty=true;requestFrame();},
  });
  let powerPointer = null;
  function endPowerPointer() {
    if (powerPointer === null) return;
    effectivePowerBar?.hide();
    const id = powerPointer; powerPointer = null; powerInput.clear();
    if (powerTrack.hasPointerCapture(id)) powerTrack.releasePointerCapture(id);
  }
  let tipPointer = null;
  function endTipPointer() {
    if (tipPointer === null) return;
    const id = tipPointer; tipPointer = null; tipHeldAt = null; tipInput.clear();
    if (tipPad.hasPointerCapture(id)) tipPad.releasePointerCapture(id);
  }

  function capture(event, target) {
    activePointer = { id: event.pointerId, target, button: event.button, pointerType: event.pointerType };
    if (target === tipPad) tipHeldAt = performance.now();
    else if (tipPointer === null) tipHeldAt = null;
    target.setPointerCapture(event.pointerId);
    event.preventDefault();
  }
  function restoreTouchAim() {
    if (!firstTouchAim) return;
    const { direction, height } = firstTouchAim;
    const current = game.getState().aim?.direction;
    if (current && (current.x !== direction.x || current.y !== direction.y)) game.setDirection(direction);
    aimHeight = height;
    firstTouchAim = null;
  }
  function cancelInput(preserveTouches = false, preservePeekReturn = false) {
    aimYawMotion.flush();
    observationOrbit.cancel();
    effectivePowerBar?.hide();
    endPowerPointer();
    endTipPointer();
    tipHeldAt = null; clickAimAnimation = null;

    if (preserveTouches !== true) {
      const ids = [...aimTouches.keys()];
      aimTouches.clear(); if(mode==='camera')controls.enabled=false; pinch = null; gestureZoom = null; firstTouchAim = null;
      for (const id of ids) if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    }
    placementCamera = null;placementMoves.clear();practiceDrag=null;practiceBallDrag.end();placementDragInHand=false;placementDragOffset=null;
    input.clear(); aimDrag = null; aimInertia = null; peekOffsets = {};
    if (!preservePeekReturn) {
      peekPx = 0; peekReturn = null; peekMotion = {position: 0, velocity: 0};
    }
    if (activePointer) {
      const { target, id } = activePointer;
      activePointer = null;
      if (target.hasPointerCapture(id)) target.releasePointerCapture(id);
    }
    // Cancel this device's gesture, without clearing the opponent's live pull.
    if(!window.SnookerOnline?.isObserver())game.setPower(0);
  }
  tipPad.addEventListener('pointerdown', event => {
    if(temporaryObservation)return;
    aimIntro = null; clickAimAnimation = null;
    if (tipPointer !== null || event.button !== 0 || pinch || gestureZoom !== null
      || (activePointer && !aimDrag)) return;
    if (tipInput.beginTipPoint(pt(event))) {
      tipPointer = event.pointerId; tipHeldAt = performance.now();
      tipPad.setPointerCapture(event.pointerId); event.preventDefault();
    }
  });
  powerTrack.addEventListener('pointerdown', event => {
    if(temporaryObservation)return;
    aimIntro = null; clickAimAnimation = null;
    if (powerPointer !== null || event.button !== 0 || pinch || gestureZoom !== null
      || (activePointer && !aimDrag && !input.isRole('tip-drag'))
      || game.getState().ruleState.requiresNomination) return;
    if (powerInput.beginPowerPull(pt(event), event.pointerId)) {
      powerPointer = event.pointerId;
      powerTrack.setPointerCapture(event.pointerId); event.preventDefault();
    }
  });
  // Suppress page-owned menus, middle-click autoscroll and native drags on the table.
  for (const type of ['contextmenu', 'mousedown', 'auxclick', 'dragstart']) {
    canvas.addEventListener(type, event => {
      if (type === 'mousedown' && event.button === 0) return;
      event.preventDefault(); event.stopPropagation();
    }, { capture: true, passive: false });
  }
  canvas.addEventListener('pointerdown', event => {
    if (cameraTransition?.manual && !cameraTransition.interactiveObservation) return;
    aimInertia = null;
    if(mode==='camera' && powerPointer===null && tipPointer===null && !activePointer){
      setRay(pt(event));
      const placementHit=raycaster.intersectObjects([...meshById.values()].filter(m=>m.visible),false)[0]?.object.userData.ballId;
      const draggable=placementHit&&((game.canDragPracticeBall?.(placementHit)??game.isFreePlacement())||(placementHit===game.getCueBall()?.id&&input.canPlaceCueBallInHand()));
      const placing=!temporaryObservation && !observationOrbit.isLooking() && observationOrbit.diagnostics().touches===0 && draggable;
      if(!placing && observationOrbit.down(event))return;
    }
    if (event.pointerType === 'mouse' && (event.button === 1 || event.button === 2)) {
      event.preventDefault(); event.stopPropagation();
      if (temporaryObservation || mode === 'camera' || activePointer || powerPointer !== null || tipPointer !== null
        || pinch || gestureZoom !== null || !game.canOperate()
        || (event.buttons !== undefined && event.buttons !== (event.button === 2 ? 2 : 4))) return;
      aimIntro = null; clickAimAnimation = null;
      if (event.button === 1 ? input.beginTipDrag(pt(event))
        : !game.getState().ruleState.requiresNomination && input.beginPowerPull(pt(event), event.pointerId, { allowOutside: true })) {
        capture(event, canvas);
        if (event.button === 1) tipHeldAt = performance.now();
        else effectivePowerBar?.begin(event);
      }
      return;
    }
    if (activePointer && activePointer.target !== canvas) return;
    // Only observation supports a two-finger scene gesture. Extra scene touches
    // must not cancel or rewind the finger currently adjusting aim.
    if(event.pointerType==='touch' && mode!=='camera' && aimTouches.size>0 && !aimTouches.has(event.pointerId)){event.preventDefault();return;}
    aimIntro = null; clickAimAnimation = null;
    if (event.pointerType === 'touch') {
      if (isTrial && mode === 'aim' && aimTouches.size === 0 && !pinch && gestureZoom === null) {
        firstTouchAim = { direction: { ...game.getState().aim.direction }, height: aimHeight };
      }
      aimTouches.set(event.pointerId, pt(event));
      if (aimTouches.size >= 2) {
        if (powerPointer !== null || tipPointer !== null) { aimTouches.delete(event.pointerId); return; }
        restoreTouchAim();
        cancelInput(true);
        if (mode === 'camera') controls.enabled = false;
        pinch = { distance: touchDistance(), zoom: currentZoomFactor(), center:touchCenter() };
        for (const id of aimTouches.keys()) canvas.setPointerCapture(id);
        event.preventDefault();
        return;
      }
      if (pinch || gestureZoom !== null) return;
    }
    if ((mode === 'camera' && !(game.canDragPracticeBalls?.() ?? game.isFreePlacement()) && !input.canPlaceCueBallInHand()) || activePointer || event.button !== 0 || !game.canOperate()) return;
    const point = pt(event);
    setRay(point);
    if((game.canDragPracticeBalls?.() ?? game.isFreePlacement()) || input.canPlaceCueBallInHand()){
      const hit=raycaster.intersectObjects([...meshById.values()].filter(m=>m.visible),false)[0];
      const id=hit?.object.userData.ballId;
      const cue=game.getCueBall(),ruleHand=id===cue?.id&&!game.isFreePlacement()&&input.canPlaceCueBallInHand();
      if(id && (ruleHand || (game.canDragPracticeBall?.(id) ?? true)) && game.getState().balls.some(b=>b.id===id&&!b.potted)){
        placementCamera=capturePickingCamera(camera);placementDragInHand=ruleHand;
        if(ruleHand){
          const anchor=project(cue.pos,0);placementDragOffset={x:anchor.x-point.x,y:anchor.y-point.y};
          if(!input.beginCueBallPlacement(project(cue.pos),event.pointerId)){placementCamera=null;placementDragInHand=false;return;}
        }
        practiceDrag=id;practiceBallDrag.begin(id,point,performance.now());capture(event,canvas);event.stopImmediatePropagation();return;
      }
    }
    if(mode==='camera')return;
    if (!canAdjustViewAim()) return;
    if (peekReturn) peekPx = peekMotion.position;
    peekReturn = null;
    aimDrag = { startedAt: performance.now(), startPoint: point, lastPoint: point, lastTime: event.timeStamp, pointerType: event.pointerType, axis: null, switchDistance: 0 };
    capture(event, canvas);
  }, true);
  function movePlacementBall(point){
    if(placementDragInHand){
      // The controller performs the only ray/plane intersection after the hold.
      if(practiceBallDrag.activeId())input.updateCueBallPlacement({x:point.x+placementDragOffset.x,y:point.y+placementDragOffset.y});
      else practiceBallDrag.move(point,tablePoint,()=>{});
      return;
    }
    practiceBallDrag.move(point,tablePoint,(id,pos)=>game.movePracticeBall(id,pos));
  }
  function updateAimDrag(point, time) {
    if (!aimDrag || !canAdjustViewAim()) return;
    const rawDx = point.x - aimDrag.lastPoint.x;
    const rawDy = point.y - aimDrag.lastPoint.y;
    let dx = rawDx, dy = rawDy;
    let rebaseTouchYaw = false;
    if (!aimDrag.axis) {
      const totalX = Math.abs(point.x - aimDrag.startPoint.x), totalY = Math.abs(point.y - aimDrag.startPoint.y);
      if (Math.max(totalX, totalY) < 4) {
        // Track real event timing/movement during intent detection, without
        // turning that dead zone into a deferred camera movement.
        aimDrag.lastPoint = point; aimDrag.lastTime = time;
        return;
      }
      aimDrag.axis = totalX >= totalY ? 'x' : 'y';
      rebaseTouchYaw = aimDrag.pointerType === 'touch' && aimDrag.axis === 'x';
      const total = aimDrag.axis === 'x' ? totalX : totalY;
      const delta = Math.abs(aimDrag.axis === 'x' ? rawDx : rawDy);
      // Only the part of this event beyond the 4px boundary moves the view.
      const fraction = delta > 0 ? Math.max(0, Math.min(1, (total - 4) / delta)) : 0;
      dx *= fraction; dy *= fraction;
    } else {
      // Use a short, time-based window so event frequency and tiny diagonal
      // deviations do not repeatedly erase a deliberate direction change.
      const samples = aimDrag.axisSamples || (aimDrag.axisSamples = []);
      samples.push({dx, dy, time, start:aimDrag.lastTime});
      while (samples.length && samples[0].time <= time-40) samples.shift();
      let trendX = 0, trendY = 0;
      for (const sample of samples) {
        const weight = Math.min(1, (sample.time-Math.max(sample.start,time-40))/Math.max(1,sample.time-sample.start));
        trendX += Math.abs(sample.dx)*Math.max(0,weight);
        trendY += Math.abs(sample.dy)*Math.max(0,weight);
      }
      const toHorizontal = aimDrag.axis === 'y';
      const primary = Math.abs(toHorizontal ? dy : dx);
      const other = toHorizontal ? dx : dy;
      const ratio = toHorizontal ? 1.15 : 1.3;
      const threshold = toHorizontal ? 3 : 4;
      const elapsed = Math.max(0,time-aimDrag.lastTime);
      if (Math.abs(other) > primary*ratio) {
        // Reversal should not inherit progress in the opposite direction.
        if (aimDrag.switchDistance*other < 0) aimDrag.switchDistance = 0;
        aimDrag.switchDistance = (aimDrag.switchDistance || 0) + other;
      } else {
        aimDrag.switchDistance = (aimDrag.switchDistance || 0)*Math.exp(-elapsed/40);
      }
      const dominant = toHorizontal ? trendX > trendY*ratio : trendY > trendX*ratio;
      if (dominant && Math.abs(aimDrag.switchDistance) >= threshold) {
        aimDrag.axis = toHorizontal ? 'x' : 'y';
        rebaseTouchYaw = aimDrag.pointerType === 'touch' && toHorizontal;
        aimDrag.switchDistance = 0;
        aimDrag.axisSamples = [];
      }
    }

    // A touch event that establishes horizontal intent can contain the OS's
    // entire initial gesture packet. Consume it as the new origin, never as a
    // first yaw step or a deferred delta. Subsequent input stays unscaled.
    if (rebaseTouchYaw) {
      aimDrag.lastPoint = point; aimDrag.lastTime = time;
      aimDrag.heightVelocity = 0;
      return;
    }

    // Equal pointer distance and speed must yield equal yaw in either
    // orientation. Landscape uses the existing portrait per-pixel gain.
    // Gain follows real pointer speed, including on the boundary-crossing
    // event; clipping displacement must not manufacture a speed change.
    const axisPoint = aimDrag.axis === 'x' ? { x: aimDrag.lastPoint.x + rawDx, y: aimDrag.lastPoint.y } : { x: aimDrag.lastPoint.x, y: point.y };
    const speed = C.AimControl.pointerSpeedPxPerMs(aimDrag.lastPoint, axisPoint, aimDrag.lastTime, time);
    const sensitivity = C.AimControl.aimFineTuneSensitivity(speed);
    const dragGain = mode === 'aim' && aimDrag.pointerType === 'touch' ? 2 : 1;
    const mobileAimYaw = mode === 'aim' && aimDrag.pointerType === 'touch';
    const yawSensitivity = mobileAimYaw
      ? C.AimControl.aimFineTuneSensitivity(speed, {minSensitivity:.1,maxSensitivity:1,baseSensitivity:.1})
      : sensitivity;
    const yawGain = mobileAimYaw ? .8 : dragGain * .4;
    const elapsed = Math.max(8, time-aimDrag.lastTime);
    aimDrag.lastPoint = point; aimDrag.lastTime = time;
    if (aimDrag.axis === 'x') {
      aimDrag.heightVelocity = 0;
      if (dx !== 0) {
        const peekGain=mode==='aim' && peekPx>0 ? peekAimInputGain : 1;
        const degrees=dx*yawGain*yawSensitivity*peekGain*(mode==='broadcast'?-1:1);
        if(mode==='aim' && aimDrag.pointerType!=='touch')aimYawMotion.enqueue(degrees);
        else perf.measure('cueSolveMs',()=>game.rotateAim(degrees));
      }
    } else if (mode === 'aim') {
      const view = dragAimView(aimHeight, peekPx, dy * dragGain, sensitivity);
      if (dy !== 0) {
        aimDrag.heightVelocity = (view.height-aimHeight)/elapsed;
        aimDrag.lastHeightMotionTime = time;
      }
      aimHeight = view.height; peekPx = view.peekPx;
    }
    // Camera matrices update once in the frame loop, not on every pointer event.
  }
  window.addEventListener('pointermove', event => {
    if(observationOrbit.move(event))return;
    if (event.pointerId === powerPointer) { powerInput.updatePowerPull(pt(event)); event.preventDefault(); return; }
    if (event.pointerId === tipPointer) { tipInput.setTipFromCorePoint(pt(event), { allowOutside: true }); event.preventDefault(); return; }
    if (aimTouches.has(event.pointerId)) aimTouches.set(event.pointerId, pt(event));
    if (pinch) {
      perf.input();
      if (aimTouches.size >= 2) {const center=touchCenter();setAimZoom(pinch.zoom * touchDistance() / pinch.distance, center, mode==='camera' ? center : pinch.center);pinch.center=center;}
      event.preventDefault();
      return;
    }
    if (gestureZoom !== null) { event.preventDefault(); return; }
    if (!activePointer || event.pointerId !== activePointer.id) return;
    if (activePointer.pointerType === 'mouse') {
      const heldButton = [1, 4, 2][activePointer.button];
      // Pointer Events report a chorded button release as pointermove. Default
      // prevention suppresses compatibility mouseup, so finish from this event.
      if (event.buttons !== undefined && !(event.buttons & heldButton)) {
        finishPointer(event); return;
      }
      event.preventDefault();
      if (activePointer.button !== 0) event.stopPropagation();
    }
    perf.input();
    const point = pt(event);
    if(practiceDrag){practiceBallDrag.track(point);placementMoves.push(point);}
    else if (input.isRole('power-pull')) input.updatePowerPull(point);
    else if (input.isRole('tip')) input.setTipFromCorePoint(point, { allowOutside: true });
    else if (input.isRole('tip-drag')) input.updateTipDrag(point);
    else if (input.isRole('cue-ball-placement')) placementMoves.push(point);
    else updateAimDrag(point, event.timeStamp);
    // State revision / placement callback invalidates guides. Camera-only moves do not.
  });
  function finishPointer(event) {
    if(observationOrbit.up(event))return;
    if (event.pointerId === powerPointer) {
      effectivePowerBar?.hide();
      const id = powerPointer; powerPointer = null;
      powerInput.finishPowerPull(pt(event));
      if (powerTrack.hasPointerCapture(id)) powerTrack.releasePointerCapture(id);
      if (game.isBusy()) cancelInput();
      return;
    }
    if (event.pointerId === tipPointer) { tipInput.setTipFromCorePoint(pt(event), { allowOutside: true }); endTipPointer(); return; }
    aimTouches.delete(event.pointerId);
    if (aimTouches.size === 0) firstTouchAim = null;
    if (pinch || gestureZoom !== null) {
      returnObservationZoom();
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      if (aimTouches.size === 0) {pinch = null;if(mode==='camera')controls.enabled=false;}
      return;
    }
    if (!activePointer || event.pointerId !== activePointer.id) return;
    if (activePointer.pointerType === 'mouse' && event.button !== activePointer.button) return;
    const tapAim = clickAimEnabled && canAdjustViewAim() && ['aim','broadcast','god'].includes(mode) && aimDrag && !aimDrag.axis
      && performance.now()-aimDrag.startedAt < 500 && Math.hypot(pt(event).x-aimDrag.startPoint.x,pt(event).y-aimDrag.startPoint.y)<4;
    const tapPoint = tapAim ? tablePoint(pt(event)) : null;
    const releasedPointer = activePointer;
    if (tipPointer === null) tipHeldAt = null;
    perf.input();
    const point = pt(event);
    if(practiceDrag){
      placementMoves.push(point);placementMoves.flush();
      if(placementDragInHand)input.finishCueBallPlacement();
      practiceBallDrag.end();practiceDrag=null;placementCamera=null;placementMoves.clear();
      placementDragInHand=false;placementDragOffset=null;
    }
    else if (input.isRole('power-pull')) {
      effectivePowerBar?.hide();
      // Mouse release position is authoritative, including a return to zero.
      if (releasedPointer.pointerType === 'mouse') input.updatePowerPull(point);
      endTipPointer(); input.finishPowerPull(point);
    }
    else if (input.isRole('cue-ball-placement')) {
      placementMoves.push(point);placementMoves.flush();input.finishCueBallPlacement();
      placementCamera = null;placementMoves.clear();
    }
    else if (input.isRole('tip')) { input.setTipFromCorePoint(point, { allowOutside: true }); input.clear(); }
    else if (input.isRole('tip-drag')) { input.updateTipDrag(point); input.clear(); }
    // Retain the last pointermove aim. Touch release coordinates can drift as
    // the finger lifts; feeding them into speed-sensitive dragging adds a turn.
    const { target, id } = releasedPointer;
    if (mode === 'aim' && aimDrag?.axis === 'y') {
      aimInertia = startAimInertia(aimHeight, aimDrag, performance.now(), peekPx);
    }
    if(aimDrag)flushAimYaw();
    activePointer = null; aimDrag = null;
    if(tapPoint && powerPointer === null && tipPointer === null) startClickAim(tapPoint);
    if (peekPx > 0 || peekMotion.position > 0) {
      const handledAt = performance.now();
      const releasedAt = event.timeStamp > 0 && event.timeStamp <= handledAt
        ? event.timeStamp : handledAt;
      peekReturn = { startedAt: handledAt };
      peekReleaseTiming = { eventDelayMs: handledAt - releasedAt, firstFrameMs: null };
    }
    if (target.hasPointerCapture(id)) target.releasePointerCapture(id);
  }
  window.addEventListener('pointerup', finishPointer);
  function cancelPointer(event) {
    if(observationOrbit.up(event))return;
    if (event.pointerId === powerPointer) { endPowerPointer(); return; }
    if (event.pointerId === tipPointer) { endTipPointer(); return; }
    if (activePointer?.id === event.pointerId && aimDrag) {
      const { target, id } = activePointer;
      flushAimYaw();
      activePointer = null; aimDrag = null; aimInertia = null; input.clear();
      aimTouches.delete(id); firstTouchAim = null;
      if (peekPx > 0 || peekMotion.position > 0) peekReturn = { startedAt: performance.now() };
      if (target.hasPointerCapture(id)) target.releasePointerCapture(id);
      return;
    }
    if (activePointer?.id === event.pointerId || aimTouches.has(event.pointerId)) {
      cancelInput(); returnObservationZoom();
    }
  }
  window.addEventListener('pointercancel', cancelPointer);
  window.addEventListener('blur', () => {cancelInput();returnObservationZoom();});
  for (const target of [canvas, powerTrack, tipPad]) target.addEventListener('lostpointercapture', cancelPointer);
  canvas.addEventListener('wheel', event => {
    if(window.SnookerOnline?.isObserver()){event.preventDefault();return;}
    aimIntro = null; clickAimAnimation = null;
    if (cameraTransition?.manual) {event.preventDefault();return;}
    if (mode === 'camera') {observationOrbit.wheel(event);return;}
    event.preventDefault();
    perf.input();
    if (pinch || gestureZoom !== null) return;
    if (event.ctrlKey || mode === 'god') setAimZoom(currentZoomFactor() * Math.exp(-event.deltaY * 0.01), pt(event));
    else if (mode === 'aim') game.rotateAim(C.AimControl.wheelRotationDegrees(event));
  }, { passive: false });
  // Mobile pinch uses only canvas-owned pointer pairs. Keep native Safari
  // gestures disabled so a joystick finger cannot join or double-apply a pinch.
  // Desktop Safari delivers trackpad pinches as gesture events instead of Ctrl+wheel.
  canvas.addEventListener('gesturestart', event => {
    event.preventDefault();
    if (!OBSERVATION_PINCH_ZOOM_ENABLED || mode !== 'camera' || observationOrbit.isLooking() || activePointer || pinch || powerPointer !== null || tipPointer !== null) return; // Independent controls are never a zoom gesture.
    restoreTouchAim(); cancelInput(true); gestureZoom = currentZoomFactor();
  }, { passive: false });
  canvas.addEventListener('gesturechange', event => {
    if (gestureZoom === null) return;
    event.preventDefault(); setAimZoom(gestureZoom * event.scale, pt(event));
  }, { passive: false });
  canvas.addEventListener('gestureend', event => {
    if (gestureZoom === null) return;
    event.preventDefault(); gestureZoom = null;returnObservationZoom();if(mode==='camera')controls.enabled=false;
  }, { passive: false });
  window.addEventListener('keydown', event => {
    if (/INPUT|SELECT|TEXTAREA/.test(event.target.tagName)) return;
    if (event.key === 'Escape') cancelInput();
    if (mode !== 'aim') return;
    const delta = C.AimControl.keyRotationDegrees(event);
    if (delta) { aimIntro = null; clickAimAnimation = null; perf.input(); event.preventDefault(); game.rotateAim(delta); }
  });

  function setMode(value, automatic = false, temporary = false) {
    remoteAimCamera.reset();
    if(window.SnookerOnline?.isObserver()&&!window.SnookerOnline?.canChooseView?.())value='broadcast';
    if(!game.isReplay()&&value==='aim'&&window.SnookerOnline?.isObserver()&&!window.SnookerOnline?.canUseAimView?.())value='broadcast';
    if(!automatic&&!temporary&&value==='camera'&&mode==='camera'&&!temporaryObservation){
      selectedView=value;
      return;
    }
    if (aimIntro && automatic) return;
    // Explicit view requests take over immediately, including during entry.
    if (!automatic) aimIntro = null;
    if(!temporary)temporaryObservation=null;
    const manualFrom = !game.isReplay() && !automatic && value !== mode && ['aim','camera'].includes(value) && ['aim','camera'].includes(mode) ? cameraSnapshot(temporary) : null;
    if (!automatic) { shotCamera?.cancel(); cameraTransition = null;
      if (cueMotion?.type === 'enter') cueMotion = null; }
    cancelInput(false, temporary);
    // Clear residual orbit damping before handing the camera back to aiming.
    controls.enableDamping = false;
    controls.update();
    controls.enableDamping = true;
    setProjection(null);
    if(!automatic&&!temporary&&['aim','camera','broadcast','god'].includes(value))selectedView=value;
    mode = value; testFieldDolly=1; observationZoomReturn=null; clearTimeout(observationWheelTimer);
    aimZoomOffset.x=aimZoomOffset.y=0;
    surfaceLighting.setRailViewReflection(mode === 'god' ? 0 : 1);
    controls.enabled = false;
    controls.enableZoom = !isTrial && mode !== 'camera';
    // Observation gestures are handled independently: orbit, dolly and temporary yaw.
    controls.touches.TWO=mode==='camera'?THREE.TOUCH.DOLLY_ROTATE:THREE.TOUCH.DOLLY_PAN;
    controls.enablePan = false;
    controls.autoRotate = false;
    camera.clearViewOffset();
    camera.up.set(0, 1, 0);
    camera.zoom = 1;peekMagnification=1;
    camera.near = 0.04; camera.far = 80;
    camera.aspect = innerWidth / innerHeight;
    camera.fov = isTrial ? aimReferenceFov(innerWidth,innerHeight) : testFieldViewFov();
    controls.target.set(0, surfaceY, 0);
    // Trial observation uses a narrower zoom range plus angle-dependent table clearance.
    controls.minDistance = isTrial ? 2.5 : 1.6;
    controls.maxDistance = isTrial ? 4 : 8;
    if (mode === 'aim') {
      aimHeight = 0.12;
      syncAimCamera(true);
    } else if (mode === 'camera') {
      // Orbit the fixed blue-ball spot, even when entering from a cue-relative shot view.
      const blueSpotPivot=new THREE.Vector3(center.x,surfaceY+.05,center.z);
      controls.target.copy(manualFrom?.target??blueSpotPivot);
      const recorded=game.getReplayShot();
      const direction=recorded?.shot.direction || game.getState().aim?.direction || {x:1,y:0};
      const behind=new THREE.Vector3(direction.x,0,direction.y).normalize();
      if(manualFrom){
        camera.position.copy(manualFrom.position).addScaledVector(behind,1.2);
        camera.position.y+=.8;
      }else{
        camera.position.copy(center).addScaledVector(behind,observationBaseDistance);
        camera.position.y=1.8;
      }
      controls.minDistance=0;
      controls.maxDistance=Math.max(8,camera.position.distanceTo(controls.target));
      controls.update();
      observationOrbit.enter(undefined,blueSpotPivot,manualFrom?.target);
      constrainObservation();
      if (!isTrial) { controls.minDistance=0; controls.maxDistance=Infinity; }
    } else if (mode === 'broadcast') {
      // Reference-inspired centred long-axis view; user-tuned to 25 degrees at 8m.
      const geometry=lighting.getValues();
      const elevation = THREE.MathUtils.degToRad(geometry.broadcastElevation??25);
      const height=geometry.broadcastHeight??8*Math.sin(THREE.MathUtils.degToRad(25));
      controls.target.set(0, tableSize[1], 0);
      camera.position.set(-height/Math.tan(elevation), tableSize[1]+height, 0);
      camera.near = 1; camera.far = 80;
      camera.lookAt(controls.target);
      fitFixedView();
    } else if (mode === 'god') {
      controls.target.set(0, surfaceY, 0);
      camera.up.set(0, 0, 1);
      // fitFixedView chooses the nearest framing distance and tight clip range.
      camera.position.set(0, tableSize[1] + 3.2, 0);
      camera.lookAt(controls.target);
      fitFixedView();
    }
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    const selected = { aim: 'shot', camera: 'observe', broadcast: 'broadcast', god: 'god' }[mode];
    document.querySelectorAll('[data-view]').forEach(button => {
      button.classList.toggle('is-active', button.dataset.view === selected);
      button.setAttribute('aria-pressed', String(button.dataset.view === selected));
    });
    canvas.style.cursor = mode === 'camera' ? 'grab' : 'crosshair';
    drawAimDirty = true;
    if (manualFrom) {
      if (isTrial && mode === 'aim') trialUI?.centerCamera(camera);
      cameraTransition={from:manualFrom,to:cameraSnapshot(),start:cameraClock,duration:temporary?300:500,manual:true,wallStart:performance.now(),interactiveObservation:temporary && mode==='camera'};
      updateCameraTransition();
    }
  }
  function framePocketCamera({mouth,incoming}) {
    // Keep the mouth and the final approach together in frame from a low
    // viewpoint 20 cm above the pocket.
    camera.position.copy(world({x:mouth.x+incoming.x*900,y:mouth.y+incoming.y*900},.20));
    controls.target.copy(world({x:mouth.x-incoming.x*180,y:mouth.y-incoming.y*180},.02));
    camera.lookAt(controls.target);
    camera.updateProjectionMatrix();camera.updateMatrixWorld();
  }
  function cameraSnapshot(withoutPeek = false) {
    return {position:camera.position.clone(),quaternion:camera.quaternion.clone(),
      target:controls.target.clone(),fov:camera.fov,zoom:withoutPeek ? camera.zoom / peekMagnification : camera.zoom,near:camera.near,far:camera.far,
      view:camera.view?.enabled ? {...camera.view} : null};
  }
  function updateCameraTransition() {
    if (!cameraTransition) return;
    if(cameraTransition.interactiveObservation){
      // Orbit state advances during entry; blend toward its live pose so a second
      // finger (and the joystick) responds without waiting for the transition.
      observationOrbit.update();
      cameraTransition.to.position.copy(camera.position);
      cameraTransition.to.quaternion.copy(camera.quaternion);
      cameraTransition.to.target.copy(controls.target);
    }
    const {from,to,start,duration}=cameraTransition;
    const elapsed=THREE.MathUtils.clamp(cameraTransition.manual ? performance.now()-cameraTransition.wallStart : cameraClock-start,0,duration);
    if (cameraTransition.manual) {
      const u=elapsed/duration;
      const t=u*u*u*(10+u*(-15+6*u)); // zero velocity and acceleration at both ends
      camera.position.lerpVectors(from.position,to.position,t);
      camera.quaternion.slerpQuaternions(from.quaternion,to.quaternion,t);
      controls.target.lerpVectors(from.target,to.target,t);
      for (const key of ['fov','near','far']) camera[key]=THREE.MathUtils.lerp(from[key],to[key],t);
      peekMagnification = observationPeekMagnification();
      camera.zoom = THREE.MathUtils.lerp(from.zoom,to.zoom,t) * peekMagnification;
      if (from.view || to.view) {
        const base=to.view || from.view;
        const a=from.view || {...base,offsetX:0,offsetY:0}, b=to.view || {...base,offsetX:0,offsetY:0};
        camera.setViewOffset(base.fullWidth,base.fullHeight,
          THREE.MathUtils.lerp(a.offsetX,b.offsetX,t),THREE.MathUtils.lerp(a.offsetY,b.offsetY,t),base.width,base.height);
      } else camera.clearViewOffset();
      if(u===1) {if(!to.view)camera.clearViewOffset();cameraTransition=null;}
      camera.updateProjectionMatrix();camera.updateMatrixWorld();
      return;
    }
    // Keep the 700 ms return, easing only its last 200 ms. Integrate a
    // smooth velocity falloff so position, framing and gaze stop together.
    const brakeMs=Math.min(200,duration),cruiseMs=duration-brakeMs;
    const brakeProgress=THREE.MathUtils.clamp((elapsed-cruiseMs)/brakeMs,0,1);
    const brakeDistance=brakeMs*(brakeProgress-brakeProgress**3+0.5*brakeProgress**4);
    const t=(Math.min(elapsed,cruiseMs)+brakeDistance)/(cruiseMs+brakeMs/2);
    // Orbit around the destination's aiming point while approaching it. Sample
    // arc length once, then apply the shared cruise/braking progress to it.
    if (!cameraTransition.path) {
      const origin=to.target;
      const first=new THREE.Spherical().setFromVector3(from.position.clone().sub(origin));
      const last=new THREE.Spherical().setFromVector3(to.position.clone().sub(origin));
      const turn=THREE.MathUtils.euclideanModulo(last.theta-first.theta+Math.PI,2*Math.PI)-Math.PI;
      const points=[],lengths=[0];
      for(let i=0;i<=512;i++) {
        const u=i/512;
        points.push(new THREE.Vector3().setFromSpherical(new THREE.Spherical(
          THREE.MathUtils.lerp(first.radius,last.radius,u),
          THREE.MathUtils.lerp(first.phi,last.phi,u),first.theta+turn*u)).add(origin));
        if(i)lengths.push(lengths[i-1]+points[i].distanceTo(points[i-1]));
      }
      cameraTransition.path={points,lengths};
    }
    const {points,lengths}=cameraTransition.path;
    const distance=t*lengths[lengths.length-1];
    let low=0,high=lengths.length-1;
    while(high-low>1) {const mid=(low+high)>>1;if(lengths[mid]<distance)low=mid;else high=mid;}
    const fraction=(distance-lengths[low])/Math.max(1e-10,lengths[high]-lengths[low]);
    camera.position.lerpVectors(points[low],points[high],fraction);
    // Preserve the broadcast composition on the first frame. Shift attention
    // continuously towards the aiming point rather than snapping it to centre.
    controls.target.lerpVectors(from.target,to.target,t);
    camera.lookAt(controls.target);
    const fromSpan=from.position.distanceTo(from.target)*Math.tan(THREE.MathUtils.degToRad(from.fov/2));
    const toSpan=to.position.distanceTo(to.target)*Math.tan(THREE.MathUtils.degToRad(to.fov/2));
    const span=THREE.MathUtils.lerp(fromSpan,toSpan,t);
    const focusDistance=Math.max(1e-6,camera.position.distanceTo(controls.target));
    camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(span/focusDistance));
    camera.near=THREE.MathUtils.lerp(from.near,to.near,t);
    camera.far=THREE.MathUtils.lerp(from.far,to.far,t);
    if(from.view && t<1) {
      const v=from.view;
      camera.setViewOffset(v.fullWidth,v.fullHeight,v.offsetX*(1-t),v.offsetY*(1-t),v.width,v.height);
    } else camera.clearViewOffset();
    camera.updateProjectionMatrix();camera.updateMatrixWorld();
    if(t===1){cameraTransition=null;shotCamera.finish();}
  }
  shotCamera=C.createShotCameraDirector({onCommand(command) {
    if(game.isReplay() && replayView!=='aim')return;
    if(!game.isReplay()&&window.SnookerOnline?.canChooseView?.()&&selectedView!=='aim')return;
    if(window.SnookerOnline?.isObserver()&&!window.SnookerOnline?.canUseAimView?.()){if(!window.SnookerOnline?.canChooseView?.()&&mode!=='broadcast')setMode('broadcast',true);return;}
    cameraTransition=null;
    if(command.type==='shot-view') {
      // Keep the exact release pose, including height and framing. A distinct
      // mode prevents the aiming loop from following the moving cue ball.
      if(mode!=='aim')setMode('aim',true);
      mode='shot-view';controls.enabled=false;
    } else if(command.type==='pocket') {
      setMode('pocket',true);
      framePocketCamera(command.plan);
    } else if(command.type==='broadcast') {
      setMode('broadcast',true);
    } else if(command.type==='return') {
      const from=cameraSnapshot();
      setMode('aim',true);
      const to=cameraSnapshot();
      cameraTransition={from,to,start:cameraClock,duration:command.duration};
      cueMotion={type:'enter',start:cameraClock,duration:command.duration,
        pose:cloneGameData(game.getCuePose()),pull:C.ShotControl.powerToAddressOffsetMm(game.getPower())};
      updateCameraTransition();
    }
  }});
  document.querySelector('#retry-shot').addEventListener('click', () => {
    cancelInput();
    if (game.retry()) { syncMeshes(); syncAimCamera(); }
  });
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
    setMode({ shot: 'aim', observe: 'camera', broadcast: 'broadcast', god: 'god' }[button.dataset.view]);
  }));
  let viewportWidth=innerWidth,viewportHeight=innerHeight;
  function resizeViewport(){
    const oldRef=referenceViewport(viewportWidth,viewportHeight),nextRef=referenceViewport(innerWidth,innerHeight);
    const pixelScale=nextRef.scale/oldRef.scale;
    const resizeView=view=>view?.enabled?{...view,fullWidth:innerWidth,fullHeight:innerHeight,width:innerWidth,height:innerHeight,offsetX:view.offsetX*pixelScale,offsetY:view.offsetY*pixelScale}:view;
    if(isTrial&&cameraTransition){
      const lensRatio=Math.tan(aimReferenceFov(innerWidth,innerHeight)*Math.PI/360)/Math.tan(aimReferenceFov(viewportWidth,viewportHeight)*Math.PI/360);
      for(const snapshot of [cameraTransition.from,cameraTransition.to]){snapshot.fov=2*Math.atan(Math.tan(snapshot.fov*Math.PI/360)*lensRatio)*180/Math.PI;snapshot.view=resizeView(snapshot.view);}
      camera.aspect=innerWidth/innerHeight;updateCameraTransition();
    }else if(mode==='broadcast'||mode==='god')fitFixedView();
    else{
      const v=resizeView(camera.view);
      if(v?.enabled)camera.setViewOffset(v.fullWidth,v.fullHeight,v.offsetX,v.offsetY,v.width,v.height);
      if(isTrial){camera.aspect=innerWidth/innerHeight;camera.fov=aimReferenceFov(innerWidth,innerHeight);camera.updateProjectionMatrix();}
      else{camera.aspect=innerWidth/innerHeight;camera.fov=testFieldViewFov();camera.updateProjectionMatrix();}
      if(mode==='aim'){trialUI?.centerCamera(camera);syncAimCamera();}
    }
    viewportWidth=innerWidth;viewportHeight=innerHeight;
  }
  const viewObserver = new ResizeObserver(fitFixedView);
  for (const selector of ['.toolbar', '.shot-panel']) viewObserver.observe(document.querySelector(selector));
  if(legacyHud)viewObserver.observe(legacyHud);

  const decisionBar = legacyHud?.querySelector('#decision-actions');
  const nominationBar = legacyHud?.querySelector('#nomination-actions');
  let decisionKey = '';
  let nominationKey = '';
  let lastHudTime = 0;
  let lastTime = null;
  let fpsFrames = 0;
  let fpsSince = performance.now();
  let fps = 0;
  const trialFps = document.getElementById('trial-fps');
  function updateHud(now) {
    if (now - lastHudTime < 80) return;
    lastHudTime = now;
    const state = game.getState();
    state.players.forEach((player, index) => {
      document.querySelector(`#player-${index + 1}`).classList.toggle('is-turn', state.currentPlayerId === player.id);
      document.querySelector(`#score-${index + 1}`).textContent = player.score;
    });
    document.querySelector('#break-score').textContent = state.ruleState.currentBreak || 0;
    const target = state.ruleState.requiresNomination ? '指定彩球' : state.ruleState.cueBallInHand ? '母球手中球' :
      C.Rules.targetKindsForRule(state.ruleState, state).map(C.Intermission.ballKindLabel).join(' / ');
    document.querySelector('#game-status').textContent = game.isPaused() ? '已暂停' : state.frameOver ? '本局结束' : game.isBusy() ? '击球中' : target;
    document.querySelector('#shot-message').textContent = message;
    document.querySelector('#retry-shot').disabled = !game.canRetry();
    document.querySelector('#fps').textContent = `实际 FPS：${fps}`;
    const actions = C.Intermission.createPendingDecisionActions(state);
    if (state.ruleState.pendingDecision?.type === 'foul' && !actions.some(action => action.value === C.Rules.DECISION.PLAY_SELF)) {
      actions.unshift({ value: C.Rules.DECISION.PLAY_SELF, label: '自己打' });
    }
    const key = JSON.stringify(actions);
    if (key !== decisionKey) {
      decisionKey = key; decisionBar.replaceChildren();
      actions.forEach(action => {
        const button = document.createElement('button'); button.textContent = action.label;
        button.dataset.decision = action.value;
        button.addEventListener('click', () => { if (game.decision(action.value)) message = '下一杆'; });
        decisionBar.append(button);
      });
    }
    const nominations = nominationBar ? C.Intermission.createNominationActions(state) : [];
    const nKey = JSON.stringify(nominations);
    if (nominationBar && nKey !== nominationKey) {
      nominationKey = nKey; nominationBar.replaceChildren();
      nominations.forEach(action => {
        const button = document.createElement('button'); button.title = C.Intermission.ballKindLabel(action.value);
        button.setAttribute('aria-label', button.title); button.className = 'ball-swatch';
        button.style.background = state.balls.find(ball => ball.kind === action.value).color;
        button.addEventListener('click', () => game.nominate(action.value)); nominationBar.append(button);
      });
    }
  }
  let liftAnimating=false,shadowLightingRevision=-1,shadowSettingsCache=null;

  function isCueBallPlacementHeld() {
    return input.isRole('cue-ball-placement')
      && (!placementDragInHand || practiceBallDrag.activeId() === game.getState().cueBallId);
  }

  let lastMeshState=null,lastMeshRevision=-1,lastMeshLightingRevision=-1;
  function syncMeshes(dt, replayBalls = null, replayReturn = null) {
    const lightingRevision=lighting.getRevision();
    const state=game.getState(),revision=game.getRevision();
    // Camera movement alone does not change world-space balls or their shadows.
    // A held ball can reach its lifted height and stop animating before release.
    // Keep residual lift out of the static cache so release always starts descent.
    const staticWorld=!replayBalls&&![...practiceLift.values()].some(height=>height>0)&&(!game.isBusy()||game.isPaused())&&!liftAnimating&&!practiceBallDrag.pending()&&!practiceBallDrag.activeId()&&!input.isRole('cue-ball-placement')&&pocketReturn.activity().active===0;
    if(staticWorld&&lastMeshState===state&&lastMeshRevision===revision&&lastMeshLightingRevision===lightingRevision)return;
    lastMeshState=replayBalls?null:state;lastMeshRevision=revision;lastMeshLightingRevision=lightingRevision;
    liftAnimating=false;
    if(shadowLightingRevision!==lightingRevision){shadowLightingRevision=lightingRevision;shadowSettingsCache=lighting.getValues();shadowSyncKeys.clear();}
    const shadowSettings=shadowSettingsCache;
    if (!replayBalls) practiceBallDrag.update(performance.now(),tablePoint,id=>game.getState().balls.find(b=>b.id===id)?.pos);
    if (!replayBalls) pocketReturn.update(dt, game.getState());
    const presentedBalls=replayBalls || game.getState().balls;
    const cueBallHeld = isCueBallPlacementHeld()
      || (window.SnookerOnline?.isObserver() && game.remoteCueBallPlacement?.()?.held);
    const activeIds=new Set(presentedBalls.map(b=>b.id));
    for(const [id,mesh] of meshById)if(!activeIds.has(id)){mesh.visible=false;shadowById.get(id).visible=false;ballSyncKeys.delete(id);shadowSyncKeys.delete(id);}
    presentedBalls.forEach(ball => {
      const mesh = meshById.get(ball.id), shadow = shadowById.get(ball.id);
      const inReturn = (replayBalls ? replayReturn : pocketReturn)?.has(ball.id);
      if (!inReturn) {
        const motion = ball.pocketMotion;
        const dropping = motion && motion.phase !== 'done';
        const alpha = dropping ? motion.renderAlpha ?? 1 : ball.potted ? 0 : 1;
        mesh.visible = alpha > 0.01;
        const previousLift=practiceLift.get(ball.id)||0;
        const handPlacement=ball.id===state.cueBallId && cueBallHeld;
        const targetLift=practiceBallDrag.activeId()===ball.id || handPlacement?0.01:0;
        let lift=replayBalls ? 0 : THREE.MathUtils.lerp(previousLift,targetLift,Math.min(1,(dt||0)*12));
        if(Math.abs(lift-targetLift)<1e-7)lift=targetLift;else liftAnimating=true;
        if (!replayBalls) practiceLift.set(ball.id,lift);
        const q=ball.orientation;
        const poseKey=[ball.pos.x,ball.pos.y,ball.radius,mesh.userData.baseScale,ball.potted,ball.pocketEntry?.height,ball.spHeightMm,alpha,lift,q.x,q.y,q.z,q.w,motion?.renderScale].join(',');
        if(ballSyncKeys.get(ball.id)!==poseKey){
        ballSyncKeys.set(ball.id,poseKey);
        mesh.position.copy(world(ball.pos, (ball.pocketEntry ? ball.pocketEntry.height / 1000 : (ball.radius + (ball.spHeightMm || 0)) / 1000) + lift - (dropping ? (1 - alpha) * 0.12 : 0)));
        mesh.quaternion.set(q.x, -q.z, q.y, q.w);
        mesh.scale.setScalar(mesh.userData.baseScale * (dropping ? motion.renderScale ?? 1 : 1));
        }
      }else ballSyncKeys.delete(ball.id);
      const roof=mesh.material.uniforms.roofPlane.value;
      const shadowKey=[mesh.visible,mesh.position.x,mesh.position.y,mesh.position.z,ball.radius,roof.x,roof.z].join(',');
      if(shadowSyncKeys.get(ball.id)===shadowKey)return;
      shadowSyncKeys.set(ball.id,shadowKey);
      const radius = ball.radius / 1000;
      const lift = Math.max(0, mesh.position.y - surfaceY - radius);
      shadow.visible = mesh.visible && mesh.position.y + radius > surfaceY;
      shadow.position.set(mesh.position.x, surfaceY + .0001, mesh.position.z);
      const nearestPocket = shadowPockets.reduce((a,b) =>
        Math.hypot(mesh.position.x-a.center.x,mesh.position.z-a.center.z) <
        Math.hypot(mesh.position.x-b.center.x,mesh.position.z-b.center.z) ? a : b);
      const clipped = Math.hypot(mesh.position.x-nearestPocket.center.x,mesh.position.z-nearestPocket.center.z) < .25;
      const uniforms = shadow.material.uniforms;
      uniforms.pocketEdgeCount.value = clipped ? nearestPocket.points.length : 0;
      if(clipped){
        uniforms.pocketCenter.value.set(nearestPocket.center.x,nearestPocket.center.z);
        nearestPocket.points.forEach((p,i)=>uniforms.pocketEdge.value[i].set(p.x,p.z));
      }
      {
        const liftRatio=THREE.MathUtils.clamp(lift/.01,0,1);
        const size=(shadowSettings.shadowSize??1)*(1+.35*liftRatio);
        shadow.scale.set(size,size,1);
        shadow.material.opacity=(shadowSettings.shadowOpacity??1)*(1-.55*liftRatio)
          * THREE.MathUtils.smoothstep(mesh.position.y-surfaceY,-radius,0);
        shadow.material.uniforms.opacity.value=shadow.material.opacity;

        const [dx,dz]=ballShadowOffset(mesh.position.x-roof.x,mesh.position.z-roof.z,
          radius+lift,shadowSettings.shadowOffsetStrength??.5,radius);
        // Plane's local +Y becomes world -Z after its -90 degree X rotation.
        shadow.material.uniforms.shadowDrift.value.set(dx/(2*radius*size),-dz/(2*radius*size));
      }
    });
  }
  const remoteCueTarget=new THREE.Quaternion();
  let lastCueState=null,lastCueRevision=-1;
  function syncCue(dt=0) {
    syncCueEquipment();
    const state = game.getState(), animation = game.getAnimation();
    const revision=game.getRevision();
    const online = window.SnookerOnline;
    const observer = online?.isObserver();
    const staticCue=!cueMotion&&!animation&&!observer;
    // A hand placement moves the ball and its address pose as one object.
    // A previous stroke's resting pose or observer interpolation must not pin
    // the shaft to the old cue-ball position while the settled table moves.
    const handPlacement=Boolean(state.ruleState.cueBallInHand&&!game.isBusy()&&!animation);
    if(handPlacement)cueMotion=null;
    C.CuePresentation.avoidApproachingBalls(cueMotion,state.balls,game.getCueGeometry(),cameraClock);
    const presented = cueMotion ? C.CuePresentation.sampleCuePresentation(cueMotion,cameraClock) : null;
    if (presented?.done) cueMotion = null;
    const decision = state.ruleState.pendingDecision;
    // After an in-off foul the incoming player can aim before choosing how to proceed.
    const liveAim = (observer || online?.presentationReady?.()) && !game.isBusy() && !state.frameOver
      && (!decision || (handPlacement && decision.type === 'foul'));
    cue.visible = Boolean((animation && !animation.fired) || ((game.canOperate() || game.replayAimVisible() || liveAim) && state.aim));
    if (presented && !presented.done) cue.visible = true;
    if (online?.cuePresentationReady?.() === false || (observer && handPlacement && game.remoteCueBallPlacement?.()?.held)) cue.visible = false;
    if (!cue.visible) {remoteCueMotion.reset();return;}
    if(staticCue&&lastCueState===state&&lastCueRevision===revision)return;
    lastCueState=staticCue?state:null;lastCueRevision=revision;
    let pose = presented && !presented.done ? presented.pose : animation?.cuePose || game.getCuePose();
    if (!pose) { cue.visible = false; remoteCueMotion.reset(); return; }
    const pull = presented && !presented.done ? 0 : Math.max(0, animation?.currentOffset ?? C.ShotControl.powerToAddressOffsetMm(game.getPower()));
    if(!(presented && !presented.done && cueMotion?.displayPose))
      pose = C.createCueDisplayPose(pose, game.getCueBall().radius, game.getCueGeometry(), pull);
    const back = new THREE.Vector3(-pose.back[0], pose.back[2], -pose.back[1]);
    const right = new THREE.Vector3(-pose.right[0], 0, -pose.right[1]);
    const targetPosition=world({ x: pose.origin[0], y: pose.origin[1] }, pose.origin[2] / 1000);
    // The handle badge faces local +Z; keep that face above the shaft for every aim direction.
    cueLocalX.copy(right).negate().normalize();
    cueLocalZ.crossVectors(cueLocalX, back).normalize();
    remoteCueTarget.setFromRotationMatrix(cueOrientation.makeBasis(cueLocalX, back, cueLocalZ));
    remoteCueMotion.apply(cue,targetPosition,remoteCueTarget,{active:Boolean(observer && !game.isBusy() && !presented && !handPlacement),dt,anchor:game.getCueBall().pos});
    cue.children.forEach(part => {
      part.material.opacity = presented && !presented.done ? presented.opacity : animation?.opacity ?? 1;
      // At full opacity the wooden shell must occlude the recessed brass socket.
      // During the presentation fade, avoid leaving an opaque depth silhouette.
      part.material.depthWrite = part.material.opacity >= .999; });
  }
  function canAdjustViewAim() {
    return !temporaryObservation && viewAimAdjustmentEnabled(mode, trialUI?.difficulty() ?? debugPanel.difficulty?.());
  }
  function startClickAim(point) {
    if(!clickAimEnabled || !game.canOperate() || !canAdjustViewAim())return;
    const state=game.getState(),colliders=state.tableColliderSet;
    const table={...state.table,...colliders,pocketLips:(colliders.pocketLips||[]).flatMap(l=>l.segments||[l])};
    if(!C.ManualPlacement.isManualPlacementValid(point,0,table))return;
    if(Math.hypot(point.x-game.getCueBall().pos.x,point.y-game.getCueBall().pos.y)<1)return;
    clickAimAnimation=C.AimSession.createAimDirectionAnimation({fromDirection:state.aim.direction,
      toDirection:C.AimControl.directionFromPoint(game.getCueBall().pos,point),startTime:performance.now()});
  }
  function updateClickAim() {
    if(!clickAimAnimation)return;
    if(!clickAimEnabled || !game.canOperate() || !canAdjustViewAim()){clickAimAnimation=null;return;}
    const frame=C.AimSession.aimDirectionAt(clickAimAnimation,performance.now());
    game.setDirection(frame.direction);
    if(frame.complete)clickAimAnimation=null;
  }
  const predictionAllowed = () => (!game.isReplay() || game.replayAimVisible()) && (!game.isBusy() || game.isReplay()&&game.replayAimVisible()) && (!window.SnookerOnline?.isObserver() || mode==='aim'&&window.SnookerOnline?.aimPresentationReady?.()) && (game.canOperate() || game.replayAimVisible() || window.SnookerOnline?.aimPresentationReady?.());
  let predictionWasAllowed = false;
  function updateAim(now) {
    // A moving ball invalidates full shot simulation. Rebuild at release,
    // instead of serializing and simulating positions that never get painted.
    const allowed = predictionAllowed() && !placementCamera;
    if (!allowed) predictions.setDesired(null);
    const revision = game.getRevision();
    if (allowed && (revision !== aimRevision || !predictionWasAllowed)) {
      aimRevision = revision;
      predictions.setDesired(perf.measure('predictionInputMs', () => game.predictionRequest()));
      drawAimDirty = true;
    }
    predictionWasAllowed = allowed;
    if (allowed && !document.hidden) predictions.pump(now);
    if (predictionDisplay.update(performance.now())) {
      prediction = predictionDisplay.get(); drawAimDirty = true;
    }
    const difficulty = trialUI?.difficulty() ?? debugPanel.difficulty?.();
    const returningFromObservation = mode === 'aim' && cameraTransition?.manual;
    aimPlane.visible = guidesEnabled && allowed && !returningFromObservation && !hideViewAimHelpers(mode, difficulty, game.isReplay());
    if (!aimPlane.visible) { drawAimDirty = true; return; }
    if (!drawAimDirty) return;
    if (vectorAim) vectorAim.beginFrame();
    else aimContext.clearRect(0, 0, aimCanvas.width, aimCanvas.height);
    const config = game.getConfig();
    const renderState = C.createStageRenderState(game.getState(), { power: game.getPower(), spin: game.getTip(),
      aimPrediction: prediction, aimVersion: config.aim.version, visualValues:{cueTrajectoryVisible:window.SnookerOnline?.preferences().cueTrajectoryVisible!==false},threeLineValues: config.aim.values });
    renderState.predictionGuidesVisible = viewAimEnabled(mode, config.aim.values);
    perf.measure('aimDrawMs', () => aimRenderer.drawAim(renderState, transform));
    if (vectorAim) { vectorAim.endFrame(); perf.count('aimGeometryUpdates'); }
    else { perf.count('aimTextureUploads'); aimTexture.needsUpdate = true; }
    drawAimDirty = false;
  }
  let lastBroadcastGeometry='';
  if (!isTrial) lighting.register({
    parameters: [
      {id:'shotCameraSetback', nameZh:'母球后方距离（米）', group:'击球视角', min:.4, max:3, step:.01, default:defaultAimSetback,
        description:'最低瞄准姿态下，相机沿击球线退到母球后方的水平距离。抬高视角和滚轮缩放仍可改变机位。'},
      {id:'shotCameraFov', nameZh:'垂直 FOV（度）', group:'击球视角', min:15, max:60, step:.5, default:defaultTestFieldFov,
        description:'击球视角的横屏垂直视场角。竖屏时自动适配画幅。'},
    ],
    apply(values) {
      testFieldAimSetback = values.shotCameraSetback;
      testFieldAimFov = values.shotCameraFov;
    },
  });
  lighting.register({parameters:[
    {id:'broadcastHeight',nameZh:'相机高于库顶（米）',group:'直播相机几何',min:1,max:8,step:.05,default:8*Math.sin(25*Math.PI/180),description:'相机相对库顶的高度；保持俯角时同步调整水平距离。'},
    {id:'broadcastElevation',nameZh:'朝球桌中心俯角（度）',group:'直播相机几何',min:10,max:65,step:.5,default:25,description:'保持高度时调整水平距离，仅影响直播视角。'}
  ],apply(values){
    const key=values.broadcastHeight+':'+values.broadcastElevation;
    if(key===lastBroadcastGeometry)return;
    lastBroadcastGeometry=key;
    if(mode==='broadcast'){
      cameraTransition=null;shotCamera.cancel();
      const h=values.broadcastHeight,a=values.broadcastElevation*Math.PI/180;
      controls.target.set(0,tableSize[1],0);
      camera.position.set(-h/Math.tan(a),tableSize[1]+h,0);
      camera.lookAt(controls.target);fitFixedView();requestFrame();
    }
  }});
  const sceneDebug=createSceneDebug({scene,tableRoot,cue,balls,ballShadows,renderer,camera,lighting,onChange:requestFrame,trackMaterialChanges:!isTrial,getVenueRoot});
  if (isTrial) {
    const presets=window.SnookerTrialTuning.snapshot.presets;
    lighting.apply({...presets.lighting?.values,...(presets.scene?.values?.floorMaterial?{floorMaterial:presets.scene.values.floorMaterial}:{})});
    sceneDebug.apply(presets.scene?.values || {floorMaterial:lighting.getValues().floorMaterial});
  }
  const cueTrajectory = isTrial ? null : (await import('./cue-trajectory.js')).createCueTrajectoryView({scene,core:game,center,surfaceY,requestFrame});
  const debugPanel = isTrial ? { update() {} } : createDebugPanel({ quality, lighting, sceneDebug, soundVolumes, soundSettings, cueTrajectory, core: game, api: C, defaults: window.GAME_CLIENT_CONFIG,
    onTuningChange() {
      // Redraw during the slider's input event; do not wait for a new Worker
      // result or another aim gesture to invalidate the visible guide geometry.
      drawAimDirty = true;
      updateAim(performance.now());
    },
  });
  let wasOnlineObserver=false,wasPresentationBlocked=false;
  const onlineMatchView=createOnlineMatchView();
  function syncOnlineView(){
    // In-place match replay owns the camera; live turn changes must not reset it.
    if(game.isReplay()){wasOnlineObserver=false;wasPresentationBlocked=false;return;}
    const initialView=onlineMatchView.next(window.SnookerOnline?.getState?.(),game.getState());
    if(initialView){selectedView=initialView;aimIntro=null;cameraTransition=null;cueMotion=null;shotCamera.cancel();remoteCueMotion.reset();setMode(initialView,true);}
    const blocked=window.SnookerOnline&&!window.SnookerOnline.presentationReady?.();
    if(blocked){if(!wasPresentationBlocked){aimIntro=null;cameraTransition=null;shotCamera.cancel();setMode('aim',true);presentationStarted=false;}wasPresentationBlocked=true;aimHeight=2.6;syncAimCamera(true);return;}
    wasPresentationBlocked=false;
    if(!presentationStarted&&window.SnookerOnline&&!document.getElementById('viewer')?.classList.contains('is-loading'))startPresentation();
    const watching=window.SnookerOnline?.isObserver()||false;
    const self=window.SnookerOnline?.getState?.()?.self;
    // Each outgoing player's turn ends in broadcast view. A waiting player
    // may choose aim again, but that choice cannot carry into the next handoff.
    if(watching&&!wasOnlineObserver&&self?.playerId&&self.role!=='spectator'){
      selectedView='broadcast';aimIntro=null;cameraTransition=null;cueMotion=null;shotCamera.cancel();remoteCueMotion.reset();setMode('broadcast',true);
    }
    if(watching&&window.SnookerOnline?.canChooseView?.()&&selectedView==='aim'&&!window.SnookerOnline?.canUseAimView?.()){
      selectedView='broadcast';aimIntro=null;cameraTransition=null;shotCamera.cancel();setMode('broadcast',true);
    }
    // Waiting players may inspect freely; taking over the table always starts
    // in their own aiming view. Later manual changes within that turn remain.
    if(!watching&&wasOnlineObserver)selectedView='aim';
    if(window.SnookerOnline?.canChooseView?.()&&selectedView!=='aim'){
      if(watching!==wasOnlineObserver){aimIntro=null;shotCamera.cancel();if(!cameraTransition?.manual)cameraTransition=null;}
      if(mode!==selectedView&&!temporaryObservation)setMode(selectedView,true);
      if(watching)controls.enabled=false;
      wasOnlineObserver=watching;return;
    }
    if(watching&&selectedView==='aim'&&window.SnookerOnline?.canUseAimView?.()){wasOnlineObserver=true;return;}
    if(watching && (!wasOnlineObserver || !window.SnookerOnline?.canChooseView?.()&&mode!=='broadcast')){aimIntro=null;cameraTransition=null;shotCamera.cancel();setMode('broadcast',true);}
    else if(!watching && wasOnlineObserver){const from=cameraSnapshot();aimIntro=null;cameraTransition=null;shotCamera.cancel();setMode('aim',true);const duration=700;cameraTransition={from,to:cameraSnapshot(),start:cameraClock,duration};cueMotion={type:'enter',start:cameraClock,duration,pose:cloneGameData(game.getCuePose()),pull:C.ShotControl.powerToAddressOffsetMm(game.getPower())};updateCameraTransition();}
    if(watching)controls.enabled=false;
    wasOnlineObserver=watching;
  }
  setMode('aim');
  // Hold the far endpoint behind the loading screen until entry is accepted.
  aimHeight = 2.6;
  syncAimCamera(true);
  let presentationStarted = false;
  function startPresentation() {
    if (presentationStarted||window.SnookerOnline&&!window.SnookerOnline.presentationReady?.()) return;
    presentationStarted = true;
    cancelInput();
    if(window.SnookerOnline?.canChooseView?.()&&selectedView!=='aim'){aimIntro=null;setMode(selectedView,true);return;}
    if(window.SnookerOnline?.isObserver()&&!(selectedView==='aim'&&window.SnookerOnline?.canUseAimView?.())){aimIntro=null;setMode('broadcast',true);return;}
    if(trialUI?.isReplay()||game.isReplay()){aimIntro=null;setMode('broadcast');if(trialUI?.isReplay())trialUI.startReplay();return;}
    aimIntro = { start: cameraClock, duration: 1400 };
    updateAimIntro(); syncAimCamera(true);
  }
  drawShotControls();
  if (!isTrial) shotParametersHUD = createShotParametersHUD(() => game);
  const replayTest = !isTrial ? createReplayTest({game,scene,meshById,cue,world,renderer,controls,
    syncBalls:(balls,returns)=>syncMeshes(0,balls,returns),
    createReturns:()=>createPocketReturn({meshById,world,surfaceY,tableRoot,pockets:game.getState().tableColliderSet.pockets,calibration:window.tablePreviewReport.calibration,installLighting:false}),updateLighting:()=>cueLighting.update(),
    hideDuringReplay:[aimPlane],beforeOpen:cancelInput}) : null;
  window.threeGame = {
    core: game, input, project, tablePoint, sceneDebug, cueTrajectory, isCueBallPlacementHeld,
    canAutoStartAudio:()=>{const status=rawBackend.playbackStatus();return status.muted||status.state==='running';},
    getSelectedView:()=>selectedView,
    restorePracticeView(value='aim'){
      if(game.isReplay())return false;
      const next=['aim','camera','broadcast','god'].includes(value)?value:'aim';
      aimIntro=null;cameraTransition=null;cueMotion=null;temporaryObservation=null;
      shotCamera.cancel();remoteCueMotion.reset();practiceCamera=null;
      wasOnlineObserver=false;wasPresentationBlocked=false;presentationStarted=true;
      selectedView=next;setMode(next,true);syncMeshes();requestFrame();return true;
    },
    setView(value){if(game.isReplay())replayView=value;setMode(value);requestFrame();},
    baseline: () => ({ capturedAt: new Date().toISOString(), model: window.tablePreviewReport,
      mapping: { units: 'physics millimetres / scene metres', origin: center.toArray(),
        x: 'world.x = origin.x - physics.x / 1000', z: 'world.z = origin.z - physics.y / 1000', surfaceY },
      table: game.getState().table, balls: game.getState().balls,
      physics: game.getPhysicsParams(), viewport: { width: innerWidth, height: innerHeight, dpr: renderer.getPixelRatio() } }),
    cueGrabPoint() {
      const p = cue.localToWorld(new THREE.Vector3(0, 0.55, 0)).project(camera);
      return { x: (p.x + 1) * innerWidth / 2, y: (1 - p.y) * innerHeight / 2 };
    },
    diagnostics: () => ({ viewMode:mode,selectedView,fps, eventCount, lastSound, aimVisible:aimPlane.visible, state: game.getState(), prediction,
      remoteAimCamera:remoteAimCamera.diagnostics(),
      cuePlacementRing:placementHint?.diagnostics(),
      cuePlacementLift:(meshById.get(game.getState().cueBallId)?.position.y??surfaceY)-surfaceY-(game.getCueBall()?.radius||26.25)/1000,
      celebration:celebration?{playing:celebration.playing,visible:celebration.mesh.visible,elapsed:celebration.elapsed,duration:celebration.duration,count:celebration.count,tablePieces:celebration.tablePieces}:null,
      aimLayer: vectorAim?.diagnostics() ?? { backend: 'canvas-texture' },
      performance: perf.snapshot(), predictionQueue: predictions.diagnostics(),
      pocketReturns: pocketReturn.diagnostics(), replay: replayTest?.diagnostics(),
      shotCamera: shotCamera.diagnostics(), replayView, audio:rawBackend.playbackStatus(), ballLighting:Object.fromEntries([...meshById].map(([id,m])=>[id,m.userData.pocketLight])), cameraTransition: Boolean(cameraTransition), introActive: Boolean(aimIntro),
      camera: camera.position.toArray(), cameraTarget: controls.target.toArray(), aimHeight, peekPx, peekReleaseTiming, zoom: currentZoomFactor(),
      observationGesture: mode==='camera' ? observationOrbit.diagnostics() : null,
      fov: camera.fov, aspect:camera.aspect, projection:camera.projectionMatrix.elements.slice(), viewMatrix:camera.matrixWorldInverse.elements.slice(), view:camera.view, near: camera.near, far: camera.far, surfaceY,
      tableScreenCorners: tableCorners.map(corner => {
        const p = corner.clone().project(camera);
        return { x: (p.x + 1) * innerWidth / 2, y: (1 - p.y) * innerHeight / 2 };
      }),
      ferrule: { lengthMetres: .008, color: cue.children[2].material.color.getHexString(), neutralEnvironment: true },
      cuePose: game.getCuePose(), cueGeometry: game.getCueGeometry(), cuePosition: cue.position.toArray(), cueVisible: cue.visible, cueSource: cueSource.source, cueQuality:'optimized', cueTriangles:(()=>{let n=0;cue.traverse(o=>{if(o.isMesh)n+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});return n;})(), cueMeshes: cue.children.length, mode }),
  };
  window.addEventListener('pagehide', event => {
    if(event.persisted)return;
    disposeIntroInputLock();
    cueTrajectory?.dispose();
    for (const shadow of shadowById.values()) shadow.material.dispose();
    observationJoystick.dispose();
    placementHint?.dispose();
    replayTest?.dispose();
    shotParametersHUD?.dispose(); crowdTolerance.dispose(); snookerReview.dispose();
    sceneDebug?.dispose();
    celebration?.dispose();celebrationLanding?.dispose();
    cueLighting.dispose();
    cueDisposed=true;cueLoadAbort.abort();cue.clear();
    for(const cached of cueAssets.values()){cached.asset.cue.add(...cached.meshes);cached.asset.dispose();}cueAssets.clear();cueLoads.clear();cueRetryAfter.clear();
    shotCamera.cancel(); cameraTransition=null; cueMotion=null;
    clearTimeout(observationWheelTimer);
    cancelInput(); hudObserver?.disconnect(); viewObserver.disconnect();
    effectivePowerBar?.dispose();
    predictions.destroy(); soundSettings?.stopPreview(); crowdPlayback.reset(); matchCrowdPlayback?.reset(); crowdSounds.stop(); audio.destroy();
    if (vectorAim) vectorAim.dispose();
    else { aimTexture.dispose(); aimPlane.geometry.dispose(); aimPlane.material.dispose(); }
  });
  return {
    recoverFrame(error){
      reportGameError(error,'frame');
      if(game.isPractice()&&!game.isReplay()&&game.isBusy()&&game.canRetry()){
        cancelInput();const recovered=game.retry();
        if(recovered){syncMeshes();syncAimCamera();trialUI?.notice?.('本杆运行异常，已恢复到出杆前，请重试。');return true;}
      }
      return false;
    },
    resumeFrameClock(){lastTime=null;lastHudTime=-Infinity;fpsFrames=0;fpsSince=performance.now();observationOrbit.resumeClock();},
    updateUI(now){if(!predictionAllowed()||placementCamera)predictions.setDesired(null);else if(!game.isPaused()&&!document.hidden)predictions.pump(now);if(legacyHud)updateHud(now);trialUI?.update(now);drawShotControls();},
    frameActivity(now){
      const replay=game.replayStatus(), paused=game.isPaused();
      const moving=!paused && (game.isBusy() || (replay&&!replay.ended) || pocketReturn.activity().active>0 || cueMotion || remoteCueMotion.isAnimating() || (!game.getState().frameOver && shotCamera.diagnostics().phase!=='idle'));
      const scene=Boolean(aimYawMotion.isAnimating() || remoteAimCamera.isAnimating() || celebration?.playing || moving || aimIntro || clickAimAnimation || aimInertia || (cameraTransition&&(cameraTransition.manual||!paused)) || peekReturn || peekMotion.velocity || peekMotion.position!==(peekReturn?0:peekPx) || peekOffsets.correction || predictionDisplay.isAnimating() || (mode==='camera'&&observationOrbit.isAnimating()) || placementMoves.pending() || practiceBallDrag.pending() || liftAnimating || powerBarNeedsPaint);
      const ui=trialUI?.frameActivity(now)||{};
      const pending=predictions.diagnostics();
      return {scene,ui:ui.ui || placementHint?.isVisible(),wakeAt:Math.min(ui.wakeAt??Infinity,(!paused&&predictionAllowed()&&pending.pending&&!pending.inFlight)?now+33:Infinity)};
    },
    idleEffect:()=>placementHint?.mesh(),
    updateIdleEffect:()=>placementHint?.update(),
    startPresentation,
    prepareAudio:prepareEntryAudio,
    prepareOptionalAudio:()=>crowdSounds.prepare(),
    activateAudio,
    canAutoStartAudio:()=>window.threeGame.canAutoStartAudio(),
    prepareReplay:()=>trialUI?.isReplay()?trialUI.prepareReplay():true,
    resizeViewport,
    renderCamera:()=>replayTest?.isOpen()?replayTest.camera():camera,
    renderView:()=>trialUI?.isReplay()||game.isReplay()?replayView:mode,
    canSwitchTable(){return !game.isBusy() && !game.isReplay() && !replayTest?.isOpen();},
    switchTable(version){
      if (!game.setTestFieldBoundary(testFieldBoundaryIds?.[version])) return false;
      pocketReturn.reset();
      shadowPockets = getShadowPockets();
      pocketReturn = createPocketReturn({meshById,world,surfaceY,tableRoot,pockets:game.getState().tableColliderSet.pockets,
        calibration:window.tablePreviewReport.calibration,installLighting:false});
      useTableCueGeometry(version);
      cueLighting.bindTable(tableRoot.getObjectByName('tableCloth'));
      predictions.setDesired(null);predictionDisplay.set(null,performance.now());
      prediction=null;aimRevision=-1;drawAimDirty=true;aimPlane.visible=false;
      sceneDebug.tableChanged();
      syncMeshes();
      return true;
    },
    materialsChanged(){sceneDebug.update(true);},
    updateSceneDebug(){sceneDebug?.update();observationJoystick.update();placementHint?.update();},
    update(now) {
      // Give a released meter one paint before prediction/scene work resumes.
      // Keep lastTime unchanged so the next update accounts for elapsed time.
      if (powerBarNeedsPaint) { powerBarNeedsPaint = false; return; }
      const dt = lastTime === null ? 0 : Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      if(!document.hidden&&!game.isPaused())celebration?.update(dt);
      if (replayTest?.isOpen()) { replayTest.update(now); return; }
      if (!document.hidden && !game.isPaused()) cameraClock += dt * 1000;
      placementMoves.flush();
      syncOnlineView();
      updateObservationZoom();
      if(!game.isBusy() && mode==='aim')aimYawMotion.update(performance.now());
      else aimYawMotion.cancel();
      updateClickAim();
      debugPanel.update();

      shotParametersHUD?.update(now);
      if (!game.isBusy()) crowdTolerance.settled();
      crowdTolerance.update();
      if (!document.hidden) perf.measure('physicsMs', () => game.tick(dt, now));
      cueTrajectory?.update();
      syncOnlineView();
      perf.measure('sceneMs', () => {
        syncMeshes(document.hidden || game.isPaused() ? 0 : dt);
        if(!game.isReplay() || replayView==='aim')shotCamera.update(cameraClock,game.getState());
        if (aimInertia) {
          const frame = sampleAimInertia(aimInertia, performance.now());
          aimHeight = frame.height;
          if (frame.done) aimInertia = null;
        }
        if (peekReturn) {
          const elapsedMs = performance.now() - peekReturn.startedAt;
          if (peekReleaseTiming && peekReleaseTiming.firstFrameMs === null) {
            peekReleaseTiming.firstFrameMs = elapsedMs;
          }

        }
        peekMotion = stepPeekMotion(peekMotion, peekReturn ? 0 : peekPx, dt);
        if (peekReturn && peekMotion.position === 0 && peekMotion.velocity === 0) {
          peekPx = 0; peekReturn = null;
        }
        constrainObservation();
        if (mode === 'camera' && !cameraTransition) {
          const magnification = observationPeekMagnification();
          if (magnification !== peekMagnification) {
            applyPeekMagnification(magnification);
            camera.updateProjectionMatrix();
          }
        }
        updateAimIntro(); syncAimCamera(false, dt); updateCameraTransition(); syncCue(dt); cueLighting.update();
      });
      if (trialUI && mode === 'aim' && !cameraTransition?.manual) {
        trialUI.centerCamera(camera);const v=camera.view;
        if(aimZoomOffset.x||aimZoomOffset.y)camera.setViewOffset(innerWidth,innerHeight,v.offsetX+aimZoomOffset.x,v.offsetY+aimZoomOffset.y,innerWidth,innerHeight);
      }
      placementHint?.update();
      perf.measure('aimMs', () => updateAim(now));
      perf.measure('uiMs', () => { if(legacyHud)updateHud(now); trialUI?.update(now); drawShotControls(); });
      fpsFrames++;
      if (now - fpsSince > 1000) { fps = Math.round(fpsFrames * 1000 / (now - fpsSince)); fpsFrames = 0; fpsSince = now; if(trialFps)trialFps.textContent = window.SnookerProduct ? `FPS:${fps}` : `FPS：${fps}`; }
    },
  };
}
