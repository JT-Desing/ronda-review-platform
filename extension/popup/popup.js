const content = document.querySelector('#content');
const RONDA_ORIGIN = 'https://ronda.repolite.link';

function renderError(message, help = 'Abre un proyecto con un enlace web y vuelve a abrir esta extensión.') {
  content.innerHTML = `<p class="error"></p><p class="privacy"></p>`;
  content.querySelector('.error').textContent = message;
  content.querySelector('.privacy').textContent = help;
}

async function start() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id || !tab.url?.startsWith(RONDA_ORIGIN + '/')) {
    renderError('Abre Ronda en una pestaña para conectar la web del proyecto.');
    return;
  }
  const [frame] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => document.querySelector('.external-web-viewport iframe')?.src || null,
  });
  if (!frame?.result) {
    renderError('No encontré un visor web activo en esta revisión.');
    return;
  }
  const site = new URL(frame.result);
  if (site.protocol !== 'https:' || site.origin === RONDA_ORIGIN || site.username || site.password) {
    renderError('Este visor no contiene un sitio HTTPS que Ronda pueda conectar.');
    return;
  }
  const pattern = `${site.origin}/*`;
  const permission = await chrome.permissions.contains({ origins: [pattern] });
  content.innerHTML = `<strong>Web del proyecto</strong><div class="site"></div><p class="status"></p><div class="actions"><button class="primary" id="connect"></button></div>`;
  content.querySelector('.site').textContent = site.host;
  const status = content.querySelector('.status');
  const button = content.querySelector('#connect');
  status.textContent = permission ? 'Este dominio ya tiene permiso.' : 'Solo se solicitará acceso a este dominio.';
  button.textContent = permission ? 'Activar en Ronda' : 'Dar acceso y activar';
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      if (!await chrome.permissions.contains({ origins: [pattern] })) {
        const granted = await chrome.permissions.request({ origins: [pattern] });
        if (!granted) throw new Error('No se concedió permiso. Puedes intentarlo de nuevo cuando quieras.');
      }
      const result = await chrome.runtime.sendMessage({ type: 'ronda:connect-current-site', tabId: tab.id });
      if (!result?.ok) throw new Error(result?.error || 'No se pudo activar el sitio.');
      status.textContent = `Listo. Actualizando ${result.host} dentro de Ronda…`;
      button.textContent = 'Conectado';
      button.classList.remove('primary');
    } catch (error) {
      status.textContent = error.message || 'No se pudo conectar el sitio.';
      status.className = 'error';
      button.disabled = false;
    }
  });
}

start().catch(error => renderError(error.message || 'No se pudo leer el proyecto de Ronda.'));
