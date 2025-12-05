import { PrismaClient } from "@prisma/client";
import "dotenv/config";

declare global {
  var prisma: PrismaClient | undefined;
}

// FIX: We must use the 'datasources' object structure.
// 'db' corresponds to 'datasource db { ... }' in your schema.prisma
const db =
  globalThis.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== "production") globalThis.prisma = db;

export default db;
