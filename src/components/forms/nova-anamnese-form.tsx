/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Save, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const anamneseSchema = z.object({
  pacienteId: z.string().min(1, "Paciente é obrigatório"),

  // Etapa 1: Motivo da Consulta
  motivo_consulta: z.string().optional(),

  // Etapa 2: Gestação
  gestacao_crianca_desejada: z.string().optional(),
  gestacao_idade_pais: z.string().optional(),
  gestacao_parentesco: z.string().optional(),
  gestacao_gestacoes_anteriores: z.string().optional(),
  gestacao_pre_natal: z.string().optional(),
  gestacao_intercorrencias: z.string().optional(),
  gestacao_doencas: z.string().optional(),

  // Etapa 3: Parto
  parto_duracao_trabalho: z.string().optional(),
  parto_semanas: z.string().optional(),
  parto_tipo: z.string().optional(),
  parto_peso_altura: z.string().optional(),
  parto_complicacoes: z.string().optional(),
  parto_apgar: z.string().optional(),
  parto_amamentacao: z.string().optional(),
  parto_comportamento_bebe: z.string().optional(),

  // Etapa 4: Marcos do Desenvolvimento
  marcos_motor: z.string().optional(),
  marcos_linguagem: z.string().optional(),
  marcos_autonomia: z.string().optional(),
  marcos_habitos: z.string().optional(),
  marcos_tiques: z.string().optional(),

  // Etapa 5: Sono e Sexualidade
  sono_qualidade: z.string().optional(),
  sono_problemas: z.string().optional(),
  sono_outros: z.string().optional(),
  sexualidade: z.string().optional(),

  // Etapa 6: História Médica e Familiar
  historia_doencas_anteriores: z.string().optional(),
  historia_problemas_sensoriais: z.string().optional(),
  historia_convulsoes: z.string().optional(),
  historia_sistemas: z.string().optional(),
  historia_tratamentos: z.string().optional(),
  historia_familiar: z.string().optional(),

  // Etapa 7: Escola e Ambiente Social
  escola_atual: z.string().optional(),
  escola_dificuldades: z.string().optional(),
  escola_medicacao: z.string().optional(),
  ambiente_familiar: z.string().optional(),
  ambiente_social: z.string().optional(),
  rotina_diaria: z.string().optional(),

  // Etapa 8: Hábitos, Sensorial e Avaliação Comportamental
  atividades_vida_diaria: z.string().optional(),
  sistema_sensorial: z.string().optional(),
  habitos_orais: z.string().optional(),
  habitos_alimentares: z.string().optional(),
  avaliacao_comunicacao: z.string().optional(),
  avaliacao_comportamentos: z.string().optional(),
  preferencias_crianca: z.string().optional(),
  observacoesGerais: z.string().optional(),
});

type AnamneseFormData = z.infer<typeof anamneseSchema>;

interface NovaAnamneseFormProps {
  anamneseId?: string;
  initialData?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ETAPAS = [
  { numero: 1, titulo: "Motivo da Consulta", descricao: "Razão principal que motivou a busca pelo atendimento" },
  { numero: 2, titulo: "Gestação", descricao: "Histórico da gravidez e intercorrências" },
  { numero: 3, titulo: "Parto", descricao: "Dados do nascimento e período neonatal" },
  { numero: 4, titulo: "Marcos do Desenvolvimento", descricao: "Motor, linguagem e autonomia" },
  { numero: 5, titulo: "Sono e Sexualidade", descricao: "Hábitos de sono e desenvolvimento sexual" },
  { numero: 6, titulo: "História Médica e Familiar", descricao: "Doenças, tratamentos e histórico familiar" },
  { numero: 7, titulo: "Escola e Ambiente Social", descricao: "Escolaridade, família e convívio social" },
  { numero: 8, titulo: "Hábitos e Avaliação Comportamental", descricao: "Sensorial, hábitos, comunicação e preferências" },
];

export function NovaAnamneseForm({ anamneseId, initialData, onSuccess, onCancel }: NovaAnamneseFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [etapaAtual, setEtapaAtual] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pacientes, setPacientes] = useState<any[]>([]);

