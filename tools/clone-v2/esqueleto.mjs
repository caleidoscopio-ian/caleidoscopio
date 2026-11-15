// Imprime o esqueleto do DOM de uma página capturada: tag + classes, com
// profundidade limitada. Serve para comparar composição sem ler 60 KB de HTML.
import { chromium } from "playwright";

const URL_ALVO = process.argv[2];
const PROF = Number(process.argv[3] || 6);
const SELETOR = process.argv[4] || "body";

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
await p.goto(URL_ALVO, { waitUntil: "domcontentloaded", timeout: 30000 });
await p.waitForTimeout(4000);

const arvore = await p.evaluate(
  ([prof, sel]) => {
    const linhas = [];
    const andar = (el, nivel) => {
      if (nivel > prof) return;
      const cls = (el.getAttribute("class") || "").trim();
      const texto = [...el.childNodes]
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent.trim())
        .join(" ")
        .slice(0, 48);
      linhas.push(
        "  ".repeat(nivel) +
          el.tagName.toLowerCase() +
          (cls ? " ." + cls.split(/\s+/).join(" .") : "") +
          (texto ? `   «${texto}»` : "")
      );
      for (const f of el.children) andar(f, nivel + 1);
    };
    const raiz = document.querySelector(sel);
    if (raiz) andar(raiz, 0);
    return linhas.join("\n");
  },
  [PROF, SELETOR]
);

console.log(arvore);
await b.close();
