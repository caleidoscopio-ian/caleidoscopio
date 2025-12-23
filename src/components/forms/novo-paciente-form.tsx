/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
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
  endereco: z.string().optional(),
  escolaridade: z.string().optional(),
  estado_civil: z.string().optional(),

  // Campos opcionais - Responsáveis
  responsavel_financeiro: z.string().optional(),
  contato_emergencia: z.string().optional(),

  // Campos opcionais - Convênio
  plano_saude: z.string().optional(),
  matricula: z.string().optional(),

  // Campo opcional - Cor da agenda
  cor_agenda: z.string().optional(),

  // Campo opcional - Profissional responsável
  profissionalId: z.string().optional(),
});

type PacienteFormData = z.infer<typeof pacienteSchema>;

interface NovoPacienteFormProps {
  onSuccess?: () => void;
}

export function NovoPacienteForm({ onSuccess }: NovoPacienteFormProps) {
  const { user, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profissionais, setProfissionais] = useState<any[]>([]);

  const form = useForm<PacienteFormData>({
    resolver: zodResolver(pacienteSchema),
    defaultValues: {
      nome: "",
      cpf: "",
      email: "",
      telefone: "",
      endereco: "",
      escolaridade: "",
      estado_civil: "",
      responsavel_financeiro: "",
      contato_emergencia: "",
      plano_saude: "",
      matricula: "",
      cor_agenda: "#4ECDC4",
      profissionalId: "",
    },
  });

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

  // Planos de saúde comuns
  const planosSaude = [
    "Amil",
    "Bradesco Saúde",
    "SulAmérica",
    "Unimed",
    "Porto Seguro",
    "Hapvida",
    "Notre Dame Intermédica",
    "Prevent Senior",
    "Outro",
  ];

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    }
    return value;
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length === 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    } else if (numbers.length === 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    }
    return value;
  };

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
        address: data.endereco,
        escolaridade: data.escolaridade || undefined,
        estado_civil: data.estado_civil || undefined,
        guardianName: data.responsavel_financeiro,
        guardianPhone: data.contato_emergencia,
        healthInsurance:
          data.plano_saude === "particular" ? undefined : data.plano_saude,
        healthInsuranceNumber: data.matricula,
        profissionalId: profissionalIdToUse,
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
              <FormField
                control={form.control}
                name="endereco"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Rua, número, bairro, cidade, CEP"
                        {...field}
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Seção: Responsáveis */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">
                Responsáveis
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Responsável Financeiro */}
                <FormField
                  control={form.control}
                  name="responsavel_financeiro"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Responsável Financeiro</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do responsável" {...field} />
                      </FormControl>
                      <FormDescription>
                        Pessoa responsável pelos pagamentos
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Contato de Emergência */}
                <FormField
                  control={form.control}
                  name="contato_emergencia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contato de Emergência</FormLabel>
                      <FormControl>
                        <Input placeholder="(11) 99999-9999" {...field} />
                      </FormControl>
                      <FormDescription>
                        Telefone para emergências
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Seção: Convênio */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">
                Plano de Saúde
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Plano de Saúde */}
                <FormField
                  control={form.control}
                  name="plano_saude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plano de Saúde</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o plano" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="particular">
                            Particular (sem convênio)
                          </SelectItem>
                          {planosSaude.map((plano) => (
                            <SelectItem key={plano} value={plano}>
                              {plano}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Matrícula */}
                <FormField
                  control={form.control}
                  name="matricula"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número da Matrícula</FormLabel>
                      <FormControl>
                        <Input placeholder="Número do convênio" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
