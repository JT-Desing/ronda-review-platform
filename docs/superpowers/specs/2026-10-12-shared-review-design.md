# Revisión compartida de Ronda — propuesta para aprobación

Estado: diseño aprobado por el usuario. Implementación en rama aislada; validación visual y dictamen independiente completos pendientes. No desplegado.

## Objetivo y contexto

Cerrar un recorrido real entre miembros de una empresa: crear proyecto compartido, subir pieza, revisar con anotaciones, solicitar cambios, cargar versión y aprobar. Reutilizar la identidad visual y las herramientas actuales. No publicar automáticamente proyectos privados ni mostrar éxito cuando el servidor rechaza una acción.

Ronda sigue siendo prototipo: el almacenamiento local es válido para pruebas. La contratación y activación de almacenamiento comercial se realizará antes de operar los archivos del primer cliente. Esta entrega no contrata servicios, modifica DNS, activa pagos ni envía correo.

Evidencia inspeccionada: backend/shared-project-service.js, backend/modules/shared-projects.js, backend/migrations/0003_shared_projects.sql, backend/modules/files.js, backend/workspace-policy.js, backend/ARCHITECTURE.md y src/domain/asset-versions.js. El checkout no incluye aún el PR fusionado remotamente; sincronizarlo con avance rápido y ejecutar regresiones es un requisito previo de implementación, sin sobrescribir cambios locales.

## Alcance de la primera entrega

Incluye video MP4 reproducible por navegador e imágenes JPEG/PNG/WebP; piezas y versiones compartidas; comentarios con contexto espacial o temporal; anotaciones; respuestas; resolución; asignación de revisores; decisiones y eventos de actividad. Los otros visores privados se conservan. PDF, audio y otros formatos se incorporarán al flujo compartido en entregas posteriores para no declarar compatibilidad sin pruebas.

Quedan fuera: clientes sin pertenencia al espacio, enlaces externos, correo, facturación, transcodificación/HLS, comparación automática de versiones, publicación social, SSO y dominio. El siguiente incremento podrá añadir acceso externo sin consumir asiento, con autorización explícita por recurso.

No se importan archivos privados en este incremento. Una futura copia al espacio requerirá confirmación, verificación de propiedad y conservación del original. Cada vista distingue Privado de Compartido.

## Alternativas y elección recomendada

1. Extender las entidades compartidas actuales — recomendada: permisos servidor ya existentes, migraciones aditivas y menor riesgo para datos privados.
2. Migrar snapshots completos a colaboración: reduce duplicación futura pero mezcla identidades de referencia con miembros reales y amplía el riesgo de exposición.
3. Compartir enlaces sobre archivos privados: rápido visualmente, pero deja propiedad y revocación ambiguas. No recomendado.

## Datos e invariantes

Entidades nuevas: pieza compartida perteneciente a un proyecto; versión perteneciente a una pieza; archivo del espacio; comentario de versión; respuesta; asignación y decisión de revisor. Los comentarios generales existentes permanecen separados.

- Las relaciones espacio → proyecto → pieza → versión → archivo se validan en servidor y base de datos; nunca basta un UUID proporcionado por el cliente.
- Identidad, autor, fechas y eventos los determina la sesión/servidor.
- Cada original es inmutable. Subir V2 crea un archivo independiente; jamás sobrescribe V1.
- Número de versión único por pieza, asignado transaccionalmente. UUID distinto del número legible.
- La versión activa es un puntero explícito. Comentarios, decisiones y anotaciones siempre guardan el UUID de su versión.
- Una versión nueva conserva asignados los revisores que siguen siendo miembros; sus decisiones empiezan pendientes. No hereda aprobación.
- Coordenadas normalizadas respecto al medio, sin dependencia del tamaño de pantalla. Video conserva segundos y metadatos de fotograma si están disponibles; no promete exactitud SMPTE sin validación técnica.
- Reintentos usan clave idempotente por actor/recurso; la misma clave con contenido diferente devuelve conflicto.
- Lecturas paginadas con cursor estable; no ocultar silenciosamente comentarios antiguos.

