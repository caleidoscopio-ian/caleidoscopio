/* eslint-disable react-hooks/exhaustive-deps */
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
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";

interface Nivel {
  id: string;
  descricao: string;
}

interface Habilidade {
  id: string;
  habilidade: string;
}

interface Tarefa {
  id: string;
  pergunta: string;
  descricao?: string;
  criterios_pontuacao?: string;
  ordem?: number;
  nivel?: { id: string; descricao: string };
  habilidade?: { id: string; habilidade: string };
}

interface AbaTarefasProps {
  avaliacaoId: string;
}

export function AbaTarefas({ avaliacaoId }: AbaTarefasProps) {
  const { user } = useAuth();
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [niveis, setNiveis] = useState<Nivel[]>([]);
  const [habilidades, setHabilidades] = useState<Habilidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    pergunta: "",
    nivelId: undefined as string | undefined,
    habilidadeId: undefined as string | undefined,
    descricao: "",
    criterios_pontuacao: "",
    ordem: 1,
  });

  const fetchData = async () => {
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
        setTarefas(result.data.tarefas || []);
        setNiveis(result.data.niveis || []);
        setHabilidades(result.data.habilidades || []);
      }
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [avaliacaoId, user]);

  const handleNovo = () => {
    setEditingId(null);
    setFormData({
      pergunta: "",
      nivelId: undefined,
      habilidadeId: undefined,
      descricao: "",
      criterios_pontuacao: "",
      ordem: tarefas.length + 1,
    });
    setDialogOpen(true);
  };

  const handleEditar = (tarefa: Tarefa) => {
    setEditingId(tarefa.id);
    setFormData({
      pergunta: tarefa.pergunta,
      nivelId: tarefa.nivel?.id,
      habilidadeId: tarefa.habilidade?.id,
      descricao: tarefa.descricao || "",
      criterios_pontuacao: tarefa.criterios_pontuacao || "",
      ordem: tarefa.ordem || 1,
    });
    setDialogOpen(true);
  };

  const handleSalvar = async () => {
    try {
      if (!formData.pergunta) {
        alert("Pergunta é obrigatória");
        return;
      }

      setSaving(true);
      if (!user) return;

      const userDataEncoded = btoa(JSON.stringify(user));
      const method = editingId ? "PUT" : "POST";

      // Converter undefined para null para a API
      const dataToSend = {
        ...formData,
        nivelId: formData.nivelId || null,
        habilidadeId: formData.habilidadeId || null,
      };

      const body = editingId
        ? { id: editingId, ...dataToSend }
        : { avaliacaoId, ...dataToSend };

      const response = await fetch("/api/avaliacoes/tarefas", {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (result.success) {
        await fetchData();
        setDialogOpen(false);
        setFormData({
          pergunta: "",
          nivelId: undefined,
          habilidadeId: undefined,
          descricao: "",
          criterios_pontuacao: "",
          ordem: 1,
        });
      } else {
        alert(result.error || "Erro ao salvar");
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar tarefa");
    } finally {
      setSaving(false);
    }
  };

  const handleExcluir = async () => {
    try {
      if (!deleteId || !user) return;

      setDeleting(true);
      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch(`/api/avaliacoes/tarefas?id=${deleteId}`, {
        method: "DELETE",
        headers: {
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      const result = await response.json();

      if (result.success) {
        setTarefas(tarefas.filter((t) => t.id !== deleteId));
        setDeleteId(null);
      } else {
        alert(result.error || "Erro ao excluir");
      }
    } catch (error) {
      console.error("Erro ao excluir:", error);
      alert("Erro ao excluir tarefa");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Tarefas da Avaliação</CardTitle>
            <CardDescription>
              Cadastre as tarefas/perguntas da avaliação
            </CardDescription>
          </div>
          <Button onClick={handleNovo}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Tarefa
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando tarefas...</p>
          </div>
        ) : tarefas.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Nenhuma tarefa cadastrada. Certifique-se de cadastrar Níveis e
              Habilidades primeiro.
            </p>
            <Button onClick={handleNovo}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeira Tarefa
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pergunta</TableHead>
                <TableHead>Nível</TableHead>
                <TableHead>Habilidade</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tarefas.map((tarefa) => (
                <TableRow key={tarefa.id}>
                  <TableCell className="font-medium max-w-md">
                    <div className="line-clamp-2">{tarefa.pergunta}</div>
                  </TableCell>
                  <TableCell>{tarefa.nivel?.descricao || "-"}</TableCell>
                  <TableCell>{tarefa.habilidade?.habilidade || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditar(tarefa)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteId(tarefa.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Editar Tarefa" : "Nova Tarefa"}
              </DialogTitle>
              <DialogDescription>
                Preencha as informações da tarefa
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="pergunta">
                  Pergunta <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="pergunta"
                  placeholder="Ex: A criança aponta para solicitar?"
                  value={formData.pergunta}
                  onChange={(e) =>
                    setFormData({ ...formData, pergunta: e.target.value })
                  }
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="nivel">Nível (opcional)</Label>
                  <Select
                    value={formData.nivelId || "none"}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        nivelId: value === "none" ? undefined : value,
                      })
                    }
                  >
                    <SelectTrigger id="nivel">
                      <SelectValue placeholder="Selecione um nível" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {niveis.map((nivel) => (
                        <SelectItem key={nivel.id} value={nivel.id}>
                          {nivel.descricao}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="habilidade">Habilidade (opcional)</Label>
                  <Select
                    value={formData.habilidadeId || "none"}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        habilidadeId: value === "none" ? undefined : value,
                      })
                    }
                  >
                    <SelectTrigger id="habilidade">
                      <SelectValue placeholder="Selecione uma habilidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {habilidades.map((hab) => (
                        <SelectItem key={hab.id} value={hab.id}>
                          {hab.habilidade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  placeholder="Descrição detalhada da tarefa"
                  value={formData.descricao}
                  onChange={(e) =>
                    setFormData({ ...formData, descricao: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="criterios">Critérios de Pontuação</Label>
                <Textarea
                  id="criterios"
                  placeholder="Como avaliar esta tarefa"
                  value={formData.criterios_pontuacao}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      criterios_pontuacao: e.target.value,
                    })
                  }
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button onClick={handleSalvar} disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta tarefa?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleExcluir}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Excluindo..." : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
