const { query } = require('../config/database');

const Radio = {

    async getAll({ estado, search } = {}) {
        let sql = `
            SELECT r.*,
                p.nombre AS nombre_usuario, p.cargo,
                u.Nombre_ubicacion, u.Area,
                rp.fecha_asignacion
            FROM Radios r
            LEFT JOIN Radios_persona rp ON r.id_radio = rp.id_radio AND rp.activo = 'ACTIVO'
            LEFT JOIN Personas p ON rp.id_persona = p.id_persona
            LEFT JOIN Ubicaciones u ON rp.id_ubicacion = u.id_ubicacion
            WHERE r.activo = 'ACTIVO'
        `;
        const params = [];
        if (estado) { sql += ' AND r.estado = ?'; params.push(estado); }
        if (search) {
            sql += ` AND (r.tipo_radio LIKE ? OR r.marca LIKE ? OR r.modelo LIKE ?
                         OR r.serial_radio LIKE ? OR p.nombre LIKE ?)`;
            const s = `%${search}%`;
            params.push(s, s, s, s, s);
        }
        sql += ' ORDER BY r.marca ASC';
        return query(sql, params);
    },

    async getById(id) {
        return query(`
            SELECT r.*, rp.fecha_asignacion,
                p.nombre AS nombre_usuario, p.cargo,
                u.Nombre_ubicacion
            FROM Radios r
            LEFT JOIN Radios_persona rp ON r.id_radio = rp.id_radio AND rp.activo = 'ACTIVO'
            LEFT JOIN Personas p ON rp.id_persona = p.id_persona
            LEFT JOIN Ubicaciones u ON rp.id_ubicacion = u.id_ubicacion
            WHERE r.id_radio = ?`, [id]);
    },

    async getStats() {
        const [porEstado, porMarca, porBateria, porAntena] = await Promise.all([
            query("SELECT estado, COUNT(*) as total FROM Radios WHERE activo = 'ACTIVO' GROUP BY estado"),
            query("SELECT marca, COUNT(*) as total FROM Radios WHERE activo = 'ACTIVO' GROUP BY marca ORDER BY total DESC LIMIT 5"),
            query("SELECT estado_bateria, COUNT(*) as total FROM Radios WHERE activo = 'ACTIVO' GROUP BY estado_bateria"),
            query("SELECT estado_antena, COUNT(*) as total FROM Radios WHERE activo = 'ACTIVO' GROUP BY estado_antena")
        ]);
        return { porEstado, porMarca, porBateria, porAntena };
    },

    async create(datos) {
        const result = await query(`
            INSERT INTO Radios (
                tipo_radio, marca, modelo, serial_radio, frecuencia,
                antena, estado_antena, bateria, serial_bateria, estado_bateria,
                diadema_manos_libres, base_cargador, serial_cargador,
                estado, fecha_adquisicion, ultimo_mantenimiento, notas
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
                datos.tipo_radio || null,
                datos.marca,
                datos.modelo,
                datos.serial_radio,
                datos.frecuencia || null,
                datos.antena !== undefined ? datos.antena : true,
                datos.estado_antena || 'BUENO',
                datos.bateria || null,
                datos.serial_bateria || null,
                datos.estado_bateria || 'BUENO',
                datos.diadema_manos_libres || false,
                datos.base_cargador || false,
                datos.serial_cargador || null,
                datos.estado || 'BUENO',
                datos.fecha_adquisicion || null,
                datos.ultimo_mantenimiento || null,
                datos.notas || null
            ]
        );
        return result.insertId;
    },

    async update(id, campos) {
        const allowed = [
            'tipo_radio','marca','modelo','serial_radio','frecuencia',
            'antena','estado_antena','bateria','serial_bateria','estado_bateria',
            'diadema_manos_libres','base_cargador','serial_cargador',
            'estado','fecha_adquisicion','ultimo_mantenimiento','notas'
        ];
        const fields = [], values = [];
        for (const f of allowed) {
            if (campos[f] !== undefined) { fields.push(`${f} = ?`); values.push(campos[f]); }
        }
        if (!fields.length) return null;
        values.push(id);
        return query(`UPDATE Radios SET ${fields.join(', ')} WHERE id_radio = ?`, values);
    },

    // IMPORTANTE: Radios permite múltiples asignaciones por persona → NO desactivamos anteriores
    async asignar(id_radio, id_persona, id_ubicacion) {
        return query(
            'INSERT INTO Radios_persona (id_radio, id_persona, id_ubicacion, activo) VALUES (?,?,?,?)',
            [id_radio, id_persona, id_ubicacion, 'ACTIVO']
        );
    },

    async desasignar(id_radio) {
        return query(
            "UPDATE Radios_persona SET activo = 'DADO DE BAJA', fecha_devolucion = CURDATE() WHERE id_radio = ? AND activo = 'ACTIVO'",
            [id_radio]
        );
    },

    async darDeBaja(id) {
        await query("UPDATE Radios SET activo = 'DADO DE BAJA' WHERE id_radio = ?", [id]);
        await query("UPDATE Radios_persona SET activo = 'DADO DE BAJA' WHERE id_radio = ?", [id]);
    }
};

module.exports = Radio;