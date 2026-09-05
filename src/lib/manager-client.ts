/* eslint-disable @typescript-eslint/no-explicit-any */
// Cliente para comunicação com o Sistema 1 (Caleidoscópio Manager)
// Seguindo protocolo REAL conforme análise do Sistema 1

// URL base do Sistema 1 (Manager)
const MANAGER_API_URL =
  process.env.NEXT_PUBLIC_MANAGER_API_URL || "http://localhost:3000";

// Configurações padrão para requests com CORS e cookies
const DEFAULT_FETCH_OPTIONS: RequestInit = {
  credentials: "include", // CRÍTICO: Manter cookies entre requisições (gerenciamento automático)
  mode: "cors",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
};

interface LoginCredentials {
  email: string;
  password: string;
  tenantSlug?: string;
}

// Resposta real do Sistema 1 - API Login
interface LoginResponse {
  success: boolean;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenant?: {
      id: string;
      name: string;
      slug: string;
      status: string;
    };
  };
  token: string;
}

// Resposta real do Sistema 1 - API Validate Access
interface ValidateAccessResponse {
  hasAccess: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  tenant?: {
    id: string;
    name: string;
    slug: string;
    cnpj?: string;
    plan: {
      id: string;
      name: string;
      slug: string;
    };
  };
  config?: {
    plan: any;
    tenant: any;
  };
  product?: {
    id: string;
    name: string;
    slug: string;
    description: string;
  };
  error?: string;
}

// Resposta real do Sistema 1 - API SSO Token
interface SSOTokenResponse {
  token: string;
  redirectUrl: string;
  expiresIn: number;
}

// Resposta real do Sistema 1 - API Validate Token
interface ValidateTokenResponse {
  valid: boolean;
  user?: {
    userId: string;
    email: string;
    name: string;
    role: string;
    tenant?: {
      id: string;
      name: string;
      slug: string;
    };
  };
  error?: string;
}

class ManagerClient {
  private baseUrl: string;
  private productSlug = "educational"; // Produto fixo: educacional

  constructor(baseUrl: string = MANAGER_API_URL) {
    this.baseUrl = baseUrl;
  }

