const express = require('express');
const router = express.Router();
const Historial = require('../models/Historial');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
    try {
        const [data, total] = await Promise.all([
            Historial.getAll(req.query),
            Historial.countAll(req.query)
        ]);
        res.json({ success: true, count: data.length, total, data });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error al obtener historial' });
    }
});

router.get('/:tipo/:id', authenticateToken, async (req, res) => {
    try {
        const { tipo, id } = req.params;
        const tiposValidos = Historial.tiposValidos();
        if (!tiposValidos.includes(tipo.toUpperCase())) {
            return res.status(400).json({
                success: false,
                error: `Tipo inválido. Usa: ${tiposValidos.join(', ')}`
            });
        }

        const data = await Historial.getByEquipo(tipo.toUpperCase(), id);
        res.json({ success: true, count: data.length, data });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error al obtener historial del equipo' });
    }
});

router.post('/mantenimiento', authenticateToken, requireRole(['technician', 'admin']), async (req, res) => {
    try {
        const { tipo_equipo, id_equipo, valor_anterior, valor_nuevo, razon } = req.body;

        if (!tipo_equipo || !id_equipo) {
            return res.status(400).json({ success: false, error: 'tipo_equipo e id_equipo son requeridos' });
        }

        await Historial.registrar({
            tipo_equipo: tipo_equipo.toUpperCase(),
            id_equipo,
            tipo_accion: 'MANTENIMIENTO',
            valor_anterior,
            valor_nuevo,
            razon,
            id_usuario: req.user.id_usuario
        });

        await Historial.actualizarUltimoMantenimiento(tipo_equipo.toUpperCase(), id_equipo);

        res.status(201).json({ success: true, message: 'Mantenimiento registrado' });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error al registrar mantenimiento: ' + e.message });
    }
});

module.exports = router;