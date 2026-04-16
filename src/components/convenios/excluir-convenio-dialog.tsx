"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, AlertTriangle } from "lucide-react";
import type { Convenio } from "@/types/convenio";

interface ExcluirConvenioDialogProps {
  convenio: Convenio;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ExcluirConvenioDialog({
  convenio,
  open,
  onOpenChange,
  onSuccess,
}: ExcluirConvenioDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleExcluir = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/convenios?id=${convenio.id}`, {
        method: "DELETE",
        headers: {
          "X-User-Data": btoa(JSON.stringify(user)),
          "X-Auth-Token": user.token,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao desativar convênio");
      }

      toast({ title: "Convênio desativado com sucesso!" });
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast({
        title: "Erro ao desativar convênio",
        description: error instanceof Error ? error.message : "Erro inesperado",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Desativar Convênio
          </DialogTitle>
          <DialogDescription>
            Esta ação irá desativar o convênio. O histórico e os dados serão preservados.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border p-4 bg-muted/50">
          <p className="font-medium">{convenio.razao_social}</p>
          {convenio.nome_fantasia && (
            <p className="text-sm text-muted-foreground">{convenio.nome_fantasia}</p>
          )}
          <p className="text-sm text-muted-foreground mt-1">CNPJ: {convenio.cnpj}</p>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleExcluir} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Desativar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
