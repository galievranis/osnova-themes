function paintSwatch(element, theme, mode) {
  const tokens = { ...theme.grays, ...(theme.modes[mode] ?? Object.values(theme.modes)[0]) };
  function resolve(token, seen = new Set()) {
    if (seen.has(token)) return '';
    seen.add(token);
    const value = tokens[token] ?? '';
    const alias = value.match(/^var\(\s*(--[\w-]+)\s*\)$/);
    return alias ? resolve(alias[1], seen) : value;
  }
  element.style.setProperty('--swatch-header', resolve('--theme-color-brand-header'));
  element.style.setProperty('--swatch-accent', resolve('--theme-color-accent'));
}

async function loadShowcase() {
  const response = await fetch('themes.json');
  if (!response.ok) throw new Error('Не удалось загрузить темы.');
  const themes = await response.json();
  const picker = document.getElementById('theme-picker');
  const trigger = picker.querySelector('summary');
  const options = document.getElementById('theme-options');
  const modeSelect = document.getElementById('mode');
  const screenSelect = document.getElementById('screen');
  const frame = document.getElementById('preview');
  const params = new URLSearchParams(location.search);
  let selectedTheme = themes.find(theme => theme.id === params.get('theme')) ?? themes[0];
  if ([...screenSelect.options].some(option => option.value === params.get('screen'))) {
    screenSelect.value = params.get('screen');
  }

  function setMode(preferred) {
    const { modes } = selectedTheme;
    for (const option of modeSelect.options) option.disabled = !Object.hasOwn(modes, option.value);
    modeSelect.value = Object.hasOwn(modes, preferred) ? preferred : Object.keys(modes)[0];
  }

  function syncLink() {
    params.set('theme', selectedTheme.id);
    params.set('mode', modeSelect.value);
    params.set('screen', screenSelect.value);
    history.replaceState(null, '', `?${params}`);
  }

  function applyTheme() {
    const doc = frame.contentDocument;
    if (!doc?.head || !doc.body) return;
    const { grays, modes } = selectedTheme;
    const tokens = modes[modeSelect.value];
    doc.documentElement.dataset.colorMode = modeSelect.value;
    if (doc.documentElement.hasAttribute('data-preview-archive')) {
      doc.documentElement.dataset.theme = modeSelect.value;
    }
    doc.documentElement.toggleAttribute('data-showcase-bright-buttons',
      Object.hasOwn(tokens, '--theme-color-button-accent'));
    doc.documentElement.toggleAttribute('data-showcase-tinted-icons',
      Object.hasOwn(tokens, '--theme-color-header-icon'));
    let style = doc.getElementById('showcase-theme');
    if (!style) {
      style = doc.createElement('style');
      style.id = 'showcase-theme';
      doc.head.append(style);
    }
    const declarations = Object.entries({ ...grays, ...tokens })
      .map(([key, value]) => `${key}: ${value};`).join('\n');
    style.textContent = `:root:root { color-scheme: ${modeSelect.value};\n${declarations}\n}`;
  }

  function closePicker(restoreFocus = false) {
    picker.open = false;
    if (restoreFocus) trigger.focus();
  }

  const groups = new Map();
  for (const theme of themes) {
    if (!groups.has(theme.group)) {
      const group = document.createElement('li');
      const title = document.createElement('span');
      const list = document.createElement('ul');
      title.id = `theme-group-${groups.size}`;
      title.className = 'theme-group-label';
      title.textContent = theme.group;
      list.setAttribute('aria-labelledby', title.id);
      group.append(title, list);
      options.append(group);
      groups.set(theme.group, { list, rows: [] });
    }
    const row = document.createElement('li');
    const button = document.createElement('button');
    const swatch = document.createElement('span');
    button.type = 'button';
    swatch.className = 'theme-swatch';
    swatch.setAttribute('aria-hidden', 'true');
    button.append(swatch, theme.name);
    button.addEventListener('click', () => {
      selectedTheme = theme;
      setMode(modeSelect.value);
      updatePicker();
      closePicker(true);
      applyTheme();
      syncLink();
    });
    row.append(button);
    const group = groups.get(theme.group);
    group.list.append(row);
    group.rows.push({ theme, button, swatch });
  }
  const rows = [...groups.values()].flatMap(group => group.rows);

  function updatePicker() {
    document.getElementById('theme-name').textContent = selectedTheme.name;
    paintSwatch(document.getElementById('theme-swatch'), selectedTheme, modeSelect.value);
    for (const { theme, button, swatch } of rows) {
      button.toggleAttribute('data-selected', theme === selectedTheme);
      button.setAttribute('aria-current', String(theme === selectedTheme));
      paintSwatch(swatch, theme, modeSelect.value);
    }
  }

  picker.addEventListener('toggle', () => {
    if (picker.open) rows.find(row => row.theme === selectedTheme).button.focus();
  });
  picker.addEventListener('focusout', event => {
    if (event.relatedTarget && !picker.contains(event.relatedTarget)) closePicker();
  });
  document.addEventListener('pointerdown', event => {
    if (!picker.contains(event.target)) closePicker();
  });
  picker.addEventListener('keydown', event => {
    if (!picker.open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closePicker(true);
      return;
    }
    const index = rows.findIndex(row => row.button === event.target);
    if (index < 0) return;
    const targets = { ArrowUp: index - 1, ArrowDown: index + 1, Home: 0, End: rows.length - 1 };
    if (!Object.hasOwn(targets, event.key)) return;
    event.preventDefault();
    rows[Math.max(0, Math.min(rows.length - 1, targets[event.key]))].button.focus();
  });

  frame.addEventListener('load', () => {
    const loaded = frame.contentDocument?.location.pathname.split('/').pop();
    const screen = [...screenSelect.options].find(option => `${option.value}.html` === loaded);
    if (screen) screenSelect.value = screen.value;
    applyTheme();
    syncLink();
    frame.contentDocument?.addEventListener('pointerdown', () => closePicker());
  });
  modeSelect.addEventListener('change', () => {
    updatePicker();
    applyTheme();
    syncLink();
  });
  screenSelect.addEventListener('change', () => {
    frame.src = `${screenSelect.value}.html`;
    syncLink();
  });

  setMode(params.get('mode'));
  updatePicker();
  syncLink();
  frame.src = `${screenSelect.value}.html`;
  frame.hidden = false;
  picker.hidden = false;
  for (const select of [modeSelect, screenSelect]) select.disabled = false;
}

const status = document.getElementById('status');
loadShowcase()
  .then(() => { status.hidden = true; })
  .catch(() => { status.textContent = 'Не удалось загрузить витрину тем.'; });
