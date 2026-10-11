---
paths:
  - "src/components/**/*.tsx"
  - "src/app/**/page.tsx"
---

# Frontend — React, UI e Acessibilidade

## Stack UI

- **shadcn/ui** (estilo New York) — componentes base em `src/components/ui/`
- **Lucide React** — ícones
- **Tailwind CSS v4** — estilização
- **React Hook Form + Zod** — formulários e validação
- **Sonner** — toast notifications
- **date-fns** — manipulação de datas

## Estrutura de Componentes

```
src/components/
├── ui/              # shadcn/ui base (NÃO editar manualmente, usar `npx shadcn add`)
├── forms/           # Formulários de CRUD (novo-*, editar-*, excluir-*)
├── [módulo]/        # Componentes por feature (atividades/, curriculum/, avaliacoes/)
├── main-layout.tsx  # Layout principal
└── app-sidebar.tsx  # Sidebar com navegação role-based
```

## Padrões de Página

```tsx
'use client';

import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import { MainLayout } from '@/components/main-layout';

export default function NomePage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        {/* conteúdo */}
      </MainLayout>
    </ProtectedRoute>
  );
}
```

## Navegação

- Sidebar role-based definida em `src/lib/navigation.ts`
- Função `getSidebarItems(userRole)` retorna items por role
- Roles: patient, therapist, guardian, admin, super_admin

## Acessibilidade (WCAG 2.1 AA)

- Todos elementos interativos acessíveis via teclado
- ARIA labels para screen readers
- Contraste de cor > 4.5:1
- Indicadores de foco visíveis
- Respeitar prefers-reduced-motion

## Considerações TEA

- UI simples e clara, sem elementos que sobrecarreguem
- Padrões de navegação consistentes
- Indicadores visuais de progresso
- Níveis de dificuldade customizáveis
- Mecanismos de reforço positivo

## Formulários

- Sempre usar React Hook Form com resolver Zod
- Validação no client E no server (API route)
- Feedback visual de erros inline
- Loading states durante submissão

## Relatórios — não escrever tela nova

A Central de Relatórios (`/relatorios`) é dirigida por catálogo. Um relatório é
uma **declaração** em `@/lib/relatorios/definicoes`, não uma página:

```typescript
{
  slug: 'atendimentos',
  recurso: 'relatorios',          // RBAC: slug do seed
  acaoVisualizar: 'view_reports', // RBAC: action-key
  fonte: 'atendimentos',          // de onde vêm as linhas
  dimensoes: [...],               // o que dá para agrupar
  metricas: [...],                // o que dá para somar
  filtros: ['periodo', 'filialId', ...],
  agrupamentoPadrao: ['filial', 'especialidade'],
}
```

Quem renderiza é `src/app/relatorios/[slug]/page.tsx`, e quem responde é
`GET /api/relatorios/[slug]`. O índice se monta a partir do catálogo e esconde
os cartões cujo `recurso` o usuário não pode ver.

**Relatório novo = entrada no catálogo.** Criar página só se a tela não couber na
casca (filtros + agrupamento em até 3 níveis + tabela com subtotais). Relatório
que já existe fora da central entra com `fonte: 'externo'` e `hrefExterno` — o
catálogo indexa, não reimplementa.

Peças reaproveitáveis: `BarraFiltros`, `SeletorAgrupamento`, `TabelaAgrupada`
(em `@/components/relatorios`) e `formatarMetrica` (`@/lib/relatorios/formatacao`).

### Métrica derivada: dividir depois de somar

Métrica de razão (ticket médio) se declara com `agregacao: 'razao'` + `numerador`
e `denominador`, e o motor recalcula em **cada nível**. Somar os ticket-médios
dos filhos daria média de médias — errado sempre que os grupos têm tamanhos
diferentes (num caso real: R$ 258,34 em vez de R$ 150,00).

### `null` não é zero

Atendimento sem preço cadastrado grava `valor_cobrado = null` de propósito (não
trava o fluxo da recepção). Então **toda célula de relatório distingue "—" de
"R$ 0,00"**: um grupo em que nenhuma linha tem valor devolve `null`, e o campo
`semValor` conta quantas linhas ficaram fora do número, exibido como aviso.

