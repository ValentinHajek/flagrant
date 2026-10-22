// Serveur de Flagrant : les fonctions /api, plus les fichiers du site si STATIC_DIR est défini (production).
// Dev : pnpm dev:api (Vite relaie /api ici). Prod : image Docker sur hungry-morse, derrière Traefik.
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";

const PORT = Number(process.env.PORT) || 8787;
const STATIC = process.env.STATIC_DIR && resolve(process.env.STATIC_DIR);
const KEEP = ["authorization", "content-type", "origin", "x-forwarded-for"];
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

async function serveApi(req, res, url) {
  const name = url.pathname.match(/^\/api\/([a-z]+)$/)?.[1];
  const handler = name && (await import(`../api/${name}.js`).catch(() => null))?.[req.method];
  if (!handler) return res.writeHead(404).end();
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const headers = Object.fromEntries(KEEP.filter((h) => req.headers[h]).map((h) => [h, req.headers[h]]));
  const response = await handler(
    new Request(url, { method: req.method, headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks) })
  );
  res.writeHead(response.status, Object.fromEntries(response.headers)).end(Buffer.from(await response.arrayBuffer()));
}

async function serveStatic(req, res, url) {
  if (!["GET", "HEAD"].includes(req.method)) return res.writeHead(405).end();
  let path = resolve(STATIC, `.${decodeURIComponent(url.pathname)}`);
  if (path !== STATIC && !path.startsWith(STATIC + sep)) return res.writeHead(403).end(); // pas de ../ hors du site
  let info = await stat(path).catch(() => null);
  if (info?.isDirectory()) info = await stat((path = join(path, "index.html"))).catch(() => null);
  if (!info) return res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("Introuvable");
  res.writeHead(200, {
    "content-type": TYPES[extname(path)] ?? "application/octet-stream",
    "content-length": info.size,
    // Fichiers versionnés par Vite : cache long. Le reste (index.html, données) : toujours revalidé.
    "cache-control": url.pathname.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache",
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
  });
  if (req.method === "HEAD") return res.end();
  createReadStream(path).pipe(res);
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (url.pathname.startsWith("/api/")) await serveApi(req, res, url);
    else if (STATIC) await serveStatic(req, res, url);
    else res.writeHead(404).end();
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.writeHead(e instanceof URIError ? 400 : 500).end();
  }
}).listen(PORT, () => console.log(`Geoflash : http://localhost:${PORT}${STATIC ? "" : "/api"}`));
