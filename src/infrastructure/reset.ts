import { spawnSync } from "child_process";
import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  process.exit(1);
}

const client = postgres(DATABASE_URL);

async function reset() {
  console.log("🗑️  Resetting database...");

  await client`DROP SCHEMA public CASCADE`;
  await client`CREATE SCHEMA public`;
  console.log("✅ Dropped and recreated public schema");

  await client.end();
  console.log("✅ Database connection closed");

  console.log("📦 Running drizzle-kit migrate...");
  const migrate = spawnSync("bunx", ["drizzle-kit", "migrate"], {
    stdio: "inherit",
    env: process.env,
  });
  if (migrate.status !== 0) {
    console.error("❌ drizzle-kit migrate failed");
    process.exit(1);
  }
  console.log("✅ Migrations applied successfully");

  console.log("🌱 Running seed...");
  const seed = spawnSync("bun", ["src/infrastructure/seed.ts"], {
    stdio: "inherit",
    env: process.env,
  });
  if (seed.status !== 0) {
    console.error("❌ Seed failed");
    process.exit(1);
  }
  console.log("✅ Seed completed");
}

reset().catch((error) => {
  console.error("❌ Reset failed:", error);
  process.exit(1);
});
