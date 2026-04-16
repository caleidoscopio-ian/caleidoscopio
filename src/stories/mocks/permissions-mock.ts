// Mock do usePermissions para stories do Storybook

const RECURSOS = [
  'dashboard', 'pacientes', 'agenda', 'atividades', 'curriculums',
  'prontuarios', 'avaliacoes', 'sessoes', 'relatorios', 'terapeutas',
  'salas', 'procedimentos', 'usuarios', 'configuracoes',
]

const ACOES = ['VIEW', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'APPROVE', 'MANAGE']

// Permissões completas (admin)
export const fullPermissions: Record<string, string[]> = Object.fromEntries(
  RECURSOS.map(r => [r, ACOES])
)

// Permissões de terapeuta (acesso clínico, sem admin)
export const therapistPermissions: Record<string, string[]> = {
  dashboard: ['VIEW'],
  pacientes: ['VIEW', 'CREATE', 'UPDATE'],
  agenda: ['VIEW', 'CREATE', 'UPDATE'],
  atividades: ['VIEW', 'CREATE', 'UPDATE'],
  curriculums: ['VIEW', 'CREATE', 'UPDATE'],
  prontuarios: ['VIEW', 'CREATE', 'UPDATE'],
  avaliacoes: ['VIEW', 'CREATE', 'UPDATE'],
  sessoes: ['VIEW', 'CREATE', 'UPDATE'],
  relatorios: ['VIEW', 'EXPORT'],
  terapeutas: ['VIEW'],
  salas: ['VIEW'],
  procedimentos: ['VIEW'],
  usuarios: [],
  configuracoes: [],
}

// Permissões de estagiário (somente leitura + criar sessões)
export const readOnlyPermissions: Record<string, string[]> = Object.fromEntries(
  RECURSOS.map(r => [r, r === 'sessoes' ? ['VIEW', 'CREATE'] : ['VIEW']])
)

// Retorno tipado compatível com UsePermissionsReturn
export function createPermissionsMock(
  permissions: Record<string, string[]>,
  roleName: string = 'Terapeuta',
  source: 'rbac' | 'sso-fallback' = 'rbac'
) {
  function can(resource: string, action: string): boolean {
    const acoes = permissions[resource]
    if (!acoes) return false
    return acoes.includes('MANAGE') || acoes.includes(action)
  }

  return {
    loading: false,
    roleName,
    source,
    can,
    canAny: (checks: { resource: string; action: string }[]) =>
      checks.some(c => can(c.resource, c.action)),
    canAll: (checks: { resource: string; action: string }[]) =>
      checks.every(c => can(c.resource, c.action)),
  }
}

export const permissionPresets = {
  admin: createPermissionsMock(fullPermissions, 'Administrador'),
  terapeuta: createPermissionsMock(therapistPermissions, 'Terapeuta'),
  estagiario: createPermissionsMock(readOnlyPermissions, 'Estagiário'),
}
