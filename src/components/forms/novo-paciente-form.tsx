/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useFilial } from "@/hooks/useFilial";
import { formatCPF, formatPhone, formatCEP, isValidCPF, UF_OPTIONS } from "@/lib/masks";
import { buscarEnderecoPorCep } from "@/lib/viacep";

const PARENTESCO_OPTIONS = [
  { value: "PAI", label: "Pai" },
  { value: "MAE", label: "Mãe" },
  { value: "TUTOR_LEGAL", label: "Tutor Legal" },
  { value: "AVO", label: "Avô(ó)" },
  { value: "IRMAO", label: "Irmão(ã)" },
  { value: "OUTRO", label: "Outro" },
];

// Schema de validação baseado no modelo Paciente do banco
const pacienteSchema = z.object({
  // Campos obrigatórios
  nome: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome muito longo"),
  nascimento: z.date({
    message: "Data de nascimento é obrigatória",
  }),
  sexo: z.enum(["MASCULINO", "FEMININO", "OUTRO", "PREFIRO_NAO_INFORMAR"], {
    message: "Sexo é obrigatório",
  }),

  // Campos opcionais - Dados pessoais
  cpf: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\d{11}$/.test(val.replace(/\D/g, "")),
      "CPF deve ter 11 dígitos"
    ),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  telefone: z.string().optional(),
  escolaridade: z.string().optional(),
  estado_civil: z.string().optional(),

  // Campos opcionais - Endereço estruturado
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),

  // Responsáveis (múltiplos)
  responsaveis: z
    .array(
      z.object({
        nome: z.string().min(2, "Nome do responsável é obrigatório"),
        telefone: z.string().optional(),
        parentesco: z.enum(["PAI", "MAE", "TUTOR_LEGAL", "AVO", "IRMAO", "OUTRO"], {
          message: "Parentesco é obrigatório",
        }),
        cpf: z
          .string()
          .optional()
          .refine((val) => !val || isValidCPF(val), "CPF inválido"),
        financeiro: z.boolean().optional(),
      })
    )
    .optional(),

  // Convênios (múltiplos)
  convenios: z
    .array(
      z.object({
        convenioId: z.string().min(1, "Selecione um convênio"),
        numero_carteirinha: z.string().optional(),
        principal: z.boolean().optional(),
      })
    )
    .optional(),

  // Campo opcional - Cor da agenda
  cor_agenda: z.string().optional(),

  // Campo opcional - Profissional responsável
  profissionalId: z.string().optional(),
});

type PacienteFormData = z.infer<typeof pacienteSchema>;

interface NovoPacienteFormProps {
  onSuccess?: () => void;
}

interface ConvenioOption {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
}

