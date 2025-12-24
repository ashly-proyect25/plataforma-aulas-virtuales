// backend/src/routes/setup.js
import express from 'express';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// ⚠️ RUTA TEMPORAL PARA CREAR ADMIN - ELIMINAR DESPUÉS DE USAR
router.post('/setup/create-admin', async (req, res) => {
  try {
    console.log('🔧 Intentando crear usuario administrador...');

    // Verificar si ya existe un admin
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (existingAdmin) {
      return res.status(400).json({
        error: 'Ya existe un usuario administrador',
        admin: {
          username: existingAdmin.username,
          email: existingAdmin.email
        }
      });
    }

    // Datos del admin
    const adminData = {
      username: 'admin',
      email: 'admin@plataforma.com',
      password: 'admin123', // ⚠️ CAMBIAR después del primer login
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
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
      }
    });

    console.log('✅ Administrador creado exitosamente!');

    res.json({
      message: '✅ Administrador creado exitosamente',
      credentials: {
        username: adminData.username,
        password: adminData.password,
        email: adminData.email
      },
      admin,
      warning: '🔐 IMPORTANTE: Cambia la contraseña después del primer login'
    });
  } catch (error) {
    console.error('❌ Error al crear administrador:', error);
    res.status(500).json({
      error: 'Error al crear administrador',
      details: error.message
    });
  }
});

export default router;
