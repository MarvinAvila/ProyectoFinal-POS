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
	actualizado_en  	timestamp default now()
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



















-- 1) Usuarios
INSERT INTO usuarios (nombre, correo, contrasena_hash, rol, activo)
VALUES
  ('Admin General', 'admin@pos.com',   '$2b$12$0qew2IjLMqBksQmCBmtgeOd4RekaLIsP4siyNeIwd4jAqbaKw/y7i', 'admin', TRUE),
  ('empleado',        'caja1@pos.com',   '$2b$12$d3qHcJVkqfF/t/F5x07LseY6wRrnJSpYYQ9EhLjgmLrrOJK1Id1j2', 'empleado', TRUE),
  ('Gerencia',      'gerente@pos.com', '$2b$12$H0R5gFCR9kjTHHC4twZcTe5hXDCw3sD3gW0SXJQw7o3/xmXOkZLuO', 'gerente', TRUE),
  ('Dueño',         'dueno@pos.com',   '$2b$12$t6MkuRG0ocKx0.X7ebwZreIPT3Cif2i6XEoZTkhVFeiLVZUvSnO6W', 'dueno', TRUE);

-- 2) Proveedores
INSERT INTO proveedores (nombre, telefono, email, direccion)
VALUES
  ('ProveeMax S.A.', '+52 55 1111 1111', 'contacto@proveemax.com', 'CDMX'),
  ('DulceVida', '+52 55 2222 2222', 'ventas@dulcevida.com', 'Guadalajara'),
  ('LimpioPlus', '+52 55 3333 3333', 'hola@limpioplus.com', 'Monterrey');

-- 3) Categorías
INSERT INTO categorias (nombre, descripcion)
VALUES
  ('Bebidas',  'Líquidos embotellados'),
  ('Snacks',   'Botanas y dulces'),
  ('Limpieza', 'Hogar y limpieza'),
  ('Lácteos',  'Productos lácteos');

-- 4) Productos (ids 1..8)
INSERT INTO productos
(nombre, codigo_barra, precio_compra, precio_venta, stock, unidad, fecha_caducidad, id_proveedor, id_categoria, imagen)
VALUES
  ('Agua 1L',            '750000000001', 8.00, 12.00, 10, 'lt',   NULL,          1, 1, NULL),
  ('Refresco 600ml',     '750000000002', 9.00, 15.00,  6, 'lt',   '2026-01-01',  1, 1, NULL),
  ('Papas 45g',          '750000000003',10.00, 18.00, 12, 'pieza',NULL,          2, 2, NULL),
  ('Chocolate barra',    '750000000004',12.00, 20.00,  7, 'pieza',NULL,          2, 2, NULL),
  ('Detergente 1kg',     '750000000005',35.00, 55.00,  5, 'kg',   NULL,          3, 3, NULL),
  ('Cloro 1L',           '750000000006',20.00, 32.00,  4, 'lt',   NULL,          3, 3, NULL),
  ('Leche 1L',           '750000000007',16.00, 25.00,  9, 'lt',   '2025-12-15',  1, 4, NULL),
  ('Yogurt 350g',        '750000000008',12.00, 22.00,  6, 'pieza','2025-11-20',  1, 4, NULL);

-- 5) Ofertas
INSERT INTO ofertas (nombre, descripcion, porcentaje_descuento, fecha_inicio, fecha_fin, activo)
VALUES
  ('Promo Snacks 10%', 'Descuento en botanas', 10.00, '2025-10-01', '2025-10-31', TRUE),
  ('Bebidas 2x1',      'Equivale a 50% desc.', 50.00, '2025-10-01', '2025-10-10', TRUE);

-- 6) Relación producto_oferta
INSERT INTO producto_oferta (id_producto, id_oferta)
VALUES
  (3, 1),  -- Papas 45g en Promo Snacks
  (4, 1),  -- Chocolate en Promo Snacks
  (1, 2),  -- Agua 1L en Bebidas 2x1
  (2, 2);  -- Refresco 600ml en Bebidas 2x1

-- 7) Ventas (ids 1..2)
INSERT INTO ventas (fecha, id_usuario, forma_pago, subtotal, iva, total)
VALUES
  ('2025-10-05 10:00:00', 2, 'efectivo', 51.00, 8.16, 59.16),
  ('2025-10-05 12:30:00', 2, 'tarjeta', 130.00, 20.80, 150.80);

-- 8) Detalle de venta para venta 1 (id_venta = 1)
--   2 x Papas (18.00) = 36.00
--   1 x Refresco (15.00) = 15.00
INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario, subtotal)
VALUES
  (1, 3, 2, 18.00, 36.00),
  (1, 2, 1, 15.00, 15.00);

-- 9) Detalle de venta para venta 2 (id_venta = 2)
--   1 x Detergente (55.00) = 55.00  -> stock 5 => 4 (dispara alerta de stock_bajo)
--   3 x Leche (25.00) = 75.00
INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario, subtotal)
VALUES
  (2, 5, 1, 55.00, 55.00),
  (2, 7, 3, 25.00, 75.00);

-- 10) Comprobantes (uno por cada venta)
INSERT INTO comprobantes (id_venta, tipo, contenido)
VALUES
  (1, 'ticket', 'Ticket venta #1 - Gracias por su compra'),
  (2, 'ticket', 'Ticket venta #2 - Gracias por su compra');
