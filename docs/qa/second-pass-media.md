# Segunda pasada: medios y concurrencia — 2026-10-14

Alcance: HTTP real con PostgreSQL 17 temporal y almacenamiento temporal; no equivale a PASS de interfaz. Se leyó el runner antes de ejecutarlo: crea base `ronda_qa_*` exclusiva, no carga `.env`, elimina solamente su contenedor etiquetado al terminar. No se reinició el laboratorio conservado ni se tocó producción. Las identidades de estas pruebas son fixtures de integración, no prueba de registro/incorporación visual.

Se aplicaron depuración sistemática, prueba antes de corrección y verificación antes de declarar resultado. No se encontraron AGENTS.md en el checkout ni sus cuatro directorios superiores consultados.

## Hallazgo corregido: MEDIA-001

Una pieza en papelera rechazaba la sala de revisión con 404, pero su URL autenticada guardada `/api/workspaces/:space/media/:file` seguía devolviendo el original con 200 al revisor. Causa: `readFile` verificaba pertenencia al equipo, proyecto activo y archivo ready; omitía la existencia de una pieza activa. Se añadió esa verificación antes de abrir el stream, conservando los originales recuperables.

Evidencia RED: `shared-media-concurrency-integration.js` falló con `trashed media must not remain readable through saved URL`, observado 200 frente a esperado 404. GREEN: la misma prueba pasa y verifica acceso denegado normal, Range y descarga mientras la pieza está en papelera; después de restaurar devuelve exactamente los bytes originales y conserva los tres comentarios históricos.

## Casos y resultados

| Caso | Esperado | Observado/evidencia | Estado |
|---|---|---|---|
| Permisos reserva, orden, papelera y revisores | Revisor 403, externo 404 | HTTP real comprueba las cuatro mutaciones | PASS API |
| Finalizar carga de otro autor | 403 sin crear versión ajena | Admin no puede finalizar reserva de editor | PASS API |
| Dos cargas y finalizaciones simultáneas | Dos piezas distintas, dos originales | Promise.all, galería contiene dos piezas; reintento devuelve misma versión | PASS API |
| Dos órdenes con mismo estado anterior | Uno 200 y otro 409 | Códigos ordenados [200,409] | PASS API |
| Tres comentarios simultáneos | Conservar todos | Admin/editor/revisor publican y listado contiene tres | PASS API |
| Dos ediciones propias con revisión 0 | Un éxito y un conflicto | [200,409] | PASS API |
| Dos aprobaciones con revisión 1 | Un éxito y un conflicto; reintento explícito | [200,409], reintento revisión 2 aprueba; comentario posterior 409 | PASS API |
| Dos nuevas versiones simultáneas | Numeración única y versión actual coherente | Versiones 2 y 3; listado descendente empieza en 3; SQL confirma tres filas | PASS API |
| Dos envíos a papelera con igual revisión | Un éxito y un conflicto | [200,409]; sala histórica 404 | PASS API |
| Media de pieza eliminada y restaurada | 404 en papelera; bytes/comentarios recuperados | RED→GREEN MEDIA-001; normal/Range/descarga 404, restore 200, tres comentarios | PASS API |
| Externo con URL guardada | 404 sin bytes | Solicitud tras restore rechazada | PASS API |
| Equipo QA completo, cinco identidades | Admin, dos editoras y dos revisoras con sesiones independientes en servidor | Cinco comentarios simultáneos se conservan; tres cargas simultáneas autorizadas de admin/editoras generan activos distintos | PASS API |

## Verificación ejecutada

- `node backend/shared-review-qa-runner.js shared-media-concurrency-integration.js`: PASS, salida 0 (nueva prueba).
- `node backend/shared-review-qa-runner.js shared-review-flow-integration.js`: PASS, salida 0 (regresión existente de carga, Range, decisiones, papelera y comentarios).
- `node backend/shared-review-qa-runner.js shared-upload-interruption-integration.js`: PASS, salida 0 (transferencia abortada, reintento con la misma clave, fallo al finalizar y reconciliación).
- `node backend/shared-review-qa-runner.js comment-pagination-integration.js`: PASS, salida 0 (123 comentarios, tres páginas, cursores, permisos y total de bloqueantes).
- Retest ampliado 2026-10-15 `node backend/shared-review-qa-runner.js shared-media-concurrency-integration.js`: PASS, salida 0; cinco usuarios miembros comentan simultáneamente, las tres identidades con permiso de carga suben en paralelo y la prueba mantiene cobertura de conflictos, decisiones, versiones, papelera y restauración.
- `node --test src/**/*.test.js`: 109 PASS, 0 fallos.
- `node --test backend/*.test.js`: 40 PASS, 0 fallos.
- `npm test` no arrancó porque npm no está en PATH de esta sesión; se ejecutó directamente su comando exacto declarado en package.json: `node --test src/**/*.test.js`.

