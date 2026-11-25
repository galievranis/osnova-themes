globalThis.OsnovaPresets = {
  async ensure(storage, origin, getURL) {
    if (origin !== 'https://themes-gta.dtf.osnova.app') throw new Error('Неизвестный стейдж');
    const libraryKey = `osnova-tokens:library:${origin}`;
    const stored = await storage.get(libraryKey);
    const library = { active: null, profiles: [], ...stored[libraryKey] };
    const updates = {};
    let changed = false;
    for (const profile of library.profiles) {
      if (profile.name === 'Моя тема' && profile.base !== 'classic') { profile.base = 'classic'; changed = true; }
    }
    for (const preset of OsnovaPresetPalettes) {
      const key = `osnova-tokens:v1:${origin}:${preset.id}`;
      const existing = await storage.get(key);
      const migratePalette = ['preset-dtf', 'preset-games'].includes(preset.id) && (existing[key]?.presetRevision || 0) < preset.revision;
      if (!existing[key] || migratePalette) {
        const palettes = {};
        for (const mode of ['light', 'dark']) palettes[mode] = Object.fromEntries(Object.entries(preset[mode]).map(([name, value]) =>
          [name, value.startsWith('@pattern:') ? `url("${getURL(`patterns/${value.slice(9)}.svg`)}")` : value]));
        const patternUI = { ...existing[key]?.patternUI };
        for (const mode of ['light', 'dark']) {
          if (existing[key]?.presetRevision >= 2 && preset.migrateModes && !preset.migrateModes.includes(mode)) {
            palettes[mode] = existing[key][mode];
          } else delete patternUI[mode];
        }
        updates[key] = { ...existing[key], ...palettes, enabled: existing[key]?.enabled !== false, patternUI, presetRevision: preset.revision };
      }
      if (!library.profiles.some(item => item.id === preset.id)) {
        library.profiles.push({ id: preset.id, name: preset.name, base: preset.base });
        changed = true;
      }
    }
    if (changed) updates[libraryKey] = library;
    if (Object.keys(updates).length) await storage.set(updates);
    return { installed: OsnovaPresetPalettes.map(item => item.name) };
  }
};
