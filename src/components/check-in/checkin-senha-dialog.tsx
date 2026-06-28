"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, LogIn, KeyRound } from "lucide-react";
import type { AgendamentoCheckIn } from "@/types/check-in";

interface CheckinSenhaDialogProps {
  agendamento: AgendamentoCheckIn | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (senha: string, numeroGuia: string) => Promise<void>;
}

export function CheckinSenhaDialog({ agendamento, open, onOpenChange, onConfirm }: CheckinSenhaDialogProps) {
  const [senha, setSenha] = useState("");
  const [numeroGuia, setNumeroGuia] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const temConvenio = !!agendamento?.paciente?.convenioId;
  const convenioNome = agendamento?.paciente?.convenio
    ? (agendamento.paciente.convenio.nome_fantasia || agendamento.paciente.convenio.razao_social)
    : null;

  useEffect(() => {
    if (open) {
      setSenha(agendamento?.senha_autorizacao ?? "");
      setNumeroGuia(agendamento?.numero_guia ?? "");
      setErro(null);
    }
  }, [open, agendamento]);

  const handleConfirm = async () => {
    if (temConvenio && !senha.trim()) {
      setErro("A senha de autorização é obrigatória para pacientes com convênio.");
      return;
    }
    setLoading(true);
    try {
      await onConfirm(senha.trim(), numeroGuia.trim());
      onOpenChange(false);
    } catch {
      // Erro já exibido via toast pelo handler; mantém o dialog aberto para correção
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5 text-primary" />
            Check-in do Paciente
          </DialogTitle>
          <DialogDescription>
            {agendamento?.paciente.nome}
            {convenioNome && (
              <Badge variant="outline" className="ml-2 text-xs text-blue-700 border-blue-300">{convenioNome}</Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {temConvenio ? (
            <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 flex items-start gap-2">
              <KeyRound className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                Paciente com convênio. Informe a <strong>senha de autorização</strong> para permitir a conciliação de glosas posteriormente.
              </span>
            </div>
          ) : (
            <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Paciente particular — a senha de autorização é opcional.
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="senha">
              Senha de Autorização {temConvenio && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id="senha"
              value={senha}
              onChange={(e) => { setSenha(e.target.value); setErro(null); }}
              placeholder="Ex: JSA5LZ6"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleConfirm(); }}
            />
            {erro && <p className="text-xs text-red-500">{erro}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="guia">Número da Guia (opcional)</Label>
            <Input
              id="guia"
              value={numeroGuia}
              onChange={(e) => setNumeroGuia(e.target.value)}
              placeholder="Ex: 1640421337"
              onKeyDown={(e) => { if (e.key === "Enter") handleConfirm(); }}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={loading} className="gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirmar Check-in
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
