/**
 * Petit serveur statique (sans dépendance) pour essayer la version installable (PWA) :
 * `ng serve` n'active pas le service worker, il faut servir le build de production.
 *
 *   npm run start:pwa        → build de production puis http://localhost:4300 (et le réseau local)
 *
 * Les routes Angular (/sessions, /calendar…) renvoient index.html, comme un vrai hébergement.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '../dist/gestion-seances-sport/browser');
const PORT = Number(process.env.PORT ?? 4300);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};

async function fileFor(urlPath) {
  // normalize + vérification du préfixe : impossible de sortir du dossier du build (« ../ »).
  const candidate = normalize(join(ROOT, decodeURIComponent(urlPath.split('?')[0])));
  if (!candidate.startsWith(ROOT)) return null;
  try {
    return (await stat(candidate)).isFile() ? candidate : null;
  } catch {
    return null;
  }
}

createServer(async (request, response) => {
  const path = (await fileFor(request.url ?? '/')) ?? join(ROOT, 'index.html');
  try {
    const body = await readFile(path);
    // index.html et le service worker ne doivent jamais être servis depuis un cache périmé.
    const noCache = path.endsWith('index.html') || path.endsWith('ngsw-worker.js') || path.endsWith('ngsw.json');
    response.writeHead(200, { 'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream', 'Cache-Control': noCache ? 'no-cache' : 'public, max-age=31536000, immutable' });
    response.end(body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Build introuvable : lancez d’abord « npm run build ».');
  }
}).listen(PORT, '0.0.0.0', () => console.log(`SportPlan (version installable) : http://localhost:${PORT}`));
