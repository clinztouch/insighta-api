import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { uuidv7 } from 'uuidv7';
import * as fs from 'fs';
import * as path from 'path';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const filePath = path.join(__dirname, 'seed_profiles.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { profiles } = JSON.parse(raw);

  console.log(`Seeding ${profiles.length} profiles...`);

  const data = profiles.map((profile: any) => ({
    id: uuidv7(),
    ...profile,
  }));

  const result = await prisma.profile.createMany({
    data,
    skipDuplicates: true,
  });

  console.log(`Done. Created: ${result.count} profiles.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });