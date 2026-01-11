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
  id?: string;
  ordem: number;
  sigla: string;
  grau: string;
}

interface AbaPontuacaoProps {
  atividadeId: string | null;
  onSave: () => void;
}

const SIGLAS = ["-", "AFT", "AFP", "AI", "AG", "AVE", "AVG", "+"];
const GRAUS = ["Erro", "Independente", "Alta", "Média", "Baixa"];

export function AbaPontuacao({ atividadeId, onSave }: AbaPontuacaoProps) {
  const { user } = useAuth();
  const [pontuacoes, setPontuacoes] = useState<Pontuacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    ordem: 1,
    sigla: "",
    grau: "",
  });

  const fetchPontuacoes = async () => {
    try {
      setLoading(true);
      if (!user || !atividadeId) return;

      const userDataEncoded = btoa(JSON.stringify(user));
      const response = await fetch(`/api/atividades?id=${atividadeId}`, {
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
    if (atividadeId) {
      fetchPontuacoes();
    }
  }, [atividadeId, user]);

  const handleNovo = () => {
    setEditingIndex(null);
    setFormData({
      ordem: pontuacoes.length + 1,
      sigla: "",
      grau: "",
    });
    setDialogOpen(true);
  };

  const handleEditar = (index: number) => {
    const pontuacao = pontuacoes[index];
    setEditingIndex(index);
    setFormData({
      ordem: pontuacao.ordem,
      sigla: pontuacao.sigla,
      grau: pontuacao.grau,
    });
    setDialogOpen(true);
  };

  const handleSalvarDialog = () => {
    if (!formData.sigla || !formData.grau) {
      alert("Preencha todos os campos obrigatórios");
      return;
    }

    if (editingIndex !== null) {
      // Editar existente
      const novasPontuacoes = [...pontuacoes];
      novasPontuacoes[editingIndex] = {
        ...novasPontuacoes[editingIndex],
        ordem: formData.ordem,
        sigla: formData.sigla,
        grau: formData.grau,
      };
      setPontuacoes(novasPontuacoes);
    } else {
      // Adicionar nova
      setPontuacoes([
        ...pontuacoes,
        {
          ordem: formData.ordem,
          sigla: formData.sigla,
          grau: formData.grau,
        },
      ]);
    }

    setDialogOpen(false);
  };

  const handleDeletar = (index: number) => {
    const novasPontuacoes = pontuacoes.filter((_, i) => i !== index);
    // Reordenar
    const pontuacoesReordenadas = novasPontuacoes.map((p, i) => ({
      ...p,
      ordem: i + 1,
    }));
    setPontuacoes(pontuacoesReordenadas);
    setDeleteIndex(null);
  };

  const handleSalvarTudo = async () => {
    try {
      if (!user || !atividadeId) return;

      setSaving(true);
      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch("/api/atividades", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
        body: JSON.stringify({
          id: atividadeId,
          pontuacoes: pontuacoes,
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert("Pontuações salvas com sucesso!");
        await fetchPontuacoes();
        onSave();
      } else {
        alert(result.error || "Erro ao salvar");
      }
    } catch (error) {
      console.error("Erro ao salvar pontuações:", error);
      alert("Erro ao salvar pontuações");
    } finally {
      setSaving(false);
    }
  };

  if (!atividadeId) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Salve as informações gerais primeiro para gerenciar pontuações
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pontuações/Dicas</CardTitle>
              <CardDescription>
                Defina as pontuações e dicas para esta atividade
              </CardDescription>
            </div>
            <Button onClick={handleNovo} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pontuacoes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Nenhuma pontuação cadastrada
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Ordem</TableHead>
                    <TableHead>Sigla</TableHead>
                    <TableHead>Grau</TableHead>
                    <TableHead className="w-24 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pontuacoes.map((pontuacao, index) => (
                    <TableRow key={index}>
                      <TableCell>{pontuacao.ordem}</TableCell>
                      <TableCell className="font-medium">
                        {pontuacao.sigla}
                      </TableCell>
                      <TableCell>{pontuacao.grau}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditar(index)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteIndex(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex gap-2">
                <Button
                  onClick={handleSalvarTudo}
                  disabled={saving}
                  className="flex-1"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Pontuações"
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Adicionar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingIndex !== null ? "Editar" : "Adicionar"} Pontuação/Dica
            </DialogTitle>
            <DialogDescription>
              Preencha as informações da pontuação
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
                    ordem: parseInt(e.target.value) || 1,
                  })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sigla">
                Sigla <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.sigla}
                onValueChange={(value) =>
                  setFormData({ ...formData, sigla: value })
                }
              >
                <SelectTrigger id="sigla">
                  <SelectValue placeholder="Selecione a sigla" />
                </SelectTrigger>
                <SelectContent>
                  {SIGLAS.map((sigla) => (
                    <SelectItem key={sigla} value={sigla}>
                      {sigla}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="grau">
                Grau <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.grau}
                onValueChange={(value) =>
                  setFormData({ ...formData, grau: value })
                }
              >
                <SelectTrigger id="grau">
                  <SelectValue placeholder="Selecione o grau" />
                </SelectTrigger>
                <SelectContent>
                  {GRAUS.map((grau) => (
                    <SelectItem key={grau} value={grau}>
                      {grau}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarDialog}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog Deletar */}
      <AlertDialog
        open={deleteIndex !== null}
        onOpenChange={() => setDeleteIndex(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta pontuação? Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteIndex !== null && handleDeletar(deleteIndex)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
