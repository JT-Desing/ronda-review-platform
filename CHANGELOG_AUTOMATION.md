# Registro de mejora continua

Este archivo documenta cambios realizados por el ciclo automatizado de Ronda.

## 2026-10-09 — Ronda Studio aplicado por solicitud manual

- Hipótesis: traducir la referencia aprobada a un sistema visual coherente mejora exploración de proyectos y continuidad de revisión sin inventar capacidades.
- Aceptación: negro-violeta, portadas pastel, acciones blancas, navegación lavanda; Inicio con cifras reales de cuenta privada; biblioteca con búsqueda/filtros/lista; persistencia, permisos y túnel intactos; responsive y teclado sin regresiones.
- Archivos: src/studio-theme.css, StudioWorkspace.jsx, WorkspaceActions.jsx, main.jsx, project-presentation.js y pruebas, design-tokens.json, design-preview-studio.html, DESIGN.md y README.md. Se elimina el render privado sustituido, sin tocar los casos de uso del servidor.
- Pruebas: 34 frontend y 14 backend aprobadas; integración cuentas/archivos y proyectos compartidos aprobada. Build exitoso, aviso de bundle >500 KB previo permanece. UI real con cuenta de demostración: Inicio, filtros vacíos, lista/cuadrícula, formulario sin guardar, Tab, Enter y sala de revisión. Medidas 375/768/1440 sin overflow; se detectó y corrigió botón móvil en segunda fila. Cuatro pares de contraste >=4.5. No afirmar auditoría WCAG completa ni visual móvil física.
- Resultado: desplegado en Docker manteniendo túnel y volúmenes; no se cambiaron datos de la cuenta de demostración ni credenciales. Cuenta sintética auxiliar retirada. No commit/push sobre trabajo pendiente del usuario; automatización permanece pausada.
- Skills: design-system y frontend-design-direction aplicadas; Liquid Glass adaptado a CSS con fallback sólido, no API nativa iOS. Design Report pendiente: renderizador de plantilla falló por ausencia de LibreOffice empaquetado; referencia sin modificar, sin Word no verificado.
- Próximo: miniaturas autorizadas de servidor, consolidar CSS heredado y revisión visual móvil física. Calendario/perfil de mockup y archivos compartidos siguen pendientes; no añadir menús sin función.

## 2026-10-09 — Equipo e invitaciones reales (solicitud manual)

- Hipótesis: sustituir miembros simulados por pertenencias autenticadas evita confundir roles locales con permisos reales, preparando colaboración posterior.
- Aceptación: lectores externos denegados; solo admin administra; último admin protegido con concurrencia; código privado de un uso y siete días, revocable y con correo coincidente; historial servidor; referencias/datos previos intactos; interfaz sin prometer proyectos compartidos ni correo enviado.
- Archivos: migración 0002, policy/service/repository/controller de workspaces, WorkspaceTeam.jsx y CSS, reexport TeamActions, pruebas y documentación.
- Verificación: 12 pruebas backend + 32 frontend; migraciones nuevas/concurrentes/rollback y copia restaurada del PC sin pérdida de filas; integración de permisos/invitaciones/concurrencia/capacidad en base aislada; regresión de snapshots/archivos. Builds Docker API/frontend correctos (aviso previo de bundle >500 KB sigue pendiente). UI generó invitación sintética de 43 caracteres visible una vez; búsqueda y teclado correctos, sin errores de consola; medidas responsive 375/768/1440 y controles de 44 px. Captura móvil escalada: no afirmar revisión visual completa móvil. Cuenta QA, invitación y medios QA eliminados; datos del usuario intactos.
- Resultado: equipo y roles reales desplegados manteniendo túnel/volúmenes. Sin SMTP, Google ni colaboración de proyectos habilitados. Próxima prioridad: permisos de recursos y migración explícita a proyectos compartidos, con respaldo y pruebas cruzadas.

## 2026-10-09 — Arquitectura y migraciones (solicitud manual)

- Hipótesis: separar capacidades y versionar el esquema reduce el riesgo de ampliar autenticación/equipos sin romper persistencia existente.
- Aceptación: conservar contratos HTTP, origen/cookies, sesiones, aislamiento, snapshots, archivos, túnel y volúmenes; migración inicial repetible sin pérdida de filas; fallo atómico e historial inmutable.
- Archivos: backend/server.js, app.js, http.js, auth-service.js, database.js, modules/, repositories/, migrations/0001_baseline.sql, migration-runner.js, migrate.js, Dockerfile, package.json y documentación de arquitectura.
- Verificación: 10 pruebas backend y 32 frontend aprobadas; integración PostgreSQL nueva/concurrente/idempotente/rollback/adopción previa aprobada; copia restaurada del PC migrada dos veces con fingerprints de filas iguales; integración de cuentas/snapshots/archivos aprobada; sesión persistió tras reiniciar database/api, logout la revocó y cuenta QA fue eliminada. Conexión transitoria al reiniciar detectada y cubierta con reintento limitado (sin reintentar errores de historial/esquema). Respaldo previo conservado en .backups/, sin secretos publicados.
- No se implementan todavía permisos de recursos compartidos ni SMTP/Google configurado. No se reactivó automatización ni se hicieron commits de cambios anteriores del usuario. Siguiente prioridad: permisos reales de espacios y recursos, con migración explícita de snapshots.

