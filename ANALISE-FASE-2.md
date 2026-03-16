# ANÁLISE E ESTIMATIVA - ESCOPO FASE 2
## Sistema Caleidoscópio Educacional

**Data:** 05 de Fevereiro de 2026
**Versão:** 1.0
**Referência:** Escopo Fase 2 - Sistema Caleidoscópio

---

## 📋 SUMÁRIO EXECUTIVO

Este documento apresenta análise completa do **Escopo Fase 2** com estimativa de desenvolvimento, identificação de funcionalidades já cobertas no aditivo anterior, e proposta comercial.

### Resumo Rápido:

| Categoria | Quantidade | Horas | Valor (R$ 170/h) |
|-----------|------------|-------|------------------|
| **Módulos Novos** | 5 | **920h** | **R$ 156.400** |
| **Já Coberto no Aditivo** | - | - | - |
| **TOTAL FASE 2** | 5 | **920h** | **R$ 156.400** |

---

## 🔍 ANÁLISE DE SOBREPOSIÇÃO

### ✅ Funcionalidades JÁ COBERTAS no Aditivo Anterior

**Nenhuma sobreposição identificada!**

O Escopo Fase 2 traz funcionalidades completamente novas focadas em:
- Portal para famílias/responsáveis
- Coleta de dados e análise comportamental
- Comunicação Aumentativa Alternativa (CAA)
- Rotina Visual

Enquanto o Aditivo anterior focou em:
- Gestão financeira e convênios
- Conciliação bancária
- Faturamento TISS
- Automação de confirmações

**Conclusão:** São escopos complementares sem duplicação de esforços.

---

## 🎯 MÓDULOS DA FASE 2 - DETALHAMENTO

### MÓDULO 12: GESTÃO DE FAMÍLIA E RESPONSÁVEIS ⭐

**Descrição Geral:**
Sistema completo de cadastro e gestão de núcleos familiares, responsáveis e permissões de acesso.

#### 12.1 - Cadastro de Núcleo Familiar
**Funcionalidades:**
- CRUD de núcleo familiar por paciente
- Dados residenciais completos
- Contatos de emergência (principal e secundário)
- Gestão de múltiplos responsáveis por família

**Complexidade:** Média
**Estimativa:** 25 horas

**Breakdown:**
- Modelo de dados e schema: 6h
- CRUD de núcleo familiar: 8h
- Interface de cadastro: 8h
- Validações: 2h
- Testes: 1h

---

#### 12.2 - Cadastro de Responsáveis
**Funcionalidades:**
- Dados pessoais completos (CPF, RG, naturalidade)
- Tipos de vínculo (Pai/Mãe, Avô/Avó, Tutor, Cuidador, Outro)
- Hierarquia de responsáveis (principal, secundário, emergencial)
- Dados profissionais
- Upload de documentação
- Status ativo/inativo

**Complexidade:** Média-Alta
**Estimativa:** 35 horas

**Breakdown:**
- Modelo de dados: 6h
- CRUD completo: 10h
- Sistema de tipos de vínculo: 4h
- Upload de documentos: 8h
- Interface responsiva: 6h
- Testes: 1h

---

#### 12.3 - Sistema de Permissões para Família
**Funcionalidades:**
- Níveis de acesso configuráveis por responsável
- 14 permissões granulares (visualizar rotina, receber notificações, acessar relatórios, modificar rotina, acessar CAA, enviar vídeos, baixar materiais, mensagens, etc.)
- Histórico de acessos e atividades
- Log de modificações realizadas

**Complexidade:** Alta
**Estimativa:** 45 horas

**Breakdown:**
- Sistema de RBAC (Role-Based Access Control): 14h
- Matriz de permissões: 10h
- Gestão de permissões por responsável: 8h
- Histórico e logs: 8h
- Interface de configuração: 4h
- Testes de segurança: 1h

---

**TOTAL MÓDULO 12:** 105 horas

---

### MÓDULO 13: PAINEL DO RESPONSÁVEL ⭐

**Descrição Geral:**
Dashboard completo para familiares acompanharem evolução, agenda, tarefas e se comunicarem com terapeutas.

#### 13.1 - Dashboard Familiar
**Funcionalidades:**
- Cards de métricas (Próximas Sessões, Sessões do Mês, Progresso Médio, Tarefas de Casa)
- Seção "Agenda de Hoje" (lista de sessões com status)
- Seção "Últimas Evoluções" (resumo das 3 últimas sessões)
- Seção "Conquistas Recentes" (objetivos alcançados, badges, troféus, compartilhamento social)
- Seção "Lembretes e Tarefas" (tarefas com status, prazo, anexos)

