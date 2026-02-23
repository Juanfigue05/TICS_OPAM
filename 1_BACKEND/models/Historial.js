const { query } = require('../config/database');

const TABLA_MAP = {
    'COMPUTADOR':  { tabla: 'Computadores',  pk: 'id_computador' },
    'CELULAR':     { tabla: 'Celulares',     pk: 'id_celular' },
    'IMPRESORA':   { tabla: 'Impresoras',    pk: 'id_impresora' },
    'RADIO':       { tabla: 'Radios',        pk: 'id_radio' },
    'TELEFONO_IP': { tabla: 'Telefonos_ip',  pk: 'id_telefono_ip' },
    'TABLET':      { tabla: 'Tablets',       pk: 'id_tablet' },
    'ACCESORIO':   { tabla: 'Accesorios',    pk: 'id_accesorio' }
};

const Historial = {
    async getAll({ tipo_equipo, tipo_accion, limit = 50, offset = 0 } = {}) {
        let sql = `
            SELECT h.*, p.nombre AS nombre_persona, u.Nombre_ubicacion, us.username AS realizado_por
            FROM Historial_Equipos h
            LEFT JOIN Personas p ON h.id_persona = p.id_persona
            LEFT JOIN Ubicaciones u ON h.id_ubicacion = u.id_ubicacion
            LEFT JOIN Usuarios_sistema us ON h.id_usuario = us.id_usuario
            WHERE 1=1
        `;
        const params = [];
        if (tipo_equipo) { sql += ' AND h.tipo_equipo = ?'; params.push(tipo_equipo.toUpperCase()); }
        if (tipo_accion) { sql += ' AND h.tipo_accion = ?'; params.push(tipo_accion); }
        sql += ' ORDER BY h.fecha_accion DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        return query(sql, params);
    },

    async countAll({ tipo_equipo, tipo_accion } = {}) {
        let sql = 'SELECT COUNT(*) as total FROM Historial_Equipos WHERE 1=1';
        const params = [];
        if (tipo_equipo) { sql += ' AND tipo_equipo = ?'; params.push(tipo_equipo.toUpperCase()); }
        if (tipo_accion) { sql += ' AND tipo_accion = ?'; params.push(tipo_accion); }
        const [rows] = await query(sql, params); // mysql2/promise returns array
        return rows.total;
    },

    async getByEquipo(tipo, id) {
        const tipoUpper = tipo.toUpperCase().replace(/ /g, '_').replace('TELEFONOIP', 'TELEFONO_IP');
        return query(`
            SELECT h.*, p.nombre AS nombre_persona, u.Nombre_ubicacion, us.username AS realizado_por
            FROM Historial_Equipos h
            LEFT JOIN Personas p ON h.id_persona = p.id_persona
            LEFT JOIN Ubicaciones u ON h.id_ubicacion = u.id_ubicacion
            LEFT JOIN Usuarios_sistema us ON h.id_usuario = us.id_usuario
            WHERE h.tipo_equipo = ? AND h.id_equipo = ?
            ORDER BY h.fecha_accion DESC`, [tipoUpper, id]);
    },

    async registrar({ tipo_equipo, id_equipo, tipo_accion, id_persona, id_ubicacion, valor_anterior, valor_nuevo, razon, id_usuario }) {
        if (!id_usuario) throw new Error('id_usuario es obligatorio en Historial');
        const tipoUpper = tipo_equipo.toUpperCase().replace(/ /g, '_').replace('TELEFONOIP', 'TELEFONO_IP');
        return query(`
            INSERT INTO Historial_Equipos 
            (tipo_equipo, id_equipo, tipo_accion, id_persona, id_ubicacion, id_usuario,
             valor_anterior, valor_nuevo, razon)
            VALUES (?,?,?,?,?,?,?,?,?)`,
            [tipoUpper, id_equipo, tipo_accion,
             id_persona || null, id_ubicacion || null, id_usuario,
             valor_anterior ? JSON.stringify(valor_anterior) : null,
             valor_nuevo ? JSON.stringify(valor_nuevo) : null,
             razon || null]);
    },

    async actualizarUltimoMantenimiento(tipo_equipo, id_equipo) {
        const info = TABLA_MAP[tipo_equipo.toUpperCase()] || TABLA_MAP[tipo_equipo];
        if (!info) return;
        return query(`UPDATE ${info.tabla} SET ultimo_mantenimiento = CURDATE() WHERE ${info.pk} = ?`, [id_equipo]);
    },

    tiposValidos() {
        return Object.keys(TABLA_MAP);
    }
};

module.exports = Historial;