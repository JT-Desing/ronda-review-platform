# Segunda pasada — herramientas y accesibilidad

2026-10-14. Revisión del código y regresiones Node; reproducción UI del fallo en build previo. Corrección aún sin compilar ni retest visual.

## Casos y hallazgos

| Caso | Evidencia previa | Cambio / resultado |
|---|---|---|
| Compartir: Tab y Shift+Tab | `ShareProjectButton` solo gestionaba Escape; no tenía referencias ni contención de foco. Regresión de fuente RED. | Foco inicial en enlace, ciclo entre extremos del diálogo, recuperación de foco que intente salir, retorno al trigger al cerrar. Prueba conductual de ambos extremos PASS. |
| Compartir: fallo de clipboard | `catch` solo restablecía `copied=false`, sin mensaje. Regresión RED. | Estado pendiente evita solicitudes duplicadas; rechazo muestra instrucción de copia manual mediante el campo seleccionable. Éxito solo tras resolver `writeText`. Integración real del portapapeles sigue inconclusa. |
| Teclado sobre controles | El handler global ignoraba solo INPUT/TEXTAREA/SELECT: Espacio sobre botón también podía ejecutar reproducción y prevenir activación nativa. Regresión RED. | Ignora controles interactivos, eventos consumidos y diálogos modales. Prueba conductual PASS. |
| Herramientas / undo / redo | Botones tienen nombres y pressed; undo compartido restringido a marcas draft; redo se limpia ante nuevos trazos/cambio de medio. | Inspección de código; recorrido previo G04/G06 en CSV. Sin nueva publicación ni aprobación UI. |
| Audio | Grabación no iniciada. Audio adjunto ya consta H04 en CSV. | No se solicitó micrófono. Limitación observada por código: rama de audio nativa no sincroniza `playing`/`muted` con controles personalizados. El flujo compartido necesita confirmar si admite audio como pieza antes de ampliar cambios. |
| Fullscreen | Padre ya corrigió salida visible y Escape. | Sin cambios CSS ni nueva verificación visual de fullscreen. |
| Anotaciones | Canvas exige puntero para crear figuras; pines son botones con nombre/cantidad. | Pendiente alternativa de creación por teclado y verificación con lector de pantalla. No se afirma conformidad WCAG completa. |

## Pruebas

`node --test src/components/review-accessibility.test.js src/domain/review-focus.test.js`: 4 PASS. Las dos pruebas de integración por fuente fallaron antes del cambio; dos pruebas conductuales ejercitan contención de foco y aislamiento de atajos con objetos DOM simulados. No sustituyen una prueba real de foco/clipboard en navegador.

## Límites

El navegador IAB2 del subagente devolvió inventario sin pestañas; pestaña 9 no encontrada. Tras autorización del principal se creó pestaña oculta 1 en el mismo IAB hacia Lucía `.5:24104`, que heredó sesión existente. Proyectos → Lanzamiento Aurora → Compartir: foco inicial en enlace (AX184); Shift+Tab pasó al scrim AX177; segundo Shift+Tab pasó al botón de fondo Compartir AX27 mientras seguía abierto. Cerrar AX187 eliminó modal y dejó foco en documento AX0, sin retorno al trigger. Esto reproduce ambos defectos por navegador sobre build anterior. Pestaña 1 conservada con markHandoff, modal cerrado, sin cambios de proyecto.

No se tocaron otras identidades, membresías, grabación, producción ni laboratorio. Sin build/deploy/commit/push. El principal verificará integración visual y compilación. Falta comprobar Tab/Shift+Tab/Escape/cierre por scrim y retorno al trigger en modal compilado, copia exitosa real y rechazo de permisos clipboard, fullscreen con foco sobre un botón, herramienta seleccionada tras cerrar modal y responsive del mensaje de error.

Suite `node --test src/**/*.test.js`: 109 PASS en esta ejecución (alcance src; no incluye backend). Retest focal después de preservar Escape fullscreen sobre botones: 4 PASS.

