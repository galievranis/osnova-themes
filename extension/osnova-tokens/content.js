(() => {
  const api = OsnovaTokens;
  const root = document.documentElement;
  const sheet = document.createElement('style');
  sheet.dataset.osnovaTokenOverrides = '';
  document.head.append(sheet);
  let store = { light: {}, dark: {}, enabled: true };
  let baseline = { light: {}, dark: {} };
  let raw = { light: {}, dark: {} };
  let names = [];
  let blocked = [];
  let theme = '';
  const libraryKey = `osnova-tokens:library:${location.origin}`;
  let library = { active: null, profiles: [] };
  let profileId = null;
  let inspection = null;
  let inspecting = false;
  let inspectedElement = null;
  let overlay = null;
  const storageKey = () => api.key(location.origin, profileId || theme);
  const profile = () => library.profiles.find(item => item.id === profileId);

  let ready = Promise.resolve();
  let serial = Promise.resolve();
  let scanTimer;

  function rules() {
    const list = [];
    blocked = [];
    const visited = new Set();
    function walk(stylesheet) {
      if (visited.has(stylesheet) || stylesheet === sheet.sheet || stylesheet.disabled) return;
      visited.add(stylesheet);
      let entries;
      try { entries = stylesheet.cssRules; }
      catch { blocked.push(stylesheet.href || 'Недоступная таблица стилей'); return; }
      function descend(items, active = true) {
        for (const rule of items) {
          if (rule.styleSheet) walk(rule.styleSheet);
          if (rule.style && rule.selectorText) list.push({ rule, active });
          if (rule.cssRules) {
            let applies = active;
            if (rule.type === CSSRule.MEDIA_RULE) applies &&= matchMedia(rule.conditionText).matches;
            if (rule.type === CSSRule.SUPPORTS_RULE) applies &&= CSS.supports(rule.conditionText);
            descend(rule.cssRules, applies);
          }
        }
      }
      descend(entries);
    }
    for (const item of document.styleSheets) walk(item);
    for (const item of document.adoptedStyleSheets || []) walk(item);
    return list;
  }

  function scan() {
    const entries = rules();
    const found = new Set();
    for (const { rule } of entries) for (const name of rule.style) if (name.startsWith('--')) found.add(name);
    for (const name of root.style) if (name.startsWith('--')) found.add(name);
    const previous = root.getAttribute('data-color-mode');
    sheet.disabled = true;
    try {
      for (const mode of ['light', 'dark']) {
        root.setAttribute('data-color-mode', mode);
        const computed = getComputedStyle(root);
        for (const name of computed) if (name.startsWith('--')) found.add(name);
        baseline[mode] = {};
        raw[mode] = {};
        for (const { rule, active } of entries) {
          if (!active) continue;
          let matches = false;
          try { matches = root.matches(rule.selectorText); } catch { /* pseudo-elements */ }
          if (!matches) continue;
          for (const name of rule.style) if (name.startsWith('--')) raw[mode][name] = rule.style.getPropertyValue(name).trim();
        }
        for (const name of found) {
          const value = computed.getPropertyValue(name).trim();
          if (value) baseline[mode][name] = value;
        }
        for (const name of root.style) if (name.startsWith('--')) raw[mode][name] = root.style.getPropertyValue(name).trim();
      }
    } finally {
      if (previous === null) root.removeAttribute('data-color-mode');
      else root.setAttribute('data-color-mode', previous);
      sheet.disabled = false;
    }
    names = [...found].sort();
    apply();
  }

  function apply() {
    sheet.textContent = store.enabled === false ? '' : ['light', 'dark'].map(mode => {
      // Repeating :root raises specificity over the site's palette selectors.
      const body = Object.entries(store[mode] || {}).filter(([name, value]) => Object.hasOwn(baseline[mode], name) && api.validate(name, value))
        .map(([name, value]) => `${name}:${value} !important;`).join('');
      return `:root:root:root[data-theme="${theme}"][data-color-mode="${mode}"]{${body}}`;
    }).join('\n');
  }

  async function loadTheme(initial = false) {
    if (initial) {
      const result = await chrome.runtime.sendMessage({ target: 'osnova-presets', origin: location.origin });
      if (!result?.ok) throw new Error(result?.error || 'Не удалось загрузить сохранённые темы');
    }
    const data = await chrome.storage.local.get(libraryKey);
    library = { active: null, profiles: [], ...data[libraryKey] };
    const selected = library.profiles.find(item => item.id === library.active);
    if (selected) root.setAttribute('data-theme', selected.base);
    theme = root.dataset.theme || 'classic';
    profileId = selected?.base === theme ? selected.id : null;
    const saved = await chrome.storage.local.get(storageKey());
    store = { light: {}, dark: {}, enabled: true, ...saved[storageKey()] };
    scan();
  }

  function collectElement(element) {
    const entries = rules();
    const found = new Set();
    const details = [];
    const refs = value => [...value.matchAll(/var\(\s*(--[\w-]+)/g)].map(match => match[1]);
    const definitions = { ...raw[root.dataset.colorMode === 'dark' ? 'dark' : 'light'] };
    const ancestors = [];
    for (let node = element; node && node !== root; node = node.parentElement) ancestors.unshift(node);
    // Build the inherited custom-property declarations before tracing aliases.
    for (const node of ancestors) {
      for (const { rule, active } of entries) {
        if (!active) continue;
        let matches = false;
        try { matches = node.matches(rule.selectorText); } catch {}
        if (matches) for (const name of rule.style) if (name.startsWith('--')) definitions[name] = rule.style.getPropertyValue(name);
      }
      for (const name of node.style) if (name.startsWith('--')) definitions[name] = node.style.getPropertyValue(name);
    }
    function collect(style, source, depth) {
      for (const prop of style) {
        if (prop.startsWith('--')) continue;
        // Ancestor backgrounds and inherited text colors explain the visible surface.
        if (depth > 4 && !/^(color|fill|stroke|font)/.test(prop)) continue;
        if (depth && !/^(color|fill|stroke|font|background|border|box-shadow|opacity)/.test(prop)) continue;
        const tokens = refs(style.getPropertyValue(prop));
        if (tokens.length) {
          tokens.forEach(name => found.add(name));
          details.push({ property: prop, tokens, source });
        }
      }
    }
    const control = element.closest('label,button,[role=button],.radio,.checkbox') || element;
    for (const child of [control, ...control.querySelectorAll('*')].slice(0, 35)) {
      for (const { rule, active } of entries) {
        if (!active) continue;
        let matches = false;
        try { matches = child.matches(rule.selectorText.replace(/::?(?:before|after)/g, '')); } catch {}
        if (matches) { collect(rule.style, rule.selectorText, 0); for (const name of rule.style) if (name.startsWith('--')) definitions[name] = rule.style.getPropertyValue(name); }
      }
      collect(child.style, 'style', 0);
    }
    let depth = 0;
    for (let node = element; node;  node = node.parentElement, depth++) {
      for (const { rule, active } of entries) {
        if (!active) continue;
        let matches = false;
        try { matches = node.matches(rule.selectorText.replace(/::?(?:before|after)/g, '')); } catch {}
        if (matches) collect(rule.style, rule.selectorText, depth);
      }
      collect(node.style, 'style', depth);
    }
    const visit = name => {
      for (const ref of refs(definitions[name] || '')) if (!found.has(ref)) { found.add(ref); visit(ref); }
    };
    [...found].forEach(visit);
    return { label: element.tagName.toLowerCase() + (element.id ? `#${element.id}` : '') + [...element.classList].slice(0, 2).map(name => `.${name}`).join(''), tokens: [...found].sort(), details };
  }

  function stopInspect() {
    inspecting = false;
    overlay?.remove(); overlay = null;
    window.removeEventListener('pointermove', hover, true);
    window.removeEventListener('pointerdown', suppress, true);
    window.removeEventListener('click', selectElement, true);
    window.removeEventListener('keydown', escapeInspect, true);
  }
  function suppress(event) { event.preventDefault(); event.stopImmediatePropagation(); }
  function hover(event) {
    if (!overlay) return;
    const box = event.target.getBoundingClientRect();
    Object.assign(overlay.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px` });
  }
  function selectElement(event) {
    suppress(event);
    inspectedElement = event.target;
    inspection = collectElement(event.target);
    stopInspect();
  }
  function escapeInspect(event) { if (event.key === 'Escape') { suppress(event); stopInspect(); } }
  function startInspect() {
    stopInspect(); inspecting = true;
    overlay = document.createElement('div');
    overlay.setAttribute('data-osnova-inspector', '');
    overlay.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;border:2px solid #4389ff;background:#4389ff18;border-radius:3px;box-sizing:border-box';
    root.append(overlay);
    window.addEventListener('pointermove', hover, true);
    window.addEventListener('pointerdown', suppress, true);
    window.addEventListener('click', selectElement, true);
    window.addEventListener('keydown', escapeInspect, true);
  }

  function browserColors() {
    const previousMode = root.getAttribute('data-color-mode');
    const previousEnabled = store.enabled;
    const colors = {};
    // Export the edited palette even when its preview is temporarily disabled.
    try {
      store.enabled = true;
      apply();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const parseColor = value => {
        const direct = OsnovaColor.parse(value || '');
        if (direct) return direct;
        if (!value || !CSS.supports('color', value)) return null;
        ctx.fillStyle = '#010203'; ctx.fillStyle = value;
        return OsnovaColor.parse(ctx.fillStyle);
      };
      const headerElement = document.querySelector('.header') || document.querySelector('.site-header') || document.querySelector('header');
      const bounds = headerElement?.getBoundingClientRect();
      const width = bounds?.width || root.clientWidth;
      const height = bounds?.height || 60;
      for (const mode of ['light', 'dark']) {
        root.setAttribute('data-color-mode', mode);
        const computed = getComputedStyle(root);
        const header = computed.getPropertyValue('--theme-color-brand-header').trim();
        if (!header || !CSS.supports('color', header)) continue;
        const background = computed.getPropertyValue('--theme-color-background').trim();
        const gradient = computed.getPropertyValue('--theme-gradient-brand-header').trim();
        const opaque = OsnovaHeaderColor.over(parseColor(background) || { r: 0, g: 0, b: 0, a: 0 },
          parseColor(mode === 'light' ? '#ffffff' : '#000000'));
        colors[mode] = OsnovaHeaderColor.sample({ gradient, fill: header, background: OsnovaColor.rgba(opaque), width, height, parseColor });
      }
    } finally {
      if (previousMode === null) root.removeAttribute('data-color-mode');
      else root.setAttribute('data-color-mode', previousMode);
      store.enabled = previousEnabled;
      apply();
    }
    return colors;
  }

  function snapshot() {
    const mode = root.dataset.colorMode === 'dark' ? 'dark' : 'light';
    const computed = getComputedStyle(root);
    return {
      origin: location.origin, theme, mode, names, baseline, raw, blocked,
      profileId, profileName: profile()?.name || null, profiles: library.profiles, inspecting, inspection,
      edits: { light: store.light, dark: store.dark }, patternUI: store.patternUI || {}, enabled: store.enabled !== false,
      effective: Object.fromEntries(names.map(name => [name, computed.getPropertyValue(name).trim()]))
    };
  }

  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (message?.target !== 'osnova-tokens') return;
    serial = serial.catch(() => {}).then(async () => {
      await ready;
      if (theme !== (root.dataset.theme || 'classic')) await loadTheme();
      if (message.expected && (message.expected.theme !== theme || message.expected.profileId !== profileId)) throw new Error('Тема изменилась — откройте редактор цвета заново');
      if (message.type === 'create-profile') {
        const name = String(message.name || '').trim().slice(0, 80);
        if (!name) throw new Error('Введите название темы');
        const id = `custom-${crypto.randomUUID()}`;
        library.profiles.push({ id, name, base: 'classic' });
        library.active = profileId = id;
        await chrome.storage.local.set({ [libraryKey]: library, [storageKey()]: { light: {}, dark: {}, enabled: true, patternUI: {} } });
        root.setAttribute('data-theme', 'classic');
        await loadTheme();
      } else if (message.type === 'select-profile') {
        const selected = library.profiles.find(item => item.id === message.id);
        if (message.id && !selected) throw new Error('Тема не найдена');
        library.active = selected?.id || null;
        await chrome.storage.local.set({ [libraryKey]: library });
        if (selected) root.setAttribute('data-theme', selected.base);
        await loadTheme();
      } else if (message.type === 'rename-profile') {
        if (!profile()) throw new Error('Переименовать можно свою тему');
        const name = String(message.name || '').trim().slice(0, 80);
        if (!name) throw new Error('Введите название темы');
        profile().name = name;
        await chrome.storage.local.set({ [libraryKey]: library });
      } else if (message.type === 'inspect') startInspect();
      else if (message.type === 'clear-inspection') { stopInspect(); inspection = null; inspectedElement = null; }
      else if (message.type === 'set-mode') {
        if (!['light', 'dark'].includes(message.mode)) throw new Error('Неизвестная схема');
        root.setAttribute('data-color-mode', message.mode);
        if (inspectedElement?.isConnected) inspection = collectElement(inspectedElement);
      } else if (message.type === 'set-many') {
        if (!['light', 'dark'].includes(message.mode)) throw new Error('Неизвестная схема');
        for (const [name, value] of Object.entries(message.values || {})) {
          if (!Object.hasOwn(baseline[message.mode], name) || !api.validate(name, value)) throw new Error(`Некорректный токен ${name}`);
        }
        if (message.patternUI) {
          const ui = message.patternUI;
          if (typeof ui.enabled !== 'boolean' || !/^#[a-f\d]{6}$/i.test(ui.first) || !/^#[a-f\d]{6}$/i.test(ui.second) ||
              ui.css !== message.values['--theme-gradient-pattern'] || !api.validate('--theme-gradient-pattern', ui.gradient)) throw new Error('Некорректные настройки градиента');
          store.patternUI = { ...store.patternUI, [message.mode]: { ...ui } };
        }
        Object.assign(store[message.mode], message.values);
      } else if (message.type === 'set') {
        const { mode, name, value } = message;
        if (!['light', 'dark'].includes(mode) || !Object.hasOwn(baseline[mode], name)) throw new Error('Токен недоступен на корневом элементе');
        if (value === null) {
          delete store[mode][name];
          if (name === '--theme-gradient-pattern' && store.patternUI) delete store.patternUI[mode];
        }
        else {
          if (!api.validate(name, value)) throw new Error('Введите CSS-значение без url(), ; и скобок {}');
          // A variable reference identical to the declared original is also a reset.
          if (value.trim() === baseline[mode][name] || value.trim() === raw[mode][name]) delete store[mode][name];
          else store[mode][name] = value.trim();
        }
      } else if (message.type === 'reset') {
        store.light = {}; store.dark = {}; store.patternUI = {};
      } else if (message.type === 'enabled') store.enabled = Boolean(message.value);
      else if (message.type === 'rescan') scan();
      else if (message.type === 'import') {
        const data = message.data;
        if (data?.version !== 1 || data.theme !== theme || data.origin !== location.origin) throw new Error('Файл относится к другому стейджу или теме');
        const next = { light: {}, dark: {} };
        for (const mode of ['light', 'dark']) {
          if (!data.changes?.[mode] || typeof data.changes[mode] !== 'object' || Array.isArray(data.changes[mode])) throw new Error('Неверный формат палитры');
          for (const [name, value] of Object.entries(data.changes[mode])) {
            if (!Object.hasOwn(baseline[mode], name) || !api.validate(name, value)) throw new Error(`Нельзя импортировать ${name}`);
            next[mode][name] = value;
          }
        }
        if (data.profileName) {
          const id = `custom-${crypto.randomUUID()}`;
          library.profiles.push({ id, name: String(data.profileName).slice(0, 80), base: theme });
          library.active = profileId = id;
        }
        store = { ...store, ...next, patternUI: {} };
      }
      if (['set', 'set-many', 'reset', 'enabled', 'import'].includes(message.type)) {
        await chrome.storage.local.set({ [storageKey()]: store, ...(message.type === 'import' ? { [libraryKey]: library } : {}) });
        apply();
      }
      return { ...snapshot(), ...(message.type === 'export-info' ? { browserColors: browserColors() } : {}), ...(message.type === 'audit-contrast' ? { contrastAudit: OsnovaContrast.audit() } : {}) };
    });
    serial.then(data => respond({ ok: true, data }), error => respond({ ok: false, error: error.message }));
    return true;
  });

  new MutationObserver(() => {
    if (theme !== (root.dataset.theme || 'classic')) ready = ready.then(loadTheme);
  }).observe(root, { attributes: true, attributeFilter: ['data-theme', 'data-color-mode'] });
  // Lazy-loaded CSS can introduce tokens as the user navigates through the SPA.
  new MutationObserver(records => {
    if (records.some(record => [...record.addedNodes].some(node => node.nodeType === 1 &&
      (node.matches('style,link[rel="stylesheet"]') || node.querySelector('style,link[rel="stylesheet"]'))))) {
      clearTimeout(scanTimer);
      scanTimer = setTimeout(() => { ready = ready.then(() => { scan(); }); }, 300);
    }
  }).observe(document.head, { childList: true, subtree: true });
  document.addEventListener('load', event => {
    if (event.target.matches?.('link[rel="stylesheet"]')) ready = ready.then(() => { scan(); });
  }, true);
  chrome.storage.onChanged.addListener((changes, area) => {
    const change = changes[storageKey()];
    if (area === 'local' && change) {
      store = { light: {}, dark: {}, enabled: true, ...change.newValue };
      apply();
    }
  });
  ready = loadTheme(true);
})();
