import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";
import { characters } from "../chattyKathysCharacters.ts";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seed() {
  console.log("🌱 Seeding characters...");

  for (const character of characters) {
    await prisma.character.upsert({
      where: { slug: character.slug },
      update: {
        name: character.name,
        bio: character.bio,
        systemPrompt: character.systemPrompt,
        accentColor: character.accentColor,
      },
      create: {
        name: character.name,
        slug: character.slug,
        bio: character.bio,
        systemPrompt: character.systemPrompt,
        accentColor: character.accentColor,
      },
    });
    console.log(`  ✓ ${character.name}`);
  }

  console.log("✅ Seeding complete!");
}

seed()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
