function createThemeBackgroundPatterns(opacity = 14) {
  const patternInk = `color-mix(in srgb, var(--theme-color-text-primary) ${opacity}%, transparent)`;
  return {
    dots: `radial-gradient(circle, ${patternInk} 1px, transparent 1.5px)`,
    grid: `linear-gradient(${patternInk} 1px, transparent 1px), linear-gradient(90deg, ${patternInk} 1px, transparent 1px)`,
    diagonal: `linear-gradient(135deg, ${patternInk} 3%, transparent 3% 47%, ${patternInk} 47% 53%, transparent 53% 97%, ${patternInk} 97%)`,
    crosses: `radial-gradient(ellipse 4px 1px, ${patternInk} 85%, transparent), radial-gradient(ellipse 1px 4px, ${patternInk} 85%, transparent)`,
    checkerboard: `conic-gradient(${patternInk} 25%, transparent 0 50%, ${patternInk} 0 75%, transparent 0)`,
  };
}
