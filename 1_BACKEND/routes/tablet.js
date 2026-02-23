// ============================================================================
// ARCHIVO: 1_backend/routes/tablet.js  — usa: models/Tablet.js
// ============================================================================

const express   = require('express');
const router    = express.Router();
const Tablet    = require('../models/Tablet');
const Historial = require('../models/Historial');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
    try {
        const data = await Tablet.getAll(req.query);
        res.json({ success: true, count: data.length, data });
    } catch (e) { res.status(500).json({ success: false, error: 'Error al obtener tablets' }); }
});

router.get('/stats', authenticateToken, async (req, res) => {
    try {
        res.json({ success: true, data: await Tablet.getStats() });
    } catch (e) { res.status(500).json({ success: false, error: 'Error al obtener estadísticas' }); }
});

router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const rows = await Tablet.getById(req.params.id);
        if (!rows.length) return res.status(404).json({ success: false, error: 'Tablet no encontrada' });
        const historial = await Historial.getByEquipo('Tablet', req.params.id);
        res.json({ success: true, data: { ...rows[0], historial } });
    } catch (e) { res.status(500).json({ success: false, error: 'Error al obtener tablet' }); }
});

router.post('/', authenticateToken, requireRole(['technician', 'admin']), async (req, res) => {
    try {
        const { id_persona, id_ubicacion, ...datos } = req.body;
        const id_tablet = await Tablet.create(datos);
        if (id_persona && id_ubicacion) {
            await Tablet.asignar(id_tablet, id_persona, id_ubicacion);
            await Historial.registrar({ tipo_equipo: 'Tablet', id_equipo: id_tablet,
                tipo_accion: 'Asignacion', id_persona, id_ubicacion, realizado_por: req.user.username });
        }
        res.status(201).json({ success: true, message: 'Tablet creada', data: { id_tablet } });
    } catch (e) { res.status(500).json({ success: false, error: 'Error al crear tablet: ' + e.message }); }
});

router.put('/:id', authenticateToken, requireRole(['technician', 'admin']), async (req, res) => {
    try {
        const { id_persona, id_ubicacion, desasignar, ...campos } = req.body;
        await Tablet.update(req.params.id, campos);
        if (id_persona && id_ubicacion) {
            await Tablet.asignar(req.params.id, id_persona, id_ubicacion);
            await Historial.registrar({ tipo_equipo: 'Tablet', id_equipo: req.params.id,
                tipo_accion: 'Asignacion', id_persona, id_ubicacion, realizado_por: req.user.username });
        } else if (desasignar) {
            await Tablet.desasignar(req.params.id);
            await Historial.registrar({ tipo_equipo: 'Tablet', id_equipo: req.params.id,
                tipo_accion: 'Devolucion', realizado_por: req.user.username });
        }
        res.json({ success: true, message: 'Tablet actualizada' });
    } catch (e) { res.status(500).json({ success: false, error: 'Error al actualizar tablet' }); }
});

router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        await Tablet.darDeBaja(req.params.id);
        await Historial.registrar({ tipo_equipo: 'Tablet', id_equipo: req.params.id,
            tipo_accion: 'Baja', realizado_por: req.user.username });
        res.json({ success: true, message: 'Tablet dada de baja' });
    } catch (e) { res.status(500).json({ success: false, error: 'Error al dar de baja tablet' }); }
});

module.exports = router;