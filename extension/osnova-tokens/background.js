importScripts('export-version.js', 'preset-palettes.js', 'presets.js');
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
// All panels reserve versions in this single queue, including panels in other windows.
let exportsQueue = Promise.resolve();
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (!['osnova-export-version', 'osnova-presets'].includes(message?.target)) return;
  exportsQueue = exportsQueue.catch(() => {}).then(async () => {
    if (sender.id !== chrome.runtime.id) throw new Error('Неизвестный отправитель');
    if (message.target === 'osnova-presets') return { ok: true, ...await OsnovaPresets.ensure(chrome.storage.local, message.origin, path => chrome.runtime.getURL(path)) };
    if (!message.origin || !message.theme) throw new Error('Не указана тема экспорта');
    const key = OsnovaExportVersion.key(message);
    const stored = await chrome.storage.local.get(key);
    const version = OsnovaExportVersion.next(stored[key]);
    await chrome.storage.local.set({ [key]: version });
    return { ok: true, version, filename: OsnovaExportVersion.filename(message.name || message.theme, version) };
  });
  exportsQueue.then(respond, error => respond({ ok: false, error: error.message }));
  return true;
});
