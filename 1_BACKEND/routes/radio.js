// ============================================================================
// ARCHIVO: 1_backend/routes/radio.js  — usa: models/Radio.js
// NOTA: Radios permiten VARIOS por persona (no se desactivan al reasignar).
// ============================================================================

const express   = require('express');
const router    = express.Router();
const Radio     = require('../models/Radio');
const Historial = require('../models/Historial');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
    try {
        const data = await Radio.getAll(req.query);
        res.json({ success: true, count: data.length, data });
    } catch (e) { res.status(500).json({ success: false, error: 'Error al obtener radios' }); }
});

router.get('/stats', authenticateToken, async (req, res) => {
    try {
        res.json({ success: true, data: await Radio.getStats() });
    } catch (e) { res.status(500).json({ success: false, error: 'Error al obtener estadísticas' }); }
});

router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const rows = await Radio.getById(req.params.id);
        if (!rows.length) return res.status(404).json({ success: false, error: 'Radio no encontrado' });
        const historial = await Historial.getByEquipo('Radio', req.params.id);
        res.json({ success: true, data: { ...rows[0], historial } });
    } catch (e) { res.status(500).json({ success: false, error: 'Error al obtener radio' }); }
});

router.post('/', authenticateToken, requireRole(['technician', 'admin']), async (req, res) => {
    try {
        const { id_persona, id_ubicacion, ...datos } = req.body;
        const id_radio = await Radio.create(datos);
        if (id_persona && id_ubicacion) {
            await Radio.asignar(id_radio, id_persona, id_ubicacion); // SIN desactivar anteriores
            await Historial.registrar({ tipo_equipo: 'Radio', id_equipo: id_radio,
                tipo_accion: 'Asignacion', id_persona, id_ubicacion, realizado_por: req.user.username });
        }
        res.status(201).json({ success: true, message: 'Radio creado', data: { id_radio } });
    } catch (e) { res.status(500).json({ success: false, error: 'Error al crear radio: ' + e.message }); }
});

router.put('/:id', authenticateToken, requireRole(['technician', 'admin']), async (req, res) => {
    try {
        const { id_persona, id_ubicacion, desasignar, ...campos } = req.body;
        await Radio.update(req.params.id, campos);
        if (id_persona && id_ubicacion) {
            await Radio.asignar(req.params.id, id_persona, id_ubicacion);
            await Historial.registrar({ tipo_equipo: 'Radio', id_equipo: req.params.id,
                tipo_accion: 'Asignacion', id_persona, id_ubicacion, realizado_por: req.user.username });
        } else if (desasignar) {
            await Radio.desasignar(req.params.id);
            await Historial.registrar({ tipo_equipo: 'Radio', id_equipo: req.params.id,
                tipo_accion: 'Devolucion', realizado_por: req.user.username });
        }
        res.json({ success: true, message: 'Radio actualizado' });
    } catch (e) { res.status(500).json({ success: false, error: 'Error al actualizar radio' }); }
});

router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        await Radio.darDeBaja(req.params.id);
        await Historial.registrar({ tipo_equipo: 'Radio', id_equipo: req.params.id,
            tipo_accion: 'Baja', realizado_por: req.user.username });
        res.json({ success: true, message: 'Radio dado de baja' });
    } catch (e) { res.status(500).json({ success: false, error: 'Error al dar de baja radio' }); }
});

module.exports = router;