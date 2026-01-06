"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Stethoscope,
  Calendar,
  FileText,
  Paperclip,
  Edit,
  Trash2,
} from "lucide-react";

interface Diagnostico {
  id: string;
  pacienteId: string;
  profissionalId: string;
  data_diagnostico: string;
  cid10?: string;
  descricao_cid?: string;
  diagnostico_desc: string;
  hipotese: boolean;
  observacoes?: string;
  anexos: string[];
  createdAt: string;
  updatedAt: string;
  paciente: {
    id: string;
    nome: string;
  };
}

interface ProntuarioDiagnosticoProps {
  pacienteId: string;
  onOpenDialog?: (open: boolean) => void;
  dialogOpen?: boolean;
}

export function ProntuarioDiagnostico({
  pacienteId,
  onOpenDialog,
  dialogOpen = false,
}: ProntuarioDiagnosticoProps) {
  const { user } = useAuth();
  const [diagnosticos, setDiagnosticos] = useState<Diagnostico[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    cid10: "",
    descricao_cid: "",
    diagnostico_desc: "",
    hipotese: false,
    observacoes: "",
  });

  useEffect(() => {
    const fetchDiagnosticos = async () => {
      try {
        if (!user) {
          throw new Error("Usuário não autenticado");
        }

        const userDataEncoded = btoa(JSON.stringify(user));

        const response = await fetch("/api/diagnosticos", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-User-Data": userDataEncoded,
            "X-Auth-Token": user.token,
          },
        });

        if (!response.ok) {
          throw new Error("Erro ao buscar diagnósticos");
        }

        const data = await response.json();
        if (data.success) {
          // Filtrar diagnósticos do paciente
          const diagnosticosPaciente = data.data.filter(
            (d: Diagnostico) => d.pacienteId === pacienteId
          );
          setDiagnosticos(diagnosticosPaciente);
        }
      } catch (error) {
        console.error("Erro ao buscar diagnósticos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDiagnosticos();
  }, [pacienteId, user]);

  const handleEdit = (diagnostico: Diagnostico) => {
    setEditingId(diagnostico.id);
    setFormData({
      cid10: diagnostico.cid10 || "",
      descricao_cid: diagnostico.descricao_cid || "",
      diagnostico_desc: diagnostico.diagnostico_desc,
      hipotese: diagnostico.hipotese,
      observacoes: diagnostico.observacoes || "",
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

      const response = await fetch(`/api/diagnosticos?id=${deleteId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      if (!response.ok) {
        throw new Error("Erro ao excluir diagnóstico");
      }

      const data = await response.json();
      if (data.success) {
        setDiagnosticos(diagnosticos.filter((d) => d.id !== deleteId));
        setDeleteId(null);
      }
    } catch (error) {
      console.error("Erro ao excluir diagnóstico:", error);
      alert("Erro ao excluir diagnóstico. Tente novamente.");
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      if (!formData.diagnostico_desc) {
        alert("Descrição do diagnóstico é obrigatória");
        return;
      }

      setSaving(true);

      const userDataEncoded = btoa(JSON.stringify(user));
      const method = editingId ? "PUT" : "POST";
      const body = editingId
        ? { id: editingId, ...formData }
        : { pacienteId, ...formData };

      const response = await fetch("/api/diagnosticos", {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar diagnóstico");
      }

      const data = await response.json();
      if (data.success) {
        if (editingId) {
          setDiagnosticos(
            diagnosticos.map((d) => (d.id === editingId ? data.data : d))
          );
        } else {
          setDiagnosticos([data.data, ...diagnosticos]);
        }

        setFormData({
          cid10: "",
          descricao_cid: "",
          diagnostico_desc: "",
          hipotese: false,
          observacoes: "",
        });
        setEditingId(null);

        if (onOpenDialog) {
          onOpenDialog(false);
        } else {
          setOpen(false);
        }
      }
    } catch (error) {
      console.error("Erro ao salvar diagnóstico:", error);
      alert("Erro ao salvar diagnóstico. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const getTipoBadge = (hipotese: boolean) => {
    if (hipotese) {
      return <Badge variant="secondary">Hipótese Diagnóstica</Badge>;
    }
    return <Badge variant="default">Diagnóstico Confirmado</Badge>;
  };

  // Calcular estatísticas
  //const totalDiagnosticos = diagnosticos.length;
  //const confirmados = diagnosticos.filter((d) => !d.hipotese).length;
  //const hipoteses = diagnosticos.filter((d) => d.hipotese).length;
  //const comCID = diagnosticos.filter((d) => d.cid10).length;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Carregando diagnósticos...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Dialog */}
      <Dialog open={dialogOpen ?? open} onOpenChange={onOpenDialog ?? setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Diagnóstico" : "Novo Diagnóstico"}
            </DialogTitle>
            <DialogDescription>
              Adicione um novo diagnóstico para o paciente
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* CID-10 e Descrição CID */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="cid10">CID-10</Label>
                <Input
                  id="cid10"
                  value={formData.cid10}
                  onChange={(e) =>
                    setFormData({ ...formData, cid10: e.target.value })
                  }
                  placeholder="Ex: F84.0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="descricao_cid">Descrição CID</Label>
                <Input
                  id="descricao_cid"
                  value={formData.descricao_cid}
                  onChange={(e) =>
                    setFormData({ ...formData, descricao_cid: e.target.value })
                  }
                  placeholder="Ex: Autismo infantil"
                />
              </div>
            </div>

            {/* Descrição do Diagnóstico */}
            <div className="grid gap-2">
              <Label htmlFor="diagnostico_desc">
                Descrição do Diagnóstico <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="diagnostico_desc"
                value={formData.diagnostico_desc}
                onChange={(e) =>
                  setFormData({ ...formData, diagnostico_desc: e.target.value })
                }
                placeholder="Descreva o diagnóstico detalhadamente"
                rows={4}
              />
            </div>

            {/* Hipótese Diagnóstica */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hipotese"
                checked={formData.hipotese}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, hipotese: checked as boolean })
                }
              />
              <Label
                htmlFor="hipotese"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Hipótese Diagnóstica
              </Label>
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
                  ? "Atualizar Diagnóstico"
                  : "Salvar Diagnóstico"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lista de Diagnósticos */}
      {diagnosticos.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <Stethoscope className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum diagnóstico registrado</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {diagnosticos.map((diagnostico) => (
            <Card key={diagnostico.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-5 w-5" />
                      {getTipoBadge(diagnostico.hipotese)}
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {formatDate(diagnostico.data_diagnostico)}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(diagnostico)}
                      title="Editar diagnóstico"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(diagnostico.id)}
                      title="Excluir diagnóstico"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* CID-10 */}
                {diagnostico.cid10 && (
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          CID-10
                        </p>
                        <p className="text-lg font-semibold">
                          {diagnostico.cid10}
                        </p>
                      </div>
                      {diagnostico.descricao_cid && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">
                            Descrição CID
                          </p>
                          <p className="text-base">
                            {diagnostico.descricao_cid}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Descrição do Diagnóstico */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    Descrição do Diagnóstico
                  </p>
                  <p className="text-base whitespace-pre-wrap">
                    {diagnostico.diagnostico_desc}
                  </p>
                </div>

                {/* Observações */}
                {diagnostico.observacoes && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Observações
                    </p>
                    <p className="text-base whitespace-pre-wrap">
                      {diagnostico.observacoes}
                    </p>
                  </div>
                )}

                {/* Anexos */}
                {diagnostico.anexos && diagnostico.anexos.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                      <Paperclip className="h-4 w-4" />
                      Anexos ({diagnostico.anexos.length})
                    </p>
                    <div className="space-y-1">
                      {diagnostico.anexos.map((anexo, index) => (
                        <a
                          key={index}
                          href={anexo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline block"
                        >
                          Anexo {index + 1}
                        </a>
                      ))}
                    </div>
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
              Tem certeza que deseja excluir este diagnóstico? Esta ação não
              pode ser desfeita.
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
