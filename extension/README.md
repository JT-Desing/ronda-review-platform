# Ronda · Anotaciones web

Extensión Manifest V3 para conectar una web HTTPS abierta dentro de un proyecto Ronda. Permite que el visor reciba selección de texto, scroll y tamaño del documento y guarde las anotaciones en coordenadas del documento, no de la ventana visible.

## Flujo del revisor

1. Instala la extensión desde Chrome Web Store (el enlace se configurará en Ronda cuando la publicación esté aprobada).
2. Abre el proyecto y pulsa **Conectar este sitio**.
3. Chrome pide permiso para el origen HTTPS mostrado. Al aceptarlo, la extensión inyecta el puente solo en ese origen y Ronda recarga el visor.
4. Usa las herramientas de anotación. No se solicita permiso para todos los sitios al instalar.

Ronda sigue funcionando sin extensión. Las capturas anotables permanecen disponibles como alternativa. La extensión no recoge ni transmite el texto de la página fuera del mensaje de selección enviado al visor Ronda.

## Empaquetar

`sh scripts/package-extension.sh` genera dos ZIP en `dist-extension/`:

- `ronda-anotaciones-web-<versión>.zip` para Chrome Web Store.
- `ronda-anotaciones-web-<versión>-firefox.zip` para Firefox Add-ons (AMO).

Solo se edita `extension/manifest.json`. El manifiesto de Firefox sale de `scripts/extension-manifest.mjs`, que cambia esto:

- `background.service_worker` pasa a `background.scripts`, porque Firefox ejecuta el fondo como event page.
- `webRequestAuthProvider` se cambia por `webRequestBlocking`, y `onAuthRequired` usa `blocking` con una promesa.
- Añade `browser_specific_settings.gecko` con el ID `ronda-anotaciones@repolite.link`, Firefox 128 como mínimo y `data_collection_permissions` (texto seleccionado y desplazamiento).

En Firefox el popup se cierra cuando aparece el aviso de permiso. Por eso el popup deja la petición en `storage.session` y el fondo termina la conexión al recibir `permissions.onAdded`.

Para probar en Firefox sin firmar: `about:debugging#/runtime/this-firefox` > "Cargar complemento temporal" > el ZIP de Firefox.

Ronda muestra el enlace de instalación según el navegador: `VITE_RONDA_EXTENSION_STORE_URL` (Chrome) y `VITE_RONDA_EXTENSION_FIREFOX_URL` (Firefox).

## Limitaciones

- Requiere Chrome 127+ (o Chromium compatible con `chrome.action.openPopup`) o Firefox 128+.
- La autorización se concede por origen HTTPS exacto. Si una web usa iframes alojados en otros orígenes, esos orígenes no se autorizan automáticamente.
- La extensión no puede garantizar fidelidad frente a restricciones propias del sitio (CSP, autenticación, contenido embebido, canvas, shadow DOM cerrado, etc.).
- Las anotaciones quedan ancladas a coordenadas del documento y scroll comunicado por el puente; si el contenido cambia su layout después de comentar, puede cambiar la posición semántica del elemento.
