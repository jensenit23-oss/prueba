import { defineRailway, empty, postgres, project, service } from "railway/iac";

export default defineRailway(() => {
  const db = postgres("postgres");

  const backend = service("backend", {
    source: empty(),
    rootDirectory: "/backend",
    build: {
      builder: "RAILPACK",
      buildCommand: "npm ci --omit=dev",
    },
    start: "npm start",
    healthcheck: "/api/health",
    healthcheckTimeout: 120,
    env: {
      APP_MODE: "production",
      NODE_ENV: "production",
      DATABASE_URL: db.env.DATABASE_URL,
    },
  });

  const frontend = service("frontend", {
    source: empty(),
    rootDirectory: "/frontend",
    build: {
      builder: "RAILPACK",
      buildCommand: "npm ci && npm run build",
    },
    start: "npm start",
    env: {
      NODE_ENV: "production",
      API_HOST: backend.env.RAILWAY_PRIVATE_DOMAIN,
      API_PORT: backend.env.PORT,
    },
  });

  return project("prueba", {
    resources: [db, backend, frontend],
  });
});
