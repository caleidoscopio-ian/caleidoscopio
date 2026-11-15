// Abre o dashboard do nosso sistema com SSO, RBAC e as três rotas de dados
// interceptados — é a única forma de ver a tela sem o Sistema 1 no ar.
// Uso: node ver-dashboard.mjs <baseUrl> <pastaSaida>
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://localhost:3005";
const SAIDA = process.argv[3];

const USUARIO = {
  id: "u-demo",
  email: "recepcao@clinica-a.test",
  name: "Daniel Moura",
  role: "ADMIN",
  tenant: {
    id: "t-demo",
    name: "Clinica A",
    slug: "clinica-a",
    plan: { id: "p1", name: "Pro" },
  },
  config: {
    tenant: {
      maxStudents: 100,
      enableCertificates: true,
      enableLiveClasses: true,
      contentAccess: "full",
    },
  },
  token: "tok-demo",
  loginTime: new Date().toISOString(),
};

const ACOES = ["VIEW", "CREATE", "UPDATE", "DELETE", "MANAGE", "EXPORT"];
const RECURSOS = [
  "dashboard", "pacientes", "agenda", "prontuarios", "sessoes", "anamnese",
  "atividades", "curriculum", "avaliacoes", "evolucao", "relatorios",
  "usuarios", "salas", "convenios", "terapeutas", "procedimentos",
  "check-in", "filiais", "glosas", "permissoes", "taxa-ocupacao",
  "historico-atendimentos",
];

const hoje = (h, m) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};
const diasAtras = (n, h) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(h, 12, 0, 0);
  return d.toISOString();
};

const AGENDA = [
  ["Heitor Duarte Queiroz", "Carla Almeida Cardoso", "Sala 10", 9, 0, 50, "EM_ATENDIMENTO"],
  ["Arthur Almeida Teixeira", "Juliana Moraes Pires", "Sala 2", 10, 0, 50, "CONFIRMADO"],
  ["Miguel Esteves Siqueira", "Carla Almeida Cardoso", null, 11, 0, 40, "AGENDADO"],
  ["Laura Beatriz Nogueira", "Rafael Pinho Brandão", "Sala 7", 13, 30, 50, "AGENDADO"],
  ["Benício Rocha Vasconcelos", "Juliana Moraes Pires", "Sala 3", 14, 20, 50, "ATENDIDO"],
  ["Cecília Martins Albuquerque", "Rafael Pinho Brandão", "Sala 1", 15, 10, 30, "FALTOU"],
  ["Theo Nascimento Barbosa", "Carla Almeida Cardoso", "Sala 10", 16, 0, 50, "CANCELADO"],
].map(([paciente, prof, sala, h, m, dur, status], i) => ({
  id: `ag-${i}`,
  data_hora: hoje(h, m),
  duracao_minutos: dur,
  sala: sala ?? undefined,
  status,
  observacoes: i === 1 ? "Responsável pediu para avisar 10 min antes do fim." : undefined,
  paciente: { id: `p-${i}`, nome: paciente },
  profissional: { id: `t-${i}`, nome: prof },
}));

const PENDENTES = [
  ["Arthur Almeida Teixeira", "Currículo Inicial", 0, 14],
  ["Miguel Esteves Siqueira", "Comunicação Funcional", 1, 7],
].map(([nome, curr, d, h], i) => ({
  id: `s-pend-${i}`,
  iniciada_em: diasAtras(d, h),
  status: "EM_ANDAMENTO",
  paciente: { id: `p-${i}`, nome },
  curriculum: { nome: curr },
  avaliacoes: [],
}));

const RECENTES = [
  ["Laura Beatriz Nogueira", "Habilidades Sociais", 1, [4, 5, 5]],
  ["Benício Rocha Vasconcelos", "Currículo Inicial", 2, [3, 4, 4]],
  ["Cecília Martins Albuquerque", "Autonomia e Rotina", 3, [5, 5, 4]],
].map(([nome, curr, d, notas], i) => ({
  id: `s-rec-${i}`,
  iniciada_em: diasAtras(d, 9),
  finalizada_em: diasAtras(d, 10),
  status: "FINALIZADA",
  paciente: { id: `pr-${i}`, nome },
  curriculum: { nome: curr },
  avaliacoes: notas.map((nota) => ({ nota })),
}));