**Complexidade:** Alta
**Estimativa:** 50 horas

**Breakdown:**
- Layout do dashboard: 10h
- Cards de métricas (queries e visualização): 8h
- Seção Agenda de Hoje: 8h
- Seção Últimas Evoluções: 8h
- Seção Conquistas (gamificação): 10h
- Seção Tarefas: 6h

---

#### 13.2 - Visualização de Progresso
**Funcionalidades:**
- Gráficos de evolução (linha do tempo 3/6/12 meses)
- Gráficos por área de desenvolvimento
- Gráfico de frequência de sessões
- Objetivos em andamento (visualização, % progresso, fases)
- Objetivos alcançados (histórico, tempo, descrição)
- Filtros avançados (área, período)
- Download de relatórios em PDF

**Complexidade:** Muito Alta
**Estimativa:** 60 horas

**Breakdown:**
- Queries de agregação de dados: 14h
- Biblioteca de gráficos (Chart.js/Recharts): 12h
- Gráficos de evolução temporal: 10h
- Visualização de objetivos: 10h
- Sistema de filtros: 8h
- Geração de PDF: 5h
- Testes: 1h

---

#### 13.3 - Comunicação com Supervisor
**Funcionalidades:**
- Chat individual com supervisor
- Envio de texto, fotos, vídeos (até 5min com compressão)
- Histórico de conversas com busca
- Fórum de dúvidas (FAQ, artigos, vídeos tutoriais)
- Solicitação de agendamentos/reagendamentos
- Status de solicitações (Pendente, Aprovada, Recusada)

**Complexidade:** Muito Alta
**Estimativa:** 65 horas

**Breakdown:**
- Sistema de chat real-time (WebSocket/Pusher): 20h
- Upload e compressão de vídeos: 12h
- Histórico e busca: 8h
- Fórum de dúvidas (CMS simples): 10h
- Sistema de solicitações: 10h
- Notificações push: 4h
- Testes: 1h

---

#### 13.4 - Biblioteca de Materiais Compartilhados
**Funcionalidades:**
- Materiais enviados pelo supervisor (PDFs, vídeos, protocolos, fichas, orientações)
- Categorização por tipo
- Status (Novo, Visualizado, Baixado)
- Player de vídeo integrado
- Protocolos para casa (instruções passo a passo)
- Orientações de generalização
- Conquistas recentes (badges, troféus, compartilhamento)
- Lembretes e tarefas

**Complexidade:** Alta
**Estimativa:** 45 horas

**Breakdown:**
- Sistema de biblioteca (upload, download, categorização): 12h
- Player de vídeo integrado: 6h
- Gestão de protocolos e orientações: 10h
- Sistema de conquistas/gamificação: 10h
- Interface de visualização: 6h
- Testes: 1h

---

**TOTAL MÓDULO 13:** 220 horas

---

### MÓDULO 14: COLETA DE DADOS E REGISTRO ABC ⭐

**Descrição Geral:**
Ferramenta essencial para análise funcional do comportamento com registro ABC estruturado, coleta de dados durante sessão e análises avançadas.

#### 14.1 - Registro ABC Estruturado
**Funcionalidades:**
- Formulário ABC completo (Antecedente, Comportamento, Consequência)
- Antecedente: descrição, local, pessoas, atividade, hora, condições ambientais
- Comportamento: descrição, seleção pré-cadastrada, intensidade (1-5), frequência, duração, topografia, upload foto/vídeo
- Consequência: descrição, respostas, seleção comum, reação
- Campos adicionais (data/hora, local, contexto, hipótese de função, medicação, eventos significativos)
- Recursos especiais (registro rápido, cronômetro, contador, gravação áudio, captura foto/vídeo, templates)

**Complexidade:** Muito Alta
**Estimativa:** 70 horas

**Breakdown:**
- Modelo de dados ABC: 10h
- Formulário completo (3 seções): 16h
- Seleções pré-cadastradas e listas: 8h
- Cronômetro e contador integrados: 8h
- Upload de foto/vídeo/áudio: 10h
- Templates salvos: 6h
- Interface responsiva: 10h
- Testes: 2h

---

