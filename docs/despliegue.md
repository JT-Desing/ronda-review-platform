# Despliegue y CI/CD

Todo corre en GitHub Actions con herramientas gratuitas para repos públicos.

## Qué pasa en cada PR

`ci.yml`:

- Frontend: pruebas, build y `pnpm audit`.
- Backend: pruebas unitarias, integración contra un Postgres desechable y `npm audit`.
- Imágenes: build de web y API, más `nginx -t`.
- Stack: levanta web, API y Postgres con `docker compose`, corre el smoke de seguridad (`scripts/production-security-smoke.mjs`) y una carga corta con k6 (`tests/load/smoke.js`, 10 usuarios por 30 s, p95 < 500 ms y menos de 1 % de errores).
- SonarCloud: corre solo si existe el secreto `SONAR_TOKEN`.

`security.yml` (también los lunes por la mañana):

- CodeQL para JavaScript y para los propios workflows.
- gitleaks sobre todo el historial. Los falsos positivos van en `.gitleaksignore` con su huella exacta.
- Revisión de dependencias nuevas en el PR. Falla con severidad alta.
- Trivy sobre Dockerfiles, lockfiles y secretos. Los hallazgos quedan en la pestaña Security.

Dependabot abre PR semanales contra `feature/shared-review` para npm, imágenes Docker y actions.

## Publicación de imágenes

`release.yml` corre cuando CI termina bien en un push a `main` o `feature/shared-review`. Por cada imagen (`ronda-web`, `ronda-api`, `ronda-offsite`):

1. La construye y la escanea con Trivy. Si hay una vulnerabilidad HIGH o CRITICAL con parche disponible, no se publica.
2. La sube a `ghcr.io/jt-desing/<imagen>` con SBOM y provenance.
3. La firma con cosign usando la identidad OIDC de GitHub, sin llaves que guardar.

Etiquetas: `sha-<12 caracteres>` siempre, más `edge` para `feature/shared-review` y `stable` para `main`.

## Cómo actualiza el servidor

El servidor jala las imágenes. CI no tiene SSH ni secretos del servidor.

```sh
export RONDA_CHANNEL=edge   # o stable
docker compose -f compose.yaml -f compose.deploy.yaml pull
docker compose -f compose.yaml -f compose.deploy.yaml up -d
```

Con Arcane, crear el stack con esos dos archivos y activar la actualización automática de imágenes.

Para volver a una versión anterior, fijar `RONDA_CHANNEL=sha-<commit>` y repetir `up -d`. Las migraciones corren al arrancar la API, así que antes de bajar de versión hay que revisar si la versión nueva cambió el esquema.

Verificar la firma antes de desplegar a mano:

```sh
cosign verify ghcr.io/jt-desing/ronda-api:stable \
  --certificate-identity-regexp '^https://github.com/JT-Desing/ronda-review-platform/' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

## Configuración pendiente en GitHub

1. **Paquetes públicos.** GHCR crea los paquetes como privados en el primer push. Pasarlos a públicos en Packages → Package settings, o hacer `docker login ghcr.io` en el servidor con un token de solo lectura.
2. **SonarCloud.** Entrar en sonarcloud.io con GitHub, importar el repo (organización `jt-desing`), desactivar el análisis automático y guardar el token como secreto `SONAR_TOKEN`. Si la clave del proyecto u organización es otra, ajustar `sonar-project.properties`.
3. **Protección de rama.** En `feature/shared-review` y `main`, exigir que pasen `frontend`, `backend`, `images`, `stack`, `codeql`, `secrets` y `config` antes del merge.
