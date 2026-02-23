const { query } = require('../config/database');

const Celular = {

    async getAll({ estado, search } = {}) {
        let sql = `
            SELECT c.*,
                p.nombre AS nombre_usuario, p.cargo,
                u.Nombre_ubicacion, u.Area,
                cp.fecha_asignacion
            FROM Celulares c
            LEFT JOIN Celulares_persona cp ON c.id_celular = cp.id_celular AND cp.activo = 'ACTIVO'
            LEFT JOIN Personas p ON cp.id_persona = p.id_persona
            LEFT JOIN Ubicaciones u ON cp.id_ubicacion = u.id_ubicacion
            WHERE c.activo = 'ACTIVO'
        `;
        const params = [];
        if (estado) { sql += ' AND c.estado = ?'; params.push(estado); }
        if (search) {
            sql += ` AND (c.nombre_celular LIKE ? OR c.numero_celular LIKE ?
                         OR c.marca LIKE ? OR c.serial_celular LIKE ? OR p.nombre LIKE ?)`;
            const s = `%${search}%`;
            params.push(s, s, s, s, s);
        }
        sql += ' ORDER BY c.nombre_celular ASC';
        return query(sql, params);
    },

    async getById(id) {
        return query(`
            SELECT c.*, cp.fecha_asignacion,
                p.nombre AS nombre_usuario, p.cargo,
                u.Nombre_ubicacion, u.Area
            FROM Celulares c
            LEFT JOIN Celulares_persona cp ON c.id_celular = cp.id_celular AND cp.activo = 'ACTIVO'
            LEFT JOIN Personas p ON cp.id_persona = p.id_persona
            LEFT JOIN Ubicaciones u ON cp.id_ubicacion = u.id_ubicacion
            WHERE c.id_celular = ?`, [id]);
    },

    async getStats() {
        const [porEstado, porMarca, porOperador, porSO] = await Promise.all([
            query("SELECT estado, COUNT(*) as total FROM Celulares WHERE activo = 'ACTIVO' GROUP BY estado"),
            query("SELECT marca, COUNT(*) as total FROM Celulares WHERE activo = 'ACTIVO' GROUP BY marca ORDER BY total DESC LIMIT 5"),
            query("SELECT sim_company, COUNT(*) as total FROM Celulares WHERE activo = 'ACTIVO' GROUP BY sim_company"),
            query("SELECT sistema_op, COUNT(*) as total FROM Celulares WHERE activo = 'ACTIVO' GROUP BY sistema_op")
        ]);
        return { porEstado, porMarca, porOperador, porSO };
    },

    async create(datos) {
        const result = await query(`
            INSERT INTO Celulares (
                nombre_celular, numero_celular, marca, modelo, serial_celular,
                sim_company, imei1_celular, imei2_celular, punk,
                procesador, ram, almacenamiento,
                sistema_op, version_op, plan_datos,
                estado, fecha_adquisicion, fecha_vencimiento_contrato, notas
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
                datos.nombre_celular,
                datos.numero_celular,
                datos.marca,
                datos.modelo,
                datos.serial_celular,
                datos.sim_company || 'No definido',
                datos.imei1_celular || null,
                datos.imei2_celular || null,
                datos.punk || null,
                datos.procesador || null,
                datos.ram || null,
                datos.almacenamiento || null,
                datos.sistema_op || 'ANDROID',
                datos.version_op || null,
                datos.plan_datos || null,
                datos.estado || 'BUENO',
                datos.fecha_adquisicion || null,
                datos.fecha_vencimiento_contrato || null,
                datos.notas || null
            ]
        );
        return result.insertId;
    },

    async update(id, campos) {
        const allowed = [
            'nombre_celular','numero_celular','marca','modelo','serial_celular',
            'sim_company','imei1_celular','imei2_celular','punk',
            'procesador','ram','almacenamiento','sistema_op','version_op',
            'plan_datos','estado','fecha_adquisicion','fecha_vencimiento_contrato','notas'
        ];
        const fields = [], values = [];
        for (const f of allowed) {
            if (campos[f] !== undefined) {
                fields.push(`${f} = ?`);
                values.push(campos[f]);
            }
        }
        if (!fields.length) return null;
        values.push(id);
        return query(`UPDATE Celulares SET ${fields.join(', ')} WHERE id_celular = ?`, values);
    },

    async asignar(id_celular, id_persona, id_ubicacion) {
        await query(
            "UPDATE Celulares_persona SET activo = 'DADO DE BAJA' WHERE id_celular = ? AND activo = 'ACTIVO'",
            [id_celular]
        );
        return query(
            'INSERT INTO Celulares_persona (id_celular, id_persona, id_ubicacion, activo) VALUES (?,?,?,?)',
            [id_celular, id_persona, id_ubicacion, 'ACTIVO']
        );
    },

    async desasignar(id_celular) {
        return query(
            "UPDATE Celulares_persona SET activo = 'DADO DE BAJA', fecha_devolucion = CURDATE() WHERE id_celular = ? AND activo = 'ACTIVO'",
            [id_celular]
        );
    },

    async darDeBaja(id) {
        await query("UPDATE Celulares SET activo = 'DADO DE BAJA' WHERE id_celular = ?", [id]);
        await query("UPDATE Celulares_persona SET activo = 'DADO DE BAJA' WHERE id_celular = ?", [id]);
    }
};

module.exports = Celular;