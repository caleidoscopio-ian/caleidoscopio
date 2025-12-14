"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, loading, login } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Se já estiver autenticado, redirecionar diretamente para dashboard
  useEffect(() => {
    if (!loading && isAuthenticated) {
      console.log(
        "✅ LOGIN - Usuário autenticado, redirecionando para dashboard"
      );
      router.push("/dashboard");
    }
  }, [isAuthenticated, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Usar processo SSO completo (3 etapas) conforme documentação oficial
      const { managerClient } = await import("@/lib/manager-client");

      const ssoResult = await managerClient.ssoLogin({
        email: formData.email,
        password: formData.password,
      });

      // ETAPA 4: Salvar dados no localStorage conforme documentação
      const userData = {
        id: ssoResult.user.id,
        email: ssoResult.user.email,
        name: ssoResult.user.name,
        role: ssoResult.user.role,
        tenant: ssoResult.tenant,
        config: ssoResult.config,
        token: ssoResult.token,
        loginTime: new Date().toISOString(),
      };

      localStorage.setItem("edu_auth_user", JSON.stringify(userData));
      localStorage.setItem("edu_auth_token", ssoResult.token);

      console.log("✅ Dados salvos localmente");

      // CRUCIAL: Definir cookie para o middleware
      console.log("🍪 Definindo cookie para middleware...");
      const cookieResponse = await fetch("/api/auth/set-cookie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: ssoResult.token }),
      });

      if (!cookieResponse.ok) {
        throw new Error("Erro ao definir cookie de autenticação");
      }

      console.log("✅ Cookie definido com sucesso");

      // CRÍTICO: Atualizar contexto de autenticação ANTES de redirecionar
      console.log("🔄 Atualizando contexto de autenticação...");
      login(userData);

      console.log("🔄 Redirecionando para dashboard...");

      // Reset loading state
      setIsLoading(false);

      // Pequeno delay para garantir que o contexto foi atualizado
      setTimeout(() => {
        router.push("/dashboard");
      }, 100);
    } catch (error) {
      console.error("❌ Erro no login:", error);
      setIsLoading(false); // Reset loading state

      // Tratamento específico de erros conforme documentação
      let errorMessage = "Erro desconhecido";

      if (error instanceof Error) {
        const message = error.message.toLowerCase();

        if (
          message.includes("credenciais inválidas") ||
          message.includes("invalid credentials")
        ) {
          errorMessage = "Email ou senha incorretos";
        } else if (
          message.includes("não tem acesso") ||
          message.includes("access denied")
        ) {
          errorMessage =
            "Você não tem acesso ao módulo educacional. Entre em contato com o administrador.";
        } else if (
          message.includes("clínica não encontrada") ||
          message.includes("tenant not found")
        ) {
          errorMessage = "Clínica não encontrada";
        } else if (message.includes("token")) {
          errorMessage = "Erro interno de autenticação. Tente novamente.";
        } else if (message.includes("fetch") || message.includes("network")) {
          errorMessage =
            "Erro de conexão. Verifique sua internet e tente novamente.";
        } else {
          errorMessage = error.message;
        }
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: "email" | "password", value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6 md:p-10">
        <div className="w-full max-w-sm md:max-w-4xl">
          <div className="text-center">
            <Image
              src="/caleido_logox.png"
              alt="Caleidoscópio Logo"
              width={180}
              height={60}
              className="object-contain mb-6 mx-auto"
            />
            <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <span className="text-gray-600 text-sm">
              Verificando autenticação...
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Se já estiver autenticado, não mostrar formulário
  if (!loading && isAuthenticated) {
    return null; // Redirecionamento já aconteceu no useEffect
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <div className="overflow-hidden rounded-lg bg-white shadow-xl">
          <div className="grid p-0 md:grid-cols-2">
            {/* Left Side - Login Form */}
            <form className="p-4 sm:p-6 md:p-8" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-4 sm:gap-6">
                {/* Header */}
                <div className="flex flex-col items-center text-center">
                  <Image
                    src="/caleido_logox.png"
                    alt="Caleidoscópio Logo"
                    width={160}
                    height={40}
                    className="object-contain mb-4"
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <div className="rounded-md bg-red-50 border border-red-200 p-3 text-center">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* Email */}
                <div className="grid gap-2">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium text-gray-700"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                {/* Password */}
                <div className="grid gap-2">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-gray-700"
                  >
                    Senha
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Digite sua senha"
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center items-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Entrando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </button>

                {/* Footer */}
                <div className="text-center text-sm">
                  <p className="text-gray-500">
                    Powered by{" "}
                    <span className="font-medium">Caleidoscópio</span>
                  </p>
                </div>
              </div>
            </form>

            {/* Right Side - Banner */}
            <div className="relative hidden md:block">
              <Image
                src="/Caleidoscopio_Banner_100x160cm.jpg"
                alt="Caleidoscópio - Educar para incluir, aprender para transformar"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
        </div>

        {/* Terms */}
        <div className="mt-4 text-balance text-center text-xs text-gray-500">
          Ao continuar, você concorda com nossos{" "}
          <a
            href="#"
            className="underline underline-offset-4 hover:text-blue-600"
          >
            Termos de Serviço
          </a>{" "}
          e{" "}
          <a
            href="#"
            className="underline underline-offset-4 hover:text-blue-600"
          >
            Política de Privacidade
          </a>
          .
        </div>
      </div>
    </div>
  );
}
