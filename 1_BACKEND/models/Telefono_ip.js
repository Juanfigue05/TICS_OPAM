const { query } = require('../config/database');

const Telefono_ip = {

    async getAll({ estado, search } = {}) {
        let sql = `
            SELECT t.*,
                p.nombre AS nombre_usuario, p.cargo,
                u.Nombre_ubicacion, u.Area,
                tp.fecha_asignacion
            FROM Telefonos_ip t
            LEFT JOIN Telefono_persona tp ON t.id_telefono_ip = tp.id_telefono_ip AND tp.activo = 'ACTIVO'
            LEFT JOIN Personas p ON tp.id_persona = p.id_persona
            LEFT JOIN Ubicaciones u ON tp.id_ubicacion = u.id_ubicacion
            WHERE t.activo = 'ACTIVO'
        `;
        const params = [];
        if (estado) { sql += ' AND t.estado = ?'; params.push(estado); }
        if (search) {
            sql += ` AND (t.marca LIKE ? OR t.modelo LIKE ? OR t.serial_telefono LIKE ?
                         OR t.extension LIKE ? OR t.ip_telefono LIKE ? OR p.nombre LIKE ?)`;
            const s = `%${search}%`;
            params.push(s, s, s, s, s, s);
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
            LEFT JOIN Telefono_persona tp ON t.id_telefono_ip = tp.id_telefono_ip AND tp.activo = 'ACTIVO'
            LEFT JOIN Personas p ON tp.id_persona = p.id_persona
            LEFT JOIN Ubicaciones u ON tp.id_ubicacion = u.id_ubicacion
            WHERE t.id_telefono_ip = ?`, [id]);
    },

    async getStats() {
        const [porEstado, porMarca] = await Promise.all([
            query("SELECT estado, COUNT(*) as total FROM Telefonos_ip WHERE activo = 'ACTIVO' GROUP BY estado"),
            query("SELECT marca, COUNT(*) as total FROM Telefonos_ip WHERE activo = 'ACTIVO' GROUP BY marca ORDER BY total DESC LIMIT 5")
        ]);
        return { porEstado, porMarca };
    },

    async create(datos) {
        const result = await query(`
            INSERT INTO Telefonos_ip (
                marca, modelo, serial_telefono, mac_address, ip_telefono, extension,
                protocolo, firmware_version, poe, tiene_pantalla, tamano_pantalla, cantidad_lineas,
                estado, fecha_adquisicion, ultimo_mantenimiento, notas
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
                datos.marca,
                datos.modelo,
                datos.serial_telefono,
                datos.mac_address || null,
                datos.ip_telefono || null,
                datos.extension || null,
                datos.protocolo || 'SIP',
                datos.firmware_version || null,
                datos.poe !== undefined ? datos.poe : true,
                datos.tiene_pantalla || false,
                datos.tamano_pantalla || null,
                datos.cantidad_lineas || 1,
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
            'marca','modelo','serial_telefono','mac_address','ip_telefono','extension',
            'protocolo','firmware_version','poe','tiene_pantalla','tamano_pantalla','cantidad_lineas',
            'estado','fecha_adquisicion','ultimo_mantenimiento','notas'
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
            "UPDATE Telefono_persona SET activo = 'DADO DE BAJA' WHERE id_telefono_ip = ? AND activo = 'ACTIVO'",
            [id_telefono_ip]
        );
        return query(
            'INSERT INTO Telefono_persona (id_telefono_ip, id_persona, id_ubicacion, activo) VALUES (?,?,?,?)',
            [id_telefono_ip, id_persona, id_ubicacion, 'ACTIVO']
        );
    },

    async desasignar(id_telefono_ip) {
        return query(
            "UPDATE Telefono_persona SET activo = 'DADO DE BAJA', fecha_devolucion = CURDATE() WHERE id_telefono_ip = ? AND activo = 'ACTIVO'",
            [id_telefono_ip]
        );
    },

    async darDeBaja(id) {
        await query("UPDATE Telefonos_ip SET activo = 'DADO DE BAJA' WHERE id_telefono_ip = ?", [id]);
        await query("UPDATE Telefono_persona SET activo = 'DADO DE BAJA' WHERE id_telefono_ip = ?", [id]);
    }
};

module.exports = Telefono_ip;