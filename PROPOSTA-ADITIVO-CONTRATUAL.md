# ESCOPO TÉCNICO - ADITIVO CONTRATUAL
## Sistema Caleidoscópio Educacional - Módulos Financeiros + Gestão + Evolução Clínica

**Data:** 06 de Fevereiro de 2026
**Cliente:** Caleidoscópio Educacional
**Referência:** Novo Escopo - Módulos Financeiros + Gestão + Evolução Clínica
**Versão:** 3.0 - ATUALIZADA

---

## 📋 SUMÁRIO EXECUTIVO

Este documento apresenta a proposta comercial para desenvolvimento de **novas funcionalidades financeiras, de gestão e clínicas** para o Sistema Caleidoscópio Educacional, configurando um **aditivo contratual** ao projeto original.

### Principais Entregas:

**Módulos Financeiros (14-18):**
- ✅ Gestão Financeira Completa (Contas a Pagar e Receber)
- ✅ Conciliação Bancária Automatizada
- ✅ Gestão de Convênios e Faturamento TISS
- ✅ Controle de Glosas e Recursos
- ✅ Confirmação Automática de Agendamentos
- ✅ Mapa de Ocupação de Salas
- ✅ Taxa de Agendamento por Profissional
- ✅ Gestão de Bloqueios e Compromissos

**Módulos de Gestão e Evolução Clínica (19-20):**
- ✅ Sistema de Permissões RBAC (Controle granular de acesso)
- ✅ Evolução de Atividades por Fases (Linha de Base, Intervenção, Manutenção, Generalização)
- ✅ Clonagem e personalização de atividades por paciente
- ✅ Parametrização de critérios de evolução
- ✅ Cálculo automático de progresso e avanço de fases

---

## 🎯 DETALHAMENTO DAS FUNCIONALIDADES

### 2.1 Cadastro de Profissionais - Regras de Repasse
**Prioridade:** 🔴 Alta

**Descrição:**
- Nova aba "Configurações Financeiras" no cadastro de profissionais
- Múltiplos tipos de repasse (percentual, valor fixo, hora, misto)
- Regras por critério (tipo de atendimento, convênio, modalidade, horário)
- Histórico de alterações com vigência
- Validação de conflitos

**Complexidade:** Média-Alta
**Estimativa:** 40 horas

**Breakdown:**
- Interface de configuração: 12h
- Lógica de cálculo de repasse: 14h
- Validações e histórico: 8h
- Testes e ajustes: 4h
- Documentação: 2h

---

### 2.2 Gestão de Convênios
**Prioridade:** 🔴 Alta

**Descrição:**
- CRUD completo de convênios
- Dados básicos (razão social, CNPJ, contato)
- Configurações financeiras (tabela de valores, prazos)
- Parâmetros TISS/SADT
- Anexos de contratos e tabelas
- Histórico de negociações

**Complexidade:** Alta
**Estimativa:** 50 horas

**Breakdown:**
- CRUD de convênios: 14h
- Tabela de valores por procedimento: 14h
- Configurações TISS/SADT: 10h
- Upload e gestão de anexos: 8h
- Testes e validações: 2h

---

### 2.3 Relatório de Contas a Pagar (Profissionais)
**Prioridade:** 🔴 Alta

**Descrição:**
- Listagem de valores a pagar aos profissionais
- Filtros (período, profissional, status)
- Cálculo automático baseado em regras de repasse
- Totalizadores
- Ações (marcar como agendado, pagar, gerar recibo)
- Exportação PDF/Excel

**Complexidade:** Média-Alta
**Estimativa:** 35 horas

**Breakdown:**
- Interface de listagem e filtros: 10h
- Cálculos de repasse: 10h
- Ações e fluxo de pagamento: 8h
- Exportação (PDF/Excel): 5h
- Testes: 2h

---

### 2.4 Relatório de Contas a Receber
**Prioridade:** 🔴 Alta

