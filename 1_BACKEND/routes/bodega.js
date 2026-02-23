// ============================================================================
// ARCHIVO: 1_backend/routes/bodega.js  — ADAPTADO A DB 3.1
// ============================================================================

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const Historial = require('../models/Historial');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Mapa actualizado con activo ENUM
const MODELO_MAP = {
    Computador:  { tabla: 'Computadores',      pk: 'id_computador',  rel: 'Computadores_persona' },
    Celular:     { tabla: 'Celulares',         pk: 'id_celular',     rel: 'Celulares_persona'    },
    Impresora:   { tabla: 'Impresoras',        pk: 'id_impresora',   rel: 'Impresoras_ubicacion' },
    Radio:       { tabla: 'Radios',            pk: 'id_radio',       rel: 'Radios_persona'       },
    Telefono_IP: { tabla: 'Telefonos_ip',      pk: 'id_telefono_ip', rel: 'Telefono_persona'     },
    Tablet:      { tabla: 'Tablets',           pk: 'id_tablet',      rel: 'Tablets_persona'      },
    Accesorio:   { tabla: 'Accesorios',        pk: 'id_accesorio',   rel: 'Accesorios_persona'   }
};

// GET /api/bodega  — stock en ALMACÉN
router.get('/', authenticateToken, async (req, res) => {
    try {
        const [comp, cel, imp, rad, tel, tab, acc] = await Promise.all([
            query("SELECT COUNT(*) as total, GROUP_CONCAT(DISTINCT marca_equipo) as marcas FROM Computadores WHERE activo = 'ALMACEN'"),
            query("SELECT COUNT(*) as total, GROUP_CONCAT(DISTINCT marca) as marcas FROM Celulares WHERE activo = 'ALMACEN'"),
            query("SELECT COUNT(*) as total, GROUP_CONCAT(DISTINCT marca) as marcas FROM Impresoras WHERE activo = 'ALMACEN'"),
            query("SELECT COUNT(*) as total, GROUP_CONCAT(DISTINCT marca) as marcas FROM Radios WHERE activo = 'ALMACEN'"),
            query("SELECT COUNT(*) as total, GROUP_CONCAT(DISTINCT marca) as marcas FROM Telefonos_ip WHERE activo = 'ALMACEN'"),
            query("SELECT COUNT(*) as total, GROUP_CONCAT(DISTINCT marca) as marcas FROM Tablets WHERE activo = 'ALMACEN'"),
            query("SELECT tipo_accesorio, COUNT(*) as total FROM Accesorios WHERE activo = 'ALMACEN' GROUP BY tipo_accesorio")
        ]);

        res.json({
            success: true,
            data: {
                computadores: { total: comp[0].total, marcas: comp[0].marcas },
                celulares:    { total: cel[0].total,  marcas: cel[0].marcas },
                impresoras:   { total: imp[0].total,  marcas: imp[0].marcas },
                radios:       { total: rad[0].total,  marcas: rad[0].marcas },
                telefonos_ip: { total: tel[0].total,  marcas: tel[0].marcas },
                tablets:      { total: tab[0].total,  marcas: tab[0].marcas },
                accesorios:   acc
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// GET /api/bodega/:tipo
router.get('/:tipo', authenticateToken, async (req, res) => {
    const map = {
        computadores: "SELECT id_computador as id, codigo_activo, nombre_equipo, marca_equipo as marca, modelo_equipo as modelo, serial_equipo as serial FROM Computadores WHERE activo='ALMACEN' ORDER BY marca_equipo",
        celulares:    "SELECT id_celular as id, nombre_celular, marca, modelo, serial_celular as serial FROM Celulares WHERE activo='ALMACEN' ORDER BY marca",
        impresoras:   "SELECT id_impresora as id, nombre_equipo, marca, modelo, serial FROM Impresoras WHERE activo='ALMACEN' ORDER BY marca",
        radios:       "SELECT id_radio as id, tipo_radio, marca, modelo, serial_radio as serial FROM Radios WHERE activo='ALMACEN' ORDER BY marca",
        telefonos:    "SELECT id_telefono_ip as id, marca, modelo, serial_telefono as serial, extension FROM Telefonos_ip WHERE activo='ALMACEN' ORDER BY marca",
        tablets:      "SELECT id_tablet as id, marca, modelo, serial_tablet as serial FROM Tablets WHERE activo='ALMACEN' ORDER BY marca",
        accesorios:   "SELECT id_accesorio as id, tipo_accesorio, marca, modelo, serial FROM Accesorios WHERE activo='ALMACEN' ORDER BY tipo_accesorio"
    };

    const sql = map[req.params.tipo];
    if (!sql) return res.status(400).json({ success: false, error: 'Tipo inválido' });

    const data = await query(sql);
    res.json({ success: true, count: data.length, data });
});

// POST /api/bodega/mover  → a ALMACÉN
router.post('/mover', authenticateToken, requireRole(['technician', 'admin']), async (req, res) => {
    const { tipo_equipo, id_equipo, razon } = req.body;
    const info = MODELO_MAP[tipo_equipo];
    if (!info) return res.status(400).json({ success: false, error: 'Tipo inválido' });

    await query(`UPDATE ${info.tabla} SET activo = 'ALMACEN' WHERE ${info.pk} = ?`, [id_equipo]);
    await query(`UPDATE ${info.rel} SET activo = 'DADO DE BAJA', fecha_devolucion = CURDATE() WHERE ${info.pk} = ? AND activo = 'ACTIVO'`, [id_equipo]);

    await Historial.registrar({
        tipo_equipo: tipo_equipo === 'Accesorio' ? 'ACCESORIO' : tipo_equipo.toUpperCase(),
        id_equipo,
        tipo_accion: 'Devolucion',
        razon: razon || 'Movido a bodega',
        id_usuario: req.user.id_usuario
    });

    res.json({ success: true, message: `${tipo_equipo} movido a ALMACÉN` });
});

// POST /api/bodega/asignar  → desde ALMACÉN
router.post('/asignar', authenticateToken, requireRole(['technician', 'admin']), async (req, res) => {
    const { tipo_equipo, id_equipo, id_persona, id_ubicacion } = req.body;
    const info = MODELO_MAP[tipo_equipo];
    if (!info) return res.status(400).json({ success: false, error: 'Tipo inválido' });

    await query(`UPDATE ${info.tabla} SET activo = 'ACTIVO' WHERE ${info.pk} = ?`, [id_equipo]);

    if (tipo_equipo === 'Impresora') {
        await query(`INSERT INTO ${info.rel} (id_impresora, id_ubicacion, activo) VALUES (?,?, 'ACTIVO')`, [id_equipo, id_ubicacion]);
    } else {
        if (!id_persona) return res.status(400).json({ success: false, error: 'id_persona requerido' });
        await query(`INSERT INTO ${info.rel} (${info.pk}, id_persona, id_ubicacion, activo) VALUES (?,?,?, 'ACTIVO')`, [id_equipo, id_persona, id_ubicacion]);
    }

    await Historial.registrar({
        tipo_equipo: tipo_equipo === 'Accesorio' ? 'ACCESORIO' : tipo_equipo.toUpperCase(),
        id_equipo,
        tipo_accion: 'Asignacion',
        id_persona: id_persona || null,
        id_ubicacion,
        id_usuario: req.user.id_usuario
    });

    res.json({ success: true, message: `${tipo_equipo} asignado desde bodega` });
});

module.exports = router;