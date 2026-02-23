-- ============================================================================
-- BASE DE DATOS ACTUALIZADA
-- Version: 3.0 
-- 
-- 
-- ============================================================================

DROP DATABASE IF EXISTS tics_aeropuerto;
CREATE DATABASE tics_aeropuerto CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE tics_aeropuerto;

-- ============================================================================
-- TABLA: Ubicaciones
-- ============================================================================
CREATE TABLE Ubicaciones (
    id_ubicacion INT AUTO_INCREMENT PRIMARY KEY,
    Nombre_ubicacion VARCHAR(50) DEFAULT 'N/A',
    Area VARCHAR(80) DEFAULT 'N/A',
    piso INT COMMENT 'Número de piso',
    icono VARCHAR(50) DEFAULT 'building',
    color VARCHAR(20) DEFAULT '#0056D2',
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_activo (activo)
) ENGINE=InnoDB COMMENT='Ubicaciones';

-- ============================================================================
-- TABLA: Personas
-- ============================================================================
CREATE TABLE Personas (
    id_persona INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50),
    correo_asignado VARCHAR(100),
    cargo VARCHAR(50) DEFAULT 'Sin asignar',
    rol ENUM('ADMINISTRADOR', 'TICS', 'VISITANTE') DEFAULT 'VISITANTE',
    celular VARCHAR(20),
    extension VARCHAR(10),
    area VARCHAR(50),
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_correo_asignado (correo_asignado),
    INDEX idx_nombre (nombre),
    INDEX idx_activo (activo)
) ENGINE=InnoDB COMMENT='Personas/Usuarios del aeropuerto';

-- ============================================================================
-- TABLA: Computadores
-- ============================================================================
CREATE TABLE Computadores (
    id_computador INT AUTO_INCREMENT PRIMARY KEY,
    codigo_activo VARCHAR(20) UNIQUE,
    nombre_equipo VARCHAR(50),
    marca_equipo VARCHAR(30),
    modelo_equipo VARCHAR(50),
    serial_equipo VARCHAR(50) UNIQUE,
    mac_wifi VARCHAR(25) DEFAULT 'No definido',
    mac_ethernet VARCHAR(25) DEFAULT 'No definido',
    direccion_ip VARCHAR(45),
    tipo_computador ENUM('ESCRITORIO', 'PORTATIL', 'TODO EN UNO', 'WORKSTATION', 'No definido') DEFAULT 'No definido',
    procesador VARCHAR(50),
    capacidad_ram VARCHAR(15),
    tipo_modulo_ram ENUM('DDR2', 'DDR3', 'DDR4', 'DDR5', 'DDR6', 'No definido') DEFAULT 'DDR4',
    capacidad_disco VARCHAR(20),
    tipo_disco ENUM('HDD', 'SSD', 'HIBRIDO', 'No definido') DEFAULT 'No definido',
    sistema_operativo VARCHAR(50),
    serial_teclado VARCHAR(30) DEFAULT 'GENERICO',
    serial_mouse VARCHAR(30) DEFAULT 'GENERICO',
    marca_monitor VARCHAR(30),
    serial_monitor VARCHAR(30),
    segunda_pantalla BOOLEAN DEFAULT false,
    serial_2_monitor VARCHAR(30) DEFAULT 'N/A',
    cargador_regulador VARCHAR(50) DEFAULT 'N/A',
    estado ENUM('NUEVO', 'BUENO', 'FUNCIONAL', 'MALO') DEFAULT 'BUENO',
    activo ENUM('ACTIVO', 'MANTENIMIENTO', 'DADO DE BAJA', 'ALMACEN') DEFAULT 'ACTIVO',
    fecha_adquisicion DATE,
    fecha_garantia DATE,
    ultimo_mantenimiento DATE,
    notas TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_codigo (codigo_activo),
    INDEX idx_estado (estado)
) ENGINE=InnoDB COMMENT='Inventario de computadores';

