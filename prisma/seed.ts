import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  // Seed admin user: khaleel / 586627
  const existingAdmin = await db.user.findFirst({ where: { role: 'admin' } });
  if (existingAdmin) {
    console.log('Admin user already exists, skipping seed.');
    return;
  }

  const hashedPassword = await bcrypt.hash('586627', 12);
  const adminId = uuidv4();

  const admin = await db.user.create({
    data: {
      id: adminId,
      email: 'admin@ibspro.com',
      username: 'khaleel',
      password: hashedPassword,
      name: 'Khaleel',
      role: 'admin',
      isActive: true,
    },
  });

  console.log(`✅ Admin user created:`);
  console.log(`   Username: khaleel`);
  console.log(`   Password: 586627`);
  console.log(`   ID: ${admin.id}`);

  // Create a sample company for demo purposes
  const companyId = uuidv4();
  const companyCode = 'DEMO001';
  await db.company.create({
    data: {
      id: companyId,
      name: 'Demo Company',
      companyCode,
      email: 'demo@ibspro.com',
      city: 'Helsinki',
      country: 'Finland',
    },
  });

  // Create demo user linked to demo company
  const demoPassword = await bcrypt.hash('demo1234', 12);
  const demoUserId = uuidv4();
  await db.user.create({
    data: {
      id: demoUserId,
      email: 'demo@ibspro.com',
      username: 'demouser',
      password: demoPassword,
      name: 'Demo User',
      role: 'user',
      isActive: true,
    },
  });

  await db.companyUser.create({
    data: {
      userId: demoUserId,
      companyId,
      role: 'owner',
    },
  });

  // Create trial subscription for demo user
  await db.subscription.create({
    data: {
      userId: demoUserId,
      plan: 'monthly',
      status: 'trial',
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  console.log(`✅ Demo user created:`);
  console.log(`   Username: demouser`);
  console.log(`   Password: demo1234`);
  console.log(`   Company Code: ${companyCode}`);
}

seed()
  .catch(console.error)
  .finally(() => process.exit(0));