Los `api_error 403/404/409/416` de integración son respuestas negativas esperadas comprobadas con assertions. No se ejecutó build/deploy/commit/push.

## Gaps conservados

No se afirma aquí una nueva pasada de UI con cinco navegadores físicos ni cargas cercanas a cuota, rendimiento sostenido o micrófono. La integración usa cinco sesiones independientes del servidor y comprueba acciones concurrentes por HTTP; la UI multiparticipante ya tiene algunos casos documentados, pero una pasada visual coordinada completa sigue pendiente. La persistencia se verifica por lecturas HTTP y consultas SQL en nuevas transacciones. El éxito de enlaces externos sigue pendiente del DNS indicado en el registro principal. Las protecciones de URL y de acceso no fueron desactivadas.

## Ampliación: MEDIA-002, contador de pendientes históricos

El principal observó seis pendientes en la tarjeta de Aurora frente a cuatro de las versiones activas. Se reprodujo por HTTP con tres comentarios abiertos históricos de V1, V3 activa sin comentarios y un comentario general del proyecto. Esperado `open_review_comments=0`, observado 3: RED con assertion `project card must exclude open comments from historical versions`.

Causa: la subconsulta de `shared-project-service.js` excluía piezas eliminadas pero sumaba todas sus versiones. Se restringió a `a.active_version_id=c.version_id`; los comentarios generales de proyecto conservan su subconsulta independiente.

GREEN en la integración ampliada: histórico aporta 0; un comentario activo eleva revisión a 1; general continúa en 1; papelera baja revisión a 0 sin cambiar general; restaurar devuelve revisión a 1 y conserva los tres comentarios históricos. Esto verifica la semántica de pendientes accionables sin borrar historia. La comprobación visual queda a cargo del principal después de cargar el cambio en QA.

Verificación fresca adicional: `node backend/shared-review-qa-runner.js shared-media-concurrency-integration.js` salida 0; `node --test src/**/*.test.js backend/*.test.js`: 149 PASS, 0 fallos. No build ni reinicio.

### Retest adicional: almacenamiento QA aislado (2026-10-16)
`node backend/shared-review-qa-runner.js qa-file-root-integration.js`: PASS (salida 0). El runner creó una base PostgreSQL efímera con etiqueta QA; un PUT autenticado devolvió 201 y los bytes exactos se verificaron dentro del fileRoot temporal bajo el actor admin. El contenedor con esa etiqueta fue retirado por el runner. Esto prueba aislamiento del storage configurado, no cargas visuales del usuario. Caso F12.

### Auditoría del hallazgo heredado del runner (2026-10-16)
El agente de medios había visto `column deleted_at does not exist` en `shared-review-model-integration.js`, atribuible a una base/harness que aplicaba solo migraciones antiguas. Reejecutado hoy mediante el runner QA actual sobre PostgreSQL temporal migrado: PASS — FK entre espacios distintos rechazada y registros privados conservados. La incompatibilidad no se reproduce y no es defecto vigente del producto.

### Retest adicional de cuota y concurrencia (2026-10-16)
`shared-media-integration.js`: PASS, un request de 40 MiB se aceptó contra 48 MiB libres y el otro concurrente se rechazó 413 sin exceder la cuota. `shared-media-concurrency-integration.js`: PASS con cinco identidades independientes de servidor, tres cargas autorizadas simultáneas, cinco comentarios y contención de conflictos/decisiones/versiones/papelera/restore. Son integraciones API en PostgreSQL temporal, no cinco navegadores UI; no se modificó el laboratorio persistente.

### Retest concurrente + recuperación de cargas (2026-10-15)
- `node backend/shared-review-qa-runner.js shared-media-concurrency-integration.js`: PASS, cinco identidades de equipo, tres subidas autorizadas concurrentes, cinco comentarios concurrentes, decisiones/versiones/papelera/restauración y conflictos obsoletos.
- `node backend/shared-review-qa-runner.js shared-upload-interruption-integration.js`: PASS; aborto de transporte real, retry idempotente con la misma clave, limpieza ante error de firma, reconciliación de cargas `received` huérfanas, liberación de cuota y conservación del archivo original listo.
- El runner devolvió código 0 en ambos casos y usó sus bases temporales aisladas. No se reinició el servicio QA persistente ni se tocó ePayco.

### Auditoría secundaria de cobertura (2026-10-16)

