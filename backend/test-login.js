import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testLogin() {
  try {
    // Buscar usuario admin
    const admin = await prisma.user.findUnique({
      where: { username: 'admin' },
    });

    if (!admin) {
      console.log('❌ Usuario admin no existe');
      return;
    }

    console.log('✅ Usuario encontrado:', admin);
    console.log('');

    // Probar contraseña
    const passwordMatch = await bcrypt.compare('admin123', admin.password);
    
    if (passwordMatch) {
      console.log('✅ Contraseña es correcta');
    } else {
      console.log('❌ Contraseña es incorrecta');
      console.log('   Contraseña guardada (hash):', admin.password);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();
