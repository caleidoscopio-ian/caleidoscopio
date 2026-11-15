"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "@/components/main-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Save } from "lucide-react";
import { AbaGeral } from "@/components/avaliacoes/aba-geral";
import { AbaNiveis } from "@/components/avaliacoes/aba-niveis";
import { AbaHabilidades } from "@/components/avaliacoes/aba-habilidades";
import { AbaPontuacao } from "@/components/avaliacoes/aba-pontuacao";
import { AbaTarefas } from "@/components/avaliacoes/aba-tarefas";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ActionButton, Carregando, EstadoVazio, PageHeader } from "@/components/kit";

function EditarAvaliacaoPageContent() {
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
        <Carregando texto="Carregando avaliação..." className="py-24" />
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="py-16">
          <EstadoVazio
            icone={<AlertCircle />}
            titulo={error}
            acao={
              <ActionButton variant="secondary" onClick={() => router.push("/avaliacoes")}>
                Voltar para Avaliações
              </ActionButton>
            }
          />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-7">
        <PageHeader
          voltar={{ onClick: handleVoltar }}
          titulo="Editar Avaliação"
          subtitulo="Edite o protocolo de avaliação"
          acoes={
            <ActionButton onClick={() => router.push("/avaliacoes")}>
              <Save />
              Concluir
            </ActionButton>
          }
        />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Abas na largura toda, como no detalhe da avaliação do v2 */}
          <TabsList className="w-full">
            <TabsTrigger value="geral" className="flex-1">Geral</TabsTrigger>
            <TabsTrigger value="niveis" className="flex-1">Níveis</TabsTrigger>
            <TabsTrigger value="habilidades" className="flex-1">Habilidades</TabsTrigger>
            <TabsTrigger value="pontuacao" className="flex-1">Pontuação</TabsTrigger>
            <TabsTrigger value="tarefas" className="flex-1">Tarefas</TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="mt-5">
            <AbaGeral
              dados={dadosGerais}
              onChange={setDadosGerais}
              avaliacaoId={avaliacaoId}
            />
          </TabsContent>

          <TabsContent value="niveis" className="mt-5">
            <AbaNiveis avaliacaoId={avaliacaoId} />
          </TabsContent>

          <TabsContent value="habilidades" className="mt-5">
            <AbaHabilidades avaliacaoId={avaliacaoId} />
          </TabsContent>

          <TabsContent value="pontuacao" className="mt-5">
            <AbaPontuacao avaliacaoId={avaliacaoId} />
          </TabsContent>

          <TabsContent value="tarefas" className="mt-5">
            <AbaTarefas avaliacaoId={avaliacaoId} />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

export default function EditarAvaliacaoPage() {
  return (
    <ProtectedRoute requiredPermission={{ resource: 'avaliacoes', action: 'UPDATE' }}>
      <EditarAvaliacaoPageContent />
    </ProtectedRoute>
  );
}
