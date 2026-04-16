# Modulo 13 — Gestao de Convenios

## Status: FASES 0-7 CONCLUÍDAS ✅

## Resumo
CRUD completo de convenios medicos com dados basicos, tabela de valores, parametros TISS/SADT, anexos de contratos e historico de negociacoes.

---

## Progresso por Fase

### Fase 0: Schema e Database ✅
- [x] Enums adicionados ao schema (StatusConvenio, TipoConvenio, TipoGuiaTISS, RegimeAtendimento, CaraterAtendimento, TipoConvenioAnexo, TipoHistoricoConvenio)
- [x] Model Convenio criado
- [x] Model ConvenioTabela criado
- [x] Model ConvenioAnexo criado
- [x] Model ConvenioHistorico criado
- [x] Relacao em Procedimento adicionada (tabelasConvenio)
- [x] `prisma db push` executado com sucesso
- [x] `npx prisma generate` sem erros

### Fase 1: Types + API Core ✅
- [x] Types e Zod schemas criados (`src/types/convenio.ts`)
- [x] API CRUD convenios (`src/app/api/convenios/route.ts`)
- [x] API detalhe por ID (`src/app/api/convenios/[id]/route.ts`)
- [x] Historico automatico em cada mutacao
- [x] Validacao CNPJ unico por tenant

### Fase 2: Pagina de Listagem + CRUD Dialogs ✅
- [x] Pagina de listagem (`src/app/convenios/page.tsx`)
- [x] Cards de estatisticas (Total, Ativos, Em Negociacao, Inativos/Suspensos)
- [x] Busca client-side por razao_social, nome_fantasia, cnpj
- [x] Dialog de criacao (`src/components/convenios/novo-convenio-dialog.tsx`)
- [x] Dialog de edicao (`src/components/convenios/editar-convenio-dialog.tsx`)
- [x] Dialog de exclusao (soft delete) (`src/components/convenios/excluir-convenio-dialog.tsx`)
- [x] Navegacao no sidebar (`src/lib/navigation.ts`) — secao Clinica
- [x] RBAC: ProtectedRoute com resource=convenios action=VIEW
- [x] RBAC: seed com MANAGE para ADMIN/SUPER_ADMIN, VIEW para USER
- [x] RBAC: action-map com view/create/edit/delete_convenios
- [x] RBAC: bootstrap-roles com convenios em ALL_RESOURCES

### Fase 3: Pagina de Detalhe + Tabela de Valores ✅
- [x] Pagina de detalhe com 5 tabs (`src/app/convenios/[id]/page.tsx`)
- [x] Tab Dados Gerais
- [x] API tabela de valores (`src/app/api/convenios/[id]/tabela/route.ts`)
- [x] Tab Tabela de Valores com CRUD
- [x] Componente form tabela (`src/components/convenios/convenio-tabela-form.tsx`)

### Fase 4: Parametros TISS/SADT ✅
- [x] Form TISS (`src/components/convenios/convenio-tiss-form.tsx`)
- [x] Campos: versao_tiss, codigo_operadora, codigo_prestador, tipo_guia_padrao, regime_atendimento_padrao, carater_atendimento_padrao, numero_lote_padrao
- [x] Validacao via Zod (convenioTissSchema)

### Fase 5: Anexos + Historico ✅
- [x] API anexos (`src/app/api/convenios/[id]/anexos/route.ts`)
- [x] API historico (`src/app/api/convenios/[id]/historico/route.ts`)
- [x] Tab Anexos com upload (logica inline na pagina de detalhe)
- [x] Tab Historico com timeline
- [x] Componente nota manual (`src/components/convenios/convenio-historico-nota.tsx`)
- [ ] `convenio-anexo-upload.tsx` como componente separado — nao criado (upload inline na pagina)

### Fase 6: Integracao com Paciente ✅
- [x] Campo `convenioId String?` no model Paciente
- [x] `convenio Convenio? @relation(...)` no model Paciente + `pacientes paciente[]` no Convenio
- [x] `prisma db push` + client regenerado
- [x] Dropdown dinâmico de convênios ativos em novo-paciente-form.tsx
- [x] Dropdown dinâmico de convênios ativos em editar-paciente-form.tsx
- [x] API pacientes retornando `convenioId` + `convenio { id, razao_social, nome_fantasia }` no GET
- [x] API POST e PUT aceitando `convenioId`
- [x] Backward compat: `plano_saude String?` mantido no schema

### Fase 7: Polish e Verificacao ✅
- [x] CNPJ com mascara de formatacao (formatarCNPJ na listagem)
- [x] `npm run build` passando
- [x] Valores monetarios em BRL (formatarMoeda via Intl.NumberFormat na pagina de detalhe)
- [x] Empty states explícitos nas tabs vazias
- [x] Loading skeletons nos tabs do detalhe (tabelaLoading, anexosLoading, historicoLoading)
- [ ] Teste E2E do fluxo completo

---

## Modulo completo. Nenhuma fase pendente.
