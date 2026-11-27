# Revisión de paridad visual local / producción — 27 nov 2026

## Alcance y límites de la comparación

- Build publicada comprobada: `e221b6b4645efc10e4555b2bf6f5a23ae18ea5c2` (`main`, PR #92–#97). La web y el API de producción reportan esa revisión; `/api/health` respondió `status: ok`.
- El enlace local disponible, `/?reviewPreview=1#review/version-amara-v3`, abre el modo **DEMO** con datos ficticios y componentes del preview. No es la sala del proyecto compartido que se abre en producción.
- La sesión de comparación de producción se abrió en un perfil aislado de Playwright y llegó al formulario de inicio de sesión. No se introdujeron credenciales personales ni se alteró la pestaña del usuario. Por eso, la vista autenticada de producción queda **pendiente de QA visual**; este documento no afirma paridad pixel a pixel.
- La comparación local se capturó a 1920 × 1080. Antes de la corrección, “Organizar” medía 68 × 36 px y “Revisar” 68 × 32 px; las tarjetas medían 260 × 290 px en ambos modos. Esta diferencia reproduce el cambio de tamaño que reportaste.

## Inventario trazable

| # | Zona / comportamiento solicitado | Estado en `main` y producción | Diferencia local comprobada / acción |
|---|---|---|---|
| 1 | Parrilla: dimensiones de tarjetas y encabezado estables al cambiar Organizar/Revisar | PR #92–#97 están en la imagen publicada. `SharedDeliveryGrid` mantiene los mismos datos y estructura de tarjeta; los controles propios del modo ocupan el pie. | **Delta confirmado:** local y el build tenían botones de ancho 68 px, pero una regla antigua los hacía variar en alto (36 px Organizar / 32 px Revisar); además el CSS del build fijaba anchos 74/62 px y títulos de hasta 2 líneas. El cambio alinea el build a botones uniformes de 68 × 32 px y título de 17 px en una línea. |
| 2 | Parrilla: reordenar con arrastre, flechas y selector | Disponible en `SharedDeliveryGrid`; permanece en modo Organizar. | Código funcional presente. La interacción de reordenamiento con datos reales no se ejecutó para no cambiar el proyecto de producción. |
| 3 | Parrilla: contraer al bajar para dar espacio a comentarios | El componente compartido ya contrae después de superar 96 px de scroll en el contenedor o ventana. | Código presente; falta confirmar el comportamiento visual en la sesión autenticada de producción. |
| 4 | Panel derecho: pestañas Todos/Abiertos/Resueltos, búsqueda, prioridad, ubicación, responder y resolver | Disponible en `SharedReviewRoom` y estilos de comentarios compartidos. | El preview local muestra el panel con scroll propio y compositor al pie. No se pudo abrir la misma pieza y cuenta en producción desde el perfil aislado. |
| 5 | Compositor: menciones, archivos, grabación y envío de audio; reproductor compacto | `SharedReviewRoom` ya usa entrada de menciones, carga/grabación y `AudioMessagePlayer`; los estilos limitan el reproductor al ancho del panel. | Código y reglas responsive presentes. No se publicó un comentario ni se grabó audio en producción. |
| 6 | Colapsar/mostrar el panel de comentarios | Control y estado disponibles en la sala compartida; el ancho colapsado está definido por CSS. | Código presente; inspección visual productiva pendiente por autenticación aislada. |
| 7 | Notificaciones con quién, qué cambió y contexto del proyecto | Producción usa `TeamNotificationCenter`, consulta `/api/notifications`, muestra contexto y detalle, y permite marcar como leído. | El preview DEMO tiene un popover diferente y datos ficticios. No se debe copiar ese componente DEMO encima del centro real del equipo. |
| 8 | Navegación lateral se contrae tras permanecer en la vista | Temporizador de 8 segundos está en `main.jsx`. | Código presente en el build; no se hizo una espera autenticada en producción. |
| 9 | Popup de la extensión y textos de acceso sin referencias al PC/almacenamiento | Los cambios de onboarding y textos están incluidos en la línea de main desplegada; el login productivo aislado muestra “Revisa, comenta y avanza en equipo.” | Se verificó el copy de acceso en el DOM de producción. Popup autenticado y detección de extensión requieren sesión de QA. |
| 10 | Tarjetas de comentario contraídas con expansión animada al tocar | No se encontró ese comportamiento como baseline activo en el preview local ni en el componente compartido actual. | **No marcar como migrado**: falta una referencia local funcional que permita especificar exactamente esta interacción. |

## Validación realizada

- Playwright CLI inició Edge en perfiles separados y obtuvo snapshots de local y producción sin reutilizar la sesión personal.
- Local: cuatro piezas del demo, alternancia de modos, panel de comentarios, estados y compositor visibles. Se aplicó el CSS del build al preview aislado para validar la geometría: Organizar y Revisar quedaron ambos en 68 × 32 px, peso 500; tarjetas 260 × 290 px; títulos 17 px en una línea. Sin overflow horizontal a 1920 px ni a 390 px. Compositor pegado al borde inferior del panel (0 px medido en escritorio).
- Compilación del cambio: correcta. Suite local: 321/323 pasan; fallan dos comprobaciones preexistentes de HTML legal generado (`public/legal/tratamiento-de-datos.html` y `public/legal/privacidad.html`) contra sus fuentes. Esta migración no toca esos documentos.
- Producción: sitio responde saludable; bundle y etiqueta OCI reportan `e221b6b`; el navegador aislado solo mostró la pantalla de acceso. Los eventos CSP de Cloudflare en consola no afectaron la carga de la app.
- No se realizaron comentarios, ordenamientos, aprobaciones, invitaciones ni cambios de datos reales.

## Pendiente para cerrar el QA visual autenticado

Se necesita abrir el mismo proyecto/pieza de forma aislada en producción (cuenta de QA, sin datos reales) y su equivalente local en la sala compartida. El enlace local actual solo proporciona el preview DEMO, así que no permite certificar que el panel compartido y sus interacciones sean visualmente idénticos.
