const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(`${__dirname}/pattern-state.js`, 'utf8'), context);
const api = context.OsnovaPatternState;
const base = 'linear-gradient(70deg, #d64f20 10%, #a61ec2 90%)';
const normalize = x => x.toLowerCase();
let ui = api.read(base, base, null, normalize);
const toggle = enabled => {
  ui = api.change(ui, { kind: 'toggle', first: ui.first, second: ui.second, enabled });
  ui = api.read(ui.css, base, JSON.parse(JSON.stringify(ui)), normalize);
};
for (let i = 0; i < 4; i++) {
  toggle(false);
  assert.equal(ui.enabled, false);
  assert.equal(ui.second, '#a61ec2', 'turning off does not overwrite second color');
  toggle(true);
  assert.equal(ui.enabled, true);
  assert.equal(ui.css, base, 'full original angle and stops are restored');
}
toggle(false);
ui = api.change(ui, { kind: 'color', first: ui.first, second: '#abcdef', enabled: false });
toggle(true);
assert.equal(ui.css, 'linear-gradient(135deg, #d64f20, #abcdef)');
ui = api.change(ui, { kind: 'color', first: '#ffffff', second: '#ffffff', enabled: true });
ui = api.read(ui.css, base, ui, normalize);
assert.equal(ui.enabled, true, 'gradient toggle must work even when both colors match');
const recovered = api.read('linear-gradient(#d64f20, #d64f20)', base, null, normalize);
assert.equal(recovered.second, '#a61ec2', 'older broken solid fills recover a usable second color from baseline');
assert.equal(api.read(base, base, ui, normalize).css, base, 'external token changes invalidate stale UI state');
console.log('Passed: repeated off/on, exact gradient restoration, second-color persistence, edits while off, equal colors, legacy recovery and stale-state invalidation.');
