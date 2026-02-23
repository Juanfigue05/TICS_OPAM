const { query } = require('../config/database');

const Tablet = {

    async getAll({ estado, search } = {}) {
        let sql = `
            SELECT t.*,
                p.nombre AS nombre_usuario, p.cargo,
                u.Nombre_ubicacion, u.Area,
                tp.fecha_asignacion
            FROM Tablets t
            LEFT JOIN Tablets_persona tp ON t.id_tablet = tp.id_tablet AND tp.activo = 'ACTIVO'
            LEFT JOIN Personas p ON tp.id_persona = p.id_persona
            LEFT JOIN Ubicaciones u ON tp.id_ubicacion = u.id_ubicacion
            WHERE t.activo = 'ACTIVO'
        `;
        const params = [];
        if (estado) { sql += ' AND t.estado = ?'; params.push(estado); }
        if (search) {
            sql += ` AND (t.marca LIKE ? OR t.modelo LIKE ? OR t.serial_tablet LIKE ?
                         OR t.imei LIKE ? OR p.nombre LIKE ?)`;
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
            LEFT JOIN Tablets_persona tp ON t.id_tablet = tp.id_tablet AND tp.activo = 'ACTIVO'
            LEFT JOIN Personas p ON tp.id_persona = p.id_persona
            LEFT JOIN Ubicaciones u ON tp.id_ubicacion = u.id_ubicacion
            WHERE t.id_tablet = ?`, [id]);
    },

    async getStats() {
        const [porEstado, porMarca] = await Promise.all([
            query("SELECT estado, COUNT(*) as total FROM Tablets WHERE activo = 'ACTIVO' GROUP BY estado"),
            query("SELECT marca, COUNT(*) as total FROM Tablets WHERE activo = 'ACTIVO' GROUP BY marca ORDER BY total DESC LIMIT 5")
        ]);
        return { porEstado, porMarca };
    },

    async create(datos) {
        const result = await query(`
            INSERT INTO Tablets (
                nombre_tablet, marca, modelo, serial_tablet, imei,
                procesador, ram, almacenamiento, tamano_pantalla, resolucion,
                sistema_op, version_op, tiene_sim, sim_company, plan_datos,
                estado, fecha_adquisicion, notas
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
                datos.nombre_tablet || null,
                datos.marca,
                datos.modelo,
                datos.serial_tablet,
                datos.imei || null,
                datos.procesador || null,
                datos.ram || null,
                datos.almacenamiento || null,
                datos.tamano_pantalla || null,
                datos.resolucion || null,
                datos.sistema_op || 'ANDROID',
                datos.version_op || null,
                datos.tiene_sim || false,
                datos.sim_company || null,
                datos.plan_datos || null,
                datos.estado || 'BUENO',
                datos.fecha_adquisicion || null,
                datos.notas || null
            ]
        );
        return result.insertId;
    },

    async update(id, campos) {
        const allowed = [
            'nombre_tablet','marca','modelo','serial_tablet','imei',
            'procesador','ram','almacenamiento','tamano_pantalla','resolucion',
            'sistema_op','version_op','tiene_sim','sim_company','plan_datos',
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
            "UPDATE Tablets_persona SET activo = 'DADO DE BAJA' WHERE id_tablet = ? AND activo = 'ACTIVO'",
            [id_tablet]
        );
        return query(
            'INSERT INTO Tablets_persona (id_tablet, id_persona, id_ubicacion, activo) VALUES (?,?,?,?)',
            [id_tablet, id_persona, id_ubicacion, 'ACTIVO']
        );
    },

    async desasignar(id_tablet) {
        return query(
            "UPDATE Tablets_persona SET activo = 'DADO DE BAJA', fecha_devolucion = CURDATE() WHERE id_tablet = ? AND activo = 'ACTIVO'",
            [id_tablet]
        );
    },

    async darDeBaja(id) {
        await query("UPDATE Tablets SET activo = 'DADO DE BAJA' WHERE id_tablet = ?", [id]);
        await query("UPDATE Tablets_persona SET activo = 'DADO DE BAJA' WHERE id_tablet = ?", [id]);
    }
};

module.exports = Tablet;