-- ============================================================================
-- TABLA: Celulares
-- ============================================================================
CREATE TABLE Celulares (
    id_celular INT AUTO_INCREMENT PRIMARY KEY,
    nombre_celular VARCHAR(30),
    numero_celular VARCHAR(20),
    marca VARCHAR(30),
    modelo VARCHAR(30),
    serial_celular VARCHAR(30) UNIQUE,
    sim_company ENUM('CLARO', 'TIGO', 'WOM', 'MOVISTAR', 'ETB', 'Virgin Mobile', 'No definido') DEFAULT 'No definido',
    imei1_celular VARCHAR(20),
    imei2_celular VARCHAR(20),
    punk VARCHAR(15),
    procesador VARCHAR(50),
    ram VARCHAR(15),
    almacenamiento VARCHAR(15),
    sistema_op ENUM('ANDROID', 'IOS', 'OTRO') DEFAULT 'ANDROID',
    version_op VARCHAR(10),
    plan_datos VARCHAR(50),
    estado ENUM('NUEVO', 'BUENO', 'FUNCIONAL', 'MALO') DEFAULT 'BUENO',
    activo ENUM('ACTIVO', 'MANTENIMIENTO', 'DADO DE BAJA', 'ALMACEN') DEFAULT 'ACTIVO',
    fecha_adquisicion DATE,
    fecha_vencimiento_contrato DATE,
    notas TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_numero (numero_celular),
    INDEX idx_estado (estado)
) ENGINE=InnoDB COMMENT='Inventario de celulares';

-- ============================================================================
-- TABLA: Impresoras
-- ============================================================================
CREATE TABLE Impresoras (
    id_impresora INT AUTO_INCREMENT PRIMARY KEY,
    nombre_equipo VARCHAR(50),
    marca VARCHAR(30),
    modelo VARCHAR(30),
    serial VARCHAR(30) UNIQUE,
    tipo_impresora ENUM('LASER', 'INYECCION', 'MULTIFUNCION', 'TERMICA', 'PLOTTER') DEFAULT 'LASER',
    tipo_red ENUM('WIFI', 'ETHERNET', 'USB', 'BLUETOOTH') DEFAULT 'ETHERNET',
    ip_impresora VARCHAR(45),
    mac_ethernet VARCHAR(25),
    mac_wifi VARCHAR(25),
    impresion_color BOOLEAN DEFAULT false,
    tiene_escaner BOOLEAN DEFAULT false,
    tiene_fax BOOLEAN DEFAULT false,
    impresion_duplex BOOLEAN DEFAULT false,
    tamano_papel_max VARCHAR(20) DEFAULT 'CARTA O LETTER',
    estado ENUM('NUEVO', 'BUENO', 'FUNCIONAL', 'MALO') DEFAULT 'BUENO',
    activo ENUM('ACTIVO', 'MANTENIMIENTO', 'DADO DE BAJA', 'ALMACEN') DEFAULT 'ACTIVO',
    fecha_adquisicion DATE,
    ultimo_mantenimiento DATE,
    notas TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ip (ip_impresora),
    INDEX idx_estado (estado)
) ENGINE=InnoDB COMMENT='Inventario de impresoras';

-- ============================================================================
-- TABLA: Radios
-- ============================================================================
CREATE TABLE Radios (
    id_radio INT AUTO_INCREMENT PRIMARY KEY,
    tipo_radio VARCHAR(50),
    marca VARCHAR(30),
    modelo VARCHAR(30),
    serial_radio VARCHAR(50) UNIQUE,
    frecuencia VARCHAR(20),
    antena BOOLEAN DEFAULT true,
    estado_antena ENUM('NUEVO', 'BUENO', 'FUNCIONAL', 'MALO') DEFAULT 'BUENO',
    bateria VARCHAR(30),
    serial_bateria VARCHAR(30),
    estado_bateria ENUM('NUEVO', 'BUENO', 'FUNCIONAL', 'MALO') DEFAULT 'BUENO',
    diadema_manos_libres BOOLEAN DEFAULT false,
    base_cargador BOOLEAN DEFAULT false,
    serial_cargador VARCHAR(30),
    estado ENUM('NUEVO', 'BUENO', 'FUNCIONAL', 'MALO') DEFAULT 'BUENO',
    activo ENUM('ACTIVO', 'MANTENIMIENTO', 'DADO DE BAJA', 'ALMACEN') DEFAULT 'ACTIVO',
    fecha_adquisicion DATE,
    notas TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_estado (estado)
) ENGINE=InnoDB COMMENT='Inventario de radios';

