# Módulo 14 — Página de Detalhe do Profissional + Regras de Repasse

## Status: PENDENTE

## Contexto

Hoje a página `/terapeutas` lista profissionais e usa um modal básico (`TerapeutaDetailsDialog`) para exibir dados. Não existe página de detalhe nem gestão financeira de repasse.

**Motivação**: 
1. O admin precisa ver informações completas do profissional (agenda, pacientes, sessões) numa página dedicada com tabs — mesmo padrão de `/convenios/[id]`
2. A clínica precisa configurar **regras de repasse** por profissional: quanto cada um recebe por atendimento, com variações por convênio, procedimento, horário, etc.

---

## Progresso por Fase

### Fase 0: Schema e Database
- [ ] Enums adicionados (TipoRepasse, StatusRegraRepasse)
- [ ] Model RegraRepasse criado
- [ ] Model RegraRepasseHistorico criado
- [ ] Relação em profissional adicionada
- [ ] `prisma db push` executado
- [ ] `npx prisma generate` sem erros

### Fase 1: Types + API Core
- [ ] Types e Zod schemas criados (`src/types/profissional.ts`)
- [ ] API detalhe profissional (`src/app/api/terapeutas/[id]/route.ts`)
- [ ] API regras de repasse CRUD (`src/app/api/terapeutas/[id]/regras-repasse/route.ts`)

### Fase 2: Página de Detalhe com Tabs
- [ ] Página `/terapeutas/[id]/page.tsx`
- [ ] Tab Dados Gerais
- [ ] Tab Agenda (últimos agendamentos)
- [ ] Tab Pacientes (pacientes atendidos)
- [ ] Tab Regras de Repasse

### Fase 3: CRUD de Regras de Repasse
- [ ] Componente form de regra (`src/components/terapeutas/regra-repasse-form.tsx`)
- [ ] Listagem com status (ativa/inativa/futura)
- [ ] Validação de conflitos
- [ ] Histórico de alterações

### Fase 4: Polish e Integração
- [ ] Listagem `/terapeutas` linkando para detalhe
- [ ] Loading skeletons por tab
- [ ] Empty states
- [ ] `npm run build` passando

---

## Fase 0: Schema e Database

### Novos Enums

```prisma
enum TipoRepasse {
  PERCENTUAL          // % sobre o valor do procedimento/convenio
  VALOR_FIXO          // Valor fixo por atendimento
  VALOR_HORA          // Valor por hora de atendimento
}

enum StatusRegraRepasse {
  ATIVA
  INATIVA
  FUTURA               // Vigência ainda não iniciou
}
```

### Novos Models

**RegraRepasse** — regra de repasse vinculada ao profissional:

```prisma
model RegraRepasse {
  id                String              @id @default(uuid())
  tenantId          String
  profissionalId    String
  
  // Tipo e valor
  tipo              TipoRepasse
  valor             Decimal             @db.Decimal(10, 2)  // % ou R$ conforme tipo
  
  // Critérios (nullable = "qualquer")
  convenioId        String?             // Se preenchido, aplica só a este convênio
  procedimentoId    String?             // Se preenchido, aplica só a este procedimento
  
  // Vigência
  vigencia_inicio   DateTime            @default(now())
  vigencia_fim      DateTime?           // null = sem data fim
  
  // Controle
  descricao         String?             // Ex: "Repasse padrão", "Repasse convênio X"
  prioridade        Int                 @default(0)  // Maior = mais específico, prevalece
  ativo             Boolean             @default(true)
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @default(now()) @updatedAt
  
  // Relações
  profissional      profissional        @relation(fields: [profissionalId], references: [id], onDelete: Cascade)
  convenio          Convenio?           @relation(fields: [convenioId], references: [id], onDelete: SetNull)
  procedimento      Procedimento?       @relation(fields: [procedimentoId], references: [id], onDelete: SetNull)
  historico         RegraRepasseHistorico[]
  
  @@index([tenantId])
  @@index([profissionalId, ativo])
  @@map("regras_repasse")
}

model RegraRepasseHistorico {
  id                String              @id @default(uuid())
  regraRepasseId    String
  tenantId          String
  
  tipo_alteracao    String              // CRIACAO, ALTERACAO, DESATIVACAO, REATIVACAO
  descricao         String
  dados_anteriores  Json?
  dados_novos       Json?
  usuario_nome      String
  usuario_id        String
  
  createdAt         DateTime            @default(now())
  
  regraRepasse      RegraRepasse        @relation(fields: [regraRepasseId], references: [id], onDelete: Cascade)
  
  @@index([regraRepasseId])
  @@map("regras_repasse_historico")
}
```