## 2026-10-07 — Preparación inicial

- Se creó el prototipo funcional y responsive.
- Se añadieron las vistas de proyectos, actividad, equipo y configuración.
- Se configuró una automatización de mejora continua cada 30 minutos.
- Se añadió el workflow de compilación y despliegue para GitHub Pages.
- Verificación: `pnpm build` completado correctamente.
# 2026-10-08 — Ciclo de revisión conectado

- Se incorporó un estado central versionado y persistente para comentarios, decisiones, actividad y notificaciones.
- Crear, resolver o reabrir comentarios ahora alimenta el registro de actividad.
- Se añadieron reglas verificadas para bloquear una aprobación cuando existen comentarios bloqueantes.
- Se agregó un centro de notificaciones web y lectura persistente.
- Se corrigió el enlace compartido para funcionar bajo la ruta de GitHub Pages.
- Las herramientas de anotación todavía no implementadas se muestran deshabilitadas para evitar acciones engañosas.
- La invitación al equipo valida correos, duplicados y el límite de cinco puestos del plan Studio.

## Referencias visuales y comandos rápidos

- Los comentarios aceptan hasta tres imágenes o capturas de referencia, mediante selector de archivos o pegado desde el portapapeles.
- Las referencias muestran vista previa, se pueden quitar antes de publicar y permanecen vinculadas al comentario.
- Flecha, rectángulo y texto ya son herramientas funcionales junto al lápiz.
- Se añadieron atajos de reproducción, navegación por fotograma, herramientas, sonido, pantalla completa y comentarios.
- El botón `?` abre una guía visual de comandos; `Esc` cierra paneles y modales.
- La paleta completa permanece disponible en móvil mediante desplazamiento horizontal.
- `Ctrl/⌘ + Z` deshace la última anotación y `Ctrl/⌘ + Shift + Z` o `Ctrl/⌘ + Y` la restaura, sin interferir con la edición de texto.

## Contenedor y despliegue por túnel

- Se añadió una imagen Docker multi-stage con Node 24 para compilación y Nginx para producción.
- Nginx sirve la SPA y sus rutas en el puerto `8080`, con caché para assets y cabeceras básicas de seguridad.
- Docker Compose incluye el servicio `ronda` y un perfil opcional `tunnel` mediante Cloudflare Tunnel.
- El hostname previsto es `ronda.repolite.link` y su origen interno es `http://ronda:8080`.
- El token se carga exclusivamente desde `.env`, que permanece fuera del repositorio.

## Centro de actividad operativo

- La actividad ahora puede filtrarse simultáneamente por tipo, proyecto, persona, período y estado sin leer.
- Se agregó búsqueda por contenido, proyecto o participante y una acción para limpiar todos los filtros.
- Los eventos se agrupan en Hoy, Ayer y Esta semana, con estado leído persistente.
- Las métricas resumen eventos pendientes, comentarios, decisiones y proyectos activos.
- Cada evento enlaza con su proyecto o sala de revisión y existe un estado vacío accionable.
- La vista responde en escritorio, tablet y móvil sin convertir los filtros en una tabla horizontal.

## Presencia colaborativa

- El indicador superior muestra cuántas personas están viendo la revisión y despliega su nombre, actividad y timecode actual.
- Los avatares visibles funcionan como accesos directos y `+N` abre la lista completa de participantes.
- Seleccionar una persona lleva el reproductor a su fotograma y muestra su cursor identificado sobre el contenido.
- La implementación actual simula presencia local; el modelo visual y de interacción queda preparado para sincronización por WebSockets.

## Panel editorial de comentarios

- Hipótesis: una jerarquía editorial plana, con menos contenedores repetidos, permite revisar más rápido y evita la apariencia genérica de un panel generado automáticamente.
- Criterios de aceptación: distinguir pendientes y resueltos, buscar comentarios, saltar al timecode, responder dentro del hilo, resolver comentarios y conservar referencias visuales sin perder claridad.
- Se reorganizó la cabecera con contexto de revisión, conteos reales y filtros `Todos`, `Abiertos` y `Resueltos`.
- Cada hilo muestra autor, estado, timecode y fotograma como acciones claras; los comentarios bloqueantes conservan una señal visible sin dominar la interfaz.
- Las respuestas se escriben y persisten dentro del comentario, con envío por teclado y contador por hilo.
- Se incorporó búsqueda con estado vacío, y se mantuvieron las capturas de referencia y el compositor fijo al pie.
- Archivos: `src/main.jsx` y `src/styles.css`.
- Verificación: pruebas unitarias 3/3, compilación de producción, `git diff --check`, búsqueda sin coincidencias y respuesta persistida verificadas en navegador.
- Siguiente prioridad: sincronizar respuestas y presencia con un backend en tiempo real; hoy ambas capacidades siguen siendo locales o simuladas.

## Recuperación segura de comentarios anteriores

