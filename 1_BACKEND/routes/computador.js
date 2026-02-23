const express = require('express');
const router = express.Router();
const Computador = require('../models/Computador');
const Historial = require('../models/Historial');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
    try {
        const data = await Computador.getAll(req.query);
        res.json({ success: true, count: data.length, data });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error al obtener computadores' });
    }
});

router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const data = await Computador.getStats();
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error al obtener estadísticas' });
    }
});

router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const rows = await Computador.getById(req.params.id);
        if (!rows.length) return res.status(404).json({ success: false, error: 'Computador no encontrado' });
        const historial = await Historial.getByEquipo('COMPUTADOR', req.params.id);
        res.json({ success: true, data: { ...rows[0], historial } });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error al obtener computador' });
    }
});

router.post('/', authenticateToken, requireRole(['technician', 'admin']), async (req, res) => {
    try {
        const { id_persona, id_ubicacion, ...datos } = req.body;

        if (!datos.codigo_activo) {
            return res.status(400).json({ success: false, error: 'El código de activo es requerido' });
        }

        const id_computador = await Computador.create(datos);

        if (id_persona && id_ubicacion) {
            await Computador.asignar(id_computador, id_persona, id_ubicacion);
            await Historial.registrar({
                tipo_equipo: 'COMPUTADOR',
                id_equipo: id_computador,
                tipo_accion: 'ASIGNACION',
                id_persona,
                id_ubicacion,
                id_usuario: req.user.id_usuario
            });
        }

        res.status(201).json({
            success: true,
            message: 'Computador creado',
            data: { id_computador, codigo_activo: datos.codigo_activo }
        });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error al crear computador: ' + e.message });
    }
});

router.put('/:id', authenticateToken, requireRole(['technician', 'admin']), async (req, res) => {
    try {
        const { id_persona, id_ubicacion, desasignar, ...campos } = req.body;

        await Computador.update(req.params.id, campos);

        if (id_persona && id_ubicacion) {
            await Computador.asignar(req.params.id, id_persona, id_ubicacion);
            await Historial.registrar({
                tipo_equipo: 'COMPUTADOR',
                id_equipo: req.params.id,
                tipo_accion: 'ASIGNACION',
                id_persona,
                id_ubicacion,
                id_usuario: req.user.id_usuario
            });
        } else if (desasignar) {
            await Computador.desasignar(req.params.id);
            await Historial.registrar({
                tipo_equipo: 'COMPUTADOR',
                id_equipo: req.params.id,
                tipo_accion: 'DEVOLUCION',
                id_usuario: req.user.id_usuario
            });
        }

        res.json({ success: true, message: 'Computador actualizado' });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error al actualizar computador: ' + e.message });
    }
});

router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        await Computador.darDeBaja(req.params.id);
        await Historial.registrar({
            tipo_equipo: 'COMPUTADOR',
            id_equipo: req.params.id,
            tipo_accion: 'DADO DE BAJA',
            id_usuario: req.user.id_usuario
        });
        res.json({ success: true, message: 'Computador dado de baja' });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error al dar de baja computador: ' + e.message });
    }
});

module.exports = router;