  // ETAPA 1: Autenticar no Sistema Manager (conforme protocolo real)
  async authenticateUser(
    credentials: LoginCredentials
  ): Promise<LoginResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/login`, {
        ...DEFAULT_FETCH_OPTIONS,
        method: "POST",
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
          tenantSlug: credentials.tenantSlug,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const loginData: LoginResponse = await response.json();

      if (!loginData.success || !loginData.user) {
        throw new Error("Resposta de login inválida do Sistema Manager");
      }

      return loginData;
    } catch (error) {
      // Diagnóstico específico para problemas de CORS
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        throw new Error(
          "Erro de conexão com Sistema Manager. Verifique se está rodando na porta 3000."
        );
      }

      throw error;
    }
  }

  // ETAPA 2: Verificar acesso ao módulo educacional (conforme protocolo real)
  async validateAccess(
    userEmail: string
  ): Promise<ValidateAccessResponse | null> {
    const response = await fetch(`${this.baseUrl}/api/auth/validate-access`, {
      ...DEFAULT_FETCH_OPTIONS,
      method: "POST",
      body: JSON.stringify({
        productSlug: this.productSlug,
        userEmail: userEmail,
      }),
    });

    const accessData: ValidateAccessResponse = await response.json();

    if (!accessData.hasAccess) {
      throw new Error(
        accessData.error || "Você não tem acesso ao módulo educacional"
      );
    }

    return accessData;
  }

  // ETAPA 3: Gerar token SSO (conforme protocolo real)
  async generateSSOToken(authToken?: string): Promise<SSOTokenResponse | null> {
    const headers: Record<string, string> = {
      ...(DEFAULT_FETCH_OPTIONS.headers as Record<string, string>),
    };

    // Se tiver token de autenticação, enviar no header
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(
      `${this.baseUrl}/api/products/sso/${this.productSlug}`,
      {
        ...DEFAULT_FETCH_OPTIONS,
        method: "POST",
        headers,
      }
    );

    if (!response.ok) {
      const ssoError = await response.json().catch(() => ({}));
      throw new Error(ssoError.error || "Erro ao gerar token de acesso");
    }

    const ssoData: SSOTokenResponse = await response.json();
    return ssoData;
  }

  // Validar token SSO existente (conforme protocolo real)
  async validateSSOToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/products/sso/${this.productSlug}?token=${token}`,
        {
          ...DEFAULT_FETCH_OPTIONS,
        }
      );

      if (!response.ok) {
        return false;
      }

      const data: ValidateTokenResponse = await response.json();
      return data.valid === true;
    } catch {
      return false;
    }
  }

  // Processo completo SSO conforme protocolo REAL do Sistema 1
  async ssoLogin(credentials: LoginCredentials) {
    // ETAPA 1: Autenticar no Sistema Manager
    const loginResult = await this.authenticateUser(credentials);
    if (!loginResult?.success || !loginResult?.user) {
      throw new Error("Falha na autenticação");
    }

    // ETAPA 2: Verificar acesso ao módulo educacional
    const accessResult = await this.validateAccess(credentials.email);
    if (!accessResult?.hasAccess) {
      throw new Error("Acesso negado ao módulo educacional");
    }

    // ETAPA 3: Gerar token SSO (passando o token de autenticação)
    const ssoResult = await this.generateSSOToken(loginResult.token);
    if (!ssoResult?.token) {
      throw new Error("Erro ao gerar token de acesso");
    }

    // Retornar dados no formato esperado pelo Sistema 2
    return {
      user: {
        id: accessResult.user?.id || loginResult.user.id,
        email: accessResult.user?.email || loginResult.user.email,
        name: accessResult.user?.name || loginResult.user.name,
        role: accessResult.user?.role || loginResult.user.role,
      },
      tenant: accessResult.tenant
        ? {
            id: accessResult.tenant.id,
            name: accessResult.tenant.name,
            slug: accessResult.tenant.slug,
            cnpj: accessResult.tenant.cnpj,
            plan: accessResult.tenant.plan,
          }
        : loginResult.user.tenant,
      config: accessResult.config || {
        tenant: {
          maxStudents: 100,
          enableCertificates: true,
          enableLiveClasses: true,
          contentAccess: "full",
        },
      },
      token: ssoResult.token,
      // Token de sessão do Sistema 1 (7 dias) — guardado para renovar o token
      // SSO (curta duração) silenciosamente, sem exigir novo login.
      sessionToken: loginResult.token,
    };
  }

  // Buscar usuários de um tenant no Sistema 1
  async getUsers(tenantId: string, authToken: string): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}/api/users?tenantId=${tenantId}`,
      {
        ...DEFAULT_FETCH_OPTIONS,
        method: "GET",
        headers: {
          ...DEFAULT_FETCH_OPTIONS.headers,
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Erro ao buscar usuários");
    }

    return await response.json();
  }

  // Criar usuário no Sistema 1 usando autenticação SSO
  async createUser(
    userData: {
      email: string;
      name: string;
      password: string;
      role: string;
      tenantId: string;
    },
    ssoToken: string
  ): Promise<any> {
    // Usar nova API que aceita token SSO
    const response = await fetch(
      `${this.baseUrl}/api/users/create-with-sso?token=${ssoToken}`,
      {
        ...DEFAULT_FETCH_OPTIONS,
        method: "POST",
        body: JSON.stringify(userData),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Erro ao criar usuário");
    }

    return await response.json();
  }

  // Resetar senha de um usuário no Sistema 1 usando autenticação SSO
  async resetPassword(
    userId: string,
    ssoToken: string
  ): Promise<{ success: boolean; temporaryPassword: string }> {
    const response = await fetch(
      `${this.baseUrl}/api/users/${userId}/reset-password-with-sso?token=${ssoToken}`,
      {
        ...DEFAULT_FETCH_OPTIONS,
        method: "POST",
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Erro ao resetar senha");
    }

    return await response.json();
  }

  // Excluir usuário no Sistema 1 usando autenticação SSO
  async deleteUser(userId: string, ssoToken: string): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/api/users/${userId}/delete-with-sso?token=${ssoToken}`,
      {
        ...DEFAULT_FETCH_OPTIONS,
        method: "POST",
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Erro ao excluir usuário");
    }
  }

  // Usuário altera a própria senha no Sistema 1 usando autenticação SSO
  async changeOwnPassword(
    currentPassword: string,
    newPassword: string,
    ssoToken: string
  ): Promise<{ success: boolean }> {
    const response = await fetch(
      `${this.baseUrl}/api/users/change-password-with-sso?token=${ssoToken}`,
      {
        ...DEFAULT_FETCH_OPTIONS,
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erro ao alterar senha");
    }

    return data;
  }

  // Limpar sessão (usar no logout) - apenas placeholder, cookies são gerenciados automaticamente
  clearSession() {
    // Sessão é limpa automaticamente pelo logout do servidor (cookies HttpOnly)
  }
}

// Instância singleton do cliente real
export const managerClient = new ManagerClient();
