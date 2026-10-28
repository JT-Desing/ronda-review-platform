# Revisión compartida — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking. Execution method awaits user selection; no agents dispatched by this document.

**Goal:** Dos miembros reales pueden revisar una pieza del espacio, corregirla con otra versión y aprobarla sin perder historial ni compartir datos privados.

**Architecture:** Extender los proyectos compartidos PostgreSQL mediante migraciones aditivas y autorización existente por espacio. Archivos compartidos separados de los privados, almacenamiento local detrás de un adaptador y una sala React con API propia. Extraer únicamente componentes presentacionales necesarios, sin trasladar snapshots privados.

**Tech Stack:** Node ESM, PostgreSQL/pg, React, Vite, HTML media/Pointer Events, node:test y Docker existente. Sin proveedor de almacenamiento nuevo ni librerías de producto nuevas.

**Spec:** `docs/superpowers/specs/2026-10-12-shared-review-design.md`, aprobado por el usuario mediante «empieza» después de su presentación.

## Global Constraints

- «Estado: diseño pendiente de revisión del usuario» del documento refleja su estado al escribirlo; aprobación conversacional recibida, implementación aún no autorizada tras plan.
- Solo MP4 reproducible e imágenes JPEG/PNG/WebP en esta primera entrega compartida.
- Límites de prueba: 100 MB/archivo y 2 GB/espacio; no paquetes comerciales.
- Todo miembro ve los proyectos compartidos; no publicar recursos privados ni prometer aislamiento por proyecto.
- Actor/fechas/permisos determinados por servidor; nuevos originales inmutables; aprobación no heredada.
- Cero contratación, DNS, pagos, correos automáticos, transcodificación o acceso público.
- Migraciones aditivas; no DROP/reset ni limpieza de datos reales para ejecutar pruebas.
- Commits con identidad Git local JulianT verificada; no incluir qa/, .env ni credenciales; no push/despliegue automático.

## Review Focus

1. Revocación o cambio de rol durante la subida: finalización rechazada, sin versión visible (T2/T3).
2. Dos subidas y aprobación simultáneas: números únicos, cuota respetada y sin aprobación con bloqueante (T3/T5).
3. Reintento después de respuesta perdida: misma operación sin archivo, comentario o evento duplicados (T2–T5).
4. Cambio de pieza durante lectura/subida: ignorar respuestas antiguas y conservar borrador correcto (T6).
5. Medio inválido o petición Range malformada: rechazo seguro sin contenido ejecutable ni fuga de otro espacio (T2/T7).

## Mapa de archivos y contratos comunes

Nuevos `backend/shared-review-policy.js`, `repositories/shared-review.js`, `shared-media-service.js`, `shared-comment-service.js`, `shared-decision-service.js`, `modules/shared-review.js`: políticas, persistencia, archivos/versiones, feedback, decisiones y HTTP respectivamente. `backend/storage/local.js` concentra IO compartido.

Nuevos `src/state/sharedReviewApi.js`, `src/components/SharedReviewRoom.jsx`, `shared-review-room.css`, `ReviewMediaStage.jsx` y `AnnotationLayer.jsx`. Modificar SharedProjects.jsx, main.jsx y app.js únicamente para conexión y extracción presentacional.

DTO Media: `{id, workspaceId, projectId, name, kind:'image'|'video', activeVersionId, revision}`. DTO Version: `{id, assetId, number, fileId, mime, size, createdAt, revision, status:'reviewing'|'approved', reviewerIds, decisions}`. DTO Comment: `{id,versionId,authorId,text,priority,status,anchor,annotation,revision,createdAt}`. Anchor `{timeSeconds:number|null}`; Annotation `{tool:'pen'|'arrow'|'square'|'type',color:'#RRGGBB',points:[{x,y}],text?:string}` o null. Coordenadas 0–1; timeSeconds finito y ≥0, nulo en imágenes; texto máximo 2000 caracteres; máximo 5000 puntos, texto de anotación 500 caracteres, color hex válido. Respuesta enlaza comentario padre sin cambiar versión.

Todos los servicios reciben repositorio/adaptador por inyección. `repository.access(space,actor,operation,write)` conserva el contrato transaccional de sharedProjectRepository; sus helpers comprueban toda la cadena de IDs. ReadRoom devuelve `{project,asset,version,comments,nextCursor,role}`. Listas de 50 comentarios, cursor createdAt+id validado y limitado al recurso. Código nuevo sin efectos al importarse.