- Hipótesis: una migración silenciosa, repetible y verificable evita conteos inflados y saltos a fotogramas incorrectos para usuarios que ya utilizaron el prototipo.
- Criterios de aceptación: no duplicar observaciones equivalentes, conservar timecode, autor y respuestas disponibles, tolerar JSON dañado y producir el mismo resultado en ejecuciones repetidas.
- La carga normaliza tanto datos antiguos como estados ya guardados, elimina duplicados por texto y fotograma, y repara segundos inconsistentes desde el fotograma a 24 FPS.
- Los autores no vinculados conservan su nombre anterior; dejan de mostrarse automáticamente como invitados.
- Se eliminó el marcador lateral no atómico: si el navegador cierra antes de persistir, la importación puede repetirse sin perder datos ni crecer en cada arranque.
- Los errores de almacenamiento ya no desmontan la sesión activa; el producto continúa en memoria mientras se prepara un aviso explícito de persistencia para un ciclo futuro.
- Se añadieron cinco pruebas de migración para mapeo, deduplicación, reparación temporal, repetición y JSON corrupto.
- Archivos: `src/state/migration.js`, `src/state/RondaContext.jsx`, `src/state/RondaContext.test.js` y `src/main.jsx`.
- Siguiente prioridad: informar en la interfaz cuando el navegador no pueda persistir por cuota o privacidad, y mover adjuntos a almacenamiento de blobs.

## Estado visible de persistencia local

- Hipótesis: avisar de forma persistente cuando el navegador rechaza el guardado evita que el equipo confunda cambios disponibles en memoria con cambios recuperables después de recargar.
- Criterios de aceptación: la sesión no se rompe, distingue cuota agotada de almacenamiento bloqueado, mantiene el aviso hasta guardar y ofrece un reintento manual.
- El proveedor de estado ahora expone el fallo de persistencia y una acción de reintento en lugar de silenciarlo.
- Una franja accesible explica que los cambios siguen disponibles durante la sesión y recomienda reducir referencias pesadas cuando la cuota está llena.
- El aviso desaparece únicamente después de que una escritura posterior finaliza correctamente.
- Se añadió una prueba de regresión para `QuotaExceededError`; la suite alcanza 9/9 pruebas.
- Archivos: `src/state/migration.js`, `src/state/RondaContext.jsx`, `src/state/RondaContext.test.js`, `src/main.jsx` y `src/styles.css`.
- Siguiente prioridad: recuperar borradores con `sessionStorage` y trasladar imágenes de referencia a almacenamiento de blobs.

## Recuperación de borradores de comentario

- Hipótesis: conservar el texto durante la pestaña evita perder una observación al recargar, cambiar de vista o cerrar el panel móvil accidentalmente.
- Criterios de aceptación: restaurar texto por espacio, proyecto, versión y usuario; compartirlo entre panel desktop y drawer móvil; eliminarlo al publicar o vaciar; no persistir imágenes.
- El borrador usa una única fuente de estado en la aplicación, evitando que las dos presentaciones del panel se sobrescriban.
- `sessionStorage` recupera únicamente texto y muestra una confirmación discreta dentro del compositor; las referencias visuales siguen excluidas para proteger cuota y privacidad.
- Los errores de `sessionStorage` se toleran sin impedir escribir o publicar.
- Se añadió una prueba de guardar, recuperar y eliminar; la suite alcanza 10/10 pruebas.
- Archivos: `src/state/migration.js`, `src/state/RondaContext.test.js`, `src/main.jsx` y `src/styles.css`.
- Siguiente prioridad: anclar el borrador a su timecode original y ofrecer descarte explícito antes de evolucionar hacia almacenamiento de blobs.

## Estados vacíos accionables en comentarios

- Hipótesis: distinguir una revisión nueva, un filtro vacío y una búsqueda sin coincidencias reduce confusión y ayuda a continuar sin abandonar el panel.
- Criterios de aceptación: cada causa muestra copy específico y, cuando corresponde, permite limpiar la búsqueda o volver a todos los comentarios.
- Una revisión sin feedback invita a pausar en un cuadro y dejar la primera indicación.
- Los filtros sin elementos ofrecen `Ver todos`; las búsquedas fallidas muestran el término y `Limpiar búsqueda`.
- La lógica se aisló en dominio y quedó cubierta por dos pruebas; la suite alcanza 12/12 pruebas.
- Archivos: `src/domain/comments.js`, `src/domain/comments.test.js`, `src/main.jsx` y `src/styles.css`.
- Siguiente prioridad: anclar el borrador recuperado a su fotograma original para evitar publicaciones temporales accidentales.

## Aislamiento de borradores por contexto

- Hipótesis: cambiar de versión o identidad nunca debe copiar el texto de un borrador hacia otra revisión o persona.
- Criterios de aceptación: cada clave recupera su propio texto, una clave nueva comienza vacía y volver al contexto anterior restaura su edición sin sobrescribir otros datos.
- El estado usa un caché indexado por espacio, proyecto, versión y usuario; el cambio de contexto resuelve clave y valor de forma conjunta.
- El selector V1–V3 ya separa los borradores, aunque los datos de versiones anteriores continúan siendo demostrativos.
- Se añadió una prueba específica de aislamiento; la suite alcanza 13/13 pruebas.
- Archivos: `src/state/migration.js`, `src/state/RondaContext.test.js` y `src/main.jsx`.
- Siguiente prioridad: conservar junto al borrador el fotograma original y permitir reasignarlo explícitamente.

## Herramientas de anotación fiables

