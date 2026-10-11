/**
 * Saneamento de dados da Clinica A — somente deste tenant.
 *
 * Mapeamento e decisões em `.claude/plans/CLINICA-A-SANEAMENTO-DADOS.md`.
 *
 * Garantias:
 *   - TODA query é escopada no tenant da Clinica A. Outras clínicas não são tocadas.
 *   - NENHUM delete. Só `update` e `create`.
 *   - Simulação por padrão; grava só com --aplicar.
 *   - Contagem de todas as tabelas antes e depois, incluindo as dos outros
 *     tenants, para provar que o escopo foi respeitado.
 *
 *   node tools/sanear-clinica-a.mjs            # simulação
 *   node tools/sanear-clinica-a.mjs --aplicar  # grava
 */

process.loadEnvFile(".env");
const { PrismaClient, Prisma } = await import("@prisma/client");

const APLICAR = process.argv.includes("--aplicar");
const T = "cmo0h6yky000txal4htlrr3h2"; // Clinica A
const prisma = new PrismaClient();

// ───────── valores escolhidos ─────────
const PRECOS = {
  // procedimento → { convenio: valor }   (faixa pedida: 150–200)
  "Procedimento 2": { unimed: 180 },
  "Procedimento Inicial": { unimed: 160, HAPVIDA: 190 },
  teste: { unimed: 150, HAPVIDA: 170 },
};
const PROC_TESTE = { codigo: "22.03.03.03-01", valor: 150, valor_particular: 180 };
const REPASSE_PCT = 15;
const REPASSE_DESDE = new Date("2026-01-01T00:00:00.000Z");
const MOTIVO_FALTA = "Desistiu de última hora";
const VALOR_PARTICULAR_PADRAO = 200;
const NOME_LIXO = "312312dwsqdas";
const NOME_LIXO_NOVO = "Paciente Teste (inativo)";

const log = [];
const registrar = (s) => {
  log.push(s);
  console.log(s);
};
const secao = (s) => registrar("\n" + "─".repeat(74) + "\n" + s + "\n" + "─".repeat(74));

