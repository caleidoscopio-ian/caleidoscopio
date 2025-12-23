"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  CheckCircle,
  Clock,
  Calendar,
  FileText,
  ChevronDown,
  ChevronUp,
  Eye,
  Edit,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface AnamneseDetalhes {
  id: string;
  paciente: {
    id: string;
    nome: string;
    nascimento: string;
  };
  profissionalId: string;
  historiaDesenvolvimento?: any;
  comportamentosExcessivos?: string;
  comportamentosDeficitarios?: string;
  comportamentosProblema?: any;
  rotinaDiaria?: any;
  ambienteFamiliar?: string;
  ambienteEscolar?: string;
  preferencias?: any;
  documentosAnexos?: string[];
  habilidadesCriticas?: any;
  observacoesGerais?: string;
  status: "RASCUNHO" | "FINALIZADA";
  finalizadaEm?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProntuarioAnamneseProps {
  pacienteId: string;
}

export function ProntuarioAnamnese({ pacienteId }: ProntuarioAnamneseProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [anamneses, setAnamneses] = useState<AnamneseDetalhes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnamneses = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!user) {
          throw new Error("Usuário não autenticado");
        }

        const userDataEncoded = btoa(JSON.stringify(user));

        const response = await fetch("/api/anamneses", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-User-Data": userDataEncoded,
            "X-Auth-Token": user.token,
          },
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Erro ao buscar anamneses");
        }

        if (result.success) {
          // Filtrar anamneses do paciente
          const anamnesesDoPaciente = result.data.filter(
            (a: AnamneseDetalhes) => a.paciente.id === pacienteId
          );
          setAnamneses(anamnesesDoPaciente);

          // Auto-expandir a primeira se houver apenas uma
          if (anamnesesDoPaciente.length === 1) {
            setExpandedId(anamnesesDoPaciente[0].id);
          }
        } else {
          throw new Error(result.error || "Erro desconhecido");
        }
      } catch (err) {
        console.error("❌ Erro ao buscar anamneses:", err);
        setError(
          err instanceof Error ? err.message : "Erro ao carregar anamneses"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAnamneses();
  }, [pacienteId, user]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando anamneses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Erro ao carregar anamneses</h3>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (anamneses.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Nenhuma anamnese encontrada</h3>
        <p className="text-muted-foreground">
          Este paciente ainda não possui anamnese cadastrada.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {anamneses.map((anamnese) => (
        <Collapsible
          key={anamnese.id}
          open={expandedId === anamnese.id}
          onOpenChange={(open) => setExpandedId(open ? anamnese.id : null)}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center gap-3 cursor-pointer flex-1 hover:opacity-80 transition-opacity">
                    <CardTitle className="text-lg">
                      Anamnese - {formatDate(anamnese.createdAt)}
                    </CardTitle>
                    {anamnese.status === "FINALIZADA" ? (
                      <Badge variant="default" className="bg-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Finalizada
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-orange-600 text-orange-600"
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        Rascunho
                      </Badge>
                    )}
                    <Button variant="ghost" size="sm">
                      {expandedId === anamnese.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CollapsibleTrigger>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/anamnese/${anamnese.id}`);
                    }}
                    title="Visualizar anamnese completa"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {anamnese.status === "RASCUNHO" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/anamnese/${anamnese.id}/editar`);
                      }}
                      title="Editar anamnese"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CollapsibleContent>
              <CardContent className="space-y-6 pt-0">
                {/* Datas */}
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Criada: {formatDate(anamnese.createdAt)}</span>
                  </div>
                  {anamnese.finalizadaEm && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Finalizada: {formatDate(anamnese.finalizadaEm)}</span>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Etapa 1: História do Desenvolvimento */}
                {anamnese.historiaDesenvolvimento && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-base">
                      1. História do Desenvolvimento
                    </h4>
                    <div className="space-y-3 pl-4">
                      {anamnese.historiaDesenvolvimento.gestacao && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Gestação
                          </label>
                          <p className="text-sm mt-1 whitespace-pre-wrap">
                            {anamnese.historiaDesenvolvimento.gestacao}
                          </p>
                        </div>
                      )}
                      {anamnese.historiaDesenvolvimento.parto && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Parto
                          </label>
                          <p className="text-sm mt-1 whitespace-pre-wrap">
                            {anamnese.historiaDesenvolvimento.parto}
                          </p>
                        </div>
                      )}
                      {anamnese.historiaDesenvolvimento.marcos && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Marcos do Desenvolvimento
                          </label>
                          <p className="text-sm mt-1 whitespace-pre-wrap">
                            {anamnese.historiaDesenvolvimento.marcos}
                          </p>
                        </div>
                      )}
                      {anamnese.historiaDesenvolvimento.desenvolvimento && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Desenvolvimento Geral
                          </label>
                          <p className="text-sm mt-1 whitespace-pre-wrap">
                            {anamnese.historiaDesenvolvimento.desenvolvimento}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Etapa 2: Comportamentos */}
                {(anamnese.comportamentosExcessivos ||
                  anamnese.comportamentosDeficitarios) && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="font-semibold text-base">
                        2. Comportamentos Excessivos e Deficitários
                      </h4>
                      <div className="space-y-3 pl-4">
                        {anamnese.comportamentosExcessivos && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">
                              Comportamentos Excessivos
                            </label>
                            <p className="text-sm mt-1 whitespace-pre-wrap">
                              {anamnese.comportamentosExcessivos}
                            </p>
                          </div>
                        )}
                        {anamnese.comportamentosDeficitarios && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">
                              Comportamentos Deficitários
                            </label>
                            <p className="text-sm mt-1 whitespace-pre-wrap">
                              {anamnese.comportamentosDeficitarios}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Etapa 4: Rotina Diária */}
                {anamnese.rotinaDiaria && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="font-semibold text-base">4. Rotina Diária</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-4">
                        {Object.entries(anamnese.rotinaDiaria).map(([key, value]) =>
                          value ? (
                            <div key={key}>
                              <label className="text-sm font-medium text-muted-foreground capitalize">
                                {key}
                              </label>
                              <p className="text-sm mt-1 whitespace-pre-wrap">
                                {value as string}
                              </p>
                            </div>
                          ) : null
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Etapa 5: Ambientes */}
                {(anamnese.ambienteFamiliar || anamnese.ambienteEscolar) && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="font-semibold text-base">
                        5. Ambiente Familiar e Escolar
                      </h4>
                      <div className="space-y-3 pl-4">
                        {anamnese.ambienteFamiliar && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">
                              Ambiente Familiar
                            </label>
                            <p className="text-sm mt-1 whitespace-pre-wrap">
                              {anamnese.ambienteFamiliar}
                            </p>
                          </div>
                        )}
                        {anamnese.ambienteEscolar && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">
                              Ambiente Escolar
                            </label>
                            <p className="text-sm mt-1 whitespace-pre-wrap">
                              {anamnese.ambienteEscolar}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Observações Gerais */}
                {anamnese.observacoesGerais && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="font-semibold text-base">Observações Gerais</h4>
                      <p className="text-sm whitespace-pre-wrap pl-4">
                        {anamnese.observacoesGerais}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ))}
    </div>
  );
}
