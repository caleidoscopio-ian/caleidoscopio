/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Loader2, Calendar, Stethoscope, ArrowLeft, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const prontuarioSchema = z.object({
  patientId: z.string().min(1, "Paciente é obrigatório"),
  professionalId: z.string().min(1, "Profissional é obrigatório"),
  sessionDate: z.string().min(1, "Data da sessão é obrigatória"),
  serviceType: z.string().min(1, "Tipo de atendimento é obrigatório"),
  clinicalEvolution: z
    .string()
    .min(10, "Evolução clínica deve ter pelo menos 10 caracteres"),
  observations: z.string().optional(),
  attachments: z.array(z.string()).optional(),
});

type ProntuarioFormData = z.infer<typeof prontuarioSchema>;

interface Patient {
  id: string;
  nome: string;
}

interface Professional {
  id: string;
  nome: string;
  especialidade: string;
}

export default function EditarProntuario() {
  const router = useRouter();
  const params = useParams();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [prontuario, setProntuario] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const prontuarioId = params.id as string;

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Prontuários", href: "/prontuarios" },
    { label: "Editar Prontuário" },
  ];

  const form = useForm<ProntuarioFormData>({
    resolver: zodResolver(prontuarioSchema),
    defaultValues: {
      patientId: "",
      professionalId: "",
      sessionDate: "",
      serviceType: "",
      clinicalEvolution: "",
      observations: "",
      attachments: [],
    },
  });

  const tiposAtendimento = [
    "Consulta Inicial",
    "Sessão de Terapia",
    "Avaliação",
    "Reavaliação",
    "Orientação Familiar",
    "Atendimento Conjunto",
    "Sessão de Grupo",
    "Acompanhamento",
  ];

  const fetchPatientsAndProfessionals = async () => {
    if (!user) return;

    try {
      setLoadingData(true);
      const userDataEncoded = btoa(JSON.stringify(user));

      const [patientsResponse, professionalsResponse] = await Promise.all([
        fetch("/api/pacientes", {
          headers: {
            "Content-Type": "application/json",
            "X-User-Data": userDataEncoded,
            "X-Auth-Token": user.token,
          },
        }),
        fetch("/api/terapeutas", {
          headers: {
            "Content-Type": "application/json",
            "X-User-Data": userDataEncoded,
            "X-Auth-Token": user.token,
          },
        }),
      ]);

      const patientsResult = await patientsResponse.json();
      const professionalsResult = await professionalsResponse.json();

      if (patientsResult.success) {
        setPatients(patientsResult.data);
      }

      if (professionalsResult.success) {
        setProfessionals(professionalsResult.data);
      }
    } catch (error) {
      console.error("❌ Erro ao carregar dados:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar pacientes e profissionais",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    const fetchProntuario = async () => {
      if (!isAuthenticated || !user) return;

      try {
        const userDataEncoded = btoa(JSON.stringify(user));

        const response = await fetch(`/api/prontuarios/${prontuarioId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-User-Data": userDataEncoded,
            "X-Auth-Token": user.token,
          },
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Erro ao buscar prontuário");
        }

        if (result.success) {
          const data = result.data;
          setProntuario(data);

          // Set form values
          form.reset({
            patientId: data.patient.id,
            professionalId: data.professional.id,
            sessionDate: data.sessionDate.split("T")[0],
            serviceType: data.serviceType,
            clinicalEvolution: data.clinicalEvolution,
            observations: data.observations || "",
            attachments: data.attachments || [],
          });

          // Fetch patients and professionals after loading prontuario
          fetchPatientsAndProfessionals();
        }
      } catch (error) {
        console.error("Erro ao buscar prontuário:", error);
        toast({
          title: "Erro",
          description:
            error instanceof Error
              ? error.message
              : "Erro ao carregar prontuário",
          variant: "destructive",
        });
        router.push("/prontuarios");
      } finally {
        setLoading(false);
      }
    };

    fetchProntuario();
  }, [prontuarioId, isAuthenticated, user]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const onSubmit = async (data: ProntuarioFormData) => {
    try {
      setSaving(true);

      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      console.log("✏️ Editando prontuário:", data);

      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch("/api/prontuarios", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
        body: JSON.stringify({
          id: prontuarioId,
          ...data,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao atualizar prontuário");
      }

      console.log("✅ Prontuário atualizado com sucesso");

      toast({
        title: "Sucesso",
        description: "Prontuário atualizado com sucesso!",
      });

      router.push("/prontuarios");
    } catch (error) {
      console.error("❌ Erro ao atualizar prontuário:", error);
      toast({
        title: "Erro",
        description:
          error instanceof Error
            ? error.message
            : "Erro ao atualizar prontuário",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push("/prontuarios");
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <MainLayout breadcrumbs={breadcrumbs}>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Carregando prontuário...</p>
            </div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  if (!prontuario) {
    return null;
  }

  return (
    <ProtectedRoute>
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Editar Prontuário
              </h1>
              <p className="text-muted-foreground mt-1">
                Atualize as informações do registro clínico
              </p>
            </div>
            <Button onClick={handleCancel} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          </div>

          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle>Informações do Prontuário</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  {/* Seção: Dados da Sessão */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Dados da Sessão
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Paciente */}
                      <FormField
                        control={form.control}
                        name="patientId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Paciente *</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={loadingData}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={
                                      loadingData
                                        ? "Carregando..."
                                        : "Selecione o paciente"
                                    }
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {patients.length > 0 ? (
                                  patients.map((patient) => (
                                    <SelectItem
                                      key={patient.id}
                                      value={patient.id}
                                    >
                                      {patient.nome}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="no-patients" disabled>
                                    Nenhum paciente cadastrado
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Profissional */}
                      <FormField
                        control={form.control}
                        name="professionalId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Profissional *</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={loadingData}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={
                                      loadingData
                                        ? "Carregando..."
                                        : "Selecione o profissional"
                                    }
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {professionals.length > 0 ? (
                                  professionals.map((professional) => (
                                    <SelectItem
                                      key={professional.id}
                                      value={professional.id}
                                    >
                                      {professional.nome} -{" "}
                                      {professional.especialidade}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="no-professionals" disabled>
                                    Nenhum profissional cadastrado
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Data da Sessão */}
                      <FormField
                        control={form.control}
                        name="sessionDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data da Sessão *</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                max={formatDate(new Date().toISOString())}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Tipo de Atendimento */}
                    <FormField
                      control={form.control}
                      name="serviceType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Atendimento *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo de atendimento" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {tiposAtendimento.map((tipo) => (
                                <SelectItem key={tipo} value={tipo}>
                                  {tipo}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Seção: Evolução Clínica */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
                      <Stethoscope className="h-4 w-4" />
                      Evolução e Observações
                    </h3>

                    {/* Evolução Clínica */}
                    <FormField
                      control={form.control}
                      name="clinicalEvolution"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Evolução Clínica *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Descreva detalhadamente a evolução do paciente durante a sessão, objetivos trabalhados, respostas observadas e progressos identificados..."
                              className="min-h-[120px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Registre de forma detalhada a evolução clínica
                            observada durante o atendimento.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Observações Adicionais */}
                    <FormField
                      control={form.control}
                      name="observations"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observações Adicionais</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Adicione observações complementares, recomendações para próximas sessões, orientações para família..."
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Campo opcional para observações complementares e
                            orientações.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Botões */}
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={saving}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={saving || loadingData}>
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Salvar Alterações
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