### T0: Sincronizar base y conservar regresiones

**Files:** documentación aprobada y pruebas existentes; sin cambios de producto.

- [ ] Consultar estado/remoto y `git fetch origin`; comprobar divergencia. Solo `git merge --ff-only origin/automation/comments-panel-redesign` si no hay cambios rastreados ni divergencia; detenerse ante solapamiento, conservar qa/.
- [ ] Ejecutar `node --test src/domain/*.test.js src/state/*.test.js src/data/*.test.js backend/*.test.js`; registrar resultado real. No asumir 77 pruebas tras traer PR.
- [ ] Ejecutar `node node_modules/vite/bin/vite.js build`; registrar avisos, sin etiquetarlos resueltos.
- [ ] Commit únicamente los dos documentos con `docs: define shared review scope and implementation plan` después de aprobación del plan.

### T1: Modelo y política compartidos

**Files:** Create backend/migrations/0004_shared_review.sql, backend/shared-review-policy.js y .test.js, backend/repositories/shared-review.js; Test backend/shared-review-model-integration.js.

**Interfaces:** `validateAnnotation(annotation)`, `validateAnchor(anchor,kind)`, `requireReviewAction(role,action)`; errores con status. Repositorio usa access y helpers `asset(db,space,project,assetId)` y `version(db,space,project,assetId,versionId)`.

- [ ] Test `reviewer_cannot_upload`: `assert.throws(()=>requireReviewAction('reviewer','upload'),{status:403})`; `cross_space_returns_404`; `coordinates_outside_unit_square_rejected`; `video_time_nonfinite_rejected`.
- [ ] `node --test backend/shared-review-policy.test.js` debe fallar por implementación ausente.
- [ ] Implementar política y tablas shared_assets, shared_versions, shared_media_files, shared_version_comments, shared_comment_replies y shared_review_decisions. FKs compuestas refuerzan pertenencia, UNIQUE pieza/número y actor/requestId. Estado de archivo staging/ready/failed. Revisores vinculados a miembro del espacio, historial de decisión preservado por evento; restricciones sin cascada que borre auditoría.
- [ ] Ejecutar política e integración QA siguiendo patrón shared-project-integration.js; `schema_preserves_private_records` compara datos privados antes/después y rechaza FK cruzada.
- [ ] Commit archivos explícitos: `feat: define shared review model and policies`.

### T2: Subida y lectura autorizadas

**Files:** Create backend/storage/local.js, local.test.js, backend/shared-media-service.js, modules/shared-review.js, shared-media-integration.js; Modify backend/app.js para enrutar antes de proyectos genéricos.

**Interfaces:** storage `stage({workspaceId,uploadId,stream,maxBytes}) -> {key,size}`, `open({key,start,end}) -> stream`, `finalize({temporaryKey,key})`, `discardTemporary({key})`; service `reserve(space,actor,{projectId,assetId?,name,mime,size,requestId}) -> {uploadId}`, `receive(space,actor,uploadId,req)`, `readFile(space,actor,fileId,{download,range})`. Reserva vive 1 hora; cuota incluye ready+reservas vigentes. Reconciliación conservadora solo staging vencido y sin referencia.

- [ ] Tests `reviewer_cannot_reserve`, `parallel_reservations_respect_2gb`, `malformed_range_416`, `foreign_file_404`, `revoked_mid_upload_not_ready`, `incomplete_upload_preserves_old_file`, `mime_spoof_rejected`.
- [ ] Verificar fallo inicial mediante `node --test backend/storage/local.test.js` e integración con base QA.
- [ ] Implementar POST `/api/workspaces/:s/projects/:p/uploads`, PUT `/api/workspaces/:s/uploads/:u/content`, GET `/api/workspaces/:s/media/:f`. Bytes locales bajo directorio compartido independiente; validar firma PNG/JPEG/WebP/MP4, rechazar contenido ejecutable. IO sin conexión SQL prolongada; validar rol también al finalizar. Rangos simples, Content-Range/206/416 correctos; descargas solo admin/editor. No rutas internas en respuesta.
- [ ] Ejecutar pruebas y caso `repeat_upload_key_returns_same_result`; recuperar estados tras fallo de rename/commit sin borrar ready referenciado.
- [ ] Commit: `feat: add authorized workspace media storage`.

