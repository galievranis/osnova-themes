const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(`${__dirname}/color.js`, 'utf8'), context);
const color = context.OsnovaColor;
const rgba = color.parse('rgba(255, 255, 255, .07)');
assert.equal(rgba.a, .07);
assert.equal(color.rgba(color.fromHSV(color.toHSV(rgba))), 'rgba(255, 255, 255, 0.07)');
assert.equal(color.parse('rgb(100% 0% 50% / 7%)').a, .07);
assert.equal(color.parse('#abcd').a, 221 / 255);
assert.equal(color.parse('transparent').a, 0);
assert.equal(color.hex(color.parse('#ffffff12')), '#FFFFFF12');
assert.equal(color.css(color.parse('#ffffff12'), 'hex'), '#FFFFFF12');
assert.equal(color.parse('linear-gradient(red,blue)'), null);
assert.equal(color.parse('var(--theme-color-accent)'), null);
for (const r of [0, 1, 64, 128, 254, 255]) for (const g of [0, 10, 127, 255]) for (const b of [0, 99, 200, 255]) {
  const result = color.fromHSV(color.toHSV({ r, g, b, a: .07 }));
  assert.equal(result.r, r); assert.equal(result.g, g); assert.equal(result.b, b); assert.equal(result.a, .07);
}
const changed = color.toHSV(rgba); changed.a = .35;
assert.equal(color.rgba(color.fromHSV(changed)), 'rgba(255, 255, 255, 0.35)');
console.log('Passed: alpha 7% preserved exactly, alpha changes independent of RGB, HSV round trips, RGBA/HEX8, percentage syntax, transparent, invalid values.');
