const $ = id => document.getElementById(id);
let state;
let mode;
let tabId;
let busy = false;
let focused = false;
let followSite = true;
const api = OsnovaTokens;

function showError(error) { $('error').hidden = !error; $('error').textContent = error || ''; }
async function request(type = 'get', extra = {}) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) throw new Error('Откройте вкладку стейджа.');
  const result = await chrome.tabs.sendMessage(tab.id, { target: 'osnova-tokens', type, ...extra }).catch(() => {
    throw new Error('Откройте themes-gta.dtf.osnova.app и обновите страницу после установки расширения.');
  });
  if (!result?.ok) throw new Error(result?.error || 'Нет ответа от страницы');
  if (tabId !== tab.id || state?.theme !== result.data.theme) { followSite = true; mode = result.data.mode; }
  tabId = tab.id;
  state = result.data;
  if (followSite) mode = state.mode;
  showError('');
  return state;
}
function changes() {
  return Object.fromEntries(['light', 'dark'].map(scheme => [scheme, api.diff(state.baseline[scheme], state.edits[scheme])]));
}
function render() {
  if (!state) return;
  const selectedProfile = state.profileId || '';
  const options = [{ id: '', name: `Тема сайта · ${state.theme}` }, ...(state.profiles || [])];
  if (JSON.stringify(options) !== $('profile').dataset.options) {
    $('profile').replaceChildren(...options.map(item => { const option = document.createElement('option'); option.value = item.id; option.textContent = item.name; return option; }));
    $('profile').dataset.options = JSON.stringify(options);
  }
  $('profile').value = selectedProfile;
  $('rename-profile').disabled = !selectedProfile;
  $('inspect').textContent = state.inspecting ? 'Esc · отмена' : '⌖ Инспектор';
  $('inspection').hidden = !state.inspection;
  $('selection-label').textContent = state.inspection ? `${state.inspection.label} · ${state.inspection.tokens.length} токенов` : '';
  renderPattern();
  $('enabled').checked = state.enabled;
  for (const item of ['light', 'dark']) $(item).setAttribute('aria-pressed', String(mode === item));
  $('mode-hint').textContent = mode === state.mode ? 'Предпросмотр на сайте совпадает с выбранной схемой.' : 'Редактируете другую схему. Для предпросмотра переключите режим на сайте.';
  const query = $('search').value.trim().toLowerCase();
  const diff = changes();
  const names = state.names.filter(name => {
    if (state.inspection && !state.inspection.tokens.includes(name)) return false;
    const group = state.inspection ? 'all' : $('group').value;
    if (group === 'theme' && !name.startsWith('--theme-')) return false;
    if (group === 'gray' && !/gray/.test(name)) return false;
    if ($('changed').checked && !Object.hasOwn(diff[mode], name)) return false;
    return `${name} ${state.baseline[mode][name] || ''} ${state.raw[mode][name] || ''} ${state.edits[mode][name] || ''}`.toLowerCase().includes(query);
  });
  $('summary').textContent = `${names.length} токенов · изменено ${Object.keys(diff.light).length} светлых / ${Object.keys(diff.dark).length} тёмных`;
  const fragment = document.createDocumentFragment();
  for (const name of names) {
    const available = Object.hasOwn(state.baseline[mode], name);
    const edited = Object.hasOwn(diff[mode], name);
    const row = document.createElement('div'); row.className = `token${edited ? ' edited' : ''}`;
    const label = document.createElement('label'); label.className = 'name'; label.textContent = name;
    const values = document.createElement('div'); values.className = 'values';
    const value = state.edits[mode][name] ?? state.raw[mode][name] ?? state.baseline[mode][name] ?? '';
    const color = mode === state.mode ? state.effective[name] : state.edits[mode][name] ?? state.baseline[mode][name];
    const swatch = document.createElement('button'); swatch.type = 'button'; swatch.className = 'swatch checker';
    swatch.setAttribute('aria-label', `Выбрать цвет ${name}`);
    const isShadow = name.startsWith('--theme-shadow-');
    const parsed = !isShadow && OsnovaPicker.parse(color);
    if (isShadow) { swatch.setAttribute('aria-label', `Редактировать тень ${name}`); swatch.title = 'Редактор тени'; }
    const fill = document.createElement('span'); fill.className = 'swatch-fill';
    if (parsed) fill.style.background = OsnovaColor.rgba(parsed);
    else fill.textContent = isShadow ? '▣' : '—';
    swatch.append(fill);
    swatch.disabled = !available || (!isShadow && !parsed);
    const input = document.createElement('input'); input.className = 'value'; input.value = value.length > 4000 ? '' : value; input.placeholder = value.length > 4000 ? 'Встроенное изображение · настройте в разделе паттерна' : ''; input.disabled = !available || value.length > 4000; input.spellcheck = false; input.readOnly = isShadow;
    if (isShadow) input.title = 'Для тени меняются только цвет и прозрачность — нажмите образец';
    label.htmlFor = input.id = `token-${name}`;
    const rowMode = mode;
    input.addEventListener('focus', () => { focused = true; });
    input.addEventListener('blur', () => { focused = false; });
    const save = async value => {
      try { await request('set', { mode: rowMode, name, value }); $('status').textContent = 'Сохранено в браузере'; render(); }
      catch (error) { showError(error.message); }
    };
    input.addEventListener('change', () => save(input.value));
    input.addEventListener('keydown', event => { if (event.key === 'Enter') input.blur(); });
    swatch.addEventListener('click', () => {
      const expected = { theme: state.theme, profileId: state.profileId };
      const targetTab = tabId;
      const write = async value => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id !== targetTab) throw new Error('Вернитесь к исходной вкладке для сохранения');
        await request('set', { mode: rowMode, name, value, expected });
      };
      if (isShadow) {
        try { OsnovaShadowEditor.show({ name, value, effective: color, saved: state.edits[rowMode][name] ?? null, write,
          resolve: value => value.replace(/var\(\s*(--[\w-]+)\s*\)/g, (match, token) => state.effective[token] || state.baseline[rowMode][token] || match),
          done: async () => { await request(); render(); }
        }); } catch (error) { showError(error.message); }
        return;
      }
      OsnovaPicker.show({ name, color, saved: state.edits[rowMode][name] ?? null,
        write: async value => {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab?.id !== targetTab) throw new Error('Вернитесь к исходной вкладке для сохранения цвета');
          await request('set', { mode: rowMode, name, value, expected });
        },
        done: async () => { await request(); render(); }
      });
    });
    values.append(swatch, input);
    if (edited) { const reset = document.createElement('button'); reset.textContent = '↶'; reset.className = 'reset-one'; reset.title = 'Вернуть исходное'; reset.addEventListener('click', () => save(null)); values.append(reset); }
    const original = document.createElement('div'); original.className = 'original';
    original.textContent = (available ? `Исходное: ${state.raw[mode][name] || state.baseline[mode][name]}${state.raw[mode][name]?.includes('var(') ? ` → ${state.baseline[mode][name]}` : ''}` : 'Локальная переменная компонента — не задана на корневом элементе').slice(0, 220);
    row.append(label, values, original); fragment.append(row);
  }
  if (!names.length) { const empty = document.createElement('p'); empty.className = 'empty'; empty.textContent = 'Нет подходящих токенов'; fragment.append(empty); }
  $('tokens').replaceChildren(fragment);
  $('coverage').textContent = state.blocked.length ? `Недоступны для чтения ${state.blocked.length} таблиц CSS. Список может быть неполным: ${state.blocked.join(', ')}` : 'Прочитаны доступные таблицы CSS и переменные корневого элемента. Локальные переменные компонентов отмечены отдельно.';
}
async function refresh(type) {
  if (busy || focused || OsnovaPicker.open || OsnovaShadowEditor.open) return;
  busy = true;
  try { const signature = data => JSON.stringify(data && { theme: data.theme, mode: data.mode, edits: data.edits, enabled: data.enabled, baseline: data.baseline, names: data.names, blocked: data.blocked, profileId: data.profileId, profiles: data.profiles, inspecting: data.inspecting, inspection: data.inspection, patternUI: data.patternUI }); const before = signature(state); await request(type); if (signature(state) !== before || type === 'rescan') render(); } catch (error) { showError(error.message); }
  finally { busy = false; }
}
for (const item of ['light', 'dark']) $(item).onclick = async () => { try { mode = item; followSite = true; await request('set-mode', { mode: item }); render(); } catch (error) { showError(error.message); } };
$('search').oninput = render; $('group').onchange = render; $('changed').onchange = render;
$('refresh').onclick = () => refresh('rescan');
$('enabled').onchange = async () => { try { await request('enabled', { value: $('enabled').checked }); render(); } catch (error) { showError(error.message); } };
$('reset').onclick = async () => {
  if (!state || !confirm('Сбросить изменения обеих схем текущей темы?')) return;
  try { await request('reset'); render(); } catch (error) { showError(error.message); }
};
function download(text, filename, mime) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
$('css').onclick = async () => {
  $('css').disabled = true;
  try {
    await request('export-info');
    const data = { origin: state.origin, theme: state.theme, profileId: state.profileId, profileName: state.profileName, browserColors: state.browserColors, changes: await portableChanges() };
    // Validate before reserving a version, so malformed values don't consume numbers.
    OsnovaCSS.export(data);
    const result = await chrome.runtime.sendMessage({ target: 'osnova-export-version', origin: data.origin, theme: data.theme, profileId: data.profileId, name: data.profileName || data.theme });
    if (!result?.ok) throw new Error(result?.error || 'Не удалось определить версию экспорта');
    download(OsnovaCSS.export({ ...data, exportVersion: result.version }), result.filename, 'text/css');
    $('status').textContent = `Экспортирован ${result.filename}`;
  } catch (error) { showError(error.message); }
  finally { $('css').disabled = false; }
};
$('import').onclick = () => $('file').click();
$('file').onchange = async () => {
  try {
    const file = $('file').files[0]; if (!file) return;
    if (file.size > 8000000) throw new Error('Файл слишком большой');
    await request();
    const data = OsnovaCSS.import(await file.text(), state.origin);
    await request('import', { data }); render(); $('status').textContent = 'Обе схемы импортированы и сохранены';
  } catch (error) { showError(error.message); }
  finally { $('file').value = ''; }
};
chrome.tabs.onActivated.addListener(() => refresh());
setInterval(() => { if (!document.hidden && !document.activeElement?.matches('input,select')) refresh(); }, 700);
refresh();

