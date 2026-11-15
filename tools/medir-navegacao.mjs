// Mede o custo de runtime da casca v2: navegação entre telas, tarefas longas
// e frames durante o scroll — com e sem animação, com e sem o vidro (blur).
// Uso: node medir-navegacao.mjs <baseUrl>
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://localhost:3005";

const USUARIO = {
  id: "u-demo",
  email: "recepcao@clinica-a.test",
  name: "Daniel Moura",
  role: "ADMIN",
  tenant: { id: "t-demo", name: "Clinica A", slug: "clinica-a", plan: { id: "p1", name: "Pro" } },
  config: { tenant: { maxStudents: 100, enableCertificates: true, enableLiveClasses: true, contentAccess: "full" } },
  token: "tok-demo",
  loginTime: new Date().toISOString(),
};
const ACOES = ["VIEW", "CREATE", "UPDATE", "DELETE", "MANAGE", "EXPORT"];
const RECURSOS = [
  "dashboard", "pacientes", "agenda", "prontuarios", "sessoes", "anamnese",
  "atividades", "curriculum", "avaliacoes", "evolucao", "relatorios", "usuarios",
  "salas", "convenios", "terapeutas", "procedimentos", "check-in", "filiais",
  "glosas", "permissoes", "taxa-ocupacao", "historico-atendimentos",
];
const json = (body) => ({ status: 200, contentType: "application/json", body: JSON.stringify(body) });

const ROTAS = [
  ["Dashboard", "/dashboard"],
  ["Pacientes", "/pacientes"],
  ["Usuários", "/usuarios"],
  ["Salas", "/salas"],
  ["Convênios", "/convenios"],
];

const mediana = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

const COM_GPU = process.argv.includes("--gpu");
// Headless não tem GPU: o blur vai para a CPU e o custo aparece inflado. Com
// `--gpu` a janela abre de verdade (fora da tela) e o compositor é o real.
const navegador = await chromium.launch({
  headless: !COM_GPU,
  args: COM_GPU
    ? ["--window-position=-2400,0", "--force-device-scale-factor=1"]
    : ["--force-device-scale-factor=1"],
});

async function sessao({ reducedMotion = "no-preference", semVidro = false }) {
  const ctx = await navegador.newContext({
    viewport: { width: 1600, height: 1000 },
    reducedMotion,
  });
  await ctx.addCookies([
    { name: "caleidoscopio_token", value: USUARIO.token, domain: "localhost", path: "/" },
  ]);
  await ctx.addInitScript((u) => {
    localStorage.setItem("edu_auth_user", JSON.stringify(u));
    localStorage.setItem("edu_auth_token", u.token);
  }, USUARIO);

  // catch-all primeiro (no Playwright a rota registrada depois vence)
  await ctx.route("**/api/**", (r) => r.fulfill(json({ success: true, data: [] })));
  await ctx.route("**/api/products/sso/**", (r) => r.fulfill(json({ valid: true, user: USUARIO })));
  await ctx.route("**/api/usuario-roles/**/permissoes", (r) =>
    r.fulfill(json({
      roleName: "Administrador", roleId: "r-admin", source: "rbac",
      permissions: Object.fromEntries(RECURSOS.map((s) => [s, ACOES])),
    }))
  );
  await ctx.route("**/api/me/filial**", (r) =>
    r.fulfill(json({ success: true, data: { filialId: "f1", nome: "Clinica A" } }))
  );
  // O catch-all devolve `data: []`, e o dashboard lê `data.pendentes` —
  // sem estas duas a tela quebra por culpa do mock, não do código.
  await ctx.route("**/api/dashboard/sessoes-recentes", (r) =>
    r.fulfill(json({ success: true, data: { pendentes: [], recentes: [] } }))
  );
  await ctx.route("**/api/dashboard/stats", (r) =>
    r.fulfill(json({
      success: true,
      data: {
        totalPacientes: 128, sessoesEmAndamento: 2, sessoesRealizadasMes: 342,
        anamnesesPendentes: 6, atividadesCadastradas: 87, totalTerapeutas: 14,
      },
    }))
  );

  const p = await ctx.newPage();

  // Observador de tarefas longas (>50ms bloqueando a thread principal)
  await p.addInitScript(() => {
    window.__longas = [];
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window.__longas.push(Math.round(e.duration));
      }).observe({ entryTypes: ["longtask"] });
    } catch { /* navegador sem suporte */ }
  });

  if (semVidro) {
    await p.addInitScript((alvoCss) => {
      const css = document.createElement("style");
      css.textContent = `${alvoCss}{backdrop-filter:none !important;-webkit-backdrop-filter:none !important}`;
      document.addEventListener("DOMContentLoaded", () => document.head.appendChild(css));
    }, semVidro === true ? "*" : semVidro);
  }

  await p.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(9000);
  const diag = await p.evaluate(() => ({
    url: location.pathname,
    h1: document.querySelector("h1")?.textContent?.trim(),
    links: [...document.querySelectorAll("aside a")].map((a) => a.getAttribute("href")).slice(0, 8),
    texto: document.body.innerText.replace(/\s+/g, " ").slice(0, 200),
  }));
  console.log("   diag:", JSON.stringify(diag));
  return { ctx, p };
}

