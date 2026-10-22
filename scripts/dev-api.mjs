// Sert les fonctions de /api en local (en ligne, c'est Vercel qui les exécute). Vite y relaie /api.
// Usage : pnpm dev:api (variables dans .env.local : MONGODB_URI, APP_URL…)
import { createServer } from "node:http";

const PORT = 8787;
const KEEP = ["authorization", "content-type", "origin", "x-forwarded-for"];

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
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
}).listen(PORT, () => console.log(`API locale : http://localhost:${PORT}/api`));
