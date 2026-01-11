# Implementação de Atividades com Abas - Plano Completo

## 📋 Contexto

Reestruturação da página de Atividades Clínicas para seguir o mesmo padrão das Avaliações, com sistema de abas para organizar melhor os dados.

## ✅ Completado

### 1. Schema Prisma (`prisma/schema.prisma`)

#### Model `atividade` - Novos campos:
```prisma
protocolo                  String?  // VB-MAPP, AFLS, etc
habilidade                 String?  // Competências Sociais, etc
marco_codificacao          String?  // Campo livre
tipo_ensino                String?  // Tentativa Discreta, etc
qtd_alvos_sessao           Int?     // 1-50
qtd_tentativas_alvo        Int?     // 1-50
pontuacoes                 atividadePontuacao[]  // Nova relação
```

#### Model `atividadeInstrucao` - Campo adicionado:
```prisma
como_aplicar  String?  @db.Text  // Como aplicar (descrição)
```

#### Novo Model `atividadePontuacao`:
```prisma
model atividadePontuacao {
  id           String   @id @default(uuid())
  atividadeId  String
  ordem        Int
  sigla        String   // -, AFT, AFP, AI, AG, AVE, AVG, +
  grau         String   // Erro, Independente, Alta, Média, Baixa
  createdAt    DateTime @default(now())
  updatedAt    DateTime @default(now()) @updatedAt
  atividade    atividade @relation(fields: [atividadeId], references: [id], onDelete: Cascade)

  @@unique([atividadeId, ordem])
  @@map("atividade_pontuacoes")
}
```

### 2. API `/api/atividades` - Parcialmente atualizado

- ✅ GET com suporte para busca por ID
- ✅ GET incluindo pontuações
- 🔄 POST aceita novos campos (falta completar)
- ❌ PUT precisa ser atualizado

---

## 🚀 Plano de Implementação

### FASE 1: Finalizar API de Atividades

#### Arquivo: `src/app/api/atividades/route.ts`

**1.1. Completar POST**

Adicionar após a criação da atividade:
```typescript
// Criar instruções (se houver)
if (instrucoes && Array.isArray(instrucoes) && instrucoes.length > 0) {
  await tx.atividadeInstrucao.createMany({
    data: instrucoes.map((inst: any, index: number) => ({
      id: randomUUID(),
      atividadeId: atividade.id,
      ordem: inst.ordem || index + 1,
      texto: inst.texto,
      como_aplicar: inst.como_aplicar || null,
      observacao: inst.observacao || null,
    })),
  });
}

// Criar pontuações (se houver)
if (pontuacoes && Array.isArray(pontuacoes) && pontuacoes.length > 0) {
  await tx.atividadePontuacao.createMany({
    data: pontuacoes.map((pont: any) => ({
      id: randomUUID(),
      atividadeId: atividade.id,
      ordem: pont.ordem,
      sigla: pont.sigla,
      grau: pont.grau,
    })),
  });
}

// Buscar atividade completa para retornar
return await tx.atividade.findUnique({
  where: { id: atividade.id },
  include: {
    instrucoes: { orderBy: { ordem: "asc" } },
    pontuacoes: { orderBy: { ordem: "asc" } },
  },
});
```

**1.2. Atualizar PUT**

Seguir o mesmo padrão do POST, mas usar `upsert` ou deletar/recriar instruções e pontuações.

Padrão a seguir (como em `/api/avaliacoes`):
- Deletar instruções/pontuações antigas
- Criar novas
- Retornar atividade atualizada

---

### FASE 2: Criar Componentes de Abas

#### Estrutura de Arquivos:
```
src/components/atividades/
├── aba-geral.tsx
├── aba-pontuacao.tsx
└── aba-instrucoes.tsx
```

**Padrão a seguir:** Componentes de `/src/components/avaliacoes/`

---

#### 2.1. Componente `aba-geral.tsx`

**Referência:** `src/components/avaliacoes/aba-geral.tsx`

**Props:**
```typescript
interface AbaGeralProps {
  atividadeId: string | null;
  onSave: () => void;
}
```

**Campos:**
1. **Protocolo** (Select):
   - VB-MAPP
   - AFLS
   - Socially Savvy
   - Barreiras comportamentais
   - Portage
   - Denver
   - Escala de Desenvolvimento Motor
   - Vineland-3
   - Outros

