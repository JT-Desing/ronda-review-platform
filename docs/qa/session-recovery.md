# Recuperación de sesión durante revisión — 2026-10-15

## Defecto y causa

`AccountAccess` comprobaba la sesión únicamente al montar. Un 401 posterior no ofrecía autenticación contextual; `accountStorage.api` además eliminaba el estado HTTP al construir un Error nuevo y dejaba el fetch sin límite temporal. En revisión compartida, el manejo del 401 podía ocultar la sala aunque su borrador siguiera en memoria. Esto impide continuar desde la vista existente y empuja a recargar.

No se modificó producción, se revocaron cuentas reales ni se reinició el laboratorio.

## Corrección delimitada

- `jsonRequest` comunica `ronda-session-expired` únicamente para 401 de operaciones `/api/` autenticadas; no para login, registro ni consulta inicial de sesión. Un 403 no se convierte en recuperación de sesión.
- La API privada reutiliza el transporte JSON acotado: conserva `status` y termina peticiones colgadas con error recuperable.
- `AccountAccess` mantiene montados el proveedor y sus hijos. Presenta un diálogo modal nativo que deja inerte la aplicación y mantiene el foco dentro del formulario.
- El correo es de solo lectura y la contraseña usa `current-password`. No se crean credenciales nuevas ni se exige compartirlas.
- Reautenticar no llama `enter`/`initializeAccount`, no descarga otro snapshot y no sustituye estado ni borrador. Solo acepta el mismo ID de cuenta; una identidad distinta se cierra y no se adopta.
- Tras recuperar la identidad se comunica `ronda-session-restored` y se reintenta el guardado privado pendiente con su revisión original. Los conflictos siguen rechazándose: no se fuerza sobrescritura.
- El diálogo advierte que el borrador está en esta pestaña y no debe recargarse/cerrarse. No promete persistencia del borrador compartido al cerrar navegador.

## Contrato coordinado

El agente principal integra en `SharedReviewRoom` / estado compartido: conservar sala ante 401, bloquear mutaciones mientras la sesión esté expirada, permitir reintento después de `restored` y no refrescar automáticamente si existe borrador o cambios de revisores. 403/404 mantienen el cierre de acceso. Estos archivos no fueron editados por el agente de sesión.

## Evidencia automatizada

`node --test` ejecutado después del cambio: **160 aprobadas, 0 fallidas** (conteo del checkout en ese momento).

Casos nuevos:

1. 401 autenticado emite recuperación; 401 de auth y 403 no la emiten.
2. Recuperación correcta llama solo login de la misma cuenta, sin GET de datos ni cambio de snapshot.
3. Respuesta con otro ID se cierra y rechaza.
4. Guardado privado con 401 conserva copia pendiente y contenido; después de recuperar, envía exactamente la revisión original, sin descartar cambios.
5. API privada colgada termina por timeout, en lugar de dejar el estado busy para siempre.

`node node_modules/vite/bin/vite.js build`: aprobado, con advertencias existentes de rutas Geist WOFF2 y bundle mayor de 500 kB. No se presentan como salida limpia.

## Pendientes explícitos

### Verificación real parcial del agente principal

2026-10-15, navegador integrado, origen aislado Mario `127.0.0.4:24103`: abrir Proyectos → Campaña de verano → primera imagen V1. Seleccionar azul y escribir borrador de 61 caracteres. Abrir segunda pestaña del mismo origen y cerrar sesión allí. Publicar desde la primera devuelve 401 y abre el diálogo, sin recargar. Contraseña incorrecta muestra error; reingreso con la credencial QA existente cierra el diálogo. El borrador exacto y azul seleccionado permanecen. Publicar entonces produce un único comentario visible, contador 1/1, compositor vacío y notificación de éxito. ID del comentario ficticio: `ad175d95-e867-4072-85e3-1f7a21496d13`. **PASS** para texto/color/recuperación contextual/publicación única visible.

Prueba adicional: se dibujó una figura azul local y se escribió otro borrador, luego se revocó la misma sesión en una segunda pestaña. El diálogo mostró el texto exacto, el botón Deshacer habilitado y la figura vinculada aún presente. Tras autenticar la misma cuenta, se pudo deshacer la figura y limpiar el borrador sin publicarlo. **PASS** para conservación de anotación no enviada. No se adjuntó audio en este caso; conservación de un archivo de audio durante expiración sigue sin probarse.

El primer retest del foco observó el correo de solo lectura enfocado pese a `autoFocus`; se corrigió con foco explícito después de `showModal`, también en el siguiente frame, y se retiró el correo de la secuencia de tabulación. Tras reconstruir y recargar la aplicación aislada, se provocó un 401 en una pestaña mientras la otra sesión había sido revocada. El árbol de accesibilidad confirmó que el campo Contraseña era el elemento enfocado al abrirse el diálogo. **PASS**. La expiración temporal real ya fue comprobada por integración HTTP; el recorrido UI utiliza logout en otra pestaña del mismo origen para reproducir el 401 sin tocar otras identidades.

- El agente principal debe verificar en navegador, con sesión QA revocada de forma controlada: modal, error de contraseña, entrada correcta, borrador/colores/anotaciones intactos, posterior publicación única y teclado/foco.
- La prueba unitaria no demuestra por sí sola montaje continuo de React ni accesibilidad visual. No declarar estos casos aprobados hasta la interacción real.
- No se ha probado micrófono ni nuevas contraseñas de registro en esta tarea.
