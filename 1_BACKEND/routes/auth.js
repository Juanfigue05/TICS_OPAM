// ============================================================================
// ARCHIVO: 1_backend/routes/auth.js
// DESCRIPCIÓN: Rutas de autenticación — login, logout, perfil
//
// RUTAS:
//   POST /api/auth/login   → Iniciar sesión (pública)
//   GET  /api/auth/me      → Obtener perfil del usuario autenticado
//   POST /api/auth/logout  → Cerrar sesión
//   PUT  /api/auth/password → Cambiar contraseña
//
// ROLES EN DB: ADMINISTRADOR | TICS | VISITANTE
// ROLES EN JWT: admin        | technician | viewer
// ============================================================================

const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const { query }              = require('../config/database');
const { authenticateToken }  = require('../middleware/auth');

// Mapeo de roles del DB al formato del JWT/middleware
const ROL_DB_TO_JWT = {
    'ADMINISTRADOR': 'admin',
    'TICS':          'technician',
    'VISITANTE':     'viewer'
};

// ─────────────────────────────────────────────
// POST /api/auth/login
// Body: { username, password }
// ─────────────────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Usuario y contraseña son requeridos'
            });
        }

        // Buscar usuario activo + datos de persona
        const rows = await query(`
            SELECT
                u.id_usuario,
                u.username,
                u.password_hash,
                u.rol,
                u.activo,
                p.id_persona,
                p.nombre,
                p.correo_asignado,
                p.cargo,
                p.area
            FROM Usuarios_sistema u
            LEFT JOIN Personas p ON u.id_persona = p.id_persona
            WHERE u.username = ? AND u.activo = true
        `, [username]);

        if (!rows.length) {
            return res.status(401).json({
                success: false,
                error: 'Usuario o contraseña incorrectos'
            });
        }

        const usuario = rows[0];

        // Verificar contraseña con bcrypt
        const passwordValida = await bcrypt.compare(password, usuario.password_hash);

        if (!passwordValida) {
            return res.status(401).json({
                success: false,
                error: 'Usuario o contraseña incorrectos'
            });
        }

        // Mapear rol a formato JWT
        const rolJWT = ROL_DB_TO_JWT[usuario.rol] || 'viewer';

        // Generar JWT
        const payload = {
            id_usuario: usuario.id_usuario,
            username:   usuario.username,
            rol:        rolJWT,          // 'admin' | 'technician' | 'viewer'
            rol_db:     usuario.rol,     // 'ADMINISTRADOR' | 'TICS' | 'VISITANTE'
            id_persona: usuario.id_persona
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '8h'
        });

        // Actualizar último acceso
        await query(
            'UPDATE Usuarios_sistema SET ultimo_acceso = NOW() WHERE id_usuario = ?',
            [usuario.id_usuario]
        );

        res.json({
            success: true,
            message: 'Login exitoso',
            token,
            usuario: {
                id_usuario:      usuario.id_usuario,
                username:        usuario.username,
                nombre:          usuario.nombre,
                correo_asignado: usuario.correo_asignado,
                cargo:           usuario.cargo,
                area:            usuario.area,
                rol:             rolJWT,
                rol_db:          usuario.rol
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// ─────────────────────────────────────────────
// GET /api/auth/me  (requiere token)
// ─────────────────────────────────────────────
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const rows = await query(`
            SELECT
                u.id_usuario, u.username, u.rol, u.ultimo_acceso,
                p.id_persona, p.nombre, p.correo_asignado, p.cargo, p.area, p.celular
            FROM Usuarios_sistema u
            LEFT JOIN Personas p ON u.id_persona = p.id_persona
            WHERE u.id_usuario = ?
        `, [req.user.id_usuario]);

        if (!rows.length) {
            return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
        }

        const u = rows[0];
        res.json({
            success: true,
            data: {
                ...u,
                rol_jwt: req.user.rol           // 'admin' | 'technician' | 'viewer'
            }
        });
    } catch (error) {
        console.error('Error en /me:', error);
        res.status(500).json({ success: false, error: 'Error al obtener perfil' });
    }
});

// ─────────────────────────────────────────────
// POST /api/auth/logout  (requiere token)
// ─────────────────────────────────────────────
router.post('/logout', authenticateToken, (req, res) => {
    // JWT es stateless; el frontend borra el token.
    // Aquí se podría agregar a una blacklist si fuera necesario.
    res.json({ success: true, message: 'Sesión cerrada correctamente' });
});

// ─────────────────────────────────────────────
// PUT /api/auth/password  (requiere token)
// Body: { password_actual, password_nueva }
// ─────────────────────────────────────────────
router.put('/password', authenticateToken, async (req, res) => {
    try {
        const { password_actual, password_nueva } = req.body;

        if (!password_actual || !password_nueva) {
            return res.status(400).json({
                success: false,
                error: 'Contraseña actual y nueva son requeridas'
            });
        }

        if (password_nueva.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'La nueva contraseña debe tener al menos 6 caracteres'
            });
        }

        const rows = await query(
            'SELECT password_hash FROM Usuarios_sistema WHERE id_usuario = ?',
            [req.user.id_usuario]
        );

        if (!rows.length) {
            return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
        }

        const valida = await bcrypt.compare(password_actual, rows[0].password_hash);
        if (!valida) {
            return res.status(401).json({ success: false, error: 'Contraseña actual incorrecta' });
        }

        const nuevoHash = await bcrypt.hash(password_nueva, 10);
        await query(
            'UPDATE Usuarios_sistema SET password_hash = ? WHERE id_usuario = ?',
            [nuevoHash, req.user.id_usuario]
        );

        res.json({ success: true, message: 'Contraseña actualizada correctamente' });

    } catch (error) {
        console.error('Error cambiando contraseña:', error);
        res.status(500).json({ success: false, error: 'Error al cambiar contraseña' });
    }
});

module.exports = router;