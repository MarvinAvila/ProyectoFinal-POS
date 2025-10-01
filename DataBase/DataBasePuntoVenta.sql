-- =====================================
-- CREACIÓN DE BASE DE DATOS
-- =====================================
DROP DATABASE IF EXISTS punto_venta;
CREATE DATABASE punto_venta;
\c punto_venta;

-- =====================================
-- TABLA: Usuarios (autenticación)
-- =====================================
CREATE TABLE usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(150) UNIQUE NOT NULL,
    contrasena_hash TEXT NOT NULL,
    rol VARCHAR(50) NOT NULL CHECK (rol IN ('admin', 'cajero', 'gerente', 'dueno')),
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT NOW(),
    ultimo_login TIMESTAMP,
    token_recuperacion  	text,
	expiracion_token  	timestamp,
	actualizado_en  	timestamp default now(),
);

-- =====================================
-- TABLA: Proveedores
-- =====================================
CREATE TABLE proveedores (
    id_proveedor SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    telefono VARCHAR(20),
    email VARCHAR(150),
    direccion TEXT
);

-- =====================================
-- TABLA: Categorías de productos
-- =====================================
CREATE TABLE categorias (
    id_categoria SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT
);

-- =====================================
-- TABLA: Productos
-- =====================================
CREATE TABLE productos (
    id_producto SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    codigo_barra VARCHAR(50) UNIQUE NOT NULL,
    precio_compra NUMERIC(10,2) NOT NULL,
    precio_venta NUMERIC(10,2) NOT NULL,
    stock NUMERIC(10,2) NOT NULL DEFAULT 0,
    unidad VARCHAR(50) NOT NULL CHECK (unidad IN ('pieza','kg','lt','otro')),
    fecha_caducidad DATE,
    id_proveedor INT REFERENCES proveedores(id_proveedor) ON DELETE SET NULL,
    id_categoria INT REFERENCES categorias(id_categoria) ON DELETE SET NULL,
    imagen TEXT
);

-- =====================================
-- TABLA: Ventas
-- =====================================
CREATE TABLE ventas (
    id_venta SERIAL PRIMARY KEY,
    fecha TIMESTAMP DEFAULT NOW(),
    id_usuario INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    forma_pago VARCHAR(50) NOT NULL CHECK (forma_pago IN ('efectivo','tarjeta','otro')),
    subtotal NUMERIC(12,2) NOT NULL,
    iva NUMERIC(12,2) NOT NULL,
    total NUMERIC(12,2) NOT NULL
);

-- =====================================
-- TABLA débil: Detalle de venta
-- =====================================
CREATE TABLE detalle_venta (
    id_detalle SERIAL PRIMARY KEY,
    id_venta INT REFERENCES ventas(id_venta) ON DELETE CASCADE,
    id_producto INT REFERENCES productos(id_producto) ON DELETE SET NULL,
    cantidad NUMERIC(10,2) NOT NULL,
    precio_unitario NUMERIC(10,2) NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL
);

-- =====================================
-- TABLA: Ofertas y Descuentos
-- =====================================
CREATE TABLE ofertas (
    id_oferta SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    porcentaje_descuento NUMERIC(5,2) CHECK (porcentaje_descuento > 0 AND porcentaje_descuento <= 100),
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    activo BOOLEAN DEFAULT TRUE
);

-- Relación N:M entre productos y ofertas
CREATE TABLE producto_oferta (
    id_producto INT REFERENCES productos(id_producto) ON DELETE CASCADE,
    id_oferta INT REFERENCES ofertas(id_oferta) ON DELETE CASCADE,
    PRIMARY KEY (id_producto, id_oferta)
);

-- =====================================
-- TABLA: Reportes (Histórico)
-- =====================================
CREATE TABLE reportes (
    id_reporte SERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('ventas_dia','top_productos','stock_bajo')),
    fecha_generado TIMESTAMP DEFAULT NOW(),
    id_usuario INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    descripcion TEXT,
    contenido JSONB NOT NULL
);

-- =====================================
-- TABLA: Alertas (stock/caducidad)
-- =====================================
CREATE TABLE alertas (
    id_alerta SERIAL PRIMARY KEY,
    id_producto INT REFERENCES productos(id_producto) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('caducidad', 'stock_bajo')),
    mensaje TEXT NOT NULL,
    fecha TIMESTAMP DEFAULT NOW(),
    atendida BOOLEAN DEFAULT FALSE
);

-- =====================================
-- TABLA: Historial de inventario
-- =====================================
CREATE TABLE historial_inventario (
    id_historial SERIAL PRIMARY KEY,
    id_producto INT REFERENCES productos(id_producto) ON DELETE CASCADE,
    cambio NUMERIC(10,2) NOT NULL, -- positivo = entrada, negativo = salida
    motivo VARCHAR(100) NOT NULL CHECK (motivo IN ('venta','compra','ajuste','devolucion')),
    fecha TIMESTAMP DEFAULT NOW(),
    id_usuario INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL
);

-- =====================================
-- TABLA: Comprobantes de venta
-- =====================================
CREATE TABLE comprobantes (
    id_comprobante SERIAL PRIMARY KEY,
    id_venta INT REFERENCES ventas(id_venta) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL DEFAULT 'ticket',
    contenido TEXT NOT NULL, -- puede ser JSON, base64 de PDF, HTML
    generado_en TIMESTAMP DEFAULT NOW()
);

-- =====================================
-- TRIGGERS: Actualización de inventario y alertas
-- =====================================

-- Función que descuenta stock al registrar un detalle de venta
CREATE OR REPLACE FUNCTION descontar_stock()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE productos
    SET stock = stock - NEW.cantidad
    WHERE id_producto = NEW.id_producto;

    -- Insertar en historial de inventario
    INSERT INTO historial_inventario (id_producto, cambio, motivo, id_usuario)
    VALUES (NEW.id_producto, -NEW.cantidad, 'venta',
            (SELECT id_usuario FROM ventas WHERE id_venta = NEW.id_venta));

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger asociado a detalle de venta
CREATE TRIGGER tr_descontar_stock
AFTER INSERT ON detalle_venta
FOR EACH ROW
EXECUTE FUNCTION descontar_stock();

-- Función que genera alerta cuando stock es bajo
CREATE OR REPLACE FUNCTION generar_alerta_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.stock < 5 THEN
        INSERT INTO alertas (id_producto, tipo, mensaje)
        VALUES (NEW.id_producto, 'stock_bajo', 'El producto tiene poco stock');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger asociado a productos
CREATE TRIGGER tr_alerta_stock
AFTER UPDATE OF stock ON productos
FOR EACH ROW
EXECUTE FUNCTION generar_alerta_stock();
