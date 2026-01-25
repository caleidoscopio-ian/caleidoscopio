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
import { Textarea } from "@/components/ui/textarea";
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

interface Instrucao {
  id?: string;
  ordem: number;
  texto: string;
  como_aplicar: string;
  observacao: string;
  procedimento_correcao: string;
  materiais_utilizados: string;
}

interface AbaInstrucoesProps {
  atividadeId: string | null;
  onSave: () => void;
}

export function AbaInstrucoes({ atividadeId, onSave }: AbaInstrucoesProps) {
  const { user } = useAuth();
  const [instrucoes, setInstrucoes] = useState<Instrucao[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    ordem: 1,
    texto: "",
    como_aplicar: "",
    observacao: "",
    procedimento_correcao: "",
    materiais_utilizados: "",
  });

  const fetchInstrucoes = async () => {
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
      if (result.success && result.data.instrucoes) {
        setInstrucoes(result.data.instrucoes);
      }
    } catch (error) {
      console.error("Erro ao buscar instruções:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (atividadeId) {
      fetchInstrucoes();
    }
  }, [atividadeId, user]);

  const handleNovo = () => {
    setEditingIndex(null);
    setFormData({
      ordem: instrucoes.length + 1,
      texto: "",
      como_aplicar: "",
      observacao: "",
      procedimento_correcao: "",
      materiais_utilizados: "",
    });
    setDialogOpen(true);
  };

  const handleEditar = (index: number) => {
    const instrucao = instrucoes[index];
    setEditingIndex(index);
    setFormData({
      ordem: instrucao.ordem,
      texto: instrucao.texto,
      como_aplicar: instrucao.como_aplicar || "",
      observacao: instrucao.observacao || "",
      procedimento_correcao: instrucao.procedimento_correcao || "",
      materiais_utilizados: instrucao.materiais_utilizados || "",
    });
    setDialogOpen(true);
  };

  const handleSalvarDialog = () => {
    if (!formData.texto) {
      alert("O campo Instrução é obrigatório");
      return;
    }

    if (editingIndex !== null) {
      // Editar existente
      const novasInstrucoes = [...instrucoes];
      novasInstrucoes[editingIndex] = {
        ...novasInstrucoes[editingIndex],
        ordem: formData.ordem,
        texto: formData.texto,
        como_aplicar: formData.como_aplicar,
        observacao: formData.observacao,
        procedimento_correcao: formData.procedimento_correcao,
        materiais_utilizados: formData.materiais_utilizados,
      };
      setInstrucoes(novasInstrucoes);
    } else {
      // Adicionar nova
      setInstrucoes([
        ...instrucoes,
        {
          ordem: formData.ordem,
          texto: formData.texto,
          como_aplicar: formData.como_aplicar,
          observacao: formData.observacao,
          procedimento_correcao: formData.procedimento_correcao,
          materiais_utilizados: formData.materiais_utilizados,
        },
      ]);
    }

    setDialogOpen(false);
  };

  const handleDeletar = (index: number) => {
    const novasInstrucoes = instrucoes.filter((_, i) => i !== index);
    // Reordenar
    const instrucoesReordenadas = novasInstrucoes.map((inst, i) => ({
      ...inst,
      ordem: i + 1,
    }));
    setInstrucoes(instrucoesReordenadas);
    setDeleteIndex(null);
  };

  const handleSalvarTudo = async () => {
    try {
      if (!user || !atividadeId) return;

      if (instrucoes.length === 0) {
        alert("Adicione pelo menos uma instrução");
        return;
      }

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
          instrucoes: instrucoes,
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert("Instruções salvas com sucesso!");
        await fetchInstrucoes();
        onSave();
      } else {
        alert(result.error || "Erro ao salvar");
      }
    } catch (error) {
      console.error("Erro ao salvar instruções:", error);
      alert("Erro ao salvar instruções");
    } finally {
      setSaving(false);
    }
  };

  if (!atividadeId) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Salve as informações gerais primeiro para gerenciar instruções
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
              <CardTitle>Instruções</CardTitle>
              <CardDescription>
                Defina as instruções e como aplicá-las
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
          ) : instrucoes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Nenhuma instrução cadastrada
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Ordem</TableHead>
                    <TableHead>Instrução</TableHead>
                    <TableHead>Como Aplicar</TableHead>
                    <TableHead className="w-24 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instrucoes.map((instrucao, index) => (
                    <TableRow key={index}>
                      <TableCell>{instrucao.ordem}</TableCell>
                      <TableCell className="font-medium">
                        {instrucao.texto.length > 50
                          ? `${instrucao.texto.substring(0, 50)}...`
                          : instrucao.texto}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {instrucao.como_aplicar
                          ? instrucao.como_aplicar.length > 50
                            ? `${instrucao.como_aplicar.substring(0, 50)}...`
                            : instrucao.como_aplicar
                          : "-"}
                      </TableCell>
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
                    "Salvar Instruções"
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Adicionar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingIndex !== null ? "Editar" : "Adicionar"} Instrução
            </DialogTitle>
            <DialogDescription>
              Preencha as informações da instrução
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
              <Label htmlFor="texto">
                Instrução <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="texto"
                placeholder="O que fazer..."
                rows={3}
                value={formData.texto}
                onChange={(e) =>
                  setFormData({ ...formData, texto: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="como_aplicar">Como Aplicar</Label>
              <Textarea
                id="como_aplicar"
                placeholder="Descrição de como aplicar esta instrução..."
                rows={4}
                value={formData.como_aplicar}
                onChange={(e) =>
                  setFormData({ ...formData, como_aplicar: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="observacao">Observação</Label>
              <Textarea
                id="observacao"
                placeholder="Observações adicionais..."
                rows={2}
                value={formData.observacao}
                onChange={(e) =>
                  setFormData({ ...formData, observacao: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="procedimento_correcao">Procedimento de Correção</Label>
              <Textarea
                id="procedimento_correcao"
                placeholder="Como corrigir erros durante a aplicação..."
                rows={3}
                value={formData.procedimento_correcao}
                onChange={(e) =>
                  setFormData({ ...formData, procedimento_correcao: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="materiais_utilizados">Materiais Utilizados</Label>
              <Textarea
                id="materiais_utilizados"
                placeholder="Lista de materiais necessários para esta instrução..."
                rows={2}
                value={formData.materiais_utilizados}
                onChange={(e) =>
                  setFormData({ ...formData, materiais_utilizados: e.target.value })
                }
              />
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
              Tem certeza que deseja excluir esta instrução? Esta ação não pode
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
