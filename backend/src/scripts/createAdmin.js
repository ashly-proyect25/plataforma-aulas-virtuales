// backend/src/scripts/createAdmin.js
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';



async function createAdmin() {
  try {
    console.log('🔧 Creando usuario administrador...');

    // Verificar si ya existe un admin
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (existingAdmin) {
      console.log('⚠️  Ya existe un usuario administrador:');
      console.log(`   Username: ${existingAdmin.username}`);
      console.log(`   Email: ${existingAdmin.email}`);
      console.log('');
      console.log('Si deseas crear otro admin, modifica este script.');
      return;
    }

    // Datos del admin
    const adminData = {
      username: 'admin',
      email: 'admin@plataforma.com',
      password: 'admin123', // ⚠️ CAMBIAR en producción
      name: 'Administrador del Sistema',
      role: 'ADMIN',
    };

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(adminData.password, 10);

    // Crear admin
    const admin = await prisma.user.create({
      data: {
        username: adminData.username,
        email: adminData.email,
        password: hashedPassword,
        name: adminData.name,
        role: adminData.role,
        isActive: true,
      },
    });

    console.log('✅ Administrador creado exitosamente!');
    console.log('');
    console.log('📋 Credenciales:');
    console.log(`   Username: ${adminData.username}`);
    console.log(`   Password: ${adminData.password}`);
    console.log(`   Email: ${adminData.email}`);
    console.log('');
    console.log('🔐 IMPORTANTE: Cambia la contraseña después del primer login');
    console.log('');
    console.log('🌐 Accede al panel admin en: http://localhost:5173/admin/login');
    console.log('');
  } catch (error) {
    console.error('❌ Error al crear administrador:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();