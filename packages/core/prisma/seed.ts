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

  // Create default admin user (dev only - change password in production!)
  const passwordHash = await Bun.password.hash('admin123', {
    algorithm: 'bcrypt',
    cost: 12,
  });

  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash,
    },
  });

  console.log('Created admin user:', adminUser.id);
  console.log('  Username: admin');
  console.log('  Password: admin123 (change in production!)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
