import prisma from '@/lib/prisma';

async function verifyConnection() {
  console.log('Verifying Prisma connection...');
  try {
    // Attempt a simple query to verify connection
    // Using $queryRaw`SELECT 1` is a good generic test for connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  } finally {
      try {
          await prisma.$disconnect();
      } catch (e) {
          // Ignore disconnect error if connection was never established
      }
  }
}

verifyConnection();
