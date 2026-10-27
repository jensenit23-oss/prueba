import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, "dist");
const port = Number(process.env.PORT || 4173);

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

function apiTarget() {
  if (process.env.API_PROXY_TARGET) return new URL(process.env.API_PROXY_TARGET);
  if (process.env.API_HOST) {
    const apiPort = process.env.API_PORT || "3000";
    return new URL(`http://${process.env.API_HOST}:${apiPort}`);
  }
  return new URL("http://localhost:3000");
}

const target = apiTarget();
const client = target.protocol === "https:" ? https : http;

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(body);
}

function serveStatic(req, res) {
  if (!fs.existsSync(dist)) {
    send(res, 500, "Falta la carpeta dist. Ejecuta npm run build.");
    return;
  }

  const url = new URL(req.url, "http://localhost");
  const pathname = decodeURIComponent(url.pathname);
  const requested = path.normalize(path.join(dist, pathname));
  const base = dist.endsWith(path.sep) ? dist : dist + path.sep;
  if (requested !== dist && !requested.startsWith(base)) {
    send(res, 403, "Ruta no permitida");
    return;
  }

  let file = requested;
  const exists = fs.existsSync(file) && fs.statSync(file).isFile();
  if (!exists) {
    if (path.extname(pathname)) {
      send(res, 404, "No encontrado");
      return;
    }
    file = path.join(dist, "index.html");
  }

  res.writeHead(200, {
    "Content-Type": types[path.extname(file)] || "application/octet-stream",
  });
  fs.createReadStream(file).pipe(res);
}

function proxyApi(req, res) {
  const url = new URL(req.url, "http://localhost");
  const proxyReq = client.request(
    {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port,
      method: req.method,
      path: `${url.pathname}${url.search}`,
      headers: {
        ...req.headers,
        host: target.host,
      },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on("error", () => {
    send(res, 502, "API no disponible");
  });
  req.pipe(proxyReq);
}

const server = http.createServer((req, res) => {
  if ((req.url || "").startsWith("/api")) {
    proxyApi(req, res);
    return;
  }
  serveStatic(req, res);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Web lista en el puerto ${port} (API ${target.origin})`);
});
