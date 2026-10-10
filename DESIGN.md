# Ronda — dirección de producto y sistema visual

## Personalización limpia — 9 octubre 2026

Se sustituyeron tarjetas numeradas por secciones separadas con líneas y un panel lateral de preview en vivo. Campos compactos, control de archivo accesible con botón propio y acciones Guardar/Descartar conservan la lógica de validación y persistencia. Tokens, Geist e Iconoir del sistema existente; sin animación decorativa. Dominio explícitamente sin conectar: no cambia DNS ni túnel.

Compilación Docker exitosa, servicio actualizado sin tocar datos ni túnel. Preview al editar y descarte comprobados sin guardar datos de prueba; responsive a 375 px sin overflow interno y revisión visual a 1440 px. Sin errores de consola observados. Evidencia: qa/brand-personalization-redesign.png. No se verificó una nueva carga de logo ni un guardado real en esta revisión visual.

## Modal de enlace de revisión — 9 octubre 2026

ShareReviewDialog separa la presentación del shell: entrada suave de 280 ms, estado de copia confirmado en verde, enlace seleccionable y fallback manual si el portapapeles falla. Mantiene tokens, Geist e Iconoir. Movimiento reducido desactiva animación; Escape cierra, Tab permanece en el diálogo y el foco vuelve a Compartir revisión. Se retiraron permisos simulados y promesas de acceso público: copiar no concede acceso a archivos privados, y comentarios de invitados/descargas se muestran pendientes.

Verificación: compilación Docker exitosa y servicio ronda actualizado conservando base de datos y túnel. Copia confirmada, cierre Escape y retorno de foco comprobados en navegador; modal contenido en viewport de 375 px y revisión visual a 1440 px. Sin errores de consola observados. Evidencia: qa/share-review-redesign.png. No se implementó backend de enlaces públicos.

## Dirección vigente Ronda Studio 0 2

Actualización del 9 de octubre de 2026 basada en la referencia elegida por el usuario: negro con matices violeta, selección lavanda, acciones blancas y portadas pastel. Sustituye la dirección carbón/ámbar descrita en las entradas históricas siguientes. El contenido real del visor y los colores de dibujo no cambian de identidad.

Propósito: retomar revisiones y localizar proyectos en una herramienta de trabajo diario. Audiencia: creadores y revisores que necesitan distinguir alcance privado/compartido. Tono: estudio creativo, sobrio en controles, expresivo solo en portadas. Detalle memorable: segmentos de una ronda en la marca y composiciones de círculos recortados. La geometría pastel es una desviación explícitamente pedida respecto a la anterior regla contra decoración; no se aplica a formularios ni conversaciones.

Implementación: src/studio-theme.css es la capa visual; StudioWorkspace.jsx contiene Inicio y biblioteca; project-presentation.js deriva estado y cifras de la cuenta, sin métricas fabricadas. Tarjetas con búsqueda, filtros y vistas lista/cuadrícula. Portadas reales visibles de medios de hasta 8 MB; el resto conserva arte de proyecto para no descargar originales pesados. Miniaturas de servidor son una próxima mejora, no están implementadas. No se crean calendario, entregas ni perfil ficticios.

Skills: design-system para tokens/auditoría y frontend-design-direction para jerarquía de trabajo. liquid-glass-design es nativa iOS; adaptación web limitada a cabecera translúcida con fallback sólido, sin afirmar que sea la API de Apple. artifact-template-design-report: referencia intacta y plantilla localizada, pero render_docx.py falló por ausencia de soffice.exe en el runtime; no se autoró ni entregó un Word sin verificar. El informe de plantilla queda pendiente, no fue reemplazado por un DOCX genérico.

Tokens activos: design-tokens.json 0.2. Preview interactivo: design-preview-studio.html, independiente y sin APIs; el anterior preview 0.1 se conserva. Movimiento reducido y transparencia reducida tienen fallback CSS. Una sola altura de shell compartida con la barra de cuenta elimina el scroll externo duplicado sin cambiar el desplazamiento interno de documentos.

### Auditoría visual acotada

Puntuaciones subjetivas, no certificación WCAG ni QA exhaustiva de toda la aplicación.

