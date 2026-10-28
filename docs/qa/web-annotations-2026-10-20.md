# Anotaciones web — 2026-10-20

## Implementación

El visor externo ahora monta el mismo lienzo de anotación del resto de la revisión: lápiz, flecha, rectángulo, texto, colores y pines. Los trazos se incluyen en el comentario de revisión y se guardan mediante el endpoint compartido ya existente. Las anotaciones web no dependen de la marca de tiempo del video. Las páginas externas siguen aisladas en un iframe sandbox sin acceso al origen de Ronda.

El iframe y el lienzo usan una superficie de revisión fija de 1000 × 3000 px dentro de un contenedor desplazable. Así los trazos mantienen sus coordenadas al cambiar el tamaño del navegador o al desplazarse por esa superficie. El visor presenta la web con esas dimensiones; contenido dinámico de terceros puede cambiar por cuenta propia y el sitio puede bloquear la inserción. En esos casos se puede abrir el original.

## Validación

- Pruebas de anotación, sandbox y conexión del lienzo: 6/6.
- Suite frontend: 262/262.
- Build de producción Docker completado.
- API de producción: `/api/health` status ok.
- Paridad del artefacto: 6 recursos JS/CSS con hashes iguales entre dominio público y origen local; `passed: true`.
- No se creó ni modificó contenido real de usuario durante la validación.
- Captura visual de navegador no disponible en el entorno; se verificó build, código, tests y recursos publicados.
