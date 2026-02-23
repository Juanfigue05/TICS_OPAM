// ============================================================================
// ARCHIVO: 1_backend/models/Impresora.js
// NOTA: Las impresoras se asignan a UBICACIONES, no a personas.
// ============================================================================

const { query } = require('../config/database');

const Impresora = {

    async getAll({ estado, search } = {}) {
        let sql = `
            SELECT i.*,
                u.Nombre_ubicacion, u.Area
            FROM Impresoras i
            LEFT JOIN Impresoras_ubicacion iu ON i.id_impresora = iu.id_impresora AND iu.activo = true
            LEFT JOIN Ubicaciones u ON iu.id_ubicacion = u.id_ubicacion
            WHERE i.activo = 'ACTIVO'
        `;
        const params = [];
        if (estado) { sql += ' AND i.estado = ?'; params.push(estado); }
        if (search) {
            sql += ` AND (i.nombre_equipo LIKE ? OR i.marca LIKE ?
                         OR i.modelo LIKE ? OR i.serial LIKE ? OR i.ip_impresora LIKE ?)`;
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
            LEFT JOIN Impresoras_ubicacion iu ON i.id_impresora = iu.id_impresora AND iu.activo = true
            LEFT JOIN Ubicaciones u ON iu.id_ubicacion = u.id_ubicacion
            WHERE i.id_impresora = ?`, [id]);
    },

    async getStats() {
        const [porEstado, porTipo, porMarca, porRed] = await Promise.all([
            query('SELECT estado, COUNT(*) as total FROM Impresoras WHERE activo = true GROUP BY estado'),
            query('SELECT tipo_impresora, COUNT(*) as total FROM Impresoras WHERE activo = true GROUP BY tipo_impresora'),
            query('SELECT marca, COUNT(*) as total FROM Impresoras WHERE activo = true GROUP BY marca ORDER BY total DESC'),
            query('SELECT tipo_red, COUNT(*) as total FROM Impresoras WHERE activo = true GROUP BY tipo_red')
        ]);
        return { por_estado: porEstado, por_tipo: porTipo, por_marca: porMarca, por_red: porRed };
    },

    async create(datos) {
        const result = await query(`
            INSERT INTO Impresoras (
                nombre_equipo, marca, modelo, serial, tipo_impresora, tipo_red,
                ip_impresora, mac_ethernet, mac_wifi,
                impresion_color, tiene_escaner, tiene_fax, impresion_duplex, tamano_papel_max,
                estado, fecha_adquisicion, ultimo_mantenimiento, notas, activo
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,true)`,
            [datos.nombre_equipo, datos.marca, datos.modelo, datos.serial,
             datos.tipo_impresora||'Láser', datos.tipo_red||'ETHERNET',
             datos.ip_impresora, datos.mac_ethernet, datos.mac_wifi,
             datos.impresion_color||false, datos.tiene_escaner||false,
             datos.tiene_fax||false, datos.impresion_duplex||false,
             datos.tamano_papel_max||'A4', datos.estado||'Activo',
             datos.fecha_adquisicion, datos.ultimo_mantenimiento, datos.notas]
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

    // Impresoras se asignan a ubicación (sin persona)
    async asignar(id_impresora, id_ubicacion) {
        await query(
            'UPDATE Impresoras_ubicacion SET activo = false WHERE id_impresora = ? AND activo = true',
            [id_impresora]
        );
        return query(
            'INSERT INTO Impresoras_ubicacion (id_impresora, id_ubicacion, activo) VALUES (?,?,true)',
            [id_impresora, id_ubicacion]
        );
    },

    async desasignar(id_impresora) {
        return query(
            'UPDATE Impresoras_ubicacion SET activo = false WHERE id_impresora = ? AND activo = true',
            [id_impresora]
        );
    },

    async darDeBaja(id) {
        await query("UPDATE Impresoras SET estado = 'DADO DE BAJA', activo = false WHERE id_impresora = ?", [id]);
        await query('UPDATE Impresoras_ubicacion SET activo = false WHERE id_impresora = ?', [id]);
    }
};

module.exports = Impresora;