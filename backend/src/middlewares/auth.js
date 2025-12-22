// backend/src/middlewares/auth.js
import jwt from 'jsonwebtoken';
import redisClient from '../config/redis.js';

// ==================== MIDDLEWARE DE AUTENTICACIÓN ====================
export const authenticate = async (req, res, next) => {
  try {
    console.log('🔍 [AUTH] Middleware ejecutado para:', req.method, req.path);
    
    // Obtener token del header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [AUTH] No se proporcionó token');
      return res.status(401).json({
        error: 'No se proporcionó token de autenticación'
      });
    }

    const token = authHeader.substring(7); // Remover 'Bearer '
    console.log('🔍 [AUTH] Token recibido:', token.substring(0, 20) + '...');

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔍 [AUTH] Token decodificado:', decoded);

    // Verificar sesión en Redis
    const sessionKey = `session:${decoded.userId}`;
    console.log('🔍 [AUTH] Buscando sesión en Redis:', sessionKey);
    
    const session = await redisClient.get(sessionKey);
    console.log('🔍 [AUTH] Sesión encontrada:', session ? 'SÍ' : 'NO');
    
    if (session) {
      console.log('🔍 [AUTH] Contenido de sesión:', session);
    }
    
    if (!session) {
      console.log('❌ [AUTH] Sesión NO encontrada en Redis, rechazando request');
      return res.status(401).json({
        error: 'Sesión expirada o inválida'
      });
    }

    // Agregar info del usuario al request
    req.user = decoded;
    console.log('✅ [AUTH] Autenticación exitosa para:', decoded.username);
    next();
  } catch (error) {
    console.error('❌ [AUTH] Error en autenticación:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Token inválido'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expirado'
      });
    }
    console.error('❌ [AUTH] Error completo:', error);
    res.status(500).json({
      error: 'Error al verificar autenticación',
      details: error.message
    });
  }
};

// ==================== MIDDLEWARE DE ROLES ====================
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    console.log('🔍 [AUTHORIZE] Verificando roles para:', req.user?.username);
    console.log('🔍 [AUTHORIZE] Rol del usuario:', req.user?.role);
    console.log('🔍 [AUTHORIZE] Roles permitidos:', allowedRoles);
    
    if (!req.user) {
      console.log('❌ [AUTHORIZE] Usuario no autenticado');
      return res.status(401).json({
        error: 'No autenticado'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.log('❌ [AUTHORIZE] Rol no permitido');
      return res.status(403).json({
        error: 'No tienes permisos para acceder a este recurso',
        requiredRoles: allowedRoles,
        yourRole: req.user.role
      });
    }

    console.log('✅ [AUTHORIZE] Autorización exitosa');
    next();
  };
};

// ==================== MIDDLEWARE OPCIONAL (solo si hay token) ====================
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    }
    next();
  } catch (error) {
    // Si hay error, continuar sin autenticación
    next();
  }
};