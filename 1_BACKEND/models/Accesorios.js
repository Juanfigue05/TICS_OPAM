const { query } = require('../config/database');

const Accesorios = {

    async getAll({ tipo_accesorio, estado, search } = {}) {
        let sql = `
            SELECT a.*,
                p.nombre AS nombre_usuario, p.cargo,
                u.Nombre_ubicacion, u.Area,
                ap.fecha_asignacion
            FROM Accesorios a
            LEFT JOIN Accesorios_persona ap ON a.id_accesorio = ap.id_accesorio AND ap.activo = 'ACTIVO'
            LEFT JOIN Personas p ON ap.id_persona = p.id_persona
            LEFT JOIN Ubicaciones u ON ap.id_ubicacion = u.id_ubicacion
            WHERE a.activo = 'ACTIVO'
        `;
        const params = [];
        if (tipo_accesorio) { sql += ' AND a.tipo_accesorio = ?'; params.push(tipo_accesorio); }
        if (estado) { sql += ' AND a.estado = ?'; params.push(estado); }
        if (search) {
            sql += ` AND (a.tipo_accesorio LIKE ? OR a.marca LIKE ? OR a.modelo LIKE ?
                         OR a.serial LIKE ? OR p.nombre LIKE ?)`;
            const s = `%${search}%`;
            params.push(s, s, s, s, s);
        }
        sql += ' ORDER BY a.tipo_accesorio ASC, a.marca ASC';
        return query(sql, params);
    },

    async getById(id) {
        return query(`
            SELECT a.*, ap.fecha_asignacion,
                p.nombre AS nombre_usuario, p.cargo,
                u.Nombre_ubicacion
            FROM Accesorios a
            LEFT JOIN Accesorios_persona ap ON a.id_accesorio = ap.id_accesorio AND ap.activo = 'ACTIVO'
            LEFT JOIN Personas p ON ap.id_persona = p.id_persona
            LEFT JOIN Ubicaciones u ON ap.id_ubicacion = u.id_ubicacion
            WHERE a.id_accesorio = ?`, [id]);
    },

    async getTipos() {
        return query("SELECT DISTINCT tipo_accesorio FROM Accesorios WHERE activo = 'ACTIVO' ORDER BY tipo_accesorio");
    },

    async getStats() {
        const [porTipo, porEstado, porMarca] = await Promise.all([
            query("SELECT tipo_accesorio, COUNT(*) as total FROM Accesorios WHERE activo = 'ACTIVO' GROUP BY tipo_accesorio ORDER BY total DESC"),
            query("SELECT estado, COUNT(*) as total FROM Accesorios WHERE activo = 'ACTIVO' GROUP BY estado"),
            query("SELECT marca, COUNT(*) as total FROM Accesorios WHERE activo = 'ACTIVO' GROUP BY marca ORDER BY total DESC LIMIT 5")
        ]);
        return { porTipo, porEstado, porMarca };
    },

    async create(datos) {
        const result = await query(`
            INSERT INTO Accesorios (
                tipo_accesorio, marca, modelo, serial, descripcion,
                cantidad, estado, fecha_adquisicion, notas
            ) VALUES (?,?,?,?,?,?,?,?,?)`,
            [
                datos.tipo_accesorio,
                datos.marca || null,
                datos.modelo || null,
                datos.serial || null,
                datos.descripcion || null,
                datos.cantidad || 1,
                datos.estado || 'BUENO',
                datos.fecha_adquisicion || null,
                datos.notas || null
            ]
        );
        return result.insertId;
    },

    async update(id, campos) {
        const allowed = [
            'tipo_accesorio','marca','modelo','serial','descripcion',
            'cantidad','estado','fecha_adquisicion','notas'
        ];
        const fields = [], values = [];
        for (const f of allowed) {
            if (campos[f] !== undefined) { fields.push(`${f} = ?`); values.push(campos[f]); }
        }
        if (!fields.length) return null;
        values.push(id);
        return query(`UPDATE Accesorios SET ${fields.join(', ')} WHERE id_accesorio = ?`, values);
    },

    async asignar(id_accesorio, id_persona, id_ubicacion) {
        await query(
            "UPDATE Accesorios_persona SET activo = 'DADO DE BAJA' WHERE id_accesorio = ? AND activo = 'ACTIVO'",
            [id_accesorio]
        );
        await query("UPDATE Accesorios SET estado = 'BUENO' WHERE id_accesorio = ?", [id_accesorio]);
        return query(
            'INSERT INTO Accesorios_persona (id_accesorio, id_persona, id_ubicacion, activo) VALUES (?,?,?,?)',
            [id_accesorio, id_persona, id_ubicacion, 'ACTIVO']
        );
    },

    async desasignar(id_accesorio) {
        await query(
            "UPDATE Accesorios_persona SET activo = 'DADO DE BAJA', fecha_devolucion = CURDATE() WHERE id_accesorio = ? AND activo = 'ACTIVO'",
            [id_accesorio]
        );
        return query("UPDATE Accesorios SET estado = 'BUENO' WHERE id_accesorio = ?", [id_accesorio]);
    },

    async darDeBaja(id) {
        await query("UPDATE Accesorios SET activo = 'DADO DE BAJA' WHERE id_accesorio = ?", [id]);
        await query("UPDATE Accesorios_persona SET activo = 'DADO DE BAJA' WHERE id_accesorio = ?", [id]);
    }
};

module.exports = Accesorios;