/**
 * Guarda de isolamento multi-tenant.
 *
 * Varre as API routes procurando queries Prisma em models com escopo de tenant
 * que não filtram por tenant nem validam a posse do registro. Nasceu de um
 * vazamento real: /api/dashboard/agenda-hoje extraía `tenantId` e esquecia de
 * usá-lo no `where`, devolvendo a agenda de todas as clínicas para qualquer
 * admin. TypeScript não pega esse tipo de erro, e code review também não.
 *
 *   node tools/verificar-isolamento-tenant.mjs           # relatório
 *   node tools/verificar-isolamento-tenant.mjs --ci      # sai 1 se houver ALTO
 *
 * Para liberar um caso já revisado, anote na linha anterior à query:
 *   // tenant-ok: <motivo>
 */

import fs from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(process.cwd(), "src/app/api");
const CI = process.argv.includes("--ci");

// Operações que leem ou alteram vários registros de uma vez
const OPS_LISTA = ["findMany", "count", "aggregate", "groupBy", "updateMany", "deleteMany"];
const OPS_UNICO = ["findUnique", "findFirst", "update", "delete", "upsert"];

// Models com escopo de tenant: os que têm tenantId próprio e os que herdam por relação
const COM_TENANT_ID = [
  "avaliacao", "convenio", "convenioAnexo", "convenioHistorico", "convenioTabela",
  "demonstrativoGuia", "demonstrativoImportacao", "especialidadeCustomizada", "filial",
  "glosa", "glosaHistorico", "gradeAtendimento", "pacote", "pacoteHistorico",
  "procedimento", "regraRepasse", "regraRepasseHistorico", "role", "sala", "usuarioRole",
  "usuarioRoleHistorico", "anamnese", "anexoPaciente", "atividade", "curriculum",
  "diagnostico", "encaminhamento", "paciente", "prescricaoMedica", "profissional",
  "relatorioClinico",
];
const HERDAM_TENANT = [
  "agendamento", "prontuario", "sessaoAtividade", "sessaoCurriculum", "sessaoAvaliacao",
  "pacienteConvenio", "pacienteResponsavel", "pacienteAvaliacao", "pacienteCurriculum",
  "pacienteAtividadeClone", "progressoAtividade", "pacienteAtividade", "atividadeInstrucao",
  "atividadePontuacao", "atividadeCloneInstrucao", "atividadeClonePontuacao",
  "atividadeFase", "atividadeFaseHistorico", "instrucaoFase", "instrucaoFaseHistorico",
  "instrucaoPontuacao", "respostaTarefa", "sessaoCurriculumInstrucao",
];
const MODELS = new Set([...COM_TENANT_ID, ...HERDAM_TENANT]);

// Sinais de que a query está escopada
const SINAIS_ESCOPO = [
  "tenantId",
  "tenant:",
  "cloneEhDoTenant",
  "instrucaoEhDoTenant",
  "filtroCloneDoTenant",
  "filtroInstrucaoDoTenant",
  "resolverProfissionalIdsDaFilial",
];

function casar(texto, inicio, abre, fecha) {
  let profundidade = 0;
  for (let i = inicio; i < texto.length; i++) {
    if (texto[i] === abre) profundidade++;
    else if (texto[i] === fecha) {
      profundidade--;
      if (profundidade === 0) return i;
    }
  }
  return -1;
}

/** Extrai o texto do `where`, resolvendo quando ele for uma variável do arquivo */
function extrairWhere(args, conteudoArquivo) {
  const m = /\bwhere\s*(:|,|\})/.exec(args);
  if (!m) return null;

  // forma abreviada: `where,` ou `where }`
  if (m[1] !== ":") return resolverVariavel("where", conteudoArquivo);

  const depois = args.slice(m.index + m[0].length - 1 + 1);
  const abre = depois.indexOf("{");
  const virgula = depois.search(/[,}]/);

  // where: algumaVariavel
  if (abre === -1 || (virgula !== -1 && virgula < abre)) {
    const nome = depois.slice(0, virgula === -1 ? undefined : virgula).trim();
    return /^[A-Za-z_$][\w$]*$/.test(nome) ? resolverVariavel(nome, conteudoArquivo) : depois;
  }

  const ini = args.indexOf("{", m.index);
  const fim = casar(args, ini, "{", "}");
  return fim === -1 ? args.slice(ini) : args.slice(ini, fim + 1);
}

