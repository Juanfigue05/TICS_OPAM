// ============================================================================
// ARCHIVO: 1_backend/routes/telefono_ip.js  — usa: models/Telefono_ip.js
// ============================================================================

const express    = require('express');
const router     = express.Router();
const Telefono_ip = require('../models/Telefono_ip');
const Historial  = require('../models/Historial');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
    try {
        const data = await Telefono_ip.getAll(req.query);
        res.json({ success: true, count: data.length, data });
    } catch (e) { res.status(500).json({ success: false, error: 'Error al obtener teléfonos IP' }); }
});

router.get('/stats', authenticateToken, async (req, res) => {
    try {
        res.json({ success: true, data: await Telefono_ip.getStats() });
    } catch (e) { res.status(500).json({ success: false, error: 'Error al obtener estadísticas' }); }
});

router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const rows = await Telefono_ip.getById(req.params.id);
        if (!rows.length) return res.status(404).json({ success: false, error: 'Teléfono IP no encontrado' });
        const historial = await Historial.getByEquipo('Telefono_IP', req.params.id);
        res.json({ success: true, data: { ...rows[0], historial } });
    } catch (e) { res.status(500).json({ success: false, error: 'Error al obtener teléfono IP' }); }
});

router.post('/', authenticateToken, requireRole(['technician', 'admin']), async (req, res) => {
    try {
        const { id_persona, id_ubicacion, ...datos } = req.body;
        const id_telefono_ip = await Telefono_ip.create(datos);
        if (id_persona && id_ubicacion) {
            await Telefono_ip.asignar(id_telefono_ip, id_persona, id_ubicacion);
            await Historial.registrar({ tipo_equipo: 'Telefono_IP', id_equipo: id_telefono_ip,
                tipo_accion: 'Asignacion', id_persona, id_ubicacion, realizado_por: req.user.username });
        }
        res.status(201).json({ success: true, message: 'Teléfono IP creado', data: { id_telefono_ip } });
    } catch (e) { res.status(500).json({ success: false, error: 'Error al crear teléfono IP: ' + e.message }); }
});

router.put('/:id', authenticateToken, requireRole(['technician', 'admin']), async (req, res) => {
    try {
        const { id_persona, id_ubicacion, desasignar, ...campos } = req.body;
        await Telefono_ip.update(req.params.id, campos);
        if (id_persona && id_ubicacion) {
            await Telefono_ip.asignar(req.params.id, id_persona, id_ubicacion);
            await Historial.registrar({ tipo_equipo: 'Telefono_IP', id_equipo: req.params.id,
                tipo_accion: 'Asignacion', id_persona, id_ubicacion, realizado_por: req.user.username });
        } else if (desasignar) {
            await Telefono_ip.desasignar(req.params.id);
            await Historial.registrar({ tipo_equipo: 'Telefono_IP', id_equipo: req.params.id,
                tipo_accion: 'Devolucion', realizado_por: req.user.username });
        }
        res.json({ success: true, message: 'Teléfono IP actualizado' });
    } catch (e) { res.status(500).json({ success: false, error: 'Error al actualizar teléfono IP' }); }
});

router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        await Telefono_ip.darDeBaja(req.params.id);
        await Historial.registrar({ tipo_equipo: 'Telefono_IP', id_equipo: req.params.id,
            tipo_accion: 'Baja', realizado_por: req.user.username });
        res.json({ success: true, message: 'Teléfono IP dado de baja' });
    } catch (e) { res.status(500).json({ success: false, error: 'Error al dar de baja teléfono IP' }); }
});

module.exports = router;