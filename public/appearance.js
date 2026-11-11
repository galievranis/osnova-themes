(async () => {
  async function load(file) {
    const response = await fetch(file);
    if (!response.ok) throw new Error(`Не удалось загрузить ${file}`);
    return response;
  }

  const cards = [...document.querySelectorAll('[data-appearance-theme]')];
  const grid = document.getElementById('appearance-theme-grid');
  const viewSwitcher = document.getElementById('appearance-view-switcher');
  const viewTabs = [...viewSwitcher.querySelectorAll('button')];
  const radios = [...document.querySelectorAll('input[name="color-mode"]')];
  const [catalog, extraThemes, source] = await Promise.all([
    load('themes.json').then(response => response.json()),
    load('appearance-themes.json').then(response => response.json()),
    load('theme-preview.svg').then(response => response.text()),
  ]);
  const template = new DOMParser().parseFromString(source, 'image/svg+xml').documentElement;
  const themes = new Map([...catalog, ...extraThemes].map(theme => [theme.id, theme]));
  const systemMode = matchMedia('(prefers-color-scheme: dark)');
  const storageKey = 'osnova-appearance-preview';
  let preferences;
  try {
    preferences = JSON.parse(localStorage.getItem(storageKey));
  } catch {
    preferences = null;
  }

  const colorMode = () => selectedMode === 'auto' ? (systemMode.matches ? 'dark' : 'light') : selectedMode;

  let selectedTheme = cards.some(card => card.dataset.appearanceTheme === preferences?.theme)
    ? preferences.theme : 'classic';
  let selectedMode = radios.some(radio => radio.value === preferences?.mode)
    ? preferences.mode : 'light';

  let compactView = preferences?.compactView === true;

  const themeStyle = document.createElement('style');
  document.head.append(themeStyle);

  const patternedThemes = { gaming: 'gaming.svg', cats: 'cats.svg', filippovost: 'premium.svg' };

  function addArtworkPattern(svg, image) {
    const backdrop = svg.querySelector('path[data-token="--theme-color-background"]');
    const pattern = backdrop.cloneNode();
    pattern.removeAttribute('data-token');
    pattern.classList.add('appearance-backdrop-pattern');
    pattern.style.setProperty('--appearance-pattern-image', `url('./${image}')`);
    backdrop.after(pattern);
  }

  function makeArtwork(themeId) {
    const svg = document.importNode(template, true);
    const references = new Map();
    for (const node of svg.querySelectorAll('[id]')) {
      const id = node.id;
      node.id = `appearance-${themeId}-${id}`;
      references.set(`url(#${id})`, `url(#${node.id})`);
    }
    for (const node of svg.querySelectorAll('[clip-path], [mask]')) {
      for (const property of ['clip-path', 'mask']) {
        const reference = references.get(node.getAttribute(property));
        if (reference) node.setAttribute(property, reference);
      }
    }
    for (const node of svg.querySelectorAll('[data-token]')) {
      node.setAttribute(node.dataset.paint || 'fill', `var(${node.dataset.token})`);
    }
    const logo = svg.querySelector('path[data-token="--theme-color-text-primary"]');
    logo?.setAttribute('fill', 'var(--theme-color-header-icon, var(--theme-color-text-primary))');
    if (Object.hasOwn(patternedThemes, themeId)) addArtworkPattern(svg, patternedThemes[themeId]);
    svg.classList.add('appearance-artwork');
    svg.setAttribute('preserveAspectRatio', 'xMinYMin slice');
    return svg;
  }

  const previews = cards.map(card => {
    const id = card.dataset.appearanceTheme;
    const svg = makeArtwork(id);
    card.querySelector('.mADoi96g').replaceChildren(svg);
    const swatch = document.createElement('span');
    swatch.className = 'appearance-swatch';
    swatch.setAttribute('aria-hidden', 'true');
    card.prepend(swatch);
    card.addEventListener('click', () => {
      selectedTheme = id;
      save();
    });
    return { id, card, svg, swatch };
  });

  function declarations(themeId, mode) {
    const { grays, modes } = themes.get(themeId);
    const tokens = {
      '--theme-color-header-icon': 'var(--theme-color-text-primary)',
      ...grays,
      ...modes[mode],
    };
    return Object.entries(tokens)
      .map(([token, value]) => `${token}: ${value};`).join('\n');
  }

  function apply() {
    const mode = colorMode();
    const root = document.documentElement;
    root.dataset.colorMode = mode;
    const pattern = Object.hasOwn(patternedThemes, selectedTheme) ? patternedThemes[selectedTheme] : null;
    root.toggleAttribute('data-appearance-pattern', Boolean(pattern));
    if (pattern) root.style.setProperty('--appearance-pattern-image', `url('./${pattern}')`);
    else root.style.removeProperty('--appearance-pattern-image');
    root.dataset.theme = selectedTheme === 'contrast' ? 'contrast' : 'classic';
    themeStyle.textContent = `:root[data-appearance][data-color-mode] { color-scheme: ${mode};\n${declarations(selectedTheme, mode)}\n}`;

    grid.toggleAttribute('data-compact', compactView);
    for (const tab of viewTabs) {
      tab.setAttribute('aria-pressed', String((tab.dataset.appearanceView === 'compact') === compactView));
    }

    for (const { id, card, svg, swatch } of previews) {
      const selected = id === selectedTheme;
      card.classList.toggle('zvEjzVpg', selected);
      card.setAttribute('aria-pressed', String(selected));
      const palette = declarations(id, mode);
      svg.style.cssText = palette;
      swatch.style.cssText = palette;
    }

    for (const radio of radios) {
      radio.checked = radio.value === selectedMode;
      radio.closest('.radio').classList.toggle('radio--checked', radio.checked);
    }
  }

  function save() {
    apply();
    try {
      localStorage.setItem(storageKey, JSON.stringify({ theme: selectedTheme, mode: selectedMode, compactView }));
    } catch {
      // Selection still works when browser storage is unavailable.
    }
  }

  for (const radio of radios) {
    radio.addEventListener('change', () => {
      selectedMode = radio.value;
      save();
    });
  }
  for (const tab of viewTabs) {
    tab.addEventListener('click', () => {
      compactView = tab.dataset.appearanceView === 'compact';
      save();
    });
  }
  viewSwitcher.hidden = false;
  systemMode.addEventListener('change', () => {
    if (selectedMode === 'auto') apply();
  });
  apply();
})().catch(error => console.error(error));