| Dimensión | /10 | Evidencia y seguimiento con ubicación |
|---|---:|---|
| Color | 9 | Paleta 0.2 y cuatro contrastes calculados >=4.5; centralizar colores heredados del visor fuera del contenido, src/studio-theme.css:3. |
| Tipografía | 8 | Títulos sans operativos y captions contenidos; aumentar captions para lectores con baja visión, src/studio-theme.css:38. |
| Espaciado | 9 | Grid 18/24 px y formularios 24 px; armonizar separación del inspector de Pauta, src/studio-theme.css:44. |
| Componentes | 8 | Marca, botones blancos, selección lavanda; extraer botones compartidos en siguiente refactor, src/studio-theme.css:41. |
| Responsive | 8 | Inicio/biblioteca medidos 375/768/1440; sexto botón móvil corregido con especificidad; prueba física pendiente, src/studio-theme.css:104. |
| Tema oscuro | 9 | Superficies/formularios derivados de tokens; alto contraste pendiente, src/studio-theme.css:3. |
| Movimiento | 9 | Hover 160 ms y fallback reducido; no animación ornamental, src/studio-theme.css:103. |
| Accesibilidad | 8 | Labels, focus, Tab y Enter; cuatro pares de contraste comprobados, auditoría de lector de pantalla pendiente, src/studio-theme.css:99. |
| Densidad | 8 | Inicio con resumen lateral y biblioteca filtrable; no llenar espacio con registros ficticios, StudioWorkspace.jsx:68. |
| Pulido | 8 | Sin resultados recuperable, disabled y formularios; miniaturas de servidor pendientes, StudioWorkspace.jsx:22. |

Contrastes calculados: texto/fondo 17.07, secundario/fondo 8.40, botón primario 15.44, texto/tarjeta lavanda 10.18. No se extrapolan estos pares a cada combinación de la app. Capturas de escritorio: qa/studio-home.png y qa/studio-review.png. Verificación responsive principalmente por medidas DOM; no sustituye inspección móvil física. Se preservan login, cookies, APIs, volúmenes, túnel y datos existentes.

## Propósito

## Acceso por cuenta — 2026-10-09

### Equipo conectado — 2026-10-09

- `WorkspaceTeam.jsx` y `workspace-team.css` reutilizan tokens carbón/marfil/ámbar, espaciado 12/16/20 y controles de 44 px. Formularios en el flujo, sin panel fijo que tape miembros. Pertenencias reales, invitaciones y referencias previas quedan claramente separadas; aviso visible de que los recursos aún son privados por cuenta.
- Auditoría subjetiva acotada: color 9, tipografía 8, espaciado 9, componentes 8, responsive 8, oscuro 9, movimiento 9, accesibilidad 8, densidad 8, pulido 8 (sobre 10). Evidencia: escritorio renderizado, formulario/código de prueba generado y ocultable, búsqueda vacía/limpieza, Tab lleva del correo al selector de rol, consola sin errores inesperados. Controles medidos de 44 px; anchos 375/768/1440 sin overflow horizontal en la página/equipo. Captura móvil del navegador salió escalada y no sirve para afirmar QA visual exhaustiva móvil ni WCAG certificada.
- Mejora pendiente fuera de este incremento: unificar scroll de barra de cuenta/app; la captura muestra dos barras verticales del shell. No alterar scroll del visor de documentos para corregirlo sin pruebas específicas.

- Pantallas de login/registro reutilizan carbón, marfil, ámbar, radios contenidos y tipografía operativa. Formularios con etiquetas permanentes, autocomplete y estados de carga/error; no se añadieron gradientes ni una identidad visual paralela.
- Auditoría de diseño acotada al acceso (valoración subjetiva, no certificación): color 9/10, tipografía 8/10, ritmo espacial 9/10, consistencia 8/10, responsive 8/10, tema oscuro 9/10, movimiento 9/10, accesibilidad 8/10, densidad 8/10, pulido 7/10. Referencia: src/components/account-access.css y AccountAccess.jsx.
- Evidencia: login/registro renderizados; tarjeta de 440 px en escritorio 1440, formularios medidos sin overflow horizontal en 375/768/1440, etiquetas visibles y objetivos principales >=44 px. Captura full-page móvil falló en el navegador de prueba; no afirmar revisión visual exhaustiva móvil ni auditoría WCAG completa.
- Pendiente: recuperación de contraseña y verificación por correo; Google no aparece sin configuración. No presentar presencia en tiempo real ni permisos de equipo como implementados.

Ronda es una sala de revisión creativa para equipos que necesitan señalar cambios, discutirlos y aprobar versiones de video e imagen. La interfaz prioriza el medio y la precisión temporal; la navegación existe para sostener ese flujo, no para competir con él.

