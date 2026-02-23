// ============================================================================
// ARCHIVO: 1_backend/models/Telefono_ip.js
// ============================================================================

const { query } = require('../config/database');

const Telefono_ip = {

    async getAll({ estado, search } = {}) {
        let sql = `
            SELECT t.*,
                p.nombre AS nombre_usuario, p.cargo,
                u.Nombre_ubicacion, u.Area
            FROM Telefonos_ip t
            LEFT JOIN Telefono_persona tp ON t.id_telefono_ip = tp.id_telefono_ip AND tp.activo = true
            LEFT JOIN Personas p ON tp.id_persona = p.id_persona
            LEFT JOIN Ubicaciones u ON tp.id_ubicacion = u.id_ubicacion
            WHERE t.activo = true
        `;
        const params = [];
        if (estado) { sql += ' AND t.estado = ?'; params.push(estado); }
        if (search) {
            sql += ` AND (t.nombre_telefono LIKE ? OR t.marca LIKE ?
                         OR t.extension LIKE ? OR t.direccion_ip LIKE ? OR p.nombre LIKE ?)`;
            const s = `%${search}%`;
            params.push(s, s, s, s, s);
        }
        sql += ' ORDER BY t.extension ASC';
        return query(sql, params);
    },

    async getById(id) {
        return query(`
            SELECT t.*, tp.fecha_asignacion,
                p.nombre AS nombre_usuario, p.cargo,
                u.Nombre_ubicacion
            FROM Telefonos_ip t
            LEFT JOIN Telefono_persona tp ON t.id_telefono_ip = tp.id_telefono_ip AND tp.activo = true
            LEFT JOIN Personas p ON tp.id_persona = p.id_persona
            LEFT JOIN Ubicaciones u ON tp.id_ubicacion = u.id_ubicacion
            WHERE t.id_telefono_ip = ?`, [id]);
    },

    async getStats() {
        const [porEstado, porMarca] = await Promise.all([
            query('SELECT estado, COUNT(*) as total FROM Telefonos_ip WHERE activo = true GROUP BY estado'),
            query('SELECT marca, COUNT(*) as total FROM Telefonos_ip WHERE activo = true GROUP BY marca ORDER BY total DESC')
        ]);
        return { por_estado: porEstado, por_marca: porMarca };
    },

    async create(datos) {
        const result = await query(`
            INSERT INTO Telefonos_ip (
                nombre_telefono, marca, modelo, serial_telefono,
                direccion_mac, extension, direccion_ip,
                tiene_pantalla, poe, estado, fecha_adquisicion, ultimo_mantenimiento, notas, activo
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,true)`,
            [datos.nombre_telefono, datos.marca, datos.modelo, datos.serial_telefono,
             datos.direccion_mac, datos.extension, datos.direccion_ip,
             datos.tiene_pantalla !== undefined ? datos.tiene_pantalla : true,
             datos.poe !== undefined ? datos.poe : true,
             datos.estado||'Activo', datos.fecha_adquisicion, datos.ultimo_mantenimiento, datos.notas]
        );
        return result.insertId;
    },

    async update(id, campos) {
        const allowed = [
            'nombre_telefono','marca','modelo','serial_telefono',
            'direccion_mac','extension','direccion_ip',
            'tiene_pantalla','poe','estado','fecha_adquisicion','ultimo_mantenimiento','notas'
        ];
        const fields = [], values = [];
        for (const f of allowed) {
            if (campos[f] !== undefined) { fields.push(`${f} = ?`); values.push(campos[f]); }
        }
        if (!fields.length) return null;
        values.push(id);
        return query(`UPDATE Telefonos_ip SET ${fields.join(', ')} WHERE id_telefono_ip = ?`, values);
    },

    async asignar(id_telefono_ip, id_persona, id_ubicacion) {
        await query(
            'UPDATE Telefono_persona SET activo = false WHERE id_telefono_ip = ? AND activo = true',
            [id_telefono_ip]
        );
        return query(
            'INSERT INTO Telefono_persona (id_telefono_ip, id_persona, id_ubicacion, activo) VALUES (?,?,?,true)',
            [id_telefono_ip, id_persona, id_ubicacion]
        );
    },

    async desasignar(id_telefono_ip) {
        return query(
            'UPDATE Telefono_persona SET activo = false, fecha_devolucion = CURDATE() WHERE id_telefono_ip = ? AND activo = true',
            [id_telefono_ip]
        );
    },

    async darDeBaja(id) {
        await query("UPDATE Telefonos_ip SET estado = 'Dado de baja', activo = false WHERE id_telefono_ip = ?", [id]);
        await query('UPDATE Telefono_persona SET activo = false WHERE id_telefono_ip = ?', [id]);
    }
};

module.exports = Telefono_ip;