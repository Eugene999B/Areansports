import { database } from '../src/client.js';

async function main(): Promise<void> {
  await database.game.upsert({
    where: { slug: 'efootball' },
    update: {},
    create: {
      slug: 'efootball',
      name: 'eFootball',
      publisher: 'Konami',
      active: true,
      resultProvider: 'EVIDENCE',
    },
  });

  await database.game.upsert({
    where: { slug: 'fc-mobile' },
    update: {},
    create: {
      slug: 'fc-mobile',
      name: 'EA SPORTS FC Mobile',
      publisher: 'Electronic Arts',
      active: true,
      resultProvider: 'EVIDENCE',
    },
  });
}

main()
  .then(() => database.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await database.$disconnect();
    process.exitCode = 1;
  });
