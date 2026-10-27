import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

const port = Number(process.env.PORT || 3000);
const mode = process.env.APP_MODE || process.env.NODE_ENV || "development";
const databaseUrl = process.env.DATABASE_URL;

function sslFor(connectionString) {
  if (!connectionString) return undefined;
  if (process.env.PGSSLMODE === "disable" || connectionString.includes("sslmode=disable")) {
    return false;
  }
  if (process.env.PGSSLMODE === "require" || connectionString.includes("sslmode=require")) {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

const pool = databaseUrl
  ? new Pool({ connectionString: databaseUrl, ssl: sslFor(databaseUrl) })
  : new Pool({
      host: process.env.PGHOST || "localhost",
      port: Number(process.env.PGPORT || 5432),
      user: process.env.PGUSER || "prueba",
      password: process.env.PGPASSWORD || "prueba",
      database: process.env.PGDATABASE || "prueba",
    });

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));

const origin = process.env.CORS_ORIGIN;
app.use(
  cors({
    origin: !origin || origin === "*" ? true : origin.split(",").map((value) => value.trim()),
  }),
);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function initDb() {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS notes (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          body TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      const { rows } = await pool.query("SELECT COUNT(*)::int AS count FROM notes");
      if (rows[0].count === 0) {
        await pool.query(
          "INSERT INTO notes (title, body) VALUES ($1, $2)",
          [
            "Nota de ejemplo",
            "Esta nota está guardada en PostgreSQL. Crea otra para comprobar que este entorno tiene su propia base.",
          ],
        );
      }
      return;
    } catch (error) {
      if (attempt === 30) throw error;
      console.log(`Esperando PostgreSQL (${attempt}/30)...`);
      await sleep(1000);
    }
  }
}

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      status: "ok",
      mode,
      database: "connected",
      time: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({
      status: "error",
      mode,
      database: "disconnected",
      time: new Date().toISOString(),
    });
  }
});

app.get("/api/notes", async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, title, body, created_at FROM notes ORDER BY id DESC",
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.post("/api/notes", async (req, res, next) => {
  try {
    const title = String(req.body?.title || "").trim();
    const body = String(req.body?.body || "").trim();
    if (!title) {
      res.status(400).json({ error: "El título es obligatorio." });
      return;
    }
    if (title.length > 120 || body.length > 2000) {
      res.status(400).json({ error: "El título o el texto son demasiado largos." });
      return;
    }
    const { rows } = await pool.query(
      "INSERT INTO notes (title, body) VALUES ($1, $2) RETURNING id, title, body, created_at",
      [title, body],
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/notes/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({ error: "Identificador no válido." });
      return;
    }
    const result = await pool.query("DELETE FROM notes WHERE id = $1", [id]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: "La nota no existe." });
      return;
    }
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Error interno del servidor." });
});

await initDb();
app.listen(port, "0.0.0.0", () => {
  console.log(`API lista en el puerto ${port} (modo: ${mode})`);
});