### T3: Piezas e historial real

**Files:** Modify shared-media-service.js y modules/shared-review.js; Create shared-version-integration.js.

**Interfaces:** `listAssets(space,actor,projectId)`, `listVersions(space,actor,projectId,assetId)`, `completeUpload(space,actor,uploadId) -> {asset,version}`, `setReviewers(space,actor,{projectId,assetId,versionId,reviewerIds,revision})`.

- [ ] Tests `two_uploads_get_unique_version_numbers`, `new_version_decisions_pending`, `v1_original_unchanged`, `removed_member_not_assigned`, `duplicate_finalize_one_version`, `approval_upload_race_keeps_version_scopes`.
- [ ] Ejecutar integración esperando fallo; implementar finalización idempotente bajo bloqueo de pieza y pertenencia.
- [ ] GET `/projects/:p/assets`, GET `/projects/:p/assets/:a/versions`, POST `/uploads/:u/complete`, PUT `/projects/:p/assets/:a/versions/:v/reviewers`, todos bajo prefijo de workspace. Respuestas utilizan DTO común; nueva versión conserva solo miembros vigentes, CAS revision.
- [ ] Integración QA pasa y archivos reservados nunca aparecen como versiones completas antes de confirmarse.
- [ ] Commit: `feat: add immutable shared asset versions`.

### T4: Feedback y anotaciones de versión

**Files:** Create backend/shared-comment-service.js, shared-comment-integration.js; Modify modules/shared-review.js.

**Interfaces:** `listComments(space,actor,context,{cursor})`, `addComment(space,actor,context,{text,priority,anchor,annotation,requestId})`, `editComment(space,actor,context,commentId,{text,revision})`, `setStatus(space,actor,context,commentId,{status,revision})`, `reply(space,actor,context,commentId,{text,requestId})`. Context `{projectId,assetId,versionId}`.

- [ ] Tests `forged_author_ignored`, `wrong_version_anchor_rejected`, `reviewer_cannot_resolve`, `edit_other_author_denied`, `conflict_preserves_data`, `pagination_no_duplicates`, `retry_no_duplicate_event`, `approved_version_feedback_rejected`.
- [ ] Ejecutar integración esperando fallo y luego implementar POST/GET version/comments, PATCH comment/text o status y POST comment/replies. Validación payload limitado; editar solo texto, nunca contexto/autor; transacción bloquea versión y registra evento. Respuestas solo en reviewing.
- [ ] Repetir pruebas y confirmar comentarios generales previos intactos.
- [ ] Commit: `feat: add shared version comments and annotations`.

### T5: Decisiones y cierre consistente

**Files:** Create backend/shared-decision-service.js, shared-decision-integration.js; Modify modules/shared-review.js y workspace-service.js para reconciliar participación al revocar.

**Interfaces:** `decide(space,actor,context,{decision,revision,requestId}) -> {version}`, `reviewSummary(db,versionId) -> {approved,pending,changesRequested,blockers,status}`. Decisiones pendiente/aprobado/cambios solicitados según DTO; persistir claves `pending`,`approved`,`changes_requested`.

- [ ] Tests `unassigned_cannot_approve`, `blocking_comment_prevents_final_approval`, `zero_reviewers_never_approved`, `concurrent_blocker_and_approval_serialized`, `revocation_excludes_decision_keeps_event`, `approved_version_readonly`, `new_version_not_approved`.
- [ ] Ejecutar integración esperando fallo, implementar POST version/decisions, bloqueo de versión y CAS. Versión final approved solo todos vigentes aprobados, ≥1 asignado y cero bloqueantes. No aprobación por admin no asignado. Retirar revisor puede devolver estado a reviewing; preservar evento y explicar cambio en UI.
- [ ] Regresión workspace-integration.js y pruebas anteriores verdes.
- [ ] Commit: `feat: enforce shared review approval lifecycle`.

### T6: Sala compartida e integración visual

