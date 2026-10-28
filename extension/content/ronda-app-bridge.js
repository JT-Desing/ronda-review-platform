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
  window.postMessage({ type: 'ronda:web-review:extension-installed' }, origin);
})();