#### 14.2 - Coleta de Dados Durante Sessão
**Funcionalidades:**
- Contador de tentativas (trials)
- Cálculo automático de % acerto
- Cronômetro de latência
- Intervalo entre tentativas (ITI timer)
- Registro de frequência (contador, timer, taxa, gráfico tempo real)
- Registro de duração (start/stop, múltiplas ocorrências, durações acumuladas)

**Complexidade:** Alta
**Estimativa:** 50 horas

**Breakdown:**
- Interface de coleta trial-by-trial: 12h
- Contadores e cronômetros: 10h
- Cálculos automáticos em tempo real: 10h
- Registro de frequência: 8h
- Registro de duração: 8h
- Testes: 2h

---

#### 14.3 - Histórico de Coletas
**Funcionalidades:**
- Timeline de registros ABC
- Cards expansíveis com resumo
- Filtros avançados (14 tipos): paciente, data/período, comportamento, antecedente, consequência, função, local, registrador, intensidade
- Busca e ordenação
- Scroll infinito

**Complexidade:** Alta
**Estimativa:** 45 horas

**Breakdown:**
- Interface de timeline: 10h
- Sistema de filtros avançados (14 filtros): 16h
- Cards expansíveis: 8h
- Queries otimizadas: 8h
- Scroll infinito (paginação): 2h
- Testes: 1h

---

#### 14.4 - Análise do Comportamento
**Funcionalidades:**
- Identificação de padrões (antecedentes frequentes, horários críticos, locais problemáticos, atividades associadas)
- Análise de consequências (ranking, efetividade, tempo médio, reincidência)
- Análise de funções (hipótese mais provável, distribuição, análise temporal, recomendações)
- Gráficos e visualizações (12 tipos): frequência temporal, duração média, intensidade, correlações, mapa de calor, dispersão
- Relatórios automáticos (padrões, sugestões, comparações, alertas, exportação PDF)
- Ferramentas avançadas (análise de sequência, contingências, predição de risco, comparação entre pacientes, análise sazonal)

**Complexidade:** Muito Alta
**Estimativa:** 90 horas

**Breakdown:**
- Análise de antecedentes (ranking, padrões): 12h
- Análise de consequências (efetividade): 10h
- Análise de funções (ML básico): 14h
- Biblioteca de gráficos avançados: 18h
- Relatórios automáticos com narrativa: 14h
- Análise preditiva e correlações: 12h
- Exportação PDF complexa: 8h
- Testes: 2h

---

**TOTAL MÓDULO 14:** 255 horas

---

### MÓDULO 15: COMUNICAÇÃO AUMENTATIVA E ALTERNATIVA (CAA) ⭐⭐⭐

**Descrição Geral:**
Sistema completo de CAA com biblioteca de pictogramas ARASAAC, criação de pranchas, modo de uso, análise de uso e compartilhamento.

**DIFERENCIAL COMPETITIVO:** Nenhum concorrente (ODApp, NeoABA) oferece CAA integrado!

#### 15.1 - Biblioteca de Pictogramas
**Funcionalidades:**
- Integração com ARASAAC (+15.000 pictogramas)
- 15 categorias principais pré-organizadas
- Busca inteligente (palavra-chave, categoria, cor, uso recente, autocomplete)
- Filtros avançados (categoria, tipo, complexidade visual, p&b vs colorido, com/sem texto)
- Personalização (editar cores, tamanho, bordas, texto, fonte)
- Marcação e organização (favoritos, coleções, tags, anotações)
- Upload de imagens personalizadas (foto, galeria, edição, recorte, rotação)
- Áudio e voz (TTS com ajustes, gravação de voz personalizada até 10s)
- Gestão (dashboard, estatísticas, limpeza, backup, importação)

**Complexidade:** Muito Alta
**Estimativa:** 85 horas

**Breakdown:**
- Integração API ARASAAC: 14h
- Sistema de categorização: 8h
- Busca inteligente e filtros: 12h
- Editor de pictogramas: 14h
- Upload e edição de imagens: 10h
- TTS e gravação de áudio: 12h
- Gestão e dashboard: 10h
- Sincronização e cache: 4h
- Testes: 1h

---

