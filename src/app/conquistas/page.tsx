'use client'

import { MainLayout } from '@/components/main-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trophy, Star, Award, Target, Zap, Gift } from 'lucide-react'
import { PageHeader, StatCard } from '@/components/kit'

export default function ConquistasPage() {
  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Conquistas' }
  ]

  // Dados mockados para demonstração - Módulo 7: Sistema de Recompensas
  const conquistas = [
    {
      id: 1,
      nome: "Primeira Atividade",
      descricao: "Complete sua primeira atividade",
      tipo: "BADGE",
      icone: "🎉",
      cor: "#10B981",
      pontos: 50,
      conquistada: true,
      dataConquista: "2024-01-15",
      raridade: "comum"
    },
    {
      id: 2,
      nome: "Memória de Ferro",
      descricao: "Complete 5 jogos de memória sem errar",
      tipo: "TROFEU",
      icone: "🧠",
      cor: "#F59E0B",
      pontos: 200,
      conquistada: true,
      dataConquista: "2024-01-18",
      raridade: "raro"
    },
    {
      id: 3,
      nome: "Sequência Mestre",
      descricao: "Complete 10 atividades de sequência lógica",
      tipo: "BADGE",
      icone: "🔢",
      cor: "#8B5CF6",
      pontos: 300,
      conquistada: false,
      progresso: 7,
      total: 10,
      raridade: "epico"
    },
    {
      id: 4,
      nome: "Artista Digital",
      descricao: "Complete 15 atividades de colorir",
      tipo: "PERSONALIZACAO",
      icone: "🎨",
      cor: "#EC4899",
      pontos: 150,
      conquistada: false,
      progresso: 3,
      total: 15,
      raridade: "comum"
    },
    {
      id: 5,
      nome: "Matemático Jr.",
      descricao: "Acerte 50 operações matemáticas",
      tipo: "BADGE",
      icone: "➕",
      cor: "#3B82F6",
      pontos: 250,
      conquistada: true,
      dataConquista: "2024-01-20",
      raridade: "raro"
    },
    {
      id: 6,
      nome: "Persistente",
      descricao: "Faça atividades por 7 dias seguidos",
      tipo: "TROFEU",
      icone: "🔥",
      cor: "#EF4444",
      pontos: 500,
      conquistada: false,
      progresso: 4,
      total: 7,
      raridade: "lendario"
    }
  ]

  const getRaridadeColor = (raridade: string) => {
    switch (raridade) {
      case 'comum': return 'bg-surface-sunken text-ink'
      case 'raro': return 'bg-brand-soft text-brand'
      case 'epico': return 'bg-violet-soft text-violet-ink'
      case 'lendario': return 'bg-warning-soft text-warning-ink'
      default: return 'bg-surface-sunken text-ink'
    }
  }

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'BADGE': return <Award className="h-4 w-4" />
      case 'TROFEU': return <Trophy className="h-4 w-4" />
      case 'PERSONALIZACAO': return <Gift className="h-4 w-4" />
      default: return <Star className="h-4 w-4" />
    }
  }

  const conquistasObtidas = conquistas.filter(c => c.conquistada)
  const totalPontos = conquistasObtidas.reduce((sum, c) => sum + c.pontos, 0)

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          titulo="Conquistas"
          subtitulo="Suas medalhas, troféus e recompensas conquistadas"
          acoes={
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-warning-soft text-warning-ink">
                <Trophy className="w-3 h-3 mr-1" />
                {totalPontos} pontos
              </Badge>
            </div>
          }
        />

        {/* Estatísticas */}
        <div className="anim-escalonada grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.25fr_1fr_1fr_1fr]">
          <StatCard
            tom="blue"
            size="hero"
            icone={<Trophy />}
            rotulo="Total Conquistas"
            valor={conquistas.length}
          />

          <StatCard
            tom="lavender"
            icone={<Target />}
            rotulo="Conquistadas"
            valor={<span className="text-success-ink">{conquistasObtidas.length}</span>}
          />

          <StatCard
            tom="mint"
            icone={<Zap className="text-brand" />}
            rotulo="Em Progresso"
            valor={<span className="text-brand">{conquistas.filter(c => !c.conquistada && c.progresso).length}</span>}
          />

          <StatCard
            tom="peach"
            icone={<Star />}
            rotulo="Pontos Ganhos"
            valor={<span className="text-warning-ink">{totalPontos}</span>}
          />
        </div>

        {/* Grid de Conquistas */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {conquistas.map((conquista) => (
            <Card
              key={conquista.id}
              className={`hover:shadow-lg transition-all ${
                conquista.conquistada
                  ? 'border-success-soft bg-success-soft/30'
                  : 'border-hairline hover:border-border'
              }`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getTipoIcon(conquista.tipo)}
                    <Badge
                      variant="outline"
                      className={getRaridadeColor(conquista.raridade)}
                    >
                      {conquista.raridade}
                    </Badge>
                  </div>
                  {conquista.conquistada && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success-soft">
                      <Trophy className="h-4 w-4 text-success-ink" />
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
                    style={{ backgroundColor: `${conquista.cor}20` }}
                  >
                    {conquista.icone}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{conquista.nome}</CardTitle>
                    <CardDescription>{conquista.descricao}</CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Barra de Progresso para conquistas não obtidas */}
                {!conquista.conquistada && conquista.progresso !== undefined && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progresso</span>
                      <span>{conquista.progresso}/{conquista.total}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${(conquista.progresso! / conquista.total!) * 100}%`,
                          backgroundColor: conquista.cor
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Informações da conquista */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-muted-foreground">
                    <Star className="mr-1 h-3 w-3" />
                    {conquista.pontos} pontos
                  </div>
                  {conquista.conquistada && conquista.dataConquista && (
                    <div className="text-success-ink font-medium">
                      {new Date(conquista.dataConquista).toLocaleDateString('pt-BR')}
                    </div>
                  )}
                </div>

                {/* Status */}
                {conquista.conquistada ? (
                  <div className="flex items-center justify-center py-2 px-4 bg-success-soft text-success-ink rounded-md font-medium">
                    <Trophy className="mr-2 h-4 w-4" />
                    Conquistado!
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-2 px-4 bg-surface-sunken text-ink rounded-md">
                    <Target className="mr-2 h-4 w-4" />
                    Em progresso
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  )
}