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
  content.innerHTML = `<strong>Web del proyecto</strong><div class="site"></div><p class="status"></p><div class="actions"><button class="primary" id="connect"></button></div><form id="access" hidden><strong>Usuario y contraseña del sitio</strong><p class="hint"></p><input name="username" autocomplete="username" placeholder="Usuario" required><input name="password" type="password" autocomplete="current-password" placeholder="Contraseña" required><div class="actions"><button type="button" id="forget" hidden>Olvidar</button><button class="primary" type="submit">Guardar acceso</button></div><p class="access-status"></p></form>`;
  content.querySelector('.site').textContent = site.host;
  const status = content.querySelector('.status');
  const button = content.querySelector('#connect');
  status.textContent = permission ? 'Este dominio ya tiene permiso.' : 'Solo se solicitará acceso a este dominio.';
  button.textContent = permission ? 'Activar en Ronda' : 'Dar acceso y activar';
  const access = content.querySelector('#access');
  const accessStatus = access.querySelector('.access-status');
  const reloadViewer = () => chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => { const frame = document.querySelector('.external-web-viewport iframe'); if (frame) frame.src = frame.src; } });
  // Credentials stay in this browser (chrome.storage.local) and only answer the
  // site's own login prompt. Ronda's server never receives them.
  const showAccess = async () => {
    if (!await chrome.permissions.contains({ origins: [pattern] })) return;
    const stored = await chrome.storage.local.get([`auth:${site.origin}`, `auth-needed:${site.origin}`]);
    const saved = stored[`auth:${site.origin}`];
    access.hidden = false;
    access.querySelector('.hint').textContent = stored[`auth-needed:${site.origin}`]
      ? 'Este sitio pidió usuario y contraseña. Se guardan solo en este navegador y sirven para todas sus páginas.'
      : 'Si el sitio está protegido, guarda aquí su acceso. Se queda solo en este navegador.';
    if (saved) { access.username.value = saved.username; access.querySelector('#forget').hidden = false; }
  };
  access.addEventListener('submit', async event => {
    event.preventDefault();
    const result = await chrome.runtime.sendMessage({ type: 'ronda:save-site-access', origin: site.origin, username: access.username.value, password: access.password.value });
    accessStatus.className = result?.ok ? 'access-status' : 'access-status error';
    accessStatus.textContent = result?.ok ? 'Acceso guardado. Recargando la web en Ronda…' : (result?.error || 'No se pudo guardar el acceso.');
    if (result?.ok) { access.password.value = ''; access.querySelector('#forget').hidden = false; await reloadViewer(); }
  });
  access.querySelector('#forget').addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'ronda:save-site-access', origin: site.origin, forget: true });
    access.reset(); access.querySelector('#forget').hidden = true;
    accessStatus.className = 'access-status';
    accessStatus.textContent = 'Acceso eliminado de este navegador.';
  });
  await showAccess();
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
      await showAccess();
    } catch (error) {
      status.textContent = error.message || 'No se pudo conectar el sitio.';
      status.className = 'error';
      button.disabled = false;
    }
  });
}

start().catch(error => renderError(error.message || 'No se pudo leer el proyecto de Ronda.'));
