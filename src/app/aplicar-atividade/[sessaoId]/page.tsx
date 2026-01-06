/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "@/components/main-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Play,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Save,
  ArrowLeft,
  ArrowRight,
  ClipboardCheck,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Instrucao {
  id: string;
  ordem: number;
  texto: string;
  observacao?: string;
}

interface Atividade {
  id: string;
  nome: string;
  tipo: string;
  metodologia?: string;
  instrucoes: Instrucao[];
}

interface Paciente {
  id: string;
  name: string;
}

interface Sessao {
  id: string;
  pacienteId: string;
  atividadeId: string;
  status: string;
  iniciada_em: string;
  paciente: Paciente;
  atividade: Atividade;
}

interface Avaliacao {
  instrucaoId: string;
  nota: number;
  tipos_ajuda: string[];
  observacao: string;
}

export default function AplicarAtividadePage() {
  const router = useRouter();
  const params = useParams();
  const sessaoId = params.sessaoId as string;
  const { user, isAuthenticated } = useAuth();

  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instrucaoAtual, setInstrucaoAtual] = useState(0);
  const [avaliacoes, setAvaliacoes] = useState<Map<string, Avaliacao>>(
    new Map()
  );

  // Estado da avaliação atual
  const [nota, setNota] = useState<number | null>(null);
  const [tiposAjuda, setTiposAjuda] = useState<string[]>([]);
  const [observacao, setObservacao] = useState("");

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Iniciar Sessão", href: "/iniciar-sessao" },
    { label: "Aplicar Atividade" },
  ];

  // Buscar dados da sessão
  const fetchSessao = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!isAuthenticated || !user) {
        throw new Error("Usuário não autenticado");
      }

      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch(`/api/sessoes?id=${sessaoId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao buscar sessão");
      }

      if (result.success) {
        setSessao(result.data);
      }
    } catch (err) {
      console.error("❌ Erro ao buscar sessão:", err);
      setError(err instanceof Error ? err.message : "Erro ao carregar sessão");
    } finally {
      setLoading(false);
    }
  };

  // Salvar avaliação da instrução atual
  const salvarAvaliacaoAtual = async () => {
    if (!sessao || nota === null || nota === undefined) {
      setError("Selecione uma nota de 0 a 4");
      return false;
    }

    try {
      setSalvando(true);
      setError(null);

      const instrucao = sessao.atividade.instrucoes[instrucaoAtual];

      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch("/api/sessoes/avaliar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
        body: JSON.stringify({
          sessaoId: sessao.id,
          instrucaoId: instrucao.id,
          nota,
          tipos_ajuda: tiposAjuda,
          observacao: observacao || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao salvar avaliação");
      }

      // Salvar no estado local
      const novaAvaliacao: Avaliacao = {
        instrucaoId: instrucao.id,
        nota,
        tipos_ajuda: tiposAjuda,
        observacao,
      };

      setAvaliacoes((prev) => new Map(prev).set(instrucao.id, novaAvaliacao));

      return true;
    } catch (err) {
      console.error("❌ Erro ao salvar avaliação:", err);
      setError(err instanceof Error ? err.message : "Erro ao salvar avaliação");
      return false;
    } finally {
      setSalvando(false);
    }
  };

  // Avançar para próxima instrução
  const proximaInstrucao = async () => {
    const sucesso = await salvarAvaliacaoAtual();

    if (sucesso && sessao) {
      if (instrucaoAtual < sessao.atividade.instrucoes.length - 1) {
        setInstrucaoAtual((prev) => prev + 1);
        // Limpar campos
        setNota(null);
        setTiposAjuda([]);
        setObservacao("");
      }
    }
  };

  // Voltar para instrução anterior
  const instrucaoAnterior = () => {
    if (instrucaoAtual > 0) {
      setInstrucaoAtual((prev) => prev - 1);

      // Carregar avaliação salva
      if (sessao) {
        const instrucao = sessao.atividade.instrucoes[instrucaoAtual - 1];
        const avaliacaoSalva = avaliacoes.get(instrucao.id);

        if (avaliacaoSalva) {
          setNota(avaliacaoSalva.nota);
          setTiposAjuda(avaliacaoSalva.tipos_ajuda);
          setObservacao(avaliacaoSalva.observacao);
        } else {
          // Limpar campos se não houver avaliação salva
          setNota(null);
          setTiposAjuda([]);
          setObservacao("");
        }
      }
    }
  };

  // Finalizar sessão
  const finalizarSessao = async () => {
    if (!sessao) return;

    // Verificar se todas as instruções foram avaliadas
    if (avaliacoes.size !== sessao.atividade.instrucoes.length) {
      setError("Avalie todas as instruções antes de finalizar");
      return;
    }

    try {
      setFinalizando(true);
      setError(null);

      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch("/api/sessoes/finalizar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
        body: JSON.stringify({
          sessaoId: sessao.id,
          observacoes_gerais: observacao || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao finalizar sessão");
      }

      // Redirecionar para lista de sessões ou dashboard
      router.push("/iniciar-sessao");
    } catch (err) {
      console.error("❌ Erro ao finalizar sessão:", err);
      setError(err instanceof Error ? err.message : "Erro ao finalizar sessão");
    } finally {
      setFinalizando(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user && sessaoId) {
      fetchSessao();
    }
  }, [isAuthenticated, user, sessaoId]);

  if (loading) {
    return (
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="text-center py-12">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando sessão...</p>
        </div>
      </MainLayout>
    );
  }

  if (error && !sessao) {
    return (
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Erro ao carregar sessão</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => router.push("/iniciar-sessao")}>
            Voltar para Iniciar Sessão
          </Button>
        </div>
      </MainLayout>
    );
  }

  if (!sessao) {
    return (
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Sessão não encontrada</h3>
          <Button onClick={() => router.push("/iniciar-sessao")}>
            Voltar para Iniciar Sessão
          </Button>
        </div>
      </MainLayout>
    );
  }

  const instrucao = sessao.atividade.instrucoes[instrucaoAtual];
  const progresso =
    (avaliacoes.size / sessao.atividade.instrucoes.length) * 100;
  const isUltimaInstrucao =
    instrucaoAtual === sessao.atividade.instrucoes.length - 1;
  const todasAvaliadas = avaliacoes.size === sessao.atividade.instrucoes.length;

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header com informações da sessão */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Aplicar Atividade
          </h1>
          <p className="text-muted-foreground">
            Paciente: <strong>{sessao.paciente.name}</strong> • Atividade:{" "}
            <strong>{sessao.atividade.nome}</strong>
          </p>
        </div>

        {/* Progresso */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Progresso da Sessão
                </span>
                <span className="font-medium">
                  {avaliacoes.size} de {sessao.atividade.instrucoes.length}{" "}
                  instruções
                </span>
              </div>
              <Progress value={progresso} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {/* Instrução Atual */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Badge variant="secondary">Instrução {instrucao.ordem}</Badge>
                  {avaliacoes.has(instrucao.id) && (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  )}
                </CardTitle>
                <CardDescription>
                  {instrucaoAtual + 1} de {sessao.atividade.instrucoes.length}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Texto da instrução */}
            <div className="p-4 bg-primary/5 border-l-4 border-primary rounded">
              <p className="text-lg font-medium">{instrucao.texto}</p>
              {instrucao.observacao && (
                <p className="text-sm text-muted-foreground mt-2">
                  Obs: {instrucao.observacao}
                </p>
              )}
            </div>

            {/* Avaliação */}
            <div className="space-y-4">
              <div>
                <Label className="text-base">Nota de Desempenho *</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Avalie o desempenho do paciente nesta instrução
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {[0, 1, 2, 3, 4].map((value) => (
                    <Button
                      key={value}
                      type="button"
                      variant={nota === value ? "default" : "outline"}
                      className={`h-16 text-lg font-bold ${
                        nota === value ? "" : "hover:bg-primary/10"
                      }`}
                      onClick={() => setNota(value)}
                    >
                      {value}
                    </Button>
                  ))}
                </div>
                <div className="grid grid-cols-5 gap-2 mt-2 text-xs text-center text-muted-foreground">
                  <div>Falhou</div>
                  <div>Ruim</div>
                  <div>Regular</div>
                  <div>Bom</div>
                  <div>Perfeito</div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-base">Tipo de Dica/Ajuda</Label>
                <p className="text-sm text-muted-foreground">
                  Selecione um ou mais tipos de ajuda utilizados (se houver)
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { codigo: "-", nome: "Erro" },
                    { codigo: "AFT", nome: "Ajuda Física Total" },
                    { codigo: "AFP", nome: "Ajuda Física Parcial" },
                    { codigo: "AI", nome: "Ajuda Imitativa" },
                    { codigo: "AG", nome: "Ajuda Gestual" },
                    { codigo: "AVE", nome: "Ajuda Verbal Específica" },
                    { codigo: "AVG", nome: "Ajuda Verbal Geral" },
                    { codigo: "+", nome: "Independente" },
                  ].map((tipo) => (
                    <div
                      key={tipo.codigo}
                      className="flex items-start space-x-2"
                    >
                      <Checkbox
                        id={`tipo-${tipo.codigo}`}
                        checked={tiposAjuda.includes(tipo.codigo)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setTiposAjuda((prev) => [...prev, tipo.codigo]);
                          } else {
                            setTiposAjuda((prev) =>
                              prev.filter((t) => t !== tipo.codigo)
                            );
                          }
                        }}
                      />
                      <Label
                        htmlFor={`tipo-${tipo.codigo}`}
                        className="text-sm cursor-pointer leading-none pt-0.5"
                      >
                        <span className="font-semibold">{tipo.codigo}</span> -{" "}
                        {tipo.nome}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacao">Observações (opcional)</Label>
                <Textarea
                  id="observacao"
                  placeholder="Anote observações sobre o desempenho..."
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            {/* Navegação */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={instrucaoAnterior}
                disabled={instrucaoAtual === 0 || salvando}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Anterior
              </Button>

              {!isUltimaInstrucao ? (
                <Button
                  onClick={proximaInstrucao}
                  disabled={salvando || nota === null}
                >
                  {salvando ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      Salvar e Próxima
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={async () => {
                    const sucesso = await salvarAvaliacaoAtual();
                    if (sucesso && todasAvaliadas) {
                      finalizarSessao();
                    }
                  }}
                  disabled={salvando || finalizando || nota === null}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {salvando || finalizando ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {finalizando ? "Finalizando..." : "Salvando..."}
                    </>
                  ) : (
                    <>
                      <ClipboardCheck className="mr-2 h-4 w-4" />
                      Salvar e Finalizar Sessão
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
