// ============================================================================
// ARCHIVO: 1_backend/config/database.js
// DESCRIPCIÓN: Conexión a MySQL/TiDB Cloud con SSL obligatorio.
//
// TiDB Cloud Serverless requiere SSL — sin él lanza:
//   "Connections using insecure transport are prohibited"
//
// Variables de entorno requeridas en .env:
//   DB_HOST     → gateway01.us-east-1.prod.aws.tidbcloud.com
//   DB_PORT     → 4000  (TiDB Cloud usa 4000, no 3306)
//   DB_USER     → root
//   DB_PASSWORD → tu contraseña
//   DB_NAME     → nombre de la base de datos
// ============================================================================

const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT) || 4000,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    // ── SSL obligatorio para TiDB Cloud Serverless ──────────────────────────
    ssl: {
        // Acepta el certificado del servidor sin necesidad de tener
        // el CA cert descargado localmente.
        // Si tienes el CA cert de TiDB puedes ponerlo así:
        //   ca: require('fs').readFileSync('/ruta/isrgrootx1.pem')
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2'
    },

    // ── Pool de conexiones ──────────────────────────────────────────────────
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0,

    // ── Compatibilidad con tipos de datos ───────────────────────────────────
    decimalNumbers: true,
    timezone:       'Z'          // UTC — evita problemas con TIMESTAMP
});

// ── Helper para ejecutar queries ─────────────────────────────────────────────
async function query(sql, params) {
    try {
        const [results] = await pool.execute(sql, params);
        return results;
    } catch (error) {
        console.error('❌ Error en query:', error.message);
        throw error;
    }
}

// ── Verificar conexión al arrancar el servidor ────────────────────────────────
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        await connection.query('SELECT 1');   // ping real a la BD
        connection.release();
        console.log('✅ Conexión a TiDB Cloud exitosa');
        console.log(`   Host: ${process.env.DB_HOST}:${process.env.DB_PORT || 4000}`);
        console.log(`   BD:   ${process.env.DB_NAME}`);
        return true;
    } catch (error) {
        console.error('❌ Error conectando a TiDB Cloud:', error.message);

        // Mensajes de ayuda según el tipo de error
        if (error.message.includes('insecure transport')) {
            console.error('   → El servidor requiere SSL. Verifica la config ssl: {} en database.js');
        } else if (error.message.includes('ENOTFOUND') || error.message.includes('ETIMEDOUT')) {
            console.error('   → No se puede alcanzar el host. Verifica DB_HOST y tu conexión a internet.');
        } else if (error.message.includes('Access denied')) {
            console.error('   → Credenciales incorrectas. Verifica DB_USER y DB_PASSWORD en .env');
        } else if (error.message.includes('Unknown database')) {
            console.error('   → La base de datos no existe. Verifica DB_NAME en .env');
        }

        return false;
    }
}

module.exports = { pool, query, testConnection };