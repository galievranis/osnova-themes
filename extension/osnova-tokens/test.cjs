const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const sources = name => fs.readFileSync(path.join(__dirname, name), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
function style(values) {
  const result = { ...values, getPropertyValue: name => values[name] || '', [Symbol.iterator]: function* () { yield* Object.keys(values); } };
  return result;
}
async function page(saved = {}) {
  const attributes = { 'data-theme': 'gta', 'data-color-mode': 'light' };
  const listeners = [];
  const storageListeners = [];
  const observers = [];
  const eventHandlers = new Map();
  const root = {
    dataset: { theme: 'gta', colorMode: 'light' }, style: style({}), parentElement: null, append() {},
    getAttribute: name => attributes[name] ?? null,
    setAttribute(name, value) { attributes[name] = value; this.dataset[name === 'data-theme' ? 'theme' : 'colorMode'] = value; },
    removeAttribute(name) { delete attributes[name]; },
    matches: selector => selector === ':root' || selector === `:root[data-color-mode="${root.dataset.colorMode}"]`
  };
  const override = { dataset: {}, disabled: false, textContent: '', sheet: {} };
  const sheet = { cssRules: [
    { selectorText: ':root', style: style({ '--gray-0': '#000000', '--theme-color-text': 'var(--gray-0)', '--theme-color-accent': '#0055cc', '--theme-gradient-pattern': 'linear-gradient(#112233, #445566)' }) },
    { selectorText: ':root[data-color-mode="dark"]', style: style({ '--theme-color-text': '#ffffff', '--theme-color-accent': '#88aaff' }) },
    { selectorText: '.radio__box', style: style({ background: 'var(--theme-color-accent)', color: 'var(--theme-color-text)' }) },
    { selectorText: '.component', style: style({ '--local-color': '#123456' }) }
  ] };
  const context = {
    console, setTimeout, clearTimeout, crypto: require('node:crypto').webcrypto,
    location: { origin: 'https://themes-gta.dtf.osnova.app' },
    document: { documentElement: root, head: { append() {} }, createElement: tag => tag === 'style' ? override : { style: {}, setAttribute() {}, remove() {} }, styleSheets: [sheet], addEventListener() {} },
    MutationObserver: class { constructor(fn) { observers.push(fn); } observe() {} },
    CSSRule: { MEDIA_RULE: 4, SUPPORTS_RULE: 12 }, CSS: { supports: () => true }, matchMedia: () => ({ matches: true }),
    getComputedStyle() {
      const values = { '--theme-gradient-pattern': 'linear-gradient(#112233, #445566)', '--gray-0': '#000000', '--theme-color-text': root.dataset.colorMode === 'dark' ? '#ffffff' : '#000000', '--theme-color-accent': root.dataset.colorMode === 'dark' ? '#88aaff' : '#0055cc' };
      return style(values);
    },
    window: { addEventListener: (name, fn) => eventHandlers.set(name, fn), removeEventListener: name => eventHandlers.delete(name) },
    chrome: {
      runtime: { sendMessage: async () => ({ ok: true }), onMessage: { addListener(fn) { listeners.push(fn); } } },
      storage: {
        local: { async get(key) { return { [key]: saved[key] }; }, async set(data) { Object.assign(saved, data); for (const fn of storageListeners) fn(Object.fromEntries(Object.entries(data).map(([key, newValue]) => [key, { newValue }])), 'local'); } },
        onChanged: { addListener(fn) { storageListeners.push(fn); } }
      }
    }
  };
  vm.createContext(context); vm.runInContext(sources('core.js'), context); vm.runInContext(sources('content.js'), context);
  await tick();
  return { context, root, override, saved, eventHandlers, async send(type, extra = {}) { return new Promise(resolve => listeners[0]({ target: 'osnova-tokens', type, ...extra }, {}, resolve)); } };
}
(async () => {
  const p = await page();
  let result = await p.send('get');
  assert.equal(result.ok, true);
  assert.equal(result.data.baseline.light['--theme-color-text'], '#000000');
  assert.equal(result.data.baseline.dark['--theme-color-text'], '#ffffff');
  assert.equal(p.root.dataset.colorMode, 'light', 'reading both modes restores the page');
  assert.ok(result.data.names.includes('--local-color'), 'component variables are discoverable');
  assert.equal(result.data.baseline.light['--local-color'], undefined, 'scoped tokens are not treated as global');
  await p.send('set', { mode: 'light', name: '--theme-color-accent', value: '#ff0000' });
  result = await p.send('set', { mode: 'dark', name: '--theme-color-accent', value: '#00ff00' });
  assert.equal(result.data.edits.light['--theme-color-accent'], '#ff0000');
  assert.equal(result.data.edits.dark['--theme-color-accent'], '#00ff00');
  assert.match(p.override.textContent, /data-color-mode="light".*#ff0000/);
  assert.match(p.override.textContent, /data-color-mode="dark".*#00ff00/);
  const reloaded = await page(p.saved);
  assert.equal((await reloaded.send('get')).data.edits.dark['--theme-color-accent'], '#00ff00', 'edits survive reload');
  result = await p.send('set', { mode: 'light', name: '--theme-color-accent', value: 'red;}body{display:none' });
  assert.equal(result.ok, false, 'CSS injection is rejected');
  result = await p.send('set', { mode: 'light', name: '--local-color', value: '#ffffff' });
  assert.equal(result.ok, false, 'scoped token cannot accidentally override every component');
  await p.send('enabled', { value: false }); assert.equal(p.override.textContent, '');
  await p.send('enabled', { value: true }); assert.match(p.override.textContent, /#ff0000/);
  result = await p.send('import', { data: { version: 1, origin: 'https://other.test', theme: 'gta', changes: { light: {}, dark: {} } } });
  assert.equal(result.ok, false, 'import does not cross origins');
  result = await p.send('get');
  const api = p.context.OsnovaTokens;
  const delta = { light: api.diff(result.data.baseline.light, result.data.edits.light), dark: api.diff(result.data.baseline.dark, result.data.edits.dark) };
  assert.equal(Object.keys(delta.light).length, 1);
  assert.ok(!api.css('gta', delta).includes('--gray-0'), 'export includes only edits');
  await p.send('set', { mode: 'light', name: '--theme-color-accent', value: '#0055cc' });
  assert.equal(Object.keys((await p.send('get')).data.edits.light).length, 0, 'original value removes change');
  await p.send('reset');
  result = await p.send('get');
  assert.equal(Object.keys(result.data.edits.dark).length, 0);
  await p.send('set', { mode: 'light', name: '--theme-color-accent', value: '#aabbcc' });
  result = await p.send('create-profile', { name: 'Лес' });
  assert.equal(result.ok, true);
  const forest = result.data.profileId;
  assert.equal(result.data.profileName, 'Лес');
  assert.equal(result.data.theme, 'classic', 'new themes always use Classic');
  assert.equal(Object.keys(result.data.edits.light).length, 0, 'new themes do not inherit edits from GTA or other selected themes');
  await p.send('set', { mode: 'dark', name: '--theme-color-accent', value: '#334455' });
  result = await p.send('rename-profile', { name: 'Хвойный лес' });
  assert.equal(result.data.profileName, 'Хвойный лес');
  const customReloaded = await page(p.saved);
  result = await customReloaded.send('get');
  assert.equal(result.data.profileId, forest, 'custom theme survives navigation');
  assert.equal(result.data.edits.dark['--theme-color-accent'], '#334455');
  result = await p.send('select-profile', { id: null });
  assert.equal(result.data.profileId, null);
  assert.equal(result.data.edits.dark['--theme-color-accent'], undefined, 'original theme has independent edits');
  result = await p.send('select-profile', { id: forest });
  assert.equal(result.data.edits.dark['--theme-color-accent'], '#334455');
  result = await p.send('import', { data: { version: 1, origin: p.context.location.origin, theme: 'classic', profileName: 'Импортированная', changes: { light: { '--theme-color-accent': '#123123' }, dark: {} } } });
  assert.equal(result.data.profileName, 'Импортированная');
  p.root.setAttribute('data-theme', 'gta');
  result = await p.send('get');
  assert.equal(result.data.profileName, 'Импортированная', 'site initialization cannot silently deactivate selected custom theme');
  assert.equal(p.root.dataset.theme, 'classic');
  assert.notEqual(result.data.profileId, forest, 'imported named theme does not overwrite another custom theme');
  assert.equal(api.validate('--theme-image-pattern', 'url("data:image/svg+xml;base64,PHN2Zy8+")'), true);
  assert.equal(api.validate('--theme-image-pattern', 'url("https://tracker.test/x.svg")'), false);
  assert.equal(api.validate('--theme-color-accent', 'url("data:image/png;base64,AAAA")'), false);
  await p.send('inspect');
  const visual = { style: style({}), matches: selector => selector === '.radio__box' };
  const control = { style: style({}), parentElement: p.root, matches: () => false, querySelectorAll: () => [visual] };
  const input = { tagName: 'INPUT', id: '', classList: ['radio__input'], style: style({}), parentElement: control, closest: () => control, matches: () => false };
  p.eventHandlers.get('click')({ target: input, preventDefault() {}, stopImmediatePropagation() {} });
  result = await p.send('get');
  assert.ok(result.data.inspection.tokens.includes('--theme-color-accent'), 'inspector resolves visual siblings of hidden inputs');
  assert.ok(result.data.inspection.tokens.includes('--gray-0'), 'inspector follows variable aliases');
  assert.equal(result.data.inspecting, false);
  await p.send('clear-inspection');
  assert.equal((await p.send('get')).data.inspection, null);
  const patternUI = { enabled: false, first: '#112233', second: '#445566', css: 'linear-gradient(#112233, #112233)', gradient: 'linear-gradient(#112233, #445566)' };
  result = await p.send('set-many', { mode: 'light', values: { '--theme-gradient-pattern': patternUI.css }, patternUI });
  assert.equal(result.ok, true);
  assert.equal(result.data.patternUI.light.second, '#445566');
  const patternReloaded = await page(p.saved);
  assert.equal((await patternReloaded.send('get')).data.patternUI.light.gradient, patternUI.gradient, 'disabled gradient memory survives a page reload');
  await p.send('set', { mode: 'light', name: '--theme-gradient-pattern', value: null });
  assert.equal((await p.send('get')).data.patternUI.light, undefined, 'reset clears stale pattern editor preferences');
  console.log('Passed: saved pattern UI, reload persistence and reset;');
  console.log('Passed: inspector control siblings and transitive aliases;');
  console.log('Passed: custom themes, profile isolation, profile persistence, rename, named import, safe pattern values;');
  console.log('Passed: mode capture, scoped tokens, separate palettes, persistence, overrides, validation, origin isolation, diff/export, reset.');
})().catch(error => { console.error(error); process.exitCode = 1; });