const json = (body) => ({
  status: 200,
  contentType: "application/json",
  body: JSON.stringify(body),
});

const navegador = await chromium.launch();

async function capturar(tema, arquivo) {
  const ctx = await navegador.newContext({
    viewport: { width: 1600, height: 1200 },
    deviceScaleFactor: 1,
    colorScheme: tema,
  });

  // O middleware exige o cookie antes de qualquer rota protegida
  await ctx.addCookies([
    { name: "caleidoscopio_token", value: USUARIO.token, domain: "localhost", path: "/" },
  ]);

  await ctx.addInitScript(
    ([u, t]) => {
      localStorage.setItem("edu_auth_user", JSON.stringify(u));
      localStorage.setItem("edu_auth_token", t);
      localStorage.setItem("caleidoscopio-tema", u.__tema);
    },
    [{ ...USUARIO, __tema: tema }, USUARIO.token]
  );

  // Catch-all primeiro: no Playwright a rota registrada DEPOIS vence.
  await ctx.route("**/api/**", (r) => r.fulfill(json({ success: true, data: [] })));

  // SSO do Sistema 1
  await ctx.route("**/api/products/sso/**", (r) => r.fulfill(json({ valid: true, user: USUARIO })));
  // RBAC
  await ctx.route("**/api/usuario-roles/**/permissoes", (r) =>
    r.fulfill(
      json({
        roleName: "Administrador",
        roleId: "r-admin",
        source: "rbac",
        permissions: Object.fromEntries(RECURSOS.map((s) => [s, ACOES])),
      })
    )
  );
  // Dados do dashboard
  await ctx.route("**/api/dashboard/stats", (r) =>
    r.fulfill(
      json({
        success: true,
        data: {
          totalPacientes: 128,
          sessoesEmAndamento: PENDENTES.length,
          sessoesRealizadasMes: 342,
          anamnesesPendentes: 6,
          atividadesCadastradas: 87,
          sessõesHoje: AGENDA.length,
          totalTerapeutas: 14,
        },
      })
    )
  );
  await ctx.route("**/api/dashboard/sessoes-recentes", (r) =>
    r.fulfill(json({ success: true, data: { pendentes: PENDENTES, recentes: RECENTES } }))
  );
  await ctx.route("**/api/dashboard/agenda-hoje", (r) =>
    r.fulfill(json({ success: true, data: AGENDA }))
  );
  // Casca. Qualquer outra rota de API responde vazio com 200: um 401 solto
  // dispara o auto-logout e a tela volta para o login.
  await ctx.route("**/api/me/filial**", (r) =>
    r.fulfill(json({ success: true, data: { filialId: "f1", nome: "Clinica A — Matriz" } }))
  );
  await ctx.route("**/api/filiais**", (r) =>
    r.fulfill(json({ success: true, data: [{ id: "f1", nome: "Clinica A — Matriz", ativa: true }] }))
  );

  const p = await ctx.newPage();
  const erros = [];
  p.on("console", (m) => m.type() === "error" && erros.push(m.text().slice(0, 160)));
  p.on("pageerror", (e) => erros.push("pageerror: " + String(e).slice(0, 160)));
  p.on("response", (r) => {
    if (r.status() >= 400) erros.push(`${r.status()} ${r.url().slice(0, 120)}`);
  });

  await p.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(6000);

  const titulo = await p.locator("h1").first().textContent().catch(() => null);
  const paineis = await p.locator("section.rounded-3xl, section[class*='rounded-[1.75rem]']").count();
  const linhas = await p.locator("ol > li").count();
  await p.screenshot({ path: `${SAIDA}/dashboard-${tema}.png`, fullPage: true });

  console.log(`${tema}: h1=${JSON.stringify(titulo)} paineis=${paineis} linhas=${linhas}`);
  if (erros.length) console.log(`${tema}: console →`, erros.slice(0, 6).join(" | "));
  await ctx.close();
  void arquivo;
}

await capturar("light");
await capturar("dark");
await navegador.close();
