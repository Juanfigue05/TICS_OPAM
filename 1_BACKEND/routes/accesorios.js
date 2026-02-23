// ============================================================================
// ARCHIVO: 1_backend/routes/accesorio.js  — usa: models/Accesorios.js
// ============================================================================

const express    = require('express');
const router     = express.Router();
const Accesorios  = require('../models/Accesorios');
const Historial  = require('../models/Historial');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
    try {
        const data = await Accesorios.getAll(req.query);
        res.json({ success: true, count: data.length, data });
    } catch (e) { res.status(500).json({ success: false, error: 'Error al obtener accesorios' }); }
});

router.get('/tipos', authenticateToken, async (req, res) => {
    try {
        res.json({ success: true, data: await Accesorios.getTipos() });
    } catch (e) { res.status(500).json({ success: false, error: 'Error al obtener tipos' }); }
});

router.get('/stats', authenticateToken, async (req, res) => {
    try {
        res.json({ success: true, data: await Accesorios.getStats() });
    } catch (e) { res.status(500).json({ success: false, error: 'Error al obtener estadísticas' }); }
});

router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const rows = await Accesorios.getById(req.params.id);
        if (!rows.length) return res.status(404).json({ success: false, error: 'Accesorios no encontrado' });
        res.json({ success: true, data: rows[0] });
    } catch (e) { res.status(500).json({ success: false, error: 'Error al obtener accesorio' }); }
});

router.post('/', authenticateToken, requireRole(['technician', 'admin']), async (req, res) => {
    try {
        const { id_persona, id_ubicacion, ...datos } = req.body;
        if (!datos.tipo_accesorio)
            return res.status(400).json({ success: false, error: 'El tipo de accesorio es requerido' });

        const id_accesorio = await Accesorios.create(datos);

        if (id_persona && id_ubicacion) {
            await Accesorios.asignar(id_accesorio, id_persona, id_ubicacion);
        }

        res.status(201).json({ success: true, message: 'Accesorios creado',
            data: { id_accesorio, tipo_accesorio: datos.tipo_accesorio } });
    } catch (e) { res.status(500).json({ success: false, error: 'Error al crear accesorio: ' + e.message }); }
});

router.put('/:id', authenticateToken, requireRole(['technician', 'admin']), async (req, res) => {
    try {
        const { id_persona, id_ubicacion, desasignar, ...campos } = req.body;
        await Accesorios.update(req.params.id, campos);
        if (id_persona && id_ubicacion) {
            await Accesorios.asignar(req.params.id, id_persona, id_ubicacion);
        } else if (desasignar) {
            await Accesorios.desasignar(req.params.id);
        }
        res.json({ success: true, message: 'Accesorios actualizado' });
    } catch (e) { res.status(500).json({ success: false, error: 'Error al actualizar accesorio' }); }
});

router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        await Accesorios.darDeBaja(req.params.id);
        res.json({ success: true, message: 'Accesorios dado de baja' });
    } catch (e) { res.status(500).json({ success: false, error: 'Error al dar de baja accesorio' }); }
});

module.exports = router;