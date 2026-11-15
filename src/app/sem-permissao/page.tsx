'use client'

import Link from 'next/link'
import { ShieldOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function SemPermissaoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-sunken to-surface-sunken">
      <div className="text-center space-y-6 max-w-sm px-4">
        <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldOff className="h-10 w-10 text-destructive" />
        </div>
        {/* Tela centrada: aqui o título não é `PageHeader` de propósito — o
            cabeçalho do kit alinha à esquerda e abriga ações. */}
        <div>
          <h1 className="text-ink">Acesso Negado</h1>
          <p className="mt-2 text-ink-3">
            Você não tem permissão para acessar este recurso. Entre em contato com o
            administrador para solicitar acesso.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button asChild>
            <Link href="/dashboard">Voltar ao Dashboard</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/perfil">Meu Perfil</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