## Audiencia

- Editores, productores y directores creativos que usan el producto todos los días.
- Clientes invitados que deben entenderlo sin formación ni registro.
- Revisores en escritorio, tablet y móvil, incluso con stylus.

## Dirección

**Tono:** técnico, editorial, calmado y profesional. La densidad es deliberada, pero cada zona tiene una tarea clara.

**Detalle memorable:** la “línea de revisión”. El mismo color conecta la marca temporal, la anotación y el estado del comentario. El color comunica procedencia y estado, pero siempre acompañado por texto o icono.

**Principio principal:** el archivo ocupa el centro; los comentarios forman una banda operativa lateral; las decisiones permanecen visibles en la cabecera.

## Paleta

- Carbón verdoso en lugar de negro puro para reducir fatiga en sesiones largas.
- Marfil para texto y contraste menos agresivo que blanco puro.
- Ámbar como acción principal y playhead.
- Coral para cambios abiertos o atención.
- Verde para aprobado/resuelto.
- Azul y violeta para autores e información, no como gradiente decorativo.

## Tipografía

La interfaz usa una sans de sistema para velocidad y legibilidad. Los fotogramas de campaña admiten Georgia como contraste editorial dentro del contenido, nunca como tipografía operativa. Los timecodes usan monoespaciada para evitar saltos de ancho.

## Geometría

Radios contenidos de 6–14 px. Los paneles no se convierten en “tarjetas dentro de tarjetas”; las líneas y cambios de superficie establecen jerarquía. La escala espacial se basa en 4 px.

## Accesibilidad y tablet

- Contraste alto sobre superficies oscuras.
- Focus visible en todos los controles.
- El canvas utiliza Pointer Events y `touch-action: none` durante el dibujo.
- La navegación principal se oculta en móvil y los comentarios pasan a un drawer.
- Las acciones primarias móviles tienen objetivos cercanos o superiores a 44 px.
- Estado y autor nunca dependen solo del color.

## Estados incluidos en el prototipo

- Reproducir/pausar.
- Selección de herramienta y color.
- Dibujo libre con mouse, dedo o stylus.
- Deshacer anotación.
- Seleccionar, filtrar, agregar y resolver comentarios.
- Cambiar la aprobación del activo.
- Panel de comentarios adaptable a móvil.

## Siguiente expansión del sistema

1. Temas claro y de alto contraste.
2. Componentes para carga, biblioteca y estados vacíos.
3. Flujos de creación de enlace y permisos.
4. Patrones de comparación de versiones.
5. Tokens semánticos de aprobación y seguridad.
6. Pruebas físicas con iPad/Apple Pencil y Android/S Pen.
## Lienzo de pauta

Flujo espacial de izquierda a derecha: grupo, campaña y piezas. Fondo punteado con token lineStrong, conectores sobrios y nodos en surface2. El ámbar identifica selección; los estados mantienen texto junto al color. Los detalles extensos quedan fuera del mapa. Zoom y desplazamiento no cambian datos. En móvil las piezas se muestran por niveles para conservar legibilidad y objetivos táctiles. La implementación reutiliza previews locales de la parrilla.

## 2026-10-09 — Proyectos compartidos: auditoría design-system

Se reutilizan tokens y lenguaje visual existentes, sin nueva identidad ni tarjetas decorativas. Listado y conversación se separan; el aviso de alcance evita confundir comentarios generales con revisión de archivos. Evidencia sintética: qa/shared-projects.png. Puntuaciones subjetivas de esta vista, no certificación.

| Dimensión | /10 | Ejemplo y ajuste / seguimiento |
|---|---:|---|
| Color | 9 | Paleta semántica, sin nuevos hex; conservar src/components/shared-projects.css:1. |
| Tipografía | 8 | Título y subtítulos claros; corregido fallback de fuente indefinida en shared-projects.css:2. |
| Espaciado | 8 | Panel 20 px y filas 16 px; unificar a escala global al refactorizar shared-projects.css:5. |
| Componentes | 8 | Controles consistentes; extraer componente común con Equipo, shared-projects.css:1. |
| Responsive | 8 | Medidas 375/768/1440 sin overflow; probar dispositivo físico, shared-projects.css:7. |
| Tema oscuro | 9 | Superficies completas; añadir alto contraste como siguiente sistema, shared-projects.css:3. |
| Animación | 9 | Sin movimiento ornamental; conservar navegación directa, SharedProjects.jsx:53. |
| Accesibilidad | 8 | Etiquetas, foco y controles de 44 px; contraste/lector de pantalla completo pendientes, shared-projects.css:6. |
| Densidad | 8 | Dos columnas y compositor en flujo; añadir paginación antes de ampliar los últimos 100 comentarios, SharedProjects.jsx:59. |
| Acabado | 7 | Vacío, carga, búsqueda y error explícitos; persistir borradores al salir de otras secciones, SharedProjects.jsx:16. |

