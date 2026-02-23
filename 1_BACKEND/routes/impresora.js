// ============================================================================
// ARCHIVO: 1_backend/routes/impresora.js  — usa: models/Impresora.js
// ============================================================================

const express   = require('express');
const router    = express.Router();
const Impresora = require('../models/Impresora');
const Historial = require('../models/Historial');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
    try {
        const data = await Impresora.getAll(req.query);
        res.json({ success: true, count: data.length, data });
    } catch (e) { res.status(500).json({ success: false, error: 'Error al obtener impresoras' }); }
});

router.get('/stats', authenticateToken, async (req, res) => {
    try {
        res.json({ success: true, data: await Impresora.getStats() });
    } catch (e) { res.status(500).json({ success: false, error: 'Error al obtener estadísticas' }); }
});

router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const rows = await Impresora.getById(req.params.id);
        if (!rows.length) return res.status(404).json({ success: false, error: 'Impresora no encontrada' });
        const historial = await Historial.getByEquipo('Impresora', req.params.id);
        res.json({ success: true, data: { ...rows[0], historial } });
    } catch (e) { res.status(500).json({ success: false, error: 'Error al obtener impresora' }); }
});

router.post('/', authenticateToken, requireRole(['technician', 'admin']), async (req, res) => {
    try {
        const { id_ubicacion, ...datos } = req.body;
        const id_impresora = await Impresora.create(datos);
        if (id_ubicacion) {
            await Impresora.asignar(id_impresora, id_ubicacion);
            await Historial.registrar({ tipo_equipo: 'Impresora', id_equipo: id_impresora,
                tipo_accion: 'Asignacion', id_ubicacion, realizado_por: req.user.username });
        }
        res.status(201).json({ success: true, message: 'Impresora creada', data: { id_impresora } });
    } catch (e) { res.status(500).json({ success: false, error: 'Error al crear impresora: ' + e.message }); }
});

router.put('/:id', authenticateToken, requireRole(['technician', 'admin']), async (req, res) => {
    try {
        const { id_ubicacion, desasignar, ...campos } = req.body;
        await Impresora.update(req.params.id, campos);
        if (id_ubicacion) await Impresora.asignar(req.params.id, id_ubicacion);
        else if (desasignar) await Impresora.desasignar(req.params.id);
        res.json({ success: true, message: 'Impresora actualizada' });
    } catch (e) { res.status(500).json({ success: false, error: 'Error al actualizar impresora' }); }
});

router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        await Impresora.darDeBaja(req.params.id);
        await Historial.registrar({ tipo_equipo: 'Impresora', id_equipo: req.params.id,
            tipo_accion: 'Baja', realizado_por: req.user.username });
        res.json({ success: true, message: 'Impresora dada de baja' });
    } catch (e) { res.status(500).json({ success: false, error: 'Error al dar de baja impresora' }); }
});

module.exports = router;