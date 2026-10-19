# Segunda pasada: incorporación, invitaciones y administración

## N10 — fallo de lectura después de mutación confirmada (retetest 2026-10-17)

- `completeSignup` se extrae a `src/domain/signup-flow.js` y lo consume la ruta de registro de `AccountAccess`, para que las pruebas ejerciten la misma orquestación real: registro → alta/aceptación → `enter` → recuperación.
- Se añadieron regresiones de dominio para alta de equipo y aceptación de invitación cuando el primer GET de membresías falla transitoriamente y el reintento funciona; para corte persistente seguido de retry explícito, y para conservar el borrador/código editable cuando la aceptación fue rechazada.
- Assertivas verifican que los POST de registro/equipo/invitación no se repiten, identidad y opciones de recuperación permanecen; después de mutación ya confirmada, la recuperación solo vuelve a leer membresías. Al agotarse el primer intento y su retry, se conserva un estado de sesión activa recuperable, sin presentar un falso login.
- Verificación actual: `node --test src/domain/signup-flow.test.js src/components/onboarding-resilience.test.js` 18/18 PASS; `pnpm test` 194/194 PASS; `pnpm build` PASS. Son pruebas con transportes simulados; HTTP E2E visual sobre el formulario aún no fue posible y N10 sigue PARTIAL.

2026-10-14. Ejecución en PostgreSQL 17 efímero mediante `shared-review-qa-runner.js`; ninguna lectura de `.env`, ninguna modificación del servidor persistente ni datos de producción. No se ejecutó navegador: esta evidencia acredita API/servicio y persistencia, no experiencia visual.

| Caso | Esperado | Observado | Estado |
|---|---|---|---|
| Registro nuevo, contraseña corta, correo duplicado | Registro válido crea espacio personal; inválidos 400/409 | HTTP confirma los tres resultados | PASS |
| Creación de equipo y reintento concurrente | Un equipo y un evento, administrador inicial | Mismo UUID en dos llamadas; un evento persistido | PASS |
| Mismo requestId con nombre distinto | 409 sin segundo equipo | 409 | PASS |
| Reintentar creación tras degradación del creador | Rol vigente | Antes devolvía admin; corregido devuelve reviewer | CORREGIDO / PASS |
| Reintentar creación tras retirar al creador | 404, sin acceso recuperado | 404 después de corrección | PASS |
| Invitación duplicada pendiente / miembro existente | 409 | 409 en ambos casos | PASS |
| Invitación con mayúsculas | Normalizar correo | Aceptación con correo normalizado correcta | PASS |
| Correo diferente acepta código | 403 sin consumir invitación | 403; destinatario pudo aceptar después | PASS |
| Cambiar rol de invitación pendiente | Miembro recibe rol nuevo | editor persistido y visible al leer equipo | PASS |
| Código usado, revocado o vencido | 404 sin membresía nueva | 404 en los tres estados | PASS |
| Editar invitación vencida | 404 | 404 | PASS |
| Editor/reviewer gestiona miembros o invita | 403 | 403 para cada rol probado | PASS |
| Retirar/degradar último administrador | 409; administrador conservado | 409 en ambas operaciones | PASS |
| Retirar miembro y leer equipo | 404 inmediatamente | 404 | PASS |
| Tres proyectos de equipo y cuenta externa | Revisores ven tres; externa no accede | HTTP existente confirma fronteras | PASS |
| Onboarding visual de nueva cuenta | Registro, elección personal, persistencia y entrada al equipo | B08 verificó una cuenta limpia en navegador; nueva integración verificó preferencia y pasos HTTP posteriores | PASS PARCIAL — matrices visuales de errores de invitación/foco siguen pendientes |
| Aislamiento UI de dos identidades | Abrir los hosts QA .2 y .3 en el mismo perfil Edge debe producir identidades distintas | Ambos `/api/auth/session` devuelven Eva; la herramienta los mantiene en un cookie context compartido | BLOQUEADO — requiere contextos reales separados |

## Defecto y corrección

`workspaceRepository.createTeam` respondía `role: 'admin'` fijo al reconocer el requestId previo. Reproducción: crear, añadir segundo administrador, degradar creador, repetir creación con mismo requestId. El test falló con actual admin / esperado reviewer. El reintento ahora bloquea el espacio para lectura compartida, consulta membresía vigente, usa el rol real y aplica 404 cuando la membresía desapareció. No otorga de nuevo privilegios ni reinserta miembros.

Prueba nueva: `backend/onboarding-permissions-integration.js`, con servicios y repositorios reales sobre base temporal. La regresión falló primero por el rol incorrecto y pasó después del cambio.

## Comandos y resultados

- `node backend/shared-review-qa-runner.js onboarding-permissions-integration.js`: RED por admin incorrecto; segunda ejecución GREEN, todos los casos anteriores.
- `node backend/shared-review-qa-runner.js onboarding-integration.js`: PASS, registro HTTP, cuatro invitaciones capturadas, cinco personas, proyectos, fronteras y último administrador.
- Retest fresco 2026-10-16: `node backend/shared-review-qa-runner.js onboarding-integration.js` PASS en nueva base temporal. Confirma registro inválido/duplicado, elección personal persistida, alta de empresa autoservicio, idempotencia, cuatro correos solo en buzón capturado, cuatro roles invitados/aceptados, invitación equivocada/usada/vencida, externa sin acceso, tres proyectos compartidos y protección del último admin. Esto es integración HTTP, no reemplaza la matriz visual de cinco personas simultáneas.
- Retest fresco 2026-10-16: `node backend/shared-review-qa-runner.js onboarding-permissions-integration.js` PASS. Cambios de rol de invitación, usada/revocada/vencida, permisos, protección de último admin, creación concurrente idempotente y reintentos del creador degradado/retirado. Integración HTTP, no matriz visual de roles.
- Retest cruzado adicional 2026-10-15: `node backend/shared-review-qa-runner.js onboarding-integration.js` PASS (cuenta temporal etiquetada y retirada por runner); repite registro, alta autoservicio, cinco miembros, cuatro invitaciones capturadas, roles, proyectos compartidos, token wrong/used/expired, aislamiento de externa y último admin. No usa el estado persistente del laboratorio.
- `npm test` en raíz y backend: comando no disponible en PATH; se ejecutaron sus scripts con Node directamente.
- `node --test` en backend: 40/40 PASS.
- `node --test src/**/*.test.js`: FAIL ajeno al cambio, prueba «media shortcuts ignore interactive controls and modal dialogs», espera `ignoreReviewShortcut` en OriginalMediaStage. Reportado al principal para coordinación.

No build/deploy/commit/push. No objetivo global completado. Falta la validación visual y los restantes dominios de la segunda pasada.