Teclado comprobado en búsqueda (Enter), estados vacío/carga observados, comentario publicado y resuelto conservado tras recargar; consola sin errores capturados. Revisión visual de escritorio realizada. Las medidas móviles no equivalen a una auditoría visual completa ni de accesibilidad.
## Carpetas de proyectos — 2026-10-09

Adaptación original de la referencia visual Card — Folder de Framer; no se ha adquirido ni integrado su componente comercial. `src/folder-cards.css` aplica capas de portada y frente, pestaña de carpeta e inclinación limitada a 3 grados por eje. Se reutilizan colores pastel, iconos Iconoir y metadatos reales. Duración centralizada de 320 ms. Solo cursor fino con hover y sin preferencia de movimiento reducido activa apertura/seguimiento; teclado conserva foco visible y móvil conserva acceso directo sin hover. La lista mantiene su diseño compacto. Sin cambios en carga de archivos, datos ni permisos.

Verificación: compilación Docker y 34 pruebas correctas; cuadrícula y lista comprobadas en navegador publicado, lista sin desbordamiento horizontal, sin errores de consola. Captura: `qa/folder-projects.png`. Las reglas móviles y de movimiento reducido están implementadas; no se ha probado todavía en dispositivos físicos. Se aplica design-system para mantener la paleta y jerarquía existentes. motion-patterns se inspeccionó, pero sus patrones React Motion no aplican a esta transición CSS.
## Refinamiento de carpetas — 2026-10-09

Tras revisión del usuario, se reduce la saturación de las portadas abstractas y se sustituye el frente pastel por surface-2. Texto y metadatos utilizan text/muted y acentos lavanda del sistema. La altura mínima baja de 330 a 280 px y la pestaña se suaviza, sin cambiar interacción ni fotografías reales. Implementación: src/folder-cards.css. Compilación y comprobación visual publicada correctas, consola sin errores; captura qa/folder-projects-refined.png. El sistema de diseño guió el contraste y la integración con el espacio oscuro.
## Contraste de carpetas — ajuste 2026-10-09

Se elimina el filtro gris de las portadas abstractas: lavanda claro y tinta carbón neutra para separar las capas. Tokens locales en folder-cards.css: frente #202126, texto #FAF9FC, secundario #CBC8D2, acento #DAC7FF. Las imágenes reales siguen sin filtros. Compilación y captura publicada verificadas, sin errores de consola: qa/folder-projects-contrast.png. Ajuste visual guiado por design-system; no modifica datos ni comportamiento.
## Apertura por capas — 2026-10-09

La referencia requiere una tarjeta vertical y capas independientes, no solo inclinación global. Se aumenta la altura a 360 px (330 móvil), se revela la portada 36 px y se abre el frente 18 grados con duración centralizada 420 ms. Los textos permanecen fuera de la transformación para preservar lectura. Hover y foco visible comparten apertura; movimiento reducido y dispositivos sin hover mantienen estado estático. CSS reestructurado en src/folder-cards.css. Build y apertura por teclado comprobados en navegador, sin desbordamiento horizontal; evidencia qa/folder-layered-open.png. Adaptación propia, no copia del componente comercial.
## Preview social — 2026-10-09

Marco editorial sobrio con tokens existentes, Iconoir y controles explícitos. Carrusel Embla centrado con peek de 4%, medios contenidos sin recortes/deformación, contador y puntos; teclado, movimiento reducido y estados carga/error/vacío. Las anotaciones permanecen en el visor separado. Configuración y estado vacío verificados; pendiente QA poblado de imágenes/video y responsive físico por rechazo seguro del origen localhost de la cuenta temporal. No se compró ni copió el componente comercial de Framer. design-system guió contraste y consistencia de controles.
## Focus Lens lateral — 2026-10-09

