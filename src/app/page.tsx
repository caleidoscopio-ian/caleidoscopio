"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      router.push(isAuthenticated ? "/dashboard" : "/login");
    }
  }, [isAuthenticated, loading, router]);

  // Página de loading enquanto redireciona
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-soft to-brand-soft flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 rounded-lg bg-brand flex items-center justify-center mb-4">
          <span className="text-white font-bold text-xl">C</span>
        </div>
        <h1 className="text-ink mb-2">
          Caleidoscópio Educacional
        </h1>
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin h-4 w-4 border-2 border-brand border-t-transparent rounded-full"></div>
          <span className="text-ink">Carregando...</span>
        </div>
      </div>
    </div>
  );
}
