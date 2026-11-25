/* UI state belongs to the editor, never to additional CSS tokens. */
globalThis.OsnovaPatternState = {
  read(css, baseline, saved, normalize) {
    if (saved?.css === css) return { ...saved };
    const colors = value => (value.match(/#[a-f\d]{3,8}\b|rgba?\([^)]*\)/gi) || []).map(normalize).filter(Boolean);
    const current = colors(css), original = colors(baseline);
    const first = current[0] || original[0] || '#b66adf';
    const enabled = /(?:linear|radial|conic)-gradient/.test(css) && new Set(current).size > 1;
    const second = enabled ? current[1] : original.find(color => color !== first) || '#f283be';
    const gradient = enabled ? css : new Set(original).size > 1 ? baseline : `linear-gradient(135deg, ${first}, ${second})`;
    return { css, enabled, first, second, gradient };
  },
  change(previous, { kind, first, second, enabled }) {
    const gradient = kind === 'toggle' ? previous.gradient : `linear-gradient(135deg, ${first}, ${second})`;
    const css = enabled ? gradient : `linear-gradient(${first}, ${first})`;
    return { css, enabled, first, second, gradient };
  }
};
