'use client'

import { MainLayout } from '@/components/main-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trophy, Star, Award, Target, Zap, Gift } from 'lucide-react'

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
      case 'comum': return 'bg-gray-100 text-gray-800'
      case 'raro': return 'bg-blue-100 text-blue-800'
      case 'epico': return 'bg-purple-100 text-purple-800'
      case 'lendario': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Conquistas</h1>
            <p className="text-muted-foreground">
              Suas medalhas, troféus e recompensas conquistadas
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
              <Trophy className="w-3 h-3 mr-1" />
              {totalPontos} pontos
            </Badge>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Conquistas</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{conquistas.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conquistadas</CardTitle>
              <Target className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {conquistasObtidas.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Progresso</CardTitle>
              <Zap className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {conquistas.filter(c => !c.conquistada && c.progresso).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pontos Ganhos</CardTitle>
              <Star className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{totalPontos}</div>
            </CardContent>
          </Card>
        </div>

        {/* Grid de Conquistas */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {conquistas.map((conquista) => (
            <Card
              key={conquista.id}
              className={`hover:shadow-lg transition-all ${
                conquista.conquistada
                  ? 'border-green-200 bg-green-50/30'
                  : 'border-gray-200 hover:border-gray-300'
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
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                      <Trophy className="h-4 w-4 text-green-600" />
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
                    <div className="text-green-600 font-medium">
                      {new Date(conquista.dataConquista).toLocaleDateString('pt-BR')}
                    </div>
                  )}
                </div>

                {/* Status */}
                {conquista.conquistada ? (
                  <div className="flex items-center justify-center py-2 px-4 bg-green-100 text-green-800 rounded-md font-medium">
                    <Trophy className="mr-2 h-4 w-4" />
                    Conquistado!
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-2 px-4 bg-gray-100 text-gray-600 rounded-md">
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