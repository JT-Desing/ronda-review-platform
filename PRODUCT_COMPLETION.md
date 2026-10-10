# Cierre funcional de Ronda

## Primer incremento — 10 octubre 2026

Objetivo: comentarios y decisiones coherentes con la versión y el usuario activos.

Criterios: un comentario obtiene su proyecto de la versión revisada; no se puede registrar una decisión por otro usuario, para una versión huérfana o con un valor desconocido; un bloqueante abierto impide aprobar también en el reducer, no solo en el botón; la interfaz informa el rechazo sin anunciar éxito.

Implementado en main.jsx, RondaContext.jsx y domain/review.js. Pruebas de política en domain/review-policy.test.js. Estas comprobaciones son consistencia del estado de cuenta privada, no autorización de servidor ni colaboración multiusuario.

## Riesgos y siguiente prioridad

Integridad de comentarios: crear requiere proyecto/versión compatibles, autor activo, destinatario existente y contenido. Editar no puede mover id, proyecto, versión, autor o fecha; conserva cambios de texto, prioridad, respuestas y adjuntos. Estas son validaciones del reducer privado, no sustituyen autorización backend. 58 pruebas y build pasan. Faltan pruebas de UI con servidor y entrega de menciones a miembros reales del espacio.

QA local backend: 13 pruebas pasaron; app.test.js no pudo cargar google-auth-library ausente en dependencias locales (no se cambió configuración OAuth/SMTP). Control de versiones descarta respuestas de lectura/subida si la pieza cambió o el componente se desmontó. Resta recuperar explícitamente archivos huérfanos de cargas abortadas y hacer QA con servidor activo. Suite frontend 56/56 y compilación pasan; avisos Geist/bundle siguen presentes. No despliegue ni prueba end-to-end.

Resolución central de versiones: resolveAssetVersion identifica fileId/metadata/contexto de V1 histórica o versión activa. Integrado en apertura desde Inicio/Proyectos, parrilla, miniaturas, preview social y salto desde planificación. Parrilla muestra número y decisiones de la versión activa. 56 pruebas y build exitosos; aún falta QA de interacción/persistencia con API activa y comprobación de concurrencia al cargar/subir. No publicado con Docker apagado. Los avisos de fuentes y bundle permanecen pendientes.

Integración local de versionado: AssetVersionControl ofrece Nueva versión y selección de historial de una pieza existente. Guarda cada original con fileId nuevo y cambia reviewVersionId al abrirlo; rechazo de tipo de medio distinto y estados de procesamiento/error. 55 pruebas y build pasaron. Pendiente antes de publicar: prueba de interacción con API activa; apertura automática de la última versión desde Inicio/parrilla, previews y salto del calendario por fileId. Aún no se considera flujo cerrado, ni desplegado. Google/SMTP excluidos.

Base de versionado añadida: asset/versionAdd exige un archivo nuevo, conserva comentarios/anotaciones anteriores, crea decisiones vacías y rechaza reintentos con el mismo fileId. Todavía no conectada a carga/selector/preview: no activar la acción desde UI hasta resolver lectura por fileId y navegación histórica. Corregida deduplicación al recargar para no eliminar comentarios iguales de versiones o proyectos distintos. 55 pruebas pasaron; compilación exitosa con avisos ya documentados. Sin despliegue. Pendiente próxima entrega: integrar subida y selección histórica de forma conjunta.

Nuevo ajuste: Resumen de revisión recibe la versión abierta y no consulta una versión fija de Amara. Selector de versiones muestra únicamente V1 de archivo real o V3 de la referencia histórica; se retiraron opciones V1/V2 ilustrativas que no cambiaban el medio ni los comentarios. No constituye todavía un historial real de versiones. 51 pruebas y compilación local pasaron; sin verificación visual/despliegue con Docker apagado. La próxima entrega debe implementar sustitución/versionado por pieza con identificadores de archivo independientes y conservación del historial.

Continuación del 10 octubre: el borrador, contexto de anotación, breadcrumb y carga directa ahora usan el proyecto de la pieza seleccionada (fallback histórico conservado para no perder dibujos anteriores). Notificaciones locales deduplican destinatarios y excluyen miembros inexistentes. 48 pruebas pasaron y compilación local exitosa, con avisos de fuentes Geist no resueltas y tamaño de bundle. No desplegado: Docker apagado. Google OAuth y SMTP (punto 5) quedan expresamente pendientes y fuera de alcance. Resta propagar selección de proyecto desde biblioteca e Inicio y evitar referencias fijas en la parrilla, antes de cerrar versiones/colaboración/enlaces públicos.

1. La selección de proyecto, carga directa de archivo, contexto de anotación y borrador todavía contienen referencias fijas a project-amara. Unificar el contexto de revisión antes de ampliar los módulos.
2. El selector V1–V3 sigue mezclando versiones ilustrativas con archivos reales de una sola versión. Implementar versiones reales por pieza y navegación consistente sin perder anotaciones anteriores.
3. Equipo compartido y proyectos privados tienen contratos separados: no anunciar que medios privados son visibles al equipo. Cerrar revisión compartida mediante autorización del servidor.
4. Enlaces públicos, permisos de invitados y descarga no están implementados. El modal debe seguir indicándolo.
5. Google OAuth y SMTP requieren configuración privada. No introducir secretos en documentación o chat.
6. Notificaciones deben distinguir eventos de cuenta privada y entrega real a otros usuarios. Los contadores sociales son demostraciones, no métricas conectadas.

Verificación local: 48 pruebas de dominio/estado/datos pasaron. Docker no estaba disponible; no se desplegó este incremento ni se verificó interacción en web. Preservados túnel, volúmenes y cambios del usuario. Sin commit.
