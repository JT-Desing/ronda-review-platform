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
