// ============================================================================
// ARCHIVO: 1_backend/models/Computador.js
// DESCRIPCIÓN: Todas las consultas SQL relacionadas a Computadores.
// ============================================================================

const { query } = require('../config/database');

const Computador = {
    async getAll({ ubicacion, estado, search } = {}) {
        let sql = `
            SELECT c.*, cp.id_persona, cp.id_ubicacion, cp.fecha_asignacion,
                   p.nombre AS nombre_usuario, p.correo_asignado, p.cargo,
                   u.Nombre_ubicacion, u.Area
            FROM Computadores c
            LEFT JOIN Computadores_persona cp ON c.id_computador = cp.id_computador AND cp.activo = 'ACTIVO'
            LEFT JOIN Personas p ON cp.id_persona = p.id_persona
            LEFT JOIN Ubicaciones u ON cp.id_ubicacion = u.id_ubicacion
            WHERE c.activo = 'ACTIVO'
        `;
        const params = [];
        if (ubicacion) { sql += ' AND cp.id_ubicacion = ?'; params.push(ubicacion); }
        if (estado)    { sql += ' AND c.estado = ?'; params.push(estado); }
        if (search) {
            sql += ` AND (c.codigo_activo LIKE ? OR c.nombre_equipo LIKE ? OR c.marca_equipo LIKE ? 
                         OR c.serial_equipo LIKE ? OR p.nombre LIKE ?)`;
            const s = `%${search}%`;
            params.push(s, s, s, s, s);
        }
        sql += ' ORDER BY c.codigo_activo ASC';
        return query(sql, params);
    },
    // Obtener uno por ID
    async getById(id) {
        return query(`
            SELECT c.*,
                cp.id_persona, cp.id_ubicacion, cp.fecha_asignacion,
                p.nombre AS nombre_usuario, p.correo_asignado, p.cargo,
                u.Nombre_ubicacion, u.Area
            FROM Computadores c
            LEFT JOIN Computadores_persona cp ON c.id_computador = cp.id_computador AND cp.activo = true
            LEFT JOIN Personas p ON cp.id_persona = p.id_persona
            LEFT JOIN Ubicaciones u ON cp.id_ubicacion = u.id_ubicacion
            WHERE c.id_computador = ?`, [id]);
    },

    // Verificar si código activo ya existe
    async existeCodigo(codigo, excluirId = null) {
        let sql = 'SELECT id_computador FROM Computadores WHERE codigo_activo = ACTIVO';
        const params = [codigo];
        if (excluirId) { sql += ' AND id_computador != ?'; params.push(excluirId); }
        const rows = await query(sql, params);
        return rows.length > 0;
    },

    // Estadísticas
    async getStats() {
        const [porEstado, porMarca, porTipo, porUbicacion] = await Promise.all([
            query('SELECT estado, COUNT(*) as total FROM Computadores WHERE activo = true GROUP BY estado'),
            query('SELECT marca_equipo as marca, COUNT(*) as total FROM Computadores WHERE activo = true GROUP BY marca_equipo ORDER BY total DESC LIMIT 10'),
            query('SELECT tipo_computador, COUNT(*) as total FROM Computadores WHERE activo = true GROUP BY tipo_computador'),
            query(`SELECT u.Nombre_ubicacion, u.Area, COUNT(cp.id) as total
                   FROM Ubicaciones u
                   LEFT JOIN Computadores_persona cp ON u.id_ubicacion = cp.id_ubicacion AND cp.activo = true
                   LEFT JOIN Computadores c ON cp.id_computador = c.id_computador AND c.activo = true
                   GROUP BY u.id_ubicacion ORDER BY total DESC`)
        ]);
        return { por_estado: porEstado, por_marca: porMarca, por_tipo: porTipo, por_ubicacion: porUbicacion };
    },

    // Crear
    async create(datos) {
        const result = await query(`
            INSERT INTO Computadores (
                codigo_activo, nombre_equipo, marca_equipo, modelo_equipo, serial_equipo,
                mac_wifi, mac_ethernet, direccion_ip, tipo_computador,
                procesador, capacidad_ram, tipo_modulo_ram, capacidad_disco, tipo_disco,
                sistema_operativo, serial_teclado, serial_mouse,
                marca_monitor, serial_monitor, segunda_pantalla, serial_2_monitor,
                cargador_regulador, estado, fecha_adquisicion, fecha_garantia, notas, 
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [datos.codigo_activo, datos.nombre_equipo, datos.marca_equipo, datos.modelo_equipo, datos.serial_equipo,
             datos.mac_wifi||'No definido', datos.mac_ethernet||'No definido', datos.direccion_ip,
             datos.tipo_computador||'No definido', datos.procesador, datos.capacidad_ram,
             datos.tipo_modulo_ram||'DDR4', datos.capacidad_disco, datos.tipo_disco||'No definido',
             datos.sistema_operativo, datos.serial_teclado||'GENERICO', datos.serial_mouse||'GENERICO',
             datos.marca_monitor, datos.serial_monitor, datos.segunda_pantalla||false,
             datos.serial_2_monitor||'N/A', datos.cargador_regulador||'N/A',
             datos.estado||'BUENO', datos.fecha_adquisicion, datos.fecha_garantia, datos.notas]
        );
        return result.insertId;
    },

    // Actualizar
    async update(id, campos) {
        const allowed = [
            'nombre_equipo','marca_equipo','modelo_equipo','serial_equipo',
            'mac_wifi','mac_ethernet','direccion_ip','tipo_computador',
            'procesador','capacidad_ram','tipo_modulo_ram','capacidad_disco','tipo_disco',
            'sistema_operativo','serial_teclado','serial_mouse',
            'marca_monitor','serial_monitor','segunda_pantalla','serial_2_monitor',
            'cargador_regulador','estado','fecha_adquisicion','fecha_garantia',
            'ultimo_mantenimiento','notas'
        ];
        const fields = [], values = [];
        for (const f of allowed) {
            if (campos[f] !== undefined) { fields.push(`${f} = ?`); values.push(campos[f]); }
        }
        if (!fields.length) return null;
        values.push(id);
        return query(`UPDATE Computadores SET ${fields.join(', ')} WHERE id_computador = ?`, values);
    },

    // Asignar persona/ubicación
    async asignar(id_computador, id_persona, id_ubicacion) {
        await query("UPDATE Computadores_persona SET activo = 'DADO DE BAJA' WHERE id_computador = ? AND activo = 'ACTIVO'", [id_computador]);
        return query(`
            INSERT INTO Computadores_persona (id_computador, id_persona, id_ubicacion, activo) 
            VALUES (?,?,?,'ACTIVO')`, [id_computador, id_persona, id_ubicacion]);
    },

    // Desasignar
    async asignar(id_computador, id_persona, id_ubicacion) {
        await query("UPDATE Computadores_persona SET activo = 'DADO DE BAJA' WHERE id_computador = ? AND activo = 'ACTIVO'", [id_computador]);
        return query(`
            INSERT INTO Computadores_persona (id_computador, id_persona, id_ubicacion, activo) 
            VALUES (?,?,?,'ACTIVO')`, [id_computador, id_persona, id_ubicacion]);
    },

    // Dar de baja
    async darDeBaja(id) {
        await query("UPDATE Computadores SET activo = 'DADO DE BAJA' WHERE id_computador = ?", [id]);
        await query("UPDATE Computadores_persona SET activo = 'DADO DE BAJA' WHERE id_computador = ?", [id]);
    }
};

module.exports = Computador;