'use client'

import { MainLayout } from '@/components/main-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Gamepad2, Play, Clock, Star, Target, Brain } from 'lucide-react'
import { PageHeader, StatCard } from '@/components/kit'

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
      case 'concluido': return 'bg-success-soft text-success-ink'
      case 'em_progresso': return 'bg-brand-soft text-brand'
      case 'disponivel': return 'bg-surface-sunken text-ink'
      case 'bloqueado': return 'bg-danger-soft text-danger-ink'
      default: return 'bg-surface-sunken text-ink'
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
      case 'Fácil': return 'bg-success-soft text-success-ink'
      case 'Médio': return 'bg-warning-soft text-warning-ink'
      case 'Difícil': return 'bg-danger-soft text-danger-ink'
      default: return 'bg-surface-sunken text-ink'
    }
  }

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          titulo="Atividades"
          subtitulo="Execute atividades e ganhe pontos e conquistas"
          acoes={
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-brand-soft text-brand">
                <Star className="w-3 h-3 mr-1" />
                1,250 pontos
              </Badge>
            </div>
          }
        />

        {/* Estatísticas */}
        <div className="anim-escalonada grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.25fr_1fr_1fr_1fr]">
          <StatCard
            tom="blue"
            size="hero"
            icone={<Gamepad2 />}
            rotulo="Total Atividades"
            valor={atividades.length}
          />

          <StatCard
            tom="lavender"
            icone={<Target />}
            rotulo="Concluídas"
            valor={<span className="text-success-ink">{atividades.filter(a => a.status === 'concluido').length}</span>}
          />

          <StatCard
            tom="mint"
            icone={<Play className="text-brand" />}
            rotulo="Em Progresso"
            valor={<span className="text-brand">{atividades.filter(a => a.status === 'em_progresso').length}</span>}
          />

          <StatCard
            tom="peach"
            icone={<Star />}
            rotulo="Pontos Totais"
            valor={<span className="text-warning-ink">1,250</span>}
          />
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