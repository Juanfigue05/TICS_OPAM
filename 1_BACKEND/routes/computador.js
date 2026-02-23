// ============================================================================
// ARCHIVO: 1_backend/routes/computador.js  — usa: models/Computador.js
// ============================================================================

const express    = require('express');
const router     = express.Router();
const Computador = require('../models/Computador');
const Historial  = require('../models/Historial');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/computadores
router.get('/', authenticateToken, async (req, res) => {
    try {
        const data = await Computador.getAll(req.query);
        res.json({ success: true, count: data.length, data });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error al obtener computadores' });
    }
});

// GET /api/computadores/stats
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const data = await Computador.getStats();
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error al obtener estadísticas' });
    }
});

// GET /api/computadores/:id
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const rows = await Computador.getById(req.params.id);
        if (!rows.length) return res.status(404).json({ success: false, error: 'Computador no encontrado' });
        const historial = await Historial.getByEquipo('Computador', req.params.id);
        res.json({ success: true, data: { ...rows[0], historial } });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error al obtener computador' });
    }
});

// POST /api/computadores
router.post('/', authenticateToken, requireRole(['technician', 'admin']), async (req, res) => {
    try {
        const { id_persona, id_ubicacion, ...datos } = req.body;

        if (!datos.codigo_activo)
            return res.status(400).json({ success: false, error: 'El código de activo es requerido' });
        if (await Computador.existeCodigo(datos.codigo_activo))
            return res.status(409).json({ success: false, error: 'El código de activo ya existe' });

        const id_computador = await Computador.create(datos);

        if (id_persona && id_ubicacion) {
            await Computador.asignar(id_computador, id_persona, id_ubicacion);
            await Historial.registrar({ tipo_equipo: 'Computador', id_equipo: id_computador,
                tipo_accion: 'Asignacion', id_persona, id_ubicacion, realizado_por: req.user.username });
        }

        res.status(201).json({ success: true, message: 'Computador creado',
            data: { id_computador, codigo_activo: datos.codigo_activo } });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error al crear computador: ' + e.message });
    }
});

// PUT /api/computadores/:id
router.put('/:id', authenticateToken, requireRole(['technician', 'admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { id_persona, id_ubicacion, desasignar, ...campos } = req.body;

        await Computador.update(id, campos);

        if (id_persona && id_ubicacion) {
            await Computador.asignar(id, id_persona, id_ubicacion);
            await Historial.registrar({ tipo_equipo: 'Computador', id_equipo: id,
                tipo_accion: 'Asignacion', id_persona, id_ubicacion, realizado_por: req.user.username });
        } else if (desasignar) {
            await Computador.desasignar(id);
            await Historial.registrar({ tipo_equipo: 'Computador', id_equipo: id,
                tipo_accion: 'Devolucion', realizado_por: req.user.username });
        }

        res.json({ success: true, message: 'Computador actualizado' });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error al actualizar computador' });
    }
});

// DELETE /api/computadores/:id
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        await Computador.darDeBaja(req.params.id);
        await Historial.registrar({ tipo_equipo: 'Computador', id_equipo: req.params.id,
            tipo_accion: 'Baja', realizado_por: req.user.username });
        res.json({ success: true, message: 'Computador dado de baja' });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error al dar de baja computador' });
    }
});

module.exports = router;