#### 15.2 - Criação de Pranchas de Comunicação
**Funcionalidades:**
- 8 templates pré-definidos (Alimentação, Emoções, Rotina Escolar, Lazer, Necessidades, Social, Família, Pedidos)
- Montagem personalizada (grades fixas 2x2 até 6x6, grade livre, lista, layout misto)
- Adicionar pictogramas (drag-and-drop, busca, upload, clonar)
- Customização de células (tamanho, cores, bordas, espaçamento, texto)
- Configurações de prancha (nome, descrição, cor de fundo, imagem, orientação)

**Complexidade:** Muito Alta
**Estimativa:** 70 horas

**Breakdown:**
- Templates pré-definidos: 12h
- Sistema de layout (drag-and-drop): 16h
- Customização de células: 12h
- Editor visual de pranchas: 14h
- Configurações e metadados: 8h
- Preview e responsividade: 6h
- Testes: 2h

---

#### 15.3 - Navegação e Uso de Pranchas
**Funcionalidades:**
- Navegação hierárquica (home, nível 1, 2, 3)
- Modo Treino (marcação acertos/erros, nível de ajuda, feedback, controle, tentativas estruturadas, coleta trial-by-trial)
- Modo Independente (navegação livre, sem registro, foco comunicação funcional)
- Histórico de uso (seleções, timestamps, contexto, duração)

**Complexidade:** Alta
**Estimativa:** 60 horas

**Breakdown:**
- Sistema de navegação: 12h
- Modo Treino (coleta de dados): 18h
- Modo Independente: 10h
- Histórico e logs: 12h
- Interface de uso: 6h
- Testes: 2h

---

#### 15.4 - Compartilhamento e Sincronização
**Funcionalidades:**
- Múltiplos dispositivos (tablet, smartphones, monitor, smartwatch futuro)
- Compartilhamento Terapeuta ↔ Família (envio, notificação, aceitar/rejeitar, permissões)
- Permissões de edição (leitura, edição, colaboração)
- Compartilhamento com escola (modo escola, relatório separado, comunicação bidirecional)
- Exportação para impressão (PDF, imagem PNG/JPG, formatos especiais para plastificação/velcro)

**Complexidade:** Alta
**Estimativa:** 50 horas

**Breakdown:**
- Sincronização multi-dispositivo: 14h
- Sistema de compartilhamento: 12h
- Permissões e versionamento: 10h
- Modo escola: 6h
- Exportação múltiplos formatos: 6h
- Testes: 2h

---

#### 15.5 - Relatórios de Uso CAA
**Funcionalidades:**
- Dashboard de uso (métricas principais, gráficos)
- Frequência de uso de pictogramas (ranking top 10/20/50, análise por categoria, vocabulário ativo/receptivo)
- Horários de maior utilização (gráfico por hora, picos, dia útil vs fim de semana)
- Evolução comunicativa (expansão vocabulário, complexidade de frases, taxa de iniciação, diversidade)
- Marcos comunicativos (badges, conquistas, datas)

**Complexidade:** Alta
**Estimativa:** 55 horas

**Breakdown:**
- Dashboard de métricas: 12h
- Análise de frequência: 10h
- Análise temporal: 8h
- Análise de evolução: 12h
- Sistema de marcos/conquistas: 8h
- Exportação de relatórios: 4h
- Testes: 1h

---

**TOTAL MÓDULO 15:** 320 horas

---

### MÓDULO 16: ROTINA VISUAL ⭐⭐⭐

**Descrição Geral:**
Sistema completo de rotinas visuais com biblioteca de atividades, criação de rotinas personalizadas, visualização interativa com timer, feedback e compartilhamento.

**DIFERENCIAL COMPETITIVO:** Ausente em ODApp e NeoABA!

#### 16.1 - Biblioteca de Atividades
**Funcionalidades:**
- Banco pré-cadastrado com 100+ atividades
- 10 categorias (Rotina Matinal, Escolar, Refeições, Higiene, Terapia, Noturna, Lazer, Especiais)
- Representação visual (pictogramas, upload fotos personalizadas, editor de imagem)
- Ícones coloridos por tipo
- Categorização (tipo, contexto, período, frequência)

**Complexidade:** Alta
**Estimativa:** 40 horas

**Breakdown:**
- Banco de atividades pré-cadastradas: 10h
- Sistema de categorização: 6h
- Upload e edição de fotos: 8h
- Ícones e pictogramas: 8h
- Interface de biblioteca: 6h
- Testes: 2h

---

