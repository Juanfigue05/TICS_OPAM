// ============================================================================
// ARCHIVO: 1_backend/routes/celular.js  — usa: models/Celular.js
// ============================================================================

const express  = require('express');
const router   = express.Router();
const Celular  = require('../models/Celular');
const Historial = require('../models/Historial');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/celulares
router.get('/', authenticateToken, async (req, res) => {
    try {
        const data = await Celular.getAll(req.query);
        res.json({ success: true, count: data.length, data });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error al obtener celulares' });
    }
});

// GET /api/celulares/stats
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const data = await Celular.getStats();
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error al obtener estadísticas' });
    }
});

// GET /api/celulares/:id
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const rows = await Celular.getById(req.params.id);
        if (!rows.length) return res.status(404).json({ success: false, error: 'Celular no encontrado' });
        const historial = await Historial.getByEquipo('Celular', req.params.id);
        res.json({ success: true, data: { ...rows[0], historial } });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error al obtener celular' });
    }
});

// POST /api/celulares
router.post('/', authenticateToken, requireRole(['technician', 'admin']), async (req, res) => {
    try {
        const { id_persona, id_ubicacion, ...datos } = req.body;
        const id_celular = await Celular.create(datos);

        if (id_persona && id_ubicacion) {
            await Celular.asignar(id_celular, id_persona, id_ubicacion);
            await Historial.registrar({ tipo_equipo: 'Celular', id_equipo: id_celular,
                tipo_accion: 'Asignacion', id_persona, id_ubicacion, realizado_por: req.user.username });
        }

        res.status(201).json({ success: true, message: 'Celular creado', data: { id_celular } });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error al crear celular: ' + e.message });
    }
});

// PUT /api/celulares/:id
router.put('/:id', authenticateToken, requireRole(['technician', 'admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { id_persona, id_ubicacion, desasignar, ...campos } = req.body;

        await Celular.update(id, campos);

        if (id_persona && id_ubicacion) {
            await Celular.asignar(id, id_persona, id_ubicacion);
            await Historial.registrar({ tipo_equipo: 'Celular', id_equipo: id,
                tipo_accion: 'Asignacion', id_persona, id_ubicacion, realizado_por: req.user.username });
        } else if (desasignar) {
            await Celular.desasignar(id);
            await Historial.registrar({ tipo_equipo: 'Celular', id_equipo: id,
                tipo_accion: 'Devolucion', realizado_por: req.user.username });
        }

        res.json({ success: true, message: 'Celular actualizado' });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error al actualizar celular' });
    }
});

// DELETE /api/celulares/:id
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        await Celular.darDeBaja(req.params.id);
        await Historial.registrar({ tipo_equipo: 'Celular', id_equipo: req.params.id,
            tipo_accion: 'Baja', realizado_por: req.user.username });
        res.json({ success: true, message: 'Celular dado de baja' });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error al dar de baja celular' });
    }
});

module.exports = router;