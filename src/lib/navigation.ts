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
} from "lucide-react";

export interface SidebarItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  roleFilter?: string[];
  requiredPermission?: { resource: string; action: string };
}

// Navegação completa baseada nos módulos do Sistema 2
export const getSidebarItems = (userRole: string): SidebarItem[] => {
  const baseItems: SidebarItem[] = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
  ];

  const roleSpecificItems: SidebarItem[] = [];

  // Módulos específicos por perfil conforme documentação Sistema 2
  switch (userRole.toLowerCase()) {
    case "paciente":
    case "aluno":
      // Módulo 2 - Dashboard (Aluno) + Módulo 6 - Trilhas e Atividades + Módulo 7 - Sistema de Recompensas
      roleSpecificItems.push(
        {
          title: "Trilhas Ativas",
          href: "/trilhas",
          icon: Map,
        },
        {
          title: "Atividades",
          href: "/atividades",
          icon: Gamepad2,
        },
        {
          title: "Conquistas",
          href: "/conquistas",
          icon: Trophy,
        },
        {
          title: "Meu Progresso",
          href: "/meu-progresso",
          icon: TrendingUp,
        }
      );
      break;

    case "user": // Role USER = Terapeuta
    case "terapeuta":
      // Módulo 3 - Gestão de Pacientes + Módulo 4 - Agenda + Módulo 5 - Prontuário + Módulo 9 - Painel do Terapeuta + Módulo 10 - Biblioteca
      roleSpecificItems.push(
        {
          title: "Meus Pacientes",
          href: "/pacientes",
          icon: Users,
          requiredPermission: { resource: "pacientes", action: "VIEW" },
        },
        {
          title: "Agenda",
          href: "/agenda",
          icon: Calendar,
          requiredPermission: { resource: "agenda", action: "VIEW" },
        },
        {
          title: "Registro de Sessão",
          href: "/prontuarios",
          icon: FileText,
          requiredPermission: { resource: "prontuarios", action: "VIEW" },
        },
        {
          title: "Anamneses",
          href: "/anamnese",
          icon: FileHeart,
          requiredPermission: { resource: "prontuarios", action: "VIEW" },
        },
        {
          title: "Iniciar Sessão",
          href: "/iniciar-sessao",
          icon: Play,
          requiredPermission: { resource: "sessoes", action: "CREATE" },
        },
        {
          title: "Plano Terapêutico",
          href: "/curriculum",
          icon: BookMarked,
          requiredPermission: { resource: "curriculums", action: "VIEW" },
        },
        {
          title: "Atividades",
          href: "/atividades-clinicas",
          icon: ClipboardList,
          requiredPermission: { resource: "atividades", action: "VIEW" },
        },
        {
          title: "Avaliações",
          href: "/avaliacoes",
          icon: ClipboardCheck,
          requiredPermission: { resource: "avaliacoes", action: "VIEW" },
        },
        {
          title: "Histórico de Sessões",
          href: "/historico-sessoes",
          icon: History,
          requiredPermission: { resource: "sessoes", action: "VIEW" },
        },
        {
          title: "Evolução",
          href: "/evolucao",
          icon: TrendingUp,
          requiredPermission: { resource: "evolucao", action: "VIEW" },
        },
        {
          title: "Permissões",
          href: "/permissoes",
          icon: Shield,
          requiredPermission: { resource: "permissoes", action: "VIEW" },
        }
      );
      break;

    case "responsavel":
    case "tutor":
      // Módulo 8 - Painel do Responsável
      roleSpecificItems.push(
        {
          title: "Acompanhar Aluno",
          href: "/acompanhar-aluno",
          icon: Users,
        },
        {
          title: "Progresso do Aluno",
          href: "/progresso-aluno",
          icon: TrendingUp,
        },
        {
          title: "Trilhas do Aluno",
          href: "/trilhas-aluno",
          icon: Map,
        },
        {
          title: "Relatórios Semanais",
          href: "/relatorios-semanais",
          icon: FileText,
        },
        {
          title: "Comunicação",
          href: "/comunicacao",
          icon: MessageSquare,
        }
      );
      break;

    case "admin":
    case "super_admin":
      // Módulo 11 - Painel do Admin Educacional + todos os outros módulos
      roleSpecificItems.push(
        {
          title: "Usuários",
          href: "/usuarios",
          icon: Users,
          requiredPermission: { resource: "usuarios", action: "VIEW" },
        },
        {
          title: "Profissionais",
          href: "/terapeutas",
          icon: UserCheck,
          requiredPermission: { resource: "terapeutas", action: "VIEW" },
        },
        {
          title: "Pacientes",
          href: "/pacientes",
          icon: GraduationCap,
          requiredPermission: { resource: "pacientes", action: "VIEW" },
        },
        {
          title: "Agenda Global",
          href: "/agenda",
          icon: Calendar,
          requiredPermission: { resource: "agenda", action: "VIEW" },
        },
        {
          title: "Salas",
          href: "/salas",
          icon: Building2,
          requiredPermission: { resource: "salas", action: "VIEW" },
        },
        {
          title: "Registro de Sessão",
          href: "/prontuarios",
          icon: FileText,
          requiredPermission: { resource: "prontuarios", action: "VIEW" },
        },
        {
          title: "Anamneses",
          href: "/anamnese",
          icon: FileHeart,
          requiredPermission: { resource: "prontuarios", action: "VIEW" },
        },
        {
          title: "Iniciar Sessão",
          href: "/iniciar-sessao",
          icon: Play,
          requiredPermission: { resource: "sessoes", action: "CREATE" },
        },
        {
          title: "Plano Terapêutico",
          href: "/curriculum",
          icon: BookMarked,
          requiredPermission: { resource: "curriculums", action: "VIEW" },
        },
        {
          title: "Atividades",
          href: "/atividades-clinicas",
          icon: ClipboardList,
          requiredPermission: { resource: "atividades", action: "VIEW" },
        },
        {
          title: "Avaliações",
          href: "/avaliacoes",
          icon: ClipboardCheck,
          requiredPermission: { resource: "avaliacoes", action: "VIEW" },
        },
        {
          title: "Histórico de Sessões",
          href: "/historico-sessoes",
          icon: History,
          requiredPermission: { resource: "sessoes", action: "VIEW" },
        },
        {
          title: "Evolução",
          href: "/evolucao",
          icon: TrendingUp,
          requiredPermission: { resource: "evolucao", action: "VIEW" },
        },
        {
          title: "Relatórios",
          href: "/relatorios",
          icon: BarChart3,
          requiredPermission: { resource: "relatorios", action: "VIEW" },
        },
        {
          title: "Permissões",
          href: "/permissoes",
          icon: Shield,
          requiredPermission: { resource: "permissoes", action: "VIEW" },
        },
        {
          title: "Configurações",
          href: "/configuracoes",
          icon: Settings,
          requiredPermission: { resource: "configuracoes", action: "VIEW" },
        }
      );
      break;

    default:
      // Se a role não for reconhecida, usar perfil básico de usuário/aluno
      roleSpecificItems.push(
        {
          title: "Trilhas Ativas",
          href: "/trilhas",
          icon: Map,
        },
        {
          title: "Atividades",
          href: "/atividades",
          icon: Gamepad2,
        },
        {
          title: "Conquistas",
          href: "/conquistas",
          icon: Trophy,
        }
      );
      break;
  }

  // Itens comuns no final
  const commonItems: SidebarItem[] = [
    {
      title: "Meu Perfil",
      href: "/perfil",
      icon: User,
    },
  ];

  return [...baseItems, ...roleSpecificItems, ...commonItems];
};
