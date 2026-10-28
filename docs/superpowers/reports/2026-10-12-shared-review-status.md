# Estado del incremento compartido — 12 octubre 2026

Rama feature/shared-review. Sin push, PR, merge de esta rama ni despliegue. El PR de seguridad anterior se sincronizó por fast-forward antes de comenzar. Documentos del plan aprobados; ejecución nativa y worktree aislado autorizados.

## Implementado

Piezas y versiones compartidas con originales independientes; subida y lectura por pertenencia/rol; anotaciones/comentarios/respuestas por versión; edición propia y resolución; revisores, decisiones y bloqueo de aprobadas; revocación preservando historia. Sala compartida, historial, preview orientativa y estados de error/borrador. Temporales y reservas, recuperación de promoción interrumpida, limpieza acotada y cuota consistente. Protección de este flujo frente al demo ficticio.

El almacenamiento sigue local y de prototipo: 100 MB por archivo y 2 GB por espacio. Infraestructura comercial se activa/probará antes del primer cliente; no se contrató ni activó aquí. Correo, planes comerciales, pagos, acceso externo y dominio siguen otros incrementos.

## Evidencia y puertas pendientes

Verificación final: 96 pruebas unitarias aprobadas mediante `node --test`; 11 suites QA aprobadas mediante `node backend/shared-review-qa-runner.js NOMBRE.js`: modelo, subida, versiones, comentarios, decisiones, HTTP, limpieza, restauración, equipo, proyectos y migraciones. QA inicia contenedores propios sin credenciales/volúmenes de producción y elimina únicamente el contenedor etiquetado creado. Compilación aprobada mediante `node node_modules/vite/bin/vite.js build`, con avisos preexistentes de fuentes y tamaño del bundle.

INCONCLUSIVE: comprobación visual y recorrido completo en navegador. IAB y Edge bloquearon URL loopback con ERR_BLOCKED_BY_CLIENT. No se expuso QA al público para sortearlo. La instancia de prueba se cerró; su URL no es producción. Las reglas UI tienen pruebas de estado y compilación, no evidencia equivalente a interacción real.

Revisión independiente parcial: el revisor señaló reintentos, navegación/borradores, refresco/paginación y temporales; esos hallazgos se corrigieron con regresiones. No emitió dictamen final por créditos agotados. No se volvió a despachar. Revisión propia posterior es más débil que un dictamen independiente. No declarar lista para integrar/publicar por compilar.

## Decisiones y costes si fueran incorrectas

1. Worktree manual por Git: la herramienta de la app no reconoce repositorio anidado. Coste: checkout no adjunto automáticamente a la app; sigue registrado en Git.
2. Bookkeeping nativo de Windows con ledger: scripts shell de la habilidad no disponibles como bash utilizable. Coste: seguimiento manual; no sustituye verificación de cada tarea.
3. Junctions a dependencias existentes, sin instalación: coste de reproducibilidad si cambian esos directorios; no se modificaron dependencias.
4. Estados staging/received/ready/failed: separan recepción de bytes de transacción. Coste: reconciliación explícita; probada en QA, no producción.
5. Adaptador local bajo /data/files/_shared: reutiliza volumen/copia existentes sin mezclar roots UUID privados. Coste: todo respaldo de archivos debe incluir esa subcarpeta.
6. Router y servicios backend se guardan juntos para no dejar commits con imports ausentes. Coste: mayor rango de revisión del backend.
7. Sin navegador QA accesible: no túnel/exposición alternativa. Coste: pendiente validación visual antes de integrar.
8. Sin dictamen final del revisor: conservar rama, ledger y pendientes. Coste: una segunda revisión aún necesaria antes de publicar.

## Ajustes probados

- Reserva inicial repetida tras finalizar: misma pieza/versión, sin 409 falso ni duplicación.
- Carga fallida ya limpiada: reintento con la misma clave y cuota comprobada; botón de reintento conserva intento.
- Anotación de texto en JSONB: comparación estructural, no orden de claves.
- Foco con borrador/carga en marcha: guard actualizado; paginación descarta respuestas antiguas.
- Navegación con cambios: aviso/confirmación; cambios de proyecto/espacio no descartan sin aviso.
- Expiración: bytes siguen contando hasta limpiarse; originales ready/referenciados no se borran.
- Rango inválido: 416 con Content-Range; roles se comprueban antes.
- Revocación durante transferencia: rechaza finalización y limpia temporal.
- Aprobación concurrente con bloqueante: una operación rechazada; nunca aprobado con bloqueante abierto.
- Demo: llamadas de revisión compartida bloqueadas antes de tocar la cuenta real.

## Menores diferidos

Avisos preexistentes Geist/bundle; componente de sala necesita validación visual y puede subdividirse después de esa prueba; no certificación WCAG ni rendimiento. No tocar producción para ocultar estas limitaciones.