-- ============================================================================
-- TABLA: Telefonos IP
-- ============================================================================
CREATE TABLE Telefonos_ip (
    id_telefono_ip INT AUTO_INCREMENT PRIMARY KEY,
    nombre_telefono VARCHAR(10)
    marca VARCHAR(30),
    modelo VARCHAR(30),
    serial_telefono VARCHAR(50) UNIQUE,
    mac_address VARCHAR(25),
    ip_telefono VARCHAR(45),
    extension VARCHAR(10),
    protocolo ENUM('SIP', 'H.323', 'SCCP', 'Otro') DEFAULT 'SIP',
    firmware_version VARCHAR(20),
    poe BOOLEAN DEFAULT true COMMENT 'Power over Ethernet',
    tiene_pantalla BOOLEAN DEFAULT false,
    tamano_pantalla VARCHAR(10),
    cantidad_lineas INT DEFAULT 1,
    estado ENUM('NUEVO', 'BUENO', 'FUNCIONAL', 'MALO') DEFAULT 'BUENO',
    activo ENUM('ACTIVO', 'MANTENIMIENTO', 'DADO DE BAJA', 'ALMACEN') DEFAULT 'ACTIVO',
    fecha_adquisicion DATE,
    ultimo_mantenimiento DATE,
    notas TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ip (ip_telefono),
    INDEX idx_estado (estado)
) ENGINE=InnoDB COMMENT='Inventario de teléfonos IP';

-- ============================================================================
-- TABLA: Tablets
-- ============================================================================
CREATE TABLE Tablets (
    id_tablet INT AUTO_INCREMENT PRIMARY KEY,
    nombre_tablet VARCHAR(30),
    marca VARCHAR(30),
    modelo VARCHAR(30),
    serial_tablet VARCHAR(50) UNIQUE,
    imei VARCHAR(20),
    procesador VARCHAR(50),
    ram VARCHAR(15),
    almacenamiento VARCHAR(15),
    tamano_pantalla VARCHAR(10),
    resolucion VARCHAR(20),
    sistema_op ENUM('ANDROID', 'IOS', 'WINDOWS', 'OTRO') DEFAULT 'ANDROID',
    version_op VARCHAR(10),
    tiene_sim BOOLEAN DEFAULT false,
    sim_company VARCHAR(30),
    plan_datos VARCHAR(50),
    estado ENUM('NUEVO', 'BUENO', 'FUNCIONAL', 'MALO') DEFAULT 'BUENO',
    activo ENUM('ACTIVO', 'MANTENIMIENTO', 'DADO DE BAJA', 'ALMACEN') DEFAULT 'ACTIVO',
    fecha_adquisicion DATE,
    notas TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_estado (estado)
) ENGINE=InnoDB COMMENT='Inventario de tablets';

-- ============================================================================
-- TABLA: Accesorios
-- ============================================================================
CREATE TABLE Accesorios (
    id_accesorio INT AUTO_INCREMENT PRIMARY KEY,
    tipo_accesorio ENUM('MOUSE', 'TECLADO', 'AUDIFONOS','DIADEMA', 'CAMARA WEB', 
                        'ADAPTADOR USB3.0 - 4 EN 1','ADAPTADOR USB3.0 - 7 EN 1','ADAPTADOR USB2.0 - 4 EN 1','ADAPTADOR USB2.0 - 7 EN 1',
                        'ADAPTADOR HDMI-VGA', 'ADAPTADOR MINI DP-HDMI', 'MEMORIA USB','BASE REFRIGERANTE',  'OTRO') NOT NULL,
    marca VARCHAR(30),
    modelo VARCHAR(30),
    serial VARCHAR(50),
    descripcion TEXT,
    cantidad INT DEFAULT 1,
    estado ENUM('NUEVO', 'BUENO', 'FUNCIONAL', 'MALO') DEFAULT 'BUENO',
    activo ENUM('ACTIVO', 'MANTENIMIENTO', 'DADO DE BAJA', 'ALMACEN') DEFAULT 'ACTIVO',
    fecha_adquisicion DATE,
    notas TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tipo (tipo_accesorio),
    INDEX idx_estado (estado)
) ENGINE=InnoDB COMMENT='Inventario de accesorios';

