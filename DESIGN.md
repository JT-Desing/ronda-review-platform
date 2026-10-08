# Ronda — dirección de producto y sistema visual

## Propósito

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