Adaptación propia de la referencia del usuario: marco decorativo de cuatro esquinas que sigue hover/foco y vuelve a la página activa. LensNavigation.jsx mide cada botón y recalcula al contraer/redimensionar. lens-navigation.css usa tokens existentes, blur suave de .45 px y opacidad .65 únicamente para otras opciones no activas con cursor fino; la página activa conserva su contraste. Transición CSS con curva ligeramente elástica (no simulación física de resorte). Movimiento reducido elimina transición/blur/escala sin alterar la posición del marco. Nombres accesibles visibles también en modo contraído y aria-current para página activa. Build y 36 pruebas correctos, foco teclado/contraído y ausencia de overflow/consola comprobados. Captura qa/focus-lens-sidebar.png. Sin cambios en datos ni infraestructura. design-system guía contraste y consistencia con Iconoir.
## Carrusel social con profundidad — 2026-10-09

Reemplaza el carrusel plano descrito anteriormente por una composición propia basada en la referencia Instagram Gallery del usuario: publicación central de hasta 470 px, dos vecinos al 60% con brillo reducido y solapamiento, fondo #111, controles dentro del medio y pie con Iconoir. Altura visual adaptada al viewport; cover solo en la simulación, sin alterar originales ni configuración persistida. Sin métricas ficticias ni integración real con Instagram. Autoplay y acceso a anotaciones se trasladan a configuración. Animación CSS de 500 ms, navegación circular por flechas, vecinos, teclado y gesto horizontal; movimiento reducido elimina transiciones. No usa Embla para este deck.

Verificación publicada: cuatro imágenes existentes, cambio mediante flechas/vecino/teclado y selección de archivo para comentarios, sin errores de consola. Viewports 375 y 768 sin overflow horizontal; escritorio 1510. Compilación Docker correcta y 36 pruebas anteriores pasan. Videos y gestos táctiles físicos pendientes de QA específico. Evidencia: qa/social-preview-depth.png. design-system guía controles accesibles y separación de simulación/configuración; no se modifican volúmenes, túnel ni datos del usuario.
## Personalización de cuenta — 2026-10-09

Nueva sección lateral con nombre comercial, logo PNG/JPG/WebP hasta 512 KB y dominio deseado validado. Reutiliza tokens, secciones numeradas, estados de guardado y foco existentes. Logo persistido en workspace.branding mediante el almacenamiento autenticado de la cuenta; reutilizado en marca lateral y avatar de preview social. Cuenta visible de publicaciones existentes no se sobrescribe. Dominio solo registrado como preferencia, sin DNS/HTTPS ni cambios al túnel. Sin enforcement de planes ni marca compartida organizacional: la configuración pertenece a la cuenta actual. Build Docker y 36 pruebas correctos; sección, rechazo de dominio inválido, descarte y consola comprobados en navegador. Evidencia qa/brand-settings.png. Falta QA completo de subida/persistencia con logo real elegido por el usuario.
## Cinta de cursor para anotación — 2026-10-09

SilkCursor.jsx: superficie Canvas 2D rellena con dos bordes suavizados mediante curvas cuadráticas, cadena limitada a 30 puntos con velocidad/inercia y amortiguación, grosor variable por movimiento y degradado desde el color de anotación a un extremo suave. Configuración exportada SILK_DEFAULTS: longitud, anchuras, inercia, seguimiento, desaparición, opacidad, color final y z-index; el color inicial llega por prop. Capa fija transparente sin pointer-events ni cambios de layout/cursor. Solo revisión no social con herramienta activa. RAF se detiene al terminar fade (650 ms), desenfoque, cambio de visibilidad o desmontaje. Resize adapta DPR hasta 3 y reinicia puntos. Movimiento reducido y dispositivos sin cursor fino/hover no animan.

Referencia silky-mouse-trail.framer.website abierta e inspeccionada con movimiento: estela continua fina. Adaptación deliberadamente sin fondo animado ni neón, guiada por design-system para no ocultar contenido. Build Docker y 36 pruebas correctos; selección de flecha, superficie visible, capa pointer-events:none, sin overflow ni errores de consola comprobados en navegador. Evidencia qa/silk-cursor.png. No se afirma igualdad exacta de físicas ni prueba en dispositivos físicos. No afecta marcas guardadas, datos, túnel o volúmenes.
## Retirada de cinta — 2026-10-09

