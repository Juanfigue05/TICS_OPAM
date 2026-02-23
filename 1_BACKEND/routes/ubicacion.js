// ============================================================================
// ARCHIVO: 1_backend/routes/ubicacion.js  — usa: models/Ubicacion.js
// ============================================================================

const express    = require('express');
const router     = express.Router();
const Ubicacion  = require('../models/Ubicacion');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
    try {
        const data = await Ubicacion.getAll(req.query);
        res.json({ success: true, count: data.length, data });
    } catch (e) { res.status(500).json({ success: false, error: 'Error al obtener ubicaciones' }); }
});

router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const rows = await Ubicacion.getById(req.params.id);
        if (!rows.length) return res.status(404).json({ success: false, error: 'Ubicación no encontrada' });
        const equipos = await Ubicacion.getEquipos(req.params.id);
        res.json({ success: true, data: { ...rows[0], equipos } });
    } catch (e) { res.status(500).json({ success: false, error: 'Error al obtener ubicación' }); }
});

router.post('/', authenticateToken, requireRole(['technician', 'admin']), async (req, res) => {
    try {
        if (!req.body.Nombre_ubicacion)
            return res.status(400).json({ success: false, error: 'El nombre es requerido' });
        const id_ubicacion = await Ubicacion.create(req.body);
        res.status(201).json({ success: true, message: 'Ubicación creada', data: { id_ubicacion } });
    } catch (e) { res.status(500).json({ success: false, error: 'Error al crear ubicación: ' + e.message }); }
});

router.put('/:id', authenticateToken, requireRole(['technician', 'admin']), async (req, res) => {
    try {
        const result = await Ubicacion.update(req.params.id, req.body);
        if (!result) return res.status(400).json({ success: false, error: 'Nada que actualizar' });
        res.json({ success: true, message: 'Ubicación actualizada' });
    } catch (e) { res.status(500).json({ success: false, error: 'Error al actualizar ubicación' }); }
});

router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        await Ubicacion.deactivate(req.params.id);
        res.json({ success: true, message: 'Ubicación desactivada' });
    } catch (e) { res.status(500).json({ success: false, error: 'Error al desactivar ubicación' }); }
});

module.exports = router;