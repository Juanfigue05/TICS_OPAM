const express = require('express');
const router = express.Router();
const Accesorios = require('../models/Accesorios');
const Historial = require('../models/Historial');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
    try {
        const data = await Accesorios.getAll(req.query);
        res.json({ success: true, count: data.length, data });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error al obtener accesorios' });
    }
});

router.get('/tipos', authenticateToken, async (req, res) => {
    try {
        const tipos = await Accesorios.getTipos();
        res.json({ success: true, data: tipos });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error al obtener tipos de accesorios' });
    }
});

router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const data = await Accesorios.getStats();
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error al obtener estadísticas' });
    }
});

router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const rows = await Accesorios.getById(req.params.id);
        if (!rows.length) return res.status(404).json({ success: false, error: 'Accesorio no encontrado' });
        const historial = await Historial.getByEquipo('ACCESORIO', req.params.id);
        res.json({ success: true, data: { ...rows[0], historial } });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error al obtener accesorio' });
    }
});

router.post('/', authenticateToken, requireRole(['technician', 'admin']), async (req, res) => {
    try {
        const { id_persona, id_ubicacion, ...datos } = req.body;

        if (!datos.tipo_accesorio) {
            return res.status(400).json({ success: false, error: 'El tipo de accesorio es requerido' });
        }

        const id_accesorio = await Accesorios.create(datos);

        if (id_persona && id_ubicacion) {
            await Accesorios.asignar(id_accesorio, id_persona, id_ubicacion);
            await Historial.registrar({
                tipo_equipo: 'ACCESORIO',
                id_equipo: id_accesorio,
                tipo_accion: 'ASIGNACION',
                id_persona,
                id_ubicacion,
                id_usuario: req.user.id_usuario
            });
        }

        res.status(201).json({
            success: true,
            message: 'Accesorio creado',
            data: { id_accesorio, tipo_accesorio: datos.tipo_accesorio }
        });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error al crear accesorio: ' + e.message });
    }
});

router.put('/:id', authenticateToken, requireRole(['technician', 'admin']), async (req, res) => {
    try {
        const { id_persona, id_ubicacion, desasignar, ...campos } = req.body;

        await Accesorios.update(req.params.id, campos);

        if (id_persona && id_ubicacion) {
            await Accesorios.asignar(req.params.id, id_persona, id_ubicacion);
            await Historial.registrar({
                tipo_equipo: 'ACCESORIO',
                id_equipo: req.params.id,
                tipo_accion: 'ASIGNACION',
                id_persona,
                id_ubicacion,
                id_usuario: req.user.id_usuario
            });
        } else if (desasignar) {
            await Accesorios.desasignar(req.params.id);
            await Historial.registrar({
                tipo_equipo: 'ACCESORIO',
                id_equipo: req.params.id,
                tipo_accion: 'DEVOLUCION',
                id_usuario: req.user.id_usuario
            });
        }

        res.json({ success: true, message: 'Accesorio actualizado' });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error al actualizar accesorio: ' + e.message });
    }
});

router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        await Accesorios.darDeBaja(req.params.id);
        await Historial.registrar({
            tipo_equipo: 'ACCESORIO',
            id_equipo: req.params.id,
            tipo_accion: 'DADO DE BAJA',
            id_usuario: req.user.id_usuario
        });
        res.json({ success: true, message: 'Accesorio dado de baja' });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error al dar de baja accesorio: ' + e.message });
    }
});

module.exports = router;