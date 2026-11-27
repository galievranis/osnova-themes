(async () => {
  const components = document.getElementById('appearance-components');
  const componentsBody = document.getElementById('appearance-components-body');
  const componentsToggle = components.querySelector('.appearance-components-toggle');
  componentsToggle.addEventListener('click', () => {
    const hidden = components.toggleAttribute('data-preview-hidden');
    componentsBody.inert = hidden;
    componentsToggle.setAttribute('aria-expanded', String(!hidden));
    componentsToggle.setAttribute('aria-label', hidden ? 'Показать элементы темы' : 'Скрыть элементы темы');
  });

  const demoCheckbox = components.querySelector('.checkbox__input');
  demoCheckbox.addEventListener('change', () => {
    demoCheckbox.closest('.checkbox').classList.toggle('checkbox--checked', demoCheckbox.checked);
  });
  const demoRadios = [...components.querySelectorAll('.radio__input')];
  components.addEventListener('change', event => {
    if (!demoRadios.includes(event.target)) return;
    for (const radio of demoRadios) {
      radio.closest('.radio').classList.toggle('radio--checked', radio.checked);
    }
  });
  const tabs = components.querySelector('.tabs');
  function positionTabUnderline() {
    const active = tabs.querySelector('.tabs__tab--active');
    tabs.style.setProperty('--v61fc4ba7', `${active.offsetWidth}px`);
    tabs.style.setProperty('--v9470c944', `${active.offsetLeft}px`);
  }
  tabs.addEventListener('click', event => {
    const selected = event.target.closest('.tabs__tab');
    if (!selected) return;
    for (const tab of tabs.querySelectorAll('.tabs__tab')) {
      tab.classList.toggle('tabs__tab--active', tab === selected);
      tab.setAttribute('aria-pressed', String(tab === selected));
    }
    positionTabUnderline();
  });
  const tabObserver = new ResizeObserver(positionTabUnderline);
  for (const tab of tabs.querySelectorAll('.tabs__tab')) tabObserver.observe(tab);
  positionTabUnderline();

  const demoSort = document.getElementById('appearance-components-sort');
  const sortButton = demoSort.querySelector('.dropdown__label');
  const sortMenu = demoSort.querySelector('.popover');
  const sortOptions = [...sortMenu.querySelectorAll('[role="menuitemradio"]')];
  const sortChevron = demoSort.querySelector('.dropdown__chevron');

  function setSortOpen(open, focus = null) {
    sortMenu.hidden = !open;
    sortButton.setAttribute('aria-expanded', String(open));
    const layer = open ? 'b' : 'a';
    sortChevron.dataset.state = layer;
    for (const icon of sortChevron.querySelectorAll('[data-layer]')) {
      icon.setAttribute('aria-hidden', String(icon.dataset.layer !== layer));
    }
    focus?.focus();
  }

  sortButton.addEventListener('click', () => {
    const open = sortMenu.hidden;
    setSortOpen(open, open ? sortOptions.find(option => option.getAttribute('aria-checked') === 'true') : null);
  });
  for (const option of sortOptions) {
    option.addEventListener('click', () => {
      for (const item of sortOptions) {
        item.classList.toggle('context-list-option--selected', item === option);
        item.setAttribute('aria-checked', String(item === option));
      }
      sortButton.querySelector('[data-sort-label]').textContent = option.textContent.trim();
      setSortOpen(false, sortButton);
    });
  }
  demoSort.addEventListener('keydown', event => {
    const key = event.key;
    if (key === 'Escape' && !sortMenu.hidden) {
      event.preventDefault();
      setSortOpen(false, sortButton);
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key)) return;
    event.preventDefault();
    const index = sortOptions.indexOf(document.activeElement);
    const last = sortOptions.length - 1;
    const next = key === 'Home' || (key === 'ArrowDown' && index === last) ? 0 :
      key === 'End' || (key === 'ArrowUp' && index <= 0) ? last :
      index + (key === 'ArrowDown' ? 1 : -1);
    setSortOpen(true, sortOptions[next]);
  });
  document.addEventListener('click', event => {
    if (!sortMenu.hidden && !demoSort.contains(event.target)) setSortOpen(false);
  });
  demoSort.addEventListener('focusout', event => {
    if (!sortMenu.hidden && !demoSort.contains(event.relatedTarget)) setSortOpen(false);
  });

  for (const [selector, activeClass] of [
    ['.reaction-item', 'reaction-item--active'],
    ['.content-footer-button[aria-pressed]', 'content-footer-button--active'],
  ]) {
    for (const button of components.querySelectorAll(selector)) {
      button.addEventListener('click', () => {
        button.setAttribute('aria-pressed', String(button.classList.toggle(activeClass)));
      });
    }
  }

  async function load(file) {
    const response = await fetch(file);
    if (!response.ok) throw new Error(`Не удалось загрузить ${file}`);
    return response;
  }

  const cards = [...document.querySelectorAll('[data-appearance-theme]:not([hidden])')];
  const customPanel = document.getElementById('appearance-custom');
  const colorInputs = [...customPanel.querySelectorAll('[data-theme-color]')];
  const patternSelect = document.getElementById('appearance-custom-pattern');
  const patternColor = document.getElementById('appearance-pattern-color');
  const patternSliders = document.getElementById('appearance-pattern-sliders');
  const patternInputs = [...patternSliders.querySelectorAll('input')];
  const patternSettings = {};
  const backgroundButtons = [...document.querySelectorAll('[data-background-mode]')];
  const patternControls = document.getElementById('appearance-pattern-controls');
  const imageControls = document.getElementById('appearance-custom-image');
  const imageInput = document.getElementById('appearance-image-file');
  const imageUpload = document.getElementById('appearance-image-upload');
  const imageRemove = document.getElementById('appearance-image-remove');
  const imageStatus = document.getElementById('appearance-image-status');
  const radios = [...document.querySelectorAll('input[name="color-mode"]')];
  const [catalog, extraThemes, source, vcSource] = await Promise.all([
    load('themes.json').then(response => response.json()),
    load('appearance-themes.json').then(response => response.json()),
    load('theme-preview-dtf.svg').then(response => response.text()),
    load('theme-preview.svg').then(response => response.text()),
  ]);
  const template = new DOMParser().parseFromString(source, 'image/svg+xml').documentElement;
  const vcTemplate = new DOMParser().parseFromString(vcSource, 'image/svg+xml').documentElement;
  const logos = [...document.querySelectorAll('[data-appearance-header] .header__logo')].map(link => ({
    link, dtf: link.querySelector('svg').cloneNode(true),
  }));
  const vcLogo = document.getElementById('appearance-vc-logo').content.querySelector('svg');
  const themes = new Map([...catalog, ...extraThemes].map(theme => [theme.id, theme]));
  themes.set('vc-contrast', themes.get('contrast'));
  const brandTabs = [...document.querySelectorAll('[data-appearance-brand]')];
  const themeBrand = id => id.startsWith('vc-') ? 'vc' : 'dtf';
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
  const brandThemes = { dtf: 'classic', vc: 'vc-classic', ...preferences?.brandThemes };
  brandThemes[themeBrand(selectedTheme)] = selectedTheme;
  let selectedMode = radios.some(radio => radio.value === preferences?.mode)
    ? preferences.mode : 'light';

  let backgroundMode = preferences?.backgroundMode === 'image' ? 'image' : 'pattern';
  let backgroundImage = null;
  let imageRevision = 0;
  let imageDatabase;

  function imageStore(action, file) {
    imageDatabase ??= new Promise((resolve, reject) => {
      const request = indexedDB.open('osnova-appearance-assets', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('images');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return imageDatabase.then(db => new Promise((resolve, reject) => {
      const transaction = db.transaction('images', action === 'read' ? 'readonly' : 'readwrite');
      const store = transaction.objectStore('images');
      const key = 'custom-background';
      const request = action === 'read' ? store.get(key) :
        action === 'remove' ? store.delete(key) : store.put(file, key);
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () => reject(transaction.error);
    }));
  }

  function replaceBackgroundImage(url) {
    if (backgroundImage) URL.revokeObjectURL(backgroundImage);
    backgroundImage = url;
  }

  const customPalette = {};
  const previousMode = colorMode();
  const previousPalette = preferences?.customModes?.[previousMode];
  const otherPalette = preferences?.customModes?.[previousMode === 'light' ? 'dark' : 'light'];
  const savedPalette = preferences?.customPalette ??
    (Object.keys(previousPalette ?? {}).length ? previousPalette : otherPalette);
  for (const input of colorInputs) {
    const token = input.dataset.themeColor;
    if (typeof savedPalette?.[token] === 'string' && /^#[0-9a-f]{6}$/i.test(savedPalette[token])) {
      customPalette[token] = savedPalette[token];
    }
  }
  if ([...patternSelect.options].some(option => option.value === savedPalette?.pattern)) {
    customPalette.pattern = savedPalette.pattern;
  }

  for (const input of patternInputs) {
    const property = input.dataset.patternProperty;
    const saved = preferences?.patternSettings?.[property];
    if (Number.isInteger(saved) && saved >= Number(input.min) && saved <= Number(input.max)) {
      patternSettings[property] = saved;
    }
  }

  const themeStyle = document.createElement('style');
  document.head.append(themeStyle);

  const patternedThemes = {
    music: 'music.svg', kojima: 'kojima.svg', movies: 'movies.svg', 'vc-legends': 'legends.svg#mask', games: 'games-pattern.svg', dtf: 'dtf-pattern.svg', gaming: 'gaming.svg', cats: 'cats.svg',
    filippovost: 'premium.svg', gta: 'pattern-gta.svg',
  };

  function patternFor(themeId) {
    const patternId = themeId === 'custom' ? customPalette.pattern : themeId;
    return Object.hasOwn(patternedThemes, patternId) ? patternedThemes[patternId] : null;
  }

  function addArtworkPattern(svg, image) {
    const backdrop = svg.querySelector('path[data-token="--theme-color-background"]');
    const pattern = backdrop.cloneNode();
    pattern.removeAttribute('data-token');
    pattern.classList.add('appearance-backdrop-pattern');
    pattern.style.setProperty('--appearance-pattern-image', `url('./${image}')`);
    backdrop.after(pattern);
  }

  function addArtworkGradient(svg, id, stops, endY = '0') {
    const gradient = document.createElementNS(svg.namespaceURI, 'linearGradient');
    gradient.id = id;
    gradient.setAttribute('x2', '1');
    gradient.setAttribute('y2', endY);
    for (const [offset, color] of stops) {
      const stop = document.createElementNS(svg.namespaceURI, 'stop');
      stop.setAttribute('offset', offset);
      stop.setAttribute('stop-color', color);
      gradient.append(stop);
    }
    svg.querySelector('defs').append(gradient);
  }

  function decorateCustomArtwork(svg) {
    addArtworkGradient(svg, 'appearance-custom-gradient',
      [['0%', '#72a8fa'], ['57%', '#8855fa'], ['100%', '#c64df4']], '.25');
    svg.classList.add('appearance-custom-artwork');
  }

  function makeArtwork(themeId) {
    const svg = document.importNode(themeId.startsWith('vc-') ? vcTemplate : template, true);
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
    if (themeId === 'custom') decorateCustomArtwork(svg);
    else if (Object.hasOwn(patternedThemes, themeId)) {
      addArtworkPattern(svg, patternFor(themeId));
    }
    if (Object.values(themes.get(themeId)?.modes ?? {}).some(tokens => tokens['--theme-gradient-brand-header'])) {
      const header = svg.querySelector('[data-token="--theme-color-brand-header"]');
      const mesh = document.createElementNS(svg.namespaceURI, 'foreignObject');
      mesh.setAttribute('width', '100%');
      mesh.setAttribute('height', '36');
      const fill = document.createElement('div');
      fill.className = 'appearance-header-mesh';
      mesh.append(fill);
      header.after(mesh);
    }
    if (themeId === 'movies') {
      addArtworkGradient(svg, 'appearance-movies-pattern-gradient', [
        ['0%', 'var(--theme-color-backdrop-pattern)'],
        ['57%', 'var(--theme-color-pattern-glow)'],
        ['100%', 'var(--theme-color-pattern-gradient-end)'],
      ], '.25');
    }
    if (themeId === 'vc-legends') {
      addArtworkGradient(svg, 'appearance-legends-pattern-gradient', [
        ['0%', 'var(--theme-color-backdrop-pattern)'],
        ['100%', 'var(--theme-color-pattern-gradient-end)'],
      ], '1');
    }
    if (themeId === 'gta') {
      addArtworkGradient(svg, 'appearance-gta-pattern-gradient', [
        ['0%', 'var(--theme-color-pattern-glow)'],
        ['50%', 'var(--theme-color-backdrop-pattern)'],
        ['100%', 'var(--theme-color-pattern-gradient-end)'],
      ]);
    }
    svg.classList.add('appearance-artwork');
    svg.setAttribute('preserveAspectRatio', 'xMinYMin slice');
    return svg;
  }

  const previews = cards.map(card => {
    const id = card.dataset.appearanceTheme;
    const svg = makeArtwork(id);
    card.querySelector('.mADoi96g').replaceChildren(svg);
    card.addEventListener('click', () => {
      selectedTheme = id;
      save();
    });
    return { id, card, svg };
  });

  function resolveHex(tokens, token) {
    const value = tokens[token];
    const alias = /^var\((--[\w-]+)\)$/.exec(value);
    return alias ? resolveHex(tokens, alias[1]) : value;
  }

  const channels = hex => hex.slice(1).match(/.{2}/g).map(channel => Number.parseInt(channel, 16));
  const toHex = rgb => '#' + rgb.map(channel => channel.toString(16).padStart(2, '0')).join('');

  function mixHex(from, to, amount) {
    const target = channels(to);
    return toHex(channels(from).map((value, i) => Math.round(value + (target[i] - value) * amount)));
  }

  function luminance(hex) {
    const [red, green, blue] = channels(hex).map(channel => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  }

  function readableColor(preferred, background, minimum) {
    const backdrop = luminance(background);
    const contrast = color => {
      const foreground = luminance(color);
      return (Math.max(backdrop, foreground) + 0.05) / (Math.min(backdrop, foreground) + 0.05);
    };
    if (contrast(preferred) >= minimum) return preferred;
    const endpoint = contrast('#000000') >= contrast('#ffffff') ? '#000000' : '#ffffff';
    for (let percent = 1; percent < 100; percent++) {
      const candidate = mixHex(preferred, endpoint, percent / 100);
      if (contrast(candidate) >= minimum) return candidate;
    }
    return endpoint;
  }

  function interactiveSurface(background, foreground, amount) {
    return readableColor(mixHex(background, foreground, amount), foreground, 4.5);
  }

  function interactiveColors(background, foreground, amount) {
    const surface = mixHex(background, foreground, amount);
    return { surface, text: readableColor(foreground, surface, 4.5) };
  }

  function customSurfaces(tokens) {
    const page = resolveHex(tokens, '--theme-color-background');
    const accent = resolveHex(tokens, '--theme-color-accent');
    const dark = luminance(page) < 0.179;
    const card = dark ? '#242424' : '#ffffff';
    const header = mixHex(card, accent, dark ? 0.18 : 0.24);
    const ink = surface => luminance(surface) < 0.179 ? '#f5f5f5' : '#171717';
    return {
      '--theme-color-background-content': card,
      '--theme-color-brand-header': header,
      '--theme-color-brand-background': 'var(--theme-color-background-content)',
      '--theme-color-brand-content-background': 'var(--theme-color-brand-header)',
      '--theme-color-brand-distribution-background': 'var(--theme-color-brand-header)',
      '--theme-color-brand-primary': 'var(--theme-color-accent)',
      '--theme-color-brand-primary-bright': 'var(--theme-color-accent)',
      '--theme-color-brand-icon': 'var(--theme-color-accent-subtle)',
      '--theme-color-popover-background': 'var(--theme-color-background-content)',
      '--theme-color-header-icon': ink(header),
      '--theme-color-text-primary': ink(card),
      '--theme-color-backdrop-pattern': tokens['--theme-color-backdrop-pattern'] ?? ink(page),
    };
  }

  function customContrast(tokens) {
    const get = key => resolveHex(tokens, '--theme-color-' + key);
    const page = get('background');
    const card = get('background-content');
    const accent = get('accent');
    const header = get('brand-header');
    const preferredText = get('text-primary');
    const text = readableColor(preferredText, card, 4.5);
    const pageText = readableColor(preferredText, page, 4.5);
    const headerText = readableColor(get('header-icon'), header, 4.5);
    const onAccent = readableColor(get('on-fill'), accent, 4.5);
    const secondary = (foreground, background) =>
      readableColor(mixHex(background, foreground, 0.72), background, 4.5);
    const controlBorder = readableColor(mixHex(card, text, 0.32), card, 3);
    const selectedSurface = mixHex(card, accent, 0.12);
    const cardState = amount => interactiveSurface(card, text, amount);
    const headerState = amount => interactiveSurface(header, headerText, amount);
    const pageState = amount => interactiveSurface(page, pageText, amount);
    const selectedText = readableColor(text, selectedSurface, 4.5);
    const outlineHover = interactiveColors(card, text, 0.08);
    const outlinePressed = interactiveColors(card, text, 0.14);
    return {
      '--theme-color-text-primary': text,
      '--theme-color-text-secondary': secondary(text, card),
      '--theme-color-text-tertiary': secondary(text, card),
      '--theme-color-header-icon': headerText,
      '--theme-color-on-fill': onAccent,
      '--theme-color-field-icon': onAccent,
      '--theme-color-accent-strong': interactiveSurface(accent, onAccent, 0.12),
      '--theme-color-accent-strongest': interactiveSurface(accent, onAccent, 0.20),
      '--theme-color-border': mixHex(card, text, 0.18),
      '--theme-color-border-over-background': mixHex(page, pageText, 0.24),
      '--theme-color-field-border': controlBorder,
      '--theme-color-field-border-opaque': controlBorder,
      '--theme-color-check-background': mixHex(card, text, 0.06),
      '--theme-color-background-secondary': cardState(0.06),
      '--theme-color-button-secondary': card,
      '--theme-color-button-transparent-hover': cardState(0.08),
      '--theme-color-button-transparent-pressed': cardState(0.14),
      '--theme-color-button-minimal': cardState(0.06),
      '--theme-color-round-button-background': 'var(--theme-color-button-minimal)',
      '--theme-color-button-minimal-hover': cardState(0.12),
      '--theme-color-button-minimal-pressed': cardState(0.18),
      '--theme-color-button-subtle': card,
      '--theme-color-button-subtle-hover': cardState(0.08),
      '--theme-color-button-subtle-pressed': cardState(0.14),
      '--theme-color-field-background': cardState(0.06),
      '--theme-color-field-background-hover': cardState(0.09),
      '--theme-color-floating-glass': card,
      '--theme-color-floating-glass-border': mixHex(card, text, 0.18),
      '--appearance-page-text': pageText,
      '--appearance-page-hover': pageState(0.08),
      '--appearance-page-pressed': pageState(0.14),
      '--appearance-page-focus': readableColor(accent, page, 3),
      '--appearance-header-hover': headerState(0.08),
      '--appearance-header-pressed': headerState(0.14),
      '--appearance-header-focus': readableColor(accent, header, 3),
      '--appearance-page-text-secondary': secondary(pageText, page),
      '--appearance-control-border': controlBorder,
      '--appearance-outline-hover': outlineHover.surface,
      '--appearance-outline-hover-text': outlineHover.text,
      '--appearance-outline-pressed': outlinePressed.surface,
      '--appearance-outline-pressed-text': outlinePressed.text,
      '--appearance-accent-outline': readableColor(accent, card, 3),
      '--appearance-selected-text': selectedText,
    };
  }

  function themeTokens(themeId, mode) {
    const custom = themeId === 'custom';
    const { grays, modes } = themes.get(custom ? 'classic' : themeId);
    const tokens = {
      '--theme-color-header-icon': 'var(--theme-color-text-primary)',
      ...grays,
      ...modes[custom ? 'light' : mode],
    };
    if (themeId === 'vc-legends') {
      delete tokens['--theme-background-pattern'];
      delete tokens['--theme-size-background-pattern'];
      tokens['--theme-size-backdrop-pattern'] = '550px';
      tokens['--theme-opacity-backdrop-pattern'] = mode === 'dark' ? '15%' : '10%';
    }
    if (custom) {
      const { pattern, ...colors } = customPalette;
      Object.assign(tokens, colors);
      Object.assign(tokens, customSurfaces(tokens));
      Object.assign(tokens, customContrast(tokens));
      const accentMix = (percent, base) =>
        `color-mix(in srgb, var(--theme-color-accent) ${percent}%, ${base})`;
      const surface = 'var(--theme-color-background-content)';
      Object.assign(tokens, {
        '--theme-color-accent-subtle': accentMix(30, surface),
        '--theme-color-accent-subtlest': accentMix(12, surface),
        '--theme-color-accent-tint': accentMix(12, 'transparent'),
        '--theme-color-background-selected': 'var(--theme-color-accent-subtlest)',
        '--theme-color-background-selected-hover': accentMix(20, surface),
        '--theme-color-background-highlight': accentMix(6, surface),
        '--theme-color-filter-field-background-selected': 'var(--theme-color-background-highlight)',
      });
      const patternTokens = themes.get(pattern)?.modes.light;
      if (patternTokens) {
        tokens['--theme-size-backdrop-pattern'] = patternTokens['--theme-size-backdrop-pattern'];
        const opacity = '--theme-opacity-backdrop-pattern';
        tokens[opacity] = patternSettings.opacity === undefined
          ? patternTokens[opacity] : `${patternSettings.opacity}%`;
      }
    }
    if (!custom && mode === 'dark' && !['classic', 'contrast', 'vc-classic', 'vc-contrast'].includes(themeId)) {
      const surface = resolveHex(tokens, '--theme-color-background-content');
      if (/^#[0-9a-f]{6}$/i.test(surface)) {
        const ink = resolveHex(tokens, '--theme-color-text-primary');
        if (/^#[0-9a-f]{6}$/i.test(ink)) {
          const direction = luminance(ink) > luminance(surface) ? '#FFFFFF' : '#000000';
          tokens['--theme-color-field-background'] = mixHex(surface, direction, 0.07);
          tokens['--theme-color-field-background-hover'] = mixHex(surface, direction, 0.11);
          tokens['--theme-color-field-background-disabled'] = mixHex(surface, direction, 0.03);
        }
      }
    }
    return tokens;
  }

  function declarations(tokens) {
    return Object.entries(tokens)
      .map(([token, value]) => `${token}: ${value};`).join('\n');
  }

  function updatePatternSlider(input, number) {
    input.value = number;
    const min = Number(input.min);
    const progress = (input.valueAsNumber - min) / (Number(input.max) - min) * 100;
    input.style.setProperty('--appearance-slider-progress', `${progress}%`);
    const value = `${input.value}%`;
    input.parentElement.querySelector('output').value = value;
    input.setAttribute('aria-valuetext', value);
  }

  function applyCustomEditor() {
    const context = document.createElement('canvas').getContext('2d');
    const style = getComputedStyle(document.documentElement);
    for (const input of colorInputs) {
      context.fillStyle = style.getPropertyValue(input.dataset.themeColor).trim();
      input.value = context.fillStyle;
    }
    const showImage = backgroundMode === 'image';
    for (const button of backgroundButtons) {
      button.setAttribute('aria-pressed', String(button.dataset.backgroundMode === backgroundMode));
    }
    imageControls.hidden = !showImage;
    imageRemove.hidden = !backgroundImage;
    patternControls.hidden = showImage;
    patternSelect.value = customPalette.pattern ?? '';
    patternColor.hidden = !patternSelect.value;
    patternSliders.hidden = showImage || !patternSelect.value;
    if (patternSliders.hidden) return;
    for (const input of patternInputs) {
      const property = input.dataset.patternProperty;
      const value = Number.parseFloat(style.getPropertyValue(`--theme-${property}-backdrop-pattern`));
      updatePatternSlider(input, value);
    }
  }

  function apply() {
    const mode = colorMode();
    const root = document.documentElement;
    const custom = selectedTheme === 'custom';
    const palette = themeTokens(selectedTheme, mode);
    const headerColor = resolveHex(palette, '--theme-color-brand-header');
    const whiteWriteButton = /^#[0-9a-f]{6}$/i.test(headerColor)
      && luminance(headerColor) <= 1.05 / 3 - 0.05;
    root.toggleAttribute('data-white-write-button', whiteWriteButton);
    root.toggleAttribute('data-muted-choice-controls', ['movies', 'kojima', 'music', 'paper', 'tarantino', 'vc-future', 'vc-transport', 'vc-market', 'vc-money', 'vc-science', 'vc-memes'].includes(selectedTheme));
    const brand = themeBrand(selectedTheme);
    const isVc = brand === 'vc';
    for (const tab of brandTabs) {
      const active = tab.dataset.appearanceBrand === brand;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
    }
    for (const { link, dtf } of logos) {
      const label = isVc ? 'vc.ru' : 'DTF';
      if (link.getAttribute('aria-label') !== label) {
        link.querySelector('svg').replaceWith((isVc ? vcLogo : dtf).cloneNode(true));
        link.setAttribute('aria-label', label);
      }
    }
    const surface = resolveHex(palette, '--theme-color-background-content');
    if (/^#[0-9a-f]{6}$/i.test(surface)) {
      const radioFill = selectedTheme === 'tarantino' && mode === 'light' ? '#9D8E78' : surface;
      palette['--appearance-radio-fill'] = readableColor(radioFill, surface, 3.1);
    }
    const nativeScheme = custom ? (luminance(surface) < 0.179 ? 'dark' : 'light') : mode;
    root.dataset.colorMode = custom ? 'light' : mode;
    root.toggleAttribute('data-custom-palette', custom);
    const useImage = custom && backgroundMode === 'image';
    const pattern = useImage ? null : patternFor(selectedTheme);
    if (useImage && backgroundImage) {
      root.style.setProperty('--appearance-custom-image', `url("${backgroundImage}")`);
    } else {
      root.style.removeProperty('--appearance-custom-image');
    }
    root.toggleAttribute('data-appearance-image', Boolean(useImage && backgroundImage));
    root.toggleAttribute('data-appearance-pattern', Boolean(pattern));
    if (pattern) root.style.setProperty('--appearance-pattern-image', `url('./${pattern}')`);
    else root.style.removeProperty('--appearance-pattern-image');
    root.dataset.theme = ['contrast', 'vc-contrast'].includes(selectedTheme) ? 'contrast' : 'classic';
    themeStyle.textContent = `:root[data-appearance][data-color-mode] { color-scheme: ${nativeScheme};\n${declarations(palette)}\n}`;

    customPanel.hidden = !custom;
    if (custom) applyCustomEditor();
    for (const { id, card, svg } of previews) {
      const selected = id === selectedTheme;
      card.classList.toggle('zvEjzVpg', selected);
      card.setAttribute('aria-pressed', String(selected));
      if (id === 'custom') continue;
      const palette = declarations(themeTokens(id, mode));
      svg.style.cssText = palette;
    }

    for (const radio of radios) {
      radio.checked = radio.value === selectedMode;
      radio.closest('.radio').classList.toggle('radio--checked', radio.checked);
    }
  }

  function save() {
    brandThemes[themeBrand(selectedTheme)] = selectedTheme;
    apply();
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        theme: selectedTheme, brandThemes, mode: selectedMode, customPalette, patternSettings, backgroundMode,
      }));
    } catch {
      // Selection still works when browser storage is unavailable.
    }
  }

  for (const [index, tab] of brandTabs.entries()) {
    tab.addEventListener('click', () => {
      const brand = tab.dataset.appearanceBrand;
      const remembered = brandThemes[brand];
      selectedTheme = cards.some(card => card.dataset.appearanceTheme === remembered && themeBrand(remembered) === brand)
        ? remembered : brand === 'vc' ? 'vc-classic' : 'classic';
      save();
    });
    tab.addEventListener('keydown', event => {
      const target = { ArrowLeft: 1 - index, ArrowRight: 1 - index, Home: 0, End: 1 }[event.key];
      if (target === undefined) return;
      event.preventDefault();
      brandTabs[target].focus();
      brandTabs[target].click();
    });
  }

  for (const radio of radios) {
    radio.addEventListener('change', () => {
      selectedMode = radio.value;
      save();
    });
  }
  for (const input of colorInputs) {
    input.addEventListener('input', () => {
      customPalette[input.dataset.themeColor] = input.value;
      save();
    });
  }
  patternSelect.addEventListener('change', () => {
    customPalette.pattern = patternSelect.value;
    save();
  });
  for (const input of patternInputs) {
    input.addEventListener('input', () => {
      patternSettings[input.dataset.patternProperty] = input.valueAsNumber;
      save();
    });
  }
  for (const button of backgroundButtons) {
    button.addEventListener('click', () => {
      backgroundMode = button.dataset.backgroundMode;
      save();
    });
  }

  imageUpload.addEventListener('click', () => imageInput.click());
  imageInput.addEventListener('change', async () => {
    const file = imageInput.files[0];
    imageInput.value = '';
    if (!file) return;
    imageUpload.disabled = true;
    imageRemove.disabled = true;
    imageStatus.textContent = '';
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      imageRevision++;
      replaceBackgroundImage(url);
      apply();
      await imageStore('write', file).catch(() => {
        imageStatus.textContent = 'Картинка доступна до перезагрузки страницы.';
      });
    } catch {
      URL.revokeObjectURL(url);
      imageStatus.textContent = 'Не удалось открыть картинку.';
    } finally {
      imageUpload.disabled = false;
      imageRemove.disabled = false;
    }
  });

  imageRemove.addEventListener('click', async () => {
    imageRevision++;
    replaceBackgroundImage(null);
    imageStatus.textContent = '';
    apply();
    await imageStore('remove').catch(() => {
      imageStatus.textContent = 'Не удалось удалить сохранённую картинку.';
    });
  });

  imageStore('read').then(file => {
    if (!file || imageRevision) return;
    replaceBackgroundImage(URL.createObjectURL(file));
    apply();
  }).catch(() => {});

  systemMode.addEventListener('change', () => {
    if (selectedMode === 'auto') apply();
  });
  if (!preferences?.customPalette && preferences?.customModes) save();
  else apply();
})().catch(error => console.error(error));
