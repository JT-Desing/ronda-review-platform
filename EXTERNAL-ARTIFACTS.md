# Revisión de enlaces

Entrada: **Agregar enlace**, disponible en la parrilla privada, en el detalle
de un proyecto privado vacío y en Piezas del equipo (administradores/editores).

La identificación usa Content-Type mediante HEAD. Imágenes PNG/JPEG/WebP/GIF/AVIF
y videos MP4/WebM/OGG directos usan el visor correspondiente; HTML usa el visor
web. No convierte una animación canvas/Remotion en un MP4 ni extrae todos los
videos de una página. Se rechazan destinos privados/reservados, credenciales,
HTTP, puertos especiales, MIME desconocido y redirecciones a redes internas.
Las consultas se limitan por cuenta. La inspección de red usa IPv4 pública
validada y fijada en la conexión TLS (no admite sitios exclusivamente IPv6).

Se guarda la URL en la base local; no se copia el recurso externo. El proveedor
puede modificar o retirar el contenido incluso después de una aprobación.
Los enlaces externos no ofrecen historial de originales inmutables. Para una
entrega congelada, subir el archivo. No usar URLs con credenciales o tokens.

El visor web requiere cargar explícitamente el sitio y ofrece Abrir original
y Ampliar visor. Usa un iframe sandbox con scripts/origen propios, sin permisos
de formularios, ventanas emergentes, descargas o navegación superior. Se rechaza
el mismo origen de Ronda para no ejecutar contenido como parte de la aplicación.
Los sitios que impidan iframe o requieran permisos adicionales deben abrirse
en su sitio original. No se eluden sus políticas de seguridad.

En páginas web, los comentarios son generales y las anotaciones compartidas
corresponden a la vista, no al DOM ni a un fotograma sincronizado. Los controles
de animación pertenecen al sitio. Videos directos mantienen comentarios
temporales. La revisión compartida sigue exigiendo membresía y rol.

Verificaciones: pruebas unitarias de destino/MIME/redirecciones; integración
PostgreSQL aislada de migración, roles, idempotencia, listado y comentarios;
prueba de navegador con el artefacto ePayco dado por el usuario (carga,
reproducción y comentario en QA). Ningún artefacto de prueba se agrega a datos
reales de ePayco MKT.
