const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = vm.createContext({});
for (const file of ['core.js', 'css-io.js']) vm.runInContext(fs.readFileSync(`${__dirname}/${file}`, 'utf8'), context);
const io = context.OsnovaCSS;
const origin = 'https://themes-gta.dtf.osnova.app';
const data = { version: 1, origin, theme: 'gta', profileName: 'Лес */\n🌲: 100%', changes: { light: { '--theme-color-accent': '#00ff00', '--theme-image-pattern': 'url("data:image/svg+xml;base64,PHN2Zy8+")' }, dark: { '--theme-color-media-border': 'rgba(255, 255, 255, .07)', '--theme-gradient-pattern': 'linear-gradient(135deg, #fff, #333)' } } };
assert.deepEqual(JSON.parse(JSON.stringify(io.import(io.export(data), origin))), data);
const legacy = ':root[data-theme="gta"][data-color-mode="dark"] { --theme-color-accent: red !important; }';
assert.equal(io.import(legacy, origin).changes.dark['--theme-color-accent'], 'red');
assert.equal(io.import(io.export({ ...data, profileName: null, changes: { light: {}, dark: {} } }), origin).theme, 'gta');
for (const css of [
  'body { color:red; }',
  '@import "https://example.com/a.css";',
  ':root[data-theme="gta"][data-color-mode="dark"] { color: red; }',
  ':root[data-theme="gta"][data-color-mode="dark"] { --theme-color-accent: url("https://example.com/x"); }',
  legacy + ':root[data-theme="classic"][data-color-mode="dark"] { --x:red; }',
  ':root[data-theme="gta"][data-color-mode="dark"] { --x: rgb(0,0,0; }',
  '/* nothing */'
]) assert.throws(() => io.import(css, origin));
assert.throws(() => io.import(io.export(data), 'https://other.test'));
console.log('Passed: CSS round trip, two modes, Unicode names, image data URLs, empty changes, legacy CSS, unsafe rules and mixed themes rejected.');

const safari = io.export({ ...data, browserColors: { light: '#D9F0FF', dark: '#123456' } });
assert.ok(safari.includes('<meta name="theme-color" content="#D9F0FF" media="(prefers-color-scheme: light)">'));
assert.ok(safari.includes('<meta name="theme-color" content="#123456" media="(prefers-color-scheme: dark)">'));
assert.deepEqual(JSON.parse(JSON.stringify(io.import(safari, origin))), data, 'HTML integration notes do not affect palette import');
assert.ok(!io.export({ ...data, browserColors: { light: '\"/><script>' } }).includes('<script>'));
console.log('Passed: Safari colors for both schemes, safe HTML examples, CSS import compatibility.');
