// ============================================================================
// ARCHIVO: 1_backend/models/Persona.js
// FIX: rol default USUARIO→VISITANTE | activo en update | JOIN columna correcta
// ============================================================================

const { query } = require('../config/database');

const Persona = {

    async getAll({ search, rol } = {}) {
        let sql = `
            SELECT p.*,
                u.username,
                u.rol AS rol_sistema,
                u.activo AS usuario_activo
            FROM Personas p
            LEFT JOIN Usuarios_sistema u ON p.id_persona = u.id_persona AND u.activo = true
            WHERE 1=1
        `;
        const params = [];
        if (rol)    { sql += ' AND p.rol = ?'; params.push(rol); }
        if (search) {
            sql += ` AND (p.nombre LIKE ? OR p.correo_asignado LIKE ?
                         OR p.cargo LIKE ? OR p.area LIKE ?)`;
            const s = `%${search}%`;
            params.push(s, s, s, s);
        }
        sql += ' ORDER BY p.activo DESC, p.nombre ASC';
        return query(sql, params);
    },

    async getById(id) {
        return query(`
            SELECT p.*,
                u.username, u.rol AS rol_sistema, u.ultimo_acceso
            FROM Personas p
            LEFT JOIN Usuarios_sistema u ON p.id_persona = u.id_persona
            WHERE p.id_persona = ?`, [id]);
    },

    async getEquipos(id) {
        const [computadores, celulares, radios, tablets, telefonos] = await Promise.all([
            query(`SELECT c.codigo_activo, c.nombre_equipo, c.marca_equipo, cp.fecha_asignacion
                   FROM Computadores_persona cp
                   JOIN Computadores c ON cp.id_computador = c.id_computador
                   WHERE cp.id_persona = ? AND cp.activo = true`, [id]),
            query(`SELECT c.nombre_celular, c.numero_celular, c.marca, cp.fecha_asignacion
                   FROM Celulares_persona cp
                   JOIN Celulares c ON cp.id_celular = c.id_celular
                   WHERE cp.id_persona = ? AND cp.activo = true`, [id]),
            query(`SELECT r.marca, r.modelo, r.serial_radio, rp.fecha_asignacion
                   FROM Radios_persona rp
                   JOIN Radios r ON rp.id_radio = r.id_radio
                   WHERE rp.id_persona = ? AND rp.activo = true`, [id]),
            query(`SELECT t.marca, t.modelo, t.serial_tablet, tp.fecha_asignacion
                   FROM Tablets_persona tp
                   JOIN Tablets t ON tp.id_tablet = t.id_tablet
                   WHERE tp.id_persona = ? AND tp.activo = true`, [id]),
            query(`SELECT t.marca, t.extension, t.ip_telefono, tp.fecha_asignacion
                   FROM Telefono_persona tp
                   JOIN Telefonos_ip t ON tp.id_telefono_ip = t.id_telefono_ip
                   WHERE tp.id_persona = ? AND tp.activo = true`, [id])
        ]);
        return { computadores, celulares, radios, tablets, telefonos };
    },

    async existeCorreo(correo, excluirId = null) {
        let sql = 'SELECT id_persona FROM Personas WHERE correo_asignado = ?';
        const params = [correo];
        if (excluirId) { sql += ' AND id_persona != ?'; params.push(excluirId); }
        const rows = await query(sql, params);
        return rows.length > 0;
    },

    // FIX: rol default → VISITANTE (valor válido del ENUM)
    async create({ nombre, correo_asignado, cargo, rol, celular, extension, area }) {
        const result = await query(
            `INSERT INTO Personas (nombre, correo_asignado, cargo, rol, telefono, extension, area, activo)
             VALUES (?, ?, ?, ?, ?, ?, ?, true)`,
            [
                nombre,
                correo_asignado || null,
                cargo           || 'Sin asignar',
                rol             || 'VISITANTE',   // ← FIX: USUARIO→VISITANTE
                celular         || null,
                extension       || null,
                area            || null
            ]
        );
        return result.insertId;
    },

    // FIX: agregar 'activo' a la lista de campos permitidos
    async update(id, campos) {
        const allowed = ['nombre', 'correo_asignado', 'cargo', 'rol',
                         'celular', 'extension', 'area', 'activo'];  // ← FIX: +activo
        const fields = [], values = [];
        for (const f of allowed) {
            if (campos[f] !== undefined) {
                fields.push(`${f} = ?`);
                values.push(campos[f]);
            }
        }
        if (!fields.length) return null;
        values.push(id);
        return query(`UPDATE Personas SET ${fields.join(', ')} WHERE id_persona = ?`, values);
    },

    async deactivate(id) {
        await query('UPDATE Personas SET activo = false WHERE id_persona = ?', [id]);
        await query('UPDATE Usuarios_sistema SET activo = false WHERE id_persona = ?', [id]);
    }
};

module.exports = Persona;