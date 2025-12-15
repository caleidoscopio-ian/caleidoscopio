import { PrismaClient } from '@prisma/client'

// Instância global do Prisma para evitar múltiplas conexões
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Classe para gerenciar conexões multi-tenant
export class TenantPrismaClient {
  private static instances = new Map<string, PrismaClient>()

  static getInstance(tenantId: string): PrismaClient {
    if (!this.instances.has(tenantId)) {
      const client = new PrismaClient({
        log: ['query'],
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
      })

      // Configurar search_path para o tenant específico
      client.$extends({
        query: {
          $allModels: {
            async $allOperations({ model, args, query }) {
              // Para modelos tenant-specific, ajustar o schema
              const tenantModels = [
                'Paciente',
                'Profissional',
                'Agendamento',
                'Prontuario',
                'Trilha',
                'Atividade',
                'TrilhaAtividade',
                'TrilhaAluno',
                'ProgressoAtividade',
                'Recompensa',
                'ConquistaAluno'
              ]

              if (tenantModels.includes(model)) {
                // Executar em contexto do tenant
                await client.$executeRaw`SET search_path TO tenant_${tenantId}, public`
              }

              return query(args)
            },
          },
        },
      })

      this.instances.set(tenantId, client)
    }

    return this.instances.get(tenantId)!
  }

  static async clearInstance(tenantId: string) {
    const instance = this.instances.get(tenantId)
    if (instance) {
      await instance.$disconnect()
      this.instances.delete(tenantId)
    }
  }

  static async clearAllInstances() {
    for (const [, instance] of this.instances) {
      await instance.$disconnect()
    }
    this.instances.clear()
  }
}

// Hook para operações multi-tenant
// TODO: Implementar quando o modelo Tenant for adicionado ao schema
/* export async function withTenant<T>(
  tenantSlug: string,
  operation: (client: PrismaClient) => Promise<T>
): Promise<T> {
  // Buscar tenant pelo slug
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug }
  })

  if (!tenant || !tenant.ativo) {
    throw new Error('Tenant não encontrado ou inativo')
  }

  // Obter cliente específico do tenant
  const tenantClient = TenantPrismaClient.getInstance(tenant.id)

  // Executar operação
  return await operation(tenantClient)
} */