# Ronda · Anotaciones web

Extensión Manifest V3 para conectar una web HTTPS abierta dentro de un proyecto Ronda. Permite que el visor reciba selección de texto, scroll y tamaño del documento y guarde las anotaciones en coordenadas del documento, no de la ventana visible.

## Flujo del revisor

1. Instala la extensión desde Chrome Web Store (el enlace se configurará en Ronda cuando la publicación esté aprobada).
2. Abre el proyecto y pulsa **Conectar este sitio**.
3. Chrome pide permiso para el origen HTTPS mostrado. Al aceptarlo, la extensión inyecta el puente solo en ese origen y Ronda recarga el visor.
4. Usa las herramientas de anotación. No se solicita permiso para todos los sitios al instalar.

Ronda sigue funcionando sin extensión. Las capturas anotables permanecen disponibles como alternativa. La extensión no recoge ni transmite el texto de la página fuera del mensaje de selección enviado al visor Ronda.

## Empaquetar

Comprime el contenido de esta carpeta (no la carpeta contenedora) en un ZIP para Chrome Web Store. Antes del envío final, configura iconos 16/32/48/128, una URL pública de política de privacidad, imágenes promocionales/listing y la URL pública de Ronda para la tienda.

## Limitaciones

- Requiere Chrome 127+ o un navegador Chromium compatible con `chrome.action.openPopup`.
- La autorización se concede por origen HTTPS exacto. Si una web usa iframes alojados en otros orígenes, esos orígenes no se autorizan automáticamente.
- La extensión no puede garantizar fidelidad frente a restricciones propias del sitio (CSP, autenticación, contenido embebido, canvas, shadow DOM cerrado, etc.).
- Las anotaciones quedan ancladas a coordenadas del documento y scroll comunicado por el puente; si el contenido cambia su layout después de comentar, puede cambiar la posición semántica del elemento.
