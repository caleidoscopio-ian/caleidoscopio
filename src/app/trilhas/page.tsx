'use client'

import { MainLayout } from '@/components/main-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Map, Play, Clock, Star } from 'lucide-react'
import { PageHeader, StatCard } from '@/components/kit'

export default function TrilhasPage() {
  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Trilhas' }
  ]

  // Dados mockados para demonstração
  const trilhas = [
    {
      id: 1,
      nome: "Matemática Básica",
      descricao: "Números, operações e contagem",
      progresso: 75,
      atividades: 12,
      concluidas: 9,
      tempo: "2h 30min",
      nivel: "Iniciante"
    },
    {
      id: 2,
      nome: "Comunicação Social",
      descricao: "Expressão e interação social",
      progresso: 45,
      atividades: 8,
      concluidas: 4,
      tempo: "1h 45min",
      nivel: "Intermediário"
    },
    {
      id: 3,
      nome: "Coordenação Motora",
      descricao: "Desenvolvimento motor fino e grosso",
      progresso: 20,
      atividades: 15,
      concluidas: 3,
      tempo: "3h 15min",
      nivel: "Avançado"
    }
  ]

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          titulo="Trilhas de Aprendizado"
          subtitulo="Explore as trilhas educacionais personalizadas"
          acoes={
            <Button>
              <Map className="mr-2 h-4 w-4" />
              Nova Trilha
            </Button>
          }
        />

        {/* Estatísticas */}
        <div className="anim-escalonada grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.25fr_1fr_1fr_1fr]">
          <StatCard tom="blue" size="hero" icone={<Map />} rotulo="Total Trilhas" valor={trilhas.length} />

          <StatCard tom="lavender" icone={<Play />} rotulo="Em Progresso" valor="2" />

          <StatCard tom="mint" icone={<Star />} rotulo="Concluídas" valor="0" />

          <StatCard tom="peach" icone={<Clock />} rotulo="Tempo Total" valor="7h 30min" />
        </div>

        {/* Lista de Trilhas */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {trilhas.map((trilha) => (
            <Card key={trilha.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{trilha.nivel}</Badge>
                  <div className="text-sm text-muted-foreground">
                    {trilha.concluidas}/{trilha.atividades} atividades
                  </div>
                </div>
                <CardTitle className="text-xl">{trilha.nome}</CardTitle>
                <CardDescription>{trilha.descricao}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Barra de Progresso */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progresso</span>
                    <span>{trilha.progresso}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${trilha.progresso}%` }}
                    />
                  </div>
                </div>

                {/* Informações */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Clock className="mr-1 h-3 w-3" />
                    {trilha.tempo}
                  </div>
                  <div className="flex items-center">
                    <Map className="mr-1 h-3 w-3" />
                    {trilha.atividades} atividades
                  </div>
                </div>

                {/* Botão de Ação */}
                <Button className="w-full" variant={trilha.progresso > 0 ? "default" : "outline"}>
                  <Play className="mr-2 h-4 w-4" />
                  {trilha.progresso > 0 ? 'Continuar' : 'Iniciar'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  )
}