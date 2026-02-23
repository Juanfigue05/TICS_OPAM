// ============================================================================
// ARCHIVO: 1_backend/models/Tablet.js
// ============================================================================

const { query } = require('../config/database');

const Tablet = {

    async getAll({ estado, search } = {}) {
        let sql = `
            SELECT t.*,
                p.nombre AS nombre_usuario, p.cargo,
                u.Nombre_ubicacion, u.Area
            FROM Tablets t
            LEFT JOIN Tablets_persona tp ON t.id_tablet = tp.id_tablet AND tp.activo = true
            LEFT JOIN Personas p ON tp.id_persona = p.id_persona
            LEFT JOIN Ubicaciones u ON tp.id_ubicacion = u.id_ubicacion
            WHERE t.activo = true
        `;
        const params = [];
        if (estado) { sql += ' AND t.estado = ?'; params.push(estado); }
        if (search) {
            sql += ` AND (t.marca LIKE ? OR t.modelo LIKE ?
                         OR t.serial_tablet LIKE ? OR t.imei LIKE ? OR p.nombre LIKE ?)`;
            const s = `%${search}%`;
            params.push(s, s, s, s, s);
        }
        sql += ' ORDER BY t.marca ASC';
        return query(sql, params);
    },

    async getById(id) {
        return query(`
            SELECT t.*, tp.fecha_asignacion,
                p.nombre AS nombre_usuario, p.cargo,
                u.Nombre_ubicacion
            FROM Tablets t
            LEFT JOIN Tablets_persona tp ON t.id_tablet = tp.id_tablet AND tp.activo = true
            LEFT JOIN Personas p ON tp.id_persona = p.id_persona
            LEFT JOIN Ubicaciones u ON tp.id_ubicacion = u.id_ubicacion
            WHERE t.id_tablet = ?`, [id]);
    },

    async getStats() {
        const [porEstado, porMarca, accesorios] = await Promise.all([
            query('SELECT estado, COUNT(*) as total FROM Tablets WHERE activo = true GROUP BY estado'),
            query('SELECT marca, COUNT(*) as total FROM Tablets WHERE activo = true GROUP BY marca ORDER BY total DESC'),
            query(`SELECT
                       SUM(cargador) AS con_cargador,
                       SUM(lapiz_tactil) AS con_lapiz,
                       SUM(estuche_protector) AS con_estuche,
                       SUM(caja_empaque) AS con_caja,
                       SUM(antena) AS con_antena,
                       SUM(pin_simcard) AS con_simcard
                   FROM Tablets WHERE activo = true`)
        ]);
        return { por_estado: porEstado, por_marca: porMarca, accesorios: accesorios[0] };
    },

    async create(datos) {
        const result = await query(`
            INSERT INTO Tablets (
                marca, modelo, serial_tablet,
                cargador, serial_cargador, serial_cable_usb,
                bandas_elasticas, lapiz_tactil, puntas_tactiles,
                caja_empaque, bocina_interna, cable_bocina,
                antena, tipo_bateria, imei,
                estuche_protector, pin_simcard,
                estado, fecha_adquisicion, notas, activo
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,true)`,
            [datos.marca, datos.modelo, datos.serial_tablet,
             datos.cargador !== undefined ? datos.cargador : true,
             datos.serial_cargador, datos.serial_cable_usb,
             datos.bandas_elasticas||0,
             datos.lapiz_tactil !== undefined ? datos.lapiz_tactil : true,
             datos.puntas_tactiles||0,
             datos.caja_empaque !== undefined ? datos.caja_empaque : true,
             datos.bocina_interna !== undefined ? datos.bocina_interna : true,
             datos.cable_bocina||false, datos.antena||false,
             datos.tipo_bateria, datos.imei,
             datos.estuche_protector !== undefined ? datos.estuche_protector : true,
             datos.pin_simcard !== undefined ? datos.pin_simcard : true,
             datos.estado||'Activo', datos.fecha_adquisicion, datos.notas]
        );
        return result.insertId;
    },

    async update(id, campos) {
        const allowed = [
            'marca','modelo','serial_tablet',
            'cargador','serial_cargador','serial_cable_usb',
            'bandas_elasticas','lapiz_tactil','puntas_tactiles',
            'caja_empaque','bocina_interna','cable_bocina',
            'antena','tipo_bateria','imei',
            'estuche_protector','pin_simcard',
            'estado','fecha_adquisicion','notas'
        ];
        const fields = [], values = [];
        for (const f of allowed) {
            if (campos[f] !== undefined) { fields.push(`${f} = ?`); values.push(campos[f]); }
        }
        if (!fields.length) return null;
        values.push(id);
        return query(`UPDATE Tablets SET ${fields.join(', ')} WHERE id_tablet = ?`, values);
    },

    async asignar(id_tablet, id_persona, id_ubicacion) {
        await query(
            'UPDATE Tablets_persona SET activo = false WHERE id_tablet = ? AND activo = true',
            [id_tablet]
        );
        return query(
            'INSERT INTO Tablets_persona (id_tablet, id_persona, id_ubicacion, activo) VALUES (?,?,?,true)',
            [id_tablet, id_persona, id_ubicacion]
        );
    },

    async desasignar(id_tablet) {
        return query(
            'UPDATE Tablets_persona SET activo = false, fecha_devolucion = CURDATE() WHERE id_tablet = ? AND activo = true',
            [id_tablet]
        );
    },

    async darDeBaja(id) {
        await query("UPDATE Tablets SET estado = 'Dado de baja', activo = false WHERE id_tablet = ?", [id]);
        await query('UPDATE Tablets_persona SET activo = false WHERE id_tablet = ?', [id]);
    }
};

module.exports = Tablet;