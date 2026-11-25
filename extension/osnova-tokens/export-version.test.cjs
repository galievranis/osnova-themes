const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
(async () => {
  let listener;
  const saved = {};
  const context = vm.createContext({
    console, importScripts() {},
    chrome: {
      sidePanel: { setPanelBehavior: async () => {} },
      runtime: { id: 'test', onMessage: { addListener(fn) { listener = fn; } } },
      storage: { local: { async get(key) { return { [key]: saved[key] }; }, async set(values) { Object.assign(saved, values); } } }
    }
  });
  for (const name of ['export-version.js', 'background.js']) vm.runInContext(fs.readFileSync(`${__dirname}/${name}`, 'utf8'), context);
  const request = data => new Promise(resolve => listener({ target: 'osnova-export-version', origin: 'https://stage.test', theme: 'gta', name: 'gta', ...data }, { id: 'test' }, resolve));
  const results = await Promise.all([request({}), request({}), request({})]);
  assert.equal(results.map(result => result.filename).join(','), 'osnova-gta-v001.css,osnova-gta-v002.css,osnova-gta-v003.css');
  assert.equal((await request({ theme: 'classic', name: 'classic' })).version, 1);
  assert.equal((await request({ profileId: 'custom-1', name: 'Моя тема' })).filename, 'osnova-Моя-тема-v001.css');
  assert.equal((await request({ profileId: 'custom-1', name: 'Новое имя' })).filename, 'osnova-Новое-имя-v002.css');
  // Simulate a service-worker restart while preserving chrome.storage.
  vm.runInContext(fs.readFileSync(`${__dirname}/background.js`, 'utf8').replaceAll('exportsQueue', 'restartedQueue'), context);
  assert.equal((await request({})).version, 4);
  assert.equal(context.OsnovaExportVersion.filename('../bad/name', 1000), 'osnova-bad-name-v1000.css');
  console.log('Passed: increasing export versions, parallel reservations, per-theme counters, rename continuity, worker restart persistence and safe filenames.');
})().catch(error => { console.error(error); process.exitCode = 1; });