### Gráfico: uma métrica, cores em ordem fixa

`GraficoRelatorio` plota **uma métrica por vez**. "Atendimentos" e "Valor total"
têm escalas diferentes; juntá-los exigiria dois eixos y, e aí a comparação visual
passa a depender de onde cada eixo foi ancorado. Quem quer outra métrica troca no
seletor — nunca adicionar um segundo eixo.

A paleta tem **6 slots em ordem fixa** (`--viz-serie-1..6` em `globals.css`), com
passos próprios para claro e escuro. **A ordem é o mecanismo de segurança para
daltonismo**, não escolha estética: foi validada com o validador da skill
`dataviz` contra as superfícies reais do projeto. Do 7º grupo em diante, agrupar
em "Outros" — nunca gerar cor nova nem ciclar a paleta.

Outras regras que valem para qualquer gráfico aqui:

- Empilhamento e pizza **só para métrica somável**. Fatiar uma razão (ticket
  médio, % de repasse) não significa nada.
- Grupo com valor nulo **sai do gráfico** e é contado numa nota. Barra zerada
  afirmaria algo que o dado não diz.
- Barra com no máximo 24px, ponta arredondada só no topo, vão de 2px na cor da
  superfície entre segmentos, grade só horizontal e hairline.
- Legenda a partir de 2 séries; série única não tem legenda (o título já diz).
- O gráfico entra por `next/dynamic` — o recharts pesa ~130 kB e só serve quando
  há gráfico na tela.

### Preferências de relatório

`usePreferenciasRelatorio` guarda colunas, agrupamento e tipo de gráfico em
`localStorage`, **com o id do usuário na chave** (computador de recepção é
compartilhado). O que vem do storage é sempre validado contra o catálogo atual
antes de ser usado: métrica renomeada ou dimensão removida é descartada, em vez
de deixar a tabela sem coluna nenhuma.

### Exportação

Sai do resultado **já carregado na tela**, não de uma nova consulta — assim o
arquivo e a tela não podem divergir. No CSV a hierarquia é dado (colunas de nível
preenchidas em cascata), não indentação, para a planilha conseguir filtrar;
vírgula decimal e BOM UTF-8 por causa do Excel pt-BR; e `null` vira célula vazia,
nunca zero.

## Convênio do atendimento — só os do paciente

O dropdown de Convênio no agendamento oferece **"Particular" + os convênios do
próprio paciente**, nunca a lista inteira da clínica.

Oferecer todos permitia marcar um atendimento num convênio que o paciente não
tem — e aconteceu: um paciente da unimed foi marcado como HAPVIDA. Como o
agendamento **não guarda** o convênio escolhido, tudo a jusante relê
`paciente.convenioId` (unimed), o preço era procurado na tabela da unimed (que
não tem aquele procedimento) e o relatório mostrava unimed como parceiro. Um
erro de digitação virava dois sintomas sem explicação.

A lista vem de `PacienteConvenio` (N:M) **com fallback para o campo legado
`paciente.convenioId`** — há pacientes com só o legado preenchido, e sem o
fallback eles ficariam restritos a Particular.

```typescript
const daTabela = pac.convenios?.map(...) ?? [];
const legado = pac.convenioId && !daTabela.some(c => c.id === pac.convenioId)
  ? [{ id: pac.convenioId, nome: ... }] : [];
const conveniosDoPaciente = [...daTabela, ...legado];
```

Pré-seleção: um convênio só é pré-selecionado quando o paciente tem **exatamente
um**. Com dois, a escolha é do atendimento e precisa ser explícita.

**Consequência desejada**: a restrição não esconde cadastro errado, ela o expõe.
Se o paciente está registrado num convênio cujo procedimento não tem preço, o
relatório mostra "sem valor" — e aí a correção é no cadastro (`/pacientes` ou
`/convenios`), não na marcação.

> O agendamento ainda não guarda o convênio escolhido. Com até um convênio por
> paciente a derivação atual está correta (`valor_particular` preenchido ⇒
> particular; senão ⇒ o convênio do paciente). Paciente com **dois** convênios
> torna isso ambíguo e exigirá `agendamento.convenioId` — o modelo já suporta
> via `PacienteConvenio`, nenhum paciente está nessa situação hoje.