Por solicitud del usuario se elimina SilkCursor.jsx y su integración en main.jsx. La descripción previa de la cinta queda como registro histórico, no como funcionalidad activa. Herramientas, trazos y anotaciones persistidas no se modifican. Build Docker y 36 pruebas correctos.
## Planificación — primera entrega 2026-10-09

Calendario mensual con calor relativo por comentarios raíz creados en la zona del espacio (Bogotá por defecto); filtros por proyecto, autor/responsable/mención y estado. Pendientes en dos columnas y actividad mensual sin convertir conversación en tarea. Menciones existentes resueltas por ID o nombre completo. Proyecto se resuelve desde versión para corregir referencias heredadas. Apertura de la versión/archivo y tiempo de origen, con aviso si no está disponible. Resolver/reabrir usa persistencia autenticada existente. No se inventan fechas límite ni métricas. Calendario usa tokens de superficie, foco y jerarquía; calor local con texto accesible. Móvil compacto con siete opciones de navegación.

40 pruebas pasan, build Docker correcto, calendario vacío y navegación mensual/tablero comprobados en navegador. 375 px sin overflow. Cuenta de QA sin comentarios: no se verificó visualmente todavía el flujo poblado ni resolución persistida. No incluye comentarios compartidos del API, respuestas, comentarios de pauta ni tareas con vencimiento en este incremento; próxima prioridad: integrar esas fuentes y verificar links/roles en fixtures autenticados. Se mantienen túnel y volúmenes.
## Refinamiento de Planificación — 2026-10-09

Design-system aplicado a jerarquía y densidad: filtros en una barra, selector segmentado, texto informativo secundario y cuadrícula continua en vez de cards por día. Se oculta visualmente “Sin actividad” en días vacíos conservando conteo en etiquetas accesibles; hoy usa círculo y selección marco. Celdas compactas, hover y detalle en sección propia. CSS solamente; lógica, filtros y calor sin cambios. Build Docker correcto, comparación visual con captura del usuario, consola sin errores y 375 px sin overflow. Evidencia qa/planning-refined.png.
## Modo demo de planificación — 2026-10-09

Selector explícito, desactivado por defecto, con identificación “DEMO · Datos ficticios · Solo lectura · No se guardan en tu cuenta”. Fixtures de empresa activa separados del reducer, renovados por mes: tres proyectos, tres personas, menciones y actividad variable. Resolver/reabrir y abrir revisión ocultos y bloqueados por guardas en modo demo. Salir desmonta los fixtures y restaura datos reales sin escrituras. No genera notificaciones, tareas reales ni eventos de servidor. Build Docker correcto; calendario poblado comprobado en navegador y etiquetas visibles. Próximo incremento: layout lateral y tareas con vencimiento, no incluidos en esta entrega.
## Menú de cuenta y recorrido demo global — 2026-10-09

Tres puntos de Mi cuenta abren panel hacia arriba con proyectos, personalización, configuración y Empresa activa. Recorrido CompanyDemo independiente en memoria, sin contexto persistente ni llamadas mutadoras: inicio, proyectos, pauta ilustrativa, mapa diario, actividad, miembros y revisión ilustrativa. Siempre identificado como ficticio y solo lectura. No replica todavía los visores multimedia interactivos ni el flujo completo de pauta; son escenas demostrativas. Salir restaura el App existente. Build y activación comprobados en navegador; evidencia qa/account-demo-menu.png. Se corrigió recorte del popover en sidebar fijando anchura y anclaje derecho.
# Encabezado de revisión — 2026-10-09

Archivo, acciones y versión comparten una franja editorial; los modos usan botones con Iconoir, estado activo discreto y foco visible. Se conservan los controladores existentes. El ancho del área de revisión determina cuándo se oculta la ayuda secundaria y las acciones pueden saltar de fila sin comprimir el nombre.

Verificación: build Docker correcto, cambio Revisión/Preview social probado, escritorio inspeccionado y ancho móvil 375 sin desbordamiento observado. Evidencia: `qa/review-header-redesign.png`. No se subieron archivos ni se modificaron comentarios durante QA.

# Composiciones editoriales con profundidad — 2026-10-09

Las formas planas de CoverArt incorporan curvas asimétricas, sombreado suave y capas superpuestas inspiradas en la referencia visual del usuario. El sombreado se limita a las ilustraciones, no a los controles. Se mantienen las paletas del sistema y una zona oscura para el texto del hero; móvil reduce el protagonismo de la decoración. No se modifican medios subidos por usuarios.