### Alterações em Models Existentes

```prisma
// Em profissional, adicionar:
regrasRepasse     RegraRepasse[]

// Em Convenio, adicionar:
regrasRepasse     RegraRepasse[]

// Em Procedimento, adicionar:
regrasRepasse     RegraRepasse[]
```

### Arquivos
- `prisma/schema.prisma` (modificar)
- Rodar: `npx prisma db push` + `npx prisma generate`

---

## Fase 1: Types + API Core

### Types (`src/types/profissional.ts`)

```typescript
// Interfaces para RegraRepasse, RegraRepasseHistorico
// Zod schemas para validação dos forms
// Labels/mappings para enums (TipoRepasse → "Percentual", etc.)
```

### API Detalhe (`src/app/api/terapeutas/[id]/route.ts`)

- **GET**: Profissional completo com contagens (_count de agendamentos, pacientes, regrasRepasse)
- **PUT**: Atualizar dados do profissional (mover lógica do PUT em route.ts principal)

### API Regras de Repasse (`src/app/api/terapeutas/[id]/regras-repasse/route.ts`)

- **GET**: Listar regras do profissional. Include convenio.razao_social, procedimento.nome
- **POST**: Criar regra. Validar conflitos (mesmos critérios + vigência sobreposta)
- **PUT**: Atualizar regra. Auto-criar histórico com snapshot antes/depois
- **DELETE**: Soft delete (ativo: false). Auto-criar histórico

### Padrões a seguir
- `src/app/api/convenios/[id]/route.ts` — estrutura da API de detalhe
- `src/app/api/convenios/[id]/tabela/route.ts` — CRUD de sub-recurso

### Arquivos
- `src/types/profissional.ts` (criar)
- `src/app/api/terapeutas/[id]/route.ts` (criar)
- `src/app/api/terapeutas/[id]/regras-repasse/route.ts` (criar)

---

## Fase 2: Página de Detalhe com Tabs

### Página (`src/app/terapeutas/[id]/page.tsx`)

Layout com 4 tabs:

1. **Dados Gerais** — Informações pessoais, contato, especialidade, salas (dados do profissional). Botão editar (abre EditarTerapeutaForm existente)

2. **Agenda** — Últimos/próximos agendamentos do profissional. Tabela: Data, Paciente, Procedimento, Sala, Status. Fetch de `/api/agendamentos?profissionalId=X`

3. **Pacientes** — Pacientes atendidos por este profissional. Tabela: Nome, Última sessão, Total de sessões. Fetch dos pacientes vinculados

4. **Regras de Repasse** — CRUD de regras (Fase 3)

### Navegação
- Header com botão voltar, nome do profissional, badge de especialidade
- Breadcrumbs: Dashboard > Profissionais > Nome

### Padrão a seguir
- `src/app/convenios/[id]/page.tsx` — mesma estrutura de tabs

### Arquivos
- `src/app/terapeutas/[id]/page.tsx` (criar)

---

## Fase 3: CRUD de Regras de Repasse

### Componente Form (`src/components/terapeutas/regra-repasse-form.tsx`)

