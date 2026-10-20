# Producción y QA — sincronización de frontend

## Estado verificado

Producción (`https://ronda.repolite.link/`) y las nueve sesiones QA (`127.0.0.20:24201` hasta `127.0.0.28:24209`) sirven el mismo frontend. Se comprobó igualdad de referencias de entrada y SHA-256 de los seis scripts/estilos de entrada en los nueve listeners. No se copiaron datos, sesiones, correos, archivos de usuarios ni configuración de producción a QA.

La diferencia inicial era que el `dist` servido por QA seguía apuntando a `index-BfSRecT9.js`; producción estaba en `index-DzPD5tdQ.js`. Se copió a QA el artefacto exacto de la última imagen publicada, conservando los chunks anteriores para pestañas abiertas. El índice de origen de producción y `dist/index.html` tienen SHA-256 idéntico: `eb23e4a9bcd34a00050c4789daec87c7db1f94c1a31ed0e01197d4948b8c654e`.

La página pública incluye una inyección dinámica de Cloudflare que no forma parte del artefacto de la aplicación. El verificador compara los scripts/estilos de la aplicación, no ese HTML variable del gateway.

- Identificador de referencias + contenido: `a1cf4b6c7fac6ad02af325f380b2e4a1e8972474a31fab0d8212810d34f7a9d4`.
- JavaScript principal: `/assets/index-DzPD5tdQ.js`.
- Estilos principales: `/assets/index-C0frMbDA.css`.
- Verificador reutilizable: `scripts/verify-frontend-parity.mjs`.
- Copia del índice QA anterior y del índice de origen publicado: `.backups/qa-production-sync-20261019`.

## Comprobación visual

En QA se abrió la sesión ficticia ya existente de Marina, sin registrarla de nuevo ni cambiar credenciales. Se comprobó la tarjeta personal de 312 px, logo de 36 px, iconos diferenciados de Pauta/Personal y ausencia de acceso demo. La consola de QA no mostró errores.

Evidencia: `design/qa/qa-production-synchronized.png`. La revisión de producción está documentada en las capturas de `design/qa/` de las pasadas anteriores.

## Límites y pendientes

- Esto acredita la paridad del frontend desplegado, no el cierre de todos los recorridos del objetivo de QA.
- Los cambios de servidor que añaden `platformRole` y `RONDA_SUPERADMIN_IDS` están en el repositorio y sus tres pruebas pasan, pero todavía no se publicaron en la API ni se asignó un superadmin. Los accesos demo ya están ocultos en producción y QA mediante denegación por defecto.
- No se reiniciaron los servidores de API/QA ni se recrearon sus fixtures. El proceso QA sigue usando sus módulos backend cargados antes de estos últimos cambios de rol.
- La suite backend existente pasó con código de salida 0. La última suite frontend pasó 249 pruebas y la última imagen frontend compiló correctamente.

## Repetir el control

```powershell
node scripts/verify-frontend-parity.mjs https://ronda.repolite.link/ http://127.0.0.20:24201/ http://127.0.0.21:24202/ http://127.0.0.22:24203/ http://127.0.0.23:24204/ http://127.0.0.24:24205/ http://127.0.0.25:24206/ http://127.0.0.26:24207/ http://127.0.0.27:24208/ http://127.0.0.28:24209/
```

El comando devuelve código 1 si cambia una referencia de entrada, falta un archivo o una huella no coincide. Solo lee archivos estáticos públicos; no envía cookies ni consulta información de cuentas.