2. **Nome** (Input text)

3. **Habilidade** (Select):
   - Competências Sociais
   - Comportamentos de Atenção Conjunta
   - Competências Sociais com Pares
   - Cognição
   - Jogo
   - Jogo de Representação
   - Motricidade Fina
   - Motricidade Grossa
   - Comportamento
   - Comunicação Receptiva
   - Comunicação Expressiva
   - Independência Pessoal
   - Independência Pessoal:Alimentação
   - Independência Pessoal:Vestir
   - Independência Pessoal:Higiene
   - Independência Pessoal:Tarefas
   - Independência Pessoal:Adultos
   - Imitação Motora
   - Outros

4. **Marco/Codificação** (Input text)

5. **Tipo Ensino** (Select):
   - Tentativa Discreta-Estruturada
   - Análise de Tarefas
   - Ensino Naturalístico
   - Tentativa Discreta-Intercalada
   - Frequência
   - Duração
   - Outros

6. **Quantidade Alvos por Sessão** (Number: 1-50)

7. **Quantidade tentativas cada Alvo** (Number: 1-50)

**Estado e Lógica:**
```typescript
const [formData, setFormData] = useState({
  protocolo: "",
  nome: "",
  habilidade: "",
  marco_codificacao: "",
  tipo_ensino: "",
  qtd_alvos_sessao: 1,
  qtd_tentativas_alvo: 1,
});

// Carregar dados se atividadeId existir
useEffect(() => {
  if (atividadeId) {
    fetchAtividade();
  }
}, [atividadeId]);

const handleSave = async () => {
  const response = await fetch("/api/atividades", {
    method: atividadeId ? "PUT" : "POST",
    headers: { /* auth headers */ },
    body: JSON.stringify(formData),
  });
  // ...
};
```

---

#### 2.2. Componente `aba-pontuacao.tsx`

**Referência:** `src/components/avaliacoes/aba-pontuacao.tsx`

**Estrutura:**
- Tabela com colunas: Ordem, Sigla, Grau, Ações
- Botão "Adicionar Pontuação/Dica"
- Dialog para adicionar/editar

**Campos do Dialog:**
1. **Ordem** (Number)
2. **Sigla** (Select):
   - \-
   - AFT
   - AFP
   - AI
   - AG
   - AVE
   - AVG
   - \+

3. **Grau** (Select):
   - Erro
   - Independente
   - Alta
   - Média
   - Baixa

**Estado:**
```typescript
const [pontuacoes, setPontuacoes] = useState<Pontuacao[]>([]);
const [dialogOpen, setDialogOpen] = useState(false);
const [editingId, setEditingId] = useState<string | null>(null);
const [formData, setFormData] = useState({
  ordem: 1,
  sigla: "",
  grau: "",
});
```

**CRUD Completo:**
- CREATE: Adicionar à lista local
- READ: Buscar do servidor
- UPDATE: Editar item
- DELETE: Remover da lista
- SAVE: Enviar todas para o servidor

---

#### 2.3. Componente `aba-instrucoes.tsx`

**Referência:** `src/components/avaliacoes/aba-tarefas.tsx`

**Estrutura:**
- Tabela com colunas: Ordem, Instrução, Como Aplicar, Ações
- Botão "Adicionar Instrução"
- Dialog para adicionar/editar

**Campos do Dialog:**
1. **Ordem** (Number)
2. **Instrução** (Textarea) - O que fazer
3. **Como Aplicar** (Textarea) - Descrição de como aplicar
4. **Observação** (Textarea - opcional)

**Estado:**
```typescript
const [instrucoes, setInstrucoes] = useState<Instrucao[]>([]);
const [dialogOpen, setDialogOpen] = useState(false);
const [editingId, setEditingId] = useState<string | null>(null);
const [formData, setFormData] = useState({
  ordem: 1,
  texto: "",
  como_aplicar: "",
  observacao: "",
});
```

---

### FASE 3: Criar Página Nova Atividade

#### Arquivo: `src/app/atividades-clinicas/nova/page.tsx`

**Referência:** `src/app/avaliacoes/nova/page.tsx`

