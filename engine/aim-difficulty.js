export const AIM_DIFFICULTIES = [
  {id:'novice',label:'新手'}, {id:'intermediate',label:'进阶'},
  {id:'professional',label:'职业'}, {id:'master',label:'大师'},
  {id:'no-lines',label:'无线'},
];
// Legacy schemes become independent drafts, including the test-field-only no-lines profile; never persist while previewing.
export function createAimDraft(saved = {}, defaults = {}) {
  const activeDifficulty = AIM_DIFFICULTIES.some(d=>d.id===saved.activeDifficulty) ? saved.activeDifficulty : 'novice';
  const legacy = saved.difficultyProfiles ? {} : saved;
  const difficultyProfiles = Object.fromEntries(AIM_DIFFICULTIES.map(({id})=>
    [id, {...defaults,cueLineMode:id==='master'?'blur':'line',
      objectAntiSoftTouchEnabled:id==='master',...legacy,...saved.difficultyProfiles?.[id]}]));
  // Seed the new independent profile with the master's free Peek settings.
  if (!saved.difficultyProfiles?.['no-lines']) {
    for (const key of ['peekFreeMaxZoom','peekFreeLiftCm','peekFreeLowerCm','peekFreeForwardCm']) {
      if (key in difficultyProfiles.master) difficultyProfiles['no-lines'][key]=difficultyProfiles.master[key];
    }
  }
  return {difficultyVersion:1,activeDifficulty,difficultyProfiles};
}
export function activeAimValues(draft) { return draft.difficultyProfiles[draft.activeDifficulty]; }

export function viewAimEnabled(mode, values = {}) {
  const key = {camera:'observationAimEnabled',broadcast:'broadcastAimEnabled',god:'godAimEnabled'}[mode];
  return !key || values[key] !== false;
}

// Advanced difficulties retain only the physical cue outside first person.
export function hideViewAimHelpers(mode, difficulty, replay = false) {
  if (difficulty === 'no-lines') return true;
  // Broadcast and overhead replays never expose aiming guides, at any difficulty.
  if (replay && ['camera','broadcast','god'].includes(mode)) return true;
  return ['professional','master'].includes(difficulty)
    && ['camera','broadcast','god'].includes(mode);
}

export function viewAimAdjustmentEnabled(mode, difficulty) {
  return !(['professional','master'].includes(difficulty)
    && ['broadcast','god'].includes(mode));
}
