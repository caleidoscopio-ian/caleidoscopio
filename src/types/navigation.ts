// Tipos para navegação baseados no Sistema 2
export interface NavigationItem {
  title: string
  url: string
  icon?: string
  badge?: string
  items?: NavigationItem[]
}

export interface NavigationData {
  navMain: NavigationItem[]
  navSecondary?: NavigationItem[]
}

// Perfis conforme Sistema 2
export type UserRole = 'PACIENTE' | 'RESPONSAVEL' | 'TERAPEUTA' | 'ADMIN'

// Configuração de navegação por perfil
export const getNavigationForRole = (role: UserRole): NavigationData => {
  switch (role) {
    case 'PACIENTE':
      return {
        navMain: [
          {
            title: "Dashboard",
            url: "/dashboard",
            icon: "LayoutDashboard"
          },
          {
            title: "Trilhas",
            url: "/trilhas",
            icon: "Map"
          },
          {
            title: "Atividades",
            url: "/atividades",
            icon: "Gamepad2"
          },
          {
            title: "Conquistas",
            url: "/conquistas",
            icon: "Trophy"
          }
        ],
        navSecondary: [
          {
            title: "Meu Perfil",
            url: "/perfil",
            icon: "User"
          }
        ]
      }

    case 'RESPONSAVEL':
      return {
        navMain: [
          {
            title: "Dashboard",
            url: "/dashboard",
            icon: "LayoutDashboard"
          },
          {
            title: "Progresso do Aluno",
            url: "/progresso",
            icon: "TrendingUp"
          },
          {
            title: "Relatórios",
            url: "/relatorios",
            icon: "FileText"
          },
          {
            title: "Comunicação",
            url: "/comunicacao",
            icon: "MessageSquare"
          }
        ],
        navSecondary: [
          {
            title: "Meu Perfil",
            url: "/perfil",
            icon: "User"
          }
        ]
      }

    case 'TERAPEUTA':
      return {
        navMain: [
          {
            title: "Dashboard",
            url: "/dashboard",
            icon: "LayoutDashboard"
          },
          {
            title: "Pacientes",
            url: "/pacientes",
            icon: "Users"
          },
          {
            title: "Agenda",
            url: "/agenda",
            icon: "Calendar"
          },
          {
            title: "Prontuários",
            url: "/prontuarios",
            icon: "FileText"
          },
          {
            title: "Trilhas e Atividades",
            url: "/gestao-trilhas",
            icon: "BookOpen",
            items: [
              {
                title: "Biblioteca de Trilhas",
                url: "/gestao-trilhas/biblioteca",
                icon: "Library"
              },
              {
                title: "Criar Trilha",
                url: "/gestao-trilhas/criar",
                icon: "Plus"
              },
              {
                title: "Atividades",
                url: "/gestao-trilhas/atividades",
                icon: "Puzzle"
              }
            ]
          }
        ],
        navSecondary: [
          {
            title: "Meu Perfil",
            url: "/perfil",
            icon: "User"
          }
        ]
      }

    case 'ADMIN':
      return {
        navMain: [
          {
            title: "Dashboard",
            url: "/dashboard",
            icon: "LayoutDashboard"
          },
          {
            title: "Gestão de Usuários",
            url: "/usuarios",
            icon: "Users",
            items: [
              {
                title: "Terapeutas",
                url: "/usuarios/terapeutas",
                icon: "UserCheck"
              },
              {
                title: "Responsáveis",
                url: "/usuarios/responsaveis",
                icon: "UserHeart"
              },
              {
                title: "Alunos",
                url: "/usuarios/alunos",
                icon: "GraduationCap"
              }
            ]
          },
          {
            title: "Pacientes",
            url: "/pacientes",
            icon: "Users"
          },
          {
            title: "Profissionais",
            url: "/profissionais",
            icon: "UserCheck"
          },
          {
            title: "Agenda",
            url: "/agenda",
            icon: "Calendar"
          },
          {
            title: "Relatórios",
            url: "/relatorios",
            icon: "BarChart3"
          },
          {
            title: "Configurações",
            url: "/configuracoes",
            icon: "Settings",
            items: [
              {
                title: "Geral",
                url: "/configuracoes/geral",
                icon: "Settings"
              },
              {
                title: "Permissões",
                url: "/configuracoes/permissoes",
                icon: "Shield"
              },
              {
                title: "Integrações",
                url: "/configuracoes/integracoes",
                icon: "Plug"
              }
            ]
          }
        ],
        navSecondary: [
          {
            title: "Meu Perfil",
            url: "/perfil",
            icon: "User"
          },
          {
            title: "Suporte",
            url: "/suporte",
            icon: "HelpCircle"
          }
        ]
      }

    default:
      return {
        navMain: [
          {
            title: "Dashboard",
            url: "/dashboard",
            icon: "LayoutDashboard"
          }
        ]
      }
  }
}