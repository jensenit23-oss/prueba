# Notas de prueba

Misma aplicación en local y en Railway. El despliegue lo hace GitHub Actions. No usa Docker.

- Frontend: React + Vite. En producción un servidor Node sirve el build y reenvía `/api`.
- Backend: Node.js + Express.
- Base de datos: PostgreSQL. En local es la tuya. En Railway la crea `.railway/railway.ts`.

## Local

Hace falta Node.js 22 y PostgreSQL. Crea el usuario y las dos bases (la segunda sirve para simular producción en tu máquina):

```sql
CREATE USER prueba WITH PASSWORD 'prueba';
CREATE DATABASE prueba OWNER prueba;
CREATE DATABASE prueba_prod OWNER prueba;
```

El archivo `db/local.sql` tiene las mismas sentencias. Si el usuario ya existe, créalo tú con la contraseña que uses y ponla en `backend/.env`.

```powershell
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
npm install
npm install --prefix backend
npm install --prefix frontend
```

En una terminal:

```powershell
npm --prefix backend run dev
```

En otra:

```powershell
npm --prefix frontend run dev
```

Abre http://localhost:5173. La etiqueta dice **local**. La API también responde en http://localhost:3000/api/health.

## Producción en tu máquina

Usa la otra base y el mismo arranque que Railway (`npm start`), sin el servidor de Vite.

```powershell
npm --prefix backend run start:prod
npm --prefix frontend run start:prod
```

Abre http://localhost:8080. La etiqueta dice **producción**. Una nota creada aquí no aparece en http://localhost:5173.

## Producción en Railway

1. Crea un proyecto vacío en Railway. El nombre del archivo es `prueba`; puedes cambiarlo en `.railway/railway.ts`.
2. En el proyecto: Settings → Tokens → crea un project token del entorno `production`.
3. Sube este repo a GitHub. En el repo: Settings → Secrets → Actions → `RAILWAY_TOKEN` con ese token.
4. No actives el autodeploy de GitHub dentro de Railway. El único deploy es el workflow.
5. Haz push a `main`, o lanza el workflow **Deploy** a mano.

Eso aplica `.railway/railway.ts` (Postgres, backend y frontend) y sube los dos servicios. El frontend queda en un dominio `*.up.railway.app`. El backend no se publica: el frontend le habla por la red privada de Railway.

Cada push a `main` vuelve a desplegar. Un pull request solo comprueba que el backend arranca en sintaxis y que el frontend compila.

## Variables

| Dónde | Qué |
| --- | --- |
| `backend/.env` | Postgres local y `APP_MODE=local` |
| `frontend/.env` | `API_PROXY_TARGET=http://localhost:3000` |
| Railway, servicio `backend` | `APP_MODE`, `NODE_ENV` y `DATABASE_URL` (los define el archivo de Railway) |
| Railway, servicio `frontend` | `API_HOST` y `API_PORT` del backend, por la red privada |

## API

| Método | Ruta | Uso |
| --- | --- | --- |
| GET | `/api/health` | Estado, modo y conexión a la base |
| GET | `/api/notes` | Listar notas |
| POST | `/api/notes` | Crear `{ "title": "...", "body": "..." }` |
| DELETE | `/api/notes/:id` | Borrar una nota |