**Estrutura:**
```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/main-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AbaGeral } from "@/components/atividades/aba-geral";
import { AbaPontuacao } from "@/components/atividades/aba-pontuacao";
import { AbaInstrucoes } from "@/components/atividades/aba-instrucoes";

export default function NovaAtividadePage() {
  const router = useRouter();
  const [atividadeId, setAtividadeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("geral");

  const handleAtividadeCriada = (id: string) => {
    setAtividadeId(id);
    setActiveTab("pontuacao"); // Avançar para próxima aba
  };

  return (
    <MainLayout breadcrumbs={[...]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Nova Atividade</h1>
          <p className="text-muted-foreground">
            Preencha as informações da atividade clínica
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="pontuacao" disabled={!atividadeId}>
              Pontuação/Dicas
            </TabsTrigger>
            <TabsTrigger value="instrucoes" disabled={!atividadeId}>
              Instruções
            </TabsTrigger>
          </TabsList>

          <TabsContent value="geral">
            <AbaGeral
              atividadeId={atividadeId}
              onSave={handleAtividadeCriada}
            />
          </TabsContent>

          <TabsContent value="pontuacao">
            <AbaPontuacao
              atividadeId={atividadeId}
              onSave={() => setActiveTab("instrucoes")}
            />
          </TabsContent>

          <TabsContent value="instrucoes">
            <AbaInstrucoes
              atividadeId={atividadeId}
              onSave={() => router.push("/atividades-clinicas")}
            />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
```

---

### FASE 4: Atualizar Página Principal

#### Arquivo: `src/app/atividades-clinicas/page.tsx`

**Mudanças:**
1. Trocar botão "Nova Atividade" que abre dialog
2. Por botão que redireciona para `/atividades-clinicas/nova`

```typescript
// ANTES
<NovaAtividadeForm onSuccess={fetchAtividades} />

// DEPOIS
<Button onClick={() => router.push("/atividades-clinicas/nova")}>
  <Plus className="mr-2 h-4 w-4" />
  Nova Atividade
</Button>
```

3. Atualizar tabela para mostrar novos campos (opcional)
4. Adicionar coluna "Pontuações" mostrando quantidade

---

## 🎯 Ordem de Implementação Recomendada

1. ✅ Schema Prisma (FEITO)
2. ✅ API GET atualizada (FEITO)
3. 🔄 **Completar API POST** (EM ANDAMENTO)
4. ⏳ Atualizar API PUT
5. ⏳ Criar `aba-geral.tsx`
6. ⏳ Criar `aba-pontuacao.tsx`
7. ⏳ Criar `aba-instrucoes.tsx`
8. ⏳ Criar página `/nova`
9. ⏳ Atualizar página principal
10. ⏳ Testar fluxo completo

---

## 📝 Padrões a Seguir

### Consistência com Avaliações

**Sempre consultar:**
- `src/app/avaliacoes/nova/page.tsx` - Estrutura de abas
- `src/components/avaliacoes/aba-*.tsx` - Componentes de aba
- `src/app/api/avaliacoes/route.ts` - Padrão de API

### Multi-tenant
- Sempre filtrar por `tenantId` em queries
- Sempre associar `tenantId` em creates

### Autenticação
```typescript
const userDataEncoded = btoa(JSON.stringify(user));
headers: {
  "X-User-Data": userDataEncoded,
  "X-Auth-Token": user.token,
}
```

### Validações
- Campos obrigatórios no backend
- Feedback visual no frontend
- Mensagens de erro claras

### UI/UX
- Usar componentes shadcn/ui
- Seguir cores e espaçamentos existentes
- Responsividade (mobile-first)

---

## 🧪 Checklist de Testes

Após implementação completa:

- [ ] Criar nova atividade com todos os campos
- [ ] Salvar aba Geral e continuar para Pontuação
- [ ] Adicionar múltiplas pontuações/dicas
- [ ] Adicionar múltiplas instruções
- [ ] Salvar e verificar na lista principal
- [ ] Editar atividade existente
- [ ] Verificar multi-tenant (dados isolados por clínica)
- [ ] Testar responsividade (mobile)
- [ ] Verificar em produção (build)

---

## 📊 Progresso Atual

- [x] Schema Prisma
- [x] API GET
- [x] API POST
- [x] API PUT
- [x] Componente aba-geral
- [x] Componente aba-pontuacao
- [x] Componente aba-instrucoes
- [x] Página /nova
- [x] Atualizar página principal
- [ ] Testes

**Status:** Implementação completa! Pronto para testes.
