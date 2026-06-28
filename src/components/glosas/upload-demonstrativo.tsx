"use client";

import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileX2, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatBRL } from "@/lib/preco-procedimento";

interface UploadResultado {
  operadora_nome: string | null;
  tipo_demonstrativo: string;
  total_guias: number;
  guias_conciliadas: number;
  guias_com_glosa: number;
  guias_nao_encontradas: number;
  glosas_geradas: number;
  valor_glosa_total: number;
}

interface UploadDemonstrativoProps {
  convenios: Array<{ id: string; nome: string }>;
  onImportado: () => void;
}

export function UploadDemonstrativo({ convenios, onImportado }: UploadDemonstrativoProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [convenioId, setConvenioId] = useState<string>("_auto");
  const [resultado, setResultado] = useState<UploadResultado | null>(null);

  const enviarArquivo = async (file: File) => {
    if (!user) return;
    if (!file.name.toLowerCase().endsWith(".xml")) {
      toast({ title: "Arquivo inválido", description: "Envie um arquivo .xml do demonstrativo.", variant: "destructive" });
      return;
    }
    setEnviando(true);
    setResultado(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (convenioId !== "_auto") fd.append("convenioId", convenioId);

      const res = await fetch("/api/glosas/demonstrativos", {
        method: "POST",
        headers: { "X-User-Data": btoa(JSON.stringify(user)), "X-Auth-Token": user.token },
        body: fd,
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Erro ao processar");
      setResultado(d.data);
      toast({ title: "Demonstrativo importado!", description: `${d.data.total_guias} guias processadas.` });
      onImportado();
    } catch (err) {
      toast({ title: "Erro ao importar", description: err instanceof Error ? err.message : "Tente novamente", variant: "destructive" });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Vincular ao convênio (opcional):</span>
          <Select value={convenioId} onValueChange={setConvenioId}>
            <SelectTrigger className="w-56 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_auto">Detectar automaticamente</SelectItem>
              {convenios.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault(); setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f) enviarArquivo(f);
          }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xml"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) enviarArquivo(f); e.target.value = ""; }}
          />
          {enviando ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm">Processando demonstrativo TISS...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">Arraste o XML do demonstrativo aqui ou clique para selecionar</p>
              <p className="text-xs text-muted-foreground">Suporta TISS: Demonstrativo de Pagamento e Análise de Conta</p>
            </div>
          )}
        </div>

        {/* Resultado da importação */}
        {resultado && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="font-medium">
                {resultado.operadora_nome ?? "Demonstrativo"} importado
              </span>
              <span className="text-xs text-muted-foreground">({resultado.tipo_demonstrativo.replace(/_/g, " ").toLowerCase()})</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
              <div><div className="text-xs text-muted-foreground">Total de guias</div><div className="font-semibold">{resultado.total_guias}</div></div>
              <div><div className="text-xs text-muted-foreground">Conciliadas</div><div className="font-semibold text-green-600">{resultado.guias_conciliadas}</div></div>
              <div><div className="text-xs text-muted-foreground">Com glosa</div><div className="font-semibold text-amber-600">{resultado.guias_com_glosa}</div></div>
              <div className="flex flex-col"><div className="text-xs text-muted-foreground">Não encontradas</div><div className="font-semibold text-red-600 flex items-center gap-1">{resultado.guias_nao_encontradas > 0 && <AlertTriangle className="h-3.5 w-3.5" />}{resultado.guias_nao_encontradas}</div></div>
              <div><div className="text-xs text-muted-foreground">Glosas geradas</div><div className="font-semibold">{resultado.glosas_geradas} · {formatBRL(resultado.valor_glosa_total)}</div></div>
            </div>
            {resultado.guias_nao_encontradas > 0 && (
              <p className="text-xs text-amber-700 flex items-start gap-1.5">
                <FileX2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                {resultado.guias_nao_encontradas} guia(s) sem atendimento correspondente — verifique se a senha foi preenchida no check-in.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
