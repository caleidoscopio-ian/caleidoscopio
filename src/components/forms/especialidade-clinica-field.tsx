"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ESPECIALIDADE_CLINICA_OPTIONS } from "@/lib/profissional-constants";

// A especialidade clínica é um enum do banco e não aceita valor novo em runtime.
// As especialidades criadas pela clínica vivem em EspecialidadeCustomizada e
// entram no mesmo dropdown com o prefixo abaixo, para caberem em um único campo.
export const PREFIXO_CUSTOMIZADA = "custom:";

export interface EspecialidadeCustomizada {
  id: string;
  nome: string;
}

/** Valor do <Select> → payload da API */
export function decodificarEspecialidade(
  valor: string | undefined | null,
  nomeNova: string | undefined | null
): {
  especialidadeClinica: string | null;
  especialidadeCustomizadaId: string | null;
  especialidadeCustomizadaNome: string | null;
} {
  if (!valor) {
    return { especialidadeClinica: null, especialidadeCustomizadaId: null, especialidadeCustomizadaNome: null };
  }
  if (valor.startsWith(PREFIXO_CUSTOMIZADA)) {
    return {
      especialidadeClinica: "OUTRA",
      especialidadeCustomizadaId: valor.slice(PREFIXO_CUSTOMIZADA.length),
      especialidadeCustomizadaNome: null,
    };
  }
  if (valor === "OUTRA") {
    return {
      especialidadeClinica: "OUTRA",
      especialidadeCustomizadaId: null,
      especialidadeCustomizadaNome: nomeNova?.trim() || null,
    };
  }
  return { especialidadeClinica: valor, especialidadeCustomizadaId: null, especialidadeCustomizadaNome: null };
}

/** Dados do profissional → valor do <Select> */
export function codificarEspecialidade(
  especialidadeClinica: string | null | undefined,
  especialidadeCustomizadaId: string | null | undefined
): string {
  if (especialidadeClinica === "OUTRA" && especialidadeCustomizadaId) {
    return `${PREFIXO_CUSTOMIZADA}${especialidadeCustomizadaId}`;
  }
  return especialidadeClinica ?? "";
}

interface EspecialidadeClinicaFieldProps {
  value: string;
  onChange: (valor: string) => void;
  nomeNova: string;
  onNomeNovaChange: (nome: string) => void;
  disabled?: boolean;
}

export function EspecialidadeClinicaField({
  value,
  onChange,
  nomeNova,
  onNomeNovaChange,
  disabled,
}: EspecialidadeClinicaFieldProps) {
  const { user } = useAuth();
  const [customizadas, setCustomizadas] = useState<EspecialidadeCustomizada[]>([]);

  const carregar = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/especialidades", {
        headers: {
          "X-User-Data": btoa(JSON.stringify(user)),
          "X-Auth-Token": user.token,
        },
      });
      const result = await res.json();
      setCustomizadas(result.success ? result.data : []);
    } catch {
      setCustomizadas([]);
    }
  }, [user]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // "Outra" fica sempre por último, depois das especialidades da clínica
  const fixas = ESPECIALIDADE_CLINICA_OPTIONS.filter((o) => o.value !== "OUTRA");
  const mostrandoCampoNovo = value === "OUTRA";

  return (
    <div className="space-y-2">
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione a especialidade" />
        </SelectTrigger>
        <SelectContent>
          {fixas.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
          {customizadas.map((e) => (
            <SelectItem key={e.id} value={`${PREFIXO_CUSTOMIZADA}${e.id}`}>
              {e.nome}
            </SelectItem>
          ))}
          <SelectItem value="OUTRA">Outra (digitar)</SelectItem>
        </SelectContent>
      </Select>

      {mostrandoCampoNovo && (
        <div className="space-y-1">
          <Input
            placeholder="Nome da nova especialidade (ex: Arteterapia)"
            value={nomeNova}
            onChange={(e) => onNomeNovaChange(e.target.value)}
            disabled={disabled}
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            Ao salvar, essa especialidade passa a ficar disponível na lista para os
            demais profissionais da clínica.
          </p>
        </div>
      )}
    </div>
  );
}
