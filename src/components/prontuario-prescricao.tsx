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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Pill,
  Calendar,
  Clock,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
} from "lucide-react";
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

interface Prescricao {
  id: string;
  pacienteId: string;
  profissionalId: string;
  data_prescricao: string;
  medicamento: string;
  dosagem: string;
  frequencia: string;
  via_admin?: string;
  duracao?: string;
  indicacao?: string;
  observacoes?: string;
  ativo: boolean;
  data_inicio?: string;
  data_fim?: string;
  createdAt: string;
  updatedAt: string;
  paciente: {
    id: string;
    nome: string;
  };
}

interface ProntuarioPrescricaoProps {
  pacienteId: string;
  onOpenDialog?: (open: boolean) => void;
  dialogOpen?: boolean;
}

export function ProntuarioPrescricao({
  pacienteId,
  onOpenDialog,
  dialogOpen = false,
}: ProntuarioPrescricaoProps) {
  const { user } = useAuth();
  const [prescricoes, setPrescricoes] = useState<Prescricao[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    medicamento: "",
    dosagem: "",
    frequencia: "",
    via_admin: "",
    duracao: "",
    indicacao: "",
    observacoes: "",
    data_inicio: "",
    data_fim: "",
  });

  useEffect(() => {
    const fetchPrescricoes = async () => {
      try {
        if (!user) {
          throw new Error("Usuário não autenticado");
        }

        const userDataEncoded = btoa(JSON.stringify(user));

        const response = await fetch("/api/prescricoes", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-User-Data": userDataEncoded,
            "X-Auth-Token": user.token,
          },
        });

        if (!response.ok) {
          throw new Error("Erro ao buscar prescrições");
        }

        const data = await response.json();
        if (data.success) {
          // Filtrar prescrições do paciente
          const prescricoesPaciente = data.data.filter(
            (p: Prescricao) => p.pacienteId === pacienteId
          );
          setPrescricoes(prescricoesPaciente);
        }
      } catch (error) {
        console.error("Erro ao buscar prescrições:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrescricoes();
  }, [pacienteId, user]);

  const handleEdit = (prescricao: Prescricao) => {
    setEditingId(prescricao.id);
    setFormData({
      medicamento: prescricao.medicamento,
      dosagem: prescricao.dosagem,
      frequencia: prescricao.frequencia,
      via_admin: prescricao.via_admin || "",
      duracao: prescricao.duracao || "",
      indicacao: prescricao.indicacao || "",
      observacoes: prescricao.observacoes || "",
      data_inicio: prescricao.data_inicio
        ? new Date(prescricao.data_inicio).toISOString().split("T")[0]
        : "",
      data_fim: prescricao.data_fim
        ? new Date(prescricao.data_fim).toISOString().split("T")[0]
        : "",
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

      const response = await fetch(`/api/prescricoes?id=${deleteId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      if (!response.ok) {
        throw new Error("Erro ao excluir prescrição");
      }

      const data = await response.json();
      if (data.success) {
        // Remover da lista
        setPrescricoes(prescricoes.filter((p) => p.id !== deleteId));
        setDeleteId(null);
      }
    } catch (error) {
      console.error("Erro ao excluir prescrição:", error);
      alert("Erro ao excluir prescrição. Tente novamente.");
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      // Validação
      if (!formData.medicamento || !formData.dosagem || !formData.frequencia) {
        alert("Medicamento, dosagem e frequência são obrigatórios");
        return;
      }

      setSaving(true);

      const userDataEncoded = btoa(JSON.stringify(user));
      const method = editingId ? "PUT" : "POST";
      const body = editingId
        ? { id: editingId, ...formData }
        : { pacienteId, ...formData };

      const response = await fetch("/api/prescricoes", {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar prescrição");
      }

      const data = await response.json();
      if (data.success) {
        if (editingId) {
          // Atualizar na lista
          setPrescricoes(
            prescricoes.map((p) => (p.id === editingId ? data.data : p))
          );
        } else {
          // Adicionar nova prescrição à lista
          setPrescricoes([data.data, ...prescricoes]);
        }

        // Limpar formulário
        setFormData({
          medicamento: "",
          dosagem: "",
          frequencia: "",
          via_admin: "",
          duracao: "",
          indicacao: "",
          observacoes: "",
          data_inicio: "",
          data_fim: "",
        });
        setEditingId(null);

        // Fechar dialog
        if (onOpenDialog) {
          onOpenDialog(false);
        } else {
          setOpen(false);
        }
      }
    } catch (error) {
      console.error("Erro ao salvar prescrição:", error);
      alert("Erro ao salvar prescrição. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const getStatusBadge = (prescricao: Prescricao) => {
    if (!prescricao.ativo) {
      return <Badge variant="secondary">Inativa</Badge>;
    }

    if (prescricao.data_fim) {
      const dataFim = new Date(prescricao.data_fim);
      const hoje = new Date();
      if (dataFim < hoje) {
        return <Badge variant="destructive">Expirada</Badge>;
      }
    }

    return <Badge variant="default" className="bg-green-600">Em uso</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Carregando prescrições...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Dialog (sem botão trigger aqui) */}
      <Dialog open={dialogOpen ?? open} onOpenChange={onOpenDialog ?? setOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Editar Prescrição Médica" : "Nova Prescrição Médica"}
              </DialogTitle>
              <DialogDescription>
                Adicione uma nova prescrição médica para o paciente
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Medicamento */}
              <div className="grid gap-2">
                <Label htmlFor="medicamento">
                  Medicamento <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="medicamento"
                  value={formData.medicamento}
                  onChange={(e) =>
                    setFormData({ ...formData, medicamento: e.target.value })
                  }
                  placeholder="Nome do medicamento"
                />
              </div>

              {/* Dosagem e Frequência */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="dosagem">
                    Dosagem <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="dosagem"
                    value={formData.dosagem}
                    onChange={(e) =>
                      setFormData({ ...formData, dosagem: e.target.value })
                    }
                    placeholder="Ex: 500mg"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="frequencia">
                    Frequência <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="frequencia"
                    value={formData.frequencia}
                    onChange={(e) =>
                      setFormData({ ...formData, frequencia: e.target.value })
                    }
                    placeholder="Ex: 2x ao dia"
                  />
                </div>
              </div>

              {/* Via Admin e Duração */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="via_admin">Via de Administração</Label>
                  <Input
                    id="via_admin"
                    value={formData.via_admin}
                    onChange={(e) =>
                      setFormData({ ...formData, via_admin: e.target.value })
                    }
                    placeholder="Ex: Oral, Injetável"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="duracao">Duração</Label>
                  <Input
                    id="duracao"
                    value={formData.duracao}
                    onChange={(e) =>
                      setFormData({ ...formData, duracao: e.target.value })
                    }
                    placeholder="Ex: 30 dias"
                  />
                </div>
              </div>

              {/* Data Início e Fim */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="data_inicio">Data de Início</Label>
                  <Input
                    id="data_inicio"
                    type="date"
                    value={formData.data_inicio}
                    onChange={(e) =>
                      setFormData({ ...formData, data_inicio: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="data_fim">Data de Término</Label>
                  <Input
                    id="data_fim"
                    type="date"
                    value={formData.data_fim}
                    onChange={(e) =>
                      setFormData({ ...formData, data_fim: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Indicação */}
              <div className="grid gap-2">
                <Label htmlFor="indicacao">Indicação</Label>
                <Textarea
                  id="indicacao"
                  value={formData.indicacao}
                  onChange={(e) =>
                    setFormData({ ...formData, indicacao: e.target.value })
                  }
                  placeholder="Para que é indicado este medicamento"
                  rows={3}
                />
              </div>

              {/* Observações */}
              <div className="grid gap-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) =>
                    setFormData({ ...formData, observacoes: e.target.value })
                  }
                  placeholder="Observações adicionais"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving
                  ? "Salvando..."
                  : editingId
                  ? "Atualizar Prescrição"
                  : "Salvar Prescrição"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      {/* Lista de Prescrições */}
      {prescricoes.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <Pill className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma prescrição médica registrada</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {prescricoes.map((prescricao) => (
            <Card key={prescricao.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Pill className="h-5 w-5" />
                      {prescricao.medicamento}
                    </CardTitle>
                    <CardDescription>
                      Prescrito em {formatDate(prescricao.data_prescricao)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(prescricao)}
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(prescricao)}
                        title="Editar prescrição"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(prescricao.id)}
                        title="Excluir prescrição"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Dosagem e Frequência */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Dosagem
                    </p>
                    <p className="text-base">{prescricao.dosagem}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Frequência
                    </p>
                    <p className="text-base">{prescricao.frequencia}</p>
                  </div>
                </div>

                {/* Via de Administração e Duração */}
                {(prescricao.via_admin || prescricao.duracao) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {prescricao.via_admin && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          Via de Administração
                        </p>
                        <p className="text-base">{prescricao.via_admin}</p>
                      </div>
                    )}
                    {prescricao.duracao && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Duração
                        </p>
                        <p className="text-base">{prescricao.duracao}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Período */}
                {(prescricao.data_inicio || prescricao.data_fim) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {prescricao.data_inicio && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Data de Início
                        </p>
                        <p className="text-base">
                          {formatDate(prescricao.data_inicio)}
                        </p>
                      </div>
                    )}
                    {prescricao.data_fim && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Data de Término
                        </p>
                        <p className="text-base">
                          {formatDate(prescricao.data_fim)}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Indicação */}
                {prescricao.indicacao && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      Indicação
                    </p>
                    <p className="text-base whitespace-pre-wrap">
                      {prescricao.indicacao}
                    </p>
                  </div>
                )}

                {/* Observações */}
                {prescricao.observacoes && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Observações
                    </p>
                    <p className="text-base whitespace-pre-wrap">
                      {prescricao.observacoes}
                    </p>
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
              Tem certeza que deseja excluir esta prescrição médica? Esta ação
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
