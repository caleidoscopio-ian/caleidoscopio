// Dados fictícios reutilizáveis para stories do Storybook
// Todos os dados são em português, contexto TEA

// ─── Tenant ────────────────────────────────────────────────────────────────
export const mockTenant = {
  id: 'tenant-caleidoscopio',
  name: 'Clínica Caleidoscópio',
  slug: 'caleidoscopio',
  cnpj: '12.345.678/0001-99',
  plan: {
    id: 'plan-pro',
    name: 'Pro',
  },
}

export const mockConfig = {
  tenant: {
    maxStudents: 100,
    enableCertificates: true,
    enableLiveClasses: false,
    contentAccess: 'full',
  },
}

// ─── Usuários ───────────────────────────────────────────────────────────────
export const mockAdminUser = {
  id: 'user-admin-001',
  email: 'admin@caleidoscopio.com',
  name: 'Dr. Carlos Mendes',
  role: 'SUPER_ADMIN',
  tenant: mockTenant,
  config: mockConfig,
  token: 'mock-token-admin-123',
  loginTime: new Date().toISOString(),
}

export const mockTherapistUser = {
  id: 'user-terapeuta-001',
  email: 'ana.lima@caleidoscopio.com',
  name: 'Ana Lima',
  role: 'USER',
  tenant: mockTenant,
  config: mockConfig,
  token: 'mock-token-terapeuta-456',
  loginTime: new Date().toISOString(),
}

export const mockReadonlyUser = {
  id: 'user-readonly-001',
  email: 'observador@caleidoscopio.com',
  name: 'Pedro Observador',
  role: 'USER',
  tenant: mockTenant,
  config: mockConfig,
  token: 'mock-token-readonly-789',
  loginTime: new Date().toISOString(),
}

// ─── Pacientes ──────────────────────────────────────────────────────────────
export const mockPaciente = {
  id: 'paciente-001',
  name: 'João Silva',
  email: 'joao.silva@email.com',
  birthDate: '2015-03-10',
  phone: '(11) 98765-4321',
  guardian: 'Maria Silva',
  diagnosis: 'TEA Nível 2',
  cor_agenda: '#3B82F6',
  tenantId: mockTenant.id,
  createdAt: '2024-01-15T00:00:00.000Z',
}

export const mockPacientes = [
  mockPaciente,
  {
    id: 'paciente-002',
    name: 'Lucas Ferreira',
    email: 'lucas.f@email.com',
    birthDate: '2016-07-22',
    phone: '(11) 91234-5678',
    guardian: 'Roberto Ferreira',
    diagnosis: 'TEA Nível 1',
    cor_agenda: '#10B981',
    tenantId: mockTenant.id,
    createdAt: '2024-02-10T00:00:00.000Z',
  },
  {
    id: 'paciente-003',
    name: 'Sofia Oliveira',
    email: 'sofia.o@email.com',
    birthDate: '2017-11-05',
    phone: '(11) 97654-3210',
    guardian: 'Carla Oliveira',
    diagnosis: 'TEA Nível 1',
    cor_agenda: '#F59E0B',
    tenantId: mockTenant.id,
    createdAt: '2024-03-05T00:00:00.000Z',
  },
]

// ─── Profissionais/Terapeutas ────────────────────────────────────────────────
export const mockTerapeuta = {
  id: 'terapeuta-001',
  name: 'Ana Lima',
  email: 'ana.lima@caleidoscopio.com',
  specialty: 'Terapeuta ABA',
  crp: 'CRP-06/12345',
  phone: '(11) 98888-7777',
  tenantId: mockTenant.id,
}

export const mockTerapeutas = [
  mockTerapeuta,
  {
    id: 'terapeuta-002',
    name: 'Bruno Santos',
    email: 'bruno.santos@caleidoscopio.com',
    specialty: 'Fonoaudiólogo',
    crp: 'CRFa-2/11111',
    phone: '(11) 97777-6666',
    tenantId: mockTenant.id,
  },
]

// ─── Agendamentos ────────────────────────────────────────────────────────────
export const mockAgendamento = {
  id: 'agend-001',
  pacienteId: mockPaciente.id,
  pacienteNome: mockPaciente.name,
  pacienteCor: mockPaciente.cor_agenda,
  terapeutaId: mockTerapeuta.id,
  terapeutaNome: mockTerapeuta.name,
  data: new Date().toISOString().split('T')[0],
  horaInicio: '09:00',
  horaFim: '10:00',
  status: 'CONFIRMADO',
  tipo: 'SESSAO_INDIVIDUAL',
  tenantId: mockTenant.id,
}

export const mockAgendamentos = [
  mockAgendamento,
  {
    ...mockAgendamento,
    id: 'agend-002',
    pacienteId: mockPacientes[1].id,
    pacienteNome: mockPacientes[1].name,
    pacienteCor: mockPacientes[1].cor_agenda,
    horaInicio: '10:30',
    horaFim: '11:30',
    status: 'PENDENTE',
  },
  {
    ...mockAgendamento,
    id: 'agend-003',
    pacienteId: mockPacientes[2].id,
    pacienteNome: mockPacientes[2].name,
    pacienteCor: mockPacientes[2].cor_agenda,
    horaInicio: '14:00',
    horaFim: '15:00',
    status: 'REALIZADO',
  },
]

// ─── Roles ───────────────────────────────────────────────────────────────────
export const mockRoles = [
  {
    id: 'role-admin',
    nome: 'Administrador',
    isSystem: true,
    ativo: true,
    tenantId: mockTenant.id,
    _count: { usuarios: 2 },
  },
  {
    id: 'role-terapeuta',
    nome: 'Terapeuta',
    isSystem: false,
    ativo: true,
    tenantId: mockTenant.id,
    _count: { usuarios: 5 },
  },
  {
    id: 'role-estagiario',
    nome: 'Estagiário',
    isSystem: false,
    ativo: true,
    tenantId: mockTenant.id,
    _count: { usuarios: 3 },
  },
]

// ─── Resumo para Relatórios ──────────────────────────────────────────────────
export const mockResumo = {
  totalPacientes: 32,
  sessoesRealizadasMes: 147,
  mediaAtendimentosDia: 6.8,
  taxaPresenca: 94,
  novosPacientesMes: 3,
}

// ─── Distribuição para Gráficos ──────────────────────────────────────────────
export const mockDistribuicao = {
  porStatus: {
    REALIZADO: 147,
    PENDENTE: 12,
    CANCELADO: 8,
    FALTOU: 5,
  },
  porTerapeuta: mockTerapeutas.map((t, i) => ({
    nome: t.name,
    total: [89, 58][i] || 30,
  })),
}

// ─── Atividades/Curriculum ───────────────────────────────────────────────────
export const mockAtividade = {
  id: 'atividade-001',
  nome: 'Identificação de Cores',
  descricao: 'O paciente deve identificar e nomear as cores apresentadas',
  categoria: 'Discriminação Visual',
  tipo_ensino: 'Tentativa Discreta',
  qtd_tentativas_alvo: 5,
  tenantId: mockTenant.id,
}

export const mockFases = ['LINHA_BASE', 'INTERVENCAO', 'MANUTENCAO', 'GENERALIZACAO'] as const
