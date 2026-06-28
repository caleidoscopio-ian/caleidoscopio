# Módulo 23 — Conciliação Automática de Glosas (Demonstrativo TISS)

> **Objetivo**: Automatizar o controle de glosas importando o **demonstrativo de pagamento/análise de conta** (XML padrão TISS/ANS) enviado pelo convênio, cruzando-o com nossos atendimentos pela **senha de autorização**, e gerando o comparativo **faturado × liberado × glosado**. Inclui a captura de senha/nº da guia no check-in.

> ⚠️ **Escopo extra (faturável)** — fora do escopo original combinado com o cliente. Estimativa de custo no fim deste documento.

## Contexto e descoberta (arquivos reais analisados)

Foram analisados 2 demonstrativos reais. Ambos são **XML padrão TISS/ANS**, mas de **tipos diferentes**:

| | **Bradesco** | **Hapvida (GNDI Minas)** |
|---|---|---|
| `tipoTransacao` | `DEMONSTRATIVO_PAGAMENTO` | `DEMONSTRATIVO_ANALISE_CONTA` |
| Padrão TISS | 4.02.00 | (sem tag de versão) |
| Encoding | ISO-8859-1 | UTF-16 |
| Nível de detalhe | Guia (`guiasDoLote`) | Guia + procedimento (`relacaoGuias` → `detalhesGuia`) |
| Motivo de glosa | ❌ só `valorGlosaGuia` | ✅ `relacaoGlosa` com `ansCodigo` + `ansDescricao` |
| Chave de match | `senha`, `numeroGuiaPrestador` | `senha`, `numeroGuiaPrestador`, `numeroCarteira` |

**Campo-chave universal de conciliação: `senha`** (presente em ambos). Hoje o sistema **não captura** senha/guia nem importa demonstrativos.

## Decisões (confirmadas com o cliente)

1. **Captura**: campos `senha` + `nº da guia` adicionados no **check-in** do paciente.
2. **Granularidade**: conciliação **por guia** (via senha) — cobre os 2 convênios igualmente.
3. **Escopo de convênios**: implementar os **2 formatos TISS** (Pagamento + Análise de Conta) cobrindo Bradesco e Hapvida, com **arquitetura extensível** (cada novo convênio/formato = orçamento incremental).
4. **Faturamento**: **conciliar direto contra atendimentos** `ATENDIDO` (valor via `calcularPrecoProcedimento`), sem criar módulo de lote/faturamento.

## Premissas

- **TISS-first, não convênio-first**: o dispatcher decide o parser pelo `tipoTransacao` (e versão), não pelo nome do convênio. Isso maximiza reuso entre operadoras.
- **Encoding flexível**: decodificar ISO-8859-1 e UTF-16 antes do parse.
- **Multi-tenant**: tudo filtrado por `tenantId`.
- **Reaproveita** o model `Glosa` (Módulo 22): quando uma guia conciliada tem `valorGlosa > 0`, cria/vincula uma `Glosa` automaticamente.
- **Lib**: `fast-xml-parser` (instalar).

---

## Fase 0 — Setup
- [ ] `npm i fast-xml-parser`
- [ ] Criar `src/lib/tiss/` (parser + tipos normalizados)

## Fase 1 — Schema
- [ ] `agendamento`: adicionar `senha_autorizacao String?`, `numero_guia String?`
- [ ] Model `DemonstrativoImportacao` — arquivo importado (cabeçalho do demonstrativo):
  - tenantId, convenioId?, nome_arquivo, tipo_demonstrativo, numero_demonstrativo, operadora_nome, registro_ans, data_emissao, valor_informado_total, valor_processado_total, valor_liberado_total, valor_glosa_total, importado_por, createdAt
- [ ] Model `DemonstrativoGuia` — cada guia do arquivo:
  - tenantId, demonstrativoId, numero_guia_prestador, numero_guia_operadora?, senha?, numero_carteira?, data_realizacao?, valor_informado, valor_processado, valor_liberado, valor_glosa, situacao?, codigo_glosa?, descricao_glosa?, **agendamentoId? (match)**, status_conciliacao (CONCILIADO | CONCILIADO_GLOSA | NAO_ENCONTRADO)
- [ ] Enum `StatusConciliacao`
- [ ] `npx prisma generate && db push`

## Fase 2 — Captura no check-in
- [ ] Campos `senha` + `nº guia` na tela/dialog de check-in (`/check-in`)
- [ ] API de check-in/agendamento aceita e persiste os campos
- [ ] Exibição dos campos no detalhe do agendamento

## Fase 3 — Parser TISS (núcleo, extensível)
- [ ] `src/lib/tiss/index.ts` — `parseDemonstrativo(buffer)`:
  - detectar encoding (BOM / declaração XML) e decodificar
  - parsear envelope `mensagemTISS`, ler `tipoTransacao` + `Padrao`
  - despachar para o parser específico
- [ ] `src/lib/tiss/parsers/pagamento.ts` — `DEMONSTRATIVO_PAGAMENTO` (Bradesco)
- [ ] `src/lib/tiss/parsers/analise-conta.ts` — `DEMONSTRATIVO_ANALISE_CONTA` (Hapvida)
- [ ] `src/lib/tiss/types.ts` — modelo normalizado (`DemonstrativoNormalizado`, `GuiaNormalizada`)
- [ ] Testes com os 2 arquivos reais