- Hipótesis: cada gesto debe conservar la herramienta elegida y permanecer alineado al medio al redimensionar, especialmente en tablet y pantalla completa.
- Criterios de aceptación: lápiz, flecha, rectángulo y texto conservan tipo y color; cancelaciones no crean marcas; resize mantiene posición; undo/redo opera por anotación; controles anuncian selección.
- Se corrigió el defecto que convertía flechas y rectángulos en trazos libres al soltar el puntero.
- Las coordenadas ahora se almacenan normalizadas y se renderizan con `devicePixelRatio`, por lo que conservan su posición al cambiar tamaño u orientación.
- El ciclo Pointer Events ignora punteros secundarios, botones no primarios y gestos cancelados; la herramienta y el color quedan fijados al comenzar el gesto.
- Texto dejó de usar `prompt()` y ahora se escribe directamente sobre el fotograma con Enter para confirmar y Escape para cancelar.
- Herramientas y colores exponen `aria-pressed`, nombres comprensibles, foco visible y objetivos táctiles de 44 px.
- Se añadieron tres pruebas del modelo de anotaciones; la suite alcanza 16/16 pruebas. Flecha, rectángulo, undo y redo se verificaron también en el despliegue sin errores de consola.
- Archivos: `src/domain/annotations.js`, `src/domain/annotations.test.js`, `src/main.jsx` y `src/styles.css`.
- Siguiente prioridad: asociar las anotaciones a versión y fotograma para que no permanezcan visibles durante todo el video.
## 2026-10-08 — comentarios simultáneos en timeline

- Hipótesis: marcadores coincidentes ocultan hilos y dificultan abrirlos.
- Aceptación: agrupar por fotograma, conservar todos los hilos, seleccionar cada uno con clic/teclado/tacto y excluir tiempos inválidos.
- Implementación: componente TimelineMarkers y agrupación pura con dos pruebas. Panel desplazable, contador y alineación en extremos; paleta del sistema existente.
- Limitaciones: using-superpowers y skills de analítica/publicación no están disponibles en sus rutas actuales. Subagente anterior falló por créditos; revisión de producto, QA, UX y operación realizada secuencialmente. No se usa IA ni backend.
- Pruebas: suite y compilación ejecutadas en este ciclo; QA responsive y consola en navegador pendiente, por lo que no se publica commit ni Pages.
- Cambios anteriores pendientes se conservan sin incluirlos en un commit global.
- Siguiente prioridad: verificar visualmente 375/768/1440 y separar comentarios por archivo real además de versión.
## 2026-10-08 — aislamiento del timeline por pieza

- Defecto: la barra recibía todos los comentarios y deducía versión del primero; podía mostrar otra pieza aun cuando el panel lateral estaba vacío.
- Aceptación: versión explícita, marcadores solo del archivo abierto y contador móvil consistente; una pieza vacía no hereda hilos.
- Corrección: App filtra por reviewVersionId y TimelineMarkers recibe versión explícita. Prueba de regresión añadida.
- Verificación: suite, build y diff-check; interacción y responsive en navegador pendientes. No crear commit ni publicar Pages hasta completar QA visual. Cambios previos preservados.
- Limitaciones: using-superpowers ausente; subagentes no reintentados tras fallo de créditos. Revisión secuencial: producto (contexto), QA (regresión), UX (contador), operación (sin cambios de planes ni backend).
- Siguiente prioridad: auditoría de resumen y cabecera para eliminar información de demostración al abrir piezas reales.
## 2026-10-08 — salto a figuras de otra página

- Evidencia: jumpFigure buscaba en marks de la página anterior; el efecto de contexto borraba la selección al cambiar página.
- Aceptación: recuperar figura del contexto destino, conservar selección al cambiar página, rechazar otro archivo o figura ausente.
- Implementación: resolvedor puro y transferencia pendiente de selección. Dos pruebas de regresión.
- Revisión secuencial: producto (navegación), QA (ausencia/archivo ajeno), UX (resaltado conservado), operación (datos locales sin modificar planes). using-superpowers ausente; subagentes no reintentados tras falta de créditos.
- Verificación: tests/build/diff-check. Navegador, responsive y consola pendientes; sin commit, push ni Pages hasta verificación completa.
- Siguiente prioridad: desplazamiento automático hasta la figura después de renderizar la página PDF.
## 2026-10-08 — identificación fiel del formato

- Evidencia: cabecera clasificaba todos los archivos salvo imágenes como MP4.
- Aceptación: PDF/HTML/audio/documentos/presentaciones identificados por extensión; formato desconocido sin inventar; contenido de muestra marcado DEMO.
- Implementación: fileLabel y pruebas de formatos conocidos, datos ausentes y fallback. Sin modificar geometría ni paleta.
- Revisión secuencial producto/QA/UX/operación: nombres correctos, casos incompletos, etiqueta textual, sin cambios de permisos/planes. using-superpowers ausente; no reintentar agentes tras fallo por créditos.
- Verificación: tests, build y diff-check; QA navegador pendiente, por tanto sin publicación GitHub/Pages ni commit de cambios previos.
- Siguiente prioridad: reemplazar métricas de revisión simuladas al abrir piezas reales.
## 2026-10-08 — Verificación visual solicitada

