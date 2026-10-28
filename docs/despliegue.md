# Despliegue y CI/CD

Todo corre en GitHub Actions con herramientas gratuitas para repos públicos.

## Qué pasa en cada PR

`ci.yml`:

- Frontend: pruebas, build y `pnpm audit`.
- Backend: pruebas unitarias, integración contra un Postgres desechable y `npm audit`.
- Imágenes: build de web y API, más `nginx -t`.
- Stack: levanta web, API y Postgres con `docker compose`, corre el smoke de seguridad (`scripts/production-security-smoke.mjs`) y una carga corta con k6 (`tests/load/smoke.js`, 10 usuarios por 30 s, p95 < 500 ms y menos de 1 % de errores).
- SonarCloud: corre solo en push a `main`. El proyecto es privado en el plan Free, que solo guarda análisis de la rama principal; los PR y `feature/shared-review` no se analizan.

`security.yml` (también los lunes por la mañana):

- CodeQL para JavaScript y para los propios workflows.
- gitleaks sobre todo el historial. Los falsos positivos van en `.gitleaksignore` con su huella exacta.
- Revisión de dependencias nuevas en el PR. Falla con severidad alta.
- Trivy sobre Dockerfiles, lockfiles y secretos. Los hallazgos quedan en la pestaña Security.

Dependabot abre PR semanales contra `feature/shared-review` para npm, imágenes Docker y actions.

## Publicación de imágenes

El job `publish` de `ci.yml` corre en cada push a `main` o `feature/shared-review`, solo después de que pasen `frontend`, `backend`, `images` y `stack`. Por cada imagen (`ronda-web`, `ronda-api`, `ronda-offsite`):

1. La construye y la escanea con Trivy. Si hay una vulnerabilidad HIGH o CRITICAL con parche disponible, no se publica.
2. La sube a `ghcr.io/jt-desing/<imagen>` con SBOM y provenance.
3. La firma con cosign usando la identidad OIDC de GitHub, sin llaves que guardar.

Etiquetas: `sha-<12 caracteres>` siempre, más `edge` para `feature/shared-review` y `stable` para `main`.

## Cómo actualiza el servidor

El servidor jala las imágenes. CI no tiene SSH ni secretos del servidor.

`compose.deploy.yaml` es un override: se suma al compose del stack que ya corre y cambia `build:` por las imágenes de GHCR de `ronda`, `api` y `offsite`. La base, los volúmenes y los archivos de entorno siguen siendo los del stack.

### Producción (piloto ePayco, PC de Julian)

Producción corre con `compose.epayco.yaml` (proyecto `ronda-epayco-mkt`, volúmenes `epayco-database` y `epayco-files`) y archivos de entorno privados fuera del repo. Ver `EPAYCO-PILOT.md`.

**No usar `compose.yaml` en ese PC.** Tiene otros volúmenes (`ronda-database`, `ronda-files`), así que arrancaría con una base vacía.

En PowerShell, desde la carpeta del repo:

```powershell
$env:RONDA_BACKEND_ENV='RUTA_PRIVADA/backend/.env'
$env:RONDA_CHANNEL='edge'
docker compose --env-file 'RUTA_PRIVADA/.env' -f compose.epayco.yaml -f compose.deploy.yaml pull
docker compose --env-file 'RUTA_PRIVADA/.env' -f compose.epayco.yaml -f compose.deploy.yaml up -d
```

`RONDA_CHANNEL` es obligatorio mientras no exista `stable`: el override usa `stable` por defecto, y esa etiqueta recién aparece con el primer merge a `main`.

Comprobar que todo quedó bien:

1. `docker compose ... ps` muestra imágenes `ghcr.io/jt-desing/ronda-...:edge` y servicios `healthy`.
2. https://ronda.repolite.link/api/health responde `"status":"ok"`.
3. En la app aparecen los proyectos de siempre (confirma que la base es la correcta).

Antes de cada actualización, hacer un respaldo:

```powershell
docker compose --env-file 'RUTA_PRIVADA/.env' -f compose.epayco.yaml exec database pg_dump -U ronda ronda > .backups/antes-de-actualizar.sql
```

Para volver a compilar desde el código como antes, quitar `-f compose.deploy.yaml` y agregar `--build` al `up`.

### Desarrollo local o servidor nuevo

Con `compose.yaml` (volúmenes propios, `backend/.env` en el repo):

```sh
export RONDA_CHANNEL=edge   # o stable
docker compose -f compose.yaml -f compose.deploy.yaml pull
docker compose -f compose.yaml -f compose.deploy.yaml up -d
```

Con Arcane, crear el stack con el compose que corresponda más `compose.deploy.yaml`, y activar la actualización automática de imágenes.

### Volver a una versión anterior

Fijar `RONDA_CHANNEL=sha-<commit>` y repetir `up -d`. Las migraciones corren al arrancar la API, así que antes de bajar de versión hay que revisar si la versión nueva cambió el esquema.

Verificar la firma antes de desplegar a mano:

```sh
cosign verify ghcr.io/jt-desing/ronda-api:stable \
  --certificate-identity-regexp '^https://github.com/JT-Desing/ronda-review-platform/' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

## Configuración pendiente en GitHub

1. **Paquetes públicos.** GHCR crea los paquetes como privados en el primer push. Pasarlos a públicos en Packages → Package settings, o hacer `docker login ghcr.io` en el servidor con un token de solo lectura.
2. **SonarCloud.** Organización manual `ronda-review` (plan Free) con el proyecto privado `ronda-review_ronda-review-platform`. Solo analiza `main` (limitación del plan Free con proyecto privado). El token va en el secreto `SONAR_TOKEN`.
3. **Dependency graph.** Activarlo en Settings → Code security y crear la variable del repo `DEPENDENCY_REVIEW=true`. Hasta entonces el job de revisión de dependencias no corre.
4. **Protección de rama.** En `feature/shared-review` y `main`, exigir que pasen `frontend`, `backend`, `images`, `stack`, `codeql`, `secrets` y `config` antes del merge.