async function comRetry(fn, n = 4) {
  let ultimo;
  for (let i = 0; i < n; i++) {
    try {
      return await fn();
    } catch (e) {
      ultimo = e;
      if (!String(e).includes("reach database") && !String(e).includes("Initialization")) throw e;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  throw ultimo;
}

const contar = () =>
  comRetry(async () => ({
    // Clinica A
    a_agendamentos: await prisma.agendamento.count({ where: { paciente: { tenantId: T } } }),
    a_pacientes: await prisma.paciente.count({ where: { tenantId: T } }),
    a_profissionais: await prisma.profissional.count({ where: { tenantId: T } }),
    a_salas: await prisma.sala.count({ where: { tenantId: T } }),
    a_filiais: await prisma.filial.count({ where: { tenantId: T } }),
    a_convenioTabela: await prisma.convenioTabela.count({ where: { tenantId: T } }),
    a_regraRepasse: await prisma.regraRepasse.count({ where: { tenantId: T } }),
    a_profissionalFilial: await prisma.profissionalFilial.count({
      where: { profissional: { tenantId: T } },
    }),
    // tudo que NÃO é Clinica A — tem de ficar idêntico
    outros_agendamentos: await prisma.agendamento.count({
      where: { paciente: { tenantId: { not: T } } },
    }),
    outros_pacientes: await prisma.paciente.count({ where: { tenantId: { not: T } } }),
    outros_profissionais: await prisma.profissional.count({ where: { tenantId: { not: T } } }),
    outros_convenioTabela: await prisma.convenioTabela.count({ where: { tenantId: { not: T } } }),
    outros_regraRepasse: await prisma.regraRepasse.count({ where: { tenantId: { not: T } } }),
    outros_salas: await prisma.sala.count({ where: { tenantId: { not: T } } }),
  }));

const sorteio = (seed) => {
  // determinístico: a mesma simulação produz o mesmo resultado da aplicação
  let x = seed;
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
};

async function main() {
  console.log(APLICAR ? "MODO: APLICAR (grava)" : "MODO: SIMULAÇÃO (não grava nada)");
  const antes = await contar();
  console.log("\nANTES:", JSON.stringify(antes, null, 2));

  const filiais = await comRetry(() =>
    prisma.filial.findMany({ where: { tenantId: T }, select: { id: true, nome: true, ativo: true } })
  );
  const nf = new Map(filiais.map((f) => [f.id, f.nome]));
  const convenios = await comRetry(() =>
    prisma.convenio.findMany({
      where: { tenantId: T },
      select: { id: true, razao_social: true, nome_fantasia: true },
    })
  );
  const nomeConv = (c) => c.nome_fantasia ?? c.razao_social;
  const procedimentos = await comRetry(() =>
    prisma.procedimento.findMany({
      where: { tenantId: T },
      select: { id: true, nome: true, valor: true, valor_particular: true, codigo: true },
    })
  );

  const acoes = []; // { tabela, op, descricao, fn }

  // ───────────────────────────────────────── 0. PROCEDIMENTO SEM CÓDIGO
  // Vem antes dos preços de propósito: `ConvenioTabela` tem
  // @@unique([convenioId, codigo_procedimento]), então criar uma linha com
  // código vazio colidiria com qualquer outra também sem código.
  secao("0. PROCEDIMENTO \"teste\" — completar código e valores");
  const procTeste = procedimentos.find((p) => p.nome === "teste");
  const codigoFinal = new Map(procedimentos.map((p) => [p.id, p.codigo ?? ""]));
  if (procTeste && (!procTeste.codigo || procTeste.valor === null)) {
    codigoFinal.set(procTeste.id, procTeste.codigo || PROC_TESTE.codigo);
    registrar(
      `  ATUALIZAR "teste": codigo=${procTeste.codigo || PROC_TESTE.codigo} valor=${procTeste.valor ?? PROC_TESTE.valor} particular=${procTeste.valor_particular ?? PROC_TESTE.valor_particular}`
    );
    acoes.push({
      tabela: "procedimento",
      op: "update",
      fn: () =>
        prisma.procedimento.update({
          where: { id: procTeste.id },
          data: {
            codigo: procTeste.codigo || PROC_TESTE.codigo,
            valor: procTeste.valor ?? new Prisma.Decimal(PROC_TESTE.valor),
            valor_particular:
              procTeste.valor_particular ?? new Prisma.Decimal(PROC_TESTE.valor_particular),
          },
        }),
    });
  } else {
    registrar("  nada a fazer");
  }

  // ───────────────────────────────────────── 1. PREÇOS
  secao("1. TABELA DE PREÇOS — preencher as células vazias (150–200)");
  const tabelaAtual = await comRetry(() =>
    prisma.convenioTabela.findMany({
      where: { tenantId: T },
      select: { convenioId: true, procedimentoId: true },
    })
  );
  const jaTem = new Set(tabelaAtual.map((x) => `${x.convenioId}|${x.procedimentoId}`));

  for (const proc of procedimentos) {
    const porConv = PRECOS[proc.nome];
    if (!porConv) continue;
    for (const [nomeC, valor] of Object.entries(porConv)) {
      const conv = convenios.find((c) => nomeConv(c) === nomeC);
      if (!conv) {
        registrar(`  (convênio "${nomeC}" não existe — pulado)`);
        continue;
      }
      if (jaTem.has(`${conv.id}|${proc.id}`)) {
        registrar(`  já existe: ${nomeC} × ${proc.nome}`);
        continue;
      }
      registrar(`  CRIAR  ${nomeC} × ${proc.nome} = R$ ${valor}`);
      acoes.push({
        tabela: "convenioTabela",
        op: "create",
        fn: () =>
          prisma.convenioTabela.create({
            data: {
              tenantId: T,
              convenioId: conv.id,
              procedimentoId: proc.id,
              nome_procedimento: proc.nome,
              codigo_procedimento: codigoFinal.get(proc.id) || proc.nome,
              valor_convenio: new Prisma.Decimal(valor),
              valor_particular: proc.valor_particular
                ? new Prisma.Decimal(proc.valor_particular)
                : new Prisma.Decimal(PROC_TESTE.valor_particular),
              ativo: true,
            },
          }),
      });
    }
  }

  // ───────────────────────────────────────── 2. CADASTRO DE QUEM NÃO ATENDE
  secao("2. ADMIN E RECEPÇÃO — classificar para saírem do dropdown de atendimento");
  const profs = await comRetry(() =>
    prisma.profissional.findMany({
      where: { tenantId: T },
      select: {
        id: true,
        nome: true,
        tipo_vinculo: true,
        funcao_administrativa: true,
        especialidade: true,
        filiais: { select: { filialId: true } },
      },
    })
  );
  const clinicos = profs.filter((x) => x.tipo_vinculo === "PROFISSIONAL_CLINICO");
  const naoAtendentes = ["Admin Clinica A", "Usuario Novo"];

  for (const nome of naoAtendentes) {
    const x = profs.find((p) => p.nome === nome);
    if (!x) continue;
    const funcao = nome === "Admin Clinica A" ? "GESTAO" : "RECEPCAO";
    if (x.tipo_vinculo !== "FUNCIONARIO_ADMINISTRATIVO" || !x.funcao_administrativa) {
      registrar(`  ATUALIZAR ${nome}: tipo_vinculo=FUNCIONARIO_ADMINISTRATIVO funcao=${funcao}`);
      acoes.push({
        tabela: "profissional",
        op: "update",
        fn: () =>
          prisma.profissional.update({
            where: { id: x.id },
            data: {
              tipo_vinculo: "FUNCIONARIO_ADMINISTRATIVO",
              funcao_administrativa: funcao,
            },
          }),
      });
    }
  }

  // Recepção vinculada às DUAS filiais ativas — exercita o vínculo multi-filial
  const ativas = filiais.filter((f) => f.nome !== "SJC");
  const recepcao = profs.find((x) => x.nome === "Usuario Novo");
  if (recepcao) {
    for (const f of ativas) {
      if (recepcao.filiais.some((v) => v.filialId === f.id)) continue;
      registrar(`  CRIAR vínculo: Usuario Novo → ${f.nome}${f.id === ativas[0].id ? " (principal)" : ""}`);
      acoes.push({
        tabela: "profissionalFilial",
        op: "create",
        fn: () =>
          prisma.profissionalFilial.create({
            data: {
              profissionalId: recepcao.id,
              filialId: f.id,
              principal: f.id === ativas[0].id,
            },
          }),
      });
    }
  }

  // ───────────────────────────────────────── 3. REATRIBUIR AGENDAMENTOS
  secao("3. REATRIBUIR os 25 agendamentos de Admin/Recepção entre os 3 clínicos");
  const idsNaoAtendentes = profs.filter((x) => naoAtendentes.includes(x.nome)).map((x) => x.id);
  const paraRealocar = await comRetry(() =>
    prisma.agendamento.findMany({
      where: { paciente: { tenantId: T }, profissionalId: { in: idsNaoAtendentes } },
      select: { id: true, data_hora: true, horario_fim: true, filialId: true, profissionalId: true },
      orderBy: { data_hora: "asc" },
    })
  );

  // agenda de cada clínico, para não criar choque de horário
  const ocupacao = new Map();
  for (const c of clinicos) {
    const seus = await comRetry(() =>
      prisma.agendamento.findMany({
        where: { profissionalId: c.id, status: { not: "CANCELADO" } },
        select: { data_hora: true, horario_fim: true },
      })
    );
    ocupacao.set(c.id, seus.map((s) => [s.data_hora.getTime(), s.horario_fim.getTime()]));
  }

  const novoDono = new Map();
  let rodizio = 0;
  let semVaga = 0;
  for (const a of paraRealocar) {
    const ini = a.data_hora.getTime();
    const fim = a.horario_fim.getTime();
    let escolhido = null;
    for (let k = 0; k < clinicos.length; k++) {
      const c = clinicos[(rodizio + k) % clinicos.length];
      const livre = !ocupacao.get(c.id).some(([i, f]) => ini < f && fim > i);
      if (livre) {
        escolhido = c;
        break;
      }
    }
    if (!escolhido) {
      semVaga++;
      continue;
    }
    ocupacao.get(escolhido.id).push([ini, fim]);
    novoDono.set(a.id, escolhido);
    rodizio++;
  }

  const resumoRealoc = new Map();
  for (const c of novoDono.values()) resumoRealoc.set(c.nome, (resumoRealoc.get(c.nome) ?? 0) + 1);
  registrar(`  a reatribuir: ${paraRealocar.length} | sem horário livre (ficam como estão): ${semVaga}`);
  for (const [n, q] of resumoRealoc) registrar(`     ${n}: ${q}`);
  for (const [agId, c] of novoDono) {
    acoes.push({
      tabela: "agendamento",
      op: "update",
      fn: () => prisma.agendamento.update({ where: { id: agId }, data: { profissionalId: c.id } }),
    });
  }

  // ───────────────────────────────────────── 4. REPASSE 15%
  secao("4. REPASSE — 15% para os 3 clínicos, em todo o período");
  const regras = await comRetry(() =>
    prisma.regraRepasse.findMany({
      where: { tenantId: T },
      select: { id: true, ativo: true, valor: true, profissionalId: true },
    })
  );
  for (const r of regras.filter((x) => x.ativo)) {
    const dono = profs.find((p) => p.id === r.profissionalId);
    registrar(`  DESATIVAR regra antiga de ${dono?.nome}: ${r.valor}%  (linha preservada)`);
    acoes.push({
      tabela: "regraRepasse",
      op: "update",
      fn: () => prisma.regraRepasse.update({ where: { id: r.id }, data: { ativo: false } }),
    });
  }
  for (const c of clinicos) {
    registrar(`  CRIAR regra: ${c.nome} = ${REPASSE_PCT}% desde ${REPASSE_DESDE.toISOString().slice(0, 10)}, sem fim`);
    acoes.push({
      tabela: "regraRepasse",
      op: "create",
      fn: () =>
        prisma.regraRepasse.create({
          data: {
            tenantId: T,
            profissionalId: c.id,
            tipo: "PERCENTUAL",
            valor: new Prisma.Decimal(REPASSE_PCT),
            descricao: "Repasse padrão",
            vigencia_inicio: REPASSE_DESDE,
            vigencia_fim: null,
            prioridade: 0,
            ativo: true,
          },
        }),
    });
  }

  // ───────────────────────────────────────── 5. PACIENTES
  secao("5. PACIENTES — filial distribuída, valor particular e nome legível");
  const pacientes = await comRetry(() =>
    prisma.paciente.findMany({
      where: { tenantId: T },
      select: { id: true, nome: true, filialId: true, convenioId: true },
      orderBy: { nome: "asc" },
    })
  );
  pacientes.forEach((pac, idx) => {
    const alvo = ativas[idx % ativas.length];
    if (pac.filialId === alvo.id) return;
    registrar(`  ${pac.nome}: filial ${pac.filialId ? nf.get(pac.filialId) : "—"} → ${alvo.nome}`);
    acoes.push({
      tabela: "paciente",
      op: "update",
      fn: () => prisma.paciente.update({ where: { id: pac.id }, data: { filialId: alvo.id } }),
    });
  });

  const lixo = pacientes.find((x) => x.nome === NOME_LIXO);
  if (lixo) {
    registrar(`  renomear "${NOME_LIXO}" → "${NOME_LIXO_NOVO}" (registro preservado)`);
    acoes.push({
      tabela: "paciente",
      op: "update",
      fn: () => prisma.paciente.update({ where: { id: lixo.id }, data: { nome: NOME_LIXO_NOVO } }),
    });
  }

  // paciente sem convênio continua particular, mas com valor combinado
  const semConvenio = pacientes.filter((x) => !x.convenioId);
  for (const pac of semConvenio) {
    const seus = await comRetry(() =>
      prisma.agendamento.findMany({
        where: { pacienteId: pac.id, valor_particular: null },
        select: { id: true, procedimentoId: true },
      })
    );
    if (seus.length === 0) continue;
    registrar(`  ${pac.nome} (particular): ${seus.length} agendamentos ganham valor_particular`);
    for (const a of seus) {
      const proc = procedimentos.find((p) => p.id === a.procedimentoId);
      const v = proc?.valor_particular ? Number(proc.valor_particular) : VALOR_PARTICULAR_PADRAO;
      acoes.push({
        tabela: "agendamento",
        op: "update",
        fn: () =>
          prisma.agendamento.update({
            where: { id: a.id },
            data: { valor_particular: new Prisma.Decimal(v) },
          }),
      });
    }
  }

  // ───────────────────────────────────────── 6. SJC
  secao("6. FILIAL SJC — sem sala, sem agendamento, sem paciente");
  const sjc = filiais.find((f) => f.nome === "SJC");
  if (sjc && sjc.ativo) {
    registrar("  DESATIVAR SJC (registro preservado, some dos dropdowns)");
    acoes.push({
      tabela: "filial",
      op: "update",
      fn: () => prisma.filial.update({ where: { id: sjc.id }, data: { ativo: false } }),
    });
  }

  // ───────────────────────────────────────── 7. DESFECHOS
  secao("7. DESFECHOS — fechar o ciclo dos agendamentos passados");
  const agora = new Date();
  const passados = await comRetry(() =>
    prisma.agendamento.findMany({
      where: { paciente: { tenantId: T }, data_hora: { lt: agora } },
      select: { id: true, status: true, data_hora: true, horario_fim: true, motivo_falta: true, hora_chegada: true },
      orderBy: { data_hora: "asc" },
    })
  );
  const abertos = passados.filter((a) => ["AGENDADO", "CONFIRMADO"].includes(a.status));
  const cancPassados = passados.filter((a) => a.status === "CANCELADO");
  registrar(`  passados: ${passados.length} | ainda em aberto (AGENDADO/CONFIRMADO): ${abertos.length} | cancelados: ${cancPassados.length}`);

  const rnd = sorteio(42);
  const novoStatus = new Map();

  // aberto no passado = ninguém fechou o ciclo. 70% atendeu, 15% faltou, 15% cancelou.
  for (const a of abertos) {
    const r = rnd();
    novoStatus.set(a.id, r < 0.7 ? "ATENDIDO" : r < 0.85 ? "FALTOU" : "CANCELADO");
  }
  // cancelados passados: um terço vira atendido, um terço falta, um terço fica
  cancPassados.forEach((a, i) => {
    const d = i % 3;
    if (d === 0) novoStatus.set(a.id, "ATENDIDO");
    else if (d === 1) novoStatus.set(a.id, "FALTOU");
  });

  const resumoStatus = new Map();
  for (const s of novoStatus.values()) resumoStatus.set(s, (resumoStatus.get(s) ?? 0) + 1);
  registrar(`  mudanças de status: ${[...resumoStatus].map(([k, v]) => `${k}=${v}`).join("  ")}`);

  const porId = new Map(passados.map((a) => [a.id, a]));
  for (const [id, status] of novoStatus) {
    const a = porId.get(id);
    const data = { status };
    if (status === "ATENDIDO") {
      // check-in completo, para o histórico ter tempo de espera e duração real
      data.hora_chegada = new Date(a.data_hora.getTime() - 10 * 60000);
      data.hora_inicio_real = a.data_hora;
      data.hora_fim_real = a.horario_fim;
    }
    if (status === "FALTOU") data.motivo_falta = MOTIVO_FALTA;
    acoes.push({
      tabela: "agendamento",
      op: "update",
      fn: () => prisma.agendamento.update({ where: { id }, data }),
    });
  }

  // 8. faltas já existentes sem motivo
  const faltasSemMotivo = passados.filter((a) => a.status === "FALTOU" && !a.motivo_falta);
  if (faltasSemMotivo.length) {
    registrar(`  ${faltasSemMotivo.length} faltas existentes ganham motivo "${MOTIVO_FALTA}"`);
    for (const a of faltasSemMotivo) {
      acoes.push({
        tabela: "agendamento",
        op: "update",
        fn: () =>
          prisma.agendamento.update({ where: { id: a.id }, data: { motivo_falta: MOTIVO_FALTA } }),
      });
    }
  }
  // atendidos antigos sem check-in
  const atendidosSemChegada = passados.filter((a) => a.status === "ATENDIDO" && !a.hora_chegada);
  if (atendidosSemChegada.length) {
    registrar(`  ${atendidosSemChegada.length} atendidos existentes ganham check-in completo`);
    for (const a of atendidosSemChegada) {
      acoes.push({
        tabela: "agendamento",
        op: "update",
        fn: () =>
          prisma.agendamento.update({
            where: { id: a.id },
            data: {
              hora_chegada: new Date(a.data_hora.getTime() - 10 * 60000),
              hora_inicio_real: a.data_hora,
              hora_fim_real: a.horario_fim,
            },
          }),
      });
    }
  }

  // ───────────────────────────────────────── 8. RECARIMBO
  secao("8. CARIMBOS — especialidade e valor dos atendimentos");
  // Reproduz o que o sistema teria gravado se o ciclo tivesse sido fechado na
  // época: a especialidade na criação, o valor na transição para ATENDIDO.
  //
  // A especialidade é derivação pura do profissional (não mudou), então não há
  // "precisão falsa" em preenchê-la. O valor só é carimbado para quem está
  // ATENDIDO — que é exatamente quando o fluxo real carimba.
  const todosAgs = await comRetry(() =>
    prisma.agendamento.findMany({
      where: { paciente: { tenantId: T } },
      select: {
        id: true,
        status: true,
        especialidade_snapshot: true,
        valor_cobrado: true,
        valor_particular: true,
        procedimentoId: true,
        profissionalId: true,
        paciente: { select: { convenioId: true } },
      },
    })
  );

  // especialidade final de cada profissional (considerando a reatribuição)
  const espDoProf = new Map();
  for (const x of profs) {
    const comCustom = await comRetry(() =>
      prisma.profissional.findUnique({
        where: { id: x.id },
        select: { especialidade: true, especialidadeCustomizada: { select: { nome: true } } },
      })
    );
    espDoProf.set(x.id, comCustom?.especialidadeCustomizada?.nome ?? comCustom?.especialidade ?? null);
  }

  // preço final por (convênio, procedimento), já incluindo as linhas novas
  const precoFinal = new Map();
  for (const t of tabelaAtual) precoFinal.set(`${t.convenioId}|${t.procedimentoId}`, null);
  const tabelaCompleta = await comRetry(() =>
    prisma.convenioTabela.findMany({
      where: { tenantId: T },
      select: { convenioId: true, procedimentoId: true, valor_convenio: true },
    })
  );
  for (const t of tabelaCompleta) precoFinal.set(`${t.convenioId}|${t.procedimentoId}`, Number(t.valor_convenio));
  for (const proc of procedimentos) {
    const porConv = PRECOS[proc.nome];
    if (!porConv) continue;
    for (const [nomeC, valor] of Object.entries(porConv)) {
      const conv = convenios.find((c) => nomeConv(c) === nomeC);
      if (conv) precoFinal.set(`${conv.id}|${proc.id}`, valor);
    }
  }

  const statusFinal = (a) => novoStatus.get(a.id) ?? a.status;
  const profFinal = (a) => novoDono.get(a.id)?.id ?? a.profissionalId;
  let carimboEsp = 0;
  let carimboValor = 0;
  for (const a of todosAgs) {
    const dados = {};
    const esp = espDoProf.get(profFinal(a));
    if (!a.especialidade_snapshot && esp) {
      dados.especialidade_snapshot = esp;
      carimboEsp++;
    }
    if (statusFinal(a) === "ATENDIDO" && a.valor_cobrado === null) {
      let v = a.valor_particular !== null ? Number(a.valor_particular) : null;
      if (v === null && a.paciente?.convenioId && a.procedimentoId) {
        v = precoFinal.get(`${a.paciente.convenioId}|${a.procedimentoId}`) ?? null;
      }
      if (v === null) {
        // paciente particular que ganhou valor no passo 5
        const proc = procedimentos.find((pr) => pr.id === a.procedimentoId);
        if (!a.paciente?.convenioId) {
          v = proc?.valor_particular ? Number(proc.valor_particular) : VALOR_PARTICULAR_PADRAO;
        }
      }
      if (v !== null) {
        dados.valor_cobrado = new Prisma.Decimal(v);
        carimboValor++;
      }
    }
    if (Object.keys(dados).length === 0) continue;
    acoes.push({
      tabela: "agendamento",
      op: "update",
      fn: () => prisma.agendamento.update({ where: { id: a.id }, data: dados }),
    });
  }
  registrar(`  especialidade_snapshot a preencher: ${carimboEsp}`);
  registrar(`  valor_cobrado a carimbar (ATENDIDO):  ${carimboValor}`);

  // ───────────────────────────────────────── RESUMO
  secao("RESUMO DO QUE SERÁ FEITO");
  const porTabela = new Map();
  for (const a of acoes) {
    const k = `${a.tabela}.${a.op}`;
    porTabela.set(k, (porTabela.get(k) ?? 0) + 1);
  }
  for (const [k, v] of [...porTabela].sort()) registrar(`  ${k.padEnd(28)} ${v}`);
  registrar(`  TOTAL: ${acoes.length} operações · 0 deletes`);

  if (!APLICAR) {
    console.log("\nSimulação encerrada. Rode com --aplicar para gravar.");
    await prisma.$disconnect();
    return;
  }

  secao("APLICANDO");
  let feitas = 0;
  for (const a of acoes) {
    await comRetry(a.fn);
    feitas++;
    if (feitas % 25 === 0) console.log(`  ${feitas}/${acoes.length}`);
  }
  console.log(`  ${feitas}/${acoes.length} concluídas`);

  const depois = await contar();
  console.log("\nDEPOIS:", JSON.stringify(depois, null, 2));

  let ok = true;
  for (const k of Object.keys(antes).filter((x) => x.startsWith("outros_"))) {
    if (antes[k] !== depois[k]) {
      console.log(`FALHA: ${k} mudou de ${antes[k]} para ${depois[k]} — escopo vazou!`);
      ok = false;
    }
  }
  for (const k of ["a_agendamentos", "a_pacientes", "a_profissionais", "a_salas", "a_filiais"]) {
    if (antes[k] !== depois[k]) {
      console.log(`FALHA: ${k} mudou de ${antes[k]} para ${depois[k]} — nada devia ser criado/apagado aqui`);
      ok = false;
    }
  }
  console.log(
    ok
      ? "\nOK — nenhum registro criado ou apagado fora do previsto, outros tenants intactos."
      : "\nVERIFICAR"
  );
  await prisma.$disconnect();
  process.exit(ok ? 0 : 1);
}

main().catch(async (e) => {
  console.error("ERRO:", e);
  await prisma.$disconnect();
  process.exit(1);
});