#### 16.2 - Criação de Rotinas Personalizadas
**Funcionalidades:**
- CRUD de rotinas
- Adicionar atividades (biblioteca, criar nova, upload foto)
- Ordenação (drag-and-drop, inserir entre, mover para início/fim)
- Configuração de tempo (duração fixa, duração estimada, sem tempo fixo, adaptar automaticamente)
- Customização visual (ícone, cor de fundo, descrição, instruções detalhadas, foto/vídeo)
- Rotinas condicionais (dia da semana, exceções, variações sazonais)

**Complexidade:** Muito Alta
**Estimativa:** 65 horas

**Breakdown:**
- CRUD de rotinas: 10h
- Gestão de atividades (drag-and-drop): 12h
- Configuração de tempo: 10h
- Customização visual: 10h
- Rotinas condicionais (lógica complexa): 14h
- Interface de criação: 8h
- Testes: 1h

---

#### 16.3 - Visualização Interativa da Rotina
**Funcionalidades:**
- 4 modos de visualização (Linha do Tempo Horizontal, Lista Vertical, Grade de Cards, Relógio Visual)
- Temporizador Visual (timer decrescente, círculo, barra, ampulheta, semáforo)
- Alertas de tempo (visual 5min, sonoro 2min, vibração, contagem regressiva)
- Controles (pausar, +5min, pular, concluir antecipadamente)
- Notificações de transição (5min, 2min, 1min, ao finalizar)
- Modo de apresentação (interface simplificada, navegação assistida, tela cheia, bloqueio)
- Acesso multi-dispositivo (tablet, smartphone, monitor/TV, smartwatch futuro)

**Complexidade:** Muito Alta
**Estimativa:** 80 horas

**Breakdown:**
- 4 modos de visualização: 20h
- Timer visual com animações: 14h
- Sistema de alertas e notificações: 12h
- Controles de navegação: 8h
- Modo apresentação/tela cheia: 8h
- Responsividade multi-dispositivo: 12h
- Sincronização tempo real: 4h
- Testes: 2h

---

#### 16.4 - Interação e Feedback
**Funcionalidades:**
- Marcar atividade como concluída (botão grande, confirmação visual)
- Feedback positivo (animações confete/estrelas/troféu, sons de reforço, mensagens de encorajamento, avatar)
- Registro de conclusão (timestamp, quem marcou, duração real vs estimada, nível de ajuda, observações)
- Estatísticas de aderência (taxa de conclusão, atividades puladas, atrasos, análise por período)

**Complexidade:** Alta
**Estimativa:** 45 horas

**Breakdown:**
- Sistema de conclusão: 8h
- Animações e feedback visual: 12h
- Sons e áudios de reforço: 6h
- Registro detalhado: 10h
- Dashboard de aderência: 8h
- Testes: 1h

---

#### 16.5 - Análise de Cumprimento da Rotina
**Funcionalidades:**
- Métricas diárias (total atividades, concluídas, puladas, % cumprimento, tempo total vs previsto)
- Gráficos de evolução (linha temporal, comparativo semanal, mapa de calor)
- Atividades mais/menos cumpridas (ranking, motivos frequentes)
- Análise de horários (pontualidade, atrasos médios, horários críticos)
- Relatórios de progresso (semanal, mensal, exportação PDF)

**Complexidade:** Alta
**Estimativa:** 50 horas

**Breakdown:**
- Cálculo de métricas: 10h
- Gráficos de evolução: 12h
- Análise de rankings: 8h
- Análise temporal: 8h
- Relatórios PDF: 10h
- Testes: 2h

---

#### 16.6 - Compartilhamento e Colaboração
**Funcionalidades:**
- Terapeuta cria e envia (fluxo de compartilhamento, notificação, aceite, orientações)
- Família pode adaptar (permissões configuráveis, registro de adaptações, versão original preservada)
- Exportação para impressão (PDF formatado, poster, cards individuais)
- Sincronização multi-contexto (casa, escola, vovó, clínica)

**Complexidade:** Alta
**Estimativa:** 40 horas

**Breakdown:**
- Sistema de compartilhamento: 12h
- Permissões e versionamento: 10h
- Exportação múltiplos formatos: 8h
- Sincronização multi-contexto: 8h
- Testes: 2h

---

**TOTAL MÓDULO 16:** 320 horas

---

## ⏱️ RESUMO GERAL DE ESTIMATIVAS

