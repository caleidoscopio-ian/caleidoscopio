"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "@/components/main-layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { AbaGeral } from "@/components/avaliacoes/aba-geral";
import { AbaNiveis } from "@/components/avaliacoes/aba-niveis";
import { AbaHabilidades } from "@/components/avaliacoes/aba-habilidades";
import { AbaPontuacao } from "@/components/avaliacoes/aba-pontuacao";
import { AbaTarefas } from "@/components/avaliacoes/aba-tarefas";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

export default function EditarAvaliacaoPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("geral");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const avaliacaoId = params.id as string;

  const [dadosGerais, setDadosGerais] = useState({
    tipo: "",
    nome: "",
    observacao: "",
  });

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Avaliações", href: "/avaliacoes" },
    { label: "Editar" },
  ];

  // Carregar dados da avaliação
  useEffect(() => {
    const fetchAvaliacao = async () => {
      try {
        setLoading(true);
        if (!user) return;

        const userDataEncoded = btoa(JSON.stringify(user));
        const response = await fetch(`/api/avaliacoes?id=${avaliacaoId}`, {
          headers: {
            "X-User-Data": userDataEncoded,
            "X-Auth-Token": user.token,
          },
        });

        const result = await response.json();

        if (result.success) {
          setDadosGerais({
            tipo: result.data.tipo,
            nome: result.data.nome,
            observacao: result.data.observacao || "",
          });
        } else {
          setError(result.error || "Erro ao carregar avaliação");
        }
      } catch (error) {
        console.error("Erro:", error);
        setError("Erro ao carregar avaliação");
      } finally {
        setLoading(false);
      }
    };

    fetchAvaliacao();
  }, [avaliacaoId, user]);

  const handleVoltar = () => {
    if (confirm("Deseja realmente sair? Alterações não salvas serão perdidas.")) {
      router.push("/avaliacoes");
    }
  };

  if (loading) {
    return (
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout breadcrumbs={breadcrumbs}>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={() => router.push("/avaliacoes")}>
                Voltar para Avaliações
              </Button>
            </div>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleVoltar}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Editar Avaliação
            </h1>
            <p className="text-muted-foreground">
              Edite o protocolo de avaliação
            </p>
          </div>

          <Button onClick={() => router.push("/avaliacoes")}>
            <Save className="mr-2 h-4 w-4" />
            Concluir
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="niveis">Níveis</TabsTrigger>
            <TabsTrigger value="habilidades">Habilidades</TabsTrigger>
            <TabsTrigger value="pontuacao">Pontuação</TabsTrigger>
            <TabsTrigger value="tarefas">Tarefas</TabsTrigger>
          </TabsList>

          <TabsContent value="geral">
            <AbaGeral
              dados={dadosGerais}
              onChange={setDadosGerais}
              avaliacaoId={avaliacaoId}
            />
          </TabsContent>

          <TabsContent value="niveis">
            <AbaNiveis avaliacaoId={avaliacaoId} />
          </TabsContent>

          <TabsContent value="habilidades">
            <AbaHabilidades avaliacaoId={avaliacaoId} />
          </TabsContent>

          <TabsContent value="pontuacao">
            <AbaPontuacao avaliacaoId={avaliacaoId} />
          </TabsContent>

          <TabsContent value="tarefas">
            <AbaTarefas avaliacaoId={avaliacaoId} />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
