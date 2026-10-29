(() => {
  if (window.top !== window || window.__rondaExtensionBridgeInstalled) return;
  window.__rondaExtensionBridgeInstalled = true;
  const origin = 'https://ronda.repolite.link';
  window.addEventListener('message', event => {
    if (event.source !== window || event.origin !== origin) return;
    if (event.data?.type === 'ronda:web-review:check-extension') {
      window.postMessage({ type: 'ronda:web-review:extension-installed' }, origin);
    }
    if (event.data?.type === 'ronda:web-review:open-connection') {
      chrome.runtime.sendMessage({ type: 'ronda:open-connection-popup' });
    }
  });
  chrome.runtime.onMessage.addListener(message => {
    if (message?.type === 'ronda:auth-required' && typeof message.host === 'string') {
      window.postMessage({ type: 'ronda:web-review:auth-required', host: message.host }, origin);
    }
  });
  window.postMessage({ type: 'ronda:web-review:extension-installed' }, origin);
})();