/** Junta a declaração da variável com todas as atribuições a ela no arquivo */
function resolverVariavel(nome, conteudo, vistos = new Set()) {
  if (vistos.has(nome)) return "";
  vistos.add(nome);
  let texto = "";
  const decl = new RegExp(`(?:const|let|var)\\s+${nome}\\s*(?::[^=]+)?=\\s*`, "g");
  let m;
  while ((m = decl.exec(conteudo))) {
    const ini = conteudo.indexOf("{", m.index);
    if (ini !== -1 && ini - m.index < 80) {
      const fim = casar(conteudo, ini, "{", "}");
      if (fim !== -1) texto += conteudo.slice(ini, fim + 1);
    }
  }
  // atribuições posteriores: where.algo = ... / Object.assign(where, ...)
  const atrib = new RegExp(`${nome}\\.\\w+\\s*=[^;]+;`, "g");
  while ((m = atrib.exec(conteudo))) texto += m[0];

  // segue spreads: const whereAvaliacao = { ...whereAtividade }
  for (const sp of texto.matchAll(/\.\.\.\s*([A-Za-z_$][\w$]*)/g)) {
    texto += resolverVariavel(sp[1], conteudo, vistos);
  }
  return texto;
}

function analisarArquivo(caminho) {
  const conteudo = fs.readFileSync(caminho, "utf8");
  const achados = [];

  const chamada = /(?:prisma|tx)\.(\w+)\.(\w+)\(/g;
  let m;
  while ((m = chamada.exec(conteudo))) {
    const [, modelo, op] = m;
    if (!MODELS.has(modelo)) continue;
    if (![...OPS_LISTA, ...OPS_UNICO].includes(op)) continue;

    const linha = conteudo.slice(0, m.index).split("\n").length;
    const anterior = conteudo.split("\n")[linha - 2] ?? "";
    if (anterior.includes("tenant-ok:")) continue;

    const abre = conteudo.indexOf("(", m.index + m[0].length - 1);
    const fecha = casar(conteudo, abre, "(", ")");
    const args = fecha === -1 ? "" : conteudo.slice(abre + 1, fecha);

    const where = extrairWhere(args, conteudo) ?? "";
    const escopado = SINAIS_ESCOPO.some((s) => where.includes(s));
    if (escopado) continue;

    // O arquivo valida a posse em algum ponto? (ex.: cloneEhDoTenant antes da query)
    const arquivoValida = SINAIS_ESCOPO.some((s) => s !== "tenantId" && conteudo.includes(s));

    // Filtrar por uma FK já restringe a um tenant: salaId, profissionalId ou
    // atividadeCloneId são UUIDs que pertencem a uma única clínica. O risco
    // grave é a query de lista SEM nenhuma âncora — foi o caso do dashboard,
    // que filtrava só por data e devolvia a agenda de todas as clínicas.
    // Spread condicional — ...(isAdmin ? {} : { ... }) — nao ancora nada: num
    // dos ramos ele some. Foi assim que o vazamento do dashboard passou,
    // com `usuarioId` presente so no ramo de nao-admin.
    const whereSempre = where.replace(/\.\.\.\([^)]*\)/g, "");
    const temAncora =
      /\b(id|\w+Id)\s*:/.test(whereSempre) || /\{\s*\w+Id\b/.test(whereSempre);

    let nivel;
    if (OPS_LISTA.includes(op) && !temAncora) nivel = "ALTO";
    else if (arquivoValida || !temAncora) nivel = "OK-VALIDADO";
    else nivel = "MEDIO";

    if (nivel === "OK-VALIDADO") continue;
    achados.push({ caminho, linha, modelo, op, nivel, where: where.replace(/\s+/g, " ").slice(0, 70) });
  }
  return achados;
}

function varrer(dir) {
  const saida = [];
  for (const nome of fs.readdirSync(dir)) {
    const p = path.join(dir, nome);
    const st = fs.statSync(p);
    if (st.isDirectory()) saida.push(...varrer(p));
    else if (nome === "route.ts") saida.push(...analisarArquivo(p));
  }
  return saida;
}

const achados = varrer(RAIZ);
const altos = achados.filter((a) => a.nivel === "ALTO");
const medios = achados.filter((a) => a.nivel === "MEDIO");

const rel = (p) => path.relative(process.cwd(), p).replace(/\\/g, "/");

console.log("\nGuarda de isolamento multi-tenant\n" + "=".repeat(60));

if (altos.length) {
  console.log(`\nALTO — lista sem escopo de tenant (${altos.length}):`);
  for (const a of altos) {
    console.log(`  ${rel(a.caminho)}:${a.linha}`);
    console.log(`     ${a.modelo}.${a.op}  where: ${a.where || "(ausente)"}`);
  }
}

if (medios.length) {
  console.log(`\nMEDIO — acesso por id sem validação de posse (${medios.length}):`);
  for (const a of medios) {
    console.log(`  ${rel(a.caminho)}:${a.linha}  ${a.modelo}.${a.op}`);
  }
}

if (!achados.length) console.log("\nNenhum ponto sem escopo encontrado.");

console.log(`\nresumo: ${altos.length} ALTO · ${medios.length} MEDIO`);
if (CI && altos.length) {
  console.log("\nfalhando: existe query de lista sem escopo de tenant.");
  process.exit(1);
}
