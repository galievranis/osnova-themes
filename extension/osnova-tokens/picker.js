(() => {
  const model = OsnovaColor;
  const $ = id => document.getElementById(id);
  const dialog = $('color-editor');
  let hsv;
  let context;
  let original;
  let format = 'rgba';
  let timer;
  let writes = Promise.resolve();
  let changed = false;
  let closing = false;
  let hasWritten = false;
  function resolve(value) {
    const parsed = model.parse(value || '');
    if (parsed) return parsed;
    if (!value || !CSS.supports('color', value)) return null;
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = value;
    const normalized = model.parse(ctx.fillStyle);
    if (normalized) return normalized;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, alpha] = ctx.getImageData(0, 0, 1, 1).data;
    return { r, g, b, a: alpha / 255 };
  }
  function output() { return model.css(model.fromHSV(hsv), format); }
  function update(source) {
    const color = model.fromHSV(hsv);
    const opaque = model.hex(color, false);
    $('color-sv').style.setProperty('--hue', `hsl(${hsv.h} 100% 50%)`);
    $('color-cursor').style.left = `${hsv.s * 100}%`;
    $('color-cursor').style.top = `${(1 - hsv.v) * 100}%`;
    $('color-sv').setAttribute('aria-valuetext', `Насыщенность ${Math.round(hsv.s * 100)}%, яркость ${Math.round(hsv.v * 100)}%`);
    $('color-alpha').style.setProperty('--opaque', opaque);
    $('color-preview-fill').style.background = model.rgba(color);
    $('color-hue').value = hsv.h;
    $('color-alpha').value = hsv.a * 100;
    if (source !== 'alpha-number') $('color-alpha-number').value = Number((hsv.a * 100).toFixed(2));
    for (const component of ['r', 'g', 'b']) if (source !== component) $(`color-${component}`).value = color[component];
    if (source !== 'hex') $('color-hex').value = model.hex(color, false);
    if (source !== 'value') $('color-value').value = output();
  }
  function queue(value) {
    hasWritten = true;
    const target = context;
    writes = writes.catch(() => {}).then(() => target.write(value)).then(() => {
      $('color-feedback').textContent = 'Сохранено';
    }).catch(error => { $('color-feedback').textContent = error.message; throw error; });
    // A rejection remains observable by finish() but never becomes unhandled.
    writes.catch(() => {});
    return writes;
  }
  function change(source) {
    changed = true;
    update(source);
    $('color-feedback').textContent = 'Предпросмотр…';
    clearTimeout(timer);
    timer = setTimeout(() => queue(output()), 90);
  }
  async function finish(cancel = false) {
    if (!context || closing) return;
    closing = true; clearTimeout(timer);
    try {
      if (cancel) {
        await writes.catch(() => {});
        if (hasWritten) await context.write(original);
      } else if (changed) await queue(output());
      else await writes;
      const done = context.done;
      context = null;
      dialog.close();
      await done();
    } catch (error) { $('color-feedback').textContent = error.message; }
    finally { closing = false; }
  }
  globalThis.OsnovaPicker = {
    parse: resolve,
    get open() { return dialog.open; },
    show({ name, color, saved, write, done }) {
      const rgba = resolve(color); if (!rgba) return;
      hsv = model.toHSV(rgba);
      original = saved;
      context = { write, done };
      changed = hasWritten = closing = false;
      writes = Promise.resolve();
      format = /^#/i.test(color.trim()) && rgba.a === 1 ? 'hex' : 'rgba';
      $('color-format').value = format;
      $('color-token').textContent = name;
      $('color-feedback').textContent = 'Изменения сразу видны на странице';
      update();
      dialog.showModal();
      $('color-sv').focus();
    }
  };
  const area = $('color-sv');
  function point(event) {
    const box = area.getBoundingClientRect();
    hsv.s = model.clamp((event.clientX - box.left) / box.width);
    hsv.v = 1 - model.clamp((event.clientY - box.top) / box.height);
    change();
  }
  area.onpointerdown = event => { if (event.button !== 0) return; area.setPointerCapture(event.pointerId); point(event); };
  area.onpointermove = event => { if (area.hasPointerCapture(event.pointerId)) point(event); };
  area.onpointerup = event => { if (area.hasPointerCapture(event.pointerId)) area.releasePointerCapture(event.pointerId); };
  area.onkeydown = event => {
    const step = event.shiftKey ? .1 : .01;
    if (event.key === 'ArrowRight') hsv.s = model.clamp(hsv.s + step);
    else if (event.key === 'ArrowLeft') hsv.s = model.clamp(hsv.s - step);
    else if (event.key === 'ArrowUp') hsv.v = model.clamp(hsv.v + step);
    else if (event.key === 'ArrowDown') hsv.v = model.clamp(hsv.v - step);
    else return;
    event.preventDefault(); change();
  };
  $('color-hue').oninput = () => { hsv.h = Number($('color-hue').value); change(); };
  $('color-alpha').oninput = () => { hsv.a = Number($('color-alpha').value) / 100; change(); };
  $('color-alpha-number').oninput = () => {
    const value = $('color-alpha-number').valueAsNumber;
    if (!Number.isFinite(value) || value < 0 || value > 100) return;
    hsv.a = value / 100; change('alpha-number');
  };
  for (const component of ['r', 'g', 'b']) $(`color-${component}`).oninput = () => {
    const value = $(`color-${component}`).valueAsNumber;
    if (!Number.isFinite(value) || value < 0 || value > 255) return;
    const color = model.fromHSV(hsv); color[component] = Math.round(value);
    const next = model.toHSV(color); if (!next.s) next.h = hsv.h;
    hsv = next; change(component);
  };
  $('color-hex').oninput = () => {
    const color = model.parse($('color-hex').value);
    if (!color) return;
    if (/^#(?:[a-f\d]{3}|[a-f\d]{6})$/i.test($('color-hex').value)) color.a = hsv.a;
    hsv = model.toHSV(color); change('hex');
  };
  $('color-value').onchange = () => {
    const color = resolve($('color-value').value);
    if (!color) { $('color-feedback').textContent = 'Введите CSS-цвет'; return; }
    hsv = model.toHSV(color); change('value');
  };
  $('color-format').onchange = () => { format = $('color-format').value; update(); };
  $('color-done').onclick = () => finish();
  $('color-cancel').onclick = () => finish(true);
  dialog.addEventListener('cancel', event => { event.preventDefault(); finish(true); });
})();
