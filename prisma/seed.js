const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Hash passwords
  const adminPassword = await bcrypt.hash('admin123', 10);
  const deliveryPassword = await bcrypt.hash('delivery123', 10);
  const customerPassword = await bcrypt.hash('customer123', 10);
  const superAdminPassword = await bcrypt.hash('superadmin123', 10);

  // Clean DB
  console.log('Cleaning up database...');
  await prisma.notification.deleteMany({});
  await prisma.deliveryLog.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.user.deleteMany({});

  // Seed Users
  console.log('Seeding users...');
  const superadmin = await prisma.user.create({
    data: {
      name: 'AquaHome Super Admin',
      email: 'superadmin@aquahome.com',
      phone: '1112223333',
      address: 'AquaHome Headquarters, HQ 1',
      pincode: '700091',
      role: 'SUPER_ADMIN',
      passwordHash: superAdminPassword,
      firstLogin: false,
    }
  });

  const admin = await prisma.user.create({
    data: {
      name: 'AquaHome Admin',
      email: 'admin@aquahome.com',
      phone: '1234567890',
      address: 'AquaHome Headquarters, Sector 5',
      pincode: '700091',
      role: 'ADMIN',
      passwordHash: adminPassword,
      firstLogin: false,
    }
  });

  const delivery = await prisma.user.create({
    data: {
      name: 'John Delivery',
      email: 'delivery@aquahome.com',
      phone: '9876543210',
      address: 'Delivery Hub East, Street 12',
      pincode: '700091',
      role: 'DELIVERY',
      passwordHash: deliveryPassword,
      firstLogin: false,
    }
  });

  const customer = await prisma.user.create({
    data: {
      name: 'Jane Customer',
      email: 'customer@aquahome.com',
      phone: '5551234567',
      address: 'Flat 4B, Blue Waves Apartments, Lane 3',
      pincode: '700091',
      role: 'CUSTOMER',
      passwordHash: customerPassword,
      firstLogin: true, // Prompt to change password on first login
    }
  });

  // Seed Products
  console.log('Seeding products...');
  const p1 = await prisma.product.create({
    data: { name: 'Small Bottle', size: '500ml', pricePerUnit: 0.50, stock: 150, lowStockThreshold: 20 }
  });
  const p2 = await prisma.product.create({
    data: { name: 'Medium Bottle', size: '1L', pricePerUnit: 0.90, stock: 100, lowStockThreshold: 15 }
  });
  const p3 = await prisma.product.create({
    data: { name: 'Large Bottle', size: '5L', pricePerUnit: 3.00, stock: 80, lowStockThreshold: 10 }
  });
  const p4 = await prisma.product.create({
    data: { name: 'Water Can (Office Size)', size: '20L', pricePerUnit: 8.00, stock: 5, lowStockThreshold: 10 } // Low stock (5 < 10)
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
