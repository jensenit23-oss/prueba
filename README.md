# prueba

Sitio con API Node, frontend React y PostgreSQL. En el servidor entra nginx. No usa Docker.

## Local

Hace falta PostgreSQL con la base `prueba` (usuario y contraseña `prueba`). El archivo `db/local.sql` crea el usuario y las bases.

```powershell
npm install --prefix backend
npm install --prefix frontend
npm --prefix backend run dev
npm --prefix frontend run dev
```

- Web: http://localhost:5173
- API: http://localhost:3000/api/health

## Servidor

En el VPS, una vez copiado el proyecto en `/var/www/prueba`:

```bash
sudo bash deploy/setup-server.sh
```

Eso instala nginx, PostgreSQL y Node, crea la base y deja la API como servicio `prueba-api`.

En GitHub, Settings, Secrets and variables, Actions:

| Secret | Valor |
| --- | --- |
Secrets:

| Secret | Valor |
| --- | --- |
| `SSH_HOST` | IP o dominio del VPS |
| `SSH_USER` | Usuario SSH, el mismo donde está la clave pública |
| `SSH_KEY` | Clave privada |
| `PGPASSWORD` | Contraseña de PostgreSQL del VPS |

Variables (Settings, Secrets and variables, Actions, pestaña Variables):

| Variable | Valor |
| --- | --- |
| `APP_MODE` | `production` |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `PGHOST` | `localhost` |
| `PGPORT` | `5432` |
| `PGUSER` | `prueba` |
| `PGDATABASE` | `prueba` |
| `CORS_ORIGIN` | URL pública del sitio |

Cada push a `main` compila el frontend, entra por SSH y escribe `/var/www/prueba/backend/.env` con esos valores. Luego reinicia la API y recarga nginx. El `.env` de tu PC no se sube. El sitio público queda en el puerto 80: la web en `/` y la API en `/api`.
