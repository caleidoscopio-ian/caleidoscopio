# ESTIMATIVA - MÓDULOS 19 E 20

## Aditivo ao Contrato - Sistema Caleidoscópio Educacional

**Data:** 06 de Fevereiro de 2026
**Versão:** 1.0

---

## 📋 SUMÁRIO

Este documento detalha a estimativa para inclusão de 2 novos módulos no aditivo contratual:

- **Módulo 19:** Gestão de Permissões (RBAC)
- **Módulo 20:** Evolução de Atividades por Fases

---

## 🔐 MÓDULO 19: GESTÃO DE PERMISSÕES (RBAC)

### Contexto:

Sistema atual possui apenas 3 roles fixas (SUPER_ADMIN, ADMIN, USER) com verificação binária. Não há controle granular de permissões por funcionalidade.

---

### 19.1 - CRUD de Roles (Perfis)

**Funcionalidades:**

- ✅ Criar novos perfis personalizados
  - Nome do perfil (ex: "Supervisor Clínico", "Recepcionista", "Terapeuta", "Estagiário")
  - Descrição detalhada
  - Status (Ativo/Inativo)
  - Proteção: roles do sistema (SUPER_ADMIN, ADMIN) não podem ser editadas/deletadas
- ✅ Listar todos os perfis
  - Tabela com filtros
  - Ordenação
  - Busca por nome
  - Badge mostrando quantidade de usuários por perfil
- ✅ Editar perfis personalizados
  - Alterar nome, descrição
  - Ativar/desativar
  - Não permite editar roles do sistema
- ✅ Desativar perfis (soft delete)
  - Não deleta para preservar histórico
  - Usuários com perfil desativado perdem acesso (ou são realocados)

**Modelo de Dados:**

```prisma
model Role {
  id          String   @id @default(uuid())
  tenantId    String   // Isolamento multi-tenant
  nome        String
  descricao   String?  @db.Text
  isSystem    Boolean  @default(false) // true para SUPER_ADMIN, ADMIN
  ativo       Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @default(now()) @updatedAt

  usuarios    UsuarioRole[]
  permissoes  RolePermissao[]

  @@unique([tenantId, nome])
  @@map("roles")
}
```

**Complexidade:** Média
**Estimativa:** 20 horas

**Breakdown:**

- Modelo de dados (Prisma schema): 3h
- API CRUD completa: 6h
- Interface de listagem: 5h
- Formulário criar/editar: 4h
- Validações e proteções: 2h

---

### 19.2 - Matriz de Permissões

**Funcionalidades:**

- ✅ Definir recursos/módulos do sistema
  - Dashboard
  - Pacientes
  - Agenda
  - Atividades
  - Curriculums
  - Prontuários
  - Avaliações
  - Sessões
  - Relatórios
  - Terapeutas/Profissionais
  - Salas
  - Procedimentos
  - Usuários
  - Configurações

- ✅ Definir ações por recurso (CRUD + especiais)
  - `VIEW` - Visualizar
  - `CREATE` - Criar
  - `UPDATE` - Editar
  - `DELETE` - Deletar
  - `EXPORT` - Exportar dados
  - `APPROVE` - Aprovar (para fluxos específicos)
  - `MANAGE` - Gerenciar (acesso total)

- ✅ Interface de atribuição de permissões
  - Grid/Tabela: Recursos (linhas) × Ações (colunas)
  - Checkboxes para marcar permissões
  - Salvar em lote
  - Duplicar permissões de outro perfil (template)

- ✅ Permissões herdadas
  - `MANAGE` inclui automaticamente todas as outras ações
  - Indicação visual de permissões implícitas

**Modelo de Dados:**

```prisma
model Recurso {
  id          String   @id @default(uuid())
  codigo      String   @unique // "pacientes", "agenda", "atividades"
  nome        String   // "Pacientes", "Agenda", "Atividades"
  descricao   String?  @db.Text
  modulo      String?  // Agrupamento visual
  ordem       Int      @default(0)
  ativo       Boolean  @default(true)

  permissoes  RolePermissao[]

  @@map("recursos")
}

model Acao {
  id          String   @id @default(uuid())
  codigo      String   @unique // "view", "create", "update", "delete"
  nome        String   // "Visualizar", "Criar", "Editar", "Deletar"
  ordem       Int      @default(0)

  @@map("acoes")
}

model RolePermissao {
  id          String   @id @default(uuid())
  roleId      String
  recursoId   String
  acaoCodigo  String   // "view", "create", "update", "delete", "export", "manage"
  concedida   Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @default(now()) @updatedAt

  role        Role     @relation(fields: [roleId], references: [id], onDelete: Cascade)
  recurso     Recurso  @relation(fields: [recursoId], references: [id], onDelete: Cascade)

  @@unique([roleId, recursoId, acaoCodigo])
  @@map("role_permissoes")
}
```

**Complexidade:** Alta
**Estimativa:** 35 horas

**Breakdown:**

