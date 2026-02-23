const { query } = require('../config/database');

const Persona = {

    async getAll({ search, rol, activo = true } = {}) {
        let sql = `
            SELECT p.*,
                u.username, u.rol AS rol_sistema, u.activo AS usuario_activo,
                u.ultimo_acceso
            FROM Personas p
            LEFT JOIN Usuarios_sistema u ON p.id_persona = u.id_persona AND u.activo = true
            WHERE p.activo = ?
        `;
        const params = [activo];
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
        const [computadores, celulares, impresoras, radios, telefonos, tablets, accesorios] = await Promise.all([
            query(`SELECT c.codigo_activo, c.nombre_equipo, c.marca_equipo, cp.fecha_asignacion
                   FROM Computadores_persona cp
                   JOIN Computadores c ON cp.id_computador = c.id_computador
                   WHERE cp.id_persona = ? AND cp.activo = 'ACTIVO'`, [id]),
            query(`SELECT c.nombre_celular, c.numero_celular, c.marca, cp.fecha_asignacion
                   FROM Celulares_persona cp
                   JOIN Celulares c ON cp.id_celular = c.id_celular
                   WHERE cp.id_persona = ? AND cp.activo = 'ACTIVO'`, [id]),
            query(`SELECT i.nombre_equipo, i.marca, i.modelo, iu.fecha_instalacion
                   FROM Impresoras_ubicacion iu
                   JOIN Impresoras i ON iu.id_impresora = i.id_impresora
                   WHERE iu.id_ubicacion IN (SELECT id_ubicacion FROM Personas p JOIN Computadores_persona cp ON p.id_ubicacion = cp.id_ubicacion WHERE p.id_persona = ? AND cp.activo = 'ACTIVO')`, [id]),  // aproximación
            query(`SELECT r.tipo_radio, r.marca, r.modelo, rp.fecha_asignacion
                   FROM Radios_persona rp
                   JOIN Radios r ON rp.id_radio = r.id_radio
                   WHERE rp.id_persona = ? AND rp.activo = 'ACTIVO'`, [id]),
            query(`SELECT t.marca, t.modelo, t.serial_telefono, tp.fecha_asignacion
                   FROM Telefono_persona tp
                   JOIN Telefonos_ip t ON tp.id_telefono_ip = t.id_telefono_ip
                   WHERE tp.id_persona = ? AND tp.activo = 'ACTIVO'`, [id]),
            query(`SELECT ta.marca, ta.modelo, ta.serial_tablet, tp.fecha_asignacion
                   FROM Tablets_persona tp
                   JOIN Tablets ta ON tp.id_tablet = ta.id_tablet
                   WHERE tp.id_persona = ? AND tp.activo = 'ACTIVO'`, [id]),
            query(`SELECT a.tipo_accesorio, a.marca, a.modelo, ap.fecha_asignacion
                   FROM Accesorios_persona ap
                   JOIN Accesorios a ON ap.id_accesorio = a.id_accesorio
                   WHERE ap.id_persona = ? AND ap.activo = 'ACTIVO'`, [id])
        ]);

        return { computadores, celulares, impresoras, radios, telefonos, tablets, accesorios };
    },

    async create({ nombre, correo_asignado, cargo, rol, celular, extension, area }) {
        const result = await query(
            `INSERT INTO Personas (nombre, correo_asignado, cargo, rol, celular, extension, area, activo)
             VALUES (?, ?, ?, ?, ?, ?, ?, true)`,
            [
                nombre,
                correo_asignado || null,
                cargo || 'Sin asignar',
                rol || 'VISITANTE',
                celular || null,
                extension || null,
                area || null
            ]
        );
        return result.insertId;
    },

    async update(id, campos) {
        const allowed = ['nombre', 'correo_asignado', 'cargo', 'rol', 'celular', 'extension', 'area', 'activo'];
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
    },

    async getPersonasActivas() {
        const query = 'SELECT * FROM vw_cantidad_personas_activas';
        const [rows] = await db.query(query);
        return rows[0]?.total_personas_activas || 0;
    }
};

module.exports = Persona;