#### 2.4.1 Convênios
**Descrição:**
- Acompanhamento de faturamentos
- Controle de lotes
- Gestão de envios
- Previsão de recebimento
- Conciliação bancária (importar XML)
- Exportação

**Complexidade:** Muito Alta
**Estimativa:** 55 horas

**Breakdown:**
- Gestão de lotes de faturamento: 16h
- Controle de envios e protocolos: 14h
- Conciliação XML: 12h
- Relatórios e exportação: 10h
- Testes: 3h

#### 2.4.2 Particulares
**Descrição:**
- Gestão de crédito com pacientes
- Métodos de pagamento
- Histórico de pagamentos
- Lembretes automáticos
- Gestão de parcelas
- Relatório de inadimplência
- Valor acordado por paciente
- Data de vencimento

**Complexidade:** Alta
**Estimativa:** 45 horas

**Breakdown:**
- Gestão de cobranças particulares: 14h
- Sistema de lembretes: 10h
- Gestão de parcelas: 10h
- Configuração de valores acordados: 8h
- Relatórios: 3h

---

### 2.5 Relatório de Atendimentos Glosados
**Prioridade:** 🟡 Média

**Descrição:**
- Dashboard com indicadores de glosa
- Detalhamento por atendimento
- Motivos e categorização
- Análise por convênio
- Processo de recurso
- Exportação

**Complexidade:** Alta
**Estimativa:** 40 horas

**Breakdown:**
- Dashboard de glosas: 12h
- Categorização de motivos: 8h
- Processo de recurso: 10h
- Análises e relatórios: 8h
- Exportação: 2h

---

### 2.6 Conciliação por Atendimento
**Prioridade:** 🔴 Alta

**Descrição:**
- Rastreamento do ciclo financeiro (Executado → Faturado → Pago)
- Filtros avançados
- Visualização de detalhes completos
- Histórico de status
- Ações de conciliação

**Complexidade:** Muito Alta
**Estimativa:** 55 horas

**Breakdown:**
- Modelo de dados e ciclo financeiro: 14h
- Interface de conciliação: 16h
- Visualização de detalhes: 10h
- Ações e fluxo: 12h
- Testes: 3h

---

### 2.7 Upload de XML/Demonstrativo
**Prioridade:** 🔴 Alta

**Descrição:**
- Upload e validação de arquivos
- Parsing XML TISS, CSV
- Casamento automático
- Atualização de status
- Relatório de resultado
- Tratamento de divergências

**Complexidade:** Muito Alta
**Estimativa:** 57 horas

**Breakdown:**
- Parser XML TISS: 18h
- Algoritmo de casamento: 16h
- Validação e tratamento de erros: 12h
- Interface de upload: 8h
- Relatórios: 3h

---

### 2.8 Taxa de Agendamento por Profissional
**Prioridade:** 🟡 Média

**Descrição:**
- Configuração de grade de atendimento
- Cálculo de taxa de ocupação
- Relatórios visuais (cards, tabelas, gráficos)
- Integração com mapa de salas
- Indicadores em tempo real

**Complexidade:** Alta
**Estimativa:** 50 horas

**Breakdown:**
- Configuração de grade: 12h
- Cálculo de taxa de ocupação: 12h
- Relatórios visuais: 14h
- Gráficos e dashboards: 10h
- Testes: 2h

---

### 2.9 Tipos de Compromisso e Bloqueios
**Prioridade:** 🟡 Média

#### 2.9.1 Tipos de Compromisso
**Descrição:**
- Atendimento clínico, reunião, supervisão, administrativo
- Gestão de participantes
- Ocupação de sala opcional
- Cores e ícones diferenciados

**Complexidade:** Média
**Estimativa:** 25 horas

**Breakdown:**
- Tipos de evento na agenda: 10h
- Interface de criação: 8h
- Integração com agenda: 5h
- Testes: 2h