- Hipótesis: los controles responsive podían recortarse o superponerse.
- Evidencia: navegador Edge, versión local Vite; capturas en 375/768/1440 px. En 768 px se recortaba Agregar archivos; en 375 px comentarios tapaba herramientas.
- Corrección: src/styles.css; cabecera flexible, tamaño mínimo del upload, herramientas desplazables y flujo vertical móvil sin altura fija.
- Verificado: toggle de parrilla; Enter en marcador F522 abre detalle y mueve reproducción a 21.75 s; consola sin errores capturados; 27 pruebas aprobadas y build aprobado antes del ajuste final de layout.
- Limitaciones: Docker no disponible (pipe dockerDesktopLinuxEngine ausente); no se actualizó el túnel. No se verificaron cargas PDF/HTML ni micrófono en esta ronda. No crear commit hasta completar esas pruebas y repetir build final.
- Siguiente prioridad: comprobar documentos con archivos sintéticos y anclaje durante scroll.
## 2026-10-08 — Sección Pauta solicitada

- Alcance: primer flujo local grupo → campaña → pieza, configuración, comentarios contextualizados, solicitudes con responsable, semáforo e historial.
- Criterios: no aprobar con solicitudes abiertas; ajustes invalidan aprobación; comentarios conservan configuración; errores de almacenamiento visibles; no simular publicación.
- Archivos: Pauta.jsx, main.jsx, styles.css, README.md.
- Verificación: compilación aprobada, suite existente aprobada (no cubre nuevo flujo). Revisión visual pendiente: la pestaña de QA anterior ya no existe. No desplegar ni crear commit como flujo verificado hasta comprobar interacción y responsive.
- Siguiente prioridad: vista previa de piezas y QA end-to-end del nuevo flujo, recuperación de estado malformado y concurrencia entre pestañas.
## 2026-10-08 — QA de Pauta en navegador

- URL: https://ronda.repolite.link/, navegador integrado, datos sintéticos identificados Prueba QA.
- PASS: crear grupo/campaña; cargar HTML sintético en parrilla; vincular pieza; guardar plataforma; solicitar cambio con responsable; aprobación bloqueada; aplicar solicitud; aprobar; cambio posterior devuelve a revisión; historial conserva valores y decisiones.
- PASS: recarga conserva campaña, pieza, configuración y comentario; consola sin errores capturados.
- Archivo de prueba: qa/pauta-demo.html. No se eliminaron datos; se conserva campaña QA identificada.
- Pendiente: responsive, fallo de almacenamiento, concurrencia, previsualización multimedia y respuestas en hilos. Esta ronda no constituye validación completa de producción.
## 2026-10-08 — Mapa navegable de Pauta

- Implementación: PautaFlow.jsx muestra grupo → campaña → tarjetas de piezas con configuración, estado y comentarios. Alternancia Flujo/Editar y vuelta automática al mapa tras guardado exitoso. Miniaturas de imagen/video reutilizan IndexedDB; otros formatos muestran identificador, no contenido ejecutable.
- Archivos: Pauta.jsx, PautaFlow.jsx, DeliveryGrid.jsx, styles.css.
- PASS: build, 27 pruebas existentes, compilación Docker y despliegue. Navegador público: mapa visible, seleccionar pieza abre revisión, editar objetivo y guardar activa Flujo mostrando valor nuevo; consola sin errores capturados.
- Pendiente: responsive del mapa, pruebas de múltiples ramas y previews reales de imagen/video. Datos QA conservados; no borrar datos del usuario.
## 2026-10-08 — Lienzo tipo FigJam

- Skill design-system: conservar tokens carbón/marfil/ámbar, densidad reducida y conectores sin decoración gratuita. Nuevo lienzo panorámico con nodos, miniaturas, zoom, encajar y arrastre del fondo; móvil usa tarjetas por niveles.
- Archivos: PautaFlow.jsx, styles.css, DESIGN.md.
- PASS: build, 27 pruebas existentes, Docker; navegador público verifica Encajar todo y selección de pieza con comentarios; captura inspeccionada y consola sin errores.
- Pendiente: prueba física táctil, arrastre y múltiples ramas; no se afirma validación completa. Zoom/posiciones son vista temporal, no edición de la jerarquía.
## 2026-10-08 — Rediseño integral de Pauta

- Skill design-system aplicada: explorador plegable, creación de campaña bajo demanda, lienzo expandido y detalle solo al seleccionar anuncio; tipografía operativa, tarjetas con previews más grandes y jerarquía de grupos de anuncios.
- Creación de múltiples grupos y carga directa de imagen/video a IndexedDB con límite de 100 MB por archivo. Anuncios antiguos se conservan en Anuncios existentes. No se publica publicidad ni se sincronizan archivos.
- PASS: build y 27 pruebas existentes; Docker actualizado; navegador público conserva campaña y muestra campaña → grupo de anuncios → anuncio, encuadre funcional y consola sin errores.
- Pendiente: prueba de carga directa con imagen/video, múltiples grupos vacíos, responsive y cuota de almacenamiento; no considerar flujo completamente validado.
## 2026-10-08 — Arrastre del lienzo y cabecera

