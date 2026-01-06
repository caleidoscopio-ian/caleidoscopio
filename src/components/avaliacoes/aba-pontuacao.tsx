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

interface Pontuacao {
  id: string;
  ordem: number;
  tipo: string;
  valor: number;
}

interface AbaPontuacaoProps {
  avaliacaoId: string;
}

// Mapeamento de tipos de pontuação
const TIPOS_PONTUACAO = [
  { value: "SEMPRE_100", label: "Sempre (100%)", valorPadrao: 100 },
  {
    value: "FREQUENTEMENTE_75",
    label: "Frequentemente (75%)",
    valorPadrao: 75,
  },
  { value: "AS_VEZES_50", label: "Às Vezes (50%)", valorPadrao: 50 },
  { value: "RARAMENTE_25", label: "Raramente (25%)", valorPadrao: 25 },
  { value: "NUNCA_0", label: "Nunca (0%)", valorPadrao: 0 },
  { value: "NAO_SE_APLICA", label: "Não se Aplica (-%))", valorPadrao: -1 },
];

export function AbaPontuacao({ avaliacaoId }: AbaPontuacaoProps) {
  const { user } = useAuth();
  const [pontuacoes, setPontuacoes] = useState<Pontuacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    ordem: 1,
    tipo: "",
    valor: 0,
  });

  const fetchPontuacoes = async () => {
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
      if (result.success && result.data.pontuacoes) {
        setPontuacoes(result.data.pontuacoes);
      }
    } catch (error) {
      console.error("Erro ao buscar pontuações:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPontuacoes();
  }, [avaliacaoId, user]);

  const handleNovo = () => {
    setEditingId(null);
    setFormData({
      ordem: pontuacoes.length + 1,
      tipo: "",
      valor: 0,
    });
    setDialogOpen(true);
  };

  const handleEditar = (pontuacao: Pontuacao) => {
    setEditingId(pontuacao.id);
    setFormData({
      ordem: pontuacao.ordem,
      tipo: pontuacao.tipo,
      valor: pontuacao.valor,
    });
    setDialogOpen(true);
  };

  const handleTipoChange = (tipo: string) => {
    const tipoPontuacao = TIPOS_PONTUACAO.find((t) => t.value === tipo);
    setFormData({
      ...formData,
      tipo,
      valor: tipoPontuacao?.valorPadrao || 0,
    });
  };

  const handleSalvar = async () => {
    try {
      if (!formData.tipo) {
        alert("Tipo é obrigatório");
        return;
      }

      setSaving(true);
      if (!user) return;

      const userDataEncoded = btoa(JSON.stringify(user));
      const method = editingId ? "PUT" : "POST";
      const body = editingId
        ? { id: editingId, ...formData }
        : { avaliacaoId, ...formData };

      const response = await fetch("/api/avaliacoes/pontuacoes", {
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
        await fetchPontuacoes();
        setDialogOpen(false);
        setFormData({ ordem: 1, tipo: "", valor: 0 });
      } else {
        alert(result.error || "Erro ao salvar");
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar pontuação");
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
        `/api/avaliacoes/pontuacoes?id=${deleteId}`,
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
        setPontuacoes(pontuacoes.filter((p) => p.id !== deleteId));
        setDeleteId(null);
      } else {
        alert(result.error || "Erro ao excluir");
      }
    } catch (error) {
      console.error("Erro ao excluir:", error);
      alert("Erro ao excluir pontuação");
    } finally {
      setDeleting(false);
    }
  };

  const traduzirTipo = (tipo: string) => {
    const tipoPontuacao = TIPOS_PONTUACAO.find((t) => t.value === tipo);
    return tipoPontuacao?.label || tipo;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Sistema de Pontuação</CardTitle>
            <CardDescription>
              Defina a escala de pontuação da avaliação
            </CardDescription>
          </div>
          <Button onClick={handleNovo}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Pontuação
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando pontuações...</p>
          </div>
        ) : pontuacoes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Nenhuma pontuação cadastrada ainda.
            </p>
            <Button onClick={handleNovo}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeira Pontuação
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Ordem</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pontuacoes.map((pontuacao) => (
                <TableRow key={pontuacao.id}>
                  <TableCell className="font-medium">
                    {pontuacao.ordem}
                  </TableCell>
                  <TableCell>{traduzirTipo(pontuacao.tipo)}</TableCell>
                  <TableCell>
                    {pontuacao.valor === -1 ? "N/A" : `${pontuacao.valor}%`}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditar(pontuacao)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteId(pontuacao.id)}
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
                {editingId ? "Editar Pontuação" : "Nova Pontuação"}
              </DialogTitle>
              <DialogDescription>
                Configure o item da escala de pontuação
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
                <Label htmlFor="tipo">
                  Tipo <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.tipo} onValueChange={handleTipoChange}>
                  <SelectTrigger id="tipo">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_PONTUACAO.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="valor">
                  Valor <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="valor"
                  type="number"
                  value={formData.valor}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      valor: parseInt(e.target.value),
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  O valor é preenchido automaticamente ao selecionar o tipo.
                  Você pode alterá-lo se necessário.
                </p>
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
                Tem certeza que deseja excluir esta pontuação? Esta ação não
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
