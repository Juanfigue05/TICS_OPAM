// ============================================================================
// ARCHIVO: 1_backend/middleware/auth.js
// ============================================================================

const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_super_segura_aqui';

// Mapeo de roles de la base de datos a roles JWT más cortos y estándar
const ROL_MAP = {
    'ADMINISTRADOR': 'admin',
    'TICS': 'technician',
    'VISITANTE': 'viewer'
};

// ─────────────────────────────────────────────
// Verificar token JWT y adjuntar usuario a req.user
// ─────────────────────────────────────────────
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ success: false, error: 'Token requerido' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Verificar que el usuario siga activo en la DB
        const [user] = await query(
            `SELECT u.id_usuario, u.username, u.rol, u.activo, p.id_persona, p.nombre
             FROM Usuarios_sistema u
             LEFT JOIN Personas p ON u.id_persona = p.id_persona
             WHERE u.id_usuario = ? AND u.activo = true`,
            [decoded.id_usuario]
        );

        if (!user) {
            return res.status(403).json({ success: false, error: 'Token inválido o usuario inactivo' });
        }

        // Mapear rol de DB a rol JWT
        req.user = {
            id_usuario: user.id_usuario,
            username: user.username,
            rol: ROL_MAP[user.rol] || 'viewer',
            nombre: user.nombre,
            id_persona: user.id_persona
        };

        next();
    } catch (err) {
        console.error('Error verificando token:', err.message);
        return res.status(403).json({ success: false, error: 'Token inválido o expirado' });
    }
};

// ─────────────────────────────────────────────
// Verificar rol (array de roles permitidos)
// Ejemplo: requireRole(['admin', 'technician'])
// ─────────────────────────────────────────────
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.rol) {
            return res.status(401).json({ success: false, error: 'No autenticado' });
        }

        if (!allowedRoles.includes(req.user.rol)) {
            return res.status(403).json({
                success: false,
                error: `Acceso denegado. Rol requerido: ${allowedRoles.join(' o ')}. Tu rol: ${req.user.rol}`
            });
        }

        next();
    };
};

// ─────────────────────────────────────────────
// Generar token JWT al hacer login (usado en auth.js)
// ─────────────────────────────────────────────
const generateToken = (user) => {
    return jwt.sign(
        {
            id_usuario: user.id_usuario,
            username: user.username,
            rol: ROL_MAP[user.rol] || 'viewer'
        },
        JWT_SECRET,
        { expiresIn: '8h' } // puedes cambiar a '24h', '7d', etc.
    );
};

module.exports = {
    authenticateToken,
    requireRole,
    generateToken
};