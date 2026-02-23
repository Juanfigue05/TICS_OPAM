const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const Persona = require('../models/Persona');
const { query } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
    try {
        const filtros = { ...req.query };

        // Solo ADMINISTRADOR puede ver personas inactivas.
        // Para cualquier otro rol se fuerza activo=true.
        if (req.user.rol !== 'admin') {
            filtros.activo = 'true';
        } else if (filtros.activo === undefined) {
            // Admin sin filtro explícito → ver todos (activos e inactivos)
            filtros.activo = 'all';
        }

        const data = await Persona.getAll(filtros);
        res.json({ success: true, count: data.length, data });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error al obtener personas' });
    }
});

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

router.get('/activas', async (req, res) => {
    try {
        const cantidad = await Persona.getPersonasActivas();
        res.json({ success: true, data: { personas_activas: cantidad } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/', authenticateToken, requireRole(['technician', 'admin']), async (req, res) => {
    try {
        const { nombre, correo_asignado, cargo, rol, celular, extension, area } = req.body;

        if (!nombre) {
            return res.status(400).json({ success: false, error: 'El nombre es requerido' });
        }

        const id_persona = await Persona.create({ nombre, correo_asignado, cargo, rol, celular, extension, area });

        res.status(201).json({
            success: true,
            message: 'Persona creada',
            data: { id_persona }
        });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error al crear persona: ' + e.message });
    }
});

router.put('/:id', authenticateToken, requireRole(['technician', 'admin']), async (req, res) => {
    try {
        const result = await Persona.update(req.params.id, req.body);
        if (!result) return res.status(400).json({ success: false, error: 'Nada que actualizar' });
        res.json({ success: true, message: 'Persona actualizada' });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error al actualizar persona: ' + e.message });
    }
});

router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        await Persona.deactivate(req.params.id);
        res.json({ success: true, message: 'Persona desactivada' });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error al desactivar persona: ' + e.message });
    }
});

// Crear usuario de sistema para esta persona
router.post('/:id/usuario', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const { username, password, rol } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'Username y password requeridos' });
        }

        const personaRows = await Persona.getById(req.params.id);
        if (!personaRows.length) return res.status(404).json({ success: false, error: 'Persona no encontrada' });

        const yaExiste = await query('SELECT id_usuario FROM Usuarios_sistema WHERE id_persona = ?', [req.params.id]);
        if (yaExiste.length) return res.status(409).json({ success: false, error: 'Esta persona ya tiene usuario de login' });

        const taken = await query('SELECT id_usuario FROM Usuarios_sistema WHERE username = ?', [username]);
        if (taken.length) return res.status(409).json({ success: false, error: 'El username ya está en uso' });

        const hash = await bcrypt.hash(password, 10);
        const rolDB = rol || personaRows[0].rol || 'VISITANTE';

        await query(
            'INSERT INTO Usuarios_sistema (username, password_hash, id_persona, rol, activo) VALUES (?,?,?,?,true)',
            [username, hash, req.params.id, rolDB]
        );

        res.status(201).json({
            success: true,
            message: 'Usuario de login creado',
            data: { username, rol: rolDB }
        });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error al crear usuario: ' + e.message });
    }
});

module.exports = router;