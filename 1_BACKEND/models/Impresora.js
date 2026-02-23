const { query } = require('../config/database');

const Impresora = {

    async getAll({ estado, search } = {}) {
        let sql = `
            SELECT i.*,
                u.Nombre_ubicacion, u.Area,
                iu.fecha_instalacion
            FROM Impresoras i
            LEFT JOIN Impresoras_ubicacion iu ON i.id_impresora = iu.id_impresora AND iu.activo = 'ACTIVO'
            LEFT JOIN Ubicaciones u ON iu.id_ubicacion = u.id_ubicacion
            WHERE i.activo = 'ACTIVO'
        `;
        const params = [];
        if (estado) { sql += ' AND i.estado = ?'; params.push(estado); }
        if (search) {
            sql += ` AND (i.nombre_equipo LIKE ? OR i.marca LIKE ? OR i.modelo LIKE ?
                         OR i.serial LIKE ? OR i.ip_impresora LIKE ?)`;
            const s = `%${search}%`;
            params.push(s, s, s, s, s);
        }
        sql += ' ORDER BY i.nombre_equipo ASC';
        return query(sql, params);
    },

    async getById(id) {
        return query(`
            SELECT i.*, iu.fecha_instalacion,
                u.id_ubicacion, u.Nombre_ubicacion, u.Area
            FROM Impresoras i
            LEFT JOIN Impresoras_ubicacion iu ON i.id_impresora = iu.id_impresora AND iu.activo = 'ACTIVO'
            LEFT JOIN Ubicaciones u ON iu.id_ubicacion = u.id_ubicacion
            WHERE i.id_impresora = ?`, [id]);
    },

    async getStats() {
        const [porEstado, porTipo, porMarca] = await Promise.all([
            query("SELECT estado, COUNT(*) as total FROM Impresoras WHERE activo = 'ACTIVO' GROUP BY estado"),
            query("SELECT tipo_impresora, COUNT(*) as total FROM Impresoras WHERE activo = 'ACTIVO' GROUP BY tipo_impresora"),
            query("SELECT marca, COUNT(*) as total FROM Impresoras WHERE activo = 'ACTIVO' GROUP BY marca ORDER BY total DESC LIMIT 5")
        ]);
        return { porEstado, porTipo, porMarca };
    },

    async create(datos) {
        const result = await query(`
            INSERT INTO Impresoras (
                nombre_equipo, marca, modelo, serial,
                tipo_impresora, tipo_red, ip_impresora, mac_ethernet, mac_wifi,
                impresion_color, tiene_escaner, tiene_fax, impresion_duplex, tamano_papel_max,
                estado, fecha_adquisicion, ultimo_mantenimiento, notas
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
                datos.nombre_equipo || null,
                datos.marca,
                datos.modelo,
                datos.serial,
                datos.tipo_impresora || 'LASER',
                datos.tipo_red || 'ETHERNET',
                datos.ip_impresora || null,
                datos.mac_ethernet || null,
                datos.mac_wifi || null,
                datos.impresion_color || false,
                datos.tiene_escaner || false,
                datos.tiene_fax || false,
                datos.impresion_duplex || false,
                datos.tamano_papel_max || 'A4',
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
            'nombre_equipo','marca','modelo','serial','tipo_impresora','tipo_red',
            'ip_impresora','mac_ethernet','mac_wifi',
            'impresion_color','tiene_escaner','tiene_fax','impresion_duplex','tamano_papel_max',
            'estado','fecha_adquisicion','ultimo_mantenimiento','notas'
        ];
        const fields = [], values = [];
        for (const f of allowed) {
            if (campos[f] !== undefined) { fields.push(`${f} = ?`); values.push(campos[f]); }
        }
        if (!fields.length) return null;
        values.push(id);
        return query(`UPDATE Impresoras SET ${fields.join(', ')} WHERE id_impresora = ?`, values);
    },

    async asignar(id_impresora, id_ubicacion) {
        await query(
            "UPDATE Impresoras_ubicacion SET activo = 'DADO DE BAJA' WHERE id_impresora = ? AND activo = 'ACTIVO'",
            [id_impresora]
        );
        return query(
            'INSERT INTO Impresoras_ubicacion (id_impresora, id_ubicacion, activo) VALUES (?,?,?)',
            [id_impresora, id_ubicacion, 'ACTIVO']
        );
    },

    async desasignar(id_impresora) {
        return query(
            "UPDATE Impresoras_ubicacion SET activo = 'DADO DE BAJA' WHERE id_impresora = ? AND activo = 'ACTIVO'",
            [id_impresora]
        );
    },

    async darDeBaja(id) {
        await query("UPDATE Impresoras SET activo = 'DADO DE BAJA' WHERE id_impresora = ?", [id]);
        await query("UPDATE Impresoras_ubicacion SET activo = 'DADO DE BAJA' WHERE id_impresora = ?", [id]);
    }
};

module.exports = Impresora;