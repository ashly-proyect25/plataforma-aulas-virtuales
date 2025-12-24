// backend/src/routes/setup.js
import express from 'express';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
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

// ⚠️ RUTA TEMPORAL PARA EJECUTAR MIGRACIONES - ELIMINAR DESPUÉS DE USAR
router.post('/setup/migrate', async (req, res) => {
  try {
    console.log('🔧 Ejecutando migraciones de Prisma...');

    const { stdout, stderr } = await execAsync('npx prisma migrate deploy', {
      cwd: process.cwd(),
      env: process.env
    });

    console.log('✅ Migraciones ejecutadas exitosamente');
    console.log('STDOUT:', stdout);
    if (stderr) console.error('STDERR:', stderr);

    res.json({
      message: '✅ Migraciones ejecutadas exitosamente',
      output: stdout,
      errors: stderr || null
    });
  } catch (error) {
    console.error('❌ Error al ejecutar migraciones:', error);
    res.status(500).json({
      error: 'Error al ejecutar migraciones',
      details: error.message,
      output: error.stdout,
      errors: error.stderr
    });
  }
});

export default router;