$('create-profile').onclick = async () => {
  const name = prompt('Название новой темы на основе Классики', 'Моя тема');
  if (!name) return;
  try { await request('create-profile', { name }); render(); } catch (error) { showError(error.message); }
};
$('profile').onchange = async () => { try { await request('select-profile', { id: $('profile').value }); render(); } catch (error) { showError(error.message); } };
$('rename-profile').onclick = async () => {
  const name = prompt('Название темы', state?.profileName || ''); if (!name) return;
  try { await request('rename-profile', { name }); render(); } catch (error) { showError(error.message); }
};
$('inspect').onclick = async () => { try { await request(state?.inspecting ? 'clear-inspection' : 'inspect'); render(); } catch (error) { showError(error.message); } };
$('clear-inspection').onclick = async () => { try { await request('clear-inspection'); render(); } catch (error) { showError(error.message); } };
function tokenValue(name) { return state.edits[mode][name] ?? state.baseline[mode][name] ?? ''; }
function renderPattern() {
  const image = tokenValue('--theme-image-pattern');
  const opacity = tokenValue('--theme-opacity-pattern');
  let kind = 'original';
  if (Number(opacity) === 0) kind = 'none';
  else if (state.edits[mode]['--theme-image-pattern']) kind = ['gta', 'games', 'dtf'].find(id => image.includes(`/patterns/${id}.svg`)) || 'custom';
  $('pattern').value = kind;
  $('pattern-size').value = parseFloat(tokenValue('--theme-size-pattern')) || 550;
  $('pattern-opacity').value = Math.round((parseFloat(opacity) || 0) * 100);
  const ui = patternState();
  $('pattern-color').value = ui.first;
  $('pattern-color-2').value = ui.second;
  $('pattern-gradient').checked = ui.enabled;
}
function patternState() {
  const normalize = value => {
    const color = OsnovaPicker.parse(value);
    return color ? OsnovaColor.hex(color, false).toLowerCase() : null;
  };
  return OsnovaPatternState.read(tokenValue('--theme-gradient-pattern'), state.baseline[mode]['--theme-gradient-pattern'] || '', state.patternUI?.[mode], normalize);
}
async function setPattern(values, patternUI) {
  try { await request('set-many', { mode, values, patternUI }); render(); $('status').textContent = 'Паттерн сохранён'; } catch (error) { showError(error.message); }
}
$('pattern').onchange = async () => {
  const id = $('pattern').value;
  if (id === 'upload') { $('pattern-file').click(); renderPattern(); return; }
  if (id === 'original') {
    try { for (const name of ['--theme-image-pattern', '--theme-opacity-pattern']) await request('set', { mode, name, value: null }); render(); } catch (error) { showError(error.message); }
    return;
  }
  if (id === 'none') { await setPattern({ '--theme-opacity-pattern': '0' }); return; }
  await setPattern({ '--theme-image-pattern': `url("${chrome.runtime.getURL(`patterns/${id}.svg`)}")`, '--theme-size-pattern': `${$('pattern-size').value || 550}px`, '--theme-opacity-pattern': String(Number($('pattern-opacity').value || (mode === 'light' ? 10 : 15)) / 100) });
};
for (const id of ['pattern-color', 'pattern-color-2', 'pattern-gradient']) $(id).onchange = () => {
  const ui = OsnovaPatternState.change(patternState(), {
    kind: id === 'pattern-gradient' ? 'toggle' : 'color',
    first: $('pattern-color').value, second: $('pattern-color-2').value, enabled: $('pattern-gradient').checked
  });
  setPattern({ '--theme-gradient-pattern': ui.css }, ui);
};
$('pattern-size').onchange = () => { const n = Number($('pattern-size').value); if (n >= 20 && n <= 2000) setPattern({ '--theme-size-pattern': `${n}px` }); };
$('pattern-opacity').onchange = () => { const n = Number($('pattern-opacity').value); if (n >= 0 && n <= 100) setPattern({ '--theme-opacity-pattern': String(n / 100) }); };
$('pattern-reset').onclick = async () => {
  try { for (const name of ['--theme-image-pattern', '--theme-gradient-pattern', '--theme-size-pattern', '--theme-opacity-pattern']) await request('set', { mode, name, value: null }); render(); } catch (error) { showError(error.message); }
};
function dataUrl(blob) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).replace(/^data:image\/svg\+xml[^,]*;base64,/, 'data:image/svg+xml;base64,')); reader.onerror = reject; reader.readAsDataURL(blob); }); }
$('pattern-file').onchange = async () => {
  try {
    const file = $('pattern-file').files[0]; if (!file) return;
    if (file.size > 1500000) throw new Error('Выберите изображение до 1,5 МБ');
    let blob = file;
    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
      const doc = new DOMParser().parseFromString(await file.text(), 'image/svg+xml');
      if (doc.querySelector('parsererror') || doc.documentElement.localName !== 'svg') throw new Error('Не удалось прочитать SVG');
      for (const node of doc.querySelectorAll('script,foreignObject,image,style,animate,animateTransform,set')) node.remove();
      for (const node of doc.querySelectorAll('*')) for (const attr of [...node.attributes]) {
        if (/^on/i.test(attr.name) || (/href$/i.test(attr.name) && !attr.value.startsWith('#')) || /(?:https?:|javascript:|@import)/i.test(attr.value)) node.removeAttribute(attr.name);
      }
      blob = new Blob([new XMLSerializer().serializeToString(doc)], { type: 'image/svg+xml' });
    } else if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Поддерживаются SVG, PNG, JPEG и WebP');
    await setPattern({ '--theme-image-pattern': `url("${await dataUrl(blob)}")`, '--theme-opacity-pattern': mode === 'light' ? '.1' : '.15', '--theme-size-pattern': '550px' });
  } catch (error) { showError(error.message); }
  finally { $('pattern-file').value = ''; }
};
async function portableChanges() {
  const result = changes();
  for (const scheme of ['light', 'dark']) {
    const value = result[scheme]['--theme-image-pattern'];
    const match = value?.match(/chrome-extension:\/\/[^/]+\/patterns\/(gta|games|dtf)\.svg/);
    if (match) {
      const response = await fetch(chrome.runtime.getURL(`patterns/${match[1]}.svg`));
      if (!response.ok) throw new Error('Не удалось встроить рисунок в экспорт');
      result[scheme]['--theme-image-pattern'] = `url("${await dataUrl(await response.blob())}")`;
    }
  }
  return result;
}

document.addEventListener('keydown', async event => {
  if (event.key === 'Escape' && state?.inspecting) {
    try { await request('clear-inspection'); render(); } catch (error) { showError(error.message); }
  }
});

$('contrast-check').onclick = async () => {
  $('contrast-check').disabled = true;
  try {
    await request('audit-contrast');
    const report = state.contrastAudit;
    const title = document.createElement('p'); title.textContent = `${report.mode === 'dark' ? 'Тёмная' : 'Светлая'}: ${report.results.length} проверок, нарушений ${report.failures}`;
    const list = document.createElement('ul');
    for (const item of report.results) {
      const line = document.createElement('li'); line.textContent = `${item.pass ? '✓' : '✕'} ${item.label}: ${item.ratio}:1 (≥${item.minimum}:1)`; line.className = item.pass ? 'contrast-pass' : 'contrast-fail'; list.append(line);
    }
    $('contrast-result').replaceChildren(title, list);
  } catch (error) { showError(error.message); }
  finally { $('contrast-check').disabled = false; }
};
