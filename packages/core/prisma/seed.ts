import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create system Inbox list
  const inbox = await prisma.list.upsert({
    where: { name: 'inbox' },
    update: {},
    create: {
      name: 'inbox',
      isSystem: true,
      isDeletable: false,
      position: 0,
    },
  });

  console.log('Created Inbox list:', inbox.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
