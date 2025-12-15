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
} from "lucide-react";

export interface SidebarItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  roleFilter?: string[];
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
        },
        {
          title: "Agenda",
          href: "/agenda",
          icon: Calendar,
        },
        {
          title: "Prontuários",
          href: "/prontuarios",
          icon: FileText,
        },
        {
          title: "Anamneses",
          href: "/anamnese",
          icon: FileHeart,
        },
        {
          title: "Atividades Clínicas",
          href: "/atividades-clinicas",
          icon: ClipboardList,
        },
        {
          title: "Iniciar Sessão",
          href: "/iniciar-sessao",
          icon: Play,
        },
        {
          title: "Histórico de Sessões",
          href: "/historico-sessoes",
          icon: History,
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
        },
        {
          title: "Terapeutas",
          href: "/terapeutas",
          icon: UserCheck,
        },
        {
          title: "Responsáveis",
          href: "/responsaveis",
          icon: UserSquareIcon,
        },
        {
          title: "Pacientes",
          href: "/pacientes",
          icon: GraduationCap,
        },
        {
          title: "Agenda Global",
          href: "/agenda",
          icon: Calendar,
        },
        {
          title: "Prontuários",
          href: "/prontuarios",
          icon: FileText,
        },
        {
          title: "Anamneses",
          href: "/anamnese",
          icon: FileHeart,
        },
        {
          title: "Atividades Clínicas",
          href: "/atividades-clinicas",
          icon: ClipboardList,
        },
        {
          title: "Iniciar Sessão",
          href: "/iniciar-sessao",
          icon: Play,
        },
        {
          title: "Histórico de Sessões",
          href: "/historico-sessoes",
          icon: History,
        },
        {
          title: "Relatórios e Indicadores",
          href: "/relatorios",
          icon: BarChart3,
        },
        {
          title: "Permissões",
          href: "/permissoes",
          icon: Shield,
        },
        {
          title: "Configurações",
          href: "/configuracoes",
          icon: Settings,
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
