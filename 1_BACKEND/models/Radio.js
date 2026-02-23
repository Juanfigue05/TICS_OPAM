// ============================================================================
// ARCHIVO: 1_backend/models/Radio.js
// NOTA IMPORTANTE: Los radios permiten VARIOS asignados a UNA misma persona.
//                  Por eso asignar() NO desactiva las anteriores.
// ============================================================================

const { query } = require('../config/database');

const Radio = {

    async getAll({ estado, search } = {}) {
        let sql = `
            SELECT r.*,
                p.nombre AS nombre_usuario, p.cargo,
                u.Nombre_ubicacion, u.Area
            FROM Radios r
            LEFT JOIN Radios_persona rp ON r.id_radio = rp.id_radio AND rp.activo = true
            LEFT JOIN Personas p ON rp.id_persona = p.id_persona
            LEFT JOIN Ubicaciones u ON rp.id_ubicacion = u.id_ubicacion
            WHERE r.activo = true
        `;
        const params = [];
        if (estado) { sql += ' AND r.estado = ?'; params.push(estado); }
        if (search) {
            sql += ` AND (r.marca LIKE ? OR r.modelo LIKE ?
                         OR r.serial_radio LIKE ? OR r.tipo_radio LIKE ? OR p.nombre LIKE ?)`;
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
            LEFT JOIN Radios_persona rp ON r.id_radio = rp.id_radio AND rp.activo = true
            LEFT JOIN Personas p ON rp.id_persona = p.id_persona
            LEFT JOIN Ubicaciones u ON rp.id_ubicacion = u.id_ubicacion
            WHERE r.id_radio = ?`, [id]);
    },

    async getStats() {
        const [porEstado, porMarca, porBateria, porAntena] = await Promise.all([
            query('SELECT estado, COUNT(*) as total FROM Radios WHERE activo = true GROUP BY estado'),
            query('SELECT marca, COUNT(*) as total FROM Radios WHERE activo = true GROUP BY marca ORDER BY total DESC'),
            query('SELECT estado_bateria, COUNT(*) as total FROM Radios WHERE activo = true GROUP BY estado_bateria'),
            query('SELECT estado_antena, COUNT(*) as total FROM Radios WHERE activo = true GROUP BY estado_antena')
        ]);
        return { por_estado: porEstado, por_marca: porMarca, por_bateria: porBateria, por_antena: porAntena };
    },

    async create(datos) {
        const result = await query(`
            INSERT INTO Radios (
                tipo_radio, marca, modelo, serial_radio, frecuencia,
                antena, estado_antena, bateria, serial_bateria, estado_bateria,
                diadema_manos_libres, base_cargador, serial_cargador,
                estado, fecha_adquisicion, ultimo_mantenimiento, notas, activo
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,true)`,
            [datos.tipo_radio, datos.marca, datos.modelo, datos.serial_radio, datos.frecuencia,
             datos.antena !== undefined ? datos.antena : true,
             datos.estado_antena||'BUENO', datos.bateria, datos.serial_bateria,
             datos.estado_bateria||'BUENO', datos.diadema_manos_libres||false,
             datos.base_cargador||false, datos.serial_cargador,
             datos.estado||'Activo', datos.fecha_adquisicion, datos.ultimo_mantenimiento, datos.notas]
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

    // RADIOS: asignar SIN desactivar anteriores (varios radios por persona)
    async asignar(id_radio, id_persona, id_ubicacion) {
        return query(
            'INSERT INTO Radios_persona (id_radio, id_persona, id_ubicacion, activo) VALUES (?,?,?,true)',
            [id_radio, id_persona, id_ubicacion]
        );
    },

    // Desasignar este radio de su persona actual
    async desasignar(id_radio) {
        return query(
            'UPDATE Radios_persona SET activo = false, fecha_devolucion = CURDATE() WHERE id_radio = ? AND activo = true',
            [id_radio]
        );
    },

    async darDeBaja(id) {
        await query("UPDATE Radios SET estado = 'Dado de baja', activo = false WHERE id_radio = ?", [id]);
        await query('UPDATE Radios_persona SET activo = false WHERE id_radio = ?', [id]);
    }
};

module.exports = Radio;