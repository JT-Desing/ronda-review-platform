# Registro de restauración visual — 27 de noviembre de 2026

## Qué se restauró en producción

La web se fijó de nuevo en la imagen `ghcr.io/jt-desing/ronda-web:sha-c722492c2269` después de que el layout compartido dejara de mostrar el contenido. El servicio web volvió a estado `healthy`; la página y `/api/health` respondieron `200`.

El rollback cambió únicamente la imagen del servicio web. No se modificaron la API ni la base de datos, y no se borraron proyectos, piezas, versiones o comentarios.

## Eliminaciones encontradas en la rama de trabajo descartada

La rama `codex/local-visual-parity-followup` contenía cambios ajenos al ajuste visual que eliminaban:

- El soporte backend para adjuntar y consultar imágenes en comentarios, incluidos `backend/comment-image.js`, sus pruebas, la migración `0023_shared_comment_images.sql` y el registro de sus rutas.
- La selección, previsualización y publicación de imágenes desde el compositor de comentarios en `SharedReviewRoom.jsx`.
- Los estilos para mostrar las imágenes adjuntas dentro de los comentarios.

Estas eliminaciones no forman parte del cambio visual solicitado. La migración a producción se preparará desde `main` con esos flujos intactos. Este registro documenta cambios de código observados en la rama; no implica que se haya eliminado información de producción.

## Corrección visual en curso

La barra superior y el panel de comentarios deben ocupar filas y columnas del layout del espacio de revisión. Solo la lista de comentarios tendrá scroll propio; el panel no se fija al viewport ni salta al desplazar el contenido. La vista principal conserva su scroll independiente para la parrilla y la pieza.

## Diagnóstico de la vista vacía de Proyectos — 28 de noviembre

La captura que muestra únicamente «Invitar a un cliente» y «Participantes y roles del proyecto» coincide con el estado `.shared-media-opening`: `SharedProjectMedia` lo presenta mientras consulta las piezas y también cuando falla la carga. Una regla anterior ocultaba el encabezado del proyecto, el acceso a todos los proyectos y la conversación general en cuanto aparecía ese estado. El panel de carga/error no tenía altura ni tratamiento visual propios. Por eso una carga prolongada o fallida podía parecer una pantalla vacía, aunque los contenedores de invitación siguieran visibles.

Se retiró esa regla y se dio al estado de carga/error un panel visible y acotado. El estado de error conserva su botón de reintento y el contexto del proyecto permanece en pantalla. En `SharedReviewRoom`, si no llega la pieza después de cargar, también se conserva la parrilla y se muestra un error con reintento.

La comprobación aislada de producción llega al inicio de sesión, no a la sesión autenticada del proyecto. Por eso no afirma que el estado de esa captura haya sido reproducido dentro de la cuenta. La API de salud devolvió `200` y los registros recientes disponibles muestran respuestas `200` para las solicitudes de proyectos, piezas, versiones y comentarios; no se modificaron ni borraron datos.
