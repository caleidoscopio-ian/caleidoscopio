/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Loader2, Edit } from "lucide-react";

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

// Schema de validação
const pacienteSchema = z.object({
  nome: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome muito longo"),
  nascimento: z.date({
    message: "Data de nascimento é obrigatória",
  }),
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
  responsavel_financeiro: z.string().optional(),
  contato_emergencia: z.string().optional(),
  plano_saude: z.string().optional(),
  matricula: z.string().optional(),
  cor_agenda: z.string().optional(),
});

type PacienteFormData = z.infer<typeof pacienteSchema>;

interface Patient {
  id: string;
  name: string;
  cpf: string;
  birthDate: string;
  email?: string;
  phone?: string;
  address?: string;
  guardianName?: string;
  guardianPhone?: string;
  healthInsurance?: string;
  healthInsuranceNumber?: string;
  createdAt: string;
  updatedAt: string;
}

interface EditarPacienteFormProps {
  patient: Patient;
  onSuccess?: () => void;
}

export function EditarPacienteForm({
  patient,
  onSuccess,
}: EditarPacienteFormProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<PacienteFormData>({
    resolver: zodResolver(pacienteSchema),
    defaultValues: {
      nome: patient.name,
      nascimento: new Date(patient.birthDate),
      cpf: patient.cpf,
      email: patient.email || "",
      telefone: patient.phone || "",
      endereco: patient.address || "",
      responsavel_financeiro: patient.guardianName || "",
      contato_emergencia: patient.guardianPhone || "",
      plano_saude: patient.healthInsurance || "",
      matricula: patient.healthInsuranceNumber || "",
      cor_agenda: "#4ECDC4",
    },
  });

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

      console.log("✏️ Editando dados do paciente:", data);

      // Preparar dados para a API
      const patientData = {
        id: patient.id,
        name: data.nome,
        cpf: data.cpf?.replace(/\D/g, ""),
        birthDate: data.nascimento.toISOString(),
        email: data.email || undefined,
        phone: data.telefone,
        address: data.endereco,
        guardianName: data.responsavel_financeiro,
        guardianPhone: data.contato_emergencia,
        healthInsurance:
          data.plano_saude === "particular" ? undefined : data.plano_saude,
        healthInsuranceNumber: data.matricula,
      };

      // Preparar headers com dados do usuário
      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch("/api/pacientes", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
        body: JSON.stringify(patientData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao atualizar paciente");
      }

      console.log("✅ Paciente atualizado com sucesso:", result.data.name);

      // Fechar modal
      setOpen(false);

      // Callback de sucesso (recarregar lista)
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("❌ Erro ao atualizar paciente:", error);
      alert(
        error instanceof Error ? error.message : "Erro ao atualizar paciente"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Paciente</DialogTitle>
          <DialogDescription>
            Atualize as informações do paciente. Campos marcados com * são
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

                {/* Data de Nascimento */}
                <FormField
                  control={form.control}
                  name="nascimento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Nascimento *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "dd/MM/yyyy", {
                                  locale: ptBR,
                                })
                              ) : (
                                <span>Selecione a data</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
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
                        value={field.value || ""}
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
                  "Salvar Alterações"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
