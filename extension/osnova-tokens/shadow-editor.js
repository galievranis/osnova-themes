(() => {
  const $ = id => document.getElementById(id);
  const dialog = $('shadow-editor');
  let context, layers, effectiveLayers, original, originalText, timer;
  let writes = Promise.resolve();
  let changed = false, wrote = false, closing = false;
  function output() { return changed ? OsnovaShadow.serialize(layers) : originalText; }
  function draw() {
    const value = output();
    $('shadow-preview-box').style.boxShadow = context.resolve(value);
    $('shadow-value').value = value;
  }
  function queue(value) {
    wrote = true; const target = context;
    writes = writes.catch(() => {}).then(() => target.write(value)).then(() => { $('shadow-feedback').textContent = 'Сохранено'; });
    writes.catch(error => { $('shadow-feedback').textContent = error.message; });
    return writes;
  }
  function change() {
    changed = true; draw(); clearTimeout(timer);
    $('shadow-feedback').textContent = 'Предпросмотр…';
    timer = setTimeout(() => queue(output()), 90);
  }
  function render() {
    $('shadow-layers').replaceChildren();
    layers.forEach((layer, index) => {
      const card = document.createElement('section'); card.className = 'shadow-layer';
      const heading = document.createElement('div'); heading.className = 'shadow-layer-heading';
      const title = document.createElement('strong'); title.textContent = `Слой ${index + 1}`; heading.append(title);
      const bottom = document.createElement('div'); bottom.className = 'shadow-layer-bottom';
      const color = document.createElement('button'); color.type = 'button'; color.className = 'shadow-color';
      color.setAttribute('aria-label', `Цвет тени, слой ${index + 1}`);
      const sample = document.createElement('span'); sample.className = 'shadow-color-sample checker';
      const paint = document.createElement('span'); paint.style.background = context.resolve(layer.color); sample.append(paint);
      const text = document.createElement('span'); text.textContent = layer.color;
      color.append(sample, text);
      color.onclick = () => {
        const previous = { ...layer };
        const resolved = context.resolve(layer.color);
        const colorValue = OsnovaPicker.parse(resolved) ? resolved : effectiveLayers[index]?.color || '#000000';
        OsnovaPicker.show({ name: `Слой ${index + 1} · цвет тени`, color: colorValue, saved: layer.color,
          write: async value => {
            if (value === previous.color) Object.assign(layer, previous);
            else { layer.color = value; layer.dirty = true; }
            changed = true; draw(); clearTimeout(timer); await queue(output());
          }, done: async () => { draw(); render(); }
        });
      };
      bottom.append(color); card.append(heading, bottom); $('shadow-layers').append(card);
    });
    if (!layers.length) { const empty = document.createElement('p'); empty.className = 'hint'; empty.textContent = 'У этой тени нет цветовых слоёв.'; $('shadow-layers').append(empty); }
    draw();
  }
  async function finish(cancel) {
    if (!context || closing) return;
    closing = true; clearTimeout(timer);
    try {
      if (cancel) { await writes.catch(() => {}); if (wrote) await context.write(original); }
      else if (changed) await queue(output());
      else await writes;
      const done = context.done; context = null; dialog.close(); await done();
    } catch (error) { $('shadow-feedback').textContent = error.message; }
    finally { closing = false; }
  }
  globalThis.OsnovaShadowEditor = {
    get open() { return dialog.open; },
    show(options) {
      let parsed;
      try { parsed = OsnovaShadow.parse(options.value); }
      catch { parsed = OsnovaShadow.parse(options.effective); }
      effectiveLayers = OsnovaShadow.parse(options.effective);
      context = options; layers = parsed; original = options.saved; originalText = options.value;
      changed = wrote = closing = false; writes = Promise.resolve();
      $('shadow-token').textContent = options.name;
      $('shadow-feedback').textContent = 'Меняются только цвет и прозрачность';
      render(); dialog.showModal();
    }
  };
  $('shadow-done').onclick = () => finish(false);
  $('shadow-cancel').onclick = () => finish(true);
  dialog.addEventListener('cancel', event => { event.preventDefault(); finish(true); });
})();
