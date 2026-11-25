/* Shared by the isolated content script and the extension panel. */
globalThis.OsnovaTokens = {
  key(origin, theme) { return `osnova-tokens:v1:${origin}:${theme}`; },
  diff(base, edits) {
    return Object.fromEntries(Object.entries(edits || {}).filter(([name, value]) =>
      Object.hasOwn(base, name) && value.trim() !== base[name].trim()));
  },
  validate(name, value) {
    if (name === '--theme-image-pattern' && typeof value === 'string' && (/^url\("data:image\/(?:svg\+xml|png|jpeg|webp);base64,[A-Za-z0-9+/=]+"\)$/.test(value) || /^url\("chrome-extension:\/\/[a-p]{32}\/patterns\/(?:gta|games|dtf)\.svg"\)$/.test(value))) return value.length < 3000000;
    return /^--[a-zA-Z0-9_-]+$/.test(name) && typeof value === 'string' &&
      value.trim().length > 0 && !/[;{}<>]/.test(value) &&
      !/url\s*\(|@import|\/\*/i.test(value) && value.length <= 4000;
  },
  css(theme, changes) {
    if (!/^[\w-]+$/.test(theme)) throw new Error('Некорректное имя темы');
    return ['light', 'dark'].map(mode => {
      const entries = Object.entries(changes[mode] || {});
      if (!entries.length) return '';
      return `:root[data-theme="${theme}"][data-color-mode="${mode}"] {\n` +
        entries.map(([name, value]) => {
          if (!this.validate(name, value)) throw new Error(`Некорректное значение ${name}`);
          return `  ${name}: ${value};`;
        }).join('\n') + '\n}';
    }).filter(Boolean).join('\n\n') + '\n';
  }
};