Dialog com campos:
- **Tipo de repasse** — Select: Percentual / Valor Fixo / Valor por Hora
- **Valor** — Input numérico (mostra % ou R$ conforme tipo)
- **Convênio** — Select opcional (dropdown de convênios ativos do tenant)
- **Procedimento** — Select opcional (dropdown de procedimentos ativos)
- **Descrição** — Texto livre para identificação
- **Vigência início** — DatePicker (default: hoje)
- **Vigência fim** — DatePicker opcional (null = sem fim)
- **Prioridade** — Number (tooltip: "Regras com maior prioridade prevalecem em caso de conflito")

### Listagem na Tab

Tabela com:
- Descrição
- Tipo (badge: Percentual / Fixo / Hora)
- Valor formatado (R$ ou %)
- Convênio (nome ou "Todos")
- Procedimento (nome ou "Todos")
- Vigência (data início — data fim ou "Sem fim")
- Status (badge: Ativa / Inativa / Futura)
- Ações: Editar / Desativar

### Validação de Conflitos (server-side)

Na criação/edição, verificar se já existe regra ativa com:
- Mesmo profissional
- Mesmo convênio (ou ambos null)
- Mesmo procedimento (ou ambos null)
- Vigência sobreposta

Se houver conflito → retornar 409 com mensagem explicativa.

### Histórico

Cada mutação (criar, editar, desativar) cria um `RegraRepasseHistorico` com:
- Snapshot dos dados anteriores (JSON)
- Snapshot dos dados novos (JSON)
- Quem alterou e quando

### Arquivos
- `src/components/terapeutas/regra-repasse-form.tsx` (criar)

---

## Fase 4: Polish e Integração

### Listagem `/terapeutas`
- Botão "Ver detalhes" no dialog → link para `/terapeutas/[id]` (ou manter ambos)
- Coluna "Regras" na tabela com count

### Loading & Empty States
- Skeleton por tab (tabelaLoading, agendaLoading, etc.)
- Empty states: "Nenhum agendamento", "Nenhum paciente", "Nenhuma regra de repasse"

### Build & Verificação
- `npm run build` passando
- Testar fluxo: criar profissional → abrir detalhe → criar regra de repasse → editar → desativar

---

## Arquivos Críticos de Referência

| Arquivo | Para que serve |
|---------|---------------|
| `prisma/schema.prisma` | Schema — adicionar models e enums |
| `src/app/api/convenios/[id]/route.ts` | Padrão de API detalhe |
| `src/app/api/convenios/[id]/tabela/route.ts` | Padrão de CRUD sub-recurso |
| `src/app/convenios/[id]/page.tsx` | Padrão de página com tabs |
| `src/components/convenios/convenio-tabela-form.tsx` | Padrão de form dialog |
| `src/app/terapeutas/page.tsx` | Listagem atual de profissionais |
| `src/components/terapeuta-details-dialog.tsx` | Dialog atual (será substituído por link) |
| `src/components/forms/editar-terapeuta-form.tsx` | Form de edição (reutilizar no detalhe) |
| `src/lib/auth/server.ts` | getAuthenticatedUser, hasPermission |

## Verificação Final

```bash
npm run build          # TS + ESLint sem erros
npm run dev            # Testar navegação e CRUD completo
npx prisma studio      # Verificar dados no banco
```

Fluxo de teste E2E:
1. Abrir /terapeutas → tabela de profissionais
2. Clicar no nome de um profissional → /terapeutas/[id]
3. Tab Dados Gerais: verificar informações exibidas
4. Tab Agenda: verificar agendamentos listados
5. Tab Pacientes: verificar pacientes vinculados
6. Tab Regras de Repasse: empty state
7. Criar regra (percentual, 40%, convênio X, sem procedimento específico)
8. Criar segunda regra (valor fixo, R$ 80, convênio Y, procedimento Z)
9. Tentar criar regra conflitante → deve retornar erro 409
10. Editar regra → verificar histórico
11. Desativar regra → verificar badge "Inativa"
