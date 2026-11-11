function createThemeBackgroundPatterns(opacity = 14) {
  const patternInk = `color-mix(in srgb, var(--theme-color-text-primary) ${opacity}%, transparent)`;
  return {
    dots: `radial-gradient(circle, ${patternInk} 1px, transparent 1.5px)`,
    grid: `linear-gradient(${patternInk} 1px, transparent 1px), linear-gradient(90deg, ${patternInk} 1px, transparent 1px)`,
    diagonal: `linear-gradient(135deg, ${patternInk} 3%, transparent 3% 47%, ${patternInk} 47% 53%, transparent 53% 97%, ${patternInk} 97%)`,
    crosses: `radial-gradient(ellipse 4px 1px, ${patternInk} 85%, transparent), radial-gradient(ellipse 1px 4px, ${patternInk} 85%, transparent)`,
    checkerboard: `conic-gradient(${patternInk} 25%, transparent 0 50%, ${patternInk} 0 75%, transparent 0)`,
    zebra: `radial-gradient(ellipse at 100% 0%,
      transparent 0 12%, ${patternInk} 13% 17%, transparent 18% 24%,
      ${patternInk} 25% 32%, transparent 33% 43%, ${patternInk} 44% 48%,
      transparent 49% 57%, ${patternInk} 58% 67%, transparent 68% 74%,
      ${patternInk} 75% 80%, transparent 81% 91%, ${patternInk} 92% 95%, transparent 96%)`,
    cow: [
      `radial-gradient(ellipse 20% 12% at 28% 24%, ${patternInk} 94%, transparent 100%)`,
      `radial-gradient(ellipse 12% 22% at 34% 32%, ${patternInk} 94%, transparent 100%)`,
      `radial-gradient(ellipse 18% 23% at 75% 67%, ${patternInk} 94%, transparent 100%)`,
      `radial-gradient(ellipse 13% 15% at 62% 75%, ${patternInk} 94%, transparent 100%)`,
      `radial-gradient(ellipse 7% 10% at 78% 19%, ${patternInk} 92%, transparent 100%)`,
      `radial-gradient(ellipse 10% 7% at 20% 79%, ${patternInk} 92%, transparent 100%)`,
    ].join(', '),
    doubleLines: `linear-gradient(0deg, transparent 0 36%,
      ${patternInk} 36% 42%, transparent 42% 51%, ${patternInk} 51% 57%, transparent 57%)`,
  };
}
