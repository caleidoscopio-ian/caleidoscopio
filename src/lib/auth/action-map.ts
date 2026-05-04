/**
 * Mapa de ações legadas → novo formato RBAC
 *
 * Garante retrocompatibilidade: todas as chamadas existentes
 * hasPermission(user, "view_patients") continuam funcionando,
 * pois são mapeadas para o novo sistema { resource, action }.
 */

export interface ResourceAction {
  resource: string
  action: string
}

export const ACTION_MAP: Record<string, ResourceAction> = {
  // Pacientes
  view_patients:            { resource: 'pacientes',     action: 'VIEW'   },
  create_patients:          { resource: 'pacientes',     action: 'CREATE' },
  edit_patients:            { resource: 'pacientes',     action: 'UPDATE' },
  delete_patients:          { resource: 'pacientes',     action: 'DELETE' },

  // Profissionais / Terapeutas
  view_professionals:       { resource: 'terapeutas',    action: 'VIEW'   },
  create_professionals:     { resource: 'terapeutas',    action: 'CREATE' },
  edit_professionals:       { resource: 'terapeutas',    action: 'UPDATE' },
  delete_professionals:     { resource: 'terapeutas',    action: 'DELETE' },

  // Prontuários
  view_medical_records:     { resource: 'prontuarios',   action: 'VIEW'   },
  create_medical_records:   { resource: 'prontuarios',   action: 'CREATE' },
  edit_medical_records:     { resource: 'prontuarios',   action: 'UPDATE' },
  delete_medical_records:   { resource: 'prontuarios',   action: 'DELETE' },

  // Atividades
  view_activities:          { resource: 'atividades',    action: 'VIEW'   },
  create_activities:        { resource: 'atividades',    action: 'CREATE' },
  edit_activities:          { resource: 'atividades',    action: 'UPDATE' },
  delete_activities:        { resource: 'atividades',    action: 'DELETE' },

  // Sessões
  view_sessions:            { resource: 'sessoes',       action: 'VIEW'   },
  create_sessions:          { resource: 'sessoes',       action: 'CREATE' },
  edit_sessions:            { resource: 'sessoes',       action: 'UPDATE' },

  // Anamneses
  view_anamneses:           { resource: 'anamneses',     action: 'VIEW'   },
  create_anamneses:         { resource: 'anamneses',     action: 'CREATE' },
  edit_anamneses:           { resource: 'anamneses',     action: 'UPDATE' },
  delete_anamneses:         { resource: 'anamneses',     action: 'DELETE' },

  // Usuários / Admin
  manage_users:             { resource: 'usuarios',      action: 'MANAGE' },
  view_usuarios:            { resource: 'usuarios',      action: 'VIEW'   },
  create_usuarios:          { resource: 'usuarios',      action: 'CREATE' },
  edit_usuarios:            { resource: 'usuarios',      action: 'UPDATE' },
  delete_usuarios:          { resource: 'usuarios',      action: 'DELETE' },

  // Salas
  view_rooms:               { resource: 'salas',         action: 'VIEW'   },
  manage_rooms:             { resource: 'salas',         action: 'MANAGE' },

  // Agenda
  view_schedule:            { resource: 'agenda',        action: 'VIEW'   },
  create_schedule:          { resource: 'agenda',        action: 'CREATE' },
  edit_schedule:            { resource: 'agenda',        action: 'UPDATE' },
  delete_schedule:          { resource: 'agenda',        action: 'DELETE' },

  // Curriculums
  view_curriculums:         { resource: 'curriculums',   action: 'VIEW'   },
  create_curriculums:       { resource: 'curriculums',   action: 'CREATE' },
  edit_curriculums:         { resource: 'curriculums',   action: 'UPDATE' },
  delete_curriculums:       { resource: 'curriculums',   action: 'DELETE' },

  // Avaliações
  view_avaliacoes:          { resource: 'avaliacoes',    action: 'VIEW'   },
  create_avaliacoes:        { resource: 'avaliacoes',    action: 'CREATE' },
  edit_avaliacoes:          { resource: 'avaliacoes',    action: 'UPDATE' },
  delete_avaliacoes:        { resource: 'avaliacoes',    action: 'DELETE' },

  // Relatórios
  view_reports:             { resource: 'relatorios',    action: 'VIEW'   },
  create_reports:           { resource: 'relatorios',    action: 'CREATE' },

  // Permissões
  manage_permissions:       { resource: 'permissoes',    action: 'MANAGE' },

  // Convênios
  view_convenios:           { resource: 'convenios',     action: 'VIEW'   },
  create_convenios:         { resource: 'convenios',     action: 'CREATE' },
  edit_convenios:           { resource: 'convenios',     action: 'UPDATE' },
  delete_convenios:         { resource: 'convenios',     action: 'DELETE' },

  // Procedimentos e Pacotes
  view_procedimentos:       { resource: 'procedimentos', action: 'VIEW'   },
  create_procedimentos:     { resource: 'procedimentos', action: 'CREATE' },
  edit_procedimentos:       { resource: 'procedimentos', action: 'UPDATE' },
  delete_procedimentos:     { resource: 'procedimentos', action: 'DELETE' },
}

/**
 * Converte ação legada para ResourceAction do RBAC.
 * Retorna null se não houver mapeamento conhecido.
 */
export function mapLegacyAction(legacyAction: string): ResourceAction | null {
  return ACTION_MAP[legacyAction] ?? null
}
