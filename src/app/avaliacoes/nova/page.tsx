"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export default function NovaAvaliacaoPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("geral");
  const [saving, setSaving] = useState(false);
  const [avaliacaoId, setAvaliacaoId] = useState<string | null>(null);

  // Dados da aba Geral
  const [dadosGerais, setDadosGerais] = useState({
    tipo: "",
    nome: "",
    observacao: "",
  });

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Avaliações", href: "/avaliacoes" },
    { label: "Nova Avaliação" },
  ];

  const handleSalvarGeral = async () => {
    try {
      setSaving(true);

      if (!dadosGerais.tipo || !dadosGerais.nome) {
        alert("Tipo e Nome são obrigatórios");
        return;
      }

      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch("/api/avaliacoes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
        body: JSON.stringify(dadosGerais),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao salvar avaliação");
      }

      if (result.success) {
        setAvaliacaoId(result.data.id);
        alert(
          "Avaliação criada com sucesso! Agora você pode adicionar níveis, habilidades e tarefas."
        );
        // Mudar para aba de níveis
        setActiveTab("niveis");
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar avaliação. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleVoltar = () => {
    if (confirm("Deseja realmente sair? Dados não salvos serão perdidos.")) {
      router.push("/avaliacoes");
    }
  };

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
              Nova Avaliação ABA+
            </h1>
            <p className="text-muted-foreground">
              Crie um novo protocolo de avaliação
            </p>
          </div>

          {activeTab === "geral" && !avaliacaoId && (
            <Button onClick={handleSalvarGeral} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar e Continuar
                </>
              )}
            </Button>
          )}

          {avaliacaoId && (
            <Button onClick={() => router.push("/avaliacoes")}>
              <Save className="mr-2 h-4 w-4" />
              Concluir
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="niveis" disabled={!avaliacaoId}>
              Níveis
            </TabsTrigger>
            <TabsTrigger value="habilidades" disabled={!avaliacaoId}>
              Habilidades
            </TabsTrigger>
            <TabsTrigger value="pontuacao" disabled={!avaliacaoId}>
              Pontuação
            </TabsTrigger>
            <TabsTrigger value="tarefas" disabled={!avaliacaoId}>
              Tarefas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="geral">
            <AbaGeral
              dados={dadosGerais}
              onChange={setDadosGerais}
              avaliacaoId={avaliacaoId}
            />
          </TabsContent>

          <TabsContent value="niveis">
            {avaliacaoId && <AbaNiveis avaliacaoId={avaliacaoId} />}
          </TabsContent>

          <TabsContent value="habilidades">
            {avaliacaoId && <AbaHabilidades avaliacaoId={avaliacaoId} />}
          </TabsContent>

          <TabsContent value="pontuacao">
            {avaliacaoId && <AbaPontuacao avaliacaoId={avaliacaoId} />}
          </TabsContent>

          <TabsContent value="tarefas">
            {avaliacaoId && <AbaTarefas avaliacaoId={avaliacaoId} />}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