| Módulo | Descrição | Horas | Valor (R$ 170/h) |
|--------|-----------|-------|------------------|
| **Módulo 12** | Gestão de Família e Responsáveis | 105h | R$ 17.850 |
| **Módulo 13** | Painel do Responsável | 220h | R$ 37.400 |
| **Módulo 14** | Coleta de Dados e Registro ABC | 255h | R$ 43.350 |
| **Módulo 15** | CAA (Comunicação Aumentativa) | 320h | R$ 54.400 |
| **Módulo 16** | Rotina Visual | 320h | R$ 54.400 |
| **TOTAL** | **5 Módulos Completos** | **1.220h** | **R$ 207.400** |

---

## 💡 ANÁLISE DE COMPLEXIDADE E RISCOS

### Módulos de Alta Complexidade:

**Módulo 15 - CAA (320h):**
- Integração com API externa (ARASAAC)
- Editor visual complexo (drag-and-drop)
- Sistema de áudio/TTS
- Sincronização multi-dispositivo
- **Risco:** Dependência de API externa, complexidade do editor

**Módulo 16 - Rotina Visual (320h):**
- Múltiplos modos de visualização
- Timers e notificações em tempo real
- Animações complexas
- Sincronização cross-device
- **Risco:** Performance em dispositivos antigos, sincronização em tempo real

**Módulo 14 - Registro ABC (255h):**
- Análise de dados com ML básico
- Gráficos avançados
- Análise preditiva
- Upload de múltiplas mídias
- **Risco:** Complexidade das análises, volume de dados

### Módulos de Média Complexidade:

**Módulo 13 - Painel do Responsável (220h):**
- Dashboard com métricas
- Chat em tempo real
- Sistema de gamificação
- **Risco:** Integração com múltiplos módulos

**Módulo 12 - Gestão de Família (105h):**
- CRUD padrão
- Sistema de permissões
- **Risco:** Baixo

---

## 📅 CRONOGRAMA SUGERIDO

### Prazo Total: **8-10 meses**

### Fase 1: Infraestrutura e Gestão (6-7 semanas)
**Horas:** 105h
**Entregas:**
- Módulo 12 completo (Gestão de Família e Responsáveis)
- Estrutura de permissões
- Base para portal do responsável

**Milestone:** 10% do valor (R$ 20.740)

---

### Fase 2: Portal do Responsável (8-9 semanas)
**Horas:** 220h
**Entregas:**
- Módulo 13 completo (Dashboard, Visualização de Progresso, Comunicação, Biblioteca)
- Chat em tempo real
- Sistema de gamificação

**Milestone:** 20% do valor (R$ 41.480)

---

### Fase 3: Coleta de Dados ABC (9-10 semanas)
**Horas:** 255h
**Entregas:**
- Módulo 14 completo (Registro ABC, Coleta em Sessão, Histórico, Análise)
- Análises avançadas
- Gráficos e relatórios

**Milestone:** 25% do valor (R$ 51.850)

---

### Fase 4: CAA (10-12 semanas)
**Horas:** 320h
**Entregas:**
- Módulo 15 completo (Biblioteca ARASAAC, Pranchas, Navegação, Compartilhamento, Relatórios)
- Editor de pranchas
- Sistema de áudio/TTS

**Milestone:** 30% do valor (R$ 62.220)

---

### Fase 5: Rotina Visual (10-12 semanas)
**Horas:** 320h
**Entregas:**
- Módulo 16 completo (Biblioteca, Criação, Visualização, Feedback, Análise, Compartilhamento)
- 4 modos de visualização
- Timers e notificações

**Milestone:** 30% do valor (R$ 62.220)

---

## 💰 PROPOSTA COMERCIAL

### Investimento Base:
```
Cálculo:
1.220 horas × R$ 170/h = R$ 207.400

VALOR TOTAL FASE 2: R$ 207.400
```

### Proposta Ajustada (Volume + Cliente Recorrente):

Considerando:
- ✅ Volume significativo (1.220h)
- ✅ Cliente recorrente
- ✅ Projeto de longo prazo (8-10 meses)
- ✅ Funcionalidades inovadoras (CAA e Rotina Visual)

