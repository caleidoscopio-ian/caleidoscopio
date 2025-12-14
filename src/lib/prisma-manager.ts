// Conexão Prisma para o banco do Sistema 1 (Manager)
import { PrismaClient as PrismaClientManager } from '@prisma/client'

const globalForPrismaManager = globalThis as unknown as {
  prismaManager: PrismaClientManager | undefined
}

export const prismaManager = globalForPrismaManager.prismaManager ?? new PrismaClientManager({
  datasources: {
    db: {
      url: process.env.MANAGER_DATABASE_URL
    }
  }
})

if (process.env.NODE_ENV !== 'production') globalForPrismaManager.prismaManager = prismaManager
