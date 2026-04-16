/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Trophy,
  TrendingUp,
  MessageSquare,
  User,
  Gamepad2,
  UserCheck,
  UserSquareIcon,
  GraduationCap,
  BarChart3,
  Settings,
  Shield,
  HelpCircle,
  Library,
  Plus,
  Map,
  BookOpen,
  Play,
  ClipboardList,
  History,
  FileHeart,
  ClipboardCheck,
  BookMarked,
  Building2,
  Handshake,
} from "lucide-react";

export interface SidebarItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  requiredPermission?: { resource: string; action: string };
}

// ─── Navegação para perfis PROFISSIONAIS (RBAC-driven) ────────────────────────
// Lista unificada de todos os itens possíveis. A visibilidade é controlada
// exclusivamente pelas permissões RBAC do usuário, não pela role SSO.

export const PROFESSIONAL_ITEMS: SidebarItem[] = [
  // Dashboard (sempre visível para quem está logado)
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },

  // Gestão de Usuários
  { title: "Usuários", href: "/usuarios", icon: Users, requiredPermission: { resource: "usuarios", action: "VIEW" } },
  { title: "Profissionais", href: "/terapeutas", icon: UserCheck, requiredPermission: { resource: "terapeutas", action: "VIEW" } },

  // Clínica
  { title: "Pacientes", href: "/pacientes", icon: GraduationCap, requiredPermission: { resource: "pacientes", action: "VIEW" } },
  { title: "Agenda", href: "/agenda", icon: Calendar, requiredPermission: { resource: "agenda", action: "VIEW" } },
  { title: "Salas", href: "/salas", icon: Building2, requiredPermission: { resource: "salas", action: "VIEW" } },
  { title: "Convênios", href: "/convenios", icon: Handshake, requiredPermission: { resource: "convenios", action: "VIEW" } },
  { title: "Registro de Sessão", href: "/prontuarios", icon: FileText, requiredPermission: { resource: "prontuarios", action: "VIEW" } },
  { title: "Anamneses", href: "/anamnese", icon: FileHeart, requiredPermission: { resource: "anamneses", action: "VIEW" } },

  // Atendimento
  { title: "Iniciar Sessão", href: "/iniciar-sessao", icon: Play, requiredPermission: { resource: "sessoes", action: "CREATE" } },
  { title: "Plano Terapêutico", href: "/curriculum", icon: BookMarked, requiredPermission: { resource: "curriculums", action: "VIEW" } },
  { title: "Atividades", href: "/atividades-clinicas", icon: ClipboardList, requiredPermission: { resource: "atividades", action: "VIEW" } },
  { title: "Avaliações", href: "/avaliacoes", icon: ClipboardCheck, requiredPermission: { resource: "avaliacoes", action: "VIEW" } },
  { title: "Histórico de Sessões", href: "/historico-sessoes", icon: History, requiredPermission: { resource: "sessoes", action: "VIEW" } },
  { title: "Evolução", href: "/evolucao", icon: TrendingUp, requiredPermission: { resource: "evolucao", action: "VIEW" } },

  // Administração
  { title: "Relatórios", href: "/relatorios", icon: BarChart3, requiredPermission: { resource: "relatorios", action: "VIEW" } },
  { title: "Permissões", href: "/permissoes", icon: Shield, requiredPermission: { resource: "permissoes", action: "VIEW" } },
  { title: "Configurações", href: "/configuracoes", icon: Settings, requiredPermission: { resource: "configuracoes", action: "VIEW" } },

  // Perfil (sempre visível)
  { title: "Meu Perfil", href: "/perfil", icon: User },
];

// Definição de grupos para profissionais. Cada grupo lista os títulos dos itens
// que pertencem a ele. Grupos sem itens visíveis são omitidos automaticamente.
export const PROFESSIONAL_GROUPS: Record<string, string[]> = {
  "Principal": ["Dashboard"],
  "Gestão de Usuários": ["Usuários", "Profissionais"],
  "Clínica": ["Pacientes", "Agenda", "Salas", "Convênios", "Registro de Sessão", "Anamneses"],
  "Atendimento": ["Iniciar Sessão", "Plano Terapêutico", "Atividades", "Avaliações", "Histórico de Sessões", "Evolução"],
  "Administração": ["Relatórios", "Permissões", "Configurações"],
  "Perfil": ["Meu Perfil"],
};

// ─── Navegação para perfis NÃO-PROFISSIONAIS (role-based, sem RBAC) ──────────
// Pacientes, alunos e responsáveis usam uma UI diferente que não passa pelo RBAC.

export const getNonProfessionalItems = (userRole: string): SidebarItem[] => {
  const baseItems: SidebarItem[] = [
    { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  ];

  const roleItems: SidebarItem[] = [];

  switch (userRole.toLowerCase()) {
    case "paciente":
    case "aluno":
      roleItems.push(
        { title: "Trilhas Ativas", href: "/trilhas", icon: Map },
        { title: "Atividades", href: "/atividades", icon: Gamepad2 },
        { title: "Conquistas", href: "/conquistas", icon: Trophy },
        { title: "Meu Progresso", href: "/meu-progresso", icon: TrendingUp },
      );
      break;

    case "responsavel":
    case "tutor":
      roleItems.push(
        { title: "Acompanhar Aluno", href: "/acompanhar-aluno", icon: Users },
        { title: "Progresso do Aluno", href: "/progresso-aluno", icon: TrendingUp },
        { title: "Trilhas do Aluno", href: "/trilhas-aluno", icon: Map },
        { title: "Relatórios Semanais", href: "/relatorios-semanais", icon: FileText },
        { title: "Comunicação", href: "/comunicacao", icon: MessageSquare },
      );
      break;
  }

  return [...baseItems, ...roleItems, { title: "Meu Perfil", href: "/perfil", icon: User }];
};

export const NON_PROFESSIONAL_GROUPS: Record<string, Record<string, string[]>> = {
  "paciente": {
    "Aprendizado": ["Trilhas Ativas", "Atividades", "Conquistas", "Meu Progresso"],
    "Perfil": ["Meu Perfil"],
  },
  "aluno": {
    "Aprendizado": ["Trilhas Ativas", "Atividades", "Conquistas", "Meu Progresso"],
    "Perfil": ["Meu Perfil"],
  },
  "responsavel": {
    "Acompanhamento": ["Acompanhar Aluno", "Progresso do Aluno", "Trilhas do Aluno"],
    "Comunicação": ["Relatórios Semanais", "Comunicação"],
    "Perfil": ["Meu Perfil"],
  },
  "tutor": {
    "Acompanhamento": ["Acompanhar Aluno", "Progresso do Aluno", "Trilhas do Aluno"],
    "Comunicação": ["Relatórios Semanais", "Comunicação"],
    "Perfil": ["Meu Perfil"],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const NON_PROFESSIONAL_ROLES = ["paciente", "aluno", "responsavel", "tutor"];

export function isProfessionalRole(role: string): boolean {
  return !NON_PROFESSIONAL_ROLES.includes(role.toLowerCase());
}