La revisión READ-ONLY confirma que F01–F12 más M05/M06/M08 son evidencia extensa de UI/API, pero no hay que generalizarla: las cargas simultáneas de cinco identidades son HTTP y no selección multiparticipante de archivos en cinco navegadores; las caídas, cuotas, abortos y fallos de filesystem están inyectados/integrados, no probados como todas las fallas visibles de UI.

Pendientes explícitos: red degradada real y espera de error recuperable UI; carga UI grande/cercana a cuota y pérdida de conexión desde selector; concurrencia con selección de archivos desde sesiones de navegador; crash completo del proceso y fallos `unlink`/cleanup; medición de latencia de carga real en browser. Los links solo se verificaron para proveedores públicos concretos, no cualquier host, y los que requieren login se rechazan. F03 fue correcto en rechazo, pero el copy “Archivo inválido; prueba hasta 100 MB” no explica que es inválido y merece texto de error específico. PDF visual/anotable fue aplazado por el usuario; no sustituir esa decisión con una carga alternativa. El micrófono también está aplazado; MP3 adjunto sí probado.

La base QA persistente dejó de estar accesible después de la pasada anterior: `127.0.0.1:56792` rechaza conexión y Docker daemon no está disponible. Las pasadas de runner temporales anteriores permanecen como evidencia histórica, pero no se reejecutaron en esta auditoría; la invitación autorizada a Inés no se envió porque no se pudo verificar el equipo destino. Suites actuales frontend 142/142, backend 52/52 y build PASS; no son una medición de carga UI real.

### Revisión de colaboración UI carga/versiones y sustituto API — 2026-10-16

Intenté localizar dos sesiones de navegador QA separadas sin abrir ni usar pestañas ajenas. El inventario CUA disponible muestra Edge Perfil 1 con sitios no relacionados; no hay pestañas Ronda ni loopback QA y el navegador IAB no está disponible. Por eso no inicié una sesión nueva ni usé credenciales: la prueba UI de carga/versiones concurrentes queda parcial (M10). Los casos UI anteriores R46/R47 muestran persistencia entre sesiones y actualización de parrilla, pero no una carrera de dos selectores/versiones abiertas simultáneamente.

Como sustituto acotado ejecuté runners existentes, que crean PostgreSQL `ronda_qa_*` efímero, no cargan `.env` y retiran solo el contenedor efímero etiquetado propio:

- `node backend/shared-review-qa-runner.js shared-version-integration.js`: PASS, salida 0; dos reservas/finalizaciones simultáneas de versión del mismo asset producen números únicos 2 y 3, originales inmutables, revisores pendientes y lecturas/Range con permisos.
- `node backend/shared-review-qa-runner.js shared-media-concurrency-integration.js`: PASS, salida 0; cinco identidades API, tres cargas autorizadas concurrentes y dos versiones del mismo asset creadas concurrentemente por editor/admin; la API devuelve 2/3 sin duplicar ni perder originales y la lista conserva V3 actual. También pasan las aserciones de autorización, comentarios, conflictos, papelera y restauración.

Las pruebas son evidencia backend, no prueba de propagación visual entre sesiones concurrentes. No se añadió, eliminó ni cambió ninguna pieza en el QA persistente; ePayco y la pestaña del usuario no se tocaron. Se comprobó `docker info` (29.8.2) y el inventario posterior mostró solo contenedores QA antiguos con fechas de creación anteriores a estos runners; no se detuvieron ni alteraron.

### Retest UI de versiones concurrentes — 2026-10-16

M10 quedó cubierto en navegador QA con Ana Admin (`127.0.0.2:24101`) y Mario Editor (`127.0.0.4:24103`) en sesiones distintas. Ambos seleccionaron la misma pieza sintética del proyecto `QA colaboración versión 2026-10-16`, V2 aprobada, y abrieron `Nueva versión`. Seleccioné el PNG sintético existente en ambos diálogos en paralelo. Los logs de timing del servidor registran reservas POST, cargas PUT de contenido y finalizaciones POST solapadas desde las dos identidades, todas 200/201. La API/UI asignó V4 y V5 de forma única, sin perder historial.

Tras actualizar ambas sesiones, las dos mostraron V5 como versión actual, 0/1 aprobaciones y la misma pieza; Mario había mantenido V4 como versión seleccionada durante la primera actualización aunque la parrilla ya anunciaba V5 Actual, y al elegir V5 y actualizar conservó el nuevo estado. No se generaron comentarios ni se aprobaron versiones. Esto cierra la concurrencia UI de nuevas versiones del mismo asset; la creación concurrente de assets distintos y fallos de hardware/red siguen pendientes. Sin cambios al servicio QA persistente salvo estas dos versiones sintéticas; no se tocó ePayco ni la pestaña del usuario.
