globalThis.OsnovaContrast = {
  over(top, bottom) { return OsnovaHeaderColor.over(top, bottom); },
  luminance(color) {
    const rgb = ['r', 'g', 'b'].map(key => { const x = color[key] / 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; });
    return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
  },
  ratio(foreground, background) {
    const a = this.luminance(this.over(foreground, background)), b = this.luminance(background);
    return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
  },
  audit() {
    const root = document.documentElement, mode = root.dataset.colorMode === 'dark' ? 'dark' : 'light';
    const probe = document.createElement('span');
    probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;inset:0;width:0;height:0';
    root.append(probe);
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const computed = getComputedStyle(root);
    const parse = value => {
      const color = OsnovaColor.parse(value || ''); if (color) return color;
      if (!value || !CSS.supports('color', value)) return null;
      ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = value; ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      return { r, g, b, a: a / 255 };
    };
    const color = name => {
      if (!computed.getPropertyValue(`--theme-color-${name}`).trim()) return null;
      probe.style.color = `var(--theme-color-${name})`;
      return parse(getComputedStyle(probe).color);
    };
    const results = [];
    try {
      const neutral = parse(mode === 'dark' ? '#000000' : '#ffffff');
      const page = this.over(color('background'), neutral);
      const island = this.over(color('background-content'), page);
      const pair = (label, ink, surface, minimum = 4.5) => {
        const foreground = color(ink), rawBackground = color(surface);
        if (!foreground || !rawBackground) return;
        const background = this.over(rawBackground, surface === 'background' ? page : island);
        const ratio = this.ratio(foreground, background);
        results.push({ label, ratio: Number(ratio.toFixed(2)), minimum, pass: ratio >= minimum, foreground: OsnovaColor.hex(foreground, false), background: OsnovaColor.hex(background, false) });
      };
      for (const [name, label] of [['text-primary', 'Основной текст'], ['text-secondary', 'Вторичный текст'], ['text-tertiary', 'Третичный текст']]) {
        pair(`${label} / остров`, name, 'background-content');
        pair(`${label} / фон`, name, 'background');
        pair(`${label} / меню`, name, 'popover-background');
        pair(`${label} / выбор`, name, 'background-selected-hover');
      }
      for (const surface of ['button-secondary', 'button-minimal', 'button-minimal-hover', 'button-minimal-pressed', 'button-subtle', 'button-subtle-hover', 'button-subtle-pressed', 'field-background', 'field-background-hover']) {
        pair(`Текст / ${surface}`, 'text-primary', surface);
      }
      pair('Вторичный текст / нажатая кнопка', 'text-secondary', 'button-minimal-pressed');
      pair('Третичный текст / нажатая кнопка', 'text-tertiary', 'button-minimal-pressed');
      for (const surface of ['accent', 'accent-strong', 'accent-strongest']) {
        pair(`Текст / ${surface}`, 'on-fill', surface);
        pair(`Галочка и точка радио / ${surface}`, 'field-icon', surface, 3);
      }
      pair('Активная иконка навигации / остров', 'accent', 'background-content', 3);
      pair('Граница невыбранного радио / остров', 'check-background', 'background-content', 3);
      pair('Граница поля / поле', 'field-border-opaque', 'field-background', 3);
      pair('Граница поля / hover', 'field-border-opaque', 'field-background-hover', 3);
      pair('Фокус / остров', 'field-border-focus', 'background-content', 3);
      pair('Ползунок / остров', 'slider-thumb-background', 'background-content', 3);
      const header = document.querySelector('.header') || document.querySelector('.site-header') || document.querySelector('header');
      const bounds = header?.getBoundingClientRect();
      const width = bounds?.width || root.clientWidth, height = bounds?.height || 60;
      const gradient = computed.getPropertyValue('--theme-gradient-brand-header').trim();
      const layers = gradient && gradient !== 'none' ? OsnovaHeaderColor.split(gradient).map(value => OsnovaHeaderColor.layer(value, width, height, parse)) : [];
      let minimum = Infinity;
      for (let ix = 0; ix <= 20; ix++) for (const y of [.5, height / 2, height - .5]) {
        let background = this.over(color('brand-header'), page);
        for (let i = layers.length - 1; i >= 0; i--) background = this.over(layers[i](width * ix / 20, y), background);
        minimum = Math.min(minimum, this.ratio(color('text-primary'), background));
      }
      results.push({ label: 'Текст и иконки / градиент шапки (минимум по сетке)', ratio: Number(minimum.toFixed(2)), minimum: 4.5, pass: minimum >= 4.5 });
      return { mode, results, failures: results.filter(item => !item.pass).length };
    } finally { probe.remove(); }
  }
};