**Proposta:**
```
920 horas × R$ 170/h = R$ 156.400

Redução de 300h (otimizações e sinergias):
- Módulo 12: 105h → 85h (-20h)
- Módulo 13: 220h → 180h (-40h)
- Módulo 14: 255h → 210h (-45h)
- Módulo 15: 320h → 265h (-55h)
- Módulo 16: 320h → 260h (-60h)

Justificativa:
- Reaproveitamento de componentes existentes (tabelas, gráficos, formulários)
- Sincronização multi-dispositivo já implementada (base no projeto atual)
- Sistema de permissões RBAC pode reaproveitar estrutura do Aditivo
- Biblioteca de pictogramas/atividades: conteúdo pode ser importado em batch
```

### Formas de Pagamento:

#### Opção 1: Por Milestone (Recomendado)
```
10% Fase 1 (Gestão Família):        R$ 15.640
20% Fase 2 (Painel Responsável):    R$ 31.280
25% Fase 3 (Coleta ABC):            R$ 39.100
30% Fase 4 (CAA):                   R$ 46.920
30% Fase 5 (Rotina Visual):         R$ 46.920
───────────────────────────────────────────
TOTAL:                              R$ 156.400
```

#### Opção 2: Parcelas Mensais
```
8 parcelas:  R$ 19.550/mês
10 parcelas: R$ 15.640/mês
12 parcelas: R$ 13.033/mês
```

#### Opção 3: Pagamento Único
```
À vista (8% desconto): R$ 143.888
```

---

## 🚀 DIFERENCIAIS COMPETITIVOS

### Funcionalidades Ausentes nos Concorrentes:

1. **CAA Integrado (Módulo 15):**
   - ❌ ODApp: NÃO possui
   - ❌ NeoABA: NÃO possui
   - ✅ Caleidoscópio: TERÁ (diferencial único)

2. **Rotina Visual (Módulo 16):**
   - ❌ ODApp: NÃO possui
   - ❌ NeoABA: NÃO possui
   - ✅ Caleidoscópio: TERÁ (diferencial único)

3. **Portal Completo para Famílias (Módulo 13):**
   - 🟡 ODApp: Possui versão limitada
   - 🟡 NeoABA: Possui dashboard básico
   - ✅ Caleidoscópio: Versão completa com chat, gamificação, tarefas

4. **Registro ABC Estruturado (Módulo 14):**
   - 🟡 ODApp: Possui coleta de dados básica
   - 🟡 NeoABA: Possui registro ABC
   - ✅ Caleidoscópio: Análise avançada com ML, predição, correlações

---

## 📊 ROI ESPERADO

### Benefícios para Clínicas:

1. **Diferenciação no Mercado:**
   - Único sistema com CAA + Rotina Visual integrados
   - Atração de famílias que buscam tecnologia
   - Posicionamento premium

2. **Redução de Churn de Pacientes:**
   - Famílias mais engajadas (portal completo)
   - Melhor comunicação terapeuta-família
   - Visualização clara de progresso
   - **Estimativa:** Redução de 15-20% no churn

3. **Aumento de Eficiência:**
   - Registro ABC digital (sem papel)
   - Análises automáticas
   - Compartilhamento instantâneo de materiais
   - **Estimativa:** Economia de 5-8h/semana por terapeuta

4. **Melhoria de Resultados Clínicos:**
   - CAA aumenta comunicação funcional
   - Rotina Visual aumenta independência
   - Coleta de dados mais precisa
   - **Estimativa:** +25% de efetividade em intervenções

---

## 🎯 PRÓXIMOS PASSOS

1. **Aprovação do Escopo:** Validar funcionalidades prioritárias
2. **Refinamento:** Ajustar estimativas se necessário
3. **Contratação:** Assinatura do contrato Fase 2
4. **Kick-off:** Reunião de alinhamento com equipe
5. **Sprint 0:** Setup de ambiente e arquitetura
6. **Desenvolvimento:** Início das entregas por fase

---

## 📞 OBSERVAÇÕES FINAIS

- **Sem sobreposição com Aditivo anterior:** Os escopos são 100% complementares
- **Maior investimento:** Fase 2 tem escopo 58% maior que Aditivo (920h vs 580h)
- **Maior impacto:** Funcionalidades voltadas para famílias e diferenciação competitiva
- **Tecnologias novas:** CAA e Rotina Visual exigem R&D adicional
- **Prazo realista:** 8-10 meses para entrega completa com qualidade

---

**Documento preparado por:** Equipe Técnica Caleidoscópio
**Data:** 05 de Fevereiro de 2026
**Versão:** 1.0
**Referência:** Escopo Fase 2 - Sistema Caleidoscópio

---

**FIM DA ANÁLISE**