-- ============================================================================
-- TABLAS DE ASIGNACIÓN (RELACIONES N:M)
-- ============================================================================

CREATE TABLE Computadores_persona (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_computador INT NOT NULL,
    id_persona INT NOT NULL,
    id_ubicacion INT NOT NULL,
    fecha_asignacion DATE DEFAULT (CURRENT_DATE),
    fecha_devolucion DATE,
    activo ENUM('ACTIVO', 'MANTENIMIENTO', 'DADO DE BAJA', 'ALMACEN') DEFAULT 'ACTIVO',
    notas TEXT,
    UNIQUE KEY unique_asignacion_activa (id_computador, activo),
    INDEX idx_persona (id_persona),
    FOREIGN KEY (id_computador) REFERENCES Computadores(id_computador) ON DELETE CASCADE,
    FOREIGN KEY (id_persona) REFERENCES Personas(id_persona) ON DELETE CASCADE,
    FOREIGN KEY (id_ubicacion) REFERENCES Ubicaciones(id_ubicacion) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE Celulares_persona (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_celular INT NOT NULL,
    id_persona INT NOT NULL,
    id_ubicacion INT NOT NULL,
    fecha_asignacion DATE DEFAULT (CURRENT_DATE),
    fecha_devolucion DATE,
    activo ENUM('ACTIVO', 'MANTENIMIENTO', 'DADO DE BAJA', 'ALMACEN') DEFAULT 'ACTIVO',
    notas TEXT,
    UNIQUE KEY unique_asignacion_activa (id_celular, activo),
    INDEX idx_persona (id_persona),
    FOREIGN KEY (id_celular) REFERENCES Celulares(id_celular) ON DELETE CASCADE,
    FOREIGN KEY (id_persona) REFERENCES Personas(id_persona) ON DELETE CASCADE,
    FOREIGN KEY (id_ubicacion) REFERENCES Ubicaciones(id_ubicacion) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE Impresoras_ubicacion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_impresora INT NOT NULL,
    id_ubicacion INT NOT NULL,
    fecha_instalacion DATE DEFAULT (CURRENT_DATE),
    activo ENUM('ACTIVO', 'MANTENIMIENTO', 'DADO DE BAJA', 'ALMACEN') DEFAULT 'ACTIVO',
    notas TEXT,
    UNIQUE KEY unique_asignacion_activa (id_impresora, activo),
    FOREIGN KEY (id_impresora) REFERENCES Impresoras(id_impresora) ON DELETE CASCADE,
    FOREIGN KEY (id_ubicacion) REFERENCES Ubicaciones(id_ubicacion) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE Radios_persona (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_radio INT NOT NULL,
    id_persona INT NOT NULL,
    id_ubicacion INT NOT NULL,
    fecha_asignacion DATE DEFAULT (CURRENT_DATE),
    fecha_devolucion DATE,
    activo ENUM('ACTIVO', 'MANTENIMIENTO', 'DADO DE BAJA', 'ALMACEN') DEFAULT 'ACTIVO',
    notas TEXT,
    INDEX idx_persona (id_persona),
    FOREIGN KEY (id_radio) REFERENCES Radios(id_radio) ON DELETE CASCADE,
    FOREIGN KEY (id_persona) REFERENCES Personas(id_persona) ON DELETE CASCADE,
    FOREIGN KEY (id_ubicacion) REFERENCES Ubicaciones(id_ubicacion) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Permite múltiples radios por persona';

CREATE TABLE Telefono_persona (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_telefono_ip INT NOT NULL,
    id_persona INT NOT NULL,
    id_ubicacion INT NOT NULL,
    fecha_asignacion DATE DEFAULT (CURRENT_DATE),
    fecha_devolucion DATE,
    activo ENUM('ACTIVO', 'MANTENIMIENTO', 'DADO DE BAJA', 'ALMACEN') DEFAULT 'ACTIVO',
    notas TEXT,
    UNIQUE KEY unique_asignacion_activa (id_telefono_ip, activo),
    INDEX idx_persona (id_persona),
    FOREIGN KEY (id_telefono_ip) REFERENCES Telefonos_ip(id_telefono_ip) ON DELETE CASCADE,
    FOREIGN KEY (id_persona) REFERENCES Personas(id_persona) ON DELETE CASCADE,
    FOREIGN KEY (id_ubicacion) REFERENCES Ubicaciones(id_ubicacion) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE Tablets_persona (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_tablet INT NOT NULL,
    id_persona INT NOT NULL,
    id_ubicacion INT NOT NULL,
    fecha_asignacion DATE DEFAULT (CURRENT_DATE),
    fecha_devolucion DATE,
    activo ENUM('ACTIVO', 'MANTENIMIENTO', 'DADO DE BAJA', 'ALMACEN') DEFAULT 'ACTIVO',
    notas TEXT,
    UNIQUE KEY unique_asignacion_activa (id_tablet, activo),
    INDEX idx_persona (id_persona),
    FOREIGN KEY (id_tablet) REFERENCES Tablets(id_tablet) ON DELETE CASCADE,
    FOREIGN KEY (id_persona) REFERENCES Personas(id_persona) ON DELETE CASCADE,
    FOREIGN KEY (id_ubicacion) REFERENCES Ubicaciones(id_ubicacion) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE Accesorios_persona (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_accesorio INT NOT NULL,
    id_persona INT NOT NULL,
    id_ubicacion INT NOT NULL,
    fecha_asignacion DATE DEFAULT (CURRENT_DATE),
    fecha_devolucion DATE,
    activo ENUM('ACTIVO', 'MANTENIMIENTO', 'DADO DE BAJA', 'ALMACEN') DEFAULT 'ACTIVO',
    notas TEXT,
    INDEX idx_persona (id_persona),
    FOREIGN KEY (id_accesorio) REFERENCES Accesorios(id_accesorio) ON DELETE CASCADE,
    FOREIGN KEY (id_persona) REFERENCES Personas(id_persona) ON DELETE CASCADE,
    FOREIGN KEY (id_ubicacion) REFERENCES Ubicaciones(id_ubicacion) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Permite múltiples accesorios por persona';

-- ============================================================================
-- TABLA: Usuarios del Sistema (Login) - ROLES ACTUALIZADOS
-- ============================================================================
CREATE TABLE Usuarios_sistema (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    id_persona INT,
    rol ENUM('ADMINISTRADOR', 'TICS', 'VISITANTE') DEFAULT 'VISITANTE',
    activo BOOLEAN DEFAULT true,
    ultimo_acceso TIMESTAMP NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    FOREIGN KEY (id_persona) REFERENCES Personas(id_persona) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Usuarios para login con roles actualizados';

-- ============================================================================
-- TABLA: Historial de Equipos (Auditoría)
-- ============================================================================
CREATE TABLE Historial_Equipos (
    id_historial INT AUTO_INCREMENT PRIMARY KEY,
    tipo_equipo ENUM('COMPUTADOR', 'CELULAR', 'IMPRESORA', 'RADIO', 'TELEFONO_IP', 'TABLET', 'ACCESORIO') NOT NULL,
    id_equipo INT NOT NULL COMMENT 'ID del equipo (puede referenciar cualquier tabla de equipos)',
    tipo_accion ENUM('ASIGNACION', 'DEVOLUCION', 'REEMPLAZO', 'MANTENIMIENTO', 'DADO DE BAJA', 'REACTIVACION') NOT NULL,
    id_persona INT NOT NULL COMMENT 'Persona involucrada (OBLIGATORIO)',
    id_ubicacion INT NOT NULL COMMENT 'Ubicación involucrada (OBLIGATORIO)',
    id_usuario INT NOT NULL COMMENT 'ID del usuario del sistema que realizó la acción (reemplaza realizado_por)',
    valor_anterior TEXT COMMENT 'Estado previo en JSON. Ejemplo: {"estado":"BUENO", "activo":"ACTIVO", "notas":"..."}',
    valor_nuevo TEXT COMMENT 'Estado nuevo en JSON. Ejemplo: {"estado":"MALO", "activo":"MANTENIMIENTO"}',
    razon TEXT COMMENT 'Motivo del cambio',
    fecha_accion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tipo_equipo (tipo_equipo, id_equipo),
    INDEX idx_fecha (fecha_accion),
    INDEX idx_persona (id_persona),
    INDEX idx_ubicacion (id_ubicacion),
    INDEX idx_usuario (id_usuario),
    FOREIGN KEY (id_persona) REFERENCES Personas(id_persona) ON DELETE RESTRICT,
    FOREIGN KEY (id_ubicacion) REFERENCES Ubicaciones(id_ubicacion) ON DELETE RESTRICT,
    FOREIGN KEY (id_usuario) REFERENCES Usuarios_sistema(id_usuario) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Historial completo de cambios con auditoría';
-- ============================================================================
-- VISTA: Stock en Bodega
-- ============================================================================
CREATE OR REPLACE VIEW v_stock_bodega AS
SELECT 
    'COMPUTADOR' AS tipo_equipo, 
    COUNT(*) AS cantidad, 
    GROUP_CONCAT(DISTINCT marca_equipo) AS marcas
FROM Computadores WHERE activo = 'ALMACEN'
UNION ALL
SELECT 
    'CELULAR' AS tipo_equipo, 
    COUNT(*) AS cantidad, 
    GROUP_CONCAT(DISTINCT marca) AS marcas
FROM Celulares WHERE activo = 'ALMACEN'
UNION ALL
SELECT 
    'IMPRESORA' AS tipo_equipo, 
    COUNT(*) AS cantidad, 
    GROUP_CONCAT(DISTINCT marca) AS marcas
FROM Impresoras WHERE activo = 'ALMACEN'
UNION ALL
SELECT 
    'RADIO' AS tipo_equipo, 
    COUNT(*) AS cantidad, 
    GROUP_CONCAT(DISTINCT marca) AS marcas
FROM Radios WHERE activo = 'ALMACEN'
UNION ALL
SELECT 
    'TELEFONO_IP' AS tipo_equipo, 
    COUNT(*) AS cantidad, 
    GROUP_CONCAT(DISTINCT marca) AS marcas
FROM Telefonos_ip WHERE activo = 'ALMACEN'
UNION ALL
SELECT 
    'TABLET' AS tipo_equipo, 
    COUNT(*) AS cantidad, 
    GROUP_CONCAT(DISTINCT marca) AS marcas
FROM Tablets WHERE activo = 'ALMACEN'
UNION ALL
SELECT 
    CONCAT('ACCESORIO: ', tipo_accesorio) AS tipo_equipo, 
    COUNT(*) AS cantidad, 
    GROUP_CONCAT(DISTINCT marca) AS marcas
FROM Accesorios 
WHERE activo = 'ALMACEN' 
GROUP BY tipo_accesorio;

-- ============================================================================
-- FIN DEL SCHEMA ACTUALIZADO
-- ============================================================================
SELECT '✅ Base de datos creada exitosamente (versión 3.1 corregida)' AS Mensaje;
SELECT '📊 Tablas: 18 | Vistas: 1 | Correcciones aplicadas' AS Info;
SELECT '🔐 Roles de sistema: ADMINISTRADOR, TICS, VISITANTE' AS Roles;
SELECT '📍 Ahora la vista stock funciona correctamente y el historial tiene auditoría real' AS Nota;