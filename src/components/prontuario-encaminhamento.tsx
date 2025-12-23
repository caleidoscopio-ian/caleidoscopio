"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Send,
  Calendar,
  Building2,
  User,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  PlayCircle,
  Edit,
  Trash2,
} from "lucide-react";

interface Encaminhamento {
  id: string;
  pacienteId: string;
  profissionalId: string;
  tenantId: string;
  data_encaminhamento: string;
  tipo: "INTERNO" | "EXTERNO";
  especialidade: string;
  profissional_dest?: string;
  instituicao_dest?: string;
  motivo: string;
  observacoes?: string;
  status: "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDO" | "CANCELADO";
  data_retorno?: string;
  retorno_observacao?: string;
  createdAt: string;
  updatedAt: string;
  paciente: {
    id: string;
    nome: string;
    nascimento: string;
  };
}

interface ProntuarioEncaminhamentoProps {
  pacienteId: string;
  onOpenDialog?: (open: boolean) => void;
  dialogOpen?: boolean;
}

export function ProntuarioEncaminhamento({
  pacienteId,
  onOpenDialog,
  dialogOpen = false,
}: ProntuarioEncaminhamentoProps) {
  const { user } = useAuth();
  const [encaminhamentos, setEncaminhamentos] = useState<Encaminhamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    tipo: "",
    especialidade: "",
    profissional_dest: "",
    instituicao_dest: "",
    motivo: "",
    observacoes: "",
    status: "PENDENTE",
  });

  // Resetar formulário quando o dialog abre para novo encaminhamento
  useEffect(() => {
    if ((dialogOpen || open) && !editingId) {
      setFormData({
        tipo: "",
        especialidade: "",
        profissional_dest: "",
        instituicao_dest: "",
        motivo: "",
        observacoes: "",
        status: "PENDENTE",
      });
    }
  }, [dialogOpen, open, editingId]);

  useEffect(() => {
    const fetchEncaminhamentos = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!user) {
          throw new Error("Usuário não autenticado");
        }

        const userDataEncoded = btoa(JSON.stringify(user));

        const response = await fetch("/api/encaminhamentos", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-User-Data": userDataEncoded,
            "X-Auth-Token": user.token,
          },
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Erro ao buscar encaminhamentos");
        }

        if (result.success) {
          // Filtrar encaminhamentos do paciente e ordenar por data
          const encaminhamentosDoPaciente = result.data
            .filter((e: Encaminhamento) => e.pacienteId === pacienteId)
            .sort(
              (a: Encaminhamento, b: Encaminhamento) =>
                new Date(b.data_encaminhamento).getTime() -
                new Date(a.data_encaminhamento).getTime()
            );
          setEncaminhamentos(encaminhamentosDoPaciente);
        } else {
          throw new Error(result.error || "Erro desconhecido");
        }
      } catch (err) {
        console.error("❌ Erro ao buscar encaminhamentos:", err);
        setError(
          err instanceof Error ? err.message : "Erro ao carregar encaminhamentos"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchEncaminhamentos();
  }, [pacienteId, user]);

  const handleEdit = (encaminhamento: Encaminhamento) => {
    setEditingId(encaminhamento.id);
    setFormData({
      tipo: encaminhamento.tipo,
      especialidade: encaminhamento.especialidade,
      profissional_dest: encaminhamento.profissional_dest || "",
      instituicao_dest: encaminhamento.instituicao_dest || "",
      motivo: encaminhamento.motivo,
      observacoes: encaminhamento.observacoes || "",
      status: encaminhamento.status,
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

      const response = await fetch(`/api/encaminhamentos?id=${deleteId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      if (!response.ok) {
        throw new Error("Erro ao excluir encaminhamento");
      }

      const data = await response.json();
      if (data.success) {
        setEncaminhamentos(encaminhamentos.filter((e) => e.id !== deleteId));
        setDeleteId(null);
      }
    } catch (error) {
      console.error("Erro ao excluir encaminhamento:", error);
      alert("Erro ao excluir encaminhamento. Tente novamente.");
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      if (!formData.tipo || !formData.especialidade || !formData.motivo) {
        alert("Tipo, especialidade e motivo são obrigatórios");
        return;
      }

      setSaving(true);

      const userDataEncoded = btoa(JSON.stringify(user));
      const method = editingId ? "PUT" : "POST";
      const body = editingId
        ? { id: editingId, ...formData }
        : { pacienteId, ...formData };

      const response = await fetch("/api/encaminhamentos", {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar encaminhamento");
      }

      const data = await response.json();
      if (data.success) {
        if (editingId) {
          setEncaminhamentos(
            encaminhamentos.map((e) => (e.id === editingId ? data.data : e))
          );
        } else {
          setEncaminhamentos([data.data, ...encaminhamentos]);
        }

        setFormData({
          tipo: "",
          especialidade: "",
          profissional_dest: "",
          instituicao_dest: "",
          motivo: "",
          observacoes: "",
          status: "PENDENTE",
        });
        setEditingId(null);

        if (onOpenDialog) {
          onOpenDialog(false);
        } else {
          setOpen(false);
        }
      }
    } catch (error) {
      console.error("Erro ao salvar encaminhamento:", error);
      alert("Erro ao salvar encaminhamento. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONCLUIDO":
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Concluído
          </Badge>
        );
      case "EM_ANDAMENTO":
        return (
          <Badge variant="outline" className="border-blue-600 text-blue-600">
            <PlayCircle className="h-3 w-3 mr-1" />
            Em Andamento
          </Badge>
        );
      case "PENDENTE":
        return (
          <Badge variant="outline" className="border-orange-600 text-orange-600">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
      case "CANCELADO":
        return (
          <Badge variant="outline" className="border-red-600 text-red-600">
            <XCircle className="h-3 w-3 mr-1" />
            Cancelado
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTipoBadge = (tipo: string) => {
    if (tipo === "INTERNO") {
      return <Badge variant="secondary">Interno</Badge>;
    }
    return <Badge variant="outline">Externo</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Dialog */}
      <Dialog open={dialogOpen ?? open} onOpenChange={onOpenDialog ?? setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Encaminhamento" : "Novo Encaminhamento"}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do encaminhamento do paciente
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="tipo">
                  Tipo <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INTERNO">Interno</SelectItem>
                    <SelectItem value="EXTERNO">Externo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="especialidade">
                  Especialidade <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="especialidade"
                  value={formData.especialidade}
                  onChange={(e) =>
                    setFormData({ ...formData, especialidade: e.target.value })
                  }
                  placeholder="Ex: Psiquiatria, Neurologia..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="profissional_dest">Profissional Destino</Label>
                <Input
                  id="profissional_dest"
                  value={formData.profissional_dest}
                  onChange={(e) =>
                    setFormData({ ...formData, profissional_dest: e.target.value })
                  }
                  placeholder="Nome do profissional"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="instituicao_dest">Instituição Destino</Label>
                <Input
                  id="instituicao_dest"
                  value={formData.instituicao_dest}
                  onChange={(e) =>
                    setFormData({ ...formData, instituicao_dest: e.target.value })
                  }
                  placeholder="Nome da instituição"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="motivo">
                Motivo do Encaminhamento <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="motivo"
                value={formData.motivo}
                onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                placeholder="Descreva o motivo do encaminhamento"
                rows={4}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) =>
                  setFormData({ ...formData, observacoes: e.target.value })
                }
                placeholder="Informações adicionais"
                rows={3}
              />
            </div>

            {editingId && (
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDENTE">Pendente</SelectItem>
                    <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                    <SelectItem value="CONCLUIDO">Concluído</SelectItem>
                    <SelectItem value="CANCELADO">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
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
                ? "Atualizar Encaminhamento"
                : "Salvar Encaminhamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este encaminhamento? Esta ação não pode
              ser desfeita.
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

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando encaminhamentos...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="text-center py-8">
          <Send className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">
            Erro ao carregar encaminhamentos
          </h3>
          <p className="text-muted-foreground">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && encaminhamentos.length === 0 && (
        <div className="text-center py-12">
          <Send className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">
            Nenhum encaminhamento encontrado
          </h3>
          <p className="text-muted-foreground">
            Este paciente ainda não possui encaminhamentos cadastrados.
          </p>
        </div>
      )}

      {/* Resumo - apenas quando há dados */}
      {!loading && !error && encaminhamentos.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{encaminhamentos.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {encaminhamentos.filter((e) => e.status === "PENDENTE").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Em Andamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {encaminhamentos.filter((e) => e.status === "EM_ANDAMENTO").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Concluídos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {encaminhamentos.filter((e) => e.status === "CONCLUIDO").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Encaminhamentos */}
      <div className="space-y-4">
        {encaminhamentos.map((encaminhamento) => (
          <Card key={encaminhamento.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">
                      {encaminhamento.especialidade}
                    </CardTitle>
                    {getTipoBadge(encaminhamento.tipo)}
                    {getStatusBadge(encaminhamento.status)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Encaminhado em: {formatDate(encaminhamento.data_encaminhamento)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(encaminhamento)}
                    title="Editar encaminhamento"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteId(encaminhamento.id)}
                    title="Excluir encaminhamento"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Destino */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {encaminhamento.profissional_dest && (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                      <User className="h-4 w-4" />
                      <span>Profissional</span>
                    </div>
                    <p className="text-base pl-6">
                      {encaminhamento.profissional_dest}
                    </p>
                  </div>
                )}
                {encaminhamento.instituicao_dest && (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                      <Building2 className="h-4 w-4" />
                      <span>Instituição</span>
                    </div>
                    <p className="text-base pl-6">
                      {encaminhamento.instituicao_dest}
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Motivo */}
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                  <FileText className="h-4 w-4" />
                  <span>Motivo do Encaminhamento</span>
                </div>
                <p className="text-sm whitespace-pre-wrap pl-6">
                  {encaminhamento.motivo}
                </p>
              </div>

              {/* Observações */}
              {encaminhamento.observacoes && (
                <>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Observações
                    </label>
                    <p className="text-sm mt-2 whitespace-pre-wrap">
                      {encaminhamento.observacoes}
                    </p>
                  </div>
                </>
              )}

              {/* Retorno */}
              {encaminhamento.data_retorno && (
                <>
                  <Separator />
                  <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Calendar className="h-4 w-4 text-green-600" />
                      <span>Retorno em: {formatDate(encaminhamento.data_retorno)}</span>
                    </div>
                    {encaminhamento.retorno_observacao && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Observações do Retorno
                        </label>
                        <p className="text-sm mt-1 whitespace-pre-wrap">
                          {encaminhamento.retorno_observacao}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
        </>
      )}
    </div>
  );
}
