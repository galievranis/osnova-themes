globalThis.OsnovaShadow = {
  split(text, space = false) {
    const result = []; let depth = 0, start = 0;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '(') depth++;
      else if (text[i] === ')') depth--;
      else if (!depth && (space ? /\s/.test(text[i]) : text[i] === ',')) {
        if (text.slice(start, i).trim()) result.push(text.slice(start, i).trim()); start = i + 1;
      }
    }
    if (text.slice(start).trim()) result.push(text.slice(start).trim());
    return result;
  },
  parse(text) {
    if (!text || text.trim() === 'none') return [];
    let cursor = 0;
    const layers = this.split(text).map(source => {
      const start = text.indexOf(source, cursor);
      const before = text.slice(cursor, start);
      cursor = start + source.length;
      const lengths = []; let inset = false, color = null;
      for (const part of this.split(source, true)) {
        if (part === 'inset') inset = true;
        else if (/^[+-]?(?:\d*\.)?\d+(?:px)?$/.test(part)) lengths.push(part);
        else if (color === null) color = part;
        else throw new Error('Для этой записи тени используйте текстовое поле');
      }
      if (lengths.length < 2 || lengths.length > 4 || Number.parseFloat(lengths[2] || '0') < 0) throw new Error('Для этой записи тени используйте текстовое поле');
      return { source, before, colorOffset: color === null ? -1 : source.indexOf(color), originalColor: color, dirty: false, inset, x: parseFloat(lengths[0]), y: parseFloat(lengths[1]), blur: parseFloat(lengths[2] || '0'), spread: parseFloat(lengths[3] || '0'), color: color || 'currentColor' };
    });
    layers.tail = text.slice(cursor);
    return layers;
  },
  serialize(layers) {
    if (!layers.length) return 'none';
    return layers.map(layer => {
      let source = layer.source;
      if (layer.dirty) {
        if (layer.colorOffset < 0) source += ` ${layer.color}`;
        else source = source.slice(0, layer.colorOffset) + layer.color + source.slice(layer.colorOffset + layer.originalColor.length);
      }
      return (layer.before || '') + source;
    }).join('') + (layers.tail || '');
  }
};
