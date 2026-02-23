// ============================================================================
// ARCHIVO: 1_backend/models/Ubicacion.js
// FIX: descripcion undefined → null  |  piso "" → null
// ============================================================================

const { query } = require('../config/database');

const Ubicacion = {

    async getAll({ search } = {}) {
        let sql = 'SELECT * FROM Ubicaciones WHERE activo = true';
        const params = [];
        if (search) {
            sql += ' AND (Nombre_ubicacion LIKE ? OR Area LIKE ?)';
            const s = `%${search}%`;
            params.push(s, s);
        }
        sql += ' ORDER BY Nombre_ubicacion ASC';
        return query(sql, params);
    },

    async getById(id) {
        return query('SELECT * FROM Ubicaciones WHERE id_ubicacion = ?', [id]);
    },

    async getEquipos(id) {
        const [comp, cel, imp, rad, tel, tab] = await Promise.all([
            query('SELECT COUNT(*) as total FROM Computadores_persona WHERE id_ubicacion = ? AND activo = true', [id]),
            query('SELECT COUNT(*) as total FROM Celulares_persona   WHERE id_ubicacion = ? AND activo = true', [id]),
            query('SELECT COUNT(*) as total FROM Impresoras_ubicacion WHERE id_ubicacion = ? AND activo = true', [id]),
            query('SELECT COUNT(*) as total FROM Radios_persona       WHERE id_ubicacion = ? AND activo = true', [id]),
            query('SELECT COUNT(*) as total FROM Telefono_persona     WHERE id_ubicacion = ? AND activo = true', [id]),
            query('SELECT COUNT(*) as total FROM Tablets_persona      WHERE id_ubicacion = ? AND activo = true', [id])
        ]);
        return {
            computadores: comp[0].total,
            celulares:    cel[0].total,
            impresoras:   imp[0].total,
            radios:       rad[0].total,
            telefonos_ip: tel[0].total,
            tablets:      tab[0].total,
            total: comp[0].total + cel[0].total + imp[0].total +
                   rad[0].total  + tel[0].total + tab[0].total
        };
    },

    // FIX: piso vacío → null, descripcion undefined → null
    async create({ Nombre_ubicacion, Area, piso, icono, color, descripcion }) {
        const pisoVal = (piso !== undefined && piso !== '' && piso !== null)
            ? parseInt(piso) : null;

        const result = await query(
            `INSERT INTO Ubicaciones (Nombre_ubicacion, Area, piso, icono, color, descripcion, activo)
             VALUES (?, ?, ?, ?, ?, ?, true)`,
            [
                Nombre_ubicacion,
                Area        || 'N/A',
                pisoVal,
                icono       || 'building',
                color       || '#0056D2',
                descripcion || null       // ← FIX: undefined → null
            ]
        );
        return result.insertId;
    },

    async update(id, campos) {
        const allowed = ['Nombre_ubicacion', 'Area', 'piso', 'icono', 'color', 'descripcion'];
        const fields = [], values = [];
        for (const f of allowed) {
            if (campos[f] !== undefined) {
                // Convertir piso vacío a null
                const val = (f === 'piso' && campos[f] === '') ? null
                          : (f === 'piso' && campos[f] !== null) ? parseInt(campos[f])
                          : campos[f];
                fields.push(`${f} = ?`);
                values.push(val);
            }
        }
        if (!fields.length) return null;
        values.push(id);
        return query(`UPDATE Ubicaciones SET ${fields.join(', ')} WHERE id_ubicacion = ?`, values);
    },

    async deactivate(id) {
        return query('UPDATE Ubicaciones SET activo = false WHERE id_ubicacion = ?', [id]);
    }
};

module.exports = Ubicacion;