// test-connection.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$connect();
    console.log('✅ Connexion MongoDB Atlas réussie !');
  } catch (err) {
    console.error('❌ Erreur de connexion :', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
