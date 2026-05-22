'use client'

import { Landmark, ChevronDown } from 'lucide-react'
import { useFilialContext } from '@/contexts/filial-context'
import { useSidebar } from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { Filial } from '@/types/filial'

function FilialDot({ cor, className }: { cor?: string | null; className?: string }) {
  return (
    <div
      className={cn('rounded-full flex-shrink-0', className)}
      style={{ backgroundColor: cor || '#6b7280' }}
    />
  )
}

export function FilialSelector() {
  const { filiais, filialAtiva, setFilialAtiva, loading, isAdmin } = useFilialContext()
  const { state } = useSidebar()
  const collapsed = state === 'collapsed'

  if (loading) return null

  // Não-admin — badge fixo sem troca (não precisa da lista de filiais)
  if (!isAdmin) {
    if (!filialAtiva) return null
    if (collapsed) {
      return (
        <div className="flex justify-center py-1">
          <FilialDot cor={filialAtiva.cor} className="w-3 h-3" />
        </div>
      )
    }
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-sidebar-accent/50 text-sm">
        <FilialDot cor={filialAtiva.cor} className="w-2 h-2" />
        <span className="flex-1 truncate font-medium">{filialAtiva.nome}</span>
      </div>
    )
  }

  // Admin — precisa da lista de filiais
  if (filiais.length === 0) return null

  // Sidebar colapsada — apenas o indicador colorido
  if (collapsed) {
    return (
      <div className="flex justify-center py-1">
        <FilialDot cor={filialAtiva?.cor} className="w-3 h-3" />
      </div>
    )
  }

  // Admin — dropdown completo
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
          <Landmark className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate text-left font-medium">
            {filialAtiva ? filialAtiva.nome : 'Todas as filiais'}
          </span>
          {filialAtiva?.cor && <FilialDot cor={filialAtiva.cor} className="w-2 h-2" />}
          <ChevronDown className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={4} className="w-56 max-h-72 overflow-y-auto">
        <DropdownMenuItem
          onClick={() => setFilialAtiva(null)}
          className={cn('gap-2 cursor-pointer', !filialAtiva && 'bg-accent')}
        >
          <Landmark className="h-4 w-4 text-muted-foreground" />
          <span>Todas as filiais</span>
        </DropdownMenuItem>
        {filiais.length > 0 && <DropdownMenuSeparator />}
        {filiais.map((f: Filial) => (
          <DropdownMenuItem
            key={f.id}
            onClick={() => setFilialAtiva(f)}
            className={cn('gap-2 cursor-pointer', filialAtiva?.id === f.id && 'bg-accent')}
          >
            <FilialDot cor={f.cor} className="w-3 h-3" />
            <div className="flex flex-col min-w-0">
              <span className="truncate font-medium">{f.nome}</span>
              {f.cidade && (
                <span className="truncate text-xs text-muted-foreground">{f.cidade}</span>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