  const form = useForm<AnamneseFormData>({
    resolver: zodResolver(anamneseSchema),
    defaultValues: {
      pacienteId: "",
      motivo_consulta: "",
      gestacao_crianca_desejada: "",
      gestacao_idade_pais: "",
      gestacao_parentesco: "",
      gestacao_gestacoes_anteriores: "",
      gestacao_pre_natal: "",
      gestacao_intercorrencias: "",
      gestacao_doencas: "",
      parto_duracao_trabalho: "",
      parto_semanas: "",
      parto_tipo: "",
      parto_peso_altura: "",
      parto_complicacoes: "",
      parto_apgar: "",
      parto_amamentacao: "",
      parto_comportamento_bebe: "",
      marcos_motor: "",
      marcos_linguagem: "",
      marcos_autonomia: "",
      marcos_habitos: "",
      marcos_tiques: "",
      sono_qualidade: "",
      sono_problemas: "",
      sono_outros: "",
      sexualidade: "",
      historia_doencas_anteriores: "",
      historia_problemas_sensoriais: "",
      historia_convulsoes: "",
      historia_sistemas: "",
      historia_tratamentos: "",
      historia_familiar: "",
      escola_atual: "",
      escola_dificuldades: "",
      escola_medicacao: "",
      ambiente_familiar: "",
      ambiente_social: "",
      rotina_diaria: "",
      atividades_vida_diaria: "",
      sistema_sensorial: "",
      habitos_orais: "",
      habitos_alimentares: "",
      avaliacao_comunicacao: "",
      avaliacao_comportamentos: "",
      preferencias_crianca: "",
      observacoesGerais: "",
    },
  });