## Permisos

En este primer incremento, todo miembro del espacio accede a los proyectos compartidos, igual que el contrato actual. No se promete confidencialidad por proyecto hasta introducir miembros por proyecto.

| Acción | Administrador | Editor | Revisor |
|---|---|---|---|
| Ver medios, historial y comentarios compartidos | Sí | Sí | Sí |
| Crear piezas/subir versiones/asignar revisores | Sí | Sí | No |
| Comentar, anotar y responder | Sí | Sí | Sí |
| Resolver/reabrir comentarios | Sí | Sí | No |
| Aprobar/solicitar cambios | Solo si está asignado | Solo si está asignado | Solo si está asignado |
| Gestionar miembros y capacidad | Sí | No | No |

Autor puede editar el texto de su comentario mientras la versión esté en revisión; no puede cambiar identidad, contexto o fecha. Las modificaciones generan eventos. No hay borrado irreversible de piezas/comentarios en esta entrega.

Revocación de pertenencia bloquea nuevas lecturas/escrituras. Descargar el archivo original es una capacidad separada: solo admin/editor en esta entrega. La visualización ya transmite contenido y no impide capturas/copias por un usuario autorizado; no se promete DRM. Bytes ya descargados o cargados en memoria no se pueden retirar retroactivamente.

Mantener límite operativo actual de miembros; no implementarlo como plan Agency. Las tarifas, ampliaciones y reservas comerciales se realizarán en la entrega de planes. No elevar límites ni cobrar por aceptar una invitación.

## Flujo y decisiones

Crear proyecto compartido → subir pieza → finalizar archivo y V1 → asignar revisores → comentar/solicitar cambios → resolver correcciones → subir V2 → revisar y aprobar → habilitar entrega del original a admin/editor.

Versión en revisión: cada asignado decide pendiente, aprobado o cambios solicitados. Aprobación final exige al menos un revisor asignado, todas las decisiones aprobadas y cero comentarios bloqueantes abiertos. Comprobación transaccional servidor, no únicamente botones.

La aprobación final bloquea comentarios nuevos, ediciones y dibujos sobre esa versión; permite leer historial y responder en una nueva versión. Para corregir contenido aprobado se sube otra versión, conservando el registro. Retirar un revisor invalida su participación vigente sin borrar su decisión histórica; el resumen excluye miembros revocados y pasa a pendiente si no queda ningún asignado. La interfaz informa el cambio. No tratar una aprobación como firma legal certificada.

## Archivos y almacenamiento

Una interfaz de almacenamiento con operaciones concretas de staging, lectura, finalización y descarte de temporales; implementación local primero. Base de datos guarda proveedor y clave interna del objeto, nunca rutas/credenciales recibidas del cliente. Las rutas privadas actuales conservan comportamiento.

Subida compartida: validar pertenencia y rol; reservar tamaño bajo una cuota operativa del espacio; transmitir a temporal sin mantener conexión SQL durante toda la subida; validar bytes/tipo; transacción corta vuelve a verificar pertenencia, reserva y pieza; registrar archivo/versión; confirmar disponibilidad. Estado no disponible hasta terminar. Límites del prototipo configurables, inicialmente 100 MB/archivo y 2 GB/espacio, identificados como límites de prueba y no como paquete comercial.

No anunciar atomicidad entre PostgreSQL y filesystem: registrar estados staging/ready/failed y recuperación idempotente. Temporales sin referencia se reconcilian después de un plazo configurado; nunca borrar un archivo listo/referenciado como limpieza automática. Fallo conserva versiones previas y permite reintentar sin duplicar.

Lectura pasa por autorización del espacio; no hacer públicos los objetos. Video admite solicitudes Range limitadas y correctas para navegación, con los mismos permisos; evitar precargar medios fuera de la versión visible. Contenido ejecutable no permitido en esta entrega; validar tipo admitido y rechazar formatos ajenos. Reutilizar revisión de seguridad del PR ya fusionado, sin asumir que declarar MIME pruebe el contenido.