#### 2.9.2 Bloqueios de Agenda
**Descrição:**
- Bloqueios gerais (feriados, recessos)
- Bloqueios individuais (férias, faltas)
- Impacto na taxa de ocupação
- Interface de gestão

**Complexidade:** Média
**Estimativa:** 30 horas

**Breakdown:**
- Sistema de bloqueios: 12h
- Interface de configuração: 10h
- Integração com agenda: 6h
- Testes: 2h

---

### 2.10 Confirmação Automática de Agendamentos (Bot WhatsApp)
**Prioridade:** 🔴 Alta

**Descrição:**
- Integração com API de WhatsApp via Webhooks
- Templates de mensagem configuráveis
- Fluxo de conversa do robô
- Atualização automática da agenda
- Status de confirmação
- Relatórios de efetividade

**Complexidade:** Média
**Estimativa:** 55 horas

**Breakdown:**
- Integração WhatsApp API (Webhooks): 18h
- Sistema de templates: 8h
- Fluxo de conversa do robô: 12h
- Atualização automática de agenda: 8h
- Relatórios de confirmação: 4h
- Testes e ajustes: 5h

---

### 2.11 Mapa de Ocupação de Salas
**Prioridade:** 🟡 Média

**Descrição:**
- Visão diária por sala
- Visão semanal (Kanban)
- Dashboard de ocupação
- Mapa das unidades
- Indicadores em tempo real

**Complexidade:** Alta
**Estimativa:** 43 horas

**Breakdown:**
- Grade diária por sala: 12h
- Visão semanal Kanban: 12h
- Dashboard de ocupação: 10h
- Mapa de calor: 6h
- Testes: 3h

---

### 2.12 Gestão de Permissões (RBAC) ⭐⭐
**Prioridade:** 🔴 Alta

**Descrição:**
Sistema completo de controle de permissões baseado em roles (perfis), permitindo criar perfis personalizados, gerenciar permissões granulares por módulo/funcionalidade e controlar acesso de usuários.

**Contexto:**
Atualmente o sistema possui apenas 3 roles fixas (SUPER_ADMIN, ADMIN, USER) com verificação binária simples. Não há controle granular de permissões por funcionalidade.

**Funcionalidades Principais:**
- CRUD de Roles/Perfis personalizados
- Matriz de Permissões (recursos × ações)
- Gestão de usuários e atribuição de roles
- Proteção granular de rotas (frontend e backend)
- Auditoria de alterações de permissões
- Hook `usePermissions()` para verificações na UI
- Componente `<RequirePermission>` para proteção de páginas

**Recursos Gerenciáveis:**
- Dashboard, Pacientes, Agenda, Atividades, Curriculums, Prontuários, Avaliações, Sessões, Relatórios, Profissionais, Salas, Procedimentos, Usuários, Configurações

**Ações por Recurso:**
- VIEW (Visualizar), CREATE (Criar), UPDATE (Editar), DELETE (Deletar), EXPORT (Exportar), APPROVE (Aprovar), MANAGE (Gerenciar)

**Complexidade:** Muito Alta
**Estimativa:** 140 horas

**Breakdown:**
- CRUD de Roles: 20h
- Matriz de Permissões: 35h
- Gestão de Usuários e Roles: 30h
- Proteção de Rotas (Frontend + Backend): 40h
- Auditoria: 15h

---

### 2.13 Evolução de Atividades por Fases ⭐⭐⭐
**Prioridade:** 🔴 Alta

**Descrição:**
Sistema avançado de evolução de atividades por fases (Linha de Base, Intervenção, Manutenção, Generalização) com clonagem de atividades ao atribuir ao paciente, parametrização individual de critérios de evolução e cálculo automático de avanço entre fases.

**Problema Atual:**
- Quando altera atividade no plano do paciente, afeta a atividade global para todos
- Não há níveis de evolução estruturados
- Não há critérios parametrizados de avanço

**Funcionalidades Principais:**

