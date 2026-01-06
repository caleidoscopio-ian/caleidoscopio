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

interface Nivel {
  id: string;
  ordem: number;
  descricao: string;
  faixa_etaria?: string;
}

interface AbaNiveisProps {
  avaliacaoId: string;
}

export function AbaNiveis({ avaliacaoId }: AbaNiveisProps) {
  const { user } = useAuth();
  const [niveis, setNiveis] = useState<Nivel[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    ordem: 1,
    descricao: "",
    faixa_etaria: "",
  });

  // Buscar níveis
  const fetchNiveis = async () => {
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
      if (result.success && result.data.niveis) {
        setNiveis(result.data.niveis);
      }
    } catch (error) {
      console.error("Erro ao buscar níveis:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNiveis();
  }, [avaliacaoId, user]);

  const handleNovo = () => {
    setEditingId(null);
    setFormData({
      ordem: niveis.length + 1,
      descricao: "",
      faixa_etaria: "",
    });
    setDialogOpen(true);
  };

  const handleEditar = (nivel: Nivel) => {
    setEditingId(nivel.id);
    setFormData({
      ordem: nivel.ordem,
      descricao: nivel.descricao,
      faixa_etaria: nivel.faixa_etaria || "",
    });
    setDialogOpen(true);
  };

  const handleSalvar = async () => {
    try {
      if (!formData.descricao) {
        alert("Descrição é obrigatória");
        return;
      }

      setSaving(true);
      if (!user) return;

      const userDataEncoded = btoa(JSON.stringify(user));
      const method = editingId ? "PUT" : "POST";
      const body = editingId
        ? { id: editingId, ...formData }
        : { avaliacaoId, ...formData };

      const response = await fetch("/api/avaliacoes/niveis", {
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
        await fetchNiveis();
        setDialogOpen(false);
        setFormData({ ordem: 1, descricao: "", faixa_etaria: "" });
      } else {
        alert(result.error || "Erro ao salvar");
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar nível");
    } finally {
      setSaving(false);
    }
  };

  const handleExcluir = async () => {
    try {
      if (!deleteId || !user) return;

      setDeleting(true);
      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch(`/api/avaliacoes/niveis?id=${deleteId}`, {
        method: "DELETE",
        headers: {
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      const result = await response.json();

      if (result.success) {
        setNiveis(niveis.filter((n) => n.id !== deleteId));
        setDeleteId(null);
      } else {
        alert(result.error || "Erro ao excluir");
      }
    } catch (error) {
      console.error("Erro ao excluir:", error);
      alert("Erro ao excluir nível");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Níveis da Avaliação</CardTitle>
            <CardDescription>
              Cadastre os níveis/estágios da avaliação
            </CardDescription>
          </div>
          <Button onClick={handleNovo}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Nível
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando níveis...</p>
          </div>
        ) : niveis.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Nenhum nível cadastrado ainda.
            </p>
            <Button onClick={handleNovo}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeiro Nível
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Ordem</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Faixa Etária</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {niveis.map((nivel) => (
                <TableRow key={nivel.id}>
                  <TableCell className="font-medium">{nivel.ordem}</TableCell>
                  <TableCell>{nivel.descricao}</TableCell>
                  <TableCell>{nivel.faixa_etaria || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditar(nivel)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteId(nivel.id)}
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

        {/* Dialog Adicionar/Editar */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Editar Nível" : "Novo Nível"}
              </DialogTitle>
              <DialogDescription>
                Preencha as informações do nível
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
                <Label htmlFor="descricao">
                  Descrição <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="descricao"
                  placeholder="Ex: Nível 1 - Básico"
                  value={formData.descricao}
                  onChange={(e) =>
                    setFormData({ ...formData, descricao: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="faixa_etaria">Faixa Etária</Label>
                <Input
                  id="faixa_etaria"
                  placeholder="Ex: 0-2 anos"
                  value={formData.faixa_etaria}
                  onChange={(e) =>
                    setFormData({ ...formData, faixa_etaria: e.target.value })
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

        {/* AlertDialog Excluir */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este nível? Esta ação não pode
                ser desfeita.
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