### Retest HTTP de decisiones, versiones y revisión (2026-10-15)
`shared-decision-integration.js`: PASS para asignación, bloqueantes, solo lectura, reintentos e historial de revocación. `shared-version-integration.js`: PASS para originales inmutables, numeración única, revisores pendientes y lecturas/Range con alcance. `shared-review-flow-integration.js`: PASS para flujo, orden persistido, límites por rol/espacio, conflictos, papelera/restauración conservando comentarios, carga, aprobación, Range y sesión expirada sin pérdida de datos. Bases QA efímeras del runner; esto no equivale a prueba visual de interfaz.

### Retest de audio adjunto sin micrófono (2026-10-16)
`node backend/shared-review-qa-runner.js comment-audio-integration.js`: PASS en base temporal para persistencia, metadatos, reintento idempotente, lectura por miembro, rechazo de cuenta externa y aislamiento tras eliminar el proyecto. `node --test backend/comment-audio.test.js`: 1/1 PASS; rechaza URL externa, contenido que no es audio y cantidad fuera del límite. La UI ya tiene evidencia H04 de MP3 adjunto; micrófono no solicitado por el usuario y continúa sin probar.

### J11 Pauta: nombre accesible verificado (2026-10-17)
En runner UI descartable creé una campaña sintética desde el formulario. El DOM/accessibility snapshot la expuso como `button "Campaña accesibilidad QA 0 piezas"`; el locator `getByRole('button', {name: /Campaña accesibilidad QA/})` resolvió exactamente un elemento. Enter activó la campaña y `aria-current` quedó en `true`. El árbol AX del adaptador CUA todavía omite el nombre calculado, por lo que se registra como limitación del adaptador y no como defecto del producto. Runner parado con `/qa/stop` y proceso terminado; datos temporales retirados.

### Auditoría secundaria del estado (2026-10-16)

- La evidencia posterior R12 de `ronda-browser-cases.csv` reemplaza la nota histórica de que el canvas “exige puntero”: Eva enfocó el canvas, dibujó con flechas + Enter y deshizo la marca local. No publicar contenido. Esta evidencia no equivale a prueba con lector de pantalla.
- `G08` en el registro principal/CSV sí reporta entrada y salida de fullscreen en imagen/video, incluidas F y Escape. La nota de límites de esta página que dice “sin nueva verificación visual” corresponde a la pasada anterior y ya no describe el estado más reciente.
- Sigue sin comprobarse clipboard real (éxito y rechazo), dispositivo táctil físico ni todos los controles/breakpoints. El usuario aplazó explícitamente micrófono; MP3 adjunto sí está probado en UI/API. La consulta DOM/accessibility y activación de campaña Pauta J11 se validaron en M185; CUA AX permanece como fuente discrepante.
- Audio como pieza independiente es **no aplicable** al contrato actual (R18): audio se adjunta a comentarios y está probado aparte; no registrar como defecto la rama defensiva de `OriginalMediaStage` hasta que el producto admita ese tipo de pieza. La paginación de comentarios >50 ya se verificó visualmente en M01 (50→100→123, el bloqueante final siguió deshabilitando aprobación). Sigue pendiente el recorrido visual del selector/nueva versión por UI; la escritura/versionado tiene cobertura de integración, pero el selector de archivos del navegador ha bloqueado las cargas de prueba.
- La cobertura fuerte de review y audio no es total: automatización/concurrencia de varias sesiones API no sustituye todas las acciones en cinco UIs separadas. Ver matriz para alcance exacto; ninguna certificación WCAG completa se afirma.
- Retest de suites ejecutado por principal 2026-10-16: frontend 145/145, backend 52/52, build PASS. El navegador QA no tenía pestañas disponibles en esta pasada. Las correcciones MEDIA-003/004 se verificaron con regresión de fuente; reproducción de audio y rechazo real en browser pendientes.
