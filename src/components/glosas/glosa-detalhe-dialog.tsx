"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Loader2, CheckCircle2, XCircle, ArrowRight, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatBRL } from "@/lib/preco-procedimento";
import {
  CATEGORIA_GLOSA_LABEL, STATUS_GLOSA_LABEL, STATUS_GLOSA_BADGE,
} from "@/types/glosa";
import type { Glosa, GlosaHistoricoItem, StatusGlosa } from "@/types/glosa";

function fmtDt(iso: string | null): string {
  if (!iso) return "—";
  return format(new Date(iso), "dd/MM/yyyy HH:mm", { locale: ptBR });
}

interface GlosaDetalheDialogProps {
  glosaId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAtualizada: () => void;
}

export function GlosaDetalheDialog({ glosaId, open, onOpenChange, onAtualizada }: GlosaDetalheDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [glosa, setGlosa] = useState<(Glosa & { historico: GlosaHistoricoItem[] }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [acao, setAcao] = useState<"interpor" | "resultado" | "acatar" | null>(null);
  const [valorParcial, setValorParcial] = useState("");
  const [descricao, setDescricao] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const headers = () => ({
    "X-User-Data": btoa(JSON.stringify(user)),
    "X-Auth-Token": user!.token,
  });

  useEffect(() => {
    if (!open || !glosaId || !user) return;
    setLoading(true);
    setAcao(null);
    fetch(`/api/glosas/${glosaId}`, { headers: headers() })
      .then((r) => r.json())
      .then((d) => { if (d.success) setGlosa(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, glosaId]);

  const executarAcao = async (acaoKey: string, extra?: Record<string, unknown>) => {
    if (!user || !glosa) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/glosas/${glosa.id}/recurso`, {
        method: "PATCH",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ acao: acaoKey, descricao, ...extra }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erro ao executar ação");
      toast({ title: "Ação executada com sucesso!" });
      setAcao(null);
      setDescricao("");
      setValorParcial("");
      onAtualizada();
      // Recarregar glosa
      const r2 = await fetch(`/api/glosas/${glosa.id}`, { headers: headers() });
      const d2 = await r2.json();
      if (d2.success) setGlosa(d2.data);
    } catch (err) {
      toast({ title: "Erro", description: err instanceof Error ? err.message : "Tente novamente", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  if (!glosa && !loading) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Detalhes da Glosa
            {glosa && (
              <Badge variant="outline" className={cn("border text-xs", STATUS_GLOSA_BADGE[glosa.status as StatusGlosa])}>
                {STATUS_GLOSA_LABEL[glosa.status as StatusGlosa]}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        )}

        {glosa && (
          <div className="space-y-4">
            {/* Dados do atendimento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              <div className="text-muted-foreground">Paciente</div>
              <div className="font-medium">{glosa.paciente.nome}</div>
              <div className="text-muted-foreground">Data do atendimento</div>
              <div>{fmtDt(glosa.data_atendimento)}</div>
              {glosa.profissional && <><div className="text-muted-foreground">Profissional</div><div>{glosa.profissional.nome}</div></>}
              {glosa.procedimento && <><div className="text-muted-foreground">Procedimento</div><div>{glosa.procedimento.nome}</div></>}
              {glosa.convenio && <><div className="text-muted-foreground">Convênio</div><div className="text-blue-700 font-medium">{glosa.convenio.nome}</div></>}
            </div>

            <Separator />

            {/* Dados financeiros */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="text-center p-3 rounded-lg bg-muted/40">
                <div className="text-xs text-muted-foreground">Cobrado</div>
                <div className="font-semibold mt-1">{formatBRL(glosa.valor_cobrado)}</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-50 border border-red-200">
                <div className="text-xs text-red-600">Glosado</div>
                <div className="font-semibold text-red-700 mt-1">{formatBRL(glosa.valor_glosado)}</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-50 border border-green-200">
                <div className="text-xs text-green-600">Recuperado</div>
                <div className="font-semibold text-green-700 mt-1">
                  {glosa.valor_recuperado !== null ? formatBRL(glosa.valor_recuperado) : "—"}
                </div>
              </div>
            </div>

            {/* Categoria + motivo */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Categoria:</span>
                <span className="font-medium">{CATEGORIA_GLOSA_LABEL[glosa.categoria]}</span>
                {glosa.codigo_glosa && <span className="font-mono text-xs text-muted-foreground">({glosa.codigo_glosa})</span>}
              </div>
              <div className="rounded-md bg-muted/40 px-3 py-2">
                <div className="text-xs text-muted-foreground mb-1">Motivo da glosa:</div>
                <p className="text-sm">{glosa.motivo}</p>
              </div>
              {glosa.observacoes && (
                <div className="rounded-md bg-muted/30 px-3 py-2">
                  <div className="text-xs text-muted-foreground mb-1">Observações:</div>
                  <p className="text-sm">{glosa.observacoes}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Processo de recurso — ações */}
            <div className="space-y-3">
              <div className="text-sm font-medium">Processo de Recurso</div>

              {glosa.status === "PENDENTE" && !acao && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-2 text-blue-700 border-blue-300 hover:bg-blue-50"
                    onClick={() => setAcao("interpor")}>
                    <ArrowRight className="h-3.5 w-3.5" />
                    Interpor Recurso
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2 text-gray-600"
                    onClick={() => setAcao("acatar")}>
                    <XCircle className="h-3.5 w-3.5" />
                    Acatar Glosa
                  </Button>
                </div>
              )}

              {glosa.status === "EM_RECURSO" && !acao && (
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700"
                    onClick={() => executarAcao("recuperada", {})}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Recuperado Integral
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2 text-teal-700 border-teal-300"
                    onClick={() => setAcao("resultado")}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Recuperado Parcial
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2 text-red-700 border-red-300"
                    onClick={() => executarAcao("negada", {})}>
                    <XCircle className="h-3.5 w-3.5" />
                    Recurso Negado
                  </Button>
                </div>
              )}

              {acao === "interpor" && (
                <div className="space-y-2 p-3 border rounded-lg">
                  <div className="text-sm font-medium text-blue-700">Interpor Recurso</div>
                  <Textarea placeholder="Argumentação para o recurso..." value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => executarAcao("interpor")} disabled={actionLoading} className="gap-2">
                      {actionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Confirmar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setAcao(null)}>Cancelar</Button>
                  </div>
                </div>
              )}

              {acao === "resultado" && (
                <div className="space-y-2 p-3 border rounded-lg">
                  <div className="text-sm font-medium text-teal-700">Recuperação Parcial</div>
                  <Input type="number" step="0.01" min="0" placeholder="Valor recuperado (R$)" value={valorParcial} onChange={(e) => setValorParcial(e.target.value)} />
                  <Textarea placeholder="Observações sobre a resolução..." value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => executarAcao("parcial", { valor_recuperado: Number(valorParcial) })} disabled={actionLoading || !valorParcial} className="gap-2">
                      {actionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Confirmar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setAcao(null)}>Cancelar</Button>
                  </div>
                </div>
              )}

              {acao === "acatar" && (
                <div className="space-y-2 p-3 border rounded-lg bg-gray-50">
                  <div className="text-sm font-medium text-gray-700">Acatar a glosa</div>
                  <p className="text-xs text-muted-foreground">A perda de {formatBRL(glosa.valor_glosado)} será registrada sem recurso.</p>
                  <Textarea placeholder="Motivo de não recorrer (opcional)..." value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => executarAcao("acatar")} disabled={actionLoading} className="gap-2">
                      {actionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Confirmar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setAcao(null)}>Cancelar</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Timeline de histórico */}
            {glosa.historico && glosa.historico.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="text-sm font-medium">Histórico</div>
                  <div className="space-y-3">
                    {glosa.historico.map((h, i) => (
                      <div key={h.id} className="flex gap-3 text-xs">
                        <div className="flex flex-col items-center">
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                          </div>
                          {i < glosa.historico!.length - 1 && <div className="w-px flex-1 bg-muted mt-1" />}
                        </div>
                        <div className="pb-3">
                          <div className="font-medium">{h.titulo}</div>
                          {h.status_anterior && (
                            <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
                              <Badge variant="outline" className={cn("text-[10px] px-1 py-0", STATUS_GLOSA_BADGE[h.status_anterior])}>
                                {STATUS_GLOSA_LABEL[h.status_anterior]}
                              </Badge>
                              <ArrowRight className="h-2.5 w-2.5" />
                              <Badge variant="outline" className={cn("text-[10px] px-1 py-0", STATUS_GLOSA_BADGE[h.status_novo])}>
                                {STATUS_GLOSA_LABEL[h.status_novo]}
                              </Badge>
                            </div>
                          )}
                          <p className="text-muted-foreground mt-0.5">{h.descricao}</p>
                          <div className="text-muted-foreground mt-0.5">
                            {h.usuario_nome} · {fmtDt(h.createdAt)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
