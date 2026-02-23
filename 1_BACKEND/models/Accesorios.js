// ============================================================================
// ARCHIVO: 1_backend/models/Accesorio.js
// ============================================================================

const { query } = require('../config/database');

const Accesorio = {

    async getAll({ tipo, estado, search } = {}) {
        let sql = `
            SELECT a.*,
                p.nombre AS nombre_usuario, p.cargo,
                u.Nombre_ubicacion, u.Area
            FROM Accesorios a
            LEFT JOIN Accesorios_persona ap ON a.id_accesorio = ap.id_accesorio AND ap.activo = true
            LEFT JOIN Personas p ON ap.id_persona = p.id_persona
            LEFT JOIN Ubicaciones u ON ap.id_ubicacion = u.id_ubicacion
            WHERE a.activo = true
        `;
        const params = [];
        if (tipo)   { sql += ' AND a.tipo_accesorio = ?'; params.push(tipo); }
        if (estado) { sql += ' AND a.estado = ?';         params.push(estado); }
        if (search) {
            sql += ` AND (a.tipo_accesorio LIKE ? OR a.marca LIKE ?
                         OR a.modelo LIKE ? OR a.serial LIKE ? OR p.nombre LIKE ?)`;
            const s = `%${search}%`;
            params.push(s, s, s, s, s);
        }
        sql += ' ORDER BY a.tipo_accesorio ASC, a.marca ASC';
        return query(sql, params);
    },

    async getById(id) {
        const rows = await query(`
            SELECT a.*, ap.fecha_asignacion,
                p.nombre AS nombre_usuario, p.cargo,
                u.Nombre_ubicacion
            FROM Accesorios a
            LEFT JOIN Accesorios_persona ap ON a.id_accesorio = ap.id_accesorio AND ap.activo = true
            LEFT JOIN Personas p ON ap.id_persona = p.id_persona
            LEFT JOIN Ubicaciones u ON ap.id_ubicacion = u.id_ubicacion
            WHERE a.id_accesorio = ?`, [id]);
        if (rows.length && rows[0].especificaciones && typeof rows[0].especificaciones === 'string') {
            try { rows[0].especificaciones = JSON.parse(rows[0].especificaciones); } catch (e) {}
        }
        return rows;
    },

    async getTipos() {
        return query(
            'SELECT DISTINCT tipo_accesorio, COUNT(*) as total FROM Accesorios WHERE activo = true GROUP BY tipo_accesorio ORDER BY tipo_accesorio'
        );
    },

    async getStats() {
        const [porTipo, porEstado, enBodega] = await Promise.all([
            query('SELECT tipo_accesorio, COUNT(*) as total FROM Accesorios WHERE activo = true GROUP BY tipo_accesorio ORDER BY total DESC'),
            query('SELECT estado, COUNT(*) as total FROM Accesorios WHERE activo = true GROUP BY estado'),
            query("SELECT tipo_accesorio, COUNT(*) as total FROM Accesorios WHERE estado = 'En Bodega' AND activo = true GROUP BY tipo_accesorio")
        ]);
        return { por_tipo: porTipo, por_estado: porEstado, en_bodega: enBodega };
    },

    async create(datos) {
        const especJson = datos.especificaciones
            ? (typeof datos.especificaciones === 'string' ? datos.especificaciones : JSON.stringify(datos.especificaciones))
            : null;
        const result = await query(`
            INSERT INTO Accesorios (
                tipo_accesorio, codigo_activo, marca, modelo, serial,
                estado, fecha_adquisicion, especificaciones, notas, activo
            ) VALUES (?,?,?,?,?,?,?,?,?,true)`,
            [datos.tipo_accesorio, datos.codigo_activo, datos.marca, datos.modelo, datos.serial,
             datos.estado||'En Bodega', datos.fecha_adquisicion, especJson, datos.notas]
        );
        return result.insertId;
    },

    async update(id, campos) {
        const allowed = ['tipo_accesorio','codigo_activo','marca','modelo','serial','estado','fecha_adquisicion','notas'];
        const fields = [], values = [];
        for (const f of allowed) {
            if (campos[f] !== undefined) { fields.push(`${f} = ?`); values.push(campos[f]); }
        }
        if (campos.especificaciones !== undefined) {
            fields.push('especificaciones = ?');
            values.push(typeof campos.especificaciones === 'string'
                ? campos.especificaciones : JSON.stringify(campos.especificaciones));
        }
        if (!fields.length) return null;
        values.push(id);
        return query(`UPDATE Accesorios SET ${fields.join(', ')} WHERE id_accesorio = ?`, values);
    },

    async asignar(id_accesorio, id_persona, id_ubicacion) {
        await query('UPDATE Accesorios_persona SET activo = false WHERE id_accesorio = ? AND activo = true', [id_accesorio]);
        await query("UPDATE Accesorios SET estado = 'Activo' WHERE id_accesorio = ?", [id_accesorio]);
        return query(
            'INSERT INTO Accesorios_persona (id_accesorio, id_persona, id_ubicacion, activo) VALUES (?,?,?,true)',
            [id_accesorio, id_persona, id_ubicacion]
        );
    },

    async desasignar(id_accesorio) {
        await query('UPDATE Accesorios_persona SET activo = false, fecha_devolucion = CURDATE() WHERE id_accesorio = ? AND activo = true', [id_accesorio]);
        return query("UPDATE Accesorios SET estado = 'En Bodega' WHERE id_accesorio = ?", [id_accesorio]);
    },

    async darDeBaja(id) {
        await query("UPDATE Accesorios SET estado = 'Dado de baja', activo = false WHERE id_accesorio = ?", [id]);
        await query('UPDATE Accesorios_persona SET activo = false WHERE id_accesorio = ?', [id]);
    }
};

module.exports = Accesorio;