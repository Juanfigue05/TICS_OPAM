const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const Historial = require('../models/Historial');
const { authenticateToken, requireRole } = require('../middleware/auth');

const MODELO_MAP = {
    COMPUTADOR:  { tabla: 'Computadores',      pk: 'id_computador',  rel: 'Computadores_persona' },
    CELULAR:     { tabla: 'Celulares',         pk: 'id_celular',     rel: 'Celulares_persona'    },
    IMPRESORA:   { tabla: 'Impresoras',        pk: 'id_impresora',   rel: 'Impresoras_ubicacion' },
    RADIO:       { tabla: 'Radios',            pk: 'id_radio',       rel: 'Radios_persona'       },
    TELEFONO_IP: { tabla: 'Telefonos_ip',      pk: 'id_telefono_ip', rel: 'Telefono_persona'     },
    TABLET:      { tabla: 'Tablets',           pk: 'id_tablet',      rel: 'Tablets_persona'      },
    ACCESORIO:   { tabla: 'Accesorios',        pk: 'id_accesorio',   rel: 'Accesorios_persona'   }
};

router.get('/', authenticateToken, async (req, res) => {
    try {
        const [comp, cel, imp, rad, tel, tab, acc] = await Promise.all([
            query("SELECT COUNT(*) as total, GROUP_CONCAT(DISTINCT marca_equipo) as marcas FROM Computadores WHERE activo = 'ALMACEN'"),
            query("SELECT COUNT(*) as total, GROUP_CONCAT(DISTINCT marca) as marcas FROM Celulares WHERE activo = 'ALMACEN'"),
            query("SELECT COUNT(*) as total, GROUP_CONCAT(DISTINCT marca) as marcas FROM Impresoras WHERE activo = 'ALMACEN'"),
            query("SELECT COUNT(*) as total, GROUP_CONCAT(DISTINCT marca) as marcas FROM Radios WHERE activo = 'ALMACEN'"),
            query("SELECT COUNT(*) as total, GROUP_CONCAT(DISTINCT marca) as marcas FROM Telefonos_ip WHERE activo = 'ALMACEN'"),
            query("SELECT COUNT(*) as total, GROUP_CONCAT(DISTINCT marca) as marcas FROM Tablets WHERE activo = 'ALMACEN'"),
            query("SELECT tipo_accesorio, COUNT(*) as total, GROUP_CONCAT(DISTINCT marca) as marcas FROM Accesorios WHERE activo = 'ALMACEN' GROUP BY tipo_accesorio")
        ]);

        res.json({
            success: true,
            data: {
                computadores: comp[0],
                celulares: cel[0],
                impresoras: imp[0],
                radios: rad[0],
                telefonos_ip: tel[0],
                tablets: tab[0],
                accesorios: acc
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.post('/asignar', authenticateToken, requireRole(['technician', 'admin']), async (req, res) => {
    try {
        const { tipo_equipo, id_equipo, id_persona, id_ubicacion } = req.body;

        if (!tipo_equipo || !id_equipo || !id_ubicacion) {
            return res.status(400).json({ success: false, error: 'tipo_equipo, id_equipo e id_ubicacion requeridos' });
        }

        const info = MODELO_MAP[tipo_equipo];
        if (!info) return res.status(400).json({ success: false, error: 'Tipo de equipo inválido' });

        await query(`UPDATE ${info.tabla} SET activo = 'ACTIVO' WHERE ${info.pk} = ?`, [id_equipo]);

        if (tipo_equipo === 'IMPRESORA') {
            await query(`INSERT INTO ${info.rel} (id_impresora, id_ubicacion, activo) VALUES (?,?,?)`,
                [id_equipo, id_ubicacion, 'ACTIVO']);
        } else {
            if (!id_persona) return res.status(400).json({ success: false, error: 'id_persona requerido para este tipo' });
            await query(`INSERT INTO ${info.rel} (${info.pk}, id_persona, id_ubicacion, activo) VALUES (?,?,?,?)`,
                [id_equipo, id_persona, id_ubicacion, 'ACTIVO']);
        }

        await Historial.registrar({
            tipo_equipo,
            id_equipo,
            tipo_accion: 'ASIGNACION',
            id_persona: id_persona || null,
            id_ubicacion,
            id_usuario: req.user.id_usuario
        });

        res.json({ success: true, message: `${tipo_equipo} asignado desde bodega` });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error al asignar desde bodega: ' + e.message });
    }
});

router.post('/devolver', authenticateToken, requireRole(['technician', 'admin']), async (req, res) => {
    try {
        const { tipo_equipo, id_equipo, razon } = req.body;

        if (!tipo_equipo || !id_equipo) {
            return res.status(400).json({ success: false, error: 'tipo_equipo e id_equipo requeridos' });
        }

        const info = MODELO_MAP[tipo_equipo];
        if (!info) return res.status(400).json({ success: false, error: 'Tipo de equipo inválido' });

        await query(`UPDATE ${info.tabla} SET activo = 'ALMACEN' WHERE ${info.pk} = ?`, [id_equipo]);
        await query(`UPDATE ${info.rel} SET activo = 'DADO DE BAJA', fecha_devolucion = CURDATE() WHERE ${info.pk} = ? AND activo = 'ACTIVO'`, [id_equipo]);

        await Historial.registrar({
            tipo_equipo,
            id_equipo,
            tipo_accion: 'DEVOLUCION',
            razon: razon || 'Devuelto a bodega',
            id_usuario: req.user.id_usuario
        });

        res.json({ success: true, message: `${tipo_equipo} devuelto a bodega` });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error al devolver a bodega: ' + e.message });
    }
});

module.exports = router;