- Evidencia: captura del usuario muestra selección nativa de texto e imagen durante pan.
- Corrección: preventDefault al iniciar pan, bloquear selección y drag nativo solo dentro del viewport; conservar controles clicables y selección de texto en formularios/comentarios fuera del mapa.
- Cabecera separa colección, campaña y guardado local; explorador compacto, selector Flujo/Editar segmentado y acciones alineadas.
- PASS: build, 27 pruebas existentes y reconstrucción Docker. Pendiente: verificar gesto real de arrastre en navegador; no afirmar prueba de interacción realizada.
## 2026-10-08 — Barra unificada de Pauta

- Captura del usuario: espacios excesivos entre vistas y acciones; composición dispersa.
- Cambio: una commandbar agrupa Flujo/Editar, Nuevo grupo, destino y carga. Formulario de grupo desplegable, cabecera compacta y mapa inmediato debajo. Etiqueta accesible del selector conservada.
- PASS: build y Docker; navegador público inspeccionado con campaña existente, Encajar todo y consola sin errores. No se alteraron datos de campaña. Pendiente: validación responsive y formulario desplegable.
## 2026-10-08 — Panel de conversación de Pauta

- Cabecera compacta con cierre accesible, contexto de anuncio separado, pestañas horizontales Comentarios/Historial, etiquetas pequeñas y composición de formulario editorial.
- Solicitar cambio destaca en ámbar, exige texto y responsable; comentar exige texto. Ayuda explica bloqueo y estado vacío orienta primer comentario.
- PASS: build, 27 pruebas existentes y Docker. Pendiente: inspección visual en navegador y nueva publicación de comentario de prueba; no modificar conversaciones reales para validar estética.
## 2026-10-08 — Campos y calendario de pauta

- Campos con ejemplos, texto del anuncio multilínea y pie de guardado separado. Calendario inline con navegación mensual, inicio/fin, rango resaltado y entradas date para teclado/móvil. Fechas ISO sin conversión UTC; valores antiguos conservados hasta reemplazarlos.
- Inicio exige fin; min nativo y días deshabilitados impiden fin anterior. Cambio de inicio limpia fin incompatible.
- PASS: compilación, 27 pruebas existentes y Docker. Pendiente: prueba de interacción del calendario y persistencia de rango en navegador; suite existente no cubre componente nuevo.
## 2026-10-08 — Menciones locales del equipo

- MentionInput reutilizado en compositor principal y comentarios de Pauta: @ filtra nombres, selección por clic o flechas/Enter; Escape descarta sugerencias. Texto insertado se persiste con el comentario. No envía correos ni notificaciones externas, ni almacena una relación segura de identidad.
- PASS: build y Docker. Pendiente: interacción de teclado/cursor, menciones en respuestas y prueba visual. No se afirma cobertura e2e.
## 2026-10-08 — Compositor sin superposición

- Causa: compositor absolute con reserva inferior fija de 135 px, insuficiente al sumar audio y menciones.
- Corrección: compositor en flujo flex, lista con altura flexible y scroll propio; controles compactos; altura del compositor limitada y sugerencias de menciones en flujo para no recortarse.
- PASS: build y Docker. Pendiente: comprobación visual de último comentario, panel móvil y adjuntos múltiples.
## 2026-10-08 — Comentarios conversacionales

## 2026-10-09 — Base de backend propio y persistencia Docker