- Modelo de dados (Recursos, Ações, RolePermissao): 5h
- Seed de recursos e ações pré-cadastrados: 4h
- API para gerenciar permissões: 8h
- Interface de matriz (grid de checkboxes): 10h
- Funcionalidade duplicar permissões: 4h
- Validações e regras: 4h

---

### 19.3 - Gestão de Usuários e Atribuição de Roles

**Funcionalidades:**

- ✅ Listar todos os usuários do tenant
  - Integração com Sistema 1 (SSO)
  - Nome, email, role atual, status
  - Filtros: por role, status, nome, email
  - Paginação
  - Busca

- ✅ Visualizar detalhes do usuário
  - Dados pessoais
  - Role atual
  - Permissões efetivas (lista completa baseada na role)
  - Data da última alteração de role
  - Histórico de alterações (se aplicável)

- ✅ Alterar role do usuário
  - Modal/Dialog para selecionar nova role
  - Dropdown com todas as roles ativas
  - Campo de justificativa (opcional)
  - Confirmação antes de aplicar
  - Notificação ao usuário (email/in-app)

- ✅ Desativar acesso de usuário
  - Marcar como inativo
  - Remove permissões efetivas
  - Preserva histórico

**Modelo de Dados:**

```prisma
model UsuarioRole {
  id          String   @id @default(uuid())
  usuarioId   String   // ID do usuário no Sistema 1
  tenantId    String   // Isolamento
  roleId      String
  atribuida_em DateTime @default(now())
  atribuida_por String  // userId de quem atribuiu
  ativa       Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @default(now()) @updatedAt

  role        Role     @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@unique([usuarioId, tenantId])
  @@map("usuario_roles")
}

model UsuarioRoleHistorico {
  id              String   @id @default(uuid())
  usuarioId       String
  tenantId        String
  roleAnteriorId  String?
  roleNovaId      String
  alterado_por    String   // userId de quem alterou
  alterado_em     DateTime @default(now())
  justificativa   String?  @db.Text

  @@map("usuario_role_historico")
}
```

**Complexidade:** Alta
**Estimativa:** 30 horas

**Breakdown:**

- Modelo de dados (UsuarioRole, Histórico): 4h
- API de listagem com filtros: 6h
- API de alteração de role: 5h
- Interface de listagem: 8h
- Modal de alteração de role: 5h
- Histórico de alterações: 2h

---

### 19.4 - Proteção de Rotas e Verificação de Permissões

**Funcionalidades:**

- ✅ Middleware/HOC para proteção de páginas

  ```tsx
  <RequirePermission resource="pacientes" action="view">
    <PacientesPage />
  </RequirePermission>
  ```

- ✅ Hook customizado `usePermissions()`

  ```tsx
  const { can, canAny, canAll } = usePermissions();

  if (can("pacientes", "create")) {
    // Mostrar botão "Novo Paciente"
  }
  ```

- ✅ Proteção em rotas API (Backend)
  - Middleware para verificar permissões antes de executar ação
  - Retornar 403 Forbidden se não tiver permissão
  - Logs de tentativas de acesso negado

- ✅ Componente visual de "Sem Permissão"
  - Página 403 customizada
  - Mensagem clara
  - Sugestão de contatar administrador

- ✅ Ocultação de elementos da UI
  - Botões/links que o usuário não tem permissão não aparecem
  - Tabs/abas inacessíveis ficam ocultas
  - Menus filtrados por permissão

**Complexidade:** Muito Alta
**Estimativa:** 40 horas

**Breakdown:**

- Hook `usePermissions()`: 8h
- Componente `<RequirePermission>`: 6h
- Middleware de API: 10h
- Página 403 customizada: 3h
- Refatoração de páginas existentes (adicionar verificações): 10h
- Testes de segurança: 3h

---

### 19.5 - Auditoria de Alterações

**Funcionalidades:**

- ✅ Log de todas as alterações de roles
  - Quem alterou
  - De qual role para qual role
  - Data e hora
  - Justificativa (se houver)

- ✅ Interface de consulta de auditoria
  - Filtros: usuário, data, quem alterou
  - Tabela de histórico
  - Exportação para Excel/CSV

**Complexidade:** Média
**Estimativa:** 15 horas

**Breakdown:**

- Modelo de dados (já criado no 19.3): 0h
- API de consulta de histórico: 5h
- Interface de auditoria: 8h
- Exportação: 2h

---

**TOTAL MÓDULO 19:** 140 horas

---

## 🎯 DEPENDÊNCIAS E INTEGRAÇÕES

### Módulo 19:

- ✅ Integração com Sistema 1 (SSO) - já existe
- ✅ Atualização de todas as páginas existentes para verificar permissões
- ✅ Refatoração de APIs para incluir verificação

## ⚠️ RISCOS E OBSERVAÇÕES

### Módulo 19:

- **Risco Médio:** Refatoração de código existente para adicionar verificações de permissão pode gerar bugs temporários
- **Mitigação:** Testes extensivos, deploy gradual por módulo

**FIM DA ESTIMATIVA**
