# Rendimiento del laboratorio QA — 15–17 oct 2026

## Alcance y limitaciones

Resumen de 5.881 peticiones HTTP concluidas registradas en el laboratorio QA entre `2026-10-15T03:17:10Z` y `2026-10-17T22:35:23Z`. Son sesiones sintéticas y mixtas, no telemetría de producción ni medidas de Core Web Vitals. La duración HTTP no incluye el gesto completo del usuario ni el render final de la interfaz. Los 125 estados HTTP 4xx/5xx mezclan errores esperados de autenticación/validación con fallos de red; no deben interpretarse todos como defectos.

Los paths están normalizados y el registro no guarda cuerpos, nombres de archivo, correos, tokens ni bytes. Transferencia de archivo y finalización se agregan como fases separadas. Las fases de navegador (reserva, transferencia, finalización, refresh de parrilla, fetch/buffer/decodificación/ready del preview) se marcan con User Timing y no se envían a otro servicio.

## Mediciones HTTP

| Etapa | Peticiones | Errores HTTP | p50 ms | p95 ms | Máximo ms |
|---|---:|---:|---:|---:|---:|
| Datos de revisión | 1.087 | 8 | 8 | 22 | 2.025 |
| Entrega de medio | 651 | 0 | 7 | 9 | 25 |
| Reserva de carga | 17 | 1 | 19 | 52 | 52 |
| Transferencia de archivo | 15 | 1 | 13 | 49 | 49 |
| Finalización de carga | 14 | 0 | 16 | 27 | 27 |
| Inspección de enlace | 25 | 18 | 1.286 | 5.024 | 72.297 |
| Otras peticiones | 4.072 | 97 | 5 | 19 | 2.064 |

## Hallazgo y seguimiento

La inspección de enlaces tiene un outlier histórico de 72,297 ms (HTTP 400), aunque la ruta tiene límite total de 12 s y timeout DNS de 5 s. No hubo otra petición registrada junto a ese evento que permita atribuirlo; puede reflejar suspensión/contención del proceso QA o un defecto de temporización. En el retest de `example.com` del 17 oct, la consulta terminó con error de DNS recuperable en aproximadamente 5 s; no se reprodujo el outlier. Reejecuté `node --test backend/external-link.test.js`: 7/7 pasan; el DNS detenido y una petición que nunca responde terminan dentro de los límites. La prueba de deadline configura 10 ms y finalizó en ~15 ms con la señal de aborto activa. Es evidencia controlada de la lógica de timeout, no prueba de por qué ocurrió el outlier histórico. Mantener el pico como observación no resuelta y repetir carga DNS lenta antes de atribuir causa.

## Corrección de instrumentación

M205 corrigió las entradas User Timing del cliente: antes `performance.measure(name, {duration})` las anclaba al inicio de navegación (`startTime=0`); ahora se fija `start=now-duration` y `duration`. La regresión usa el API User Timing nativo, verifica anclaje y duración, y mantiene etiquetas permitidas sin datos por operación. Validación: frontend 213/213, backend 89/89 y build de producción PASS (1.826 módulos).

M210 añadió una inspección pública de `https://example.com/` desde la UI QA: el servidor devolvió HTTP 400 por DNS en 5.017 ms, con mensaje recuperable y sin crear pieza. M211 sumó el rechazo rápido de loopback (HTTP 400, 10 ms), antes de resolver/abrir el destino; no implica degradación de rendimiento. La clasificación/preview de otras páginas públicas ya pasó en M203; el retest example.com no indica demora de Ronda, sino ausencia de resolución DNS en la red actual. El conteo se regeneró con `node backend/qa-load-metrics.js`; los datos siguen limitados al laboratorio y sin PII.