**1. Clonagem de Atividades:**
- Criar cópia independente ao atribuir curriculum ao paciente
- Alterações na cópia NÃO afetam atividade original
- Atividade original permanece como template

**2. Sistema de 4 Fases:**
- Linha de Base (avaliação inicial)
- Intervenção (ensino ativo)
- Manutenção (consolidação)
- Generalização (aplicação em contextos variados)
- Cada atividade evolui individualmente
- Evolução automática baseada em critérios

**3. Parametrização de Critérios por Fase:**
- Setor Sessão: mínimo tentativas corretas, total tentativas, sessões consecutivas
- Setor Alvos/Estímulos: para onde avançar se atingir/não atingir critério
- Valores padrão configuráveis pelo terapeuta
- Critérios independentes para cada fase

**4. Cálculo Automático:**
- Registro de tentativas durante sessão (corretas, incorretas, independentes, com ajuda)
- Cálculo automático de % acerto
- Verificação de critérios ao finalizar sessão
- Evolução automática de fase quando atingir critérios
- Alertas visuais de evolução

**5. Painel de Evolução:**
- Nova página de acompanhamento por paciente/curriculum
- Visualização de todas as atividades e suas fases atuais
- Badges coloridos por fase
- Edição de atividades clonadas
- Alteração manual de fase (com confirmação)
- Histórico de evoluções

**Complexidade:** Muito Alta
**Estimativa:** 235 horas

**Breakdown:**
- Clonagem de Atividades: 45h
- Sistema de Fases: 15h
- Parametrização de Critérios: 40h
- Cálculo Automático e Evolução: 60h
- Painel de Evolução: 50h
- Edição de Atividades Clonadas: 25h

---

## ⏱️ ESTIMATIVA DE TEMPO TOTAL

### Agrupamento por Módulos:

| Módulo | Funcionalidades | Horas |
|--------|-----------------|-------|
| **Módulo 14** | Gestão de Convênios + Faturamento | 106h |
| **Módulo 15** | Controle Financeiro + Repasses + Contas a Pagar/Receber | 130h |
| **Módulo 16** | Conciliação Bancária + Upload XML + Glosas | 154h |
| **Módulo 17** | Inteligência de Agenda + Taxa Ocupação + Mapa Salas + Bloqueios | 120h |
| **Módulo 18** | Confirmação Automática (Bot WhatsApp/SMS) | 70h |
| **Módulo 19** | Gestão de Permissões (RBAC) | 140h |
| **Módulo 20** | Evolução de Atividades por Fases | 235h |
| **TOTAL** | **7 Módulos Completos** | **955h** |

### Breakdown Detalhado:

**🔴 Alta Prioridade (822h):**
- Gestão de Convênios: 50h → **Módulo 14 parcial**
- Regras de Repasse: 40h → **Módulo 15 parcial**
- Contas a Pagar: 35h → **Módulo 15 parcial**
- Contas a Receber (Convênios): 55h → **Módulo 15 parcial**
- Contas a Receber (Particulares): 45h → **Módulo 15 parcial**
- Conciliação por Atendimento: 55h → **Módulo 16 parcial**
- Upload XML/TISS: 57h → **Módulo 16 parcial**
- Bot WhatsApp (API/Webhooks): 55h → **Módulo 18**
- Gestão de Permissões (RBAC): 140h → **Módulo 19**
- Evolução de Atividades por Fases: 235h → **Módulo 20**

**🟡 Média Prioridade (133h):**
- Atendimentos Glosados: 40h → **Módulo 16 parcial**
- Taxa de Agendamento: 50h → **Módulo 17 parcial**
- Tipos de Compromisso: 25h → **Módulo 17 parcial**
- Bloqueios de Agenda: 30h → **Módulo 17 parcial**
- Mapa de Ocupação: 43h → **Módulo 17 parcial**

---

## 📅 CRONOGRAMA DE ENTREGA

### Prazo Total Estimado: **8-10 meses**

