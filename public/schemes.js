/* Each display mode owns its schemes and remembers its own selection. */
(function (scope) {
  const previousClassic = {
    light: {
      '--theme-color-check-border-disabled': 'var(--classic-gray-90)',
      '--theme-color-field-background-disabled': 'var(--classic-gray-98)',
    },
    dark: {
      '--theme-color-text-secondary': '#969c9d',
      '--theme-color-field-background-hover': '#1e1d1e',
    },
  };
  const legacyPrimitives = {
    '--classic-gray-90': '#DDDDDD',
    '--classic-gray-98': '#F7F7F7',
  };

  function rebase(tokens, previous, defaults) {
    const updated = { ...defaults, ...tokens };
    for (const [name, oldValue] of Object.entries(previous)) {
      if (tokens[name] !== oldValue) continue;
      if (Object.hasOwn(defaults, name)) updated[name] = defaults[name];
      else delete updated[name];
    }
    return updated;
  }

  function createState(defaults, stored, legacy, contrast) {
    const modes = ['light', 'dark'];
    const validStored = stored?.version === 3 && modes.every(mode =>
      Array.isArray(stored.schemes?.[mode]) && stored.schemes[mode].length &&
      stored.schemes[mode].every(scheme => typeof scheme.name === 'string' &&
        scheme.tokens && typeof scheme.tokens === 'object'));
    const state = validStored ? structuredClone(stored) : {
      version: 3, mode: 'light', selected: {}, schemes: { light: [], dark: [] },
    };
    const bases = { classic: defaults, contrast: { light: contrast.light, dark: contrast.dark } };
    state.selected ??= {};

    for (const mode of modes) {
      if (!validStored) {
        state.schemes[mode] = legacy?.themes?.length
          ? legacy.themes.map(theme => ({
            id: theme.id, name: theme.name,
            tokens: rebase(theme[mode] ?? {}, previousClassic[mode], defaults[mode]),
          }))
          : [{ id: 'classic', name: 'Классика', tokens: { ...defaults[mode] } }];
        state.selected[mode] = legacy?.id;
      } else {
        for (const scheme of state.schemes[mode]) {
          const base = scheme.base === 'contrast' ? 'contrast' : 'classic';
          const previous = state.paletteBases?.[base]?.[mode] ?? previousClassic[mode];
          scheme.tokens = rebase(scheme.tokens, previous, bases[base][mode]);
        }
      }

      const schemes = state.schemes[mode];
      if (!state.paletteBases) {
        const id = schemes.some(scheme => scheme.id === 'contrast') ? crypto.randomUUID() : 'contrast';
        schemes.push({ id, name: 'Contrast', base: 'contrast', tokens: { ...contrast[mode] } });
      }
      if (!schemes.some(scheme => scheme.id === state.selected[mode])) {
        state.selected[mode] = schemes[0].id;
      }
    }

    state.paletteBases = bases;
    state.mode = state.mode === 'dark' ? 'dark' : 'light';
    return state;
  }

  scope.ThemeSchemes = { createState, legacyPrimitives };
})(globalThis);
