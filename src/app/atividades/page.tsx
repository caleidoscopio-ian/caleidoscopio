'use client'

import { MainLayout } from '@/components/main-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Gamepad2, Play, Clock, Star, Target, Brain } from 'lucide-react'

export default function AtividadesPage() {
  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Atividades' }
  ]

  // Dados mockados para demonstração - Módulo 6: Trilhas e Atividades
  const atividades = [
    {
      id: 1,
      nome: "Jogo da Memória - Animais",
      tipo: "JOGO_MEMORIA",
      descricao: "Encontre os pares de animais iguais",
      dificuldade: "Fácil",
      tempo: "5-10 min",
      pontos: 50,
      categoria: "Memória",
      status: "disponivel",
      progresso: 0
    },
    {
      id: 2,
      nome: "Quebra-cabeça das Cores",
      tipo: "QUEBRA_CABECA",
      descricao: "Monte o quebra-cabeça seguindo as cores",
      dificuldade: "Médio",
      tempo: "10-15 min",
      pontos: 75,
      categoria: "Coordenação",
      status: "em_progresso",
      progresso: 60
    },
    {
      id: 3,
      nome: "Associação de Números",
      tipo: "ASSOCIACAO",
      descricao: "Associe os números com as quantidades",
      dificuldade: "Médio",
      tempo: "8-12 min",
      pontos: 100,
      categoria: "Matemática",
      status: "concluido",
      progresso: 100
    },
    {
      id: 4,
      nome: "Sequência Lógica",
      tipo: "SEQUENCIA",
      descricao: "Complete a sequência de formas e cores",
      dificuldade: "Difícil",
      tempo: "15-20 min",
      pontos: 150,
      categoria: "Lógica",
      status: "bloqueado",
      progresso: 0
    },
    {
      id: 5,
      nome: "Colorir Mandala",
      tipo: "COLORIR",
      descricao: "Pinte a mandala seguindo o padrão",
      dificuldade: "Fácil",
      tempo: "10-15 min",
      pontos: 60,
      categoria: "Criatividade",
      status: "disponivel",
      progresso: 0
    },
    {
      id: 6,
      nome: "Soma Divertida",
      tipo: "MATEMATICA",
      descricao: "Resolva as operações de soma",
      dificuldade: "Médio",
      tempo: "12-18 min",
      pontos: 120,
      categoria: "Matemática",
      status: "disponivel",
      progresso: 0
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'concluido': return 'bg-green-100 text-green-800'
      case 'em_progresso': return 'bg-blue-100 text-blue-800'
      case 'disponivel': return 'bg-gray-100 text-gray-800'
      case 'bloqueado': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'concluido': return 'Concluído'
      case 'em_progresso': return 'Em Progresso'
      case 'disponivel': return 'Disponível'
      case 'bloqueado': return 'Bloqueado'
      default: return 'Disponível'
    }
  }

  const getDifficultyColor = (dificuldade: string) => {
    switch (dificuldade) {
      case 'Fácil': return 'bg-green-100 text-green-800'
      case 'Médio': return 'bg-yellow-100 text-yellow-800'
      case 'Difícil': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Atividades</h1>
            <p className="text-muted-foreground">
              Execute atividades e ganhe pontos e conquistas
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              <Star className="w-3 h-3 mr-1" />
              1,250 pontos
            </Badge>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Atividades</CardTitle>
              <Gamepad2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{atividades.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
              <Target className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {atividades.filter(a => a.status === 'concluido').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Progresso</CardTitle>
              <Play className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {atividades.filter(a => a.status === 'em_progresso').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pontos Totais</CardTitle>
              <Star className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">1,250</div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Atividades */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {atividades.map((atividade) => (
            <Card key={atividade.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={getDifficultyColor(atividade.dificuldade)}
                  >
                    {atividade.dificuldade}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={getStatusColor(atividade.status)}
                  >
                    {getStatusText(atividade.status)}
                  </Badge>
                </div>
                <CardTitle className="text-xl">{atividade.nome}</CardTitle>
                <CardDescription>{atividade.descricao}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Barra de Progresso */}
                {atividade.progresso > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progresso</span>
                      <span>{atividade.progresso}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${atividade.progresso}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Informações */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center text-muted-foreground">
                    <Clock className="mr-1 h-3 w-3" />
                    {atividade.tempo}
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <Star className="mr-1 h-3 w-3" />
                    {atividade.pontos} pts
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <Brain className="mr-1 h-3 w-3" />
                    {atividade.categoria}
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <Target className="mr-1 h-3 w-3" />
                    {atividade.tipo.replace('_', ' ')}
                  </div>
                </div>

                {/* Botão de Ação */}
                <Button
                  className="w-full"
                  variant={atividade.status === 'bloqueado' ? "outline" : "default"}
                  disabled={atividade.status === 'bloqueado'}
                >
                  <Play className="mr-2 h-4 w-4" />
                  {atividade.status === 'concluido' && 'Repetir'}
                  {atividade.status === 'em_progresso' && 'Continuar'}
                  {atividade.status === 'disponivel' && 'Iniciar'}
                  {atividade.status === 'bloqueado' && 'Bloqueado'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  )
}