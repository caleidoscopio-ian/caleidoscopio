// Utilitário para chamadas de API autenticadas
// Conforme documentação SSO - Opção 2

interface ApiOptions extends RequestInit {
  headers?: Record<string, string>
}

// Utilitário para chamadas de API autenticadas
export const apiCall = async (url: string, options: ApiOptions = {}) => {
  const user = JSON.parse(localStorage.getItem('edu_auth_user') || '{}')
  const token = localStorage.getItem('edu_auth_token')

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  // Adicionar dados do usuário e token nos headers customizados
  // O servidor espera X-User-Data (base64) e X-Auth-Token
  if (user && Object.keys(user).length > 0 && token) {
    // Enviar dados do usuário em base64 para evitar problemas com caracteres especiais
    const userDataJson = JSON.stringify(user)
    const userDataBase64 = btoa(userDataJson) // Usar btoa() para browser

    headers['X-User-Data'] = userDataBase64
    headers['X-Auth-Token'] = token
  }

  // Manter headers legados para compatibilidade
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  if (user.id) {
    headers['X-User-ID'] = user.id
  }
  if (user.tenant?.id) {
    headers['X-Tenant-ID'] = user.tenant.id
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include'
    })

    // Se token expirou, redirecionar para login
    if (response.status === 401) {
      localStorage.removeItem('edu_auth_user')
      localStorage.removeItem('edu_auth_token')
      window.location.href = '/login'
      return
    }

    return response
  } catch (error) {
    console.error('Erro na API:', error)
    throw error
  }
}

// Helpers específicos para métodos HTTP

export const apiGet = async (url: string, options: ApiOptions = {}) => {
  return apiCall(url, { ...options, method: 'GET' })
}

export const apiPost = async (url: string, data?: unknown, options: ApiOptions = {}) => {
  return apiCall(url, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined
  })
}

export const apiPut = async (url: string, data?: unknown, options: ApiOptions = {}) => {
  return apiCall(url, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined
  })
}

export const apiDelete = async (url: string, options: ApiOptions = {}) => {
  return apiCall(url, { ...options, method: 'DELETE' })
}

// Helper para tratamento de resposta JSON com error handling
export const handleApiResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`)
  }

  return response.json()
}

// Exemplo de uso:
// const response = await apiGet('/api/courses')
// const data = await handleApiResponse(response)