## Fase 4 — Motor de conciliação
- [ ] `src/lib/tiss/conciliacao.ts`:
  - casar `guia.senha` (fallback `numero_guia`) com `agendamento.senha_autorizacao` (fallback `numero_guia`) no tenant
  - categorizar: **Conciliado** (liberado=informado), **Conciliado c/ glosa** (valorGlosa>0 → cria `Glosa`), **Não encontrado** (guia sem atendimento)
  - comparativo reverso: atendimentos faturados **sem retorno** no demonstrativo
- [ ] Idempotência: reimportar o mesmo demonstrativo não duplica

## Fase 5 — APIs
- [ ] `POST /api/glosas/demonstrativos` — upload XML, parse, persiste, concilia, retorna resumo. RBAC `create_convenios`
- [ ] `GET /api/glosas/demonstrativos` — lista importados. RBAC `view_convenios`
- [ ] `GET /api/glosas/demonstrativos/[id]` — detalhe + guias + status conciliação
- [ ] `GET /api/glosas/conciliacao` — comparativo agregado (faturado x liberado x glosado, conciliados x não encontrados)

## Fase 6 — Frontend (nova aba na página /glosas)
- [ ] `upload-demonstrativo.tsx` — drag-drop de XML, feedback de parse/conciliação
- [ ] `lista-demonstrativos.tsx` — demonstrativos importados (operadora, data, totais)
- [ ] `conciliacao-detalhe.tsx` — tabela de guias com status (verde/âmbar/vermelho), valores
- [ ] `comparativo-conciliacao.tsx` — KPIs: total faturado, liberado, glosado, % glosa, guias não conciliadas
- [ ] Aba "Conciliação" em `/glosas`

## Fase 7 — Validação e entrega
- [ ] Testes com Bradesco.xml e Hapvida MG.xml reais
- [ ] Edge cases: encoding, decimais, guia sem senha, valores zerados
- [ ] `npx next build`
- [ ] Atualizar `CLAUDE.md` (Módulo 23) e rules (novos models/enums)

---

## Arquivos (novos principais)
- `src/lib/tiss/index.ts`, `types.ts`, `conciliacao.ts`, `parsers/pagamento.ts`, `parsers/analise-conta.ts`
- `src/app/api/glosas/demonstrativos/route.ts`, `[id]/route.ts`, `src/app/api/glosas/conciliacao/route.ts`
- `src/components/glosas/upload-demonstrativo.tsx`, `lista-demonstrativos.tsx`, `conciliacao-detalhe.tsx`, `comparativo-conciliacao.tsx`
- `src/types/conciliacao.ts`

## Modificados
- `prisma/schema.prisma` (campos em agendamento + 2 models + enum)
- check-in (UI + API)
- `src/app/glosas/page.tsx` (aba Conciliação)
- `package.json` (`fast-xml-parser`)

---

## Estimativa de esforço e custo (R$ 170,00/h)

| # | Frente | Horas |
|---|--------|-------|
| 1 | Análise TISS, setup, lib, estrutura | 4 |
| 2 | Schema + migração (campos + 2 models + enum) | 3 |
| 3 | Captura senha/guia no check-in (UI + API) | 4 |
| 4 | **Parser TISS** (2 formatos + encodings + normalização) | 12 |
| 5 | **Motor de conciliação** (match + categorização + auto-glosa + reverso) | 8 |
| 6 | APIs (upload/listar/detalhe/comparativo) | 6 |
| 7 | Frontend (upload, lista, detalhe, comparativo, aba) | 9 |
| 8 | Comparativo/relatório (KPIs + agregações) | 4 |
| 9 | Testes com arquivos reais + edge cases + build | 6 |
| 10 | Documentação e entrega | 2 |
| | **Total** | **58 h** |

**Faixa realista: 54–62 h** (conforme imprevistos de encoding/variações dos arquivos).

| Cenário | Horas | Valor (R$ 170/h) |
|---------|-------|------------------|
| Otimista | 54 | **R$ 9.180** |
| **Central** | **58** | **R$ 9.860** |
| Conservador | 62 | **R$ 10.540** |

**Sugestão comercial**: fechar em **~58 h → R$ 9.860**, ou faixa **R$ 9.200 – R$ 10.500**.

### Custo incremental por novo convênio/formato
- **Mesmo tipo TISS** já implementado (só variação de encoding/campos): **2–4 h** (R$ 340 – R$ 680)
- **Novo tipo de demonstrativo TISS** (parser novo): **6–10 h** (R$ 1.020 – R$ 1.700)

> O valor cobre os 2 formatos analisados (Bradesco + Hapvida). Cada operadora nova é validada com arquivo real e orçada à parte conforme a tabela acima.

## Pendências / riscos
1. **Variações por operadora** — só aparecem com arquivos reais; por isso o modelo de orçamento incremental por convênio.
2. **Qualidade da senha capturada** — a conciliação depende de a recepção preencher a senha no check-in. Sem isso, a guia cai em "Não encontrado".
3. **Procedimento-nível (futuro)** — Hapvida traz detalhe por procedimento e código de glosa; nesta fase usamos só o nível de guia. Detalhamento por procedimento pode ser uma evolução paga.
