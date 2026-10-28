# Regresión técnica posterior a recuperación de QA

Ejecutado por el agente principal. Cada integración crea PostgreSQL17 temporal con el runner de QA; no usa ni reinicia ePayco ni el laboratorio persistente. Códigos negativos son assertions esperadas, no fallos ignorados.

| Integración | Resultado verificado |
|---|---|
| onboarding-permissions | PASS: invitaciones duplicadas/correo distinto/usadas/revocadas/vencidas, cambios de rol, último administrador, creación concurrente única y replay tras degradación/retirada |
| onboarding | PASS: cinco personas/cuatro invitaciones capturadas, tres proyectos compartidos, aislamiento personal/externa, registro e idempotencia |
| shared-media-concurrency | PASS: cargas/orden/comentarios/ediciones/decisiones/versiones/papelera simultáneos, conflictos409 y restauración persistida |
| comment-pagination | PASS:123 comentarios,50/50/23, empates de timestamp, cursores inválidos, fronteras de acceso y120 abiertos |
| shared-decision | PASS: asignación, bloqueantes, solo lectura, reintentos y revocación con historia |
| shared-upload-interruption | PASS: aborto de transporte real, reintento misma clave, limpieza por firma inválida, reconciliación y cuota liberada |
| project-trash | PASS: autorización admin, confirmación, revisión concurrente, acceso oculto, restauración y comentarios retenidos |
| shared-version | PASS: originales inmutables, numeración única, revisores pendientes y lecturas/Range acotados |

Comando por fila: `node backend/shared-review-qa-runner.js <nombre>-integration.js`. Todos salida0.

Hallazgo durante revisión de componentes: el botón secundario de aprobar en Revisores y decisiones todavía calculaba bloqueantes usando solo room.comments. Se cambió a los totales del servidor y fallback parcial, igual que el botón superior. Regresión nueva RED→GREEN verifica bloqueo con bloqueante no cargado y con totales incompletos. El servidor ya impedía aprobar; el defecto era una acción visualmente habilitada que terminaba en409.

Compilación PASS; permanecen advertencias de fuentes Geist no resueltas y bundle mayor de500kB. No se presenta como verificación visual ni como cierre del objetivo. Paginación UI adicional de123 comentarios PASS (50/50/23, IDs únicos, bloqueante final y aprobaciones deshabilitadas). Recuperación contextual PASS con figura local preservada y foco de Contraseña verificado después de recargar el bundle. Colaboración simultánea en cinco navegadores, micrófono autorizado, responsive interactivo completo y variantes restantes de la matriz siguen pendientes.
