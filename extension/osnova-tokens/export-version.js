globalThis.OsnovaExportVersion = {
  key({ origin, theme, profileId }) {
    return `osnova-tokens:export-version:${origin}:${profileId || theme}`;
  },
  next(previous) { return Number.isSafeInteger(previous) && previous >= 0 ? previous + 1 : 1; },
  filename(name, version) {
    const title = String(name).trim().slice(0, 80).replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-+|-+$/g, '') || 'theme';
    return `osnova-${title}-v${String(version).padStart(3, '0')}.css`;
  }
};