Preparación comercial: proveedor remoto compatible se seleccionará en un incremento propio; exigir aislamiento, cuotas, copias externas, restauración, costes y migración con checksums probados antes del primer cliente. No crear cuentas ni subir contenido a terceros en esta fase.

## Interfaz y coherencia

Mismas herramientas de revisión existentes mediante un adaptador explícito privado/compartido; nunca mezclar reducers privados con escrituras compartidas. Reutilizar componentes presentacionales sin duplicar toda la aplicación.

Proyecto muestra piezas, estado y pendientes. Sala muestra empresa/proyecto/pieza y versión visible, selector de historial, participantes y comentarios. Versiones antiguas tienen aviso Histórico; aprobadas tienen aviso Solo lectura. Una acción primaria según contexto; no tarjetas anidadas por cada dato.

Preview social representa únicamente la pieza/versión abiertas. Volver de comentarios, calendario o actividad abre el mismo UUID. Hasta conectar datos compartidos al calendario, etiquetar su alcance real; no sumar datos privados y de equipo como si fueran la misma fuente.

Estados requeridos: vacío con acción permitida, carga, subida con progreso, finalización, error recuperable, sin permiso, conflicto 409 y versión histórica. Un éxito exige respuesta servidor. Cambiar pieza descarta respuestas tardías; borrador no enviado requiere aviso antes de abandonar. Teclado, foco visible, contraste y movimiento reducido; animaciones no alteran el significado del estado.

## Concurrencia, actividad y errores

Escrituras con revisión esperada. Un 409 permite recargar manteniendo borrador y ofrece revisión del conflicto, nunca sobrescritura silenciosa. Operaciones idempotentes y evento se confirman conjuntamente. Comentarios nuevos y decisiones se serializan con bloqueo de la versión para impedir aprobación concurrente con un bloqueante.

Sin tiempo real inicialmente: actualizar al entrar/recuperar foco y botón Actualizar. No prometer instantaneidad. Pertenencia y autorización se vuelven a consultar cada solicitud. 401 solicita sesión; 403 explica rol; 404 no revela recursos de otra empresa; 413 explica el límite de prueba.

## Pruebas y aceptación

Pruebas unitarias: roles, contexto de versión, validación de anotaciones, cuotas, tipos, estados y aprobación. Integración en base QA aislada: dos espacios, admin/editor/revisor/externo, UUID cruzados, autor falsificado, revocación durante subida, reservas concurrentes, reintentos, subida incompleta, números de versión concurrentes, 409 y aprobación frente a bloqueante concurrente.

E2E con dos sesiones: admin sube; revisor distinto ve bytes reales, comenta/anota; editor responde/resuelve/sube V2; revisor selecciona historial y aprueba V2; V1 conserva comentarios. Revocar acceso impide volver a obtener el medio. Reiniciar conserva recursos. UI responsive y navegación por teclado comprobadas, no solo capturas.

Regresión obligatoria: snapshots y archivos privados mantienen contenido/acceso; proyectos/comentarios generales existentes siguen disponibles; invitaciones y último admin protegidos; pruebas de seguridad del PR preservadas.

No se declara terminado sin pruebas servidor/UI y un respaldo restaurable. Despliegue es una fase posterior identificada; no confundir build local con publicación.

## Entrega, reversión y tareas de diseño

- [x] Revisar arquitectura y contratos existentes.
- [x] Comparar alternativas y formular diseño recomendado.
- [x] Especificar datos, roles, UX, fallos, almacenamiento y pruebas.
- [x] Autorrevisión: eliminar ambigüedad sobre privado/compartido, aprobación, alcance del plan y revocación.
- [x] Usuario revisa/aprueba este documento.
- [x] Escribir plan de implementación y elegir ejecución nativa en worktree aislado.
- [ ] Implementar y verificar incrementos.

Migraciones aditivas, sin DROP/reset; respaldar antes de aplicar. Reversión deshabilita la nueva vista/rutas conservando datos compartidos. Nunca volver a versión de código que omita protecciones de seguridad. Almacenamiento comercial, acceso externo, correo y planes mantienen entregas propias con criterios de aceptación separados.
