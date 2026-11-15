// Captura todas as páginas do clone do v2, claro e escuro, e relata erro de
// console por página (para saber quais realmente renderizaram).
import { chromium } from "playwright";
import { readdirSync, statSync } from "fs";
import { join, relative } from "path";

const RAIZ = process.argv[2];
const SAIDA = process.argv[3];
const PORTA = process.argv[4] || 4173;
const SO = process.argv[5] || null;

const paginas = [];
(function andar(dir) {
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) {
      if (nome !== "_next" && nome !== "clone") andar(p);
    } else if (nome.endsWith(".html")) {
      paginas.push(relative(RAIZ, p).replace(/\\/g, "/"));
    }
  }
})(RAIZ);
paginas.sort();

const alvo = SO ? paginas.filter((p) => p.includes(SO)) : paginas;
const b = await chromium.launch();

for (const tema of ["light", "dark"]) {
  const c = await b.newContext({
    viewport: { width: 1440, height: 1000 },
    colorScheme: tema,
    deviceScaleFactor: 1,
  });
  await c.addInitScript(
    ([t]) => {
      try {
        localStorage.setItem("theme", t);
        localStorage.setItem("caleidoscopio-tema", t);
      } catch {}
    },
    [tema]
  );
  for (const pag of alvo) {
    const nome = pag.replace(/\.html$/, "").replace(/\//g, "__");
    const p = await c.newPage();
    const erros = [];
    p.on("pageerror", (e) => erros.push(String(e).slice(0, 120)));
    try {
      // `networkidle` não assenta: o interceptor responde com latência e as
      // telas repetem consultas. `domcontentloaded` + espera fixa basta.
      await p.goto(`http://localhost:${PORTA}/${pag}`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await p.waitForTimeout(3500);
      await p.screenshot({ path: `${SAIDA}/${tema}/${nome}.png`, fullPage: true });
      const texto = (await p.locator("body").innerText()).trim();
      console.log(
        `${tema}/${nome}`.padEnd(42),
        `${texto.length} chars`.padEnd(13),
        erros.length ? `ERRO: ${erros[0]}` : "ok"
      );
    } catch (e) {
      console.log(`${tema}/${nome}`.padEnd(42), "FALHOU", String(e).slice(0, 90));
    }
    await p.close();
  }
  await c.close();
}
await b.close();
