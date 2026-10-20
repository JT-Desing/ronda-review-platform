const RONDA_ORIGIN = 'https://ronda.repolite.link';
const SCRIPT_PREFIX = 'ronda-live-';

function scriptId(origin) {
  return SCRIPT_PREFIX + [...new TextEncoder().encode(origin)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function currentReviewUrl(tabId) {
  const tab = await chrome.tabs.get(tabId);
  if (!tab.url || new URL(tab.url).origin !== RONDA_ORIGIN) throw new Error('Abre una revisión de Ronda para conectar el sitio.');
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => document.querySelector('.external-web-viewport iframe')?.src || null,
  });
  if (!result?.result) throw new Error('Abre el visor web de un proyecto antes de conectar.');
  const url = new URL(result.result);
  if (url.protocol !== 'https:' || url.origin === RONDA_ORIGIN || url.username || url.password) throw new Error('Solo se pueden conectar sitios HTTPS externos.');
  return url;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'ronda:connect-current-site') return;
  (async () => {
    const tabId = Number.isInteger(message.tabId) ? message.tabId : sender.tab?.id;
    if (!Number.isInteger(tabId)) throw new Error('No se encontró la pestaña de Ronda.');
    const url = await currentReviewUrl(tabId);
    const originPattern = `${url.origin}/*`;
    const allowed = await chrome.permissions.contains({ origins: [originPattern] });
    if (!allowed) throw new Error('Concede primero el permiso para este sitio desde el botón de conexión.');
    const id = scriptId(url.origin);
    const old = await chrome.scripting.getRegisteredContentScripts({ ids: [id] });
    if (!old.length) {
      await chrome.scripting.registerContentScripts([{
        id,
        matches: [originPattern],
        js: ['content/live-page-bridge.js'],
        allFrames: true,
        runAt: 'document_idle',
        persistAcrossSessions: true,
      }]);
    }
    await chrome.storage.local.set({ [`connected:${url.origin}`]: true });
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const frame = document.querySelector('.external-web-viewport iframe');
        if (!frame) throw new Error('No se encontró el visor.');
        const current = frame.src;
        frame.src = current;
      },
    });
    return { ok: true, host: url.host };
  })().then(sendResponse).catch(error => sendResponse({ ok: false, error: error.message || 'No se pudo conectar el sitio.' }));
  return true;
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'ronda:open-connection-popup') return;
  if (sender.url !== RONDA_ORIGIN + '/' && !sender.url?.startsWith(RONDA_ORIGIN + '/')) return;
  chrome.action.openPopup({ windowId: sender.tab?.windowId }).then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false }));
  return true;
});
