"use client";

import { useState } from "react";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Filial } from "@/types/filial";

interface Props { filial: Filial; onSuccess?: () => void }

export function ExcluirFilialDialog({ filial, onSuccess }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const temDados = (filial._count?.salas ?? 0) > 0 || (filial._count?.pacientes ?? 0) > 0;

  const handleExcluir = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/filiais?id=${filial.id}`, {
        method: "DELETE",
        headers: {
          "X-User-Data": btoa(JSON.stringify(user)),
          "X-Auth-Token": user.token,
        },
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      toast({ title: temDados ? "Filial desativada" : "Filial removida", description: result.message });
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      toast({ title: "Erro", description: err instanceof Error ? err.message : "Erro ao excluir filial", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {temDados ? "Desativar Filial" : "Excluir Filial"}
          </DialogTitle>
          <DialogDescription>
            {temDados
              ? `A filial "${filial.nome}" possui dados vinculados (${filial._count?.salas ?? 0} sala(s), ${filial._count?.pacientes ?? 0} paciente(s)). Ela será desativada em vez de excluída.`
              : `Tem certeza que deseja excluir a filial "${filial.nome}"? Esta ação não pode ser desfeita.`
            }
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
          <Button variant="destructive" onClick={handleExcluir} disabled={loading}>
            {loading
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processando...</>
              : temDados ? "Desativar" : "Excluir"
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
