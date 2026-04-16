// Mock das funções de API para stories do Storybook
// Retornam dados fictícios sem fazer fetch real

import {
  mockPacientes,
  mockTerapeutas,
  mockAgendamentos,
  mockRoles,
  mockAtividade,
} from '../fixtures'

function createMockResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Mapa de endpoints para dados fictícios
const mockEndpoints: Record<string, unknown> = {
  '/api/pacientes': { pacientes: mockPacientes },
  '/api/terapeutas': { terapeutas: mockTerapeutas },
  '/api/agendamentos': { agendamentos: mockAgendamentos },
  '/api/roles': { roles: mockRoles },
  '/api/atividades': { atividades: [mockAtividade] },
  '/api/salas': { salas: [{ id: 'sala-001', nome: 'Sala Azul', capacidade: 4 }] },
  '/api/curriculum': { curriculums: [] },
  '/api/avaliacoes': { avaliacoes: [] },
}

// Função helper para obter dados mockados por URL
function getMockData(url: string): unknown {
  // Tenta match exato
  if (mockEndpoints[url]) return mockEndpoints[url]

  // Tenta match por prefixo (ex: /api/pacientes/123)
  const base = Object.keys(mockEndpoints).find(k => url.startsWith(k + '/'))
  if (base) return mockEndpoints[base]

  return { message: 'Mock data not found', url }
}

// Versões mockadas das funções de API
export const mockApiGet = async (url: string): Promise<Response> => {
  await new Promise(r => setTimeout(r, 100)) // simular latência
  return createMockResponse(getMockData(url))
}

export const mockApiPost = async (url: string, data?: unknown): Promise<Response> => {
  await new Promise(r => setTimeout(r, 150))
  return createMockResponse({ success: true, data, id: `mock-${Date.now()}` })
}

export const mockApiPut = async (url: string, data?: unknown): Promise<Response> => {
  await new Promise(r => setTimeout(r, 150))
  return createMockResponse({ success: true, data })
}

export const mockApiDelete = async (url: string): Promise<Response> => {
  await new Promise(r => setTimeout(r, 100))
  return createMockResponse({ success: true, deleted: url })
}

// handleApiResponse mockado
export const mockHandleApiResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json() as Promise<T>
}

// Estado de loading (para stories com estado de carregando)
export const mockApiLoading = async (): Promise<Response> => {
  return new Promise(() => {}) // nunca resolve
}

// Estado de erro (para stories com estado de erro)
export const mockApiError = async (): Promise<Response> => {
  await new Promise(r => setTimeout(r, 100))
  throw new Error('Erro simulado: não foi possível conectar ao servidor')
}