- Hipótesis/criterios: cuentas y sesiones deben sobrevivir reinicios en el PC sin cambiar hostname/túnel, sin exponer PostgreSQL y sin reasignar datos existentes.
- Skills backend-patterns y docker-patterns: API Node separada, consultas parametrizadas, registro transaccional, sesiones con hash/cookies HttpOnly, límite de intentos persistido y validación de Origin.
- Archivos: backend/*, compose.yaml, nginx.conf, .dockerignore, README.md. Secretos generados en backend/.env ignorado; no se imprimieron ni cambiaron credenciales del túnel.
- PASS: Compose config, compilación Docker/frontend, 27 pruebas existentes, 2 pruebas de contraseñas/tokens. Integración: registro/login, contraseña incorrecta, rechazo de origen ajeno, cookie segura, persistencia de cuenta/sesión después de reiniciar database/api, revocación logout. Cuenta QA eliminada; ningún usuario real eliminado.
- Fallo inicial de prueba: integration.js aún no incluido en imagen; reconstruida API y repetida prueba completa satisfactoriamente.
- PASS: túnel conservado, página pública HTTP 200, health API PostgreSQL ok, sesión anónima null, cuatro servicios saludables; puertos de API/DB no publicados al host.
- Limitación: primera etapa de infraestructura/API, no SaaS completo. Frontend continúa con localStorage/IndexedDB, sin pantalla de login ni aislamiento/importación. Volumen de medios reservado pero todavía sin endpoints. Google, email verificado, recuperación, backup automático, permisos de recursos y endurecimiento antiabuso pendientes. No se realizó QA visual porque no se cambió UI.
- Siguiente prioridad: login/registro visual con espacios vacíos aislados por cuenta y migración explícita de datos locales; después almacenamiento privado de medios y OAuth. Sin commit para no mezclar cambios previos del usuario; automatización sigue pausada.

- Skill design-system aplicada: sans operativa en vez de serif, alineación del texto con autor, avatares cuadrados suaves, marcas temporales compactas, acciones discretas y estados sin opacidad global ni degradados decorativos.
- Cabecera y compositor simplificados manteniendo controles y espacio separado de lista. No se modificaron datos.
- PASS: build y Docker. Pendiente: inspección visual responsive y comentarios largos/adjuntos.

## 2026-10-09 — Acceso, archivos privados y guardado por cuenta

- Objetivo/aceptación: conectar registro/login, conservar túnel y persistencia en PC, aislar datos/medios por sesión, proteger contra sobrescritura concurrente y no importar datos privados automáticamente.
- Implementación: AccountAccess y accountStorage, API snapshots con revisión y conflictos 409, propietario derivado de sesión, carga/descarga privada de medios (100 MB/archivo, 2 GB/cuenta), importación explícita con conservación del original y reasignación del dueño. Copias pendientes descargables, logout espera guardado. La cuota del navegador no bloquea guardado remoto.
- Skills: design-system para tokens/jerarquía de acceso, backend-patterns/docker-patterns en arquitectura propia; auditoría visual acotada documentada en DESIGN.md. Sin suscripción a Supabase.
- Google: flujo preparado con biblioteca oficial, state/cookie/nonce/PKCE, verificación del ID token y sin mezcla automática de cuentas no verificadas. Deshabilitado sin credenciales; no se afirma prueba real de Google.
- Backups: servicio Docker crea dump PostgreSQL y archivo de medios cada 24 horas, y al arrancar. .backups ignorado por Git/Docker. Restauración comprobada en DB QA temporal; archivo comprimido íntegro. No se configuró respaldo externo ni retención automática.
- PASS: compilación Docker/frontend, 32 pruebas de dominio/estado (incluyen importación no mutante, conflicto y cuota), 2 pruebas backend; integración registro/login, cookie/origen, aislamiento entre dos cuentas, API anónima rechazada, archivo privado y HTML como attachment, conflicto de revisión, revocación y sesión después de reinicio DB/API.
- PASS navegador público: login, creación de proyecto, logout/relogin y recuperación del proyecto tras reinicio; carga de SVG sintético, miniatura, publicación de comentario sobre archivo y recuperación de ambos después de logout/relogin; consola sin errores inesperados.
- Responsive: medición sin overflow horizontal en 375/768/1440, labels y autocomplete; captura full-page de escritorio. Captura móvil completa falló con el navegador de pruebas; no afirmar verificación visual móvil exhaustiva. Importación completa de datos reales del usuario NO ejecutada ni validada e2e.
- Limpieza: eliminadas exclusivamente cuentas/medios QA creados durante las pruebas; datos originales del usuario y token del túnel preservados. Ajustadas etiquetas antiguas y eliminadas presencia/actividad ficticias en la interfaz autenticada.
- Pendientes: credenciales Google y SMTP (verificación/recuperación), espacios compartidos e invitaciones con permisos reales, permisos de planes/pagos, carga Office convertida y auditoría inmutable. Equipo del prototipo aún es referencia por cuenta, no acceso compartido. No afirmar SaaS comercial completo.
- Siguiente prioridad: configurar/probar Google con el usuario y completar recuperación por correo; después colaboración por espacio con permisos de servidor. Automatización permanece pausada; no se mezcla un commit con cambios previos del usuario.
# 2026-10-09 — Proyectos compartidos (solicitud manual; automatización pausada)

- Hipótesis: una vista independiente de proyectos y comentarios generales permite empezar la colaboración real sin exponer snapshots privados ni archivos anteriores.
- Aceptación: pertenencia y roles comprobados en servidor; admin/editor gestionan proyectos y estados, revisor comenta; aislamiento entre espacios/cuentas, autor de sesión, reintentos idempotentes, conflicto 409, persistencia y revocación inmediata; preservar datos privados/túnel/volúmenes.
- Archivos: migrations/0003_shared_projects.sql, project-policy.js, repositories/shared-projects.js, shared-project-service.js, modules/shared-projects.js, app.js, pruebas backend, SharedProjects.jsx, shared-projects.css, WorkspaceActions.jsx, WorkspaceTeam.jsx y documentación.
- Verificación: 14 pruebas backend y 32 frontend aprobadas; integración aislada de cuatro cuentas aprobada; regresiones de equipo y datos/archivos privados aprobadas; migraciones nuevas/concurrentes/adopción/rollback y copia restaurada del PC comprobadas antes del despliegue. Build Docker correcto; aviso previo de bundle >500 KB continúa. UI real: vacío, creación, comentario, resolución, recarga, borrador al cambiar vista, búsqueda y Enter; sin errores de consola; medidas 375/768/1440 sin overflow y controles >=44 px. Captura de escritorio sintética conservada; no afirmar QA visual completa móvil.
- Resultado: vista compartida desplegada en Docker/túnel; solo nombre/cliente y comentarios generales. Archivos, audio, anotaciones, menciones y aprobaciones compartidas pendientes. Borradores temporales, actualización manual, sin SMTP/Google habilitados. Cuenta y proyecto QA retirados; no se migraron datos humanos, no se hicieron commit/push sobre cambios pendientes del usuario.
- Próxima prioridad: persistencia de borradores compartidos y archivos/versiones con autorización por espacio antes de reutilizar revisión/anotaciones. Verificación de correo, Zoho/Google y respaldo fuera del PC siguen pendientes antes de uso comercial.
## 2026-10-09 — Iconoir (solicitud manual)

- Integrada iconoir-react 7.12.1 y un adaptador compartido para navegación, acciones del visor, herramientas de anotación y comentarios; se conservan etiquetas accesibles y marca propia.
- Verificado: pruebas frontend sin fallos, compilación Docker correcta y revisión publicada navegable, sin errores de consola. Evidencia: qa/iconoir-review.png. Sin cambios en datos, permisos, túnel o volúmenes.
- Alcance pendiente: sustituir pictogramas Unicode y SVG específicos de componentes secundarios; los SVG de medios, marca y conexiones no son iconos funcionales de biblioteca.
## 2026-10-09 — Carpetas interactivas (solicitud manual)

- Objetivo: sustituir tarjetas privadas de proyectos por carpetas con portada, apertura al hover e inclinación discreta; preservar texto, apertura del proyecto, lista, teclado y movimiento reducido.
- Archivos: StudioWorkspace.jsx, folder-cards.css, main.jsx y DESIGN.md.
- Resultado: publicado con Docker sin cambiar túnel ni volúmenes; compilación y 34 pruebas aprobadas, lista/cuadrícula verificadas y consola sin errores. Evidencia: qa/folder-projects.png. Sin compra ni copia de código del componente comercial de Framer. Pendiente QA en dispositivos físicos y aplicar visual a proyectos compartidos si se solicita.
## 2026-10-09 — Ajuste cromático de carpetas (manual)

- Frente oscuro, acento lavanda, portada abstracta menos saturada, pestaña más suave y altura compacta. Sin modificar imágenes reales, datos, permisos o almacenamiento.
- Verificación: build Docker correcto, captura de versión publicada y consola sin errores. Evidencia: qa/folder-projects-refined.png. Cambio limitado a CSS; pruebas funcionales anteriores permanecen como referencia, no se repitieron en este ajuste.
## 2026-10-09 — Corrección de contraste (manual)

- Eliminado gris opaco de portada; lavanda luminoso, frente carbón neutro y metadatos más claros. CSS local, fotografías reales intactas.
- Build Docker y revisión publicada correctos; consola sin errores. Captura qa/folder-projects-contrast.png. Sin cambios de persistencia ni infraestructura.
## 2026-10-09 — Apertura de carpeta por capas (manual)

- Reestructurado folder-cards.css: proporción vertical, portada emergente y tapa independiente. Textos estables, foco accesible, lista y preferencias de movimiento conservadas.
- Compilación Docker y verificación publicada por teclado correctas; transformación independiente de portada/tapa comprobada mediante DOM, sin overflow horizontal. Captura qa/folder-layered-open.png. Sin cambios de datos o infraestructura.
## 2026-10-09 — Preview social (manual)

- Implementación propia con Embla 8.6.0 e Iconoir: configuración persistente por proyecto, selección/orden explícito, ratios, contador, flechas, puntos y navegación teclado/táctil. Medios originales privados; videos silenciados con autoplay opt-in visible. Cambio de lámina conecta comentarios del archivo; bloqueo mientras carga evita comentar la pieza anterior.
- Archivos: SocialPreview.jsx, social-preview.css, social-preview.js y tests, main.jsx, RondaContext.jsx, dependencias/lock y documentación. No migra bases de datos ni altera túnel/volúmenes.
- Verificado: build correcto, 36 pruebas sin fallos, interfaz de configuración y estado vacío publicados sin errores de consola. QA poblado pendiente: localhost rechazado por protección de origen; no se debilitó seguridad ni cambió sesión humana. Cuenta y medios QA aislados eliminados. Evidencia: qa/social-preview-config.png. No afirmar pruebas completas de swipe/video ni dispositivo físico.
## 2026-10-09 — Focus Lens navegación izquierda (manual)

- Añadidos LensNavigation.jsx y lens-navigation.css, conectados a las dos secciones de la barra. Marco móvil, foco/hover, atenuación y blur limitado, página activa y etiquetas accesibles preservadas.
- Build Docker y 36 pruebas sin fallos. Verificado teclado, barra contraída/expandida, marco medido y consola vacía. Evidencia qa/focus-lens-sidebar.png. Sin modificar archivos del usuario, datos, túnel ni volúmenes.
## 2026-10-09 — Rediseño solicitado del preview social

- Hipótesis: el problema es la composición plana y excesiva altura, no solo el color. Criterios: centro protagonista, vecinos superpuestos, medios sin bandas, controles integrados y datos conservados.
- Archivos: SocialPreview.jsx, social-preview.css, DESIGN.md; evidencia qa/social-preview-depth.png.
- Resultado: deck de tres capas con navegación circular, cover visual, administración separada e iconos sin métricas inventadas. Docker reconstruido sin tocar almacenamiento/túnel.
- Verificación: build correcto, 36 pruebas pasan; navegador publicado con imágenes reales, flechas, vecino, teclado, vinculación del archivo y consola sin errores; viewport 375/768 sin overflow.
- Limitación y siguiente prioridad: probar video y swipe en dispositivos físicos; el recorte afecta solo la simulación. No commit: se conserva el árbol con cambios previos del usuario.
