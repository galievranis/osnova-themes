/* Sample CSS background gradients without screen capture or new page tokens. */
globalThis.OsnovaHeaderColor = {
  split(text, delimiter = ',') {
    let depth = 0, start = 0;
    const result = [];
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '(') depth++;
      else if (text[i] === ')') depth--;
      else if (!depth && (delimiter === ' ' ? /\s/.test(text[i]) : text[i] === delimiter)) {
        if (text.slice(start, i).trim()) result.push(text.slice(start, i).trim());
        start = i + 1;
      }
    }
    if (text.slice(start).trim()) result.push(text.slice(start).trim());
    return result;
  },
  over(top, bottom) {
    const a = top.a + bottom.a * (1 - top.a);
    if (!a) return { r: 0, g: 0, b: 0, a: 0 };
    const result = { a };
    for (const key of ['r', 'g', 'b']) result[key] = (top[key] * top.a + bottom[key] * bottom.a * (1 - top.a)) / a;
    return result;
  },
  length(text, size) {
    if (!/^[+-]?(?:\d*\.)?\d+(?:%|px)?$/.test(text)) throw new Error(`Не поддерживается размер градиента: ${text}`);
    return parseFloat(text) * (text.endsWith('%') ? size / 100 : 1);
  },
  position(text, width, height) {
    let words = (text || 'center center').trim().split(/\s+/);
    if (words.length === 1) words = /top|bottom/.test(words[0]) ? ['center', words[0]] : [words[0], 'center'];
    if (/^(top|bottom)$/.test(words[0])) words.reverse();
    if (words.length !== 2) throw new Error('Не поддерживается положение градиента');
    const value = (word, size) => word === 'center' ? size / 2 : /^(left|top)$/.test(word) ? 0 : /^(right|bottom)$/.test(word) ? size : this.length(word, size);
    return [value(words[0], width), value(words[1], height)];
  },
  stops(parts, size, parseColor) {
    const stops = [];
    for (const part of parts) {
      const words = this.split(part, ' ');
      const color = parseColor(words[0]);
      if (!color || words.length > 3) throw new Error(`Не поддерживается цветовая точка: ${part}`);
      const positions = words.slice(1);
      if (!positions.length) stops.push({ color, p: null });
      else for (const position of positions) stops.push({ color, p: this.length(position, size) / size });
    }
    if (stops.length < 2) throw new Error('В градиенте нужны два цвета');
    stops[0].p ??= 0; stops.at(-1).p ??= 1;
    let previous = stops[0].p;
    for (const stop of stops) if (stop.p !== null) { stop.p = Math.max(previous, stop.p); previous = stop.p; }
    for (let i = 1; i < stops.length; i++) if (stops[i].p === null) {
      let end = i; while (stops[end].p === null) end++;
      const start = stops[i - 1].p, distance = end - i + 1;
      for (let j = i; j < end; j++) stops[j].p = start + (stops[end].p - start) * (j - i + 1) / distance;
      i = end;
    }
    return stops;
  },
  interpolate(stops, t, repeating) {
    const first = stops[0], last = stops.at(-1);
    if (repeating) { const range = last.p - first.p; t = range ? first.p + ((t - first.p) % range + range) % range : last.p; }
    if (t < first.p) return first.color;
    if (t >= last.p) return last.color;
    let i = 1; while (i < stops.length && stops[i].p <= t) i++;
    const left = stops[i - 1], right = stops[i];
    const q = (t - left.p) / (right.p - left.p);
    const a = left.color.a * (1 - q) + right.color.a * q;
    const result = { a };
    for (const key of ['r', 'g', 'b']) result[key] = a ? (left.color[key] * left.color.a * (1 - q) + right.color[key] * right.color.a * q) / a : 0;
    return result;
  },
  layer(text, width, height, parseColor) {
    const match = text.match(/^(repeating-)?(linear|radial)-gradient\((.*)\)$/s);
    if (!match) throw new Error('Автоцвет шапки поддерживает linear-gradient и radial-gradient');
    const parts = this.split(match[3]);
    let descriptor = '';
    if (!parseColor(this.split(parts[0], ' ')[0])) descriptor = parts.shift();
    descriptor = descriptor.replace(/\bin srgb\b/, '').trim();
    if (/\bin\s/.test(descriptor)) throw new Error('Для автоцвета используйте градиент в sRGB');
    let at, size;
    if (match[2] === 'linear') {
      let angle = Math.PI;
      if (descriptor.startsWith('to ')) {
        const horizontal = descriptor.includes('right') ? 1 : descriptor.includes('left') ? -1 : 0;
        const vertical = descriptor.includes('bottom') ? 1 : descriptor.includes('top') ? -1 : 0;
        angle = Math.atan2(horizontal * (vertical ? height : 1), -vertical * (horizontal ? width : 1));
      } else if (descriptor) {
        const a = descriptor.match(/^([+-]?[\d.]+)(deg|turn|rad|grad)?$/);
        if (!a) throw new Error('Не поддерживается направление градиента');
        angle = Number(a[1]) * (a[2] === 'turn' ? 2 * Math.PI : a[2] === 'rad' ? 1 : a[2] === 'grad' ? Math.PI / 200 : Math.PI / 180);
      }
      const dx = Math.sin(angle), dy = -Math.cos(angle);
      size = Math.abs(width * dx) + Math.abs(height * dy);
      at = (x, y) => .5 + ((x - width / 2) * dx + (y - height / 2) * dy) / size;
    } else {
      const sections = descriptor.split(/\s+at\s+|^at\s+/);
      const geometry = sections[0].trim();
      const [cx, cy] = this.position(sections[1], width, height);
      const circle = /\bcircle\b/.test(geometry);
      const explicit = geometry.replace(/\b(?:circle|ellipse)\b/g, '').trim();
      let rx, ry;
      if (explicit && !/^(closest|farthest)-(side|corner)$/.test(explicit)) {
        const dims = explicit.split(/\s+/);
        rx = this.length(dims[0], width); ry = circle || dims.length === 1 ? rx : this.length(dims[1], height);
      } else {
        const closest = explicit.startsWith('closest');
        const xs = [Math.abs(cx), Math.abs(width - cx)], ys = [Math.abs(cy), Math.abs(height - cy)];
        const choose = list => closest ? Math.min(...list) : Math.max(...list);
        rx = choose(xs); ry = choose(ys);
        const corner = !explicit || explicit.endsWith('corner');
        if (circle) {
          rx = ry = corner ? choose(xs.flatMap(x => ys.map(y => Math.hypot(x, y)))) : choose([...xs, ...ys]);
        } else if (corner) {
          const scale = choose(xs.flatMap(x => ys.map(y => Math.hypot(x / (rx || 1e-9), y / (ry || 1e-9)))));
          rx *= scale; ry *= scale;
        }
      }
      rx = Math.max(rx, 1e-9); ry = Math.max(ry, 1e-9);
      size = rx;
      at = (x, y) => Math.hypot((x - cx) / rx, (y - cy) / ry);
    }
    const stops = this.stops(parts, size, parseColor);
    return (x, y) => this.interpolate(stops, at(x, y), Boolean(match[1]));
  },
  sample({ gradient, fill, background, width, height = 60, parseColor }) {
    const layers = gradient && gradient !== 'none' ? this.split(gradient).map(layer => this.layer(layer, width, height, parseColor)) : [];
    const base = this.over(parseColor(fill), parseColor(background));
    // Average a tiny strip at the upper edge, horizontally centered. No text/icons.
    const samples = [];
    for (const dx of [-2, -1, 0, 1, 2]) for (const y of [.5, 1.5, 2.5]) {
      const x = Math.max(.5, Math.min(width - .5, width / 2 + dx));
      let pixel = base;
      for (let i = layers.length - 1; i >= 0; i--) pixel = this.over(layers[i](x, Math.min(height - .5, y)), pixel);
      samples.push(pixel);
    }
    return '#' + ['r', 'g', 'b'].map(key => Math.round(samples.reduce((sum, pixel) => sum + pixel[key], 0) / samples.length + 1e-9).toString(16).padStart(2, '0')).join('').toUpperCase();
  }
};
