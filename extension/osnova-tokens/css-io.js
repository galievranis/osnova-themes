/* Import only palette declarations. Imported stylesheets are never attached to the page. */
globalThis.OsnovaCSS = {
  export(data) {
    const header = ['/* Osnova Tokens v1', `origin: ${encodeURIComponent(data.origin)}`, `base: ${data.theme}`, `name: ${encodeURIComponent(data.profileName || '')}`, ...(data.exportVersion ? [`export-revision: ${data.exportVersion}`] : []), '*/'].join('\n');
    const colors = data.browserColors || {};
    const meta = ['light', 'dark'].filter(mode => /^#[A-Fa-f0-9]{6}$/.test(colors[mode] || '')).map(mode =>
      `<meta name="theme-color" content="${colors[mode]}" media="(prefers-color-scheme: ${mode})">`);
    const browser = meta.length ? '\n\n/* Browser toolbar / Safari (HTML integration)\n' +
      'Source: top-center sample of the header gradient over its background (average of 5 x 3 pixels).\n' +
      'Copy these tags into <head>; CSS alone does not apply them.\n' +
      'If the app overrides the system color mode, update theme-color when its mode changes.\n' +
      'Actual toolbar tint depends on the Safari version and browser settings.\n' + meta.join('\n') + '\n*/\n' : '';
    return header + '\n\n' + OsnovaTokens.css(data.theme, data.changes) + browser;
  },
  import(source, origin) {
    if (typeof source !== 'string' || source.length > 8000000) throw new Error('Некорректный или слишком большой CSS');
    let theme = null, profileName = null, fileOrigin = origin;
    const metadata = source.match(/\/\* Osnova Tokens v1\r?\n([\s\S]*?)\*\//);
    if (metadata) {
      const fields = Object.fromEntries(metadata[1].trim().split(/\r?\n/).map(line => {
        const colon = line.indexOf(':');
        if (colon < 0) throw new Error('Повреждено описание темы в CSS');
        return [line.slice(0, colon).trim(), line.slice(colon + 1).trim()];
      }));
      try { fileOrigin = decodeURIComponent(fields.origin || ''); profileName = decodeURIComponent(fields.name || '') || null; }
      catch { throw new Error('Повреждено описание темы в CSS'); }
      theme = fields.base;
      if (fileOrigin !== origin) throw new Error('CSS относится к другому стейджу');
      if (!/^[\w-]+$/.test(theme)) throw new Error('В CSS не указана базовая тема');
    }
    // Comments contain no data needed for declarations; base64 image URLs contain no comments.
    const text = source.replace(/\/\*[\s\S]*?\*\//g, '').trim();
    const changes = { light: {}, dark: {} };
    let position = 0;
    let count = 0;
    while (position < text.length) {
      while (/\s/.test(text[position] || '') && position < text.length) position++;
      if (position >= text.length) break;
      const open = text.indexOf('{', position);
      if (open < 0) throw new Error('Ожидался блок CSS-палитры');
      const selector = text.slice(position, open).trim();
      const match = selector.match(/^:root\[data-theme=(?:"([\w-]+)"|'([\w-]+)'|([\w-]+))\]\[data-color-mode=(?:"(light|dark)"|'(light|dark)'|(light|dark))\]$/);
      if (!match) throw new Error('CSS должен содержать только токены :root с темой и светлым/тёмным режимом');
      const ruleTheme = match[1] || match[2] || match[3];
      const mode = match[4] || match[5] || match[6];
      if (theme && theme !== ruleTheme) throw new Error('В одном CSS должны быть палитры одной темы');
      theme = ruleTheme;
      let quote = null, depth = 0, escaped = false, end = open + 1, start = end;
      function declaration(part) {
        if (!part.trim()) return;
        const colon = part.indexOf(':');
        if (colon < 0) throw new Error('Неверная запись CSS-токена');
        const name = part.slice(0, colon).trim();
        const value = part.slice(colon + 1).trim().replace(/\s*!important\s*$/i, '').trim();
        if (!OsnovaTokens.validate(name, value)) throw new Error(`Нельзя импортировать ${name}: ожидается значение существующего токена`);
        changes[mode][name] = value;
      }
      for (; end < text.length; end++) {
        const char = text[end];
        if (escaped) { escaped = false; continue; }
        if (quote) {
          if (char === '\\') escaped = true;
          else if (char === quote) quote = null;
          continue;
        }
        if (char === '"' || char === "'") { quote = char; continue; }
        if (char === '(') depth++;
        else if (char === ')') { if (--depth < 0) throw new Error('Несбалансированные скобки в CSS'); }
        else if (char === '{') throw new Error('Вложенные CSS-правила не поддерживаются');
        else if (char === ';' && depth === 0) { declaration(text.slice(start, end)); start = end + 1; }
        else if (char === '}' && depth === 0) break;
      }
      if (end === text.length || quote || depth) throw new Error('Незавершённый CSS-блок');
      declaration(text.slice(start, end));
      position = end + 1;
      count++;
    }
    if (!theme || (!metadata && !count)) throw new Error('В файле нет палитры темы');
    return { version: 1, origin: fileOrigin, theme, profileName, changes };
  }
};
