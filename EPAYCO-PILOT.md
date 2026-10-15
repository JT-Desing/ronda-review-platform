# Piloto local ePayco MKT

URL pública: https://ronda.repolite.link/

Este despliegue usa `compose.epayco.yaml`, proyecto Docker `ronda-epayco-mkt`.
No usa la base temporal de QA ni los volúmenes del despliegue anterior.
PostgreSQL y los archivos persisten en los volúmenes `epayco-database` y
`epayco-files` del proyecto. No ejecutar `docker compose down -v` ni borrar
esos volúmenes. Los respaldos diarios están en `.backups/epayco-mkt`.
Los respaldos en el mismo PC no protegen frente a pérdida del disco.
Para eso está el respaldo externo en Cloudflare R2 (configuración en
`backend/README.md`, sección "Respaldo externo en Cloudflare R2"). Con el
archivo privado ya creado fuera del repositorio:

```powershell
$env:RONDA_BACKEND_ENV='C:/Users/Julian T/Documents/Codex/2026-10-07/necesi-6/outputs/ronda-prototype/backend/.env'
$env:RONDA_OFFSITE_ENV='RUTA_PRIVADA/.env.offsite'
docker compose --env-file 'C:/Users/Julian T/Documents/Codex/2026-10-07/necesi-6/outputs/ronda-prototype/.env' -f compose.epayco.yaml --profile offsite up -d --build offsite
```

Solo se construye y arranca `offsite`. Compose no recrea los demás servicios
mientras su configuración no cambie.

Para iniciar, desde esta carpeta en PowerShell, indicando los archivos privados
ya existentes (no copiar sus valores al repositorio):

```powershell
$env:RONDA_BACKEND_ENV='C:/Users/Julian T/Documents/Codex/2026-10-07/necesi-6/outputs/ronda-prototype/backend/.env'
docker compose --env-file 'C:/Users/Julian T/Documents/Codex/2026-10-07/necesi-6/outputs/ronda-prototype/.env' -f compose.epayco.yaml up -d --build
```

La web se publica localmente solo en `127.0.0.1:8082`; el túnel existente
conecta el dominio al servicio interno `http://ronda:8080`. No iniciar a la vez
el túnel antiguo contra otro despliegue con el mismo token.

El servidor público NO incluye las rutas `/qa/login/*`. Cada persona se
registra con su propia contraseña. El registro no concede acceso al equipo.
Tras confirmar el correo del administrador y su registro, el operador ejecuta:

```powershell
docker exec ronda-epayco-mkt-api-1 node epayco-pilot.js CORREO_CONFIRMADO
```

Luego el administrador invita desde Equipo; cada destinatario se registra
con el mismo correo y acepta el código de invitación desde Equipo.
Los proyectos que deban colaborar se crean en Compartidos con el equipo;
los proyectos privados no se comparten automáticamente.

El PC, Docker y el túnel deben permanecer activos. El reinicio automático
de los contenedores requiere que Docker Desktop esté iniciado.