  useEffect(() => {
    if (initialData && pacientes.length > 0) {
      if (initialData.paciente && !pacientes.find((p) => p.id === initialData.paciente.id)) {
        setPacientes((prev) => [...prev, { id: initialData.paciente.id, name: initialData.paciente.nome }]);
      }

      const h = initialData.historiaDesenvolvimento || {};
      const g = h.gestacao || {};
      const p = h.parto || {};
      const m = h.marcos || {};
      const cp = Array.isArray(initialData.comportamentosProblema) && initialData.comportamentosProblema.length > 0
        ? initialData.comportamentosProblema[0] : {};
      const rd = initialData.rotinaDiaria || {};
      const pref = initialData.preferencias || {};
      const hc = Array.isArray(initialData.habilidadesCriticas) && initialData.habilidadesCriticas.length > 0
        ? initialData.habilidadesCriticas[0] : {};

      form.reset({
        pacienteId: initialData.paciente?.id || "",
        motivo_consulta: h.motivo || "",
        gestacao_crianca_desejada: g.criancaDesejada || "",
        gestacao_idade_pais: g.idadePais || "",
        gestacao_parentesco: g.parentesco || "",
        gestacao_gestacoes_anteriores: g.gestacoesAnteriores || "",
        gestacao_pre_natal: g.preNatal || "",
        gestacao_intercorrencias: g.intercorrencias || "",
        gestacao_doencas: g.doencas || "",
        parto_duracao_trabalho: p.duracao || "",
        parto_semanas: p.semanas || "",
        parto_tipo: p.tipo || "",
        parto_peso_altura: p.pesoAltura || "",
        parto_complicacoes: p.complicacoes || "",
        parto_apgar: p.apgar || "",
        parto_amamentacao: p.amamentacao || "",
        parto_comportamento_bebe: p.comportamentoBebe || "",
        marcos_motor: m.motor || "",
        marcos_linguagem: m.linguagem || "",
        marcos_autonomia: m.autonomia || "",
        marcos_habitos: m.habitos || "",
        marcos_tiques: m.tiques || "",
        sono_qualidade: initialData.comportamentosExcessivos || "",
        sono_problemas: cp.sonoProblemas || "",
        sono_outros: cp.sonoOutros || "",
        sexualidade: initialData.comportamentosDeficitarios || "",
        historia_doencas_anteriores: cp.doencasAnteriores || "",
        historia_problemas_sensoriais: cp.problemasSensoriais || "",
        historia_convulsoes: cp.convulsoes || "",
        historia_sistemas: cp.sistemas || "",
        historia_tratamentos: cp.tratamentos || "",
        historia_familiar: cp.historiaFamiliar || "",
        escola_atual: initialData.ambienteEscolar || "",
        escola_dificuldades: rd.escolaDificuldades || "",
        escola_medicacao: rd.medicacao || "",
        ambiente_familiar: initialData.ambienteFamiliar || "",
        ambiente_social: rd.ambienteSocial || "",
        rotina_diaria: rd.rotina || "",
        atividades_vida_diaria: pref.atividadesVidaDiaria || "",
        sistema_sensorial: pref.sistemaSensorial || "",
        habitos_orais: pref.habitosOrais || "",
        habitos_alimentares: pref.habitosAlimentares || "",
        avaliacao_comunicacao: hc.comunicacao || "",
        avaliacao_comportamentos: hc.comportamentos || "",
        preferencias_crianca: pref.preferencias || "",
        observacoesGerais: initialData.observacoesGerais || "",
      });
    }
  }, [initialData, pacientes]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const res = await fetch("/api/pacientes", {
          headers: { "X-User-Data": btoa(JSON.stringify(user)), "X-Auth-Token": user.token },
        });
        const result = await res.json();
        if (res.ok) setPacientes(result.data || []);
      } catch {}
    };
    load();
  }, [user]);

  const progresso = ((etapaAtual + 1) / ETAPAS.length) * 100;
  const proximaEtapa = () => { if (etapaAtual < ETAPAS.length - 1) setEtapaAtual(etapaAtual + 1); };
  const etapaAnterior = () => { if (etapaAtual > 0) setEtapaAtual(etapaAtual - 1); };

  const buildPayload = (data: AnamneseFormData, status: string) => ({
    pacienteId: data.pacienteId,
    profissionalId: user!.id,
    historiaDesenvolvimento: {
      motivo: data.motivo_consulta,
      gestacao: {
        criancaDesejada: data.gestacao_crianca_desejada,
        idadePais: data.gestacao_idade_pais,
        parentesco: data.gestacao_parentesco,
        gestacoesAnteriores: data.gestacao_gestacoes_anteriores,
        preNatal: data.gestacao_pre_natal,
        intercorrencias: data.gestacao_intercorrencias,
        doencas: data.gestacao_doencas,
      },
      parto: {
        duracao: data.parto_duracao_trabalho,
        semanas: data.parto_semanas,
        tipo: data.parto_tipo,
        pesoAltura: data.parto_peso_altura,
        complicacoes: data.parto_complicacoes,
        apgar: data.parto_apgar,
        amamentacao: data.parto_amamentacao,
        comportamentoBebe: data.parto_comportamento_bebe,
      },
      marcos: {
        motor: data.marcos_motor,
        linguagem: data.marcos_linguagem,
        autonomia: data.marcos_autonomia,
        habitos: data.marcos_habitos,
        tiques: data.marcos_tiques,
      },
    },
    comportamentosExcessivos: data.sono_qualidade,
    comportamentosDeficitarios: data.sexualidade,
    comportamentosProblema: [{
      sonoProblemas: data.sono_problemas,
      sonoOutros: data.sono_outros,
      doencasAnteriores: data.historia_doencas_anteriores,
      problemasSensoriais: data.historia_problemas_sensoriais,
      convulsoes: data.historia_convulsoes,
      sistemas: data.historia_sistemas,
      tratamentos: data.historia_tratamentos,
      historiaFamiliar: data.historia_familiar,
    }],
    rotinaDiaria: {
      escolaDificuldades: data.escola_dificuldades,
      medicacao: data.escola_medicacao,
      ambienteSocial: data.ambiente_social,
      rotina: data.rotina_diaria,
    },
    ambienteFamiliar: data.ambiente_familiar,
    ambienteEscolar: data.escola_atual,
    preferencias: {
      atividadesVidaDiaria: data.atividades_vida_diaria,
      sistemaSensorial: data.sistema_sensorial,
      habitosOrais: data.habitos_orais,
      habitosAlimentares: data.habitos_alimentares,
      preferencias: data.preferencias_crianca,
    },
    habilidadesCriticas: [{
      comunicacao: data.avaliacao_comunicacao,
      comportamentos: data.avaliacao_comportamentos,
    }],
    observacoesGerais: data.observacoesGerais,
    status,
  });

  const salvar = async (data: AnamneseFormData, status: string) => {
    if (!user) return;
    setLoading(true);
    try {
      const url = anamneseId ? `/api/anamneses/${anamneseId}` : "/api/anamneses";
      const method = anamneseId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": btoa(JSON.stringify(user)),
          "X-Auth-Token": user.token,
        },
        body: JSON.stringify(buildPayload(data, status)),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erro ao salvar");
      toast({
        title: status === "FINALIZADA" ? "Anamnese finalizada!" : "Rascunho salvo!",
        description: anamneseId ? "Anamnese atualizada com sucesso." : "Anamnese salva com sucesso.",
      });
      onSuccess?.();
    } catch (error) {
      toast({ title: "Erro", description: error instanceof Error ? error.message : "Erro ao salvar", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (data: AnamneseFormData) => {
    if (etapaAtual === ETAPAS.length - 1) salvar(data, "FINALIZADA");
    else proximaEtapa();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{anamneseId ? "Editar" : "Nova"} Anamnese — {ETAPAS[etapaAtual].titulo}</CardTitle>
          <CardDescription>{ETAPAS[etapaAtual].descricao}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Etapa {etapaAtual + 1} de {ETAPAS.length}</span>
              <span>{Math.round(progresso)}%</span>
            </div>
            <Progress value={progresso} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              {/* ── Etapa 1: Motivo da Consulta ── */}
              {etapaAtual === 0 && (
                <div className="space-y-4">
                  <FormField control={form.control} name="pacienteId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paciente *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!!anamneseId}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Selecione o paciente" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {pacientes.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="motivo_consulta" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motivo da Consulta</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Descreva o motivo que levou à busca pelo atendimento..." {...field} rows={6} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              {/* ── Etapa 2: Gestação ── */}
              {etapaAtual === 1 && (
                <div className="space-y-4">
                  <FormField control={form.control} name="gestacao_crianca_desejada" render={({ field }) => (
                    <FormItem>
                      <FormLabel>A criança foi desejada?</FormLabel>
                      <FormControl><Textarea placeholder="Descreva..." {...field} rows={2} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="gestacao_idade_pais" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Qual a idade dos pais quando o paciente nasceu?</FormLabel>
                      <FormControl><Textarea placeholder="Idade do pai e da mãe..." {...field} rows={2} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="gestacao_parentesco" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Existe parentesco entre os pais? Qual grau?</FormLabel>
                      <FormControl><Textarea placeholder="Informar se há consanguinidade..." {...field} rows={2} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="gestacao_gestacoes_anteriores" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantas gestações a mãe teve antes do nascimento do paciente?</FormLabel>
                      <FormControl><Textarea placeholder="Número de gestações anteriores, abortos, etc..." {...field} rows={2} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="gestacao_pre_natal" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fez acompanhamento pré-natal?</FormLabel>
                      <FormControl><Textarea placeholder="Descreva o acompanhamento realizado..." {...field} rows={2} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="gestacao_intercorrencias" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Intercorrências durante a gestação</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Informe se ocorreu: sangramento, enjôo/vômito, febre, ameaça de aborto, intervenção cirúrgica, radiografias, transfusão de sangue, tombo, uso de medicamentos, álcool/cigarro/drogas, etc. Especifique frequência e período da gravidez."
                          {...field} rows={5}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="gestacao_doencas" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Doenças durante a gestação</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Informe se houve: infecções urinárias, anemia, caxumba, diabetes, hipertensão arterial, eclâmpsia, herpes, meningite, doença venérea, pneumonia, pré-eclâmpsia, rubéola, sarampo, toxemia, tuberculose, varíola, outras. Especifique o período."
                          {...field} rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              {/* ── Etapa 3: Parto ── */}
              {etapaAtual === 2 && (
                <div className="space-y-4">
                  <FormField control={form.control} name="parto_duracao_trabalho" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quanto tempo durou o trabalho de parto?</FormLabel>
                      <FormControl><Textarea placeholder="Desde o rompimento da bolsa até o nascimento..." {...field} rows={2} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="parto_semanas" render={({ field }) => (
                    <FormItem>
                      <FormLabel>O período da gestação durou quantas semanas/meses?</FormLabel>
                      <FormControl><Textarea placeholder="Ex: 38 semanas, 9 meses..." {...field} rows={2} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="parto_tipo" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de parto</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Normal / Cesáriana / Fórceps — o bebê veio de cabeça ou nádegas? O parto foi induzido? Por qual motivo?"
                          {...field} rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="parto_peso_altura" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Peso e altura ao nascer</FormLabel>
                      <FormControl><Textarea placeholder="Ex: Peso 3,2 kg / Altura 50 cm..." {...field} rows={2} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="parto_complicacoes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Complicações ao nascer</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ocorreu alguma complicação? O bebê chorou logo ao nascer? Ficou roxo ou vermelho? O cordão umbilical estava envolto no pescoço?"
                          {...field} rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="parto_apgar" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pontuação na escala APGAR</FormLabel>
                      <FormControl><Textarea placeholder="Informe o APGAR se souber..." {...field} rows={2} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="parto_amamentacao" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amamentação e alimentação inicial</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Teve problemas de alimentação? O bebê aceitou bem o leite materno? Mamou por quanto tempo?"
                          {...field} rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="parto_comportamento_bebe" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comportamento do bebê</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="O bebê era agitado ou quieto demais em relação a outros bebês? Como era o choro (frequência e intensidade)? Outros relatos?"
                          {...field} rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              {/* ── Etapa 4: Marcos do Desenvolvimento ── */}
              {etapaAtual === 3 && (
                <div className="space-y-4">
                  <FormField control={form.control} name="marcos_motor" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Desenvolvimento motor</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Com que idade: firmou a cabeça, sentou-se sozinho, começou a engatinhar, andou, subiu e desceu escada, sorriu pela primeira vez?"
                          {...field} rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="marcos_linguagem" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Desenvolvimento da linguagem</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Quando falou as primeiras palavras? Primeiras frases? Com que idade falou corretamente? Trocava letras? Falava errado? Ainda fala? Gaguejou? Quando começou a atender pelo nome? Quando começou a compreender nomes de objetos?"
                          {...field} rows={5}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="marcos_autonomia" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Autonomia e cuidados pessoais</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Quando começou a se alimentar sozinho? A vestir-se sozinho? Quando começou a usar o banheiro sozinho?"
                          {...field} rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="marcos_habitos" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hábitos da infância</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Usou chupeta? Chupou o dedo? Roeu unhas? Puxa as próprias orelhas? Morde os lábios? Até quando persistiram esses hábitos?"
                          {...field} rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="marcos_tiques" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tiques e outros comportamentos</FormLabel>
                      <FormControl>
                        <Textarea placeholder="A criança tem tiques? Quais? Em quais situações ocorrem?" {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              {/* ── Etapa 5: Sono e Sexualidade ── */}
              {etapaAtual === 4 && (
                <div className="space-y-4">
                  <FormField control={form.control} name="sono_qualidade" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Qualidade do sono</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="A criança/adolescente dorme bem? Dorme exageradamente ou muito pouco? Tem dificuldade em iniciar o sono ou despertar precoce? Acorda várias vezes durante a noite?"
                          {...field} rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="sono_problemas" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Problemas específicos do sono</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Pula quando dorme ou repuxa partes do corpo? Baba dormindo? Fala ou grita dormindo? Mexe muito? É sonâmbulo? Range os dentes (bruxismo)? Tem pesadelos/terror noturno? Fez xixi na cama (enurese noturna)? Dorme em quarto separado dos pais?"
                          {...field} rows={5}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="sono_outros" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Outros relatos sobre o sono</FormLabel>
                      <FormControl><Textarea placeholder="Outras observações relevantes..." {...field} rows={3} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="sexualidade" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sexualidade</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Apresentou ou apresenta curiosidade sexual? Como? Manipula com frequência os órgãos sexuais? Qual a atitude dos pais? A criança recebeu orientação? Quem promoveu? Se adolescente: já menstruou? Tem cólicas, enxaqueca ou outros sintomas?"
                          {...field} rows={5}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              {/* ── Etapa 6: História Médica e Familiar ── */}
              {etapaAtual === 5 && (
                <div className="space-y-4">
                  <FormField control={form.control} name="historia_doencas_anteriores" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Doenças anteriores</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="A criança já teve: meningite, encefalite, sarampo, rubéola, coqueluche, pneumonia, outras? Especifique a idade e a reação à doença."
                          {...field} rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="historia_problemas_sensoriais" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Problemas auditivos, visuais e alergias</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Frequentes infecções de ouvido? Problemas auditivos? Problemas visuais? Algum tipo de alergia? Descreva."
                          {...field} rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="historia_convulsoes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Crises convulsivas</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="A criança já teve crises convulsivas? Quando começaram? Qual a frequência? Tem fator desencadeante? O que a criança sente antes das crises?"
                          {...field} rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="historia_sistemas" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Problemas sistêmicos</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Problemas de coração / Hipertensão arterial / Distúrbios digestivos (diarreias, úlceras, gases, vômitos) / Distúrbio do apetite / Incontinência urinária / Dores ao urinar / Diabetes / Hipoglicemia / Hipotireoidismo / Hipertireoidismo — informe Sim ou Não e descreva."
                          {...field} rows={5}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="historia_tratamentos" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tratamentos em andamento ou já realizados</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Neurologista, Psiquiatra, Psicólogo, Fonoaudiólogo, outros — informe o parecer e dados de contato de cada profissional."
                          {...field} rows={5}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="historia_familiar" render={({ field }) => (
                    <FormItem>
                      <FormLabel>História de doenças na família</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Algum membro da família (filhos, pais, avós, tios, primos) sofre de: hipertensão arterial, doenças renais, problemas respiratórios, diabetes, distúrbios psiquiátricos, suicídio, crises convulsivas, distúrbios neurológicos, problemas de tireoide, alcoolismo, drogas, distúrbios de aprendizagem, outros?"
                          {...field} rows={5}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              {/* ── Etapa 7: Escola e Ambiente Social ── */}
              {etapaAtual === 6 && (
                <div className="space-y-4">
                  <FormField control={form.control} name="escola_atual" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Escolaridade atual</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Escolaridade atual, escola pública ou privada, nome da escola, a criança gosta de ir à escola? Os pais estudam com a criança?"
                          {...field} rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="escola_dificuldades" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dificuldades escolares</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Apresenta problemas com: leitura, aritmética, ortografia, ajustamento social? Descreva um resumo da história escolar. Já se submeteu a testes psicológicos ou neuropsicológicos?"
                          {...field} rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="escola_medicacao" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Uso de medicação</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Faz uso frequente de alguma medicação? Qual(is)? Dosagem, frequência e há quanto tempo faz uso?"
                          {...field} rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="ambiente_familiar" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ambiente familiar</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Como é o relacionamento com o pai? Com a mãe? Com irmãos? Com outros familiares? Os pais vivem juntos? Como é o relacionamento entre eles? Religião da família? A criança frequenta a igreja? Já presenciou agressão verbal ou física entre os pais?"
                          {...field} rows={6}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="ambiente_social" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relacionamento social</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Como o paciente se relaciona com pessoas do convívio social? Evita contato social? Evita pessoas do sexo oposto ou mesmo sexo? Possui boa interação social? Evita grupos? Atua de forma agressiva? É submisso? Outros."
                          {...field} rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="rotina_diaria" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rotina diária</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Descreva um dia completo da vida do paciente..." {...field} rows={4} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              {/* ── Etapa 8: Hábitos, Sensorial e Avaliação Comportamental ── */}
              {etapaAtual === 7 && (
                <div className="space-y-4">
                  <FormField control={form.control} name="atividades_vida_diaria" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Atividades de vida diária</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Alimentação (posição, local, dificuldades, nível de dependência) / Banho / Vestir / Despir — descreva cada uma."
                          {...field} rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="sistema_sensorial" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sistema sensorial</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Vestibular/proprioceptivo, tátil, visão, gustativo, olfativo, auditivo — descreva como a criança responde a cada sentido."
                          {...field} rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="habitos_orais" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hábitos orais</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Chupeta (até quando / quantas vezes por dia), dedo, sucção de língua, umidificar os lábios, bruxismo diurno ou noturno."
                          {...field} rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="habitos_alimentares" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hábitos alimentares</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="O que gosta de comer / O que não gosta / Horários das refeições / Alguma alergia alimentar?"
                          {...field} rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="avaliacao_comunicacao" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Avaliação comportamental — Comunicação</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Vocal / Não vocal / Uso de comunicação alternativa? Faz balbucios (em quais situações)? Costuma imitar sons? Pede pelo que deseja (como)? Reconhece pessoas/objetos e sabe nomeá-los? Responde perguntas ou completa músicas?"
                          {...field} rows={5}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="avaliacao_comportamentos" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Avaliação comportamental — Estereotipias e comportamentos lesivos</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Apresenta estereotipias? Quais e em quais circunstâncias? Comportamentos auto ou hetero-lesivos?"
                          {...field} rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="preferencias_crianca" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferências</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Brinquedos que gosta / Brincadeiras que gosta / Personagens, desenhos e filmes preferidos / Do que NÃO gosta (atividades, brinquedos, personagens, etc)"
                          {...field} rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="observacoesGerais" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações gerais</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Outras informações relevantes sobre o caso..." {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              {/* ── Navegação ── */}
              <div className="flex justify-between pt-6 border-t">
                <div className="space-x-2">
                  {onCancel && (
                    <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                      Cancelar
                    </Button>
                  )}
                  {etapaAtual > 0 && (
                    <Button type="button" variant="outline" onClick={etapaAnterior} disabled={loading}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Anterior
                    </Button>
                  )}
                </div>

                <div className="space-x-2">
                  <Button type="button" variant="outline" onClick={form.handleSubmit((d) => salvar(d, "RASCUNHO"))} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Salvar Rascunho
                  </Button>

                  {etapaAtual < ETAPAS.length - 1 ? (
                    <Button type="submit" disabled={loading}>
                      Próxima
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button type="submit" disabled={loading}>
                      {loading ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Finalizando...</>
                      ) : (
                        <><CheckCircle className="h-4 w-4 mr-2" />Finalizar Anamnese</>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
