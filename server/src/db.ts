import { PrismaClient } from '@prisma/client'

// Reuse a single PrismaClient across hot-reloads in dev.
export const prisma = new PrismaClient()