**Files:** Create src/state/sharedReviewApi.js y sharedReviewState.js/.test.js, src/components/SharedReviewRoom.jsx, shared-review-room.css, ReviewMediaStage.jsx y AnnotationLayer.jsx; Modify main.jsx y SharedProjects.jsx.

**Interfaces:** API `getRoom(context)`, `uploadFile(context,file,requestId,onProgress)`, `postComment(context,input)`, `postDecision(context,input)` llaman rutas anteriores. `getRoom` combina lecturas autorizadas y no usa snapshot privado. `SharedReviewRoom({workspaceId,projectId,assetId,onBack,onNotify})`; `ReviewMediaStage` y `AnnotationLayer` conservan props actuales de main.jsx. Modelo `acceptResponse(currentContext,responseContext,data)` descarta respuestas cruzadas.

- [ ] Test `late_response_other_asset_ignored`, `409_preserves_comment_draft`, `private_state_not_mutated`, `historical_version_remains_selected_on_refresh` en sharedReviewState.test.js; ejecutar hasta fallar.
- [ ] Extraer funciones presentacionales y sus imports sin cambiar comportamiento privado; implementar lista/subida de piezas en SharedProjects y sala por contexto UUID. Obtener Blob autorizado, limpiar object URLs y usar generación/AbortController. Progreso con XHR autenticado o equivalente nativo, sin librería nueva. Restaurar foco y advertir borrador antes de navegar.
- [ ] Completar selector historial, revisores, comentarios, herramientas y decisión con estado servidor; actualización al entrar/foco y botón. Mantener etiqueta compartido, histórico, solo lectura; desactivar herramientas de approved. Sin datos de cliente externo ni contadores ficticios mezclados.
- [ ] Ejecutar `node --test src/state/sharedReviewState.test.js` y build; QA con dos sesiones reales cubre subida, V1→V2, anotación y aprobación; teclado/móvil/movimiento reducido. Preview social común consume versión compartida explícita, sin consultar assets privados; calendario sigue etiquetado privado hasta siguiente entrega.
- [ ] Commit: `feat: connect shared review room and version workflow`.

### T7: Regresión integral y preparación de entrega

**Files:** Create backend/shared-review-flow-integration.js; Modify backend/README.md, ARCHITECTURE.md, PRODUCT_COMPLETION.md; evidencias QA privadas excluidas de Git.

- [ ] Crear integración QA que ejecuta admin→revisor→editor→V2→aprobación; UUID cruzados, roles revocados, Range y restauración de archivos verificados. Usar base UUID exclusiva y eliminar solo recursos QA validados.
- [ ] Ejecutar suites unitarias y build de T0; integraciones QA de T1–T5/T7 y existentes de equipo/proyectos; anotar conteos y errores reales.
- [ ] Realizar preflight de migraciones sobre copia restaurada según ARCHITECTURE.md; no aplicar a base viva. Prueba recuperación staging/ready tras reinicio; original/checksum y contexto conservados.
- [ ] Revisar toda rama: autorización por petición, payloads, cuotas, idempotencia, concurrencia, accesibilidad y que no se publique contenido privado. Cualquier fallo bloquea entrega.
- [ ] Documentar capacidad real, límites del prototipo, operación del adaptador local, recuperación y reversión por deshabilitar rutas/vista sin borrar tablas. Definir checklist futuro para almacenamiento comercial, sin contratarlo.
- [ ] Commit: `test: verify shared review isolation and recovery`. No push ni despliegue sin etapa posterior explícita; reportar qué pruebas faltan si Docker/dependencias no disponibles.

## Autorrevisión y puerta de ejecución

Cobertura: datos T1; almacenamiento/cuotas/rangos T2; versiones T3; comentarios/anotaciones T4; aprobaciones/revocación T5; coherencia/estados/UI T6; reversión y QA T7. Acceso externo, correo, pagos, planes y almacenamiento comercial siguen fuera de alcance.

El almacenamiento y sus metadatos no tienen transacción distribuida: estados de recuperación son obligatorios. No se acepta promesa de revocación de bytes ya descargados ni precisión frame legal. Se mantienen todas las protecciones del PR remoto tras sincronización.

Plan pendiente de revisión del usuario y elección de método. Recomendación: ejecución nativa secuencial, porque tareas comparten contratos y necesitamos conservar contexto; no desplegar incrementos parciales como flujo completo.