/** Navegação client-side: clique no item da sidebar até o <h1> da nova tela. */
async function medirNavegacao(p, alvo, href) {
  void alvo;
  const t0 = await p.evaluate(() => performance.now());
  await p.click(`aside a[href="${href}"]`);
  // Pronto = a rota trocou e o <h1> da nova tela já está pintado.
  await p.waitForFunction(
    (h) => location.pathname === h && (document.querySelector("h1")?.textContent?.trim() || "") !== "",
    href,
    { timeout: 20000 }
  );
  return Math.round(await p.evaluate((t) => performance.now() - t, t0));
}

/** Frames durante um scroll programático do conteúdo. */
async function medirScroll(p) {
  return p.evaluate(async () => {
    const quadros = [];
    let anterior = performance.now();
    let parar = false;
    const laco = () => {
      const agora = performance.now();
      quadros.push(agora - anterior);
      anterior = agora;
      if (!parar) requestAnimationFrame(laco);
    };
    requestAnimationFrame(laco);
    for (let i = 0; i < 60; i++) {
      window.scrollBy(0, 24);
      await new Promise((r) => setTimeout(r, 16));
    }
    parar = true;
    await new Promise((r) => setTimeout(r, 100));
    const uteis = quadros.slice(2);
    const ruins = uteis.filter((q) => q > 32).length; // abaixo de ~30 fps
    const ordenado = [...uteis].sort((a, b) => a - b);
    return {
      quadros: uteis.length,
      p50: Math.round(ordenado[Math.floor(ordenado.length * 0.5)] * 10) / 10,
      p95: Math.round(ordenado[Math.floor(ordenado.length * 0.95)] * 10) / 10,
      ruins,
    };
  });
}

async function rodada(nome, opcoes) {
  const { ctx, p } = await sessao(opcoes);
  const tempos = {};
  // Volta 0 é aquecimento e vai fora da conta: na primeira visita o servidor
  // ainda monta o payload da rota, e isso não é custo de design.
  for (let volta = 0; volta < 4; volta++) {
    for (const [titulo, href] of ROTAS) {
      if (titulo === "Dashboard" && volta === 0) continue;
      const ms = await medirNavegacao(p, titulo, href);
      if (volta > 0) (tempos[titulo] ??= []).push(ms);
      await p.waitForTimeout(400);
    }
  }
  const scroll = await medirScroll(p);
  const longas = await p.evaluate(() => window.__longas || []);

  console.log(`\n── ${nome}`);
  for (const [t, v] of Object.entries(tempos)) {
    console.log(`   ${t.padEnd(10)} mediana ${String(mediana(v)).padStart(4)} ms   (${v.join(", ")})`);
  }
  console.log(
    `   scroll: p50 ${scroll.p50} ms · p95 ${scroll.p95} ms · ${scroll.ruins}/${scroll.quadros} quadros acima de 32 ms`
  );
  console.log(
    `   tarefas longas: ${longas.length}${longas.length ? ` (maior ${Math.max(...longas)} ms)` : ""}`
  );
  await ctx.close();
  return { tempos, scroll, longas };
}

await rodada("como está (animação + vidro)", {});
if (!COM_GPU) {
  await rodada("sem animação (prefers-reduced-motion)", { reducedMotion: "reduce" });
  await rodada("sem vidro nenhum", { semVidro: true });
  await rodada("sem vidro só na sidebar e topbar (.glass)", { semVidro: ".glass" });
}
await rodada("sem vidro só na área de conteúdo (main)", { semVidro: "main" });

await navegador.close();