export function NovoPacienteForm({ onSuccess }: NovoPacienteFormProps) {
  const { user, isAdmin } = useAuth();
  const { filialAtiva } = useFilial();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [convenios, setConvenios] = useState<ConvenioOption[]>([]);

  const form = useForm<PacienteFormData>({
    resolver: zodResolver(pacienteSchema),
    defaultValues: {
      nome: "",
      cpf: "",
      email: "",
      telefone: "",
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
      escolaridade: "",
      estado_civil: "",
      responsaveis: [],
      convenios: [],
      cor_agenda: "#4ECDC4",
      profissionalId: "",
    },
  });

  const responsaveisArray = useFieldArray({ control: form.control, name: "responsaveis" });
  const conveniosArray = useFieldArray({ control: form.control, name: "convenios" });

  // Autopreencher endereço a partir do CEP (ViaCEP)
  const handleCepBlur = async (cep: string) => {
    const endereco = await buscarEnderecoPorCep(cep);
    if (endereco) {
      form.setValue("logradouro", endereco.logradouro);
      form.setValue("bairro", endereco.bairro);
      form.setValue("cidade", endereco.localidade);
      form.setValue("estado", endereco.uf);
    }
  };

  // Carregar lista de profissionais
  useEffect(() => {
    const loadProfissionais = async () => {
      if (!user) return;

      try {
        console.log("🔄 Carregando profissionais...");
        const userDataEncoded = btoa(JSON.stringify(user));
        const response = await fetch("/api/terapeutas", {
          headers: {
            "X-User-Data": userDataEncoded,
            "X-Auth-Token": user.token,
          },
        });

        console.log("📡 Response status:", response.status);
        const result = await response.json();
        console.log("📦 Response completa:", result);

        if (response.ok) {
          console.log("✅ Profissionais carregados:", result.data);
          setProfissionais(result.data || []);
        } else {
          console.error("❌ Erro ao carregar profissionais:", result.error);
        }
      } catch (error) {
        console.error("❌ Erro ao carregar profissionais:", error);
      }
    };

    if (open) {
      loadProfissionais();
    }
  }, [user, open]);

  // Carregar lista de convênios ativos
  useEffect(() => {
    const loadConvenios = async () => {
      if (!user) return;
      try {
        const response = await fetch("/api/convenios", {
          headers: {
            "X-User-Data": btoa(JSON.stringify(user)),
            "X-Auth-Token": user.token,
          },
        });
        const result = await response.json();
        if (result.success) setConvenios(result.data);
      } catch {
        // silencioso — dropdown fica vazio
      }
    };
    if (open) loadConvenios();
  }, [user, open]);

  // Cores predefinidas para a agenda
  const coresAgenda = [
    { value: "#FF6B6B", label: "Vermelho", color: "#FF6B6B" },
    { value: "#4ECDC4", label: "Verde Água", color: "#4ECDC4" },
    { value: "#45B7D1", label: "Azul", color: "#45B7D1" },
    { value: "#9B59B6", label: "Roxo", color: "#9B59B6" },
    { value: "#F39C12", label: "Laranja", color: "#F39C12" },
    { value: "#E74C3C", label: "Vermelho Escuro", color: "#E74C3C" },
    { value: "#2ECC71", label: "Verde", color: "#2ECC71" },
    { value: "#3498DB", label: "Azul Claro", color: "#3498DB" },
  ];


  const onSubmit = async (data: PacienteFormData) => {
    try {
      setLoading(true);

      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      console.log("📝 Enviando dados do novo paciente:", data);
      console.log("👤 Usuário atual:", {
        id: user.id,
        email: user.email,
        isAdmin,
      });
      console.log("👥 Profissionais carregados:", profissionais);

      // Para USER (terapeuta), usar o profissional vinculado ao usuário
      // Para ADMIN, usar o profissionalId selecionado no formulário
      let profissionalIdToUse =
        data.profissionalId && data.profissionalId !== "none"
          ? data.profissionalId
          : undefined;

      if (!isAdmin) {
        // Se não é admin, buscar o profissional vinculado ao usuário
        console.log(
          "🔍 Buscando profissional vinculado ao usuário ID:",
          user.id
        );
        const profVinculado = profissionais.find(
          (p) => p.usuarioId === user.id
        );
        console.log("✅ Profissional encontrado:", profVinculado);
        if (profVinculado) {
          profissionalIdToUse = profVinculado.id;
          console.log(
            `🔗 Auto-vinculando paciente ao terapeuta: ${profVinculado.name} (ID: ${profVinculado.id})`
          );
        } else {
          console.warn(
            "⚠️ ATENÇÃO: Usuário USER mas não encontrou profissional vinculado!"
          );
        }
      } else {
        console.log(
          "👑 ADMIN - usando profissionalId do formulário:",
          profissionalIdToUse
        );
      }

      // Preparar dados para a API
      const patientData = {
        name: data.nome,
        cpf: data.cpf?.replace(/\D/g, ""), // Remove formatação do CPF
        birthDate: data.nascimento.toISOString(),
        email: data.email || undefined,
        phone: data.telefone,
        sexo: data.sexo,
        cep: data.cep?.replace(/\D/g, "") || undefined,
        logradouro: data.logradouro,
        numero: data.numero,
        complemento: data.complemento,
        bairro: data.bairro,
        cidade: data.cidade,
        estado: data.estado,
        escolaridade: data.escolaridade || undefined,
        estado_civil: data.estado_civil || undefined,
        responsaveis: data.responsaveis,
        convenios: data.convenios,
        profissionalId: profissionalIdToUse,
        // Filial: admin envia a filial ativa no seletor global; não-admin usa a do perfil (server-side)
        filialId: filialAtiva?.id ?? null,
      };

      console.log("📤 Dados que serão enviados para API:", patientData);
      console.log("🔑 profissionalId final:", profissionalIdToUse);

      // Preparar headers com dados do usuário
      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch("/api/pacientes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
        body: JSON.stringify(patientData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao criar paciente");
      }

      console.log("✅ Paciente criado com sucesso:", result.data.name);

      // Resetar formulário e fechar modal
      form.reset();
      setOpen(false);

      // Callback de sucesso (recarregar lista)
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("❌ Erro ao criar paciente:", error);
      // TODO: Mostrar toast de erro
      alert(error instanceof Error ? error.message : "Erro ao criar paciente");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <span className="mr-2">+</span>
          Novo Paciente
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Paciente</DialogTitle>
          <DialogDescription>
            Preencha as informações do paciente. Campos marcados com * são
            obrigatórios.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Seção: Dados Pessoais */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">
                Dados Pessoais
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nome */}
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: João Silva Santos" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Profissional Responsável */}
                {isAdmin && (
                  <FormField
                    control={form.control}
                    name="profissionalId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Terapeuta Responsável</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o terapeuta" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Nenhum</SelectItem>
                            {profissionais.map((prof) => (
                              <SelectItem key={prof.id} value={prof.id}>
                                {prof.name} - {prof.specialty}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Profissional responsável pelo acompanhamento
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Data de Nascimento */}
                <FormField
                  control={form.control}
                  name="nascimento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Nascimento *</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            type="date"
                            value={
                              field.value
                                ? format(field.value, "yyyy-MM-dd")
                                : ""
                            }
                            onChange={(e) => {
                              const date = e.target.value
                                ? new Date(e.target.value + "T00:00:00")
                                : undefined;
                              field.onChange(date);
                            }}
                            max={format(new Date(), "yyyy-MM-dd")}
                            min="1900-01-01"
                            className="flex-1"
                          />
                        </FormControl>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="icon" type="button">
                              <CalendarIcon className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date > new Date() ||
                                date < new Date("1900-01-01")
                              }
                              initialFocus
                              locale={ptBR}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sexo */}
                <FormField
                  control={form.control}
                  name="sexo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sexo *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o sexo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="MASCULINO">Masculino</SelectItem>
                          <SelectItem value="FEMININO">Feminino</SelectItem>
                          <SelectItem value="OUTRO">Outro</SelectItem>
                          <SelectItem value="PREFIRO_NAO_INFORMAR">Prefiro não informar</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* CPF */}
                <FormField
                  control={form.control}
                  name="cpf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="000.000.000-00"
                          {...field}
                          onChange={(e) => {
                            const formatted = formatCPF(e.target.value);
                            field.onChange(formatted);
                          }}
                          maxLength={14}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cor da Agenda */}
                <FormField
                  control={form.control}
                  name="cor_agenda"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor na Agenda</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma cor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {coresAgenda.map((cor) => (
                            <SelectItem key={cor.value} value={cor.value}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-4 h-4 rounded"
                                  style={{ backgroundColor: cor.color }}
                                />
                                {cor.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Escolaridade */}
                <FormField
                  control={form.control}
                  name="escolaridade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Escolaridade</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a escolaridade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NAO_ALFABETIZADO">Não Alfabetizado</SelectItem>
                          <SelectItem value="FUNDAMENTAL_INCOMPLETO">Fundamental Incompleto</SelectItem>
                          <SelectItem value="FUNDAMENTAL_COMPLETO">Fundamental Completo</SelectItem>
                          <SelectItem value="MEDIO_INCOMPLETO">Médio Incompleto</SelectItem>
                          <SelectItem value="MEDIO_COMPLETO">Médio Completo</SelectItem>
                          <SelectItem value="SUPERIOR_INCOMPLETO">Superior Incompleto</SelectItem>
                          <SelectItem value="SUPERIOR_COMPLETO">Superior Completo</SelectItem>
                          <SelectItem value="POS_GRADUACAO">Pós-Graduação</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Estado Civil */}
                <FormField
                  control={form.control}
                  name="estado_civil"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado Civil</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o estado civil" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="SOLTEIRO">Solteiro(a)</SelectItem>
                          <SelectItem value="CASADO">Casado(a)</SelectItem>
                          <SelectItem value="DIVORCIADO">Divorciado(a)</SelectItem>
                          <SelectItem value="VIUVO">Viúvo(a)</SelectItem>
                          <SelectItem value="UNIAO_ESTAVEL">União Estável</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Seção: Contato */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">
                Informações de Contato
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="joao@email.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Telefone */}
                <FormField
                  control={form.control}
                  name="telefone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(11) 99999-9999"
                          {...field}
                          onChange={(e) => {
                            const formatted = formatPhone(e.target.value);
                            field.onChange(formatted);
                          }}
                          maxLength={15}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Endereço */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="cep"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="00000-000"
                            {...field}
                            onChange={(e) => field.onChange(formatCEP(e.target.value))}
                            onBlur={(e) => {
                              field.onBlur();
                              handleCepBlur(e.target.value);
                            }}
                            maxLength={9}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="logradouro"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Logradouro</FormLabel>
                        <FormControl>
                          <Input placeholder="Rua, Avenida..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="numero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: 123 ou S/N" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="complemento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Complemento</FormLabel>
                        <FormControl>
                          <Input placeholder="Apto, bloco..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bairro"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bairro</FormLabel>
                        <FormControl>
                          <Input placeholder="Bairro" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="cidade"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Cidade</FormLabel>
                        <FormControl>
                          <Input placeholder="Cidade" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="estado"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="UF" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {UF_OPTIONS.map((uf) => (
                              <SelectItem key={uf.value} value={uf.value}>
                                {uf.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Seção: Responsáveis */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-semibold">Responsáveis</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    responsaveisArray.append({
                      nome: "",
                      telefone: "",
                      parentesco: "OUTRO",
                      cpf: "",
                      financeiro: responsaveisArray.fields.length === 0,
                    })
                  }
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar responsável
                </Button>
              </div>

              {responsaveisArray.fields.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  Nenhum responsável adicionado.
                </p>
              )}

              {responsaveisArray.fields.map((item, index) => (
                <div key={item.id} className="p-4 border rounded-lg space-y-4 relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={() => responsaveisArray.remove(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-8">
                    <FormField
                      control={form.control}
                      name={`responsaveis.${index}.nome`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome *</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome do responsável" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`responsaveis.${index}.parentesco`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Parentesco *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o parentesco" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {PARENTESCO_OPTIONS.map((p) => (
                                <SelectItem key={p.value} value={p.value}>
                                  {p.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-8">
                    <FormField
                      control={form.control}
                      name={`responsaveis.${index}.telefone`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="(11) 99999-9999"
                              {...field}
                              onChange={(e) => field.onChange(formatPhone(e.target.value))}
                              maxLength={15}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`responsaveis.${index}.cpf`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CPF</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="000.000.000-00"
                              {...field}
                              onChange={(e) => field.onChange(formatCPF(e.target.value))}
                              maxLength={14}
                            />
                          </FormControl>
                          <FormDescription>Usado para emissão de NFe</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name={`responsaveis.${index}.financeiro`}
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(!!checked);
                              if (checked) {
                                responsaveisArray.fields.forEach((_, i) => {
                                  if (i !== index) form.setValue(`responsaveis.${i}.financeiro`, false);
                                });
                              }
                            }}
                          />
                        </FormControl>
                        <FormLabel className="!mt-0 cursor-pointer">Responsável financeiro</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              ))}
            </div>

            {/* Seção: Convênios */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-semibold">Convênios / Plano de Saúde</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    conveniosArray.append({
                      convenioId: "",
                      numero_carteirinha: "",
                      principal: conveniosArray.fields.length === 0,
                    })
                  }
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar convênio
                </Button>
              </div>

              {conveniosArray.fields.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  Particular (sem convênio).
                </p>
              )}

              {conveniosArray.fields.map((item, index) => (
                <div key={item.id} className="p-4 border rounded-lg space-y-4 relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={() => conveniosArray.remove(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-8">
                    <FormField
                      control={form.control}
                      name={`convenios.${index}.convenioId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Convênio *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o convênio" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {convenios.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.nome_fantasia || c.razao_social}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`convenios.${index}.numero_carteirinha`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número da Carteirinha</FormLabel>
                          <FormControl>
                            <Input placeholder="Número do convênio" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name={`convenios.${index}.principal`}
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(!!checked);
                              if (checked) {
                                conveniosArray.fields.forEach((_, i) => {
                                  if (i !== index) form.setValue(`convenios.${i}.principal`, false);
                                });
                              }
                            }}
                          />
                        </FormControl>
                        <FormLabel className="!mt-0 cursor-pointer">Convênio principal</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              ))}
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Paciente"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
