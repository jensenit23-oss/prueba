import { useEffect, useState } from "react";

async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  return response;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function App() {
  const [health, setHealth] = useState(null);
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setError("");
    try {
      const [healthResponse, notesResponse] = await Promise.all([
        request("/api/health"),
        request("/api/notes"),
      ]);
      if (!healthResponse.ok || !notesResponse.ok) {
        throw new Error("bad status");
      }
      setHealth(await healthResponse.json());
      setNotes(await notesResponse.json());
    } catch {
      setHealth(null);
      setError("No hay conexión con el backend. Comprueba que el entorno esté arrancado.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await request("/api/notes", {
        method: "POST",
        body: JSON.stringify({ title, body }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "No se pudo guardar la nota.");
        return;
      }
      setTitle("");
      setBody("");
      await load();
    } catch {
      setError("No se pudo guardar la nota.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id) {
    setError("");
    try {
      const response = await request(`/api/notes/${id}`, { method: "DELETE" });
      if (!response.ok && response.status !== 204) {
        setError("No se pudo borrar la nota.");
        return;
      }
      await load();
    } catch {
      setError("No se pudo borrar la nota.");
    }
  }

  const isProduction = health?.mode === "production";
  const modeLabel = isProduction ? "producción" : health ? "local" : "sin conexión";

  return (
    <main className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Prueba de despliegue</p>
          <h1>Notas v6</h1>
          <p className="lede">
            Este texto llegó solo con un push a main. No hubo que entrar al servidor.
          </p>
        </div>
        <div className={`badge ${isProduction ? "badge-prod" : "badge-local"}`}>
          <span>Entorno</span>
          <strong>{modeLabel}</strong>
        </div>
      </header>

      <section className="status" aria-live="polite">
        <p>
          Base de datos:{" "}
          <strong>{health?.database === "connected" ? "conectada" : "no disponible"}</strong>
        </p>
        {health?.time && <p>Última respuesta: {formatDate(health.time)}</p>}
      </section>

      <form className="card form" onSubmit={onSubmit}>
        <label>
          Título
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            required
            placeholder="Una nota para este entorno"
          />
        </label>
        <label>
          Texto
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={2000}
            rows={4}
            placeholder="Opcional"
          />
        </label>
        <button type="submit" disabled={saving}>
          {saving ? "Guardando..." : "Guardar en PostgreSQL"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      <section className="list">
        {loading && <p className="muted">Cargando notas...</p>}
        {!loading && notes.length === 0 && <p className="muted">Todavía no hay notas.</p>}
        {notes.map((note) => (
          <article className="card note" key={note.id}>
            <div>
              <h2>{note.title}</h2>
              {note.body && <p>{note.body}</p>}
              <time dateTime={note.created_at}>{formatDate(note.created_at)}</time>
            </div>
            <button type="button" className="ghost" onClick={() => onDelete(note.id)}>
              Borrar
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}
