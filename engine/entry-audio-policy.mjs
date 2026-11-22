export function essentialEntryAudio(entries, banks, assetUrl) {
  const sources = new Set(Object.values(banks).flat());
  return entries.filter(entry => sources.has(assetUrl(entry.source)));
}

export function commonAnnouncements(entries, mode) {
  const prefix = `assets/audio/announcements/${mode}/`;
  return entries.filter(entry => entry.source.startsWith(prefix) &&
    /\/(?:score\/00[1-8]|rule\/foul)\.mp3$/.test(entry.source));
}
