import { defineConfig } from "drizzle-kit";
import "dotenv/config";

export default defineConfig({
  schema: "./schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Prefer DIRECT_DATABASE_URL for migrations/push to bypass PgBouncer limits
    url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || "",
  },
});
