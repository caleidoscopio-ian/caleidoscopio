// Servidor estático só para ler a captura do v2. A pasta vem por argumento —
// nada é executado a partir de dentro dela.
//
// Dois ajustes sobre um servidor comum:
//   1. `/salas/mapa-ocupacao` pede `_next/...` relativo, que resolveria para
//      `/salas/_next/...`; qualquer `_next/` ou `clone/` cai na cópia da raiz;
//   2. rota sem extensão tenta `<rota>.html`, como o Next faria.

import { createServer } from "http";
import { readFile, stat } from "fs/promises";
import { join, extname, resolve, sep } from "path";

const RAIZ = resolve(process.argv[2]);
const PORTA = Number(process.argv[3] || 4173);

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".woff2": "font/woff2",
};

async function existe(p) {
  try {
    const s = await stat(p);
    return s.isFile();
  } catch {
    return false;
  }
}

async function resolverCaminho(url) {
  const limpo = decodeURIComponent(url.split("?")[0]).replace(/^\/+/, "");
  const candidatos = [limpo, `${limpo}.html`, limpo === "" ? "dashboard.html" : null];

  // `_next/` ou `clone/` pedido de dentro de uma subpasta
  const i = limpo.indexOf("_next/");
  if (i > 0) candidatos.push(limpo.slice(i));
  const j = limpo.indexOf("clone/");
  if (j > 0) candidatos.push(limpo.slice(j));

  for (const c of candidatos) {
    if (!c) continue;
    const alvo = join(RAIZ, c);
    // Nada de sair da raiz
    if (!alvo.startsWith(RAIZ + sep) && alvo !== RAIZ) continue;
    if (await existe(alvo)) return alvo;
  }
  return null;
}

createServer(async (req, res) => {
  const alvo = await resolverCaminho(req.url);
  if (!alvo) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 " + req.url);
    return;
  }
  const corpo = await readFile(alvo);
  res.writeHead(200, {
    "Content-Type": TIPOS[extname(alvo)] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  res.end(corpo);
}).listen(PORTA, () => console.log(`clone v2 em http://localhost:${PORTA} (raiz: ${RAIZ})`));
