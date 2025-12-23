"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileBarChart, Calendar, FileCheck, FileX, Edit, Trash2 } from "lucide-react";

interface Relatorio {
  id: string;
  pacienteId: string;
  profissionalId: string;
  data_relatorio: string;
  tipo: string;
  titulo: string;
  periodo_inicio?: string;
  periodo_fim?: string;
  conteudo: string;
  finalidade?: string;
  destinatario?: string;
  assinado: boolean;
  data_assinatura?: string;
  arquivo_pdf?: string;
  createdAt: string;
  updatedAt: string;
  paciente: {
    id: string;
    nome: string;
  };
}

interface ProntuarioRelatoriosProps {
  pacienteId: string;
  onOpenDialog?: (open: boolean) => void;
  dialogOpen?: boolean;
}

export function ProntuarioRelatorios({
  pacienteId,
  onOpenDialog,
  dialogOpen = false,
}: ProntuarioRelatoriosProps) {
  const { user } = useAuth();
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    tipo: "",
    titulo: "",
    periodo_inicio: "",
    periodo_fim: "",
    conteudo: "",
    finalidade: "",
    destinatario: "",
  });

  useEffect(() => {
    const fetchRelatorios = async () => {
      try {
        if (!user) {
          throw new Error("Usuário não autenticado");
        }

        const userDataEncoded = btoa(JSON.stringify(user));

        const response = await fetch("/api/relatorios", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-User-Data": userDataEncoded,
            "X-Auth-Token": user.token,
          },
        });

        if (!response.ok) {
          throw new Error("Erro ao buscar relatórios");
        }

        const data = await response.json();
        if (data.success) {
          const relatoriosPaciente = data.data.filter(
            (r: Relatorio) => r.pacienteId === pacienteId
          );
          setRelatorios(relatoriosPaciente);
        }
      } catch (error) {
        console.error("Erro ao buscar relatórios:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRelatorios();
  }, [pacienteId, user]);

  const handleEdit = (relatorio: Relatorio) => {
    setEditingId(relatorio.id);
    setFormData({
      tipo: relatorio.tipo,
      titulo: relatorio.titulo,
      periodo_inicio: relatorio.periodo_inicio
        ? new Date(relatorio.periodo_inicio).toISOString().split("T")[0]
        : "",
      periodo_fim: relatorio.periodo_fim
        ? new Date(relatorio.periodo_fim).toISOString().split("T")[0]
        : "",
      conteudo: relatorio.conteudo,
      finalidade: relatorio.finalidade || "",
      destinatario: relatorio.destinatario || "",
    });
    if (onOpenDialog) {
      onOpenDialog(true);
    } else {
      setOpen(true);
    }
  };

  const handleDelete = async () => {
    if (!deleteId || !user) return;

    try {
      setDeleting(true);
      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch(`/api/relatorios?id=${deleteId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      if (!response.ok) {
        throw new Error("Erro ao excluir relatório");
      }

      const data = await response.json();
      if (data.success) {
        setRelatorios(relatorios.filter((r) => r.id !== deleteId));
        setDeleteId(null);
      }
    } catch (error) {
      console.error("Erro ao excluir relatório:", error);
      alert("Erro ao excluir relatório. Tente novamente.");
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      if (!formData.tipo || !formData.titulo || !formData.conteudo) {
        alert("Tipo, título e conteúdo são obrigatórios");
        return;
      }

      setSaving(true);

      const userDataEncoded = btoa(JSON.stringify(user));
      const method = editingId ? "PUT" : "POST";
      const body = editingId
        ? { id: editingId, ...formData }
        : { pacienteId, ...formData };

      const response = await fetch("/api/relatorios", {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar relatório");
      }

      const data = await response.json();
      if (data.success) {
        if (editingId) {
          setRelatorios(
            relatorios.map((r) => (r.id === editingId ? data.data : r))
          );
        } else {
          setRelatorios([data.data, ...relatorios]);
        }

        setFormData({
          tipo: "",
          titulo: "",
          periodo_inicio: "",
          periodo_fim: "",
          conteudo: "",
          finalidade: "",
          destinatario: "",
        });
        setEditingId(null);

        if (onOpenDialog) {
          onOpenDialog(false);
        } else {
          setOpen(false);
        }
      }
    } catch (error) {
      console.error("Erro ao salvar relatório:", error);
      alert("Erro ao salvar relatório. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const getTipoLabel = (tipo: string): string => {
    const labels: Record<string, string> = {
      EVOLUCAO_CLINICA: "Evolução Clínica",
      AVALIACAO_PERIODICA: "Avaliação Periódica",
      ALTA: "Alta",
      ATESTADO: "Atestado",
      LAUDO: "Laudo",
      OUTROS: "Outros",
    };
    return labels[tipo] || tipo;
  };

  const getTipoBadge = (tipo: string) => {
    const variants: Record<string, { variant: any; className?: string }> = {
      EVOLUCAO_CLINICA: { variant: "default" },
      AVALIACAO_PERIODICA: { variant: "secondary" },
      ALTA: { variant: "default", className: "bg-purple-600" },
      ATESTADO: { variant: "default", className: "bg-blue-600" },
      LAUDO: { variant: "default", className: "bg-indigo-600" },
      OUTROS: { variant: "outline" },
    };

    const config = variants[tipo] || { variant: "outline" };

    return (
      <Badge variant={config.variant} className={config.className}>
        {getTipoLabel(tipo)}
      </Badge>
    );
  };

  const getAssinadoBadge = (assinado: boolean) => {
    if (assinado) {
      return (
        <Badge variant="default" className="bg-green-600">
          <FileCheck className="h-3 w-3 mr-1" />
          Assinado
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <FileX className="h-3 w-3 mr-1" />
        Não Assinado
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Carregando relatórios...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Dialog */}
      <Dialog open={dialogOpen ?? open} onOpenChange={onOpenDialog ?? setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Relatório Clínico" : "Novo Relatório Clínico"}
            </DialogTitle>
            <DialogDescription>
              Adicione um novo relatório clínico para o paciente
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Tipo e Título */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="tipo">
                  Tipo de Relatório <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) =>
                    setFormData({ ...formData, tipo: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EVOLUCAO_CLINICA">
                      Evolução Clínica
                    </SelectItem>
                    <SelectItem value="AVALIACAO_PERIODICA">
                      Avaliação Periódica
                    </SelectItem>
                    <SelectItem value="ALTA">Alta</SelectItem>
                    <SelectItem value="ATESTADO">Atestado</SelectItem>
                    <SelectItem value="LAUDO">Laudo</SelectItem>
                    <SelectItem value="OUTROS">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="titulo">
                  Título <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="titulo"
                  value={formData.titulo}
                  onChange={(e) =>
                    setFormData({ ...formData, titulo: e.target.value })
                  }
                  placeholder="Título do relatório"
                />
              </div>
            </div>

            {/* Período de Referência */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="periodo_inicio">Período de Início</Label>
                <Input
                  id="periodo_inicio"
                  type="date"
                  value={formData.periodo_inicio}
                  onChange={(e) =>
                    setFormData({ ...formData, periodo_inicio: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="periodo_fim">Período de Fim</Label>
                <Input
                  id="periodo_fim"
                  type="date"
                  value={formData.periodo_fim}
                  onChange={(e) =>
                    setFormData({ ...formData, periodo_fim: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Finalidade e Destinatário */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="finalidade">Finalidade</Label>
                <Input
                  id="finalidade"
                  value={formData.finalidade}
                  onChange={(e) =>
                    setFormData({ ...formData, finalidade: e.target.value })
                  }
                  placeholder="Ex: Acompanhamento escolar"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="destinatario">Destinatário</Label>
                <Input
                  id="destinatario"
                  value={formData.destinatario}
                  onChange={(e) =>
                    setFormData({ ...formData, destinatario: e.target.value })
                  }
                  placeholder="Ex: Escola ABC"
                />
              </div>
            </div>

            {/* Conteúdo */}
            <div className="grid gap-2">
              <Label htmlFor="conteudo">
                Conteúdo <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="conteudo"
                value={formData.conteudo}
                onChange={(e) =>
                  setFormData({ ...formData, conteudo: e.target.value })
                }
                placeholder="Descreva o conteúdo do relatório detalhadamente"
                rows={8}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (onOpenDialog) {
                  onOpenDialog(false);
                } else {
                  setOpen(false);
                }
              }}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving
                ? "Salvando..."
                : editingId
                ? "Atualizar Relatório"
                : "Salvar Relatório"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lista de Relatórios */}
      {relatorios.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <FileBarChart className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum relatório clínico registrado</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {relatorios.map((relatorio) => (
            <Card key={relatorio.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getTipoBadge(relatorio.tipo)}
                      {getAssinadoBadge(relatorio.assinado)}
                    </div>
                    <CardTitle className="text-lg">
                      {relatorio.titulo}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {formatDate(relatorio.data_relatorio)}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(relatorio)}
                      title="Editar relatório"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(relatorio.id)}
                      title="Excluir relatório"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Período de Referência */}
                {(relatorio.periodo_inicio || relatorio.periodo_fim) && (
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Período de Referência
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      {relatorio.periodo_inicio && (
                        <span>{formatDate(relatorio.periodo_inicio)}</span>
                      )}
                      {relatorio.periodo_inicio && relatorio.periodo_fim && (
                        <span>até</span>
                      )}
                      {relatorio.periodo_fim && (
                        <span>{formatDate(relatorio.periodo_fim)}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Finalidade e Destinatário */}
                {(relatorio.finalidade || relatorio.destinatario) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {relatorio.finalidade && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          Finalidade
                        </p>
                        <p className="text-base">{relatorio.finalidade}</p>
                      </div>
                    )}
                    {relatorio.destinatario && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          Destinatário
                        </p>
                        <p className="text-base">{relatorio.destinatario}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Conteúdo (preview) */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Conteúdo
                  </p>
                  <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg max-h-32 overflow-y-auto">
                    {relatorio.conteudo.substring(0, 300)}
                    {relatorio.conteudo.length > 300 && "..."}
                  </div>
                </div>

                {/* Assinatura */}
                {relatorio.assinado && relatorio.data_assinatura && (
                  <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      Assinado em {formatDate(relatorio.data_assinatura)}
                    </p>
                  </div>
                )}

                {/* PDF */}
                {relatorio.arquivo_pdf && (
                  <div>
                    <a
                      href={relatorio.arquivo_pdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      <FileBarChart className="h-4 w-4" />
                      Baixar PDF
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Alert Dialog for Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este relatório clínico? Esta ação
              não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
