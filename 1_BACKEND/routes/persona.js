// ============================================================================
// ARCHIVO: 1_backend/routes/persona.js
// DESCRIPCIÓN: CRUD de personas y creación de usuarios del sistema.
//
// CORRECCIÓN: Columna `rol` en Usuarios_sistema (no `rol_sistema`)
// ============================================================================

const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcrypt');
const Persona = require('../models/Persona');
const { query }                          = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Mapeo: rol de Personas → rol JWT (usado en Usuarios_sistema.rol)
// Personas.rol  →  ENUM('ADMINISTRADOR', 'TICS', 'VISITANTE')
// Usuarios.rol  →  ENUM('ADMINISTRADOR', 'TICS', 'VISITANTE')
// JWT payload   →  'admin' | 'technician' | 'viewer'
const ROL_PERSONA_TO_DB = {
    ADMINISTRADOR: 'ADMINISTRADOR',
    TICS:          'TICS',
    VISITANTE:     'VISITANTE',
};

// ─── GET /api/personas ───────────────────────────────────────────────────────
router.get('/', authenticateToken, async (req, res) => {
    try {
        const data = await Persona.getAll(req.query);
        res.json({ success: true, count: data.length, data });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error al obtener personas' });
    }
});

// ─── GET /api/personas/:id ───────────────────────────────────────────────────
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const rows = await Persona.getById(req.params.id);
        if (!rows.length) return res.status(404).json({ success: false, error: 'Persona no encontrada' });
        const equipos = await Persona.getEquipos(req.params.id);
        res.json({ success: true, data: { ...rows[0], equipos } });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error al obtener persona' });
    }
});

// ─── POST /api/personas ──────────────────────────────────────────────────────
router.post('/', authenticateToken, requireRole(['technician', 'admin']), async (req, res) => {
    try {
        const { crear_usuario, username, password, ...datos } = req.body;

        if (!datos.nombre)
            return res.status(400).json({ success: false, error: 'El nombre es requerido' });

        if (datos.correo_asignado && await Persona.existeCorreo(datos.correo_asignado))
            return res.status(409).json({ success: false, error: 'El correo ya está registrado' });

        const result   = await Persona.create(datos);
        const id_persona = result.insertId;
        let usuario_creado = null;

        // Crear usuario de login si lo solicita un admin
        if (crear_usuario && username && password && req.user.rol === 'admin') {
            const existe = await query('SELECT id_usuario FROM Usuarios_sistema WHERE username = ?', [username]);
            if (existe.length)
                return res.status(409).json({ success: false,
                    warning: 'Persona creada pero el username ya existe', id_persona });

            const hash   = await bcrypt.hash(password, 10);
            // ✅ Usar columna `rol` (no `rol_sistema`)
            const rolDB  = ROL_PERSONA_TO_DB[datos.rol] || 'VISITANTE';
            await query(
                'INSERT INTO Usuarios_sistema (username, password_hash, id_persona, rol, activo) VALUES (?,?,?,?,true)',
                [username, hash, id_persona, rolDB]
            );
            usuario_creado = { username, rol: rolDB };
        }

        res.status(201).json({ success: true, message: 'Persona creada',
            data: { id_persona, nombre: datos.nombre, usuario: usuario_creado } });
    } catch (e) {
        console.error('Error creando persona:', e);
        res.status(500).json({ success: false, error: 'Error al crear persona: ' + e.message });
    }
});

// ─── POST /api/personas/:id/usuario ─────────────────────────────────────────
// Crear acceso de login para una persona existente (solo admin)
router.post('/:id/usuario', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const { username, password, rol } = req.body;
        if (!username || !password)
            return res.status(400).json({ success: false, error: 'Username y password requeridos' });

        const rows = await Persona.getById(req.params.id);
        if (!rows.length) return res.status(404).json({ success: false, error: 'Persona no encontrada' });

        const yaExiste = await query('SELECT id_usuario FROM Usuarios_sistema WHERE id_persona = ?', [req.params.id]);
        if (yaExiste.length) return res.status(409).json({ success: false, error: 'Esta persona ya tiene usuario de login' });

        const taken = await query('SELECT id_usuario FROM Usuarios_sistema WHERE username = ?', [username]);
        if (taken.length) return res.status(409).json({ success: false, error: 'El username ya está en uso' });

        // ✅ Usar columna `rol` (no `rol_sistema`)
        const rolDB = ROL_PERSONA_TO_DB[rol || rows[0].rol] || 'VISITANTE';
        const hash  = await bcrypt.hash(password, 10);

        await query(
            'INSERT INTO Usuarios_sistema (username, password_hash, id_persona, rol, activo) VALUES (?,?,?,?,true)',
            [username, hash, req.params.id, rolDB]
        );

        res.status(201).json({ success: true, message: 'Usuario de login creado',
            data: { username, rol: rolDB, persona: rows[0].nombre } });
    } catch (e) {
        console.error('Error creando usuario:', e);
        res.status(500).json({ success: false, error: 'Error al crear usuario: ' + e.message });
    }
});

// ─── PUT /api/personas/:id ───────────────────────────────────────────────────
router.put('/:id', authenticateToken, requireRole(['technician', 'admin']), async (req, res) => {
    try {
        const result = await Persona.update(req.params.id, req.body);
        if (!result) return res.status(400).json({ success: false, error: 'Nada que actualizar' });
        res.json({ success: true, message: 'Persona actualizada' });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error al actualizar persona' });
    }
});

// ─── DELETE /api/personas/:id ────────────────────────────────────────────────
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        await Persona.deactivate(req.params.id);
        res.json({ success: true, message: 'Persona desactivada' });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error al desactivar persona' });
    }
});

module.exports = router;