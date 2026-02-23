// ============================================================================
// ARCHIVO: 1_backend/middleware/auth.js
// DESCRIPCIÓN: Middleware JWT. Verifica token y controla permisos por rol.
//
// ROLES:
//   viewer      → Solo GET (VISITANTE)
//   technician  → GET, POST, PUT (TICS)
//   admin       → GET, POST, PUT, DELETE (ADMINISTRADOR)
// ============================================================================

const jwt = require('jsonwebtoken');

// Verifica que el token JWT sea válido
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Acceso denegado. Token no proporcionado.'
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                error: 'Token inválido o expirado.'
            });
        }
        req.user = user;
        next();
    });
}

// Verifica que el usuario tenga uno de los roles permitidos
function requireRole(rolesPermitidos) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Usuario no autenticado.'
            });
        }

        if (!rolesPermitidos.includes(req.user.rol)) {
            return res.status(403).json({
                success: false,
                error: 'No tienes permisos para esta acción.',
                tu_rol: req.user.rol,
                rol_requerido: rolesPermitidos
            });
        }

        next();
    };
}

// Verifica permisos automáticamente según el método HTTP
function checkPermissions(req, res, next) {
    const method = req.method;
    const userRole = req.user.rol;

    if (userRole === 'VISITANTE' && method !== 'GET') {
        return res.status(403).json({
            success: false,
            error: 'Los visitantes solo pueden consultar información.'
        });
    }

    if (userRole === 'TICS' && method === 'DELETE') {
        return res.status(403).json({
            success: false,
            error: 'Solo los administradores pueden eliminar registros.'
        });
    }

    next();
}

module.exports = { authenticateToken, requireRole, checkPermissions };