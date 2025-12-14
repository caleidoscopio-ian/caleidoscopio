# 🔗 Integração com Sistema 1 (Manager)

Este documento explica como o Sistema 2 (Caleidoscópio Educacional) integra com o Sistema 1 (Manager) via SSO.

## 📋 Pré-requisitos

### Sistema 1 (Manager) - `localhost:3000`
O Sistema 1 deve estar rodando em paralelo com o Sistema 2. Certifique-se de que:

- ✅ Sistema 1 está rodando em `http://localhost:3000`
- ✅ Endpoints SSO estão funcionais:
  - `POST /api/auth/login`
  - `POST /api/auth/validate-access`
  - `POST /api/products/sso/educational`
  - `GET /api/products/sso/educational?token=...`
- ✅ CORS está configurado para aceitar requisições de `localhost:3001`

### Sistema 2 (Caleidoscópio) - `localhost:3001`
Configurar variável de ambiente:

```bash
# .env
NEXT_PUBLIC_MANAGER_API_URL="http://localhost:3000"
```

## 🔄 Fluxo de Autenticação SSO

### 1. Login (Frontend → Sistema 1)
```typescript
// src/app/login/page.tsx
const ssoResult = await managerClient.ssoLogin({
  email: formData.email,
  password: formData.password,
});
```

**Processo interno:**
1. `managerClient.authenticateUser()` - Valida credenciais no Sistema 1
2. `managerClient.validateAccess()` - Verifica acesso ao módulo educacional
3. `managerClient.generateSSOToken()` - Gera token SSO
4. Dados salvos no `localStorage`
5. Cookie `caleidoscopio_token` definido
6. Contexto de autenticação atualizado
7. Redirecionamento para `/dashboard`

### 2. Requisições às APIs (Frontend → Backend Sistema 2)

Todas as requisições incluem headers customizados:

```typescript
const userDataEncoded = btoa(JSON.stringify(user));

fetch('/api/pacientes', {
  headers: {
    'X-User-Data': userDataEncoded,  // Dados do usuário em base64
    'X-Auth-Token': user.token,       // Token SSO
  }
});
```

### 3. Validação nas APIs (Backend Sistema 2 → Sistema 1)

```typescript
// src/lib/auth/server.ts
const user = await getAuthenticatedUser(request);

// SEMPRE valida token com Sistema 1
const isValidToken = await managerClient.validateSSOToken(tokenHeader);
```

**Fluxo de validação:**
1. Extrai headers `X-User-Data` e `X-Auth-Token`
2. Decodifica dados do usuário
3. **Valida token remotamente com Sistema 1** (SEMPRE)
4. Se token válido → retorna dados do usuário
5. Se token inválido → retorna `null` (erro 401)

## 🛡️ Isolamento Multi-Tenant

Todas as APIs aplicam isolamento por `tenantId`:

```typescript
const pacientes = await prisma.paciente.findMany({
  where: {
    tenantId: user.tenant.id, // 🔒 CRÍTICO
    ativo: true,
  },
});
```

**Verificações obrigatórias:**
- ✅ Usuário autenticado (`user !== null`)
- ✅ Tenant associado (`user.tenant.id`)
- ✅ Permissão adequada (via `hasPermission()`)

## 📡 APIs Protegidas

### Pacientes (`/api/pacientes`)
- `GET` - Listar pacientes (role: TERAPEUTA, ADMIN, SUPER_ADMIN)
- `POST` - Criar paciente (role: TERAPEUTA, ADMIN, SUPER_ADMIN)
- `PUT` - Editar paciente (role: TERAPEUTA, ADMIN, SUPER_ADMIN)
- `DELETE` - Deletar paciente (role: ADMIN, SUPER_ADMIN)

### Terapeutas (`/api/terapeutas`)
- `GET` - Listar terapeutas (role: ADMIN, SUPER_ADMIN)
- `POST` - Criar terapeuta (role: ADMIN, SUPER_ADMIN)
- `PUT` - Editar terapeuta (role: ADMIN, SUPER_ADMIN)
- `DELETE` - Deletar terapeuta (role: ADMIN, SUPER_ADMIN)

