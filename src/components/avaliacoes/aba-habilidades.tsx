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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface Habilidade {
  id: string;
  ordem: number;
  habilidade: string;
}

interface AbaHabilidadesProps {
  avaliacaoId: string;
}

export function AbaHabilidades({ avaliacaoId }: AbaHabilidadesProps) {
  const { user } = useAuth();
  const [habilidades, setHabilidades] = useState<Habilidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    ordem: 1,
    habilidade: "",
  });

  const fetchHabilidades = async () => {
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
      if (result.success && result.data.habilidades) {
        setHabilidades(result.data.habilidades);
      }
    } catch (error) {
      console.error("Erro ao buscar habilidades:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHabilidades();
  }, [avaliacaoId, user]);

  const handleNovo = () => {
    setEditingId(null);
    setFormData({
      ordem: habilidades.length + 1,
      habilidade: "",
    });
    setDialogOpen(true);
  };

  const handleEditar = (habilidade: Habilidade) => {
    setEditingId(habilidade.id);
    setFormData({
      ordem: habilidade.ordem,
      habilidade: habilidade.habilidade,
    });
    setDialogOpen(true);
  };

  const handleSalvar = async () => {
    try {
      if (!formData.habilidade) {
        alert("Habilidade é obrigatória");
        return;
      }

      setSaving(true);
      if (!user) return;

      const userDataEncoded = btoa(JSON.stringify(user));
      const method = editingId ? "PUT" : "POST";
      const body = editingId
        ? { id: editingId, ...formData }
        : { avaliacaoId, ...formData };

      const response = await fetch("/api/avaliacoes/habilidades", {
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
        await fetchHabilidades();
        setDialogOpen(false);
        setFormData({ ordem: 1, habilidade: "" });
      } else {
        alert(result.error || "Erro ao salvar");
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar habilidade");
    } finally {
      setSaving(false);
    }
  };

  const handleExcluir = async () => {
    try {
      if (!deleteId || !user) return;

      setDeleting(true);
      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch(
        `/api/avaliacoes/habilidades?id=${deleteId}`,
        {
          method: "DELETE",
          headers: {
            "X-User-Data": userDataEncoded,
            "X-Auth-Token": user.token,
          },
        }
      );

      const result = await response.json();

      if (result.success) {
        setHabilidades(habilidades.filter((h) => h.id !== deleteId));
        setDeleteId(null);
      } else {
        alert(result.error || "Erro ao excluir");
      }
    } catch (error) {
      console.error("Erro ao excluir:", error);
      alert("Erro ao excluir habilidade");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Habilidades da Avaliação</CardTitle>
            <CardDescription>
              Cadastre as habilidades que serão avaliadas
            </CardDescription>
          </div>
          <Button onClick={handleNovo}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Habilidade
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando habilidades...</p>
          </div>
        ) : habilidades.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Nenhuma habilidade cadastrada ainda.
            </p>
            <Button onClick={handleNovo}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeira Habilidade
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Ordem</TableHead>
                <TableHead>Habilidade</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {habilidades.map((habilidade) => (
                <TableRow key={habilidade.id}>
                  <TableCell className="font-medium">
                    {habilidade.ordem}
                  </TableCell>
                  <TableCell>{habilidade.habilidade}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditar(habilidade)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteId(habilidade.id)}
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Editar Habilidade" : "Nova Habilidade"}
              </DialogTitle>
              <DialogDescription>
                Preencha as informações da habilidade
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="ordem">
                  Ordem <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="ordem"
                  type="number"
                  min="1"
                  value={formData.ordem}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      ordem: parseInt(e.target.value),
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="habilidade">
                  Habilidade <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="habilidade"
                  placeholder="Ex: Comunicação Verbal"
                  value={formData.habilidade}
                  onChange={(e) =>
                    setFormData({ ...formData, habilidade: e.target.value })
                  }
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
                Tem certeza que deseja excluir esta habilidade? Esta ação não
                pode ser desfeita.
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