### Fase 1: Infraestrutura Financeira (6-7 semanas)
**Duração:** 6-7 semanas
**Horas:** ~190h

**Entregas:**
- ✅ Gestão de Convênios (CRUD completo)
- ✅ Cadastro de Profissionais - Regras de Repasse
- ✅ Estrutura de banco de dados financeira
- ✅ API base para módulo financeiro
- ✅ Contas a Pagar (Profissionais)

---

### Fase 2: Faturamento e Contas a Receber (7-8 semanas)
**Duração:** 7-8 semanas
**Horas:** ~175h

**Entregas:**
- ✅ Relatório de Contas a Receber (Convênios)
- ✅ Relatório de Contas a Receber (Particulares)
- ✅ Conciliação por Atendimento
- ✅ Upload de XML/Demonstrativo (parsing TISS)

---

### Fase 3: Glosas e Análises (3-4 semanas)
**Duração:** 3-4 semanas
**Horas:** ~45h

**Entregas:**
- ✅ Relatório de Atendimentos Glosados
- ✅ Processos de recurso
- ✅ Análises por convênio
- ✅ Exportações (PDF/Excel)

---

### Fase 4: Automações e Gestão Operacional (5-6 semanas)
**Duração:** 5-6 semanas
**Horas:** ~170h

**Entregas:**
- ✅ Confirmação Automática de Agendamentos
  - WhatsApp, SMS, Email
  - Bot de respostas
  - Relatórios
- ✅ Taxa de Agendamento por Profissional
- ✅ Mapa de Ocupação de Salas
- ✅ Tipos de Compromisso e Bloqueios

---

### Fase 5: Gestão de Permissões (6-7 semanas)
**Duração:** 6-7 semanas
**Horas:** ~140h

**Entregas:**
- ✅ CRUD de Roles/Perfis personalizados
- ✅ Matriz de Permissões (recursos × ações)
- ✅ Gestão de usuários e atribuição de roles
- ✅ Proteção granular de rotas (frontend e backend)
- ✅ Auditoria de alterações
- ✅ Hook usePermissions() e componente RequirePermission

---

### Fase 6: Evolução de Atividades por Fases (9-10 semanas)
**Duração:** 9-10 semanas
**Horas:** ~235h

**Entregas:**
- ✅ Clonagem de Atividades ao atribuir
- ✅ Sistema de 4 Fases (Linha de Base, Intervenção, Manutenção, Generalização)
- ✅ Parametrização de Critérios por Fase
- ✅ Cálculo Automático e Evolução de Fase
- ✅ Painel de Evolução do Paciente
- ✅ Edição de Atividades Clonadas
- ✅ Histórico de Evoluções

---

## ⚠️ PREMISSAS E RISCOS

### Premissas:
1. **Acesso à documentação TISS:** Cliente fornecerá especificações TISS completas
2. **Ambiente de testes:** Cliente fornecerá acesso a ambiente de homologação dos convênios
3. **APIs de terceiros:** Cliente possui ou contratará APIs de WhatsApp e SMS
4. **Aprovações rápidas:** Ciclos de aprovação não superiores a 5 dias úteis
5. **Disponibilidade:** Stakeholders disponíveis para validações semanais

### Riscos Identificados:

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Complexidade TISS maior que estimada | Média | Alto | +10% de buffer nas horas |
| Indisponibilidade de APIs externas | Baixa | Médio | Planejamento antecipado |
| Mudanças de escopo | Média | Alto | Processo de change request |
| Atrasos em aprovações | Média | Médio | Sprints com entregas parciais |

---

**Documento preparado por:** Equipe Técnica Caleidoscópio
**Data:** 06 de Fevereiro de 2026
**Versão:** 3.0 - ATUALIZADA
**Referência:** Escopo Técnico - Módulos Financeiros + Gestão + Evolução Clínica

---

**FIM DO DOCUMENTO TÉCNICO**