Verificación: compilación Docker correcta, Inicio publicado inspeccionado, ancho 375 px sin desbordamiento y consola sin errores observados. Evidencia: `qa/studio-layered-art.png`.

# Tipografía global Geist — 2026-10-09

Geist Sans sustituye las familias anteriores en toda la interfaz, incluidos formularios, comentarios y menús; Geist Mono se reserva para código, tiempos y referencias técnicas. Fuentes variables WOFF2 del paquete oficial `geist`, empaquetadas por Vite y servidas por Docker, con font-display swap. No se alteran tipografías internas de archivos de clientes ni documentos incrustados.

Verificado: compilación Docker correcta tras ajustar rutas de assets, WOFF2 presentes en el contenedor y familias calculadas Geist en títulos y botones de la vista publicada; consola sin errores observados. Tokens actualizados. Evidencia: `qa/geist-typography.png`.

# Equipo: distribución limpia — 2026-10-09

Se elimina la tarjeta de filtros y el fondo del resumen. Espacio y búsqueda se alinean sobre el directorio; la explicación del acceso se mueve al final del DOM y las opciones secundarias usan separadores discretos. Se conservan controles y tokens del producto.

Verificación: build Docker correcto, vista publicada inspeccionada y ancho 375 px sin desbordamiento; consola sin errores observados. Evidencia: `qa/team-clean-layout.png`.

# Equipo: selector de espacios — 2026-10-09

El selector nativo de espacio se sustituye por WorkspacePicker: combobox con listado oscuro, iconos Iconoir, espacio actual marcado y texto secundario. La búsqueda y el selector comparten una barra de filtros con tokens existentes. No se modifica la selección de roles ni los permisos.

Verificado en la vista publicada: apertura, Escape, ArrowDown/Enter, cierre al enfocar la búsqueda; a 375 px el menú permanece dentro del viewport sin desbordamiento horizontal. Compilación Docker correcta y consola sin errores observados. La cuenta disponible solo tiene un espacio, por lo que el cambio entre dos espacios diferentes no se pudo verificar en vivo. Evidencia: `qa/team-workspace-picker.png`.

# Equipo: jerarquía y densidad — 2026-10-09

El directorio de miembros es el contenido principal. Invitar persona despliega el formulario existente; alcance del acceso y aceptación de códigos quedan en apartados secundarios plegables. Se reutilizan superficies, acento, controles e Iconoir del sistema. No se modifican permisos del servidor. En demo se muestran miembros ficticios y se bloquean operaciones de acceso reales.

Verificación: build Docker correcto, inspección de escritorio 1440 px, apertura/cierre del formulario, estado deshabilitado sin correo, ancho 375 px sin desbordamiento horizontal y consola sin errores observados. No se emitieron invitaciones ni se cambiaron roles durante QA. Evidencia: `qa/team-redesign.png`.

# Demo con el panel original — 2026-10-09

Se sustituye la presentación independiente por la misma instancia de App, Sidebar, StudioHome, biblioteca, Pauta y Planning del producto. Un proveedor efímero y un almacenamiento de sesión en memoria contienen 3 proyectos, 12 piezas SVG ilustrativas y 296 comentarios ficticios del mes. Las piezas y los cambios del demo no se escriben en los archivos ni en los datos de la cuenta. Al salir se restaura la instancia original y se descarta la sesión ficticia.

Verificado: compilación Docker, prueba de relaciones y aislamiento del fixture, navegación pública Inicio/Pauta/Planificación, salida y restauración de la cuenta original; consola sin errores observados. Evidencia: `qa/company-demo-original-panel.png`. Las ilustraciones no simulan archivos de video reales; se mantienen las limitaciones funcionales del producto original.

# Refinamiento visual del demo — 2026-10-09

El recorrido de empresa activa utiliza navegación discreta, aviso compacto de datos ficticios y tarjetas editoriales con portadas tipográficas diferenciadas. Se conserva la base oscura y el acento del sistema de diseño; los colores de portada no representan estados operativos. Las portadas son ilustraciones, no medios reproducibles.

Verificación: compilación de producción en Docker correcta; vista pública inspeccionada; ancho móvil de 375 px sin desbordamiento horizontal y sin errores de consola durante la comprobación. Evidencia: `qa/company-demo-redesign.png`. El demo sigue siendo independiente y de solo lectura.
