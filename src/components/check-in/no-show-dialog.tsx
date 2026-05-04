"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface NoShowDialogProps {
  open: boolean;
  pacienteNome: string;
  onConfirm: (motivo: string) => Promise<void>;
  onCancel: () => void;
}

export function NoShowDialog({ open, pacienteNome, onConfirm, onCancel }: NoShowDialogProps) {
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(motivo);
      setMotivo("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar No-show</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Marcar <strong>{pacienteNome}</strong> como falta não justificada?
        </p>
        <Textarea
          placeholder="Motivo (opcional)..."
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={3}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading}>Cancelar</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar No-show
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
