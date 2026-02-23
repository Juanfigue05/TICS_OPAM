// ============================================================================
// ARCHIVO: 1_backend/models/Celular.js
// ============================================================================

const { query } = require('../config/database');

const Celular = {

    async getAll({ estado, search } = {}) {
        let sql = `
            SELECT c.*,
                p.nombre AS nombre_usuario, p.cargo,
                u.Nombre_ubicacion, u.Area
            FROM Celulares c
            LEFT JOIN Celulares_persona cp ON c.id_celular = cp.id_celular AND cp.activo = true
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
            LEFT JOIN Celulares_persona cp ON c.id_celular = cp.id_celular AND cp.activo = true
            LEFT JOIN Personas p ON cp.id_persona = p.id_persona
            LEFT JOIN Ubicaciones u ON cp.id_ubicacion = u.id_ubicacion
            WHERE c.id_celular = ?`, [id]);
    },

    async getStats() {
        const [porEstado, porMarca, porOperador, porSO] = await Promise.all([
            query('SELECT estado, COUNT(*) as total FROM Celulares WHERE activo = true GROUP BY estado'),
            query('SELECT marca, COUNT(*) as total FROM Celulares WHERE activo = true GROUP BY marca ORDER BY total DESC'),
            query('SELECT sim_company, COUNT(*) as total FROM Celulares WHERE activo = true GROUP BY sim_company ORDER BY total DESC'),
            query('SELECT sistema_op, COUNT(*) as total FROM Celulares WHERE activo = true GROUP BY sistema_op')
        ]);
        return { por_estado: porEstado, por_marca: porMarca, por_operador: porOperador, por_so: porSO };
    },

    async create(datos) {
        const result = await query(`
            INSERT INTO Celulares (
                nombre_celular, numero_celular, marca, modelo, serial_celular,
                sim_company, imei1_celular, imei2_celular, punk,
                procesador, ram, almacenamiento, sistema_op, version_op,
                plan_datos, estado, fecha_adquisicion, fecha_vencimiento_contrato, notas
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [datos.nombre_celular, datos.numero_celular, datos.marca, datos.modelo, datos.serial_celular,
             datos.sim_company||'No definido', datos.imei1_celular, datos.imei2_celular, datos.punk,
             datos.procesador, datos.ram, datos.almacenamiento,
             datos.sistema_op||'ANDROID', datos.version_op, datos.plan_datos,
             datos.estado||'BUENO', datos.fecha_adquisicion, datos.fecha_vencimiento_contrato, datos.notas]
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
            if (campos[f] !== undefined) { fields.push(`${f} = ?`); values.push(campos[f]); }
        }
        if (!fields.length) return null;
        values.push(id);
        return query(`UPDATE Celulares SET ${fields.join(', ')} WHERE id_celular = ?`, values);
    },

    async asignar(id_celular, id_persona, id_ubicacion) {
        await query(
            'UPDATE Celulares_persona SET activo = false WHERE id_celular = ? AND activo = true',
            [id_celular]
        );
        return query(
            'INSERT INTO Celulares_persona (id_celular, id_persona, id_ubicacion, activo) VALUES (?,?,?,true)',
            [id_celular, id_persona, id_ubicacion]
        );
    },

    async desasignar(id_celular) {
        return query(
            'UPDATE Celulares_persona SET activo = false, fecha_devolucion = CURDATE() WHERE id_celular = ? AND activo = true',
            [id_celular]
        );
    },

    async darDeBaja(id) {
        await query("UPDATE Celulares SET estado = 'Dado de baja', activo = false WHERE id_celular = ?", [id]);
        await query('UPDATE Celulares_persona SET activo = false WHERE id_celular = ?', [id]);
    }
};

module.exports = Celular;