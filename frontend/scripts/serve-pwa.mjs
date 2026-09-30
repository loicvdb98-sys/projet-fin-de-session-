/**
 * Petit serveur statique (sans dépendance) pour essayer la version installable (PWA) :
 * `ng serve` n'active pas le service worker, il faut servir le build de production.
 *
 *   npm run start:pwa        → build de production puis http://localhost:4300 (et le réseau local)
 *
 * Les routes Angular (/sessions, /calendar…) renvoient index.html, comme un vrai hébergement.
 * Chaque réponse porte des en-têtes de sécurité, dont une politique de contenu (CSP) qui
 * n'autorise que les scripts du build : un script injecté dans la page ne s'exécuterait pas.
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

/**
 * En-têtes de sécurité. L'API est appelée sur le port 8000 du même hôte (voir api.config.ts) :
 * c'est la seule destination autorisée pour les requêtes, en plus du site lui-même. Les styles
 * en ligne restent permis (Angular et Material en injectent) ; les scripts en ligne, non.
 */
function securityHeaders(request) {
  // Nom d'hôte seul (sans port), et seulement s'il est bien formé : un en-tête Host fantaisiste
  // ne doit pas pouvoir ajouter ses propres directives à la politique.
  const name = (request.headers.host ?? '').replace(/:\d+$/, '');
  const host = /^[a-z0-9.-]+$/i.test(name) ? name : 'localhost';
  const api = `http://${host}:8000`;
  return {
    'Content-Security-Policy': [
      "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'", "img-src 'self' data:",
      "font-src 'self' data:", `connect-src 'self' ${api}`, "manifest-src 'self'", "worker-src 'self'",
      "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'",
    ].join('; '),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };
}

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
    response.writeHead(200, { ...securityHeaders(request), 'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream', 'Cache-Control': noCache ? 'no-cache' : 'public, max-age=31536000, immutable' });
    response.end(body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Build introuvable : lancez d’abord « npm run build ».');
  }
}).listen(PORT, '0.0.0.0', () => console.log(`SportPlan (version installable) : http://localhost:${PORT}`));
