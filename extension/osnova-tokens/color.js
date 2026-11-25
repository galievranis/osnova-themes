/* Color conversions are independent of the picker UI. Alpha is never premultiplied. */
globalThis.OsnovaColor = {
  clamp(value, min = 0, max = 1) { return Math.min(max, Math.max(min, value)); },
  parse(value) {
    const text = value.trim().toLowerCase();
    if (text === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
    const hex = text.match(/^#([a-f\d]{3,4}|[a-f\d]{6}|[a-f\d]{8})$/i);
    if (hex) {
      let digits = hex[1];
      if (digits.length <= 4) digits = [...digits].map(n => n + n).join('');
      return { r: parseInt(digits.slice(0, 2), 16), g: parseInt(digits.slice(2, 4), 16), b: parseInt(digits.slice(4, 6), 16), a: digits.length === 8 ? parseInt(digits.slice(6), 16) / 255 : 1 };
    }
    const rgb = text.match(/^rgba?\((.*)\)$/);
    if (!rgb) return null;
    const parts = rgb[1].replace(/[,/]/g, ' ').trim().split(/\s+/);
    if (parts.length < 3 || parts.length > 4 || parts.some(part => !/^[+-]?(?:\d*\.)?\d+%?$/.test(part))) return null;
    const channel = value => Math.round(this.clamp(parseFloat(value) * (value.endsWith('%') ? 255 / 100 : 1), 0, 255));
    const alpha = parts[3] || '1';
    return { r: channel(parts[0]), g: channel(parts[1]), b: channel(parts[2]), a: this.clamp(parseFloat(alpha) / (alpha.endsWith('%') ? 100 : 1)) };
  },
  toHSV({ r, g, b, a }) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
    let h = 0;
    if (delta) {
      if (max === r) h = ((g - b) / delta) % 6;
      else if (max === g) h = (b - r) / delta + 2;
      else h = (r - g) / delta + 4;
      h = (h * 60 + 360) % 360;
    }
    return { h, s: max ? delta / max : 0, v: max, a };
  },
  fromHSV({ h, s, v, a }) {
    h = ((h % 360) + 360) % 360;
    const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c;
    const values = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    const [r, g, b] = values.map(n => Math.round((n + m) * 255));
    return { r, g, b, a };
  },
  hex({ r, g, b, a }, alpha = a < 1) {
    return '#' + [r, g, b, ...(alpha ? [Math.round(a * 255)] : [])].map(n => Math.round(n).toString(16).padStart(2, '0')).join('').toUpperCase();
  },
  rgba({ r, g, b, a }) { return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(4))})`; },
  css(color, format = 'rgba') { return format === 'hex' ? this.hex(color) : this.rgba(color); }
};