### Prontuários (`/api/prontuarios`)
- `GET` - Listar prontuários (role: ADMIN, SUPER_ADMIN, professional)
- `POST` - Criar prontuário (role: ADMIN, SUPER_ADMIN, professional)
- `PUT` - Editar prontuário (role: ADMIN, SUPER_ADMIN, professional)
- `DELETE` - Deletar prontuário (role: ADMIN, SUPER_ADMIN, professional)

## 🔧 Tratamento de Erros

### Erro 401 - Não Autenticado
```json
{
  "success": false,
  "error": "Usuário não autenticado",
  "details": "Token inválido ou Sistema 1 não está respondendo. Verifique se o Sistema 1 está rodando em localhost:3000"
}
```

**Causas comuns:**
- Sistema 1 não está rodando
- Token expirado
- Problemas de rede/CORS
- Token não foi enviado nos headers

**Solução:**
1. Verificar se Sistema 1 está rodando: `curl http://localhost:3000/api/health`
2. Fazer logout e login novamente
3. Verificar console do navegador para erros CORS
4. Verificar logs do backend

### Erro 403 - Sem Permissão
```json
{
  "success": false,
  "error": "Sem permissão para visualizar pacientes"
}
```

**Causas comuns:**
- Usuário sem tenant associado
- Role inadequada para a operação

**Solução:**
1. Verificar role do usuário no Sistema 1
2. Associar usuário a uma clínica/tenant
3. Contatar administrador do sistema

## 🧪 Testando a Integração

### 1. Verificar Sistema 1 está rodando
```bash
curl http://localhost:3000/api/health
```

### 2. Testar login via Sistema 1
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@exemplo.com","password":"senha123"}'
```

### 3. Iniciar Sistema 2
```bash
npm run dev
# Deve abrir em http://localhost:3001
```

### 4. Fazer login no Sistema 2
- Abrir `http://localhost:3001/login`
- Usar credenciais do Sistema 1
- Se tudo estiver ok → redireciona para `/dashboard`

## 📝 Logs de Debugging

### Frontend (Navegador)
- `🔐 [REAL] Iniciando login para: ...`
- `✅ [REAL] Login validado no Manager`
- `✅ [REAL] Acesso ao módulo educacional confirmado`
- `✅ [REAL] Token SSO gerado`
- `🔄 Atualizando contexto de autenticação...`
- `🔄 Redirecionando para dashboard...`

### Backend (Terminal)
- `🔍 Auth Server - Verificando headers de autenticação...`
- `🔍 Auth Server - Validando token SSO com Sistema 1...`
- `✅ Auth Server - Token validado com sucesso no Sistema 1`
- `✅ Auth Server - Usuário autenticado com sucesso`
- `🔍 Buscando pacientes para clínica: [Nome] ([ID])`

### Erros Comuns
- `❌ [REAL] Problema de conexão com Sistema Manager`
  - **Solução:** Verificar se Sistema 1 está rodando

- `❌ Auth Server - Token SSO inválido ou expirado`
  - **Solução:** Fazer logout e login novamente

- `❌ API Pacientes - Falha na autenticação`
  - **Solução:** Verificar Sistema 1 e refazer login

## 🚀 Comandos Úteis

### Iniciar ambos sistemas em paralelo

**Terminal 1 - Sistema 1 (Manager):**
```bash
cd path/to/sistema1
npm run dev
# Rodando em http://localhost:3000
```

**Terminal 2 - Sistema 2 (Caleidoscópio):**
```bash
cd E:\caleidoscopio
npm run dev
# Rodando em http://localhost:3001
```

## 📚 Arquivos Importantes

- `src/lib/manager-client.ts` - Cliente SSO
- `src/lib/auth/server.ts` - Autenticação server-side
- `src/hooks/useAuth.tsx` - Hook de autenticação
- `src/app/login/page.tsx` - Página de login
- `src/middleware.ts` - Middleware de proteção de rotas
- `.env` - Configurações de ambiente