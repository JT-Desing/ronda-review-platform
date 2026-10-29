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

const FRAME_RULE_PREFIX = 'frame-rule:';
const AUTH_PREFIX = 'auth:';
const AUTH_NEEDED_PREFIX = 'auth-needed:';

// Lets a connected site load inside Ronda's viewer. The rule only touches frames
// that Ronda's page requests on that domain, so the site keeps its headers
// everywhere else. It needs the site's host permission to apply at all.
async function allowFraming(origin) {
  const key = FRAME_RULE_PREFIX + origin;
  const stored = (await chrome.storage.local.get(key))[key];
  const rules = await chrome.declarativeNetRequest.getDynamicRules();
  if (stored && rules.some(rule => rule.id === stored)) return;
  const id = Math.max(0, ...rules.map(rule => rule.id)) + 1;
  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [{
      id,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        responseHeaders: [
          { header: 'x-frame-options', operation: 'remove' },
          { header: 'content-security-policy', operation: 'remove' },
        ],
      },
      condition: {
        requestDomains: [new URL(origin).hostname],
        initiatorDomains: [new URL(RONDA_ORIGIN).hostname],
        resourceTypes: ['sub_frame'],
      },
    }],
  });
  await chrome.storage.local.set({ [key]: id });
}

// Sites behind HTTP authentication (Basic realm) get the credentials the person
// saved for that origin in the popup. They stay in this browser only. Each
// request gets one try, so a wrong password falls through instead of looping.
const answered = new Set();
chrome.webRequest.onAuthRequired.addListener((details, respond) => {
  if (details.isProxy) { respond({}); return; }
  const origin = new URL(details.url).origin;
  chrome.storage.local.get(AUTH_PREFIX + origin).then(async stored => {
    const saved = stored[AUTH_PREFIX + origin];
    if (saved && !answered.has(details.requestId)) {
      answered.add(details.requestId);
      setTimeout(() => answered.delete(details.requestId), 60000);
      respond({ authCredentials: { username: saved.username, password: saved.password } });
      return;
    }
    await chrome.storage.local.set({ [AUTH_NEEDED_PREFIX + origin]: details.realm || new URL(origin).host });
    if (details.tabId >= 0) chrome.tabs.sendMessage(details.tabId, { type: 'ronda:auth-required', host: new URL(origin).host }).catch(() => {});
    respond({ cancel: true });
  }).catch(() => respond({}));
}, { urls: ['https://*/*'] }, ['asyncBlocking']);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'ronda:save-site-access' || !sender.url?.startsWith(chrome.runtime.getURL(''))) return;
  (async () => {
    const origin = new URL(message.origin).origin;
    if (!await chrome.permissions.contains({ origins: [`${origin}/*`] })) throw new Error('Conecta primero este sitio.');
    if (message.forget) {
      await chrome.storage.local.remove([AUTH_PREFIX + origin, AUTH_NEEDED_PREFIX + origin]);
      return { ok: true };
    }
    const username = String(message.username || '').trim();
    const password = String(message.password || '');
    if (!username || !password) throw new Error('Escribe el usuario y la contraseña.');
    await chrome.storage.local.set({ [AUTH_PREFIX + origin]: { username, password } });
    await chrome.storage.local.remove(AUTH_NEEDED_PREFIX + origin);
    return { ok: true };
  })().then(sendResponse).catch(error => sendResponse({ ok: false, error: error.message || 'No se pudo guardar el acceso.' }));
  return true;
});

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
    await allowFraming(url.origin);
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
