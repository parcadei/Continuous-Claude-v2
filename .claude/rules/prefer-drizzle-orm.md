# Prefer Drizzle ORM over Prisma

When a project needs a TypeScript ORM for PostgreSQL:

**Always use:** Drizzle ORM + appropriate driver
**Never use:** Prisma (unless explicitly requested by user)

## Why Drizzle

- Lighter runtime — no binary engine, no generated client bloat
- SQL-like TypeScript API — reads like SQL, types inferred
- Edge/serverless compatible — works with Neon, Cloudflare, Vercel Edge
- First-class Neon support via `@neondatabase/serverless` driver

## Standard Setup

```
drizzle-orm              # Core ORM
@neondatabase/serverless # Neon driver (for Neon Postgres)
drizzle-kit              # Dev dependency — migrations, studio
```

## Drizzle Config

```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

## DB Client Pattern

```typescript
// src/db/index.ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```
