# Segunda pasada: recuperación de cargas — 2026-10-14

Se ejecutó `node backend/shared-review-qa-runner.js shared-upload-interruption-integration.js` contra PostgreSQL y archivos temporales aislados. Resultado fresco: PASS, salida 0. No se cargó `.env`, no se reinició el laboratorio conservado, no hubo build ni acceso a producción. No se modificó código de producción: los casos examinados no reprodujeron pérdida ni reserva fallida que mantuviera cuota indefinidamente.

La prueba nueva utiliza HTTP real, backend real, almacenamiento local real y consultas de evidencia. Solo se instrumenta un fallo entre rename del archivo y commit SQL; las expiraciones se aceleran cambiando timestamps de tres filas identificadas en la base temporal. Ninguna de estas instrumentaciones existe en producción.

| Caso / pasos | Esperado | Observado y evidencia | Resultado |
|---|---|---|---|
| Reservar 1024 bytes, enviar firma PNG parcial con Content-Length1024, esperar claim SQL, destruir transporte http.request | Fallo recuperable y liberar temporal | ECONNRESET; polling acotado observa failed/object_key null; stat .part ENOENT; complete409 | PASS API |
| Repetir reserva con misma requestId y contenido, enviar1024 bytes | Reutilizar reserva y guardar una sola versión | Mismo uploadId; receive200; complete200; segundo complete devuelve mismo versionId | PASS API |
| Interrumpir después de rename real y antes del commit | No crear versión incompleta, permitir recuperación | HTTP500; SQL state received y cero versiones; original final1024 bytes existe; siguiente complete200 recupera ese archivo | PASS API/instrumentado |
| Declarar PNG y enviar12 bytes sin firma | Rechazar contenido y liberar cuota | HTTP415; failed/object_key null | PASS API |
| Reservar12 y enviar8 bytes válidos | Rechazar incompleto | HTTP400; failed/object_key null | PASS API |
| Reservar12 y enviar13 bytes | Rechazar sobrelímite sin relajar validación | HTTP413; failed/object_key null | PASS API |
| Abandonar reserva sin content y otra con content received; vencer ambas | Limpiar huérfanas sin afectar ready | Reconciliador real cleaned2/failed0; ambas failed/object_key null; temporal received ENOENT | PASS API/clock acelerado |
| Vencer también timestamp de original ready con versión y reconciliar | Preservar original comprometido | Sigue ready,1024 bytes; siguiente reconciliación cleaned0/failed0 | PASS |
| Calcular ocupación después de fallos y limpieza | Solo original válido consume cuota | Consulta SQL de misma regla de ocupación devuelve1024 | PASS |

Los logs ECONNRESET,409,500,415,400 y413 son fallos provocados y verificados, no errores omitidos.

El comportamiento actual distingue reservas vivas y fallidas. Las fallidas cuyo temporal se limpió liberan cuota inmediatamente, incluso si el siguiente intento usa otra requestId. Una reserva staging abandonada sin transferencia sí ocupa cuota durante su vigencia de una hora; al vencer deja de contar aunque aún no corra el reconciliador. Una received vencida con temporal continúa ocupando hasta eliminar sus bytes. El servidor de producción programa reconciliación al arrancar y cada60 segundos, en lotes20; grandes colas pueden necesitar varias rondas. Estos plazos se inspeccionaron en código; no se esperó una hora ni se afirma medición temporal de producción.

No se añadió cancelación: requeriría contrato nuevo coordinado con cliente. Si se quiere liberar inmediatamente una reserva que nunca inició transferencia, la mejora propuesta es cancel autenticado solo por autor que falle/cancele staging o received sin versión y limpie temporales con las mismas exclusiones del reconciliador. No debe cancelar ready ni borrar originales comprometidos. Sigue pendiente decisión funcional del principal sobre esa mejora; no bloquea los casos de recuperación ya comprobados.

Gaps: no nueva UI, no espera real del timeout XHR de diez minutos, no cierre abrupto del proceso del laboratorio, no fallo de filesystem durante unlink, no saturación de2GB ni medición bajo carga. El fallo post-rename verifica la ventana filesystem/SQL con inyección acotada, no un crash completo del proceso. La prueba usa polling con máximo2 segundos para estados locales; no introduce esperas eternas.
