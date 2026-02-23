// ============================================================================
// ARCHIVO: 1_backend/routes/historial.js  — usa: models/Historial.js
// ============================================================================

const express   = require('express');
const router    = express.Router();
const Historial = require('../models/Historial');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/historial?tipo_equipo=&tipo_accion=&limit=&offset=
router.get('/', authenticateToken, async (req, res) => {
    try {
        const [data, total] = await Promise.all([
            Historial.getAll(req.query),
            Historial.countAll(req.query)
        ]);
        res.json({ success: true, count: data.length, total, data });
    } catch (e) { res.status(500).json({ success: false, error: 'Error al obtener historial' }); }
});

// GET /api/historial/:tipo/:id  — historial de un equipo específico
// Ejemplo: GET /api/historial/Computador/5
router.get('/:tipo/:id', authenticateToken, async (req, res) => {
    try {
        const { tipo, id } = req.params;
        if (!Historial.tiposValidos().includes(tipo))
            return res.status(400).json({ success: false,
                error: `Tipo inválido. Usa: ${Historial.tiposValidos().join(', ')}` });

        const data = await Historial.getByEquipo(tipo, id);
        res.json({ success: true, count: data.length, data });
    } catch (e) { res.status(500).json({ success: false, error: 'Error al obtener historial del equipo' }); }
});

// POST /api/historial/mantenimiento  — registrar mantenimiento manual
router.post('/mantenimiento', authenticateToken, requireRole(['technician', 'admin']), async (req, res) => {
    try {
        const { tipo_equipo, id_equipo, valor_anterior, valor_nuevo, razon } = req.body;

        if (!tipo_equipo || !id_equipo)
            return res.status(400).json({ success: false, error: 'tipo_equipo e id_equipo son requeridos' });

        if (!Historial.tiposValidos().includes(tipo_equipo))
            return res.status(400).json({ success: false, error: 'Tipo de equipo inválido' });

        await Historial.registrar({
            tipo_equipo, id_equipo, tipo_accion: 'Mantenimiento',
            valor_anterior, valor_nuevo, razon,
            realizado_por: req.user.username
        });

        await Historial.actualizarUltimoMantenimiento(tipo_equipo, id_equipo);

        res.status(201).json({ success: true, message: 'Mantenimiento registrado' });
    } catch (e) { res.status(500).json({ success: false, error: 'Error al registrar mantenimiento' }); }
});

module.exports = router;